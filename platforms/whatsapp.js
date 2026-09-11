const fs = require("fs");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", "settings", ".env")
});

const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");
const baileysPkg = require("@whiskeysockets/baileys");
const groupSettings = require("../functions/groupSettings");
const welcomeHelper = require("../functions/welcomeHelper");
const autoAccept = require("../functions/autoAccept");
const authFlow = require("../functions/authFlow");

const makeWASocket = baileysPkg.default || baileysPkg.makeWASocket;
const areJidsSameUser = baileysPkg.areJidsSameUser;
const useMultiFileAuthState = baileysPkg.useMultiFileAuthState || baileysPkg.useSingleFileAuthState;
const DisconnectReason = baileysPkg.DisconnectReason || baileysPkg.DisconnectReasons;
let makeInMemoryStore = baileysPkg.makeInMemoryStore;

if (typeof makeInMemoryStore !== 'function') {
  makeInMemoryStore = () => ({ bind: () => { } });
}

const authFolder = path.join(__dirname, "..", "settings", "whatsapp-auth");
const syncedGroups = new Set();
const groupMetadataCache = new Map();
const FALLBACK_WA_VERSION = [2, 3000, 1044006379];

function getLoginTargetAdapter(target) {
  if (!target || !global.platformRegistry) return null;
  return global.platformRegistry[target.platform] || null;
}

async function getWAVersionFromWPP() {
  try {
    const axios = require("axios");
    const response = await axios.get("https://wppconnect.io/pt-BR/whatsapp-versions/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9"
      },
      timeout: 10000
    });

    const match = String(response.data || "").match(/2\.3000\.(\d+)/);
    if (!match?.[1]) {
      console.warn("[VERSION] Não foi possível extrair a versão do WPPConnect.");
      return null;
    }

    async function getGroupMetadataWithTimeout(sock, chatId, timeoutMs = 10000) {
      const cached = groupMetadataCache.get(chatId);
      if (cached) return cached;

      const metadataPromise = sock.groupMetadata(chatId)
        .then((metadata) => {
          groupMetadataCache.set(chatId, metadata);
          return metadata;
        });

      return Promise.race([
        metadataPromise,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`timeout após ${timeoutMs}ms`)), timeoutMs);
        })
      ]);
    }

    const version = [2, 3000, Number(match[1])];
    console.log(`[VERSION] Versão WA Web obtida do WPPConnect: ${JSON.stringify(version)}`);
    return version;
  } catch (error) {
    console.warn(`[VERSION] Erro ao buscar versão do WPPConnect: ${error.message}`);
    return null;
  }
}

async function start(onMessage) {
  console.log('🔄[WHATSAPP] Inicializando...');
  try {
    const requestedLogin = authFlow.consumeWhatsAppLoginRequest();
    const login = requestedLogin || global.__whatsappAuthMode || null;
    global.__whatsappAuthMode = null;
    const resolvedAuth = authFlow.ensureWhatsAppAuthFolder(authFolder);
    const effectiveAuthFolder = resolvedAuth.authFolder;
    const authStateInfo = authFlow.inspectWhatsAppAuthState(effectiveAuthFolder);

    console.log('[WHATSAPP] Carregando credenciais de authFolder:', effectiveAuthFolder);
    if (resolvedAuth.archivePath) {
      console.log(`[WHATSAPP] Arquivo de credenciais encontrado e preparado: ${resolvedAuth.archivePath}`);
    }

    if (authStateInfo.hasAnyData) {
      if (authStateInfo.likelyValid) {
        console.log('[WHATSAPP] Credenciais existentes foram detectadas na pasta de auth.');
      } else {
        console.warn(`[WHATSAPP] Credenciais encontradas, mas parecem inválidas ou incompletas (${authStateInfo.reason}).`);
      }
    } else {
      const isInitialBootstrap = global.__pendingAuthBootstrapPlatform === "whatsapp";
      if (!login && !isInitialBootstrap) {
        console.log('[WHATSAPP] Nenhuma sessão encontrada. Login aguardando !su whatsapp qr ou !su whatsapp codigo <número>.');
        return;
      }
      console.log('[WHATSAPP] Nenhuma credencial válida foi encontrada; aguardando o método de login selecionado.');
    }

    authFlow.cleanupWhatsAppAuthFolder(effectiveAuthFolder, { keepRecentPreKeys: 50 });
    const { state, saveCreds } = await useMultiFileAuthState(effectiveAuthFolder);
    console.log('[WHATSAPP] Credenciais carregadas.');
    const store = makeInMemoryStore({});

    const version = await getWAVersionFromWPP() || FALLBACK_WA_VERSION;
    console.log(`[WHATSAPP] Definindo versão do WhatsApp Web ${JSON.stringify(version)}...`);

    const nullLogger = {
      level: "silent",
      child: () => nullLogger,
      trace: () => { },
      debug: () => { },
      info: () => { },
      warn: () => { },
      error: () => { }
    };

    const sock = makeWASocket({
      auth: state,
      version,
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      printQRInTerminal: false,
      logger: nullLogger
    });

    let pairingRequested = false;
    if (login?.mode === "pairing" && login.number && typeof sock.requestPairingCode === "function") {
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(login.number);
          pairingRequested = true;
          console.log(`[WHATSAPP] Código de pareamento: ${code}`);
          if (login.target) {
            const adapter = getLoginTargetAdapter(login.target);
            if (adapter?.sendText) {
              await adapter.sendText(login.target.chatId, login.target.threadId, `🔐 Código de pareamento do WhatsApp: ${code}`);
            }
          }
        } catch (error) {
          console.error("[WHATSAPP] Falha ao solicitar código de pareamento:", error);
        }
      }, 3000);
    }

    global.whatsappSock = sock;
    store.bind(sock.ev);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("groups.update", async (updates) => {
      for (const update of updates) {
        if (update.id) {
          syncedGroups.delete(update.id);
          groupMetadataCache.delete(update.id);
          try {
            const metadata = await sock.groupMetadata(update.id);
            groupMetadataCache.set(update.id, metadata);
            const communityId = metadata.linkedParent || null;
            groupSettings.syncWhatsAppHierarchy(
              String(update.id),
              communityId ? String(communityId) : null,
              metadata?.subject || null,
              metadata?.subject || null
            );
          } catch (err) {
            console.error("[WHATSAPP_SYNC] Erro ao sincronizar grupo em groups.update:", err);
          }
        }
      }
    });

    sock.ev.on("group-participants.update", async (update) => {
      try {
        if (update.action === "add") {
          await welcomeHelper.handleWhatsAppMemberJoin(sock, update);
        } else if (update.action === "remove" || update.action === "leave") {
          await welcomeHelper.handleWhatsAppMemberLeave(sock, update);
        }
      } catch (err) {
        console.error("[WHATSAPP] Erro ao processar group-participants.update:", err);
      }
    });

    sock.ev.on("group.join-request", async (request) => {
      try {
        await autoAccept.approveWhatsApp(sock, request);
      } catch (err) {
        console.error("[WHATSAPP] Erro ao processar solicitação de entrada:", err);
      }
    });

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        authFlow.cleanupWhatsAppAuthFolder(effectiveAuthFolder, { onQR: true });
        const authStateInfo = authFlow.inspectWhatsAppAuthState(effectiveAuthFolder);
        if (authStateInfo.hasAnyData && !authStateInfo.likelyValid) {
          console.warn(`[WHATSAPP] QR gerado mesmo com credenciais existentes na pasta de auth (${authStateInfo.reason}). Isso normalmente indica uma sessão inválida ou expirada.`);
        } else if (authStateInfo.hasAnyData) {
          console.warn(`[WHATSAPP] QR gerado mesmo com credenciais existentes na pasta de auth. A sessão pode estar inválida ou ter sido descartada.`);
        } else {
          console.log("[WHATSAPP] QR code gerado.");
        }

        if (login?.mode === "pairing") {
          console.log("[WHATSAPP] QR intermediário omitido; aguardando o código de pareamento.");
        } else {
          console.log("[WHATSAPP] Escaneie o QR code com o app do WhatsApp:");
          qrcode.generate(qr, { small: true });
        }

        if (login?.mode === "qr" && login.target) {
          try {
            const image = await QRCode.toBuffer(qr, { type: "png", width: 480, margin: 2 });
            const adapter = getLoginTargetAdapter(login.target);
            if (adapter?.sendImg) {
              await adapter.sendImg(login.target.chatId, login.target.threadId, image, "📱 Escaneie este QR Code no WhatsApp.");
            }
          } catch (error) {
            console.error("[WHATSAPP] Falha ao enviar QR Code como imagem:", error);
          }
        }
      }

      if (connection === "close") {
        const status = lastDisconnect?.error?.output?.statusCode;
        if (status === DisconnectReason.loggedOut) {
          console.log("[WHATSAPP] Sessão desconectada. Limpando credenciais antigas...");
          authFlow.cleanupWhatsAppAuthFolder(effectiveAuthFolder, { all: true });
        } else {
          console.log("[WHATSAPP] Conexão fechada, reconectando...");
          start(onMessage).catch(console.error);
        }
      }

      if (connection === "open") {
        const botId = String(sock.user?.id || "").split("@")[0].split(":")[0];
        console.log(`🟩[WHATSAPP] Conectado como ${botId || "número não confirmado"}`);
        authFlow.cleanupWhatsAppAuthFolder(effectiveAuthFolder, { keepRecentPreKeys: 50 });
        if (global.__pendingAuthBootstrapPlatform === "whatsapp") {
          global.__pendingAuthBootstrapPlatform = null;
          setTimeout(() => process.exit(0), 1000);
        }
      }
    });

    sock.ev.on("messages.upsert", async (m) => {
      const acceptedTypes = new Set(["notify", "append", "before"]);
      if (!acceptedTypes.has(m.type)) {
        console.log(`[WHATSAPP] Ignorando evento messages.upsert de tipo: ${m.type || "desconhecido"}`);
        return;
      }

      if (!Array.isArray(m.messages) || !m.messages.length) return;

      for (const msg of m.messages) {
        if (!msg || !msg.key || !msg.message || msg.key.fromMe) continue;
        if (msg.key?.remoteJid?.endsWith("@broadcast")) continue;

        let text = "";
        const messageContent = msg.message;

        if (messageContent.conversation) {
          text = messageContent.conversation;
        } else if (messageContent.extendedTextMessage?.text) {
          text = messageContent.extendedTextMessage.text;
        } else if (messageContent.imageMessage?.caption) {
          text = messageContent.imageMessage.caption;
        } else if (messageContent.videoMessage?.caption) {
          text = messageContent.videoMessage.caption;
        }

        const hasMediaMessage = !!(
          messageContent.imageMessage ||
          messageContent.videoMessage ||
          messageContent.audioMessage ||
          messageContent.documentMessage ||
          messageContent.stickerMessage
        );

        if (!text && !hasMediaMessage) {
          console.log(`[WHATSAPP] Mensagem ignorada sem texto e sem mídia: ${msg.key?.id}`);
          continue;
        }

        const chatId = msg.key.remoteJid;
        const userId = String(msg.key.participant || msg.key.remoteJid);
        const username = msg.pushName || null;
        const chatType = chatId.endsWith("@g.us") ? "group" : "private";
        const createdAt = msg.messageTimestamp
          ? Number(msg.messageTimestamp) * 1000
          : Date.now();

        let isAdmin = false;
        let canManageMessages = false;

        if (chatType === "private") {
          isAdmin = true;
          canManageMessages = true;
        } else {
          try {
            const metadata = await getGroupMetadataWithTimeout(sock, chatId);
            const participant = metadata.participants.find(p => p.id === userId);
            if (participant) {
              isAdmin = !!participant.admin;
              canManageMessages = isAdmin;
            }

            if (!syncedGroups.has(chatId)) {
              const communityId = metadata.linkedParent || null;
              groupSettings.syncWhatsAppHierarchy(
                String(chatId),
                communityId ? String(communityId) : null,
                metadata?.subject || null,
                metadata?.subject || null
              );
              syncedGroups.add(chatId);
            }
          } catch (err) {
            console.error("[WHATSAPP] Falha ao obter metadados do grupo:", err);
          }
        }

        const botPhone = sock.user?.id ? sock.user.id.split(":")[0].replace(/[^0-9]/g, "") : "";
        const botLid = sock.user?.lid ? sock.user.lid.split(":")[0].replace(/[^0-9]/g, "") : "";
        const botJid = sock.user?.id ? sock.user.id.split(":")[0] + "@s.whatsapp.net" : null;

        function isViewOnceMessage(raw) {
          if (!raw || typeof raw !== "object") return false;
          return Boolean(
            raw.viewOnceMessage ||
            raw.viewOnceMessageV2 ||
            raw.viewOnceMessageV2Extension ||
            raw.imageMessage?.viewOnce ||
            raw.videoMessage?.viewOnce ||
            raw.audioMessage?.viewOnce
          );
        }

        function unwrapMessage(rawMsg) {
          if (!rawMsg || typeof rawMsg !== "object") return {};
          let current = rawMsg;
          let iterations = 0;
          while (
            iterations < 10 &&
            (current.viewOnceMessage?.message ||
             current.viewOnceMessageV2?.message ||
             current.viewOnceMessageV2Extension?.message ||
             current.ephemeralMessage?.message ||
             current.documentWithCaptionMessage?.message)
          ) {
            current = current.viewOnceMessage?.message ||
              current.viewOnceMessageV2?.message ||
              current.viewOnceMessageV2Extension?.message ||
              current.ephemeralMessage?.message ||
              current.documentWithCaptionMessage?.message;
            iterations++;
          }
          return current;
        }

        const unwrappedDirect = unwrapMessage(msg.message);
        const isDirectViewOnce = isViewOnceMessage(msg.message);

        if (unwrappedDirect.conversation) {
          text = unwrappedDirect.conversation;
        } else if (unwrappedDirect.extendedTextMessage?.text) {
          text = unwrappedDirect.extendedTextMessage.text;
        } else if (unwrappedDirect.imageMessage?.caption) {
          text = unwrappedDirect.imageMessage.caption;
        } else if (unwrappedDirect.videoMessage?.caption) {
          text = unwrappedDirect.videoMessage.caption;
        }

        let quoted = null;
        const contextInfo = unwrappedDirect.extendedTextMessage?.contextInfo ||
          unwrappedDirect.imageMessage?.contextInfo ||
          unwrappedDirect.videoMessage?.contextInfo ||
          unwrappedDirect.documentMessage?.contextInfo ||
          unwrappedDirect.audioMessage?.contextInfo ||
          unwrappedDirect.stickerMessage?.contextInfo ||
          unwrappedDirect.buttonsResponseMessage?.contextInfo ||
          unwrappedDirect.listResponseMessage?.contextInfo;

        if (contextInfo && contextInfo.stanzaId) {
          const quotedParticipant = contextInfo.participant ? String(contextInfo.participant) : null;
          const cleanQuotedNum = quotedParticipant ? quotedParticipant.replace(/[^0-9]/g, "") : "";
          const isQuotedFromMe = !!(
            (botPhone && cleanQuotedNum === botPhone) ||
            (botLid && cleanQuotedNum === botLid)
          );

          const rawQMsg = contextInfo.quotedMessage || {};
          const isQuotedViewOnce = isViewOnceMessage(rawQMsg);
          const qMsg = unwrapMessage(rawQMsg);

          const qImage = qMsg.imageMessage;
          const qVideo = qMsg.videoMessage;
          const qAudio = qMsg.audioMessage;
          const qDocument = qMsg.documentMessage;
          const qSticker = qMsg.stickerMessage;

          let qMediaKey = null;
          let qMediaType = null;
          let qMimeType = null;

          if (qImage) { qMediaKey = qImage; qMediaType = "image"; qMimeType = qImage.mimetype; }
          else if (qVideo) { qMediaKey = qVideo; qMediaType = "video"; qMimeType = qVideo.mimetype; }
          else if (qAudio) { qMediaKey = qAudio; qMediaType = "audio"; qMimeType = qAudio.mimetype; }
          else if (qDocument) {
            const docMime = String(qDocument.mimetype || "").toLowerCase();
            const isAudioDocument = docMime.startsWith("audio/") || /(mp3|mpeg|ogg|opus|wav|m4a|aac|amr|mid|flac)/i.test(docMime);
            qMediaKey = qDocument;
            qMediaType = isAudioDocument ? "audio" : "document";
            qMimeType = qDocument.mimetype;
          }
          else if (qSticker) { qMediaKey = qSticker; qMediaType = "sticker"; qMimeType = qSticker.mimetype || "image/webp"; }

          let qMedia = null;
          if (qMediaKey) {
            let _qCachedBuffer = null;
            qMedia = {
              type: qMediaType,
              mimeType: qMimeType,
              isViewOnce: isQuotedViewOnce || Boolean(qMediaKey.viewOnce),
              raw: qMediaKey,
              getBuffer: async () => {
                if (_qCachedBuffer) return _qCachedBuffer;
                const { getFileBuffer } = require("../functions/api");
                _qCachedBuffer = await getFileBuffer(qMediaKey, qMediaType);
                return _qCachedBuffer;
              }
            };
          }

          quoted = {
            messageId: String(contextInfo.stanzaId),
            userId: quotedParticipant || userId,
            username: null,
            fromMe: isQuotedFromMe,
            raw: qMsg,
            media: qMedia,
            isViewOnce: isQuotedViewOnce,
            text: qMsg.conversation ||
              qMsg.extendedTextMessage?.text ||
              qMsg.imageMessage?.caption ||
              qMsg.videoMessage?.caption ||
              ""
          };
        }

        const mentionedJids = Array.isArray(contextInfo?.mentionedJid) ? contextInfo.mentionedJid : [];

        const message = {
          platform: "whatsapp",
          chatId: String(chatId),
          threadId: null,
          target: {
            chatId: String(chatId),
            threadId: null
          },
          userId,
          username,
          displayName: username || null,
          text,
          raw: msg,
          messageId: String(msg.key.id),
          createdAt,
          apiPing: null,
          chatType,
          isPrivate: chatType === "private",
          botId: botJid,
          botLid: botLid ? `${botLid}@lid` : null,
          botUsername: null,
          mentionedJids,
          sender: {
            isAdmin,
            canManageMessages
          },
          quoted,
          delete: async function (messageId, participant = null) {
            try {
              const key = {
                ...msg.key,
                remoteJid: chatId,
                id: messageId,
                fromMe: Boolean(msg.key.fromMe)
              };

              if (!key.fromMe && chatType === "group") {
                key.participant = participant || msg.key.participant || userId;
              }

              await sock.sendMessage(chatId, { delete: key });
              return true;
            } catch (err) {
              console.error("[WHATSAPP] Falha ao deletar mensagem:", err);
              throw err;
            }
          },
          media: (() => {
            const imageMsg = unwrappedDirect.imageMessage;
            const videoMsg = unwrappedDirect.videoMessage;
            const audioMsg = unwrappedDirect.audioMessage;
            const documentMsg = unwrappedDirect.documentMessage;
            const stickerMsg = unwrappedDirect.stickerMessage;

            let mediaKey = null;
            let mediaType = null;
            let mimeType = null;

            if (imageMsg) { mediaKey = imageMsg; mediaType = "image"; mimeType = imageMsg.mimetype; }
            else if (videoMsg) { mediaKey = videoMsg; mediaType = "video"; mimeType = videoMsg.mimetype; }
            else if (audioMsg) { mediaKey = audioMsg; mediaType = "audio"; mimeType = audioMsg.mimetype; }
            else if (documentMsg) {
              const docMime = String(documentMsg.mimetype || "").toLowerCase();
              const isAudioDocument = docMime.startsWith("audio/") || /(mp3|mpeg|ogg|opus|wav|m4a|aac|amr|mid|flac)/i.test(docMime);
              mediaKey = documentMsg;
              mediaType = isAudioDocument ? "audio" : "document";
              mimeType = documentMsg.mimetype;
            }
            else if (stickerMsg) { mediaKey = stickerMsg; mediaType = "sticker"; mimeType = stickerMsg.mimetype || "image/webp"; }

            if (!mediaKey) return null;

            let _cachedBuffer = null;
            return {
              type: mediaType,
              mimeType,
              isViewOnce: isDirectViewOnce || Boolean(mediaKey.viewOnce),
              raw: mediaKey,
              getBuffer: async () => {
                if (_cachedBuffer) return _cachedBuffer;
                const { getFileBuffer } = require("../functions/api");
                _cachedBuffer = await getFileBuffer(mediaKey, mediaType);
                return _cachedBuffer;
              }
            };
          })(),
          reply: async function (data) {
            if (typeof data === "object" && data !== null && (data.image || data.photo || data.file || data.url || data.media?.buffer || data.media?.url)) {
              const image = data.image || data.photo || data.file || data.url || data.media?.buffer || data.media?.url;
              return await this.replyImg({ image, caption: data.caption || data.text || "" });
            }
            const options = { quoted: msg };
            if (Array.isArray(data?.mentions) && data.mentions.length) {
              options.mentions = data.mentions;
            }
            const payload = {
              text: (typeof data === "string" ? data : data?.text) || ""
            };
            if (Array.isArray(data?.mentions) && data.mentions.length) {
              payload.mentions = data.mentions;
              payload.contextInfo = { mentionedJid: data.mentions };
            }
            await sock.sendMessage(chatId, payload, options);
          },
          react: async function (emoji, add = true) {
            await sock.sendMessage(chatId, {
              react: {
                text: add ? emoji : "",
                key: msg.key
              }
            });
          },

          replyImg: async function (data) {
            const caption = data.caption || data.text || "";
            const image = data.url || data.image || data.file;

            if (!image) {
              throw new Error(
                "[WHATSAPP] replyImg precisa de `url`, `image` ou `file`."
              );
            }

            const messagePayload = { caption };
            if (Array.isArray(data.mentions) && data.mentions.length) {
              messagePayload.mentions = data.mentions;
            }

            if (Buffer.isBuffer(image)) {
              messagePayload.image = image;
            } else if (typeof image === "string" && /^https?:\/\//i.test(image)) {
              messagePayload.image = { url: image };
            } else if (typeof image === "string") {
              const resolvedPath = path.isAbsolute(image)
                ? image
                : path.join(process.cwd(), image);

              if (!fs.existsSync(resolvedPath)) {
                throw new Error(
                  `[WHATSAPP] Arquivo não encontrado: ${resolvedPath}`
                );
              }

              messagePayload.image = fs.readFileSync(resolvedPath);
            } else {
              throw new Error("[WHATSAPP] Formato de imagem inválido.");
            }

            await sock.sendMessage(chatId, messagePayload, { quoted: msg });
          },
          replyVideo: async function (data) {
            const caption = data.caption || data.text || "";
            const video = data.url || data.video || data.file;

            if (!video) {
              throw new Error(
                "[WHATSAPP] replyVideo precisa de `url`, `video` ou `file`."
              );
            }

            const messagePayload = { caption };
            if (Array.isArray(data.mentions) && data.mentions.length) {
              messagePayload.mentions = data.mentions;
            }

            if (data.gifPlayback) {
              messagePayload.gifPlayback = true;
            }

            if (Buffer.isBuffer(video)) {
              messagePayload.video = video;
            } else if (typeof video === "string" && /^https?:\/\//i.test(video)) {
              messagePayload.video = { url: video };
            } else if (typeof video === "string") {
              const resolvedPath = path.isAbsolute(video)
                ? video
                : path.join(process.cwd(), video);

              if (!fs.existsSync(resolvedPath)) {
                throw new Error(
                  `[WHATSAPP] Arquivo não encontrado: ${resolvedPath}`
                );
              }

              messagePayload.video = fs.readFileSync(resolvedPath);
            } else {
              throw new Error("[WHATSAPP] Formato de vídeo inválido.");
            }

            await sock.sendMessage(chatId, messagePayload, { quoted: msg });
          },
          replyAudio: async function (data) {
            const caption = data.caption || data.text || "";
            const audio = data.url || data.audio || data.file;

            if (!audio) {
              throw new Error(
                "[WHATSAPP] replyAudio precisa de `url`, `audio` ou `file`."
              );
            }

            // CORREÇÃO: Forçando o tipo de mídia para formato de música e desativando o modo PTT (Push-to-Talk / Gravador de Voz)
            const messagePayload = {
              caption,
              mimetype: "audio/mp4",
              ptt: false,
              fileName: data.filename || "audio.mp3"
            };
            if (Array.isArray(data.mentions) && data.mentions.length) {
              messagePayload.mentions = data.mentions;
            }

            if (Buffer.isBuffer(audio)) {
              messagePayload.audio = audio;
            } else if (typeof audio === "string" && /^https?:\/\//i.test(audio)) {
              messagePayload.audio = { url: audio };
            } else if (typeof audio === "string") {
              const resolvedPath = path.isAbsolute(audio)
                ? audio
                : path.join(process.cwd(), audio);

              if (!fs.existsSync(resolvedPath)) {
                throw new Error(
                  `[WHATSAPP] Arquivo não encontrado: ${resolvedPath}`
                );
              }

              messagePayload.audio = fs.readFileSync(resolvedPath);
            } else {
              throw new Error("[WHATSAPP] Formato de áudio inválido.");
            }

            await sock.sendMessage(chatId, messagePayload, { quoted: msg });
          },
          replyFile: async function (data) {
            const caption = data.caption || data.text || "";
            const document = data.url || data.document || data.file;

            if (!document) {
              throw new Error(
                "[WHATSAPP] replyFile precisa de `url`, `document` ou `file`."
              );
            }

            const messagePayload = { caption };

            if (Buffer.isBuffer(document)) {
              messagePayload.document = document;
            } else if (typeof document === "string" && /^https?:\/\//i.test(document)) {
              messagePayload.document = { url: document };
            } else if (typeof document === "string") {
              const resolvedPath = path.isAbsolute(document)
                ? document
                : path.join(process.cwd(), document);

              if (!fs.existsSync(resolvedPath)) {
                throw new Error(
                  `[WHATSAPP] Arquivo não encontrado: ${resolvedPath}`
                );
              }

              messagePayload.document = fs.readFileSync(resolvedPath);
            } else {
              throw new Error("[WHATSAPP] Formato de arquivo inválido.");
            }

            messagePayload.mimetype = data.mimetype || "application/octet-stream";
            messagePayload.fileName = data.filename || data.fileName || "document";

            await sock.sendMessage(chatId, messagePayload, { quoted: msg });
          },
          replySticker: async function (sticker) {
            if (!sticker) {
              throw new Error("[WHATSAPP] replySticker precisa de um buffer, URL ou caminho de arquivo.");
            }
            let stickerPayload;
            if (Buffer.isBuffer(sticker)) {
              stickerPayload = sticker;
            } else if (typeof sticker === "string" && /^https?:\/\//i.test(sticker)) {
              stickerPayload = { url: sticker };
            } else if (typeof sticker === "string") {
              const resolvedPath = path.isAbsolute(sticker) ? sticker : path.join(process.cwd(), sticker);
              stickerPayload = fs.readFileSync(resolvedPath);
            } else {
              stickerPayload = sticker;
            }
            await sock.sendMessage(chatId, { sticker: stickerPayload }, { quoted: msg });
          }

        };

        // Marcar mensagem como lida
        try {
          await sock.readMessages([msg.key]);
        } catch (err) {
          console.warn(`[WHATSAPP] Falha ao marcar mensagem como lida: ${msg.key.id}`, err.message || err);
        }

        await onMessage(message);
      }
    });
  } catch (err) {
    console.error('[WHATSAPP] Erro ao inicializar o adapter:', err);
  }
}

async function sendText(
  chatId,
  threadId,
  text
) {

  if (!global.whatsappSock) {

    throw new Error(
      "[WHATSAPP] Socket não iniciado."
    );

  }

  const result = await global.whatsappSock.sendMessage(
    chatId,
    {
      text
    }
  );

  return String(result.key.id);

}

async function sendImg(
  chatId,
  threadId,
  image,
  caption
) {

  if (!global.whatsappSock) {

    throw new Error(
      "[WHATSAPP] Socket não iniciado."
    );

  }

  const payload = {

    caption:
      caption || ""

  };

  const isRemoteUrl =
    typeof image === "string" &&
    /^https?:\/\//i.test(image);

  if (isRemoteUrl) {

    payload.image = {

      url: image

    };

  } else if (typeof image === "string") {

    const resolvedPath = path.isAbsolute(image)
      ? image
      : path.join(process.cwd(), image);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `[WHATSAPP] Arquivo não encontrado: ${resolvedPath}`
      );
    }

    payload.image = fs.readFileSync(resolvedPath);

  } else {

    payload.image = image;

  }

  const result = await global.whatsappSock.sendMessage(
    chatId,
    payload
  );

  return String(result.key.id);

}

async function sendVideo(
  chatId,
  threadId,
  video,
  caption
) {

  if (!global.whatsappSock) {

    throw new Error(
      "[WHATSAPP] Socket não iniciado."
    );

  }

  const payload = {

    caption:
      caption || ""

  };

  const isRemoteUrl =
    typeof video === "string" &&
    /^https?:\/\//i.test(video);

  if (isRemoteUrl) {

    payload.video = {

      url: video

    };

  } else if (typeof video === "string") {

    const resolvedPath = path.isAbsolute(video)
      ? video
      : path.join(process.cwd(), video);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `[WHATSAPP] Arquivo não encontrado: ${resolvedPath}`
      );
    }

    payload.video = fs.readFileSync(resolvedPath);

  } else {

    payload.video = video;

  }

  const result = await global.whatsappSock.sendMessage(
    chatId,
    payload
  );

  return String(result.key.id);

}

async function sendAudio(
  chatId,
  threadId,
  audio,
  caption
) {

  if (!global.whatsappSock) {

    throw new Error(
      "[WHATSAPP] Socket não iniciado."
    );

  }

  const payload = {
    caption: caption || "Áudio recebido",
    mimetype: "audio/mpeg",
    ptt: false
  };

  const isRemoteUrl =
    typeof audio === "string" &&
    /^https?:\/\//i.test(audio);

  if (isRemoteUrl) {

    payload.audio = {

      url: audio

    };

  } else if (typeof audio === "string") {

    const resolvedPath = path.isAbsolute(audio)
      ? audio
      : path.join(process.cwd(), audio);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `[WHATSAPP] Arquivo não encontrado: ${resolvedPath}`
      );
    }

    payload.audio = fs.readFileSync(resolvedPath);

  } else {

    payload.audio = audio;

  }

  const result = await global.whatsappSock.sendMessage(
    chatId,
    payload
  );

  return String(result.key.id);

}

async function sendFile(
  chatId,
  threadId,
  file,
  caption,
  filename,
  mimetype
) {
  if (!global.whatsappSock) {
    throw new Error(
      "[WHATSAPP] Socket não iniciado."
    );
  }

  const payload = {
    caption: caption || ""
  };

  const isRemoteUrl =
    typeof file === "string" &&
    /^https?:\/\//i.test(file);

  if (isRemoteUrl) {
    payload.document = {
      url: file
    };
  } else if (typeof file === "string") {
    const resolvedPath = path.isAbsolute(file)
      ? file
      : path.join(process.cwd(), file);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(
        `[WHATSAPP] Arquivo não encontrado: ${resolvedPath}`
      );
    }

    payload.document = fs.readFileSync(resolvedPath);
  } else {
    payload.document = file;
  }

  payload.mimetype = mimetype || "application/octet-stream";
  payload.fileName = filename || "document";

  const result = await global.whatsappSock.sendMessage(
    chatId,
    payload
  );

  return String(result.key.id);
}

/**
 * Verifica se o BOT é administrador no grupo (necessário para delete, kick e ban).
 * No WhatsApp todas essas ações exigem que o bot seja admin.
 * @param {string} chatId  JID do grupo (ex: 123@g.us)
 * @param {string} action  'delete' | 'kick' | 'ban'
 * @returns {Promise<boolean>}
 */
async function checkBotPermission(chatId, action) {
  if (!global.whatsappSock) return false;
  // Em chats privados não há restrição
  if (!chatId.endsWith("@g.us")) return true;
  try {
    const metadata = await global.whatsappSock.groupMetadata(chatId);
    const botIds = [
      global.whatsappSock.user?.id,
      global.whatsappSock.user?.lid
    ].filter(Boolean);
    const botMember = metadata.participants.find((participant) => {
      const participantIds = [
        participant.id,
        participant.lid,
        participant.phoneNumber
      ].filter(Boolean);
      return participantIds.some((participantId) =>
        botIds.some((botId) => {
          if (typeof areJidsSameUser === "function") {
            return areJidsSameUser(participantId, botId);
          }
          return participantId === botId;
        })
      );
    });
    if (!botMember) return false;
    // delete, kick e ban exigem o bot ser admin no WhatsApp
    return !!botMember.admin;
  } catch {
    return false;
  }
}

/**
 * Verifica se o MEMBRO é administrador ou superadmin do grupo.
 * @param {string} chatId  JID do grupo
 * @param {string} userId  JID do usuário
 * @returns {Promise<boolean>}
 */
async function checkUserPermission(chatId, userId) {
  if (!global.whatsappSock) return false;
  if (!chatId.endsWith("@g.us")) return true; // PV sempre pode
  try {
    const metadata = await global.whatsappSock.groupMetadata(chatId);
    const member = metadata.participants.find((participant) => {
      const participantIds = [
        participant.id,
        participant.lid,
        participant.phoneNumber
      ].filter(Boolean);
      return participantIds.some((participantId) => {
        if (typeof areJidsSameUser === "function") {
          return areJidsSameUser(participantId, userId);
        }
        return participantId === userId;
      });
    });
    if (!member) return false;
    return !!member.admin; // admin ou superadmin
  } catch {
    return false;
  }
}

async function sendSticker(chatId, threadId, sticker) {
  if (!global.whatsappSock) throw new Error("[WHATSAPP] Socket não iniciado.");
  let stickerPayload;
  if (Buffer.isBuffer(sticker)) {
    stickerPayload = sticker;
  } else if (typeof sticker === "string" && /^https?:\/\//i.test(sticker)) {
    stickerPayload = { url: sticker };
  } else if (typeof sticker === "string") {
    const resolvedPath = path.isAbsolute(sticker) ? sticker : path.join(process.cwd(), sticker);
    stickerPayload = fs.readFileSync(resolvedPath);
  } else {
    stickerPayload = sticker;
  }
  const result = await global.whatsappSock.sendMessage(chatId, { sticker: stickerPayload });
  return String(result.key.id);
}

module.exports = {

  name: "whatsapp",

  start,

  sendText,

  sendImg,

  sendVideo,

  sendAudio,

  sendFile,

  sendSticker,

  checkBotPermission,

  checkUserPermission

};