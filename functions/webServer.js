const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const economy = require("./economy");
const xp = require("./xp");
const centralAccounts = require("./centralAccounts");
const nofapHelper = require("./nofapHelper");
const marriage = require("./marriageService");
const groupSettings = require("./groupSettings");
const config = require("./config");
const activity = require("./activity");
const antilinkHelper = require("./antilinkHelper");
const antimediaHelper = require("./antimediaHelper");
const antipalavrasHelper = require("./antipalavrasHelper");
const antiraidHelper = require("./antiraidHelper");
const blockcmdHelper = require("./blockcmdHelper");
const welcomeHelper = require("./welcomeHelper");
const autofiguHelper = require("./autofiguHelper");
const autodownloadHelper = require("./autodownloadHelper");
const autoiaHelper = require("./autoiaHelper");
const autoAcceptHelper = require("./autoAccept");
const autoTranscribeHelper = require("./autoTranscribeHelper");
const autorepoHelper = require("./autorepoHelper");
const stockMonitor = require("./stockMonitor");
const cafeMonitor = require("./cafeMonitor");
const weatherMonitor = require("./weatherMonitor");
const randomWeatherMonitor = require("./randomWeatherMonitor");
const electionMonitor = require("./electionMonitor");
const schedulerHelper = require("./schedulerHelper");
const { MARKET_ASSETS, normalizeMarketSymbols } = require("./mercado");
const { PermissionFlagsBits, ChannelType } = require("discord.js");
const { getUserWarns, getWarnConfig, getWarnTarget, getWarnData, getWarnHistory, addWarn, removeWarns, setWarnConfig } = require("./warnHelper");
const { sameUserId, kickMember, banMember, muteMember, unmuteMember } = require("./moderationHelper");
const { executeRoleChange } = require("./discordRoles");
const { setWhatsAppAdmin } = require("./whatsappAdminHelper");
const { executeTelegramPromotion, executeTelegramDemotion, LEVELS: telegramAdminLevels } = require("./telegramAdminHelper");
const baileysPkg = require("@whiskeysockets/baileys");

const DEFAULT_PORT = 32013;
const WEB_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const REMEMBERED_WEB_SESSION_TTL_DAYS = 30;
const WEB_LOGIN_LIMIT_MS = 15 * 60 * 1000;
const WEB_LOGIN_MAX_ATTEMPTS = 10;
const IMMEDIATE_MODERATION_ACTIONS = {
  discord: new Set(["kick", "ban", "mute", "unmute", "unban"]),
  telegram: new Set(["kick", "ban", "mute", "unmute", "unban"]),
  whatsapp: new Set(["kick"])
};
const ADMIN_SYSTEM_SETTINGS = [
  { key: "antilink", label: "Antilink", description: "Bloqueia links enviados no grupo.", category: "Proteção", scopes: { whatsapp: ["server", "chat"], discord: ["server", "categoria", "chat"], telegram: ["server", "topic"] } },
  { key: "antimedia", label: "Antimídia", description: "Configura os tipos de mídia bloqueados e a ação aplicada no grupo.", category: "Proteção", scopes: { whatsapp: ["server", "chat"], discord: ["server", "categoria", "chat"], telegram: ["server", "topic"] } },
  { key: "antipalavras", label: "Antipalavras", description: "Configura palavras e frases bloqueadas e a ação aplicada.", category: "Proteção", scopes: { whatsapp: ["server", "chat"], discord: ["server", "categoria", "chat"], telegram: ["server", "topic"] } },
  { key: "antiraid", label: "Antiraid", description: "Ajusta limites de flood, links, menções e a ação de moderação.", category: "Proteção", scopes: { whatsapp: ["chat"], discord: ["server", "categoria", "chat"], telegram: ["server", "topic"] } },
  { key: "blockcmd", label: "Bloqueio de comandos", description: "Configura comandos e categorias bloqueados neste escopo.", category: "Proteção", scopes: { whatsapp: ["chat"], discord: ["server", "categoria", "chat"], telegram: ["server", "topic"] } },
  { key: "welcome", label: "Boas-vindas", description: "Envia a mensagem de boas-vindas configurada.", category: "Mensagens", scopes: { whatsapp: ["chat"], discord: ["chat"], telegram: ["server", "topic"] } },
  { key: "goodbye", label: "Despedidas", description: "Envia a mensagem de despedida configurada.", category: "Mensagens", scopes: { whatsapp: ["chat"], discord: ["chat"], telegram: ["server", "topic"] } },
  { key: "autoApprove", label: "Aprovar entradas automaticamente", description: "Aprova solicitações de entrada conforme as regras configuradas.", category: "Automação", scopes: { whatsapp: ["chat"], telegram: ["server"] } },
  { key: "autofigu", label: "Autofigu", description: "Converte imagens e vídeos em figurinhas.", category: "Automação", scopes: { whatsapp: ["chat"], telegram: ["server"] } },
  { key: "autodownload", label: "Download automático", description: "Baixa automaticamente mídias compatíveis do grupo.", category: "Automação", scopes: { whatsapp: ["chat"], discord: ["chat"], telegram: ["server"] } },
  { key: "autoTranscribe", label: "Transcrição automática", description: "Transcreve áudios recebidos no grupo.", category: "Automação", scopes: { whatsapp: ["chat"], discord: ["server", "categoria", "chat"], telegram: ["server", "topic"] } },
  { key: "autoia", label: "Auto-IA", description: "Ativa o modo automático já configurado ou usa o modo por menção se estiver desativado.", category: "Automação", scopes: { whatsapp: ["chat"], discord: ["chat"], telegram: ["server"] } },
  { key: "autorepo", label: "Respostas automáticas", description: "Ativa as respostas configuradas para este grupo.", category: "Automação", scopes: { whatsapp: ["chat"], discord: ["server"], telegram: ["server"] } },
  { key: "agendar", label: "Agendamentos", description: "Cria e gerencia mensagens recorrentes ou programadas para este chat.", category: "Automação", scopes: { whatsapp: ["chat"], discord: ["chat"], telegram: ["server", "topic"] } },
  { key: "monitorStock", label: "Monitor da bolsa", description: "Envia cotações dos ativos selecionados nos horários configurados.", category: "Monitores", scopes: { whatsapp: ["chat"], discord: ["chat"], telegram: ["server", "topic"] } },
  { key: "monitorCafe", label: "Monitor do café", description: "Envia cotações em horários fixos ou alerta quando os preços mudam.", category: "Monitores", scopes: { whatsapp: ["chat"], discord: ["chat"], telegram: ["server", "topic"] } },
  { key: "monitorWeather", label: "Monitor do clima", description: "Envia a previsão da cidade selecionada nos horários configurados.", category: "Monitores", scopes: { whatsapp: ["chat"], discord: ["chat"], telegram: ["server", "topic"] } },
  { key: "monitorRandomWeather", label: "Previsão aleatória", description: "Sorteia uma cidade cadastrada e envia a previsão nos horários configurados.", category: "Monitores", scopes: { whatsapp: ["chat"], discord: ["chat"], telegram: ["server", "topic"] } },
  { key: "monitorElection", label: "Monitor eleitoral", description: "Agenda consultas de apuração presidencial por estado e município.", category: "Monitores", scopes: { whatsapp: ["chat"], discord: ["chat"], telegram: ["server", "topic"] } },
  { key: "activity", label: "Registro de atividade", description: "Contabiliza mensagens, comandos, figurinhas e arquivos para os rankings.", category: "Sistemas", scopes: { whatsapp: ["chat"], discord: ["server"], telegram: ["server"] } },
  { key: "xp", label: "Sistema de XP", description: "Concede experiência e mantém o progresso dos membros.", category: "Sistemas", scopes: { whatsapp: ["chat"], discord: ["server"], telegram: ["server"] } },
  { key: "economy", label: "Economia", description: "Ativa os comandos econômicos sem apagar os saldos existentes.", category: "Sistemas", scopes: { whatsapp: ["chat"], discord: ["server"], telegram: ["server"] } }
];
const ADMIN_SETTINGS_GEAR_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 13.5 1.1.8-1.1 1.9-1.3-.5a7.8 7.8 0 0 1-1.5.9l-.2 1.4h-2.2l-.4-1.3a7.8 7.8 0 0 1-1.7 0l-.7 1.2-1.9-1.1.5-1.3a7.8 7.8 0 0 1-.9-1.5l-1.4-.2v-2.2l1.3-.4a7.8 7.8 0 0 1 0-1.7L6.7 8.8l1.1-1.9 1.3.5a7.8 7.8 0 0 1 1.5-.9l.2-1.4H13l.4 1.3a7.8 7.8 0 0 1 1.7 0l.7-1.2 1.9 1.1-.5 1.3a7.8 7.8 0 0 1 .9 1.5l1.4.2v2.2l-1.3.4a7.8 7.8 0 0 1 0 1.6Z"/></svg>';
const ADMIN_SYSTEM_SETTING_KEYS = new Set(ADMIN_SYSTEM_SETTINGS.map(setting => setting.key));
const webSessions = new Map();
const webLoginAttempts = new Map();

function getPort() {
  const domain = config.getWebDomain();
  const configuredPort = Number.parseInt(String(domain || "").split(":").pop(), 10);
  return Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65535
    ? configuredPort
    : DEFAULT_PORT;
}

function profileMessage(platform, groupId, userId) {
  const raw = platform === "discord"
    ? { guild: { id: groupId } }
    : { chat: { id: groupId } };
  return {
    platform,
    chatId: groupId,
    chatType: "group",
    userId,
    raw
  };
}

async function getDiscordAvatar(groupId, userId) {
  const client = global.discordClient;
  if (!client) return null;

  const guild = client.guilds.cache.get(String(groupId));
  const member = guild?.members.cache.get(String(userId));
  let user = member?.user || client.users.cache.get(String(userId));
  if (!user && typeof client.users.fetch === "function") {
    try {
      user = await client.users.fetch(String(userId));
    } catch (error) {
      console.warn(`[WEB] Não foi possível buscar o avatar do usuário Discord ${userId}:`, error.message || error);
    }
  }

  const avatarOptions = { size: 128, forceStatic: true };

  return member?.displayAvatarURL(avatarOptions)
    || user?.displayAvatarURL(avatarOptions)
    || null;
}

async function getProfileAvatar(platform, groupId, userId) {
  if (platform === "discord") return getDiscordAvatar(groupId, userId);
  return `/avatar?plataforma=${encodeURIComponent(platform)}&usuario=${encodeURIComponent(userId)}`;
}

async function sendPlaceholderAvatar(response) {
  const placeholder = await fs.promises.readFile(path.join(__dirname, "..", "commands", "semfoto.jpg"));
  response.writeHead(200, {
    "Content-Type": "image/jpeg",
    "Cache-Control": "public, max-age=86400"
  });
  response.end(placeholder);
}

async function getGroupName(platform, groupId, scope) {
  try {
    if (platform === "discord" && global.discordClient) {
      const guild = await global.discordClient.guilds.fetch(String(groupId));
      if (guild?.name) return guild.name;
    }
    if (platform === "telegram" && global.telegramBot?.telegram) {
      const chat = await global.telegramBot.telegram.getChat(String(groupId));
      if (chat?.title || chat?.username) return chat.title || `@${chat.username}`;
    }
    if (platform === "whatsapp" && global.whatsappSock?.groupMetadata) {
      const metadata = await global.whatsappSock.groupMetadata(String(groupId));
      if (metadata?.subject) return metadata.subject;
    }
  } catch (error) {
    console.warn(`[WEB] Não foi possível atualizar o nome de ${platform} ${groupId}:`, error.message || error);
  }

  const type = platform === "discord" ? "server" : "group";
  const settings = groupSettings.loadSettings(platform, groupId, type);
  return settings.serverName || settings.groupName || settings.chatName || scope?.name || `${scope?.type || "Grupo"} ${groupId}`;
}

async function getLinkedPlatformGroups(platform, platformId) {
  if (platform === "discord") {
    const client = global.discordClient;
    if (!client) throw new Error("O Discord está offline no momento.");

    const groups = [];
    for (const guild of client.guilds.cache.values()) {
      let member = guild.members.cache.get(String(platformId));
      if (!member) {
        try {
          member = await guild.members.fetch(String(platformId));
        } catch (error) {
          if (Number(error?.code) === 10007 || Number(error?.status) === 404) continue;
          throw error;
        }
      }
      if (member) {
        groups.push({
          id: String(guild.id),
          name: guild.name,
          type: "server",
          canManage: member.permissions.has(PermissionFlagsBits.Administrator) ||
            member.permissions.has(PermissionFlagsBits.ManageGuild)
        });
      }
    }
    return groups;
  }

  if (platform === "whatsapp") {
    const sock = global.whatsappSock;
    if (!sock || typeof sock.groupFetchAllParticipating !== "function") {
      throw new Error("O WhatsApp está offline no momento.");
    }

    const participatingGroups = await sock.groupFetchAllParticipating();
    const areJidsSameUser = baileysPkg.areJidsSameUser;
    return Object.entries(participatingGroups).flatMap(([groupId, metadata]) => {
      if (metadata?.isCommunity && !metadata.isCommunityAnnounce) return [];
      const participants = Array.isArray(metadata?.participants) ? metadata.participants : [];
      const linkedParticipant = participants.find(participant => {
        const participantIds = [participant.id, participant.lid, participant.phoneNumber].filter(Boolean);
        return participantIds.some(id => typeof areJidsSameUser === "function"
          ? areJidsSameUser(String(id), String(platformId))
          : String(id) === String(platformId));
      });
      return linkedParticipant ? [{
        id: String(groupId),
        name: metadata.subject || `Grupo ${groupId}`,
        type: "group",
        canManage: Boolean(linkedParticipant.admin)
      }] : [];
    });
  }

  if (platform === "telegram") {
    const bot = global.telegramBot;
    if (!bot?.telegram) throw new Error("O Telegram está offline no momento.");
    const telegramUserId = Number(platformId);
    if (!/^\d+$/.test(String(platformId)) || !Number.isSafeInteger(telegramUserId)) {
      throw new Error("O ID da conta vinculada do Telegram é inválido.");
    }

    const groupsDirectory = path.join(__dirname, "..", "settings", "groups");
    let files;
    try {
      files = fs.readdirSync(groupsDirectory);
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }

    const groupIds = files
      .map(file => file.match(/^telG(.+)\.json$/)?.[1])
      .filter(Boolean);
    const groups = [];
    for (const groupId of groupIds) {
      let member;
      try {
        member = await bot.telegram.getChatMember(groupId, telegramUserId);
      } catch (error) {
        if (Number(error?.response?.error_code) === 400) continue;
        throw error;
      }
      if (!["creator", "administrator", "member"].includes(member.status) &&
          !(member.status === "restricted" && member.is_member)) continue;

      const chat = await bot.telegram.getChat(groupId);
      const settings = groupSettings.loadSettings("telegram", groupId, "group");
      groups.push({
        id: String(groupId),
        name: chat.title || chat.username || settings.groupName || settings.chatName || `Grupo ${groupId}`,
        type: "group",
        canManage: ["creator", "administrator"].includes(member.status)
      });
    }
    return groups;
  }

  throw new Error("Plataforma inválida.");
}

async function isPlatformGroupMember(platform, groupId, platformId) {
  if (platform === "discord") {
    const client = global.discordClient;
    if (!client) throw new Error("O Discord está offline no momento.");
    let guild;
    try {
      guild = await client.guilds.fetch(String(groupId));
    } catch (error) {
      if (Number(error?.code) === 10004 || Number(error?.status) === 404) return false;
      throw error;
    }
    try {
      return Boolean(await guild.members.fetch(String(platformId)));
    } catch (error) {
      if (Number(error?.code) === 10007 || Number(error?.status) === 404) return false;
      throw error;
    }
  }

  if (platform === "whatsapp") {
    const sock = global.whatsappSock;
    if (!sock || typeof sock.groupMetadata !== "function") {
      throw new Error("O WhatsApp está offline no momento.");
    }
    const metadata = await sock.groupMetadata(String(groupId));
    const areJidsSameUser = baileysPkg.areJidsSameUser;
    return (metadata.participants || []).some(participant =>
      [participant.id, participant.lid, participant.phoneNumber].filter(Boolean).some(id =>
        typeof areJidsSameUser === "function"
          ? areJidsSameUser(String(id), String(platformId))
          : String(id) === String(platformId)
      )
    );
  }

  if (platform === "telegram") {
    const bot = global.telegramBot;
    if (!bot?.telegram) throw new Error("O Telegram está offline no momento.");
    try {
      const member = await bot.telegram.getChatMember(String(groupId), Number(platformId));
      return ["creator", "administrator", "member"].includes(member.status) ||
        (member.status === "restricted" && member.is_member === true);
    } catch (error) {
      if (Number(error?.response?.error_code) === 400) return false;
      throw error;
    }
  }

  return false;
}

function getPlatformAdapter(platform) {
  const adapters = {
    discord: "../platforms/discord",
    telegram: "../platforms/telegram",
    whatsapp: "../platforms/whatsapp"
  };
  const adapterPath = adapters[platform];
  return adapterPath ? require(adapterPath) : null;
}

function getModerationWarnings(platform, groupId, actorId) {
  const message = profileMessage(platform, groupId, actorId);
  const target = getWarnTarget(message);
  if (!target) return { max: 3, entries: [], total: 0 };
  const data = getWarnData(platform, target.id, target.type);
  const counts = data.settings.warnsData || {};
  const entries = Object.entries(counts)
    .map(([userId, value]) => ({
      userId,
      ...getWarnHistory(value, data.settings.warnsHistory?.[userId])
    }))
    .filter(item => item.userId && Number.isFinite(item.count) && item.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 50);
  return {
    max: Number(data.settings.warnConfig?.max) || 3,
    action: data.settings.warnConfig?.action === "kick" ? "kick" : "ban",
    entries,
    total: Object.keys(counts).length,
    counts
  };
}

function formatWarningDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

async function addModerationWarningNames(platform, groupId, warnings) {
  const entries = warnings.entries || [];
  if (platform === "whatsapp") {
    const sock = global.whatsappSock;
    if (!sock?.user || typeof sock.groupMetadata !== "function") {
      throw new Error("O WhatsApp está offline no momento.");
    }
    const metadata = await sock.groupMetadata(String(groupId));
    const namedEntries = entries.map(entry => {
      const participant = (metadata.participants || []).find(candidate =>
        [candidate.id, candidate.lid, candidate.phoneNumber].filter(Boolean)
          .some(id => sameUserId(id, entry.userId))
      );
      return {
        ...entry,
        name: participant?.name || participant?.notify || participant?.phoneNumber || entry.userId
      };
    });
    return { ...warnings, entries: namedEntries };
  }

  const namedEntries = await Promise.all(entries.map(async entry => {
    const [user] = await searchModerationUsers(platform, groupId, entry.userId, warnings);
    return { ...entry, name: user?.label || entry.userId };
  }));
  return { ...warnings, entries: namedEntries };
}

function cleanModerationSearch(value) {
  return typeof value === "string" ? value.trim().replace(/^<@!?(\d+)>$/, "$1").slice(0, 100) : "";
}

function toModerationUser(id, label, username = "", warningCount = 0, isBanned = false, isMember = true, warningUserId = id) {
  return {
    id: String(id),
    label: String(label || id).slice(0, 100),
    username: String(username || "").slice(0, 100),
    warningCount: Number(warningCount) || 0,
    warningUserId: String(warningUserId || id),
    isBanned: Boolean(isBanned),
    isMember: Boolean(isMember)
  };
}

function normalizeWhatsAppIdentity(id) {
  const [user = "", server = "s.whatsapp.net"] = String(id || "").trim().split("@");
  const normalizedServer = server === "c.us" ? "s.whatsapp.net" : server;
  return `${user.split(":")[0]}@${normalizedServer}`.toLowerCase();
}

function getWhatsAppCentralName(ids) {
  const store = centralAccounts || global.centralAccounts;
  const normalizedIds = new Set(ids.map(normalizeWhatsAppIdentity));
  const accounts = typeof store?.getAllCentralAccounts === "function"
    ? store.getAllCentralAccounts()
    : Object.values(store?.data?.centralAccounts || {});
  for (const central of accounts) {
    const account = (central.platformAccounts || []).find(item =>
      item.platform === "whatsapp" && normalizedIds.has(normalizeWhatsAppIdentity(item.platformId))
    );
    if (!account) continue;
    const name = account.displayName || account.username || central.name;
    if (typeof name === "string" && name.trim() &&
        !/^\d+(?::\d+)?@[\w.-]+$/.test(name.trim()) &&
        !/^\d+$/.test(name.trim())) return name.trim();
  }
  return "";
}

async function getWhatsAppParticipantName(participant, sock, ids) {
  const lookupIds = [...ids];
  const lidMapping = sock.signalRepository?.lidMapping;
  for (const id of ids) {
    const [user, server] = String(id).split("@");
    const method = server === "lid" || server === "hosted.lid" ? "getPNForLID"
      : server === "s.whatsapp.net" || server === "c.us" ? "getLIDForPN" : null;
    if (!method || typeof lidMapping?.[method] !== "function") continue;
    try {
      const mappedId = await lidMapping[method](id);
      if (mappedId) lookupIds.push(String(mappedId));
    } catch (error) {
      console.warn(`[WEB] Não foi possível resolver o identificador WhatsApp ${id}:`, error.message || error);
    }
  }
  const contacts = lookupIds
    .map(id => sock.contacts?.[id])
    .filter(Boolean);
  const candidates = [
    participant.name,
    participant.notify,
    participant.pushName,
    participant.verifiedName,
    ...contacts.flatMap(contact => [contact.name, contact.notify, contact.pushName, contact.verifiedName]),
    sameUserId(participant.id, sock.user?.id) || sameUserId(participant.id, sock.user?.lid)
      ? sock.user?.name
      : null,
    getWhatsAppCentralName(lookupIds)
  ];
  const normalizedIds = new Set(lookupIds.map(id => String(id).toLowerCase()));
  return candidates.find(value => {
    if (typeof value !== "string" || !value.trim()) return false;
    const name = value.trim();
    return !normalizedIds.has(name.toLowerCase()) &&
      !/^\d+(?::\d+)?@[\w.-]+$/.test(name) &&
      !/^\d+$/.test(name) &&
      !/^\+?[\d\s().-]+$/.test(name);
  })?.trim() || "";
}

function formatWhatsAppDisplayId(value) {
  return String(value || "").split("@")[0].split(":")[0];
}

function getWhatsAppParticipantPhoneNumber(participant) {
  const phoneJid = participant.phoneNumber ||
    [participant.id, participant.lid].find(value => /@(s\.whatsapp\.net|c\.us)$/i.test(String(value || "")));
  return formatWhatsAppDisplayId(phoneJid);
}

async function searchModerationUsers(platform, groupId, query, warnings) {
  if (!query && platform !== "whatsapp") throw new Error("Informe um ID ou username para buscar.");
  const warningCounts = new Map(Object.entries(warnings.counts || {}).map(([userId, count]) =>
    [String(userId), Number(count)]
  ));

  if (platform === "discord") {
    const client = global.discordClient;
    if (!client?.isReady?.()) throw new Error("O Discord está offline no momento.");
    const guild = await client.guilds.fetch(String(groupId));
    let members;
    if (/^\d{1,25}$/.test(query)) {
      const member = await guild.members.fetch(query).catch(error => {
        if (Number(error?.code) === 10007 || Number(error?.status) === 404) return null;
        throw error;
      });
      members = member ? [member] : [];
      if (!members.length) {
        const ban = await guild.bans.fetch(query).catch(error => {
          if (Number(error?.code) === 10026 || Number(error?.status) === 404) return null;
          throw error;
        });
        if (ban) {
          return [toModerationUser(
            ban.user.id,
            ban.user.globalName || ban.user.username || ban.user.id,
            ban.user.username,
            warningCounts.get(String(ban.user.id)),
            true,
            false
          )];
        }
      }
    } else {
      const matches = await guild.members.search({ query, limit: 10 });
      members = [...matches.values()];
    }
    return members.slice(0, 10).map(member => toModerationUser(
      member.id,
      member.displayName || member.user?.globalName || member.user?.username,
      member.user?.username,
      warningCounts.get(String(member.id)),
      false,
      true
    ));
  }

  if (platform === "telegram") {
    const bot = global.telegramBot;
    if (!bot?.telegram) throw new Error("O Telegram está offline no momento.");
    if (/^\d+$/.test(query) && !Number.isSafeInteger(Number(query))) {
      throw new Error("O ID do Telegram informado é inválido.");
    }
    const knownIds = [...warningCounts.keys()];
    const ids = /^\d+$/.test(query)
      ? [query]
      : knownIds;
    if (!ids.length) {
      throw new Error("O Telegram não permite pesquisar usuários pelo username. Informe o ID numérico ou escolha alguém da lista de advertências.");
    }
    const results = await Promise.all(ids.slice(0, 50).map(async userId => {
      try {
        const member = await bot.telegram.getChatMember(String(groupId), Number(userId));
        const user = member.user || {};
        const username = user.username ? `@${user.username}` : "";
        const matches = /^\d+$/.test(query)
          ? String(user.id) === query
          : username.toLowerCase().includes(query.replace(/^@/, "").toLowerCase()) ||
            String(user.first_name || "").toLowerCase().includes(query.toLowerCase());
        if (!matches) return null;
        const isBanned = member.status === "kicked";
        const isMember = ["creator", "administrator", "member"].includes(member.status) ||
          (member.status === "restricted" && member.is_member === true);
        if (!isMember && !isBanned && !warningCounts.has(String(user.id))) return null;
        return toModerationUser(
          user.id,
          [user.first_name, user.last_name].filter(Boolean).join(" ") || username || user.id,
          username,
          warningCounts.get(String(user.id)),
          isBanned,
          isMember
        );
      } catch (error) {
        if (Number(error?.response?.error_code) !== 400) throw error;
        return null;
      }
    }));
    return results.filter(Boolean).slice(0, 10);
  }

  if (platform === "whatsapp") {
    const sock = global.whatsappSock;
    if (!sock?.user || typeof sock.groupMetadata !== "function") {
      throw new Error("O WhatsApp está offline no momento.");
    }
    const metadata = await sock.groupMetadata(String(groupId));
    const normalizedQuery = query.toLowerCase().replace(/^@/, "");
    const digitsQuery = query.replace(/\D/g, "");
    const users = await Promise.all((metadata.participants || [])
      .map(async participant => {
        const id = participant.id || participant.lid || participant.phoneNumber;
        const ids = [participant.id, participant.lid, participant.phoneNumber].filter(Boolean).map(String);
        const displayName = await getWhatsAppParticipantName(participant, sock, ids) ||
          getWhatsAppParticipantPhoneNumber(participant) ||
          "Participante sem nome salvo";
        const searchable = [displayName, ...ids].join(" ").toLowerCase();
        const matches = !normalizedQuery || searchable.includes(normalizedQuery) ||
          Boolean(digitsQuery && ids.some(value => value.replace(/\D/g, "").includes(digitsQuery)));
        if (!matches) return null;
        const warningEntry = [...warningCounts.entries()].find(([warningUserId]) =>
          ids.some(candidateId => sameUserId(warningUserId, candidateId))
        );
        return toModerationUser(
          id,
          displayName,
          getWhatsAppParticipantPhoneNumber(participant),
          warningEntry?.[1],
          false,
          true,
          warningEntry?.[0] || id
        );
      })
    );
    const matchingUsers = users.filter(Boolean);
    return query ? matchingUsers.slice(0, 10) : matchingUsers;
  }

  throw new Error("Plataforma inválida.");
}

async function getModerationTarget(platform, groupId, userId, warnings) {
  const exact = await searchModerationUsers(platform, groupId, String(userId), warnings);
  const target = exact.find(user => user.id === String(userId)) ||
    exact.find(user => user.id.split("@")[0] === String(userId).split("@")[0]);
  if (!target) throw new Error("Usuário não encontrado neste grupo ou servidor.");
  return target;
}

async function assertModerationPermission(platform, groupId, actorId, action) {
  if (platform === "discord") {
    const client = global.discordClient;
    if (!client?.isReady?.()) throw new Error("O Discord está offline no momento.");
    const guild = await client.guilds.fetch(String(groupId));
    const member = await guild.members.fetch(String(actorId));
    const botMember = guild.members.me || await guild.members.fetch(String(client.user.id));
    const flag = action === "warn" ? PermissionFlagsBits.ManageMessages
      : action === "kick" ? PermissionFlagsBits.KickMembers
      : action === "ban" || action === "unban" ? PermissionFlagsBits.BanMembers
      : action === "removeWarnings" ? null
      : action === "addRole" || action === "removeRole" ? PermissionFlagsBits.ManageRoles
      : PermissionFlagsBits.ModerateMembers;
    if (flag && !member.permissions.has(flag)) throw new Error("Você não tem a permissão necessária para esta ação.");
    if (flag && action !== "warn" && !botMember.permissions.has(flag)) {
      throw new Error("O bot não tem a permissão necessária para esta ação.");
    }
    return { guild, actor: member, actorId: String(actorId) };
  }

  if (platform === "telegram") {
    const bot = global.telegramBot;
    if (!bot?.telegram) throw new Error("O Telegram está offline no momento.");
    const [member, botInfo] = await Promise.all([
      bot.telegram.getChatMember(String(groupId), Number(actorId)),
      bot.telegram.getMe()
    ]);
    const botMember = await bot.telegram.getChatMember(String(groupId), Number(botInfo.id));
    const isAdmin = value => value.status === "creator" || value.status === "administrator";
    const hasPermission = (value, permission) =>
      value.status === "creator" || (value.status === "administrator" && Boolean(value[permission]));
    const permission = action === "warn"
      ? "can_delete_messages"
      : action === "promote" || action === "demote"
        ? "can_promote_members"
        : "can_restrict_members";
    if (action !== "removeWarnings" && !hasPermission(member, permission)) throw new Error("Você não tem a permissão necessária para esta ação.");
    if (action !== "warn" && action !== "removeWarnings" && !hasPermission(botMember, permission)) {
      throw new Error("O bot não tem a permissão necessária para esta ação.");
    }
    if (!isAdmin(member)) throw new Error("Você precisa ser administrador do grupo para esta ação.");
    return { bot, actorId: String(actorId), botId: String(botInfo.id) };
  }

  if (platform === "whatsapp") {
    const sock = global.whatsappSock;
    if (!sock?.user || typeof sock.groupMetadata !== "function") {
      throw new Error("O WhatsApp está offline no momento.");
    }
    if (action === "mute" || action === "unmute" || action === "unban") {
      throw new Error("Esta ação não está disponível no WhatsApp.");
    }
    const metadata = await sock.groupMetadata(String(groupId));
    const areJidsSameUser = baileysPkg.areJidsSameUser;
    const findParticipant = ids => (metadata.participants || []).find(participant =>
      [participant.id, participant.lid, participant.phoneNumber].filter(Boolean).some(id =>
        ids.some(candidate => typeof areJidsSameUser === "function"
          ? areJidsSameUser(String(id), String(candidate))
          : sameUserId(id, candidate))
      )
    );
    const actor = findParticipant([actorId]);
    if (!actor?.admin) throw new Error("Você precisa ser administrador do grupo para esta ação.");
    if (action === "kick" || action === "ban" || action === "promote" || action === "demote") {
      const botMember = findParticipant([sock.user.id, sock.user.lid].filter(Boolean));
      if (!botMember?.admin) throw new Error("O bot precisa ser administrador do grupo para esta ação.");
    }
    return { sock, actorId: String(actorId) };
  }

  throw new Error("Plataforma inválida.");
}

async function executeModerationAction(platform, groupId, target, action, reason, durationMinutes, context, options = {}) {
  const message = {
    ...profileMessage(platform, groupId, target.id),
    guildId: groupId,
    raw: platform === "discord" ? { guild: context.guild }
      : platform === "telegram" ? { telegram: context.bot.telegram }
      : {}
  };
  if (action === "warn") {
    const result = await addWarn(message, target.id, reason || "Sem motivo informado");
    if (!result) throw new Error("Não foi possível salvar a advertência.");
    return { result };
  }
  if (action === "removeWarnings") {
    if (!removeWarns(message, target.id)) throw new Error("Não foi possível remover as advertências.");
    return { result: { currentWarns: 0 } };
  }
  if (action === "kick") {
    await kickMember(platform, message, reason || "Expulso por administrador");
    return { result: {} };
  }
  if (action === "ban") {
    await banMember(platform, message, reason || "Banido por administrador");
    return { result: {} };
  }
  if (action === "mute") {
    const success = await muteMember(platform, message, durationMinutes * 60 * 1000, reason || "Silenciado por administrador");
    if (!success) throw new Error("Não foi possível silenciar este usuário.");
    return { result: {} };
  }
  if (action === "unmute") {
    const success = await unmuteMember(platform, message);
    if (!success) throw new Error("Não foi possível remover o silêncio deste usuário.");
    return { result: {} };
  }
  if (action === "unban") {
    if (platform === "discord") {
      await context.guild.bans.remove(target.id, reason || "Desbanido pelo painel");
    } else if (platform === "telegram") {
      await context.bot.telegram.unbanChatMember(String(groupId), Number(target.id));
    } else {
      throw new Error("Desbanir não está disponível no WhatsApp.");
    }
    return { result: {} };
  }
  if (action === "addRole" || action === "removeRole") {
    const role = await context.guild.roles.fetch(String(options.roleId));
    if (!role) throw new Error("Cargo do Discord não encontrado.");
    const targetMember = await context.guild.members.fetch(String(target.id));
    const roleMessage = {
      ...message,
      isPrivate: false,
      args: [target.id, String(options.roleId)],
      raw: { ...message.raw, member: context.actor, guild: context.guild }
    };
    const result = await executeRoleChange(roleMessage, { remove: action === "removeRole" });
    if (result.error) throw new Error(result.error.replace(/^❌\s*/, ""));
    return { result: { message: result.text } };
  }
  if ((action === "promote" || action === "demote") && platform === "whatsapp") {
    const adminMessage = {
      ...message,
      isPrivate: false,
      command: action === "promote" ? "promover" : "rebaixar",
      args: [target.id],
      mentionedJids: []
    };
    const result = await setWhatsAppAdmin(adminMessage, action === "promote" ? "promote" : "demote");
    if (!result.ok) throw new Error(result.text.replace(/^❌\s*/, ""));
    return { result: { message: result.text } };
  }
  if ((action === "promote" || action === "demote") && platform === "telegram") {
    const adminMessage = {
      ...message,
      isPrivate: false,
      chatType: "supergroup",
      userId: String(context.actorId),
      botId: String(context.botId),
      prefix: config.getPrefix(),
      args: action === "promote" ? [String(options.level || ""), target.id] : [target.id],
      quoted: null,
      mentionedJids: []
    };
    const result = action === "promote"
      ? await executeTelegramPromotion(adminMessage)
      : await executeTelegramDemotion(adminMessage);
    if (!result.text || result.text.startsWith("❌")) throw new Error(result.text || "Não foi possível alterar as permissões.");
    return { result: { message: result.text } };
  }
  throw new Error("Ação de moderação inválida.");
}

async function canManagePlatformGroup(platform, groupId, platformId) {
  const snapshot = await getPlatformAdminSnapshot(platform, groupId, platformId);
  return snapshot.canManage;
}

function discordPermissionSummary(member) {
  const permissions = member?.permissions;
  const isAdmin = Boolean(permissions?.has(PermissionFlagsBits.Administrator));
  const checks = [
    ["manageGroup", "Gerenciar servidor", PermissionFlagsBits.ManageGuild],
    ["manageChannels", "Gerenciar canais", PermissionFlagsBits.ManageChannels],
    ["manageMessages", "Gerenciar mensagens", PermissionFlagsBits.ManageMessages],
    ["kick", "Expulsar membros", PermissionFlagsBits.KickMembers],
    ["ban", "Banir membros", PermissionFlagsBits.BanMembers],
    ["mute", "Moderar membros", PermissionFlagsBits.ModerateMembers],
    ["invite", "Criar convites", PermissionFlagsBits.CreateInstantInvite],
    ["manageRoles", "Gerenciar cargos", PermissionFlagsBits.ManageRoles]
  ];
  return checks.map(([key, label, permission]) => ({
    key,
    label,
    allowed: isAdmin || Boolean(permissions?.has(permission))
  }));
}

function telegramPermissionSummary(member) {
  const isCreator = member?.status === "creator";
  const isAdmin = isCreator || member?.status === "administrator";
  const checks = [
    ["manageGroup", "Administrar grupo", isAdmin],
    ["manageMessages", "Apagar mensagens", isCreator || Boolean(member?.can_delete_messages)],
    ["kick", "Restringir/expulsar membros", isCreator || Boolean(member?.can_restrict_members)],
    ["ban", "Banir membros", isCreator || Boolean(member?.can_restrict_members)],
    ["invite", "Convidar membros", isCreator || Boolean(member?.can_invite_users)],
    ["manageInfo", "Alterar informações", isCreator || Boolean(member?.can_change_info)],
    ["manageRoles", "Promover administradores", isCreator || Boolean(member?.can_promote_members)]
  ];
  return checks.map(([key, label, allowed]) => ({ key, label, allowed }));
}

function whatsappPermissionSummary(participant) {
  const isAdmin = Boolean(participant?.admin);
  return [
    { key: "manageGroup", label: "Administrar o grupo", allowed: isAdmin },
    { key: "moderation", label: "Gerenciar participantes", allowed: isAdmin }
  ];
}

async function getPlatformAdminSnapshot(platform, groupId, platformId) {
  if (platform === "discord") {
    const client = global.discordClient;
    if (!client || (typeof client.isReady === "function" && !client.isReady())) {
      throw new Error("O Discord está offline no momento.");
    }
    const guild = await client.guilds.fetch(String(groupId));
    const member = await guild.members.fetch(String(platformId));
    const botMember = guild.members.me ||
      (client.user?.id ? await guild.members.fetch(String(client.user.id)) : null);
    const adminPermissions = discordPermissionSummary(member);
    const botPermissions = discordPermissionSummary(botMember);
    return {
      connected: true,
      adminPermissions,
      botPermissions,
      canManage: adminPermissions.some(item => item.key === "manageGroup" && item.allowed)
    };
  }

  if (platform === "telegram") {
    const bot = global.telegramBot;
    if (!bot?.telegram) throw new Error("O Telegram está offline no momento.");
    const [member, botInfo] = await Promise.all([
      bot.telegram.getChatMember(String(groupId), Number(platformId)),
      bot.telegram.getMe()
    ]);
    const botMember = await bot.telegram.getChatMember(String(groupId), Number(botInfo.id));
    const adminPermissions = telegramPermissionSummary(member);
    return {
      connected: true,
      adminPermissions,
      botPermissions: telegramPermissionSummary(botMember),
      canManage: adminPermissions.some(item => item.key === "manageGroup" && item.allowed)
    };
  }

  if (platform === "whatsapp") {
    const sock = global.whatsappSock;
    if (!sock?.user || typeof sock.groupMetadata !== "function") {
      throw new Error("O WhatsApp está offline no momento.");
    }
    const metadata = await sock.groupMetadata(String(groupId));
    const areJidsSameUser = baileysPkg.areJidsSameUser;
    const findParticipant = ids => (metadata.participants || []).find(participant =>
      [participant.id, participant.lid, participant.phoneNumber].filter(Boolean).some(id =>
        ids.some(candidate => typeof areJidsSameUser === "function"
          ? areJidsSameUser(String(id), String(candidate))
          : String(id) === String(candidate))
      )
    );
    const adminParticipant = findParticipant([platformId]);
    const botParticipant = findParticipant([sock.user.id, sock.user.lid].filter(Boolean));
    const adminPermissions = whatsappPermissionSummary(adminParticipant);
    return {
      connected: true,
      adminPermissions,
      botPermissions: whatsappPermissionSummary(botParticipant),
      canManage: adminPermissions[0].allowed
    };
  }

  throw new Error("Plataforma inválida.");
}

function getAdminSystemDefinitions(platform, level) {
  return ADMIN_SYSTEM_SETTINGS.filter(setting => setting.scopes[platform]?.includes(level));
}

function getScopedAdminMessage(message, scope = {}) {
  const level = scope.level || (message.platform === "whatsapp" ? "chat" : "server");
  if (message.platform === "discord") {
    const channelId = level === "chat" ? String(scope.channelId || "") : level === "categoria" ? String(scope.categoryId || "") : "";
    const parentId = level === "categoria" ? String(scope.categoryId || "") : level === "chat" ? String(scope.categoryId || "") : "";
    const channel = channelId
      ? { id: channelId, parentId: parentId || null, parent: parentId ? { id: parentId } : null }
      : null;
    return {
      ...message,
      chatId: channelId || message.chatId,
      channelId: channelId || undefined,
      categoryId: level === "categoria" ? channelId : parentId || undefined,
      scopeLevel: level,
      raw: { ...message.raw, guild: { id: String(message.groupId || message.chatId) }, ...(channel ? { channel } : {}) }
    };
  }
  if (message.platform === "telegram") {
    const threadId = level === "topic" ? String(scope.topicId || "") : null;
    return {
      ...message,
      threadId,
      scopeLevel: level,
      raw: { ...message.raw, chat: { ...message.raw?.chat, id: String(message.groupId || message.chatId), is_forum: Boolean(threadId || scope.isForum) } }
    };
  }
  return { ...message, scopeLevel: scope.level || "chat" };
}

const ADMIN_MONITOR_HELPERS = {
  monitorStock: stockMonitor,
  monitorCafe: cafeMonitor,
  monitorWeather: weatherMonitor,
  monitorRandomWeather: randomWeatherMonitor,
  monitorElection: electionMonitor
};

function getAdminMonitorTarget(message) {
  return {
    platform: message.platform,
    chatId: String(message.chatId || message.groupId || ""),
    threadId: message.threadId ? String(message.threadId) : null,
    chatName: message.chatName || message.groupName || null
  };
}

function getAdminScheduleTarget(message) {
  return {
    platform: message.platform,
    chatId: String(message.chatId || message.groupId || ""),
    threadId: message.threadId ? String(message.threadId) : null,
    chatName: message.chatName || message.groupName || null
  };
}

function getAdminSchedules(message) {
  const target = getAdminScheduleTarget(message);
  return schedulerHelper.listSchedules(target.chatId, target.platform)
    .filter(schedule => String(schedule.chatId) === target.chatId &&
      schedule.platform === target.platform &&
      String(schedule.threadId || "") === String(target.threadId || "") &&
      !schedule.meta?.kind);
}

function serializeAdminSchedule(schedule) {
  return {
    id: String(schedule.id),
    name: String(schedule.name || ""),
    enabled: schedule.enabled === true,
    trigger: {
      type: schedule.trigger?.type === "fixed" ? "fixed" : "interval",
      intervalMs: Number(schedule.trigger?.intervalMs) || null,
      times: Array.isArray(schedule.trigger?.times) ? schedule.trigger.times : []
    },
    repeat: {
      mode: ["once", "daily", "weekly", "monthly"].includes(schedule.repeat?.mode)
        ? schedule.repeat.mode : "daily",
      days: Array.isArray(schedule.repeat?.days) ? schedule.repeat.days : [],
      monthDay: Number(schedule.repeat?.monthDay) || null
    },
    message: {
      text: String(schedule.message?.text || ""),
      mode: schedule.message?.mode === "media" ? "media" : "text",
      media: schedule.message?.media ? {
        type: String(schedule.message.media.type || "photo"),
        fileName: path.basename(String(schedule.message.media.fileName || schedule.message.media.url || "mídia"))
      } : null
    },
    state: {
      nextFireAt: Number(schedule.state?.nextFireAt) || null,
      firedCount: Number(schedule.state?.firedCount) || 0,
      done: schedule.state?.done === true
    }
  };
}

function findAdminSchedule(message, scheduleId) {
  const target = getAdminScheduleTarget(message);
  const schedule = schedulerHelper.getSchedule(String(scheduleId || ""));
  if (!schedule ||
      String(schedule.chatId) !== target.chatId ||
      schedule.platform !== target.platform ||
      String(schedule.threadId || "") !== String(target.threadId || "") ||
      schedule.meta?.kind) {
    throw new Error("Agendamento não encontrado neste escopo.");
  }
  return schedule;
}

function parseAdminScheduleInterval(value) {
  const normalized = String(value || "").replace(/\s+/g, "").toLowerCase();
  if (!/^(?:\d+d)?(?:\d+h)?(?:\d+m)?(?:\d+s)?$/.test(normalized) ||
      !/\d/.test(normalized)) {
    throw new Error("Intervalo inválido. Use formatos como 30m, 2h ou 1d2h.");
  }
  const milliseconds = schedulerHelper.parseIntervalToMs(normalized);
  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0) {
    throw new Error("O intervalo precisa ser maior que zero.");
  }
  return milliseconds;
}

function validateAdminScheduleConfig(input, platform) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Configuração do agendamento inválida.");
  }
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 100) {
    throw new Error("O nome precisa conter de 1 a 100 caracteres.");
  }
  const triggerInput = input.trigger;
  if (!triggerInput || typeof triggerInput !== "object") {
    throw new Error("Configure um gatilho para o agendamento.");
  }
  let trigger;
  if (triggerInput.type === "interval") {
    trigger = { type: "interval", intervalMs: parseAdminScheduleInterval(triggerInput.interval), times: [] };
  } else if (triggerInput.type === "fixed") {
    const times = Array.isArray(triggerInput.times)
      ? [...new Set(triggerInput.times.map(time => String(time).trim()))]
      : [];
    if (!times.length || times.length > 24 ||
        times.some(time => !/^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(time))) {
      throw new Error("Informe de 1 a 24 horários válidos no formato HH:MM.");
    }
    trigger = {
      type: "fixed",
      intervalMs: null,
      times: times.map(time => time.length === 4 ? `0${time}` : time).sort()
    };
  } else {
    throw new Error("Tipo de gatilho inválido.");
  }

  const repeatInput = input.repeat;
  const mode = repeatInput?.mode;
  let repeat;
  if (mode === "once" || mode === "daily") {
    repeat = { mode, days: [], monthDay: null };
  } else if (mode === "weekly") {
    const days = Array.isArray(repeatInput.days)
      ? [...new Set(repeatInput.days.map(day => schedulerHelper.parseDayOfWeek(day)).filter(day => day !== null))]
      : [];
    if (trigger.type !== "fixed" || !days.length) {
      throw new Error("A repetição semanal exige horários fixos e ao menos um dia da semana.");
    }
    repeat = { mode, days: days.sort((a, b) => a - b), monthDay: null };
  } else if (mode === "monthly") {
    const monthDay = Number(repeatInput.monthDay);
    if (trigger.type !== "fixed" || !Number.isInteger(monthDay) || monthDay < 1 || monthDay > 31) {
      throw new Error("A repetição mensal exige horários fixos e um dia entre 1 e 31.");
    }
    repeat = { mode, days: [], monthDay };
  } else {
    throw new Error("Escolha uma repetição válida.");
  }

  const text = typeof input.message?.text === "string" ? input.message.text.trim() : "";
  const maxTextLength = platform === "discord" ? 2000 : 4000;
  if (text.length > maxTextLength) {
    throw new Error(`O texto pode ter no máximo ${maxTextLength} caracteres nesta plataforma.`);
  }
  const messageMode = input.message?.mode === "media" ? "media" : input.message?.mode === "text" ? "text" : "";
  if (!messageMode) throw new Error("Escolha o envio por texto ou mídia.");
  if (messageMode === "text" && !text) throw new Error("Informe o texto da mensagem.");

  return { name, trigger, repeat, message: { text, mode: messageMode } };
}

async function saveAdminSchedule(message, scope, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Solicitação de agendamento inválida.");
  }
  const scopedMessage = getScopedAdminMessage(message, scope);
  const target = getAdminScheduleTarget(scopedMessage);
  const action = payload.action;

  if (action === "create") {
    const config = validateAdminScheduleConfig(payload.config, target.platform);
    const schedule = schedulerHelper.addSchedule({
      name: config.name,
      chatId: target.chatId,
      threadId: target.threadId,
      platform: target.platform,
      chatName: target.chatName
    });
    const updated = schedulerHelper.editSchedule(schedule.id, config);
    if (!updated) throw new Error("Não foi possível criar o agendamento.");
    return serializeAdminSchedule(updated);
  }

  const schedule = findAdminSchedule(scopedMessage, payload.id);
  if (action === "update") {
    const config = validateAdminScheduleConfig(payload.config, target.platform);
    const messagePatch = {
      ...config.message,
      media: schedule.message?.media || null
    };
    if (schedule.enabled && messagePatch.mode === "media" && !messagePatch.media) {
      throw new Error("Adicione uma mídia antes de manter ativo o modo de envio por mídia.");
    }
    const updated = schedulerHelper.editSchedule(schedule.id, {
      ...config,
      message: messagePatch
    });
    if (!updated) throw new Error("Não foi possível atualizar o agendamento.");
    return serializeAdminSchedule(updated);
  }
  if (action === "toggle") {
    if (typeof payload.enabled !== "boolean") throw new Error("Estado do agendamento inválido.");
    if (payload.enabled) {
      if (schedule.message?.mode === "media" && !schedule.message?.media?.url) {
        throw new Error("Adicione uma mídia antes de ativar este agendamento.");
      }
      if (schedule.message?.mode !== "media" && !String(schedule.message?.text || "").trim()) {
        throw new Error("Configure uma mensagem antes de ativar este agendamento.");
      }
      if (!["fixed", "interval"].includes(schedule.trigger?.type)) {
        throw new Error("Configure um horário ou intervalo antes de ativar este agendamento.");
      }
      if (schedule.trigger.type === "fixed" &&
          (!Array.isArray(schedule.trigger.times) || !schedule.trigger.times.length ||
            schedule.trigger.times.some(time => !/^(?:[01]?\d|2[0-3]):[0-5]\d$/.test(String(time))))) {
        throw new Error("Configure ao menos um horário fixo válido antes de ativar.");
      }
      if (schedule.trigger.type === "interval" &&
          (!Number.isSafeInteger(schedule.trigger.intervalMs) || schedule.trigger.intervalMs <= 0)) {
        throw new Error("Configure um intervalo válido antes de ativar.");
      }
      if (["weekly", "monthly"].includes(schedule.repeat?.mode) && schedule.trigger.type !== "fixed") {
        throw new Error("A repetição semanal ou mensal exige horários fixos.");
      }
      if (schedule.repeat?.mode === "weekly" &&
          (!Array.isArray(schedule.repeat.days) || !schedule.repeat.days.length ||
            schedule.repeat.days.some(day => !Number.isInteger(day) || day < 0 || day > 6))) {
        throw new Error("Configure ao menos um dia da semana antes de ativar.");
      }
      if (schedule.repeat?.mode === "monthly" &&
          (!Number.isInteger(schedule.repeat.monthDay) || schedule.repeat.monthDay < 1 || schedule.repeat.monthDay > 31)) {
        throw new Error("Configure um dia do mês válido antes de ativar.");
      }
    }
    const updated = schedulerHelper.editSchedule(schedule.id, { enabled: payload.enabled });
    if (!updated) throw new Error("Não foi possível alterar o estado do agendamento.");
    return serializeAdminSchedule(updated);
  }
  if (action === "delete") {
    if (!schedulerHelper.removeSchedule(schedule.id)) {
      throw new Error("Não foi possível remover o agendamento.");
    }
    return { id: schedule.id, deleted: true };
  }
  if (action === "test") {
    if (schedule.message?.mode === "media" && !schedule.message?.media?.url) {
      throw new Error("Adicione uma mídia antes de testar este agendamento.");
    }
    if (!schedule.message?.text && schedule.message?.mode !== "media") {
      throw new Error("Configure uma mensagem antes de testar este agendamento.");
    }
    await schedulerHelper.fireSchedule(schedule, { throwOnError: true });
    return serializeAdminSchedule(schedule);
  }
  if (action === "removeMedia") {
    if (schedule.enabled && schedule.message?.mode === "media") {
      throw new Error("Desative o agendamento antes de remover a mídia que ele envia.");
    }
    const updated = schedulerHelper.editSchedule(schedule.id, { message: { media: null } });
    if (!updated) throw new Error("Não foi possível remover a mídia do agendamento.");
    return serializeAdminSchedule(updated);
  }
  throw new Error("Ação de agendamento inválida.");
}

async function saveAdminScheduleMedia(message, scope, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Arquivo de mídia inválido.");
  }
  const scopedMessage = getScopedAdminMessage(message, scope);
  const schedule = findAdminSchedule(scopedMessage, payload.id);
  const mimeType = typeof payload.mimeType === "string" ? payload.mimeType.toLowerCase() : "";
  const mediaDefinition = ADMIN_WELCOME_MEDIA_TYPES.get(mimeType);
  if (!mediaDefinition || typeof payload.data !== "string" ||
      !payload.data.startsWith(`data:${mimeType};base64,`)) {
    throw new Error("Envie uma imagem JPEG, PNG, WebP, GIF ou vídeo MP4 válido.");
  }
  const encoded = payload.data.slice(payload.data.indexOf(",") + 1);
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded) ||
      encoded.length > Math.ceil(ADMIN_WELCOME_MEDIA_MAX_BYTES * 4 / 3) + 4) {
    throw new Error("A mídia deve ter até 8 MB.");
  }
  const buffer = Buffer.from(encoded, "base64");
  if (!isValidWelcomeMedia(buffer, mimeType)) {
    throw new Error("O conteúdo não corresponde ao tipo informado ou excede 8 MB.");
  }
  const uploaded = await schedulerHelper.storeMedia(
    message.platform,
    scopedMessage,
    buffer,
    typeof payload.fileName === "string" ? path.basename(payload.fileName) : "schedule_media",
    mimeType
  );
  const updated = schedulerHelper.editSchedule(schedule.id, {
    message: {
      media: {
        url: uploaded.url,
        type: uploaded.type || mediaDefinition.type,
        fileName: uploaded.fileName
      }
    }
  });
  if (!updated) throw new Error("A mídia foi armazenada, mas não foi possível associá-la ao agendamento.");
  return serializeAdminSchedule(updated);
}

function getAdminMonitorConfig(message, setting) {
  const helper = ADMIN_MONITOR_HELPERS[setting];
  if (!helper) throw new Error("Monitor inválido.");
  return helper.loadMonitorConfig(getAdminMonitorTarget(message));
}

function getAdminSettingValue(message, setting, level) {
  const helperLevel = level === "topic" ? "chat" : level;
  if (setting === "activity") return activity.load(message)?.enabled === true;
  if (setting === "xp") return xp.load(message)?.enabled === true;
  if (setting === "economy") return economy.isEnabled(message);
  if (setting === "antilink") return antilinkHelper.getSetAntilink(message, helperLevel)?.enabled === true;
  if (setting === "antimedia") return antimediaHelper.getSetAntimedia(message, helperLevel)?.enabled === true;
  if (setting === "antipalavras") return antipalavrasHelper.getSetAntipalavras(message, helperLevel)?.enabled === true;
  if (setting === "antiraid") return antiraidHelper.getSetAntiRaid(message, helperLevel)?.enabled === true;
  if (setting === "blockcmd") return blockcmdHelper.getSetBlockcmd(message, helperLevel)?.enabled === true;
  if (setting === "welcome") return welcomeHelper.getWelcomeConfig(message.platform, message.platform === "discord" ? message.raw.guild.id : null, message.platform === "discord" ? message.channelId : String(message.chatId), message.threadId).config.enabled === true;
  if (setting === "goodbye") return welcomeHelper.getGoodbyeConfig(message.platform, message.platform === "discord" ? message.raw.guild.id : null, message.platform === "discord" ? message.channelId : String(message.chatId), message.threadId).config.enabled === true;
  if (setting === "autoApprove") return autoAcceptHelper.getConfig({ platform: message.platform, chatId: String(message.chatId) }).enabled === true;
  if (setting === "autofigu") return autofiguHelper.getAutofiguEnabled(message);
  if (setting === "autodownload") return autodownloadHelper.getAutoDownloadSettings(message).enabled === true;
  if (setting === "autoTranscribe") return autoTranscribeHelper.getAutoTranscribeSetting(message, helperLevel) === true;
  if (setting === "autoia") return autoiaHelper.getAutoIAMode(message) !== "off";
  if (setting === "autorepo") return autorepoHelper.loadGroup(message)?.enabled === true;
  if (setting === "agendar") return getAdminSchedules(message).some(schedule => schedule.enabled && !schedule.state?.done);
  if (ADMIN_MONITOR_HELPERS[setting]) return getAdminMonitorConfig(message, setting).enabled === true;
  return false;
}

function getAdminSettings(message, scope = {}) {
  const level = scope.level || (message.platform === "whatsapp" ? "chat" : "server");
  const scopedMessage = getScopedAdminMessage(message, scope);
  return Object.fromEntries(getAdminSystemDefinitions(message.platform, level).map(setting => [
    setting.key,
    getAdminSettingValue(scopedMessage, setting.key, level)
  ]));
}

async function getAdminSystemsOptions(platform, groupId) {
  if (platform === "whatsapp") {
    const groupData = groupSettings.loadSettings("whatsapp", String(groupId), "group");
    const communityId = String(groupData.server || "");
    if (!communityId) return { categories: [], topics: [], isForum: false, hasCommunity: false };
    const communityData = groupSettings.loadSettings("whatsapp", communityId, "community");
    const belongsToCommunity = (Array.isArray(communityData.chat) ? communityData.chat : [])
      .some(chat => String(chat.id) === String(groupId));
    return {
      categories: [],
      topics: [],
      isForum: false,
      hasCommunity: belongsToCommunity,
      communityName: belongsToCommunity ? communityData.serverName || communityData.groupName || "Comunidade" : null
    };
  }
  if (platform === "discord") {
    const client = global.discordClient;
    if (!client?.isReady?.()) throw new Error("O Discord está offline no momento.");
    const guild = await client.guilds.fetch(String(groupId));
    const channels = await guild.channels.fetch();
    const categories = [...channels.values()]
      .filter(channel => channel.type === 4)
      .map(category => ({
        id: String(category.id),
        name: category.name || `Categoria ${category.id}`,
        channels: [...channels.values()]
          .filter(channel => String(channel.parentId || "") === String(category.id) && channel.isTextBased?.() && !channel.isThread?.())
          .map(channel => ({ id: String(channel.id), name: channel.name || `Canal ${channel.id}` }))
          .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const logChannels = [...channels.values()]
      .filter(channel => [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type))
      .map(channel => ({ id: String(channel.id), name: `#${channel.name || channel.id}` }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const serverSettings = groupSettings.loadSettings("discord", String(groupId), "server");
    return {
      categories,
      topics: [],
      logChannels,
      logChannelId: serverSettings.settings?.logsChannelId || ""
    };
  }
  if (platform === "telegram") {
    const bot = global.telegramBot;
    if (!bot?.telegram) throw new Error("O Telegram está offline no momento.");
    const chat = await bot.telegram.getChat(String(groupId));
    if (!chat.is_forum) return { categories: [], topics: [], isForum: false };
    const data = groupSettings.loadSettings("telegram", String(groupId), "group");
    const topicsById = new Map();
    for (const topic of Array.isArray(data.topico) ? data.topico : []) {
      if (topic?.id) topicsById.set(String(topic.id), String(topic.name || `Tópico ${topic.id}`));
    }
    if (data.topics && typeof data.topics === "object") {
      for (const [topicId, topic] of Object.entries(data.topics)) {
        if (!topicsById.has(String(topicId))) topicsById.set(String(topicId), String(topic?.name || `Tópico ${topicId}`));
      }
    }
    return {
      categories: [],
      topics: [...topicsById.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
      isForum: true
    };
  }
  return { categories: [], topics: [], isForum: false };
}

async function validateAdminSettingsScope(platform, groupId, requestedScope) {
  const level = typeof requestedScope?.level === "string" ? requestedScope.level : platform === "whatsapp" ? "chat" : "server";
  if (platform === "whatsapp") {
    if (level === "chat") return { level };
    if (level === "server") {
      const options = await getAdminSystemsOptions(platform, groupId);
      if (!options.hasCommunity) throw new Error("O escopo de comunidade não está disponível para este grupo.");
      return { level };
    }
    throw new Error("Escopo inválido para WhatsApp.");
  }
  if (platform === "discord") {
    if (level === "server") return { level };
    const client = global.discordClient;
    if (!client?.isReady?.()) throw new Error("O Discord está offline no momento.");
    const guild = await client.guilds.fetch(String(groupId));
    const channels = await guild.channels.fetch();
    const categoryId = String(requestedScope?.categoryId || "");
    const category = channels.get(categoryId);
    if (level === "categoria") {
      if (!categoryId || !category || category.type !== 4) throw new Error("Categoria inválida para este servidor.");
      ensureDiscordAdminScopeSettings(groupId, category, null);
      return { level, categoryId };
    }
    if (level === "chat") {
      const channelId = String(requestedScope?.channelId || "");
      const channel = channels.get(channelId);
      if (!categoryId || !category || category.type !== 4 || !channel || String(channel.parentId || "") !== categoryId || !channel.isTextBased?.() || channel.isThread?.()) {
        throw new Error("Canal inválido para a categoria selecionada.");
      }
      ensureDiscordAdminScopeSettings(groupId, category, channel);
      return { level, categoryId, channelId };
    }
    throw new Error("Nível de configuração inválido para Discord.");
  }
  if (platform === "telegram") {
    if (level === "server") return { level, isForum: false };
    if (level !== "topic") throw new Error("Nível de configuração inválido para Telegram.");
    const topicId = String(requestedScope?.topicId || "");
    if (!/^\d+$/.test(topicId)) throw new Error("Tópico inválido.");
    const { topics } = await getAdminSystemsOptions(platform, groupId);
    const topic = topics.find(item => item.id === topicId);
    if (!topic) throw new Error("O tópico não está registrado pelo bot ou não pertence a este grupo.");
    const data = groupSettings.loadSettings("telegram", String(groupId), "group");
    data.topico = Array.isArray(data.topico) ? data.topico : [];
    if (!data.topico.some(item => String(item.id) === topicId)) {
      data.topico.push({ id: topicId, name: topic.name, settings: { ...(data.topics?.[topicId]?.settings || {}) } });
      if (!groupSettings.saveSettings("telegram", String(groupId), "group", data, { raw: { chat: { id: String(groupId), is_forum: true } } })) {
        throw new Error("Não foi possível preparar as configurações deste tópico.");
      }
    }
    return { level, topicId, isForum: true };
  }
  throw new Error("Plataforma inválida.");
}

function ensureDiscordAdminScopeSettings(guildId, category, channel) {
  const data = groupSettings.loadSettings("discord", String(guildId), "server");
  data.categoria = Array.isArray(data.categoria) ? data.categoria : [];
  let categoryData = data.categoria.find(item => String(item.id) === String(category.id));
  let changed = false;
  if (!categoryData) {
    categoryData = { id: String(category.id), name: category.name || `Categoria ${category.id}`, chat: [], settings: {} };
    data.categoria.push(categoryData);
    changed = true;
  }
  if (channel) {
    categoryData.chat = Array.isArray(categoryData.chat) ? categoryData.chat : [];
    if (!categoryData.chat.some(item => String(item.id) === String(channel.id))) {
      categoryData.chat.push({ id: String(channel.id), name: channel.name || `Canal ${channel.id}`, topico: [], settings: {} });
      changed = true;
    }
  }
  if (changed && !groupSettings.saveSettings("discord", String(guildId), "server", data, {
    raw: { guild: { id: String(guildId), name: category.guild?.name || String(guildId) } }
  })) {
    throw new Error("Não foi possível preparar as configurações deste escopo do Discord.");
  }
}

async function getGroupAdminData(central, platform, groupId) {
  if (!["discord", "telegram", "whatsapp"].includes(platform) || !isValidPlatformGroupId(groupId)) {
    throw new Error("Plataforma ou grupo inválido.");
  }
  const platformAccount = central.platformAccounts.find(account => account.platform === platform);
  if (!platformAccount?.platformId) throw new Error("Esta plataforma não está vinculada à sua Conta Central.");
  const platformId = String(platformAccount.platformId);
  if (!await isPlatformGroupMember(platform, groupId, platformId)) {
    throw new Error("Sua conta vinculada não participa mais deste grupo ou servidor.");
  }
  const permissionSnapshot = await getPlatformAdminSnapshot(platform, groupId, platformId);
  if (!permissionSnapshot.canManage) {
    throw new Error("Você não tem permissão administrativa para este grupo ou servidor.");
  }

  const message = getLocalGroupMessage(platform, groupId, platformId);
  const profileUrl = new URL("http://localhost/perfil");
  profileUrl.searchParams.set("plataforma", platform);
  profileUrl.searchParams.set("grupo", groupId);
  profileUrl.searchParams.set("usuario", platformId);
  const profile = await readProfile(profileUrl, { allowEmpty: true });
  return {
    platform,
    groupId,
    groupName: profile.groupName || `Grupo ${groupId}`,
    userName: profile.name || platformAccount.displayName || platformAccount.username || "Sua conta",
    avatarUrl: await getProfileAvatar(platform, groupId, platformId),
    settings: getAdminSettings(message),
    moderation: getModerationWarnings(platform, groupId, platformId),
    permissionSnapshot
  };
}

async function setAdminSetting(message, setting, enabled, scope = {}) {
  const level = scope.level || (message.platform === "whatsapp" ? "chat" : "server");
  const definition = getAdminSystemDefinitions(message.platform, level).find(item => item.key === setting);
  if (!definition) throw new Error("Configuração administrativa inválida para este escopo.");
  const scopedMessage = getScopedAdminMessage(message, scope);
  if (setting === "activity") {
    activity.configure(scopedMessage, enabled);
  } else if (setting === "xp") {
    xp.configure(scopedMessage, { enabled });
  } else if (setting === "economy") {
    economy.setEnabled(scopedMessage, enabled);
  } else {
    await setAdminSystemSetting(scopedMessage, setting, enabled, level);
  }
  const settings = getAdminSettings(message, scope);
  if (settings[setting] !== enabled) throw new Error(`Não foi possível salvar a configuração de ${setting}.`);
  return settings;
}

function getAdminAntilinkConfig(message, scope) {
  const scopedMessage = getScopedAdminMessage(message, scope);
  const level = scope.level === "topic" ? "chat" : scope.level;
  const config = antilinkHelper.getSetAntilink(scopedMessage, level);
  if (!config) throw new Error("Não foi possível carregar o antilink neste escopo.");
  return config;
}

function saveAdminAntilinkConfig(message, scope, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Configuração do antilink inválida.");
  }
  const allowedActions = new Set(["delete", "warn", "kick", "ban"]);
  if (typeof input.action !== "string" || !allowedActions.has(input.action)) {
    throw new Error("Ação do antilink inválida.");
  }
  if (input.message !== null && (typeof input.message !== "string" || input.message.length > 2000)) {
    throw new Error("A mensagem deve ter até 2.000 caracteres.");
  }
  const booleanKeys = ["ignoreParent", "ignoreSameGroup", "ignoreMedia"];
  if (booleanKeys.some(key => typeof input[key] !== "boolean")) {
    throw new Error("Opção de exceção do antilink inválida.");
  }
  const listKeys = ["whitelist", "userWhitelist", "userBlacklist"];
  if (message.platform === "discord") listKeys.push("roleWhitelist", "roleBlacklist");
  const normalizedLists = {};
  for (const key of listKeys) {
    const values = input[key];
    if (!Array.isArray(values) || values.length > 500 || values.some(value => typeof value !== "string" || value.length > 200)) {
      throw new Error(`A lista ${key} deve conter até 500 itens de no máximo 200 caracteres.`);
    }
    normalizedLists[key] = [...new Set(values.map(value => value.trim()).filter(Boolean))];
  }
  const config = {
    action: input.action,
    message: input.message?.trim() || null,
    ignoreParent: input.ignoreParent,
    ignoreSameGroup: input.ignoreSameGroup,
    ignoreMedia: input.ignoreMedia,
    ...normalizedLists
  };
  const scopedMessage = getScopedAdminMessage(message, scope);
  const level = scope.level === "topic" ? "chat" : scope.level;
  const saved = antilinkHelper.getSetAntilink(scopedMessage, level, config);
  if (!saved) throw new Error("Não foi possível salvar o antilink neste escopo.");
  return saved;
}

function getAdminAntimediaConfig(message, scope) {
  const scopedMessage = getScopedAdminMessage(message, scope);
  const level = scope.level === "topic" ? "chat" : scope.level;
  const config = antimediaHelper.getSetAntimedia(scopedMessage, level);
  if (!config) throw new Error("Não foi possível carregar o antimídia neste escopo.");
  return config;
}

function saveAdminAntimediaConfig(message, scope, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Configuração do antimídia inválida.");
  }
  if (!["delete", "warn", "kick", "ban"].includes(input.action)) {
    throw new Error("Ação do antimídia inválida.");
  }
  if (input.message !== null && (typeof input.message !== "string" || input.message.length > 2000)) {
    throw new Error("A mensagem deve ter até 2.000 caracteres.");
  }
  if (typeof input.ignoreParent !== "boolean") {
    throw new Error("Opção de herança do antimídia inválida.");
  }
  if (!Array.isArray(input.mediaTypes) || input.mediaTypes.length > antimediaHelper.ALL_MEDIA_TYPES.length ||
      input.mediaTypes.some(value => typeof value !== "string" || value.length > 40)) {
    throw new Error("A lista de mídias configuradas é inválida.");
  }
  const mediaTypes = antimediaHelper.normalizeMediaTypes(input.mediaTypes);
  if (mediaTypes.some(type => !antimediaHelper.ALL_MEDIA_TYPES.includes(type))) {
    throw new Error("Um ou mais tipos de mídia não são suportados.");
  }

  const listKeys = ["userWhitelist", "userBlacklist"];
  if (message.platform === "discord") listKeys.push("roleWhitelist", "roleBlacklist");
  const normalizedLists = {};
  for (const key of listKeys) {
    const values = input[key];
    if (!Array.isArray(values) || values.length > 500 || values.some(value => typeof value !== "string" || value.length > 200)) {
      throw new Error(`A lista ${key} deve conter até 500 itens de no máximo 200 caracteres.`);
    }
    normalizedLists[key] = [...new Set(values.map(value => value.trim()).filter(Boolean))];
  }

  const config = {
    action: input.action,
    message: input.message?.trim() || null,
    ignoreParent: input.ignoreParent,
    mediaTypes: [...new Set(mediaTypes)],
    ...normalizedLists
  };
  const scopedMessage = getScopedAdminMessage(message, scope);
  const level = scope.level === "topic" ? "chat" : scope.level;
  const saved = antimediaHelper.getSetAntimedia(scopedMessage, level, config);
  if (!saved) throw new Error("Não foi possível salvar o antimídia neste escopo.");
  return saved;
}

function getAdminAntipalavrasConfig(message, scope) {
  const scopedMessage = getScopedAdminMessage(message, scope);
  const level = scope.level === "topic" ? "chat" : scope.level;
  const config = antipalavrasHelper.getSetAntipalavras(scopedMessage, level);
  if (!config) throw new Error("Não foi possível carregar o antipalavras neste escopo.");
  return config;
}

function saveAdminAntipalavrasConfig(message, scope, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Configuração do antipalavras inválida.");
  }
  if (!["delete", "warn", "kick", "ban"].includes(input.action)) {
    throw new Error("Ação do antipalavras inválida.");
  }
  if (input.message !== null && (typeof input.message !== "string" || input.message.length > 2000)) {
    throw new Error("A mensagem deve ter até 2.000 caracteres.");
  }
  if (typeof input.ignoreParent !== "boolean") {
    throw new Error("Opção de herança do antipalavras inválida.");
  }
  if (!Array.isArray(input.words) || input.words.length > 500 ||
      input.words.some(value => typeof value !== "string" || value.length > 200)) {
    throw new Error("A lista deve conter até 500 palavras/frases de no máximo 200 caracteres.");
  }
  const words = [...new Set(antipalavrasHelper.normalizeWords(input.words))];
  if (words.some(word => word.length > 200)) {
    throw new Error("Cada palavra/frase deve ter no máximo 200 caracteres.");
  }
  const listKeys = ["userWhitelist", "userBlacklist"];
  if (message.platform === "discord") listKeys.push("roleWhitelist", "roleBlacklist");
  const normalizedLists = {};
  for (const key of listKeys) {
    const values = input[key];
    if (!Array.isArray(values) || values.length > 500 || values.some(value => typeof value !== "string" || value.length > 200)) {
      throw new Error(`A lista ${key} deve conter até 500 itens de no máximo 200 caracteres.`);
    }
    normalizedLists[key] = [...new Set(values.map(value => value.trim()).filter(Boolean))];
  }
  const config = {
    action: input.action,
    message: input.message?.trim() || null,
    ignoreParent: input.ignoreParent,
    words,
    ...normalizedLists
  };
  const scopedMessage = getScopedAdminMessage(message, scope);
  const level = scope.level === "topic" ? "chat" : scope.level;
  const saved = antipalavrasHelper.getSetAntipalavras(scopedMessage, level, config);
  if (!saved) throw new Error("Não foi possível salvar o antipalavras neste escopo.");
  return saved;
}

function getAdminAntiraidConfig(message, scope) {
  const scopedMessage = getScopedAdminMessage(message, scope);
  const level = scope.level === "topic" ? "chat" : scope.level;
  const config = antiraidHelper.getSetAntiRaid(scopedMessage, level);
  if (!config) throw new Error("Não foi possível carregar o antiraid neste escopo.");
  return config;
}

function saveAdminAntiraidConfig(message, scope, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Configuração do antiraid inválida.");
  }
  const allowedActions = message.platform === "whatsapp"
    ? new Set(["remove"])
    : message.platform === "discord"
      ? new Set(["mute", "timeout", "kick", "ban"])
      : new Set(["mute", "kick", "ban"]);
  const current = getAdminAntiraidConfig(message, scope);
  const action = message.platform === "whatsapp" && input.action === "mute" ? "remove" : input.action;
  if (typeof action !== "string" || !allowedActions.has(action)) {
    throw new Error("Ação do antiraid inválida para esta plataforma.");
  }
  const numericFields = [
    ["maxMessagesPerWindow", 1, 100],
    ["windowSeconds", 1, 300],
    ["repeatedMessageLimit", 1, 100],
    ["linkLimit", 1, 100],
    ["inviteLimit", 1, 100],
    ["mentionLimit", 0, 100],
    ["webhookLimit", 0, 100]
  ];
  const config = { ...current, action };
  for (const [key, minimum, maximum] of numericFields) {
    const value = input[key] === undefined ? current[key] : input[key];
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
      throw new Error(`O campo ${key} deve ser um número inteiro entre ${minimum} e ${maximum}.`);
    }
    config[key] = value;
  }
  const listKeys = ["userWhitelist", "userBlacklist"];
  if (message.platform === "discord") listKeys.push("roleWhitelist", "roleBlacklist");
  for (const key of listKeys) {
    const values = input[key] === undefined ? current[key] : input[key];
    if (!Array.isArray(values) || values.length > 500 || values.some(value => typeof value !== "string" || value.length > 200)) {
      throw new Error(`A lista ${key} deve conter até 500 itens de no máximo 200 caracteres.`);
    }
    config[key] = [...new Set(values.map(value => value.trim()).filter(Boolean))];
  }
  const scopedMessage = getScopedAdminMessage(message, scope);
  const level = scope.level === "topic" ? "chat" : scope.level;
  const saved = antiraidHelper.getSetAntiRaid(scopedMessage, level, config);
  if (!saved) throw new Error("Não foi possível salvar o antiraid neste escopo.");
  return saved;
}

function getAdminBlockcmdConfig(message, scope) {
  const scopedMessage = getScopedAdminMessage(message, scope);
  const level = scope.level === "topic" ? "chat" : scope.level;
  const config = blockcmdHelper.getSetBlockcmd(scopedMessage, level);
  if (!config) throw new Error("Não foi possível carregar o bloqueio de comandos neste escopo.");
  return config;
}

function saveAdminBlockcmdConfig(message, scope, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Configuração do bloqueio de comandos inválida.");
  }
  if (!["reply", "ignore", "delete"].includes(input.action)) {
    throw new Error("Ação do bloqueio de comandos inválida.");
  }
  if (input.message !== null && (typeof input.message !== "string" || input.message.length > 2000)) {
    throw new Error("A mensagem deve ter até 2.000 caracteres.");
  }
  if (typeof input.ignoreParent !== "boolean") {
    throw new Error("Opção de herança do bloqueio de comandos inválida.");
  }
  if (!Array.isArray(input.blockedCommands) || input.blockedCommands.length > 500 ||
      input.blockedCommands.some(value => typeof value !== "string" || value.length > 200)) {
    throw new Error("A lista deve conter até 500 comandos/categorias de no máximo 200 caracteres.");
  }
  const blockedCommands = [...new Set(input.blockedCommands
    .map(value => value.trim().replace(/^[!/+#.]/, "").toLowerCase())
    .filter(Boolean))];
  const scopedMessage = getScopedAdminMessage(message, scope);
  const level = scope.level === "topic" ? "chat" : scope.level;
  const saved = blockcmdHelper.getSetBlockcmd(scopedMessage, level, {
    action: input.action,
    message: input.message?.trim() || null,
    ignoreParent: input.ignoreParent,
    blockedCommands
  });
  if (!saved) throw new Error("Não foi possível salvar o bloqueio de comandos neste escopo.");
  return saved;
}

function getAdminAutoApproveConfig(message, scope) {
  const scopedMessage = getScopedAdminMessage(message, scope);
  return autoAcceptHelper.getConfig({
    platform: scopedMessage.platform,
    chatId: String(scopedMessage.chatId),
    raw: scopedMessage.raw,
    chatName: scopedMessage.groupName || scopedMessage.chatName
  });
}

function validateAdminAutoApproveConfig(input, current) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Configuração de autoaprovação inválida.");
  }
  const intervalSeconds = Number(input.intervalSeconds);
  if (!Number.isInteger(intervalSeconds) || intervalSeconds < 0 || intervalSeconds > 86400) {
    throw new Error("O intervalo deve ser um número inteiro entre 0 e 86400 segundos.");
  }
  const readList = (value, label) => {
    if (!Array.isArray(value)) throw new Error(`Informe a lista de ${label} como itens separados por linha.`);
    const entries = value;
    const normalized = [...new Set(entries.map(item => String(item).trim()).filter(Boolean))];
    if (normalized.length > 100 || normalized.some(item => item.length > 100)) {
      throw new Error(`A lista de ${label} aceita até 100 itens, com no máximo 100 caracteres cada.`);
    }
    return normalized;
  };
  if (!Array.isArray(input.schedules)) throw new Error("Informe as faixas de horário como uma lista.");
  const schedules = input.schedules;
  if (schedules.length > 24 || schedules.some(schedule =>
    !schedule || autoAcceptHelper.parseTime(schedule.start) === null ||
    autoAcceptHelper.parseTime(schedule.end) === null
  )) {
    throw new Error("Informe até 24 faixas de horário válidas no formato HH:MM-HH:MM.");
  }
  return {
    ...current,
    intervalSeconds,
    blockedNames: readList(input.blockedNames, "nomes"),
    blockedSymbols: readList(input.blockedSymbols, "símbolos"),
    schedules: schedules.map(schedule => ({
      start: String(schedule.start).trim(),
      end: String(schedule.end).trim()
    }))
  };
}

function getAdminXpConfig(message, scope) {
  const scopedMessage = getScopedAdminMessage(message, scope);
  const data = xp.load(scopedMessage);
  return {
    enabled: data?.enabled === true,
    muted: data?.levelUp?.muted === true,
    chatId: data?.levelUp?.chatId || "",
    threadId: data?.levelUp?.threadId || ""
  };
}

async function saveAdminXpConfig(message, scope, input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || typeof input.muted !== "boolean") {
    throw new Error("Configuração de XP inválida.");
  }
  const scopedMessage = getScopedAdminMessage(message, scope);
  let chatId = null;
  let threadId = null;
  const destination = typeof input.destination === "string" ? input.destination.trim() : "";
  if (destination && message.platform === "discord") {
    const options = await getAdminSystemsOptions(message.platform, String(message.groupId || message.chatId));
    const channel = options.logChannels.find(item => item.id === destination);
    if (!channel) throw new Error("Canal de avisos inválido para este servidor.");
    chatId = destination;
  } else if (destination && message.platform === "telegram") {
    const options = await getAdminSystemsOptions(message.platform, String(message.groupId || message.chatId));
    const topic = options.topics.find(item => item.id === destination);
    if (!topic) throw new Error("Tópico de avisos inválido para este grupo.");
    chatId = String(scopedMessage.chatId);
    threadId = destination;
  } else if (destination) {
    throw new Error("Destino de avisos não disponível nesta plataforma.");
  }
  const saved = xp.configure(scopedMessage, {
    muted: input.muted,
    chatId,
    threadId
  });
  if (!saved) throw new Error("Não foi possível salvar as configurações de XP.");
  return getAdminXpConfig(message, scope);
}

function getAdminRpUserData(message, setting, query = "") {
  const normalizedQuery = String(query).trim().replace(/^@/, "").toLowerCase();
  let entries;
  if (setting === "economy") {
    entries = economy.listAccounts(message).map(account => ({
      userId: String(account.userId),
      username: account.username || "",
      displayName: account.displayName || "",
      value: Number(account.balance) || 0,
      detail: economy.formatMoney(account.balance)
    }));
  } else if (setting === "xp") {
    entries = xp.ranking(message).map(user => ({
      userId: String(user.userId),
      username: user.username || "",
      displayName: user.displayName || "",
      value: Number(user.xp) || 0,
      detail: `${Number(user.xp) || 0} XP · Nível ${xp.levelForXp(user.xp).level}`
    }));
  } else if (setting === "activity") {
    entries = (activity.ranking(message)?.users || []).map(user => ({
      userId: String(user.userId),
      username: user.username || "",
      displayName: user.displayName || "",
      value: Number(user.total) || 0,
      detail: `${Number(user.total) || 0} registros · ${Number(user.messages) || 0} mensagens · ${Number(user.commands) || 0} comandos`
    }));
  } else {
    throw new Error("Sistema de RP inválido.");
  }
  const matches = normalizedQuery
    ? entries.filter(user => [user.userId, user.username, user.displayName]
      .some(value => String(value).toLowerCase().includes(normalizedQuery)))
    : entries;
  return {
    total: matches.length,
    users: matches.slice(0, 100)
  };
}

function executeAdminRpAction(message, setting, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Ação de gerenciamento inválida.");
  }
  const action = typeof input.action === "string" ? input.action : "";
  if (action === "resetAll") {
    let resetCount;
    if (setting === "economy") {
      resetCount = economy.resetAllBalances(message);
    } else if (setting === "xp") {
      resetCount = xp.resetAll(message);
    } else if (setting === "activity") {
      resetCount = activity.resetAll(message);
    } else {
      throw new Error("Sistema de RP inválido.");
    }
    if (resetCount === null || resetCount === false) {
      throw new Error("Não foi possível resetar os dados deste sistema.");
    }
    return { resetCount };
  }
  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  if (!userId || userId.length > 100) throw new Error("Selecione um usuário válido.");
  if (setting === "activity") {
    if (action !== "reset") throw new Error("Ação de atividade inválida.");
    if (!activity.resetUser(message, userId)) throw new Error("Não há registro de atividade para este usuário.");
  } else if (setting === "economy") {
    const account = economy.getAccountByUser(message, userId);
    if (!account) throw new Error("Conta de economia não encontrada neste grupo.");
    if (action === "reset") {
      if (!economy.resetBalance(message, userId)) throw new Error("Não foi possível zerar o saldo.");
    } else {
      const amountText = String(input.amount ?? "").trim().replace(",", ".");
      if (!/^\d+(?:\.\d{1,2})?$/.test(amountText)) throw new Error("Informe um valor válido com até duas casas decimais.");
      const [whole, fraction = ""] = amountText.split(".");
      const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
      if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("O valor informado é inválido.");
      if (!["set", "add", "subtract"].includes(action)) throw new Error("Ação de economia inválida.");
      if (action === "subtract" && amount > Number(account.balance || 0)) {
        throw new Error("O saldo não pode ficar negativo.");
      }
      const operation = action === "subtract" ? "subtract" : action;
      if (!economy.adjustBalance(message, { userId }, amount, operation)) throw new Error("Não foi possível ajustar o saldo.");
    }
  } else if (setting === "xp") {
    const user = xp.getUserById(message, userId);
    if (!user) throw new Error("Usuário não encontrado no sistema de XP.");
    if (action === "reset") {
      if (!xp.resetUser(message, userId)) throw new Error("Não foi possível zerar o XP.");
    } else {
      const amountText = String(input.amount ?? "").trim();
      const amount = Number(amountText);
      if (!amountText || !Number.isSafeInteger(amount) || amount < 0 || amount > 1_000_000_000) {
        throw new Error("Informe uma quantidade inteira de XP entre 0 e 1.000.000.000.");
      }
      if (!["set", "add", "subtract"].includes(action)) throw new Error("Ação de XP inválida.");
      if (!xp.adjustXp(message, { userId }, amount, action === "subtract" ? "subtract" : action)) {
        throw new Error("Não foi possível ajustar o XP.");
      }
    }
  } else {
    throw new Error("Sistema de RP inválido.");
  }
  return getAdminRpUserData(message, setting, userId);
}

function getAdminWelcomeConfig(message, scope, setting) {
  const scopedMessage = getScopedAdminMessage(message, scope);
  const helper = setting === "welcome" ? welcomeHelper.getWelcomeConfig : welcomeHelper.getGoodbyeConfig;
  const result = helper(
    message.platform,
    message.platform === "discord" ? String(scopedMessage.raw.guild.id) : null,
    String(scopedMessage.chatId),
    scopedMessage.threadId || null
  );
  const config = result.config;
  const configuredFileName = typeof config.media?.fileName === "string"
    ? config.media.fileName.trim()
    : "";
  const mediaFileName = configuredFileName.length > 0 && configuredFileName.length <= 100 &&
    !/[\u0000-\u001f]/.test(configuredFileName)
    ? path.basename(configuredFileName)
    : null;
  return {
    ...config,
    media: config.media ? {
      type: config.media.type || "photo",
      fileName: mediaFileName
    } : null
  };
}

function saveAdminWelcomeConfig(message, scope, setting, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Configuração de boas-vindas/despedida inválida.");
  }
  if (!["texto", "media"].includes(input.mode)) {
    throw new Error("Modo de envio inválido.");
  }
  if (typeof input.text !== "string" || !input.text.trim() || input.text.length > 2000) {
    throw new Error("A mensagem deve conter de 1 a 2.000 caracteres.");
  }
  const scopedMessage = getScopedAdminMessage(message, scope);
  const save = setting === "welcome" ? welcomeHelper.saveWelcomeConfig : welcomeHelper.saveGoodbyeConfig;
  if (!save(
    message.platform,
    message.platform === "discord" ? String(scopedMessage.raw.guild.id) : null,
    String(scopedMessage.chatId),
    scopedMessage.threadId || null,
    { mode: input.mode, text: input.text.trim() }
  )) {
    throw new Error("Não foi possível salvar as configurações de boas-vindas/despedida.");
  }
  return getAdminWelcomeConfig(message, scope, setting);
}

const ADMIN_WELCOME_MEDIA_MAX_BYTES = 8 * 1024 * 1024;
const ADMIN_WELCOME_MEDIA_TYPES = new Map([
  ["image/jpeg", { extension: ".jpg", type: "photo" }],
  ["image/png", { extension: ".png", type: "photo" }],
  ["image/webp", { extension: ".webp", type: "photo" }],
  ["image/gif", { extension: ".gif", type: "gif" }],
  ["video/mp4", { extension: ".mp4", type: "video" }]
]);

function isValidWelcomeMedia(buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > ADMIN_WELCOME_MEDIA_MAX_BYTES) return false;
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === "image/webp") return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  if (mimeType === "image/gif") return buffer.length >= 6 && /^GIF8[79]a$/.test(buffer.toString("ascii", 0, 6));
  if (mimeType === "video/mp4") return buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp";
  return false;
}

async function updateAdminWelcomeMedia(message, scope, setting, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Arquivo de mídia inválido.");
  }
  const scopedMessage = getScopedAdminMessage(message, scope);
  const save = setting === "welcome" ? welcomeHelper.saveWelcomeConfig : welcomeHelper.saveGoodbyeConfig;
  if (input.remove === true) {
    if (!save(
      message.platform,
      message.platform === "discord" ? String(scopedMessage.raw.guild.id) : null,
      String(scopedMessage.chatId),
      scopedMessage.threadId || null,
      { media: null }
    )) {
      throw new Error("Não foi possível remover a mídia configurada.");
    }
    return getAdminWelcomeConfig(message, scope, setting);
  }
  const mimeType = typeof input.mimeType === "string" ? input.mimeType.toLowerCase() : "";
  const mediaDefinition = ADMIN_WELCOME_MEDIA_TYPES.get(mimeType);
  if (!mediaDefinition || typeof input.data !== "string" ||
      !input.data.startsWith(`data:${mimeType};base64,`)) {
    throw new Error("Envie uma imagem JPEG, PNG, WebP, GIF ou vídeo MP4 válido.");
  }
  const encoded = input.data.slice(input.data.indexOf(",") + 1);
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded) ||
      encoded.length > Math.ceil(ADMIN_WELCOME_MEDIA_MAX_BYTES * 4 / 3) + 4) {
    throw new Error("A mídia deve ter até 8 MB.");
  }
  const buffer = Buffer.from(encoded, "base64");
  if (!isValidWelcomeMedia(buffer, mimeType)) {
    throw new Error("O conteúdo do arquivo não corresponde ao tipo informado ou excede 8 MB.");
  }
  const uploaded = await welcomeHelper.storeMedia(
    message.platform,
    scopedMessage,
    buffer,
    `dashboard_${setting}`,
    mimeType
  );
  if (!save(
    message.platform,
    message.platform === "discord" ? String(scopedMessage.raw.guild.id) : null,
    String(scopedMessage.chatId),
    scopedMessage.threadId || null,
    { media: { url: uploaded.url, type: mediaDefinition.type, fileName: `${setting}${mediaDefinition.extension}` } }
  )) {
    throw new Error("A mídia foi armazenada, mas não foi possível associá-la à configuração.");
  }
  return getAdminWelcomeConfig(message, scope, setting);
}

function getAdminAutorespostaConfig(message, scope) {
  const scopedMessage = getScopedAdminMessage(message, scope);
  const groupConfig = autorepoHelper.loadGroup(scopedMessage);
  if (!groupConfig) throw new Error("Respostas automáticas não estão disponíveis neste escopo.");
  return {
    useGlobal: groupConfig.useGlobal !== false,
    responses: groupConfig.responses.map(response => ({
      id: String(response.id || ""),
      trigger: String(response.trigger || ""),
      matchType: response.matchType || "exact",
      action: response.action === "react" ? "react" : "reply",
      content: String(response.content || ""),
      cooldown: Number(response.cooldown) || 5
    })),
    globalCount: autorepoHelper.loadGlobal().responses.length
  };
}

function saveAdminAutorespostaConfig(message, scope, input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      typeof input.useGlobal !== "boolean" || !Array.isArray(input.responses)) {
    throw new Error("Configuração das respostas automáticas inválida.");
  }
  if (input.responses.length > 100) {
    throw new Error("O grupo pode ter até 100 respostas locais.");
  }

  const scopedMessage = getScopedAdminMessage(message, scope);
  const current = autorepoHelper.loadGroup(scopedMessage);
  if (!current) throw new Error("Respostas automáticas não estão disponíveis neste escopo.");
  const knownIds = new Set(current.responses.map(response => String(response.id || "")).filter(Boolean));
  const triggers = new Set();
  const responses = input.responses.map(response => {
    if (!response || typeof response !== "object" || Array.isArray(response) ||
        typeof response.trigger !== "string" || !response.trigger.trim() || response.trigger.length > 100 ||
        typeof response.content !== "string" || !response.content.trim() || response.content.length > 2000) {
      throw new Error("Cada resposta precisa de um gatilho de até 100 caracteres e conteúdo de até 2.000 caracteres.");
    }
    if (!["exact", "contains", "starts"].includes(response.matchType) ||
        !["reply", "react"].includes(response.action) ||
        !Number.isInteger(response.cooldown) || response.cooldown < 1 || response.cooldown > 3600) {
      throw new Error("Tipo de correspondência, ação ou intervalo de espera inválido.");
    }
    const trigger = response.trigger.trim();
    const normalizedTrigger = autorepoHelper.normalizeText(trigger);
    if (triggers.has(normalizedTrigger)) {
      throw new Error("Não é possível cadastrar gatilhos duplicados.");
    }
    triggers.add(normalizedTrigger);
    const existingId = typeof response.id === "string" && knownIds.has(response.id) ? response.id : "";
    return {
      id: existingId || `local_${crypto.randomUUID()}`,
      trigger,
      matchType: response.matchType,
      action: response.action,
      content: response.content.trim(),
      cooldown: response.cooldown
    };
  });

  if (!autorepoHelper.saveGroup(scopedMessage, {
    ...current,
    useGlobal: input.useGlobal,
    responses
  })) {
    throw new Error("Não foi possível salvar as respostas automáticas.");
  }
  return getAdminAutorespostaConfig(scopedMessage, {}, "autorepo");
}

function getAdminAutodownloadConfig(message, scope) {
  const scopedMessage = getScopedAdminMessage(message, scope);
  return autodownloadHelper.getAutoDownloadSettings(scopedMessage);
}

function saveAdminAutodownloadConfig(message, scope, input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      typeof input.deletelink !== "boolean") {
    throw new Error("A opção de excluir o link original é inválida.");
  }
  const scopedMessage = getScopedAdminMessage(message, scope);
  if (scopedMessage.isPrivate) {
    throw new Error("Esta opção só pode ser configurada em grupos e servidores.");
  }
  autodownloadHelper.setAutoDownloadDeleteLink(scopedMessage, input.deletelink);
  return getAdminAutodownloadConfig(scopedMessage, {});
}

function validateAdminMonitorTimes(values) {
  if (!Array.isArray(values) || values.some(value => typeof value !== "string")) {
    throw new Error("A lista de horários é inválida.");
  }
  const times = values.map(value => value.trim()).filter(Boolean);
  if (!times.length || times.length > 12 ||
      times.some(time => !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))) {
    throw new Error("Informe de 1 a 12 horários válidos no formato HH:MM.");
  }
  return [...new Set(times)];
}

function parseAdminMonitorDuration(value, allowZero = false) {
  const normalized = String(value || "").replace(/\s+/g, "").toLowerCase();
  if (allowZero && /^0+(s|m|h|d)?$/.test(normalized)) return 0;
  if (!/^(?:\d+[dhms])+$/.test(normalized)) {
    throw new Error("Use um intervalo no formato 5m, 2h ou 1h30m.");
  }
  const parts = normalized.match(/\d+[dhms]/g) || [];
  const multipliers = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  const milliseconds = parts.reduce((total, part) =>
    total + Number.parseInt(part, 10) * multipliers[part.slice(-1)], 0);
  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0) {
    throw new Error("O intervalo precisa ser maior que zero.");
  }
  return milliseconds;
}

async function saveAdminMonitorConfig(message, scope, setting, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Configuração do monitor inválida.");
  }
  const scopedMessage = getScopedAdminMessage(message, scope);
  const target = getAdminMonitorTarget(scopedMessage);
  if (!target.chatId) throw new Error("Não foi possível identificar o chat de destino do monitor.");
  const helper = ADMIN_MONITOR_HELPERS[setting];
  const current = helper.loadMonitorConfig(target);
  let patch;

  if (setting === "monitorStock") {
    if (!Array.isArray(input.symbols) || input.symbols.some(value => typeof value !== "string")) {
      throw new Error("A lista de ativos da bolsa é inválida.");
    }
    const allowedSymbols = new Set(MARKET_ASSETS.map(asset => asset.symbol.toLowerCase()));
    if (input.symbols.some(symbol => !allowedSymbols.has(symbol.trim().toLowerCase()))) {
      throw new Error("A lista de ativos da bolsa contém um ativo inválido.");
    }
    patch = {
      symbols: input.symbols.length
        ? normalizeMarketSymbols(input.symbols).map(asset => asset.symbol)
        : [],
      times: validateAdminMonitorTimes(input.times)
    };
  } else if (setting === "monitorCafe") {
    const allowedSources = new Set(["Minasul", "Coocafe", "CCCMG"]);
    const sources = Array.isArray(input.sources)
      ? [...new Set(input.sources.map(source => cafeMonitor.normalizeSourceName(source)))]
      : [];
    if (!sources.length || sources.some(source => !allowedSources.has(source))) {
      throw new Error("Selecione ao menos uma fonte válida para o monitor do café.");
    }
    if (!["loop", "monitor", "both"].includes(input.mode)) {
      throw new Error("Escolha um modo válido para o monitor do café.");
    }
    patch = {
      mode: input.mode,
      sources,
      times: validateAdminMonitorTimes(input.times),
      sendMode: "all"
    };
  } else if (setting === "monitorWeather") {
    const city = typeof input.city === "string" ? input.city.trim() : "";
    if (!city || city.length > 120) throw new Error("Informe uma cidade com até 120 caracteres.");
    patch = { city, times: validateAdminMonitorTimes(input.times) };
  } else if (setting === "monitorRandomWeather") {
    if (!Array.isArray(input.cities) || input.cities.length > 100 ||
        input.cities.some(city => typeof city !== "string" || !city.trim() || city.length > 120)) {
      throw new Error("Informe até 100 cidades, cada uma com até 120 caracteres.");
    }
    patch = {
      cities: [...new Set(input.cities.map(city => city.trim()))],
      times: validateAdminMonitorTimes(input.times)
    };
    if (current.enabled && !patch.cities.length) {
      throw new Error("Cadastre ao menos uma cidade antes de salvar as configurações do monitor ativado.");
    }
  } else if (setting === "monitorElection") {
    if (!Array.isArray(input.jobs) || input.jobs.length > 20) {
      throw new Error("O monitor eleitoral aceita até 20 consultas.");
    }
    const existingIds = new Set(current.jobs.map(job => String(job.id)));
    const jobs = input.jobs.map(job => {
      if (!job || typeof job !== "object" || Array.isArray(job)) {
        throw new Error("Uma das consultas eleitorais está inválida.");
      }
      const state = typeof job.state === "string" ? job.state.trim().toUpperCase() : "";
      const municipality = typeof job.municipality === "string" ? job.municipality.trim() : "";
      const query = typeof job.query === "string" ? job.query.trim() : "";
      if ((state && !/^[A-Z]{2}$/.test(state)) || municipality.length > 100 || query.length > 100) {
        throw new Error("Use uma UF de duas letras e limites de 100 caracteres para município/busca.");
      }
      if (!state && !municipality && !query) {
        throw new Error("Cada consulta precisa de uma UF, município ou termo de busca.");
      }
      const intervalMs = parseAdminMonitorDuration(job.interval);
      if (intervalMs < 60000 || intervalMs > 30 * 86400000) {
        throw new Error("O intervalo eleitoral deve ser de 1 minuto a 30 dias.");
      }
      const initialDelayMs = job.delay === "" || job.delay === undefined
        ? intervalMs
        : parseAdminMonitorDuration(job.delay, true);
      if (initialDelayMs > 30 * 86400000) {
        throw new Error("O atraso inicial máximo do monitor eleitoral é 30 dias.");
      }
      const created = electionMonitor.createJob({
        state, municipality, query, intervalMs, initialDelayMs
      });
      return {
        ...created,
        id: typeof job.id === "string" && existingIds.has(job.id) ? job.id : created.id
      };
    });
    if (current.enabled && !jobs.length) {
      throw new Error("Cadastre ao menos uma consulta antes de salvar as configurações do monitor ativado.");
    }
    patch = { jobs };
  } else {
    throw new Error("Monitor inválido.");
  }

  const saved = helper.saveMonitorConfig(patch, target);
  const schedules = await helper.syncMonitorSchedules(saved, target);
  const expectedSchedules = setting === "monitorElection" ? saved.jobs.length : 1;
  if (saved.enabled && expectedSchedules > 0 && schedules.length !== expectedSchedules) {
    throw new Error("As configurações foram salvas, mas não foi possível atualizar todos os agendamentos do monitor.");
  }
  return saved;
}

async function setAdminSystemSetting(message, setting, enabled, level) {
  const config = { enabled };
  if (setting === "antilink") {
    antilinkHelper.getSetAntilink(message, level === "topic" ? "chat" : level, config);
  } else if (setting === "antimedia") {
    antimediaHelper.getSetAntimedia(message, level === "topic" ? "chat" : level, config);
  } else if (setting === "antipalavras") {
    antipalavrasHelper.getSetAntipalavras(message, level === "topic" ? "chat" : level, config);
  } else if (setting === "antiraid") {
    antiraidHelper.getSetAntiRaid(message, level === "topic" ? "chat" : level, config);
  } else if (setting === "blockcmd") {
    blockcmdHelper.getSetBlockcmd(message, level === "topic" ? "chat" : level, config);
  } else if (setting === "welcome" || setting === "goodbye") {
    const save = setting === "welcome" ? welcomeHelper.saveWelcomeConfig : welcomeHelper.saveGoodbyeConfig;
    save(message.platform, message.platform === "discord" ? message.raw.guild.id : null, message.platform === "discord" ? message.channelId : String(message.chatId), message.threadId, config);
  } else if (setting === "autoApprove") {
    const target = { platform: message.platform, chatId: String(message.chatId) };
    const current = autoAcceptHelper.getConfig(target);
    autoAcceptHelper.saveConfig(target, { ...current, enabled });
  } else if (setting === "autofigu") {
    autofiguHelper.setAutofiguEnabled(message, enabled);
  } else if (setting === "autodownload") {
    autodownloadHelper.setAutoDownloadForGroup(message, enabled);
  } else if (setting === "autoTranscribe") {
    autoTranscribeHelper.setAutoTranscribeSetting(message, level === "topic" ? "chat" : level, enabled);
  } else if (setting === "autoia") {
    const currentMode = autoiaHelper.getAutoIAMode(message);
    autoiaHelper.setAutoIAMode(message, enabled ? currentMode === "off" ? "mention" : currentMode : "off");
  } else if (setting === "autorepo") {
    const current = autorepoHelper.loadGroup(message);
    if (!autorepoHelper.saveGroup(message, { ...current, enabled })) {
      throw new Error("Não foi possível salvar a configuração de respostas automáticas.");
    }
  } else if (ADMIN_MONITOR_HELPERS[setting]) {
    const target = getAdminMonitorTarget(message);
    const helper = ADMIN_MONITOR_HELPERS[setting];
    const current = helper.loadMonitorConfig(target);
    if (enabled) {
      if (setting === "monitorWeather" && !current.city) {
        throw new Error("Configure uma cidade antes de ativar o monitor do clima.");
      }
      if (setting === "monitorRandomWeather" && !current.cities?.length) {
        throw new Error("Cadastre ao menos uma cidade antes de ativar a previsão aleatória.");
      }
      if (setting === "monitorElection" && !current.jobs?.length) {
        throw new Error("Cadastre ao menos uma consulta antes de ativar o monitor eleitoral.");
      }
    }
    const saved = helper.saveMonitorConfig({
      enabled,
      platform: target.platform,
      chatId: target.chatId,
      threadId: target.threadId
    }, target);
    const schedules = await helper.syncMonitorSchedules(saved, target);
    const expectedSchedules = setting === "monitorElection" ? saved.jobs.length : 1;
    if (enabled && expectedSchedules > 0 && schedules.length !== expectedSchedules) {
      throw new Error("O estado foi salvo, mas não foi possível atualizar os agendamentos do monitor.");
    }
  } else {
    throw new Error("Configuração administrativa inválida.");
  }
}

async function announceWhatsAppAdminSetting(groupId, actorId, setting) {
  const sock = global.whatsappSock;
  if (!sock?.user || typeof sock.groupMetadata !== "function" || typeof sock.sendMessage !== "function") {
    throw new Error("A conexão do WhatsApp não está disponível para avisar o grupo.");
  }
  const metadata = await sock.groupMetadata(String(groupId));
  const areJidsSameUser = baileysPkg.areJidsSameUser;
  const participant = (metadata.participants || []).find(candidate =>
    [candidate.id, candidate.lid, candidate.phoneNumber].filter(Boolean).some(id =>
      typeof areJidsSameUser === "function"
        ? areJidsSameUser(String(id), String(actorId))
        : sameUserId(id, actorId)
    )
  );
  if (!participant) throw new Error("Não foi possível localizar o administrador para mencioná-lo no grupo.");

  const mentionValue = String(participant.phoneNumber || participant.id || participant.lid || actorId);
  const mentionJid = mentionValue.includes("@") ? mentionValue : `${mentionValue}@s.whatsapp.net`;
  const mentionLabel = formatWhatsAppDisplayId(mentionJid);
  const definition = ADMIN_SYSTEM_SETTINGS.find(item => item.key === setting);
  if (!definition || !mentionLabel) throw new Error("Não foi possível preparar o aviso da alteração.");

  await sock.sendMessage(String(groupId), {
    text: `O administrador @${mentionLabel} alterou as configurações de ${definition.label} pelo dashboard.`,
    mentions: [mentionJid]
  });
}

async function announceAdminSystemSetting(platform, groupId, actorId, setting) {
  const definition = ADMIN_SYSTEM_SETTINGS.find(item => item.key === setting);
  if (!definition) throw new Error("Não foi possível identificar a função alterada.");
  if (platform === "telegram") {
    const bot = global.telegramBot;
    if (!bot?.telegram || typeof bot.telegram.sendMessage !== "function") {
      throw new Error("A conexão do Telegram não está disponível para avisar o grupo.");
    }
    const text = `<a href="tg://user?id=${encodeURIComponent(String(actorId))}">O administrador</a> alterou as configurações de ${definition.label} pelo dashboard.`;
    await bot.telegram.sendMessage(String(groupId), text, { parse_mode: "HTML" });
    return true;
  }
  if (platform === "discord") {
    const client = global.discordClient;
    if (!client?.isReady?.()) throw new Error("A conexão do Discord não está disponível para enviar logs.");
    const serverData = groupSettings.loadSettings("discord", String(groupId), "server");
    const channelId = String(serverData.settings?.logsChannelId || "");
    if (!channelId) return false;
    const guild = await client.guilds.fetch(String(groupId));
    const channel = await guild.channels.fetch(channelId);
    if (!channel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
      throw new Error("O canal de logs configurado não está mais disponível.");
    }
    await channel.send({
      content: `<@${String(actorId)}> alterou as configurações de ${definition.label} pelo dashboard.`,
      allowedMentions: { users: [String(actorId)] }
    });
    return true;
  }
  return false;
}

function isValidPlatformGroupId(groupId) {
  return typeof groupId === "string" &&
    /^-?[A-Za-z0-9][A-Za-z0-9._:-]{0,99}(?:@[A-Za-z0-9._-]{1,30})?$/.test(groupId);
}

function parseSatcoinAmount(value) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, cents = ""] = normalized.split(".");
  const amount = Number(whole) * 100 + Number(cents.padEnd(2, "0") || 0);
  return Number.isSafeInteger(amount) && amount >= economy.MIN_TRANSFER_AMOUNT
    ? amount
    : null;
}

function getLocalGroupMessage(platform, groupId, platformId) {
  return profileMessage(platform, groupId, platformId);
}

async function getLocalAccountData(central, platform, groupId) {
  if (!["discord", "telegram", "whatsapp"].includes(platform) || !isValidPlatformGroupId(groupId)) {
    throw new Error("Plataforma ou grupo inválido.");
  }
  const platformAccount = central.platformAccounts.find(account => account.platform === platform);
  if (!platformAccount?.platformId) throw new Error("Esta plataforma não está vinculada à sua Conta Central.");
  const platformId = String(platformAccount.platformId);
  if (!await isPlatformGroupMember(platform, groupId, platformId)) {
    throw new Error("A conta vinculada não participa mais deste grupo ou servidor.");
  }

  const message = getLocalGroupMessage(platform, groupId, platformId);
  const profileUrl = new URL("http://localhost/perfil");
  profileUrl.searchParams.set("plataforma", platform);
  profileUrl.searchParams.set("grupo", groupId);
  profileUrl.searchParams.set("usuario", platformId);
  const profile = await readProfile(profileUrl, { allowEmpty: true });
  const account = economy.getAccountByUser(message, platformId);
  const profits = account ? economy.getDailyProfits(message) : null;
  const today = economy.getLocalDate();
  const warnConfig = getWarnConfig(message);
  return {
    platform,
    groupId,
    platformId,
    canManage: await canManagePlatformGroup(platform, groupId, platformId),
    groupName: profile.groupName || `Grupo ${groupId}`,
    userName: profile.name || platformAccount.displayName || platformAccount.username || "Sua conta",
    avatarUrl: await getProfileAvatar(platform, groupId, platformId),
    warnings: getUserWarns(message, platformId),
    maxWarnings: warnConfig?.max || 3,
    account: account ? {
      balance: Number(account.balance) || 0,
      dailyClaimed: account.lastClaimDate === today,
      workCount: account.workDate === today ? Number(account.workCount) || 0 : 0,
      fishingCount: account.fishingDate === today ? Number(account.fishingCount) || 0 : 0,
      miningCount: account.miningDate === today ? Number(account.miningCount) || 0 : 0,
      casinoCount: account.casinoDate === today ? Number(account.casinoCount) || 0 : 0,
      robberyCount: account.robberyDate === today ? Number(account.robberyCount) || 0 : 0,
      transferCount: account.transferDate === today ? Number(account.transferCount) || 0 : 0,
      shieldCharges: Number(account.shieldCharges) || 0
    } : {
      balance: 0,
      dailyClaimed: false,
      workCount: 0,
      fishingCount: 0,
      miningCount: 0,
      casinoCount: 0,
      robberyCount: 0,
      transferCount: 0,
      shieldCharges: 0
    },
    dailyProfits: profits?.profits || null,
    dailyProfitTotal: profits?.total || 0,
    ranks: {
      balance: economy.getBalancePosition(message, platformId),
      xp: profile.xp.position,
      activity: profile.activity.position
    },
    localProfile: {
      xp: {
        available: profile.xp.exists || xp.load(message)?.enabled === true,
        value: profile.xp.value,
        level: profile.xp.level,
        position: profile.xp.position
      },
      activity: {
        available: profile.activity.enabled || profile.activity.total > 0,
        total: profile.activity.total,
        messages: profile.activity.messages,
        commands: profile.activity.commands,
        stickers: profile.activity.stickers,
        files: profile.activity.files,
        position: profile.activity.position
      },
      marriages: profile.marriages,
      september: (() => {
        const challenge = groupSettings.loadSettings(platform, groupId, "group")
          .settings?.setembroNofap;
        const participant = challenge?.participants?.[central.id];
        if (!challenge || challenge.enabled === false) return null;
        return {
          year: Number(challenge.year) || new Date().getFullYear(),
          participant: participant ? {
            active: participant.active !== false,
            currentDays: profile.nofap.currentDays,
            title: profile.nofap.title,
            recordDays: profile.nofap.recordDays,
            resetCount: Number(participant.resetCount) || 0
          } : null
        };
      })()
    }
  };
}

function renderLocalAccount(data) {
  const safeBotName = escapeHtml(config.getBotName());
  const groupType = data.platform === "discord" ? "Servidor" : "Grupo";
  const currency = amount => `${economy.formatMoney(Number(amount) || 0)} ${economy.SATCOIN_SYMBOL}`;
  const dailyLabels = [
    ["resgate", "Resgate diário"], ["trabalho", "Trabalho"], ["pesca", "Pesca"],
    ["mineracao", "Mineração"], ["cassino", "Cassino"], ["roubo", "Roubos feitos"],
    ["rouboSofrido", "Roubos sofridos"], ["transferenciaEnviada", "Transferido"],
    ["transferenciaRecebida", "Recebido"], ["loja", "Loja"]
  ];
  const dailyRows = data.dailyProfits
    ? dailyLabels.map(([key, label]) => `<div class="daily-row"><span>${label}</span><strong>${currency(data.dailyProfits[key])}</strong></div>`).join("")
    : `<p class="muted">Ainda não há registros de economia neste grupo.</p>`;
  const dailyClaimCommand = `${escapeHtml(config.getPrefix())}resgatar`;
  const activityLimits = [
    ["Trabalho", data.account.workCount, economy.MAX_WORKS_PER_DAY],
    ["Pesca", data.account.fishingCount, economy.MAX_WORKS_PER_DAY],
    ["Mineração", data.account.miningCount, economy.MAX_WORKS_PER_DAY],
    ["Cassino", data.account.casinoCount, economy.MAX_CASINO_PER_DAY],
    ["Roubo", data.account.robberyCount, economy.MAX_ROBBERIES_PER_DAY],
    ["Transferências", data.account.transferCount, economy.MAX_TRANSFERS_PER_DAY]
  ].map(([label, used, limit]) =>
    `<article class="local-stat activity-limit"><small>${label} hoje</small><strong>${used}/${limit}</strong><span>${used >= limit ? "Limite diário atingido" : `Restam ${limit - used} tentativa(s)`}</span></article>`
  ).join("");
  const dailyClaimCard = data.account.dailyClaimed
    ? `<article class="daily-claim claimed"><span class="daily-claim-icon" aria-hidden="true">✓</span><div><strong>Resgate diário já coletado</strong><small>Você já recebeu sua recompensa de hoje neste grupo.</small></div></article>`
    : `<article class="daily-claim available"><span class="daily-claim-icon" aria-hidden="true">✦</span><div><strong>Seu resgate diário está disponível</strong><small>Para resgatar, envie <code>${dailyClaimCommand}</code> neste ${groupType.toLowerCase()}. O bônus pode ser coletado uma vez por dia.</small></div></article>`;
  const accountStats = `<div class="local-stats">
        <article class="local-stat balance-stat"><small>Saldo local</small><strong>${currency(data.account.balance)}</strong><span>Escudos: ${data.account.shieldCharges}</span></article>
        ${activityLimits}
      </div>
      ${dailyClaimCard}
      <h2 class="subheading">Movimentações de hoje</h2><div class="daily-list">${dailyRows}</div>
      <div class="daily-total"><span>Lucro líquido total hoje</span><strong>${currency(data.dailyProfitTotal)}</strong></div>`;
  const rankLinks = [
    ["Riqueza", "/rankrico", data.ranks.balance],
    ["Experiência", "/rankxp", data.ranks.xp],
    ["Atividade", "/rankatividade", data.ranks.activity]
  ].map(([label, route, position]) =>
    `<a class="rank-link" href="${route}?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}" target="_blank" rel="noopener noreferrer"><span>${label}<small>Você: ${position ? `#${position}` : "sem posição"}</small></span><span aria-hidden="true">↗</span></a>`
  ).join("");
  const localProfileCards = [];
  if (data.localProfile.xp.available) {
    localProfileCards.push(`<article class="local-stat"><small>Experiência</small><strong>${Number(data.localProfile.xp.value).toLocaleString("pt-BR")} XP</strong><span>Nível ${data.localProfile.xp.level} · ${data.localProfile.xp.position ? `posição #${data.localProfile.xp.position}` : "sem posição"}</span></article>`);
  }
  if (data.localProfile.activity.available) {
    localProfileCards.push(`<article class="local-stat"><small>Atividade</small><strong>${Number(data.localProfile.activity.total).toLocaleString("pt-BR")} ações</strong><span>${Number(data.localProfile.activity.messages).toLocaleString("pt-BR")} mensagens · ${Number(data.localProfile.activity.commands).toLocaleString("pt-BR")} comandos · ${Number(data.localProfile.activity.stickers).toLocaleString("pt-BR")} figurinhas · ${Number(data.localProfile.activity.files).toLocaleString("pt-BR")} arquivos · ${data.localProfile.activity.position ? `posição #${data.localProfile.activity.position}` : "sem posição"}</span></article>`);
  }
  const marriageCards = data.localProfile.marriages.map(item => {
    const partner = item.selfMarriage ? "consigo mesmo(a)" : item.partnerName || "parceiro(a)";
    return `<article class="local-stat"><small>Casamento</small><strong>${escapeHtml(partner)}</strong><span>Há ${escapeHtml(item.duration)} · desde ${escapeHtml(new Date(item.marriedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }))}</span></article>`;
  });
  if (data.localProfile.september) {
    const participant = data.localProfile.september.participant;
    const status = !participant
      ? "Você ainda não entrou"
      : participant.active
        ? `${participant.currentDays} dias · ${participant.title}`
        : "Você saiu do desafio";
    const details = participant
      ? `Desafio ${data.localProfile.september.year} · Recorde: ${participant.recordDays} dias · Resets no grupo: ${participant.resetCount}`
      : `Desafio ${data.localProfile.september.year} · Use ${config.getPrefix()}setembro entrar no grupo para participar`;
    marriageCards.push(`<article class="local-stat"><small>Setembro · desafio deste grupo</small><strong>${escapeHtml(status)}</strong><span>${escapeHtml(details)}</span></article>`);
  }
  const localProfileSection = localProfileCards.length || marriageCards.length
    ? `<section class="local-panel"><h2>Seu perfil neste grupo</h2><p class="muted">Dados locais de experiência e atividade${marriageCards.length ? ", além dos recursos pessoais disponíveis" : ""}.</p><div class="local-stats">${localProfileCards.join("")}${marriageCards.join("")}</div></section>`
    : "";

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escapeHtml(data.groupName)} · ${safeBotName}</title><style>
    ${homeStyles()}
    .local-page{width:min(1040px,100%);margin:0 auto;padding:30px 0 54px}
    .local-topbar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding-bottom:20px;border-bottom:1px solid var(--line)}
    .local-topbar a{color:#b9c6ff;text-decoration:none;font-weight:700}
    .local-hero{display:flex;align-items:center;gap:20px;margin:26px 0;padding:26px;border:1px solid #6378c444;border-radius:22px;background:linear-gradient(115deg,#202a46,#302654)}
    .local-hero-main{display:flex;align-items:center;gap:20px;min-width:0}
    .local-hero-actions{display:flex;flex:none;align-items:center}
    .admin-panel-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:10px 15px;border:1px solid #a99dff66;border-radius:12px;background:linear-gradient(120deg,#8877ff35,#577cff28);color:#e2deff;font-size:13px;font-weight:750;text-decoration:none;box-shadow:0 8px 22px #635bff1a;transition:transform .16s ease,border-color .16s ease,background .16s ease}
    .admin-panel-button:hover,.admin-panel-button:focus-visible{transform:translateY(-2px);border-color:#b8adff;background:linear-gradient(120deg,#8877ff50,#577cff40);outline:2px solid #a99dff55;outline-offset:2px}
    .local-avatar{width:82px;height:82px;flex:none;border:3px solid #a99dff66;border-radius:24px;object-fit:cover;background:#171d2b}
    .local-hero h1{margin:0;font-size:clamp(25px,4vw,38px);overflow-wrap:anywhere}
    .local-hero p{margin:7px 0 0;color:#c1c9df}
    .local-section{margin-top:24px}
    .local-section-heading{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:0 0 12px}
    .local-section-heading h2{margin:0;font-size:20px}
    .local-section-heading p{margin:5px 0 0;color:var(--muted);font-size:12px}
    .local-layout{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:16px}
    .local-column{display:grid;align-content:start;gap:16px;min-width:0}
    .local-functions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:16px}
    .local-panel{padding:22px;border:1px solid var(--line);border-radius:18px;background:linear-gradient(145deg,#171d2b,#131925)}
    .local-panel h2{margin:0;font-size:18px}
    .local-panel .muted{color:var(--muted);font-size:13px;line-height:1.6}
    .local-actions{display:grid;gap:12px;margin-top:16px}
    .local-actions form{display:grid;gap:9px}
    .local-actions label{color:#cbd3e5;font-size:12px;font-weight:700}
    .local-actions input{width:100%;min-height:44px;border:1px solid #39445d;border-radius:11px;background:#0e1422;color:#fff;padding:10px 12px;font:inherit}
    .local-actions button{min-height:42px;border:0;border-radius:11px;background:linear-gradient(120deg,#8877ff,#577cff);color:#fff;font:inherit;font-weight:700;cursor:pointer}
    .local-actions button:disabled{opacity:.6;cursor:wait}
    .local-feedback{min-height:20px;margin:4px 0 0;color:#9cf0cf;font-size:13px;line-height:1.5}
    .local-feedback.error{color:#ff9caa}
    .warning-count{display:flex;align-items:center;justify-content:space-between;margin-top:16px;padding:18px;border:1px solid #f6c46a33;border-radius:14px;background:#f6c46a0d}
    .warning-count strong{font-size:27px;color:#ffd37f}
    .rank-links{display:flex;flex-wrap:wrap;gap:9px;margin-top:16px}
    .rank-link{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:#ffffff05;color:#e8ebf5;text-decoration:none;font-weight:700;font-size:13px}
    .rank-link small{display:block;margin-top:4px;color:var(--muted);font-size:10px;font-weight:500}
    .rank-link:hover{border-color:#8599ff88;background:#8599ff12}
    .rank-link span{color:#a99dff}
    .local-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:16px}
    .local-stat{display:flex;min-height:92px;flex-direction:column;justify-content:center;gap:5px;padding:13px;border:1px solid #ffffff0c;border-radius:12px;background:#ffffff05}
    .local-stat small,.local-stat span{color:var(--muted);font-size:11px}
    .local-stat strong{font-size:17px;overflow-wrap:anywhere}
    .activity-limit{min-height:78px}
    .balance-stat strong{font-size:20px}
    .daily-claim{display:flex;align-items:center;gap:12px;margin-top:14px;padding:14px;border:1px solid;border-radius:13px}
    .daily-claim.available{border-color:#58d6a355;background:#58d6a30d}
    .daily-claim.claimed{border-color:#f6c46a44;background:#f6c46a0b}
    .daily-claim-icon{display:grid;width:34px;height:34px;flex:none;place-items:center;border-radius:11px;background:#58d6a320;color:#9cf0cf;font-weight:800}
    .daily-claim.claimed .daily-claim-icon{background:#f6c46a20;color:#ffd37f}
    .daily-claim strong,.daily-claim small{display:block}
    .daily-claim strong{font-size:13px}
    .daily-claim small{margin-top:4px;color:var(--muted);font-size:11px;line-height:1.5}
    .subheading{margin:20px 0 8px;font-size:14px}
    .daily-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:18px;margin-top:8px}
    .daily-row{display:flex;justify-content:space-between;gap:14px;padding:9px 0;border-bottom:1px solid #ffffff0c;color:#bac4d8;font-size:12px}
    .daily-row strong{color:#f1f3fa;text-align:right}
    .daily-total{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:10px;padding:12px 13px;border:1px solid #8b7bff44;border-radius:11px;background:#8877ff12;font-size:12px;font-weight:700}
    .daily-total strong{color:#c6bdff;text-align:right}
    .local-footer{margin-top:20px;color:#71809d;font-size:12px}
    @media(max-width:760px){.local-layout,.local-functions{grid-template-columns:1fr}}
    @media(max-width:640px){.local-hero{align-items:flex-start;flex-direction:column}.local-hero-main{align-items:flex-start}.local-hero-actions{width:100%}.admin-panel-button{width:100%}}
    @media(max-width:480px){.local-page{padding:20px 0 38px}.local-hero{padding:20px}.local-avatar{width:62px;height:62px;border-radius:18px}.local-panel{padding:18px}.local-stats{grid-template-columns:1fr}.daily-list{grid-template-columns:1fr}}
  </style></head><body><main class="local-page">
    <nav class="local-topbar"><a href="/dashboard">← Conta Central</a><span>${safeBotName} · Painel local</span></nav>
    <header class="local-hero"><div class="local-hero-main"><img class="local-avatar" src="${escapeHtml(data.avatarUrl || "/semfoto.jpg")}" alt="Foto de perfil de ${escapeHtml(data.userName)}" onerror="this.onerror=null;this.src='/semfoto.jpg'"><div><div class="eyebrow">Painel da conta local</div><h1>${escapeHtml(data.userName)}</h1><p>${groupType}: ${escapeHtml(data.groupName)} · ${escapeHtml(data.platform)}</p></div></div>${data.canManage ? `<div class="local-hero-actions"><a class="admin-panel-button" href="/painel-admin?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}">⚙ Painel de administração</a></div>` : ""}</header>
    <section class="local-section" aria-labelledby="displaySectionTitle">
      <header class="local-section-heading"><div><h2 id="displaySectionTitle">Exibição</h2><p>Consulte seus dados e posições neste grupo ou servidor.</p></div></header>
      <div class="local-layout">
        <div class="local-column">
          <section class="local-panel"><h2>Minhas advertências</h2><p class="muted">Advertências registradas para sua conta neste grupo ou servidor.</p><div class="warning-count"><span>Advertências atuais<br><small>máximo configurado: ${data.maxWarnings}</small></span><strong>${data.warnings}</strong></div></section>
          <section class="local-panel"><h2>Rankings públicos</h2><p class="muted">Abra os rankings deste grupo ou servidor em uma nova aba.</p><div class="rank-links">${rankLinks}</div></section>
          ${localProfileSection}
        </div>
        <div class="local-column">
          <section class="local-panel"><h2>Minha economia local</h2><p class="muted">Saldo, ações e movimentações vinculadas somente a este grupo ou servidor.</p>${accountStats}</section>
        </div>
      </div>
    </section>
    <section class="local-section" aria-labelledby="functionsSectionTitle">
      <header class="local-section-heading"><div><h2 id="functionsSectionTitle">Funções</h2><p>Ações disponíveis para sua conta neste grupo ou servidor.</p></div></header>
      <div class="local-functions">
        <section class="local-panel"><h2>Unir Conta Central</h2><p class="muted">Insira o código gerado pela outra conta. A Conta Central atual será mantida como principal.</p><div class="local-actions"><form id="joinCentralForm"><label for="mergeCode">Código de união</label><input id="mergeCode" name="code" maxlength="8" autocomplete="one-time-code" required><button type="submit">Unir contas</button></form><p class="local-feedback" id="joinFeedback" role="status"></p></div></section>
        <section class="local-panel"><h2>Transferir SatCoins</h2><p class="muted">A transferência acontece nesta economia local. Informe o ID exato de alguém que já tenha uma conta de economia aqui. O bot mantém os limites e as regras de transferência.</p><div class="local-actions"><form id="transferForm"><label for="recipientId">ID do destinatário</label><input id="recipientId" name="recipientId" maxlength="100" autocomplete="off" required><label for="transferAmount">Quantidade (mínimo: 10.00)</label><input id="transferAmount" name="amount" type="text" inputmode="decimal" placeholder="10.00" autocomplete="off" required><button type="submit">Revisar transferência</button></form><p class="local-feedback" id="transferFeedback" role="status"></p></div></section>
      </div>
    </section>
    <p class="local-footer">Os dados e ações são locais a esta plataforma e a este ${groupType.toLowerCase()}.</p>
  </main><script>
    const localContext=${JSON.stringify({ platform: data.platform, groupId: data.groupId })};
    async function submitLocalAction(endpoint,payload){
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...localContext,...payload})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Não foi possível concluir a ação.");
      return result;
    }
    function feedback(id,message,isError){
      const element=document.getElementById(id);element.textContent=message;element.classList.toggle("error",Boolean(isError));
    }
    document.getElementById("joinCentralForm").addEventListener("submit",async event=>{
      event.preventDefault();const button=event.currentTarget.querySelector("button");button.disabled=true;feedback("joinFeedback","",false);
      try{const result=await submitLocalAction("/api/account/local/merge",{code:document.getElementById("mergeCode").value.trim().toUpperCase()});feedback("joinFeedback","Contas unidas. Conta Central: "+result.centralId,false);event.currentTarget.reset();}
      catch(error){feedback("joinFeedback",error.message,true)}finally{button.disabled=false}
    });
    document.getElementById("transferForm").addEventListener("submit",async event=>{
      event.preventDefault();const form=event.currentTarget,button=form.querySelector("button"),recipientId=document.getElementById("recipientId").value.trim(),amount=document.getElementById("transferAmount").value.trim();
      const normalizedAmount=amount.replace(",",".");
      if(!/^\\d+(?:\\.\\d{1,2})?$/.test(normalizedAmount)||Number(normalizedAmount)<10){feedback("transferFeedback","Informe um valor válido de pelo menos 10.00 SatCoins.",true);return}
      if(!window.confirm("Confirmar transferência de "+normalizedAmount+" SatCoins para o ID "+recipientId+"?"))return;
      button.disabled=true;feedback("transferFeedback","",false);
      try{const result=await submitLocalAction("/api/account/local/transfer",{recipientId,amount});feedback("transferFeedback","Transferência concluída. Valor: "+result.amount+" · Saldo restante: "+result.balance,false);form.reset();}
      catch(error){feedback("transferFeedback",error.message,true)}finally{button.disabled=false}
    });
  </script></body></html>`;
}

function renderGroupAdmin(data) {
  const groupType = data.platform === "discord" ? "Servidor" : "Grupo";
  const warningRows = data.moderation.entries.map(item =>
    `<li><div class="warning-identity"><strong>${escapeHtml(item.name || item.userId)}</strong><small>ID: ${escapeHtml(item.userId)}</small></div><strong class="warning-count">${item.count}/${data.moderation.max}</strong><details class="warning-history"><summary>Motivos das advertências (${item.count})</summary><ul>${item.legacyCount ? `<li>${item.legacyCount} advertência(s) antiga(s) sem motivo registrado</li>` : ""}${(item.records || []).map(record => `<li>${escapeHtml(record.reason || "Motivo não informado")}<small>${escapeHtml(formatWarningDate(record.createdAt))}</small></li>`).join("")}</ul></details><button type="button" class="moderation-action danger" data-warning-user="${escapeHtml(item.userId)}">Remover advertências</button></li>`
  ).join("");
  const rootLevel = data.platform === "whatsapp" ? "chat" : "server";
  const settingDefinitions = getAdminSystemDefinitions(data.platform, rootLevel);
  const immediateActionDefinitions = {
    discord: [["kick", "Expulsar", true], ["ban", "Banir", true], ["mute", "Silenciar temporariamente", true], ["unmute", "Remover silêncio", true], ["unban", "Desbanir", true]],
    telegram: [["kick", "Expulsar", true], ["ban", "Banir", true], ["mute", "Silenciar temporariamente", true], ["unmute", "Remover silêncio", true], ["unban", "Desbanir", true]],
    whatsapp: [["kick", "Remover do grupo", true]]
  }[data.platform];
  const antiraidActionOptions = data.platform === "whatsapp"
    ? '<option value="remove">Remover membro</option>'
    : data.platform === "discord"
      ? '<option value="timeout">Silenciar temporariamente</option><option value="kick">Expulsar</option><option value="ban">Banir</option>'
      : '<option value="mute">Silenciar</option><option value="kick">Expulsar</option><option value="ban">Banir</option>';
  const roleListFields = data.platform === "discord"
    ? '<label>Cargos isentos<textarea name="roleWhitelist" rows="4" placeholder="um ID de cargo por linha"></textarea></label><label>Cargos monitorados<textarea name="roleBlacklist" rows="4" placeholder="um ID de cargo por linha"></textarea></label>'
    : "";
  const getScopeLabel = (scope, categoryName = "", channelName = "", topicName = "") => {
    if (data.platform === "whatsapp" && scope.level === "server") return `Comunidade · ${data.groupName}`;
    if (data.platform === "whatsapp") return `Grupo · ${data.groupName}`;
    if (scope.level === "server") return `${data.platform === "discord" ? "Servidor" : "Grupo"} · ${data.groupName}`;
    if (scope.level === "categoria") return `Categoria · ${categoryName || "selecionada"}`;
    if (scope.level === "chat") return `Chat · ${channelName || "selecionado"}`;
    if (scope.level === "topic") return `Tópico · ${topicName || "selecionado"}`;
    return "Grupo";
  };
  const renderSettingCards = (definitions, settings, scope, scopeLabel) => {
    let previousSettingCategory = "";
    return definitions.map(setting => {
      const enabled = settings[setting.key] === true;
      const categoryHeading = setting.category && setting.category !== previousSettingCategory
        ? `<h3 class="setting-category" style="margin:12px 0 0;color:#b9c6ff;font-size:14px">${escapeHtml(setting.category)}</h3>`
        : "";
      previousSettingCategory = setting.category || previousSettingCategory;
      const configurableSettings = ["antilink", "antimedia", "antipalavras", "antiraid", "blockcmd", "welcome", "goodbye", "autorepo", "autodownload", "autoApprove"];
      const isMonitor = Object.prototype.hasOwnProperty.call(ADMIN_MONITOR_HELPERS, setting.key);
      const configButton = configurableSettings.includes(setting.key)
        ? `<button type="button" class="setting-icon-button" data-${setting.key.toLowerCase()}-config data-scope="${escapeHtml(JSON.stringify(scope))}" aria-label="Configurar ${setting.key} neste escopo" title="Configurações do ${setting.key}">${ADMIN_SETTINGS_GEAR_ICON}</button>`
        : ["economy", "xp", "activity"].includes(setting.key)
          ? `<button type="button" class="setting-icon-button" data-rp-config="${setting.key}" data-scope="${escapeHtml(JSON.stringify(scope))}" aria-label="Gerenciar ${setting.label}" title="Gerenciar ${setting.label}">${ADMIN_SETTINGS_GEAR_ICON}</button>${setting.key === "economy" ? `<button type="button" class="setting-icon-button setting-store2-button" data-store2-config><span aria-hidden="true">${ADMIN_SETTINGS_GEAR_ICON}</span><span>Configurar Loja 2</span></button>` : ""}`
        : setting.key === "agendar"
          ? `<button type="button" class="setting-icon-button" data-schedule-config data-scope="${escapeHtml(JSON.stringify(scope))}" aria-label="Gerenciar agendamentos neste escopo" title="Gerenciar agendamentos">${ADMIN_SETTINGS_GEAR_ICON}</button>`
        : isMonitor
          ? `<button type="button" class="setting-icon-button" data-monitor-config data-monitor-setting="${setting.key}" data-scope="${escapeHtml(JSON.stringify(scope))}" aria-label="Configurar ${setting.label} neste escopo" title="Configurações do ${setting.label}">${ADMIN_SETTINGS_GEAR_ICON}</button>`
          : "";
      const controls = setting.key === "agendar"
        ? `<span class="state ${enabled ? "on" : "off"}" data-state="${setting.key}">${enabled ? "Ativo" : "Sem agendamentos ativos"}</span>${configButton}`
        : `<span class="state ${enabled ? "on" : "off"}" data-state="${setting.key}">${enabled ? "Ativado" : "Desativado"}</span><button type="button" data-setting="${setting.key}" data-enabled="${enabled ? "true" : "false"}" data-scope="${escapeHtml(JSON.stringify(scope))}">${enabled ? "Desativar" : "Ativar"}</button>${configButton}`;
      return `${categoryHeading}<article class="setting-card"><div class="setting-info"><span class="setting-scope">${escapeHtml(scopeLabel)}</span><h2>${escapeHtml(setting.label)}</h2><p>${escapeHtml(setting.description)}</p></div><div class="setting-controls">${controls}</div></article>`;
    }).join("");
  };
  const rootScope = { level: rootLevel };
  const settingCards = renderSettingCards(settingDefinitions, data.settings, rootScope, getScopeLabel(rootScope));
  const welcomeGoodbyeDialogs = ["welcome", "goodbye"].map(setting => {
    const label = setting === "welcome" ? "boas-vindas" : "despedida";
    return `<dialog class="antilink-dialog welcome-dialog" id="${setting}Dialog" aria-labelledby="${setting}DialogTitle"><form id="${setting}Form"><header class="antilink-dialog-heading"><div><h2 id="${setting}DialogTitle">Configurações de ${label}</h2><p id="${setting}ScopeLabel"></p></div><button type="button" class="dialog-close" data-close-${setting} aria-label="Fechar">×</button></header><div class="antilink-form-grid"><label>Formato da mensagem<select name="mode"><option value="texto">Somente texto</option><option value="media">Mídia com legenda</option></select></label><label>Mensagem<textarea name="text" maxlength="2000" rows="5" required></textarea><small>Variáveis disponíveis: {user}, {mention}, {group}, {server}, {count} e {members}.</small></label></div><section class="welcome-media-section"><strong>Mídia</strong><p id="${setting}MediaStatus">Nenhuma mídia configurada.</p><label>Enviar imagem ou vídeo (JPEG, PNG, WebP, GIF ou MP4; até 8 MB)<input type="file" name="mediaFile" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4"></label><div class="antilink-dialog-actions"><button type="button" data-upload-${setting}>Enviar mídia</button><button type="button" data-remove-${setting} hidden>Remover mídia</button></div></section><p class="antilink-form-feedback" id="${setting}FormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-${setting}>Cancelar</button><button type="submit" class="primary">Salvar configurações</button></footer></form></dialog>`;
  }).join("");
  const autorespostaDialog = `<dialog class="antilink-dialog autoresposta-dialog" id="autorepoDialog" aria-labelledby="autorepoDialogTitle"><form id="autorepoForm"><header class="antilink-dialog-heading"><div><h2 id="autorepoDialogTitle">Respostas automáticas</h2><p id="autorepoScopeLabel"></p></div><button type="button" class="dialog-close" data-close-autorepo aria-label="Fechar">×</button></header><label class="autorepo-global-toggle"><input type="checkbox" name="useGlobal"><span><strong>Usar respostas oficiais globais</strong><small><span id="autorepoGlobalCount">0</span> resposta(s) disponível(is), mantidas pelos administradores do bot.</small></span></label><section class="autorepo-responses"><div class="autorepo-section-heading"><div><h3>Respostas deste grupo</h3><p>Gatilhos locais são usados antes das respostas globais.</p></div><button type="button" id="addAutoresposta">Adicionar resposta</button></div><div id="autorepoResponseList" class="autorepo-response-list"></div></section><p class="antilink-form-feedback" id="autorepoFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-autorepo>Cancelar</button><button type="submit" class="primary">Salvar respostas</button></footer></form></dialog>`;
  const autodownloadDialog = `<dialog class="antilink-dialog welcome-dialog" id="autodownloadDialog" aria-labelledby="autodownloadDialogTitle"><form id="autodownloadForm"><header class="antilink-dialog-heading"><div><h2 id="autodownloadDialogTitle">Configurações do download automático</h2><p id="autodownloadScopeLabel"></p></div><button type="button" class="dialog-close" data-close-autodownload aria-label="Fechar">×</button></header><label class="autorepo-global-toggle"><input type="checkbox" name="deletelink"><span><strong>Excluir a mensagem com o link original</strong><small>Depois que o bot enviar a mídia baixada, remove do chat a mensagem que contém o link.</small></span></label><p class="antilink-form-feedback" id="autodownloadFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-autodownload>Cancelar</button><button type="submit" class="primary">Salvar configurações</button></footer></form></dialog>`;
  const autoApproveDialog = `<dialog class="antilink-dialog welcome-dialog" id="autoApproveDialog" aria-labelledby="autoApproveDialogTitle"><form id="autoApproveForm"><header class="antilink-dialog-heading"><div><h2 id="autoApproveDialogTitle">Configurações da autoaprovação</h2><p id="autoApproveScopeLabel"></p></div><button type="button" class="dialog-close" data-close-autoApprove aria-label="Fechar">×</button></header><label>Intervalo entre aprovações (segundos)<input name="intervalSeconds" type="number" min="0" max="86400" step="1" required></label><label>Nomes bloqueados<textarea name="blockedNames" rows="3" placeholder="um texto por linha"></textarea></label><label>Símbolos bloqueados<textarea name="blockedSymbols" rows="3" placeholder="um símbolo por linha"></textarea></label><label>Horários permitidos (HH:MM-HH:MM, uma faixa por linha)<textarea name="schedules" rows="3" placeholder="08:00-18:00"></textarea><small>Sem faixas, a autoaprovação pode ocorrer a qualquer horário local.</small></label><p class="antilink-form-feedback" id="autoApproveFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-autoApprove>Cancelar</button><button type="submit" class="primary">Salvar configurações</button></footer></form></dialog>`;
  const rpManagerDialog = `<dialog class="antilink-dialog rp-manager-dialog" id="rpManagerDialog" aria-labelledby="rpManagerTitle"><header class="antilink-dialog-heading"><div><h2 id="rpManagerTitle">Gerenciar sistema</h2><p id="rpManagerScopeLabel"></p></div><button type="button" class="dialog-close" data-close-rp-manager aria-label="Fechar">×</button></header><section id="rpXpSettings" class="rp-xp-settings" hidden><h3>Mensagens de level-up</h3><label class="autorepo-global-toggle"><input id="rpXpMuted" type="checkbox"><span><strong>Silenciar avisos de level-up</strong><small>O ganho de XP continua ativo; somente os avisos serão silenciados.</small></span></label><label><span id="rpXpDestinationLabel">Canal para mensagens de level-up</span><select id="rpXpDestination"><option value="">Canal onde o XP foi ganho</option></select><small id="rpXpDestinationHint">Deixe o destino padrão para avisar onde o XP foi ganho.</small></label><button type="button" id="saveRpXpSettings">Salvar configurações de XP</button></section><div class="rp-manager-toolbar"><button type="button" id="resetRpSystem" class="moderation-action danger">Resetar sistema</button></div><form id="rpSearchForm" class="moderation-search"><input id="rpSearch" type="search" maxlength="100" autocomplete="off" placeholder="Buscar por nome, username ou ID"><button type="submit">Buscar</button></form><p class="moderation-help" id="rpManagerDescription"></p><div id="rpManagerUsers" class="rp-manager-users" aria-live="polite"></div><p class="antilink-form-feedback" id="rpManagerFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-rp-manager>Fechar</button></footer></dialog>`;
  const store2Dialog = `<dialog class="antilink-dialog store2-dialog" id="store2Dialog" aria-labelledby="store2Title"><header class="antilink-dialog-heading"><div><h2 id="store2Title">Loja 2</h2><p id="store2ScopeLabel">Catálogo e pedidos deste grupo ou servidor.</p></div><button type="button" class="dialog-close" data-close-store2 aria-label="Fechar">×</button></header><form id="store2DetailsForm"><label>Título da loja<input name="title" maxlength="120" required></label><label>Aviso<textarea name="notice" maxlength="1000" rows="3" required></textarea></label><div class="antilink-dialog-actions"><button type="submit" class="primary">Salvar título e aviso</button></div></form><section><h3>Itens do catálogo</h3><form id="store2ItemForm"><input name="id" type="hidden"><label>Nome<input name="name" maxlength="120" required></label><div class="antilink-form-grid"><label>Preço em SatCoins<input name="price" type="text" inputmode="decimal" placeholder="250,00" required></label><label>Categoria<input name="category" maxlength="80" required></label></div><label>Quantidade (ou “infinito”)<input name="quantity" type="text" inputmode="numeric" placeholder="5 ou infinito" required></label><div class="antilink-dialog-actions"><button type="submit" class="primary" id="store2ItemSubmit">Adicionar item</button><button type="button" id="store2ItemCancel" hidden>Cancelar edição</button></div></form><div id="store2Items" class="store2-list" aria-live="polite"></div></section><section><h3>Pedidos pendentes</h3><div id="store2Orders" class="store2-list" aria-live="polite"></div></section><p class="antilink-form-feedback" id="store2Feedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-store2>Fechar</button></footer></dialog>`;
  const monitorDialog = `<dialog class="antilink-dialog monitor-dialog" id="monitorDialog" aria-labelledby="monitorDialogTitle"><form id="monitorForm"><header class="antilink-dialog-heading"><div><h2 id="monitorDialogTitle">Configurações do monitor</h2><p id="monitorScopeLabel"></p></div><button type="button" class="dialog-close" data-close-monitor aria-label="Fechar">×</button></header><div id="monitorFormFields" class="monitor-form-fields"></div><p class="antilink-form-feedback" id="monitorFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-monitor>Cancelar</button><button type="submit" class="primary">Salvar configurações</button></footer></form></dialog>`;
  const schedulesDialog = `<dialog class="antilink-dialog schedules-dialog" id="schedulesDialog" aria-labelledby="schedulesDialogTitle"><header class="antilink-dialog-heading"><div><h2 id="schedulesDialogTitle">Agendamentos</h2><p id="schedulesScopeLabel"></p></div><button type="button" class="dialog-close" data-close-schedules aria-label="Fechar">×</button></header><p class="monitor-field-caption">Gerencie mensagens automáticas para este chat ou tópico. Os horários seguem o fuso horário local do computador que executa o bot.</p><div id="scheduleList" class="schedule-list"></div><button type="button" id="addSchedule" class="schedule-add">Criar agendamento</button><form id="scheduleForm" hidden style="display:none"><input type="hidden" name="id"><div class="antilink-form-grid"><label>Nome<input name="name" type="text" maxlength="100" required></label><label>Gatilho<select name="triggerType"><option value="fixed">Horários fixos</option><option value="interval">Intervalo</option></select></label></div><div id="scheduleFixedFields"><label>Horários (HH:MM, separados por vírgula)<input name="times" type="text" placeholder="07:00, 12:00, 20:00"></label></div><div id="scheduleIntervalFields" hidden><label>Intervalo (por exemplo, 30m, 2h ou 1d2h)<input name="interval" type="text" placeholder="1h"></label></div><div class="antilink-form-grid"><label>Repetição<select name="repeatMode"><option value="once">Uma vez</option><option value="daily">Diariamente</option><option value="weekly">Semanalmente</option><option value="monthly">Mensalmente</option></select></label><label id="scheduleMonthDayField" hidden>Dia do mês<input name="monthDay" type="number" min="1" max="31"></label></div><fieldset class="antilink-options" id="scheduleWeekdayFields" hidden style="display:none"><legend>Dias da semana</legend><div class="monitor-check-list">${[["0","Domingo"],["1","Segunda"],["2","Terça"],["3","Quarta"],["4","Quinta"],["5","Sexta"],["6","Sábado"]].map(([day,label])=>`<label><input type="checkbox" name="days" value="${day}">${label}</label>`).join("")}</div></fieldset><label>Tipo de mensagem<select name="messageMode"><option value="text">Texto</option><option value="media">Mídia com legenda</option></select></label><label>Texto / legenda<textarea name="text" maxlength="4000" rows="4"></textarea></label><section class="schedule-media"><strong>Mídia: </strong><span id="scheduleMediaStatus">Nenhuma mídia configurada.</span><p class="monitor-field-caption">O upload é salvo imediatamente; os demais campos só são salvos pelo botão abaixo.</p><label>Enviar imagem ou vídeo (JPEG, PNG, WebP, GIF ou MP4; até 8 MB)<input type="file" name="mediaFile" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4"></label><div class="antilink-dialog-actions"><button type="button" id="uploadScheduleMedia">Enviar mídia</button><button type="button" id="removeScheduleMedia" hidden>Remover mídia</button></div></section><p class="antilink-form-feedback" id="scheduleFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" id="cancelScheduleEdit">Cancelar</button><button type="submit" class="primary">Salvar agendamento</button></footer></form></dialog>`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Painel de administração · ${escapeHtml(data.groupName)}</title><style>
    :root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb;--line:#334366;--muted:#9da8bd}*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:24px;background:radial-gradient(circle at top,#27365d 0,#10131c 48%,#090b10 100%)}button,a{font:inherit}.admin-page{width:min(1000px,100%);margin:0 auto}.topbar{display:flex;justify-content:space-between;gap:12px;padding:8px 0 20px;border-bottom:1px solid var(--line)}.topbar a{color:#b9c6ff;text-decoration:none;font-weight:700}.hero{display:flex;align-items:center;gap:18px;margin:28px 0 20px;padding:24px;border:1px solid var(--line);border-radius:18px;background:linear-gradient(145deg,#1c2438,#131925)}.avatar{width:68px;height:68px;flex:none;border-radius:18px;object-fit:cover}.eyebrow{color:#b9c6ff;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}h1{margin:6px 0;font-size:clamp(24px,4vw,34px)}.hero p,.intro,.setting-card p{color:var(--muted);line-height:1.55}.hero p{margin:0}.intro{margin:0 0 16px}.overview-nav{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 24px}.overview-nav a{padding:9px 13px;border:1px solid var(--line);border-radius:10px;background:#ffffff08;color:#dce2f3;text-decoration:none;font-size:12px;font-weight:700}.overview-nav a:hover{border-color:#9b8cff;background:#8b7bff20}.overview-section{scroll-margin-top:18px;margin:24px 0}.section-title{margin:0 0 5px;font-size:20px}.section-intro{margin:0 0 14px;color:var(--muted);font-size:13px;line-height:1.5}.overview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.overview-card{min-width:0;padding:18px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,#171d2b,#131925)}.overview-card h2{margin:0;font-size:15px}.card-heading{display:flex;justify-content:space-between;align-items:center;gap:10px}.permission-count{color:#b9c6ff;font-size:11px;font-weight:800}.permission-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 14px;margin:14px 0 0;padding:0;list-style:none}.permission-list li{display:flex;align-items:center;gap:7px;color:#aab5cb;font-size:11px}.permission-list li span{display:grid;width:17px;height:17px;flex:none;place-items:center;border-radius:6px;font-size:11px;font-weight:800}.permission-list .allowed span{background:#58d6a320;color:#9cf0cf}.permission-list .restricted span{background:#f6c46a18;color:#ffd37f}.card-note{margin:12px 0 0;color:#8e9bb4;font-size:11px;line-height:1.5}.connection-card{display:flex;align-items:center;gap:12px;margin-bottom:12px;padding:14px 16px;border:1px solid #58d6a344;border-radius:14px;background:#58d6a30b}.connection-dot{width:9px;height:9px;flex:none;border-radius:50%;background:#58d6a3;box-shadow:0 0 12px #58d6a377}.connection-card strong,.connection-card small{display:block}.connection-card strong{font-size:13px}.connection-card small{margin-top:3px;color:var(--muted);font-size:11px}.resource-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.resource-card{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:6px 9px;padding:13px;border:1px solid var(--line);border-radius:13px;background:#ffffff05}.resource-card strong{grid-column:2;color:#ffd37f;font-size:11px}.resource-card:has(.resource-indicator.active) strong{color:#9cf0cf}.resource-indicator{width:8px;height:8px;border-radius:50%;background:#7c879d}.resource-indicator.active{background:#58d6a3;box-shadow:0 0 10px #58d6a377}.alert-list{display:grid;gap:9px}.alert-card,.info-card,.success-card{display:flex;align-items:flex-start;gap:11px;padding:13px 15px;border:1px solid;border-radius:13px}.alert-card{border-color:#f6c46a44;background:#f6c46a0b}.info-card{border-color:#6f9dff3d;background:#6f9dff0b}.success-card{border-color:#58d6a344;background:#58d6a30b}.alert-icon{display:grid;width:23px;height:23px;flex:none;place-items:center;border-radius:8px;background:#ffffff0a;font-weight:800}.alert-card .alert-icon{color:#ffd37f}.info-card .alert-icon{color:#9bbaff}.success-card .alert-icon{color:#9cf0cf}.alert-card strong,.info-card strong,.success-card strong{font-size:12px}.alert-card p,.info-card p,.success-card p{margin:4px 0 0;color:var(--muted);font-size:11px;line-height:1.5}.shortcut-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.shortcut-card{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;border:1px solid var(--line);border-radius:12px;background:#ffffff05}.shortcut-card strong,.shortcut-card code{display:block}.shortcut-card strong{font-size:12px}.shortcut-card code{margin-top:5px;color:#b9c6ff;font-size:10px;overflow-wrap:anywhere}.copy-command{flex:none;padding:8px 10px;border:1px solid #7582a344;border-radius:9px;background:#ffffff08;color:#dce2f3;font-size:10px;font-weight:700;cursor:pointer}.copy-command:hover{border-color:#9b8cff;background:#8b7bff20}.overview-feedback{min-height:18px;margin:8px 0 0;color:#9cf0cf;font-size:11px}.settings{display:grid;gap:12px}.setting-card{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:20px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,#171d2b,#131925)}.setting-card h2{margin:0;font-size:16px}.setting-card p{margin:6px 0 0;font-size:13px}.setting-controls{display:flex;align-items:center;gap:12px;flex:none}.state{min-width:92px;padding:7px 10px;border-radius:999px;text-align:center;font-size:11px;font-weight:800}.state.on{background:#58d6a320;color:#9cf0cf}.state.off{background:#f6c46a18;color:#ffd37f}.setting-controls button{min-width:102px;padding:10px 13px;border:1px solid #6f7fa5;border-radius:10px;background:#ffffff0b;color:#f5f7fb;font-weight:700;cursor:pointer}.setting-controls button:hover{border-color:#9b8cff;background:#8b7bff20}.setting-controls button:disabled{opacity:.55;cursor:wait}.feedback{min-height:22px;margin:12px 0;color:#9cf0cf;font-size:13px}.feedback.error{color:#ff9eaa}.notice{margin-top:20px;padding:14px 16px;border:1px solid #f6c46a33;border-radius:12px;background:#f6c46a0b;color:#d6c8a6;font-size:12px;line-height:1.55}@media(max-width:680px){body{padding:16px}.overview-grid,.shortcut-list{grid-template-columns:1fr}.resource-grid{grid-template-columns:1fr}.permission-list{grid-template-columns:1fr 1fr}.setting-card{align-items:flex-start;flex-direction:column}.setting-controls{width:100%;justify-content:space-between}}@media(max-width:440px){.hero{align-items:flex-start;padding:18px}.permission-list{grid-template-columns:1fr}.shortcut-card{align-items:flex-start;flex-direction:column}.copy-command{width:100%}}
  </style><style>
    .setting-category{margin:12px 0 0;color:#b9c6ff;font-size:14px}
    .welcome-dialog{width:min(620px,calc(100vw - 32px));overflow-x:hidden}
    .welcome-dialog form,.welcome-dialog .antilink-form-grid,.welcome-dialog .welcome-media-section{min-width:0}
    .welcome-dialog .antilink-form-grid{grid-template-columns:minmax(0,1fr)}
    .welcome-dialog .welcome-media-section{display:grid;gap:8px}
    .welcome-dialog .welcome-media-section p{margin:0;color:var(--muted);font-size:12px;overflow-wrap:anywhere}
    .welcome-dialog .welcome-media-section input[type=file]{max-width:100%;font:inherit;font-size:11px}
    .welcome-dialog .antilink-dialog-actions{flex-wrap:wrap}
    .welcome-dialog .autorepo-global-toggle{display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--line);border-radius:10px;background:#ffffff05}
    .welcome-dialog .autorepo-global-toggle input{width:17px;height:17px;flex:none;margin:2px 0 0;accent-color:#9b8cff}
    .welcome-dialog .autorepo-global-toggle strong,.welcome-dialog .autorepo-global-toggle small{display:block}
    .welcome-dialog .autorepo-global-toggle small{margin-top:4px;color:var(--muted);font-size:11px;font-weight:400;line-height:1.5}
    .autoresposta-dialog{width:min(760px,calc(100vw - 32px))}
    .autoresposta-dialog form,.autoresposta-dialog .autorepo-responses{min-width:0}
    .autoresposta-dialog .autorepo-global-toggle{display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--line);border-radius:10px;background:#ffffff05}
    .autoresposta-dialog .autorepo-global-toggle input{width:17px;height:17px;flex:none;margin:2px 0 0;accent-color:#9b8cff}
    .autoresposta-dialog .autorepo-global-toggle strong,.autoresposta-dialog .autorepo-global-toggle small{display:block}
    .autoresposta-dialog .autorepo-global-toggle small,.autoresposta-dialog .autorepo-section-heading p{margin-top:4px;color:var(--muted);font-size:11px;font-weight:400;line-height:1.5}
    .autorepo-section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .autorepo-section-heading h3{margin:0;font-size:14px}
    .autorepo-section-heading p{margin:3px 0 0}
    .autorepo-section-heading button,.autorepo-response-remove{padding:8px 10px;border:1px solid #6f7fa5;border-radius:9px;background:#ffffff0b;color:#f5f7fb;font-size:11px;font-weight:700;cursor:pointer}
    .autorepo-response-list{display:grid;gap:10px;max-height:42vh;overflow:auto;padding:2px}
    .autorepo-response-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px 12px;padding:12px;border:1px solid var(--line);border-radius:12px;background:#ffffff05}
    .autorepo-response-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .autorepo-response-fields label{min-width:0}
    .autorepo-response-fields label.autorepo-content-field{grid-column:1/-1}
    .autoresposta-dialog .autorepo-response-fields input,.autoresposta-dialog .autorepo-response-fields select,.autoresposta-dialog .autorepo-response-fields textarea{width:100%;min-width:0;padding:8px;border:1px solid var(--line);border-radius:8px;background:#0e121b;color:#f5f7fb;font:inherit;font-size:11px}
    .autoresposta-dialog .autorepo-response-fields textarea{resize:vertical}
    .autorepo-response-remove{align-self:start;border-color:#a65b68;color:#ffb9c2}
    .autorepo-empty{margin:0;padding:14px;border:1px dashed var(--line);border-radius:10px;color:var(--muted);font-size:12px;text-align:center}
    @media(max-width:520px){.autorepo-response-fields{grid-template-columns:1fr}.autorepo-response-fields label.autorepo-content-field{grid-column:auto}.autorepo-section-heading{align-items:flex-start;flex-direction:column}}
    .moderation-layout{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr);gap:14px}.moderation-card{min-width:0;padding:18px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,#171d2b,#131925)}.moderation-card h3{margin:0 0 7px;font-size:15px}.moderation-search{display:flex;gap:8px}.moderation-search input,.moderation-fields input,.moderation-fields textarea,.moderation-fields select{width:100%;min-width:0;padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:#0e121b;color:#f5f7fb;font:inherit}.moderation-fields textarea{min-height:74px;resize:vertical}.moderation-search button,.moderation-card button,.moderation-action{padding:9px 12px;border:1px solid #6f7fa5;border-radius:10px;background:#ffffff0b;color:#f5f7fb;font-weight:700;cursor:pointer}.moderation-card button:hover,.moderation-action:hover{border-color:#9b8cff;background:#8b7bff20}.moderation-card button:disabled,.moderation-action:disabled{opacity:.5;cursor:not-allowed}.moderation-help,.moderation-feedback{margin:9px 0 0;color:var(--muted);font-size:12px;line-height:1.5}.moderation-feedback.error{color:#ff9eaa}.moderation-results,.warning-list{display:grid;gap:8px;margin:14px 0 0;padding:0;list-style:none}.moderation-result,.warning-list li{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px;border:1px solid var(--line);border-radius:10px;background:#ffffff05}.moderation-result span{min-width:0;overflow-wrap:anywhere;font-size:12px}.moderation-result small,.warning-identity small{display:block;margin-top:3px;color:var(--muted);font-size:11px;overflow-wrap:anywhere}.warning-list li{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px 10px}.warning-identity{grid-column:1;min-width:0}.warning-identity strong{display:block;overflow-wrap:anywhere;font-size:12px}.warning-list li .warning-count{grid-column:2;white-space:nowrap}.warning-history{grid-column:1/-1;width:100%;color:var(--muted);font-size:11px}.warning-history summary{cursor:pointer}.warning-history ul{display:grid;gap:6px;margin:8px 0 0;padding-left:18px}.warning-history li{display:list-item;grid-column:auto;grid-template-columns:none;align-items:initial;justify-content:initial;gap:0;padding:0;border:0;border-radius:0;background:none;overflow-wrap:anywhere}.warning-history li small{display:block;color:var(--muted);font-size:10px}.warning-list li button{grid-column:1/-1;width:100%;min-width:0;white-space:normal}.moderation-fields{display:grid;gap:9px;margin-top:14px}.moderation-fields[hidden]{display:none}.moderation-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.moderation-actions[hidden],.moderation-role-select[hidden]{display:none}.moderation-actions button[aria-pressed=true]{border-color:#9b8cff;background:#8b7bff20}.moderation-action.danger{border-color:#b65b6a66;color:#ffb3bd}.member-admin{margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}.member-admin h4{margin:0;font-size:13px}.moderation-role-select{width:100%;margin-top:12px;padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:#0e121b;color:#f5f7fb;font:inherit}.warning-list button{flex:none;font-size:11px}.warning-empty{margin:10px 0 0;color:var(--muted);font-size:12px}.permission-help{margin:12px 0 0;color:var(--muted);font-size:11px;line-height:1.5}@media(max-width:700px){.moderation-layout{grid-template-columns:1fr}.moderation-search{align-items:stretch;flex-direction:column}.moderation-result{align-items:flex-start;flex-direction:column}.moderation-result button,.warning-list button{width:100%}}
  .settings{gap:8px}.setting-card{gap:12px;padding:13px 15px}.setting-card h2{font-size:14px}.setting-card p{margin-top:4px;font-size:11px}.setting-controls{gap:8px}.state{min-width:82px;padding:6px 8px}.setting-controls button{min-width:88px;padding:8px 10px;font-size:12px}.setting-category{grid-column:1/-1;margin:10px 0 0}.setting-scope{display:inline-block;margin-bottom:5px;padding:3px 7px;border:1px solid #8195d344;border-radius:999px;background:#8297d014;color:#b9c6ff;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.setting-icon-button{display:grid;min-width:34px!important;width:34px;height:34px;padding:7px!important;place-items:center}.setting-icon-button svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.scope-list-label{grid-column:1/-1;margin:4px 0 -2px;color:#dce2f3;font-size:12px;font-weight:800}.scope-picker{display:flex;flex-wrap:wrap;align-items:end;gap:10px;margin:10px 0}.scope-picker label{display:grid;gap:5px;color:#b9c6ff;font-size:11px;font-weight:700}.scope-picker select{min-width:min(260px,80vw);padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:#171d2b;color:#f5f7fb}.scope-panel{margin-top:12px;padding:12px;border:1px solid var(--line);border-radius:14px;background:#ffffff04}.scope-panel[hidden]{display:none}.scope-panel-heading{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 12px}.scope-panel h3{margin:0;font-size:14px}.scope-current{color:#b9c6ff;font-size:11px;font-weight:700}.scope-note{margin:5px 0 0;color:var(--muted);font-size:11px;line-height:1.45}.antilink-dialog{width:min(720px,calc(100vw - 24px));max-height:90vh;overflow:auto;padding:20px;border:1px solid #53668f;border-radius:16px;background:#151c2b;color:#f5f7fb;box-shadow:0 24px 90px #000a}.antilink-dialog::backdrop{background:#080b12bb;backdrop-filter:blur(3px)}.antilink-dialog form{display:grid;gap:14px}.antilink-dialog-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.antilink-dialog-heading h2{margin:0;font-size:18px}.antilink-dialog-heading p{margin:5px 0 0;color:#b9c6ff;font-size:12px}.dialog-close{width:32px;height:32px;border:1px solid var(--line);border-radius:9px;background:#ffffff08;color:#fff;font-size:21px;cursor:pointer}.antilink-form-grid,.antilink-list-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.antilink-dialog label{display:grid;gap:6px;color:#dce2f3;font-size:12px;font-weight:700}.antilink-dialog textarea,.antilink-dialog select{width:100%;min-width:0;padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:#0e121b;color:#f5f7fb;font:inherit;font-size:12px}.antilink-dialog textarea{resize:vertical}.antilink-dialog small{color:var(--muted);font-size:10px;font-weight:400;line-height:1.4}.antilink-options{display:grid;gap:8px;margin:0;padding:12px;border:1px solid var(--line);border-radius:10px}.antilink-options legend{padding:0 6px;color:#b9c6ff;font-size:12px;font-weight:700}.antilink-options label{display:flex;align-items:flex-start;gap:8px;font-weight:400}.antilink-options input{margin:2px 0 0;accent-color:#9b8cff}.antilink-form-feedback{min-height:16px;margin:0;color:#9cf0cf;font-size:12px}.antilink-form-feedback.error{color:#ff9eaa}.antilink-dialog-actions{display:flex;justify-content:flex-end;gap:8px}.antilink-dialog-actions button{padding:9px 12px;border:1px solid #6f7fa5;border-radius:9px;background:#ffffff0b;color:#f5f7fb;font:inherit;font-size:12px;font-weight:700;cursor:pointer}.antilink-dialog-actions .primary{border-color:#9b8cff;background:#8b7bff20}.antilink-dialog-actions button:disabled{opacity:.55;cursor:wait}.monitor-form-fields{display:grid;gap:12px}.monitor-form-fields input[type="text"],.monitor-form-fields input[type="number"]{width:100%;min-width:0;padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:#0e121b;color:#f5f7fb;font:inherit;font-size:12px}.monitor-check-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}.monitor-check-list label{display:flex;align-items:center;gap:8px;padding:9px;border:1px solid var(--line);border-radius:9px;background:#ffffff05}.monitor-check-list input{accent-color:#9b8cff}.monitor-job{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:12px;border:1px solid var(--line);border-radius:10px;background:#ffffff05}.monitor-job button{grid-column:1/-1;justify-self:end;padding:6px 9px;border:1px solid #b65b6a66;border-radius:8px;background:#ffffff08;color:#ffb3bd;cursor:pointer}.monitor-field-caption{margin:0;color:var(--muted);font-size:11px;line-height:1.45}@media(min-width:640px){#rootSettings{grid-template-columns:repeat(2,minmax(0,1fr))}.setting-card{align-items:flex-start;flex-direction:column;justify-content:flex-start}.setting-controls{width:100%;justify-content:space-between}}@media(max-width:520px){.antilink-form-grid,.antilink-list-grid{grid-template-columns:1fr}.antilink-dialog{padding:15px}.monitor-job{grid-template-columns:1fr}}
  </style><style>
    .setting-controls .setting-store2-button{display:flex;width:auto;min-width:max-content!important;height:34px;padding:7px 10px!important;align-items:center;gap:6px;border-color:#9b8cff77;background:#8b7bff14;color:#d5ceff;font-size:11px;font-weight:700;white-space:nowrap}
    .setting-controls .setting-store2-button:hover{border-color:#b3a8ff;background:#8b7bff30}
    .setting-store2-button span{display:grid;place-items:center}
    .setting-store2-button svg{width:15px;height:15px}
    .store2-dialog{width:min(760px,calc(100vw - 24px))}
    .store2-dialog input{width:100%;min-width:0;padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:#0e121b;color:#f5f7fb;font:inherit;font-size:12px}
    .store2-dialog section{display:grid;gap:10px;padding-top:14px;border-top:1px solid var(--line)}
    .store2-dialog section h3{margin:0;font-size:14px}
    .store2-list{display:grid;gap:8px}
    .store2-row{display:grid;gap:8px;padding:12px;border:1px solid var(--line);border-radius:10px;background:#ffffff05}
    .store2-row h4,.store2-row p{margin:0;overflow-wrap:anywhere}
    .store2-row p{color:var(--muted);font-size:11px;line-height:1.45}
    .store2-row-actions{display:flex;flex-wrap:wrap;gap:8px}
    .store2-row-actions button{padding:8px 10px;border:1px solid #6f7fa5;border-radius:9px;background:#ffffff0b;color:#f5f7fb;font:inherit;font-size:11px;font-weight:700;cursor:pointer}
    .store2-row-actions .danger{border-color:#b65b6a66;color:#ffb3bd}
    .store2-row-actions button:disabled{opacity:.55;cursor:wait}
    .store2-empty{margin:0;padding:12px;border:1px dashed var(--line);border-radius:10px;color:var(--muted);font-size:12px;text-align:center}
    .rp-manager-dialog button:not(.dialog-close){min-height:38px;padding:9px 12px;border:1px solid #6f7fa5;border-radius:10px;background:#ffffff0b;color:#f5f7fb;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
    .rp-manager-dialog button:not(.dialog-close):hover{border-color:#9b8cff;background:#8b7bff20}
    .rp-manager-dialog button:not(.dialog-close):disabled{opacity:.55;cursor:wait}
    .rp-manager-dialog .moderation-search{display:grid;grid-template-columns:minmax(0,1fr);gap:8px}
    .rp-manager-dialog .rp-xp-settings:not([hidden]){display:grid;gap:12px;padding:14px;border:1px solid var(--line);border-radius:12px;background:#ffffff05}
    .rp-manager-dialog .rp-manager-toolbar{margin:12px 0}
    .rp-manager-dialog .rp-manager-toolbar button,.rp-manager-dialog #saveRpXpSettings{width:100%}
    .rp-manager-dialog .rp-manager-toolbar .danger,.rp-manager-dialog .rp-user-actions .danger{border-color:#b65b6a66;color:#ffb3bd}
    .rp-manager-users{display:grid;gap:10px;margin-top:12px}
    .rp-manager-dialog .rp-user-card{grid-template-columns:minmax(0,1fr)!important}
    .rp-manager-dialog .rp-user-card input{grid-column:1!important;min-height:38px}
    .rp-user-actions{display:grid;grid-column:1;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%}
    .rp-user-actions .moderation-action{width:100%;min-width:0}
    .rp-user-actions .moderation-action:only-child{grid-column:1/-1}
    .rp-manager-dialog .antilink-dialog-actions button{min-width:108px}
    @media(max-width:480px){.rp-user-actions{grid-template-columns:1fr}}
  </style></head><body><main class="admin-page">
    <nav class="topbar"><a href="/painel-local?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}">← Painel do membro</a><span>${escapeHtml(config.getBotName())} · Administração</span></nav>
    <header class="hero"><img class="avatar" src="${escapeHtml(data.avatarUrl || "/semfoto.jpg")}" alt="Foto de ${escapeHtml(data.userName)}" onerror="this.onerror=null;this.src='/semfoto.jpg'"><div><div class="eyebrow">Painel de administração</div><h1>${escapeHtml(data.groupName)}</h1><p>${groupType} · ${escapeHtml(data.platform)} · Acesso verificado para ${escapeHtml(data.userName)}</p></div></header>
    <nav class="overview-nav" aria-label="Navegação do painel"><a href="#moderation">Moderação</a><a href="#systemSettings">${data.platform === "whatsapp" ? "Sistemas do grupo" : "Sistemas do SatBot"}</a></nav>
    <section class="overview-section" id="moderation" aria-labelledby="moderationTitle">
      <h2 class="section-title" id="moderationTitle">Moderação</h2>
      <p class="section-intro">Gerencie advertências e aplique ações compatíveis com esta plataforma. Sua permissão e a do bot são verificadas ao executar cada ação.</p>
      <div class="moderation-layout">
        <article class="moderation-card"><h3>Buscar usuário</h3><form class="moderation-search" id="moderationSearch"><input id="moderationQuery" type="search" maxlength="100" autocomplete="off" placeholder="${data.platform === "whatsapp" ? "ID ou número" : "ID ou username"}" aria-label="ID ou username do usuário"><button type="submit">Buscar</button>${data.platform === "whatsapp" ? '<button type="button" id="loadMembers">Abrir lista de membros</button>' : ""}</form>${data.platform === "whatsapp" ? '<section id="memberPicker" class="member-picker-card" hidden style="margin-top:12px;padding:12px;border:1px solid var(--line);border-radius:12px;background:#ffffff05"><h4 style="margin:0 0 5px;font-size:13px">Selecionar membro do grupo</h4><p class="moderation-help" style="margin:0 0 9px">Os participantes aparecem pelo nome e pelo ID. Selecione um cartão para abrir as ações de moderação.</p><div id="memberPickerList" class="member-picker-list" aria-live="polite"></div></section>' : ""}<p class="moderation-help">${data.platform === "telegram" ? "Informe o ID numérico ou um username já conhecido pelo bot. O Telegram não permite localizar qualquer usuário apenas pelo username." : data.platform === "whatsapp" ? "Informe o ID/número para buscar ou abra a lista personalizada de participantes." : "Informe o ID ou username do membro do Discord."}</p><div id="moderationResults" class="moderation-results" aria-live="polite"></div><div id="moderationSelected"></div><p class="moderation-feedback" id="moderationFeedback" role="status" aria-live="polite"></p></article>
        <article class="moderation-card"><h3>Configuração de advertências</h3><p class="moderation-help">Defina o limite e a punição automática. Ao atingir o limite, o histórico de advertências do membro é zerado.</p><form id="warningConfigForm" class="moderation-fields"><label for="warningMax">Limite de advertências</label><input id="warningMax" name="max" type="number" min="1" max="1000000" step="1" value="${data.moderation.max}" required><label for="warningAction">Ação ao atingir o limite</label><select id="warningAction" name="action" required><option value="ban" ${data.moderation.action === "ban" ? "selected" : ""}>Banir</option><option value="kick" ${data.moderation.action === "kick" ? "selected" : ""}>Expulsar</option></select><button type="submit">Salvar configuração de warns</button><p class="moderation-feedback" id="warningConfigFeedback" role="status" aria-live="polite"></p></form></article>
        <article class="moderation-card"><h3>Usuários com advertências</h3><p class="moderation-help">Abra “Ver motivos” para consultar o histórico. Advertências anteriores à atualização aparecem sem motivo registrado. Remover pela lista apaga todas as advertências da pessoa.</p><ul class="warning-list" id="warningList">${warningRows || ""}</ul><p class="warning-empty" id="warningEmpty" ${warningRows ? "hidden" : ""}>Nenhum usuário com advertências registradas.</p><p class="warning-empty" id="warningMore" ${data.moderation.total > data.moderation.entries.length ? "" : "hidden"}>Mostrando ${data.moderation.entries.length} de ${data.moderation.total}. Pesquise pelo ID para localizar outros registros.</p></article>
      </div>
    </section>
    <section class="overview-section" id="systemSettings" aria-labelledby="systemSettingsTitle"><h2 class="section-title" id="systemSettingsTitle">Sistemas do grupo</h2><p class="section-intro">${data.platform === "whatsapp" ? "Ative ou desative os recursos disponíveis neste grupo. Cada alteração será anunciada no próprio grupo." : "Escolha o escopo e filtre a lista para ver somente as funções configuráveis nele."}</p><div class="scope-panel scope-toolbar"><div class="scope-picker"><label>Mostrar configurações de<select id="scopeFilter">${data.platform === "discord" ? '<option value="server">Servidor</option><option value="categoria">Categoria</option><option value="chat">Chat</option>' : data.platform === "telegram" ? '<option value="server">Grupo</option><option value="topic" hidden>Tópico</option>' : '<option value="chat">Grupo</option><option value="server" hidden>Comunidade</option>'}</select></label>${data.platform === "discord" ? `<label>Categoria<select id="categorySelect"><option value="">Selecione uma categoria</option></select></label><label id="channelPicker">Chat<select id="channelSelect"><option value="">Selecione um chat</option></select></label><label>Canal de logs<select id="logsChannelSelect"><option value="">Desativado — não registrar avisos</option></select></label>` : data.platform === "telegram" ? `<label id="topicPicker" hidden>Tópico<select id="topicSelect"><option value="">Selecione um tópico</option></select></label>` : ""}</div><p class="scope-note" id="scopeNote">${data.platform === "discord" ? "A escolha de uma categoria ou chat ajusta o filtro automaticamente. Os avisos do dashboard serão enviados ao canal de logs selecionado." : data.platform === "telegram" ? "A escolha de um tópico ajusta o filtro automaticamente. Avisos de alteração são enviados no chat principal, sem tópico." : "Escopo: grupo."}</p></div><section class="settings" id="rootSettings" aria-label="Configurações do escopo selecionado">${settingCards}</section></section>
    <dialog class="antilink-dialog" id="antilinkDialog" aria-labelledby="antilinkDialogTitle"><form id="antilinkForm"><header class="antilink-dialog-heading"><div><h2 id="antilinkDialogTitle">Configurações do antilink</h2><p id="antilinkScopeLabel"></p></div><button type="button" class="dialog-close" data-close-antilink aria-label="Fechar">×</button></header><div class="antilink-form-grid"><label>Ação ao detectar link<select name="action"><option value="delete">Deletar mensagem</option><option value="warn">Deletar e avisar</option><option value="kick">Deletar e expulsar</option><option value="ban">Deletar e banir</option></select></label><label class="antilink-message-field">Mensagem de aviso<textarea name="message" maxlength="2000" rows="3" placeholder="Mensagem enviada quando a ação avisa o usuário"></textarea></label></div><fieldset class="antilink-options"><legend>Exceções e herança</legend><label><input type="checkbox" name="ignoreParent"> Ignorar as regras dos escopos superiores</label><label><input type="checkbox" name="ignoreSameGroup"> Permitir links do próprio grupo/servidor</label><label><input type="checkbox" name="ignoreMedia"> Ignorar links identificados como mídia (YouTube, TikTok, Instagram)</label></fieldset><div class="antilink-list-grid"><label>Domínios permitidos<textarea name="whitelist" rows="4" placeholder="um domínio por linha"></textarea><small>Links desses domínios não são tratados como infração.</small></label><label>Usuários isentos<textarea name="userWhitelist" rows="4" placeholder="um ID por linha"></textarea><small>Esses usuários podem enviar links sem punição.</small></label><label>Usuários sem exceção de links de mídia<textarea name="userBlacklist" rows="4" placeholder="um ID por linha"></textarea><small>Aplicável quando a regra ignora links de mídia.</small></label>${data.platform === "discord" ? `<label>Cargos isentos<textarea name="roleWhitelist" rows="4" placeholder="um ID de cargo por linha"></textarea></label><label>Cargos sem exceção de links de mídia<textarea name="roleBlacklist" rows="4" placeholder="um ID de cargo por linha"></textarea></label>` : ""}</div><p class="antilink-form-feedback" id="antilinkFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-antilink>Cancelar</button><button type="submit" class="primary">Salvar configurações</button></footer></form></dialog>
    <dialog class="antilink-dialog" id="antimediaDialog" aria-labelledby="antimediaDialogTitle"><form id="antimediaForm"><header class="antilink-dialog-heading"><div><h2 id="antimediaDialogTitle">Configurações do antimídia</h2><p id="antimediaScopeLabel"></p></div><button type="button" class="dialog-close" data-close-antimedia aria-label="Fechar">×</button></header><div class="antilink-form-grid"><label>Ação ao detectar mídia<select name="action"><option value="delete">Deletar mensagem</option><option value="warn">Deletar e avisar</option><option value="kick">Deletar e expulsar</option><option value="ban">Deletar e banir</option></select></label><label>Mensagem de aviso<textarea name="message" maxlength="2000" rows="3" placeholder="Opcional; usada quando a ação avisa o usuário"></textarea></label></div><fieldset class="antilink-options"><legend>Tipos de mídia bloqueados</legend><div class="antimedia-media-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px 14px">${[["image","Imagem / foto"],["video","Vídeo"],["audio","Áudio / música"],["document","Documento / arquivo"],["sticker","Figurinha"],["location","Localização"],["contact","Contato"],["voice","Mensagem de voz"],["gif","GIF"]].map(([value,label]) => `<label><input type="checkbox" name="mediaTypes" value="${value}"> ${label}</label>`).join("")}</div><small>Se nenhum tipo for marcado, todos os tipos de mídia serão bloqueados.</small></fieldset><fieldset class="antilink-options"><legend>Herança</legend><label><input type="checkbox" name="ignoreParent"> Ignorar as regras dos escopos superiores</label></fieldset><div class="antilink-list-grid"><label>Usuários isentos<textarea name="userWhitelist" rows="4" placeholder="um ID por linha"></textarea><small>Esses usuários não serão punidos.</small></label><label>Usuários na lista negra<textarea name="userBlacklist" rows="4" placeholder="um ID por linha"></textarea><small>Esses usuários serão punidos ao enviar qualquer mídia.</small></label>${data.platform === "discord" ? `<label>Cargos isentos<textarea name="roleWhitelist" rows="4" placeholder="um ID de cargo por linha"></textarea></label><label>Cargos na lista negra<textarea name="roleBlacklist" rows="4" placeholder="um ID de cargo por linha"></textarea></label>` : ""}</div><p class="antilink-form-feedback" id="antimediaFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-antimedia>Cancelar</button><button type="submit" class="primary">Salvar configurações</button></footer></form></dialog>
    <dialog class="antilink-dialog" id="antipalavrasDialog" aria-labelledby="antipalavrasDialogTitle"><form id="antipalavrasForm"><header class="antilink-dialog-heading"><div><h2 id="antipalavrasDialogTitle">Configurações do antipalavras</h2><p id="antipalavrasScopeLabel"></p></div><button type="button" class="dialog-close" data-close-antipalavras aria-label="Fechar">×</button></header><div class="antilink-form-grid"><label>Ação ao detectar palavra/frase<select name="action"><option value="delete">Deletar mensagem</option><option value="warn">Deletar e avisar</option><option value="kick">Deletar e expulsar</option><option value="ban">Deletar e banir</option></select></label><label>Mensagem de aviso<textarea name="message" maxlength="2000" rows="3" placeholder="Opcional; usada quando a ação avisa o usuário"></textarea></label></div><label class="antipalavras-words-field">Palavras e frases bloqueadas<textarea name="words" rows="8" maxlength="100500" placeholder="Uma palavra/frase por linha (ou separadas por vírgula)"></textarea><small>Cada entrada é verificada individualmente nas mensagens.</small></label><fieldset class="antilink-options"><legend>Herança</legend><label><input type="checkbox" name="ignoreParent"> Ignorar as regras dos escopos superiores</label></fieldset><div class="antilink-list-grid"><label>Usuários isentos<textarea name="userWhitelist" rows="4" placeholder="um ID por linha"></textarea></label><label>Usuários sempre monitorados<textarea name="userBlacklist" rows="4" placeholder="um ID por linha"></textarea></label>${roleListFields}</div><p class="antilink-form-feedback" id="antipalavrasFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-antipalavras>Cancelar</button><button type="submit" class="primary">Salvar configurações</button></footer></form></dialog>
    <dialog class="antilink-dialog" id="antiraidDialog" aria-labelledby="antiraidDialogTitle"><form id="antiraidForm"><header class="antilink-dialog-heading"><div><h2 id="antiraidDialogTitle">Configurações do antiraid</h2><p id="antiraidScopeLabel"></p></div><button type="button" class="dialog-close" data-close-antiraid aria-label="Fechar">×</button></header><div class="antilink-form-grid"><label>Ação ao detectar raid<select name="action">${antiraidActionOptions}</select></label></div><div class="antiraid-limits-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px"><label>Mensagens no limite<input name="maxMessagesPerWindow" type="number" min="1" max="100" required><small>Máximo de mensagens na janela.</small></label><label>Janela (segundos)<input name="windowSeconds" type="number" min="1" max="300" required></label><label>Mensagens repetidas<input name="repeatedMessageLimit" type="number" min="1" max="100" required></label><label>Links<input name="linkLimit" type="number" min="1" max="100" required></label><label>Convites<input name="inviteLimit" type="number" min="1" max="100" required></label><label>Menções<input name="mentionLimit" type="number" min="0" max="100" required><small>0 desativa o limite de menções.</small></label>${data.platform === "discord" ? '<label>Webhooks<input name="webhookLimit" type="number" min="0" max="100" required><small>0 desativa este limite.</small></label>' : ""}</div><div class="antilink-list-grid"><label>Usuários isentos<textarea name="userWhitelist" rows="4" placeholder="um ID por linha"></textarea></label><label>Usuários sempre monitorados<textarea name="userBlacklist" rows="4" placeholder="um ID por linha"></textarea></label>${roleListFields}</div><p class="antilink-form-feedback" id="antiraidFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-antiraid>Cancelar</button><button type="submit" class="primary">Salvar configurações</button></footer></form></dialog>
    <dialog class="antilink-dialog" id="blockcmdDialog" aria-labelledby="blockcmdDialogTitle"><form id="blockcmdForm"><header class="antilink-dialog-heading"><div><h2 id="blockcmdDialogTitle">Configurações do bloqueio de comandos</h2><p id="blockcmdScopeLabel"></p></div><button type="button" class="dialog-close" data-close-blockcmd aria-label="Fechar">×</button></header><div class="antilink-form-grid"><label>Ação ao usar comando bloqueado<select name="action"><option value="reply">Avisar no chat</option><option value="ignore">Ignorar silenciosamente</option><option value="delete">Apagar a mensagem</option></select></label><label>Mensagem de aviso<textarea name="message" maxlength="2000" rows="3" placeholder="Opcional. Variáveis: {cmd}, {user} e {prefix}"></textarea><small>Usada quando a ação envia um aviso.</small></label></div><label>Comandos e categorias bloqueados<textarea name="blockedCommands" rows="8" maxlength="100500" placeholder="Um comando ou categoria por linha (sem prefixo)"></textarea><small>Use o nome do comando ou de uma categoria. Exemplo: cotacao ou adm/segurança.</small></label><fieldset class="antilink-options"><legend>Herança</legend><label><input type="checkbox" name="ignoreParent"> Ignorar as regras dos escopos superiores</label></fieldset><p class="antilink-form-feedback" id="blockcmdFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-blockcmd>Cancelar</button><button type="submit" class="primary">Salvar configurações</button></footer></form></dialog>
    ${welcomeGoodbyeDialogs}
    ${autorespostaDialog}
    ${autodownloadDialog}
    ${autoApproveDialog}
    ${rpManagerDialog}
    ${store2Dialog}
    ${monitorDialog}
    ${schedulesDialog}
    <p class="feedback" id="adminFeedback" role="status" aria-live="polite"></p>
    <aside class="notice">As ações exibidas dependem do suporte da plataforma e das permissões do membro e do bot.</aside>
  </main><script>
    const context=${JSON.stringify({ platform: data.platform, groupId: data.groupId })};
    const gearIcon=${JSON.stringify(ADMIN_SETTINGS_GEAR_ICON)};
    const moderationPermissions=${JSON.stringify({
      platform: data.platform,
      user: Object.fromEntries(data.permissionSnapshot.adminPermissions.map(item => [item.key, item.allowed])),
      bot: Object.fromEntries(data.permissionSnapshot.botPermissions.map(item => [item.key, item.allowed]))
    })};
    const feedback=document.getElementById("adminFeedback");
    const formatStoreMoney=amount=>(Number(amount||0)/100).toFixed(2)+"💷";
    const scopeFilter=document.getElementById("scopeFilter");
    async function requestAdminApi(path,payload={}){
      const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...context,...payload})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Não foi possível carregar as configurações.");
      return result;
    }
    function renderScopedSettings(target,scope,settings){
      const definitions=${JSON.stringify(ADMIN_SYSTEM_SETTINGS.map(({key,label,description,category,scopes})=>({key,label,description,category,scopes})))};
      const items=definitions.filter(item=>item.scopes[context.platform]?.includes(scope.level));
      const categorySelect=document.getElementById("categorySelect");
      const channelSelect=document.getElementById("channelSelect");
      const topicSelect=document.getElementById("topicSelect");
      const scopeName=scope.level==="categoria"
        ? "Categoria · "+(categorySelect?.selectedOptions[0]?.textContent||"")
        : scope.level==="chat"
          ? "Chat · "+(channelSelect?.selectedOptions[0]?.textContent||"")
          : scope.level==="topic"
            ? "Tópico · "+(topicSelect?.selectedOptions[0]?.textContent||"")
            : scope.level==="server" ? (context.platform==="discord"?"Servidor":context.platform==="whatsapp"?"Comunidade":"Grupo") : "Grupo";
      const heading=document.createElement("h4");heading.className="scope-list-label";heading.textContent="Editando: "+scopeName;
      let lastCategory="";
      target.innerHTML=items.map(item=>{
        const enabled=settings[item.key]===true;
        const heading=item.category!==lastCategory?'<h3 class="setting-category" style="margin:12px 0 0;color:#b9c6ff;font-size:14px">'+item.category+'</h3>':"";
        lastCategory=item.category;
        const scopeAttr=JSON.stringify(scope).replace(/&/g,"&amp;").replace(/"/g,"&quot;");
        const configButton=item.key==="agendar"?'<button type="button" class="setting-icon-button" data-schedule-config data-scope="'+scopeAttr+'" aria-label="Gerenciar agendamentos" title="Gerenciar agendamentos">'+gearIcon+'</button>':["antilink","antimedia","antipalavras","antiraid","blockcmd","welcome","goodbye","autorepo","autodownload","autoApprove"].includes(item.key)?'<button type="button" class="setting-icon-button" data-'+item.key.toLowerCase()+'-config data-scope="'+scopeAttr+'" aria-label="Configurar '+item.label+' neste escopo" title="Configurações do '+item.label+'">'+gearIcon+'</button>':["economy","xp","activity"].includes(item.key)?'<button type="button" class="setting-icon-button" data-rp-config="'+item.key+'" data-scope="'+scopeAttr+'" aria-label="Gerenciar '+item.label+'" title="Gerenciar '+item.label+'">'+gearIcon+'</button>'+(item.key==="economy"?'<button type="button" class="setting-icon-button setting-store2-button" data-store2-config><span aria-hidden="true">'+gearIcon+'</span><span>Configurar Loja 2</span></button>':""):["monitorStock","monitorCafe","monitorWeather","monitorRandomWeather","monitorElection"].includes(item.key)?'<button type="button" class="setting-icon-button" data-monitor-config data-monitor-setting="'+item.key+'" data-scope="'+scopeAttr+'" aria-label="Configurar '+item.label+' neste escopo" title="Configurações do '+item.label+'">'+gearIcon+'</button>':"";
        const controls=item.key==="agendar"?'<span class="state '+(enabled?"on":"off")+'" data-state="'+item.key+'">'+(enabled?"Ativo":"Sem agendamentos ativos")+'</span>'+configButton:'<span class="state '+(enabled?"on":"off")+'" data-state="'+item.key+'">'+(enabled?"Ativado":"Desativado")+'</span><button type="button" data-setting="'+item.key+'" data-enabled="'+enabled+'" data-scope="'+scopeAttr+'">'+(enabled?"Desativar":"Ativar")+'</button>'+configButton;
        return heading+'<article class="setting-card"><div class="setting-info"><span class="setting-scope"></span><h2>'+item.label+'</h2><p>'+item.description+'</p></div><div class="setting-controls">'+controls+'</div></article>';
      }).join("");
      target.prepend(heading);
      target.querySelectorAll(".setting-scope").forEach(badge=>{badge.textContent=scopeName});
      target.hidden=items.length===0;
      if(!items.length)target.innerHTML='<p class="scope-note">Não há funções disponíveis para configuração neste nível.</p>';
    }
    function showScopeMessage(target,message){
      target.replaceChildren();
      const note=document.createElement("p");note.className="scope-note";note.textContent=message;target.append(note);
    }
    async function loadScope(scope,target=document.getElementById("rootSettings")){
      if(!target||!scope)return;
      target.hidden=false;
      showScopeMessage(target,"Carregando configurações...");
      try{
        const result=await requestAdminApi("/api/account/local/admin-settings-state",{scope});
        renderScopedSettings(target,scope,result.settings);
      }catch(error){target.hidden=false;showScopeMessage(target,error.message);feedback.classList.add("error");feedback.textContent=error.message}
    }
    async function saveSetting(button){
      const setting=button.dataset.setting,enabled=button.dataset.enabled!=="true",scope=JSON.parse(button.dataset.scope||'{"level":"server"}');
      if(!enabled&&!window.confirm("Desativar esta função neste escopo? Os dados existentes serão preservados."))return;
      button.disabled=true;feedback.classList.remove("error");feedback.textContent="";
      try{
        const result=await requestAdminApi("/api/account/local/admin-settings",{setting,enabled,scope});
        const current=result.settings[setting];
        button.dataset.enabled=String(current);button.textContent=current?"Desativar":"Ativar";
        const card=button.closest(".setting-card"),state=card.querySelector('[data-state="'+setting+'"]');
        state.textContent=current?"Ativado":"Desativado";state.classList.toggle("on",current);state.classList.toggle("off",!current);
        feedback.classList.toggle("error",Boolean(result.announcementWarning));
        feedback.textContent=result.announcementWarning||result.message||"Configuração atualizada.";
      }catch(error){feedback.classList.add("error");feedback.textContent=error.message}
      finally{button.disabled=false}
    }
    const antilinkDialog=document.getElementById("antilinkDialog");
    const antilinkForm=document.getElementById("antilinkForm");
    const antilinkFormFeedback=document.getElementById("antilinkFormFeedback");
    let activeAntilinkScope=null;
    function fillAntilinkForm(config){
      antilinkForm.elements.action.value=config.action||"delete";
      antilinkForm.elements.message.value=config.message||"";
      for(const key of ["ignoreParent","ignoreSameGroup","ignoreMedia"])antilinkForm.elements[key].checked=config[key]===true;
      for(const key of ["whitelist","userWhitelist","userBlacklist","roleWhitelist","roleBlacklist"]){
        if(antilinkForm.elements[key])antilinkForm.elements[key].value=Array.isArray(config[key])?config[key].join("\\n"):"";
      }
    }
    function readAntilinkForm(){
      const config={
        action:antilinkForm.elements.action.value,
        message:antilinkForm.elements.message.value.trim()||null,
        ignoreParent:antilinkForm.elements.ignoreParent.checked,
        ignoreSameGroup:antilinkForm.elements.ignoreSameGroup.checked,
        ignoreMedia:antilinkForm.elements.ignoreMedia.checked
      };
      for(const key of ["whitelist","userWhitelist","userBlacklist","roleWhitelist","roleBlacklist"]){
        if(antilinkForm.elements[key])config[key]=antilinkForm.elements[key].value.split(/\\r?\\n/).map(value=>value.trim()).filter(Boolean);
      }
      return config;
    }
    const antimediaDialog=document.getElementById("antimediaDialog");
    const antimediaForm=document.getElementById("antimediaForm");
    const antimediaFormFeedback=document.getElementById("antimediaFormFeedback");
    let activeAntimediaScope=null;
    function fillAntimediaForm(config){
      antimediaForm.elements.action.value=config.action||"delete";
      antimediaForm.elements.message.value=config.message||"";
      antimediaForm.elements.ignoreParent.checked=config.ignoreParent===true;
      const mediaTypes=new Set(Array.isArray(config.mediaTypes)?config.mediaTypes:[]);
      antimediaForm.querySelectorAll('input[name="mediaTypes"]').forEach(input=>{input.checked=mediaTypes.has(input.value)});
      for(const key of ["userWhitelist","userBlacklist","roleWhitelist","roleBlacklist"]){
        if(antimediaForm.elements[key])antimediaForm.elements[key].value=Array.isArray(config[key])?config[key].join("\\n"):"";
      }
    }
    function readAntimediaForm(){
      const config={
        action:antimediaForm.elements.action.value,
        message:antimediaForm.elements.message.value.trim()||null,
        ignoreParent:antimediaForm.elements.ignoreParent.checked,
        mediaTypes:[...antimediaForm.querySelectorAll('input[name="mediaTypes"]:checked')].map(input=>input.value)
      };
      for(const key of ["userWhitelist","userBlacklist","roleWhitelist","roleBlacklist"]){
        if(antimediaForm.elements[key])config[key]=antimediaForm.elements[key].value.split(/\\r?\\n/).map(value=>value.trim()).filter(Boolean);
      }
      return config;
    }
    const antipalavrasDialog=document.getElementById("antipalavrasDialog");
    const antipalavrasForm=document.getElementById("antipalavrasForm");
    const antipalavrasFormFeedback=document.getElementById("antipalavrasFormFeedback");
    let activeAntipalavrasScope=null;
    function fillAntipalavrasForm(config){
      antipalavrasForm.elements.action.value=config.action||"delete";
      antipalavrasForm.elements.message.value=config.message||"";
      antipalavrasForm.elements.ignoreParent.checked=config.ignoreParent===true;
      antipalavrasForm.elements.words.value=Array.isArray(config.words)?config.words.join("\\n"):"";
      for(const key of ["userWhitelist","userBlacklist","roleWhitelist","roleBlacklist"]){
        if(antipalavrasForm.elements[key])antipalavrasForm.elements[key].value=Array.isArray(config[key])?config[key].join("\\n"):"";
      }
    }
    function readAntipalavrasForm(){
      const config={
        action:antipalavrasForm.elements.action.value,
        message:antipalavrasForm.elements.message.value.trim()||null,
        ignoreParent:antipalavrasForm.elements.ignoreParent.checked,
        words:antipalavrasForm.elements.words.value.split(/[\\r\\n,]+/).map(value=>value.trim()).filter(Boolean)
      };
      for(const key of ["userWhitelist","userBlacklist","roleWhitelist","roleBlacklist"]){
        if(antipalavrasForm.elements[key])config[key]=antipalavrasForm.elements[key].value.split(/\\r?\\n/).map(value=>value.trim()).filter(Boolean);
      }
      return config;
    }
    const antiraidDialog=document.getElementById("antiraidDialog");
    const antiraidForm=document.getElementById("antiraidForm");
    const antiraidFormFeedback=document.getElementById("antiraidFormFeedback");
    antiraidForm.querySelectorAll('input[type="number"]').forEach(input=>Object.assign(input.style,{width:"100%",minWidth:"0",padding:"9px 10px",border:"1px solid #334366",borderRadius:"9px",background:"#0e121b",color:"#f5f7fb",font:"inherit",fontSize:"12px"}));
    let activeAntiraidScope=null;
    const antiraidNumericFields=["maxMessagesPerWindow","windowSeconds","repeatedMessageLimit","linkLimit","inviteLimit","mentionLimit","webhookLimit"];
    function fillAntiraidForm(config){
        let action=context.platform==="whatsapp"&&["mute","remove"].includes(config.action)
          ? "remove"
          : context.platform==="discord"&&config.action==="mute"?"timeout":config.action||"mute";
        if(![...antiraidForm.elements.action.options].some(option=>option.value===action)){
          action=context.platform==="whatsapp"?"remove":context.platform==="discord"?"timeout":"mute";
        }
      antiraidForm.elements.action.value=action;
      for(const key of antiraidNumericFields){
        if(antiraidForm.elements[key])antiraidForm.elements[key].value=Number.isFinite(config[key])?config[key]:"";
      }
      for(const key of ["userWhitelist","userBlacklist","roleWhitelist","roleBlacklist"]){
        if(antiraidForm.elements[key])antiraidForm.elements[key].value=Array.isArray(config[key])?config[key].join("\\n"):"";
      }
    }
    function readAntiraidForm(){
      const config={action:antiraidForm.elements.action.value};
      for(const key of antiraidNumericFields){
        if(antiraidForm.elements[key])config[key]=Number(antiraidForm.elements[key].value);
      }
      for(const key of ["userWhitelist","userBlacklist","roleWhitelist","roleBlacklist"]){
        if(antiraidForm.elements[key])config[key]=antiraidForm.elements[key].value.split(/\\r?\\n/).map(value=>value.trim()).filter(Boolean);
      }
      return config;
    }
    const blockcmdDialog=document.getElementById("blockcmdDialog");
    const blockcmdForm=document.getElementById("blockcmdForm");
    const blockcmdFormFeedback=document.getElementById("blockcmdFormFeedback");
    let activeBlockcmdScope=null;
    function fillBlockcmdForm(config){
      blockcmdForm.elements.action.value=config.action||"reply";
      blockcmdForm.elements.message.value=config.message||"";
      blockcmdForm.elements.ignoreParent.checked=config.ignoreParent===true;
      blockcmdForm.elements.blockedCommands.value=Array.isArray(config.blockedCommands)?config.blockedCommands.join("\\n"):"";
    }
    function readBlockcmdForm(){
      return {
        action:blockcmdForm.elements.action.value,
        message:blockcmdForm.elements.message.value.trim()||null,
        ignoreParent:blockcmdForm.elements.ignoreParent.checked,
        blockedCommands:blockcmdForm.elements.blockedCommands.value.split(/[\\r\\n,]+/).map(value=>value.trim()).filter(Boolean)
      };
    }
    function setupWelcomeDialog(setting){
      const dialog=document.getElementById(setting+"Dialog");
      const form=document.getElementById(setting+"Form");
      const formFeedback=document.getElementById(setting+"FormFeedback");
      const mediaStatus=document.getElementById(setting+"MediaStatus");
      const mediaInput=form.elements.mediaFile;
      const uploadButton=dialog.querySelector("[data-upload-"+setting+"]");
      const removeButton=dialog.querySelector("[data-remove-"+setting+"]");
      const label=setting==="welcome"?"boas-vindas":"despedida";
      let activeScope=null;
      function setMedia(media){
        mediaStatus.textContent=media?(media.fileName||"Mídia configurada")+" · "+(media.type||"arquivo"):"Nenhuma mídia configurada.";
        removeButton.hidden=!media;
      }
      function showResult(result){
        feedback.classList.toggle("error",Boolean(result.announcementWarning));
        feedback.textContent=result.announcementWarning||result.message||"Configurações atualizadas.";
      }
      async function changeMedia(payload){
        const result=await requestAdminApi("/api/account/local/admin-"+setting+"-media",{scope:activeScope,...payload});
        setMedia(result.config.media);
        showResult(result);
      }
      async function open(button){
        activeScope=JSON.parse(button.dataset.scope||'{"level":"server"}');
        formFeedback.classList.remove("error");formFeedback.textContent="Carregando configurações...";
        document.getElementById(setting+"ScopeLabel").textContent=button.closest(".setting-card").querySelector(".setting-scope").textContent;
        dialog.showModal();
        try{
          const {config}=await requestAdminApi("/api/account/local/admin-"+setting+"-state",{scope:activeScope});
          form.elements.mode.value=config.mode||"texto";
          form.elements.text.value=config.text||"";
          setMedia(config.media);
          formFeedback.textContent="";
        }catch(error){formFeedback.classList.add("error");formFeedback.textContent=error.message}
      }
      dialog.querySelectorAll("[data-close-"+setting+"]").forEach(button=>button.addEventListener("click",()=>dialog.close()));
      dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
      uploadButton.addEventListener("click",async()=>{
        const file=mediaInput.files?.[0];
        if(!file){formFeedback.classList.add("error");formFeedback.textContent="Selecione uma imagem ou vídeo antes de enviar.";return}
        if(file.size>8*1024*1024){formFeedback.classList.add("error");formFeedback.textContent="A mídia deve ter até 8 MB.";return}
        uploadButton.disabled=true;formFeedback.classList.remove("error");formFeedback.textContent="Enviando mídia...";
        try{
          const data=await new Promise((resolve,reject)=>{
            const reader=new FileReader();
            reader.onload=()=>resolve(reader.result);
            reader.onerror=()=>reject(new Error("Não foi possível ler o arquivo selecionado."));
            reader.readAsDataURL(file);
          });
          await changeMedia({mimeType:file.type,data});
          mediaInput.value="";
          formFeedback.textContent="Mídia de "+label+" atualizada.";
        }catch(error){formFeedback.classList.add("error");formFeedback.textContent=error.message}
        finally{uploadButton.disabled=false}
      });
      removeButton.addEventListener("click",async()=>{
        if(!window.confirm("Remover a mídia configurada para "+label+" neste escopo?"))return;
        removeButton.disabled=true;formFeedback.classList.remove("error");formFeedback.textContent="Removendo mídia...";
        try{await changeMedia({remove:true});formFeedback.textContent="Mídia de "+label+" removida."}
        catch(error){formFeedback.classList.add("error");formFeedback.textContent=error.message}
        finally{removeButton.disabled=false}
      });
      form.addEventListener("submit",async event=>{
        event.preventDefault();
        const submitButton=form.querySelector('[type="submit"]');
        submitButton.disabled=true;formFeedback.classList.remove("error");formFeedback.textContent="Salvando...";
        try{
          const result=await requestAdminApi("/api/account/local/admin-"+setting,{scope:activeScope,config:{mode:form.elements.mode.value,text:form.elements.text.value}});
          setMedia(result.config.media);
          formFeedback.textContent="Configurações de "+label+" salvas.";
          showResult(result);
        }catch(error){formFeedback.classList.add("error");formFeedback.textContent=error.message}
        finally{submitButton.disabled=false}
      });
      return open;
    }
    const openWelcomeDialog=setupWelcomeDialog("welcome");
    const openGoodbyeDialog=setupWelcomeDialog("goodbye");
    const autodownloadDialog=document.getElementById("autodownloadDialog");
    const autodownloadForm=document.getElementById("autodownloadForm");
    const autodownloadFeedback=document.getElementById("autodownloadFormFeedback");
    let activeAutodownloadScope=null;
    function openAutodownloadDialog(button){
      activeAutodownloadScope=JSON.parse(button.dataset.scope||'{"level":"server"}');
      document.getElementById("autodownloadScopeLabel").textContent=button.closest(".setting-card").querySelector(".setting-scope").textContent;
      autodownloadFeedback.classList.remove("error");autodownloadFeedback.textContent="Carregando configurações...";
      autodownloadDialog.showModal();
      requestAdminApi("/api/account/local/admin-autodownload-state",{scope:activeAutodownloadScope}).then(({config})=>{
        autodownloadForm.elements.deletelink.checked=config.deletelink===true;
        autodownloadFeedback.textContent="";
      }).catch(error=>{autodownloadFeedback.classList.add("error");autodownloadFeedback.textContent=error.message});
    }
    autodownloadDialog.querySelectorAll("[data-close-autodownload]").forEach(button=>button.addEventListener("click",()=>autodownloadDialog.close()));
    autodownloadDialog.addEventListener("click",event=>{if(event.target===autodownloadDialog)autodownloadDialog.close()});
    autodownloadForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const submitButton=autodownloadForm.querySelector('[type="submit"]');
      submitButton.disabled=true;autodownloadFeedback.classList.remove("error");autodownloadFeedback.textContent="Salvando configurações...";
      try{
        const result=await requestAdminApi("/api/account/local/admin-autodownload",{scope:activeAutodownloadScope,config:{deletelink:autodownloadForm.elements.deletelink.checked}});
        autodownloadForm.elements.deletelink.checked=result.config.deletelink===true;
        autodownloadFeedback.textContent="Configurações do download automático salvas.";
        feedback.classList.toggle("error",Boolean(result.announcementWarning));
        feedback.textContent=result.announcementWarning||result.message||"Configurações atualizadas.";
      }catch(error){autodownloadFeedback.classList.add("error");autodownloadFeedback.textContent=error.message}
      finally{submitButton.disabled=false}
    });
    const autoApproveDialog=document.getElementById("autoApproveDialog");
    const autoApproveForm=document.getElementById("autoApproveForm");
    const autoApproveFeedback=document.getElementById("autoApproveFormFeedback");
    let activeAutoApproveScope=null;
    function openAutoApproveDialog(button){
      activeAutoApproveScope=JSON.parse(button.dataset.scope||'{"level":"server"}');
      document.getElementById("autoApproveScopeLabel").textContent=button.closest(".setting-card").querySelector(".setting-scope").textContent;
      autoApproveFeedback.classList.remove("error");autoApproveFeedback.textContent="Carregando configurações...";
      autoApproveDialog.showModal();
      requestAdminApi("/api/account/local/admin-autoApprove-state",{scope:activeAutoApproveScope}).then(({config})=>{
        autoApproveForm.elements.intervalSeconds.value=Number(config.intervalSeconds)||0;
        autoApproveForm.elements.blockedNames.value=Array.isArray(config.blockedNames)?config.blockedNames.join("\\n"):"";
        autoApproveForm.elements.blockedSymbols.value=Array.isArray(config.blockedSymbols)?config.blockedSymbols.join("\\n"):"";
        autoApproveForm.elements.schedules.value=Array.isArray(config.schedules)?config.schedules.map(item=>item.start+"-"+item.end).join("\\n"):"";
        autoApproveFeedback.textContent="";
      }).catch(error=>{autoApproveFeedback.classList.add("error");autoApproveFeedback.textContent=error.message});
    }
    autoApproveDialog.querySelectorAll("[data-close-autoApprove]").forEach(button=>button.addEventListener("click",()=>autoApproveDialog.close()));
    autoApproveDialog.addEventListener("click",event=>{if(event.target===autoApproveDialog)autoApproveDialog.close()});
    autoApproveForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const submitButton=autoApproveForm.querySelector('[type="submit"]');
      submitButton.disabled=true;autoApproveFeedback.classList.remove("error");autoApproveFeedback.textContent="Salvando configurações...";
      const readLines=field=>autoApproveForm.elements[field].value.split(/\\r?\\n/).map(value=>value.trim()).filter(Boolean);
      const schedules=readLines("schedules").map(value=>{
        const match=/^([01]\\d|2[0-3]):([0-5]\\d)-([01]\\d|2[0-3]):([0-5]\\d)$/.exec(value);
        return match?{start:match[1]+":"+match[2],end:match[3]+":"+match[4]}:{start:value,end:""};
      });
      try{
        const result=await requestAdminApi("/api/account/local/admin-autoApprove",{scope:activeAutoApproveScope,config:{
          intervalSeconds:Number(autoApproveForm.elements.intervalSeconds.value),
          blockedNames:readLines("blockedNames"),
          blockedSymbols:readLines("blockedSymbols"),
          schedules
        }});
        autoApproveFeedback.textContent="Configurações da autoaprovação salvas.";
        feedback.classList.toggle("error",Boolean(result.announcementWarning));
        feedback.textContent=result.announcementWarning||result.message||"Configurações atualizadas.";
      }catch(error){autoApproveFeedback.classList.add("error");autoApproveFeedback.textContent=error.message}
      finally{submitButton.disabled=false}
    });
    const rpManagerDialog=document.getElementById("rpManagerDialog");
    const rpManagerUsers=document.getElementById("rpManagerUsers");
    const rpManagerFeedback=document.getElementById("rpManagerFeedback");
    const rpXpSettings=document.getElementById("rpXpSettings");
    const rpXpDestination=document.getElementById("rpXpDestination");
    const rpResetSystem=document.getElementById("resetRpSystem");
    let activeRpSetting=null,activeRpScope=null;
    const rpLabels={economy:"Economia",xp:"Sistema de XP",activity:"Registro de atividade"};
    function appendRpAction(card,label,action,userId,amountInput){
      let actions=card.querySelector(".rp-user-actions");
      if(!actions){actions=document.createElement("div");actions.className="rp-user-actions";card.append(actions)}
      const button=document.createElement("button");button.type="button";button.className="moderation-action"+(action==="reset"?" danger":"");button.textContent=label;
      button.addEventListener("click",async()=>{
        const amount=amountInput?.value;
        if(action==="reset"&&!window.confirm("Confirma zerar/remover os dados deste usuário?"))return;
        button.disabled=true;rpManagerFeedback.classList.remove("error");rpManagerFeedback.textContent="Atualizando...";
        try{
          await requestAdminApi("/api/account/local/admin-rp-action",{scope:activeRpScope,setting:activeRpSetting,userId,action,amount});
          const refreshed=await loadRpUsers(document.getElementById("rpSearch").value);
          if(refreshed)rpManagerFeedback.textContent=action==="reset"?"Dados do usuário atualizados.":"Valor do usuário atualizado.";
          else rpManagerFeedback.textContent="Alteração salva, mas não foi possível atualizar a lista. Recarregue os dados.";
        }catch(error){rpManagerFeedback.classList.add("error");rpManagerFeedback.textContent=error.message}
        finally{button.disabled=false}
      });
      actions.append(button);
    }
    function renderRpUsers(users,total){
      rpManagerUsers.replaceChildren();
      if(!users.length){const empty=document.createElement("p");empty.className="warning-empty";empty.textContent="Nenhum registro encontrado.";rpManagerUsers.append(empty);return}
      users.forEach(user=>{
        const card=document.createElement("article");card.className="rp-user-card";card.style.cssText="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px 10px;padding:12px;border:1px solid var(--line);border-radius:10px;background:#ffffff05";
        const title=document.createElement("strong");title.textContent=user.displayName||user.username||user.userId;
        const savedUserLabel=user.username?(context.platform==="whatsapp"?"Nome salvo: "+user.username:"@"+user.username)+" · ":"";
        const id=document.createElement("small");id.textContent=savedUserLabel+"ID: "+user.userId;
        const detail=document.createElement("p");detail.textContent=user.detail;
        id.style.cssText="grid-column:1/-1;color:var(--muted);font-size:11px;overflow-wrap:anywhere";
        detail.style.cssText="margin:0;color:var(--muted);font-size:12px";
        card.append(title,id,detail);
        if(activeRpSetting==="economy"||activeRpSetting==="xp"){
          const field=document.createElement("input");field.type="number";field.min="0";field.step=activeRpSetting==="economy"?"0.01":"1";field.placeholder=activeRpSetting==="economy"?"Valor em SatCoins":"Quantidade de XP";field.setAttribute("aria-label","Valor para "+(user.displayName||user.userId));field.style.cssText="grid-column:1/-1;width:100%;padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:#0e121b;color:#f5f7fb;font:inherit";card.append(field);
          appendRpAction(card,"Definir","set",user.userId,field);
          appendRpAction(card,"Adicionar","add",user.userId,field);
          if(activeRpSetting==="economy"||activeRpSetting==="xp")appendRpAction(card,"Retirar","subtract",user.userId,field);
        }
        appendRpAction(card,activeRpSetting==="activity"?"Apagar registro":"Zerar valor","reset",user.userId,null);
        rpManagerUsers.append(card);
      });
      if(total>users.length){const more=document.createElement("p");more.className="warning-empty";more.textContent="Mostrando "+users.length+" de "+total+" registros. Refine a busca pelo nome ou ID.";rpManagerUsers.append(more)}
    }
    async function loadRpUsers(query=""){
      rpManagerFeedback.classList.remove("error");rpManagerFeedback.textContent="Carregando registros...";
      try{
        const result=await requestAdminApi("/api/account/local/admin-rp-state",{scope:activeRpScope,setting:activeRpSetting,query});
        renderRpUsers(result.users,result.total);
        rpManagerFeedback.textContent=result.total+" registro(s) encontrado(s).";
        return true;
      }catch(error){rpManagerFeedback.classList.add("error");rpManagerFeedback.textContent=error.message}
      return false;
    }
    async function openRpManager(button){
      activeRpSetting=button.dataset.rpConfig;
      activeRpScope=JSON.parse(button.dataset.scope||'{"level":"server"}');
      document.getElementById("rpManagerTitle").textContent=rpLabels[activeRpSetting]||"Gerenciar sistema";
      document.getElementById("rpManagerScopeLabel").textContent=button.closest(".setting-card").querySelector(".setting-scope").textContent;
      document.getElementById("rpXpDestinationLabel").textContent=context.platform==="discord"
        ?"Canal das mensagens de level-up"
        :"Tópico das mensagens de level-up";
      document.getElementById("rpManagerDescription").textContent=activeRpSetting==="activity"
        ?"Os registros são exibidos com os nomes salvos pelo sistema. Apagar remove o histórico desse usuário neste grupo. O reset total remove os registros de todos os membros."
        :activeRpSetting==="economy"
          ?"Os valores são salvos em centavos de SatCoins. Ajustar ou zerar o saldo não altera os demais dados da conta. O reset total zera os saldos de todos os membros."
          :"Ajuste a quantidade de XP sem apagar o nível ou os dados do usuário. Zerar preserva o registro e o nome; o reset total zera o XP de todos os membros.";
      rpXpSettings.hidden=activeRpSetting!=="xp";
      rpResetSystem.textContent="Resetar "+(activeRpSetting==="economy"?"economia":activeRpSetting==="xp"?"XP":"atividade")+" de todos";
      document.getElementById("rpSearch").value="";
      rpManagerFeedback.classList.remove("error");rpManagerFeedback.textContent="";
      rpManagerDialog.showModal();
      if(activeRpSetting==="xp"){
        try{
          const {config,destinations}=await requestAdminApi("/api/account/local/admin-xp-state",{scope:activeRpScope});
          document.getElementById("rpXpMuted").checked=config.muted;
          rpXpDestination.replaceChildren(new Option(context.platform==="discord"?"Onde o XP foi ganho":"Tópico onde o XP foi ganho",""));
          (destinations||[]).forEach(item=>rpXpDestination.add(new Option(item.name,item.id)));
          rpXpDestination.value=config.threadId||config.chatId||"";
          document.getElementById("rpXpDestinationHint").textContent=context.platform==="telegram"&&!(destinations||[]).length
            ?"Nenhum tópico conhecido. Envie uma mensagem em cada tópico para que ele apareça nesta lista."
            :"Deixe o destino padrão para avisar onde o XP foi ganho.";
        }catch(error){rpManagerFeedback.classList.add("error");rpManagerFeedback.textContent=error.message}
      }
      await loadRpUsers("");
    }
    rpResetSystem.addEventListener("click",async()=>{
      const resetName=activeRpSetting==="economy"?"todos os saldos da economia":activeRpSetting==="xp"?"o XP de todos os membros":"todos os registros de atividade";
      if(!window.confirm("Esta ação é irreversível e vai resetar "+resetName+" neste escopo. Deseja continuar?"))return;
      rpResetSystem.disabled=true;rpManagerFeedback.classList.remove("error");rpManagerFeedback.textContent="Resetando dados...";
      try{
        const result=await requestAdminApi("/api/account/local/admin-rp-action",{scope:activeRpScope,setting:activeRpSetting,action:"resetAll"});
        const refreshed=await loadRpUsers(document.getElementById("rpSearch").value);
        rpManagerFeedback.textContent=refreshed
          ?"Reset concluído para "+Number(result.result?.resetCount||0)+" registro(s)."
          :"Reset concluído para "+Number(result.result?.resetCount||0)+" registro(s), mas não foi possível atualizar a lista.";
        rpManagerFeedback.classList.toggle("error",!refreshed);
      }catch(error){rpManagerFeedback.classList.add("error");rpManagerFeedback.textContent=error.message}
      finally{rpResetSystem.disabled=false}
    });
    rpManagerDialog.querySelectorAll("[data-close-rp-manager]").forEach(button=>button.addEventListener("click",()=>rpManagerDialog.close()));
    rpManagerDialog.addEventListener("click",event=>{if(event.target===rpManagerDialog)rpManagerDialog.close()});
    document.getElementById("rpSearchForm").addEventListener("submit",event=>{
      event.preventDefault();loadRpUsers(document.getElementById("rpSearch").value);
    });
    document.getElementById("saveRpXpSettings").addEventListener("click",async event=>{
      const button=event.currentTarget;button.disabled=true;rpManagerFeedback.classList.remove("error");rpManagerFeedback.textContent="Salvando configurações de XP...";
      try{
        const result=await requestAdminApi("/api/account/local/admin-xp",{scope:activeRpScope,config:{muted:document.getElementById("rpXpMuted").checked,destination:rpXpDestination.value}});
        rpManagerFeedback.textContent=result.announcementWarning||"Configurações de XP salvas.";
        feedback.classList.toggle("error",Boolean(result.announcementWarning));
        feedback.textContent=result.announcementWarning||result.message||"Configurações atualizadas.";
      }catch(error){rpManagerFeedback.classList.add("error");rpManagerFeedback.textContent=error.message}
      finally{button.disabled=false}
    });
    const monitorDialog=document.getElementById("monitorDialog");
    const monitorForm=document.getElementById("monitorForm");
    const monitorFields=document.getElementById("monitorFormFields");
    const monitorFeedback=document.getElementById("monitorFormFeedback");
    let activeMonitorSetting=null,activeMonitorScope=null;
    const monitorLabels={monitorStock:"Monitor da bolsa",monitorCafe:"Monitor do café",monitorWeather:"Monitor do clima",monitorRandomWeather:"Previsão aleatória",monitorElection:"Monitor eleitoral"};
    function addMonitorLabel(parent,text,input,help=""){
      const label=document.createElement("label");label.append(document.createTextNode(text),input);
      if(help){const small=document.createElement("small");small.textContent=help;label.append(small)}
      parent.append(label);return input;
    }
    function createMonitorInput(type,value="",name=""){
      const input=document.createElement("input");input.type=type;input.value=value;
      if(name)input.name=name;
      return input;
    }
    function createMonitorTextarea(value,rows=4){
      const input=document.createElement("textarea");input.rows=rows;input.value=value;return input;
    }
    function createMonitorSelect(options,value){
      const select=document.createElement("select");
      options.forEach(([optionValue,label])=>select.add(new Option(label,optionValue)));
      select.value=value;return select;
    }
    function durationLabel(milliseconds){
      let remaining=Math.max(0,Number(milliseconds)||0),result="";
      for(const [unit,size] of [["d",86400000],["h",3600000],["m",60000],["s",1000]]){
        const amount=Math.floor(remaining/size);
        if(amount){result+=amount+unit;remaining-=amount*size}
      }
      return result||"0s";
    }
    function createElectionJobRow(job={}){
      const row=document.createElement("div");row.className="monitor-job";row.dataset.jobId=job.id||"";
      addMonitorLabel(row,"UF",createMonitorInput("text",job.state||""));row.lastChild.querySelector("input").maxLength=2;
      addMonitorLabel(row,"Município",createMonitorInput("text",job.municipality||""));row.lastChild.querySelector("input").maxLength=100;
      addMonitorLabel(row,"Termo de busca",createMonitorInput("text",job.query||""));row.lastChild.querySelector("input").maxLength=100;
      addMonitorLabel(row,"Consultar a cada",createMonitorInput("text",durationLabel(job.intervalMs||300000)));row.lastChild.querySelector("input").required=true;
      addMonitorLabel(row,"Atraso inicial",createMonitorInput("text",durationLabel(job.initialDelayMs??job.intervalMs??300000)));
      const remove=document.createElement("button");remove.type="button";remove.textContent="Remover consulta";remove.addEventListener("click",()=>row.remove());row.append(remove);
      return row;
    }
    function renderMonitorFields(setting,config){
      monitorFields.replaceChildren();
      const timesText=fallback=>(Array.isArray(config.times)&&config.times.length?config.times:fallback).join(", ");
      if(setting==="monitorStock"){
        const symbols=Array.isArray(config.symbols)?config.symbols:[];
        const allChecked=symbols.length===0;
        const allLabel=document.createElement("label"),all=document.createElement("input");all.type="checkbox";all.checked=allChecked;
        allLabel.append(all,document.createTextNode(" Acompanhar todos os ativos"));monitorFields.append(allLabel);
        const list=document.createElement("div");list.className="monitor-check-list";
        for(const asset of ${JSON.stringify(MARKET_ASSETS.map(({symbol,label})=>({symbol,label})))}){const label=document.createElement("label"),input=document.createElement("input");input.type="checkbox";input.name="symbols";input.value=asset.symbol;input.checked=allChecked||symbols.includes(asset.symbol);input.disabled=allChecked;label.append(input,document.createTextNode(asset.label));list.append(label)}
        all.addEventListener("change",()=>list.querySelectorAll('input[name="symbols"]').forEach(input=>{input.disabled=all.checked;if(all.checked)input.checked=true;else input.checked=false}));
        monitorFields.append(list);
        addMonitorLabel(monitorFields,"Horários diários (HH:MM, separados por vírgula)",createMonitorTextarea(timesText(["09:00"]),2),"O padrão é 09:00.");
      }else if(setting==="monitorCafe"){
        addMonitorLabel(monitorFields,"Modo",createMonitorSelect([["loop","Envio nos horários"],["monitor","Alertar quando o preço mudar"],["both","Horários e alertas de mudança"]],config.mode||"both"));
        const sources=new Set(Array.isArray(config.sources)?config.sources:[]),list=document.createElement("div");list.className="monitor-check-list";
        for(const source of ["Minasul","Coocafe","CCCMG"]){const label=document.createElement("label"),input=document.createElement("input");input.type="checkbox";input.name="sources";input.value=source;input.checked=sources.has(source);label.append(input,document.createTextNode(source));list.append(label)}
        monitorFields.append(list);
        addMonitorLabel(monitorFields,"Horários diários (HH:MM, separados por vírgula)",createMonitorTextarea(timesText(["07:00","13:00","20:00"]),2),"Usados nos modos de envio por horário.");
      }else if(setting==="monitorWeather"){
        addMonitorLabel(monitorFields,"Cidade",createMonitorInput("text",config.city||""),"Exemplo: São Paulo, SP. Máximo de 120 caracteres.");
        addMonitorLabel(monitorFields,"Horários diários (HH:MM, separados por vírgula)",createMonitorTextarea(timesText(["08:00"]),2),"O padrão é 08:00.");
      }else if(setting==="monitorRandomWeather"){
        addMonitorLabel(monitorFields,"Cidades (uma por linha)",createMonitorTextarea((Array.isArray(config.cities)?config.cities:[]).join("\\n"),6),"O monitor escolhe aleatoriamente entre as cidades cadastradas.");
        addMonitorLabel(monitorFields,"Horários diários (HH:MM, separados por vírgula)",createMonitorTextarea(timesText(["08:00"]),2),"O padrão é 08:00.");
      }else if(setting==="monitorElection"){
        const caption=document.createElement("p");caption.className="monitor-field-caption";caption.textContent="Consultas de apuração presidencial. Informe pelo menos uma UF, município ou termo de busca em cada consulta. Intervalo de 1 minuto a 30 dias; atraso inicial pode ser 0.";monitorFields.append(caption);
        const list=document.createElement("div");list.className="monitor-form-fields";list.id="monitorElectionJobs";
        (Array.isArray(config.jobs)?config.jobs:[]).forEach(job=>list.append(createElectionJobRow(job)));
        const add=document.createElement("button");add.type="button";add.textContent="Adicionar consulta";add.addEventListener("click",()=>{if(list.children.length<20)list.append(createElectionJobRow())});
        monitorFields.append(list,add);
      }
    }
    function splitMonitorList(value){return value.split(/[\\r\\n,]+/).map(item=>item.trim()).filter(Boolean)}
    function collectMonitorConfig(){
      if(activeMonitorSetting==="monitorStock"){
        const all=document.querySelector("#monitorFormFields > label input[type=checkbox]")?.checked;
        const symbols=all?[]:[...monitorFields.querySelectorAll('input[name="symbols"]:checked')].map(input=>input.value);
        if(!all&&!symbols.length)throw new Error("Selecione pelo menos um ativo ou marque todos os ativos.");
        return{symbols,times:splitMonitorList(monitorFields.querySelectorAll("textarea")[0].value)};
      }
      if(activeMonitorSetting==="monitorCafe")return{
        mode:monitorFields.querySelector("select").value,
        sources:[...monitorFields.querySelectorAll('input[name="sources"]:checked')].map(input=>input.value),
        times:splitMonitorList(monitorFields.querySelector("textarea").value)
      };
      if(activeMonitorSetting==="monitorWeather")return{city:monitorFields.querySelector("input").value.trim(),times:splitMonitorList(monitorFields.querySelector("textarea").value)};
      if(activeMonitorSetting==="monitorRandomWeather"){
        const fields=monitorFields.querySelectorAll("textarea");
        return{cities:splitMonitorList(fields[0].value),times:splitMonitorList(fields[1].value)};
      }
      if(activeMonitorSetting==="monitorElection"){
        const jobs=[...monitorFields.querySelectorAll(".monitor-job")].map(row=>{
          const inputs=row.querySelectorAll("input");
          return{id:row.dataset.jobId,state:inputs[0].value.trim(),municipality:inputs[1].value.trim(),query:inputs[2].value.trim(),interval:inputs[3].value.trim(),delay:inputs[4].value.trim()};
        });
        return{jobs};
      }
      throw new Error("Monitor inválido.");
    }
    async function openMonitorDialog(button){
      activeMonitorSetting=button.dataset.monitorSetting;
      activeMonitorScope=JSON.parse(button.dataset.scope||'{"level":"server"}');
      document.getElementById("monitorDialogTitle").textContent="Configurações: "+(monitorLabels[activeMonitorSetting]||"monitor");
      document.getElementById("monitorScopeLabel").textContent=button.closest(".setting-card").querySelector(".setting-scope").textContent;
      monitorForm.querySelector('[type="submit"]').disabled=true;
      monitorFields.replaceChildren();monitorFeedback.classList.remove("error");monitorFeedback.textContent="Carregando configurações...";
      monitorDialog.showModal();
      try{const {config}=await requestAdminApi("/api/account/local/admin-monitor-state",{setting:activeMonitorSetting,scope:activeMonitorScope});renderMonitorFields(activeMonitorSetting,config);monitorFeedback.textContent="";monitorForm.querySelector('[type="submit"]').disabled=false}
      catch(error){monitorFeedback.classList.add("error");monitorFeedback.textContent=error.message}
    }
    monitorDialog.querySelectorAll("[data-close-monitor]").forEach(button=>button.addEventListener("click",()=>monitorDialog.close()));
    monitorDialog.addEventListener("click",event=>{if(event.target===monitorDialog)monitorDialog.close()});
    monitorForm.addEventListener("submit",async event=>{
      event.preventDefault();const submitButton=monitorForm.querySelector('[type="submit"]');
      submitButton.disabled=true;monitorFeedback.classList.remove("error");monitorFeedback.textContent="Salvando configurações...";
      try{const result=await requestAdminApi("/api/account/local/admin-monitor",{setting:activeMonitorSetting,scope:activeMonitorScope,config:collectMonitorConfig()});
        renderMonitorFields(activeMonitorSetting,result.config);
        monitorFeedback.textContent="Configurações do "+(monitorLabels[activeMonitorSetting]||"monitor")+" salvas.";
        feedback.classList.toggle("error",Boolean(result.announcementWarning));feedback.textContent=result.announcementWarning||result.message||"Configurações atualizadas.";
      }catch(error){monitorFeedback.classList.add("error");monitorFeedback.textContent=error.message}
      finally{submitButton.disabled=false}
    });
    const schedulesDialog=document.getElementById("schedulesDialog");
    const scheduleList=document.getElementById("scheduleList");
    const scheduleForm=document.getElementById("scheduleForm");
    const scheduleFeedback=document.getElementById("scheduleFormFeedback");
    let activeScheduleScope=null,activeScheduleItems=[],activeScheduleMedia=null;
    function scheduleFormatDate(value){
      return value?new Date(value).toLocaleString("pt-BR"):"Não calculado";
    }
    function scheduleTriggerLabel(schedule){
      return schedule.trigger.type==="fixed"?"Horários: "+schedule.trigger.times.join(", "):"Intervalo: "+durationLabel(schedule.trigger.intervalMs);
    }
    function scheduleRepeatLabel(schedule){
      if(schedule.repeat.mode==="once")return"Uma vez";
      if(schedule.repeat.mode==="daily")return"Diariamente";
      if(schedule.repeat.mode==="monthly")return"Mensal · dia "+schedule.repeat.monthDay;
      const days=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
      return"Semanal · "+schedule.repeat.days.map(day=>days[day]).join(", ");
    }
    function renderScheduleList(){
      scheduleList.replaceChildren();
      if(!activeScheduleItems.length){
        const empty=document.createElement("p");empty.className="scope-note";empty.textContent="Nenhum agendamento neste escopo ainda.";scheduleList.append(empty);return;
      }
      for(const item of activeScheduleItems){
        const card=document.createElement("article");card.className="schedule-card";
        card.style.cssText="display:grid;gap:7px;padding:12px;border:1px solid var(--line);border-radius:12px;background:#ffffff05";
        const header=document.createElement("div");header.style.cssText="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px";
        const name=document.createElement("strong");name.textContent=item.name||"Sem nome";
        const status=document.createElement("span");status.className="state "+(item.enabled?"on":"off");status.textContent=item.enabled?(item.state.done?"Concluído":"Ativo"):"Inativo";
        header.append(name,status);
        const details=document.createElement("p");details.className="monitor-field-caption";details.textContent=scheduleTriggerLabel(item)+" · "+scheduleRepeatLabel(item);
        const next=document.createElement("p");next.className="monitor-field-caption";next.textContent=item.state.done?"Agendamento concluído. Próximo disparo: —":"Próximo disparo: "+scheduleFormatDate(item.state.nextFireAt)+" · Disparos: "+item.state.firedCount;
        const text=document.createElement("p");text.className="monitor-field-caption";text.textContent=item.message.mode==="media"?"Mensagem com mídia"+(item.message.media?" · "+(item.message.media.fileName||item.message.media.type):" · mídia pendente")+(item.message.text?" · "+item.message.text:""):(item.message.text||"Texto não configurado");
        const actions=document.createElement("div");actions.style.cssText="display:flex;flex-wrap:wrap;gap:7px";
        const addAction=(label,action,primary=false)=>{const button=document.createElement("button");button.type="button";button.dataset.scheduleAction=action;button.dataset.scheduleId=item.id;button.textContent=label;button.style.cssText="padding:7px 9px;border:1px solid "+(primary?"#9b8cff":"#6f7fa5")+";border-radius:9px;background:#ffffff0b;color:#f5f7fb;font-size:11px;font-weight:700;cursor:pointer";actions.append(button)};
        addAction("Editar","edit");addAction(item.enabled?"Desativar":"Ativar",item.enabled?"off":"on");addAction("Testar agora","test");addAction("Remover","delete");
        card.append(header,details,next,text,actions);scheduleList.append(card);
      }
    }
    function setScheduleMedia(media){
      activeScheduleMedia=media||null;
      document.getElementById("scheduleMediaStatus").textContent=activeScheduleMedia
        ?(activeScheduleMedia.fileName||"Mídia configurada")+" · "+(activeScheduleMedia.type||"arquivo")
        :"Nenhuma mídia configurada.";
      document.getElementById("removeScheduleMedia").hidden=!activeScheduleMedia;
    }
    function setScheduleFormFields(schedule=null){
      scheduleForm.reset();scheduleForm.hidden=false;
      scheduleForm.style.display="grid";
      scheduleForm.elements.id.value=schedule?.id||"";
      scheduleForm.elements.name.value=schedule?.name||"";
      scheduleForm.elements.triggerType.value=schedule?.trigger?.type||"fixed";
      scheduleForm.elements.times.value=(schedule?.trigger?.times||["09:00"]).join(", ");
      scheduleForm.elements.interval.value=durationLabel(schedule?.trigger?.intervalMs||3600000);
      scheduleForm.elements.repeatMode.value=schedule?.repeat?.mode||"daily";
      scheduleForm.elements.monthDay.value=schedule?.repeat?.monthDay||"";
      scheduleForm.elements.messageMode.value=schedule?.message?.mode||"text";
      scheduleForm.elements.text.value=schedule?.message?.text||"";
      scheduleForm.querySelectorAll('input[name="days"]').forEach(input=>{input.checked=(schedule?.repeat?.days||[]).includes(Number(input.value))});
      scheduleForm.elements.mediaFile.value="";
      setScheduleMedia(schedule?.message?.media||null);
      updateScheduleFormVisibility();
      scheduleFeedback.classList.remove("error");scheduleFeedback.textContent="";
      scheduleForm.scrollIntoView({block:"nearest"});
    }
    function updateScheduleFormVisibility(){
      const fixed=scheduleForm.elements.triggerType.value==="fixed";
      document.getElementById("scheduleFixedFields").hidden=!fixed;
      document.getElementById("scheduleIntervalFields").hidden=fixed;
      const weekdays=document.getElementById("scheduleWeekdayFields");
      weekdays.hidden=scheduleForm.elements.repeatMode.value!=="weekly";weekdays.style.display=weekdays.hidden?"none":"grid";
      const monthDay=document.getElementById("scheduleMonthDayField");
      monthDay.hidden=scheduleForm.elements.repeatMode.value!=="monthly";monthDay.style.display=monthDay.hidden?"none":"grid";
    }
    function collectScheduleConfig(){
      const triggerType=scheduleForm.elements.triggerType.value;
      const trigger=triggerType==="fixed"
        ?{type:"fixed",times:scheduleForm.elements.times.value.split(/[\\s,;]+/).map(value=>value.trim()).filter(Boolean)}
        :{type:"interval",interval:scheduleForm.elements.interval.value.trim()};
      const repeatMode=scheduleForm.elements.repeatMode.value;
      const repeat={mode:repeatMode};
      if(repeatMode==="weekly")repeat.days=[...scheduleForm.querySelectorAll('input[name="days"]:checked')].map(input=>Number(input.value));
      if(repeatMode==="monthly")repeat.monthDay=Number(scheduleForm.elements.monthDay.value);
      return{name:scheduleForm.elements.name.value,trigger,repeat,message:{mode:scheduleForm.elements.messageMode.value,text:scheduleForm.elements.text.value}};
    }
    async function loadAdminSchedules(){
      const {schedules}=await requestAdminApi("/api/account/local/admin-schedules-state",{scope:activeScheduleScope});
      activeScheduleItems=schedules;renderScheduleList();
      const current=activeScheduleItems.some(schedule=>schedule.enabled&&!schedule.state.done);
      for(const gear of document.querySelectorAll("[data-schedule-config]")){
        if(JSON.stringify(JSON.parse(gear.dataset.scope))!==JSON.stringify(activeScheduleScope))continue;
        const state=gear.closest(".setting-card")?.querySelector('[data-state="agendar"]');
        if(state){state.textContent=current?"Ativo":"Sem agendamentos ativos";state.classList.toggle("on",current);state.classList.toggle("off",!current)}
      }
    }
    async function openSchedulesDialog(button){
      activeScheduleScope=JSON.parse(button.dataset.scope||'{"level":"server"}');
      document.getElementById("schedulesScopeLabel").textContent=button.closest(".setting-card").querySelector(".setting-scope").textContent;
      scheduleForm.hidden=true;scheduleForm.style.display="none";scheduleFeedback.textContent="";
      schedulesDialog.showModal();
      try{await loadAdminSchedules()}
      catch(error){scheduleList.replaceChildren();const note=document.createElement("p");note.className="scope-note";note.textContent=error.message;scheduleList.append(note)}
    }
    async function uploadScheduleMedia(){
      const file=scheduleForm.elements.mediaFile.files?.[0];
      if(!file){scheduleFeedback.classList.add("error");scheduleFeedback.textContent="Selecione uma imagem ou vídeo.";return}
      if(file.size>8*1024*1024){scheduleFeedback.classList.add("error");scheduleFeedback.textContent="A mídia deve ter até 8 MB.";return}
      const uploadButton=document.getElementById("uploadScheduleMedia");uploadButton.disabled=true;
      scheduleFeedback.classList.remove("error");scheduleFeedback.textContent="Enviando mídia...";
      try{
        let scheduleId=scheduleForm.elements.id.value;
        if(!scheduleId){
          const created=await requestAdminApi("/api/account/local/admin-schedules",{scope:activeScheduleScope,action:"create",config:collectScheduleConfig()});
          scheduleId=created.schedule.id;scheduleForm.elements.id.value=scheduleId;
          await loadAdminSchedules();
        }
        const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error("Não foi possível ler o arquivo selecionado."));reader.readAsDataURL(file)});
        const result=await requestAdminApi("/api/account/local/admin-schedules-media",{scope:activeScheduleScope,id:scheduleId,fileName:file.name,mimeType:file.type,data});
        setScheduleMedia(result.schedule.message.media);scheduleForm.elements.mediaFile.value="";
        await loadAdminSchedules();scheduleFeedback.textContent="Mídia salva no armazenamento local do bot.";
      }catch(error){scheduleFeedback.classList.add("error");scheduleFeedback.textContent=error.message}
      finally{uploadButton.disabled=false}
    }
    document.getElementById("addSchedule").addEventListener("click",()=>setScheduleFormFields());
    document.getElementById("cancelScheduleEdit").addEventListener("click",()=>{scheduleForm.hidden=true;scheduleForm.style.display="none"});
    document.getElementById("uploadScheduleMedia").addEventListener("click",uploadScheduleMedia);
    document.getElementById("removeScheduleMedia").addEventListener("click",async()=>{
      const id=scheduleForm.elements.id.value;if(!id||!activeScheduleMedia)return;
      const button=document.getElementById("removeScheduleMedia");button.disabled=true;
      try{const result=await requestAdminApi("/api/account/local/admin-schedules",{scope:activeScheduleScope,action:"removeMedia",id});setScheduleMedia(result.schedule.message.media);await loadAdminSchedules();scheduleFeedback.textContent="Mídia removida."}
      catch(error){scheduleFeedback.classList.add("error");scheduleFeedback.textContent=error.message}
      finally{button.disabled=false}
    });
    scheduleForm.elements.triggerType.addEventListener("change",updateScheduleFormVisibility);
    scheduleForm.elements.repeatMode.addEventListener("change",updateScheduleFormVisibility);
    scheduleForm.addEventListener("submit",async event=>{
      event.preventDefault();const button=scheduleForm.querySelector('[type="submit"]');button.disabled=true;
      scheduleFeedback.classList.remove("error");scheduleFeedback.textContent="Salvando agendamento...";
      try{
        const id=scheduleForm.elements.id.value;
        const result=await requestAdminApi("/api/account/local/admin-schedules",{scope:activeScheduleScope,action:id?"update":"create",id,config:collectScheduleConfig()});
        scheduleForm.elements.id.value=result.schedule.id;setScheduleMedia(result.schedule.message.media);
        await loadAdminSchedules();scheduleFeedback.textContent=result.message||"Agendamento salvo.";
        feedback.classList.toggle("error",Boolean(result.announcementWarning));feedback.textContent=result.announcementWarning||result.message||"Agendamento atualizado.";
      }catch(error){scheduleFeedback.classList.add("error");scheduleFeedback.textContent=error.message}
      finally{button.disabled=false}
    });
    scheduleList.addEventListener("click",async event=>{
      const button=event.target.closest("[data-schedule-action]");if(!button)return;
      const schedule=activeScheduleItems.find(item=>item.id===button.dataset.scheduleId);if(!schedule)return;
      const action=button.dataset.scheduleAction;
      if(action==="edit"){setScheduleFormFields(schedule);return}
      if(action==="delete"&&!window.confirm('Remover o agendamento "'+schedule.name+'"?'))return;
      if(action==="test"&&!window.confirm("Enviar agora uma mensagem de teste para este chat?"))return;
      button.disabled=true;
      try{
        const result=await requestAdminApi("/api/account/local/admin-schedules",{scope:activeScheduleScope,action:action==="on"||action==="off"?"toggle":action,id:schedule.id,enabled:action==="on"});
        if(action!=="test"){
          await loadAdminSchedules();
          feedback.classList.toggle("error",Boolean(result.announcementWarning));feedback.textContent=result.announcementWarning||result.message||"Agendamento atualizado.";
        }else{feedback.classList.remove("error");feedback.textContent="Mensagem de teste enviada."}
      }catch(error){feedback.classList.add("error");feedback.textContent=error.message}
      finally{button.disabled=false}
    });
    schedulesDialog.querySelectorAll("[data-close-schedules]").forEach(button=>button.addEventListener("click",()=>schedulesDialog.close()));
    schedulesDialog.addEventListener("click",event=>{if(event.target===schedulesDialog)schedulesDialog.close()});
    const autorepoDialog=document.getElementById("autorepoDialog");
    const autorepoForm=document.getElementById("autorepoForm");
    const autorepoFeedback=document.getElementById("autorepoFormFeedback");
    const autorepoResponseList=document.getElementById("autorepoResponseList");
    let activeAutorespostaScope=null;
    function createAutorespostaRow(response={}){
      const card=document.createElement("article");
      card.className="autorepo-response-card";
      card.dataset.responseId=response.id||"";
      const fields=document.createElement("div");
      fields.className="autorepo-response-fields";
      const addField=(title,name,type,value,options)=>{
        const label=document.createElement("label");
        label.textContent=title;
        let input;
        if(type==="select"){
          input=document.createElement("select");
          options.forEach(([optionValue,optionLabel])=>input.add(new Option(optionLabel,optionValue)));
        }else{
          input=document.createElement(type==="textarea"?"textarea":"input");
          if(type==="textarea"){input.rows=3;label.classList.add("autorepo-content-field")}
          else input.type=type;
        }
        input.name=name;input.value=value;
        if(name==="trigger")input.maxLength=100;
        if(name==="content")input.maxLength=2000;
        if(name==="cooldown"){input.min=1;input.max=3600;input.step=1}
        label.append(input);fields.append(label);
      };
      addField("Gatilho","trigger","text",response.trigger||"");
      addField("Quando corresponde","matchType","select",response.matchType||"exact",[["exact","Mensagem exata"],["contains","Contém a frase"],["starts","Começa com"]]);
      addField("Ação","action","select",response.action||"reply",[["reply","Responder com texto"],["react","Reagir com emoji"]]);
      addField("Intervalo entre respostas (segundos)","cooldown","number",String(response.cooldown||5));
      addField("Texto ou emoji da resposta","content","textarea",response.content||"");
      const remove=document.createElement("button");
      remove.type="button";remove.className="autorepo-response-remove";remove.textContent="Remover";
      card.append(fields,remove);
      return card;
    }
    function renderAutorespostaRows(responses){
      autorepoResponseList.replaceChildren();
      if(!responses.length){
        const empty=document.createElement("p");empty.className="autorepo-empty";
        empty.textContent="Nenhuma resposta local cadastrada.";
        autorepoResponseList.append(empty);
        return;
      }
      responses.forEach(response=>autorepoResponseList.append(createAutorespostaRow(response)));
    }
    function openAutorespostaDialog(button){
      activeAutorespostaScope=JSON.parse(button.dataset.scope||'{"level":"server"}');
      document.getElementById("autorepoScopeLabel").textContent=button.closest(".setting-card").querySelector(".setting-scope").textContent;
      autorepoFeedback.classList.remove("error");autorepoFeedback.textContent="Carregando respostas...";
      autorepoDialog.showModal();
      requestAdminApi("/api/account/local/admin-autorepo-state",{scope:activeAutorespostaScope}).then(({config})=>{
        autorepoForm.elements.useGlobal.checked=config.useGlobal;
        document.getElementById("autorepoGlobalCount").textContent=String(config.globalCount);
        renderAutorespostaRows(config.responses);
        autorepoFeedback.textContent="";
      }).catch(error=>{autorepoFeedback.classList.add("error");autorepoFeedback.textContent=error.message});
    }
    document.getElementById("addAutoresposta").addEventListener("click",()=>{
      autorepoResponseList.querySelector(".autorepo-empty")?.remove();
      const row=createAutorespostaRow();
      autorepoResponseList.append(row);
      row.querySelector('[name="trigger"]').focus();
      row.scrollIntoView({block:"nearest"});
    });
    autorepoResponseList.addEventListener("click",event=>{
      const remove=event.target.closest(".autorepo-response-remove");
      if(!remove)return;
      remove.closest(".autorepo-response-card").remove();
      if(!autorepoResponseList.querySelector(".autorepo-response-card"))renderAutorespostaRows([]);
    });
    autorepoDialog.querySelectorAll("[data-close-autorepo]").forEach(button=>button.addEventListener("click",()=>autorepoDialog.close()));
    autorepoDialog.addEventListener("click",event=>{if(event.target===autorepoDialog)autorepoDialog.close()});
    autorepoForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const submitButton=autorepoForm.querySelector('[type="submit"]');
      const responses=[...autorepoResponseList.querySelectorAll(".autorepo-response-card")].map(card=>({
        id:card.dataset.responseId,
        trigger:card.querySelector('[name="trigger"]').value,
        matchType:card.querySelector('[name="matchType"]').value,
        action:card.querySelector('[name="action"]').value,
        cooldown:Number(card.querySelector('[name="cooldown"]').value),
        content:card.querySelector('[name="content"]').value
      }));
      submitButton.disabled=true;autorepoFeedback.classList.remove("error");autorepoFeedback.textContent="Salvando respostas...";
      try{
        const result=await requestAdminApi("/api/account/local/admin-autorepo",{scope:activeAutorespostaScope,config:{useGlobal:autorepoForm.elements.useGlobal.checked,responses}});
        renderAutorespostaRows(result.config.responses);
        document.getElementById("autorepoGlobalCount").textContent=String(result.config.globalCount);
        autorepoFeedback.textContent="Respostas automáticas salvas.";
        feedback.classList.toggle("error",Boolean(result.announcementWarning));
        feedback.textContent=result.announcementWarning||result.message||"Configurações atualizadas.";
      }catch(error){autorepoFeedback.classList.add("error");autorepoFeedback.textContent=error.message}
      finally{submitButton.disabled=false}
    });
    const store2Dialog=document.getElementById("store2Dialog");
    const store2Feedback=document.getElementById("store2Feedback");
    const store2DetailsForm=document.getElementById("store2DetailsForm");
    const store2ItemForm=document.getElementById("store2ItemForm");
    const store2ItemList=document.getElementById("store2Items");
    const store2OrderList=document.getElementById("store2Orders");
    const store2ItemSubmit=document.getElementById("store2ItemSubmit");
    const store2ItemCancel=document.getElementById("store2ItemCancel");
    let store2State=null;
    function showStore2Feedback(message,isError=false){
      store2Feedback.classList.toggle("error",isError);
      store2Feedback.textContent=message;
    }
    function renderStore2State(result){
      store2State=result;
      store2DetailsForm.elements.title.value=result.store.title;
      store2DetailsForm.elements.notice.value=result.store.notice;
      store2ItemList.replaceChildren();
      if(!result.store.items.length){
        const empty=document.createElement("p");empty.className="store2-empty";empty.textContent="Nenhum item cadastrado.";store2ItemList.append(empty);
      }
      result.store.items.forEach(item=>{
        const row=document.createElement("article"),title=document.createElement("h4"),detail=document.createElement("p"),actions=document.createElement("div"),edit=document.createElement("button"),remove=document.createElement("button");
        row.className="store2-row";title.textContent=item.name;
        detail.textContent="#"+item.id+" · "+item.category+" · "+formatStoreMoney(item.price)+" · Estoque: "+(item.quantity===null?"infinito":item.quantity);
        actions.className="store2-row-actions";edit.type="button";edit.textContent="Editar";edit.dataset.store2Edit=String(item.id);
        remove.type="button";remove.className="danger";remove.textContent="Remover";remove.dataset.store2Remove=String(item.id);
        actions.append(edit,remove);row.append(title,detail,actions);store2ItemList.append(row);
      });
      store2OrderList.replaceChildren();
      if(!result.orders.length){
        const empty=document.createElement("p");empty.className="store2-empty";empty.textContent="Nenhum pedido pendente.";store2OrderList.append(empty);
      }
      result.orders.forEach(order=>{
        const row=document.createElement("article"),title=document.createElement("h4"),detail=document.createElement("p"),actions=document.createElement("div"),deliver=document.createElement("button"),cancel=document.createElement("button");
        row.className="store2-row";title.textContent="#"+order.id+" · "+order.itemName;
        detail.textContent=(order.displayName||order.userId)+" · "+formatStoreMoney(order.price);
        actions.className="store2-row-actions";deliver.type="button";deliver.textContent="Marcar entregue";deliver.dataset.store2Order="delivered";deliver.dataset.orderId=String(order.id);
        cancel.type="button";cancel.className="danger";cancel.textContent="Cancelar e estornar";cancel.dataset.store2Order="cancelled";cancel.dataset.orderId=String(order.id);
        actions.append(deliver,cancel);row.append(title,detail,actions);store2OrderList.append(row);
      });
    }
    async function loadStore2State(){
      showStore2Feedback("Carregando configurações...");
      try{
        renderStore2State(await requestAdminApi("/api/account/local/admin-store2-state"));
        showStore2Feedback("");
      }catch(error){showStore2Feedback(error.message,true)}
    }
    async function saveStore2Action(payload,successMessage){
      showStore2Feedback("Salvando...");
      try{
        const result=await requestAdminApi("/api/account/local/admin-store2",payload);
        renderStore2State(result);
        showStore2Feedback(successMessage);
        return true;
      }catch(error){showStore2Feedback(error.message,true);return false}
    }
    function resetStore2ItemForm(){
      store2ItemForm.reset();store2ItemForm.elements.id.value="";
      store2ItemSubmit.textContent="Adicionar item";store2ItemCancel.hidden=true;
    }
    async function openStore2Dialog(button){
      const scopeLabel=button.closest(".setting-card")?.querySelector(".setting-scope")?.textContent||"Grupo ou servidor";
      document.getElementById("store2ScopeLabel").textContent=scopeLabel+" · catálogo e pedidos";
      resetStore2ItemForm();store2Dialog.showModal();await loadStore2State();
    }
    store2Dialog.querySelectorAll("[data-close-store2]").forEach(button=>button.addEventListener("click",()=>store2Dialog.close()));
    store2Dialog.addEventListener("click",event=>{if(event.target===store2Dialog)store2Dialog.close()});
    store2DetailsForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const button=store2DetailsForm.querySelector('[type="submit"]');button.disabled=true;
      const saved=await saveStore2Action({action:"details",title:store2DetailsForm.elements.title.value,notice:store2DetailsForm.elements.notice.value},"Título e aviso da loja atualizados.");
      if(!saved&&store2State){store2DetailsForm.elements.title.value=store2State.store.title;store2DetailsForm.elements.notice.value=store2State.store.notice}
      button.disabled=false;
    });
    store2ItemForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const button=store2ItemSubmit,id=store2ItemForm.elements.id.value;button.disabled=true;
      const item={name:store2ItemForm.elements.name.value,price:store2ItemForm.elements.price.value,category:store2ItemForm.elements.category.value,quantity:store2ItemForm.elements.quantity.value};
      const saved=await saveStore2Action({action:id?"edit":"add",itemId:id,item},id?"Item atualizado.":"Item cadastrado.");
      if(saved)resetStore2ItemForm();
      button.disabled=false;
    });
    store2ItemCancel.addEventListener("click",resetStore2ItemForm);
    store2ItemList.addEventListener("click",async event=>{
      const edit=event.target.closest("[data-store2-edit]");
      if(edit){
        const item=store2State?.store.items.find(candidate=>String(candidate.id)===edit.dataset.store2Edit);
        if(!item)return;
        store2ItemForm.elements.id.value=String(item.id);store2ItemForm.elements.name.value=item.name;
        store2ItemForm.elements.price.value=(item.price/100).toFixed(2);store2ItemForm.elements.category.value=item.category;
        store2ItemForm.elements.quantity.value=item.quantity===null?"infinito":String(item.quantity);
        store2ItemSubmit.textContent="Salvar alterações";store2ItemCancel.hidden=false;store2ItemForm.elements.name.focus();return;
      }
      const remove=event.target.closest("[data-store2-remove]");
      if(remove&&window.confirm("Remover este item do catálogo? Pedidos já realizados não serão alterados.")){
        remove.disabled=true;
        if(await saveStore2Action({action:"remove",itemId:remove.dataset.store2Remove},"Item removido do catálogo."))resetStore2ItemForm();
        remove.disabled=false;
      }
    });
    store2OrderList.addEventListener("click",async event=>{
      const button=event.target.closest("[data-store2-order]");
      if(!button)return;
      if(button.dataset.store2Order==="cancelled"&&!window.confirm("Cancelar este pedido e devolver o valor ao comprador?"))return;
      button.disabled=true;
      const successMessage=button.dataset.store2Order==="delivered"?"Pedido marcado como entregue.":"Pedido cancelado e valor estornado.";
      await saveStore2Action({action:button.dataset.store2Order,orderId:button.dataset.orderId},successMessage);
      button.disabled=false;
    });
    document.getElementById("rootSettings").addEventListener("click",event=>{
      const store2Gear=event.target.closest("[data-store2-config]");
      if(store2Gear){openStore2Dialog(store2Gear);return}
      const schedulesGear=event.target.closest("[data-schedule-config]");
      if(schedulesGear){openSchedulesDialog(schedulesGear);return}
      const monitorGear=event.target.closest("[data-monitor-config]");
      if(monitorGear){openMonitorDialog(monitorGear);return}
      const autodownloadGear=event.target.closest("[data-autodownload-config]");
      if(autodownloadGear){openAutodownloadDialog(autodownloadGear);return}
      const autoApproveGear=event.target.closest("[data-autoapprove-config]");
      if(autoApproveGear){openAutoApproveDialog(autoApproveGear);return}
      const rpGear=event.target.closest("[data-rp-config]");
      if(rpGear){openRpManager(rpGear);return}
      const autorepoGear=event.target.closest("[data-autorepo-config]");
      if(autorepoGear){openAutorespostaDialog(autorepoGear);return}
      const welcomeGear=event.target.closest("[data-welcome-config]");
      if(welcomeGear){openWelcomeDialog(welcomeGear);return}
      const goodbyeGear=event.target.closest("[data-goodbye-config]");
      if(goodbyeGear){openGoodbyeDialog(goodbyeGear);return}
      const blockcmdGear=event.target.closest("[data-blockcmd-config]");
      if(blockcmdGear){
        activeBlockcmdScope=JSON.parse(blockcmdGear.dataset.scope);
        blockcmdFormFeedback.classList.remove("error");blockcmdFormFeedback.textContent="Carregando configurações...";
        blockcmdDialog.showModal();
        requestAdminApi("/api/account/local/admin-blockcmd-state",{scope:activeBlockcmdScope}).then(({config})=>{
          fillBlockcmdForm(config);
          document.getElementById("blockcmdScopeLabel").textContent=blockcmdGear.closest(".setting-card").querySelector(".setting-scope").textContent;
          blockcmdFormFeedback.textContent="";
        }).catch(error=>{blockcmdFormFeedback.classList.add("error");blockcmdFormFeedback.textContent=error.message});
        return;
      }
      const antipalavrasGear=event.target.closest("[data-antipalavras-config]");
      if(antipalavrasGear){
        activeAntipalavrasScope=JSON.parse(antipalavrasGear.dataset.scope);
        antipalavrasFormFeedback.classList.remove("error");antipalavrasFormFeedback.textContent="Carregando configurações...";
        antipalavrasDialog.showModal();
        requestAdminApi("/api/account/local/admin-antipalavras-state",{scope:activeAntipalavrasScope}).then(({config})=>{
          fillAntipalavrasForm(config);
          document.getElementById("antipalavrasScopeLabel").textContent=antipalavrasGear.closest(".setting-card").querySelector(".setting-scope").textContent;
          antipalavrasFormFeedback.textContent="";
        }).catch(error=>{antipalavrasFormFeedback.classList.add("error");antipalavrasFormFeedback.textContent=error.message});
        return;
      }
      const antiraidGear=event.target.closest("[data-antiraid-config]");
      if(antiraidGear){
        activeAntiraidScope=JSON.parse(antiraidGear.dataset.scope);
        antiraidFormFeedback.classList.remove("error");antiraidFormFeedback.textContent="Carregando configurações...";
        antiraidDialog.showModal();
        requestAdminApi("/api/account/local/admin-antiraid-state",{scope:activeAntiraidScope}).then(({config})=>{
          fillAntiraidForm(config);
          document.getElementById("antiraidScopeLabel").textContent=antiraidGear.closest(".setting-card").querySelector(".setting-scope").textContent;
          antiraidFormFeedback.textContent="";
        }).catch(error=>{antiraidFormFeedback.classList.add("error");antiraidFormFeedback.textContent=error.message});
        return;
      }
      const antimediaGear=event.target.closest("[data-antimedia-config]");
      if(antimediaGear){
        activeAntimediaScope=JSON.parse(antimediaGear.dataset.scope);
        antimediaFormFeedback.classList.remove("error");antimediaFormFeedback.textContent="Carregando configurações...";
        antimediaDialog.showModal();
        requestAdminApi("/api/account/local/admin-antimedia-state",{scope:activeAntimediaScope}).then(({config})=>{
          fillAntimediaForm(config);
          const badge=antimediaGear.closest(".setting-card").querySelector(".setting-scope").textContent;
          document.getElementById("antimediaScopeLabel").textContent=badge;
          antimediaFormFeedback.textContent="";
        }).catch(error=>{antimediaFormFeedback.classList.add("error");antimediaFormFeedback.textContent=error.message});
        return;
      }
      const gear=event.target.closest("[data-antlink-config]");
      if(gear){
        activeAntilinkScope=JSON.parse(gear.dataset.scope);
        antilinkFormFeedback.classList.remove("error");antilinkFormFeedback.textContent="Carregando configurações...";
        antilinkDialog.showModal();
        requestAdminApi("/api/account/local/admin-antilink-state",{scope:activeAntilinkScope}).then(({config})=>{
          fillAntilinkForm(config);
          const badge=gear.closest(".setting-card").querySelector(".setting-scope").textContent;
          document.getElementById("antilinkScopeLabel").textContent=badge;
          antilinkFormFeedback.textContent="";
        }).catch(error=>{antilinkFormFeedback.classList.add("error");antilinkFormFeedback.textContent=error.message});
        return;
      }
      const button=event.target.closest("[data-setting]");
      if(button)saveSetting(button);
    });
    antilinkDialog.querySelectorAll("[data-close-antilink]").forEach(button=>button.addEventListener("click",()=>antilinkDialog.close()));
    antilinkDialog.addEventListener("click",event=>{if(event.target===antilinkDialog)antilinkDialog.close()});
    antimediaDialog.querySelectorAll("[data-close-antimedia]").forEach(button=>button.addEventListener("click",()=>antimediaDialog.close()));
    antimediaDialog.addEventListener("click",event=>{if(event.target===antimediaDialog)antimediaDialog.close()});
    antipalavrasDialog.querySelectorAll("[data-close-antipalavras]").forEach(button=>button.addEventListener("click",()=>antipalavrasDialog.close()));
    antipalavrasDialog.addEventListener("click",event=>{if(event.target===antipalavrasDialog)antipalavrasDialog.close()});
    antiraidDialog.querySelectorAll("[data-close-antiraid]").forEach(button=>button.addEventListener("click",()=>antiraidDialog.close()));
    antiraidDialog.addEventListener("click",event=>{if(event.target===antiraidDialog)antiraidDialog.close()});
    blockcmdDialog.querySelectorAll("[data-close-blockcmd]").forEach(button=>button.addEventListener("click",()=>blockcmdDialog.close()));
    blockcmdDialog.addEventListener("click",event=>{if(event.target===blockcmdDialog)blockcmdDialog.close()});
    antilinkForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const submitButton=antilinkForm.querySelector('[type="submit"]');
      submitButton.disabled=true;antilinkFormFeedback.classList.remove("error");antilinkFormFeedback.textContent="Salvando...";
      try{
        const result=await requestAdminApi("/api/account/local/admin-antilink",{scope:activeAntilinkScope,config:readAntilinkForm()});
        fillAntilinkForm(result.config);
        antilinkFormFeedback.textContent="Configurações do antilink salvas.";
        feedback.classList.toggle("error",Boolean(result.announcementWarning));
        feedback.textContent=result.announcementWarning||result.message||"Configurações atualizadas.";
      }catch(error){antilinkFormFeedback.classList.add("error");antilinkFormFeedback.textContent=error.message}
      finally{submitButton.disabled=false}
    });
    antimediaForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const submitButton=antimediaForm.querySelector('[type="submit"]');
      submitButton.disabled=true;antimediaFormFeedback.classList.remove("error");antimediaFormFeedback.textContent="Salvando...";
      try{
        const result=await requestAdminApi("/api/account/local/admin-antimedia",{scope:activeAntimediaScope,config:readAntimediaForm()});
        fillAntimediaForm(result.config);
        antimediaFormFeedback.textContent="Configurações do antimídia salvas.";
        feedback.classList.toggle("error",Boolean(result.announcementWarning));
        feedback.textContent=result.announcementWarning||result.message||"Configurações atualizadas.";
      }catch(error){antimediaFormFeedback.classList.add("error");antimediaFormFeedback.textContent=error.message}
      finally{submitButton.disabled=false}
    });
    antipalavrasForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const submitButton=antipalavrasForm.querySelector('[type="submit"]');
      submitButton.disabled=true;antipalavrasFormFeedback.classList.remove("error");antipalavrasFormFeedback.textContent="Salvando...";
      try{
        const result=await requestAdminApi("/api/account/local/admin-antipalavras",{scope:activeAntipalavrasScope,config:readAntipalavrasForm()});
        fillAntipalavrasForm(result.config);
        antipalavrasFormFeedback.textContent="Configurações do antipalavras salvas.";
        feedback.classList.toggle("error",Boolean(result.announcementWarning));
        feedback.textContent=result.announcementWarning||result.message||"Configurações atualizadas.";
      }catch(error){antipalavrasFormFeedback.classList.add("error");antipalavrasFormFeedback.textContent=error.message}
      finally{submitButton.disabled=false}
    });
    antiraidForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const submitButton=antiraidForm.querySelector('[type="submit"]');
      submitButton.disabled=true;antiraidFormFeedback.classList.remove("error");antiraidFormFeedback.textContent="Salvando...";
      try{
        const result=await requestAdminApi("/api/account/local/admin-antiraid",{scope:activeAntiraidScope,config:readAntiraidForm()});
        fillAntiraidForm(result.config);
        antiraidFormFeedback.textContent="Configurações do antiraid salvas.";
        feedback.classList.toggle("error",Boolean(result.announcementWarning));
        feedback.textContent=result.announcementWarning||result.message||"Configurações atualizadas.";
      }catch(error){antiraidFormFeedback.classList.add("error");antiraidFormFeedback.textContent=error.message}
      finally{submitButton.disabled=false}
    });
    blockcmdForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const submitButton=blockcmdForm.querySelector('[type="submit"]');
      submitButton.disabled=true;blockcmdFormFeedback.classList.remove("error");blockcmdFormFeedback.textContent="Salvando...";
      try{
        const result=await requestAdminApi("/api/account/local/admin-blockcmd",{scope:activeBlockcmdScope,config:readBlockcmdForm()});
        fillBlockcmdForm(result.config);
        blockcmdFormFeedback.textContent="Configurações do bloqueio de comandos salvas.";
        feedback.classList.toggle("error",Boolean(result.announcementWarning));
        feedback.textContent=result.announcementWarning||result.message||"Configurações atualizadas.";
      }catch(error){blockcmdFormFeedback.classList.add("error");blockcmdFormFeedback.textContent=error.message}
      finally{submitButton.disabled=false}
    });
    if(context.platform==="discord"){
      const categorySelect=document.getElementById("categorySelect"),channelSelect=document.getElementById("channelSelect"),channelPicker=document.getElementById("channelPicker");
      let discordCategories=[];
      const logsChannelSelect=document.getElementById("logsChannelSelect");
      requestAdminApi("/api/account/local/admin-systems-options").then(({categories,logChannels,logChannelId})=>{
        discordCategories=categories;
        for(const category of discordCategories){const option=document.createElement("option");option.value=category.id;option.textContent=category.name;categorySelect.append(option)}
        for(const channel of logChannels||[]){const option=document.createElement("option");option.value=channel.id;option.textContent=channel.name;logsChannelSelect.append(option)}
        logsChannelSelect.value=logChannelId||"";
      }).catch(error=>{feedback.classList.add("error");feedback.textContent=error.message});
      logsChannelSelect.addEventListener("change",async()=>{
        logsChannelSelect.disabled=true;feedback.classList.remove("error");feedback.textContent="";
        try{
          const result=await requestAdminApi("/api/account/local/admin-log-channel",{channelId:logsChannelSelect.value});
          logsChannelSelect.value=result.logChannelId||"";
          feedback.textContent=result.message;
        }catch(error){feedback.classList.add("error");feedback.textContent=error.message}
        finally{logsChannelSelect.disabled=false}
      });
      categorySelect.addEventListener("change",async()=>{
        channelPicker.hidden=!categorySelect.value;channelSelect.innerHTML='<option value="">Selecione um chat</option>';
        if(!categorySelect.value){
          if(scopeFilter.value==="server")loadScope({level:"server"});
          else showScopeMessage(document.getElementById("rootSettings"),"Selecione uma categoria para ver as configurações desse escopo.");
          return;
        }
        try{
          scopeFilter.value="categoria";
          await loadScope({level:"categoria",categoryId:categorySelect.value});
          const category=discordCategories.find(item=>item.id===categorySelect.value);
          for(const channel of category?.channels||[]){const option=document.createElement("option");option.value=channel.id;option.textContent=channel.name;channelSelect.append(option)}
        }catch(error){feedback.classList.add("error");feedback.textContent=error.message}
      });
      channelSelect.addEventListener("change",()=>{if(channelSelect.value){scopeFilter.value="chat";loadScope({level:"chat",categoryId:categorySelect.value,channelId:channelSelect.value})}});
      scopeFilter.addEventListener("change",()=>{
        if(scopeFilter.value==="server")loadScope({level:"server"});
        else if(scopeFilter.value==="categoria"&&categorySelect.value)loadScope({level:"categoria",categoryId:categorySelect.value});
        else if(scopeFilter.value==="chat"&&categorySelect.value&&channelSelect.value)loadScope({level:"chat",categoryId:categorySelect.value,channelId:channelSelect.value});
        else showScopeMessage(document.getElementById("rootSettings"),scopeFilter.value==="chat"?"Selecione uma categoria e um chat para ver as configurações desse escopo.":"Selecione uma categoria para ver as configurações desse escopo.");
      });
    }else if(context.platform==="telegram"){
      const topicSelect=document.getElementById("topicSelect");
      requestAdminApi("/api/account/local/admin-systems-options").then(({topics,isForum})=>{
        for(const topic of topics){const option=document.createElement("option");option.value=topic.id;option.textContent=topic.name;topicSelect.append(option)}
        if(!isForum){
          document.getElementById("topicPicker").hidden=true;
          scopeFilter.querySelector('option[value="topic"]').remove();
          document.getElementById("scopeNote").textContent="Este grupo não usa tópicos. As configurações são aplicadas somente ao grupo.";
        }else{
          document.getElementById("topicPicker").hidden=false;
          scopeFilter.querySelector('option[value="topic"]').hidden=false;
          if(!topics.length)document.getElementById("scopeNote").textContent="Nenhum tópico conhecido pelo bot. Os tópicos aparecerão aqui após o bot observar mensagens neles.";
        }
      }).catch(error=>{feedback.classList.add("error");feedback.textContent=error.message});
      topicSelect.addEventListener("change",()=>{if(topicSelect.value){scopeFilter.value="topic";loadScope({level:"topic",topicId:topicSelect.value})}});
      scopeFilter.addEventListener("change",()=>{
        if(scopeFilter.value==="server")loadScope({level:"server"});
        else if(topicSelect.value)loadScope({level:"topic",topicId:topicSelect.value});
        else showScopeMessage(document.getElementById("rootSettings"),"Selecione um tópico para ver as configurações desse escopo.");
      });
    }else if(context.platform==="whatsapp"){
      const communityOption=scopeFilter.querySelector('option[value="server"]');
      requestAdminApi("/api/account/local/admin-systems-options").then(({hasCommunity,communityName})=>{
        if(hasCommunity){
          communityOption.hidden=false;
          communityOption.textContent="Comunidade"+(communityName?" · "+communityName:"");
          document.getElementById("scopeNote").textContent="Selecione o grupo ou a comunidade. Os menus de configuração acompanham o escopo escolhido.";
        }
      }).catch(error=>{feedback.classList.add("error");feedback.textContent=error.message});
      scopeFilter.addEventListener("change",()=>loadScope({level:scopeFilter.value}));
    }
    const moderationFeedback=document.getElementById("moderationFeedback");
    const warningConfigForm=document.getElementById("warningConfigForm");
    const warningConfigFeedback=document.getElementById("warningConfigFeedback");
    const moderationResults=document.getElementById("moderationResults");
    const moderationSelected=document.getElementById("moderationSelected");
    const warningList=document.getElementById("warningList");
    const warningEmpty=document.getElementById("warningEmpty");
    const memberPicker=document.getElementById("memberPicker");
    const memberPickerList=document.getElementById("memberPickerList");
    const telegramLevels=${JSON.stringify(Object.entries(telegramAdminLevels).map(([id, level]) => ({ id, label: level.label })))};
    const actionDefinitions=[["warn","Advertir",false],...${JSON.stringify(immediateActionDefinitions)}];
    let selectedUser=null;
    let selectedAction=null;
    const permissionKey=action=>context.platform==="whatsapp"
      ? (action==="warn"?"manageGroup":"moderation")
      : action==="warn"?"manageMessages"
      : action==="kick"?"kick"
      : action==="ban"||action==="unban"?"ban"
      : "mute";
    function canRunAction(action,role){
      if(context.platform==="whatsapp"&&(action==="mute"||action==="unmute"||action==="unban"))return false;
      const key=permissionKey(action);
      return Boolean(moderationPermissions[role][key]);
    }
    async function moderationRequest(path,payload={}){
      const response=await fetch("/api/account/local/"+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...context,...payload})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Não foi possível concluir a solicitação.");
      return result;
    }
    function showModerationError(error){
      moderationFeedback.classList.add("error");moderationFeedback.textContent=error.message;
    }
    const formatWhatsAppId=value=>String(value||"").split("@")[0].split(":")[0];
    function moderationUserDetails(user){
      if(context.platform==="whatsapp"){
        const number=user.username?"Número: "+user.username:"Número não disponível";
        return user.label+" · "+number+" · ID: "+formatWhatsAppId(user.id);
      }
      return user.label+(user.username?" · "+user.username:"")+" · ID: "+user.id+(user.isBanned?" · Banido":"");
    }
    function renderSelected(){
      moderationSelected.replaceChildren();
      if(!selectedUser)return;
      const card=document.createElement("section");card.className="moderation-card";card.style.marginTop="14px";
      const title=document.createElement("h3");title.textContent=selectedUser.label;
      const identity=document.createElement("p");identity.className="moderation-help";identity.textContent=(context.platform==="whatsapp"
        ? (selectedUser.username?"Número: "+selectedUser.username+" · ":"")+"ID: "+formatWhatsAppId(selectedUser.id)
        : (selectedUser.username?selectedUser.username+" · ":"")+"ID: "+selectedUser.id)+(selectedUser.warningCount?" · Advertências: "+selectedUser.warningCount:"")+(selectedUser.isBanned?" · Banido":"");
      const actions=document.createElement("div");actions.className="moderation-actions";
      const actionForm=document.createElement("div");actionForm.className="moderation-fields";actionForm.hidden=true;
      function chooseAction(action){
        selectedAction=action;
        actions.querySelectorAll("[data-action]").forEach(button=>
          button.setAttribute("aria-pressed",String(button.dataset.action===action))
        );
        actionForm.replaceChildren();
        const definition=actionDefinitions.find(item=>item[0]===action);
        const label=definition?.[1] || action;
        if(["warn","kick","ban","mute"].includes(action)){
          const reasonLabel=document.createElement("label");reasonLabel.htmlFor="moderationReason";reasonLabel.textContent=action==="warn"?"Motivo da advertência (opcional)":"Motivo da ação (opcional)";
          const reason=document.createElement("textarea");reason.id="moderationReason";reason.maxLength=500;reason.placeholder="Informe o motivo";
          actionForm.append(reasonLabel,reason);
        }
        if(action==="mute"){
          const durationLabel=document.createElement("label");durationLabel.htmlFor="moderationDuration";durationLabel.textContent="Duração do silêncio";
          const duration=document.createElement("select");duration.id="moderationDuration";
          [[5,"5 minutos"],[10,"10 minutos"],[30,"30 minutos"],[60,"1 hora"],[360,"6 horas"],[1440,"24 horas"],[10080,"7 dias"]]
            .forEach(([minutes,text])=>duration.add(new Option(text,String(minutes))));
          duration.value="10";actionForm.append(durationLabel,duration);
        }
        const confirm=document.createElement("button");confirm.type="button";confirm.className="moderation-action"+(definition?.[2]?" danger":"");confirm.textContent=action==="ban"&&context.platform==="whatsapp"?"Confirmar remoção":"Confirmar "+label.toLowerCase();
        confirm.addEventListener("click",()=>runModerationAction(action,confirm));
        actionForm.append(confirm);actionForm.hidden=false;
      }
      actionDefinitions.forEach(([action,label,danger])=>{
        if(action==="unban"&&!selectedUser.isBanned)return;
        if((action==="kick"||action==="ban"||action==="mute"||action==="unmute")&&!selectedUser.isMember)return;
        const button=document.createElement("button");button.type="button";button.className="moderation-action"+(danger?" danger":"");button.textContent=label;
        const userCan=canRunAction(action,"user");
        const botCan=!danger||action==="removeWarnings"||canRunAction(action,"bot");
        button.disabled=!userCan||!botCan;
        if(!userCan)button.title="Sua conta não tem a permissão necessária.";
        else if(!botCan)button.title="O bot não tem a permissão necessária.";
        button.dataset.action=action;
        button.setAttribute("aria-pressed",String(selectedAction===action));
        button.addEventListener("click",()=>chooseAction(action));
        actions.append(button);
      });
      const memberAdmin=document.createElement("section");memberAdmin.className="member-admin";
      const memberAdminTitle=document.createElement("h4");memberAdminTitle.textContent=context.platform==="discord"?"Cargos do servidor":context.platform==="whatsapp"?"Administração do grupo":"Permissões administrativas";
      const memberAdminDescription=document.createElement("p");memberAdminDescription.className="moderation-help";
      memberAdminDescription.textContent=context.platform==="discord"
        ?"Atribua ou remova um cargo disponível no Discord."
        :context.platform==="whatsapp"
          ?"Promova o participante a administrador ou rebaixe-o para membro."
          :"Promova o usuário com um dos níveis de permissões do bot ou rebaixe-o para membro.";
      memberAdmin.append(memberAdminTitle,memberAdminDescription);
      const adminPermissionKey=context.platform==="whatsapp"?"manageGroup":"manageRoles";
      const canAdminUser=Boolean(moderationPermissions.user[adminPermissionKey]);
      const canAdminBot=Boolean(moderationPermissions.bot[adminPermissionKey]);
      function createMemberAdminButton(label,action,extra={},danger=false){
        const button=document.createElement("button");button.type="button";button.className="moderation-action"+(danger?" danger":"");button.textContent=label;button.disabled=!canAdminUser||!canAdminBot;
        if(!canAdminUser)button.title="Sua conta não tem a permissão necessária.";
        else if(!canAdminBot)button.title="O bot não tem a permissão necessária.";
        if(action){
          button.addEventListener("click",()=>{
            const options=action==="addRole"||action==="removeRole"
              ? { roleId:memberAdmin.querySelector(".moderation-role-select")?.value }
              : extra;
              if((action==="addRole"||action==="removeRole")&&!options.roleId){
                moderationFeedback.classList.add("error");moderationFeedback.textContent="Selecione um cargo.";
                return;
              }
              runMemberAdminAction(action,options,button);
          });
        }
        return button;
      }
      if(context.platform==="discord"){
        const loadRoles=createMemberAdminButton("Carregar cargos",null);
        loadRoles.disabled=!canAdminUser||!canAdminBot;
        loadRoles.addEventListener("click",async()=>{
          loadRoles.disabled=true;moderationFeedback.classList.remove("error");moderationFeedback.textContent="Carregando cargos...";
          try{
            const result=await moderationRequest("moderation-options");
            roleSelect.replaceChildren(new Option("Selecione um cargo",""));
            result.roles.forEach(role=>roleSelect.add(new Option(role.name,role.id)));
            roleSelect.hidden=false;roleActions.hidden=false;
            moderationFeedback.textContent=result.roles.length?"Selecione um cargo para atribuir ou remover.":"Não há cargos disponíveis abaixo do maior cargo do bot.";
          }catch(error){showModerationError(error)}
          finally{loadRoles.disabled=false}
        });
        const roleSelect=document.createElement("select");roleSelect.className="moderation-role-select";roleSelect.hidden=true;roleSelect.add(new Option("Selecione um cargo",""));
        const roleActions=document.createElement("div");roleActions.className="moderation-actions";roleActions.hidden=true;
        const addRole=createMemberAdminButton("Atribuir cargo","addRole");
        const removeRole=createMemberAdminButton("Remover cargo","removeRole",{},true);
        roleActions.append(addRole,removeRole);
        memberAdmin.append(loadRoles,roleSelect,roleActions);
      }else if(context.platform==="telegram"){
        const levelSelect=document.createElement("select");levelSelect.className="moderation-role-select";levelSelect.add(new Option("Selecione o nível",""));
        telegramLevels.forEach(level=>levelSelect.add(new Option(level.label,level.id)));
        const levelActions=document.createElement("div");levelActions.className="moderation-actions";
        const promote=createMemberAdminButton("Promover",null);
        promote.addEventListener("click",()=>{
          if(!levelSelect.value){moderationFeedback.classList.add("error");moderationFeedback.textContent="Selecione um nível de permissão.";return}
          runMemberAdminAction("promote",{level:levelSelect.value},promote);
        });
        levelActions.append(promote,createMemberAdminButton("Rebaixar para membro","demote",{},true));
        memberAdmin.append(levelSelect,levelActions);
      }else{
        const levelActions=document.createElement("div");levelActions.className="moderation-actions";
        levelActions.append(
          createMemberAdminButton("Promover a administrador","promote"),
          createMemberAdminButton("Rebaixar para membro","demote",{},true)
        );
        memberAdmin.append(levelActions);
      }
      card.append(title,identity,actions,actionForm);
      if(selectedUser.isMember)card.append(memberAdmin);
      moderationSelected.append(card);
    }
    async function selectModerationUser(user){
      selectedUser=user;selectedAction=null;renderSelected();
      moderationFeedback.classList.remove("error");moderationFeedback.textContent="Consultando permissões e estado no grupo...";
      try{
        const result=await moderationRequest("moderation-search",{query:user.id});
        const current=result.users.find(item=>item.id===user.id);
        if(current){selectedUser=current;renderSelected();moderationFeedback.textContent="Usuário localizado. Ações disponíveis conforme as permissões atuais.";}
        else moderationFeedback.textContent="Usuário não localizado como membro. Ainda é possível remover as advertências registradas.";
      }catch(error){showModerationError(error)}
    }
    function renderWarningRows(entries,total,max){
      warningList.replaceChildren();
      entries.forEach(item=>{
        const row=document.createElement("li"),identity=document.createElement("div"),name=document.createElement("strong"),id=document.createElement("small"),count=document.createElement("strong"),history=document.createElement("details"),summary=document.createElement("summary"),historyList=document.createElement("ul"),button=document.createElement("button");
        identity.className="warning-identity";name.textContent=item.name||item.userId;id.textContent="ID: "+item.userId;count.className="warning-count";count.textContent=item.count+"/"+max;button.type="button";button.className="moderation-action danger";button.textContent="Remover advertências";button.dataset.warningUser=item.userId;button.setAttribute("aria-label","Remover advertências de "+(item.name||item.userId));
        history.className="warning-history";summary.textContent="Ver motivos ("+item.count+")";history.append(summary);
        if(item.legacyCount){
          const legacy=document.createElement("li");legacy.textContent=item.legacyCount+" advertência(s) antiga(s) sem motivo registrado";historyList.append(legacy);
        }
        (item.records||[]).forEach(record=>{
          const entry=document.createElement("li");
          entry.append(document.createTextNode(record.reason||"Motivo não informado"));
          if(record.createdAt){
            const date=new Date(record.createdAt),time=document.createElement("small");
            time.textContent=Number.isNaN(date.getTime())?record.createdAt:date.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"});
            entry.append(time);
          }
          historyList.append(entry);
        });
        history.append(historyList);
        identity.append(name,id);row.append(identity,count,history,button);warningList.append(row);
      });
      warningEmpty.hidden=entries.length>0;
      document.getElementById("warningMore").hidden=total<=entries.length;
    }
    async function refreshWarnings(){
      const result=await moderationRequest("moderation-data");
      renderWarningRows(result.entries,result.total,result.max);
    }
    warningConfigForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const button=warningConfigForm.querySelector('button[type="submit"]');
      button.disabled=true;warningConfigFeedback.classList.remove("error");warningConfigFeedback.textContent="Salvando...";
      try{
        const result=await moderationRequest("moderation-config",{
          max:Number(warningConfigForm.elements.max.value),
          action:warningConfigForm.elements.action.value
        });
        warningConfigForm.elements.max.value=result.config.max;
        warningConfigForm.elements.action.value=result.config.action;
        warningConfigFeedback.textContent="Configuração de advertências salva.";
        try{await refreshWarnings()}
        catch(error){warningConfigFeedback.classList.add("error");warningConfigFeedback.textContent="Configuração salva, mas a lista de advertências não foi atualizada: "+error.message}
      }catch(error){warningConfigFeedback.classList.add("error");warningConfigFeedback.textContent=error.message}
      finally{button.disabled=false}
    });
    async function removeWarningFromList(userId,button){
      if(!window.confirm("Remover todas as advertências registradas para "+userId+"?"))return;
      button.disabled=true;moderationFeedback.classList.remove("error");moderationFeedback.textContent="";
      try{
        await moderationRequest("moderation-action",{userId,action:"removeWarnings"});
        if(selectedUser&&selectedUser.warningUserId===userId){selectedUser.warningCount=0;renderSelected()}
        try{
          await refreshWarnings();
          moderationFeedback.textContent="Advertências removidas.";
        }catch(error){
          moderationFeedback.classList.add("error");
          moderationFeedback.textContent="Advertências removidas, mas não foi possível atualizar a lista: "+error.message;
        }
      }catch(error){showModerationError(error);button.disabled=false}
    }
    async function runModerationAction(action,button){
      if(!selectedUser)return;
      const labels={kick:"expulsar",ban:"banir",unban:"desbanir"};
      if(labels[action]&&!window.confirm("Confirma "+labels[action]+" "+selectedUser.label+"?"))return;
      button.disabled=true;moderationFeedback.classList.remove("error");moderationFeedback.textContent="";
      try{
        const durationMinutes=Number(document.getElementById("moderationDuration")?.value||10);
        const result=await moderationRequest("moderation-action",{userId:selectedUser.id,action,reason:document.getElementById("moderationReason")?.value||"",durationMinutes});
        moderationFeedback.textContent=result.message||"Ação concluída.";
        selectedUser.warningCount=action==="warn"&&result.punished?0:action==="warn"?result.currentWarns:selectedUser.warningCount;
        selectedUser.isBanned=action==="ban"?context.platform!=="whatsapp":action==="unban"?false:selectedUser.isBanned;
        selectedUser.isMember=action==="kick"||action==="ban"||action==="unban"?false:selectedUser.isMember;
        if(action==="warn"&&result.punished){
          selectedUser.isBanned=result.punishmentAction==="ban"&&context.platform!=="whatsapp";
          selectedUser.isMember=false;
        }
        selectedAction=null;
        renderSelected();
        try{await refreshWarnings()}
        catch(error){moderationFeedback.classList.add("error");moderationFeedback.textContent="Ação concluída, mas não foi possível atualizar a lista de advertências: "+error.message}
      }catch(error){showModerationError(error);button.disabled=false}
    }
    async function runMemberAdminAction(action,options={},button=null){
      if(!selectedUser)return;
      const descriptions={
        promote:context.platform==="whatsapp"?"promover a administrador":context.platform==="telegram"?"promover com o nível "+options.level:"promover",
        demote:"rebaixar para membro",
        addRole:"atribuir o cargo selecionado",
        removeRole:"remover o cargo selecionado"
      };
      if(!window.confirm("Confirma "+descriptions[action]+" para "+selectedUser.label+"?"))return;
      if(button)button.disabled=true;
      moderationFeedback.classList.remove("error");moderationFeedback.textContent="";
      try{
        const result=await moderationRequest("moderation-action",{userId:selectedUser.id,action,...options});
        moderationFeedback.textContent=result.message||"Permissões atualizadas.";
      }catch(error){
        showModerationError(error);
        if(button)button.disabled=false;
      }
    }
    document.getElementById("moderationSearch").addEventListener("submit",async event=>{
      event.preventDefault();moderationFeedback.classList.remove("error");moderationFeedback.textContent="Buscando...";moderationResults.replaceChildren();moderationSelected.replaceChildren();selectedUser=null;selectedAction=null;
      try{
        const result=await moderationRequest("moderation-search",{query:document.getElementById("moderationQuery").value});
        if(!result.users.length){moderationFeedback.textContent="Nenhum usuário encontrado. Confira o ID/username e tente novamente.";return;}
        moderationFeedback.textContent=result.users.length+" resultado(s).";
        result.users.forEach(user=>{
          const row=document.createElement("div");row.className="moderation-result";const details=document.createElement("span");
          details.textContent=moderationUserDetails(user)+(user.isBanned?" · Banido":"");
          const button=document.createElement("button");button.type="button";button.textContent="Selecionar";button.addEventListener("click",()=>selectModerationUser(user));row.append(details,button);moderationResults.append(row);
        });
      }catch(error){showModerationError(error)}
    });
    if(context.platform==="whatsapp"){
      document.getElementById("loadMembers").addEventListener("click",async event=>{
        const button=event.currentTarget;button.disabled=true;moderationFeedback.classList.remove("error");moderationFeedback.textContent="Carregando participantes...";
        try{
          const result=await moderationRequest("moderation-search",{query:""});
          memberPickerList.replaceChildren();
          result.users.forEach(user=>{
            const card=document.createElement("article");card.className="moderation-result";card.style.cssText="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;width:100%";
            const details=document.createElement("span");details.textContent=moderationUserDetails(user);
            const select=document.createElement("button");select.type="button";select.textContent="Selecionar";select.addEventListener("click",()=>{
              moderationResults.replaceChildren();moderationSelected.replaceChildren();selectedUser=null;
              selectModerationUser(user);
            });
            card.append(details,select);memberPickerList.append(card);
          });
          memberPicker.hidden=false;
          moderationFeedback.textContent=result.users.length+" participante(s) carregado(s).";
        }catch(error){showModerationError(error)}
        finally{button.disabled=false}
      });
    }
    warningList.addEventListener("click",event=>{
      const button=event.target.closest("[data-warning-user]");
      if(button)removeWarningFromList(button.dataset.warningUser,button);
    });
  </script></body></html>`;
}

async function readProfile(url, { allowEmpty = false } = {}) {
  const platform = String(url.searchParams.get("plataforma") || url.searchParams.get("platform") || "discord").toLowerCase();
  const groupId = url.searchParams.get("grupo") || url.searchParams.get("group");
  const userId = url.searchParams.get("usuario") || url.searchParams.get("user");

  if (!["discord", "telegram", "whatsapp"].includes(platform) || !groupId || !userId) {
    return { error: "Informe grupo, usuario e plataforma válida para consultar o perfil." };
  }

  const message = profileMessage(platform, groupId, userId);
  const scope = economy.getScope(message);
  const groupName = await getGroupName(platform, groupId, scope);
  const account = economy.getAccountByUser(message, userId);
  const xpData = xp.load(message);
  const xpUser = xp.getUserById(message, userId);
  const activityResult = activity.ranking(message);
  const activityUser = activityResult?.users?.find(user => String(user.userId) === String(userId)) || null;
  const central = centralAccounts.findByPlatform(platform, userId);
  const nofap = central
    ? nofapHelper.getNofapStatus(central.id)
    : { active: false, currentDays: 0, recordDays: 0, totalResets: 0, title: "🌱 Iniciante" };
  const marriageStatuses = marriage.getMarriages(message, userId).map(currentMarriage => ({
    ...currentMarriage,
    duration: marriage.formatDuration(currentMarriage.marriedAt)
  }));
  const marriageStatus = marriageStatuses[0] || null;

  if (!scope || (!allowEmpty && !account && !xpUser && !activityUser)) {
    return { error: "Não encontrei um usuário ou grupo com esses identificadores." };
  }

  const xpValue = Number(xpUser?.xp) || 0;
  const activityPosition = activityUser
    ? activityResult.users.findIndex(user => String(user.userId) === String(userId)) + 1
    : null;
  const platformAccount = central?.platformAccounts?.find(item =>
    item.platform === platform && String(item.platformId) === String(userId)
  );
  return {
    platform,
    groupId,
    groupName,
    userId,
    avatarUrl: await getProfileAvatar(platform, groupId, userId),
    name: account?.displayName || account?.username || xpUser?.displayName || xpUser?.username ||
      activityUser?.displayName || activityUser?.username || platformAccount?.displayName ||
      platformAccount?.username || central?.name || "Usuário",
    economy: {
      exists: Boolean(account),
      balance: Number(account?.balance) || 0,
      position: account ? economy.getBalancePosition(message, userId) : null
    },
    xp: {
      exists: Boolean(xpUser),
      value: xpValue,
      level: xp.levelForXp(xpValue).level,
      position: xpUser ? xp.position(message, userId) : null
    },
    activity: {
      enabled: Boolean(activityResult?.enabled),
      total: Number(activityUser?.total) || 0,
      messages: Number(activityUser?.messages) || 0,
      commands: Number(activityUser?.commands) || 0,
      stickers: Number(activityUser?.stickers) || 0,
      files: Number(activityUser?.files) || 0,
      position: activityPosition
    },
    nofap,
    marriage: marriageStatus,
    marriages: marriageStatuses
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request, maxBytes = 8192) {
  let body = "";
  let bytesRead = 0;
  for await (const chunk of request) {
    bytesRead += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
    if (bytesRead > maxBytes) throw new Error("request-too-large");
    body += chunk;
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("invalid-json");
  }
}

function requestIsSecure(request) {
  return Boolean(request.socket.encrypted) ||
    String(request.headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase() === "https";
}

function isSameOriginRequest(request) {
  const origin = request.headers.origin;
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.host;
  } catch {
    return false;
  }
}

function isDashboardAccount(central) {
  return Boolean(
    central &&
    typeof central.id === "string" &&
    central.id &&
    Array.isArray(central.platformAccounts)
  );
}

async function getSessionCentral(request) {
  const cookieHeader = String(request.headers.cookie || "");
  const match = cookieHeader.match(/(?:^|;\s*)satbot_session=([a-f0-9]{64})(?:;|$)/);
  if (!match) return null;
  const session = webSessions.get(match[1]);
  if (session) {
    if (session.expiresAt <= Date.now()) {
      webSessions.delete(match[1]);
      return null;
    }
    const central = centralAccounts.getCentralById(session.centralId);
    if (!isDashboardAccount(central) ||
        !central.webAuth?.username ||
        !central.webAuth.passwordHash ||
        session.authVersion !== (central.webAuth.authVersion || 0)) {
      webSessions.delete(match[1]);
      return null;
    }
    return central;
  }
  const central = await centralAccounts.getCentralByRememberedWebSession(match[1]);
  return isDashboardAccount(central) ? central : null;
}

function createWebSession(centralId) {
  const sessionId = crypto.randomBytes(32).toString("hex");
  const central = centralAccounts.getCentralById(centralId);
  webSessions.set(sessionId, {
    centralId,
    authVersion: central?.webAuth?.authVersion || 0,
    expiresAt: Date.now() + WEB_SESSION_TTL_MS
  });
  return sessionId;
}

function getSessionCookie(sessionId, secure, rememberMe = false) {
  const maxAge = rememberMe
    ? REMEMBERED_WEB_SESSION_TTL_DAYS * 24 * 60 * 60
    : Math.floor(WEB_SESSION_TTL_MS / 1000);
  return `satbot_session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

function clearSessionCookie(secure) {
  return `satbot_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
}

function homeStyles() {
  return `:root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb;--text:#f5f7fb;--muted:#9da8bd;--line:#334366}*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:0 28px;background:radial-gradient(ellipse at 50% -18%,#344779 0,transparent 48%),radial-gradient(circle at 95% 82%,#432d67 0,transparent 30%),linear-gradient(155deg,#111522 0%,#0c1019 65%,#10121d 100%)}button,input{font-family:inherit}a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid #a99dff;outline-offset:3px}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}`;
}

function renderHome(botName, central = null, loginError = "") {
  const safeBotName = escapeHtml(botName);
  if (central) {
    const vipHelper = require("./vipHelper");
    const nofapStatus = nofapHelper.getNofapStatus(central.id);
    const vipStatus = vipHelper.getVipStatus(central.id);
    const vipLabel = vipStatus.permanent
      ? "Permanente"
      : vipStatus.active
        ? vipStatus.remainingText
        : "Não ativo";
    const platformLabels = { whatsapp: "WhatsApp", discord: "Discord", telegram: "Telegram" };
    const platformIcons = { whatsapp: "◉", discord: "◈", telegram: "➤" };
    const formatDate = value => {
        if (!value) return "—";
        const date = new Date(value);
        return Number.isNaN(date.getTime())
          ? escapeHtml(value)
          : escapeHtml(date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }));
    };
    const platforms = (central.platformAccounts || []).map(account => {
        const platform = String(account.platform || "");
        const label = platformLabels[platform] || platform;
        const name = account.displayName || account.username || account.platformId;
        return `<button class="platform-card" type="button" data-platform="${escapeHtml(platform)}" aria-label="Ver grupos e servidores vinculados ao ${escapeHtml(label)}"><span class="platform-icon ${escapeHtml(platform)}">${platformIcons[platform] || "◉"}</span><div class="platform-details"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(name || "Conta conectada")}</small><small class="platform-account-meta">ID: ${escapeHtml(account.platformId || "—")} · Vinculada em: ${formatDate(account.linkedAt)}</small></div><span class="connected">Conectada</span></button>`;
    }).join("");
    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>Dashboard · ${safeBotName}</title>
  <style>
    ${homeStyles()}
    .dashboard{width:min(1040px,100%);margin:0 auto;padding:38px 0 56px}
    .topbar{display:flex;align-items:center;justify-content:space-between;gap:20px;padding-bottom:26px;border-bottom:1px solid var(--line)}
    .brand{display:flex;align-items:center;gap:12px;font-weight:800;letter-spacing:.02em}
    .brand-mark{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;background:linear-gradient(145deg,#8f79ff,#536eff);box-shadow:0 8px 24px #645fff55;font-size:21px}
    .brand small{display:block;margin-top:2px;color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
    .top-actions{display:flex;align-items:center;gap:12px}
    .secure-badge,.connected{display:inline-flex;align-items:center;gap:7px;color:#9cf0cf;font-size:12px;font-weight:700}
    .secure-badge:before,.connected:before{content:"";width:7px;height:7px;border-radius:50%;background:#58d6a3;box-shadow:0 0 12px #58d6a377}
    .button{display:inline-flex;align-items:center;justify-content:center;gap:9px;border:1px solid var(--line);border-radius:12px;background:#ffffff08;color:var(--text);padding:11px 16px;font:inherit;font-size:14px;font-weight:700;text-decoration:none;cursor:pointer;transition:transform .18s ease,border-color .18s ease,background .18s ease}
    .button:hover{transform:translateY(-2px);border-color:#8599ff88;background:#8599ff12}
    .button.primary{border-color:transparent;background:linear-gradient(120deg,#8877ff,#577cff);box-shadow:0 10px 28px #6676ff38;color:white}
    .welcome{position:relative;overflow:hidden;margin:32px 0 22px;padding:34px;border:1px solid #6378c444;border-radius:24px;background:linear-gradient(115deg,#202a46 0%,#202844 58%,#302654 100%);box-shadow:0 22px 60px #06091355}
    .welcome:after{content:"";position:absolute;width:260px;height:260px;right:-70px;top:-135px;border:1px solid #ffffff16;border-radius:50%;box-shadow:0 0 0 30px #ffffff08,0 0 0 65px #ffffff05}
    .eyebrow{color:#b9c6ff;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}
    .welcome h1{position:relative;z-index:1;margin:12px 0 8px;font-size:clamp(30px,5vw,44px);letter-spacing:-.04em}
    .welcome p{position:relative;z-index:1;max-width:600px;margin:0;color:#c1c9df;line-height:1.7}
    .welcome strong{color:#fff}
    .section-heading{display:flex;align-items:end;justify-content:space-between;gap:18px;margin:30px 0 14px}
    .section-heading h2{margin:0;font-size:18px;letter-spacing:-.02em}
    .section-heading p{margin:5px 0 0;color:var(--muted);font-size:13px}
    .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
    .stat,.panel{border:1px solid var(--line);border-radius:18px;background:linear-gradient(145deg,#171d2b,#131925);box-shadow:0 12px 32px #06091328}
    .stat{padding:20px}
    .stat-label{display:flex;align-items:center;gap:9px;color:var(--muted);font-size:12px;font-weight:700;letter-spacing:.04em}
    .stat-icon{display:grid;place-items:center;width:30px;height:30px;border:1px solid #8e86ff30;border-radius:10px;background:#8375ff16;color:#b4aaff}
    .stat-value{margin-top:14px;font-size:18px;font-weight:800;overflow-wrap:anywhere}
    .stat-hint{margin-top:5px;color:#8290aa;font-size:12px}
    .account-layout{display:grid;grid-template-columns:1.2fr .8fr;gap:14px}
    .panel{padding:22px}
    .panel h2{margin:0;font-size:16px}
    .panel-intro{margin:5px 0 17px;color:var(--muted);font-size:13px}
    .platform-list{display:grid;gap:10px}
    .platform-card{display:flex;width:100%;align-items:center;gap:12px;padding:13px;border:1px solid #ffffff0c;border-radius:13px;background:#ffffff05;color:var(--text);text-align:left;cursor:pointer;transition:border-color .18s ease,background .18s ease}
    .platform-card:hover,.platform-card:focus-visible{border-color:#8599ff88;background:#8599ff12}
    .platform-icon{display:grid;place-items:center;width:38px;height:38px;flex:none;border-radius:12px;background:#8577ff20;color:#c0b8ff;font-size:20px;font-weight:800}
    .platform-icon.whatsapp{background:#2bc67920;color:#74e6a7}.platform-icon.telegram{background:#30a9dc20;color:#76d3f5}
    .platform-card strong,.platform-card small{display:block}.platform-card strong{font-size:13px}.platform-card small{max-width:210px;margin-top:3px;overflow:hidden;color:var(--muted);font-size:12px;text-overflow:ellipsis;white-space:nowrap}
    .platform-card .platform-details{min-width:0;flex:1}
    .platform-card .platform-account-meta{max-width:none;overflow-wrap:anywhere;white-space:normal;line-height:1.5}
    .platform-card .connected{margin-left:auto;white-space:nowrap;font-size:10px}
    .platform-card .connected:before{width:6px;height:6px}
    .vip-card{display:flex;min-height:100%;flex-direction:column;justify-content:space-between;background:radial-gradient(ellipse at top right,#7666ff23,transparent 55%),linear-gradient(145deg,#171d2b,#131925)}
    .vip-mark{display:grid;place-items:center;width:48px;height:48px;margin-bottom:18px;border:1px solid #f6c46a35;border-radius:15px;background:#f6c46a12;color:#ffd37f;font-size:23px}
    .vip-status{margin-top:18px;color:#e6c77f;font-size:21px;font-weight:800}
    .vip-note{margin-top:7px;color:var(--muted);font-size:12px;line-height:1.6}
    .nofap-overview{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:16px;margin-top:16px;padding:20px;border:1px solid #67d9ad30;border-radius:18px;background:radial-gradient(ellipse at top right,#43c99014,transparent 55%),linear-gradient(145deg,#171d2b,#131925)}
    .nofap-overview .vip-mark{margin:0;border-color:#67d9ad35;background:#43c99012;color:#8df0bf}
    .nofap-overview h2{margin:0;font-size:16px}
    .nofap-overview p{margin:5px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
    .nofap-overview strong{color:#9cf0cf;font-size:18px;text-align:right}
    .nofap-overview small{display:block;margin-top:5px;color:var(--muted);font-size:11px;font-weight:500}
    .account-menu{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    .account-action{display:flex;min-height:130px;flex-direction:column;align-items:flex-start;text-align:left;gap:10px;padding:18px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,#171d2b,#131925);color:var(--text);cursor:pointer;transition:transform .18s ease,border-color .18s ease}
    .account-action:hover{transform:translateY(-2px);border-color:#8599ff88}
    .account-action .stat-icon{width:34px;height:34px}
    .account-action strong{font-size:14px}
    .account-action small{color:var(--muted);font-size:12px;line-height:1.5}
    .account-dialog{max-width:510px;width:calc(100% - 40px);border:1px solid #3b4662;border-radius:20px;background:linear-gradient(145deg,#1c2438,#111521);color:var(--text);padding:24px;box-shadow:0 30px 100px #000b}
    .account-dialog::backdrop{background:#070a12c9;backdrop-filter:blur(5px)}
    .platform-dialog{max-width:620px}
    .platform-group-list{display:grid;max-height:min(55vh,480px);gap:9px;overflow:auto}
    .platform-group{display:flex;align-items:center;gap:12px;padding:13px;border:1px solid #ffffff0c;border-radius:12px;background:#ffffff05}
    .platform-group-icon{display:grid;width:34px;height:34px;flex:none;place-items:center;border-radius:10px;background:#8375ff16;color:#b4aaff}
    .platform-group strong,.platform-group small{display:block;overflow-wrap:anywhere}
    .platform-group strong{font-size:13px}
    .platform-group small{margin-top:4px;color:var(--muted);font-size:11px}
    .platform-group-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:11px}
    .platform-group .group-action-button{display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:8px 12px;border:1px solid #8795bd55;border-radius:10px;background:#ffffff08;color:#e9edfa;font-size:11px;font-weight:700;text-decoration:none;transition:transform .16s ease,border-color .16s ease,background .16s ease}
    .platform-group .group-action-button:hover,.platform-group .group-action-button:focus-visible{transform:translateY(-1px);border-color:#9c8cff;background:#8877ff20;outline:none}
    .platform-group .group-action-button.admin{border-color:#8c7cff66;background:linear-gradient(120deg,#8877ff28,#577cff20);color:#d8d2ff}
    .platform-group .group-action-button.admin:hover,.platform-group .group-action-button.admin:focus-visible{border-color:#a99dff;background:linear-gradient(120deg,#8877ff40,#577cff32)}
    .platform-group-status{min-height:22px;margin:12px 0 0;color:var(--muted);font-size:13px}
    .platform-group-status.error{color:#ff9caa}
    .account-dialog-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}
    .account-dialog-header h2{margin:0;font-size:20px}
    .account-dialog label{display:block;margin:13px 0 5px;color:#cbd3e5;font-size:12px;font-weight:700}
    .account-dialog input{box-sizing:border-box;width:100%;min-height:44px;border:1px solid #39445d;border-radius:11px;background:#0e1422;color:#fff;padding:10px 12px;font:inherit;outline:none}
    .account-dialog input:focus{border-color:#8b7bff;box-shadow:0 0 0 3px #8877ff25}
    .account-dialog .button{margin-top:17px}
    .account-panel[hidden]{display:none}
    .account-dialog-copy{color:#b9c4d9;font-size:13px;line-height:1.7}
    .account-dialog-copy code,.merge-code{display:block;margin:10px 0;padding:12px;border:1px solid var(--line);border-radius:10px;background:#0e1422;color:#c5baff;overflow-wrap:anywhere}
    .account-feedback{min-height:20px;margin:12px 0 0;color:#9cf0cf;font-size:13px;line-height:1.5}
    .account-feedback.error{color:#ff9caa}
    .password-recovery{margin-top:18px;padding-top:14px;border-top:1px solid var(--line)}
    .password-recovery summary{color:#b9c6ff;font-size:13px;font-weight:700;cursor:pointer}
    .password-recovery p{color:var(--muted);font-size:12px;line-height:1.7}
    footer{display:flex;justify-content:space-between;gap:12px;margin-top:28px;color:#71809d;font-size:12px}
    @media(max-width:720px){.dashboard{padding:22px 0 38px}.welcome{padding:26px}.stats{grid-template-columns:1fr}.account-layout{grid-template-columns:1fr}.account-menu{grid-template-columns:1fr}.account-action{min-height:0}.topbar{align-items:flex-start}.secure-badge{display:none}}
    @media(max-width:480px){.nofap-overview{grid-template-columns:auto 1fr}.nofap-overview strong{grid-column:2;text-align:left}}
    @media(max-width:420px){body{padding:0 18px}.topbar{padding-bottom:18px}.brand-mark{width:38px;height:38px}.button{padding:9px 11px;font-size:12px}.welcome{padding:23px 20px}.platform-card .connected{font-size:0}.platform-card .connected:before{width:8px;height:8px}}
  </style>
</head>
<body>
  <main class="dashboard">
    <nav class="topbar" aria-label="Navegação principal">
        <div class="brand"><span class="brand-mark">✦</span><span>${safeBotName}<small>PAINEL DA CONTA</small></span></div>
        <div class="top-actions"><span class="secure-badge">Sessão protegida</span><button class="button" id="logout" type="button">Sair <span aria-hidden="true">↗</span></button></div>
    </nav>
    <section class="welcome">
        <div class="eyebrow">Sua central de controle</div>
        <h1>Olá, ${escapeHtml(central.name || "por aqui")} <span aria-hidden="true">✦</span></h1>
        <p>Bem-vindo ao seu espaço no <strong>${safeBotName}</strong>. Aqui você pode consultar os dados da sua Conta Central e as plataformas conectadas.</p>
    </section>
    <section class="stats" aria-label="Resumo da conta">
        <article class="stat"><div class="stat-label"><span class="stat-icon">◈</span> ID CENTRAL</div><div class="stat-value">${escapeHtml(central.id)}</div><div class="stat-hint">Identificador único da sua conta</div></article>
        <article class="stat"><div class="stat-label"><span class="stat-icon">⌁</span> CRIADA EM</div><div class="stat-value">${formatDate(central.createdAt)}</div><div class="stat-hint">Sua jornada com o SatBot</div></article>
        <article class="stat"><div class="stat-label"><span class="stat-icon">◷</span> ÚLTIMA ATIVIDADE</div><div class="stat-value">${formatDate(central.lastActivityAt)}</div><div class="stat-hint">Atividade mais recente da conta</div></article>
    </section>
    <div class="section-heading"><div><h2>Visão geral</h2><p>Suas conexões e benefícios em um só lugar.</p></div></div>
    <section class="account-layout">
        <article class="panel">
          <h2>Plataformas conectadas</h2><p class="panel-intro">Contas vinculadas à sua Conta Central.</p>
          <div class="platform-list">${platforms || '<p class="panel-intro">Nenhuma plataforma conectada ainda.</p>'}</div>
        </article>
        <article class="panel vip-card">
          <div><span class="vip-mark" aria-hidden="true">✧</span><h2>Benefício VIP</h2><p class="panel-intro">Seu status atual no SatBot.</p></div>
          <div><div class="vip-status">${escapeHtml(vipLabel)}</div><p class="vip-note">Os benefícios da Conta Central acompanham você nas plataformas conectadas.</p></div>
        </article>
    </section>
    <section class="nofap-overview" aria-label="Seu status pessoal NoFap">
      <span class="vip-mark" aria-hidden="true">✦</span>
      <div><h2>Seu NoFap</h2><p>Contagem pessoal da Conta Central, válida em todas as plataformas.</p></div>
      <strong>${nofapStatus.active ? `${nofapStatus.currentDays} dias · ${escapeHtml(nofapStatus.title)}` : "Não iniciado"}<small>Recorde pessoal: ${nofapStatus.recordDays} dias · Resets: ${nofapStatus.totalResets}</small><small>${nofapStatus.startedAt ? `Iniciado em: ${formatDate(nofapStatus.startedAt)}` : "Sem sequência ativa"}${nofapStatus.lastResetAt ? ` · Último reset: ${formatDate(nofapStatus.lastResetAt)}` : ""}</small></strong>
    </section>
    <div class="section-heading"><div><h2>Gerenciar Conta Central</h2><p>Altere seus dados e conecte outras contas.</p></div></div>
    <section class="account-menu" aria-label="Opções da Conta Central">
        <button class="account-action" type="button" data-account-panel="password"><span class="stat-icon">⌑</span><strong>Redefinir senha</strong><small>Altere a senha usada para entrar no dashboard.</small></button>
        <button class="account-action" type="button" data-account-panel="merge"><span class="stat-icon">⛓</span><strong>Unir contas</strong><small>Gere um código para vincular outra plataforma à sua Conta Central.</small></button>
        <button class="account-action" type="button" data-account-panel="name"><span class="stat-icon">✎</span><strong>Mudar nome central</strong><small>Atualize o nome compartilhado entre suas plataformas.</small></button>
    </section>
    <footer><span>${safeBotName} · Seu bot, suas comunidades.</span><span>Área pessoal</span></footer>
  </main>
  <dialog class="account-dialog platform-dialog" id="platformDialog">
    <div class="account-dialog-header"><h2 id="platformDialogTitle">Grupos e servidores</h2><button class="icon-button" id="closePlatformDialog" type="button" aria-label="Fechar">×</button></div>
    <div class="platform-group-list" id="platformGroupList"></div>
    <p class="platform-group-status" id="platformGroupStatus" role="status" aria-live="polite"></p>
  </dialog>
  <dialog class="account-dialog" id="accountDialog">
    <div class="account-dialog-header"><h2 id="accountDialogTitle">Conta Central</h2><button class="icon-button" id="closeAccountDialog" type="button" aria-label="Fechar">×</button></div>
    <section class="account-panel" data-panel="password" hidden>
        <p class="account-dialog-copy">Confirme sua senha atual e informe a nova senha duas vezes. A senha precisa ter pelo menos 8 caracteres.</p>
        <form id="passwordChangeForm">
          <label for="currentPassword">Senha atual</label><input id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" required>
          <label for="newPassword">Nova senha</label><input id="newPassword" name="newPassword" type="password" autocomplete="new-password" minlength="8" required>
          <label for="confirmPassword">Confirme a nova senha</label><input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required>
          <button class="button primary" type="submit">Atualizar senha</button>
        </form>
        <p class="account-feedback" id="passwordFeedback" role="status"></p>
        <details class="password-recovery"><summary>Não lembro a senha atual</summary><p>Abra o privado do bot em uma plataforma vinculada à sua Conta Central — WhatsApp, Telegram ou Discord — e envie:<code>${escapeHtml(config.getPrefix())}redefinir_senha</code>O bot enviará um link de uso único para definir um novo usuário e senha diretamente na página. Use o comando somente no privado e não compartilhe o link.</p></details>
    </section>
    <section class="account-panel" data-panel="merge" hidden>
        <p class="account-dialog-copy">Gere um código temporário desta Conta Central. Depois, no privado do bot pela outra plataforma que deseja vincular, use o comando abaixo. O código expira em 24 horas e só pode ser usado uma vez.</p>
        <button class="button primary" id="generateMergeCode" type="button">Gerar código de vínculo</button>
        <p class="account-feedback" id="mergeFeedback" role="status"></p>
        <code class="merge-code" id="mergeCode" hidden></code>
    </section>
    <section class="account-panel" data-panel="name" hidden>
        <p class="account-dialog-copy">Este nome é compartilhado pela sua Conta Central nas plataformas vinculadas.</p>
        <form id="centralNameForm">
          <label for="centralName">Novo nome central</label><input id="centralName" name="centralName" maxlength="40" value="${escapeHtml(central.name || "")}" required>
          <button class="button primary" type="submit">Salvar nome</button>
        </form>
        <p class="account-feedback" id="nameFeedback" role="status"></p>
    </section>
  </dialog>
  <script>
    const platformDialog=document.getElementById("platformDialog");
    const platformGroupList=document.getElementById("platformGroupList");
    const platformGroupStatus=document.getElementById("platformGroupStatus");
    const platformLabels={whatsapp:"WhatsApp",discord:"Discord",telegram:"Telegram"};
    document.querySelectorAll("[data-platform]").forEach(button=>button.addEventListener("click",async()=>{
        const platform=button.dataset.platform;
        platformGroupList.replaceChildren();
        platformGroupStatus.classList.remove("error");
        platformGroupStatus.textContent="Carregando grupos e servidores...";
        document.getElementById("platformDialogTitle").textContent="Conexões do "+(platformLabels[platform]||platform);
        platformDialog.showModal();
        try{
          const response=await fetch("/api/account/platform-groups",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({platform})});
          const result=await response.json();
          if(!response.ok)throw new Error(result.error||"Não foi possível carregar os grupos.");
          if(!result.groups.length){
            platformGroupStatus.textContent="Nenhum grupo ou servidor encontrado para esta conta.";
            return;
          }
          platformGroupList.replaceChildren(...result.groups.map(group=>{
            const item=document.createElement("article");
            item.className="platform-group";
            const icon=document.createElement("span");
            icon.className="platform-group-icon";
            icon.setAttribute("aria-hidden","true");
            icon.textContent=group.type==="server"?"◈":"#";
            const details=document.createElement("div");
            const name=document.createElement("strong");
            name.textContent=group.name;
            const id=document.createElement("small");
            id.textContent=(group.type==="server"?"Servidor":"Grupo")+" · ID: "+group.id;
            const actions=document.createElement("div");
            actions.className="platform-group-actions";
            const open=document.createElement("a");
            open.className="group-action-button";
            open.textContent="Painel do membro";
            open.href="/painel-local?plataforma="+encodeURIComponent(platform)+"&grupo="+encodeURIComponent(group.id);
            actions.append(open);
            if(group.canManage){
              const admin=document.createElement("a");
              admin.className="group-action-button admin";
              admin.textContent="Painel de administração";
              admin.href="/painel-admin?plataforma="+encodeURIComponent(platform)+"&grupo="+encodeURIComponent(group.id);
              actions.append(admin);
            }
            details.append(name,id,actions);
            item.append(icon,details);
            return item;
          }));
          platformGroupStatus.textContent="Encontrados "+result.groups.length+" grupo(s)/servidor(es).";
        }catch(error){
          platformGroupStatus.classList.add("error");
          platformGroupStatus.textContent=error.message;
        }
    }));
    document.getElementById("closePlatformDialog").addEventListener("click",()=>platformDialog.close());
    const accountDialog=document.getElementById("accountDialog");
    const accountPanels=[...document.querySelectorAll("[data-panel]")];
    const accountTitles={password:"Redefinir senha",merge:"Unir contas","name":"Mudar nome central"};
    document.querySelectorAll("[data-account-panel]").forEach(button=>button.addEventListener("click",()=>{
        const panel=button.dataset.accountPanel;
        accountPanels.forEach(section=>section.hidden=section.dataset.panel!==panel);
        document.getElementById("accountDialogTitle").textContent=accountTitles[panel];
        accountDialog.showModal();
    }));
    document.getElementById("closeAccountDialog").addEventListener("click",()=>accountDialog.close());
    async function submitAccountAction(path,payload){
        const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
        const result=await response.json();
        if(!response.ok)throw new Error(result.error||"Não foi possível concluir a ação.");
        return result;
    }
    function showFeedback(element,error,message){
        element.textContent=message;
        element.classList.toggle("error",Boolean(error));
    }
    document.getElementById("passwordChangeForm").addEventListener("submit",async event=>{
        event.preventDefault();
        const form=event.currentTarget,feedback=document.getElementById("passwordFeedback");
        showFeedback(feedback,false,"");
        try{
          await submitAccountAction("/api/account/password",{currentPassword:document.getElementById("currentPassword").value,newPassword:document.getElementById("newPassword").value,confirmPassword:document.getElementById("confirmPassword").value});
          form.reset();
          showFeedback(feedback,false,"Senha atualizada. As outras sessões persistentes foram encerradas.");
        }catch(error){showFeedback(feedback,true,error.message)}
    });
    document.getElementById("generateMergeCode").addEventListener("click",async event=>{
        const button=event.currentTarget,feedback=document.getElementById("mergeFeedback"),codeElement=document.getElementById("mergeCode");
        button.disabled=true;codeElement.hidden=true;showFeedback(feedback,false,"");
        try{
          const result=await submitAccountAction("/api/account/merge-code",{});
          codeElement.textContent=result.code+" · Expira em "+new Date(result.expiresAt).toLocaleString("pt-BR");
          codeElement.hidden=false;
          showFeedback(feedback,false,"No privado da outra plataforma vinculada, confirme com: "+${JSON.stringify(config.getPrefix())}+"unir_contas login "+result.code);
        }catch(error){showFeedback(feedback,true,error.message)}
        finally{button.disabled=false}
    });
    document.getElementById("centralNameForm").addEventListener("submit",async event=>{
        event.preventDefault();
        const form=event.currentTarget,feedback=document.getElementById("nameFeedback");
        showFeedback(feedback,false,"");
        try{
          const result=await submitAccountAction("/api/account/name",{name:document.getElementById("centralName").value});
          document.querySelector(".welcome h1").textContent="Olá, "+result.name+" ✦";
          showFeedback(feedback,false,"Nome central atualizado.");
        }catch(error){showFeedback(feedback,true,error.message)}
    });
    document.getElementById("logout").addEventListener("click",async()=>{await fetch("/api/logout",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});location.href="/"});
  </script>
</body>
</html>`;
  }

  const usesHttp = config.getWebProtocol() !== "https";
  const help = `Para criar ou redefinir seu usuário e senha, abra o privado do bot e envie:<br><code>${escapeHtml(config.getPrefix())}redefinir_senha</code><br>O bot enviará um link temporário e de uso único para você definir as credenciais diretamente nesta página. Depois, entre usando seu usuário ou ID central. O comando só funciona no privado para proteger o link.`;
  const securityNotice = usesHttp
    ? `<aside class="warning"><span class="warning-icon" aria-hidden="true">!</span><p><strong>Aviso de segurança: conexão HTTP sem criptografia</strong><br>Os dados enviados entre seu navegador e o painel — incluindo a senha no login e o link automático — não são criptografados no trajeto. Pessoas com acesso à rede ou ao caminho da conexão podem conseguir interceptá-los. Use uma senha exclusiva para o SatBot; nunca reutilize senhas de redes sociais, e-mail ou outros serviços. Não compartilhe o link temporário de login.</p></aside>`
    : "";
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>${safeBotName}</title>
  <style>
    ${homeStyles()}
    .landing{width:min(1080px,100%);min-height:100vh;margin:auto;display:flex;flex-direction:column}
    .topbar{display:flex;align-items:center;justify-content:space-between;padding:27px 0}
    .brand{display:flex;align-items:center;gap:12px;font-weight:800;letter-spacing:.02em}
    .brand-mark{width:42px;height:42px;display:grid;place-items:center;border-radius:14px;background:linear-gradient(145deg,#8f79ff,#536eff);box-shadow:0 8px 24px #645fff55;font-size:21px}
    .brand small{display:block;margin-top:2px;color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
    .top-link{color:#aab5d0;font-size:13px;text-decoration:none}.top-link:hover{color:#fff}
    .hero{position:relative;display:grid;grid-template-columns:1.15fr .85fr;align-items:center;gap:45px;overflow:hidden;margin:auto 0 42px;padding:clamp(28px,6vw,66px);border:1px solid #6378c444;border-radius:28px;background:linear-gradient(115deg,#202a46 0%,#202844 58%,#302654 100%);box-shadow:0 26px 80px #06091366}
    .hero:after{content:"";position:absolute;width:350px;height:350px;right:-90px;top:-190px;border:1px solid #ffffff16;border-radius:50%;box-shadow:0 0 0 34px #ffffff08,0 0 0 72px #ffffff05}
    .eyebrow{display:inline-flex;align-items:center;gap:8px;color:#b9c6ff;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}
    .eyebrow:before{content:"";width:7px;height:7px;border-radius:50%;background:#7f8cff;box-shadow:0 0 13px #8a83ff}
    .hero h1{max-width:590px;margin:18px 0 14px;font-size:clamp(40px,6vw,68px);line-height:1.02;letter-spacing:-.055em}
    .hero h1 span{color:#a99dff}
    .hero-copy{max-width:530px;margin:0;color:#c1c9df;font-size:16px;line-height:1.8}
    .hero-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:28px}
    .button{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:46px;border:1px solid var(--line);border-radius:12px;background:#ffffff08;color:var(--text);padding:11px 17px;font:inherit;font-size:14px;font-weight:700;text-decoration:none;cursor:pointer;transition:transform .18s ease,border-color .18s ease,background .18s ease}
    .button:hover{transform:translateY(-2px);border-color:#8599ff88;background:#8599ff12}
    .button.primary{border-color:transparent;background:linear-gradient(120deg,#8877ff,#577cff);box-shadow:0 10px 28px #6676ff38;color:#fff}
    .button:disabled{cursor:not-allowed;opacity:.55;transform:none}
    .hero-art{position:relative;z-index:1;display:grid;place-items:center;min-height:265px}
    .orbit{position:relative;display:grid;place-items:center;width:225px;height:225px;border:1px solid #ffffff20;border-radius:50%;background:radial-gradient(circle,#9183ff27 0,#6c70c613 48%,transparent 70%);box-shadow:0 0 80px #7e71ff18}
    .orbit:before,.orbit:after{content:"";position:absolute;border:1px solid #ffffff16;border-radius:50%}
    .orbit:before{inset:20px}.orbit:after{inset:-20px;border-style:dashed;animation:spin 35s linear infinite}
    .orbit-core{display:grid;place-items:center;width:105px;height:105px;border:1px solid #ffffff35;border-radius:32px;background:linear-gradient(145deg,#8877ff,#526eff);box-shadow:0 20px 55px #635fff66;color:white;font-size:52px;transform:rotate(-8deg)}
    .orbit-chip{position:absolute;display:grid;place-items:center;width:48px;height:48px;border:1px solid #ffffff2a;border-radius:16px;background:#1c2440;color:#d6d0ff;font-size:20px;box-shadow:0 12px 28px #090d1e88}
    .chip-one{top:8px;right:28px}.chip-two{bottom:18px;left:4px}.chip-three{bottom:20px;right:4px}
    .warning{display:flex;gap:12px;margin:22px 0 0;padding:14px 16px;border:1px solid #f3b35d40;border-radius:14px;background:#f4a93610;color:#ffe0af;font-size:13px;line-height:1.65}
    .warning p{margin:0}.warning strong{color:#ffcf83}
    .warning-icon{display:grid;place-items:center;width:24px;height:24px;flex:none;border-radius:50%;background:#f3b35d20;color:#ffcf83;font-weight:900}
    .features{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:0 0 48px}
    .feature{padding:20px;border:1px solid var(--line);border-radius:17px;background:linear-gradient(145deg,#171d2b,#131925)}
    .feature-icon{display:grid;place-items:center;width:36px;height:36px;margin-bottom:13px;border:1px solid #8e86ff30;border-radius:11px;background:#8375ff16;color:#b4aaff;font-size:17px}
    .feature h2{margin:0 0 6px;font-size:14px}.feature p{margin:0;color:var(--muted);font-size:12px;line-height:1.65}
    dialog{max-width:440px;width:calc(100% - 48px);border:1px solid #3b4662;border-radius:20px;background:linear-gradient(145deg,#1c2438,#111521);color:var(--text);padding:25px;box-shadow:0 30px 100px #000b}
    dialog[open]{animation:modal-in .18s ease-out}
    dialog::backdrop{background:#070a12c9;backdrop-filter:blur(5px)}
    .dialog-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
    .dialog-top h2{margin:0;font-size:21px}
    .icon-button{display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--line);border-radius:10px;background:#ffffff08;color:#c6cde0;font-size:18px;cursor:pointer}
    .login-form label{display:block;margin:13px 0 5px;color:#cbd3e5;font-size:12px;font-weight:700}
    input{box-sizing:border-box;width:100%;min-height:46px;border:1px solid #39445d;border-radius:11px;background:#0e1422;color:#fff;padding:11px 13px;font:inherit;outline:none}
    input:focus{border-color:#8b7bff;box-shadow:0 0 0 3px #8877ff25}
    .login-form .remember-row{display:flex;align-items:flex-start;gap:10px;margin:16px 0 2px;color:#cbd3e5;font-size:13px;cursor:pointer}
    .remember-row input{width:17px;min-height:17px;flex:none;margin:2px 0 0;padding:0;accent-color:#8877ff}
    .remember-row strong,.remember-row small{display:block}
    .remember-row small{margin-top:4px;color:var(--muted);font-size:11px;font-weight:400;line-height:1.5}
    .login-form .button{width:100%;margin-top:19px}
    .login-error{min-height:20px;margin:12px 0 0;color:#ff9caa;font-size:13px}
    .help-copy{color:#b9c4d9;font-size:14px;line-height:1.75}
    .help-copy code{display:block;margin:13px 0;padding:12px;border:1px solid var(--line);border-radius:10px;background:#0e1422;color:#c5baff;overflow-wrap:anywhere}
    .page-footer{display:flex;justify-content:space-between;gap:14px;margin-top:auto;padding:0 0 24px;color:#71809d;font-size:12px}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes modal-in{from{opacity:0;transform:translateY(8px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
    @media(max-width:760px){.hero{grid-template-columns:1fr;gap:8px}.hero-art{min-height:190px}.orbit{width:170px;height:170px}.orbit-core{width:82px;height:82px;border-radius:25px;font-size:40px}.features{grid-template-columns:1fr}.feature{display:flex;gap:13px;align-items:flex-start}.feature-icon{flex:none;margin:0}.hero{margin-bottom:24px}}
    @media(max-width:480px){body{padding:0 18px}.topbar{padding:19px 0}.brand-mark{width:38px;height:38px}.top-link{font-size:11px}.hero{padding:26px 21px;border-radius:21px}.hero h1{font-size:43px}.hero-copy{font-size:14px}.hero-art{min-height:160px}.orbit{width:145px;height:145px}.orbit-chip{width:40px;height:40px}.features{margin-bottom:30px}.page-footer{font-size:10px}}
    #help[hidden],#loginForm[hidden]{display:none}
  </style>
</head>
<body>
  <div class="landing">
    <nav class="topbar" aria-label="Navegação principal">
      <div class="brand"><span class="brand-mark">✦</span><span>${safeBotName}<small>PAINEL DO BOT</small></span></div>
      <a class="top-link" href="/perfil?grupo=ID&amp;usuario=ID&amp;plataforma=discord">Ver exemplo de perfil <span aria-hidden="true">↗</span></a>
    </nav>
    <main>
      <section class="hero">
        <div>
          <span class="eyebrow">Seu espaço, suas comunidades</span>
          <h1>Seu bot.<br><span>Tudo conectado.</span></h1>
          <p class="hero-copy">Acesse sua Conta Central e acompanhe em um só lugar as conexões e recursos do ${safeBotName}.</p>
          <div class="hero-actions"><button class="button primary" id="openLogin" type="button">Entrar no painel <span aria-hidden="true">→</span></button><button class="button" id="openHelp" type="button">Não sei meu login ou senha</button></div>
          ${securityNotice}
        </div>
        <div class="hero-art" aria-hidden="true"><div class="orbit"><span class="orbit-core">✦</span><span class="orbit-chip chip-one">◈</span><span class="orbit-chip chip-two">⌁</span><span class="orbit-chip chip-three">✧</span></div></div>
      </section>
      <section class="features" aria-label="Recursos do painel">
        <article class="feature"><span class="feature-icon" aria-hidden="true">◎</span><div><h2>Uma conta central</h2><p>Suas conexões e dados reunidos em um só perfil.</p></div></article>
        <article class="feature"><span class="feature-icon" aria-hidden="true">◈</span><div><h2>Suas plataformas</h2><p>Veja as contas vinculadas ao seu perfil do SatBot.</p></div></article>
        <article class="feature"><span class="feature-icon" aria-hidden="true">✧</span><div><h2>Seu espaço pessoal</h2><p>Consulte os dados da conta após entrar com segurança.</p></div></article>
      </section>
    </main>
    <footer class="page-footer"><span>${safeBotName} · Seu bot, suas comunidades.</span><span>Perfis e rankings continuam disponíveis.</span></footer>
  </div>
  <dialog id="loginDialog">
    <div class="dialog-top"><h2 id="dialogTitle">Entrar no painel</h2><button class="icon-button" id="closeDialog" type="button" aria-label="Fechar">×</button></div>
    <form id="loginForm" class="login-form">
      <label for="loginIdentifier">Usuário ou ID central</label>
      <input id="loginIdentifier" name="login" autocomplete="username" placeholder="Seu usuário ou ID central" required>
      <label for="password">Senha</label>
      <input id="password" name="password" type="password" autocomplete="current-password" placeholder="Sua senha" required>
      <label class="remember-row"><input id="rememberMe" name="rememberMe" type="checkbox"><span><strong>Manter logado</strong><small>Continuar conectado neste navegador por 30 dias, mesmo se o bot reiniciar.</small></span></label>
      <button class="button primary" type="submit">Entrar na minha conta <span aria-hidden="true">→</span></button>
    </form>
    <p id="loginError" class="login-error">${escapeHtml(loginError)}</p>
    <section id="help" class="help-copy" hidden>
      <p>${help}</p>
    </section>
  </dialog>
  <script>
    const dialog=document.getElementById("loginDialog");
    const form=document.getElementById("loginForm");
    const helpSection=document.getElementById("help");
    const dialogTitle=document.getElementById("dialogTitle");
    document.getElementById("openLogin").onclick=()=>{form.hidden=false;helpSection.hidden=true;dialogTitle.textContent="Entrar no painel";dialog.showModal()};
    document.getElementById("openHelp").onclick=()=>{form.hidden=true;helpSection.hidden=false;dialogTitle.textContent="Recuperar acesso";dialog.showModal()};
    document.getElementById("closeDialog").onclick=()=>dialog.close();
    form.onsubmit=async event=>{
      event.preventDefault();
      const error=document.getElementById("loginError");
      error.textContent="";
      try{
        const response=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({login:document.getElementById("loginIdentifier").value,password:document.getElementById("password").value,rememberMe:document.getElementById("rememberMe").checked})});
        const result=await response.json();
        if(!response.ok)throw new Error(result.error||"Falha no login.");
        location.href="/";
      }catch(err){error.textContent=err.message}
    };
  </script>
</body>
</html>`;
}

function formatMoney(cents) {
  return `${(Number(cents || 0) / 100).toFixed(2)}💷`;
}

function parseAdminStorePrice(value) {
  let normalized = String(value ?? "").trim().replace(/(?:💷|satcoins?)/gi, "").replace(/\s/g, "");
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "");
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, cents = ""] = normalized.split(".");
  const amount = Number(whole) * 100 + Number(cents.padEnd(2, "0") || 0);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function parseAdminStoreQuantity(value) {
  const normalized = String(value ?? "").trim();
  if (/^(?:infinito|infinite|∞)$/i.test(normalized)) return null;
  if (!/^\d+$/.test(normalized)) return undefined;
  const quantity = Number(normalized);
  return Number.isSafeInteger(quantity) && quantity >= 0 ? quantity : undefined;
}

function getAdminStore2State(message) {
  const store = economy.getCommunityStore(message);
  const orders = economy.getCommunityStoreOrders(message, "pending");
  if (!store || !orders) throw new Error("Não foi possível carregar a Loja 2 deste grupo ou servidor.");
  return { store, orders };
}

function renderProfile(profile) {
  const botName = config.getBotName();
  if (profile.error) {
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Perfil não encontrado - ${escapeHtml(botName)}</title><style>${styles()}</style></head><body><main class="card error"><div class="brand">${escapeHtml(botName)}</div><h1>Perfil não encontrado</h1><p>${escapeHtml(profile.error)}</p><p class="hint">Use /perfil?grupo=ID&usuario=ID&plataforma=discord</p></main></body></html>`;
  }

  const economyPosition = profile.economy.position ? `#${profile.economy.position}` : "Não classificado";
  const xpPosition = profile.xp.position ? `#${profile.xp.position}` : "Não classificado";
  const activityPosition = profile.activity.position ? `#${profile.activity.position}` : "Não classificado";
  const nofapText = profile.nofap.active
    ? `${profile.nofap.currentDays} dias • ${profile.nofap.title}`
    : "Inativo";
  const marriages = Array.isArray(profile.marriages) && profile.marriages.length
    ? profile.marriages
    : profile.marriage ? [profile.marriage] : [];
  const marriageText = marriages.length
    ? marriages.length === 1
      ? marriages[0].selfMarriage
        ? "Casado(a) consigo mesmo(a)"
        : `Casado(a) com ${marriages[0].partnerName}`
      : `Relacionamentos: ${marriages.map(item => item.selfMarriage ? "consigo mesmo(a)" : item.partnerName).join(", ")}`
    : "Sem casamento neste grupo/servidor";
  const marriageMeta = marriages.length === 1
    ? `Desde ${new Date(marriages[0].marriedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} • há ${marriages[0].duration}`
    : marriages.length > 1
      ? `${marriages.length} relacionamentos neste grupo/servidor`
      : "Casamento válido neste grupo/servidor";
  const avatarUrl = profile.avatarUrl || "/semfoto.jpg";
  const avatarContent = `<img src="${escapeHtml(avatarUrl)}" alt="" onerror="this.onerror=null;this.src='/semfoto.jpg'">`;

  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Perfil de ${escapeHtml(profile.name)} - ${escapeHtml(botName)}</title><style>${styles()}</style></head>
<body>
  <main class="card">
    <div class="brand">${escapeHtml(botName)} <span>PERFIL</span></div>
    <header><div class="avatar">${escapeHtml(profile.name.charAt(0).toUpperCase())}${avatarContent}</div><div><h1>${escapeHtml(profile.name)}</h1><p class="muted">ID: ${escapeHtml(profile.userId)}</p></div></header>
    <div class="scope">Plataforma: ${escapeHtml(profile.platform)} <span>•</span> ${escapeHtml(profile.groupName)} <span>•</span> ID: ${escapeHtml(profile.groupId)}</div>
    <section class="grid">
      <article><div class="label">SATCOINS</div><div class="value money">${formatMoney(profile.economy.balance)}</div><div class="meta">Posição no dinheiro: ${economyPosition}</div></article>
      <article><div class="label">XP</div><div class="value">${profile.xp.value}</div><div class="meta">Posição no XP: ${xpPosition}</div></article>
      <article><div class="label">ATIVIDADE</div><div class="value">${profile.activity.total}</div><div class="meta">Posição na atividade: ${activityPosition}<br>💬 ${profile.activity.messages} • ⚙️ ${profile.activity.commands} • 🎨 ${profile.activity.stickers} • 📎 ${profile.activity.files}</div></article>
      <article><div class="label">NÍVEL XP</div><div class="value">${profile.xp.level}</div><div class="meta">Ranking de experiência</div></article>
      <article><div class="label">NOFAP</div><div class="value small">${escapeHtml(nofapText)}</div><div class="meta">Recorde: ${profile.nofap.recordDays || 0} dias • Resets: ${profile.nofap.totalResets || 0}</div></article>
      <article><div class="label">CASAMENTO</div><div class="value small">${escapeHtml(marriageText)}</div><div class="meta">${escapeHtml(marriageMeta)}</div></article>
    </section>
    <footer>Perfil local do grupo/servidor • ${escapeHtml(botName)}</footer>
  </main>
</body></html>`;
}

async function readRanking(url, type, order = "rich") {
  if (type === "activity") return readActivityRanking(url, false, order);
  const platform = String(url.searchParams.get("plataforma") || url.searchParams.get("platform") || "discord").toLowerCase();
  const groupId = url.searchParams.get("grupo") || url.searchParams.get("group");
  if (!["discord", "telegram", "whatsapp"].includes(platform) || !groupId) {
    return { error: "Informe o ID do grupo/servidor e uma plataforma válida." };
  }

  const message = profileMessage(platform, groupId, "");
  const scope = economy.getScope(message);
  const groupName = await getGroupName(platform, groupId, scope);
  if (!scope) return { error: "Não encontrei um grupo ou servidor com esse identificador." };

  if (type === "xp") {
    const data = xp.load(message);
    if (!data.enabled) return { error: "O sistema de XP está desativado neste grupo/servidor." };
    const users = xp.ranking(message);
    const selectedUsers = order === "poor" ? users.slice(-5).reverse() : users.slice(0, 5);
    return {
      type,
      platform,
      groupId,
      groupName,
      entries: selectedUsers.map(user => ({
        position: users.findIndex(item => String(item.userId) === String(user.userId)) + 1,
        name: user.displayName || user.username || user.userId,
        userId: user.userId,
        xp: Number(user.xp) || 0,
        level: xp.levelForXp(user.xp).level
      }))
    };
  }

  if (!economy.isEnabled(message)) return { error: "A economia está desativada neste grupo/servidor." };
  return {
    type,
    platform,
    groupId,
    groupName,
    entries: economy.getRanking(message, order === "poor" ? "poor" : "rich").map((account, index) => ({
      position: index + 1,
      name: account.name || account.username || account.userId,
      userId: account.userId,
      balance: Number(account.balance) || 0
    }))
  };
}

async function readActivityRanking(url, includeAll = false, order = "rich") {
  const platform = String(url.searchParams.get("plataforma") || url.searchParams.get("platform") || "discord").toLowerCase();
  const groupId = url.searchParams.get("grupo") || url.searchParams.get("group");
  if (!["discord", "telegram", "whatsapp"].includes(platform) || !groupId) {
    return { error: "Informe o ID do grupo/servidor e uma plataforma válida." };
  }

  const message = profileMessage(platform, groupId, "");
  const scope = economy.getScope(message);
  if (!scope) return { error: "Não encontrei um grupo ou servidor com esse identificador." };

  const groupName = await getGroupName(platform, groupId, scope);
  const result = activity.ranking(message);
  if (!result?.enabled) {
    return { error: "O sistema de atividade está desativado neste grupo/servidor." };
  }

  let users = result.users;
  if (includeAll && platform === "whatsapp") {
    const sock = global.whatsappSock;
    if (!sock || typeof sock.groupMetadata !== "function") {
      return { error: "O suporte ao WhatsApp não está disponível para carregar os membros deste grupo." };
    }

    let metadata;
    try {
      metadata = await sock.groupMetadata(String(groupId));
    } catch (error) {
      console.error("[WEB] Falha ao buscar membros do grupo WhatsApp para o ranking:", error);
      return { error: "Não foi possível carregar os membros deste grupo do WhatsApp." };
    }

    if (!Array.isArray(metadata?.participants)) {
      return { error: "A lista de membros deste grupo do WhatsApp está indisponível." };
    }

    users = metadata.participants.map((participant, index) => {
      const identifiers = [participant.id, participant.lid, participant.phoneNumber].filter(Boolean);
      const recordedUser = result.users.find(user =>
        identifiers.some(identifier => sameUserId(identifier, user.userId))
      );
      const userId = String(participant.id || participant.lid || participant.phoneNumber || `membro-${index + 1}`);
      return {
        ...(recordedUser || {}),
        userId,
        displayName: participant.name || participant.notify || recordedUser?.displayName || null,
        username: recordedUser?.username || null,
        total: recordedUser?.total || 0,
        dailyTotal: recordedUser?.dailyTotal || 0,
        messages: recordedUser?.messages || 0,
        commands: recordedUser?.commands || 0,
        stickers: recordedUser?.stickers || 0,
        files: recordedUser?.files || 0,
        profileAvailable: Boolean(recordedUser)
      };
    });
  }

  return {
    type: "activity",
    platform,
    groupId,
    groupName,
    entries: (includeAll
      ? users
      : order === "poor"
        ? users.slice().sort((a, b) => a.total - b.total || String(a.userId).localeCompare(String(b.userId))).slice(0, 5)
        : users.slice(0, 5)).map((user, index) => ({
      position: index + 1,
      name: user.displayName || user.username || user.userId,
      userId: user.userId,
      total: user.total,
      dailyTotal: user.dailyTotal,
      messages: user.messages,
      commands: user.commands,
      stickers: user.stickers,
      files: user.files,
      profileAvailable: user.profileAvailable !== false
    })).sort((a, b) => (order === "poor" ? a.total - b.total : b.total - a.total) ||
      String(a.name).localeCompare(String(b.name)))
      .map((entry, index) => ({ ...entry, position: index + 1 }))
  };
}

function renderRanking(ranking) {
  const botName = config.getBotName();
  if (ranking.error) {
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ranking não encontrado - ${escapeHtml(botName)}</title><style>${styles()}</style></head><body><main class="card error"><div class="brand">${escapeHtml(botName)}</div><h1>Ranking indisponível</h1><p>${escapeHtml(ranking.error)}</p></main></body></html>`;
  }

  const isXp = ranking.type === "xp";
  const isActivity = ranking.type === "activity";
  const title = isXp ? "Ranking XP" : isActivity ? (ranking.includeAll ? "Ranking de atividade — todos" : "Ranking de atividade") : "Ranking de riqueza";
  const rows = ranking.entries.length
    ? ranking.entries.map(entry => isXp
      ? renderRankingEntry(ranking, entry, `<b>${entry.xp} XP</b><em>Nível ${entry.level}</em>`)
      : isActivity
        ? renderRankingEntry(ranking, entry, `<b>${entry.total} atividades</b><em>💬 ${entry.messages} • ⚙️ ${entry.commands} • 🎨 ${entry.stickers} • 📎 ${entry.files}</em>`)
      : renderRankingEntry(ranking, entry, `<b class="money">${formatMoney(entry.balance)}</b>`)
    ).join("")
    : `<p class="muted">Ainda não há usuários neste ranking.</p>`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)} - ${escapeHtml(botName)}</title><style>${styles()} .ranking{margin-top:22px;display:grid;gap:10px}.rank-row{display:grid;grid-template-columns:60px 1fr auto auto;align-items:center;gap:14px;padding:17px 18px;border:1px solid #334566;border-radius:14px;background:#202a40;color:inherit;text-decoration:none;transition:transform .15s ease,border-color .15s ease,background .15s ease}.rank-row:hover,.rank-row:focus-visible{transform:translateY(-2px);border-color:#7ea7ff;background:#273653;outline:none}.rank-row strong{font-size:22px;color:#8eaaff}.rank-row span{font-weight:700}.rank-row small{display:block;color:#8998b3;font-weight:400;font-size:11px;margin-top:4px}.rank-row b{white-space:nowrap}.rank-row em{font-style:normal;color:#b8c3d9;font-size:13px}@media(max-width:600px){.rank-row{grid-template-columns:42px 1fr auto}.rank-row em{grid-column:2}.rank-row b{font-size:13px}}</style></head><body><main class="card"><div class="brand">${escapeHtml(botName)} <span>RANKING</span></div><header><div><h1>${escapeHtml(title)}</h1><p class="muted">${escapeHtml(ranking.groupName)}</p></div></header><div class="scope">Plataforma: ${escapeHtml(ranking.platform)} <span>•</span> ID: ${escapeHtml(ranking.groupId)}</div><section class="ranking">${rows}</section><footer>Ranking local do grupo/servidor • ${escapeHtml(botName)}</footer></main></body></html>`;
}

function renderRankingEntry(ranking, entry, metrics) {
  const profileUrl = `/perfil?grupo=${encodeURIComponent(ranking.groupId)}&plataforma=${encodeURIComponent(ranking.platform)}&usuario=${encodeURIComponent(entry.userId)}`;
  const row = `<strong>#${entry.position}</strong><span>${escapeHtml(entry.name)}<small>ID: ${escapeHtml(entry.userId)}</small></span>${metrics}`;
  return entry.profileAvailable === false
    ? `<div class="rank-row">${row}</div>`
    : `<a class="rank-row" href="${profileUrl}" aria-label="Abrir perfil de ${escapeHtml(entry.name)}">${row}</a>`;
}

function renderCredentialSetupPage(botName, tokenIsValid) {
  const title = tokenIsValid ? "Definir usuário e senha" : "Link inválido ou expirado";
  const securityWarning = config.getWebProtocol() === "https"
    ? ""
    : `<aside class="security-warning"><strong>Conexão HTTP sem criptografia</strong><br>A senha e o link podem ser interceptados durante o trajeto pela rede. Use uma senha exclusiva para o SatBot.</aside>`;
  const content = tokenIsValid
    ? `${securityWarning}<p>Escolha o usuário e a senha que serão usados para entrar no dashboard. Você também poderá entrar com seu ID central.</p>
      <form id="credentialForm">
        <label for="username">Usuário</label><input id="username" name="username" minlength="3" maxlength="30" pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,29}" autocomplete="username" required>
        <small>De 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado.</small>
        <label for="newPassword">Senha</label><input id="newPassword" name="password" type="password" minlength="8" maxlength="128" pattern="\\S*" autocomplete="new-password" required>
        <small>De 8 a 128 caracteres, sem espaços.</small>
        <label for="confirmPassword">Confirme a senha</label><input id="confirmPassword" name="confirmPassword" type="password" minlength="8" maxlength="128" pattern="\\S*" autocomplete="new-password" required>
        <button type="submit">Salvar credenciais</button>
      </form>
      <p id="credentialFeedback" role="status" aria-live="polite"></p>`
    : `<p>Esse link pode ter expirado ou já ter sido usado. Solicite outro pelo privado do bot com o comando <strong>${escapeHtml(config.getPrefix())}redefinir_senha</strong>.</p>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escapeHtml(title)} - ${escapeHtml(botName)}</title><style>
    :root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb}*{box-sizing:border-box}body{display:grid;min-height:100vh;place-items:center;margin:0;padding:20px;background:radial-gradient(circle at top,#27365d 0,#10131c 55%,#090b10 100%)}main{width:min(480px,100%);padding:28px;border:1px solid #334366;border-radius:20px;background:linear-gradient(145deg,#1c2438,#111521);box-shadow:0 24px 80px #0008}h1{margin:0;font-size:23px}p{color:#b9c4d9;font-size:13px;line-height:1.7}.security-warning{margin:14px 0;padding:12px;border:1px solid #f3b35d55;border-radius:10px;background:#f4a93612;color:#ffe0af;font-size:12px;line-height:1.6}label{display:block;margin:14px 0 6px;color:#cbd3e5;font-size:12px;font-weight:700}input{width:100%;min-height:44px;padding:10px 12px;border:1px solid #39445d;border-radius:10px;background:#0e1422;color:#fff;font:inherit}small{display:block;margin-top:5px;color:#9da8bd;font-size:11px}button{width:100%;min-height:44px;margin-top:18px;border:0;border-radius:10px;background:linear-gradient(120deg,#8877ff,#577cff);color:#fff;font:inherit;font-weight:700;cursor:pointer}button:disabled{opacity:.6;cursor:wait}#credentialFeedback{min-height:20px;color:#9cf0cf}#credentialFeedback.error{color:#ff9caa}a{color:#b9c6ff}
  </style></head><body><main><h1>${escapeHtml(title)}</h1>${content}${tokenIsValid ? `<script>
    const form=document.getElementById("credentialForm"),feedback=document.getElementById("credentialFeedback");
    form.addEventListener("submit",async event=>{
      event.preventDefault();
      const password=form.elements.password.value,confirmPassword=form.elements.confirmPassword.value;
      if(password!==confirmPassword){feedback.classList.add("error");feedback.textContent="As senhas não são iguais.";return}
      const button=form.querySelector("button");button.disabled=true;feedback.classList.remove("error");feedback.textContent="Salvando...";
      try{
        const response=await fetch("/api/setup-credentials",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:new URLSearchParams(location.search).get("token"),username:form.elements.username.value,password,confirmPassword})});
        const result=await response.json();
        if(!response.ok)throw new Error(result.error||"Não foi possível salvar as credenciais.");
        location.replace("/");
      }catch(error){feedback.classList.add("error");feedback.textContent=error.message;button.disabled=false}
    });
  </script>` : `<p><a href="/">Voltar ao dashboard</a></p>`}</main></body></html>`;
}

function styles() {
  return `:root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at top,#27365d 0,#10131c 48%,#090b10 100%)}.card{width:min(860px,100%);padding:34px;border:1px solid #334366;border-radius:24px;background:linear-gradient(145deg,#1c2438ee,#111521f2);box-shadow:0 24px 80px #0008}.brand{letter-spacing:.18em;color:#7ea7ff;font-weight:800}.brand span{color:#9da8bd;font-weight:500;font-size:.75em}header{display:flex;align-items:center;gap:18px;margin:34px 0 18px}.avatar{position:relative;overflow:hidden;flex:none;width:72px;height:72px;border-radius:20px;display:grid;place-items:center;background:linear-gradient(135deg,#6d5dfc,#3aa8ff);font-size:32px;font-weight:800}.avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}h1{margin:0;font-size:clamp(28px,5vw,46px)}p{margin:8px 0}.muted,.hint{color:#9da8bd}.scope{padding:13px 16px;border-radius:12px;background:#0e1422;color:#b7c5e7;font-size:14px}.scope span{color:#536486;margin:0 8px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px}.grid article{padding:22px;border-radius:16px;background:#202a40;border:1px solid #334566}.label{color:#9da8bd;font-size:12px;letter-spacing:.12em;font-weight:700}.value{font-size:32px;font-weight:800;margin:12px 0 8px}.value.small{font-size:22px}.money{color:#8ff0bf}.meta{color:#b8c3d9;font-size:14px}footer{margin-top:26px;color:#71809d;font-size:13px}.error{text-align:center}.error h1{margin-top:28px}@media(max-width:600px){.card{padding:24px}.grid{grid-template-columns:1fr}header{margin-top:26px}}`;
}

function start() {
  const domain = config.getWebDomain();
  if (!domain) {
    console.log("[WEB] Painel web desativado: nenhum domínio foi configurado.");
    return null;
  }

  const port = getPort();
  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (request.method === "POST" && requestUrl.pathname === "/api/login") {
      if (!isSameOriginRequest(request)) {
        sendJson(response, 403, { error: "Origem da solicitação inválida." });
        return;
      }

      const remoteAddress = request.socket.remoteAddress || "unknown";
      const now = Date.now();
      const previousAttempts = webLoginAttempts.get(remoteAddress);
      if (previousAttempts && previousAttempts.expiresAt > now && previousAttempts.count >= WEB_LOGIN_MAX_ATTEMPTS) {
        sendJson(response, 429, { error: "Muitas tentativas. Aguarde antes de tentar novamente." });
        return;
      }

      let credentials;
      try {
        credentials = await readJsonBody(request);
      } catch (error) {
        const statusCode = error.message === "request-too-large" ? 413 : 400;
        sendJson(response, statusCode, { error: "Solicitação inválida." });
        return;
      }

      const login = typeof credentials?.login === "string"
        ? credentials.login.trim()
        : typeof credentials?.centralId === "string" ? credentials.centralId.trim() : "";
      const password = typeof credentials?.password === "string" ? credentials.password : "";
      const rememberMe = credentials?.rememberMe === true;
      let valid = false;
      let central = null;
      try {
        if (login && password) {
          central = centralAccounts.getCentralByLogin(login);
          valid = Boolean(central && await centralAccounts.verifyWebPassword(central.id, password));
        }
      } catch (error) {
        console.error("[WEB] Falha ao validar credenciais do dashboard:", error.message || error);
        sendJson(response, 500, { error: "Não foi possível validar o login agora." });
        return;
      }

      if (!valid) {
        const attempt = previousAttempts && previousAttempts.expiresAt > now
          ? previousAttempts
          : { count: 0, expiresAt: now + WEB_LOGIN_LIMIT_MS };
        attempt.count += 1;
        webLoginAttempts.set(remoteAddress, attempt);
        sendJson(response, 401, { error: "Usuário/ID central ou senha incorretos." });
        return;
      }

      webLoginAttempts.delete(remoteAddress);
      try {
        const sessionId = rememberMe
          ? await centralAccounts.createRememberedWebSession(central.id, REMEMBERED_WEB_SESSION_TTL_DAYS)
          : createWebSession(central.id);
        sendJson(response, 200, { success: true }, {
          "Set-Cookie": getSessionCookie(sessionId, requestIsSecure(request), rememberMe)
        });
      } catch (error) {
        console.error("[WEB] Falha ao criar sessão do dashboard:", error.message || error);
        sendJson(response, 500, { error: "Não foi possível iniciar a sessão agora." });
      }
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/setup-credentials") {
      if (!isSameOriginRequest(request)) {
        sendJson(response, 403, { error: "Origem da solicitação inválida." });
        return;
      }

      let payload;
      try {
        payload = await readJsonBody(request);
      } catch (error) {
        const statusCode = error.message === "request-too-large" ? 413 : 400;
        sendJson(response, statusCode, { error: "Solicitação inválida." });
        return;
      }

      try {
        const password = typeof payload?.password === "string" ? payload.password : "";
        const confirmPassword = typeof payload?.confirmPassword === "string" ? payload.confirmPassword : "";
        if (password !== confirmPassword) {
          sendJson(response, 400, { error: "As senhas não são iguais." });
          return;
        }
        await centralAccounts.completeWebCredentialSetup(
          typeof payload?.token === "string" ? payload.token : "",
          typeof payload?.username === "string" ? payload.username : "",
          password
        );
        sendJson(response, 200, { success: true });
      } catch (error) {
        const errors = {
          "credential-setup-token-invalid": "Este link é inválido, expirou ou já foi usado. Gere um novo pelo privado do bot.",
          "web-username-invalid": "O usuário deve ter de 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado.",
          "web-password-invalid": "A senha deve ter de 8 a 128 caracteres e não pode conter espaços.",
          "web-username-taken": "Este usuário já está sendo usado. Escolha outro."
        };
        if (errors[error.message]) {
          sendJson(response, 400, { error: errors[error.message] });
          return;
        }
        console.error("[WEB] Falha ao salvar credenciais da Conta Central:", error.message || error);
        sendJson(response, 500, { error: "Não foi possível salvar as credenciais agora." });
      }
      return;
    }

    if (request.method === "POST" && requestUrl.pathname.startsWith("/api/account/")) {
      if (!isSameOriginRequest(request)) {
        sendJson(response, 403, { error: "Origem da solicitação inválida." });
        return;
      }

      let payload;
      try {
        const isWelcomeMediaUpload = /\/admin-(?:welcome|goodbye|schedules)-media$/.test(requestUrl.pathname);
        const isAutorespostaSave = requestUrl.pathname.endsWith("/admin-autorepo");
        const maxBodyBytes = isWelcomeMediaUpload ? 12 * 1024 * 1024 : isAutorespostaSave ? 512 * 1024 : undefined;
        payload = await readJsonBody(request, maxBodyBytes);
      } catch (error) {
        const statusCode = error.message === "request-too-large" ? 413 : 400;
        sendJson(response, statusCode, { error: "Solicitação inválida." });
        return;
      }

      let central;
      try {
        central = await getSessionCentral(request);
      } catch (error) {
        console.error("[WEB] Falha ao validar sessão para ação da Conta Central:", error.message || error);
        sendJson(response, 500, { error: "Não foi possível validar sua sessão agora." });
        return;
      }
      if (!central) {
        sendJson(response, 401, { error: "Sua sessão expirou. Entre novamente para continuar." });
        return;
      }

      if (requestUrl.pathname === "/api/account/platform-groups") {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const platformAccount = central.platformAccounts.find(account => account.platform === platform);
        if (!platformAccount) {
          sendJson(response, 404, { error: "Esta plataforma não está vinculada à sua Conta Central." });
          return;
        }
        if (typeof platformAccount.platformId !== "string" || !platformAccount.platformId) {
          sendJson(response, 400, { error: "A conta vinculada não possui um identificador válido." });
          return;
        }

        try {
          const groups = await getLinkedPlatformGroups(platform, platformAccount.platformId);
          sendJson(response, 200, { groups });
        } catch (error) {
          console.error(`[WEB] Falha ao listar grupos da plataforma ${platform}:`, error.message || error);
          sendJson(response, 503, { error: "Não foi possível consultar os grupos desta plataforma agora." });
        }
        return;
      }

      if (requestUrl.pathname === "/api/account/local/admin-log-channel") {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        const channelId = typeof payload?.channelId === "string" ? payload.channelId.trim() : "";
        if (platform !== "discord" || (channelId && !/^\d{15,25}$/.test(channelId))) {
          sendJson(response, 400, { error: "Canal de logs inválido." });
          return;
        }
        try {
          await getGroupAdminData(central, platform, groupId);
          const client = global.discordClient;
          if (!client?.isReady?.()) throw new Error("O Discord está offline no momento.");
          const guild = await client.guilds.fetch(String(groupId));
          if (channelId) {
            const channel = await guild.channels.fetch(channelId);
            if (!channel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
              sendJson(response, 400, { error: "Escolha um canal de texto ou anúncios deste servidor, não um tópico." });
              return;
            }
            const botMember = guild.members.me || await guild.members.fetch(String(client.user.id));
            const permissions = channel.permissionsFor(botMember);
            if (!permissions?.has(PermissionFlagsBits.ViewChannel) || !permissions?.has(PermissionFlagsBits.SendMessages)) {
              sendJson(response, 400, { error: "O bot precisa das permissões Ver canal e Enviar mensagens no canal de logs." });
              return;
            }
          }
          const serverData = groupSettings.loadSettings("discord", String(groupId), "server");
          serverData.settings = serverData.settings || {};
          if (channelId) serverData.settings.logsChannelId = channelId;
          else delete serverData.settings.logsChannelId;
          if (!groupSettings.saveSettings("discord", String(groupId), "server", serverData, {
            raw: { guild: { id: String(groupId), name: guild.name || String(groupId) } }
          })) {
            throw new Error("Não foi possível salvar o canal de logs nas configurações do servidor.");
          }
          const selectedChannel = channelId ? await guild.channels.fetch(channelId) : null;
          sendJson(response, 200, {
            success: true,
            logChannelId: channelId,
            message: channelId
              ? `Canal de logs definido para #${selectedChannel.name}.`
              : "Canal de logs desativado."
          });
        } catch (error) {
          const reason = String(error?.message || "");
          const statusCode = /não participa|não está vinculada|permissão administrativa/i.test(reason) ? 403
            : /offline/i.test(reason) ? 503 : /inválid|canal de texto/i.test(reason) ? 400 : 500;
          if (statusCode === 500) console.error("[WEB] Falha ao salvar canal de logs do Discord:", error.message || error);
          sendJson(response, statusCode, { error: statusCode === 403 || statusCode === 503 || statusCode === 400 ? reason : "Não foi possível salvar o canal de logs." });
        }
        return;
      }

      if (requestUrl.pathname === "/api/account/local/admin-systems-options") {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        try {
          await getGroupAdminData(central, platform, groupId);
          sendJson(response, 200, await getAdminSystemsOptions(platform, groupId));
        } catch (error) {
          const reason = String(error?.message || "");
          const statusCode = /não participa|não está vinculada|permissão administrativa/i.test(reason) ? 403
            : /offline/i.test(reason) ? 503 : /inválid|registrado/i.test(reason) ? 400 : 500;
          if (statusCode === 500) console.error("[WEB] Falha ao listar escopos de sistemas:", error.message || error);
          sendJson(response, statusCode, { error: statusCode === 403 || statusCode === 503 || statusCode === 400 ? reason : "Não foi possível carregar os escopos desta plataforma." });
        }
        return;
      }

      if ([
        "/api/account/local/admin-schedules-state",
        "/api/account/local/admin-schedules",
        "/api/account/local/admin-schedules-media"
      ].includes(requestUrl.pathname)) {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        const isStateRequest = requestUrl.pathname.endsWith("-state");
        try {
          await getGroupAdminData(central, platform, groupId);
          const scope = await validateAdminSettingsScope(platform, groupId, payload?.scope || {});
          if (!getAdminSystemDefinitions(platform, scope.level).some(item => item.key === "agendar")) {
            sendJson(response, 400, { error: "Agendamentos não estão disponíveis neste escopo." });
            return;
          }
          const platformAccount = central.platformAccounts.find(account => account.platform === platform);
          const message = getLocalGroupMessage(platform, groupId, String(platformAccount.platformId));
          const scopedMessage = getScopedAdminMessage(message, scope);
          if (isStateRequest) {
            sendJson(response, 200, {
              schedules: getAdminSchedules(scopedMessage).map(serializeAdminSchedule)
            });
            return;
          }

          const result = requestUrl.pathname.endsWith("-media")
            ? await saveAdminScheduleMedia(message, scope, payload)
            : await saveAdminSchedule(message, scope, payload);
          let announcementWarning = "";
          if (payload?.action !== "test") {
            try {
              const announced = platform === "whatsapp"
                ? await announceWhatsAppAdminSetting(groupId, String(platformAccount.platformId), "agendar")
                : await announceAdminSystemSetting(platform, groupId, String(platformAccount.platformId), "agendar");
              if (!announced && platform === "discord") {
                announcementWarning = "Agendamento salvo. Escolha um canal de logs para receber avisos do dashboard.";
              }
            } catch (error) {
              announcementWarning = platform === "discord"
                ? "O agendamento foi salvo, mas não foi possível enviar o aviso no canal de logs."
                : platform === "telegram"
                  ? "O agendamento foi salvo, mas não foi possível avisar no chat principal."
                  : "O agendamento foi salvo, mas não foi possível avisar no grupo.";
              console.error(`[WEB] Agendamento alterado, mas falhou o aviso no ${platform}:`, error.message || error);
            }
          }
          sendJson(response, 200, {
            success: true,
            schedule: result,
            announcementWarning,
            message: payload?.action === "delete"
              ? "Agendamento removido."
              : payload?.action === "test"
                ? "Mensagem de teste enviada."
                : "Configurações de agendamento alteradas."
          });
        } catch (error) {
          const reason = String(error?.message || "");
          const statusCode = /não participa|não está vinculada|permissão administrativa/i.test(reason) ? 403
            : /offline/i.test(reason) ? 503
              : /inválid|não encontrado|não disponíveis|não estão disponíveis|horários|horário|intervalo|repetição|texto|mensagem|mídia|agendamento|caracteres|dias da semana|dia entre|dia do mês|tipo de gatilho|envie uma imagem|configure ao menos|adicionar uma mídia|desative o agendamento|solicitação de agendamento|estado do agendamento|conteúdo não corresponde|8 MB/i.test(reason) ? 400 : 500;
          if (statusCode === 500) console.error("[WEB] Falha ao carregar ou alterar agendamentos:", error.message || error);
          sendJson(response, statusCode, {
            error: statusCode === 403 || statusCode === 503 || statusCode === 400
              ? reason
              : "Não foi possível atualizar os agendamentos."
          });
        }
        return;
      }

      if ([
        "/api/account/local/admin-autoApprove-state",
        "/api/account/local/admin-autoApprove",
        "/api/account/local/admin-xp-state",
        "/api/account/local/admin-xp",
        "/api/account/local/admin-rp-state",
        "/api/account/local/admin-rp-action"
      ].includes(requestUrl.pathname)) {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        const isRpRequest = requestUrl.pathname.includes("/admin-rp-");
        const setting = isRpRequest
          ? typeof payload?.setting === "string" ? payload.setting : ""
          : requestUrl.pathname.includes("autoApprove") ? "autoApprove" : "xp";
        try {
          await getGroupAdminData(central, platform, groupId);
          const scope = await validateAdminSettingsScope(platform, groupId, payload?.scope || {});
          if (!getAdminSystemDefinitions(platform, scope.level).some(item => item.key === setting)) {
            sendJson(response, 400, { error: `O sistema ${setting} não está disponível neste escopo.` });
            return;
          }
          const platformAccount = central.platformAccounts.find(account => account.platform === platform);
          const baseMessage = getLocalGroupMessage(platform, groupId, String(platformAccount.platformId));
          const message = getScopedAdminMessage(baseMessage, scope);
          if (requestUrl.pathname === "/api/account/local/admin-rp-state") {
            const result = getAdminRpUserData(message, setting, payload?.query);
            sendJson(response, 200, result);
            return;
          }
          if (requestUrl.pathname === "/api/account/local/admin-xp-state") {
            const options = await getAdminSystemsOptions(platform, groupId);
            const destinations = platform === "discord"
              ? options.logChannels
              : platform === "telegram"
                ? options.topics
                : [];
            sendJson(response, 200, { config: getAdminXpConfig(baseMessage, scope), destinations });
            return;
          }
          if (requestUrl.pathname === "/api/account/local/admin-autoApprove-state") {
            sendJson(response, 200, { config: getAdminAutoApproveConfig(baseMessage, scope) });
            return;
          }
          if (requestUrl.pathname === "/api/account/local/admin-rp-action") {
            const result = executeAdminRpAction(message, setting, payload);
            sendJson(response, 200, { success: true, result });
            return;
          }

          let updatedConfig;
          if (setting === "autoApprove") {
            const target = {
              platform: message.platform,
              chatId: String(message.chatId),
              raw: message.raw,
              chatName: message.groupName || message.chatName
            };
            const current = autoAcceptHelper.getConfig(target);
            const next = validateAdminAutoApproveConfig(payload?.config, current);
            updatedConfig = autoAcceptHelper.saveConfig(target, next);
            if (!updatedConfig) throw new Error("Não foi possível salvar as configurações de autoaprovação.");
          } else {
            updatedConfig = await saveAdminXpConfig(baseMessage, scope, payload?.config);
          }
          let announcementWarning = "";
          try {
            const announced = platform === "whatsapp"
              ? await announceWhatsAppAdminSetting(groupId, String(platformAccount.platformId), setting)
              : await announceAdminSystemSetting(platform, groupId, String(platformAccount.platformId), setting);
            if (!announced && platform === "discord") {
              announcementWarning = "Configurações salvas. Escolha um canal de logs para receber avisos do dashboard.";
            }
          } catch (error) {
            announcementWarning = platform === "discord"
              ? "As configurações foram salvas, mas não foi possível avisar no canal de logs."
              : platform === "telegram"
                ? "As configurações foram salvas, mas não foi possível avisar no chat principal."
                : "As configurações foram salvas, mas não foi possível avisar no grupo.";
            console.error(`[WEB] ${setting} atualizado, mas falhou o aviso no ${platform}:`, error.message || error);
          }
          sendJson(response, 200, {
            success: true,
            config: updatedConfig,
            announcementWarning,
            message: `Configurações de ${setting} alteradas.`
          });
        } catch (error) {
          const reason = String(error?.message || "");
          const statusCode = /não participa|não está vinculada|permissão administrativa|não tem permissão|precisa ser administrador/i.test(reason) ? 403
            : /offline/i.test(reason) ? 503
              : /inválid|não disponível|não encontrado|horário|faixa|lista|intervalo|caracteres|valor|quantidade|saldo|XP|atividade|ação|configuração|configurações|conta de economia|registro/i.test(reason) ? 400 : 500;
          if (statusCode === 500) console.error("[WEB] Falha ao carregar ou alterar sistemas de RP:", error.message || error);
          sendJson(response, statusCode, {
            error: statusCode === 403 || statusCode === 503 || statusCode === 400
              ? reason
              : "Não foi possível carregar ou atualizar este sistema."
          });
        }
        return;
      }

      if (requestUrl.pathname === "/api/account/local/admin-settings-state") {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        try {
          await getGroupAdminData(central, platform, groupId);
          const scope = await validateAdminSettingsScope(platform, groupId, payload?.scope || {});
          const platformAccount = central.platformAccounts.find(account => account.platform === platform);
          const baseMessage = getLocalGroupMessage(platform, groupId, String(platformAccount.platformId));
          sendJson(response, 200, { settings: getAdminSettings(baseMessage, scope) });
        } catch (error) {
          const reason = String(error?.message || "");
          const statusCode = /não participa|não está vinculada|permissão administrativa/i.test(reason) ? 403
            : /offline/i.test(reason) ? 503 : /inválid|registrado/i.test(reason) ? 400 : 500;
          if (statusCode === 500) console.error("[WEB] Falha ao carregar configuração administrativa:", error.message || error);
          sendJson(response, statusCode, { error: statusCode === 403 || statusCode === 503 || statusCode === 400 ? reason : "Não foi possível carregar esta configuração." });
        }
        return;
      }

      if ([
        "/api/account/local/admin-antilink-state",
        "/api/account/local/admin-antilink",
        "/api/account/local/admin-antimedia-state",
        "/api/account/local/admin-antimedia",
        "/api/account/local/admin-antipalavras-state",
        "/api/account/local/admin-antipalavras",
        "/api/account/local/admin-antiraid-state",
        "/api/account/local/admin-antiraid",
        "/api/account/local/admin-blockcmd-state",
        "/api/account/local/admin-blockcmd",
        "/api/account/local/admin-welcome-state",
        "/api/account/local/admin-welcome",
        "/api/account/local/admin-welcome-media",
        "/api/account/local/admin-goodbye-state",
        "/api/account/local/admin-goodbye",
        "/api/account/local/admin-goodbye-media",
        "/api/account/local/admin-autorepo-state",
        "/api/account/local/admin-autorepo",
        "/api/account/local/admin-autodownload-state",
        "/api/account/local/admin-autodownload",
        "/api/account/local/admin-monitor-state",
        "/api/account/local/admin-monitor"
      ].includes(requestUrl.pathname)) {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        const setting = requestUrl.pathname.includes("/admin-monitor")
          ? (typeof payload?.setting === "string" && Object.prototype.hasOwnProperty.call(ADMIN_MONITOR_HELPERS, payload.setting) ? payload.setting : "")
          : ["antimedia", "antipalavras", "antiraid", "blockcmd", "welcome", "goodbye", "autorepo", "autodownload"].find(key => requestUrl.pathname.includes(key)) || "antilink";
        const isStateRequest = requestUrl.pathname.endsWith("-state");
        const isMediaRequest = requestUrl.pathname.endsWith("-media");
        try {
          if (!setting) {
            sendJson(response, 400, { error: "Monitor inválido." });
            return;
          }
          const adminData = await getGroupAdminData(central, platform, groupId);
          const scope = await validateAdminSettingsScope(platform, groupId, payload?.scope || {});
          if (!getAdminSystemDefinitions(platform, scope.level).some(item => item.key === setting)) {
            sendJson(response, 400, { error: `O ${setting} não está disponível neste escopo.` });
            return;
          }
          const platformAccount = central.platformAccounts.find(account => account.platform === platform);
          const message = getLocalGroupMessage(platform, groupId, String(platformAccount.platformId));
          const requestedAction = payload?.config?.action;
          const needsModerationPermission = ["kick", "ban", "remove"].includes(requestedAction) ||
            (setting === "antiraid" && ["mute", "timeout"].includes(requestedAction)) ||
            (setting === "blockcmd" && requestedAction === "delete");
          if (!isStateRequest && needsModerationPermission) {
            const permissionKey = platform === "whatsapp" ? "moderation"
              : setting === "blockcmd" && requestedAction === "delete" ? "manageMessages"
              : requestedAction === "timeout" || requestedAction === "mute" ? "mute"
              : requestedAction;
            const permission = adminData.permissionSnapshot.botPermissions.find(item => item.key === permissionKey);
            if (!permission?.allowed) {
              const actionLabel = requestedAction === "kick" || requestedAction === "remove" ? "expulsar/remover"
                : requestedAction === "mute" || requestedAction === "timeout" ? "silenciar"
                : setting === "blockcmd" && requestedAction === "delete" ? "apagar mensagens"
                : "banir";
              sendJson(response, 400, { error: `O bot precisa da permissão para ${actionLabel} membros para usar esta ação.` });
              return;
            }
          }
          const configGetters = {
            antilink: getAdminAntilinkConfig,
            antimedia: getAdminAntimediaConfig,
            antipalavras: getAdminAntipalavrasConfig,
            antiraid: getAdminAntiraidConfig,
            blockcmd: getAdminBlockcmdConfig,
            welcome: (target, requestedScope) => getAdminWelcomeConfig(target, requestedScope, setting),
            goodbye: (target, requestedScope) => getAdminWelcomeConfig(target, requestedScope, setting),
            autorepo: getAdminAutorespostaConfig,
            autodownload: getAdminAutodownloadConfig,
            ...Object.fromEntries(Object.keys(ADMIN_MONITOR_HELPERS).map(key => [
              key,
              target => getAdminMonitorConfig(getScopedAdminMessage(target, scope), key)
            ]))
          };
          const configSavers = {
            antilink: saveAdminAntilinkConfig,
            antimedia: saveAdminAntimediaConfig,
            antipalavras: saveAdminAntipalavrasConfig,
            antiraid: saveAdminAntiraidConfig,
            blockcmd: saveAdminBlockcmdConfig,
            welcome: (target, requestedScope, input) => saveAdminWelcomeConfig(target, requestedScope, setting, input),
            goodbye: (target, requestedScope, input) => saveAdminWelcomeConfig(target, requestedScope, setting, input),
            autorepo: saveAdminAutorespostaConfig,
            autodownload: saveAdminAutodownloadConfig,
            ...Object.fromEntries(Object.keys(ADMIN_MONITOR_HELPERS).map(key => [
              key,
              (target, requestedScope, input) => saveAdminMonitorConfig(target, requestedScope, key, input)
            ]))
          };
          const config = isStateRequest
            ? configGetters[setting](message, scope)
            : isMediaRequest
              ? await updateAdminWelcomeMedia(message, scope, setting, payload)
              : await configSavers[setting](message, scope, payload?.config);
          let announcementWarning = "";
          if (!isStateRequest) {
            try {
              const announced = platform === "whatsapp"
                ? await announceWhatsAppAdminSetting(groupId, String(platformAccount.platformId), setting)
                : await announceAdminSystemSetting(platform, groupId, String(platformAccount.platformId), setting);
              if (!announced && platform === "discord") {
                announcementWarning = "Configurações salvas. Escolha um canal de logs para receber avisos do dashboard.";
              }
            } catch (error) {
              announcementWarning = platform === "discord"
                ? "As configurações foram salvas, mas não foi possível enviar o aviso no canal de logs."
                : platform === "telegram"
                  ? "As configurações foram salvas, mas não foi possível avisar no chat principal."
                  : "As configurações foram salvas, mas não foi possível avisar no grupo.";
              console.error(`[WEB] Configurações de ${setting} salvas, mas falhou o aviso no ${platform}:`, error.message || error);
            }
          }
          sendJson(response, 200, {
            success: true,
            config,
            announcementWarning,
            message: `Configurações de ${ADMIN_SYSTEM_SETTINGS.find(item => item.key === setting)?.label || setting} alteradas.`
          });
        } catch (error) {
          const reason = String(error?.message || "");
          const statusCode = /não participa|não está vinculada|permissão administrativa/i.test(reason) ? 403
            : /offline/i.test(reason) ? 503 : /inválid|válido|permitido|disponível|até 500|100 respostas|100 caracteres|2.000|3.600|duplicados|respostas locais|gatilhos|tipo de correspondência|intervalo entre respostas|horários|horarios|fontes|cidade|cidades|consulta|consultas|ativos|ativo|intervalo eleitoral|atraso inicial|uf de|município ou termo|chat de destino|selecione/i.test(reason) ? 400 : 500;
          if (statusCode === 500) console.error(`[WEB] Falha ao carregar ou salvar configuração de ${setting}:`, error.message || error);
          sendJson(response, statusCode, { error: statusCode === 403 || statusCode === 503 || statusCode === 400 ? reason : `Não foi possível atualizar a configuração de ${setting}.` });
        }
        return;
      }

      if (requestUrl.pathname === "/api/account/local/admin-store2-state" ||
          requestUrl.pathname === "/api/account/local/admin-store2") {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        const isStateRequest = requestUrl.pathname.endsWith("-state");
        try {
          await getGroupAdminData(central, platform, groupId);
          const platformAccount = central.platformAccounts.find(account => account.platform === platform);
          const message = getLocalGroupMessage(platform, groupId, String(platformAccount.platformId));
          if (!isStateRequest) {
            const action = typeof payload?.action === "string" ? payload.action : "";
            if (action === "details") {
              const title = payload?.title;
              const notice = payload?.notice;
              if (typeof title !== "string" || title.length > 120 ||
                  typeof notice !== "string" || notice.length > 1000 ||
                  !economy.updateCommunityStoreDetails(message, title, notice)) {
                throw new Error("Informe um título e um aviso válidos para a loja.");
              }
            } else if (action === "add" || action === "edit") {
              const item = payload?.item;
              if (!item || typeof item !== "object" || Array.isArray(item) ||
                  typeof item.name !== "string" || item.name.trim().length > 120 ||
                  typeof item.category !== "string" || item.category.trim().length > 80) {
                throw new Error("Informe nome e categoria válidos para o item.");
              }
              const price = parseAdminStorePrice(item.price);
              const quantity = parseAdminStoreQuantity(item.quantity);
              if (price === null || quantity === undefined) {
                throw new Error("Informe um preço válido e uma quantidade inteira ou infinito.");
              }
              const itemData = {
                name: item.name,
                category: item.category,
                price,
                quantity
              };
              if (action === "add") {
                if (!economy.addCommunityStoreItem(message, itemData)) {
                  throw new Error("Não foi possível cadastrar o item da loja.");
                }
              } else {
                const itemId = Number(payload.itemId);
                if (!Number.isSafeInteger(itemId) || itemId < 1001 ||
                    !economy.updateCommunityStoreItem(message, itemId, itemData)) {
                  throw new Error("Item não encontrado ou dados inválidos.");
                }
              }
            } else if (action === "remove") {
              const itemId = Number(payload.itemId);
              if (!Number.isSafeInteger(itemId) || itemId < 1001 ||
                  !economy.removeCommunityStoreItem(message, itemId)) {
                throw new Error("Item não encontrado no catálogo.");
              }
            } else if (action === "delivered" || action === "cancelled") {
              const orderId = Number(payload.orderId);
              if (!Number.isSafeInteger(orderId) || orderId < 1 ||
                  !economy.updateCommunityStoreOrder(message, orderId, action)) {
                throw new Error("Pedido pendente não encontrado.");
              }
            } else {
              throw new Error("Ação da Loja 2 inválida.");
            }
          }
          sendJson(response, 200, { success: true, ...getAdminStore2State(message) });
        } catch (error) {
          const reason = String(error?.message || "");
          const statusCode = /não participa|não está vinculada|permissão administrativa/i.test(reason) ? 403
            : /offline/i.test(reason) ? 503
              : /inválid|informe|não encontrado|não foi possível cadastrar|ação da loja/i.test(reason) ? 400 : 500;
          if (statusCode === 500) console.error("[WEB] Falha ao carregar ou atualizar Loja 2:", error.message || error);
          sendJson(response, statusCode, {
            error: statusCode === 403 || statusCode === 503 || statusCode === 400
              ? reason
              : "Não foi possível atualizar a Loja 2 deste grupo ou servidor."
          });
        }
        return;
      }

      if (requestUrl.pathname === "/api/account/local/admin-settings") {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        const setting = typeof payload?.setting === "string" ? payload.setting : "";
        if (!ADMIN_SYSTEM_SETTING_KEYS.has(setting) || typeof payload?.enabled !== "boolean") {
          sendJson(response, 400, { error: "Configuração ou estado inválido." });
          return;
        }
        if (setting === "agendar") {
          sendJson(response, 400, { error: "Gerencie cada agendamento individualmente pelo botão de configurações." });
          return;
        }

        try {
          await getGroupAdminData(central, platform, groupId);
          const scope = await validateAdminSettingsScope(platform, groupId, payload?.scope || {});
          if (!getAdminSystemDefinitions(platform, scope.level).some(item => item.key === setting)) {
            sendJson(response, 400, { error: "Esta função não pode ser configurada neste nível." });
            return;
          }
          const platformAccount = central.platformAccounts.find(account => account.platform === platform);
          const message = getLocalGroupMessage(platform, groupId, String(platformAccount.platformId));
          const settings = await setAdminSetting(message, setting, payload.enabled, scope);
          let announcementWarning = "";
          if (platform === "whatsapp") {
            try {
              await announceWhatsAppAdminSetting(groupId, String(platformAccount.platformId), setting);
            } catch (error) {
              announcementWarning = "A configuração foi salva, mas não foi possível avisar no grupo.";
              console.error("[WEB] Configuração salva, mas falhou o aviso no grupo do WhatsApp:", error.message || error);
            }
          } else {
            try {
              const announced = await announceAdminSystemSetting(platform, groupId, String(platformAccount.platformId), setting);
              if (!announced && platform === "discord") {
                announcementWarning = "Configuração salva. Escolha um canal de logs para receber avisos do dashboard.";
              }
            } catch (error) {
              announcementWarning = platform === "discord"
                ? "A configuração foi salva, mas não foi possível enviar o aviso no canal de logs."
                : "A configuração foi salva, mas não foi possível avisar no chat principal.";
              console.error(`[WEB] Configuração salva, mas falhou o aviso no ${platform}:`, error.message || error);
            }
          }
          const settingLabel = ADMIN_SYSTEM_SETTINGS.find(item => item.key === setting)?.label || setting;
          sendJson(response, 200, {
            success: true,
            settings,
            message: `Configurações de "${settingLabel}" alteradas.`,
            announcementWarning
          });
        } catch (error) {
          const reason = String(error?.message || "");
          const statusCode = /não participa|não está vinculada|permissão administrativa/i.test(reason) ? 403
            : /offline/i.test(reason) ? 503
              : /inválid|configure uma cidade|cadastre ao menos uma cidade|cadastre ao menos uma consulta/i.test(reason) ? 400 : 500;
          if (statusCode === 503 || statusCode === 500) {
            console.error("[WEB] Falha ao atualizar configuração administrativa:", error.message || error);
          }
          sendJson(response, statusCode, {
            error: statusCode === 403 || statusCode === 503 || statusCode === 400 ? reason : "Não foi possível atualizar esta configuração."
          });
        }
        return;
      }

      if ([
        "/api/account/local/moderation-data",
        "/api/account/local/moderation-search",
        "/api/account/local/moderation-options",
        "/api/account/local/moderation-action",
        "/api/account/local/moderation-config"
      ].includes(requestUrl.pathname)) {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        try {
          const data = await getGroupAdminData(central, platform, groupId);
          const platformAccount = central.platformAccounts.find(account => account.platform === platform);
          const actorId = String(platformAccount.platformId);
          const warnings = getModerationWarnings(platform, groupId, actorId);
          if (requestUrl.pathname === "/api/account/local/moderation-config") {
            const max = payload?.max;
            const action = payload?.action;
            if (!Number.isSafeInteger(max) || max < 1 || max > 1_000_000) {
              sendJson(response, 400, { error: "O limite deve ser um número inteiro entre 1 e 1.000.000." });
              return;
            }
            if (action !== "kick" && action !== "ban") {
              sendJson(response, 400, { error: "A ação deve ser expulsar (kick) ou banir (ban)." });
              return;
            }
            await assertModerationPermission(platform, groupId, actorId, "warn");
            const message = getLocalGroupMessage(platform, groupId, actorId);
            if (!setWarnConfig(message, max, action)) {
              throw new Error("Não foi possível salvar a configuração de advertências.");
            }
            sendJson(response, 200, {
              success: true,
              config: { max, action },
              message: "Configuração de advertências atualizada."
            });
            return;
          }
          if (requestUrl.pathname === "/api/account/local/moderation-options") {
            if (platform === "discord") {
              const { guild, actor } = await assertModerationPermission(platform, groupId, actorId, "addRole");
              const botMember = guild.members.me || await guild.members.fetch(String(global.discordClient.user.id));
              const roles = await guild.roles.fetch();
              sendJson(response, 200, {
                roles: [...roles.values()]
                  .filter(role => role.id !== guild.id && !role.managed &&
                    botMember.roles.highest.comparePositionTo(role) > 0 &&
                    actor.roles.highest.comparePositionTo(role) > 0)
                  .sort((left, right) => right.position - left.position)
                  .map(role => ({ id: role.id, name: role.name }))
              });
              return;
            }
            if (platform === "telegram") {
              sendJson(response, 200, {
                levels: Object.entries(telegramAdminLevels).map(([id, level]) => ({ id, label: level.label }))
              });
              return;
            }
            sendJson(response, 200, { levels: [] });
            return;
          }
          if (requestUrl.pathname === "/api/account/local/moderation-data") {
            const namedWarnings = await addModerationWarningNames(platform, groupId, warnings);
            sendJson(response, 200, {
              max: namedWarnings.max,
              action: namedWarnings.action,
              entries: namedWarnings.entries,
              total: namedWarnings.total
            });
            return;
          }
          if (requestUrl.pathname === "/api/account/local/moderation-search") {
            const query = cleanModerationSearch(payload?.query);
            const users = await searchModerationUsers(platform, groupId, query, warnings);
            sendJson(response, 200, { users });
            return;
          }

          const action = typeof payload?.action === "string" ? payload.action : "";
          const supportedActions = ["warn", "removeWarnings", "kick", "ban", "mute", "unmute", "unban", "promote", "demote", "addRole", "removeRole"];
          if (!supportedActions.includes(action)) {
            sendJson(response, 400, { error: "Ação de moderação inválida." });
            return;
          }
          const platformActionAllowed = ["kick", "ban", "mute", "unmute", "unban"].includes(action)
            ? IMMEDIATE_MODERATION_ACTIONS[platform]?.has(action) === true
            : action === "promote" || action === "demote"
            ? platform !== "discord"
            : action === "addRole" || action === "removeRole"
              ? platform === "discord"
              : true;
          if (!platformActionAllowed) {
            sendJson(response, 400, { error: "Esta ação não é compatível com a plataforma selecionada." });
            return;
          }
          const userId = typeof payload?.userId === "string" ? payload.userId.trim().slice(0, 100) : "";
          if (!userId) {
            sendJson(response, 400, { error: "Selecione um usuário válido." });
            return;
          }
          const reason = typeof payload?.reason === "string" ? payload.reason.trim().slice(0, 500) : "";
          const durationMinutes = Number(payload?.durationMinutes);
          const roleId = typeof payload?.roleId === "string" ? payload.roleId.trim().slice(0, 25) : "";
          const level = typeof payload?.level === "string" ? payload.level.trim().toLowerCase() : "";
          if (action === "mute" &&
              (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 10080)) {
            sendJson(response, 400, { error: "A duração do silêncio deve ser entre 1 e 10080 minutos." });
            return;
          }
          if ((action === "addRole" || action === "removeRole") && !/^\d{1,25}$/.test(roleId)) {
            sendJson(response, 400, { error: "Selecione um cargo válido do Discord." });
            return;
          }
          if (action === "promote" && platform === "telegram" && !Object.prototype.hasOwnProperty.call(telegramAdminLevels, level)) {
            sendJson(response, 400, { error: "Selecione um nível válido para o Telegram." });
            return;
          }
          const context = await assertModerationPermission(platform, groupId, actorId, action);
          let target;
          if (action === "removeWarnings") {
            target = { id: userId };
            if (!Object.prototype.hasOwnProperty.call(warnings.counts, userId)) {
              sendJson(response, 404, { error: "Este usuário não possui advertências registradas neste grupo." });
              return;
            }
          } else {
            target = await getModerationTarget(platform, groupId, userId, warnings);
            if (action === "unban") {
              if (!target.isBanned) {
                sendJson(response, 400, { error: "Este usuário não está banido neste grupo ou servidor." });
                return;
              }
            } else if (!target.isMember) {
              sendJson(response, 400, { error: "Esta ação exige que o usuário ainda esteja no grupo ou servidor." });
              return;
            }
          }

          const { result } = await executeModerationAction(
            platform,
            groupId,
            target,
            action,
            reason,
            durationMinutes,
            context,
            { roleId, level }
          );
          const message = action === "warn"
            ? result.punished
              ? `Advertência registrada (${result.currentWarns}/${result.maxWarns}); a punição automática foi acionada.`
              : `Advertência registrada (${result.currentWarns}/${result.maxWarns}).`
            : action === "removeWarnings" ? "Advertências removidas."
            : action === "kick" ? platform === "whatsapp" ? "Usuário removido do grupo." : "Usuário expulso."
            : action === "ban" ? platform === "whatsapp"
              ? "Usuário removido. O WhatsApp não mantém banimento persistente."
              : "Usuário banido."
            : action === "unban" ? "Usuário desbanido."
            : action === "mute" ? `Usuário silenciado por ${durationMinutes} minuto(s).`
            : action === "promote" || action === "demote" || action === "addRole" || action === "removeRole"
              ? result.message
            : "Silêncio removido.";
          sendJson(response, 200, {
            success: true,
            message,
            currentWarns: result.currentWarns,
            punished: Boolean(result.punished),
            punishmentAction: result.action,
            isBanned: (action === "ban" && platform !== "whatsapp") ||
              (action === "warn" && result.punished && result.action === "ban" && platform !== "whatsapp") ||
              (action !== "unban" && target.isBanned),
            isMember: action !== "kick" && action !== "ban" && action !== "unban" && target.isMember
          });
        } catch (error) {
          const reason = String(error?.message || "");
          const statusCode = /não encontrado|não possui advertências|não está banido/i.test(reason) ? 404
            : /não tem permissão|precisa ser administrador|não está disponível no WhatsApp|só pode (gerenciar|alterar) cargos/i.test(reason) ? 403
            : /offline/i.test(reason) ? 503
            : /inválid|informe um ID|duração|ação de moderação|não permite pesquisar|não compatível|exige que o usuário ainda esteja/i.test(reason) ? 400
            : 500;
          if (statusCode === 500 || statusCode === 503) {
            console.error("[WEB] Falha na moderação pelo painel:", error.message || error);
          }
          sendJson(response, statusCode, {
            error: statusCode === 500
              ? "Não foi possível concluir a ação de moderação."
              : reason || "Não foi possível concluir a solicitação."
          });
        }
        return;
      }

      if (requestUrl.pathname === "/api/account/local/merge" ||
          requestUrl.pathname === "/api/account/local/transfer") {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        const platformAccount = central.platformAccounts.find(account => account.platform === platform);
        if (!platformAccount?.platformId) {
          sendJson(response, 404, { error: "Esta plataforma não está vinculada à sua Conta Central." });
          return;
        }
        if (!isValidPlatformGroupId(groupId)) {
          sendJson(response, 400, { error: "O grupo ou servidor informado é inválido." });
          return;
        }

        try {
          if (!await isPlatformGroupMember(platform, groupId, String(platformAccount.platformId))) {
            sendJson(response, 403, { error: "Sua conta vinculada não participa mais deste grupo ou servidor." });
            return;
          }

          if (requestUrl.pathname === "/api/account/local/merge") {
            const code = typeof payload?.code === "string" ? payload.code.trim().toUpperCase() : "";
            if (!/^[A-F0-9]{8}$/.test(code)) {
              sendJson(response, 400, { error: "Informe um código de união válido com 8 caracteres." });
              return;
            }
            const merged = await centralAccounts.useMergeCode(code, central.id);
            await centralAccounts.saveNow();
            sendJson(response, 200, { success: true, centralId: merged.id });
            return;
          }

          const recipientId = typeof payload?.recipientId === "string" ? payload.recipientId.trim() : "";
          const amount = parseSatcoinAmount(payload?.amount);
          if (!recipientId || recipientId.length > 100 || amount === null) {
            sendJson(response, 400, { error: "Informe um ID válido e uma quantia de pelo menos 10.00 SatCoins, com até duas casas decimais." });
            return;
          }
          const message = getLocalGroupMessage(platform, groupId, String(platformAccount.platformId));
          if (!economy.getAccountByUser(message, String(platformAccount.platformId))) {
            sendJson(response, 400, { error: "Sua conta de economia ainda não existe neste grupo. Use primeiro um recurso de economia do bot." });
            return;
          }
          if (!economy.getAccountByUser(message, recipientId)) {
            sendJson(response, 404, { error: "Não encontrei uma conta de economia com esse ID neste grupo ou servidor." });
            return;
          }
          const result = economy.transfer(message, recipientId, amount);
          if (!result.transferred) {
            const errors = {
              invalid_amount: "A quantidade informada é inválida.",
              limit: "Você atingiu o limite diário de transferências.",
              self: "Não é possível transferir para sua própria conta.",
              insufficient_balance: "Seu saldo não é suficiente para essa transferência.",
              recipient_not_found: "Não encontrei a conta do destinatário neste grupo."
            };
            sendJson(response, 400, { error: errors[result.reason] || "Não foi possível realizar a transferência." });
            return;
          }
          sendJson(response, 200, {
            success: true,
            balance: economy.formatMoney(result.balance),
            amount: economy.formatMoney(result.amount)
          });
        } catch (error) {
          const reason = String(error?.message || "");
          const mergeErrors = {
            "invalid-code": "Código de união inválido.",
            "code-expired": "Este código de união expirou.",
            "central-not-found": "Não foi possível encontrar as contas para unir.",
            "same-central": "Esse código pertence à sua Conta Central atual."
          };
          if (requestUrl.pathname.endsWith("/merge") && (mergeErrors[reason] || reason.startsWith("conflict-platform"))) {
            sendJson(response, 400, {
              error: reason.startsWith("conflict-platform")
                ? "As contas possuem uma plataforma em comum e não podem ser unidas."
                : mergeErrors[reason]
            });
            return;
          }
          console.error("[WEB] Falha ao processar ação do painel local:", error.message || error);
          sendJson(response, 503, { error: "Não foi possível concluir a ação agora." });
        }
        return;
      }

      if (requestUrl.pathname === "/api/account/password") {
        const currentPassword = typeof payload?.currentPassword === "string" ? payload.currentPassword : "";
        const newPassword = typeof payload?.newPassword === "string" ? payload.newPassword : "";
        const confirmPassword = typeof payload?.confirmPassword === "string" ? payload.confirmPassword : "";
        if (!currentPassword || !newPassword || !confirmPassword) {
          sendJson(response, 400, { error: "Preencha a senha atual e os dois campos da nova senha." });
          return;
        }
        if (newPassword !== confirmPassword) {
          sendJson(response, 400, { error: "A nova senha e a confirmação não são iguais." });
          return;
        }
        if (newPassword.length < 8 || newPassword.length > 128 || /\s/.test(newPassword)) {
          sendJson(response, 400, { error: "A nova senha deve ter de 8 a 128 caracteres e não pode conter espaços." });
          return;
        }

        try {
          if (!await centralAccounts.verifyWebPassword(central.id, currentPassword)) {
            sendJson(response, 401, { error: "A senha atual está incorreta." });
            return;
          }
          const cookieMatch = String(request.headers.cookie || "").match(/(?:^|;\s*)satbot_session=([a-f0-9]{64})(?:;|$)/);
          const rememberedCentral = cookieMatch
            ? await centralAccounts.getCentralByRememberedWebSession(cookieMatch[1])
            : null;
          const keepCurrentBrowserLoggedIn = rememberedCentral?.id === central.id;

          await centralAccounts.setWebPassword(central.id, newPassword);
          let headers = {};
          if (keepCurrentBrowserLoggedIn) {
            const sessionId = await centralAccounts.createRememberedWebSession(
              central.id,
              REMEMBERED_WEB_SESSION_TTL_DAYS
            );
            headers = {
              "Set-Cookie": getSessionCookie(sessionId, requestIsSecure(request), true)
            };
          }
          sendJson(response, 200, { success: true }, headers);
        } catch (error) {
          console.error("[WEB] Falha ao atualizar senha da Conta Central:", error.message || error);
          sendJson(response, 500, { error: "Não foi possível atualizar a senha agora." });
        }
        return;
      }

      if (requestUrl.pathname === "/api/account/merge-code") {
        try {
          const { code, expiresAt } = await centralAccounts.generateMergeCode(central.id);
          await centralAccounts.saveNow();
          sendJson(response, 200, { code, expiresAt });
        } catch (error) {
          console.error("[WEB] Falha ao gerar código de vínculo da Conta Central:", error.message || error);
          sendJson(response, 500, { error: "Não foi possível gerar o código de vínculo agora." });
        }
        return;
      }

      if (requestUrl.pathname === "/api/account/name") {
        const name = typeof payload?.name === "string" ? payload.name.trim() : "";
        if (!name) {
          sendJson(response, 400, { error: "Informe um nome para sua Conta Central." });
          return;
        }
        if (name.length > 40) {
          sendJson(response, 400, { error: "O nome central deve ter no máximo 40 caracteres." });
          return;
        }
        try {
          const updated = await centralAccounts.updateCentralName(central.id, name);
          await centralAccounts.saveNow();
          sendJson(response, 200, { success: true, name: updated.name });
        } catch (error) {
          console.error("[WEB] Falha ao alterar nome da Conta Central:", error.message || error);
          sendJson(response, 500, { error: "Não foi possível alterar o nome central agora." });
        }
        return;
      }

      sendJson(response, 404, { error: "Ação da Conta Central não encontrada." });
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/api/logout") {
      if (!isSameOriginRequest(request)) {
        sendJson(response, 403, { error: "Origem da solicitação inválida." });
        return;
      }
      const cookie = String(request.headers.cookie || "");
      const match = cookie.match(/(?:^|;\s*)satbot_session=([a-f0-9]{64})(?:;|$)/);
      if (match) {
        webSessions.delete(match[1]);
        try {
          await centralAccounts.revokeRememberedWebSession(match[1]);
        } catch (error) {
          console.error("[WEB] Falha ao encerrar sessão persistente:", error.message || error);
          sendJson(response, 500, { error: "Não foi possível encerrar a sessão agora." });
          return;
        }
      }
      sendJson(response, 200, { success: true }, {
        "Set-Cookie": clearSessionCookie(requestIsSecure(request))
      });
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/configurar-login") {
      const token = requestUrl.searchParams.get("token") || "";
      const tokenIsValid = Boolean(centralAccounts.getCentralByCredentialSetupToken(token));
      response.writeHead(tokenIsValid ? 200 : 400, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer"
      });
      response.end(renderCredentialSetupPage(config.getBotName(), tokenIsValid));
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/autologin") {
      response.writeHead(410, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer"
      });
      response.end("Links de login antigos foram desativados. Gere um novo link com o comando redefinir_senha no privado do bot.");
      return;
    }

    if (request.method !== "GET") {
      response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Method not allowed");
      return;
    }

    if (requestUrl.pathname === "/semfoto.jpg") {
      try {
        await sendPlaceholderAvatar(response);
      } catch (error) {
        console.error("[WEB] Não foi possível carregar a imagem padrão de perfil:", error.message || error);
        response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Profile placeholder unavailable");
      }
      return;
    }

    if (requestUrl.pathname === "/avatar") {
      const platform = String(requestUrl.searchParams.get("plataforma") || "").toLowerCase();
      const userId = requestUrl.searchParams.get("usuario");
      if (!["telegram", "whatsapp"].includes(platform) || !userId) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Invalid profile avatar request");
        return;
      }

      try {
        const { resolvePlatformProfile } = require("./profiles");
        const profile = await resolvePlatformProfile(platform, userId);
        if (profile?.avatarUrl) {
          const { fetchBuffer } = require("./api");
          const image = await fetchBuffer(profile.avatarUrl);
          const metadata = await sharp(image).metadata();
          const mimeType = metadata.format ? `image/${metadata.format === "jpeg" ? "jpeg" : metadata.format}` : "application/octet-stream";
          response.writeHead(200, {
            "Content-Type": mimeType,
            "Cache-Control": "private, max-age=300"
          });
          response.end(image);
          return;
        }
        await sendPlaceholderAvatar(response);
      } catch (error) {
        console.error(`[WEB] Não foi possível carregar o avatar de ${platform} ${userId}:`, error.message || error);
        if (!response.headersSent) {
          try {
            await sendPlaceholderAvatar(response);
          } catch (placeholderError) {
            console.error("[WEB] Não foi possível carregar a imagem padrão de perfil:", placeholderError.message || placeholderError);
            response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Profile avatar unavailable");
          }
        }
      }
      return;
    }

    if (requestUrl.pathname === "/perfil" || requestUrl.pathname === "/profile") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderProfile(await readProfile(requestUrl)));
      return;
    }

    if (requestUrl.pathname === "/api/perfil") {
      const profile = await readProfile(requestUrl);
      response.writeHead(profile.error ? 404 : 200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(profile));
      return;
    }

    if (requestUrl.pathname === "/rankxp" || requestUrl.pathname === "/rankrico") {
      const type = requestUrl.pathname === "/rankxp" ? "xp" : "rich";
      const ranking = await readRanking(requestUrl, type);
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderRanking(ranking));
      return;
    }

    if (requestUrl.pathname === "/api/rankxp" || requestUrl.pathname === "/api/rankrico") {
      const type = requestUrl.pathname === "/api/rankxp" ? "xp" : "rich";
      const ranking = await readRanking(requestUrl, type);
      response.writeHead(ranking.error ? 404 : 200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(ranking));
      return;
    }

    if (requestUrl.pathname === "/rankatividade" || requestUrl.pathname === "/rankativos") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderRanking(await readActivityRanking(requestUrl)));
      return;
    }

    if (requestUrl.pathname === "/rankatividade-all") {
      const ranking = await readActivityRanking(requestUrl, true);
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(renderRanking({ ...ranking, includeAll: true }));
      return;
    }

    if (requestUrl.pathname === "/api/rankatividade" || requestUrl.pathname === "/api/rankativos") {
      const ranking = await readActivityRanking(requestUrl);
      response.writeHead(ranking.error ? 404 : 200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(ranking));
      return;
    }

    if (requestUrl.pathname === "/api/rankatividade-all") {
      const ranking = await readActivityRanking(requestUrl, true);
      response.writeHead(ranking.error ? 404 : 200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(ranking));
      return;
    }

    if (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html" || requestUrl.pathname === "/dashboard") {
      const central = await getSessionCentral(request);
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff"
      });
      response.end(renderHome(config.getBotName(), central));
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/painel-local") {
      const central = await getSessionCentral(request);
      if (!central) {
        response.writeHead(302, { Location: "/dashboard", "Cache-Control": "no-store" });
        response.end();
        return;
      }
      const platform = String(requestUrl.searchParams.get("plataforma") || "").toLowerCase();
      const groupId = String(requestUrl.searchParams.get("grupo") || "");
      try {
        const data = await getLocalAccountData(central, platform, groupId);
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(renderLocalAccount(data));
      } catch (error) {
        const reason = String(error?.message || "");
        const statusCode = /não participa|não está vinculada/i.test(reason) ? 403
          : /offline/i.test(reason) ? 503 : 400;
        if (statusCode === 503) {
          console.error("[WEB] Falha ao abrir o painel local:", error.message || error);
        }
        response.writeHead(statusCode, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Painel indisponível</title><body style="font-family:Segoe UI,Arial;background:#10131c;color:#f5f7fb;padding:40px"><h1>Painel local indisponível</h1><p>${escapeHtml(reason)}</p><a href="/dashboard" style="color:#b9c6ff">Voltar à Conta Central</a></body></html>`);
      }
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/painel-admin") {
      const central = await getSessionCentral(request);
      if (!central) {
        response.writeHead(302, { Location: "/dashboard", "Cache-Control": "no-store" });
        response.end();
        return;
      }
      const platform = String(requestUrl.searchParams.get("plataforma") || "").toLowerCase();
      const groupId = String(requestUrl.searchParams.get("grupo") || "");
      try {
        const data = await getGroupAdminData(central, platform, groupId);
        data.moderation = await addModerationWarningNames(platform, groupId, data.moderation);
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(renderGroupAdmin(data));
      } catch (error) {
        const reason = String(error?.message || "");
        const statusCode = /não participa|não está vinculada|permissão administrativa/i.test(reason) ? 403
          : /offline/i.test(reason) ? 503 : /inválid/i.test(reason) ? 400 : 500;
        if (statusCode === 503 || statusCode === 500) {
          console.error("[WEB] Falha ao abrir o painel de administração:", error.message || error);
        }
        response.writeHead(statusCode, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Painel administrativo indisponível</title><body style="font-family:Segoe UI,Arial;background:#10131c;color:#f5f7fb;padding:40px"><h1>Painel de administração indisponível</h1><p>${escapeHtml(reason || "Não foi possível carregar o painel.")}</p><a href="/dashboard" style="color:#b9c6ff">Voltar à Conta Central</a></body></html>`);
      }
      return;
    }

    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  });

  server.on("error", error => console.error(`[WEB] Falha ao iniciar o site na porta ${port}:`, error));
  server.listen(port, "0.0.0.0", () => console.log(`[WEB] Site disponível na porta ${port}.`));
  return server;
}

module.exports = { start, readProfile, renderProfile, readRanking, readActivityRanking, renderRanking, renderLocalAccount, renderGroupAdmin, canManagePlatformGroup };
