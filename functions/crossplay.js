const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Limites de tamanho de vídeo por plataforma (em bytes)
// Baseado em:
// - Discord: https://discord.com/developers/docs/resources/channel#create-message (25 MB sem Nitro)
// - Telegram: https://core.telegram.org/bots/api (20 MB para sendVideo)
// - WhatsApp: 16 MB (suportado pelo usuário)
const VIDEO_SIZE_LIMITS = {
  whatsapp: 16 * 1024 * 1024,      // 16 MB
  telegram: 20 * 1024 * 1024,      // 20 MB (Telegram Bot API limit)
  discord: 25 * 1024 * 1024        // 25 MB (sem Nitro)
};

// Limites de tamanho de áudio por plataforma (em bytes)
// Áudio geralmente pode ser maior que vídeo
const AUDIO_SIZE_LIMITS = {
  whatsapp: 16 * 1024 * 1024,      // 16 MB
  telegram: 20 * 1024 * 1024,      // 20 MB (limite similar ao vídeo)
  discord: 25 * 1024 * 1024        // 25 MB (limite similar ao vídeo)
};

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function getVideoSizeLimit(platform) {
  return VIDEO_SIZE_LIMITS[platform] || VIDEO_SIZE_LIMITS.discord;
}

function getAudioSizeLimit(platform) {
  return AUDIO_SIZE_LIMITS[platform] || AUDIO_SIZE_LIMITS.discord;
}

class CrossplayStore {
  constructor() {
    this.filePath = null;
    this.data = { centralIdentities: {}, crossplayGroups: {}, linkCodes: {}, recentHistory: {} };
    this.dirty = false;
    this.saving = false;
    this._autoSaveHandle = null;
  }

  async init(filePath) {
    this.filePath = filePath;
    try {
      const txt = await fs.readFile(filePath, 'utf8');
      this.data = JSON.parse(txt || '{}');
      if (!this.data.centralIdentities) this.data.centralIdentities = {};
      if (!this.data.crossplayGroups) this.data.crossplayGroups = {};
      if (!this.data.linkCodes) this.data.linkCodes = {};
      if (!this.data.recentHistory) this.data.recentHistory = {};
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      this.data = { centralIdentities: {}, crossplayGroups: {}, linkCodes: {}, recentHistory: {} };
      await this._ensureDirForFile();
      await this._atomicWrite(JSON.stringify(this.data, null, 2));
    }
    return this;
  }

  async _ensureDirForFile() {
    if (!this.filePath) return;
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  _markDirty() { this.dirty = true; }
  _nowISO() { return new Date().toISOString(); }
  _genCode(len = 8) { return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len).toUpperCase(); }
  _genId() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }

  async _atomicWrite(content) {
    await this._ensureDirForFile();
    const tmp = this.filePath + '.tmp';
    await fs.writeFile(tmp, content, 'utf8');
    await fs.rename(tmp, this.filePath);
  }

  async saveNow() {
    if (!this.filePath) throw new Error('Store not initialized');
    if (!this.dirty) return false;
    if (this.saving) return false;
    this.saving = true;
    try {
      await this._atomicWrite(JSON.stringify(this.data, null, 2));
      this.dirty = false;
      return true;
    } finally { this.saving = false; }
  }

  startAutoSave(intervalMs = 300_000) {
    if (this._autoSaveHandle) return;
    this._autoSaveHandle = setInterval(() => this.saveNow().catch(() => { }), intervalMs);
  }

  stopAutoSave() { if (!this._autoSaveHandle) return; clearInterval(this._autoSaveHandle); this._autoSaveHandle = null; }

  async ensureCentral(centralId, data = {}) {
    const existing = this.data.centralIdentities[centralId] || null;
    if (existing) {
      existing.name = data.name || existing.name || null;
      existing.updatedAt = this._nowISO();
      this._markDirty();
      return existing;
    }
    const central = {
      id: centralId,
      name: data.name || null,
      createdAt: this._nowISO(),
      updatedAt: this._nowISO()
    };
    this.data.centralIdentities[centralId] = central;
    this._markDirty();
    return central;
  }

  async createLinkCode(platformOrCentralId, chatIdOrOptions, options = {}) {
    let platform = null;
    let chatId = null;
    let opts = {};

    if (chatIdOrOptions && typeof chatIdOrOptions === 'object' && !Array.isArray(chatIdOrOptions)) {
      opts = chatIdOrOptions;
    } else {
      platform = platformOrCentralId;
      chatId = chatIdOrOptions;
      opts = options;
    }

    const { centralId = null, centralName = null, threadId = null, ttlMinutes = 5 } = opts;
    const central = centralId ? await this.ensureCentral(centralId, { name: centralName || null }) : null;
    const groupId = this._genId();
    const code = this._genCode(8);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
    const group = {
      id: groupId,
      centralId: central?.id || null,
      displayName: central?.name || centralName || 'Conta central',
      createdAt: this._nowISO(),
      updatedAt: this._nowISO(),
      chats: []
    };

    if (platform && chatId) {
      group.chats.push({
        platform,
        chatId: String(chatId),
        threadId: threadId ? String(threadId) : null,
        linkedAt: this._nowISO(),
        receiveMedia: ['text', 'image', 'video', 'audio', 'document', 'sticker'],
        ignoreMedia: []
      });
    }

    this.data.crossplayGroups[groupId] = group;
    this.data.linkCodes[code] = { code, groupId, centralId: central?.id || null, threadId: threadId ? String(threadId) : null, expiresAt, createdAt: this._nowISO(), usedBy: [] };
    this._markDirty();
    return { code, expiresAt, groupId };
  }

  async claimLinkCode(code, platform, chatId, { centralId = null, centralName = null, threadId = null } = {}) {
    const entry = this.data.linkCodes[code];
    if (!entry) throw new Error('invalid-code');
    if (new Date(entry.expiresAt) < new Date()) {
      delete this.data.linkCodes[code];
      this._markDirty();
      throw new Error('code-expired');
    }
    const central = centralId ? await this.ensureCentral(centralId, { name: centralName || null }) : (entry.centralId ? await this.ensureCentral(entry.centralId) : null);
    const group = this.data.crossplayGroups[entry.groupId];
    if (!group) throw new Error('group-not-found');
    const normalizedChatId = String(chatId);
    const normalizedThreadId = threadId ? String(threadId) : null;
    const existing = (group.chats || []).find(item => item.platform === platform && String(item.chatId) === normalizedChatId && String(item.threadId || '') === String(normalizedThreadId || ''));
    if (existing) {
      entry.usedBy = Array.isArray(entry.usedBy) ? entry.usedBy : [];
      entry.usedBy.push({ platform, chatId: normalizedChatId, threadId: normalizedThreadId, linkedAt: this._nowISO(), reused: true });
      this._markDirty();
      return { ...existing, groupId: group.id, centralId: central?.id || entry.centralId, reused: true };
    }
    group.chats.push({
      platform,
      chatId: normalizedChatId,
      threadId: normalizedThreadId,
      linkedAt: this._nowISO(),
      receiveMedia: ['text', 'image', 'video', 'audio', 'document', 'sticker'],
      ignoreMedia: []
    });
    group.centralId = central?.id || group.centralId || entry.centralId || null;
    group.displayName = central?.name || group.displayName || centralName || 'Conta central';
    group.updatedAt = this._nowISO();
    entry.usedBy = Array.isArray(entry.usedBy) ? entry.usedBy : [];
    entry.usedBy.push({ platform, chatId: normalizedChatId, threadId: normalizedThreadId, linkedAt: this._nowISO() });
    this._markDirty();
    return { platform, chatId: normalizedChatId, threadId: normalizedThreadId, groupId: group.id, centralId: group.centralId };
  }

  async findByChat(platform, chatId, threadId = null) {
    const normalizedChatId = String(chatId);
    const normalizedThreadId = threadId ? String(threadId) : null;

    for (const group of Object.values(this.data.crossplayGroups)) {
      const entry = (group.chats || []).find(item => {
        const itemPlatform = String(item.platform);
        const itemChatId = String(item.chatId);
        const itemThreadId = item.threadId ? String(item.threadId) : null;

        return itemPlatform === platform &&
               itemChatId === normalizedChatId &&
               itemThreadId === normalizedThreadId;
      });
      if (entry) {
        return { ...group, chat: entry };
      }
    }
    return null;
  }

  async findByPlatform(platform, platformId, threadId = null) {
    return this.findByChat(platform, platformId, threadId);
  }

  async unlinkChat(platform, chatId, threadId = null) {
    const normChatId = String(chatId);
    const normThreadId = threadId ? String(threadId) : null;
    let found = false;

    for (const groupId of Object.keys(this.data.crossplayGroups)) {
      const group = this.data.crossplayGroups[groupId];
      const initialLength = (group.chats || []).length;
      group.chats = (group.chats || []).filter(item => !(
        String(item.platform) === String(platform) &&
        String(item.chatId) === normChatId &&
        String(item.threadId || '') === String(normThreadId || '')
      ));

      if (group.chats.length !== initialLength) {
        found = true;
        group.updatedAt = this._nowISO();
        if (group.chats.length === 0) {
          delete this.data.crossplayGroups[groupId];
        }
      }
    }

    if (found) {
      this._markDirty();
      await this.saveNow();
      return true;
    }
    return false;
  }

  async getLinkedChats(groupId) {
    const group = this.data.crossplayGroups[groupId];
    if (!group) return [];
    return (group.chats || []).map(chat => ({ ...chat, groupId: group.id, displayName: group.displayName, threadId: chat.threadId || null }));
  }

  async getPlatformPreferences(groupId, platform, chatId, threadId = null) {
    const group = this.data.crossplayGroups[groupId];
    if (!group) return { receiveMedia: [], ignoreMedia: [] };
    const normChatId = String(chatId);
    const normThreadId = threadId ? String(threadId) : null;
    const existing = (group.chats || []).find(item =>
      item.platform === platform &&
      String(item.chatId) === normChatId &&
      String(item.threadId || '') === String(normThreadId || '')
    );
    if (!existing) return { receiveMedia: [], ignoreMedia: [] };
    return {
      receiveMedia: Array.isArray(existing.receiveMedia) ? existing.receiveMedia : [],
      ignoreMedia: Array.isArray(existing.ignoreMedia) ? existing.ignoreMedia : []
    };
  }

  async setPlatformPreferences(groupId, platform, chatId, preferences = {}, threadId = null) {
    const group = this.data.crossplayGroups[groupId];
    if (!group) throw new Error('group-not-found');
    const normChatId = String(chatId);
    const normThreadId = threadId ? String(threadId) : null;
    const current = (group.chats || []).find(item =>
      item.platform === platform &&
      String(item.chatId) === normChatId &&
      String(item.threadId || '') === String(normThreadId || '')
    );
    if (!current) throw new Error('chat-link-not-found');
    const next = {
      ...current,
      receiveMedia: Array.isArray(preferences.receiveMedia) ? preferences.receiveMedia : current.receiveMedia || [],
      ignoreMedia: Array.isArray(preferences.ignoreMedia) ? preferences.ignoreMedia : current.ignoreMedia || []
    };
    Object.assign(current, next);
    group.updatedAt = this._nowISO();
    this._markDirty();
    return next;
  }

  async shouldRelayMedia(groupId, platform, chatId, mediaType, threadId = null) {
    const prefs = await this.getPlatformPreferences(groupId, platform, chatId, threadId);
    const type = String(mediaType || '').toLowerCase();
    if (!type) return true;
    if (prefs.ignoreMedia.includes(type)) return false;
    if (Array.isArray(prefs.receiveMedia) && prefs.receiveMedia.length && !prefs.receiveMedia.includes(type)) return false;
    return true;
  }

  async relayIncomingMessage(message) {
    if (!message || !message.platform || !message.chatId || message.isPrivate) return false;
    const crossplayStore = (message.functions && message.functions.crossplay) || global.crossplayStore;
    const centralAccountsStore = (message.functions && message.functions.centralAccounts) || global.centralAccounts;
    if (!crossplayStore || typeof crossplayStore.findByChat !== 'function') return false;

    const sourceGroup = await crossplayStore.findByChat(message.platform, message.chatId, message.threadId);
    if (!sourceGroup) return false;

    const centralId = sourceGroup.centralId;
    const platformEmoji = {
      whatsapp: '🟢',
      telegram: '🔵',
      discord: '🟣'
    }[message.platform] || '📡';

    const targets = await crossplayStore.getLinkedChats(sourceGroup.id);
    if (!targets.length) return false;

    let text = typeof message.text === 'string' ? message.text.trim() : '';
    let media = message.media || null;

    // Processamento de emojis customizados do Discord
    if (text) {
      const discordEmojiHelper = require('./discordEmojiHelper');
      const emojiResult = discordEmojiHelper.processDiscordEmojis(text);

      if (emojiResult.isStandalone && !media) {
        console.log(`[CROSSPLAY] 🖼️ Emoji do Discord sozinho detectado (${emojiResult.name}:${emojiResult.id}), convertendo para mídia de imagem...`);
        media = {
          type: 'image',
          mimeType: emojiResult.isAnimated ? 'image/gif' : 'image/png',
          url: emojiResult.url,
          getBuffer: async () => {
            const api = require('./api');
            return await api.fetchBuffer(emojiResult.url);
          }
        };
        text = '';
      } else {
        text = emojiResult.text;
      }
    }

    // Detecção de stickers do Vencord / FakeNitro: [Name](https://media.discordapp.net/stickers/ID.png?...)
    const VENCORD_STICKER_STANDALONE = /^\s*\[([a-zA-Z0-9_]+)\]\((https?:\/\/(?:cdn|media)\.discordapp\.(?:com|net)\/stickers\/(\d+)\.[a-zA-Z0-9]+(?:\?[^\s)]*)?)\)\s*$/i;
    const VENCORD_STICKER_INLINE = /\[([a-zA-Z0-9_]+)\]\((https?:\/\/(?:cdn|media)\.discordapp\.(?:com|net)\/stickers\/(\d+)\.[a-zA-Z0-9]+(?:\?[^\s)]*)?)\)/gi;

    if (text && !media) {
      const stickerMatch = text.trim().match(VENCORD_STICKER_STANDALONE);
      if (stickerMatch) {
        const stickerName = stickerMatch[1];
        const stickerUrl = stickerMatch[2];
        const stickerId = stickerMatch[3];
        console.log(`[CROSSPLAY] 🎨 Sticker do Vencord sozinho detectado (${stickerName}:${stickerId}), convertendo para figurinha...`);
        media = {
          type: 'sticker',
          mimeType: 'image/png',
          url: stickerUrl,
          stickerName,
          getBuffer: async () => {
            const api = require('./api');
            return await api.fetchBuffer(stickerUrl);
          }
        };
        text = '';
      }
    }
    // Stickers do Vencord inline no texto: substituir por emoji 🎭
    if (text) {
      text = text.replace(VENCORD_STICKER_INLINE, (fullMatch, name) => `🎭`);
    }

    let rawMediaType = media?.type || media?.mimeType || null;
    
    // Extrai tipo de mídia correto: "image/jpeg" -> "image", "video/mp4" -> "video", etc
    let mediaType = null;
    if (typeof rawMediaType === 'string') {
      const cleaned = rawMediaType.toLowerCase();
      if (cleaned.includes('sticker')) {
        mediaType = 'sticker';
      } else if (cleaned.startsWith('image/') || cleaned.includes('image') || /(jpeg|jpg|png|webp|gif)/i.test(cleaned)) {
        mediaType = 'image';
      } else if (cleaned.startsWith('video/') || cleaned.includes('video') || /(mp4|mkv|avi|mov|webm)/i.test(cleaned)) {
        mediaType = 'video';
      } else if (
        cleaned.startsWith('audio/') ||
        cleaned.includes('audio') ||
        /(mp3|mpeg|ogg|opus|wav|m4a|aac|amr|mid|flac)/i.test(cleaned)
      ) {
        mediaType = 'audio';
      } else if (cleaned.includes('document') || cleaned.includes('pdf')) {
        mediaType = 'document';
      } else {
        mediaType = cleaned.split('/')[0];
      }
    }
    
    const isCommand = typeof message.text === 'string' && message.text.startsWith(message.prefix || '!');

    console.log(`[CROSSPLAY] 📨 Mensagem recebida - Plataforma: ${message.platform}, ChatID: ${message.chatId}, Texto: "${text.substring(0, 50)}...", Mídia: ${media ? 'SIM' : 'NÃO'}`);

    if (isCommand) {
      console.log(`[CROSSPLAY] ⏭️  Pulando comando (detectado prefixo)`);
      return true;
    }

    // Obter conta central do próprio remetente da mensagem (se houver)
    let senderCentralName = null;
    if (centralAccountsStore && message.userId && typeof centralAccountsStore.findByPlatform === 'function') {
      const senderCentral = centralAccountsStore.findByPlatform(message.platform, message.userId);
      if (senderCentral && senderCentral.name) {
        senderCentralName = senderCentral.name;
      }
    }

    const displayNameToUse = senderCentralName || message.username || message.displayName || message.name || 'Usuário';
    const prefix = `${platformEmoji} ${displayNameToUse}: `;

    console.log(`[CROSSPLAY] 🎯 ${targets.length} chat(s) alvo(s) encontrado(s)`);

    for (const target of targets) {
      if (target.platform === message.platform && target.chatId === message.chatId) {
        console.log(`[CROSSPLAY] ⏭️  Pulando chat de origem (${target.platform}:${target.chatId})`);
        continue;
      }

      if (!target.chatId) {
        console.log(`[CROSSPLAY] ⚠️  ChatID inválido no alvo, pulando`);
        continue;
      }

      // Texto, imagens, vídeos, áudio e stickers
      const isImageMedia = media && (mediaType === 'image' || mediaType === 'jpeg' || mediaType === 'png' || mediaType === 'jpg' || mediaType?.startsWith?.('image/'));
      const isVideoMedia = media && (mediaType === 'video' || mediaType?.startsWith?.('video/'));
      const isAudioMedia = media && (mediaType === 'audio' || mediaType?.startsWith?.('audio/'));
      const isStickerMedia = media && (mediaType === 'sticker' || mediaType?.startsWith?.('sticker/'));
      const isTextOnly = !media || (media && !isImageMedia && !isVideoMedia && !isAudioMedia && !isStickerMedia);

      if (media && !isImageMedia && !isVideoMedia && !isAudioMedia && !isStickerMedia) {
        console.log(`[CROSSPLAY] ⏭️  Pulando mídia tipo "${mediaType}" (apenas texto, imagens, vídeos, áudio e stickers são suportados)`);
        // Enviar apenas o texto se houver
        if (text) {
          const platformRegistry = global.platformRegistry || {};
          const adapter = platformRegistry[target.platform];
          if (adapter) {
            try {
              const payloadText = `${prefix}${text}`.trim();
              await adapter.sendText?.(String(target.chatId), target.threadId || null, payloadText);
              console.log(`[CROSSPLAY] ✅ Texto enviado para ${target.platform} (fallback)`);
            } catch (err) {
              console.error(`[CROSSPLAY] ❌ Erro ao enviar texto para ${target.platform}:`, err.message);
            }
          }
        }
        continue;
      }

      const allowed = mediaType ? await crossplayStore.shouldRelayMedia(sourceGroup.id, target.platform, target.chatId, mediaType, target.threadId) : true;
      if (!allowed) {
        console.log(`[CROSSPLAY] ⏭️  Mídia tipo "${mediaType}" bloqueada para ${target.platform}`);
        continue;
      }

      const platformRegistry = global.platformRegistry || {};
      const adapter = platformRegistry[target.platform];
      if (!adapter) {
        console.log(`[CROSSPLAY] ⚠️  Adapter não encontrado para ${target.platform}`);
        continue;
      }

      const threadIdToUse = target.threadId || null;

      try {
        const payloadText = `${prefix}${text || ''}`.trim() || `${platformEmoji} ${displayNameToUse}`;
        
        // APENAS TEXTO E IMAGENS
        if (isImageMedia && media) {
          console.log(`[CROSSPLAY] 📸 Processando imagem para ${target.platform}...`);
          
          // Tenta obter buffer
          let mediaBuffer = null;
          if (typeof media.getBuffer === 'function') {
            console.log(`[CROSSPLAY]   - Chamando media.getBuffer()...`);
            try {
              mediaBuffer = await media.getBuffer();
              console.log(`[CROSSPLAY]   - Buffer obtido: ${mediaBuffer ? `${mediaBuffer.length} bytes` : 'NULL'}`);
            } catch (bufErr) {
              console.error(`[CROSSPLAY] ⚠️  Erro ao obter buffer da mídia:`, bufErr.message);
            }
          } else if (Buffer.isBuffer(media)) {
            console.log(`[CROSSPLAY]   - Mídia é um Buffer direto: ${media.length} bytes`);
            mediaBuffer = media;
          } else if (media.data && Buffer.isBuffer(media.data)) {
            console.log(`[CROSSPLAY]   - Mídia tem propriedade .data: ${media.data.length} bytes`);
            mediaBuffer = media.data;
          } else {
            console.log(`[CROSSPLAY]   - Tipo de mídia desconhecido:`, typeof media, Object.keys(media || {}).join(', '));
          }

          if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer) || mediaBuffer.length === 0) {
            console.log(`[CROSSPLAY] ❌ Buffer inválido para imagem, enviando apenas texto`);
            if (payloadText && adapter.sendText) {
              await adapter.sendText(String(target.chatId), threadIdToUse, payloadText);
              console.log(`[CROSSPLAY] ✅ Texto enviado para ${target.platform} (fallback)`);
            }
            continue;
          }

          // Tenta enviar imagem
          if (adapter.sendImg && typeof adapter.sendImg === 'function') {
            console.log(`[CROSSPLAY]   - Chamando adapter.sendImg()...`);
            await adapter.sendImg(String(target.chatId), threadIdToUse, mediaBuffer, payloadText);
            console.log(`[CROSSPLAY] ✅ Imagem enviada com sucesso para ${target.platform}`);
          } else {
            console.log(`[CROSSPLAY] ⚠️  Adapter não tem método sendImg, tentando sendFile...`);
            if (adapter.sendFile && typeof adapter.sendFile === 'function') {
              await adapter.sendFile(String(target.chatId), threadIdToUse, mediaBuffer, payloadText, 'image.png');
              console.log(`[CROSSPLAY] ✅ Imagem enviada como arquivo para ${target.platform}`);
            } else {
              console.log(`[CROSSPLAY] ❌ Adapter não tem sendImg ou sendFile, enviando texto`);
              if (payloadText && adapter.sendText) {
                await adapter.sendText(String(target.chatId), threadIdToUse, payloadText);
                console.log(`[CROSSPLAY] ✅ Texto enviado para ${target.platform} (fallback)`);
              }
            }
          }
        } else if (isVideoMedia && media) {
          console.log(`[CROSSPLAY] 🎬 Processando vídeo para ${target.platform}...`);
          
          // Tenta obter buffer
          let mediaBuffer = null;
          if (typeof media.getBuffer === 'function') {
            console.log(`[CROSSPLAY]   - Chamando media.getBuffer()...`);
            mediaBuffer = await media.getBuffer();
            console.log(`[CROSSPLAY]   - Buffer obtido: ${mediaBuffer ? `${formatBytes(mediaBuffer.length)}` : 'NULL'}`);
          } else if (Buffer.isBuffer(media)) {
            console.log(`[CROSSPLAY]   - Mídia é um Buffer direto: ${formatBytes(media.length)}`);
            mediaBuffer = media;
          } else if (media.data && Buffer.isBuffer(media.data)) {
            console.log(`[CROSSPLAY]   - Mídia tem propriedade .data: ${formatBytes(media.data.length)}`);
            mediaBuffer = media.data;
          }

          if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer) || mediaBuffer.length === 0) {
            console.log(`[CROSSPLAY] ❌ Buffer inválido para vídeo, enviando apenas texto`);
            if (payloadText && adapter.sendText) {
              await adapter.sendText(String(target.chatId), threadIdToUse, payloadText);
              console.log(`[CROSSPLAY] ✅ Texto enviado para ${target.platform} (fallback)`);
            }
          } else {
            // Verifica limite de tamanho
            const sizeLimit = getVideoSizeLimit(target.platform);
            const videoSize = mediaBuffer.length;
            const limitFormatted = formatBytes(sizeLimit);
            const sizeFormatted = formatBytes(videoSize);

            if (videoSize > sizeLimit) {
              console.log(`[CROSSPLAY] ⚠️  Vídeo excede limite: ${sizeFormatted} > ${limitFormatted} (${target.platform})`);
              const sourcePlatformName = message.platform.charAt(0).toUpperCase() + message.platform.slice(1);
              const warningMessage = `⚠️ *Vídeo muito grande para ${target.platform}*\n\n` +
                `Tamanho: ${sizeFormatted} (Máximo: ${limitFormatted})\n\n` +
                `Para ver o vídeo, entre no grupo no ${sourcePlatformName}:\n` +
                `${message.platform === 'whatsapp' ? '📱 WhatsApp' : message.platform === 'telegram' ? '✈️ Telegram' : '🎮 Discord'}`;

              try {
                await adapter.sendText?.(String(target.chatId), threadIdToUse, warningMessage);
                console.log(`[CROSSPLAY] ℹ️  Aviso de tamanho enviado para ${target.platform}`);
              } catch (err) {
                console.error(`[CROSSPLAY] ❌ Erro ao enviar aviso para ${target.platform}:`, err.message);
              }
            } else {
              // Enviar vídeo
              if (adapter.sendVideo && typeof adapter.sendVideo === 'function') {
                console.log(`[CROSSPLAY]   - Chamando adapter.sendVideo()...`);
                await adapter.sendVideo(String(target.chatId), threadIdToUse, mediaBuffer, payloadText);
                console.log(`[CROSSPLAY] ✅ Vídeo enviado com sucesso para ${target.platform} (${sizeFormatted})`);
              } else if (adapter.sendFile && typeof adapter.sendFile === 'function') {
                console.log(`[CROSSPLAY] ⚠️  Adapter não tem método sendVideo, tentando sendFile...`);
                await adapter.sendFile(String(target.chatId), threadIdToUse, mediaBuffer, payloadText, 'video.mp4');
                console.log(`[CROSSPLAY] ✅ Vídeo enviado como arquivo para ${target.platform}`);
              } else {
                console.log(`[CROSSPLAY] ❌ Adapter não tem sendVideo ou sendFile, enviando texto`);
                if (payloadText && adapter.sendText) {
                  await adapter.sendText(String(target.chatId), threadIdToUse, payloadText);
                  console.log(`[CROSSPLAY] ✅ Texto enviado para ${target.platform} (fallback)`);
                }
              }
            }
          }
        } else if (isAudioMedia && media) {
          console.log(`[CROSSPLAY] 🎵 Processando áudio para ${target.platform}...`);
          
          // Tenta obter buffer
          let mediaBuffer = null;
          if (typeof media.getBuffer === 'function') {
            console.log(`[CROSSPLAY]   - Chamando media.getBuffer()...`);
            mediaBuffer = await media.getBuffer();
            console.log(`[CROSSPLAY]   - Buffer obtido: ${mediaBuffer ? `${formatBytes(mediaBuffer.length)}` : 'NULL'}`);
          } else if (Buffer.isBuffer(media)) {
            console.log(`[CROSSPLAY]   - Mídia é um Buffer direto: ${formatBytes(media.length)}`);
            mediaBuffer = media;
          } else if (media.data && Buffer.isBuffer(media.data)) {
            console.log(`[CROSSPLAY]   - Mídia tem propriedade .data: ${formatBytes(media.data.length)}`);
            mediaBuffer = media.data;
          }

          if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer) || mediaBuffer.length === 0) {
            console.log(`[CROSSPLAY] ❌ Buffer inválido para áudio, enviando apenas texto`);
            if (payloadText && adapter.sendText) {
              await adapter.sendText(String(target.chatId), threadIdToUse, payloadText);
              console.log(`[CROSSPLAY] ✅ Texto enviado para ${target.platform} (fallback)`);
            }
          } else {
            // Verifica limite de tamanho
            const sizeLimit = getAudioSizeLimit(target.platform);
            const audioSize = mediaBuffer.length;
            const limitFormatted = formatBytes(sizeLimit);
            const sizeFormatted = formatBytes(audioSize);

            if (audioSize > sizeLimit) {
              console.log(`[CROSSPLAY] ⚠️  Áudio excede limite: ${sizeFormatted} > ${limitFormatted} (${target.platform})`);
              const sourcePlatformName = message.platform.charAt(0).toUpperCase() + message.platform.slice(1);
              const warningMessage = `⚠️ *Áudio muito grande para ${target.platform}*\n\n` +
                `Tamanho: ${sizeFormatted} (Máximo: ${limitFormatted})\n\n` +
                `Para ouvir o áudio, entre no grupo no ${sourcePlatformName}:\n` +
                `${message.platform === 'whatsapp' ? '📱 WhatsApp' : message.platform === 'telegram' ? '✈️ Telegram' : '🎮 Discord'}`;

              try {
                await adapter.sendText?.(String(target.chatId), threadIdToUse, warningMessage);
                console.log(`[CROSSPLAY] ℹ️  Aviso de tamanho enviado para ${target.platform}`);
              } catch (err) {
                console.error(`[CROSSPLAY] ❌ Erro ao enviar aviso para ${target.platform}:`, err.message);
              }
            } else {
              // IMPORTANTE: WhatsApp não lida bem com música como nota de voz
              // Sempre enviar como arquivo de áudio, não como nota de voz
              let sent = false;

              if (adapter.sendAudio && typeof adapter.sendAudio === 'function') {
                console.log(`[CROSSPLAY]   - Chamando adapter.sendAudio()...`);
                await adapter.sendAudio(String(target.chatId), threadIdToUse, mediaBuffer, payloadText);
                console.log(`[CROSSPLAY] ✅ Áudio enviado com sucesso para ${target.platform} (${sizeFormatted})`);
                sent = true;
              } else if (target.platform === 'whatsapp' && adapter.sendFile && typeof adapter.sendFile === 'function') {
                console.log(`[CROSSPLAY]   - WhatsApp: sendAudio indisponível; enviando como arquivo de áudio como fallback`);
                await adapter.sendFile(String(target.chatId), threadIdToUse, mediaBuffer, payloadText, 'audio.mp3');
                console.log(`[CROSSPLAY] ✅ Áudio enviado como arquivo para ${target.platform} (${sizeFormatted})`);
                sent = true;
              }

              if (!sent) {
                if (adapter.sendFile && typeof adapter.sendFile === 'function') {
                  console.log(`[CROSSPLAY] ⚠️  Adapter não tem método sendAudio, tentando sendFile...`);
                  await adapter.sendFile(String(target.chatId), threadIdToUse, mediaBuffer, payloadText, 'audio.mp3');
                  console.log(`[CROSSPLAY] ✅ Áudio enviado como arquivo para ${target.platform}`);
                } else {
                  console.log(`[CROSSPLAY] ❌ Adapter não tem sendAudio ou sendFile, enviando texto`);
                  if (payloadText && adapter.sendText) {
                    await adapter.sendText(String(target.chatId), threadIdToUse, payloadText);
                    console.log(`[CROSSPLAY] ✅ Texto enviado para ${target.platform} (fallback)`);
                  }
                }
              }
            }
          }
        } else if (isStickerMedia && media) {
          console.log(`[CROSSPLAY] 🎨 Processando figurinha para ${target.platform}...`);
          
          // Tenta obter buffer da figurinha
          let mediaBuffer = null;
          if (typeof media.getBuffer === 'function') {
            console.log(`[CROSSPLAY]   - Chamando media.getBuffer()...`);
            try {
              mediaBuffer = await media.getBuffer();
              console.log(`[CROSSPLAY]   - Buffer obtido: ${mediaBuffer ? `${mediaBuffer.length} bytes` : 'NULL'}`);
            } catch (bufErr) {
              console.error(`[CROSSPLAY] ⚠️  Erro ao obter buffer da figurinha:`, bufErr.message);
            }
          } else if (Buffer.isBuffer(media)) {
            mediaBuffer = media;
          } else if (media.data && Buffer.isBuffer(media.data)) {
            mediaBuffer = media.data;
          }

          const stickerCaption = `${platformEmoji} ${displayNameToUse} enviou uma figurinha`;

          if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer) || mediaBuffer.length === 0) {
            console.log(`[CROSSPLAY] ❌ Buffer inválido para figurinha, enviando texto informativo`);
            if (adapter.sendText) {
              await adapter.sendText(String(target.chatId), threadIdToUse, stickerCaption);
              console.log(`[CROSSPLAY] ✅ Texto informativo enviado para ${target.platform} (fallback)`);
            }
            continue;
          }

          // Envia a figurinha como imagem com legenda
          if (adapter.sendImg && typeof adapter.sendImg === 'function') {
            console.log(`[CROSSPLAY]   - Chamando adapter.sendImg() (figurinha como imagem)...`);
            await adapter.sendImg(String(target.chatId), threadIdToUse, mediaBuffer, stickerCaption);
            console.log(`[CROSSPLAY] ✅ Figurinha enviada como imagem para ${target.platform}`);
          } else if (adapter.sendFile && typeof adapter.sendFile === 'function') {
            await adapter.sendFile(String(target.chatId), threadIdToUse, mediaBuffer, stickerCaption, 'sticker.png');
            console.log(`[CROSSPLAY] ✅ Figurinha enviada como arquivo para ${target.platform}`);
          } else {
            console.log(`[CROSSPLAY] ❌ Adapter não tem sendImg ou sendFile, enviando texto`);
            if (adapter.sendText) {
              await adapter.sendText(String(target.chatId), threadIdToUse, stickerCaption);
              console.log(`[CROSSPLAY] ✅ Texto informativo enviado para ${target.platform} (fallback)`);
            }
          }
        } else if (payloadText) {
          console.log(`[CROSSPLAY] 💬 Enviando texto para ${target.platform}...`);
          await adapter.sendText?.(String(target.chatId), threadIdToUse, payloadText);
          console.log(`[CROSSPLAY] ✅ Texto enviado com sucesso para ${target.platform}`);
        }
      } catch (err) {
        console.error(`[CROSSPLAY] ❌ Falha ao repassar para ${target.platform}:`, err.message || err);
        console.error(`[CROSSPLAY]    Stack:`, err.stack);
      }
    }

    await crossplayStore.recordMessageRelay({
      groupId: sourceGroup.id,
      centralId,
      sourcePlatform: message.platform,
      sourceChatId: message.chatId,
      sourceThreadId: message.threadId || null,
      sourceMessageId: message.messageId,
      copies: targets.filter(t => !(String(t.platform) === String(message.platform) && String(t.chatId) === String(message.chatId))).map(t => ({ platform: t.platform, chatId: String(t.chatId), messageId: null }))
    }).catch(() => { });

    return true;
  }

  async recordMessageRelay(payload) {
    const group = this.data.crossplayGroups[payload.groupId];
    if (!group) throw new Error('group-not-found');
    const history = this.data.recentHistory[payload.groupId] || [];
    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      createdAt: this._nowISO(),
      sourcePlatform: payload.sourcePlatform,
      sourceChatId: payload.sourceChatId,
      sourceThreadId: payload.sourceThreadId || null,
      sourceMessageId: payload.sourceMessageId,
      copies: payload.copies || []
    };
    history.unshift(entry);
    if (history.length > 30) history.length = 30;
    this.data.recentHistory[payload.groupId] = history;
    this._markDirty();
    return entry;
  }

  async getRecentHistory(groupId) {
    return this.data.recentHistory[groupId] || [];
  }

  async stop() {
    this.stopAutoSave();
    await this.saveNow();
  }
}

const store = new CrossplayStore();
store.CrossplayStore = CrossplayStore;
store.crossplayStore = store;
store.formatBytes = formatBytes;
store.getVideoSizeLimit = getVideoSizeLimit;
store.VIDEO_SIZE_LIMITS = VIDEO_SIZE_LIMITS;
store.getAudioSizeLimit = getAudioSizeLimit;
store.AUDIO_SIZE_LIMITS = AUDIO_SIZE_LIMITS;
module.exports = store;
