const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const economy = require("./economy");
const xp = require("./xp");
const centralAccounts = require("./centralAccounts");
const nofapHelper = require("./nofapHelper");
const nofapGroupHelper = require("./nofapGroupHelper");
const vipHelper = require("./vipHelper");
const marriage = require("./marriageService");
const groupSettings = require("./groupSettings");
const auditLogs = require("./auditLogs");
const { getCurrentChangelog } = require("./changelog");
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
const schedulerHelper = require("./schedulerHelper");
const { MARKET_ASSETS, normalizeMarketSymbols } = require("./mercado");
const { PermissionFlagsBits, ChannelType } = require("discord.js");
const { getUserWarns, getWarnConfig, getWarnTarget, getWarnData, getWarnHistory, addWarn, removeWarns, setWarnConfig } = require("./warnHelper");
const { sameUserId, kickMember, banMember, muteMember, unmuteMember } = require("./moderationHelper");
const { executeRoleChange } = require("./discordRoles");
const { setWhatsAppAdmin } = require("./whatsappAdminHelper");
const { executeTelegramPromotion, executeTelegramDemotion, LEVELS: telegramAdminLevels } = require("./telegramAdminHelper");
const baileysPkg = require("@whiskeysockets/baileys");
const chatControl = require("./chatControl");
const profileCosmetics = require("./profileCosmetics");

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
  { key: "antilink", label: "Antilink", description: "Bloqueia links enviados no grupo.", category: "Proteção", scopes: { whatsapp: ["chat"], discord: ["server", "categoria", "chat"], telegram: ["server", "topic"] } },
  { key: "antimedia", label: "Antimídia", description: "Configura os tipos de mídia bloqueados e a ação aplicada no grupo.", category: "Proteção", scopes: { whatsapp: ["chat"], discord: ["server", "categoria", "chat"], telegram: ["server", "topic"] } },
  { key: "antipalavras", label: "Antipalavras", description: "Configura palavras e frases bloqueadas e a ação aplicada.", category: "Proteção", scopes: { whatsapp: ["chat"], discord: ["server", "categoria", "chat"], telegram: ["server", "topic"] } },
  { key: "antiraid", label: "Antiraid", description: "Ajusta limites de flood, links, menções e a ação de moderação.", category: "Proteção", scopes: { whatsapp: ["chat"], discord: ["server", "categoria", "chat"], telegram: ["server", "topic"] } },
  { key: "blockcmd", label: "Bloqueio de comandos", description: "Configura comandos e categorias bloqueados neste escopo.", category: "Proteção", scopes: { whatsapp: ["chat"], discord: ["server", "categoria", "chat"], telegram: ["server", "topic"] } },
  { key: "welcome", label: "Boas-vindas", description: "Envia a mensagem de boas-vindas configurada.", category: "Mensagens", scopes: { whatsapp: ["chat"], discord: ["server"], telegram: ["server", "topic"] } },
  { key: "goodbye", label: "Despedidas", description: "Envia a mensagem de despedida configurada.", category: "Mensagens", scopes: { whatsapp: ["chat"], discord: ["server"], telegram: ["server", "topic"] } },
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
    auditSource: "web-panel",
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
    const namedEntries = await Promise.all(entries.map(async entry => {
      const participant = (metadata.participants || []).find(candidate =>
        [candidate.id, candidate.lid, candidate.phoneNumber].filter(Boolean)
          .some(id => sameUserId(id, entry.userId))
      );
      const identity = participant || { id: entry.userId };
      const ids = [
        entry.userId,
        participant?.id,
        participant?.lid,
        participant?.phoneNumber
      ].filter(Boolean).map(String);
      const name = await getWhatsAppParticipantName(identity, sock, ids);
      return {
        ...entry,
        name: name || (participant ? getWhatsAppParticipantPhoneNumber(participant) : "") || entry.userId
      };
    }));
    return { ...warnings, entries: namedEntries };
  }

  const namedEntries = await Promise.all(entries.map(async entry => {
    const [user] = await searchModerationUsers(platform, groupId, entry.userId, warnings);
    if (user?.label && user.label !== entry.userId) {
      return { ...entry, name: user.label };
    }
    if (platform === "discord") {
      const client = global.discordClient;
      try {
        const discordUser = await client.users.fetch(String(entry.userId));
        return {
          ...entry,
          name: discordUser.globalName || discordUser.username || entry.userId
        };
      } catch (error) {
        if (Number(error?.code) !== 10013 && Number(error?.status) !== 404) {
          throw error;
        }
      }
    }
    return { ...entry, name: entry.userId };
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
  monitorRandomWeather: randomWeatherMonitor
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

async function getAdminSchedulesOverview(platform, groupId, groupName) {
  const options = await getAdminSystemsOptions(platform, groupId);
  const targets = [];
  if (platform === "whatsapp") {
    targets.push({ chatId: String(groupId), threadId: null, targetName: groupName, scope: { level: "chat" } });
  } else if (platform === "telegram") {
    const topics = new Map((options.topics || []).map(topic => [String(topic.id), topic.name]));
    targets.push({ chatId: String(groupId), threadId: null, targetName: `${groupName} · chat principal`, scope: { level: "server" } });
    for (const [threadId, name] of topics) {
      targets.push({ chatId: String(groupId), threadId, targetName: `${groupName} · ${name}`, scope: { level: "topic", topicId: threadId } });
    }
  } else if (platform === "discord") {
    for (const channel of options.chatChannels || []) {
      targets.push({
        chatId: String(channel.id),
        threadId: null,
        targetName: channel.name,
        scope: { level: "chat", categoryId: String(channel.categoryId || ""), channelId: String(channel.id) }
      });
    }
  }

  const schedules = new Map();
  for (const target of targets) {
    const matches = schedulerHelper.listSchedules(target.chatId, platform).filter(schedule =>
      String(schedule.chatId) === target.chatId &&
      schedule.platform === platform &&
      String(schedule.threadId || "") === String(target.threadId || "") &&
      !schedule.meta?.kind
    );
    for (const schedule of matches) {
      schedules.set(String(schedule.id), {
        ...serializeAdminSchedule(schedule),
        scope: target.scope,
        targetName: target.targetName
      });
    }
  }
  return [...schedules.values()].sort((a, b) =>
    a.targetName.localeCompare(b.targetName, "pt-BR") || a.name.localeCompare(b.name, "pt-BR")
  );
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
  if (setting === "welcome" || setting === "goodbye") {
    const chatId = message.platform === "discord" && level === "server"
      ? ""
      : message.platform === "discord" ? message.channelId : String(message.chatId);
    const getConfig = setting === "welcome" ? welcomeHelper.getWelcomeConfig : welcomeHelper.getGoodbyeConfig;
    return getConfig(message.platform, message.platform === "discord" ? message.raw.guild.id : null, chatId, message.threadId).config.enabled === true;
  }
  if (setting === "autoApprove") return autoAcceptHelper.getConfig({ platform: message.platform, chatId: String(message.chatId) }).enabled === true;
  if (setting === "autofigu") return autofiguHelper.getAutofiguEnabled(message);
  if (setting === "autodownload") return autodownloadHelper.getAutoDownloadSettings(message).enabled === true;
  if (setting === "autoTranscribe") return autoTranscribeHelper.getAutoTranscribeSetting(message, helperLevel) === true;
  if (setting === "autoia") return autoiaHelper.getAutoIAMode(message) !== "off";
  if (setting === "autorepo") return autorepoHelper.loadGroup(message)?.enabled === true;
  if (setting === "agendar") {
    const schedules = message.platform === "telegram" && level === "server"
      ? schedulerHelper.listSchedules(String(message.chatId), message.platform)
      : getAdminSchedules(message);
    return schedules.some(schedule => schedule.enabled && !schedule.state?.done && !schedule.meta?.kind);
  }
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
    const chatChannels = [...channels.values()]
      .filter(channel => [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type))
      .map(channel => ({
        id: String(channel.id),
        name: `#${channel.name || channel.id}`,
        categoryId: String(channel.parentId || "")
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const logChannels = [...channels.values()]
      .filter(channel => [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type))
      .map(channel => ({ id: String(channel.id), name: `#${channel.name || channel.id}` }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    const serverSettings = groupSettings.loadSettings("discord", String(groupId), "server");
    return {
      categories,
      chatChannels,
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
      if (!channel || !channel.isTextBased?.() || channel.isThread?.()) {
        throw new Error("Canal inválido para este servidor.");
      }
      if (categoryId) {
        if (!category || category.type !== 4 || String(channel.parentId || "") !== categoryId) {
          throw new Error("Canal inválido para a categoria selecionada.");
        }
      } else if (channel.parentId) {
        throw new Error("Selecione a categoria do canal.");
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
  let changed = false;
  if (category) {
    data.categoria = Array.isArray(data.categoria) ? data.categoria : [];
    let categoryData = data.categoria.find(item => String(item.id) === String(category.id));
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
  } else if (channel) {
    data.chat = Array.isArray(data.chat) ? data.chat : [];
    if (!data.chat.some(item => String(item.id) === String(channel.id))) {
      data.chat.push({ id: String(channel.id), name: channel.name || `Canal ${channel.id}`, topico: [], settings: {} });
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
  const isRootScope = scope.level === "server" || (message.platform === "whatsapp" && scope.level === "chat");
  const config = {
    action: input.action,
    message: input.message?.trim() || null,
    ignoreParent: isRootScope ? false : input.ignoreParent,
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
    entries = economy.listAccounts(message).map(account => {
      const walletBalance = Number(account.balance) || 0;
      const vaultBalance = Number(account.vaultBalance) || 0;
      const totalBalance = economy.getTotalBalance(account);
      return {
        userId: String(account.userId),
        username: account.username || "",
        displayName: account.displayName || "",
        value: totalBalance,
        detail: `Patrimônio: ${economy.formatMoney(totalBalance)} · Carteira: ${economy.formatMoney(walletBalance)} · Cofre: ${economy.formatMoney(vaultBalance)}`
      };
    });
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
      if (action === "add" && !Number.isSafeInteger((Number(account.balance) || 0) + amount)) {
        throw new Error("O saldo ultrapassa o limite permitido.");
      }
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
  const chatId = message.platform === "discord" && scope.level === "server"
    ? ""
    : String(scopedMessage.chatId);
  const result = helper(
    message.platform,
    message.platform === "discord" ? String(scopedMessage.raw.guild.id) : null,
    chatId,
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

async function saveAdminWelcomeConfig(message, scope, setting, input) {
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
  let destinationChannelId;
  if (message.platform === "discord" && scope.level === "server") {
    destinationChannelId = typeof input.channelId === "string" ? input.channelId.trim() : "";
    const { chatChannels } = await getAdminSystemsOptions(message.platform, String(scopedMessage.raw.guild.id));
    if (!destinationChannelId || !chatChannels.some(channel => channel.id === destinationChannelId)) {
      throw new Error("Selecione um canal de texto válido do servidor para enviar as mensagens.");
    }
  }
  const save = setting === "welcome" ? welcomeHelper.saveWelcomeConfig : welcomeHelper.saveGoodbyeConfig;
  if (!save(
    message.platform,
    message.platform === "discord" ? String(scopedMessage.raw.guild.id) : null,
    message.platform === "discord" && scope.level === "server" ? "" : String(scopedMessage.chatId),
    scopedMessage.threadId || null,
    {
      mode: input.mode,
      text: input.text.trim(),
      ...(destinationChannelId ? { channelId: destinationChannelId } : {})
    }
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
  const chatId = message.platform === "discord" && scope.level === "server"
    ? ""
    : String(scopedMessage.chatId);
  const save = setting === "welcome" ? welcomeHelper.saveWelcomeConfig : welcomeHelper.saveGoodbyeConfig;
  if (input.remove === true) {
    if (!save(
      message.platform,
      message.platform === "discord" ? String(scopedMessage.raw.guild.id) : null,
      chatId,
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
    chatId,
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

function getAdminAutoIAConfig(message, scope) {
  const scopedMessage = getScopedAdminMessage(message, scope);
  return { mode: autoiaHelper.getAutoIAMode(scopedMessage) };
}

function saveAdminAutoIAConfig(message, scope, input) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      !["off", "mention", "all"].includes(input.mode)) {
    throw new Error("Modo do Auto-IA inválido.");
  }
  const scopedMessage = getScopedAdminMessage(message, scope);
  autoiaHelper.setAutoIAMode(scopedMessage, input.mode);
  return getAdminAutoIAConfig(scopedMessage, {});
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
  } else {
    throw new Error("Monitor inválido.");
  }

  const saved = helper.saveMonitorConfig(patch, target);
  const schedules = await helper.syncMonitorSchedules(saved, target);
  if (saved.enabled && schedules.length !== 1) {
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
    const serverScope = message.platform === "discord" && level === "server";
    if (enabled && serverScope) {
      const currentConfig = (setting === "welcome" ? welcomeHelper.getWelcomeConfig : welcomeHelper.getGoodbyeConfig)(
        "discord", message.raw.guild.id, "", null
      ).config;
      if (!currentConfig.channelId) {
        throw new Error("Escolha o canal de destino na página de boas-vindas e despedidas antes de ativar.");
      }
    }
    save(
      message.platform,
      message.platform === "discord" ? message.raw.guild.id : null,
      serverScope ? "" : message.platform === "discord" ? message.channelId : String(message.chatId),
      message.threadId,
      config
    );
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
    }
    const saved = helper.saveMonitorConfig({
      enabled,
      platform: target.platform,
      chatId: target.chatId,
      threadId: target.threadId
    }, target);
    const schedules = await helper.syncMonitorSchedules(saved, target);
    if (enabled && schedules.length !== 1) {
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

function parseSatcoinAmount(value, minimum = economy.MIN_TRANSFER_AMOUNT) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, cents = ""] = normalized.split(".");
  const amount = Number(whole) * 100 + Number(cents.padEnd(2, "0") || 0);
  return Number.isSafeInteger(amount) && amount >= minimum
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
  const cosmetics = economy.getProfileCosmetics(message, platformId);
  const profits = account ? economy.getDailyProfits(message) : null;
  const today = economy.getLocalDate();
  const warnConfig = getWarnConfig(message);
  return {
    platform,
    groupId,
    platformId,
    economyEnabled: economy.isEnabled(message),
    canManage: await canManagePlatformGroup(platform, groupId, platformId),
    signalSearch: economy.getSignalSearchState(message, platformId),
    localSignalSearch: economy.getLocalSignalSearch(message),
    vaultConfig: economy.getVaultConfig(message),
    groupName: profile.groupName || `Grupo ${groupId}`,
    userName: profile.name || platformAccount.displayName || platformAccount.username || "Sua conta",
    profileBackground: cosmetics.background,
    profileOutline: cosmetics.outline,
    profileCircle: cosmetics.circle,
    profileEffect: cosmetics.effect,
    avatarUrl: await getProfileAvatar(platform, groupId, platformId),
    warnings: getUserWarns(message, platformId),
    maxWarnings: warnConfig?.max || 3,
    account: account ? {
      balance: Number(account.balance) || 0,
      vaultBalance: Number(account.vaultBalance) || 0,
      dailyClaimed: account.lastClaimDate === today,
      workCount: account.workDate === today ? Number(account.workCount) || 0 : 0,
      lastJob: account.workDate === today ? account.lastJob || null : null,
      fishingCount: account.fishingDate === today ? Number(account.fishingCount) || 0 : 0,
      miningCount: account.miningDate === today ? Number(account.miningCount) || 0 : 0,
      casinoCount: account.casinoDate === today ? Number(account.casinoCount) || 0 : 0,
      robberyCount: account.robberyDate === today ? Number(account.robberyCount) || 0 : 0,
      transferCount: account.transferDate === today ? Number(account.transferCount) || 0 : 0,
      shieldCharges: Number(account.shieldCharges) || 0
    } : {
      balance: 0,
      vaultBalance: 0,
      dailyClaimed: false,
      workCount: 0,
      lastJob: null,
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

function vaultModeDescription(config) {
  if (config.mode === "tax") {
    const tax = config.taxType === "percent"
      ? `${(config.taxRateBasisPoints / 100).toFixed(2).replace(/\.?0+$/, "").replace(".", ",")}% do saldo`
      : `${economy.formatMoney(config.taxFixedAmount)} por 24 horas`;
    return `Modo de imposto: ${tax} por 24 horas, acumulado por hora completa após a primeira hora desde sua última movimentação.`;
  }
  if (config.mode === "robbery") {
    return `Modo de roubo permitido: o cofre tem ${config.robberyVaultChance}% de chance de ser atingido em um roubo.`;
  }
  return "Modo impenetrável: o saldo guardado fica seguro contra roubos e não pode ser usado diretamente.";
}

function describeVaultConfigChanges(previous, next) {
  const labels = {
    mode: ["Modo", value => ({
      secure: "Impenetrável",
      tax: "Imposto",
      robbery: "Roubo permitido"
    })[value] || value],
    minimumMovement: ["Mínimo por movimentação", value => economy.formatMoney(value)],
    taxType: ["Tipo de imposto", value => value === "percent" ? "percentual" : "fixo"],
    taxRateBasisPoints: ["Taxa percentual", value => `${(value / 100).toFixed(2).replace(/\.?0+$/, "").replace(".", ",")}%`],
    taxFixedAmount: ["Imposto fixo por 24h", value => economy.formatMoney(value)],
    robberyVaultChance: ["Chance de roubo do cofre", value => `${value}%`]
  };
  return Object.entries(labels)
    .filter(([key]) => previous[key] !== next[key])
    .map(([key, [label, format]]) => `${label}: ${format(previous[key])} → ${format(next[key])}`);
}

function renderLocalAccount(data) {
  const safeBotName = escapeHtml(config.getBotName());
  const cosmeticThemeStyles = getCosmeticPanelStyles(data.profileBackground, "local", data.profileOutline);
  const profileCircle = economy.PROFILE_CIRCLES[data.profileCircle] || null;
  const avatarFrameClasses = [
    "local-avatar-frame",
    profileCircle ? "has-profile-circle" : "",
    profileCircle?.frozen ? "frozen-profile-circle" : "",
    profileCircle?.rainbow ? "rainbow-profile-circle" : ""
  ].filter(Boolean).join(" ");
  const avatarFrameStyle = profileCircle ? `style="--profile-circle-color:${profileCircle.color};"` : "";
  const avatarFrostMarks = profileCircle?.frozen
    ? `<span class="local-avatar-frost-marks" aria-hidden="true">${["top", "upper-right", "right", "lower-right", "bottom", "lower-left", "left", "upper-left"].map(position => `<span class="local-avatar-frost-mark local-avatar-frost-${position}">❄</span>`).join("")}</span>`
    : "";
  const pageClass = data.profileEffect ? "profile-frozen" : "";
  const groupType = data.platform === "discord" ? "Servidor" : "Grupo";
  const currency = amount => economy.formatMoney(Number(amount) || 0);
  const accountStats = `<div class="local-stats">
        <article class="local-stat balance-stat"><small>Carteira</small><strong>${currency(data.account.balance)}</strong></article>
        <article class="local-stat balance-stat"><small>Saldo no cofre</small><strong id="localVaultBalance">${currency(data.account.vaultBalance)}</strong><span>Regras compartilhadas; saldo e imposto individuais.</span></article>
      </div>`;
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
    .local-hero-action-links{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:9px}
    .admin-panel-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:10px 15px;border:1px solid #a99dff66;border-radius:12px;background:linear-gradient(120deg,#8877ff35,#577cff28);color:#e2deff;font-size:13px;font-weight:750;text-decoration:none;box-shadow:0 8px 22px #635bff1a;transition:transform .16s ease,border-color .16s ease,background .16s ease}
    .admin-panel-button:hover,.admin-panel-button:focus-visible{transform:translateY(-2px);border-color:#b8adff;background:linear-gradient(120deg,#8877ff50,#577cff40);outline:2px solid #a99dff55;outline-offset:2px}
    .cosmetics-store-button{border-color:#f0a8c666;background:linear-gradient(120deg,#f076a535,#bd72ff28);color:#ffe0ef}
    .cosmetics-store-button:hover,.cosmetics-store-button:focus-visible{border-color:#f0a8c6;background:linear-gradient(120deg,#f076a550,#bd72ff40)}
    .local-avatar-frame{display:grid;width:88px;height:88px;flex:none;place-items:center;padding:3px;border:3px solid #a99dff66;border-radius:27px;background:#171d2b}
    .local-avatar{width:76px;height:76px;border-radius:18px;object-fit:cover;background:#171d2b}
    .local-avatar-frame.has-profile-circle{position:relative;border:4px solid var(--profile-circle-color);border-radius:50%;box-shadow:0 0 0 2px var(--profile-circle-color),0 0 15px var(--profile-circle-color)}
    .local-avatar-frame.has-profile-circle .local-avatar{border-radius:50%}
    .local-avatar-frame.frozen-profile-circle{border:4px double #f5fcff;outline:2px solid var(--profile-circle-color);outline-offset:2px;box-shadow:0 0 0 5px var(--profile-circle-color),0 0 20px var(--profile-circle-color),inset 0 0 12px #c9f2ff88}
    .local-avatar-frost-marks{position:absolute;inset:0;z-index:4;pointer-events:none}
    .local-avatar-frost-mark{position:absolute;color:#f5fcff;font-size:13px;line-height:1;text-shadow:0 0 4px #fff,0 0 9px var(--profile-circle-color)}
    .local-avatar-frost-top{top:-4px;left:50%;transform:translateX(-50%)}
    .local-avatar-frost-upper-right{top:9%;right:9%}
    .local-avatar-frost-right{top:50%;right:-5px;transform:translateY(-50%)}
    .local-avatar-frost-lower-right{right:9%;bottom:9%}
    .local-avatar-frost-bottom{bottom:-4px;left:50%;transform:translateX(-50%)}
    .local-avatar-frost-lower-left{bottom:9%;left:9%}
    .local-avatar-frost-left{top:50%;left:-5px;transform:translateY(-50%)}
    .local-avatar-frost-upper-left{top:9%;left:9%}
    .local-avatar-frame.rainbow-profile-circle{border:5px solid transparent;border-radius:50%;background:linear-gradient(#171d2b,#171d2b) padding-box,linear-gradient(90deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744) border-box;background-size:100% 100%,300% 100%;animation:local-circle-rainbow 5s linear infinite}
    @keyframes local-circle-rainbow{to{background-position:0 0,100% 50%}}
    body.profile-frozen:after{content:"";position:fixed;inset:0;z-index:3;pointer-events:none;opacity:.015;background-image:url("${profileSnowPattern(0.5)}");background-size:180px 180px}
    body.profile-frozen .local-page{position:relative;z-index:2}
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
    .local-actions input,.local-actions select{width:100%;min-height:44px;border:1px solid #39445d;border-radius:11px;background:#0e1422;color:#fff;padding:10px 12px;font:inherit}
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
    .local-store-links{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
    .local-store-link{display:grid;grid-template-columns:auto 1fr;align-items:center;column-gap:11px;min-height:84px;padding:14px;border:1px solid var(--line);border-radius:14px;background:#ffffff05;color:#e8ebf5;text-decoration:none;transition:transform .16s ease,border-color .16s ease,background .16s ease}
    .local-store-link:hover,.local-store-link:focus-visible{transform:translateY(-2px);border-color:#a99dff88;background:#a99dff0d;outline:2px solid #a99dff44;outline-offset:2px}
    .local-store-link>span{grid-row:span 2;font-size:23px}
    .local-store-link strong{font-size:13px}
    .local-store-link small{margin-top:4px;color:var(--muted);font-size:10px;line-height:1.4}
    .cosmetics-store-link{border-color:#f0a8c633}
    .cosmetics-store-link:hover,.cosmetics-store-link:focus-visible{border-color:#f0a8c6aa;background:#f0a8c60d}
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
    @media(max-width:760px){.local-layout,.local-functions,.local-store-links{grid-template-columns:1fr}}
    @media(max-width:640px){.local-hero{align-items:flex-start;flex-direction:column}.local-hero-main{align-items:flex-start}.local-hero-actions{width:100%}.local-hero-action-links{width:100%}.admin-panel-button{width:100%}}
    @media(max-width:480px){.local-page{padding:20px 0 38px}.local-hero{padding:20px}.local-avatar-frame{width:68px;height:68px;border-radius:21px}.local-avatar{width:56px;height:56px;border-radius:12px}.local-panel{padding:18px}.local-stats{grid-template-columns:1fr}.daily-list{grid-template-columns:1fr}}
    ${cosmeticThemeStyles}
  </style></head><body class="${pageClass}"><main class="local-page">
    <nav class="local-topbar"><a href="/dashboard">← Conta Central</a><span>${safeBotName} · Painel local</span></nav>
    <header class="local-hero"><div class="local-hero-main"><span class="${avatarFrameClasses}" ${avatarFrameStyle}><img class="local-avatar" src="${escapeHtml(data.avatarUrl || "/semfoto.jpg")}" alt="Foto de perfil de ${escapeHtml(data.userName)}" onerror="this.onerror=null;this.src='/semfoto.jpg'">${avatarFrostMarks}</span><div><div class="eyebrow">Painel da conta local</div><h1>${escapeHtml(data.userName)}</h1><p>${groupType}: ${escapeHtml(data.groupName)} · ${escapeHtml(data.platform)}</p></div></div><div class="local-hero-actions"><div class="local-hero-action-links">${data.canManage ? `<a class="admin-panel-button" href="/painel-admin?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}">⚙ Painel de administração</a>` : ""}</div></div></header>
    <section class="local-section" aria-labelledby="displaySectionTitle">
      <header class="local-section-heading"><div><h2 id="displaySectionTitle">Exibição</h2><p>Consulte seus dados e posições neste grupo ou servidor.</p></div></header>
      <div class="local-layout">
        <div class="local-column">
          <section class="local-panel"><h2>Minhas advertências</h2><p class="muted">Advertências registradas para sua conta neste grupo ou servidor.</p><div class="warning-count"><span>Advertências atuais<br><small>máximo configurado: ${data.maxWarnings}</small></span><strong>${data.warnings}</strong></div></section>
          <section class="local-panel"><h2>Rankings públicos</h2><p class="muted">Abra os rankings deste grupo ou servidor em uma nova aba.</p><div class="rank-links">${rankLinks}</div></section>
          ${localProfileSection}
        </div>
        <div class="local-column">
          <section class="local-panel"><h2>Minha economia local</h2><p class="muted">Sua carteira e seu cofre neste grupo ou servidor.</p>${accountStats}<a class="admin-panel-button" href="/painel-banco?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}">Abrir meu banco</a></section>
        </div>
      </div>
    </section>
    <section class="local-section" aria-labelledby="storesSectionTitle">
      <header class="local-section-heading"><div><h2 id="storesSectionTitle">Lojas</h2><p>Consulte os itens disponíveis para este grupo ou servidor.</p></div></header>
      <section class="local-panel"><div class="local-store-links">
        <a class="local-store-link bot-store-link" href="/loja-bot?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}"><span>🛒</span><strong>Loja do Bot</strong><small>Resets e itens da economia</small></a>
        <a class="local-store-link market-store-link" href="/mercado-local?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}"><span>🏪</span><strong>Mercado Local</strong><small>Itens cadastrados pelos administradores</small></a>
        <a class="local-store-link cosmetics-store-link" href="/loja-cosmeticos?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}"><span>🎨</span><strong>Loja de cosméticos</strong><small>Personalize seu perfil</small></a>
        <a class="local-store-link signal-search-link" href="/busca-sinais?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}"><span>✦</span><strong>Busca de Sinais</strong><small>Escolha uma busca e confira os prêmios</small></a>
      </div></section>
    </section>
    <section class="local-section" aria-labelledby="functionsSectionTitle">
      <header class="local-section-heading"><div><h2 id="functionsSectionTitle">Funções</h2><p>Ações disponíveis para sua conta neste grupo ou servidor.</p></div></header>
      <div class="local-functions">
        <section class="local-panel"><h2>Unir Conta Central</h2><p class="muted">Insira o código gerado pela outra conta. A Conta Central atual será mantida como principal.</p><div class="local-actions"><form id="joinCentralForm"><label for="mergeCode">Código de união</label><input id="mergeCode" name="code" maxlength="8" autocomplete="one-time-code" required><button type="submit">Unir contas</button></form><p class="local-feedback" id="joinFeedback" role="status"></p></div></section>
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
  </script></body></html>`;
}

function renderLocalBank(data) {
  const safeBotName = escapeHtml(config.getBotName());
  const groupType = data.platform === "discord" ? "Servidor" : "Grupo";
  const currency = amount => economy.formatMoney(Number(amount) || 0);
  const profileLink = `/painel-local?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}`;
  const cosmeticThemeStyles = getCosmeticPanelStyles(data.profileBackground, "local", data.profileOutline);
  const activityItems = [
    { label: "Resgate diário", value: data.account.dailyClaimed ? "Coletado" : "Pendente", subtitle: "Uma recompensa por dia" },
    { label: "Trabalho", used: data.account.workCount, limit: economy.MAX_WORKS_PER_DAY, detail: data.account.lastJob ? `Último trabalho: ${data.account.lastJob}` : "Nenhum trabalho registrado hoje" },
    { label: "Pesca", used: data.account.fishingCount, limit: economy.MAX_WORKS_PER_DAY },
    { label: "Mineração", used: data.account.miningCount, limit: economy.MAX_WORKS_PER_DAY },
    { label: "Cassino", used: data.account.casinoCount, limit: economy.MAX_CASINO_PER_DAY },
    { label: "Tentativas de roubo", used: data.account.robberyCount, limit: economy.MAX_ROBBERIES_PER_DAY },
    { label: "Transferências enviadas", used: data.account.transferCount, limit: economy.MAX_TRANSFERS_PER_DAY }
  ].map(item => {
    const value = item.limit === undefined ? item.value : `${item.used}/${item.limit}`;
    const subtitle = item.detail || item.subtitle || (Number(item.used) >= Number(item.limit)
      ? "Limite diário atingido"
      : `Restam ${Number(item.limit) - Number(item.used)} tentativa(s)`);
    return `<article class="local-stat bank-activity"><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(subtitle)}</span></article>`;
  }).join("");
  const profitLabels = [
    ["resgate", "Resgate diário"], ["trabalho", "Trabalho"], ["pesca", "Pesca"],
    ["mineracao", "Mineração"], ["cassino", "Cassino"],
    ["transferenciaEnviada", "Transferências enviadas"],
    ["transferenciaRecebida", "Transferências recebidas"],
    ["roubo", "Roubos feitos"], ["rouboSofrido", "Roubos sofridos"],
    ["loja", "Loja"], ["busca", "Busca de Sinais"],
    ["impostoCofre", "Impostos pagos no cofre"]
  ];
  const profitRows = data.dailyProfits
    ? profitLabels.map(([key, label]) => {
      const amount = Number(data.dailyProfits[key]) || 0;
      const tone = amount > 0 ? "positive" : amount < 0 ? "negative" : "";
      return `<div class="bank-statement-row"><span>${label}</span><strong class="${tone}">${amount > 0 ? "+" : ""}${currency(amount)}</strong></div>`;
    }).join("")
    : `<p class="bank-muted">Ainda não há registros de economia neste grupo.</p>`;
  const vaultControls = data.economyEnabled
    ? `<form id="bankVaultForm" class="bank-form bank-vault-form">
        <h3>Movimentar cofre</h3>
        <p class="bank-vault-policy">As regras do cofre são compartilhadas por todos neste grupo/servidor. Seu saldo e eventual imposto são individuais.</p>
        <small>${escapeHtml(vaultModeDescription(data.vaultConfig))}</small>
        <label for="bankVaultAction">Operação</label>
        <select id="bankVaultAction" name="action"><option value="deposit">Depositar no cofre</option><option value="withdraw">Sacar para a carteira</option></select>
        <label for="bankVaultAmount">Valor em SatCoins</label>
        <input id="bankVaultAmount" name="amount" type="text" inputmode="decimal" placeholder="${(data.vaultConfig.minimumMovement / 100).toFixed(2)}" autocomplete="off" required>
        <small>Mínimo: ${currency(data.vaultConfig.minimumMovement)}. Um depósito e um saque por dia local.</small>
        <button type="submit">Confirmar operação</button>
        <p class="local-feedback" id="bankVaultFeedback" role="status" aria-live="polite"></p>
      </form>`
    : `<p class="bank-muted">A movimentação do cofre está indisponível enquanto a economia deste grupo ou servidor estiver desativada.</p>`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Meu banco · ${escapeHtml(data.groupName)}</title><style>
    ${homeStyles()}
    .local-page{width:min(980px,100%);margin:0 auto;padding:30px 0 54px}
    .local-topbar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding-bottom:20px;border-bottom:1px solid var(--line)}
    .local-topbar a{color:#b9c6ff;text-decoration:none;font-weight:700}
    .local-hero{display:flex;align-items:center;gap:18px;margin:26px 0;padding:24px;border:1px solid #6378c444;border-radius:22px;background:linear-gradient(115deg,#202a46,#302654)}
    .local-avatar-frame{display:grid;width:72px;height:72px;flex:none;place-items:center;padding:3px;border:3px solid #a99dff66;border-radius:23px;background:#171d2b}
    .local-avatar{width:62px;height:62px;border-radius:16px;object-fit:cover}
    .local-hero h1{margin:0;font-size:clamp(23px,4vw,34px);overflow-wrap:anywhere}
    .local-hero p{margin:6px 0 0;color:#c1c9df}
    .bank-eyebrow{color:#a99dff;font-size:11px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
    .bank-balances{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0}
    .local-stat{display:flex;min-height:110px;flex-direction:column;justify-content:center;gap:7px;padding:17px;border:1px solid #ffffff0c;border-radius:15px;background:#ffffff05}
    .local-stat small,.local-stat span{color:var(--muted);font-size:11px}
    .local-stat strong{font-size:20px;overflow-wrap:anywhere}
    .bank-balance-total{border-color:#8b7bff44;background:linear-gradient(125deg,#8877ff20,#577cff0c)}
    .bank-balance-total strong{color:#d2cbff}
    .bank-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:22px 0 14px;padding:6px;border:1px solid var(--line);border-radius:15px;background:#0d1220}
    .bank-tabs button{min-height:46px;border:1px solid transparent;border-radius:11px;background:transparent;color:#aab5ca;font:inherit;font-weight:750;cursor:pointer}
    .bank-tabs button[aria-selected="true"]{border-color:#a99dff66;background:#8877ff24;color:#fff;box-shadow:0 6px 18px #635bff20}
    .local-panel{padding:22px;border:1px solid var(--line);border-radius:18px;background:linear-gradient(145deg,#171d2b,#131925)}
    .local-panel h2{margin:0;font-size:19px}
    .bank-muted{color:var(--muted);font-size:13px;line-height:1.6}
    .bank-activity-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:16px}
    .bank-activity{min-height:92px}
    .bank-statement{margin-top:16px}
    .bank-statement-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 2px;border-bottom:1px solid #ffffff12;color:#c4cce0;font-size:13px}
    .bank-statement-row strong{color:#f1f3fa;text-align:right;font-variant-numeric:tabular-nums}
    .bank-statement-row strong.positive{color:#75e0b0}
    .bank-statement-row strong.negative{color:#ff9caa}
    .bank-statement-total{display:flex;justify-content:space-between;gap:14px;margin-top:14px;padding:15px;border:1px solid #8b7bff44;border-radius:12px;background:#8877ff12;font-weight:800}
    .bank-statement-total strong{color:#c6bdff}
    .bank-transactions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .bank-form{display:grid;align-content:start;gap:10px;padding:17px;border:1px solid #ffffff12;border-radius:14px;background:#ffffff04}
    .bank-vault-form{border-color:#8b7bff44;background:linear-gradient(145deg,#8877ff12,#ffffff04)}
    .bank-form h3{margin:0 0 2px;font-size:16px}
    .bank-form label{color:#cbd3e5;font-size:12px;font-weight:700}
    .bank-form input,.bank-form select{width:100%;min-height:44px;border:1px solid #39445d;border-radius:11px;background:#0e1422;color:#fff;padding:10px 12px;font:inherit}
    .bank-form small{color:var(--muted);font-size:11px;line-height:1.55}
    .bank-vault-policy{margin:0;padding:10px 12px;border-left:3px solid #a99dff;border-radius:4px 10px 10px 4px;background:#8877ff12;color:#cbd3e5;font-size:12px;line-height:1.55}
    .bank-form button{min-height:44px;border:0;border-radius:11px;background:linear-gradient(120deg,#8877ff,#577cff);color:#fff;font:inherit;font-weight:750;cursor:pointer}
    .bank-form button:disabled{opacity:.6;cursor:wait}
    .local-feedback{min-height:20px;margin:2px 0 0;color:#9cf0cf;font-size:12px;line-height:1.5}
    .local-feedback.error{color:#ff9caa}
    .bank-back{display:inline-flex;margin-top:18px;color:#b9c6ff;text-decoration:none;font-size:13px;font-weight:700}
    ${cosmeticThemeStyles}
    @media(max-width:640px){.local-page{padding:20px 0 38px}.bank-balances{grid-template-columns:1fr}.bank-transactions{grid-template-columns:1fr}.bank-activity-list{grid-template-columns:1fr}.local-hero{padding:18px}.local-panel{padding:17px}}
  </style></head><body><main class="local-page">
    <nav class="local-topbar"><a href="${profileLink}">← Voltar ao perfil</a><span>${safeBotName} · Banco local</span></nav>
    <header class="local-hero"><span class="local-avatar-frame"><img class="local-avatar" src="${escapeHtml(data.avatarUrl || "/semfoto.jpg")}" alt="Foto de perfil de ${escapeHtml(data.userName)}" onerror="this.onerror=null;this.src='/semfoto.jpg'"></span><div><div class="bank-eyebrow">Banco SatCoins</div><h1>Olá, ${escapeHtml(data.userName)}</h1><p>${groupType}: ${escapeHtml(data.groupName)} · ${escapeHtml(data.platform)}</p></div></header>
    <section class="bank-balances" aria-label="Saldos da conta">
      <article class="local-stat"><small>Carteira</small><strong id="bankWalletBalance">${currency(data.account.balance)}</strong><span>Disponível para usar</span></article>
      <article class="local-stat"><small>Cofre</small><strong id="bankVaultBalance">${currency(data.account.vaultBalance)}</strong><span>Saldo guardado</span></article>
      <article class="local-stat bank-balance-total"><small>Patrimônio total</small><strong id="bankTotalBalance">${currency(data.account.balance + data.account.vaultBalance)}</strong><span>Carteira + cofre</span></article>
    </section>
    <div class="bank-tabs" role="tablist" aria-label="Seções do banco">
      <button type="button" role="tab" id="bankTabWork" aria-controls="bankPanelWork" aria-selected="true" data-bank-tab="work">Trabalhos</button>
      <button type="button" role="tab" id="bankTabStatement" aria-controls="bankPanelStatement" aria-selected="false" data-bank-tab="statement">Extrato</button>
      <button type="button" role="tab" id="bankTabTransactions" aria-controls="bankPanelTransactions" aria-selected="false" data-bank-tab="transactions">Transações</button>
    </div>
    <section class="local-panel" role="tabpanel" id="bankPanelWork" aria-labelledby="bankTabWork" data-bank-panel="work">
      <h2>Atividades de hoje</h2><p class="bank-muted">Acompanhe quantas atividades e trabalhos foram feitos hoje neste grupo ou servidor.</p>
      <div class="bank-activity-list">${activityItems}</div>
    </section>
    <section class="local-panel" role="tabpanel" id="bankPanelStatement" aria-labelledby="bankTabStatement" data-bank-panel="statement" hidden>
      <h2>Extrato de hoje</h2><p class="bank-muted">Resultado líquido por atividade. Valores negativos representam gastos ou perdas.</p>
      <div class="bank-statement">${profitRows}</div>
      <div class="bank-statement-total"><span>Resultado líquido do dia</span><strong>${currency(data.dailyProfitTotal)}</strong></div>
    </section>
    <section class="local-panel" role="tabpanel" id="bankPanelTransactions" aria-labelledby="bankTabTransactions" data-bank-panel="transactions" hidden>
      <h2>Transações</h2><p class="bank-muted">Transfira SatCoins para outra conta deste grupo ou movimente seu saldo no cofre.</p>
      <div class="bank-transactions" style="margin-top:16px">
        <form id="bankTransferForm" class="bank-form"><h3>Transferir SatCoins</h3><label for="bankRecipientId">ID do destinatário</label><input id="bankRecipientId" name="recipientId" maxlength="100" autocomplete="off" required><label for="bankTransferAmount">Valor (mínimo: 10,00)</label><input id="bankTransferAmount" name="amount" type="text" inputmode="decimal" placeholder="10,00" autocomplete="off" required><small>Informe o ID exato de alguém que já tenha uma conta de economia neste grupo.</small><button type="submit">Revisar transferência</button><p class="local-feedback" id="bankTransferFeedback" role="status" aria-live="polite"></p></form>
        ${vaultControls}
      </div>
    </section>
    <a class="bank-back" href="${profileLink}">← Voltar ao painel de membros</a>
  </main><script>
    const bankContext=${JSON.stringify({ platform: data.platform, groupId: data.groupId })};
    async function submitBankAction(endpoint,payload){
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...bankContext,...payload})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Não foi possível concluir a operação.");
      return result;
    }
    function bankFeedback(id,message,isError){
      const element=document.getElementById(id);element.textContent=message;element.classList.toggle("error",Boolean(isError));
    }
    function updateBankBalances(balance,vaultBalance,totalBalance){
      document.getElementById("bankWalletBalance").textContent=balance;
      document.getElementById("bankVaultBalance").textContent=vaultBalance;
      document.getElementById("bankTotalBalance").textContent=totalBalance;
    }
    document.querySelectorAll("[data-bank-tab]").forEach(tab=>tab.addEventListener("click",()=>{
      document.querySelectorAll("[data-bank-tab]").forEach(item=>item.setAttribute("aria-selected",String(item===tab)));
      document.querySelectorAll("[data-bank-panel]").forEach(panel=>{panel.hidden=panel.dataset.bankPanel!==tab.dataset.bankTab});
    }));
    document.getElementById("bankTransferForm").addEventListener("submit",async event=>{
      event.preventDefault();const form=event.currentTarget,button=form.querySelector("button"),recipientId=document.getElementById("bankRecipientId").value.trim(),amount=document.getElementById("bankTransferAmount").value.trim(),normalizedAmount=amount.replace(",",".");
      if(!/^\\d+(?:\\.\\d{1,2})?$/.test(normalizedAmount)||Number(normalizedAmount)<10){bankFeedback("bankTransferFeedback","Informe um valor válido de pelo menos 10,00 SatCoins.",true);return}
      if(!window.confirm("Confirmar transferência de "+normalizedAmount+" SatCoins para o ID "+recipientId+"?"))return;
      button.disabled=true;bankFeedback("bankTransferFeedback","",false);
      try{const result=await submitBankAction("/api/account/local/transfer",{recipientId,amount});updateBankBalances(result.balance,result.vaultBalance,result.totalBalance);bankFeedback("bankTransferFeedback","Transferência concluída. Valor: "+result.amount+" · Saldo restante: "+result.balance,false);form.reset()}
      catch(error){bankFeedback("bankTransferFeedback",error.message,true)}finally{button.disabled=false}
    });
    const bankVaultForm=document.getElementById("bankVaultForm");
    bankVaultForm?.addEventListener("submit",async event=>{
      event.preventDefault();const form=event.currentTarget,button=form.querySelector("button"),action=document.getElementById("bankVaultAction").value,amount=document.getElementById("bankVaultAmount").value.trim(),normalizedAmount=amount.replace(",",".");
      if(!/^\\d+(?:\\.\\d{1,2})?$/.test(normalizedAmount)||Number(normalizedAmount)<=0){bankFeedback("bankVaultFeedback","Informe uma quantia válida maior que zero.",true);return}
      if(!window.confirm((action==="deposit"?"Depositar ":"Sacar ")+normalizedAmount+" SatCoins "+(action==="deposit"?"no cofre?":"do cofre para a carteira?")))return;
      button.disabled=true;bankFeedback("bankVaultFeedback","",false);
      try{
        const result=await submitBankAction("/api/account/local/vault",{action,amount});updateBankBalances(result.balance,result.vaultBalance,result.totalBalance);
        const notices=[];if(result.taxPaid)notices.push("Imposto descontado: "+result.taxPaid);if(result.shortfall)notices.push("Após o imposto, foi possível sacar somente "+result.amount+".");
        bankFeedback("bankVaultFeedback",(action==="deposit"?"Depósito":"Saque")+" concluído. "+notices.join(" ")+" Carteira: "+result.balance+" · Cofre: "+result.vaultBalance,false);form.reset();
      }catch(error){bankFeedback("bankVaultFeedback",error.message,true)}finally{button.disabled=false}
    });
  </script></body></html>`;
}

function getSignalSearchOutlineStyles(outlineKey) {
  const outline = economy.PROFILE_OUTLINES[outlineKey];
  if (!outline) return "";
  const targets = ".signal-page .signal-hero,.signal-page .signal-level-tab,.signal-page .signal-level-card,.signal-page .signal-featured-card,.signal-page .signal-prize-card,.signal-page .signal-wallet,.signal-page .signal-results .signal-result,.signal-dialog,.signal-error-dialog,.signal-reveal-stage,.signal-mini-card";
  if (outline.rainbow) {
    return `@keyframes signal-outline-cycle{0%{border-color:#ff1744}16%{border-color:#ff9100}32%{border-color:#ffea00}48%{border-color:#00e676}64%{border-color:#00b0ff}80%{border-color:#651fff}100%{border-color:#ff1744}}${targets}{border-width:3px;border-style:solid;border-color:#ff1744;animation:signal-outline-cycle 5s linear infinite}.signal-mini-card{animation:mini-card-in .35s ease both,signal-outline-cycle 5s linear infinite}@media(prefers-reduced-motion:reduce){${targets}{animation:none!important;border-color:#ff70cf}}`;
  }
  return `${targets}{border-color:${outline.color}cc!important}.signal-page .signal-level-tab[aria-selected=true],.signal-page .signal-prize-card:hover,.signal-page .signal-prize-card:focus-visible{border-color:${outline.color}!important;box-shadow:0 0 18px ${outline.color}44}.signal-mini-card{border-color:${outline.color}cc}`;
}

function renderSignalSearch(data) {
  const currency = amount => economy.formatMoney(Number(amount) || 0);
  const rarityLabels = {
    [economy.ITEM_RARITY.COMMON]: "Comum",
    [economy.ITEM_RARITY.UNCOMMON]: "Incomum",
    [economy.ITEM_RARITY.RARE]: "Raro",
    [economy.ITEM_RARITY.EPIC]: "Épico",
    [economy.ITEM_RARITY.LEGENDARY]: "Lendário"
  };
  const rewardCatalog = {};
  const resetItems = economy.getStoreItems().filter(item => !item.product && item.key !== "shield");
  const addReward = reward => {
    rewardCatalog[reward.id] = reward;
    return reward;
  };
  const rewards = {
    moneyRecruta: addReward({
      id: "money-recruta", type: "money", name: "Prêmio em SatCoins",
      details: `De ${currency(economy.SIGNAL_SEARCH_LEVELS.recruta.cashMin)} a ${currency(economy.SIGNAL_SEARCH_LEVELS.recruta.cashMax)} SatCoins`,
      rarity: economy.ITEM_RARITY.COMMON
    }),
    moneyEspecializada: addReward({
      id: "money-especializada", type: "money", name: "Prêmio em SatCoins",
      details: `De ${currency(economy.SIGNAL_SEARCH_LEVELS.especializada.cashMin)} a ${currency(economy.SIGNAL_SEARCH_LEVELS.especializada.cashMax)} SatCoins`,
      rarity: economy.ITEM_RARITY.COMMON
    }),
    recruitResets: resetItems.filter(item => item.key !== "all").map(item => addReward({
      id: `reset-${item.key}`, type: "reset", name: item.name, details: "Reset da Loja do Bot",
      rarity: item.rarity, itemKey: item.key
    })),
    epicResets: resetItems.filter(item => item.rarity === economy.ITEM_RARITY.EPIC).map(item => addReward({
      id: `reset-${item.key}`, type: "reset", name: item.name, details: "Reset Épico da Loja do Bot",
      rarity: item.rarity, itemKey: item.key
    })),
    bundles: Object.values(economy.SIGNAL_SEARCH_BUNDLES).map(bundle => addReward({
      id: `bundle-${bundle.key}`, type: "bundle", name: bundle.label,
      details: `${bundle.contentsLabel} · não comprável · repetido: ${currency(bundle.duplicateReward)}`,
      rarity: bundle.rarity, bundleKey: bundle.key, contentsLabel: bundle.contentsLabel
    })),
    cosmetics: [
      ...Object.entries(economy.PROFILE_BACKGROUNDS).map(([key, item]) => addReward({
        id: `background-${key}`, type: "background", name: `Fundo ${item.label}`,
        details: `Cosmético de perfil · ID ${item.id}`, rarity: item.rarity,
        key, rainbow: Boolean(item.rainbow), stops: item.stops, accent: item.accent
      })),
      ...Object.entries(economy.PROFILE_OUTLINES).map(([key, item]) => addReward({
        id: `outline-${key}`, type: "outline", name: `Outline ${item.label}`,
        details: `Cosmético de perfil · ID ${item.id}`, rarity: item.rarity,
        key, rainbow: Boolean(item.rainbow), color: item.color
      }))
    ]
  };
  const rewardArt = reward => {
    if (reward.type === "background") {
      const style = reward.rainbow
        ? "background:linear-gradient(110deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744);background-size:300% 300%"
        : `background:linear-gradient(145deg,${reward.stops[0]},${reward.stops[1]} 55%,${reward.stops[2]})`;
      return `<span class="signal-reward-art${reward.rainbow ? " rainbow-background" : ""}" style="${style}" aria-hidden="true"></span>`;
    }
    if (reward.type === "outline") {
      const border = reward.rainbow
        ? "border:7px solid transparent;background:linear-gradient(#111827,#111827) padding-box,linear-gradient(90deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744) border-box;background-size:100% 100%,300% 100%"
        : `border:5px solid ${reward.color}`;
      return `<span class="signal-reward-art outline-art${reward.rainbow ? " rainbow-outline-art" : ""}" aria-hidden="true"><i style="${border}"></i></span>`;
    }
    if (reward.type === "bundle") {
      return `<span class="signal-reward-art icon-art" style="border-color:#91dcff;background:radial-gradient(circle,#285b78,#111827 72%);color:#c6f4ff;text-shadow:0 0 16px #75dfff" aria-hidden="true">❄</span>`;
    }
    return `<span class="signal-reward-art icon-art" aria-hidden="true">${reward.type === "money" ? "💷" : reward.type === "market" ? "📦" : "↻"}</span>`;
  };
  const rewardButton = reward => `<button class="signal-prize-card${reward.rarity === economy.ITEM_RARITY.EPIC ? " epic" : ""}${reward.rainbow ? " rainbow-prize" : ""}" type="button" data-signal-reward="${escapeHtml(reward.id)}" aria-label="Ver prêmio: ${escapeHtml(reward.name)}">
    ${rewardArt(reward)}<span class="signal-prize-info"><strong>${escapeHtml(reward.name)}</strong><small>${escapeHtml(rarityLabels[reward.rarity] || reward.rarity)} · ${escapeHtml(reward.details)}</small></span><span class="signal-prize-open">Ver</span>
  </button>`;
  const featuredReset = rewards.epicResets.find(item => item.itemKey === "all");
  const featuredBundle = rewards.bundles[0];
  const localSignalSearch = data.localSignalSearch || { enabled: false, tiers: {}, featured: [], marketItems: [], botItems: [] };
  const localRewards = [];
  for (const rarity of economy.LOCAL_SIGNAL_RARITIES) {
    const tier = localSignalSearch.tiers[rarity];
    if (!tier || tier.chance <= 0) continue;
    if (tier.cashMin !== null && tier.cashMax !== null) {
      localRewards.push(addReward({
        id: `local-money-${rarity}`, type: "money", name: "Prêmio em SatCoins",
        details: `De ${currency(tier.cashMin)} a ${currency(tier.cashMax)}`,
        rarity, source: "local", chance: tier.chance
      }));
    }
    for (const key of tier.botItems) {
      const item = localSignalSearch.botItems.find(candidate => candidate.key === key);
      if (!item) continue;
      localRewards.push(addReward({
        id: `local-bot-${key}`, type: "reset", name: item.name, details: "Prêmio da Loja do Bot",
        rarity, source: "bot", itemKey: key, chance: tier.chance
      }));
    }
    for (const id of tier.marketItems) {
      const item = localSignalSearch.marketItems.find(candidate => candidate.id === id);
      if (!item) continue;
      localRewards.push(addReward({
        id: `local-market-${id}`, type: "market", name: item.name,
        details: `Pedido do Mercado Local · ${item.category}${item.quantity === 0 ? " · Esgotado" : ""}`,
        rarity, source: "market", itemId: id, chance: tier.chance,
        unavailable: item.quantity === 0
      }));
    }
    for (const key of tier.backgrounds || []) {
      const item = localSignalSearch.backgrounds.find(candidate => candidate.key === key);
      if (!item) continue;
      const catalogItem = economy.PROFILE_BACKGROUNDS[key];
      localRewards.push(addReward({
        id: `local-background-${key}`, type: "background", name: `Fundo ${item.name}`,
        details: `Cosmético de perfil · ID ${catalogItem.id}`, rarity,
        key, rainbow: Boolean(catalogItem.rainbow), stops: catalogItem.stops,
        accent: catalogItem.accent, source: "local", chance: tier.chance
      }));
    }
    for (const key of tier.outlines || []) {
      const item = localSignalSearch.outlines.find(candidate => candidate.key === key);
      if (!item) continue;
      const catalogItem = economy.PROFILE_OUTLINES[key];
      localRewards.push(addReward({
        id: `local-outline-${key}`, type: "outline", name: `Outline ${item.name}`,
        details: `Cosmético de perfil · ID ${catalogItem.id}`, rarity,
        key, rainbow: Boolean(catalogItem.rainbow), color: catalogItem.color,
        source: "local", chance: tier.chance
      }));
    }
  }
  const localFeaturedRewards = localSignalSearch.featured.map(item => {
    if (item.type === "bot") return localRewards.find(reward => reward.id === `local-bot-${item.key}`);
    if (item.type === "market") return localRewards.find(reward => reward.id === `local-market-${item.id}`);
    return localRewards.find(reward => reward.id === `local-${item.type}-${item.key}`);
  }).filter(Boolean);
  const searchLevels = data.signalSearch?.levels || {};
  const levelCards = Object.entries(economy.SIGNAL_SEARCH_LEVELS).map(([key, level]) => {
    const progress = searchLevels[key] || { pullsUntilEpic: 10, pullsUntilWorkReset: key === "recruta" ? 5 : null };
    const isRecruit = key === "recruta";
    const disabled = data.economyEnabled ? "" : " disabled";
    const availableRewards = isRecruit
      ? [rewards.moneyRecruta, ...rewards.recruitResets, ...rewards.epicResets]
      : [rewards.moneyEspecializada, ...rewards.recruitResets, ...rewards.epicResets, ...rewards.cosmetics, ...rewards.bundles];
    const prizeList = `<div class="signal-prize-grid">${availableRewards.map(rewardButton).join("")}</div>`;
    const detail = isRecruit
      ? `${level.weights.money}% de chance de SatCoins e ${level.weights.reset}% de reset. Reset de trabalho garantido em até ${progress.pullsUntilWorkReset} busca(s); Épico em até ${progress.pullsUntilEpic}.`
      : `${level.weights.money}% de chance de SatCoins, ${level.weights.reset}% de reset e ${level.weights.cosmetic}% de cosmético. Épico garantido em até ${progress.pullsUntilEpic} busca(s).`;
    return `<article class="signal-level-card${isRecruit ? " selected" : ""}" data-signal-level-card="${key}"${isRecruit ? "" : " hidden"}>
      <header><div><span class="signal-level-kicker">${isRecruit ? "NÍVEL 01" : "NÍVEL 02"}</span><h2>${escapeHtml(level.label)}</h2></div><span class="signal-level-emblem" aria-hidden="true">${isRecruit ? "✦" : "✧"}</span></header>
      <p>${detail}</p><div class="signal-level-cost"><span>Por busca</span><strong>${currency(level.price)}</strong><span>Busca x10</span><strong>${currency(level.price * 10)}</strong></div>
      <div class="signal-search-buttons"><button type="button" data-signal-level="${key}" data-signal-quantity="1"${disabled}>Buscar x1</button><button type="button" data-signal-level="${key}" data-signal-quantity="10"${disabled}>Buscar x10</button></div>
      <details class="signal-prizes-details"><summary>Ver prêmios disponíveis</summary>${prizeList}</details>
    </article>`;
  }).join("");
  const localLevelCard = (() => {
    const activeTiers = economy.LOCAL_SIGNAL_RARITIES
      .filter(rarity => localSignalSearch.tiers[rarity]?.chance > 0)
      .map(rarity => `${rarityLabels[rarity] || rarity}: ${localSignalSearch.tiers[rarity].chance}%`);
    const guarantees = economy.LOCAL_SIGNAL_RARITIES
      .filter(rarity => localSignalSearch.pullsUntilGuarantee?.[rarity] !== null &&
        localSignalSearch.pullsUntilGuarantee?.[rarity] !== undefined)
      .map(rarity => `${rarityLabels[rarity] || rarity} garantido em até ${localSignalSearch.pullsUntilGuarantee[rarity]} busca(s)`);
    const detail = localSignalSearch.enabled
      ? [
        `Chances: ${activeTiers.join(" · ") || "nenhum prêmio configurado"}.`,
        guarantees.length ? `Garantias: ${guarantees.join(" · ")}.` : "Sem garantias por raridade configuradas."
      ].join(" ")
      : "A Busca Local ainda não foi ativada pelos administradores deste grupo ou servidor.";
    const availableRewards = localRewards.filter(reward => !reward.unavailable);
    const prizeList = localSignalSearch.enabled
      ? `<div class="signal-prize-grid">${availableRewards.map(rewardButton).join("") || '<p class="signal-featured-empty">Nenhum prêmio disponível no momento.</p>'}</div>`
      : `<p class="signal-featured-empty">Peça a um administrador para configurar e ativar esta busca.</p>`;
    const price = Number(localSignalSearch.price) || 0;
    return `<article class="signal-level-card" data-signal-level-card="local" hidden>
      <header><div><span class="signal-level-kicker">NÍVEL LOCAL</span><h2>Busca Local</h2></div><span class="signal-level-emblem" aria-hidden="true">✦</span></header>
      <p>${escapeHtml(detail)}</p><div class="signal-level-cost"><span>Por busca</span><strong>${currency(price)}</strong><span>Busca x10</span><strong>${currency(price * 10)}</strong></div>
      <div class="signal-search-buttons"><button type="button" data-signal-level="local" data-signal-quantity="1"${data.economyEnabled && localSignalSearch.enabled ? "" : " disabled"}>Buscar x1</button><button type="button" data-signal-level="local" data-signal-quantity="10"${data.economyEnabled && localSignalSearch.enabled ? "" : " disabled"}>Buscar x10</button></div>
      <details class="signal-prizes-details"><summary>Ver prêmios disponíveis</summary>${prizeList}</details>
    </article>`;
  })();
  const allLevelCards = levelCards + localLevelCard;
  const localFeaturedMarkup = localFeaturedRewards.length
    ? localFeaturedRewards.map(reward => `<button class="signal-featured-card" type="button" data-signal-reward="${escapeHtml(reward.id)}">${rewardArt(reward)}<span><strong>${escapeHtml(reward.name)}</strong><small>${escapeHtml(rarityLabels[reward.rarity] || reward.rarity)} · Destaque da Busca Local</small></span></button>`).join("")
    : `<p class="signal-featured-empty">Os administradores ainda não definiram destaques para a Busca Local.</p>`;
  const context = {
    platform: data.platform,
    groupId: data.groupId,
    levels: {
      ...Object.fromEntries(Object.entries(economy.SIGNAL_SEARCH_LEVELS).map(([key, level]) => [key, level.price])),
      local: localSignalSearch.price
    },
    rewards: rewardCatalog
  };
  const profileLink = `/painel-local?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Busca de Sinais · ${escapeHtml(data.groupName)}</title><style>
    :root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#090c15;color:#f5f7fb}*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:24px;background:radial-gradient(ellipse at 50% -15%,#4b3176 0,#151a31 34%,#090c15 74%)}button,a{font:inherit}.signal-page{width:min(1040px,100%);margin:0 auto}.signal-topbar{display:flex;justify-content:space-between;gap:12px;padding:8px 0 18px;border-bottom:1px solid #ffffff18}.signal-topbar a{color:#d5c9ff;text-decoration:none;font-weight:700}.signal-topbar span{color:#aab3c8;font-size:12px}.signal-hero{position:relative;overflow:hidden;margin:22px 0;padding:clamp(22px,5vw,38px);border:1px solid #b996ff44;border-radius:22px;background:linear-gradient(120deg,#171c35eF,#32204be8 65%,#102b3beF);box-shadow:0 22px 70px #0005}.signal-hero:after{position:absolute;inset:auto -12% -90% 45%;height:100%;border-radius:50%;background:#c085ff22;filter:blur(35px);content:""}.signal-hero h1{position:relative;z-index:1;margin:7px 0;font-size:clamp(29px,5vw,44px)}.signal-hero p{position:relative;z-index:1;max-width:680px;margin:0;color:#d0d5e5;line-height:1.6}.signal-eyebrow,.signal-level-kicker{color:#d1b3ff;font-size:10px;font-weight:850;letter-spacing:.18em}.signal-balance{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}.signal-balance span{padding:9px 12px;border:1px solid #ffffff1a;border-radius:10px;background:#05091466;color:#bbc4d7;font-size:12px}.signal-balance strong{color:#fff}.signal-featured{position:relative;z-index:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:22px}.signal-featured-card{display:flex;min-width:0;align-items:center;gap:14px;padding:14px;border:1px solid #d6a5ff77;border-radius:15px;background:#100d1caa;color:#fff;text-align:left;cursor:pointer;transition:transform .18s ease,border-color .18s ease}.signal-featured-card:hover,.signal-featured-card:focus-visible{transform:translateY(-3px);border-color:#fff;outline:2px solid #d6a5ff66;outline-offset:2px}.signal-featured-card strong,.signal-featured-card small{display:block}.signal-featured-card small{margin-top:5px;color:#c5b9d8;font-size:11px}.signal-featured-card .signal-reward-art{width:72px;height:58px;flex:none}.signal-section-title{margin:28px 0 12px}.signal-section-title h2{margin:0;font-size:20px}.signal-section-title p{margin:5px 0 0;color:#aab3c8;font-size:12px}.signal-wallet{margin:14px 0;padding:13px 15px;border:1px solid #ffffff16;border-radius:13px;background:#ffffff06;color:#adb7ca;font-size:13px}.signal-wallet strong{color:#fff}.signal-level-picker{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:12px}.signal-level-tab{min-height:48px;padding:10px 14px;border:1px solid #ffffff24;border-radius:12px;background:#ffffff08;color:#cbd2e2;text-align:left;font-weight:750;cursor:pointer}.signal-level-tab span{float:right;color:#9da7bb;font-size:11px;font-weight:500}.signal-level-tab[aria-selected=true]{border-color:#b997ff;background:linear-gradient(120deg,#8c68dc3b,#557cff22);color:#fff;box-shadow:0 0 22px #8f68ff1c}.signal-level-card{padding:clamp(17px,4vw,25px);border:1px solid #ffffff1c;border-radius:18px;background:linear-gradient(145deg,#191e30,#111724);box-shadow:0 16px 42px #0003}.signal-level-card[hidden]{display:none}.signal-level-card>header{display:flex;justify-content:space-between;align-items:center}.signal-level-card h2{margin:4px 0 0;font-size:24px}.signal-level-emblem{display:grid;width:44px;height:44px;place-items:center;border:1px solid #c59dff66;border-radius:14px;background:#a775ff1a;color:#ddc8ff;font-size:25px}.signal-level-card>p{max-width:700px;color:#aab3c8;font-size:13px;line-height:1.6}.signal-level-cost{display:grid;grid-template-columns:1fr auto;gap:8px;margin:17px 0;padding:12px 14px;border:1px solid #ffffff12;border-radius:12px;background:#ffffff05;color:#aab3c8;font-size:12px}.signal-level-cost strong{color:#fff;text-align:right}.signal-search-buttons{display:flex;flex-wrap:wrap;gap:9px}.signal-search-buttons button,.signal-modal-next{min-height:44px;padding:10px 17px;border:0;border-radius:11px;background:linear-gradient(120deg,#9876ff,#5a7bff);color:#fff;font-weight:800;cursor:pointer;box-shadow:0 8px 22px #625cff2b}.signal-search-buttons button:hover,.signal-modal-next:hover{filter:brightness(1.12)}.signal-search-buttons button:disabled{opacity:.5;cursor:not-allowed}.signal-prizes-details{margin-top:20px;border-top:1px solid #ffffff12}.signal-prizes-details summary{padding:15px 0 4px;color:#d8c6ff;font-size:13px;font-weight:750;cursor:pointer}.signal-prize-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:14px}.signal-prize-card{display:flex;min-width:0;align-items:center;gap:10px;padding:10px;border:1px solid #ffffff19;border-radius:12px;background:#ffffff05;color:#f5f7fb;text-align:left;cursor:pointer;transition:transform .16s ease,border-color .16s ease}.signal-prize-card:hover,.signal-prize-card:focus-visible{transform:translateY(-2px);border-color:#8ecfff;outline:2px solid #8ecfff33;outline-offset:1px}.signal-prize-card.epic{border-color:#d4a0ff66;background:linear-gradient(130deg,#a45adb14,#ffffff05)}.signal-prize-card.rainbow-prize{border-color:#ff92e988;box-shadow:inset 0 0 18px #f0a8c611}.signal-reward-art{display:grid;width:56px;height:44px;flex:none;place-items:center;overflow:hidden;border:1px solid #ffffff24;border-radius:9px;background:linear-gradient(145deg,#263858,#111827);font-size:23px}.signal-reward-art.rainbow-background{background-size:300% 300%;animation:signal-rainbow 5s linear infinite}    .outline-art{padding:8px;background:#111827}.outline-art i{display:block;width:100%;height:100%;border-radius:7px}.outline-art.rainbow-outline-art i{animation:signal-rainbow 5s linear infinite}.signal-prize-info{display:block;min-width:0;flex:1}.signal-prize-info strong,.signal-prize-info small{display:block;overflow:hidden;text-overflow:ellipsis}.signal-prize-info strong{font-size:12px}.signal-prize-info small{margin-top:4px;color:#9da9c0;font-size:10px;line-height:1.4}.signal-prize-open{color:#d1b3ff;font-size:11px;font-weight:800}.signal-featured .outline-art{width:72px;height:58px}.signal-feedback{min-height:22px;margin-top:12px;color:#9cf0cf;font-size:13px;line-height:1.5}.signal-feedback.error{color:#ff9caa}.signal-results{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:14px}.signal-results[hidden]{display:none}.signal-result{padding:11px;border:1px solid #73c9ec44;border-radius:11px;background:linear-gradient(145deg,#14324a,#0c1423);font-size:11px;line-height:1.5;overflow-wrap:anywhere}.signal-result.epic{border-color:#d8a4ff88;background:linear-gradient(145deg,#42244f,#161326)}.signal-return{display:inline-block;margin-top:18px;color:#cbbaff;text-decoration:none;font-size:12px}.signal-dialog{width:min(720px,calc(100% - 24px));max-width:none;max-height:min(850px,calc(100% - 24px));padding:0;overflow:auto;border:1px solid #d2a2ff77;border-radius:22px;background:#0b0d17;color:#f5f7fb;box-shadow:0 30px 110px #000d}.signal-dialog::backdrop{background:#03040bcc;backdrop-filter:blur(7px)}.signal-dialog-inner{position:relative;min-height:440px;padding:clamp(18px,5vw,32px);background:radial-gradient(ellipse at 50% 15%,#7251a055,transparent 58%),radial-gradient(circle at 15% 80%,#3b81a52b,transparent 35%),linear-gradient(145deg,#101525,#090b13 70%)}.signal-dialog-inner:before{position:absolute;inset:12% 18%;border:1px solid #d8b7ff26;border-radius:50%;box-shadow:0 0 60px #a883ff1c,0 0 140px #748aff12;content:"";pointer-events:none}.signal-dialog-top{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px}.signal-dialog-top small{color:#d6bbff;font-size:10px;font-weight:850;letter-spacing:.2em}.signal-dialog-close{display:grid;width:38px;height:38px;place-items:center;border:1px solid #ffffff2a;border-radius:11px;background:#ffffff0b;color:#fff;font-size:22px;cursor:pointer}.signal-presentation-wrap{position:relative;z-index:1;display:grid;min-height:330px;place-items:center;perspective:1200px;overflow:hidden}.signal-3d-card{position:relative;display:flex;width:min(380px,100%);min-height:270px;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;border:1px solid #8fd7ff88;border-radius:20px;background:linear-gradient(145deg,#173752,#111727 68%);text-align:center;transform-style:preserve-3d;box-shadow:0 24px 70px #0009,0 0 38px #54c9ff24;animation:signal-card-camera 4.8s ease-in-out infinite}.signal-3d-card.epic{border-color:#dba7ff;background:linear-gradient(145deg,#4f2b68,#171326 72%);box-shadow:0 24px 70px #0009,0 0 50px #d8a4ff44}.signal-3d-card.rainbow-bg{background:linear-gradient(130deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744);background-size:350% 350%;animation:signal-card-camera 4.8s ease-in-out infinite,signal-rainbow 6s linear infinite}.signal-3d-card.rainbow-outline{border:3px solid transparent;background:linear-gradient(145deg,#161b2b,#10131e) padding-box,linear-gradient(90deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744) border-box;background-size:100% 100%,300% 100%;animation:signal-card-camera 4.8s ease-in-out infinite,signal-rainbow 5s linear infinite}.signal-card-icon{display:grid;width:78px;height:78px;place-items:center;border:1px solid #ffffff38;border-radius:22px;background:#ffffff14;font-size:38px;box-shadow:0 12px 30px #0004;transform:translateZ(38px)}.signal-3d-card h2{max-width:100%;margin:0;font-size:clamp(22px,5vw,30px);text-shadow:0 3px 20px #0008;transform:translateZ(30px)}.signal-3d-card p{max-width:320px;margin:0;color:#e0e4ef;font-size:13px;line-height:1.5;transform:translateZ(22px)}.signal-card-rarity{padding:6px 10px;border:1px solid #ffffff44;border-radius:20px;background:#090b1688;color:#fff;font-size:10px;font-weight:850;letter-spacing:.14em;text-transform:uppercase;transform:translateZ(44px)}.signal-modal-footer{position:relative;z-index:2;display:flex;justify-content:center;gap:10px}.signal-modal-next[hidden]{display:none}.signal-modal-footer .signal-feedback{margin:0;text-align:center}.signal-dialog-results{position:relative;z-index:2;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.signal-dialog-results[hidden]{display:none}.signal-dialog-results .signal-result{text-align:left}@keyframes signal-card-camera{0%,100%{transform:rotateY(-15deg) rotateX(7deg) translateY(0)}35%{transform:rotateY(12deg) rotateX(-3deg) translateY(-7px)}68%{transform:rotateY(20deg) rotateX(5deg) translateY(2px)}}@keyframes signal-rainbow{to{background-position:100% 50%}}@media(prefers-reduced-motion:reduce){.signal-reward-art.rainbow-background,.signal-3d-card{animation:none}}@media(max-width:700px){body{padding:15px}.signal-featured,.signal-level-picker{grid-template-columns:1fr}.signal-prize-grid{grid-template-columns:1fr}.signal-results,.signal-dialog-results{grid-template-columns:repeat(2,minmax(0,1fr))}.signal-dialog-inner{min-height:400px}.signal-presentation-wrap{min-height:285px}.signal-3d-card{min-height:240px}}@media(max-width:420px){.signal-level-cost{font-size:11px}.signal-search-buttons button{flex:1}.signal-results,.signal-dialog-results{grid-template-columns:1fr 1fr}.signal-dialog-results .signal-result{padding:8px;font-size:10px}}
  </style><style>
    .signal-level-picker{grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}
    .signal-featured{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
    .signal-featured-group{display:contents}
    .signal-featured-group[hidden]{display:none}
    .signal-featured-empty{grid-column:1/-1;margin:0;padding:14px;border:1px dashed #ffffff2b;border-radius:12px;color:#aab3c8;font-size:12px}
  </style></head><body><main class="signal-page">
    <nav class="signal-topbar"><a href="${profileLink}">← Painel local</a><span>${escapeHtml(data.groupName)} · ${escapeHtml(data.platform)}</span></nav>
    <header class="signal-hero"><span class="signal-eyebrow">TRANSMISSÃO DE SINAIS</span><h1>Busca de Sinais</h1><p>Escolha um nível, faça uma busca x1 ou x10 e revele os prêmios disponíveis.</p>
      <div class="signal-balance"><span>Carteira: <strong id="signalWalletBalance">${currency(data.account.balance)}</strong></span><span>Garantias independentes por nível</span></div>
      <div class="signal-featured" aria-label="Prêmios em destaque">
        <div class="signal-featured-group" data-signal-featured-group="recruta">
          <button class="signal-featured-card" type="button" data-signal-reward="${featuredReset.id}">${rewardArt(featuredReset)}<span><strong>Resetar todos</strong><small>Épico · Destaque da Busca Recruta</small></span></button>
        </div>
        <div class="signal-featured-group" data-signal-featured-group="especializada" hidden>
          <button class="signal-featured-card" type="button" data-signal-reward="${featuredBundle.id}">${rewardArt(featuredBundle)}<span><strong>Pacote Congelado Azul</strong><small>Épico · não comprável · duplicata: 250,00 SatCoins</small></span></button>
        </div>
        <div class="signal-featured-group" data-signal-featured-group="local" hidden>${localFeaturedMarkup}</div>
      </div>
    </header>
    <header class="signal-section-title"><h2>Escolha sua busca</h2><p>O pagamento é descontado da carteira; o saldo do cofre não é utilizado.</p></header>
    <div class="signal-wallet">Saldo disponível para esta busca: <strong id="signalAvailableBalance">${currency(data.account.balance)}</strong></div>
    <div class="signal-level-picker" role="tablist" aria-label="Nível da busca">
      <button class="signal-level-tab" type="button" role="tab" aria-selected="true" data-signal-level-tab="recruta">Busca Recruta <span>${currency(economy.SIGNAL_SEARCH_LEVELS.recruta.price)}</span></button>
      <button class="signal-level-tab" type="button" role="tab" aria-selected="false" data-signal-level-tab="especializada">Busca Especializada <span>${currency(economy.SIGNAL_SEARCH_LEVELS.especializada.price)}</span></button>
      <button class="signal-level-tab" type="button" role="tab" aria-selected="false" data-signal-level-tab="local">Busca Local <span>${currency(localSignalSearch.price)}</span></button>
    </div>
    ${allLevelCards}
    ${data.economyEnabled ? "" : `<p class="signal-feedback error">A economia está desativada neste grupo ou servidor; as buscas ficam indisponíveis.</p>`}
    <p id="signalSearchFeedback" class="signal-feedback" role="status" aria-live="polite"></p>
    <div id="signalSearchResults" class="signal-results" aria-live="polite" hidden></div>
    <a class="signal-return" href="${profileLink}">Voltar ao painel da conta local</a>
  </main>
  <style>
    .signal-presentation-wrap{position:relative;z-index:1;display:grid;min-height:360px;place-items:center;perspective:1200px;overflow:hidden}
    .signal-card-camera{transform-style:preserve-3d}
    .signal-card{position:relative;width:min(270px,72vw);height:350px;transform-style:preserve-3d;opacity:0}
    .signal-dialog[open] .signal-card{animation:card-unseal 1.05s cubic-bezier(.16,.76,.25,1) both,card-float 3.4s ease-in-out 1.05s infinite alternate}
    .signal-card-face{position:absolute;inset:0;display:flex;flex-direction:column;overflow:hidden;border:1px solid #9de7ff99;border-radius:19px;background:linear-gradient(155deg,#173b56,#101a2d 58%,#101423);backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:0 20px 55px #0009,inset 0 0 0 5px #8ce2f012,inset 0 0 26px #72d9f022}
    .signal-card-face:before{position:absolute;inset:8px;border:1px solid #9de7ff24;border-radius:13px;content:"";pointer-events:none}
    .signal-card-back{align-items:center;justify-content:center;gap:24px;transform:rotateY(180deg);background:radial-gradient(circle,#285678,#10182a 67%)}
    .signal-card-back-mark{color:#bbf2ff;font-size:64px;text-shadow:0 0 35px #6edaff}
    .signal-card-back-label{text-align:center;color:#bdeafa;font-size:20px;font-weight:900;letter-spacing:.28em;line-height:1.5}
    .signal-card-back-code{position:absolute;bottom:25px;color:#7199ae;font-size:10px;letter-spacing:.2em}
    .signal-card-front{padding:17px 17px 14px;transform:rotateY(0deg)}
    .signal-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .signal-card-rarity{color:#91def5;font-size:9px;font-weight:900;letter-spacing:.17em}
    .signal-card-stars{color:#8fdef4;font-size:12px;letter-spacing:2px}
    .signal-card-art{position:relative;display:grid;flex:1;min-height:0;place-items:center;margin:15px 0 10px;overflow:hidden;border:1px solid #9de7ff24;border-radius:12px;background:radial-gradient(ellipse at 50% 48%,#3679a955,transparent 58%),linear-gradient(145deg,#162d45,#101425)}
    .signal-card-art:before,.signal-card-art:after{position:absolute;width:170px;height:170px;border:1px solid #8ce2f02b;border-radius:50%;content:"";transform:rotateX(68deg)}
    .signal-card-art:after{transform:rotateY(68deg)}
    .signal-card-art-orbit{position:absolute;width:118px;height:118px;border:1px solid #a3eaff8a;border-radius:50%;box-shadow:0 0 30px #51c9f955,inset 0 0 25px #58c8ec22}
    .signal-card-art-core{position:relative;z-index:1;display:grid;width:76px;height:76px;place-items:center;border:1px solid #d5f7ffbb;border-radius:24px;background:radial-gradient(circle at 35% 30%,#e0fbff,#60c4e7 38%,#24537b 100%);color:#fff;font-size:37px;box-shadow:0 0 35px #70dcffbb,inset 0 0 18px #e6fbff88}
    .signal-card-art-glint{position:absolute;top:17%;right:19%;color:#e6fcff;font-size:26px;text-shadow:0 0 14px #9eeaff}
    .signal-card-copy{display:grid;gap:5px}
    .signal-card-type,.signal-card-index{color:#91a9be;font-size:8px;font-weight:800;letter-spacing:.14em}
    .signal-card-copy strong{font-size:17px;line-height:1.15}
    .signal-card-copy small{color:#b4c3d5;font-size:10px}
    .signal-card-index{margin-top:11px;font-size:7px}
    .signal-card.epic .signal-card-face{border-color:#ebc0ff;background:linear-gradient(155deg,#633c79,#261f43 58%,#151426);box-shadow:0 20px 65px #6d319799,inset 0 0 0 5px #f4d0ff12,inset 0 0 34px #d787ff55}
    .signal-card.epic .signal-card-face:before{border-color:#f0d7ff44}
    .signal-card.epic .signal-card-art{background:radial-gradient(ellipse at 50% 48%,#a857c877,transparent 58%),linear-gradient(145deg,#392749,#171527)}
    .signal-card.epic .signal-card-art-orbit{border-color:#edc0ffcc;box-shadow:0 0 40px #d27bff99,inset 0 0 25px #d27bff44}
    .signal-card.epic .signal-card-art-core{border-color:#f6ddff;background:radial-gradient(circle at 35% 30%,#fff5ff,#db9fff 38%,#75439c 100%);box-shadow:0 0 42px #d584ffdd,inset 0 0 18px #fff3ff}
    .signal-card.epic .signal-card-stars,.signal-card.epic .signal-card-rarity{color:#edc1ff}
    .signal-card.epic .signal-card-art-glint{color:#fff0ff;text-shadow:0 0 16px #dfa0ff}
    .signal-card.legendary .signal-card-face{border-color:#ffe28a;box-shadow:0 20px 70px #d49b2877,inset 0 0 0 5px #fff0b322,inset 0 0 38px #ffd65a66}
    .signal-card.legendary .signal-card-face:before{border-color:#fff0b366}
    .signal-card.legendary .signal-card-stars,.signal-card.legendary .signal-card-rarity{color:#ffe28a;text-shadow:0 0 12px #ffc94a99}
    .signal-card.legendary .signal-card-art-orbit{border-color:#ffe28acc;box-shadow:0 0 42px #ffd65a99,inset 0 0 25px #ffd65a55;animation:legendary-orbit 4s linear infinite}
    .signal-card.legendary .signal-card-art-core{border-color:#fff0b3;background:radial-gradient(circle at 35% 30%,#fffbe6,#ffe28a 38%,#9c641e 100%);box-shadow:0 0 48px #ffd65add,inset 0 0 18px #fff9d8}
    .signal-card.legendary .signal-card-art-glint{color:#fff4c2;text-shadow:0 0 20px #ffd65a;animation:legendary-glint 1.2s ease-in-out infinite alternate}
    .signal-reveal-stage.is-legendary{border-color:#ffe28a;box-shadow:0 24px 100px #a9762466,inset 0 0 65px #f4c84a33}
    .signal-card.rainbow-background .signal-card-face{background:linear-gradient(145deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744);background-size:350% 350%;animation:signal-rainbow 6s linear infinite}
    .signal-card.rainbow-outline .signal-card-face{border:8px solid transparent;background:linear-gradient(145deg,#161b2b,#10131e) padding-box,linear-gradient(90deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744) border-box;background-size:100% 100%,300% 100%;animation:signal-rainbow 5s linear infinite}
    @keyframes camera-sweep{0%{transform:perspective(1200px) rotateX(-5deg) rotateY(-10deg)}50%{transform:perspective(1200px) rotateX(3deg) rotateY(7deg)}100%{transform:perspective(1200px) rotateX(-2deg) rotateY(12deg)}}
    @keyframes card-unseal{0%{opacity:0;transform:rotateY(180deg) rotateX(14deg) scale(.68) translateY(22px)}65%{opacity:1;transform:rotateY(-12deg) rotateX(-4deg) scale(1.04)}100%{opacity:1;transform:rotateY(0) rotateX(0) scale(1)}}
    @keyframes card-float{to{translate:0 -7px}}
    .signal-dialog[open] .signal-card-camera{animation:camera-sweep 4.8s ease-in-out 1.1s infinite alternate}
    @media(max-width:600px){.signal-presentation-wrap{min-height:310px}.signal-card{width:min(245px,75vw);height:320px}}
    .signal-reveal-stage{position:relative;display:grid;min-height:390px;place-items:center;overflow:hidden;border:1px solid #73c9ec44;border-radius:20px;background:radial-gradient(ellipse at center,#1d3853aa,transparent 58%),linear-gradient(145deg,#101d30,#0c1220 60%,#151326);perspective:1200px}
    .signal-reveal-stage:before,.signal-reveal-stage:after{position:absolute;content:"";border:1px solid #8ce2f020;border-radius:50%;aspect-ratio:1}
    .signal-reveal-stage:before{width:min(70vw,430px)}.signal-reveal-stage:after{width:min(54vw,330px)}
    .signal-reveal-stage .signal-grid{position:absolute;inset:0;z-index:0;opacity:.22;background-image:linear-gradient(#8ce2f01b 1px,transparent 1px),linear-gradient(90deg,#8ce2f01b 1px,transparent 1px);background-size:38px 38px;mask-image:radial-gradient(ellipse,#000 15%,transparent 78%)}
    .signal-reveal-stage .signal-orb{position:absolute;z-index:1;width:170px;height:170px;border:1px solid #9de7ff66;border-radius:50%;background:radial-gradient(circle at 38% 34%,#b5f2ffdd 0,#62c6ed88 10%,#25527c66 36%,#10203944 69%,transparent 70%);box-shadow:0 0 36px #61cdef55,inset 0 0 35px #8fe6ff55;transition:transform .5s ease,filter .5s ease,opacity .5s ease}
    .signal-reveal-stage .signal-orb:before,.signal-reveal-stage .signal-orb:after{position:absolute;inset:-14px;content:"";border:1px solid #85def044;border-radius:50%;transform:rotateX(68deg)}
    .signal-reveal-stage .signal-orb:after{transform:rotateY(68deg)}
    .signal-reveal-stage .signal-beam{position:absolute;z-index:2;top:8%;left:0;width:100%;height:2px;opacity:0;background:linear-gradient(90deg,transparent,#9cf3ff,#fff,#9cf3ff,transparent);box-shadow:0 0 20px #70dcff;transform:translateY(0)}
    .signal-orb:before,.signal-orb:after{border-radius:50%}
    .signal-card-scene{position:absolute;z-index:3;inset:0;display:grid;place-items:center;perspective:1200px;opacity:0;pointer-events:none;transition:opacity .25s ease}
    .signal-reveal-stage.is-revealed .signal-card-scene{opacity:1}
    .signal-card-camera{transform-style:preserve-3d}
    .signal-card{position:relative;width:min(250px,64vw);height:330px;transform-style:preserve-3d;opacity:0}
    .signal-reveal-stage.is-revealed .signal-card{animation:card-unseal 1.05s cubic-bezier(.16,.76,.25,1) both,card-float 3.4s ease-in-out 1.05s infinite alternate}
    .signal-reveal-stage.is-running .signal-orb{animation:orb-pulse .9s ease-in-out infinite alternate}
    .signal-reveal-stage.is-running .signal-beam{opacity:1;animation:scan 1.15s ease-in-out infinite alternate}
    .signal-reveal-stage.is-running .signal-grid{animation:grid-flicker .22s steps(2) infinite}
    .signal-reveal-stage.is-revealed .signal-orb{transform:scale(2.2);filter:brightness(1.7);opacity:.2}
    .signal-reveal-stage.is-epic{border-color:#d8a4ff99;box-shadow:0 24px 90px #6c36a566,inset 0 0 55px #954ed222}
    .signal-reveal-stage.is-epic .signal-orb{background:radial-gradient(circle at 38% 34%,#fff0cddd 0,#e5a5ff99 12%,#7049a188 40%,#1a164466 70%,transparent 71%);box-shadow:0 0 60px #d391ff99,inset 0 0 35px #e4b7ff66}
    .signal-reveal-stage.is-epic .signal-card-face{border-color:#ebc0ff;background:linear-gradient(155deg,#633c79,#261f43 58%,#151426);box-shadow:0 20px 65px #6d319799,inset 0 0 0 5px #f4d0ff12,inset 0 0 34px #d787ff55}
    .signal-reveal-stage.is-epic .signal-card-face:before{border-color:#f0d7ff44}
    .signal-reveal-stage.is-epic .signal-card-art{background:radial-gradient(ellipse at 50% 48%,#a857c877,transparent 58%),linear-gradient(145deg,#392749,#171527)}
    .signal-reveal-stage.is-epic .signal-card-art-orbit{border-color:#edc0ffcc;box-shadow:0 0 40px #d27bff99,inset 0 0 25px #d27bff44}
    .signal-reveal-stage.is-epic .signal-card-art-core{border-color:#f6ddff;background:radial-gradient(circle at 35% 30%,#fff5ff,#db9fff 38%,#75439c 100%);box-shadow:0 0 42px #d584ffdd,inset 0 0 18px #fff3ff}
    .signal-reveal-stage.is-epic .signal-card-stars,.signal-reveal-stage.is-epic .signal-card-rarity{color:#edc1ff}
    .signal-reveal-stage.is-epic .signal-card-art-glint{color:#fff0ff;text-shadow:0 0 16px #dfa0ff}
    .signal-card.rainbow-background .signal-card-face{background:linear-gradient(145deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744);background-size:350% 350%;animation:signal-rainbow 6s linear infinite}
    .signal-card.rainbow-outline .signal-card-face{border:8px solid transparent;background:linear-gradient(145deg,#161b2b,#10131e) padding-box,linear-gradient(90deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744) border-box;background-size:100% 100%,300% 100%;animation:signal-rainbow 5s linear infinite}
    .signal-reveal-stage.is-results{min-height:470px}
    .signal-reveal-stage.is-results .signal-card-scene,.signal-reveal-stage.is-results .signal-orb,.signal-reveal-stage.is-results .signal-beam{display:none}
    .signal-ten-results{position:absolute;inset:0;z-index:4;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:10px;padding:22px;align-content:center}
    .signal-ten-results[hidden]{display:none!important}
    .signal-mini-card{position:relative;display:flex;min-width:0;flex-direction:column;justify-content:space-between;overflow:hidden;padding:13px;border:1px solid #78cce477;border-radius:12px;background:radial-gradient(circle at 50% 38%,#27638b66,transparent 58%),linear-gradient(155deg,#173b56,#101a2d 58%,#101423);box-shadow:0 10px 24px #0006;animation:mini-card-in .35s ease both}
    .signal-mini-card.is-epic{border-color:#e8b3ff;background:radial-gradient(circle at 50% 38%,#ad5bc877,transparent 58%),linear-gradient(155deg,#633c79,#261f43 58%,#151426);box-shadow:0 8px 26px #853da944}
    .signal-mini-card.is-new:after{position:absolute;top:7px;right:7px;padding:4px 6px;border:1px solid #f5d0ff88;border-radius:6px;background:#a458d255;color:#ffe8ff;content:"NOVO";font-size:8px;font-weight:900;letter-spacing:.1em}
    .signal-mini-rarity{font-size:8px;font-weight:900;letter-spacing:.12em;color:#a5eaff}
    .signal-mini-card.is-epic .signal-mini-rarity{color:#efc5ff}
    .signal-mini-art{display:grid;flex:1;place-items:center;margin:10px 0;border:1px solid #ffffff20;border-radius:9px;background:#07101c55;color:#b9f1ff;font-size:30px;text-shadow:0 0 20px currentColor}
    .signal-mini-card.is-epic .signal-mini-art{color:#f3c8ff}
    .signal-mini-card.is-legendary{border-color:#ffe28a;background:radial-gradient(circle at 50% 38%,#d19b3766,transparent 58%),linear-gradient(155deg,#59451f,#292115 58%,#17140e);box-shadow:0 8px 30px #a9762444}
    .signal-mini-card.is-legendary .signal-mini-rarity,.signal-mini-card.is-legendary .signal-mini-art{color:#ffe28a}
    .signal-mini-card.is-legendary .signal-mini-art{animation:legendary-glint 1.2s ease-in-out infinite alternate}
    .signal-mini-card strong{font-size:11px;line-height:1.2}.signal-mini-card small{margin-top:4px;color:#aab8cf;font-size:8px;line-height:1.3}
    .signal-mini-card.is-owned{filter:saturate(.62);border-style:dashed}
    .signal-mini-card.is-owned:before{position:absolute;right:7px;bottom:7px;color:#c0c9d8;content:"DUPLICADO";font-size:7px;font-weight:800;letter-spacing:.08em}
    @keyframes scan{to{transform:translateY(350px)}}@keyframes orb-pulse{to{transform:scale(1.12);filter:brightness(1.35)}}@keyframes grid-flicker{50%{opacity:.42}}
    @keyframes mini-card-in{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
    @keyframes camera-sweep{0%{transform:perspective(1200px) rotateX(-5deg) rotateY(-10deg)}50%{transform:perspective(1200px) rotateX(3deg) rotateY(7deg)}100%{transform:perspective(1200px) rotateX(-2deg) rotateY(12deg)}}
    @keyframes legendary-orbit{to{transform:rotate(360deg) scale(1.08)}}@keyframes legendary-glint{to{transform:scale(1.3) rotate(18deg);filter:brightness(1.4)}}
    .signal-reveal-stage.is-revealed .signal-card-camera{animation:camera-sweep 4.8s ease-in-out 1.1s infinite alternate}
    @media(max-width:600px){.signal-reveal-stage{min-height:330px}.signal-ten-results{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:none;grid-auto-rows:145px;gap:8px;padding:14px}.signal-reveal-stage.is-results{min-height:790px}.signal-mini-card{padding:10px}.signal-mini-art{margin:6px 0;font-size:24px}}
    @media(prefers-reduced-motion:reduce){.signal-reveal-stage.is-revealed .signal-card-camera,.signal-reveal-stage.is-revealed .signal-card,.signal-mini-card,.signal-card.legendary .signal-card-art-orbit,.signal-card.legendary .signal-card-art-glint,.signal-mini-card.is-legendary .signal-mini-art{animation-duration:.01ms!important;animation-iteration-count:1!important}.signal-card.rainbow-outline .signal-card-face{animation:none!important}}
    .signal-error-dialog{width:min(440px,calc(100% - 32px));max-width:none;padding:0;border:1px solid #ff9da766;border-radius:18px;background:linear-gradient(145deg,#241923,#11131f);color:#f5f7fb;box-shadow:0 28px 90px #000b}
    .signal-error-dialog::backdrop{background:#03040bcc;backdrop-filter:blur(7px)}
    .signal-error-content{padding:24px}
    .signal-error-icon{display:grid;width:44px;height:44px;place-items:center;border:1px solid #ff9da766;border-radius:14px;background:#ff72851c;color:#ffb5bd;font-size:23px}
    .signal-error-content h2{margin:16px 0 8px;font-size:20px}
    .signal-error-content p{margin:0;color:#d0c4cf;font-size:14px;line-height:1.6;overflow-wrap:anywhere}
    .signal-error-actions{display:flex;justify-content:flex-end;margin-top:22px}
    .signal-error-actions button{min-height:42px;padding:9px 18px;border:1px solid #ff9da777;border-radius:10px;background:#ff728522;color:#ffe8ec;font-weight:800;cursor:pointer}
    .signal-error-actions button:hover,.signal-error-actions button:focus-visible{background:#ff728544;outline:2px solid #ff9da766;outline-offset:2px}
    ${getSignalSearchOutlineStyles(data.profileOutline)}
  </style>
  <dialog id="signalSearchDialog" class="signal-dialog" aria-labelledby="signalDialogTitle">
    <div class="signal-dialog-inner"><header class="signal-dialog-top"><small id="signalDialogTitle">PRÉVIA DO PRÊMIO</small><button id="signalDialogClose" class="signal-dialog-close" type="button" aria-label="Fechar">×</button></header>
      <div id="signalRevealStage" class="signal-reveal-stage"><div class="signal-grid" aria-hidden="true"></div><div class="signal-orb" aria-hidden="true"></div><div class="signal-beam" aria-hidden="true"></div>
        <div class="signal-card-scene"><div id="signalCardCamera" class="signal-card-camera"><article id="signal3dCard" class="signal-card">
        <div class="signal-card-face signal-card-back" aria-hidden="true"><span class="signal-card-back-mark">✦</span><span class="signal-card-back-label">SIGNAL<br>SEARCH</span><span class="signal-card-back-code">SS · 01</span></div>
        <div class="signal-card-face signal-card-front"><div class="signal-card-top"><span id="signalCardRarity" class="signal-card-rarity"></span><span id="signalCardStars" class="signal-card-stars" aria-label="raridade">✦ ✦ ✦</span></div><div id="signalCardArt" class="signal-card-art" aria-hidden="true"><span class="signal-card-art-orbit"></span><span class="signal-card-art-core" id="signalCardIcon">✦</span><span class="signal-card-art-glint">✧</span></div><div class="signal-card-copy"><span id="signalCardType" class="signal-card-type">PRÉVIA DO PRÊMIO</span><strong id="signalCardName"></strong><small id="signalCardDetails"></small></div><span class="signal-card-index">SIGNAL ARCHIVE · 001</span></div>
      </article></div></div><div id="signalTenResults" class="signal-ten-results" role="list" aria-label="Dez recompensas da busca" hidden></div></div>
      <footer class="signal-modal-footer"><button id="signalModalNext" class="signal-modal-next" type="button" hidden>Próximo especial</button></footer>
    </div>
  </dialog>
  <dialog id="signalErrorDialog" class="signal-error-dialog" aria-labelledby="signalErrorTitle" aria-describedby="signalErrorMessage">
    <div class="signal-error-content"><span class="signal-error-icon" aria-hidden="true">!</span><h2 id="signalErrorTitle">Busca não realizada</h2><p id="signalErrorMessage"></p><footer class="signal-error-actions"><button id="signalErrorClose" type="button">Entendi</button></footer></div>
  </dialog>
  <audio id="normalSignalAudio" preload="none" src="/sinal.mp3"></audio><audio id="epicSignalAudio" preload="none" src="/sinal2.mp3"></audio>
  <script>
    const localContext=${JSON.stringify(context)};
    const dialog=document.getElementById("signalSearchDialog"),nextButton=document.getElementById("signalModalNext"),stage=document.getElementById("signalRevealStage"),tenResults=document.getElementById("signalTenResults");
    const errorDialog=document.getElementById("signalErrorDialog");
    let activeSignalAudio=null;
    const signalRarity=${JSON.stringify(rarityLabels)};
    const wait=duration=>new Promise(resolve=>window.setTimeout(resolve,duration));
    async function submitSignalSearch(level,quantity){
      const response=await fetch("/api/account/local/signal-search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({platform:localContext.platform,groupId:localContext.groupId,level,quantity})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Não foi possível fazer esta busca.");
      return result;
    }
    function showSignalError(message){
      document.getElementById("signalErrorMessage").textContent=message;
      if(!errorDialog.open)errorDialog.showModal();
      document.getElementById("signalErrorClose").focus();
    }
    document.getElementById("signalErrorClose").addEventListener("click",()=>errorDialog.close());
    function setCardReward(reward,details,rarity,preview){
      const card=document.getElementById("signal3dCard");
      const camera=document.getElementById("signalCardCamera");
      const front=card.querySelector(".signal-card-front");
      const art=document.getElementById("signalCardArt");
      document.getElementById("signalDialogTitle").textContent=preview?"PRÉVIA DO PRÊMIO":"SINAL RECEBIDO";
      document.getElementById("signalCardType").textContent=preview?"PRÉVIA DO PRÊMIO":"RECOMPENSA DA BUSCA";
      const isHighRarity=rarity==="epico"||rarity==="lendario";
      card.className="signal-card"+(isHighRarity?" epic":"")+(rarity==="lendario"?" legendary":"")+(reward.type==="bundle"?" frozen-bundle":"");
      front.style.background="";
      front.style.borderColor="";
      front.style.borderWidth="";
      art.style.background="";
      document.getElementById("signalCardRarity").textContent=signalRarity[rarity]||String(rarity||"Prêmio");
      document.getElementById("signalCardName").textContent=reward.name;
      document.getElementById("signalCardDetails").textContent=details||reward.details||"Prêmio da Busca de Sinais";
      const icon=document.getElementById("signalCardIcon");
      icon.textContent=reward.type==="bundle"?"❄":reward.type==="background"?"▧":reward.type==="outline"?"◫":reward.type==="money"?"💷":reward.type==="market"?"📦":"↻";
      document.getElementById("signalCardStars").textContent=isHighRarity?"✦ ✦ ✦ ✦ ✦":"✦ ✦ ✦";
      if(reward.type==="background"){
        card.classList.toggle("rainbow-background",Boolean(reward.rainbow));
        if(!reward.rainbow){
          const gradient="linear-gradient(145deg,"+reward.stops[0]+","+reward.stops[1]+" 55%,"+reward.stops[2]+")";
          front.style.background=gradient;
          art.style.background=gradient;
        }
      }else if(reward.type==="outline"){
        card.classList.toggle("rainbow-outline",Boolean(reward.rainbow));
        if(!reward.rainbow){
          front.style.borderColor=reward.color;
          front.style.borderWidth="8px";
        }
      }else if(reward.type==="bundle"){
        front.style.background="linear-gradient(145deg,#244b68,#122031 58%,#101522)";
        front.style.borderColor="#91dcff";
        front.style.borderWidth="8px";
        art.style.background="radial-gradient(circle,#285b78,#111827 72%)";
      }
      tenResults.hidden=true;
      stage.classList.remove("is-running","is-revealed","is-epic","is-legendary","is-results");
      stage.classList.add("is-revealed");
      if(isHighRarity)stage.classList.add("is-epic");
      if(rarity==="lendario")stage.classList.add("is-legendary");
      card.style.animation="none";camera.style.animation="none";void card.offsetWidth;
      card.style.animation="";camera.style.animation="";
      nextButton.hidden=true;
      if(!dialog.open)dialog.showModal();
    }
    document.getElementById("signalDialogClose").addEventListener("click",()=>dialog.close());
    dialog.addEventListener("close",()=>{
      const audio=activeSignalAudio;
      if(!audio||audio.ended)return;
      window.setTimeout(()=>{
        if(audio.paused&&!audio.ended)audio.play().catch(error=>console.warn("[WEB] Não foi possível continuar o áudio após fechar a exibição:",error.message||error));
      },0);
    });
    document.querySelectorAll("[data-signal-reward]").forEach(button=>button.addEventListener("click",()=>{
      const reward=localContext.rewards[button.dataset.signalReward];
      if(reward)setCardReward(reward,reward.details,reward.rarity,true);
    }));
    document.querySelectorAll("[data-signal-level-tab]").forEach(button=>button.addEventListener("click",()=>{
      document.querySelectorAll("[data-signal-level-tab]").forEach(tab=>tab.setAttribute("aria-selected",String(tab===button)));
      document.querySelectorAll("[data-signal-level-card]").forEach(card=>card.hidden=card.dataset.signalLevelCard!==button.dataset.signalLevelTab);
      document.querySelectorAll("[data-signal-featured-group]").forEach(group=>group.hidden=group.dataset.signalFeaturedGroup!==button.dataset.signalLevelTab);
    }));
    async function playSignalAudio(type){
      const audio=document.getElementById(type==="epic"?"epicSignalAudio":"normalSignalAudio");
      try{
        [document.getElementById("normalSignalAudio"),document.getElementById("epicSignalAudio")].forEach(track=>{track.pause();track.currentTime=0});
        activeSignalAudio=audio;
        await audio.play();
        return "";
      }catch(error){
        console.warn("[WEB] Áudio da busca de sinais indisponível:",error.message||error);
        return " Não foi possível tocar o áudio da busca.";
      }
    }
    function rewardIdentity(reward){
      return reward.type==="market"
        ? "market:"+reward.itemId
        : reward.type==="bundle"
        ? "bundle:"+reward.bundleKey
        : reward.type==="money"
        ? "money:"+reward.rarity+":"+reward.amount
        : reward.type==="cosmetic"
        ? "cosmetic:"+reward.cosmeticType+":"+reward.cosmeticKey
        : "reset:"+reward.itemKey;
    }
    function resetRevealStage(){
      stage.classList.remove("is-running","is-revealed","is-epic","is-results");
      tenResults.hidden=true;
      tenResults.replaceChildren();
      nextButton.hidden=true;
      const card=document.getElementById("signal3dCard"),camera=document.getElementById("signalCardCamera");
      card.className="signal-card";
      card.style.animation="none";camera.style.animation="none";void card.offsetWidth;
      card.style.animation="";camera.style.animation="";
    }
    function beginReveal(){
      resetRevealStage();
      stage.classList.add("is-running");
      document.getElementById("signalDialogTitle").textContent="BUSCANDO SINAL";
      if(!dialog.open)dialog.showModal();
    }
    function showRewardCard(reward,details){
      const cardReward=reward.type==="cosmetic"
        ? localContext.rewards[reward.cosmeticType+"-"+reward.cosmeticKey]
        : null;
      const displayReward=cardReward?{...cardReward,...reward,type:cardReward.type}:reward;
      setCardReward(displayReward,details,reward.rarity,false);
    }
    async function waitForAdvance(label){
      nextButton.textContent=label;
      nextButton.hidden=false;
      nextButton.focus();
      const continued=await new Promise(resolve=>{
        const closed=()=>resolve(false);
        dialog.addEventListener("close",closed,{once:true});
        nextButton.onclick=()=>{
          dialog.removeEventListener("close",closed);
          resolve(true);
        };
      });
      nextButton.hidden=true;
      nextButton.onclick=null;
      return continued;
    }
    function renderTenResults(rewards,presentedSpecials){
      const shown=new Set();
      tenResults.replaceChildren(...rewards.map((reward,index)=>{
        const card=document.createElement("article");
        const identity=rewardIdentity(reward);
        const isSpecial=reward.rarity==="epico"||reward.rarity==="lendario";
        const isNew=isSpecial&&reward.isNew&&!shown.has(identity)&&presentedSpecials.has(identity);
        const isOwned=isSpecial&&!isNew;
        if(isNew)shown.add(identity);
        card.className="signal-mini-card"+(isSpecial?" is-epic":"")+(reward.rarity==="lendario"?" is-legendary":"")+(isNew?" is-new":"")+(isOwned?" is-owned":"");
        card.setAttribute("role","listitem");
        card.style.animationDelay=(index*45)+"ms";
        const rarity=document.createElement("span");
        rarity.className="signal-mini-rarity";
        rarity.textContent=String(reward.rarity||"comum").toUpperCase();
        const art=document.createElement("span");
        art.className="signal-mini-art";
        art.setAttribute("aria-hidden","true");
        art.textContent=reward.type==="bundle"?"❄":reward.type==="money"?"💷":reward.type==="market"?"📦":reward.type==="reset"?"↻":reward.cosmeticType==="outline"?"◫":"▧";
        const name=document.createElement("strong");
        name.textContent=reward.name;
        const detail=document.createElement("small");
        detail.textContent=reward.type==="money"?(reward.duplicateBundle?"Pacote repetido · "+reward.amountFormatted:reward.amountFormatted):reward.converted?"Convertido em SatCoins":reward.type==="market"?"Pedido local criado":reward.type==="reset"?"Prêmio do bot aplicado":reward.type==="bundle"?"Pacote adicionado":"Cosmético adicionado";
        card.append(rarity,art,name,detail);
        return card;
      }));
      stage.classList.remove("is-running","is-revealed","is-epic","is-legendary");
      stage.classList.add("is-results");
      tenResults.hidden=false;
      document.getElementById("signalDialogTitle").textContent="RESULTADOS DA BUSCA";
      nextButton.textContent="Fechar resultados";
      nextButton.hidden=false;
      nextButton.onclick=()=>dialog.close();
    }
    document.querySelectorAll("[data-signal-level]").forEach(button=>button.addEventListener("click",async()=>{
      const level=button.dataset.signalLevel,quantity=Number(button.dataset.signalQuantity),price=localContext.levels[level];
      const levelName=level==="local"?"Local":level==="recruta"?"Recruta":"Especializada";
      if(!window.confirm("Fazer "+(quantity===10?"dez buscas":"uma busca")+" "+levelName+" por "+((price*quantity)/100).toFixed(2)+" SatCoins? O pagamento sai da carteira, não do cofre."))return;
      const buttons=[...document.querySelectorAll("[data-signal-level]")];
      buttons.forEach(item=>item.disabled=true);
      const feedback=document.getElementById("signalSearchFeedback");
      feedback.textContent="Realizando busca...";feedback.classList.remove("error");
      try{
        const result=await submitSignalSearch(level,quantity);
        document.getElementById("signalWalletBalance").textContent=result.balance;
        document.getElementById("signalAvailableBalance").textContent=result.balance;
        const uniqueSpecials=new Map();
        if(quantity===10){
          result.rewards.filter(reward=>(reward.rarity==="epico"||reward.rarity==="lendario")&&reward.isNew).forEach(reward=>{
            const identity=rewardIdentity(reward);
            if(!uniqueSpecials.has(identity))uniqueSpecials.set(identity,reward);
          });
        }
        const specials=[...uniqueSpecials.values()];
        const presentedSpecials=new Set();
        const singleReward=quantity===1?result.rewards[0]:null;
        beginReveal();
        const audioNotice=await playSignalAudio((singleReward?.rarity==="epico"||singleReward?.rarity==="lendario"||specials.length)?"epic":"normal");
        await wait(1500);
        if(!dialog.open)return;
        if(quantity===1){
          const reward=result.rewards[0];
          const details=reward.type==="money"?(reward.duplicateBundle?"Pacote repetido · "+reward.amountFormatted:reward.amountFormatted):reward.converted?"Convertido em SatCoins":reward.type==="market"?"Pedido criado para entrega pelos administradores":reward.type==="reset"?"Prêmio do Bot aplicado à sua conta":reward.type==="bundle"?"Adicionado à coleção: "+reward.contentsLabel:"Adicionado à sua coleção";
          showRewardCard(reward,details);
        }else{
          for(let index=0;index<specials.length;index++){
            if(index>0){
              stage.classList.remove("is-revealed","is-epic","is-legendary");
              stage.classList.add("is-running");
              await wait(420);
            }
            const reward=specials[index];
            const details=reward.duplicateBundle?"Pacote repetido · "+reward.amountFormatted:reward.converted?"Convertido em SatCoins":reward.type==="market"?"Pedido criado para entrega pelos administradores":reward.type==="reset"?"Prêmio do Bot aplicado à sua conta":reward.type==="bundle"?"Adicionado à coleção: "+reward.contentsLabel:"Adicionado à sua coleção";
            showRewardCard(reward,details);
            presentedSpecials.add(rewardIdentity(reward));
            if(specials.length>1){
              await wait(1100);
              if(!await waitForAdvance(index===specials.length-1?"Ver os 10 resultados":"Próximo especial"))return;
            }else{
              await wait(1450);
            }
            if(!dialog.open)return;
          }
          renderTenResults(result.rewards,presentedSpecials);
        }
        const state=result.state[level];
        let progress;
        if(quantity===10){
          progress=specials.length
            ? "Busca x10 concluída · "+specials.length+" especial(is) inédito(s) apresentado(s); os dez resultados estão na janela."
            : "Busca x10 concluída · nenhum especial inédito; os dez resultados aparecem juntos.";
        }else if(level==="local"){
          const guarantees=Object.entries(state.pullsUntilGuarantee||{}).filter(([,remaining])=>remaining!==null)
            .map(([rarity,remaining])=>(signalRarity[rarity]||rarity)+" garantido em até "+remaining+" busca(s)");
          progress="Busca Local concluída."+ (guarantees.length?" Garantias: "+guarantees.join(" · ")+".":"");
        }else{
          progress="Busca concluída. Épico garantido em até "+state.pullsUntilEpic+" busca(s).";
          if(state.pullsUntilWorkReset!==null)progress+=" Reset de trabalho em até "+state.pullsUntilWorkReset+" busca(s).";
        }
        feedback.textContent=progress+audioNotice;
        if(audioNotice)feedback.classList.add("error");
      }catch(error){feedback.textContent="";feedback.classList.remove("error");showSignalError(error.message||"Não foi possível fazer esta busca.")}
      finally{buttons.forEach(item=>item.disabled=false)}
    }));
  </script></body></html>`;
}

function renderCosmeticsStore(data) {
  const backgrounds = economy.PROFILE_BACKGROUNDS;
  const rarityLabels = {
    [economy.ITEM_RARITY.COMMON]: "Comum",
    [economy.ITEM_RARITY.UNCOMMON]: "Incomum",
    [economy.ITEM_RARITY.RARE]: "Raro",
    [economy.ITEM_RARITY.EPIC]: "Épico",
    [economy.ITEM_RARITY.LEGENDARY]: "Lendário"
  };
  const ownedBackgrounds = data.cosmetics.ownedBackgrounds || [];
  const ownedOutlines = data.cosmetics.ownedOutlines || [];
  const ownedCircles = data.cosmetics.ownedCircles || [];
  const ownedEffects = data.cosmetics.ownedEffects || [];
  const groups = new Map();
  for (const [key, background] of Object.entries(backgrounds)) {
    if (!groups.has(background.rarity)) groups.set(background.rarity, []);
    groups.get(background.rarity).push({ key, ...background });
  }
  const categories = [...groups].map(([rarity, items]) => `
    <section class="store-panel category-panel">
      <header class="category-heading"><div><h2>Fundos · ${escapeHtml(rarityLabels[rarity] || rarity)}</h2><p class="store-muted">${items.length} opções</p></div></header>
      <div class="store-items">${items.map(background => {
        const owned = ownedBackgrounds.includes(background.key);
        const active = data.cosmetics.background === background.key;
        return `<article class="color-card${active ? " active" : ""}" data-color-card="${escapeHtml(background.key)}">
          <div class="color-swatch${background.rainbow ? " rainbow-background" : ""}" aria-hidden="true" style="${background.rainbow ? "background-image:linear-gradient(110deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744);background-size:300% 300%" : `background:linear-gradient(145deg,${background.stops[0]},${background.stops[1]} 55%,${background.stops[2]})`}"></div>
          <div class="color-card-info"><div><h3>${escapeHtml(background.label)}</h3><p>ID ${background.id} · ${active ? "Em uso" : owned ? "Comprado" : `Preço: ${economy.formatMoney(economy.getProfileBackgroundPrice(background.key))}`}</p></div><button class="color-action" type="button" data-preview-color="${escapeHtml(background.key)}">Mostrar prévia</button></div>
        </article>`;
      }).join("")}</div>
    </section>`).join("");
  const outlines = economy.PROFILE_OUTLINES;
  const outlineGroups = new Map();
  for (const [key, outline] of Object.entries(outlines)) {
    if (!outlineGroups.has(outline.rarity)) outlineGroups.set(outline.rarity, []);
    outlineGroups.get(outline.rarity).push({ key, ...outline });
  }
  const outlineCategories = [...outlineGroups].map(([rarity, items]) => `
    <section class="store-panel category-panel">
      <header class="category-heading"><div><h2>Outlines · ${escapeHtml(rarityLabels[rarity] || rarity)}</h2><p class="store-muted">${items.length} opções</p></div></header>
      <div class="store-items">${items.map(outline => {
        const owned = ownedOutlines.includes(outline.key);
        const active = data.cosmetics.outline === outline.key;
        const price = economy.getProfileOutlinePrice(outline.key);
        const frostMarks = outline.frozen
          ? ["top-left", "top-center", "top-right", "right-mid", "bottom-right", "bottom-center", "bottom-left", "left-mid"]
            .map(position => `<span class="frost-mark frost-mark-${position}">❄</span>`).join("")
          : "";
        return `<article class="color-card${active ? " active" : ""}" data-outline-card="${escapeHtml(outline.key)}">
          <div class="color-swatch outline-swatch${outline.frozen ? " frozen-outline-swatch" : ""}" aria-hidden="true" style="height:86px;padding:16px;background:#111827;--frost-color:${outline.color}"><div class="outline-sample${outline.rainbow ? " rainbow-outline-sample" : ""}" style="height:54px;border:${outline.rainbow ? "6px solid transparent" : "4px solid " + outline.color};border-radius:14px${outline.rainbow ? ";background:linear-gradient(#111827,#111827) padding-box,linear-gradient(90deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744) border-box;background-size:100% 100%,300% 100%" : ""}"></div>${frostMarks}</div>
          <div class="color-card-info"><div><h3>${escapeHtml(outline.label)}</h3><p>${active ? "Em uso" : owned ? "Comprado" : `ID ${outline.id} · ${escapeHtml(rarityLabels[outline.rarity] || outline.rarity)} · ${economy.formatMoney(price)}`}</p></div><button class="color-action" type="button" data-preview-outline="${escapeHtml(outline.key)}">Mostrar prévia</button></div>
        </article>`;
      }).join("")}</div>
    </section>`).join("");
  const circleGroups = new Map();
  for (const [key, circle] of Object.entries(economy.PROFILE_CIRCLES)) {
    if (!circleGroups.has(circle.rarity)) circleGroups.set(circle.rarity, []);
    circleGroups.get(circle.rarity).push({ key, ...circle });
  }
  const circleCategories = [...circleGroups].map(([rarity, items]) => `
    <section class="store-panel category-panel">
      <header class="category-heading"><div><h2>Círculos de perfil · ${escapeHtml(rarityLabels[rarity] || rarity)}</h2><p class="store-muted">${items.length} opções</p></div></header>
      <div class="store-items">${items.map(circle => {
        const owned = ownedCircles.includes(circle.key);
        const active = data.cosmetics.circle === circle.key;
        const price = economy.getProfileCirclePrice(circle.key);
        const frostMarks = circle.frozen
          ? ["top", "upper-right", "right", "lower-right", "bottom", "lower-left", "left", "upper-left"]
            .map(position => `<span class="circle-frost-mark circle-frost-${position}">❄</span>`).join("")
          : "";
        return `<article class="color-card${active ? " active" : ""}" data-circle-card="${escapeHtml(circle.key)}">
          <div class="color-swatch circle-swatch${circle.frozen ? " frozen-circle-swatch" : ""}" aria-hidden="true" style="height:86px;padding:12px;background:#111827;display:grid;place-items:center;position:relative;--frost-color:${circle.color}"><div class="circle-sample${circle.rainbow ? " rainbow-outline-sample" : ""}" style="width:58px;height:58px;border:${circle.rainbow ? "5px solid transparent" : "4px solid " + circle.color};border-radius:50%${circle.rainbow ? ";background:linear-gradient(#111827,#111827) padding-box,linear-gradient(90deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744) border-box;background-size:100% 100%,300% 100%" : ""}"></div>${frostMarks}</div>
          <div class="color-card-info"><div><h3>${escapeHtml(circle.label)}</h3><p>${active ? "Em uso" : owned ? "Comprado" : `ID ${circle.id} · ${escapeHtml(rarityLabels[circle.rarity] || circle.rarity)} · ${economy.formatMoney(price)}`}</p></div><button class="color-action" type="button" data-preview-circle="${escapeHtml(circle.key)}">Mostrar prévia</button></div>
        </article>`;
      }).join("")}</div>
    </section>`).join("");
  const effectGroups = new Map();
  for (const [key, effect] of Object.entries(economy.PROFILE_EFFECTS)) {
    if (!effectGroups.has(effect.rarity)) effectGroups.set(effect.rarity, []);
    effectGroups.get(effect.rarity).push({ key, ...effect });
  }
  const effectCategories = [...effectGroups].map(([rarity, items]) => `
    <section class="store-panel category-panel">
      <header class="category-heading"><div><h2>Efeitos de perfil · ${escapeHtml(rarityLabels[rarity] || rarity)}</h2><p class="store-muted">${items.length} opções</p></div></header>
      <div class="store-items">${items.map(effect => {
        const owned = ownedEffects.includes(effect.key);
        const active = data.cosmetics.effect === effect.key;
        const price = economy.getProfileEffectPrice(effect.key);
        return `<article class="color-card${active ? " active" : ""}" data-effect-card="${escapeHtml(effect.key)}">
          <div class="color-swatch" aria-hidden="true" style="height:86px;display:grid;place-items:center;background:radial-gradient(circle,#253c55,#101722)"><span style="font-size:38px;color:#d9f4ff">❄</span></div>
          <div class="color-card-info"><div><h3>${escapeHtml(effect.label)}</h3><p>${active ? "Em uso" : owned ? "Comprado" : `ID ${effect.id} · ${escapeHtml(rarityLabels[effect.rarity] || effect.rarity)} · ${economy.formatMoney(price)}`}</p></div><button class="color-action" type="button" data-preview-effect="${escapeHtml(effect.key)}">Mostrar prévia</button></div>
        </article>`;
      }).join("")}</div>
    </section>`).join("");
  const pageContext = {
    platform: data.platform,
    groupId: data.groupId,
    balance: economy.formatMoney(data.balance),
    price: economy.formatMoney(economy.PROFILE_BACKGROUND_PRICE),
    outlinePrice: economy.formatMoney(economy.PROFILE_OUTLINE_PRICE),
    rarityLabels,
    backgrounds: Object.fromEntries(Object.entries(backgrounds).map(([key, background]) => [
      key,
      {
        id: background.id,
        label: background.label,
        rarity: background.rarity,
        price: economy.formatMoney(economy.getProfileBackgroundPrice(key)),
        stops: background.stops,
        accent: background.accent,
        rainbow: Boolean(background.rainbow)
      }
    ])),
    ownedBackgrounds,
    appliedBackground: data.cosmetics.background,
    outlines: Object.fromEntries(Object.entries(outlines).map(([key, outline]) => [
      key,
      { ...outline, price: economy.formatMoney(economy.getProfileOutlinePrice(key)) }
    ])),
    ownedOutlines,
    appliedOutline: data.cosmetics.outline,
    circles: Object.fromEntries(Object.entries(economy.PROFILE_CIRCLES).map(([key, circle]) => [
      key,
      { ...circle, price: economy.formatMoney(economy.getProfileCirclePrice(key)) }
    ])),
    ownedCircles,
    appliedCircle: data.cosmetics.circle,
    effects: Object.fromEntries(Object.entries(economy.PROFILE_EFFECTS).map(([key, effect]) => [
      key,
      { ...effect, price: economy.formatMoney(economy.getProfileEffectPrice(key)) }
    ])),
    ownedEffects,
    appliedEffect: data.cosmetics.effect
  };
  const profileLink = `/painel-local?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Loja de cosméticos · ${escapeHtml(data.groupName)}</title><style>
    :root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb}*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:24px;background:radial-gradient(circle at 15% 0,#312344 0,#10131c 48%,#090b10 100%)}button,a{font:inherit}.store-page{width:min(980px,100%);margin:0 auto}.store-topbar{display:flex;justify-content:space-between;gap:12px;padding:8px 0 20px;border-bottom:1px solid #ffffff16}.store-topbar a{color:#d6b5ff;text-decoration:none;font-weight:700}.store-topbar span,.store-muted{color:#aab3c8}.store-hero{margin:24px 0;padding:26px;border:1px solid #f0a8c633;border-radius:20px;background:linear-gradient(120deg,#452b4a,#24263d 70%,#1b2435)}.store-hero h1{margin:4px 0 8px;font-size:clamp(28px,5vw,40px)}.store-hero p{margin:0;color:#d0c8dc;line-height:1.6}    .store-panel{margin-top:16px;padding:22px;border:1px solid #ffffff14;border-radius:18px;background:linear-gradient(145deg,#191e2d,#131824)}.category-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.category-heading h2{margin:0;font-size:19px}.category-heading p{margin:5px 0 0}.category-picker{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;margin-top:16px;padding:17px;border:1px solid #f0a8c644;border-radius:14px;background:#f0a8c60a;color:#f5f7fb;text-align:left;cursor:pointer}.category-picker:hover,.category-picker:focus-visible{border-color:#f0a8c6;outline:2px solid #f0a8c644;outline-offset:2px}.category-picker strong,.category-picker small{display:block}.category-picker small{margin-top:5px;color:#aab3c8;font-size:12px}.category-picker>span:last-child{font-size:22px;color:#f0a8c6}.store-items{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px}.color-card{overflow:hidden;border:1px solid #ffffff16;border-radius:14px;background:#ffffff05}.color-card.active{border-color:#f0a8c6aa;box-shadow:0 0 0 1px #f0a8c633}.color-swatch{height:64px;border-bottom:1px solid #ffffff12}.color-card-info{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px}.color-card-info h3{margin:0;font-size:14px}.color-card-info p{margin:5px 0 0;color:#aab3c8;font-size:11px}.color-action,.reset-button,.modal-button{min-height:38px;padding:8px 12px;border:1px solid #f0a8c655;border-radius:10px;background:#f076a51a;color:#ffe0ef;font-size:12px;font-weight:750;cursor:pointer;white-space:nowrap}.color-action:hover,.modal-button:hover{background:#f076a532}.store-balance{display:flex;justify-content:space-between;gap:12px;margin-top:14px;padding:13px;border:1px solid #ffffff14;border-radius:12px;background:#ffffff06;color:#aab3c8;font-size:12px}.store-balance strong{color:#f5f7fb}.store-feedback{min-height:22px;margin:12px 0 0;color:#9cf0cf;font-size:13px}.store-feedback.error{color:#ff9caa}.reset-button{margin-top:14px;border-color:#ffffff30;background:#ffffff08;color:#e8ebf5}.preview-dialog{width:min(560px,calc(100% - 28px));padding:0;border:1px solid #f0a8c655;border-radius:20px;background:#151a27;color:#f5f7fb;box-shadow:0 24px 90px #000b}.preview-dialog::backdrop{background:#05070bcc;backdrop-filter:blur(4px)}.dialog-content{padding:22px}.dialog-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.dialog-header h2{margin:0}.dialog-header p{margin:5px 0 0;color:#aab3c8;font-size:13px}.dialog-close{width:38px;height:38px;border:1px solid #ffffff25;border-radius:10px;background:#ffffff08;color:#f5f7fb;font-size:20px;cursor:pointer}.preview-card{min-height:240px;margin-top:18px;padding:20px;border:1px solid #ffffff30;border-radius:16px;box-shadow:0 18px 45px #0004}.preview-label{display:inline-block;padding:6px 9px;border:1px solid #ffffff32;border-radius:20px;background:#0003;color:#fff;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.preview-user{display:flex;align-items:center;gap:12px;margin-top:30px}.preview-avatar{display:grid;width:54px;height:54px;place-items:center;border:2px solid var(--preview-accent);border-radius:17px;background:#ffffff18;color:#fff;font-size:21px;font-weight:800}.preview-user strong,.preview-user small{display:block}.preview-user small{margin-top:4px;color:#ffffffb8}.preview-profile{margin-top:16px;padding:14px;border:1px solid #ffffff2a;border-radius:12px;background:#080b1280}.preview-profile strong{color:var(--preview-accent)}.preview-profile p{margin:6px 0 0;color:#ffffffbb;font-size:12px;line-height:1.5}.dialog-actions{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}.dialog-actions .secondary{border-color:#ffffff30;background:#ffffff08;color:#e8ebf5}.dialog-actions button:disabled,.reset-button:disabled{opacity:.55;cursor:wait}.store-footer{margin:18px 0;color:#8390a9}@media(max-width:600px){body{padding:16px}.store-hero,.store-panel,.dialog-content{padding:18px}.store-items{grid-template-columns:1fr}.color-card-info{align-items:flex-start}.dialog-actions{flex-direction:column-reverse}.dialog-actions button{width:100%}}
    .category-catalog[hidden]{display:none}
    .outline-swatch,.circle-swatch{position:relative;overflow:visible}
    .frost-mark,.circle-frost-mark{position:absolute;z-index:2;color:#f5fcff;font-size:15px;line-height:1;text-shadow:0 0 5px #fff,0 0 11px var(--frost-color);pointer-events:none}
    .frozen-outline-swatch{background:radial-gradient(ellipse at center,#1a2a3d,#111827)!important}
    .frozen-outline-swatch .outline-sample{position:relative;border:3px double #f5fcff!important;box-shadow:0 0 0 2px var(--frost-color),0 0 12px var(--frost-color),inset 0 0 12px #c9f2ff55}
    .frost-mark-top-left{top:9px;left:25px}.frost-mark-top-center{top:8px;left:50%;transform:translateX(-50%)}.frost-mark-top-right{top:9px;right:25px}
    .frost-mark-right-mid{top:50%;right:7px;transform:translateY(-50%)}.frost-mark-bottom-right{right:25px;bottom:8px}.frost-mark-bottom-center{bottom:7px;left:50%;transform:translateX(-50%)}
    .frost-mark-bottom-left{bottom:8px;left:25px}.frost-mark-left-mid{top:50%;left:7px;transform:translateY(-50%)}
    .frozen-circle-swatch{background:radial-gradient(circle,#1d3043,#111827)!important}
    .frozen-circle-swatch .circle-sample{border:3px double #f5fcff!important;box-shadow:0 0 0 3px var(--frost-color),0 0 14px var(--frost-color),inset 0 0 10px #c9f2ff88}
    .circle-frost-top{top:5px;left:50%;transform:translateX(-50%)}.circle-frost-upper-right{top:14px;right:calc(50% - 34px)}
    .circle-frost-right{top:50%;right:calc(50% - 42px);transform:translateY(-50%)}.circle-frost-lower-right{bottom:14px;right:calc(50% - 34px)}
    .circle-frost-bottom{bottom:5px;left:50%;transform:translateX(-50%)}.circle-frost-lower-left{bottom:14px;left:calc(50% - 34px)}
    .circle-frost-left{top:50%;left:calc(50% - 42px);transform:translateY(-50%)}.circle-frost-upper-left{top:14px;left:calc(50% - 34px)}
    .rainbow-background{animation:rainbow-cycle 5s linear infinite}
    .rainbow-outline-sample{animation:rainbow-cycle 5s linear infinite}
    .preview-card.rainbow-background{background-image:linear-gradient(110deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744)!important;background-size:300% 300%;animation:rainbow-cycle 5s linear infinite}
    .profile-outline-preview{border:5px solid var(--preview-outline)}
    .rainbow-outline-preview{border:6px solid transparent;background:linear-gradient(#111722,#111722) padding-box,linear-gradient(90deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744) border-box;background-size:100% 100%,300% 100%;animation:rainbow-cycle 5s linear infinite}
    .profile-frozen-preview{background-image:url("${profileSnowPattern(0.14)}")!important;background-size:90px 90px!important}
    @keyframes rainbow-cycle{to{background-position:100% 50%}}
    @media(prefers-reduced-motion:reduce){.rainbow-background,.rainbow-outline-sample,.rainbow-outline-preview,.signal-card.rainbow-outline .signal-card-face,.outline-art.rainbow-outline-art i{animation:none}}
  </style></head><body><main class="store-page">
    <nav class="store-topbar"><a href="${profileLink}">← Voltar ao perfil</a><span>Loja de cosméticos · ${escapeHtml(data.groupName)}</span></nav>
    <header class="store-hero"><h1>🎨 Loja de cosméticos</h1><p>Personalize os fundos, outlines, círculos e efeitos do perfil. Cosméticos comprados podem ser trocados sem custo.</p></header>
    <section id="cosmeticCategories" class="store-panel"><h2>Categorias de cosméticos</h2><button id="showBackgrounds" class="category-picker" type="button"><span><strong>Fundos</strong><small>Confira os fundos disponíveis e suas categorias de raridade</small></span><span aria-hidden="true">→</span></button><button id="showOutlines" class="category-picker" type="button"><span><strong>Outlines</strong><small>Personalize as linhas dos cartões de perfil</small></span><span aria-hidden="true">→</span></button><button id="showCircles" class="category-picker" type="button"><span><strong>Círculos de perfil</strong><small>Contornos opcionais para as fotos de perfil</small></span><span aria-hidden="true">→</span></button><button id="showEffects" class="category-picker" type="button"><span><strong>Efeitos de perfil</strong><small>Sobreposições visuais exibidas junto ao perfil</small></span><span aria-hidden="true">→</span></button></section>
    <div id="backgroundCatalog" class="category-catalog" hidden><section class="store-panel"><button id="backToCategories" class="reset-button" type="button">← Categorias de cosméticos</button></section>${categories}
      <section class="store-panel"><div class="store-balance"><span>Seu saldo local</span><strong id="storeBalance">${pageContext.balance}</strong></div><button id="resetBackground" class="reset-button" type="button">Restaurar fundo original</button><p id="storeFeedback" class="store-feedback" role="status" aria-live="polite"></p></section>
    </div>
    <div id="outlineCatalog" class="category-catalog" hidden><section class="store-panel"><button id="backFromOutlines" class="reset-button" type="button">← Categorias de cosméticos</button><header class="category-heading"><div><h2>Linha das bolhas (outline)</h2><p class="store-muted">Outlines organizadas por raridade; o modo padrão acompanha a cor do fundo.</p></div></header></section>${outlineCategories}<section class="store-panel"><div class="store-balance"><span>Seu saldo local</span><strong id="outlineStoreBalance">${pageContext.balance}</strong></div><button id="resetOutline" class="reset-button" type="button">Usar outline padrão</button><p id="outlineFeedback" class="store-feedback" role="status" aria-live="polite"></p></section></div>
    <div id="circleCatalog" class="category-catalog" hidden><section class="store-panel"><button id="backFromCircles" class="reset-button" type="button">← Categorias de cosméticos</button><header class="category-heading"><div><h2>Círculos de perfil</h2><p class="store-muted">Sem um círculo equipado, a foto de perfil aparece sem contorno.</p></div></header></section>${circleCategories}<section class="store-panel"><div class="store-balance"><span>Seu saldo local</span><strong id="circleStoreBalance">${pageContext.balance}</strong></div><button id="resetCircle" class="reset-button" type="button">Remover círculo de perfil</button><p id="circleFeedback" class="store-feedback" role="status" aria-live="polite"></p></section></div>
    <div id="effectCatalog" class="category-catalog" hidden><section class="store-panel"><button id="backFromEffects" class="reset-button" type="button">← Categorias de cosméticos</button><header class="category-heading"><div><h2>Efeitos de perfil</h2><p class="store-muted">Os efeitos aparecem sobre as páginas e bolhas em que seu perfil é exibido.</p></div></header></section>${effectCategories}<section class="store-panel"><div class="store-balance"><span>Seu saldo local</span><strong id="effectStoreBalance">${pageContext.balance}</strong></div><button id="resetEffect" class="reset-button" type="button">Remover efeito de perfil</button><p id="effectFeedback" class="store-feedback" role="status" aria-live="polite"></p></section></div>
    <p class="store-footer">Os cosméticos e o saldo são individuais desta plataforma e deste grupo.</p>
  </main>
  <dialog id="previewDialog" class="preview-dialog" aria-labelledby="dialogTitle"><div class="dialog-content"><header class="dialog-header"><div><h2 id="dialogTitle">Prévia do fundo</h2><p id="dialogDescription"></p></div><button class="dialog-close" type="button" data-close-dialog aria-label="Fechar">×</button></header><div id="previewCard" class="preview-card"><span class="preview-label">Perfil neste grupo</span><div class="preview-user"><div id="previewAvatar" class="preview-avatar">U</div><div><strong>${escapeHtml(data.userName)}</strong><small>${escapeHtml(data.groupName)}</small></div></div><div id="previewProfile" class="preview-profile"><strong id="previewColorName"></strong><p id="previewProfileDescription">Esta é uma prévia do fundo no perfil local.</p></div></div><p id="dialogFeedback" class="store-feedback" role="status" aria-live="polite"></p><footer class="dialog-actions"><button class="modal-button secondary" type="button" data-close-dialog>Fechar</button><button id="previewAction" class="modal-button" type="button">Comprar e equipar</button></footer></div></dialog>
  <script>
    const storeContext=${JSON.stringify(pageContext)};
    const backgroundUrl="/api/account/local/cosmetics";
    let appliedBackground=storeContext.appliedBackground;
    let appliedOutline=storeContext.appliedOutline;
    let appliedCircle=storeContext.appliedCircle;
    let appliedEffect=storeContext.appliedEffect;
    let previewKey=null;
    let previewType="background";
    const dialog=document.getElementById("previewDialog");
    const dialogFeedback=document.getElementById("dialogFeedback");
    const frostPreviewStyles=document.createElement("style");
    frostPreviewStyles.textContent=".preview-profile{position:relative;overflow:visible}.preview-profile.profile-outline-preview{border:3px solid var(--preview-outline);box-shadow:0 0 0 1px var(--preview-outline)}.preview-profile.rainbow-outline-preview{border:5px solid #f5fcff;box-shadow:0 0 0 2px #f0a8c6}.preview-profile.frozen-outline-preview{border:3px double #f5fcff;outline:2px solid var(--preview-outline);box-shadow:0 0 0 3px var(--preview-outline),0 0 18px var(--preview-outline),inset 0 0 14px #c9f2ff66}.preview-frost-marks{position:absolute;inset:0;z-index:2;pointer-events:none}.preview-frost-mark{position:absolute;color:#f5fcff;font-size:12px;line-height:1;text-shadow:0 0 6px #fff,0 0 12px var(--preview-outline)}.preview-frost-top-left{left:8px;top:-7px}.preview-frost-top-center{left:50%;top:-7px;transform:translateX(-50%)}.preview-frost-top-right{right:8px;top:-7px}.preview-frost-right-mid{right:-7px;top:50%;transform:translateY(-50%)}.preview-frost-bottom-right{right:8px;bottom:-7px}.preview-frost-bottom-center{left:50%;bottom:-7px;transform:translateX(-50%)}.preview-frost-bottom-left{left:8px;bottom:-7px}.preview-frost-left-mid{left:-7px;top:50%;transform:translateY(-50%)}.preview-profile>*{position:relative;z-index:1}.preview-profile>.preview-frost-marks{position:absolute;z-index:2}.preview-avatar.frozen-circle-preview{position:relative;border:4px double #f5fcff!important;box-shadow:0 0 0 2px var(--preview-circle),0 0 18px var(--preview-circle),inset 0 0 10px #c9f2ff88}.preview-avatar.frozen-circle-preview:after{content:'❄';position:absolute;top:-3px;right:-2px;color:#f5fcff;font-size:13px;text-shadow:0 0 7px var(--preview-circle)}.preview-card.profile-frozen-preview{position:relative;isolation:isolate;overflow:hidden}.preview-card.profile-frozen-preview:after{content:'❄       ❄       ❄       ❄       ❄';position:absolute;inset:0;display:flex;align-items:center;justify-content:space-around;color:#f5fcff;font-size:23px;opacity:.1;text-shadow:0 0 8px #c9f2ff;pointer-events:none;z-index:0}.preview-card>*{position:relative;z-index:1}";
    document.head.appendChild(frostPreviewStyles);
    document.getElementById("showBackgrounds").addEventListener("click",()=>{document.getElementById("cosmeticCategories").hidden=true;document.getElementById("backgroundCatalog").hidden=false});
    document.getElementById("backToCategories").addEventListener("click",()=>{document.getElementById("backgroundCatalog").hidden=true;document.getElementById("cosmeticCategories").hidden=false});
    document.getElementById("showOutlines").addEventListener("click",()=>{document.getElementById("cosmeticCategories").hidden=true;document.getElementById("outlineCatalog").hidden=false});
    document.getElementById("backFromOutlines").addEventListener("click",()=>{document.getElementById("outlineCatalog").hidden=true;document.getElementById("cosmeticCategories").hidden=false});
    document.getElementById("showCircles").addEventListener("click",()=>{document.getElementById("cosmeticCategories").hidden=true;document.getElementById("circleCatalog").hidden=false});
    document.getElementById("backFromCircles").addEventListener("click",()=>{document.getElementById("circleCatalog").hidden=true;document.getElementById("cosmeticCategories").hidden=false});
    document.getElementById("showEffects").addEventListener("click",()=>{document.getElementById("cosmeticCategories").hidden=true;document.getElementById("effectCatalog").hidden=false});
    document.getElementById("backFromEffects").addEventListener("click",()=>{document.getElementById("effectCatalog").hidden=true;document.getElementById("cosmeticCategories").hidden=false});
    function showFeedback(element,message,isError){element.textContent=message;element.classList.toggle("error",Boolean(isError))}
    function currentForType(type){return {background:appliedBackground,outline:appliedOutline,circle:appliedCircle,effect:appliedEffect}[type]}
    function ownedForType(type){return {background:storeContext.ownedBackgrounds,outline:storeContext.ownedOutlines,circle:storeContext.ownedCircles,effect:storeContext.ownedEffects}[type]}
    function itemsForType(type){return storeContext[type==="background"?"backgrounds":type==="outline"?"outlines":type==="circle"?"circles":"effects"]}
    function actionLabel(key,type=previewType){return currentForType(type)===key?"Em uso":ownedForType(type).includes(key)?"Equipar":"Comprar e equipar"}
    function setPreviewOutline(outline){
      const element=document.getElementById("previewProfile");
      element.classList.toggle("profile-outline-preview",Boolean(outline));
      element.classList.toggle("rainbow-outline-preview",Boolean(outline?.rainbow));
      element.classList.toggle("frozen-outline-preview",Boolean(outline?.frozen));
      const existingMarks=element.querySelector(".preview-frost-marks");
      if(outline?.frozen&&!existingMarks){
        const marks=document.createElement("span");
        marks.className="preview-frost-marks";
        marks.setAttribute("aria-hidden","true");
        ["top-left","top-center","top-right","right-mid","bottom-right","bottom-center","bottom-left","left-mid"].forEach(position=>{
          const mark=document.createElement("span");
          mark.className="preview-frost-mark preview-frost-"+position;
          mark.textContent="❄";
          marks.appendChild(mark);
        });
        element.appendChild(marks);
      }else if(!outline?.frozen&&existingMarks)existingMarks.remove();
      if(outline)element.style.setProperty("--preview-outline",outline.color);
      else element.style.removeProperty("--preview-outline");
    }
    function openPreview(key){
      const background=storeContext.backgrounds[key];if(!background)return;
      previewKey=key;previewType="background";
      document.getElementById("dialogTitle").textContent="Prévia · "+background.label;
      document.getElementById("dialogDescription").textContent="ID "+background.id+" · "+(storeContext.rarityLabels[background.rarity]||background.rarity)+" · "+(storeContext.ownedBackgrounds.includes(key)?"Já comprado":"Preço: "+background.price);
      document.getElementById("previewColorName").textContent=background.label;
      document.getElementById("previewProfileDescription").textContent="Esta é uma prévia do fundo no perfil local.";
      const card=document.getElementById("previewCard");
      card.style.background="linear-gradient(145deg,"+background.stops[0]+","+background.stops[1]+" 55%,"+background.stops[2]+")";
      card.classList.toggle("rainbow-background",Boolean(background.rainbow));
      card.classList.remove("profile-frozen-preview");
      const avatar=document.getElementById("previewAvatar");
      avatar.classList.remove("frozen-circle-preview");
      avatar.style.border="none";
      avatar.style.borderRadius="17px";
      avatar.style.background="#ffffff18";
      avatar.style.boxShadow="";
      avatar.style.removeProperty("--preview-circle");
      card.style.setProperty("--preview-accent",background.accent);
      setPreviewOutline(storeContext.outlines[appliedOutline]);
      const action=document.getElementById("previewAction");action.textContent=actionLabel(key);action.disabled=appliedBackground===key;
      showFeedback(dialogFeedback,"",false);
      if(!dialog.open)dialog.showModal();
    }
    function openOutlinePreview(key){
      const outline=storeContext.outlines[key];if(!outline)return;
      previewKey=key;previewType="outline";
      document.getElementById("dialogTitle").textContent="Prévia do outline · "+outline.label;
      document.getElementById("dialogDescription").textContent="ID "+outline.id+" · "+(storeContext.rarityLabels[outline.rarity]||outline.rarity)+" · "+(storeContext.ownedOutlines.includes(key)?"Já comprado":"Preço: "+outline.price);
      document.getElementById("previewColorName").textContent="Outline "+outline.label;
      document.getElementById("previewProfileDescription").textContent="Esta é uma prévia da linha das bolhas no perfil local.";
      const card=document.getElementById("previewCard");
      const background=storeContext.backgrounds[appliedBackground];
      card.style.background=background?"linear-gradient(145deg,"+background.stops[0]+","+background.stops[1]+" 55%,"+background.stops[2]+")":"#171c2a";
      card.classList.toggle("rainbow-background",Boolean(background?.rainbow));
      card.classList.remove("profile-frozen-preview");
      const avatar=document.getElementById("previewAvatar");
      avatar.classList.remove("frozen-circle-preview");
      avatar.style.border="none";
      avatar.style.borderRadius="17px";
      avatar.style.background="#ffffff18";
      avatar.style.boxShadow="";
      avatar.style.removeProperty("--preview-circle");
      card.style.setProperty("--preview-accent",outline.color);
      setPreviewOutline(outline);
      const action=document.getElementById("previewAction");action.textContent=actionLabel(key,"outline");action.disabled=appliedOutline===key;
      showFeedback(dialogFeedback,"",false);
      if(!dialog.open)dialog.showModal();
    }
    function openNewPreview(key,type){
      const item=itemsForType(type)[key];if(!item)return;
      previewKey=key;previewType=type;
      document.getElementById("dialogTitle").textContent="Prévia · "+item.label;
      document.getElementById("dialogDescription").textContent="ID "+item.id+" · "+(storeContext.rarityLabels[item.rarity]||item.rarity)+" · "+(ownedForType(type).includes(key)?"Já comprado":"Preço: "+item.price);
      document.getElementById("previewColorName").textContent=item.label;
      const card=document.getElementById("previewCard"),avatar=document.getElementById("previewAvatar");
      card.style.background=type==="effect"?"radial-gradient(circle,#253c55,#101722)":"#171c2a";
      card.classList.remove("rainbow-background");
      card.classList.toggle("profile-frozen-preview",type==="effect");
      setPreviewOutline(null);
      avatar.classList.toggle("frozen-circle-preview",type==="circle"&&Boolean(item.frozen));
      avatar.style.setProperty("--preview-circle",item.color||"transparent");
      avatar.style.border=type==="circle"?(item.frozen?"4px double #f5fcff":item.rainbow?"5px solid transparent":"4px solid "+item.color):"none";
      avatar.style.boxShadow="";
      avatar.style.background=type==="circle"&&item.rainbow?"linear-gradient(#111827,#111827) padding-box,linear-gradient(90deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744) border-box":"#ffffff18";
      avatar.style.borderRadius=type==="circle"?"50%":"17px";
      document.getElementById("previewProfileDescription").textContent=type==="circle"?"O círculo aparece somente quando um cosmético de contorno está equipado.": "Flocos translúcidos acompanham o perfil em suas exibições.";
      document.getElementById("previewAction").textContent=actionLabel(key,type);
      document.getElementById("previewAction").disabled=currentForType(type)===key;
      showFeedback(dialogFeedback,"",false);if(!dialog.open)dialog.showModal();
    }
    function refreshCards(){
      document.querySelectorAll("[data-color-card]").forEach(card=>{
        const key=card.dataset.colorCard,background=storeContext.backgrounds[key];
        const active=appliedBackground===key,owned=storeContext.ownedBackgrounds.includes(key);
        card.classList.toggle("active",active);
        card.querySelector(".color-card-info p").textContent="ID "+background.id+" · "+(active?"Em uso":owned?"Comprado":"Preço: "+background.price);
      });
      refreshOutlineCards();
      refreshCircleCards();refreshEffectCards();
      if(previewKey){const action=document.getElementById("previewAction");action.textContent=actionLabel(previewKey);action.disabled=currentForType(previewType)===previewKey;}
    }
    function refreshOutlineCards(){
      document.querySelectorAll("[data-outline-card]").forEach(card=>{
        const key=card.dataset.outlineCard,outline=storeContext.outlines[key];
        const active=appliedOutline===key,owned=storeContext.ownedOutlines.includes(key);
        card.classList.toggle("active",active);
        card.querySelector(".color-card-info p").textContent=active?"Em uso":owned?"Comprado":"ID "+outline.id+" · "+(storeContext.rarityLabels[outline.rarity]||outline.rarity)+" · "+outline.price;
      });
    }
    function refreshCircleCards(){document.querySelectorAll("[data-circle-card]").forEach(card=>{const key=card.dataset.circleCard,item=storeContext.circles[key],active=appliedCircle===key,owned=storeContext.ownedCircles.includes(key);card.classList.toggle("active",active);card.querySelector(".color-card-info p").textContent=active?"Em uso":owned?"Comprado":"ID "+item.id+" · "+(storeContext.rarityLabels[item.rarity]||item.rarity)+" · "+item.price})}
    function refreshEffectCards(){document.querySelectorAll("[data-effect-card]").forEach(card=>{const key=card.dataset.effectCard,item=storeContext.effects[key],active=appliedEffect===key,owned=storeContext.ownedEffects.includes(key);card.classList.toggle("active",active);card.querySelector(".color-card-info p").textContent=active?"Em uso":owned?"Comprado":"ID "+item.id+" · "+(storeContext.rarityLabels[item.rarity]||item.rarity)+" · "+item.price})}
    async function submitBackground(payload){
      const response=await fetch(backgroundUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...storeContext,...payload})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Não foi possível atualizar seu perfil.");return result;
    }
    document.querySelectorAll("[data-preview-color]").forEach(button=>button.addEventListener("click",()=>openPreview(button.dataset.previewColor)));
    document.querySelectorAll("[data-preview-outline]").forEach(button=>button.addEventListener("click",()=>openOutlinePreview(button.dataset.previewOutline)));
    document.querySelectorAll("[data-preview-circle]").forEach(button=>button.addEventListener("click",()=>openNewPreview(button.dataset.previewCircle,"circle")));
    document.querySelectorAll("[data-preview-effect]").forEach(button=>button.addEventListener("click",()=>openNewPreview(button.dataset.previewEffect,"effect")));
    document.querySelectorAll("[data-close-dialog]").forEach(button=>button.addEventListener("click",()=>dialog.close()));
    dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
    document.getElementById("previewAction").addEventListener("click",async()=>{
      const key=previewKey,type=previewType;if(!key||currentForType(type)===key)return;
      const owned=ownedForType(type).includes(key);
      const button=document.getElementById("previewAction");
      button.disabled=true;showFeedback(dialogFeedback,owned?"Equipando cosmético...":"Comprando e equipando cosmético...",false);
      try{
        const action={background:"set",outline:"setOutline",circle:"setCircle",effect:"setEffect"}[type];
        const field={background:"background",outline:"outline",circle:"circle",effect:"effect"}[type];
        const result=await submitBackground({action,[field]:key});
        if(type==="background")appliedBackground=result.background;
        if(type==="outline")appliedOutline=result.outline;
        if(type==="circle")appliedCircle=result.circle;
        if(type==="effect")appliedEffect=result.effect;
        storeContext["applied"+type[0].toUpperCase()+type.slice(1)]=key;
        storeContext.balance=result.balance;
        document.getElementById("storeBalance").textContent=result.balance;
        for(const id of ["outlineStoreBalance","circleStoreBalance","effectStoreBalance"]){const balance=document.getElementById(id);if(balance)balance.textContent=result.balance}
        const ownedItems=ownedForType(type);
        if(result.boughtNow&&!ownedItems.includes(key))ownedItems.push(key);
        refreshCards();
        const cosmeticName={background:"Fundo",outline:"Outline",circle:"Círculo de perfil",effect:"Efeito de perfil"}[type];
        const message=result.boughtNow?cosmeticName+" comprado e equipado!":cosmeticName+" equipado sem cobrança.";
        showFeedback(dialogFeedback,message,false);
        showFeedback(document.getElementById({background:"storeFeedback",outline:"outlineFeedback",circle:"circleFeedback",effect:"effectFeedback"}[type]),message,false);
      }catch(error){showFeedback(dialogFeedback,error.message,true)}
      finally{button.disabled=currentForType(type)===key}
    });
    document.getElementById("resetBackground").addEventListener("click",async()=>{
      const button=document.getElementById("resetBackground");if(!appliedBackground){showFeedback(document.getElementById("storeFeedback"),"Seu perfil já está usando o fundo original.",false);return}
      button.disabled=true;
      try{await submitBackground({action:"reset"});appliedBackground=null;refreshCards();showFeedback(document.getElementById("storeFeedback"),"Fundo original restaurado. Suas cores compradas continuam disponíveis.",false)}
      catch(error){showFeedback(document.getElementById("storeFeedback"),error.message,true)}
      finally{button.disabled=false}
    });
    document.getElementById("resetOutline").addEventListener("click",async()=>{
      const button=document.getElementById("resetOutline");
      if(!appliedOutline){showFeedback(document.getElementById("outlineFeedback"),"O outline já acompanha a cor do fundo.",false);return}
      button.disabled=true;
      try{
        await submitBackground({action:"resetOutline"});
        appliedOutline=null;storeContext.appliedOutline=null;
        refreshCards();
        showFeedback(document.getElementById("outlineFeedback"),"Outline padrão restaurado; ele acompanha a cor do fundo.",false);
      }catch(error){showFeedback(document.getElementById("outlineFeedback"),error.message,true)}
      finally{button.disabled=false}
    });
    async function resetCosmetic(type,buttonId,feedbackId,action){
      const button=document.getElementById(buttonId);if(!currentForType(type)){showFeedback(document.getElementById(feedbackId),"Nenhum item está equipado nesta categoria.",false);return}
      button.disabled=true;try{await submitBackground({action});if(type==="circle")appliedCircle=null;else appliedEffect=null;storeContext["applied"+type[0].toUpperCase()+type.slice(1)]=null;refreshCards();showFeedback(document.getElementById(feedbackId),"Cosmético removido. Seus itens comprados continuam disponíveis.",false)}catch(error){showFeedback(document.getElementById(feedbackId),error.message,true)}finally{button.disabled=false}
    }
    document.getElementById("resetCircle").addEventListener("click",()=>resetCosmetic("circle","resetCircle","circleFeedback","resetCircle"));
    document.getElementById("resetEffect").addEventListener("click",()=>resetCosmetic("effect","resetEffect","effectFeedback","resetEffect"));
    refreshCards();
  </script></body></html>`;
}

function renderShopCatalog(data, shopType) {
  const botShop = shopType === "bot";
  const title = botShop ? "Loja do Bot" : data.store.title || "Mercado Local";
  const items = botShop ? data.items : data.store.items;
  const account = data.account || {};
  const balance = Number(data.balance) || 0;
  const resettableKeys = new Set(["work", "fishing", "mining", "robbery"]);
  const isActivityAtLimit = item => Number(account[item.count]) >= Number(item.max);
  const groups = new Map();
  for (const item of items) {
    const category = botShop
      ? item.product ? "Proteção" : "Resets"
      : String(item.category || "Geral").trim() || "Geral";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  }
  const notice = botShop
    ? "Compre resets e itens de proteção diretamente pelo painel. Resets só podem ser comprados quando o limite diário da atividade acabar."
    : data.store.notice;
  const rarityLabels = {
    [economy.ITEM_RARITY.COMMON]: "Comum",
    [economy.ITEM_RARITY.UNCOMMON]: "Incomum",
    [economy.ITEM_RARITY.RARE]: "Raro",
    [economy.ITEM_RARITY.EPIC]: "Épico",
    [economy.ITEM_RARITY.LEGENDARY]: "Lendário"
  };
  const shopContext = {
    platform: data.platform,
    groupId: data.groupId,
    shop: botShop ? "bot" : "market",
    shieldCharges: Number(data.shieldCharges) || 0
  };
  const cosmeticThemeStyles = getCosmeticPanelStyles(data.profileBackground, "local", data.profileOutline);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escapeHtml(title)} · ${escapeHtml(data.groupName)}</title><style>
    :root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb}*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:24px;background:radial-gradient(circle at 15% 0,#252b48 0,#10131c 48%,#090b10 100%)}button,a{font:inherit}.catalog-page{width:min(900px,100%);margin:0 auto}.catalog-topbar{padding:8px 0 20px;border-bottom:1px solid #ffffff16}.catalog-topbar a{color:#b9c6ff;text-decoration:none;font-weight:700}.catalog-hero{margin:24px 0;padding:25px;border:1px solid #8797ff33;border-radius:20px;background:linear-gradient(120deg,#293454,#22263d 70%,#1b2435)}.catalog-hero h1{margin:0 0 9px;font-size:clamp(26px,5vw,38px)}.catalog-hero p{margin:0;color:#c1c9df;line-height:1.6}.catalog-balance{display:flex;justify-content:space-between;gap:12px;margin:16px 0;padding:14px 17px;border:1px solid #ffffff18;border-radius:13px;background:#ffffff06;color:#aab3c8}.catalog-balance strong{color:#f5f7fb}.catalog-category{margin-top:16px;padding:21px;border:1px solid #ffffff14;border-radius:17px;background:linear-gradient(145deg,#191e2d,#131824)}.catalog-category h2{margin:0 0 13px;font-size:18px}.catalog-items{display:grid;gap:8px}.catalog-item{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px;border:1px solid #ffffff0f;border-radius:12px;background:#ffffff05}.catalog-item h3{margin:0;font-size:14px}.catalog-item p{margin:5px 0 0;color:#aab3c8;font-size:11px}.catalog-item-action{display:flex;align-items:center;gap:12px}.catalog-item-action strong{white-space:nowrap;color:#c6bdff;font-size:13px}.catalog-buy{min-height:36px;padding:7px 12px;border:1px solid #8797ff66;border-radius:9px;background:#8797ff1a;color:#e3e7ff;font-size:12px;font-weight:750;cursor:pointer}.catalog-buy:hover{background:#8797ff32}.catalog-buy:disabled{opacity:.55;cursor:not-allowed}.catalog-unavailable{color:#aab3c8;font-size:11px;font-weight:700;text-align:right}.catalog-feedback{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.catalog-empty{padding:18px;border:1px dashed #ffffff25;border-radius:12px;color:#aab3c8}.catalog-footer{margin:18px 0;color:#8390a9;font-size:12px}.purchase-dialog{position:fixed;inset:50% auto auto 50%;transform:translate(-50%,-50%);margin:0;width:min(440px,calc(100% - 28px));max-height:calc(100vh - 32px);overflow:auto;padding:0;border:1px solid #8797ff55;border-radius:18px;background:#171c2a;color:#f5f7fb;box-shadow:0 24px 90px #000b}.purchase-dialog::backdrop{background:#05070bcc;backdrop-filter:blur(4px)}.purchase-dialog-content{padding:22px}.purchase-dialog h2{margin:0 0 10px}.purchase-dialog p{margin:0;color:#c1c9df;line-height:1.6;overflow-wrap:anywhere}.purchase-dialog.success h2{color:#9cf0cf}.purchase-dialog.error h2{color:#ff9caa}.purchase-dialog-actions{display:flex;justify-content:flex-end;margin-top:20px}.purchase-dialog-actions button{min-height:38px;padding:8px 14px;border:1px solid #ffffff30;border-radius:9px;background:#ffffff0b;color:#f5f7fb;font-weight:700;cursor:pointer}@media(max-width:540px){body{padding:16px}.catalog-hero,.catalog-category{padding:18px}.catalog-item{align-items:flex-start;flex-direction:column}.catalog-item-action{width:100%;justify-content:space-between}}
  </style></head><body><main class="catalog-page">
    <nav class="catalog-topbar"><a href="/painel-local?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}">← Voltar ao perfil</a></nav>
    <header class="catalog-hero"><h1>${botShop ? "🛒 " : "🏪 "}${escapeHtml(title)}</h1><p>${escapeHtml(notice)}</p></header>
    <div class="catalog-balance"><span>Seu saldo local</span><strong id="shopBalance">${escapeHtml(economy.formatMoney(data.balance))}</strong></div>
    ${items.length ? [...groups].map(([category, entries]) => `
      <section class="catalog-category"><h2>${escapeHtml(category)}</h2>
        <div class="catalog-items">${entries.map(item => {
          const selection = botShop ? item.key : item.id;
          const outOfStock = !botShop && item.quantity === 0;
          const shieldActive = botShop && item.key === "shield" && shopContext.shieldCharges > 0;
          const detail = botShop
            ? rarityLabels[item.rarity] || "Item da economia"
            : `ID ${item.id} · <span class="catalog-stock">${item.quantity === null ? "Estoque ilimitado" : `Estoque: ${item.quantity}`}</span>`;
          return `<article class="catalog-item" data-shop-item="${escapeHtml(String(selection))}" data-shop-price="${Number(item.price) || 0}">
            <div><h3>${escapeHtml(item.name)}</h3><p>${detail}</p></div>
            ${(() => {
              const affordable = balance >= Number(item.price);
              let ready = true;
              let unavailableReason = "";
              if (!affordable) unavailableReason = "Saldo insuficiente";
              if (botShop && item.key === "shield") {
                if (shopContext.shieldCharges > 0) {
                  ready = false;
                  unavailableReason = `Escudo ativo (${shopContext.shieldCharges})`;
                } else if (balance < economy.MIN_SHIELD_BALANCE) {
                  ready = false;
                  unavailableReason = `Saldo mínimo: ${economy.formatMoney(economy.MIN_SHIELD_BALANCE)}`;
                }
              } else if (botShop && item.key === "all") {
                ready = [...resettableKeys].every(key => {
                  const resetItem = data.items.find(candidate => candidate.key === key);
                  return resetItem && isActivityAtLimit(resetItem);
                });
                if (!ready) unavailableReason = "Aguarde os limites de trabalho, pesca, mineração e roubo";
              } else if (botShop && !item.product) {
                ready = isActivityAtLimit(item);
                if (!ready) unavailableReason = "Disponível após esgotar o limite diário";
              } else if (!botShop && item.quantity === 0) {
                ready = false;
                unavailableReason = "Esgotado";
              }
              const canPurchase = affordable && ready;
              return `<div class="catalog-item-action"><strong>${economy.formatMoney(item.price)}</strong>${canPurchase
                ? `<button class="catalog-buy" type="button" data-shop-purchase="${escapeHtml(String(selection))}">Comprar</button>`
                : `<span class="catalog-unavailable">${escapeHtml(unavailableReason || "Indisponível")}</span>`}</div>`;
            })()}
          </article>`;
        }).join("")}</div>
      </section>`).join("") : `<section class="catalog-category"><p class="catalog-empty">${botShop ? "Não há itens disponíveis." : "O Mercado Local ainda não tem itens cadastrados."}</p></section>`}
    <p id="shopFeedback" class="catalog-feedback" role="status" aria-live="polite"></p>
    <p class="catalog-footer">${botShop ? "A compra é aplicada imediatamente à sua economia local." : "Após a compra, seu pedido ficará pendente até a entrega manual pela equipe deste grupo/servidor."}</p>
  </main><dialog id="purchaseDialog" class="purchase-dialog" aria-labelledby="purchaseDialogTitle" aria-describedby="purchaseDialogMessage"><div class="purchase-dialog-content"><h2 id="purchaseDialogTitle"></h2><p id="purchaseDialogMessage"></p><footer class="purchase-dialog-actions"><button type="button" id="closePurchaseDialog">Fechar</button></footer></div></dialog><style>${cosmeticThemeStyles}</style><script>
    const shopContext=${JSON.stringify(shopContext)};
    const feedback=document.getElementById("shopFeedback");
    const purchaseDialog=document.getElementById("purchaseDialog");
    function showPurchaseResult(title,message,isError){
      purchaseDialog.classList.toggle("error",Boolean(isError));
      purchaseDialog.classList.toggle("success",!isError);
      document.getElementById("purchaseDialogTitle").textContent=title;
      document.getElementById("purchaseDialogMessage").textContent=message;
      purchaseDialog.showModal();
    }
    function showShopFeedback(message,isError){feedback.textContent=message;feedback.classList.toggle("error",Boolean(isError))}
    function replacePurchaseButton(button,message){
      const status=document.createElement("span");status.className="catalog-unavailable";status.textContent=message;button.replaceWith(status);
    }
    function hideUnaffordableButtons(balance){
      document.querySelectorAll("[data-shop-purchase]").forEach(button=>{
        const card=button.closest("[data-shop-item]");
        if(card&&balance<Number(card.dataset.shopPrice))replacePurchaseButton(button,"Saldo insuficiente");
      });
    }
    document.getElementById("closePurchaseDialog").addEventListener("click",()=>purchaseDialog.close());
    purchaseDialog.addEventListener("click",event=>{if(event.target===purchaseDialog)purchaseDialog.close()});
    document.querySelectorAll("[data-shop-purchase]").forEach(button=>button.addEventListener("click",async()=>{
      if(button.disabled)return;
      const selection=button.dataset.shopPurchase;let keepDisabled=false;button.disabled=true;showShopFeedback("Processando compra...",false);
      try{
        const response=await fetch("/api/account/local/shop-purchase",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...shopContext,selection})});
        const result=await response.json();if(!response.ok)throw new Error(result.error||"Não foi possível concluir a compra.");
        document.getElementById("shopBalance").textContent=result.balance;
        hideUnaffordableButtons(result.balanceValue);
        if(shopContext.shop==="market"){
          const card=Array.from(document.querySelectorAll("[data-shop-item]")).find(candidate=>candidate.dataset.shopItem===String(result.itemId));
          if(card){const stock=card.querySelector(".catalog-stock");if(stock)stock.textContent=result.quantity===null?"Estoque ilimitado":"Estoque: "+result.quantity;if(result.quantity===0)replacePurchaseButton(button,"Esgotado")}
          const message="Pedido #"+result.orderId+" criado para "+result.itemName+". A equipe fará a entrega manualmente. Saldo atual: "+result.balance;
          showShopFeedback(message,false);showPurchaseResult("Compra concluída",message,false);
        }else{
          if(result.itemKey==="shield")replacePurchaseButton(button,"Escudo ativo ("+result.shieldCharges+")");
          else {
            replacePurchaseButton(button,"Comprado hoje");
            document.querySelectorAll("[data-shop-purchase]").forEach(availableButton=>{
              const key=availableButton.dataset.shopPurchase;
              if(key==="all"||result.itemKey==="all")replacePurchaseButton(availableButton,"Indisponível hoje");
            });
          }
          const message=result.itemName+" comprado por "+result.price+". Saldo atual: "+result.balance;
          showShopFeedback(message,false);showPurchaseResult("Compra concluída",message,false);
        }
      }catch(error){showShopFeedback(error.message,true);showPurchaseResult("Compra recusada",error.message,true)}
      finally{button.disabled=keepDisabled}
    }));
  </script></body></html>`;
}

function getCosmeticPanelStyles(backgroundKey, panelType, outlineKey) {
  const background = economy.PROFILE_BACKGROUNDS[backgroundKey];
  const outline = economy.PROFILE_OUTLINES[outlineKey];
  if (!background && !outline) return "";
  const [start, middle, end] = background?.stops || ["#27365d", "#111827", "#090b10"];
  const accent = background?.accent || "#7ea7ff";
  const borderColor = outline?.color || accent;
  const rainbowGradient = "linear-gradient(110deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744)";
  const rainbowAnimation = background?.rainbow || outline?.rainbow
    ? `@keyframes cosmetic-rainbow-cycle{to{background-position:100% 50%,100% 50%}}@media(prefers-reduced-motion:reduce){body,.local-hero,.local-panel,.local-stat,.rank-link,.local-avatar-frame,.catalog-hero,.catalog-category,.catalog-item,.admin-page .hero,.admin-page .hero .avatar,.admin-page .overview-card,.admin-page .setting-card,.admin-page .moderation-card{animation:none!important}}`
    : "";
  const pageBackground = background?.rainbow
    ? rainbowGradient
    : `radial-gradient(circle at top,${start} 0,${middle} 48%,${end} 100%)`;
  const heroBackground = `linear-gradient(145deg,${start},${middle} 55%,${end})`;
  const panelBackground = `linear-gradient(145deg,${middle} 0%,${end} 100%)`;
  if (panelType === "local") {
    const outlineStyles = outline?.rainbow
      ? `.local-hero,.local-panel,.catalog-hero{border:6px solid transparent;background:${heroBackground} padding-box,${rainbowGradient} border-box;background-size:100% 100%,300% 100%;animation:cosmetic-rainbow-cycle 5s linear infinite}.local-panel,.catalog-category{background:${panelBackground} padding-box,${rainbowGradient} border-box}.local-stat,.rank-link,.catalog-item{border:6px solid transparent;background:linear-gradient(${middle},${middle}) padding-box,${rainbowGradient} border-box;background-size:100% 100%,300% 100%;animation:cosmetic-rainbow-cycle 5s linear infinite}.local-avatar-frame{border:6px solid transparent;background:linear-gradient(#171d2b,#171d2b) padding-box,${rainbowGradient} border-box;background-size:100% 100%,300% 100%}`
      : outline
        ? outline.frozen
          ? `.local-hero,.local-panel,.local-stat,.rank-link,.local-avatar-frame,.catalog-hero,.catalog-category,.catalog-item{border:3px double #f5fcff;outline:1px solid ${borderColor};box-shadow:0 0 0 2px ${borderColor}66,0 0 14px ${borderColor}44}.local-hero,.local-panel,.catalog-hero,.catalog-category,.local-stat,.rank-link,.catalog-item{position:relative}.local-hero:before,.local-panel:before,.catalog-hero:before,.catalog-category:before,.local-hero:after,.local-panel:after,.catalog-hero:after,.catalog-category:after{content:"❄";position:absolute;top:-11px;z-index:2;color:#f5fcff;font-size:17px;line-height:1;text-shadow:0 0 4px #fff,0 0 10px ${borderColor};pointer-events:none}.local-hero:before,.local-panel:before,.catalog-hero:before,.catalog-category:before{left:18px}.local-hero:after,.local-panel:after,.catalog-hero:after,.catalog-category:after{right:18px}.local-stat:after,.rank-link:after,.catalog-item:after{content:"❄";position:absolute;top:-9px;right:10px;z-index:2;color:#f5fcff;font-size:14px;line-height:1;text-shadow:0 0 4px #fff,0 0 9px ${borderColor};pointer-events:none}`
          : `.local-hero,.local-panel,.local-stat,.rank-link,.local-avatar-frame,.catalog-hero,.catalog-category,.catalog-item{border:3px solid ${borderColor}}`
        : "";
    return `${rainbowAnimation}body{background:${pageBackground};${background?.rainbow ? "background-size:300% 300%;animation:cosmetic-rainbow-cycle 7s linear infinite" : ""}}.local-hero,.catalog-hero{border-color:${accent}88;background:${heroBackground}}.local-panel,.catalog-category{border-color:${accent}66;background:${panelBackground}}.local-stat,.rank-link,.catalog-item{border-color:${borderColor}88;background:${middle}88}.local-topbar a,.local-section-heading h2,.rank-link span,.catalog-category h2{color:${accent}}.rank-link:hover,.catalog-item:hover{border-color:${borderColor};background:${start}88}.catalog-buy{border-color:${accent}99;background:${accent}22;color:#f5f7fb}.catalog-buy:hover{border-color:${accent};background:${accent}44}${outlineStyles}`;
  }
  const outlineStyles = outline?.rainbow
    ? `.admin-page .hero,.admin-page .overview-card,.admin-page .setting-card,.admin-page .moderation-card{border:6px solid transparent;background:${heroBackground} padding-box,${rainbowGradient} border-box;background-size:100% 100%,300% 100%;animation:cosmetic-rainbow-cycle 5s linear infinite}.admin-page .overview-card,.admin-page .setting-card,.admin-page .moderation-card{background:${panelBackground} padding-box,${rainbowGradient} border-box}.admin-page .hero .avatar{border:6px solid transparent;background:linear-gradient(#171d2b,#171d2b) padding-box,${rainbowGradient} border-box;background-size:100% 100%,300% 100%;animation:cosmetic-rainbow-cycle 5s linear infinite}`
    : outline
      ? `.admin-page .hero,.admin-page .overview-card,.admin-page .setting-card,.admin-page .moderation-card{border:3px solid ${borderColor}}.admin-page .hero .avatar{border:3px solid ${borderColor}}`
      : "";
  return `${rainbowAnimation}body{background:${pageBackground};${background?.rainbow ? "background-size:300% 300%;animation:cosmetic-rainbow-cycle 7s linear infinite" : ""}}
    .admin-page .topbar a,.admin-page .eyebrow,.admin-page .permission-count,.admin-page .shortcut-card code,.admin-page .scope-picker label,.admin-page .scope-current{color:${accent}}
    .admin-page .hero{border-color:${accent}88;background:${heroBackground}}
    .admin-page .overview-card,.admin-page .setting-card,.admin-page .moderation-card{border-color:${accent}66;background:${panelBackground}}
    .admin-page .shortcut-card,.admin-page .overview-nav a,.admin-page .scope-panel,.admin-page .moderation-result,.admin-page .warning-list>li,.admin-page .resource-card{border-color:${accent}44;background:${middle}88}
    .admin-page .member-picker-card{border-color:${accent}55!important;background:${middle}88!important}
    .admin-page .setting-scope{border-color:${accent}66;background:${accent}20;color:${accent}}
    .admin-page .moderation-search input,.admin-page .moderation-fields input,.admin-page .moderation-fields textarea,.admin-page .moderation-fields select,.admin-page .moderation-role-select,.admin-page .scope-picker select{border-color:${accent}55;background:${end};color:#f5f7fb}
    .admin-page .moderation-search button,.admin-page .moderation-card button:not(.danger),.admin-page .moderation-action:not(.danger),.admin-page .setting-controls button,.admin-page .copy-command,.admin-page .overview-nav a{border-color:${accent}66}
    .admin-page .overview-nav a:hover,.admin-page .copy-command:hover,.admin-page .setting-controls button:hover,.admin-page .moderation-card button:not(.danger):hover,.admin-page .moderation-action:not(.danger):hover{border-color:${accent};background:${start}88}
    .admin-page .antilink-dialog{border-color:${accent}88;background:linear-gradient(145deg,${middle},${end});}
    .admin-page .antilink-dialog-heading p{color:${accent}}
    .admin-page .antilink-dialog input:not([type="checkbox"]):not([type="radio"]),.admin-page .antilink-dialog select,.admin-page .antilink-dialog textarea{border-color:${accent}55;background:${end};color:#f5f7fb}
    .admin-page .antilink-dialog .autorepo-global-toggle,.admin-page .antilink-dialog .autorepo-response-card,.admin-page .antilink-dialog .store2-row,.admin-page .antilink-dialog .rp-xp-settings,.admin-page .antilink-dialog .scope-panel,.admin-page .antilink-dialog .monitor-check-list label{border-color:${accent}44;background:${middle}88}
    .admin-page .antilink-dialog .rp-user-card,.admin-page .antilink-dialog .schedule-card{border-color:${accent}55!important;background:${middle}88!important}
    .admin-page .antilink-dialog .schedule-card button:not(.danger){border-color:${accent}66!important;background:${accent}20!important}
    .admin-page .antilink-dialog .monitor-job{border-color:${accent}55;background:${middle}88}
    .admin-page .antilink-dialog button:not(.danger):not(.primary):not(.dialog-close):hover{border-color:${accent};background:${start}88}
    .admin-page .antilink-dialog .primary{border-color:${accent};background:${accent}33}
    ${outlineStyles}`;
}

function renderProtectionAdmin(data, setting) {
  const isAntipalavras = setting === "antipalavras";
  const isAntimedia = setting === "antimedia";
  const isAntiraid = setting === "antiraid";
  const isBlockcmd = setting === "blockcmd";
  const title = isAntipalavras ? "Antipalavras" : isAntimedia ? "Antimídia"
    : isAntiraid ? "Antiraid" : isBlockcmd ? "Bloqueio de comandos" : "Antilink";
  const context = JSON.stringify({ platform: data.platform, groupId: data.groupId });
  const groupType = data.platform === "discord" ? "Servidor" : "Grupo";
  const scopeNavigation = data.platform === "discord"
    ? `<div class="scope-row scope-levels"><button type="button" data-level="server" aria-pressed="true">Servidor</button><button type="button" data-level="categoria" aria-pressed="false">Categoria</button><button type="button" data-level="chat" aria-pressed="false">Chats</button></div><div class="scope-row"><select id="categorySelect" aria-label="Selecionar categoria"><option value="">Selecione uma categoria</option></select><select id="channelSelect" aria-label="Selecionar chat" disabled><option value="">Selecione primeiro uma categoria</option></select></div>`
    : data.platform === "telegram"
      ? `<div class="scope-row scope-levels"><button type="button" id="groupScope" aria-pressed="true">Grupo todo + chat principal</button><button type="button" id="topicsScope" aria-pressed="false">Tópicos</button></div><div class="scope-row"><select id="topicSelect" aria-label="Selecionar tópico" hidden><option value="">Selecione um tópico</option></select></div>`
      : `<div class="scope-row"><button type="button" aria-pressed="true" disabled>Grupo</button></div>`;
  const roleFields = data.platform === "discord"
    ? `<label>Cargos isentos<textarea name="roleWhitelist" rows="3" placeholder="um ID de cargo por linha"></textarea></label><label>${isAntipalavras ? "Cargos sempre monitorados" : isAntimedia ? "Cargos na lista negra" : "Cargos sem exceção de links de mídia"}<textarea name="roleBlacklist" rows="3" placeholder="um ID de cargo por linha"></textarea></label>`
    : "";
  const roleListFields = roleFields;
  const mediaTypeOptions = [["image","Imagem / foto"],["video","Vídeo"],["audio","Áudio / música"],["document","Documento / arquivo"],["sticker","Figurinha"],["location","Localização"],["contact","Contato"],["voice","Mensagem de voz"],["gif","GIF"]];
  const antiraidActions = data.platform === "whatsapp"
    ? '<option value="remove">Remover membro</option>'
    : data.platform === "discord"
      ? '<option value="timeout">Silenciar temporariamente</option><option value="kick">Expulsar</option><option value="ban">Banir</option>'
      : '<option value="mute">Silenciar</option><option value="kick">Expulsar</option><option value="ban">Banir</option>';
  const antiraidNumericFields = [
    ["maxMessagesPerWindow", "Mensagens no limite", 1, 100, "Máximo de mensagens na janela."],
    ["windowSeconds", "Janela (segundos)", 1, 300, ""],
    ["repeatedMessageLimit", "Mensagens repetidas", 1, 100, ""],
    ["linkLimit", "Links", 1, 100, ""],
    ["inviteLimit", "Convites", 1, 100, ""],
    ["mentionLimit", "Menções", 0, 100, "0 desativa o limite de menções."],
    ...(data.platform === "discord" ? [["webhookLimit", "Webhooks", 0, 100, "0 desativa este limite."]] : [])
  ];
  const ruleFields = isAntipalavras
    ? `<label class="words-field">Palavras e frases bloqueadas<textarea name="words" rows="7" maxlength="100500" placeholder="Uma palavra ou frase por linha"></textarea><small class="muted">Cada entrada é verificada individualmente nas mensagens.</small></label>`
    : isAntimedia
      ? `<fieldset class="media-types-field"><legend>Tipos de mídia bloqueados</legend><div class="media-type-grid">${mediaTypeOptions.map(([value,label]) => `<label><input type="checkbox" name="mediaTypes" value="${value}"> ${label}</label>`).join("")}</div><small class="muted">Se nenhum tipo for marcado, todos os tipos de mídia serão bloqueados.</small></fieldset>`
      : isBlockcmd
        ? `<label class="words-field">Comandos e categorias bloqueados<textarea name="blockedCommands" rows="8" maxlength="100500" placeholder="Um comando ou categoria por linha (sem prefixo)"></textarea><small class="muted">Informe o nome do comando ou categoria, por exemplo: cotacao ou adm/segurança.</small></label>`
        : isAntiraid
          ? `<fieldset class="antiraid-fields"><legend>Limites de proteção</legend><div class="antiraid-grid">${antiraidNumericFields.map(([name,label,min,max,hint]) => `<label>${label}<input type="number" name="${name}" min="${min}" max="${max}" required>${hint ? `<small class="muted">${hint}</small>` : ""}</label>`).join("")}</div></fieldset>`
      : `<label>Domínios permitidos<textarea name="whitelist" rows="3" placeholder="um domínio por linha"></textarea><small class="muted">Links desses domínios não são tratados como infração.</small></label><label><span><input type="checkbox" name="ignoreSameGroup"> Permitir links do próprio grupo/servidor</span></label><label><span><input type="checkbox" name="ignoreMedia"> Ignorar links identificados como mídia (YouTube, TikTok, Instagram)</span></label>`;
  const inheritOption = isAntiraid ? "" : `<label class="inheritance-option"><span><input type="checkbox" name="ignoreParent"> Ignorar as regras dos escopos superiores</span></label>`;
  const exceptionFields = isBlockcmd ? "" : `<label>Usuários isentos<textarea name="userWhitelist" rows="3" placeholder="um ID por linha"></textarea></label>
        <label>${isAntipalavras ? "Usuários sempre monitorados" : isAntimedia || isAntiraid ? "Usuários na lista negra" : "Usuários sem exceção de links de mídia"}<textarea name="userBlacklist" rows="3" placeholder="um ID por linha"></textarea></label>
        ${roleListFields}`;
  const settingsForm = `<form id="protectionForm" class="grid" style="margin-top:16px">
        <label>Ação ao detectar ${isAntipalavras ? "palavra/frase" : isAntimedia ? "mídia" : isAntiraid ? "raid" : isBlockcmd ? "comando bloqueado" : "link"}<select name="action">${isBlockcmd ? '<option value="reply">Avisar no chat</option><option value="ignore">Ignorar silenciosamente</option><option value="delete">Apagar a mensagem</option>' : isAntiraid ? antiraidActions : '<option value="delete">Deletar mensagem</option><option value="warn">Deletar e avisar</option><option value="kick">Deletar e expulsar</option><option value="ban">Deletar e banir</option>'}</select></label>
        ${isAntiraid ? "" : '<label>Mensagem de aviso<textarea name="message" maxlength="2000" rows="3" placeholder="Mensagem enviada quando a ação avisa o usuário"></textarea></label>'}
        ${inheritOption}${ruleFields}${exceptionFields}
        <div><button type="submit" class="primary">Salvar configurações</button></div>
      </form>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Configurações do ${title.toLowerCase()}</title><style>
    :root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb;--line:#334366;--muted:#9da8bd}*{box-sizing:border-box}body{margin:0;padding:24px;background:radial-gradient(circle at top,#27365d 0,#10131c 48%,#090b10 100%)}button,input,textarea,select{font:inherit}.page{width:min(900px,100%);margin:0 auto}.top{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:8px 0 20px;border-bottom:1px solid var(--line)}a{color:#b9c6ff;text-decoration:none;font-weight:700}.hero,.panel{margin-top:20px;padding:22px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,#1c2438,#131925)}h1{margin:7px 0;font-size:clamp(23px,4vw,34px)}h2{margin:0 0 8px;font-size:18px}.muted{color:var(--muted);line-height:1.55}.scope-navigation{display:grid;gap:8px;margin-top:16px}.scope-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:9px;border:1px solid var(--line);border-radius:10px;background:#ffffff05}.scope-row button,.scope-row select,button{min-height:38px;padding:8px 11px;border:1px solid #6f7fa5;border-radius:9px;background:#ffffff0b;color:#f5f7fb;font:inherit;font-size:12px;font-weight:700;cursor:pointer}.scope-row select{flex:1 1 220px;min-width:min(220px,100%)}.scope-row.scope-levels button{flex:1 1 130px}.scope-row button[aria-pressed=true]{border-color:#9b8cff;background:#8b7bff30;color:#e3ddff}.scope-row button:disabled,button:disabled{opacity:.55;cursor:wait}label{display:grid;gap:6px;color:#dce2f3;font-size:12px;font-weight:700}input:not([type=checkbox]),textarea,select{width:100%;padding:10px 11px;border:1px solid #485776;border-radius:9px;background:#0e1422;color:#f5f7fb}textarea{resize:vertical}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.setting{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px;border:1px solid var(--line);border-radius:11px;background:#ffffff05}.setting label{display:flex;align-items:center;gap:9px;font-size:14px}.setting input{width:19px;height:19px;accent-color:#9b8cff}.words-field,.media-types-field{grid-column:1/-1}.media-types-field{margin:0;padding:12px;border:1px solid var(--line);border-radius:10px}.media-type-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px 14px}.media-type-grid label{display:flex;align-items:center;gap:7px}.media-types-field small{display:block;margin-top:8px;color:var(--muted)}.inheritance-option[hidden]{display:none}.feedback{min-height:20px;margin:12px 0 0;color:#9cf0cf;font-size:12px}.feedback.error{color:#ff9eaa}.primary{border-color:#9b8cff;background:#8b7bff30}button:hover{border-color:#9b8cff;background:#8b7bff20}.hint{margin:8px 0 0;color:var(--muted);font-size:12px;line-height:1.5}@media(max-width:620px){body{padding:14px}.grid{grid-template-columns:1fr}.words-field,.media-types-field{grid-column:auto}.top{align-items:flex-start;flex-direction:column}.hero,.panel{padding:16px}}
  </style></head><body><main class="page">
    <nav class="top"><a href="/painel-admin?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}">← Painel de administração</a><span>${escapeHtml(groupType)} · ${escapeHtml(data.groupName)}</span></nav>
    <header class="hero"><small>CONFIGURAÇÕES LOCAIS</small><h1>${title}</h1><p class="muted">${data.platform === "whatsapp" ? `Configure ${title.toLowerCase()} somente para este grupo.` : data.platform === "telegram" ? "Escolha entre o grupo e chat principal ou um tópico específico." : "Configure no servidor, em uma categoria ou em um chat específico."}</p></header>
    <section class="scope-navigation" aria-label="Escopo do ${title.toLowerCase()}">${scopeNavigation}<p id="scopeNote" class="muted">${data.platform === "telegram" ? "A regra geral vale para o grupo e para o chat principal." : "Selecione o escopo para editar as regras."}</p></section>
    <section class="panel"><div class="setting"><label><input id="enabled" type="checkbox" disabled> Ativar ${title.toLowerCase()}</label><span id="enabledStatus" class="muted">Carregando...</span></div>
      ${settingsForm}<p id="feedback" class="feedback" role="status" aria-live="polite"></p>
    </section>
  </main><script>
    const context=${context};
    const setting=${JSON.stringify(setting)};
    const title=${JSON.stringify(title)};
    const form=document.getElementById("protectionForm");
    const enabled=document.getElementById("enabled");
    const feedback=document.getElementById("feedback");
    let activeScope={level:context.platform==="whatsapp"?"chat":"server"};
    let currentConfig=null;
    let requestId=0;
    async function request(path,payload={}){
      const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...context,...payload})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Não foi possível carregar as configurações.");
      return result;
    }
    function setInheritanceVisibility(){
      if(!form.elements.ignoreParent)return;
      const option=form.elements.ignoreParent.closest("label");
      const isRoot=activeScope.level==="server"||(context.platform==="whatsapp"&&activeScope.level==="chat");
      option.hidden=isRoot;
      if(isRoot)form.elements.ignoreParent.checked=false;
    }
    function fill(config){
      currentConfig=config;
      enabled.checked=config.enabled===true;
      enabled.disabled=false;
      document.getElementById("enabledStatus").textContent=enabled.checked?"Ativado":"Desativado";
      let action=config.action||"delete";
      if(setting==="antiraid"){
        if(context.platform==="whatsapp"&&["mute","remove"].includes(action))action="remove";
        else if(context.platform==="discord"&&action==="mute")action="timeout";
        if(![...form.elements.action.options].some(option=>option.value===action)){
          action=context.platform==="whatsapp"?"remove":context.platform==="discord"?"timeout":"mute";
        }
      }
      form.elements.action.value=action;
      if(form.elements.message)form.elements.message.value=config.message||"";
      for(const key of ["ignoreParent","ignoreSameGroup","ignoreMedia"]){
        if(form.elements[key])form.elements[key].checked=config[key]===true;
      }
      const mediaTypes=new Set(Array.isArray(config.mediaTypes)?config.mediaTypes:[]);
      form.querySelectorAll('input[name="mediaTypes"]').forEach(input=>{input.checked=mediaTypes.has(input.value)});
      for(const key of ["whitelist","userWhitelist","userBlacklist","roleWhitelist","roleBlacklist"]){
        if(form.elements[key])form.elements[key].value=Array.isArray(config[key])?config[key].join("\\n"):"";
      }
      if(form.elements.words)form.elements.words.value=Array.isArray(config.words)?config.words.join("\\n"):"";
      if(form.elements.blockedCommands)form.elements.blockedCommands.value=Array.isArray(config.blockedCommands)?config.blockedCommands.join("\\n"):"";
      for(const key of ["maxMessagesPerWindow","windowSeconds","repeatedMessageLimit","linkLimit","inviteLimit","mentionLimit","webhookLimit"]){
        if(form.elements[key])form.elements[key].value=Number.isFinite(config[key])?config[key]:"";
      }
      setInheritanceVisibility();
      form.querySelectorAll("input,textarea,select,button").forEach(control=>control.disabled=false);
    }
    async function load(scope){
      activeScope=scope;
      const id=++requestId;
      feedback.classList.remove("error");feedback.textContent="Carregando configurações...";
      enabled.disabled=true;
      form.querySelectorAll("input,textarea,select,button").forEach(control=>control.disabled=true);
      setInheritanceVisibility();
      try{
        const {config}=await request("/api/account/local/admin-"+setting+"-state",{scope});
        if(id===requestId){
          fill(config);
          feedback.classList.remove("error");
          feedback.textContent="";
        }
      }catch(error){
        if(id===requestId){feedback.classList.add("error");feedback.textContent=error.message}
      }
    }
    async function setEnabled(value){
      enabled.disabled=true;feedback.classList.remove("error");feedback.textContent="Atualizando proteção...";
      try{
        const result=await request("/api/account/local/admin-settings",{setting,enabled:value,scope:activeScope});
        enabled.checked=result.settings[setting]===true;
        if(currentConfig)currentConfig.enabled=enabled.checked;
        document.getElementById("enabledStatus").textContent=enabled.checked?"Ativado":"Desativado";
        feedback.textContent=result.announcementWarning||result.message||"Configuração atualizada.";
        feedback.classList.toggle("error",Boolean(result.announcementWarning));
      }catch(error){
        enabled.checked=currentConfig?.enabled===true;
        feedback.classList.add("error");feedback.textContent=error.message;
      }finally{enabled.disabled=false}
    }
    enabled.addEventListener("change",()=>setEnabled(enabled.checked));
    form.addEventListener("submit",async event=>{
      event.preventDefault();
      const button=form.querySelector('[type="submit"]');button.disabled=true;
      feedback.classList.remove("error");feedback.textContent="Salvando...";
      const config={action:form.elements.action.value};
      if(form.elements.message)config.message=form.elements.message.value.trim()||null;
      if(form.elements.ignoreParent)config.ignoreParent=!form.elements.ignoreParent.closest("label").hidden&&form.elements.ignoreParent.checked;
      for(const key of ["ignoreSameGroup","ignoreMedia"]){
        if(form.elements[key])config[key]=form.elements[key].checked;
      }
      if(setting==="antimedia"){
        config.mediaTypes=[...form.querySelectorAll('input[name="mediaTypes"]:checked')].map(input=>input.value);
      }
      if(setting==="antiraid"){
        for(const key of ["maxMessagesPerWindow","windowSeconds","repeatedMessageLimit","linkLimit","inviteLimit","mentionLimit","webhookLimit"]){
          if(form.elements[key])config[key]=Number(form.elements[key].value);
        }
      }
      if(form.elements.blockedCommands){
        config.blockedCommands=form.elements.blockedCommands.value.split(/\\r?\\n/).map(value=>value.trim()).filter(Boolean);
      }
      for(const key of ["whitelist","userWhitelist","userBlacklist","roleWhitelist","roleBlacklist"]){
        if(form.elements[key])config[key]=form.elements[key].value.split(/\\r?\\n/).map(value=>value.trim()).filter(Boolean);
      }
      if(form.elements.words)config.words=form.elements.words.value.split(/[\\r\\n,]+/).map(value=>value.trim()).filter(Boolean);
      try{
        const result=await request("/api/account/local/admin-"+setting,{scope:activeScope,config});
        fill(result.config);feedback.textContent=result.announcementWarning||"Configurações de "+title.toLowerCase()+" salvas.";
        feedback.classList.toggle("error",Boolean(result.announcementWarning));
      }catch(error){feedback.classList.add("error");feedback.textContent=error.message}
      finally{button.disabled=false}
    });
    function scopeName(scope){
      const text=id=>document.getElementById(id)?.selectedOptions[0]?.textContent||"selecionado";
      if(scope.level==="server")return context.platform==="discord"?"Servidor":"Grupo todo + chat principal";
      if(scope.level==="categoria")return "Categoria · "+text("categorySelect");
      if(scope.level==="chat")return "Chat · "+text("channelSelect");
      return "Tópico · "+text("topicSelect");
    }
    function updateScopeNote(scope){
      document.getElementById("scopeNote").textContent="Editando: "+scopeName(scope);
    }
    if(context.platform==="telegram"){
      const groupButton=document.getElementById("groupScope");
      const topicsButton=document.getElementById("topicsScope");
      const topicSelect=document.getElementById("topicSelect");
      request("/api/account/local/admin-systems-options").then(({topics,isForum})=>{
        for(const topic of topics||[]){const option=document.createElement("option");option.value=topic.id;option.textContent=topic.name;topicSelect.append(option)}
        if(!isForum){topicsButton.hidden=true;topicSelect.hidden=true;document.getElementById("scopeNote").textContent="Este grupo não usa tópicos. A configuração vale somente para o grupo e o chat principal."}
        else if(!topics?.length){topicsButton.disabled=true;document.getElementById("scopeNote").textContent="Nenhum tópico conhecido pelo bot. Os tópicos aparecerão após o bot observar mensagens neles."}
      }).catch(error=>{feedback.classList.add("error");feedback.textContent=error.message});
      groupButton.addEventListener("click",()=>{groupButton.setAttribute("aria-pressed","true");topicsButton.setAttribute("aria-pressed","false");topicSelect.hidden=true;const scope={level:"server"};updateScopeNote(scope);load(scope)});
      topicsButton.addEventListener("click",()=>{groupButton.setAttribute("aria-pressed","false");topicsButton.setAttribute("aria-pressed","true");topicSelect.hidden=false;if(topicSelect.value){const scope={level:"topic",topicId:topicSelect.value};updateScopeNote(scope);load(scope)}else feedback.textContent="Selecione um tópico para carregar as configurações."});
      topicSelect.addEventListener("change",()=>{if(topicSelect.value){const scope={level:"topic",topicId:topicSelect.value};updateScopeNote(scope);load(scope)}});
    }else if(context.platform==="discord"){
      const categorySelect=document.getElementById("categorySelect");
      const channelSelect=document.getElementById("channelSelect");
      const levelButtons=[...document.querySelectorAll("[data-level]")];
      let categories=[];
      const activate=level=>levelButtons.forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.level===level)));
      const loadCategory=()=>{
        const categoryId=categorySelect.value;channelSelect.replaceChildren();
        const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent=categoryId?"Selecione um chat":"Selecione primeiro uma categoria";channelSelect.append(placeholder);
        const category=categories.find(item=>item.id===categoryId);
        for(const channel of category?.channels||[]){const option=document.createElement("option");option.value=channel.id;option.textContent=channel.name;channelSelect.append(option)}
        channelSelect.disabled=!categoryId;
        if(categoryId){activate("categoria");const scope={level:"categoria",categoryId};updateScopeNote(scope);load(scope)}
      };
      request("/api/account/local/admin-systems-options").then(({categories:items})=>{
        categories=items||[];
        for(const category of categories){const option=document.createElement("option");option.value=category.id;option.textContent=category.name;categorySelect.append(option)}
      }).catch(error=>{feedback.classList.add("error");feedback.textContent=error.message});
      categorySelect.addEventListener("change",loadCategory);
      channelSelect.addEventListener("change",()=>{if(categorySelect.value&&channelSelect.value){activate("chat");const scope={level:"chat",categoryId:categorySelect.value,channelId:channelSelect.value};updateScopeNote(scope);load(scope)}});
      for(const button of levelButtons)button.addEventListener("click",()=>{
        const level=button.dataset.level;activate(level);
        if(level==="server"){const scope={level};updateScopeNote(scope);load(scope)}
        else if(level==="categoria"&&categorySelect.value){const scope={level,categoryId:categorySelect.value};updateScopeNote(scope);load(scope)}
        else if(level==="chat"&&categorySelect.value&&channelSelect.value){const scope={level,categoryId:categorySelect.value,channelId:channelSelect.value};updateScopeNote(scope);load(scope)}
        else feedback.textContent=level==="categoria"?"Selecione uma categoria.":"Selecione uma categoria e um chat.";
      });
    }else{
      updateScopeNote(activeScope);
    }
    load(activeScope);
  </script></body></html>`;
}

function renderAntilinkAdmin(data) {
  return renderProtectionAdmin(data, "antilink");
}

function renderAntipalavrasAdmin(data) {
  return renderProtectionAdmin(data, "antipalavras");
}

function renderAntimediaAdmin(data) {
  return renderProtectionAdmin(data, "antimedia");
}

function renderAntiraidAdmin(data) {
  return renderProtectionAdmin(data, "antiraid");
}

function renderBlockcmdAdmin(data) {
  return renderProtectionAdmin(data, "blockcmd");
}

function renderAutomationAdmin(data, setting, requestedScope = null) {
  const definitions = {
    autodownload: {
      title: "Download automático",
      description: "Veja o estado do recurso e configure a exclusão do link original por chat.",
      configEndpoint: "autodownload",
      fields: `<label class="check"><input type="checkbox" name="deletelink"> Excluir a mensagem com o link original depois do download</label>`
    },
    autoia: {
      title: "Auto-IA",
      description: "Escolha se a IA responde quando mencionada ou em todas as mensagens.",
      configEndpoint: "autoia",
      fields: `<label>Modo<select name="mode"><option value="off">Desativado</option><option value="mention">Responder quando mencionada</option><option value="all">Responder a todas as mensagens</option></select></label>`
    },
    autorepo: {
      title: "Respostas automáticas",
      description: "Gerencie respostas globais e respostas específicas por chat.",
      configEndpoint: "autorepo",
      fields: `<label class="check"><input type="checkbox" name="useGlobal"> Usar respostas oficiais globais</label>
        <section class="responses"><div class="responses-heading"><h2>Respostas deste chat</h2><button type="button" id="addResponse">Adicionar resposta</button></div><div id="responseList" class="response-list"></div></section>`
    },
    autoTranscribe: {
      title: "Transcrição automática",
      description: "Ative ou desative a transcrição automática para o escopo selecionado.",
      configEndpoint: null,
      fields: ""
    }
  }[setting];
  if (!definitions) throw new Error("Painel de automação inválido.");
  const context = JSON.stringify({ platform: data.platform, groupId: data.groupId });
  const requestedScopeJson = JSON.stringify(requestedScope).replace(/</g, "\\u003c");
  const scopes = (ADMIN_SYSTEM_SETTINGS.find(item => item.key === setting)?.scopes[data.platform] || [])
    .filter(level => !(setting === "autoTranscribe" && data.platform === "discord" && level === "categoria"));
  const scopeOptions = data.platform === "discord"
    ? `<label>Escopo<select id="scopeLevel">${scopes.map(level => `<option value="${level}">${level === "server" ? "Servidor" : level === "categoria" ? "Categoria" : "Chat"}</option>`).join("")}</select></label>
       <label id="categoryField" hidden>Categoria<select id="categorySelect"><option value="">Selecione uma categoria</option></select></label>
       <label id="channelField" hidden>Chat<select id="channelSelect"><option value="">Selecione uma categoria primeiro</option></select></label>`
    : data.platform === "telegram" && scopes.includes("topic")
      ? `<div class="scope-tabs"><button type="button" id="groupScope" aria-pressed="true">Grupo todo + chat principal</button><button type="button" id="topicScope" aria-pressed="false">Tópico</button></div><label id="topicField" hidden>Tópico<select id="topicSelect"><option value="">Selecione um tópico</option></select></label>`
      : `<p class="muted">${data.platform === "whatsapp" ? "Configuração aplicada a este grupo." : "Configuração aplicada ao grupo todo."}</p>`;
  const enableField = setting === "autoia"
    ? ""
    : `<label class="check"><input id="enabled" type="checkbox" disabled> Ativar ${definitions.title.toLowerCase()}<span id="enabledStatus" class="muted">Carregando...</span></label>`;
  const backHref = `/painel-admin?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Painel · ${escapeHtml(definitions.title)}</title><style>
    :root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb;--line:#334366;--muted:#9da8bd}*{box-sizing:border-box}body{margin:0;padding:24px;background:radial-gradient(circle at top,#27365d 0,#10131c 48%,#090b10 100%)}button,input,textarea,select{font:inherit}.page{width:min(900px,100%);margin:0 auto}.top{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:8px 0 20px;border-bottom:1px solid var(--line)}a{color:#b9c6ff;text-decoration:none;font-weight:700}.hero,.panel{margin-top:20px;padding:22px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,#1c2438,#131925)}h1{margin:7px 0;font-size:clamp(23px,4vw,34px)}h2{margin:0;font-size:16px}.muted{color:var(--muted);line-height:1.55}.scope{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-top:16px}.scope label,label{display:grid;gap:7px;color:#dce2f3;font-size:12px;font-weight:700}.scope select,input:not([type=checkbox]),textarea,select{width:100%;padding:10px 11px;border:1px solid #485776;border-radius:9px;background:#0e1422;color:#f5f7fb}.panel{display:grid;gap:16px}.check{display:flex;align-items:center;gap:9px;padding:12px;border:1px solid var(--line);border-radius:10px;background:#ffffff05}.check input{width:18px;height:18px;accent-color:#9b8cff}.check span{margin-left:auto}.feedback{min-height:20px;margin:0;color:#9cf0cf;font-size:12px}.feedback.error{color:#ff9eaa}.actions,.scope-tabs{display:flex;gap:8px;flex-wrap:wrap}.scope-tabs{margin-top:12px}.scope-tabs button,button{padding:9px 12px;border:1px solid #7582a3;border-radius:9px;background:#ffffff0b;color:#f5f7fb;font-weight:700;cursor:pointer}.scope-tabs button[aria-pressed=true],.primary{border-color:#9b8cff;background:#8b7bff30}.responses{display:grid;gap:12px}.responses-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}.response-list{display:grid;gap:10px}.response-card{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:13px;border:1px solid var(--line);border-radius:10px;background:#ffffff05}.response-card .wide{grid-column:1/-1}.response-card button{grid-column:1/-1;justify-self:end}.panel[hidden],label[hidden]{display:none!important}button:disabled{opacity:.55;cursor:wait}@media(max-width:620px){body{padding:14px}.top{align-items:flex-start;flex-direction:column}.hero,.panel{padding:16px}.response-card{grid-template-columns:1fr}.response-card .wide{grid-column:auto}.responses-heading{align-items:flex-start;flex-direction:column}}
  </style></head><body><main class="page">
    <nav class="top"><a href="${backHref}">← Painel de administração</a><span>${escapeHtml(data.platform)} · ${escapeHtml(data.groupName)}</span></nav>
    <header class="hero"><small>PAINEL DEDICADO</small><h1>${escapeHtml(definitions.title)}</h1><p class="muted">${escapeHtml(definitions.description)}</p><nav class="scope" aria-label="Escopo da configuração">${scopeOptions}</nav></header>
    <form class="panel" id="automationForm"><h2 id="scopeLabel">Configuração do chat</h2>${enableField}${definitions.fields}<p id="feedback" class="feedback" role="status" aria-live="polite"></p><div class="actions">${definitions.configEndpoint ? '<button type="submit" class="primary">Salvar configurações</button>' : ""}<a href="/painel-agendamentos?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}">Abrir agendamentos</a></div></form>
  </main><script>
    const context=${context},setting=${JSON.stringify(setting)},supportedScopes=${JSON.stringify(scopes)};
    let requestedScope=${requestedScopeJson},activeScope=null,options={};
    try{if(typeof requestedScope==="string")requestedScope=JSON.parse(requestedScope)}catch{requestedScope=null}
    const form=document.getElementById("automationForm"),feedback=document.getElementById("feedback"),enabled=document.getElementById("enabled");
    const levelSelect=document.getElementById("scopeLevel"),categorySelect=document.getElementById("categorySelect"),channelSelect=document.getElementById("channelSelect");
    const api=async(path,body={})=>{const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...context,...body})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Não foi possível carregar as configurações.");return result};
    const showError=message=>{feedback.classList.add("error");feedback.textContent=message};
    function initialScope(){if(requestedScope&&supportedScopes.includes(requestedScope.level))return requestedScope;if(context.platform==="whatsapp")return{level:"chat"};if(context.platform==="discord")return supportedScopes.includes("server")?{level:"server"}:null;return{level:"server"}}
    function makeResponse(response={}){const card=document.createElement("article");card.className="response-card";if(response.id)card.dataset.id=response.id;const field=(label,name,value,type="text",wide=false)=>{const wrapper=document.createElement("label");if(wide)wrapper.className="wide";wrapper.textContent=label;let input;if(type==="textarea"){input=document.createElement("textarea");input.rows=3}else if(name==="action"){input=document.createElement("select");for(const [key,text]of [["reply","Responder com texto"],["react","Reagir com emoji"]])input.add(new Option(text,key));input.value=value||"reply"}else if(type==="select"){input=document.createElement("select");for(const [key,text]of [["exact","Mensagem exata"],["contains","Contém a frase"],["starts","Começa com"]])input.add(new Option(text,key));input.value=value||"exact"}else{input=document.createElement("input");input.type=type;input.value=value??""}input.name=name;wrapper.append(input);card.append(wrapper)};field("Gatilho","trigger",response.trigger||"");field("Correspondência","matchType",response.matchType||"exact","select");field("Ação","action",response.action||"reply","select");field("Intervalo (segundos)","cooldown",response.cooldown||5,"number");field("Texto ou emoji da resposta","content",response.content||"","textarea",true);const remove=document.createElement("button");remove.type="button";remove.textContent="Remover";remove.addEventListener("click",()=>card.remove());card.append(remove);return card}
    function renderResponses(responses){const list=document.getElementById("responseList");list.replaceChildren();if(!responses.length){const empty=document.createElement("p");empty.className="muted";empty.textContent="Nenhuma resposta local cadastrada.";list.append(empty);return}responses.forEach(item=>list.append(makeResponse(item)))}
    function selectedScope(){if(context.platform==="discord"){const level=levelSelect.value;if(level==="server")return{level};if(level==="categoria")return{level,categoryId:categorySelect.value};return{level,categoryId:categorySelect.value==="__none__"?"":categorySelect.value,channelId:channelSelect.value}}if(context.platform==="telegram"&&supportedScopes.includes("topic")&&document.getElementById("topicScope").getAttribute("aria-pressed")==="true")return{level:"topic",topicId:document.getElementById("topicSelect").value};return{level:context.platform==="whatsapp"?"chat":"server"}}
    function fillChannels(){const category=categorySelect.value==="__none__"?"":categorySelect.value;channelSelect.replaceChildren(new Option("Selecione um chat",""));for(const item of options.chatChannels||[])if(item.categoryId===category)channelSelect.add(new Option(item.name,item.id));channelSelect.disabled=!channelSelect.options.length||channelSelect.options.length===1}
    function updateScopeControls(shouldLoad=true){if(context.platform!=="discord")return;const level=levelSelect.value,categoryField=document.getElementById("categoryField"),channelField=document.getElementById("channelField");categoryField.hidden=level==="server";channelField.hidden=level!=="chat";if(level!=="server")fillChannels();if(shouldLoad)load()}
    async function load(){activeScope=selectedScope();const label=document.getElementById("scopeLabel");if(!activeScope||((activeScope.level==="chat")&&!activeScope.channelId)||((activeScope.level==="categoria")&&!activeScope.categoryId)||((activeScope.level==="topic")&&!activeScope.topicId)){label.textContent="Selecione um chat para carregar as configurações.";form.querySelectorAll("input,textarea,select,button").forEach(control=>control.disabled=true);if(enabled)enabled.disabled=true;return}
      form.querySelectorAll("input,textarea,select,button").forEach(control=>control.disabled=false);feedback.classList.remove("error");feedback.textContent="Carregando configurações...";try{const {settings}=await api("/api/account/local/admin-settings-state",{scope:activeScope});if(enabled){enabled.checked=settings[setting]===true;document.getElementById("enabledStatus").textContent=enabled.checked?"Ativado":"Desativado"}
        if(setting==="autodownload"){const {config}=await api("/api/account/local/admin-autodownload-state",{scope:activeScope});form.elements.deletelink.checked=config.deletelink===true}
        if(setting==="autoia"){const {config}=await api("/api/account/local/admin-autoia-state",{scope:activeScope});form.elements.mode.value=config.mode||"off"}
        if(setting==="autorepo"){const {config}=await api("/api/account/local/admin-autorepo-state",{scope:activeScope});form.elements.useGlobal.checked=config.useGlobal!==false;renderResponses(config.responses||[])}
        label.textContent="Escopo selecionado: "+(activeScope.level==="chat"?"Chat":activeScope.level==="categoria"?"Categoria":activeScope.level==="topic"?"Tópico":context.platform==="discord"?"Servidor":"Grupo");feedback.textContent=""
      }catch(error){showError(error.message)}}
    async function initialize(){try{options=await api("/api/account/local/admin-systems-options");if(context.platform==="discord"){for(const item of options.categories||[])categorySelect.add(new Option(item.name,item.id));if((options.chatChannels||[]).some(item=>!item.categoryId))categorySelect.add(new Option("Sem categoria","__none__"));levelSelect.addEventListener("change",updateScopeControls);categorySelect.addEventListener("change",()=>{fillChannels();load()});channelSelect.addEventListener("change",load);const initial=initialScope();if(initial){levelSelect.value=initial.level;if(initial.categoryId)categorySelect.value=initial.categoryId;else if(initial.level==="chat"&&(options.chatChannels||[]).some(item=>!item.categoryId))categorySelect.value="__none__";updateScopeControls(false);if(initial.channelId)channelSelect.value=initial.channelId;load()}else{levelSelect.value=supportedScopes[0]||"";updateScopeControls(false);load()}}
        else if(context.platform==="telegram"&&supportedScopes.includes("topic")){for(const topic of options.topics||[])document.getElementById("topicSelect").add(new Option(topic.name,topic.id));const group=document.getElementById("groupScope"),topic=document.getElementById("topicScope");group.addEventListener("click",()=>{group.setAttribute("aria-pressed","true");topic.setAttribute("aria-pressed","false");document.getElementById("topicField").hidden=true;load()});topic.addEventListener("click",()=>{group.setAttribute("aria-pressed","false");topic.setAttribute("aria-pressed","true");document.getElementById("topicField").hidden=false;load()});document.getElementById("topicSelect").addEventListener("change",load);if(initialScope()?.level==="topic"){topic.click();document.getElementById("topicSelect").value=requestedScope.topicId;await load()}else await load()}
        else{activeScope=initialScope();await load()}}
      catch(error){showError(error.message)}}
    if(enabled)enabled.addEventListener("change",async()=>{enabled.disabled=true;try{const result=await api("/api/account/local/admin-settings",{setting,enabled:enabled.checked,scope:activeScope});enabled.checked=result.settings[setting]===true;document.getElementById("enabledStatus").textContent=enabled.checked?"Ativado":"Desativado";feedback.classList.toggle("error",Boolean(result.announcementWarning));feedback.textContent=result.announcementWarning||result.message||"Configuração atualizada."}catch(error){showError(error.message);enabled.checked=!enabled.checked}finally{enabled.disabled=false}});
    document.getElementById("addResponse")?.addEventListener("click",()=>{const list=document.getElementById("responseList");list.querySelector(".muted")?.remove();const card=makeResponse();list.append(card);card.querySelector('[name="trigger"]').focus()});
    form.addEventListener("submit",async event=>{event.preventDefault();if(!activeScope)return;const button=form.querySelector('[type="submit"]');button.disabled=true;feedback.classList.remove("error");feedback.textContent="Salvando configurações...";try{let result;if(setting==="autodownload")result=await api("/api/account/local/admin-autodownload",{scope:activeScope,config:{deletelink:form.elements.deletelink.checked}});else if(setting==="autoia")result=await api("/api/account/local/admin-autoia",{scope:activeScope,config:{mode:form.elements.mode.value}});else if(setting==="autorepo"){const responses=[...document.querySelectorAll(".response-card")].map(card=>({id:card.dataset.id,trigger:card.querySelector('[name="trigger"]').value,matchType:card.querySelector('[name="matchType"]').value,action:card.querySelector('[name="action"]').value,cooldown:Number(card.querySelector('[name="cooldown"]').value),content:card.querySelector('[name="content"]').value}));result=await api("/api/account/local/admin-autorepo",{scope:activeScope,config:{useGlobal:form.elements.useGlobal.checked,responses}});renderResponses(result.config.responses||[])}feedback.classList.toggle("error",Boolean(result.announcementWarning));feedback.textContent=result.announcementWarning||"Configurações salvas."}catch(error){showError(error.message)}finally{button.disabled=false}});
    initialize();
  </script></body></html>`;
}

function renderRpSystemAdmin(data, setting) {
  if (!["xp", "activity"].includes(setting)) throw new Error("Sistema de grupo inválido.");
  const isXp = setting === "xp";
  const title = isXp ? "Sistema de XP" : "Registro de atividade";
  const platformLabel = data.platform === "discord" ? "Servidor" : "Grupo";
  const scope = { level: data.platform === "whatsapp" ? "chat" : "server" };
  const context = JSON.stringify({ platform: data.platform, groupId: data.groupId });
  const scopeJson = JSON.stringify(scope);
  const backHref = `/painel-admin?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}`;
  const xpSettings = isXp
    ? `<section class="panel"><h2>Mensagens de level-up</h2><label class="check"><input id="muted" type="checkbox"><span>Silenciar avisos de level-up</span></label><label><span id="destinationLabel">Destino das mensagens de level-up</span><select id="destination"><option value="">Onde o XP foi ganho</option></select><small id="destinationHint" class="muted">Deixe o destino padrão para avisar onde o XP foi ganho.</small></label><button type="button" class="primary" id="saveXp">Salvar configurações</button></section>`
    : "";
  const resetLabel = isXp ? "Resetar XP de todos" : "Resetar atividades de todos";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Painel · ${title}</title><style>
    :root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb;--line:#334366;--muted:#9da8bd}*{box-sizing:border-box}body{margin:0;padding:24px;background:radial-gradient(circle at top,#27365d 0,#10131c 48%,#090b10 100%)}button,input,select{font:inherit}.page{width:min(900px,100%);margin:0 auto}.top{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:8px 0 20px;border-bottom:1px solid var(--line)}a{color:#b9c6ff;text-decoration:none;font-weight:700}.hero,.panel{margin-top:20px;padding:22px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,#1c2438,#131925)}h1{margin:7px 0;font-size:clamp(23px,4vw,34px)}h2{margin:0;font-size:17px}.muted{color:var(--muted);line-height:1.55}.setting{display:flex;align-items:center;justify-content:space-between;gap:12px}.setting input,.check input{width:19px;height:19px;accent-color:#9b8cff}.setting label,.check{display:flex;align-items:center;gap:9px;font-weight:700}.panel{display:grid;gap:14px}.check{padding:12px;border:1px solid var(--line);border-radius:10px;background:#ffffff05}.check span{flex:1}label{display:grid;gap:7px;color:#dce2f3;font-size:12px;font-weight:700}input:not([type=checkbox]),select{width:100%;padding:10px 11px;border:1px solid #485776;border-radius:9px;background:#0e1422;color:#f5f7fb}.search{display:flex;gap:8px}.search input{flex:1}button{padding:9px 12px;border:1px solid #7582a3;border-radius:9px;background:#ffffff0b;color:#f5f7fb;font-weight:700;cursor:pointer}.primary{border-color:#9b8cff;background:#8b7bff30}.danger{border-color:#b65b6a66;color:#ffb3bd}.feedback{min-height:20px;margin:0;color:#9cf0cf;font-size:12px}.feedback.error{color:#ff9eaa}.user-list{display:grid;gap:10px}.user-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px 12px;padding:13px;border:1px solid var(--line);border-radius:11px;background:#ffffff05}.user-card small,.user-card p{grid-column:1/-1;margin:0;color:var(--muted);font-size:12px;overflow-wrap:anywhere}.user-card .value{align-self:center}.user-actions{display:flex;flex-wrap:wrap;gap:7px}.user-actions input{min-width:125px}.toolbar{display:flex;justify-content:space-between;align-items:center;gap:10px}.empty{padding:14px;border:1px dashed var(--line);border-radius:10px;color:var(--muted);text-align:center}@media(max-width:600px){body{padding:14px}.top{align-items:flex-start;flex-direction:column}.hero,.panel{padding:16px}.search,.toolbar{align-items:stretch;flex-direction:column}.user-card{grid-template-columns:1fr}.user-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}}
  </style></head><body><main class="page">
    <nav class="top"><a href="${backHref}">← Painel de administração</a><span>${platformLabel} · ${escapeHtml(data.groupName)}</span></nav>
    <header class="hero"><small>PAINEL DEDICADO</small><h1>${title}</h1><p class="muted">${isXp ? "Consulte e ajuste o XP dos membros e configure as mensagens de level-up." : "Consulte e remova registros de atividade dos membros."} As alterações se aplicam a este ${platformLabel.toLowerCase()}.</p><div class="setting"><label><input id="enabled" type="checkbox"> Ativar ${title.toLowerCase()}</label><span id="state" class="muted">Carregando...</span></div></header>
    ${xpSettings}
    <section class="panel"><div class="toolbar"><h2>${isXp ? "XP dos membros" : "Atividade dos membros"}</h2><button id="resetAll" class="danger" type="button">${resetLabel}</button></div><form id="searchForm" class="search"><input id="search" type="search" maxlength="100" autocomplete="off" placeholder="Buscar por nome, username ou ID" aria-label="Buscar membro"><button type="submit">Buscar</button></form><div id="users" class="user-list" aria-live="polite"></div><p id="feedback" class="feedback" role="status" aria-live="polite"></p></section>
  </main><script>
    const context=${context},scope=${scopeJson},setting=${JSON.stringify(setting)};
    const api=async(path,body={})=>{const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...context,...body})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Não foi possível carregar as configurações.");return result};
    const enabled=document.getElementById("enabled"),state=document.getElementById("state"),feedback=document.getElementById("feedback"),users=document.getElementById("users");
    const showError=message=>{feedback.classList.add("error");feedback.textContent=message};
    function renderUsers(items,total){users.replaceChildren();if(!items.length){const empty=document.createElement("p");empty.className="empty";empty.textContent="Nenhum registro encontrado.";users.append(empty);return}for(const user of items){const card=document.createElement("article");card.className="user-card";const name=document.createElement("strong");name.textContent=user.displayName||user.username||user.userId;const detail=document.createElement("small");detail.textContent=(user.username?(context.platform==="whatsapp"?"Nome salvo: ":"@")+user.username+" · ":"")+"ID: "+user.userId;const value=document.createElement("strong");value.className="value";value.textContent=setting==="xp"?(Number(user.value)||0)+" XP":(Number(user.value)||0)+" registros";const description=document.createElement("p");description.textContent=user.detail;card.append(name,value,detail,description);const actions=document.createElement("div");actions.className="user-actions";let amount=null;if(setting==="xp"){amount=document.createElement("input");amount.type="number";amount.min="0";amount.step="1";amount.placeholder="Quantidade de XP";amount.setAttribute("aria-label","Quantidade de XP para "+user.userId);actions.append(amount)}const addAction=(label,action)=>{const button=document.createElement("button");button.type="button";button.textContent=label;if(action==="reset")button.className="danger";button.addEventListener("click",()=>changeUser(button,user.userId,action,amount?.value));actions.append(button)};if(setting==="xp"){addAction("Definir","set");addAction("Adicionar","add");addAction("Retirar","subtract")}addAction(setting==="xp"?"Zerar XP":"Apagar registro","reset");card.append(actions);users.append(card)}if(total>items.length){const more=document.createElement("p");more.className="muted";more.textContent="Mostrando "+items.length+" de "+total+" registros. Refine a busca pelo nome ou ID.";users.append(more)}}
    async function loadUsers(query=""){feedback.classList.remove("error");feedback.textContent="Carregando registros...";try{const result=await api("/api/account/local/admin-rp-state",{scope,setting,query});renderUsers(result.users||[],result.total||0);feedback.textContent=(result.total||0)+" registro(s) encontrado(s)."}catch(error){showError(error.message)}}
    async function changeUser(button,userId,action,amount){if(action==="reset"&&!window.confirm("Confirma zerar/remover os dados deste usuário?"))return;button.disabled=true;feedback.classList.remove("error");feedback.textContent="Atualizando registro...";try{await api("/api/account/local/admin-rp-action",{scope,setting,userId,action,amount});await loadUsers(document.getElementById("search").value)}catch(error){showError(error.message)}finally{button.disabled=false}}
    enabled.addEventListener("change",async()=>{const desired=enabled.checked;enabled.disabled=true;try{const result=await api("/api/account/local/admin-settings",{scope,setting,enabled:desired});enabled.checked=result.settings[setting]===true;state.textContent=enabled.checked?"Ativado":"Desativado";feedback.classList.toggle("error",Boolean(result.announcementWarning));feedback.textContent=result.announcementWarning||result.message||"Configuração atualizada."}catch(error){showError(error.message);enabled.checked=!desired}finally{enabled.disabled=false}});
    document.getElementById("searchForm").addEventListener("submit",event=>{event.preventDefault();loadUsers(document.getElementById("search").value)});
    document.getElementById("resetAll").addEventListener("click",async event=>{if(!window.confirm("Esta ação é irreversível e vai resetar os dados de todos os membros neste escopo. Deseja continuar?"))return;const button=event.currentTarget;button.disabled=true;feedback.classList.remove("error");feedback.textContent="Resetando dados...";try{const result=await api("/api/account/local/admin-rp-action",{scope,setting,action:"resetAll"});await loadUsers(document.getElementById("search").value);feedback.textContent="Reset concluído para "+(Number(result.result?.resetCount)||0)+" registro(s)."}catch(error){showError(error.message)}finally{button.disabled=false}});
    if(setting==="xp"){const destination=document.getElementById("destination"),muted=document.getElementById("muted");document.getElementById("saveXp").addEventListener("click",async event=>{const button=event.currentTarget;button.disabled=true;feedback.classList.remove("error");feedback.textContent="Salvando configurações de XP...";try{const result=await api("/api/account/local/admin-xp",{scope,config:{muted:muted.checked,destination:destination.value}});feedback.classList.toggle("error",Boolean(result.announcementWarning));feedback.textContent=result.announcementWarning||"Configurações de XP salvas."}catch(error){showError(error.message)}finally{button.disabled=false}});api("/api/account/local/admin-xp-state",{scope}).then(({config,destinations})=>{muted.checked=config.muted;destination.replaceChildren(new Option(context.platform==="discord"?"Onde o XP foi ganho":"Tópico onde o XP foi ganho",""));for(const item of destinations||[])destination.add(new Option(item.name,item.id));destination.value=config.threadId||config.chatId||"";if(context.platform==="telegram"&&!(destinations||[]).length)document.getElementById("destinationHint").textContent="Nenhum tópico conhecido. Envie uma mensagem em cada tópico para que ele apareça nesta lista."}).catch(error=>showError(error.message))}
    api("/api/account/local/admin-settings-state",{scope}).then(({settings})=>{enabled.checked=settings[setting]===true;state.textContent=enabled.checked?"Ativado":"Desativado"}).catch(error=>{enabled.disabled=true;showError(error.message)});
    loadUsers();
  </script></body></html>`;
}

function renderWelcomeAdmin(data) {
  const context = JSON.stringify({ platform: data.platform, groupId: data.groupId });
  const groupType = data.platform === "discord" ? "Servidor" : "Grupo";
  const scopeNavigation = data.platform === "telegram"
    ? `<div class="scope-tabs"><button type="button" id="groupScope" aria-pressed="true">Grupo todo + chat principal</button><button type="button" id="topicsScope" aria-pressed="false">Tópicos</button></div><label id="topicField" hidden>Tópico<select id="topicSelect"><option value="">Selecione um tópico</option></select></label>`
    : `<p class="muted">${data.platform === "discord" ? "As duas configurações valem para o servidor; escolha abaixo o canal de destino." : "As configurações valem somente para este grupo."}</p>`;
  const destinationField = data.platform === "discord"
    ? `<label>Canal de destino<select id="destinationChannel" name="channelId" required><option value="">Carregando canais...</option></select><small class="muted">O bot enviará as mensagens de entrada ou saída neste canal.</small></label>`
    : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Boas-vindas e despedidas</title><style>
    :root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb;--line:#334366;--muted:#9da8bd}*{box-sizing:border-box}body{margin:0;padding:24px;background:radial-gradient(circle at top,#27365d 0,#10131c 48%,#090b10 100%)}button,input,textarea,select{font:inherit}.page{width:min(900px,100%);margin:0 auto}.top{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:8px 0 20px;border-bottom:1px solid var(--line)}a{color:#b9c6ff;text-decoration:none;font-weight:700}.hero,.panel{margin-top:20px;padding:22px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,#1c2438,#131925)}h1{margin:7px 0;font-size:clamp(23px,4vw,34px)}h2{margin:0 0 8px;font-size:18px}.muted{color:var(--muted);line-height:1.55}.tabs,.scope-tabs{display:flex;gap:8px;overflow-x:auto;margin-top:18px;padding-bottom:3px}.tabs button,.scope-tabs button{flex:none;padding:10px 15px;border-color:var(--line);border-radius:11px;color:#cbd2e2;white-space:nowrap}.tabs button[aria-selected="true"],.scope-tabs button[aria-pressed="true"]{border-color:#9b8cff;background:#8b7bff30;color:#fff}.panel{display:grid;gap:16px}.panel[hidden]{display:none}label{display:grid;gap:7px;color:#dce2f3;font-size:12px;font-weight:700}.setting{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px;border:1px solid var(--line);border-radius:11px;background:#ffffff05}.setting span{display:grid;gap:4px}.setting input{width:19px;height:19px;accent-color:#9b8cff}input:not([type=checkbox]),textarea,select{width:100%;padding:10px 11px;border:1px solid #485776;border-radius:9px;background:#0e1422;color:#f5f7fb}textarea{resize:vertical}button{padding:9px 12px;border:1px solid #7582a3;border-radius:9px;background:#ffffff0b;color:#f5f7fb;font-weight:700;cursor:pointer}button:hover{border-color:#9b8cff;background:#8b7bff20}button:disabled{opacity:.55;cursor:wait}.primary{border-color:#9b8cff;background:#8b7bff30}.feedback{min-height:20px;margin:0;color:#9cf0cf;font-size:12px}.feedback.error{color:#ff9eaa}.actions{display:flex;gap:8px;flex-wrap:wrap}.media{display:grid;gap:10px;padding:14px;border:1px solid var(--line);border-radius:12px;background:#ffffff05}.media p{margin:0;color:var(--muted);overflow-wrap:anywhere}.back{font-size:12px}@media(max-width:620px){body{padding:14px}.top{align-items:flex-start;flex-direction:column}.hero,.panel{padding:17px}}
  </style></head><body><main class="page">
    <nav class="top"><a class="back" href="/painel-admin?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}">← Painel de administração</a><span>${escapeHtml(groupType)} · ${escapeHtml(data.groupName)}</span></nav>
    <header class="hero"><small>CONFIGURAÇÕES LOCAIS</small><h1>Boas-vindas e despedidas</h1><p class="muted">Configure as mensagens enviadas quando alguém entra ou sai e ative ou desative cada função neste painel.</p>${scopeNavigation}</header>
    <nav class="tabs" role="tablist" aria-label="Tipo de mensagem"><button type="button" role="tab" aria-selected="true" data-setting="welcome">Boas-vindas</button><button type="button" role="tab" aria-selected="false" data-setting="goodbye">Despedidas</button></nav>
    <form id="welcomeForm" class="panel">
      <div><h2 id="formTitle">Mensagem de boas-vindas</h2><p id="scopeLabel" class="muted"></p></div>
      <label class="setting"><span><strong id="enabledLabel">Ativar boas-vindas</strong><small id="enabledStatus" class="muted">Carregando estado...</small></span><input id="enabled" type="checkbox" disabled></label>
      ${destinationField}
      <label>Formato da mensagem<select name="mode"><option value="texto">Somente texto</option><option value="media">Mídia com legenda</option></select></label>
      <label>Mensagem<textarea name="text" maxlength="2000" rows="5" required></textarea><small class="muted">Variáveis disponíveis: {user}, {mention}, {group}, {server}, {count} e {members}.</small></label>
      <section class="media"><strong>Mídia</strong><p id="mediaStatus">Nenhuma mídia configurada.</p><label>Enviar imagem ou vídeo (JPEG, PNG, WebP, GIF ou MP4; até 8 MB)<input type="file" name="mediaFile" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4"></label><div class="actions"><button type="button" id="uploadMedia">Enviar mídia</button><button type="button" id="removeMedia" hidden>Remover mídia</button></div></section>
      <p class="feedback" id="feedback" role="status" aria-live="polite"></p>
      <div class="actions"><button type="submit" class="primary">Salvar configurações</button></div>
    </form>
  </main><script>
    const context=${context};
    let requestedScope=null;try{requestedScope=JSON.parse(new URLSearchParams(location.search).get("scope")||"null")}catch{}
    let activeSetting="welcome",activeScope=requestedScope||{level:context.platform==="whatsapp"?"chat":"server"},isTopicScope=context.platform==="telegram"&&activeScope.level==="topic";
    const form=document.getElementById("welcomeForm"),feedback=document.getElementById("feedback"),mediaStatus=document.getElementById("mediaStatus"),enabled=document.getElementById("enabled"),enabledStatus=document.getElementById("enabledStatus");
    const destination=document.getElementById("destinationChannel"),topicSelect=document.getElementById("topicSelect");
    function showError(message){feedback.classList.add("error");feedback.textContent=message}
    async function api(path,body={}){const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({platform:context.platform,groupId:context.groupId,...body})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Não foi possível atualizar a configuração.");return result}
    function setMedia(media){mediaStatus.textContent=media?(media.fileName||"Mídia configurada")+" · "+(media.type||"arquivo"):"Nenhuma mídia configurada.";document.getElementById("removeMedia").hidden=!media}
    function scopeName(){if(context.platform==="telegram"&&isTopicScope)return "Tópico · "+(topicSelect.selectedOptions[0]?.textContent||"selecionado");return context.platform==="discord"?"Servidor inteiro":context.platform==="telegram"?"Grupo todo + chat principal":"Grupo"}
    async function loadConfig(){let loaded=false;feedback.classList.remove("error");feedback.textContent="Carregando configurações...";enabled.disabled=true;enabledStatus.textContent="Carregando estado...";form.querySelectorAll("input,textarea,select,button").forEach(control=>control.disabled=true);try{const [{config},{settings}]=await Promise.all([api("/api/account/local/admin-"+activeSetting+"-state",{scope:activeScope}),api("/api/account/local/admin-settings-state",{scope:activeScope})]);form.elements.mode.value=config.mode||"texto";form.elements.text.value=config.text||"";if(destination)destination.value=config.channelId||"";setMedia(config.media);document.getElementById("scopeLabel").textContent=scopeName();document.getElementById("enabledLabel").textContent=(activeSetting==="welcome"?"Ativar boas-vindas":"Ativar despedidas");enabled.checked=settings[activeSetting]===true;enabledStatus.textContent=enabled.checked?"Ativado":"Desativado";feedback.textContent="";loaded=true}catch(error){showError(error.message)}finally{form.querySelectorAll("input,textarea,select,button").forEach(control=>control.disabled=false);enabled.disabled=!loaded}}
    document.querySelectorAll("[data-setting]").forEach(button=>button.addEventListener("click",()=>{activeSetting=button.dataset.setting;document.querySelectorAll("[data-setting]").forEach(tab=>tab.setAttribute("aria-selected",String(tab===button)));document.getElementById("formTitle").textContent=activeSetting==="welcome"?"Mensagem de boas-vindas":"Mensagem de despedida";document.getElementById("enabledLabel").textContent=activeSetting==="welcome"?"Ativar boas-vindas":"Ativar despedidas";loadConfig()}));
    if(context.platform==="telegram"){const groupButton=document.getElementById("groupScope"),topicsButton=document.getElementById("topicsScope"),topicField=document.getElementById("topicField");topicsButton.addEventListener("click",()=>{isTopicScope=true;topicsButton.setAttribute("aria-pressed","true");groupButton.setAttribute("aria-pressed","false");topicField.hidden=false;if(topicSelect.value){activeScope={level:"topic",topicId:topicSelect.value};loadConfig()}else{feedback.textContent="Selecione um tópico para carregar as configurações."}});groupButton.addEventListener("click",()=>{isTopicScope=false;topicsButton.setAttribute("aria-pressed","false");groupButton.setAttribute("aria-pressed","true");topicField.hidden=true;activeScope={level:"server"};loadConfig()});topicSelect.addEventListener("change",()=>{if(topicSelect.value){activeScope={level:"topic",topicId:topicSelect.value};loadConfig()}})}
    enabled.addEventListener("change",async()=>{const desired=enabled.checked;enabled.disabled=true;feedback.classList.remove("error");feedback.textContent="Atualizando estado...";try{const result=await api("/api/account/local/admin-settings",{setting:activeSetting,scope:activeScope,enabled:desired});enabled.checked=result.settings[activeSetting]===true;enabledStatus.textContent=enabled.checked?"Ativado":"Desativado";feedback.classList.toggle("error",Boolean(result.announcementWarning));feedback.textContent=result.announcementWarning||"Estado atualizado."}catch(error){enabled.checked=!desired;showError(error.message)}finally{enabled.disabled=false}});
    document.getElementById("uploadMedia").addEventListener("click",async()=>{const file=form.elements.mediaFile.files?.[0];if(!file){showError("Selecione uma imagem ou vídeo antes de enviar.");return}if(file.size>8*1024*1024){showError("A mídia deve ter até 8 MB.");return}const button=document.getElementById("uploadMedia");button.disabled=true;feedback.classList.remove("error");feedback.textContent="Enviando mídia...";try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error("Não foi possível ler o arquivo selecionado."));reader.readAsDataURL(file)});const result=await api("/api/account/local/admin-"+activeSetting+"-media",{scope:activeScope,mimeType:file.type,data});setMedia(result.config.media);form.elements.mediaFile.value="";feedback.textContent="Mídia atualizada."}catch(error){showError(error.message)}finally{button.disabled=false}});
    document.getElementById("removeMedia").addEventListener("click",async()=>{if(!window.confirm("Remover a mídia configurada?"))return;const button=document.getElementById("removeMedia");button.disabled=true;feedback.classList.remove("error");feedback.textContent="Removendo mídia...";try{const result=await api("/api/account/local/admin-"+activeSetting+"-media",{scope:activeScope,remove:true});setMedia(result.config.media);feedback.textContent="Mídia removida."}catch(error){showError(error.message)}finally{button.disabled=false}});
    form.addEventListener("submit",async event=>{event.preventDefault();const button=form.querySelector('[type="submit"]');button.disabled=true;feedback.classList.remove("error");feedback.textContent="Salvando...";try{const config={mode:form.elements.mode.value,text:form.elements.text.value};if(destination)config.channelId=destination.value;const result=await api("/api/account/local/admin-"+activeSetting,{scope:activeScope,config});setMedia(result.config.media);feedback.textContent="Configurações salvas."}catch(error){showError(error.message)}finally{button.disabled=false}});
    async function initialize(){try{const options=await api("/api/account/local/admin-systems-options");if(destination){destination.innerHTML='<option value="">Selecione um canal</option>';for(const channel of options.chatChannels||[]){const option=document.createElement("option");option.value=channel.id;option.textContent=channel.name;destination.append(option)}}if(context.platform==="telegram"){topicSelect.innerHTML='<option value="">Selecione um tópico</option>';for(const topic of options.topics||[]){const option=document.createElement("option");option.value=topic.id;option.textContent=topic.name;topicSelect.append(option)}if(!options.isForum){document.getElementById("topicsScope").hidden=true;document.getElementById("topicField").hidden=true;isTopicScope=false;activeScope={level:"server"}}else if(isTopicScope){document.getElementById("topicsScope").setAttribute("aria-pressed","true");document.getElementById("groupScope").setAttribute("aria-pressed","false");document.getElementById("topicField").hidden=false;topicSelect.value=activeScope.topicId||""}}await loadConfig()}catch(error){showError(error.message)}}
    initialize();
  </script></body></html>`;
}

function renderSchedulesAdmin(data) {
  const context = JSON.stringify({ platform: data.platform, groupId: data.groupId });
  const scopeQuery = JSON.stringify(data.requestedScope || null);
  const groupType = data.platform === "discord" ? "Servidor" : "Grupo";
  const targetPicker = data.platform === "discord"
    ? `<div class="grid"><label>Categoria<select id="scheduleCategory"><option value="">Selecione uma categoria</option></select></label><label>Chat<select id="scheduleChannel" disabled><option value="">Selecione uma categoria primeiro</option></select></label></div>`
    : data.platform === "telegram"
      ? `<div class="scope-tabs"><button type="button" id="scheduleGroupScope" aria-pressed="true">Grupo todo + chat principal</button><button type="button" id="scheduleTopicScope" aria-pressed="false">Tópico</button></div><label id="scheduleTopicField" hidden>Tópico<select id="scheduleTopic"><option value="">Selecione um tópico</option></select></label>`
      : `<p class="muted">Os agendamentos serão enviados neste grupo.</p>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agendamentos</title><style>
    :root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb;--line:#334366;--muted:#9da8bd}*{box-sizing:border-box}body{margin:0;padding:24px;background:radial-gradient(circle at top,#27365d 0,#10131c 48%,#090b10 100%)}button,input,textarea,select{font:inherit}.page{width:min(1000px,100%);margin:0 auto}.top{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:8px 0 20px;border-bottom:1px solid var(--line)}a{color:#b9c6ff;text-decoration:none;font-weight:700}.hero,.panel{margin-top:20px;padding:22px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,#1c2438,#131925)}h1{margin:7px 0;font-size:clamp(23px,4vw,34px)}h2{margin:0 0 8px;font-size:18px}.muted{color:var(--muted);line-height:1.55}.tabs,.scope-tabs{display:flex;gap:8px;overflow-x:auto;margin-top:18px;padding-bottom:3px}.tabs button,.scope-tabs button{flex:none;padding:10px 15px;border-color:var(--line);border-radius:11px;color:#cbd2e2;white-space:nowrap}.tabs button[aria-selected="true"],.scope-tabs button[aria-pressed="true"]{border-color:#9b8cff;background:#8b7bff30;color:#fff}.panel{display:grid;gap:14px}.panel[hidden]{display:none}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}label{display:grid;gap:7px;color:#dce2f3;font-size:12px;font-weight:700}input:not([type=checkbox]),textarea,select{width:100%;padding:10px 11px;border:1px solid #485776;border-radius:9px;background:#0e1422;color:#f5f7fb}textarea{resize:vertical}button{padding:9px 12px;border:1px solid #7582a3;border-radius:9px;background:#ffffff0b;color:#f5f7fb;font-weight:700;cursor:pointer}button:hover{border-color:#9b8cff;background:#8b7bff20}button:disabled{opacity:.55;cursor:wait}.primary{border-color:#9b8cff;background:#8b7bff30}.feedback{min-height:20px;margin:0;color:#9cf0cf;font-size:12px}.feedback.error{color:#ff9eaa}.actions{display:flex;gap:8px;flex-wrap:wrap}.list{display:grid;gap:10px}.schedule-card,.media{display:grid;gap:8px;padding:14px;border:1px solid var(--line);border-radius:12px;background:#ffffff05}.schedule-card p,.media p{margin:0;color:var(--muted);font-size:12px;line-height:1.5;overflow-wrap:anywhere}.schedule-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.status{padding:4px 8px;border-radius:999px;font-size:10px;font-weight:800}.status.on{background:#58d6a320;color:#9cf0cf}.status.off{background:#f6c46a18;color:#ffd37f}.target{color:#b9c6ff!important;font-weight:700}.media{gap:10px}.form-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}@media(max-width:620px){body{padding:14px}.top{align-items:flex-start;flex-direction:column}.hero,.panel{padding:17px}.grid{grid-template-columns:1fr}}
  </style></head><body><main class="page">
    <nav class="top"><a href="/painel-admin?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}">← Painel de administração</a><span>${escapeHtml(groupType)} · ${escapeHtml(data.groupName)}</span></nav>
    <header class="hero"><small>CONFIGURAÇÕES LOCAIS</small><h1>Agendamentos</h1><p class="muted">Crie mensagens programadas e edite todos os agendamentos deste grupo ou servidor. Horários seguem o fuso local do computador que executa o bot.</p></header>
    <nav class="tabs" role="tablist" aria-label="Gerenciar agendamentos"><button type="button" role="tab" aria-selected="true" data-tab="edit">Editar agendamentos</button><button type="button" role="tab" aria-selected="false" data-tab="create">Criar agendamento</button></nav>
    <section class="panel" id="editPanel"><h2>Agendamentos existentes</h2><p class="muted">No Discord, cada item mostra o canal de destino; no Telegram, mostra o grupo ou tópico.</p><div id="scheduleList" class="list" aria-live="polite"></div></section>
    <form class="panel" id="scheduleForm" hidden>
      <div><h2 id="formTitle">Novo agendamento</h2><p class="muted" id="formTarget"></p></div>
      <div id="targetPicker">${targetPicker}</div>
      <input type="hidden" name="id">
      <div class="grid"><label>Nome<input name="name" type="text" maxlength="100" required></label><label>Gatilho<select name="triggerType"><option value="fixed">Horários fixos</option><option value="interval">Intervalo</option></select></label></div>
      <label id="fixedFields">Horários (HH:MM, separados por vírgula)<input name="times" type="text" placeholder="07:00, 12:00, 20:00"></label>
      <label id="intervalFields" hidden>Intervalo (por exemplo, 30m, 2h ou 1d2h)<input name="interval" type="text" placeholder="1h"></label>
      <div class="grid"><label>Repetição<select name="repeatMode"><option value="once">Uma vez</option><option value="daily">Diariamente</option><option value="weekly">Semanalmente</option><option value="monthly">Mensalmente</option></select></label><label id="monthDayField" hidden>Dia do mês<input name="monthDay" type="number" min="1" max="31"></label></div>
      <fieldset id="weekdaysField" hidden><legend>Dias da semana</legend><div class="grid">${[["0","Domingo"],["1","Segunda"],["2","Terça"],["3","Quarta"],["4","Quinta"],["5","Sexta"],["6","Sábado"]].map(([value,label])=>`<label><span><input type="checkbox" name="days" value="${value}"> ${label}</span></label>`).join("")}</div></fieldset>
      <label>Tipo de mensagem<select name="messageMode"><option value="text">Texto</option><option value="media">Mídia com legenda</option></select></label>
      <label>Texto / legenda<textarea name="text" maxlength="${data.platform === "discord" ? 2000 : 4000}" rows="4"></textarea></label>
      <section class="media"><strong>Mídia</strong><p id="mediaStatus">Nenhuma mídia configurada.</p><p>O upload é salvo imediatamente; os demais campos são salvos pelo botão abaixo.</p><label>Enviar imagem ou vídeo (JPEG, PNG, WebP, GIF ou MP4; até 8 MB)<input type="file" name="mediaFile" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4"></label><div class="actions"><button type="button" id="uploadMedia">Enviar mídia</button><button type="button" id="removeMedia" hidden>Remover mídia</button></div></section>
      <p class="feedback" id="formFeedback" role="status" aria-live="polite"></p><div class="form-actions"><button type="button" id="cancelForm">Voltar</button><button type="submit" class="primary">Salvar agendamento</button></div>
    </form>
  </main><script>
    const context=${context},requestedScope=${scopeQuery};
    const form=document.getElementById("scheduleForm"),list=document.getElementById("scheduleList"),feedback=document.getElementById("formFeedback");
    let activeItems=[],activeScope=null,activeMedia=null,isEditing=false,options={};
    async function api(path,body={}){const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({platform:context.platform,groupId:context.groupId,...body})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Não foi possível atualizar o agendamento.");return result}
    function showFeedback(message,error=false){feedback.textContent=message;feedback.classList.toggle("error",error)}
    function duration(ms){let n=Math.max(0,Number(ms)||0),out="";for(const [unit,size] of [["d",86400000],["h",3600000],["m",60000],["s",1000]]){const value=Math.floor(n/size);if(value){out+=value+unit;n-=value*size}}return out||"0s"}
    function scheduleTarget(scope){if(context.platform==="discord"){const channel=(options.chatChannels||[]).find(item=>item.id===scope.channelId);return channel?.name||"Canal desconhecido"}if(context.platform==="telegram"&&scope.level==="topic"){const topic=(options.topics||[]).find(item=>item.id===scope.topicId);return topic?.name||"Tópico "+scope.topicId}return context.platform==="telegram"?"Grupo todo + chat principal":"Grupo"}
    function buildScope(){if(context.platform==="whatsapp")return{level:"chat"};if(context.platform==="telegram"){if(document.getElementById("scheduleTopicScope").getAttribute("aria-pressed")==="true"){const topicId=document.getElementById("scheduleTopic").value;if(!topicId)throw new Error("Selecione um tópico.");return{level:"topic",topicId}}return{level:"server"}}const channelId=document.getElementById("scheduleChannel").value;if(!channelId)throw new Error("Selecione o chat de destino.");const channel=(options.chatChannels||[]).find(item=>item.id===channelId);return{level:"chat",categoryId:channel?.categoryId||"",channelId}}
    function switchTab(tab){document.querySelectorAll("[data-tab]").forEach(button=>button.setAttribute("aria-selected",String(button.dataset.tab===tab)));document.getElementById("editPanel").hidden=tab!=="edit";if(tab==="create"){isEditing=false;activeScope=null;setForm(null);document.getElementById("targetPicker").hidden=false}else{form.hidden=true;isEditing=false;activeScope=null}}
    function formatTrigger(item){return item.trigger.type==="fixed"?"Horários: "+item.trigger.times.join(", "):"Intervalo: "+duration(item.trigger.intervalMs)}
    function formatRepeat(item){if(item.repeat.mode==="once")return"Uma vez";if(item.repeat.mode==="daily")return"Diariamente";if(item.repeat.mode==="monthly")return"Mensal · dia "+item.repeat.monthDay;const days=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];return"Semanal · "+item.repeat.days.map(day=>days[day]).join(", ")}
    function renderList(){list.replaceChildren();if(!activeItems.length){const empty=document.createElement("p");empty.className="muted";empty.textContent="Nenhum agendamento encontrado.";list.append(empty);return}for(const item of activeItems){const card=document.createElement("article");card.className="schedule-card";const head=document.createElement("div");head.className="schedule-head";const name=document.createElement("strong");name.textContent=item.name||"Sem nome";const status=document.createElement("span");status.className="status "+(item.enabled?"on":"off");status.textContent=item.enabled?(item.state.done?"Concluído":"Ativo"):"Inativo";head.append(name,status);const target=document.createElement("p");target.className="target";target.textContent="Destino: "+item.targetName;const details=document.createElement("p");details.textContent=formatTrigger(item)+" · "+formatRepeat(item);const next=document.createElement("p");next.textContent=item.state.done?"Agendamento concluído.":"Próximo disparo: "+(item.state.nextFireAt?new Date(item.state.nextFireAt).toLocaleString("pt-BR"):"Não calculado")+" · Disparos: "+item.state.firedCount;const message=document.createElement("p");message.textContent=item.message.mode==="media"?"Mídia"+(item.message.media?" · "+(item.message.media.fileName||item.message.media.type):" pendente")+(item.message.text?" · "+item.message.text:""):(item.message.text||"Texto não configurado");const actions=document.createElement("div");actions.className="actions";for(const [label,action] of [["Editar","edit"],[item.enabled?"Desativar":"Ativar",item.enabled?"off":"on"],["Testar agora","test"],["Remover","delete"]]){const button=document.createElement("button");button.type="button";button.textContent=label;button.dataset.action=action;button.dataset.id=item.id;actions.append(button)}card.append(head,target,details,next,message,actions);list.append(card)}}
    async function loadList(){list.innerHTML='<p class="muted">Carregando agendamentos...</p>';try{const result=await api("/api/account/local/admin-schedules-overview");activeItems=result.schedules||[];renderList()}catch(error){list.replaceChildren();const message=document.createElement("p");message.className="feedback error";message.textContent=error.message;list.append(message)}}
    function setMedia(media){activeMedia=media||null;document.getElementById("mediaStatus").textContent=activeMedia?(activeMedia.fileName||"Mídia configurada")+" · "+(activeMedia.type||"arquivo"):"Nenhuma mídia configurada.";document.getElementById("removeMedia").hidden=!activeMedia}
    function updateVisibility(){const fixed=form.elements.triggerType.value==="fixed";document.getElementById("fixedFields").hidden=!fixed;document.getElementById("intervalFields").hidden=fixed;const repeat=form.elements.repeatMode.value;document.getElementById("weekdaysField").hidden=repeat!=="weekly";document.getElementById("monthDayField").hidden=repeat!=="monthly"}
    function setForm(item){form.reset();form.hidden=false;form.elements.id.value=item?.id||"";form.elements.name.value=item?.name||"";form.elements.triggerType.value=item?.trigger?.type||"fixed";form.elements.times.value=(item?.trigger?.times||["09:00"]).join(", ");form.elements.interval.value=duration(item?.trigger?.intervalMs||3600000);form.elements.repeatMode.value=item?.repeat?.mode||"daily";form.elements.monthDay.value=item?.repeat?.monthDay||"";form.elements.messageMode.value=item?.message?.mode||"text";form.elements.text.value=item?.message?.text||"";form.querySelectorAll('input[name="days"]').forEach(input=>input.checked=(item?.repeat?.days||[]).includes(Number(input.value)));if(!item&&requestedScope?.channelId){document.getElementById("scheduleCategory").value=requestedScope.categoryId||"__none__";document.getElementById("scheduleCategory").dispatchEvent(new Event("change"));document.getElementById("scheduleChannel").value=requestedScope.channelId}else if(!item&&context.platform==="telegram"&&requestedScope?.level==="topic"){document.getElementById("scheduleTopicScope").click();document.getElementById("scheduleTopic").value=requestedScope.topicId||""}setMedia(item?.message?.media||null);updateVisibility();document.getElementById("formTitle").textContent=item?"Editar agendamento":"Criar agendamento";document.getElementById("formTarget").textContent=item?"Destino: "+item.targetName:"Selecione o destino da mensagem.";document.getElementById("targetPicker").hidden=Boolean(item);showFeedback("");form.scrollIntoView({block:"start"})}
    function collectConfig(){const trigger=form.elements.triggerType.value==="fixed"?{type:"fixed",times:form.elements.times.value.split(/[\\s,;]+/).map(value=>value.trim()).filter(Boolean)}:{type:"interval",interval:form.elements.interval.value.trim()};const mode=form.elements.repeatMode.value,repeat={mode};if(mode==="weekly")repeat.days=[...form.querySelectorAll('input[name="days"]:checked')].map(input=>Number(input.value));if(mode==="monthly")repeat.monthDay=Number(form.elements.monthDay.value);return{name:form.elements.name.value,trigger,repeat,message:{mode:form.elements.messageMode.value,text:form.elements.text.value}}}
    async function uploadMedia(){const file=form.elements.mediaFile.files?.[0];if(!file){showFeedback("Selecione uma imagem ou vídeo.",true);return}if(file.size>8*1024*1024){showFeedback("A mídia deve ter até 8 MB.",true);return}const button=document.getElementById("uploadMedia");button.disabled=true;showFeedback("Enviando mídia...");try{let id=form.elements.id.value;if(!id){activeScope=buildScope();const result=await api("/api/account/local/admin-schedules",{scope:activeScope,action:"create",config:collectConfig()});id=result.schedule.id;form.elements.id.value=id;isEditing=true;document.getElementById("targetPicker").hidden=true}const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error("Não foi possível ler o arquivo."));reader.readAsDataURL(file)});const result=await api("/api/account/local/admin-schedules-media",{scope:activeScope,id,fileName:file.name,mimeType:file.type,data});setMedia(result.schedule.message.media);form.elements.mediaFile.value="";showFeedback("Mídia salva.");await loadList()}catch(error){showFeedback(error.message,true)}finally{button.disabled=false}}
    document.querySelectorAll("[data-tab]").forEach(button=>button.addEventListener("click",()=>switchTab(button.dataset.tab)));
    form.elements.triggerType.addEventListener("change",updateVisibility);form.elements.repeatMode.addEventListener("change",updateVisibility);
    document.getElementById("cancelForm").addEventListener("click",()=>{form.hidden=true;isEditing=false;switchTab("edit")});
    document.getElementById("uploadMedia").addEventListener("click",uploadMedia);
    document.getElementById("removeMedia").addEventListener("click",async()=>{if(!activeMedia||!form.elements.id.value)return;try{const result=await api("/api/account/local/admin-schedules",{scope:activeScope,action:"removeMedia",id:form.elements.id.value});setMedia(result.schedule.message.media);await loadList();showFeedback("Mídia removida.")}catch(error){showFeedback(error.message,true)}});
    form.addEventListener("submit",async event=>{event.preventDefault();const button=form.querySelector('[type="submit"]');button.disabled=true;showFeedback("Salvando agendamento...");try{if(!isEditing)activeScope=buildScope();const id=form.elements.id.value;const result=await api("/api/account/local/admin-schedules",{scope:activeScope,action:id?"update":"create",id,config:collectConfig()});form.elements.id.value=result.schedule.id;isEditing=true;document.getElementById("targetPicker").hidden=true;document.getElementById("formTarget").textContent="Destino: "+scheduleTarget(activeScope);setMedia(result.schedule.message.media);await loadList();showFeedback("Agendamento salvo.")}catch(error){showFeedback(error.message,true)}finally{button.disabled=false}});
    list.addEventListener("click",async event=>{const button=event.target.closest("[data-action]");if(!button)return;const item=activeItems.find(schedule=>schedule.id===button.dataset.id);if(!item)return;if(button.dataset.action==="edit"){activeScope=item.scope;switchTab("create");isEditing=true;setForm(item);return}const action=button.dataset.action;if(action==="delete"&&!confirm('Remover o agendamento "'+item.name+'"?'))return;if(action==="test"&&!confirm("Enviar agora uma mensagem de teste para "+item.targetName+"?"))return;button.disabled=true;try{await api("/api/account/local/admin-schedules",{scope:item.scope,action:action==="on"||action==="off"?"toggle":action,id:item.id,enabled:action==="on"});await loadList()}catch(error){window.alert(error.message)}finally{button.disabled=false}});
    async function initialize(){try{options=await api("/api/account/local/admin-systems-options");if(context.platform==="discord"){const category=document.getElementById("scheduleCategory"),channel=document.getElementById("scheduleChannel");const map=new Map();for(const item of options.chatChannels||[]){const key=item.categoryId||"__none__";if(!map.has(key))map.set(key,key==="__none__"?"Sem categoria":options.categories.find(cat=>cat.id===key)?.name||"Categoria")}for(const [id,name]of map)category.add(new Option(name,id));function fillChannels(categoryId){channel.innerHTML='<option value="">Selecione um chat</option>';const actualCategoryId=categoryId==="__none__"?"":categoryId;for(const item of options.chatChannels||[]){if(item.categoryId!==actualCategoryId)continue;channel.add(new Option(item.name,item.id))}channel.disabled=!(options.chatChannels||[]).some(item=>item.categoryId===actualCategoryId)}category.addEventListener("change",()=>fillChannels(category.value));if(requestedScope?.channelId){category.value=requestedScope.categoryId||"__none__";fillChannels(category.value);channel.value=requestedScope.channelId}}else if(context.platform==="telegram"){for(const topic of options.topics||[])document.getElementById("scheduleTopic").add(new Option(topic.name,topic.id));const topicsButton=document.getElementById("scheduleTopicScope"),groupButton=document.getElementById("scheduleGroupScope");topicsButton.addEventListener("click",()=>{topicsButton.setAttribute("aria-pressed","true");groupButton.setAttribute("aria-pressed","false");document.getElementById("scheduleTopicField").hidden=false});groupButton.addEventListener("click",()=>{topicsButton.setAttribute("aria-pressed","false");groupButton.setAttribute("aria-pressed","true");document.getElementById("scheduleTopicField").hidden=true});if(requestedScope?.level==="topic"){topicsButton.click();document.getElementById("scheduleTopic").value=requestedScope.topicId||""}if(!options.isForum)topicsButton.hidden=true}await loadList()}catch(error){list.innerHTML="";const message=document.createElement("p");message.className="feedback error";message.textContent=error.message;list.append(message)}}
    initialize();
  </script></body></html>`;
}

function renderMonitorsAdmin(data) {
  const context = JSON.stringify({ platform: data.platform, groupId: data.groupId });
  const scopeQuery = JSON.stringify(data.requestedScope || null);
  const groupType = data.platform === "discord" ? "Servidor" : "Grupo";
  const monitorDefinitions = [
    ["monitorStock","Monitor da bolsa"],
    ["monitorCafe","Monitor do café"],
    ["monitorWeather","Monitor do clima"],
    ["monitorRandomWeather","Previsão aleatória"]
  ];
  const scopePicker = data.platform === "discord"
    ? `<div class="grid"><label>Categoria<select id="categorySelect"><option value="">Selecione uma categoria</option></select></label><label>Chat<select id="channelSelect" disabled><option value="">Selecione uma categoria primeiro</option></select></label></div>`
    : data.platform === "telegram"
      ? `<div class="scope-tabs"><button type="button" id="groupScope" aria-pressed="true">Grupo todo + chat principal</button><button type="button" id="topicsScope" aria-pressed="false">Tópicos</button></div><label id="topicField" hidden>Tópico<select id="topicSelect"><option value="">Selecione um tópico</option></select></label>`
      : `<p class="muted">Os monitores serão configurados para este grupo.</p>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Monitores</title><style>
    :root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb;--line:#334366;--muted:#9da8bd}*{box-sizing:border-box}body{margin:0;padding:24px;background:radial-gradient(circle at top,#27365d 0,#10131c 48%,#090b10 100%)}button,input,textarea,select{font:inherit}.page{width:min(900px,100%);margin:0 auto}.top{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:8px 0 20px;border-bottom:1px solid var(--line)}a{color:#b9c6ff;text-decoration:none;font-weight:700}.hero,.panel{margin-top:20px;padding:22px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,#1c2438,#131925)}h1{margin:7px 0;font-size:clamp(23px,4vw,34px)}h2{margin:0 0 8px;font-size:18px}.muted{color:var(--muted);line-height:1.55}.grid,.tabs,.scope-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.tabs,.scope-tabs{display:flex;overflow-x:auto;margin-top:18px;padding-bottom:3px}.tabs button,.scope-tabs button{flex:none;padding:10px 15px;border-color:var(--line);border-radius:11px;color:#cbd2e2;white-space:nowrap}.tabs button[aria-selected="true"],.scope-tabs button[aria-pressed="true"]{border-color:#9b8cff;background:#8b7bff30;color:#fff}.panel{display:grid;gap:14px}.panel[hidden]{display:none}label{display:grid;gap:7px;color:#dce2f3;font-size:12px;font-weight:700}input:not([type=checkbox]),textarea,select{width:100%;padding:10px 11px;border:1px solid #485776;border-radius:9px;background:#0e1422;color:#f5f7fb}textarea{resize:vertical}button{padding:9px 12px;border:1px solid #7582a3;border-radius:9px;background:#ffffff0b;color:#f5f7fb;font-weight:700;cursor:pointer}button:hover{border-color:#9b8cff;background:#8b7bff20}button:disabled{opacity:.55;cursor:wait}.primary{border-color:#9b8cff;background:#8b7bff30}.feedback{min-height:20px;margin:0;color:#9cf0cf;font-size:12px}.feedback.error{color:#ff9eaa}.form-fields{display:grid;gap:12px}.form-fields>label>input,.form-fields textarea{width:100%;padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:#0e121b;color:#f5f7fb;font:inherit;font-size:12px}.check-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}.check-list label{display:flex;align-items:center;gap:8px;padding:9px;border:1px solid var(--line);border-radius:9px;background:#ffffff05;font-size:11px}.check-list input{accent-color:#9b8cff}.toggle{display:flex;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--line);border-radius:10px;background:#ffffff05}.toggle input{width:18px;height:18px;accent-color:#9b8cff}.actions{display:flex;gap:8px;flex-wrap:wrap}@media(max-width:620px){body{padding:14px}.top{align-items:flex-start;flex-direction:column}.hero,.panel{padding:17px}.grid{grid-template-columns:1fr}}
  </style></head><body><main class="page">
    <nav class="top"><a href="/painel-admin?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}">← Painel de administração</a><span>${escapeHtml(groupType)} · ${escapeHtml(data.groupName)}</span></nav>
    <header class="hero"><small>CONFIGURAÇÕES LOCAIS</small><h1>Monitores</h1><p class="muted">Escolha o grupo, tópico ou chat de destino e configure os monitores de bolsa, café e clima.</p>${scopePicker}</header>
    <nav class="tabs" role="tablist" aria-label="Monitor">${monitorDefinitions.map(([key,label],index)=>`<button type="button" role="tab" aria-selected="${index===0}" data-monitor="${key}">${label}</button>`).join("")}</nav>
    <form class="panel" id="monitorForm"><h2 id="monitorTitle">${monitorDefinitions[0][1]}</h2><p class="muted" id="scopeLabel"></p><label class="toggle"><input id="enabled" type="checkbox"><span><strong>Ativar monitor</strong><small>O monitor só será ativado se tiver uma configuração válida para o escopo.</small></span></label><div id="fields" class="form-fields"></div><p class="feedback" id="feedback" role="status" aria-live="polite"></p><div class="actions"><button type="submit" class="primary">Salvar configurações</button></div></form>
  </main><script>
    const context=${context},requestedScope=${scopeQuery},labels=${JSON.stringify(Object.fromEntries(monitorDefinitions))},assets=${JSON.stringify(MARKET_ASSETS.map(({symbol,label})=>({symbol,label})))};
    let activeSetting="monitorStock",activeScope=requestedScope||{level:context.platform==="whatsapp"?"chat":"server"},options={};
    const form=document.getElementById("monitorForm"),fields=document.getElementById("fields"),feedback=document.getElementById("feedback"),enabled=document.getElementById("enabled");
    async function api(path,body={}){const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({platform:context.platform,groupId:context.groupId,...body})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Não foi possível atualizar o monitor.");return result}
    function showError(message){feedback.classList.add("error");feedback.textContent=message}
    function addLabel(text,control,hint=""){const label=document.createElement("label");label.append(document.createTextNode(text),control);if(hint){const small=document.createElement("small");small.className="muted";small.textContent=hint;label.append(small)}fields.append(label)}
    function textarea(value,rows=4){const control=document.createElement("textarea");control.rows=rows;control.value=value;return control}
    function select(optionsList,value){const control=document.createElement("select");for(const [id,label]of optionsList)control.add(new Option(label,id));control.value=value;return control}
    function split(value){return value.split(/[\\r\\n,]+/).map(part=>part.trim()).filter(Boolean)}
    function scopeName(){if(activeScope.level==="topic")return"Tópico · "+(document.getElementById("topicSelect").selectedOptions[0]?.textContent||"selecionado");if(activeScope.level==="chat")return"Chat · "+(document.getElementById("channelSelect").selectedOptions[0]?.textContent||"selecionado");return context.platform==="discord"?"Servidor":"Grupo todo + chat principal"}
    function render(config){fields.replaceChildren();const times=Array.isArray(config.times)&&config.times.length?config.times:["09:00"];if(activeSetting==="monitorStock"){const symbols=Array.isArray(config.symbols)?config.symbols:[],all=symbols.length===0;const allLabel=document.createElement("label"),allInput=document.createElement("input");allInput.type="checkbox";allInput.checked=all;allLabel.append(allInput,document.createTextNode(" Acompanhar todos os ativos"));fields.append(allLabel);const list=document.createElement("div");list.className="check-list";for(const asset of assets){const label=document.createElement("label"),input=document.createElement("input");input.type="checkbox";input.name="symbols";input.value=asset.symbol;input.checked=all||symbols.includes(asset.symbol);input.disabled=all;label.append(input,document.createTextNode(asset.label));list.append(label)}allInput.addEventListener("change",()=>list.querySelectorAll("input").forEach(input=>{input.disabled=allInput.checked;input.checked=allInput.checked}));fields.append(list);addLabel("Horários diários (HH:MM, separados por vírgula)",textarea(times.join(", "),2),"O padrão é 09:00.")}else if(activeSetting==="monitorCafe"){addLabel("Modo",select([["loop","Envio nos horários"],["monitor","Alertar quando o preço mudar"],["both","Horários e alertas de mudança"]],config.mode||"both"));const list=document.createElement("div");list.className="check-list";const sources=new Set(Array.isArray(config.sources)?config.sources:[]);for(const source of ["Minasul","Coocafe","CCCMG"]){const label=document.createElement("label"),input=document.createElement("input");input.type="checkbox";input.name="source";input.value=source;input.checked=sources.has(source);label.append(input,document.createTextNode(source));list.append(label)}fields.append(list);addLabel("Horários diários (HH:MM, separados por vírgula)",textarea(times.join(", "),2),"Usados nos modos de envio por horário.")}else if(activeSetting==="monitorWeather"){const city=document.createElement("input");city.type="text";city.value=config.city||"";addLabel("Cidade",city,"Exemplo: São Paulo, SP. Máximo de 120 caracteres.");addLabel("Horários diários (HH:MM, separados por vírgula)",textarea(times.join(", "),2))}else{addLabel("Cidades (uma por linha)",textarea((Array.isArray(config.cities)?config.cities:[]).join("\\n"),6),"O monitor escolhe aleatoriamente entre as cidades cadastradas.");addLabel("Horários diários (HH:MM, separados por vírgula)",textarea(times.join(", "),2))}enabled.checked=config.enabled===true;document.getElementById("scopeLabel").textContent=scopeName()}
    function collect(){const textareas=fields.querySelectorAll("textarea");if(activeSetting==="monitorStock"){const all=fields.querySelector('label input[type=checkbox]')?.checked;const symbols=all?[]:[...fields.querySelectorAll('input[name="symbols"]:checked')].map(input=>input.value);if(!all&&!symbols.length)throw new Error("Selecione pelo menos um ativo ou marque todos.");return{symbols,times:split(textareas[0].value)}}if(activeSetting==="monitorCafe")return{mode:fields.querySelector("select").value,sources:[...fields.querySelectorAll('input[name="source"]:checked')].map(input=>input.value),times:split(textareas[0].value)};if(activeSetting==="monitorWeather")return{city:fields.querySelector("input").value.trim(),times:split(textareas[0].value)};return{cities:split(textareas[0].value),times:split(textareas[1].value)}}
    async function load(){if(!activeScope){feedback.textContent="Selecione um chat para carregar os monitores.";return}feedback.classList.remove("error");feedback.textContent="Carregando configurações...";form.querySelectorAll("input,textarea,select,button").forEach(control=>control.disabled=true);try{const {config}=await api("/api/account/local/admin-monitor-state",{setting:activeSetting,scope:activeScope});render(config);feedback.textContent=""}catch(error){showError(error.message)}finally{form.querySelectorAll("input,textarea,select,button").forEach(control=>control.disabled=false)}}
    document.querySelectorAll("[data-monitor]").forEach(button=>button.addEventListener("click",()=>{activeSetting=button.dataset.monitor;document.querySelectorAll("[data-monitor]").forEach(tab=>tab.setAttribute("aria-selected",String(tab===button)));document.getElementById("monitorTitle").textContent=labels[activeSetting];load()}));
    form.addEventListener("submit",async event=>{event.preventDefault();const button=form.querySelector('[type="submit"]'),desiredEnabled=enabled.checked;button.disabled=true;feedback.classList.remove("error");feedback.textContent="Salvando configurações...";try{const result=await api("/api/account/local/admin-monitor",{setting:activeSetting,scope:activeScope,config:collect()});await api("/api/account/local/admin-settings",{setting:activeSetting,scope:activeScope,enabled:desiredEnabled});render(result.config);enabled.checked=desiredEnabled;feedback.textContent=result.announcementWarning||"Configurações do monitor salvas."}catch(error){showError(error.message)}finally{button.disabled=false}});
    async function initialize(){try{options=await api("/api/account/local/admin-systems-options");let canLoad=true;if(context.platform==="discord"){const categories=document.getElementById("categorySelect"),channels=document.getElementById("channelSelect"),hasUncategorized=(options.chatChannels||[]).some(item=>!item.categoryId);for(const category of options.categories||[])categories.add(new Option(category.name,category.id));if(hasUncategorized)categories.add(new Option("Sem categoria","__none__"));function fillChannels(categoryId){channels.innerHTML='<option value="">Selecione um chat</option>';const actualId=categoryId==="__none__"?"":categoryId;const items=(options.chatChannels||[]).filter(item=>item.categoryId===actualId);for(const item of items)channels.add(new Option(item.name,item.id));channels.disabled=!items.length}categories.addEventListener("change",()=>fillChannels(categories.value));if(requestedScope?.channelId){categories.value=requestedScope.categoryId||"__none__";fillChannels(categories.value);channels.value=requestedScope.channelId;activeScope=requestedScope}else{activeScope=null;canLoad=false;form.querySelectorAll("input,textarea,select,button").forEach(control=>control.disabled=true);feedback.textContent="Selecione uma categoria e um chat para carregar os monitores."}channels.addEventListener("change",()=>{if(channels.value){activeScope={level:"chat",categoryId:categories.value==="__none__"?"":categories.value,channelId:channels.value};load()}})}else if(context.platform==="telegram"){const topics=document.getElementById("topicSelect"),group=document.getElementById("groupScope"),topicButton=document.getElementById("topicsScope");for(const topic of options.topics||[])topics.add(new Option(topic.name,topic.id));group.addEventListener("click",()=>{activeScope={level:"server"};group.setAttribute("aria-pressed","true");topicButton.setAttribute("aria-pressed","false");document.getElementById("topicField").hidden=true;load()});topicButton.addEventListener("click",()=>{topicButton.setAttribute("aria-pressed","true");group.setAttribute("aria-pressed","false");document.getElementById("topicField").hidden=false;if(topics.value){activeScope={level:"topic",topicId:topics.value};load()}});topics.addEventListener("change",()=>{if(topics.value){activeScope={level:"topic",topicId:topics.value};load()}});if(requestedScope?.level==="topic"){activeScope=requestedScope;topicButton.click();topics.value=requestedScope.topicId||""}if(!options.isForum)topicButton.hidden=true}else activeScope={level:"chat"};if(canLoad)await load()}catch(error){showError(error.message)}}
    initialize();
  </script></body></html>`;
}

function renderEconomyAdmin(data) {
  const context = JSON.stringify({ platform: data.platform, groupId: data.groupId });
  const rarityData = JSON.stringify(economy.LOCAL_SIGNAL_RARITIES.map(value => ({
    key: value,
    label: ({ comum: "Comum", incomum: "Incomum", raro: "Raro", epico: "Épico", lendario: "Lendário" })[value] || value
  })));
  const groupType = data.platform === "discord" ? "Servidor" : "Grupo";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Configurações da economia</title><style>
    :root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb;--line:#334366;--muted:#9da8bd}*{box-sizing:border-box}body{margin:0;padding:24px;background:radial-gradient(circle at top,#27365d 0,#10131c 48%,#090b10 100%)}button,input,textarea,select{font:inherit}.page{width:min(1000px,100%);margin:0 auto}.top{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:8px 0 20px;border-bottom:1px solid var(--line)}a{color:#b9c6ff;text-decoration:none;font-weight:700}.hero,.panel{margin-top:20px;padding:22px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,#1c2438,#131925)}h1{margin:7px 0;font-size:clamp(23px,4vw,34px)}h2{margin:0 0 8px;font-size:18px}h3{margin:0 0 8px;font-size:15px}.muted{color:var(--muted);line-height:1.55}.tabs{display:flex;gap:8px;overflow-x:auto;margin-top:18px;padding-bottom:3px}.tabs button{flex:none;padding:10px 15px;border-color:var(--line);border-radius:11px;color:#cbd2e2;white-space:nowrap}.tabs button[aria-selected="true"]{border-color:#9b8cff;background:#8b7bff30;color:#fff}.panel[hidden],.tier[hidden]{display:none}.setting{display:flex;justify-content:space-between;align-items:center;gap:18px;padding:14px;border:1px solid var(--line);border-radius:12px;background:#ffffff05}.setting label{display:flex;align-items:center;gap:10px;font-weight:700}.setting input[type=checkbox]{width:19px;height:19px;accent-color:#9b8cff}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}label{display:grid;gap:6px;color:#dce2f3;font-size:12px;font-weight:700}input:not([type=checkbox]),textarea,select{width:100%;padding:10px 11px;border:1px solid #485776;border-radius:9px;background:#0e1422;color:#f5f7fb}textarea{resize:vertical}button{padding:9px 12px;border:1px solid #7582a3;border-radius:9px;background:#ffffff0b;color:#f5f7fb;font-weight:700;cursor:pointer}button:hover{border-color:#9b8cff;background:#8b7bff20}button:disabled{opacity:.55;cursor:wait}.primary{border-color:#9b8cff;background:#8b7bff30}.danger{border-color:#b65c69;color:#ffb1ba}.feedback{min-height:20px;margin:12px 0 0;color:#9cf0cf;font-size:12px}.feedback.error{color:#ff9eaa}.list{display:grid;gap:9px;margin-top:12px}.row{padding:13px;border:1px solid var(--line);border-radius:11px;background:#ffffff05}.row p{margin:5px 0;color:var(--muted);font-size:12px}.actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.tier{margin:12px 0;padding:14px;border:1px solid var(--line);border-radius:12px}.tier legend{padding:0 7px;color:#b9c6ff;font-weight:800}.checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px}.check{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #334366;border-radius:8px;color:#dce2f3;font-weight:400}.check input{accent-color:#9b8cff}.prize-group{margin-top:12px}.prize-group strong{font-size:12px}.empty{color:var(--muted);font-size:12px}.balance-actions{display:grid;grid-template-columns:minmax(0,1fr) repeat(3,auto);gap:8px;margin-top:10px}.balance-actions input{min-width:0}.balance-search{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:14px}@media(max-width:620px){body{padding:14px}.grid,.checks{grid-template-columns:1fr}.setting{align-items:flex-start;flex-direction:column}.top{align-items:flex-start}.balance-actions{grid-template-columns:1fr 1fr}.balance-actions input{grid-column:1/-1}.balance-search{grid-template-columns:1fr}}
  </style></head><body><main class="page">
    <nav class="top"><a href="/painel-admin?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}">← Painel de administração</a><span>${escapeHtml(groupType)} · ${escapeHtml(data.groupName)}</span></nav>
    <header class="hero"><small>CONFIGURAÇÕES LOCAIS</small><h1>Economia</h1><p class="muted">Escolha uma função para gerenciar. Cada seção é exibida separadamente para facilitar a configuração.</p></header>
    <nav class="tabs" role="tablist" aria-label="Funções da economia">
      <button type="button" role="tab" aria-selected="true" aria-controls="vaultPanel" data-economy-tab="vault">Cofre</button>
      <button type="button" role="tab" aria-selected="false" aria-controls="storePanel" data-economy-tab="store">Loja Local</button>
      <button type="button" role="tab" aria-selected="false" aria-controls="signalPanel" data-economy-tab="signal">Busca de Sinais</button>
      <button type="button" role="tab" aria-selected="false" aria-controls="balancesPanel" data-economy-tab="balances">Editar saldo</button>
    </nav>
    <section id="vaultPanel" class="panel" role="tabpanel"><h2>Configurações do cofre</h2>
      <p class="muted">As regras abaixo são compartilhadas por todos os membros deste grupo/servidor; os saldos e impostos são individuais. Imposto progressivo é acumulado por hora completa após a primeira hora, proporcional à taxa configurada para 24 horas.</p>
      <div class="setting"><label><input id="includeVault" type="checkbox"> Considerar cofre no ranking de riqueza</label><span id="rankStatus" class="muted">Carregando...</span></div><p id="rankFeedback" class="feedback" role="status"></p>
      <form id="vaultConfigForm" class="grid" style="margin-top:16px">
        <label>Modo do cofre<select name="mode"><option value="secure">Impenetrável — saldo seguro</option><option value="tax">Imposto progressivo</option><option value="robbery">Roubo permitido</option></select></label>
        <label>Movimentação mínima em SatCoins<input name="minimumMovement" inputmode="decimal" required></label>
        <label>Tipo de imposto<select name="taxType"><option value="percent">Percentual por período</option><option value="fixed">Valor fixo por período</option></select></label>
        <label id="vaultTaxValueLabel">Taxa do imposto<input name="taxValue" inputmode="decimal" required></label>
        <label>Chance de o roubo atingir o cofre (%)<input name="robberyVaultChance" type="number" min="0" max="100" step="1" required><small class="muted">A chance restante será aplicada à carteira.</small></label>
        <div><button class="primary" type="submit">Salvar configurações do cofre</button></div>
      </form><p id="vaultConfigFeedback" class="feedback" role="status"></p>
      <p class="muted">Cada pessoa pode fazer um depósito e um saque por dia local. Alterar as regras não altera a data da última movimentação de nenhum membro.</p>
    </section>
    <section id="storePanel" class="panel" role="tabpanel" hidden><h2>Loja Local</h2><p class="muted">Gerencie itens do catálogo e pedidos do Mercado Local.</p>
      <nav class="tabs" role="tablist" aria-label="Gerenciamento da Loja Local">
        <button type="button" role="tab" id="storeCreateTab" aria-selected="true" aria-controls="storeCreatePanel" data-store-tab="create">Criar novos itens</button>
        <button type="button" role="tab" id="storeEditTab" aria-selected="false" aria-controls="storeEditPanel" data-store-tab="edit">Editar itens existentes</button>
        <button type="button" role="tab" id="storeOrdersTab" aria-selected="false" aria-controls="storeOrdersPanel" data-store-tab="orders">Gerenciar pedidos</button>
      </nav>
      <section id="storeCreatePanel" class="panel" role="tabpanel" aria-labelledby="storeCreateTab">
        <h3>Informações da loja local</h3><form id="storeDetails" class="grid"><label>Título<input name="title" maxlength="120" required></label><label>Aviso<textarea name="notice" maxlength="1000" rows="2" required></textarea></label><div><button class="primary" type="submit">Salvar título e aviso</button></div></form>
        <h3 style="margin-top:20px">Novo item</h3><form id="storeItemCreate" class="grid">
          <label>Nome<input name="name" maxlength="120" required></label><label>Categoria<input name="category" maxlength="80" required></label>
          <label>Preço em SatCoins<input name="price" inputmode="decimal" placeholder="0,00" required></label><label>Quantidade<input name="quantity" placeholder="∞ para infinito" required></label>
          <label>Raridade<select name="rarity"><option value="">Sem raridade</option><option value="comum">Comum</option><option value="incomum">Incomum</option><option value="raro">Raro</option><option value="epico">Épico</option><option value="lendario">Lendário</option></select></label>
          <div class="actions"><button class="primary" type="submit">Criar item</button></div>
        </form>
      </section>
      <section id="storeEditPanel" class="panel" role="tabpanel" aria-labelledby="storeEditTab" hidden>
        <h3>Itens cadastrados</h3><div id="storeItems" class="list"></div>
        <form id="storeItemEdit" class="grid" hidden>
          <input type="hidden" name="id"><label>Nome<input name="name" maxlength="120" required></label><label>Categoria<input name="category" maxlength="80" required></label>
          <label>Preço em SatCoins<input name="price" inputmode="decimal" placeholder="0,00" required></label><label>Quantidade<input name="quantity" placeholder="∞ para infinito" required></label>
          <label>Raridade<select name="rarity"><option value="">Sem raridade</option><option value="comum">Comum</option><option value="incomum">Incomum</option><option value="raro">Raro</option><option value="epico">Épico</option><option value="lendario">Lendário</option></select></label>
          <div class="actions"><button id="saveStoreItem" class="primary" type="submit">Salvar item</button><button id="cancelStoreEdit" type="button">Cancelar edição</button></div>
        </form>
      </section>
      <section id="storeOrdersPanel" class="panel" role="tabpanel" aria-labelledby="storeOrdersTab" hidden>
        <h3>Pedidos pendentes</h3><div id="storeOrders" class="list"></div>
      </section>
      <p id="storeFeedback" class="feedback" role="status"></p>
    </section>
    <section id="signalPanel" class="panel" role="tabpanel" hidden><h2>Busca de Sinais Local</h2><p class="muted">Configure preço, chances, garantias e os prêmios possíveis de cada raridade. As chances devem totalizar 100%.</p>
      <form id="signalForm" novalidate><label class="setting"><span><strong>Ativar Busca Local</strong><small class="muted">Disponibiliza a busca local no painel de Busca de Sinais.</small></span><input name="enabled" type="checkbox"></label>
        <label style="margin-top:12px">Preço por busca em SatCoins<input name="price" inputmode="decimal" required></label>
        <nav id="signalRarityTabs" class="tabs" role="tablist" aria-label="Raridade da Busca Local"></nav><div id="signalTiers"></div>
        <label style="margin-top:14px">Destaques (até 2)<select id="signalFeatured" multiple size="6"></select><small class="muted">Use Ctrl ou Cmd para selecionar mais de um.</small></label>
        <div class="actions"><button class="primary" type="submit">Salvar Busca Local</button></div>
      </form><p id="signalFeedback" class="feedback" role="status"></p>
      <style>
        .signal-save-dialog{width:min(440px,calc(100% - 28px));padding:0;border:1px solid #7582a3;border-radius:16px;background:#171d2b;color:#f5f7fb;box-shadow:0 24px 80px #000b}
        .signal-save-dialog::backdrop{background:#05070bcc;backdrop-filter:blur(4px)}
        .signal-save-dialog-content{padding:22px}
        .signal-save-dialog h3{margin:0 0 10px}
        .signal-save-dialog p{margin:0 0 18px;color:#cbd2e2;line-height:1.55;overflow-wrap:anywhere}
        .signal-save-dialog.error{border-color:#b65c69}
        .signal-save-dialog.error h3{color:#ff9eaa}
        .signal-save-dialog.success{border-color:#58bd91}
        .signal-save-dialog.success h3{color:#9cf0cf}
        .signal-save-dialog button{display:block;margin-left:auto}
      </style>
      <dialog id="signalSaveDialog" class="signal-save-dialog" aria-labelledby="signalSaveTitle" aria-describedby="signalSaveMessage">
        <div class="signal-save-dialog-content"><h3 id="signalSaveTitle"></h3><p id="signalSaveMessage"></p><button type="button" id="closeSignalSaveDialog">Fechar</button></div>
      </dialog>
    </section>
    <section id="balancesPanel" class="panel" role="tabpanel" hidden><h2>Editar saldo dos membros</h2><p class="muted">Pesquise por nome, usuário ou ID. As ações alteram somente o saldo da carteira; o cofre permanece separado. Para cada membro, informe um valor e escolha definir, adicionar ou retirar.</p>
      <form id="balanceSearchForm" class="balance-search"><input name="query" type="search" maxlength="100" autocomplete="off" placeholder="Nome, usuário ou ID do membro"><button class="primary" type="submit">Buscar</button></form>
      <div id="balanceUsers" class="list" aria-live="polite"></div><p id="balanceFeedback" class="feedback" role="status" aria-live="polite"></p>
    </section>
  </main><script>
    const context=${context},rarities=${rarityData};
    const money=value=>(Number(value||0)/100).toFixed(2);
    const formatMoney=value=>money(value).replace(/\\B(?=(\\d{3})+(?!\\d))/g," ")+"💷";
    async function api(path,payload={}){
      const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...context,...payload})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Não foi possível salvar as configurações.");return result;
    }
    function show(id,message,error=false){const node=document.getElementById(id);node.textContent=message;node.classList.toggle("error",error)}
    function showSignalSaveResult(title,message,error=false){
      const dialog=document.getElementById("signalSaveDialog");
      dialog.classList.toggle("error",error);dialog.classList.toggle("success",!error);
      document.getElementById("signalSaveTitle").textContent=title;
      document.getElementById("signalSaveMessage").textContent=message;
      if(!dialog.open)dialog.showModal();
    }
    document.getElementById("closeSignalSaveDialog").addEventListener("click",()=>document.getElementById("signalSaveDialog").close());
    document.getElementById("signalSaveDialog").addEventListener("click",event=>{if(event.target===event.currentTarget)event.currentTarget.close()});
    let balancesLoaded=false,balanceQuery="";
    const balanceScope={level:context.platform==="whatsapp"?"chat":"server"};
    async function loadBalanceUsers(query=balanceQuery){
      balanceQuery=query;show("balanceFeedback","Carregando membros...");
      try{
        const result=await api("/api/account/local/admin-rp-state",{scope:balanceScope,setting:"economy",query});
        balancesLoaded=true;renderBalanceUsers(result.users,result.total);
        show("balanceFeedback",result.total+" membro(s) encontrado(s).");
      }catch(error){show("balanceFeedback",error.message,true)}
    }
    function renderBalanceUsers(users,total){
      const container=document.getElementById("balanceUsers");container.replaceChildren();
      if(!users.length){const empty=document.createElement("p");empty.className="empty";empty.textContent="Nenhuma conta de economia encontrada. Pesquise pelo nome, usuário ou ID.";container.append(empty);return}
      for(const user of users){
        const card=document.createElement("article"),name=document.createElement("strong"),identity=document.createElement("p"),detail=document.createElement("p"),controls=document.createElement("div"),amount=document.createElement("input");
        card.className="row";name.textContent=user.displayName||user.username||user.userId;identity.textContent=(user.username?"@"+user.username+" · ":"")+"ID: "+user.userId;identity.className="muted";detail.textContent=user.detail;
        controls.className="balance-actions";amount.type="text";amount.inputMode="decimal";amount.placeholder="Valor em SatCoins";amount.autocomplete="off";amount.setAttribute("aria-label","Valor em SatCoins para "+name.textContent);
        controls.append(amount);
        for(const [action,label] of [["set","Definir carteira"],["add","Adicionar"],["subtract","Retirar"]]){
          const button=document.createElement("button");button.type="button";button.textContent=label;
          button.addEventListener("click",async()=>{
            const value=amount.value.trim();
            if(!/^\\d+(?:[.,]\\d{1,2})?$/.test(value)){show("balanceFeedback","Informe um valor válido com até duas casas decimais.",true);amount.focus();return}
            if(action==="subtract"&&!window.confirm("Retirar "+value+" SatCoins da carteira de "+(user.displayName||user.userId)+"?"))return;
            button.disabled=true;show("balanceFeedback","Atualizando carteira...");
            try{
              await api("/api/account/local/admin-rp-action",{scope:balanceScope,setting:"economy",userId:user.userId,action,amount:value});
              await loadBalanceUsers();
              if(!document.getElementById("balanceFeedback").classList.contains("error"))show("balanceFeedback","Carteira de "+(user.displayName||user.userId)+" atualizada.");
            }catch(error){show("balanceFeedback",error.message,true)}
            finally{button.disabled=false}
          });
          controls.append(button);
        }
        card.append(name,identity,detail,controls);container.append(card);
      }
      if(total>users.length){const more=document.createElement("p");more.className="empty";more.textContent="Mostrando "+users.length+" de "+total+" contas. Refine a busca.";container.append(more)}
    }
    document.getElementById("balanceSearchForm").addEventListener("submit",event=>{event.preventDefault();loadBalanceUsers(event.currentTarget.elements.query.value.trim())});
    document.querySelectorAll("[data-economy-tab]").forEach(tab=>tab.addEventListener("click",()=>{
      document.querySelectorAll("[data-economy-tab]").forEach(item=>item.setAttribute("aria-selected",String(item===tab)));
      document.querySelectorAll("#vaultPanel,#storePanel,#signalPanel,#balancesPanel").forEach(panel=>{panel.hidden=panel.id!==tab.getAttribute("aria-controls")});
      if(tab.dataset.economyTab==="balances"&&!balancesLoaded)loadBalanceUsers("");
    }));
    document.querySelectorAll("[data-store-tab]").forEach(tab=>tab.addEventListener("click",()=>{
      document.querySelectorAll("[data-store-tab]").forEach(item=>item.setAttribute("aria-selected",String(item===tab)));
      document.querySelectorAll("#storeCreatePanel,#storeEditPanel,#storeOrdersPanel").forEach(panel=>{panel.hidden=panel.id!==tab.getAttribute("aria-controls")});
    }));
    async function loadRanking(){
      try{const state=await api("/api/account/local/admin-economy-ranking-state");const input=document.getElementById("includeVault");input.checked=state.includeVault;document.getElementById("rankStatus").textContent=state.includeVault?"Cofre incluído":"Somente carteira";
        input.addEventListener("change",async()=>{input.disabled=true;show("rankFeedback","Salvando...");
          try{const result=await api("/api/account/local/admin-economy-ranking",{includeVault:input.checked});document.getElementById("rankStatus").textContent=result.includeVault?"Cofre incluído":"Somente carteira";show("rankFeedback","Configuração salva.")}
          catch(error){input.checked=!input.checked;show("rankFeedback",error.message,true)}
          finally{input.disabled=false}
        });
      }catch(error){show("rankFeedback",error.message,true);document.getElementById("rankStatus").textContent="Indisponível"}
    }
    const vaultConfigForm=document.getElementById("vaultConfigForm");
    const vaultTaxValueLabel=document.getElementById("vaultTaxValueLabel");
    let vaultConfigState=null;
    function updateVaultTaxLabel(){
      const percent=vaultConfigForm.elements.taxType.value==="percent";
      vaultTaxValueLabel.firstChild.textContent=percent?"Taxa do imposto (%)":"Imposto fixo por período (SatCoins)";
      vaultConfigForm.elements.taxValue.placeholder=percent?"1,5":"25,00";
    }
    function parseDecimalHundredths(value){
      const normalized=String(value||"").trim().replace(",",".");
      if(!/^\\d+(?:\\.\\d{1,2})?$/.test(normalized))return null;
      const [whole,decimals=""]=normalized.split(".");
      const amount=Number(whole)*100+Number(decimals.padEnd(2,"0"));
      return Number.isSafeInteger(amount)?amount:null;
    }
    async function loadVaultConfig(){
      try{
        const result=await api("/api/account/local/admin-vault-config-state");
        const config=result.vaultConfig,form=vaultConfigForm;vaultConfigState=config;
        form.elements.mode.value=config.mode;
        form.elements.minimumMovement.value=(config.minimumMovement/100).toFixed(2);
        form.elements.taxType.value=config.taxType;
        form.elements.taxValue.value=config.taxType==="percent"
          ?(config.taxRateBasisPoints/100).toFixed(2)
          :(config.taxFixedAmount/100).toFixed(2);
        form.elements.robberyVaultChance.value=config.robberyVaultChance;
        updateVaultTaxLabel();
      }catch(error){show("vaultConfigFeedback",error.message,true)}
    }
    vaultConfigForm.elements.taxType.addEventListener("change",updateVaultTaxLabel);
    vaultConfigForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const form=event.currentTarget,button=form.querySelector('[type="submit"]');
      if(!vaultConfigState){show("vaultConfigFeedback","A configuração atual ainda está carregando. Tente novamente.",true);return}
      const minimumMovement=parseDecimalHundredths(form.elements.minimumMovement.value);
      const taxValue=parseDecimalHundredths(form.elements.taxValue.value);
      const chance=Number(form.elements.robberyVaultChance.value);
      const taxType=form.elements.taxType.value;
      const taxRateBasisPoints=taxType==="percent"?taxValue:vaultConfigState?.taxRateBasisPoints;
      const taxFixedAmount=taxType==="fixed"?taxValue:vaultConfigState?.taxFixedAmount;
      if(!Number.isSafeInteger(minimumMovement)||!Number.isSafeInteger(taxValue)||
          taxType==="percent"&&taxValue>10000||
          !Number.isSafeInteger(chance)||chance<0||chance>100){
        show("vaultConfigFeedback","Confira o mínimo, o imposto (0 a 100%) e a chance do cofre (0 a 100%).",true);return;
      }
      button.disabled=true;show("vaultConfigFeedback","Salvando...");
      try{
        const config={mode:form.elements.mode.value,minimumMovement,taxType,taxRateBasisPoints,taxFixedAmount,robberyVaultChance:chance};
        const result=await api("/api/account/local/admin-vault-config",{config});
        vaultConfigState=result.vaultConfig;
        form.elements.minimumMovement.value=(result.vaultConfig.minimumMovement/100).toFixed(2);
        form.elements.taxValue.value=result.vaultConfig.taxType==="percent"
          ?(result.vaultConfig.taxRateBasisPoints/100).toFixed(2)
          :(result.vaultConfig.taxFixedAmount/100).toFixed(2);
        show("vaultConfigFeedback","Configurações do cofre salvas.");
      }catch(error){show("vaultConfigFeedback",error.message,true)}
      finally{button.disabled=false}
    });
    const storeItems=document.getElementById("storeItems"),storeOrders=document.getElementById("storeOrders"),storeItemCreateForm=document.getElementById("storeItemCreate"),storeItemEditForm=document.getElementById("storeItemEdit");
    let storeState=null;
    function clearStoreForm(){storeItemEditForm.reset();storeItemEditForm.elements.id.value="";storeItemEditForm.hidden=true}
    function renderStore(state){
      storeState=state;document.getElementById("storeDetails").elements.title.value=state.store.title;document.getElementById("storeDetails").elements.notice.value=state.store.notice;storeItems.replaceChildren();
      if(!state.store.items.length){const empty=document.createElement("p");empty.className="empty";empty.textContent="Nenhum item cadastrado.";storeItems.append(empty)}
      for(const item of state.store.items){const row=document.createElement("article"),name=document.createElement("strong"),detail=document.createElement("p"),actions=document.createElement("div"),edit=document.createElement("button"),remove=document.createElement("button");
        row.className="row";name.textContent=item.name;detail.textContent="#"+item.id+" · "+item.category+" · "+formatMoney(item.price)+" · Estoque: "+(item.quantity===null?"infinito":item.quantity)+(item.rarity?" · "+item.rarity:"");
        actions.className="actions";edit.type="button";edit.textContent="Editar";edit.addEventListener("click",()=>{storeItemEditForm.elements.id.value=item.id;storeItemEditForm.elements.name.value=item.name;storeItemEditForm.elements.category.value=item.category;storeItemEditForm.elements.price.value=money(item.price);storeItemEditForm.elements.quantity.value=item.quantity===null?"infinito":String(item.quantity);storeItemEditForm.elements.rarity.value=item.rarity||"";storeItemEditForm.hidden=false;document.getElementById("storeEditTab").click();storeItemEditForm.scrollIntoView({block:"center"})});
        remove.type="button";remove.className="danger";remove.textContent="Remover";remove.addEventListener("click",async()=>{if(!window.confirm("Remover "+item.name+" do catálogo?"))return;await saveStore({action:"remove",itemId:item.id},"Item removido.")});
        actions.append(edit,remove);row.append(name,detail,actions);storeItems.append(row);
      }
      storeOrders.replaceChildren();if(!state.orders.length){const empty=document.createElement("p");empty.className="empty";empty.textContent="Nenhum pedido pendente.";storeOrders.append(empty)}
      for(const order of state.orders){const row=document.createElement("article"),name=document.createElement("strong"),detail=document.createElement("p"),actions=document.createElement("div"),done=document.createElement("button"),cancel=document.createElement("button");
        row.className="row";name.textContent="#"+order.id+" · "+order.itemName;detail.textContent=(order.displayName||order.userId)+" · "+formatMoney(order.price)+(order.source==="local-signal-search"?" · Prêmio da Busca Local":"");
        actions.className="actions";done.type="button";done.textContent="Marcar entregue";done.addEventListener("click",()=>saveStore({action:"delivered",orderId:order.id},"Pedido marcado como entregue."));
        cancel.type="button";cancel.className="danger";cancel.textContent="Cancelar e estornar";cancel.addEventListener("click",()=>saveStore({action:"cancelled",orderId:order.id},"Pedido cancelado e estornado."));
        actions.append(done,cancel);row.append(name,detail,actions);storeOrders.append(row);
      }
    }
    async function saveStore(payload,message){
      show("storeFeedback","Salvando...");
      try{renderStore(await api("/api/account/local/admin-store2",payload));show("storeFeedback",message);return true}
      catch(error){show("storeFeedback",error.message,true);return false}
    }
    async function loadStore(){try{renderStore(await api("/api/account/local/admin-store2-state"))}catch(error){show("storeFeedback",error.message,true)}}
    document.getElementById("storeDetails").addEventListener("submit",event=>{event.preventDefault();const form=event.currentTarget;saveStore({action:"details",title:form.elements.title.value,notice:form.elements.notice.value},"Título e aviso salvos.")});
    storeItemCreateForm.addEventListener("submit",async event=>{event.preventDefault();const form=event.currentTarget;const saved=await saveStore({action:"add",item:{name:form.elements.name.value,category:form.elements.category.value,price:form.elements.price.value,quantity:form.elements.quantity.value,rarity:form.elements.rarity.value||null}},"Item adicionado.");if(saved)form.reset()});
    storeItemEditForm.addEventListener("submit",async event=>{event.preventDefault();const form=event.currentTarget,id=form.elements.id.value;const saved=await saveStore({action:"edit",itemId:Number(id),item:{name:form.elements.name.value,category:form.elements.category.value,price:form.elements.price.value,quantity:form.elements.quantity.value,rarity:form.elements.rarity.value||null}},"Item atualizado.");if(saved)clearStoreForm()});
    document.getElementById("cancelStoreEdit").addEventListener("click",clearStoreForm);
    const tiersNode=document.getElementById("signalTiers"),featuredNode=document.getElementById("signalFeatured"),rarityTabs=document.getElementById("signalRarityTabs");let activeRarity=rarities[0].key;
    function checkboxGroup(parent,title,items,selected,type){
      const group=document.createElement("div"),heading=document.createElement("strong"),list=document.createElement("div");group.className="prize-group";heading.textContent=title;list.className="checks";group.append(heading,list);
      if(!items.length){const empty=document.createElement("small");empty.className="empty";empty.textContent="Nenhum item disponível.";list.append(empty)}
      for(const item of items){const label=document.createElement("label"),input=document.createElement("input"),text=document.createElement("span");label.className="check";input.type="checkbox";input.dataset.prizeType=type;input.value=String(item.key??item.id);input.checked=selected.includes(input.value);text.textContent=(item.name||item.label)+(item.price===undefined?"":" · "+formatMoney(item.price));label.append(input,text);list.append(label)}
      parent.append(group);
    }
    function renderSignal(state){
      signalState=state;const cfg=state.localSignalSearch||state;document.getElementById("signalForm").elements.enabled.checked=cfg.enabled;document.getElementById("signalForm").elements.price.value=money(cfg.price);tiersNode.replaceChildren();
      rarityTabs.replaceChildren();
      for(const rarity of rarities){const tab=document.createElement("button");tab.type="button";tab.id="signalRarityTab-"+rarity.key;tab.setAttribute("role","tab");tab.setAttribute("aria-controls","signalRarityPanel-"+rarity.key);tab.setAttribute("aria-selected",String(rarity.key===activeRarity));tab.textContent=rarity.label;tab.addEventListener("click",()=>{activeRarity=rarity.key;renderSignalVisibility()});rarityTabs.append(tab)}
      for(const rarity of rarities){const tier=cfg.tiers[rarity.key],fieldset=document.createElement("fieldset"),legend=document.createElement("legend"),grid=document.createElement("div");fieldset.className="tier";fieldset.id="signalRarityPanel-"+rarity.key;fieldset.setAttribute("role","tabpanel");fieldset.setAttribute("aria-labelledby","signalRarityTab-"+rarity.key);fieldset.dataset.rarity=rarity.key;fieldset.hidden=rarity.key!==activeRarity;legend.textContent=rarity.label;grid.className="grid";
        const field=(labelText,name,type,value,min,max,required=true)=>{const label=document.createElement("label"),input=document.createElement("input");label.textContent=labelText;input.name=name;input.type=type;input.value=value;if(min!==undefined)input.min=min;if(max!==undefined)input.max=max;input.required=required;label.append(input);grid.append(label)};
        field("Chance (%)","chance","number",tier.chance,0,100);field("Garantir após buscas (0 = sem garantia)","guaranteeAfter","number",tier.guaranteeAfter||0,0,10000);
        field("SatCoins mínimo (opcional)","cashMin","text",tier.cashMin===null?"":money(tier.cashMin),undefined,undefined,false);field("SatCoins máximo (opcional)","cashMax","text",tier.cashMax===null?"":money(tier.cashMax),undefined,undefined,false);
        fieldset.append(legend,grid);
        checkboxGroup(fieldset,"Itens da Loja do Bot",cfg.botItems,tier.botItems,"bot");
        checkboxGroup(fieldset,"Itens do Mercado Local",cfg.marketItems,tier.marketItems.map(String),"market");
        checkboxGroup(fieldset,"Fundos de perfil",cfg.backgrounds,tier.backgrounds,"background");
        checkboxGroup(fieldset,"Outlines de perfil",cfg.outlines,tier.outlines,"outline");tiersNode.append(fieldset);
      }
      featuredNode.replaceChildren();const selected=cfg.featured.map(item=>item.type==="market"?"market:"+item.id:item.type+":"+item.key),options=[];
      for(const rarity of rarities){const tier=cfg.tiers[rarity.key];for(const key of tier.botItems)options.push({type:"bot",key,label:cfg.botItems.find(item=>item.key===key)?.name});
        for(const id of tier.marketItems)options.push({type:"market",key:id,label:cfg.marketItems.find(item=>item.id===id)?.name});
        for(const key of tier.backgrounds)options.push({type:"background",key,label:"Fundo "+cfg.backgrounds.find(item=>item.key===key)?.name});
        for(const key of tier.outlines)options.push({type:"outline",key,label:"Outline "+cfg.outlines.find(item=>item.key===key)?.name});
      }
      const seen=new Set();for(const option of options){const value=option.type+":"+option.key;if(seen.has(value))continue;seen.add(value);const node=new Option(option.label||value,value);node.selected=selected.includes(value);featuredNode.add(node)}
    }
    function renderSignalVisibility(){
      for(const tab of rarityTabs.querySelectorAll('[role="tab"]'))tab.setAttribute("aria-selected",String(tab.id==="signalRarityTab-"+activeRarity));
      for(const panel of tiersNode.querySelectorAll('[role="tabpanel"]'))panel.hidden=panel.dataset.rarity!==activeRarity;
    }
    async function loadSignal(){try{renderSignal(await api("/api/account/local/admin-local-signal-search-state"))}catch(error){show("signalFeedback",error.message,true)}}
    document.getElementById("signalForm").addEventListener("submit",async event=>{event.preventDefault();const form=event.currentTarget,tiers={};
      const priceInput=form.elements.price;
      if(!priceInput.value.trim()||!priceInput.checkValidity()){
        const message="Informe um preço válido para cada busca.";
        show("signalFeedback",message,true);showSignalSaveResult("Não foi possível salvar",message,true);priceInput.focus();return
      }
      for(const fieldset of tiersNode.querySelectorAll("[data-rarity]")){const rarity=fieldset.dataset.rarity,cashMin=fieldset.elements.cashMin.value.trim(),cashMax=fieldset.elements.cashMax.value.trim();
        if(Boolean(cashMin)!==Boolean(cashMax)){const message="Informe mínimo e máximo de SatCoins ou deixe ambos vazios.";show("signalFeedback",message,true);showSignalSaveResult("Não foi possível salvar",message,true);return}
        const selected=type=>[...fieldset.querySelectorAll('[data-prize-type="'+type+'"]:checked')].map(input=>input.value);
        tiers[rarity]={chance:Number(fieldset.elements.chance.value),guaranteeAfter:Number(fieldset.elements.guaranteeAfter.value)||null,cashMin:cashMin||null,cashMax:cashMax||null,botItems:selected("bot"),marketItems:selected("market").map(Number),backgrounds:selected("background"),outlines:selected("outline")};
      }
      const featured=[...featuredNode.selectedOptions].map(option=>{const [type,value]=option.value.split(":");return type==="market"?{type,id:Number(value)}:{type,key:value}});
      if(featured.length>2){const message="Escolha no máximo dois destaques.";show("signalFeedback",message,true);showSignalSaveResult("Não foi possível salvar",message,true);return}
      const button=form.querySelector('[type="submit"]');button.disabled=true;show("signalFeedback","Salvando...");
      try{
        const result=await api("/api/account/local/admin-local-signal-search",{config:{enabled:form.elements.enabled.checked,price:form.elements.price.value,tiers,featured}});
        renderSignal(result);show("signalFeedback","Busca Local salva.");showSignalSaveResult("Busca Local salva","As configurações e os itens selecionados foram salvos com sucesso.");
      }catch(error){show("signalFeedback",error.message,true);showSignalSaveResult("Falha ao salvar Busca Local",error.message,true)}
      finally{button.disabled=false}
    });
    Promise.all([loadRanking(),loadVaultConfig(),loadStore(),loadSignal()]);
  </script></body></html>`;
}

function renderGroupAdmin(data) {
  const groupType = data.platform === "discord" ? "Servidor" : "Grupo";
  const warningRows = data.moderation.entries.map(item =>
    `<li><div class="warning-identity"><strong>${escapeHtml(item.name || item.userId)}</strong><small>ID: ${escapeHtml(item.userId)}</small></div><strong class="warning-count">${item.count}/${data.moderation.max}</strong><details class="warning-history"><summary>Motivos das advertências (${item.count})</summary><ul>${item.legacyCount ? `<li>${item.legacyCount} advertência(s) antiga(s) sem motivo registrado</li>` : ""}${(item.records || []).map(record => `<li>${escapeHtml(record.reason || "Motivo não informado")}<small>${escapeHtml(formatWarningDate(record.createdAt))}</small></li>`).join("")}</ul></details><button type="button" class="moderation-action danger" data-warning-user="${escapeHtml(item.userId)}">Remover advertências</button></li>`
  ).join("");
  const rootLevel = data.platform === "whatsapp" ? "chat" : "server";
  const settingDefinitions = ADMIN_SYSTEM_SETTINGS.filter(setting => setting.scopes[data.platform]);
  const localSignalRarityLabels = {
    comum: "Comum",
    incomum: "Incomum",
    raro: "Raro",
    epico: "Épico",
    lendario: "Lendário"
  };
  const localSignalTierFields = economy.LOCAL_SIGNAL_RARITIES.map(rarity => `
    <fieldset class="local-signal-tier" data-local-signal-tier="${rarity}">
      <legend>${localSignalRarityLabels[rarity]}</legend>
      <div class="antilink-form-grid">
        <label>Chance (%)<input type="number" name="chance" min="0" max="100" step="1" required></label>
        <label>Garantir após buscas (0 = sem garantia)<input type="number" name="guaranteeAfter" min="0" max="10000" step="1" value="0" required></label>
        <label>SatCoins mínimo (opcional)<input type="text" name="cashMin" inputmode="decimal" placeholder="Ex.: 5,00"></label>
        <label>SatCoins máximo (opcional)<input type="text" name="cashMax" inputmode="decimal" placeholder="Ex.: 20,00"></label>
      </div>
      <div class="local-signal-choice-group"><strong>Itens do Bot que podem sair</strong><div class="local-signal-check-list" data-local-bot-items></div></div>
      <div class="local-signal-choice-group"><strong>Itens do Mercado Local que podem sair</strong><div class="local-signal-check-list" data-local-market-items></div><small>Ao ganhar um item do Mercado Local, um pedido gratuito será criado para os administradores.</small></div>
      <div class="local-signal-choice-group"><strong>Fundos de perfil que podem sair</strong><div class="local-signal-check-list" data-local-background-items></div></div>
      <div class="local-signal-choice-group"><strong>Outlines de perfil que podem sair</strong><div class="local-signal-check-list" data-local-outline-items></div></div>
    </fieldset>`).join("");
  const localSignalDialog = `<dialog class="antilink-dialog store2-dialog local-signal-dialog" id="localSignalDialog" aria-labelledby="localSignalTitle">
    <form id="localSignalForm">
      <header class="antilink-dialog-heading"><div><h2 id="localSignalTitle">Busca de Sinais Local</h2><p id="localSignalScopeLabel">Configure os prêmios e probabilidades deste grupo ou servidor.</p></div><button type="button" class="dialog-close" data-close-local-signal aria-label="Fechar">×</button></header>
      <label class="autorepo-global-toggle"><input type="checkbox" name="enabled"><span><strong>Ativar Busca Local</strong><small>Quando ativa, aparece como um terceiro nível na página de Busca de Sinais.</small></span></label>
      <label>Preço de uma busca em SatCoins<input type="text" name="price" inputmode="decimal" placeholder="100,00" required><small>O preço da busca x10 é calculado automaticamente.</small></label>
      <div class="local-signal-tier-list">${localSignalTierFields}</div>
      <fieldset class="local-signal-featured"><legend>Destaques nos cartões (marque até 2)</legend><div class="local-signal-check-list" id="localSignalFeatured"></div></fieldset>
      <p class="antilink-form-feedback" id="localSignalFeedback" role="status" aria-live="polite"></p>
      <footer class="antilink-dialog-actions"><button type="button" data-close-local-signal>Cancelar</button><button type="submit" class="primary">Salvar Busca Local</button></footer>
    </form>
  </dialog>`;
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
      const supportedInScope = setting.scopes[data.platform]?.includes(scope.level) === true;
      const enabled = supportedInScope && settings[setting.key] === true;
      const hasChatScopeOnly = !supportedInScope && setting.scopes[data.platform].some(level => level === "chat" || level === "topic" || level === "categoria");
      const categoryHeading = setting.category && setting.category !== previousSettingCategory
        ? `<h3 class="setting-category" style="margin:12px 0 0;color:#b9c6ff;font-size:14px">${escapeHtml(setting.category)}</h3>`
        : "";
      previousSettingCategory = setting.category || previousSettingCategory;
      const configurableSettings = ["welcome", "goodbye", "autoApprove"];
      const dedicatedAutomation = ["autodownload", "autoia", "autorepo", "autoTranscribe"].includes(setting.key);
      const isMonitor = Object.prototype.hasOwnProperty.call(ADMIN_MONITOR_HELPERS, setting.key);
      const dedicatedProtection = ["antilink", "antipalavras", "antimedia", "antiraid", "blockcmd"].includes(setting.key);
      const noMainActivationShortcut = ["antilink", "antimedia", "antipalavras"].includes(setting.key);
      const dedicatedWelcome = ["welcome", "goodbye"].includes(setting.key);
      const welcomePageHref = `/painel-boas-vindas?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}&scope=${encodeURIComponent(JSON.stringify(scope))}`;
      const dedicatedPage = setting.key === "agendar" ? "agendamentos"
        : setting.key === "autodownload" ? "autodownload"
          : setting.key === "autoia" ? "autoia"
            : setting.key === "autorepo" ? "autorepo"
              : setting.key === "autoTranscribe" ? "transcrever"
                : setting.key === "xp" ? "xp"
                  : setting.key === "activity" ? "atividade" : "monitores";
      const dedicatedHref = `/painel-${dedicatedPage}?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}&scope=${encodeURIComponent(JSON.stringify(scope))}`;
      const configButton = dedicatedProtection
        ? `<a href="/painel-${setting.key}?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}" style="display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:8px 10px;text-decoration:none;border:1px solid #6f7fa5;border-radius:9px;background:#ffffff0b;color:#f5f7fb;font-size:11px;font-weight:700">Ir para o painel</a>`
        : dedicatedWelcome
        ? `<a href="${welcomePageHref}" style="display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:8px 10px;text-decoration:none;border:1px solid #6f7fa5;border-radius:9px;background:#ffffff0b;color:#f5f7fb;font-size:11px;font-weight:700">Ir para o painel</a>`
        : setting.key === "agendar" || dedicatedAutomation || isMonitor || ["xp", "activity"].includes(setting.key)
        ? `<a href="${dedicatedHref}" style="display:inline-flex;align-items:center;justify-content:center;min-height:34px;padding:8px 10px;text-decoration:none;border:1px solid #6f7fa5;border-radius:9px;background:#ffffff0b;color:#f5f7fb;font-size:11px;font-weight:700">Ir para o painel</a>`
        : supportedInScope && configurableSettings.includes(setting.key)
        ? `<button type="button" class="setting-icon-button" data-${setting.key.toLowerCase()}-config data-scope="${escapeHtml(JSON.stringify(scope))}" aria-label="Configurar ${setting.key} neste escopo" title="Configurações do ${setting.key}">${ADMIN_SETTINGS_GEAR_ICON}</button>`
        : setting.key === "economy"
            ? `<a href="/painel-economia?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}" style="display:inline-flex;align-items:center;width:auto;height:auto;padding:8px 10px;text-decoration:none;border:1px solid #6f7fa5;border-radius:9px;background:#ffffff0b;color:#f5f7fb;font-size:11px;font-weight:700">Economia, loja e busca</a>`
        : "";
      const unavailableState = hasChatScopeOnly
        ? `<span class="state off" data-state="${setting.key}">Configurar por chat/tópico</span>`
        : `<span class="state off" data-state="${setting.key}">Indisponível nesta plataforma</span>`;
      const controls = !supportedInScope
        ? `${unavailableState}${configButton}`
        : noMainActivationShortcut
        ? `<span class="state ${enabled ? "on" : "off"}" data-state="${setting.key}">${enabled ? "Ativado" : "Desativado"}</span>${configButton}`
        : setting.key === "agendar"
        ? `<span class="state ${enabled ? "on" : "off"}" data-state="${setting.key}">${enabled ? "Ativo" : "Sem agendamentos ativos"}</span>${configButton}`
        : `<span class="state ${enabled ? "on" : "off"}" data-state="${setting.key}">${enabled ? "Ativado" : "Desativado"}</span><button type="button" data-setting="${setting.key}" data-enabled="${enabled ? "true" : "false"}" data-scope="${escapeHtml(JSON.stringify(scope))}">${enabled ? "Desativar" : "Ativar"}</button>${configButton}`;
      const cardScopeLabel = supportedInScope ? scopeLabel : hasChatScopeOnly ? "Escopo específico" : "Não disponível";
      return `${categoryHeading}<article class="setting-card"><div class="setting-info"><span class="setting-scope">${escapeHtml(cardScopeLabel)}</span><h2>${escapeHtml(setting.label)}</h2><p>${escapeHtml(setting.description)}</p></div><div class="setting-controls">${controls}</div></article>`;
    }).join("");
  };
  const rootScope = { level: rootLevel };
  const settingCards = renderSettingCards(settingDefinitions, data.settings, rootScope, getScopeLabel(rootScope));
  const autorespostaDialog = `<dialog class="antilink-dialog autoresposta-dialog" id="autorepoDialog" aria-labelledby="autorepoDialogTitle"><form id="autorepoForm"><header class="antilink-dialog-heading"><div><h2 id="autorepoDialogTitle">Respostas automáticas</h2><p id="autorepoScopeLabel"></p></div><button type="button" class="dialog-close" data-close-autorepo aria-label="Fechar">×</button></header><label class="autorepo-global-toggle"><input type="checkbox" name="useGlobal"><span><strong>Usar respostas oficiais globais</strong><small><span id="autorepoGlobalCount">0</span> resposta(s) disponível(is), mantidas pelos administradores do bot.</small></span></label><section class="autorepo-responses"><div class="autorepo-section-heading"><div><h3>Respostas deste grupo</h3><p>Gatilhos locais são usados antes das respostas globais.</p></div><button type="button" id="addAutoresposta">Adicionar resposta</button></div><div id="autorepoResponseList" class="autorepo-response-list"></div></section><p class="antilink-form-feedback" id="autorepoFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-autorepo>Cancelar</button><button type="submit" class="primary">Salvar respostas</button></footer></form></dialog>`;
  const autodownloadDialog = `<dialog class="antilink-dialog welcome-dialog" id="autodownloadDialog" aria-labelledby="autodownloadDialogTitle"><form id="autodownloadForm"><header class="antilink-dialog-heading"><div><h2 id="autodownloadDialogTitle">Configurações do download automático</h2><p id="autodownloadScopeLabel"></p></div><button type="button" class="dialog-close" data-close-autodownload aria-label="Fechar">×</button></header><label class="autorepo-global-toggle"><input type="checkbox" name="deletelink"><span><strong>Excluir a mensagem com o link original</strong><small>Depois que o bot enviar a mídia baixada, remove do chat a mensagem que contém o link.</small></span></label><p class="antilink-form-feedback" id="autodownloadFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-autodownload>Cancelar</button><button type="submit" class="primary">Salvar configurações</button></footer></form></dialog>`;
  const autoApproveDialog = `<dialog class="antilink-dialog welcome-dialog" id="autoApproveDialog" aria-labelledby="autoApproveDialogTitle"><form id="autoApproveForm"><header class="antilink-dialog-heading"><div><h2 id="autoApproveDialogTitle">Configurações da autoaprovação</h2><p id="autoApproveScopeLabel"></p></div><button type="button" class="dialog-close" data-close-autoApprove aria-label="Fechar">×</button></header><label>Intervalo entre aprovações (segundos)<input name="intervalSeconds" type="number" min="0" max="86400" step="1" required></label><label>Nomes bloqueados<textarea name="blockedNames" rows="3" placeholder="um texto por linha"></textarea></label><label>Símbolos bloqueados<textarea name="blockedSymbols" rows="3" placeholder="um símbolo por linha"></textarea></label><label>Horários permitidos (HH:MM-HH:MM, uma faixa por linha)<textarea name="schedules" rows="3" placeholder="08:00-18:00"></textarea><small>Sem faixas, a autoaprovação pode ocorrer a qualquer horário local.</small></label><p class="antilink-form-feedback" id="autoApproveFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-autoApprove>Cancelar</button><button type="submit" class="primary">Salvar configurações</button></footer></form></dialog>`;
  const rpManagerDialog = `<dialog class="antilink-dialog rp-manager-dialog" id="rpManagerDialog" aria-labelledby="rpManagerTitle"><header class="antilink-dialog-heading"><div><h2 id="rpManagerTitle">Gerenciar sistema</h2><p id="rpManagerScopeLabel"></p></div><button type="button" class="dialog-close" data-close-rp-manager aria-label="Fechar">×</button></header><section id="rpXpSettings" class="rp-xp-settings" hidden><h3>Mensagens de level-up</h3><label class="autorepo-global-toggle"><input id="rpXpMuted" type="checkbox"><span><strong>Silenciar avisos de level-up</strong><small>O ganho de XP continua ativo; somente os avisos serão silenciados.</small></span></label><label><span id="rpXpDestinationLabel">Canal para mensagens de level-up</span><select id="rpXpDestination"><option value="">Canal onde o XP foi ganho</option></select><small id="rpXpDestinationHint">Deixe o destino padrão para avisar onde o XP foi ganho.</small></label><button type="button" id="saveRpXpSettings">Salvar configurações de XP</button></section><div class="rp-manager-toolbar"><button type="button" id="resetRpSystem" class="moderation-action danger">Resetar sistema</button></div><form id="rpSearchForm" class="moderation-search"><input id="rpSearch" type="search" maxlength="100" autocomplete="off" placeholder="Buscar por nome, username ou ID"><button type="submit">Buscar</button></form><p class="moderation-help" id="rpManagerDescription"></p><div id="rpManagerUsers" class="rp-manager-users" aria-live="polite"></div><p class="antilink-form-feedback" id="rpManagerFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-rp-manager>Fechar</button></footer></dialog>`;
  const store2Dialog = `<dialog class="antilink-dialog store2-dialog" id="store2Dialog" aria-labelledby="store2Title"><header class="antilink-dialog-heading"><div><h2 id="store2Title">Loja 2</h2><p id="store2ScopeLabel">Catálogo e pedidos deste grupo ou servidor.</p></div><button type="button" class="dialog-close" data-close-store2 aria-label="Fechar">×</button></header><form id="store2DetailsForm"><label>Título da loja<input name="title" maxlength="120" required></label><label>Aviso<textarea name="notice" maxlength="1000" rows="3" required></textarea></label><div class="antilink-dialog-actions"><button type="submit" class="primary">Salvar título e aviso</button></div></form><section><h3>Itens do catálogo</h3><form id="store2ItemForm"><input name="id" type="hidden"><label>Nome<input name="name" maxlength="120" required></label><div class="antilink-form-grid"><label>Preço em SatCoins<input name="price" type="text" inputmode="decimal" placeholder="250,00" required></label><label>Categoria<input name="category" maxlength="80" required></label></div><div class="antilink-form-grid"><label>Quantidade (ou “infinito”)<input name="quantity" type="text" inputmode="numeric" placeholder="5 ou infinito" required></label><label>Importância<select name="rarity"><option value="">Não definida</option><option value="comum">Comum</option><option value="incomum">Incomum</option><option value="raro">Raro</option><option value="epico">Épico</option><option value="lendario">Lendário</option></select></label></div><div class="antilink-dialog-actions"><button type="submit" class="primary" id="store2ItemSubmit">Adicionar item</button><button type="button" id="store2ItemCancel" hidden>Cancelar edição</button></div></form><div id="store2Items" class="store2-list" aria-live="polite"></div></section><section><h3>Pedidos pendentes</h3><div id="store2Orders" class="store2-list" aria-live="polite"></div></section><p class="antilink-form-feedback" id="store2Feedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-store2>Fechar</button></footer></dialog>`;
  const monitorDialog = `<dialog class="antilink-dialog monitor-dialog" id="monitorDialog" aria-labelledby="monitorDialogTitle"><form id="monitorForm"><header class="antilink-dialog-heading"><div><h2 id="monitorDialogTitle">Configurações do monitor</h2><p id="monitorScopeLabel"></p></div><button type="button" class="dialog-close" data-close-monitor aria-label="Fechar">×</button></header><div id="monitorFormFields" class="monitor-form-fields"></div><p class="antilink-form-feedback" id="monitorFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-monitor>Cancelar</button><button type="submit" class="primary">Salvar configurações</button></footer></form></dialog>`;
  const schedulesDialog = `<dialog class="antilink-dialog schedules-dialog" id="schedulesDialog" aria-labelledby="schedulesDialogTitle"><header class="antilink-dialog-heading"><div><h2 id="schedulesDialogTitle">Agendamentos</h2><p id="schedulesScopeLabel"></p></div><button type="button" class="dialog-close" data-close-schedules aria-label="Fechar">×</button></header><p class="monitor-field-caption">Gerencie mensagens automáticas para este chat ou tópico. Os horários seguem o fuso horário local do computador que executa o bot.</p><div id="scheduleList" class="schedule-list"></div><button type="button" id="addSchedule" class="schedule-add">Criar agendamento</button><form id="scheduleForm" hidden style="display:none"><input type="hidden" name="id"><div class="antilink-form-grid"><label>Nome<input name="name" type="text" maxlength="100" required></label><label>Gatilho<select name="triggerType"><option value="fixed">Horários fixos</option><option value="interval">Intervalo</option></select></label></div><div id="scheduleFixedFields"><label>Horários (HH:MM, separados por vírgula)<input name="times" type="text" placeholder="07:00, 12:00, 20:00"></label></div><div id="scheduleIntervalFields" hidden><label>Intervalo (por exemplo, 30m, 2h ou 1d2h)<input name="interval" type="text" placeholder="1h"></label></div><div class="antilink-form-grid"><label>Repetição<select name="repeatMode"><option value="once">Uma vez</option><option value="daily">Diariamente</option><option value="weekly">Semanalmente</option><option value="monthly">Mensalmente</option></select></label><label id="scheduleMonthDayField" hidden>Dia do mês<input name="monthDay" type="number" min="1" max="31"></label></div><fieldset class="antilink-options" id="scheduleWeekdayFields" hidden style="display:none"><legend>Dias da semana</legend><div class="monitor-check-list">${[["0","Domingo"],["1","Segunda"],["2","Terça"],["3","Quarta"],["4","Quinta"],["5","Sexta"],["6","Sábado"]].map(([day,label])=>`<label><input type="checkbox" name="days" value="${day}">${label}</label>`).join("")}</div></fieldset><label>Tipo de mensagem<select name="messageMode"><option value="text">Texto</option><option value="media">Mídia com legenda</option></select></label><label>Texto / legenda<textarea name="text" maxlength="4000" rows="4"></textarea></label><section class="schedule-media"><strong>Mídia: </strong><span id="scheduleMediaStatus">Nenhuma mídia configurada.</span><p class="monitor-field-caption">O upload é salvo imediatamente; os demais campos só são salvos pelo botão abaixo.</p><label>Enviar imagem ou vídeo (JPEG, PNG, WebP, GIF ou MP4; até 8 MB)<input type="file" name="mediaFile" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4"></label><div class="antilink-dialog-actions"><button type="button" id="uploadScheduleMedia">Enviar mídia</button><button type="button" id="removeScheduleMedia" hidden>Remover mídia</button></div></section><p class="antilink-form-feedback" id="scheduleFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" id="cancelScheduleEdit">Cancelar</button><button type="submit" class="primary">Salvar agendamento</button></footer></form></dialog>`;

  const adminHtml = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Painel de administração · ${escapeHtml(data.groupName)}</title><style>
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
  .settings{gap:8px}.setting-card{gap:12px;padding:13px 15px}.setting-card h2{font-size:14px}.setting-card p{margin-top:4px;font-size:11px}.setting-controls{gap:8px}.state{min-width:82px;padding:6px 8px}.setting-controls button{min-width:88px;padding:8px 10px;font-size:12px}.setting-category{grid-column:1/-1;margin:10px 0 0}.setting-scope{display:inline-block;margin-bottom:5px;padding:3px 7px;border:1px solid #8195d344;border-radius:999px;background:#8297d014;color:#b9c6ff;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.setting-icon-button{display:grid;min-width:34px!important;width:34px;height:34px;padding:7px!important;place-items:center}.setting-controls a.setting-icon-button{display:inline-flex;width:auto!important;min-width:0!important;height:auto;padding:8px 10px!important;place-items:center;text-decoration:none;color:#f5f7fb}.setting-icon-button svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.scope-list-label{grid-column:1/-1;margin:4px 0 -2px;color:#dce2f3;font-size:12px;font-weight:800}.scope-picker{display:flex;flex-wrap:wrap;align-items:end;gap:10px;margin:10px 0}.scope-picker label{display:grid;gap:5px;color:#b9c6ff;font-size:11px;font-weight:700}.scope-picker select{min-width:min(260px,80vw);padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:#171d2b;color:#f5f7fb}.scope-panel{margin-top:12px;padding:12px;border:1px solid var(--line);border-radius:14px;background:#ffffff04}.scope-panel[hidden]{display:none}.scope-panel-heading{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 12px}.scope-panel h3{margin:0;font-size:14px}.scope-current{color:#b9c6ff;font-size:11px;font-weight:700}.scope-note{margin:5px 0 0;color:var(--muted);font-size:11px;line-height:1.45}.antilink-dialog{width:min(720px,calc(100vw - 24px));max-height:90vh;overflow:auto;padding:20px;border:1px solid #53668f;border-radius:16px;background:#151c2b;color:#f5f7fb;box-shadow:0 24px 90px #000a}.antilink-dialog::backdrop{background:#080b12bb;backdrop-filter:blur(3px)}.antilink-dialog form{display:grid;gap:14px}.antilink-dialog-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.antilink-dialog-heading h2{margin:0;font-size:18px}.antilink-dialog-heading p{margin:5px 0 0;color:#b9c6ff;font-size:12px}.dialog-close{width:32px;height:32px;border:1px solid var(--line);border-radius:9px;background:#ffffff08;color:#fff;font-size:21px;cursor:pointer}.antilink-form-grid,.antilink-list-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.antilink-dialog label{display:grid;gap:6px;color:#dce2f3;font-size:12px;font-weight:700}.antilink-dialog textarea,.antilink-dialog select{width:100%;min-width:0;padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:#0e121b;color:#f5f7fb;font:inherit;font-size:12px}.antilink-dialog textarea{resize:vertical}.antilink-dialog small{color:var(--muted);font-size:10px;font-weight:400;line-height:1.4}.antilink-options{display:grid;gap:8px;margin:0;padding:12px;border:1px solid var(--line);border-radius:10px}.antilink-options legend{padding:0 6px;color:#b9c6ff;font-size:12px;font-weight:700}.antilink-options label{display:flex;align-items:flex-start;gap:8px;font-weight:400}.antilink-options input{margin:2px 0 0;accent-color:#9b8cff}.antilink-form-feedback{min-height:16px;margin:0;color:#9cf0cf;font-size:12px}.antilink-form-feedback.error{color:#ff9eaa}.antilink-dialog-actions{display:flex;justify-content:flex-end;gap:8px}.antilink-dialog-actions button{padding:9px 12px;border:1px solid #6f7fa5;border-radius:9px;background:#ffffff0b;color:#f5f7fb;font:inherit;font-size:12px;font-weight:700;cursor:pointer}.antilink-dialog-actions .primary{border-color:#9b8cff;background:#8b7bff20}.antilink-dialog-actions button:disabled{opacity:.55;cursor:wait}.monitor-form-fields{display:grid;gap:12px}.monitor-form-fields input[type="text"],.monitor-form-fields input[type="number"]{width:100%;min-width:0;padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:#0e121b;color:#f5f7fb;font:inherit;font-size:12px}.monitor-check-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}.monitor-check-list label{display:flex;align-items:center;gap:8px;padding:9px;border:1px solid  var(--line);border-radius:9px;background:#ffffff05}.monitor-check-list input{accent-color:#9b8cff}.monitor-job{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:12px;border:1px solid var(--line);border-radius:10px;background:#ffffff05}.monitor-job button{grid-column:1/-1;justify-self:end;padding:6px 9px;border:1px solid #b65b6a66;border-radius:8px;background:#ffffff08;color:#ffb3bd;cursor:pointer}.monitor-field-caption{margin:0;color:var(--muted);font-size:11px;line-height:1.45}@media(min-width:640px){#rootSettings{grid-template-columns:repeat(2,minmax(0,1fr))}.setting-card{align-items:flex-start;flex-direction:column;justify-content:flex-start}.setting-controls{width:100%;justify-content:space-between}}@media(max-width:520px){.antilink-form-grid,.antilink-list-grid{grid-template-columns:1fr}.antilink-dialog{padding:15px}.monitor-job{grid-template-columns:1fr}}
  </style><style>
    .setting-controls .setting-store2-button{display:flex;width:auto;min-width:max-content!important;height:34px;padding:7px 10px!important;align-items:center;gap:6px;border-color:#9b8cff77;background:#8b7bff14;color:#d5ceff;font-size:11px;font-weight:700;white-space:nowrap}
    .setting-controls .setting-store2-button:hover{border-color:#b3a8ff;background:#8b7bff30}
    .setting-store2-button span{display:grid;place-items:center}
    .setting-store2-button svg{width:15px;height:15px}
    .store2-dialog{width:min(760px,calc(100vw - 24px))}
    .store2-dialog input{width:100%;min-width:0;padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:#0e121b;color:#f5f7fb;font:inherit;font-size:12px}
    .local-signal-dialog{width:min(820px,calc(100vw - 24px))}
    .local-signal-tier-list{display:grid;gap:12px;max-height:48vh;overflow:auto;padding-right:4px}
    .local-signal-tier{display:grid;gap:10px;padding:13px;border:1px solid var(--line);border-radius:12px;background:#ffffff04}
    .local-signal-tier legend{padding:0 6px;color:#d4c7ff;font-weight:800}
    .local-signal-choice-group,.local-signal-featured{display:grid;gap:8px;margin:0;padding:12px;border:1px solid var(--line);border-radius:10px}
    .local-signal-choice-group>strong,.local-signal-featured legend{color:#d4c7ff;font-size:12px}
    .local-signal-check-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:7px}
    .local-signal-check{display:flex;align-items:flex-start;gap:8px;padding:8px 9px;border:1px solid #ffffff18;border-radius:8px;background:#0e121b;color:#e5e9f2;font-size:12px}
    .local-signal-check input{width:16px;height:16px;min-width:16px;flex:none;margin:1px 0 0;padding:0;border:0;border-radius:4px;background:transparent;accent-color:#b997ff}
    .local-signal-check small{display:block;margin-top:3px;color:#9da7bb;font-size:10px}
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
    <nav class="overview-nav" aria-label="Navegação do painel"><a href="#moderation">Moderação</a><a href="#systemSettings">${data.platform === "whatsapp" ? "Sistemas do grupo" : "Sistemas do SatBot"}</a><a href="/painel-agendamentos?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}">Agendamentos</a><a href="/painel-monitores?plataforma=${encodeURIComponent(data.platform)}&grupo=${encodeURIComponent(data.groupId)}">Monitores</a></nav>
    <section class="overview-section" id="moderation" aria-labelledby="moderationTitle">
      <h2 class="section-title" id="moderationTitle">Moderação</h2>
      <p class="section-intro">Gerencie advertências e aplique ações compatíveis com esta plataforma. Sua permissão e a do bot são verificadas ao executar cada ação.</p>
      <div class="moderation-layout">
        <article class="moderation-card"><h3>Buscar usuário</h3><form class="moderation-search" id="moderationSearch"><input id="moderationQuery" type="search" maxlength="100" autocomplete="off" placeholder="${data.platform === "whatsapp" ? "ID ou número" : "ID ou username"}" aria-label="ID ou username do usuário"><button type="submit">Buscar</button>${data.platform === "whatsapp" ? '<button type="button" id="loadMembers">Abrir lista de membros</button>' : ""}</form>${data.platform === "whatsapp" ? '<section id="memberPicker" class="member-picker-card" hidden style="margin-top:12px;padding:12px;border:1px solid var(--line);border-radius:12px;background:#ffffff05"><h4 style="margin:0 0 5px;font-size:13px">Selecionar membro do grupo</h4><p class="moderation-help" style="margin:0 0 9px">Os participantes aparecem pelo nome e pelo ID. Selecione um cartão para abrir as ações de moderação.</p><div id="memberPickerList" class="member-picker-list" aria-live="polite"></div></section>' : ""}<p class="moderation-help">${data.platform === "telegram" ? "Informe o ID numérico ou um username já conhecido pelo bot. O Telegram não permite localizar qualquer usuário apenas pelo username." : data.platform === "whatsapp" ? "Informe o ID/número para buscar ou abra a lista personalizada de participantes." : "Informe o ID ou username do membro do Discord."}</p><div id="moderationResults" class="moderation-results" aria-live="polite"></div><div id="moderationSelected"></div><p class="moderation-feedback" id="moderationFeedback" role="status" aria-live="polite"></p></article>
        <article class="moderation-card"><h3>Configuração de advertências</h3><p class="moderation-help">Defina o limite e a punição automática. Ao atingir o limite, o histórico de advertências do membro é zerado.</p><form id="warningConfigForm" class="moderation-fields"><label for="warningMax">Limite de advertências</label><input id="warningMax" name="max" type="number" min="1" max="1000000" step="1" value="${data.moderation.max}" required><label for="warningAction">Ação ao atingir o limite</label><select id="warningAction" name="action" required><option value="ban" ${data.moderation.action === "ban" ? "selected" : ""}>Banir</option><option value="kick" ${data.moderation.action === "kick" ? "selected" : ""}>Expulsar</option></select><button type="submit">Salvar configuração de warns</button><p class="moderation-feedback" id="warningConfigFeedback" role="status" aria-live="polite"></p></form></article>
        <article class="moderation-card"><h3>Usuários com advertências</h3><p class="moderation-help">Abra “Ver motivos” para consultar o histórico. Advertências anteriores à atualização aparecem sem motivo registrado. Remover pela lista apaga todas as advertências da pessoa.</p><ul class="warning-list" id="warningList">${warningRows || ""}</ul><p class="warning-empty" id="warningEmpty" ${warningRows ? "hidden" : ""}>Nenhum usuário com advertências registradas.</p><p class="warning-empty" id="warningMore" ${data.moderation.total > data.moderation.entries.length ? "" : "hidden"}>Mostrando ${data.moderation.entries.length} de ${data.moderation.total}. Pesquise pelo ID para localizar outros registros.</p></article>
      </div>
    </section>
    <section class="overview-section" id="systemSettings" aria-labelledby="systemSettingsTitle">
      <h2 class="section-title" id="systemSettingsTitle">Sistemas do grupo</h2>
      <p class="section-intro">${data.platform === "whatsapp" ? "Ative ou desative os recursos disponíveis neste grupo." : "Atalhos rápidos para ativar, desativar e abrir as páginas de configuração. Os recursos por chat ou tópico são configurados nas páginas próprias."}</p>
      ${data.platform === "discord" ? `<article class="moderation-card" style="margin:12px 0"><h3>Canal de logs do painel</h3><p class="moderation-help">Selecione onde serão enviados os avisos de alterações administrativas.</p><label>Canal de logs<select id="logsChannelSelect"><option value="">Desativado — não registrar avisos</option></select></label></article>` : ""}
      <article class="moderation-card" style="margin:12px 0">
        <h3>Logs de auditoria</h3>
        <p class="moderation-help">Registra alterações de saldo, loja local, loja de sinais e advertências. ${data.platform === "discord" ? "Os registros são enviados ao canal de logs escolhido acima." : data.platform === "telegram" ? "Os registros são enviados ao chat principal." : "Os registros são enviados neste grupo."}</p>
        <label><input id="auditLogsEnabled" type="checkbox"> Ativar todos os logs</label>
        <div class="moderation-fields" style="margin-top:10px"><label><input data-audit-category="balance" type="checkbox"> Alterações de saldo</label><label><input data-audit-category="store" type="checkbox"> Loja local</label><label><input data-audit-category="signals" type="checkbox"> Loja de sinais local</label><label><input data-audit-category="warnings" type="checkbox"> Advertências</label></div>
        <p class="moderation-feedback" id="auditLogsFeedback" role="status" aria-live="polite"></p>
      </article>
      <section class="settings" id="rootSettings" aria-label="Configurações do grupo ou servidor">${settingCards}</section>
    </section>
    </dialog>
    <dialog class="antilink-dialog" id="antimediaDialog" aria-labelledby="antimediaDialogTitle"><form id="antimediaForm"><header class="antilink-dialog-heading"><div><h2 id="antimediaDialogTitle">Configurações do antimídia</h2><p id="antimediaScopeLabel"></p></div><button type="button" class="dialog-close" data-close-antimedia aria-label="Fechar">×</button></header><div class="antilink-form-grid"><label>Ação ao detectar mídia<select name="action"><option value="delete">Deletar mensagem</option><option value="warn">Deletar e avisar</option><option value="kick">Deletar e expulsar</option><option value="ban">Deletar e banir</option></select></label><label>Mensagem de aviso<textarea name="message" maxlength="2000" rows="3" placeholder="Opcional; usada quando a ação avisa o usuário"></textarea></label></div><fieldset class="antilink-options"><legend>Tipos de mídia bloqueados</legend><div class="antimedia-media-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px 14px">${[["image","Imagem / foto"],["video","Vídeo"],["audio","Áudio / música"],["document","Documento / arquivo"],["sticker","Figurinha"],["location","Localização"],["contact","Contato"],["voice","Mensagem de voz"],["gif","GIF"]].map(([value,label]) => `<label><input type="checkbox" name="mediaTypes" value="${value}"> ${label}</label>`).join("")}</div><small>Se nenhum tipo for marcado, todos os tipos de mídia serão bloqueados.</small></fieldset><fieldset class="antilink-options"><legend>Herança</legend><label><input type="checkbox" name="ignoreParent"> Ignorar as regras dos escopos superiores</label></fieldset><div class="antilink-list-grid"><label>Usuários isentos<textarea name="userWhitelist" rows="4" placeholder="um ID por linha"></textarea><small>Esses usuários não serão punidos.</small></label><label>Usuários na lista negra<textarea name="userBlacklist" rows="4" placeholder="um ID por linha"></textarea><small>Esses usuários serão punidos ao enviar qualquer mídia.</small></label>${data.platform === "discord" ? `<label>Cargos isentos<textarea name="roleWhitelist" rows="4" placeholder="um ID de cargo por linha"></textarea></label><label>Cargos na lista negra<textarea name="roleBlacklist" rows="4" placeholder="um ID de cargo por linha"></textarea></label>` : ""}</div><p class="antilink-form-feedback" id="antimediaFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-antimedia>Cancelar</button><button type="submit" class="primary">Salvar configurações</button></footer></form></dialog>
    <dialog class="antilink-dialog" id="antipalavrasDialog" aria-labelledby="antipalavrasDialogTitle"><form id="antipalavrasForm"><header class="antilink-dialog-heading"><div><h2 id="antipalavrasDialogTitle">Configurações do antipalavras</h2><p id="antipalavrasScopeLabel"></p></div><button type="button" class="dialog-close" data-close-antipalavras aria-label="Fechar">×</button></header><div class="antilink-form-grid"><label>Ação ao detectar palavra/frase<select name="action"><option value="delete">Deletar mensagem</option><option value="warn">Deletar e avisar</option><option value="kick">Deletar e expulsar</option><option value="ban">Deletar e banir</option></select></label><label>Mensagem de aviso<textarea name="message" maxlength="2000" rows="3" placeholder="Opcional; usada quando a ação avisa o usuário"></textarea></label></div><label class="antipalavras-words-field">Palavras e frases bloqueadas<textarea name="words" rows="8" maxlength="100500" placeholder="Uma palavra/frase por linha (ou separadas por vírgula)"></textarea><small>Cada entrada é verificada individualmente nas mensagens.</small></label><fieldset class="antilink-options"><legend>Herança</legend><label><input type="checkbox" name="ignoreParent"> Ignorar as regras dos escopos superiores</label></fieldset><div class="antilink-list-grid"><label>Usuários isentos<textarea name="userWhitelist" rows="4" placeholder="um ID por linha"></textarea></label><label>Usuários sempre monitorados<textarea name="userBlacklist" rows="4" placeholder="um ID por linha"></textarea></label>${roleListFields}</div><p class="antilink-form-feedback" id="antipalavrasFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-antipalavras>Cancelar</button><button type="submit" class="primary">Salvar configurações</button></footer></form></dialog>
    <dialog class="antilink-dialog" id="antiraidDialog" aria-labelledby="antiraidDialogTitle"><form id="antiraidForm"><header class="antilink-dialog-heading"><div><h2 id="antiraidDialogTitle">Configurações do antiraid</h2><p id="antiraidScopeLabel"></p></div><button type="button" class="dialog-close" data-close-antiraid aria-label="Fechar">×</button></header><div class="antilink-form-grid"><label>Ação ao detectar raid<select name="action">${antiraidActionOptions}</select></label></div><div class="antiraid-limits-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px"><label>Mensagens no limite<input name="maxMessagesPerWindow" type="number" min="1" max="100" required><small>Máximo de mensagens na janela.</small></label><label>Janela (segundos)<input name="windowSeconds" type="number" min="1" max="300" required></label><label>Mensagens repetidas<input name="repeatedMessageLimit" type="number" min="1" max="100" required></label><label>Links<input name="linkLimit" type="number" min="1" max="100" required></label><label>Convites<input name="inviteLimit" type="number" min="1" max="100" required></label><label>Menções<input name="mentionLimit" type="number" min="0" max="100" required><small>0 desativa o limite de menções.</small></label>${data.platform === "discord" ? '<label>Webhooks<input name="webhookLimit" type="number" min="0" max="100" required><small>0 desativa este limite.</small></label>' : ""}</div><div class="antilink-list-grid"><label>Usuários isentos<textarea name="userWhitelist" rows="4" placeholder="um ID por linha"></textarea></label><label>Usuários sempre monitorados<textarea name="userBlacklist" rows="4" placeholder="um ID por linha"></textarea></label>${roleListFields}</div><p class="antilink-form-feedback" id="antiraidFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-antiraid>Cancelar</button><button type="submit" class="primary">Salvar configurações</button></footer></form></dialog>
    <dialog class="antilink-dialog" id="blockcmdDialog" aria-labelledby="blockcmdDialogTitle"><form id="blockcmdForm"><header class="antilink-dialog-heading"><div><h2 id="blockcmdDialogTitle">Configurações do bloqueio de comandos</h2><p id="blockcmdScopeLabel"></p></div><button type="button" class="dialog-close" data-close-blockcmd aria-label="Fechar">×</button></header><div class="antilink-form-grid"><label>Ação ao usar comando bloqueado<select name="action"><option value="reply">Avisar no chat</option><option value="ignore">Ignorar silenciosamente</option><option value="delete">Apagar a mensagem</option></select></label><label>Mensagem de aviso<textarea name="message" maxlength="2000" rows="3" placeholder="Opcional. Variáveis: {cmd}, {user} e {prefix}"></textarea><small>Usada quando a ação envia um aviso.</small></label></div><label>Comandos e categorias bloqueados<textarea name="blockedCommands" rows="8" maxlength="100500" placeholder="Um comando ou categoria por linha (sem prefixo)"></textarea><small>Use o nome do comando ou de uma categoria. Exemplo: cotacao ou adm/segurança.</small></label><fieldset class="antilink-options"><legend>Herança</legend><label><input type="checkbox" name="ignoreParent"> Ignorar as regras dos escopos superiores</label></fieldset><p class="antilink-form-feedback" id="blockcmdFormFeedback" role="status" aria-live="polite"></p><footer class="antilink-dialog-actions"><button type="button" data-close-blockcmd>Cancelar</button><button type="submit" class="primary">Salvar configurações</button></footer></form></dialog>
    ${autorespostaDialog}
    ${autodownloadDialog}
    ${autoApproveDialog}
    ${rpManagerDialog}
    ${store2Dialog}
    ${localSignalDialog}
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
    const formatStoreMoney=amount=>((Number(amount||0)/100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g," "))+"💷";
    async function requestAdminApi(path,payload={}){
      const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...context,...payload})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Não foi possível carregar as configurações.");
      return result;
    }
    const auditLogsToggle=document.getElementById("auditLogsEnabled");
    const vaultAuditCategoryLabel=document.createElement("label");
    const vaultAuditCategoryInput=document.createElement("input");
    vaultAuditCategoryInput.type="checkbox";
    vaultAuditCategoryInput.dataset.auditCategory="vault";
    vaultAuditCategoryLabel.append(vaultAuditCategoryInput,document.createTextNode(" Movimentações e configurações do cofre"));
    document.querySelector('[data-audit-category="warnings"]').parentElement.append(vaultAuditCategoryLabel);
    document.getElementById("auditLogsEnabled").closest(".moderation-card").querySelector(".moderation-help").textContent=
      "Registra somente alterações feitas no painel web: saldo, loja local, loja de sinais, advertências e movimentações/configurações do cofre.";
    const auditLogCategories=[...document.querySelectorAll("[data-audit-category]")];
    const auditLogsFeedback=document.getElementById("auditLogsFeedback");
    let auditLogsConfig=null;
    function renderAuditLogs(config){
      auditLogsConfig=config;
      auditLogsToggle.checked=config.enabled;
      for(const input of auditLogCategories)input.checked=config.categories[input.dataset.auditCategory]!==false;
    }
    async function saveAuditLogs(){
      if(!auditLogsConfig)return;
      auditLogsToggle.disabled=true;
      for(const input of auditLogCategories)input.disabled=true;
      auditLogsFeedback.classList.remove("error");
      auditLogsFeedback.textContent="";
      try{
        const categories=Object.fromEntries(auditLogCategories.map(input=>[input.dataset.auditCategory,input.checked]));
        const result=await requestAdminApi("/api/account/local/admin-audit-logs",{auditLogs:{enabled:auditLogsToggle.checked,categories}});
        renderAuditLogs(result.auditLogs);
        auditLogsFeedback.textContent="Configurações dos logs salvas.";
      }catch(error){
        renderAuditLogs(auditLogsConfig);
        auditLogsFeedback.classList.add("error");
        auditLogsFeedback.textContent=error.message;
      }finally{
        auditLogsToggle.disabled=false;
        for(const input of auditLogCategories)input.disabled=false;
      }
    }
    requestAdminApi("/api/account/local/admin-audit-logs").then(({auditLogs})=>renderAuditLogs(auditLogs))
      .catch(error=>{auditLogsFeedback.classList.add("error");auditLogsFeedback.textContent=error.message;auditLogsToggle.disabled=true;for(const input of auditLogCategories)input.disabled=true});
    auditLogsToggle.addEventListener("change",saveAuditLogs);
    for(const input of auditLogCategories)input.addEventListener("change",saveAuditLogs);
    let chatControlChannel=null;
    if(context.platform==="discord"||context.platform==="whatsapp"){
      const chatControlPanel=document.createElement("section");chatControlPanel.className="moderation-card";chatControlPanel.style.marginBottom="12px";
      const chatControlTitle=document.createElement("h3");chatControlTitle.textContent="Abrir ou fechar chat";
      const chatControlDescription=document.createElement("p");chatControlDescription.className="moderation-help";chatControlDescription.textContent=context.platform==="discord"?"Selecione um canal de texto ou anúncios do servidor.":"A ação será aplicada ao grupo aberto neste painel.";
      const chatControlStatus=document.createElement("p");chatControlStatus.className="moderation-feedback";chatControlStatus.setAttribute("role","status");chatControlStatus.setAttribute("aria-live","polite");chatControlStatus.textContent=context.platform==="discord"?"Selecione um canal para consultar o estado.":"Consultando o estado do grupo...";
      chatControlPanel.append(chatControlTitle,chatControlDescription,chatControlStatus);
      if(context.platform==="discord"){
        const channelLabel=document.createElement("label");channelLabel.className="moderation-fields";channelLabel.style.marginTop="12px";channelLabel.textContent="Canal";
        chatControlChannel=document.createElement("select");chatControlChannel.innerHTML='<option value="">Carregando canais...</option>';channelLabel.append(chatControlChannel);chatControlPanel.append(channelLabel);
      }
      const chatControlActions=document.createElement("div");chatControlActions.className="moderation-actions";
      const openChatButton=document.createElement("button");openChatButton.type="button";openChatButton.className="moderation-action";openChatButton.textContent="Abrir chat";
      const closeChatButton=document.createElement("button");closeChatButton.type="button";closeChatButton.className="moderation-action danger";closeChatButton.textContent="Fechar chat";
      openChatButton.hidden=true;closeChatButton.hidden=true;
      let chatIsOpen=null;
      let chatStateRequest=0;
      function showChatState(isOpen){
        chatIsOpen=isOpen;
        chatControlStatus.classList.remove("error");
        chatControlStatus.textContent="Estado atual: chat "+(isOpen?"aberto.":"fechado.");
        openChatButton.hidden=isOpen;
        closeChatButton.hidden=!isOpen;
        openChatButton.disabled=false;closeChatButton.disabled=false;
      }
      async function loadChatState(){
        const requestId=++chatStateRequest;
        const channelId=chatControlChannel?.value;
        if(chatControlChannel&&!channelId){
          chatIsOpen=null;openChatButton.hidden=true;closeChatButton.hidden=true;
          chatControlStatus.classList.remove("error");chatControlStatus.textContent="Selecione um canal para consultar o estado.";
          return;
        }
        openChatButton.hidden=true;closeChatButton.hidden=true;
        openChatButton.disabled=true;closeChatButton.disabled=true;
        chatControlStatus.classList.remove("error");chatControlStatus.textContent="Consultando o estado do chat...";
        try{
          const result=await requestAdminApi("/api/account/local/admin-chat-control",{action:"status",channelId});
          if(requestId!==chatStateRequest)return;
          showChatState(result.isOpen);
        }catch(error){
          if(requestId!==chatStateRequest)return;
          chatIsOpen=null;chatControlStatus.classList.add("error");chatControlStatus.textContent=error.message;
        }finally{
          if(requestId===chatStateRequest&&chatIsOpen===null){openChatButton.disabled=false;closeChatButton.disabled=false}
        }
      }
      if(chatControlChannel)chatControlChannel.addEventListener("change",loadChatState);
      async function changeChatState(isOpen){
        if(chatControlChannel&&!chatControlChannel.value){feedback.classList.add("error");feedback.textContent="Selecione um canal para continuar.";return}
        chatStateRequest++;
        openChatButton.disabled=true;closeChatButton.disabled=true;feedback.classList.remove("error");feedback.textContent="Atualizando permissões do chat...";
        if(chatControlChannel)chatControlChannel.disabled=true;
        chatControlStatus.classList.remove("error");chatControlStatus.textContent="Aplicando alteração...";
        try{
          const result=await requestAdminApi("/api/account/local/admin-chat-control",{action:isOpen?"open":"close",channelId:chatControlChannel?.value});
          feedback.textContent="";
          showChatState(result.isOpen);
          chatControlStatus.textContent=result.message+" Estado atual: chat "+(result.isOpen?"aberto.":"fechado.");
        }catch(error){
          feedback.classList.add("error");feedback.textContent=error.message;
          chatControlStatus.classList.add("error");chatControlStatus.textContent=error.message;
          await loadChatState();
        }
        finally{
          if(chatControlChannel){chatControlChannel.disabled=false;const disabled=!chatControlChannel.value||chatIsOpen===null;openChatButton.disabled=disabled;closeChatButton.disabled=disabled}
          else if(chatIsOpen!==null){openChatButton.disabled=false;closeChatButton.disabled=false}
        }
      }
      openChatButton.addEventListener("click",()=>changeChatState(true));
      closeChatButton.addEventListener("click",()=>changeChatState(false));
      chatControlActions.append(openChatButton,closeChatButton);chatControlPanel.append(chatControlActions);
      document.getElementById("rootSettings")?.before(chatControlPanel);
      if(!chatControlChannel)loadChatState();
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
          const field=document.createElement("input");field.type="number";field.min="0";field.step=activeRpSetting==="economy"?"0.01":"1";field.placeholder=activeRpSetting==="economy"?"Valor em SatCoins (carteira)":"Quantidade de XP";field.setAttribute("aria-label","Valor para "+(user.displayName||user.userId));field.style.cssText="grid-column:1/-1;width:100%;padding:9px 10px;border:1px solid var(--line);border-radius:9px;background:#0e121b;color:#f5f7fb;font:inherit";card.append(field);
          appendRpAction(card,"Definir","set",user.userId,field);
          appendRpAction(card,"Adicionar","add",user.userId,field);
          if(activeRpSetting==="economy"||activeRpSetting==="xp")appendRpAction(card,"Retirar","subtract",user.userId,field);
        }
        appendRpAction(card,activeRpSetting==="activity"?"Apagar registro":activeRpSetting==="economy"?"Zerar carteira e cofre":"Zerar valor","reset",user.userId,null);
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
    const monitorLabels={monitorStock:"Monitor da bolsa",monitorCafe:"Monitor do café",monitorWeather:"Monitor do clima",monitorRandomWeather:"Previsão aleatória"};
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
    const localSignalDialog=document.getElementById("localSignalDialog");
    const localSignalForm=document.getElementById("localSignalForm");
    const localSignalFeedback=document.getElementById("localSignalFeedback");
    const localSignalFeatured=document.getElementById("localSignalFeatured");
    let localSignalState=null;
    function setLocalSignalFeedback(message,isError=false){
      localSignalFeedback.classList.toggle("error",isError);
      localSignalFeedback.textContent=message;
    }
    function renderLocalSignalChecks(container,items,selectedValues,namePrefix){
      container.replaceChildren();
      if(!items.length){
        const empty=document.createElement("small");empty.textContent="Nenhum item disponível.";container.append(empty);return;
      }
      const selected=new Set(selectedValues.map(String));
      for(const item of items){
        const value=String(item.value),label=document.createElement("label"),checkbox=document.createElement("input"),copy=document.createElement("span"),title=document.createElement("span"),detail=document.createElement("small");
        label.className="local-signal-check";checkbox.type="checkbox";checkbox.name=namePrefix;checkbox.value=value;checkbox.checked=selected.has(value);
        title.textContent=item.label;detail.textContent=item.detail||"";
        copy.append(title);if(item.detail)copy.append(detail);label.append(checkbox,copy);container.append(label);
      }
    }
    function renderLocalSignalState(result){
      const config=result.localSignalSearch||result;
      localSignalState=config;
      localSignalForm.elements.enabled.checked=config.enabled;
      localSignalForm.elements.price.value=(config.price/100).toFixed(2);
      for(const fieldset of localSignalForm.querySelectorAll("[data-local-signal-tier]")){
        const rarity=fieldset.dataset.localSignalTier,tier=config.tiers[rarity];
        fieldset.elements.chance.value=String(tier.chance);
        fieldset.elements.guaranteeAfter.value=String(tier.guaranteeAfter||0);
        fieldset.elements.cashMin.value=tier.cashMin===null?"":(tier.cashMin/100).toFixed(2);
        fieldset.elements.cashMax.value=tier.cashMax===null?"":(tier.cashMax/100).toFixed(2);
        const botItems=config.botItems.map(item=>({value:item.key,label:item.name,detail:formatStoreMoney(item.price)}));
        const marketItems=config.marketItems.map(item=>({value:item.id,label:"#"+item.id+" · "+item.name,detail:formatStoreMoney(item.price)}));
        const backgrounds=config.backgrounds.map(item=>({value:item.key,label:"Fundo "+item.name,detail:formatStoreMoney(item.price)}));
        const outlines=config.outlines.map(item=>({value:item.key,label:"Outline "+item.name,detail:formatStoreMoney(item.price)}));
        renderLocalSignalChecks(fieldset.querySelector("[data-local-bot-items]"),botItems,tier.botItems,"botItem");
        renderLocalSignalChecks(fieldset.querySelector("[data-local-market-items]"),marketItems,tier.marketItems,"marketItem");
        renderLocalSignalChecks(fieldset.querySelector("[data-local-background-items]"),backgrounds,tier.backgrounds,"backgroundItem");
        renderLocalSignalChecks(fieldset.querySelector("[data-local-outline-items]"),outlines,tier.outlines,"outlineItem");
      }
      const featuredOptions=[
        ...config.botItems.filter(item=>Object.values(config.tiers).some(tier=>tier.botItems.includes(item.key)))
          .map(item=>({value:"bot:"+item.key,label:item.name,detail:"Loja do Bot"})),
        ...config.marketItems.filter(item=>Object.values(config.tiers).some(tier=>tier.marketItems.includes(item.id)))
          .map(item=>({value:"market:"+item.id,label:item.name,detail:"Mercado Local"})),
        ...config.backgrounds.filter(item=>Object.values(config.tiers).some(tier=>tier.backgrounds.includes(item.key)))
          .map(item=>({value:"background:"+item.key,label:"Fundo "+item.name,detail:"Cosmético de perfil"})),
        ...config.outlines.filter(item=>Object.values(config.tiers).some(tier=>tier.outlines.includes(item.key)))
          .map(item=>({value:"outline:"+item.key,label:"Outline "+item.name,detail:"Cosmético de perfil"}))
      ];
      renderLocalSignalChecks(
        localSignalFeatured,
        featuredOptions,
        config.featured.map(item=>item.type==="market"?"market:"+item.id:item.type+":"+item.key),
        "featuredItem"
      );
    }
    async function openLocalSignalDialog(button){
      const scopeLabel=button.closest(".setting-card")?.querySelector(".setting-scope")?.textContent||"Grupo ou servidor";
      document.getElementById("localSignalScopeLabel").textContent=scopeLabel+" · itens e probabilidades da busca local";
      localSignalDialog.showModal();setLocalSignalFeedback("Carregando configuração...");
      try{renderLocalSignalState(await requestAdminApi("/api/account/local/admin-local-signal-search-state"));setLocalSignalFeedback("")}
      catch(error){setLocalSignalFeedback(error.message,true)}
    }
    document.querySelectorAll("[data-local-signal-config]").forEach(button=>button.addEventListener("click",()=>openLocalSignalDialog(button)));
    localSignalDialog.querySelectorAll("[data-close-local-signal]").forEach(button=>button.addEventListener("click",()=>localSignalDialog.close()));
    localSignalDialog.addEventListener("click",event=>{if(event.target===localSignalDialog)localSignalDialog.close()});
    localSignalFeatured.addEventListener("change",event=>{
      const selected=[...localSignalFeatured.querySelectorAll('input[type="checkbox"]:checked')];
      if(selected.length>2){event.target.checked=false;setLocalSignalFeedback("Escolha no máximo dois destaques.",true)}
      else setLocalSignalFeedback("");
    });
    localSignalForm.addEventListener("submit",async event=>{
      event.preventDefault();
      const submit=localSignalForm.querySelector('[type="submit"]');
      const tiers={};
      for(const fieldset of localSignalForm.querySelectorAll("[data-local-signal-tier]")){
        const rarity=fieldset.dataset.localSignalTier;
        const cashMin=fieldset.elements.cashMin.value.trim(),cashMax=fieldset.elements.cashMax.value.trim();
        if(Boolean(cashMin)!==Boolean(cashMax)){setLocalSignalFeedback("Preencha mínimo e máximo de dinheiro, ou deixe ambos vazios.",true);return}
        tiers[rarity]={
          chance:Number(fieldset.elements.chance.value),
          guaranteeAfter:Number(fieldset.elements.guaranteeAfter.value)||null,
          cashMin:cashMin||null,cashMax:cashMax||null,
          botItems:[...fieldset.querySelectorAll("[data-local-bot-items] input:checked")].map(input=>input.value),
          marketItems:[...fieldset.querySelectorAll("[data-local-market-items] input:checked")].map(input=>Number(input.value)),
          backgrounds:[...fieldset.querySelectorAll("[data-local-background-items] input:checked")].map(input=>input.value),
          outlines:[...fieldset.querySelectorAll("[data-local-outline-items] input:checked")].map(input=>input.value)
        };
      }
      const featured=[...localSignalFeatured.querySelectorAll('input[type="checkbox"]:checked')].map(input=>{
        const [type,value]=input.value.split(":");
        return type==="market"?{type,id:Number(value)}:{type,key:value};
      });
      if(featured.length>2){setLocalSignalFeedback("Escolha no máximo dois destaques.",true);return}
      submit.disabled=true;setLocalSignalFeedback("Salvando configuração...");
      try{
        const result=await requestAdminApi("/api/account/local/admin-local-signal-search",{
          config:{enabled:localSignalForm.elements.enabled.checked,price:localSignalForm.elements.price.value,tiers,featured}
        });
        renderLocalSignalState(result);setLocalSignalFeedback("Busca Local salva.");
      }catch(error){setLocalSignalFeedback(error.message,true)}
      finally{submit.disabled=false}
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
        const rarityLabels={comum:"Comum",incomum:"Incomum",raro:"Raro",epico:"Épico",lendario:"Lendário"};
        detail.textContent="#"+item.id+" · "+item.category+(item.rarity?" · Importância: "+(rarityLabels[item.rarity]||item.rarity):"")+" · "+formatStoreMoney(item.price)+" · Estoque: "+(item.quantity===null?"infinito":item.quantity);
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
        detail.textContent=(order.displayName||order.userId)+" · "+formatStoreMoney(order.price)+(order.source==="local-signal-search"?" · Prêmio da Busca Local":"");
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
      const item={name:store2ItemForm.elements.name.value,price:store2ItemForm.elements.price.value,category:store2ItemForm.elements.category.value,quantity:store2ItemForm.elements.quantity.value,rarity:store2ItemForm.elements.rarity.value||null};
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
        store2ItemForm.elements.rarity.value=item.rarity||"";
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
    document.addEventListener("click",event=>{
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
      const button=event.target.closest("[data-setting]");
      if(button)saveSetting(button);
    });
    if(context.platform==="discord"){
      const logsChannelSelect=document.getElementById("logsChannelSelect");
      requestAdminApi("/api/account/local/admin-systems-options").then(({chatChannels,logChannels,logChannelId})=>{
        if(chatControlChannel){
          chatControlChannel.innerHTML='<option value="">Selecione um canal</option>';
          for(const channel of chatChannels||[]){const option=document.createElement("option");option.value=channel.id;option.textContent=channel.name;chatControlChannel.append(option)}
        }
        for(const channel of logChannels||[]){const option=document.createElement("option");option.value=channel.id;option.textContent=channel.name;logsChannelSelect.append(option)}
        logsChannelSelect.value=logChannelId||"";
      }).catch(error=>{feedback.classList.add("error");feedback.textContent=error.message;if(chatControlChannel)chatControlChannel.innerHTML='<option value="">Não foi possível carregar os canais</option>'});
      logsChannelSelect.addEventListener("change",async()=>{
        logsChannelSelect.disabled=true;feedback.classList.remove("error");feedback.textContent="";
        try{
          const result=await requestAdminApi("/api/account/local/admin-log-channel",{channelId:logsChannelSelect.value});
          logsChannelSelect.value=result.logChannelId||"";
          feedback.textContent=result.message;
        }catch(error){feedback.classList.add("error");feedback.textContent=error.message}
        finally{logsChannelSelect.disabled=false}
      });
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
  return adminHtml
    .replace(/<dialog class="antilink-dialog" id="antimediaDialog"[\s\S]*?<\/dialog>/, "")
    .replace(/<dialog class="antilink-dialog" id="antipalavrasDialog"[\s\S]*?<\/dialog>/, "")
    .replace(/<dialog class="antilink-dialog" id="antiraidDialog"[\s\S]*?<\/dialog>/, "")
    .replace(/<dialog class="antilink-dialog" id="blockcmdDialog"[\s\S]*?<\/dialog>/, "");
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
  const cosmetics = economy.getProfileCosmetics(message, userId);
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
      balance: account ? economy.getTotalBalance(account) : 0,
      walletBalance: Number(account?.balance) || 0,
      vaultBalance: Number(account?.vaultBalance) || 0,
      position: account ? economy.getBalancePosition(message, userId) : null,
      background: cosmetics.background,
      outline: cosmetics.outline,
      circle: cosmetics.circle,
      effect: cosmetics.effect
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

function renderSignalSearchDemo(botName) {
  const safeBotName = escapeHtml(botName);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Busca de Sinais · ${safeBotName}</title><style>
    :root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#090d18;color:#f5f7fb}*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:24px;background:radial-gradient(ellipse at 50% 20%,#193452 0,transparent 42%),linear-gradient(145deg,#090d18,#111324 70%,#1a1025)}button,a{font:inherit}.signal-page{width:min(900px,100%);margin:0 auto}.signal-topbar{display:flex;justify-content:space-between;gap:12px;padding:8px 0 20px;border-bottom:1px solid #ffffff18}.signal-topbar a{color:#a7dafa;text-decoration:none;font-weight:700}.signal-topbar span{color:#9ba9c0;font-size:12px}.signal-hero{margin:26px 0 18px;text-align:center}.signal-kicker{color:#84d7ed;font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase}.signal-hero h1{margin:10px 0;font-size:clamp(30px,6vw,48px);letter-spacing:-.04em}.signal-hero p{max-width:620px;margin:0 auto;color:#aab8cf;line-height:1.6}.signal-stage{position:relative;display:grid;min-height:390px;place-items:center;overflow:hidden;border:1px solid #73c9ec44;border-radius:24px;background:radial-gradient(ellipse at center,#1d3853aa,transparent 58%),linear-gradient(145deg,#101d30,#0c1220 60%,#151326);box-shadow:0 24px 80px #0007}.signal-stage:before,.signal-stage:after{position:absolute;content:"";border:1px solid #8ce2f020;border-radius:50%;aspect-ratio:1}.signal-stage:before{width:min(70vw,430px)}.signal-stage:after{width:min(54vw,330px)}.signal-grid{position:absolute;inset:0;opacity:.22;background-image:linear-gradient(#8ce2f01b 1px,transparent 1px),linear-gradient(90deg,#8ce2f01b 1px,transparent 1px);background-size:38px 38px;mask-image:radial-gradient(ellipse,#000 15%,transparent 78%)}.signal-orb{position:absolute;width:170px;height:170px;border:1px solid #9de7ff66;border-radius:50%;background:radial-gradient(circle at 38% 34%,#b5f2ffdd 0,#62c6ed88 10%,#25527c66 36%,#10203944 69%,transparent 70%);box-shadow:0 0 36px #61cdef55,inset 0 0 35px #8fe6ff55;transition:transform .5s ease,filter .5s ease}.signal-orb:before,.signal-orb:after{position:absolute;inset:-14px;content:"";border:1px solid #85def044;border-radius:50%;transform:rotateX(68deg)}.signal-orb:after{transform:rotateY(68deg)}.signal-beam{position:absolute;z-index:1;top:8%;left:0;width:100%;height:2px;opacity:0;background:linear-gradient(90deg,transparent,#9cf3ff,#ffffff, #9cf3ff,transparent);box-shadow:0 0 20px #70dcff;transform:translateY(0)}.signal-result{position:relative;z-index:2;display:grid;justify-items:center;gap:10px;width:min(290px,75%);padding:22px;border:1px solid #ffffff20;border-radius:18px;background:#0a1020e8;text-align:center;opacity:0;transform:translateY(25px) scale(.92);transition:opacity .35s ease,transform .45s cubic-bezier(.2,.8,.2,1);backdrop-filter:blur(8px)}.signal-result-icon{display:grid;width:84px;height:84px;place-items:center;border:1px solid #76d9f077;border-radius:24px;background:linear-gradient(145deg,#19405a,#17233d);color:#aff0ff;font-size:36px;box-shadow:0 0 30px #4cccf333}.signal-result strong{font-size:20px}.signal-result small{color:#9eb0c8}.signal-rarity{color:#8edbf2;font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.signal-stage.is-running .signal-orb{animation:orb-pulse .9s ease-in-out infinite alternate}.signal-stage.is-running .signal-beam{opacity:1;animation:scan 1.15s ease-in-out infinite alternate}.signal-stage.is-running .signal-grid{animation:grid-flicker .22s steps(2) infinite}.signal-stage.is-revealed .signal-orb{transform:scale(2.2);filter:brightness(1.7);opacity:.2}.signal-stage.is-revealed .signal-result{opacity:1;transform:translateY(0) scale(1)}.signal-stage.is-epic{border-color:#d8a4ff99;box-shadow:0 24px 90px #6c36a566,inset 0 0 55px #954ed222}.signal-stage.is-epic .signal-orb{background:radial-gradient(circle at 38% 34%,#fff0cddd 0,#e5a5ff99 12%,#7049a188 40%,#1a164466 70%,transparent 71%);box-shadow:0 0 60px #d391ff99,inset 0 0 35px #e4b7ff66}.signal-stage.is-epic .signal-result-icon{border-color:#e4b5ff99;background:linear-gradient(145deg,#613b7b,#30224b);color:#f5d6ff;box-shadow:0 0 40px #d282ff66}.signal-stage.is-epic .signal-rarity{color:#e2a8ff}.signal-controls{display:flex;justify-content:center;flex-wrap:wrap;gap:12px;margin:20px 0}.signal-button{min-height:48px;padding:11px 18px;border:1px solid #67c7e866;border-radius:12px;background:#30a9d91b;color:#d9f7ff;font-weight:800;cursor:pointer;transition:transform .15s ease,background .15s ease}.signal-button:hover:not(:disabled){transform:translateY(-2px);background:#30a9d933}.signal-button.epic{border-color:#d39afa88;background:#a458d21c;color:#f2dfff}.signal-button.epic:hover:not(:disabled){background:#a458d23a}.signal-button:disabled{opacity:.5;cursor:wait}.signal-status{min-height:24px;margin:0 auto;color:#9eb0c8;text-align:center;font-size:13px}.signal-status.error{color:#ffabb5}.signal-note{margin-top:22px;padding:14px 16px;border:1px solid #ffffff14;border-radius:12px;background:#ffffff06;color:#8493aa;font-size:12px;line-height:1.6}.signal-note strong{color:#c6d1e4}@keyframes scan{to{transform:translateY(350px)}}@keyframes orb-pulse{to{transform:scale(1.12);filter:brightness(1.35)}}@keyframes grid-flicker{50%{opacity:.42}}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}@media(max-width:600px){body{padding:16px}.signal-stage{min-height:330px}.signal-topbar{align-items:flex-start;flex-direction:column}.signal-orb{width:140px;height:140px}}
    .signal-card-scene{position:absolute;z-index:3;display:grid;place-items:center;width:100%;height:100%;perspective:1200px;opacity:0;pointer-events:none;transition:opacity .25s ease}.signal-stage.is-revealed .signal-card-scene{opacity:1}.signal-card-camera{--camera-x:0deg;--camera-y:0deg;transform-style:preserve-3d}.signal-stage.is-revealed .signal-card-camera{animation:camera-sweep 4.8s ease-in-out 1.1s infinite alternate}.signal-card{position:relative;width:min(250px,64vw);height:330px;transform-style:preserve-3d;opacity:0}.signal-stage.is-revealed .signal-card{animation:card-unseal 1.05s cubic-bezier(.16,.76,.25,1) both,card-float 3.4s ease-in-out 1.05s infinite alternate}.signal-card-face{position:absolute;inset:0;overflow:hidden;display:flex;flex-direction:column;border:1px solid #9de7ff99;border-radius:19px;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:linear-gradient(155deg,#173b56,#101a2d 58%,#101423);box-shadow:0 20px 55px #0009,inset 0 0 0 5px #8ce2f012,inset 0 0 26px #72d9f022}.signal-card-face:before{position:absolute;inset:8px;content:"";border:1px solid #9de7ff24;border-radius:13px;pointer-events:none}.signal-card-back{align-items:center;justify-content:center;gap:24px;transform:rotateY(180deg);background:radial-gradient(circle,#285678,#10182a 67%)}.signal-card-back-mark{color:#bbf2ff;font-size:64px;text-shadow:0 0 35px #6edaff}.signal-card-back-label{text-align:center;color:#bdeafa;font-size:20px;font-weight:900;letter-spacing:.28em;line-height:1.5}.signal-card-back-code{position:absolute;bottom:25px;color:#7199ae;font-size:10px;letter-spacing:.2em}.signal-card-front{padding:17px 17px 14px;transform:rotateY(0deg)}.signal-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.signal-rarity{color:#91def5;font-size:9px;font-weight:900;letter-spacing:.17em}.signal-card-stars{color:#8fdef4;font-size:12px;letter-spacing:2px}.signal-card-art{position:relative;display:grid;flex:1;min-height:0;place-items:center;margin:15px 0 10px;overflow:hidden;border:1px solid #9de7ff24;border-radius:12px;background:radial-gradient(ellipse at 50% 48%,#3679a955,transparent 58%),linear-gradient(145deg,#162d45,#101425)}.signal-card-art:before,.signal-card-art:after{position:absolute;content:"";width:170px;height:170px;border:1px solid #8ce2f02b;border-radius:50%;transform:rotateX(68deg)}.signal-card-art:after{transform:rotateY(68deg)}.signal-card-art-orbit{position:absolute;width:118px;height:118px;border:1px solid #a3eaff8a;border-radius:50%;box-shadow:0 0 30px #51c9f955,inset 0 0 25px #58c8ec22}.signal-card-art-core{position:relative;z-index:1;display:grid;width:76px;height:76px;place-items:center;border:1px solid #d5f7ffbb;border-radius:24px;background:radial-gradient(circle at 35% 30%,#e0fbff,#60c4e7 38%,#24537b 100%);color:#fff;font-size:37px;box-shadow:0 0 35px #70dcffbb,inset 0 0 18px #e6fbff88}.signal-card-art-glint{position:absolute;top:17%;right:19%;color:#e6fcff;font-size:26px;text-shadow:0 0 14px #9eeaff}.signal-card-copy{display:grid;gap:5px}.signal-card-type,.signal-card-index{color:#91a9be;font-size:8px;font-weight:800;letter-spacing:.14em}.signal-card-copy strong{font-size:17px;line-height:1.15}.signal-card-copy small{color:#b4c3d5;font-size:10px}.signal-card-index{margin-top:11px;font-size:7px}.signal-stage.is-epic .signal-card-face{border-color:#ebc0ff;background:linear-gradient(155deg,#633c79,#261f43 58%,#151426);box-shadow:0 20px 65px #6d319799,inset 0 0 0 5px #f4d0ff12,inset 0 0 34px #d787ff55}.signal-stage.is-epic .signal-card-face:before{border-color:#f0d7ff44}.signal-stage.is-epic .signal-card-art{background:radial-gradient(ellipse at 50% 48%,#a857c877,transparent 58%),linear-gradient(145deg,#392749,#171527)}.signal-stage.is-epic .signal-card-art-orbit{border-color:#edc0ffcc;box-shadow:0 0 40px #d27bff99,inset 0 0 25px #d27bff44}.signal-stage.is-epic .signal-card-art-core{border-color:#f6ddff;background:radial-gradient(circle at 35% 30%,#fff5ff,#db9fff 38%,#75439c 100%);box-shadow:0 0 42px #d584ffdd,inset 0 0 18px #fff3ff}.signal-stage.is-epic .signal-card-stars,.signal-stage.is-epic .signal-rarity{color:#edc1ff}.signal-stage.is-epic .signal-card-art-glint{color:#fff0ff;text-shadow:0 0 16px #dfa0ff}@keyframes card-unseal{0%{opacity:0;transform:rotateY(180deg) rotateX(14deg) scale(.68) translateY(22px)}65%{opacity:1;transform:rotateY(-12deg) rotateX(-4deg) scale(1.04)}100%{opacity:1;transform:rotateY(0) rotateX(0) scale(1)}}@keyframes camera-sweep{0%{transform:perspective(1200px) rotateX(calc(var(--camera-x) - 5deg)) rotateY(calc(var(--camera-y) - 10deg))}50%{transform:perspective(1200px) rotateX(calc(var(--camera-x) + 3deg)) rotateY(calc(var(--camera-y) + 7deg))}100%{transform:perspective(1200px) rotateX(calc(var(--camera-x) - 2deg)) rotateY(calc(var(--camera-y) + 12deg))}}@keyframes card-float{to{translate:0 -7px}}@media(max-width:600px){.signal-card{width:min(220px,70vw);height:300px}}@media(prefers-reduced-motion:reduce){.signal-stage.is-revealed .signal-card-camera,.signal-stage.is-revealed .signal-card{animation-duration:.01ms!important;animation-iteration-count:1!important}}
  </style></head><body><style>
    .signal-ten-results{position:absolute;inset:0;z-index:4;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:10px;padding:22px;align-content:center}.signal-ten-results[hidden]{display:none!important}.signal-stage.is-results{min-height:470px}.signal-stage.is-results .signal-card-scene,.signal-stage.is-results .signal-orb,.signal-stage.is-results .signal-beam{display:none}.signal-mini-card{position:relative;display:flex;min-width:0;flex-direction:column;justify-content:space-between;overflow:hidden;padding:13px;border:1px solid #78cce477;border-radius:12px;background:radial-gradient(circle at 50% 38%,#27638b66,transparent 58%),linear-gradient(155deg,#173b56,#101a2d 58%,#101423);box-shadow:0 10px 24px #0006;animation:mini-card-in .35s ease both}.signal-mini-card.is-epic{border-color:#e8b3ff;background:radial-gradient(circle at 50% 38%,#ad5bc877,transparent 58%),linear-gradient(155deg,#633c79,#261f43 58%,#151426);box-shadow:0 8px 26px #853da944}.signal-mini-card.is-new:after{position:absolute;top:7px;right:7px;padding:4px 6px;border:1px solid #f5d0ff88;border-radius:6px;background:#a458d255;color:#ffe8ff;content:"NOVO";font-size:8px;font-weight:900;letter-spacing:.1em}.signal-mini-rarity{font-size:8px;font-weight:900;letter-spacing:.12em;color:#a5eaff}.signal-mini-card.is-epic .signal-mini-rarity{color:#efc5ff}.signal-mini-art{display:grid;flex:1;place-items:center;margin:10px 0;border:1px solid #ffffff20;border-radius:9px;background:#07101c55;color:#b9f1ff;font-size:30px;text-shadow:0 0 20px currentColor}.signal-mini-card.is-epic .signal-mini-art{color:#f3c8ff}.signal-mini-card strong{font-size:11px;line-height:1.2}.signal-mini-card small{margin-top:4px;color:#aab8cf;font-size:8px;line-height:1.3}.signal-mini-card.is-owned{filter:saturate(.62);border-style:dashed}.signal-mini-card.is-owned:before{position:absolute;right:7px;bottom:7px;color:#c0c9d8;content:"DUPLICADO";font-size:7px;font-weight:800;letter-spacing:.08em}.signal-collection{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin:10px auto 0;color:#9eb0c8;font-size:12px}.signal-reset-collection{padding:5px 9px;border:1px solid #ffffff20;border-radius:8px;background:#ffffff08;color:#c6d1e4;font-size:11px;cursor:pointer}.signal-reset-collection:hover{border-color:#d39afa88}.signal-button.x10{border-color:#7e85ff88;background:#7267e522;color:#e3ddff}.signal-stage.is-epic.is-running{border-color:#d8a4ff99}@keyframes mini-card-in{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}@media(max-width:600px){.signal-ten-results{grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:none;grid-auto-rows:145px;gap:8px;padding:14px}.signal-stage.is-results{min-height:790px}.signal-mini-card{padding:10px}.signal-mini-art{margin:6px 0;font-size:24px}}@media(prefers-reduced-motion:reduce){.signal-mini-card{animation:none}}
  </style><main class="signal-page">
    <nav class="signal-topbar"><a href="/dashboard">← Voltar ao dashboard</a><span>${safeBotName} · Experimento visual</span></nav>
    <header class="signal-hero"><div class="signal-kicker">Simulação independente · sem custos ou prêmios reais</div><h1>Busca de Sinais</h1><p>O sinal se abre e revela cartões 3D de recompensa. No x10, especiais inéditos são apresentados um a um antes dos dez resultados aparecerem lado a lado.</p></header>
    <section id="signalStage" class="signal-stage" aria-label="Animação de busca de sinais">
      <div class="signal-grid" aria-hidden="true"></div><div class="signal-orb" aria-hidden="true"></div><div class="signal-beam" aria-hidden="true"></div>
      <div class="signal-card-scene" aria-live="polite"><div class="signal-card-camera"><article id="signalCard" class="signal-card">
        <div class="signal-card-face signal-card-back" aria-hidden="true"><span class="signal-card-back-mark">✦</span><span class="signal-card-back-label">SIGNAL<br>SEARCH</span><span class="signal-card-back-code">SS · 01</span></div>
        <div class="signal-card-face signal-card-front"><div class="signal-card-top"><span id="signalRarity" class="signal-rarity"></span><span id="signalStars" class="signal-card-stars" aria-label="raridade">✦ ✦ ✦</span></div><div class="signal-card-art" aria-hidden="true"><span class="signal-card-art-orbit"></span><span class="signal-card-art-core" id="signalCardIcon">✦</span><span class="signal-card-art-glint">✧</span></div><div class="signal-card-copy"><span class="signal-card-type">RECOMPENSA DE DEMONSTRAÇÃO</span><strong id="signalItem"></strong><small id="signalItemDetail"></small></div><span class="signal-card-index">SIGNAL ARCHIVE · 001</span></div>
      </article></div></div>
      <div id="signalTenResults" class="signal-ten-results" role="list" aria-label="Dez recompensas da simulação" hidden></div>
    </section>
    <div class="signal-controls"><button class="signal-button" type="button" data-signal-result="normal">Simular prêmio normal</button><button class="signal-button epic" type="button" data-signal-result="epic">Simular prêmio raro / épico</button><button class="signal-button x10" type="button" data-signal-result="x10">Simular x10</button><button id="signalNext" class="signal-button epic" type="button" hidden>Próximo especial</button></div>
    <div class="signal-collection"><span id="signalCollectionStatus">Especiais inéditos nesta sessão: 0</span><button id="resetSignalCollection" class="signal-reset-collection" type="button">Limpar coleção de teste</button></div>
    <p id="signalStatus" class="signal-status" role="status" aria-live="polite">Aguardando uma simulação.</p>
    <p class="signal-note"><strong>Modo de teste:</strong> os botões simulam resultados; nada é comprado ou conectado aos dados do bot. Os especiais obtidos ficam apenas na memória desta página e são apagados ao recarregar ou limpar a coleção. O x10 sorteia resultados de demonstração e apresenta apenas especiais ainda não obtidos.</p>
    <audio id="normalSignalAudio" preload="none" src="/sinal.mp3"></audio><audio id="epicSignalAudio" preload="none" src="/sinal2.mp3"></audio>
  </main><script>
    const stage=document.getElementById("signalStage");
    const status=document.getElementById("signalStatus");
    const cardCamera=document.querySelector(".signal-card-camera");
    const buttons=[...document.querySelectorAll("[data-signal-result]")];
    const nextButton=document.getElementById("signalNext");
    const resultGrid=document.getElementById("signalTenResults");
    const collectionStatus=document.getElementById("signalCollectionStatus");
    const collection=new Set();
    const normalItems=[
      {id:"normal-tuning",name:"Pingente de Sintonização",detail:"Sinal estável · Classe B",icon:"◈"},
      {id:"normal-pulse",name:"Pulso de Frequência",detail:"Eco comum · Classe B",icon:"⌁"},
      {id:"normal-prism",name:"Fragmento Prisma",detail:"Frequência clara · Classe B",icon:"◇"},
      {id:"normal-echo",name:"Eco Metálico",detail:"Ressonância leve · Classe B",icon:"⌘"}
    ];
    const specialItems=[
      {id:"special-aurora",name:"Núcleo de Aurora",detail:"Ressonância excepcional · Classe S",icon:"✧"},
      {id:"special-prism",name:"Prisma Boreal",detail:"Frequência extraordinária · Classe S",icon:"❖"},
      {id:"special-eclipse",name:"Fragmento de Eclipse",detail:"Sinal transcendente · Classe S",icon:"☼"}
    ];
    let isBusy=false;
    let continuePresentation=null;
    const wait=duration=>new Promise(resolve=>window.setTimeout(resolve,duration));
    async function playSignalAudio(type){
      const audio=document.getElementById(type==="epic"?"epicSignalAudio":"normalSignalAudio");
      try{
        [document.getElementById("normalSignalAudio"),document.getElementById("epicSignalAudio")].forEach(track=>{track.pause();track.currentTime=0});
        await audio.play();
        return "";
      }
      catch(error){console.warn("[WEB] Áudio da demo de sinais indisponível:",error.message||error);return " Áudio não tocou; verifique se "+(type==="epic"?"sinal2.mp3":"sinal.mp3")+" está na raiz do projeto e se o navegador permite reprodução."}
    }
    function updateCollectionStatus(){
      collectionStatus.textContent="Especiais inéditos nesta sessão: "+collection.size;
    }
    function resetStage(){
      stage.classList.remove("is-running","is-revealed","is-epic","is-results");
      nextButton.hidden=true;
      resultGrid.hidden=true;
      resultGrid.replaceChildren();
      cardCamera.style.setProperty("--camera-x","0deg");
      cardCamera.style.setProperty("--camera-y","0deg");
    }
    function setPresentationCard(item){
      const epic=item.rarity==="epic";
      stage.classList.remove("is-running","is-epic","is-revealed");
      document.getElementById("signalRarity").textContent=epic?"ÉPICO":"NORMAL";
      document.getElementById("signalItem").textContent=item.name;
      document.getElementById("signalItemDetail").textContent=item.detail;
      document.getElementById("signalStars").textContent=epic?"✦ ✦ ✦ ✦ ✦":"✦ ✦ ✦";
      document.getElementById("signalCardIcon").textContent=item.icon;
      if(epic)stage.classList.add("is-epic");
      void document.getElementById("signalCard").offsetWidth;
      stage.classList.add("is-revealed");
    }
    function waitForPresentationAdvance(label,message){
      nextButton.textContent=label;
      nextButton.hidden=false;
      status.textContent=message;
      nextButton.focus();
      return new Promise(resolve=>{continuePresentation=()=>{nextButton.hidden=true;continuePresentation=null;resolve()}});
    }
    function renderTenResults(results,newlyObtained){
      const markedNew=new Set();
      resultGrid.replaceChildren(...results.map((item,index)=>{
        const card=document.createElement("article");
        const isNew=item.rarity==="epic"&&newlyObtained.has(item.id)&&!markedNew.has(item.id);
        const isOwned=item.rarity==="epic"&&collection.has(item.id)&&!isNew;
        if(isNew)markedNew.add(item.id);
        card.className="signal-mini-card"+(item.rarity==="epic"?" is-epic":"")+(isNew?" is-new":"")+(isOwned?" is-owned":"");
        card.setAttribute("role","listitem");
        card.style.animationDelay=(index*45)+"ms";
        const rarity=document.createElement("span");
        rarity.className="signal-mini-rarity";
        rarity.textContent=item.rarity==="epic"?"ÉPICO":"NORMAL";
        const art=document.createElement("span");
        art.className="signal-mini-art";
        art.setAttribute("aria-hidden","true");
        art.textContent=item.icon;
        const name=document.createElement("strong");
        name.textContent=item.name;
        const detail=document.createElement("small");
        detail.textContent=item.detail;
        card.append(rarity,art,name,detail);
        return card;
      }));
      resultGrid.hidden=false;
      stage.classList.remove("is-running","is-revealed");
      stage.classList.add("is-results");
    }
    async function revealSpecials(items,newlyObtained){
      for(let index=0;index<items.length;index++){
        if(index>0){stage.classList.remove("is-revealed","is-epic");stage.classList.add("is-running");await wait(420)}
        setPresentationCard(items[index]);
        collection.add(items[index].id);
        newlyObtained.add(items[index].id);
        updateCollectionStatus();
        if(items.length>1){
          const isLast=index===items.length-1;
          await wait(1100);
          await waitForPresentationAdvance(
            isLast?"Ver os 10 resultados":"Próximo especial",
            "Especial "+(index+1)+" de "+items.length+" apresentado."+(isLast?" Clique para ver os dez resultados.":" Clique em Próximo especial para continuar.")
          );
        }else await wait(1450);
      }
    }
    async function simulateSignal(type){
      if(isBusy)return;
      isBusy=true;
      buttons.forEach(button=>button.disabled=true);
      resetStage();
      status.classList.remove("error");
      try{
        if(type==="x10"){
          const results=Array.from({length:10},()=>Math.random()<0.12
            ? {...specialItems[Math.floor(Math.random()*specialItems.length)],rarity:"epic"}
            : {...normalItems[Math.floor(Math.random()*normalItems.length)],rarity:"normal"});
          const newSpecials=[...new Map(results.filter(item=>item.rarity==="epic"&&!collection.has(item.id)).map(item=>[item.id,item])).values()];
          const newlyObtained=new Set();
          stage.classList.add("is-running");
          status.textContent="Fazendo dez buscas...";
          let audioNotice=await playSignalAudio(newSpecials.length?"epic":"normal");
          await wait(1500);
          if(newSpecials.length){
            status.textContent="Sinal especial detectado!";
            await revealSpecials(newSpecials,newlyObtained);
          }
          renderTenResults(results,newlyObtained);
          const revealedIds=new Set();
          const duplicateSpecials=results.filter(item=>{
            if(item.rarity!=="epic")return false;
            if(!newlyObtained.has(item.id)||revealedIds.has(item.id))return true;
            revealedIds.add(item.id);
            return false;
          }).length;
          status.textContent=newSpecials.length
            ? "Busca x10 concluída · "+newSpecials.length+" especial(is) inédito(s) apresentado(s) · "+duplicateSpecials+" duplicado(s)."+audioNotice
            : "Busca x10 concluída · nenhum especial inédito; os dez resultados aparecem juntos."+audioNotice;
          if(audioNotice)status.classList.add("error");
          return;
        }
        stage.classList.add("is-running");
        status.textContent="Procurando sinal...";
        const audioNotice=await playSignalAudio(type);
        await wait(1500);
        const item=type==="epic"
          ? {...specialItems[0],rarity:"epic"}
          : {...normalItems[0],rarity:"normal"};
        setPresentationCard(item);
        if(item.rarity==="epic"){
          collection.add(item.id);
          updateCollectionStatus();
        }
        status.textContent=(type==="epic"?"Prêmio épico":"Prêmio normal")+" recebido!"+audioNotice;
        if(audioNotice)status.classList.add("error");
      }finally{
        isBusy=false;
        buttons.forEach(button=>button.disabled=false);
      }
    }
    document.getElementById("resetSignalCollection").addEventListener("click",()=>{
      if(isBusy)return;
      collection.clear();
      updateCollectionStatus();
      status.classList.remove("error");
      status.textContent="Coleção temporária limpa.";
    });
    nextButton.addEventListener("click",()=>{if(continuePresentation)continuePresentation()});
    stage.addEventListener("pointermove",event=>{
      if(!stage.classList.contains("is-revealed"))return;
      const bounds=stage.getBoundingClientRect();
      const horizontal=(event.clientX-bounds.left)/bounds.width-.5;
      const vertical=(event.clientY-bounds.top)/bounds.height-.5;
      cardCamera.style.setProperty("--camera-y",(horizontal*24).toFixed(1)+"deg");
      cardCamera.style.setProperty("--camera-x",(vertical*-18).toFixed(1)+"deg");
    });
    stage.addEventListener("pointerleave",()=>{
      cardCamera.style.setProperty("--camera-x","0deg");
      cardCamera.style.setProperty("--camera-y","0deg");
    });
    buttons.forEach(button=>button.addEventListener("click",()=>simulateSignal(button.dataset.signalResult)));
  </script></body></html>`;
}

function homeStyles() {
  return `:root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb;--text:#f5f7fb;--muted:#9da8bd;--line:#334366}*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:0 28px;background:radial-gradient(ellipse at 50% -18%,#344779 0,transparent 48%),radial-gradient(circle at 95% 82%,#432d67 0,transparent 30%),linear-gradient(155deg,#111522 0%,#0c1019 65%,#10121d 100%)}button,input{font-family:inherit}a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid #a99dff;outline-offset:3px}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.01ms!important}}`;
}

function renderChangelog(botName) {
  const changelog = getCurrentChangelog();
  const renderList = items => items.map(item => `<li>${escapeHtml(item)}</li>`).join("");
  const platformLabels = { whatsapp: "WhatsApp", discord: "Discord", telegram: "Telegram" };
  const summaries = Object.entries(changelog.platformSummaries)
    .map(([platform, summary]) => `<article class="summary-card"><h3>${platformLabels[platform]}</h3><p>${escapeHtml(summary)}</p></article>`)
    .join("");

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>Novidades · ${escapeHtml(botName)}</title><style>
    ${homeStyles()}
    .release-page{width:min(900px,100%);margin:0 auto;padding:28px 0 52px}
    .button{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:9px 13px;border:1px solid var(--line);border-radius:11px;background:#ffffff08;color:var(--text);font-size:13px;font-weight:700;text-decoration:none}
    .button:hover{border-color:#8599ff88;background:#8599ff12}
    .release-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:20px;border-bottom:1px solid var(--line)}
    .release-links{display:flex;flex-wrap:wrap;gap:10px}
    .release-hero{margin:28px 0 18px;padding:27px;border:1px solid #8b7bff44;border-radius:20px;background:linear-gradient(125deg,#8877ff20,#577cff0c)}
    .release-eyebrow{color:#b9c6ff;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
    .release-hero h1{margin:8px 0;font-size:clamp(28px,5vw,40px)}
    .release-hero p{margin:0;color:#c1c9df;line-height:1.6}
    .release-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .release-card{padding:21px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,#171d2b,#131925)}
    .release-card h2{margin:0 0 12px;font-size:18px}
    .release-card ul{display:grid;gap:11px;margin:0;padding-left:20px;color:#c4cce0;line-height:1.6}
    .release-card li::marker{color:#a99dff}
    .platform-summaries{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}
    .summary-card{padding:17px;border:1px solid #ffffff12;border-radius:14px;background:#ffffff05}
    .summary-card h3{margin:0 0 7px;font-size:14px}
    .summary-card p{margin:0;color:#b9c4d9;font-size:12px;line-height:1.6}
    @media(max-width:680px){body{padding:0 18px}.release-page{padding-top:20px}.release-grid,.platform-summaries{grid-template-columns:1fr}.release-nav{align-items:flex-start}}
  </style></head><body><main class="release-page">
    <nav class="release-nav" aria-label="Navegação principal"><a class="button" href="/">← Home</a><div class="release-links"><a class="button" href="/dashboard">Dashboard</a><a class="button" href="/novidades">Novidades</a></div></nav>
    <header class="release-hero"><span class="release-eyebrow">Versão atual</span><h1>Novidades · v${escapeHtml(changelog.version)}</h1><p>Resumo desta versão. As notas são atualizadas junto com o conteúdo centralizado do changelog.</p></header>
    <div class="release-grid" style="${changelog.features.length ? "" : "grid-template-columns:1fr"}">
      ${changelog.features.length ? `<section class="release-card"><h2>✨ Novas funções</h2><ul>${renderList(changelog.features)}</ul></section>` : ""}
      <section class="release-card"><h2>🛠️ Correções</h2><ul>${renderList(changelog.fixes)}</ul></section>
    </div>
    ${summaries ? `<section class="release-card" style="margin-top:14px"><h2>🌐 Resumo por plataforma</h2><div class="platform-summaries">${summaries}</div></section>` : ""}
  </main></body></html>`;
}

function renderHome(botName, central = null, loginError = "", hasSession = Boolean(central)) {
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
    .top-actions{display:flex;align-items:center;justify-content:flex-end;gap:12px;flex-wrap:wrap}
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
    @media(max-width:720px){.dashboard{padding:22px 0 38px}.welcome{padding:26px}.stats{grid-template-columns:1fr}.account-layout{grid-template-columns:1fr}.account-menu{grid-template-columns:1fr}.account-action{min-height:0}.topbar{align-items:flex-start}.top-actions{gap:7px}.secure-badge{display:none}}
    @media(max-width:480px){.nofap-overview{grid-template-columns:auto 1fr}.nofap-overview strong{grid-column:2;text-align:left}}
    @media(max-width:420px){body{padding:0 18px}.topbar{padding-bottom:18px}.brand-mark{width:38px;height:38px}.top-actions{gap:6px}.button{padding:9px 11px;font-size:12px}.welcome{padding:23px 20px}.platform-card .connected{font-size:0}.platform-card .connected:before{width:8px;height:8px}}
  </style>
</head>
<body>
  <main class="dashboard">
    <nav class="topbar" aria-label="Navegação principal">
        <div class="brand"><span class="brand-mark">✦</span><span>${safeBotName}<small>PAINEL DA CONTA</small></span></div>
        <div class="top-actions"><a class="button" href="/">Home</a><a class="button" href="/novidades">Novidades</a><span class="secure-badge">Sessão protegida</span><button class="button" id="logout" type="button">Sair <span aria-hidden="true">↗</span></button></div>
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
    .top-actions{display:flex;align-items:center;justify-content:flex-end;gap:12px;flex-wrap:wrap}
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
    @media(max-width:480px){body{padding:0 18px}.topbar{padding:19px 0;gap:10px}.top-actions{gap:7px}.brand-mark{width:38px;height:38px}.top-link{font-size:11px}.top-actions .button{padding:9px 10px;font-size:11px}.hero{padding:26px 21px;border-radius:21px}.hero h1{font-size:43px}.hero-copy{font-size:14px}.hero-art{min-height:160px}.orbit{width:145px;height:145px}.orbit-chip{width:40px;height:40px}.features{margin-bottom:30px}.page-footer{font-size:10px}}
    #help[hidden],#loginForm[hidden]{display:none}
  </style>
</head>
<body>
  <div class="landing">
    <nav class="topbar" aria-label="Navegação principal">
      <div class="brand"><span class="brand-mark">✦</span><span>${safeBotName}<small>PAINEL DO BOT</small></span></div>
      <div class="top-actions">${hasSession ? '<a class="button" href="/dashboard">Abrir dashboard</a>' : ""}<a class="button" href="/novidades">Novidades</a><a class="top-link" href="/perfil?grupo=ID&amp;usuario=ID&amp;plataforma=discord">Ver exemplo de perfil <span aria-hidden="true">↗</span></a></div>
    </nav>
    <main>
      <section class="hero">
        <div>
          <span class="eyebrow">Seu espaço, suas comunidades</span>
          <h1>Seu bot.<br><span>Tudo conectado.</span></h1>
          <p class="hero-copy">Acesse sua Conta Central e acompanhe em um só lugar as conexões e recursos do ${safeBotName}.</p>
          <div class="hero-actions">${hasSession
            ? '<a class="button primary" href="/dashboard">Abrir meu dashboard <span aria-hidden="true">→</span></a>'
            : '<button class="button primary" id="openLogin" type="button">Entrar no painel <span aria-hidden="true">→</span></button><button class="button" id="openHelp" type="button">Não sei meu login ou senha</button>'}</div>
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
    const openLogin=document.getElementById("openLogin");
    const openHelp=document.getElementById("openHelp");
    if(openLogin)openLogin.onclick=()=>{form.hidden=false;helpSection.hidden=true;dialogTitle.textContent="Entrar no painel";dialog.showModal()};
    if(openHelp)openHelp.onclick=()=>{form.hidden=true;helpSection.hidden=false;dialogTitle.textContent="Recuperar acesso";dialog.showModal()};
    document.getElementById("closeDialog").onclick=()=>dialog.close();
    form.onsubmit=async event=>{
      event.preventDefault();
      const error=document.getElementById("loginError");
      error.textContent="";
      try{
        const response=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({login:document.getElementById("loginIdentifier").value,password:document.getElementById("password").value,rememberMe:document.getElementById("rememberMe").checked})});
        const result=await response.json();
        if(!response.ok)throw new Error(result.error||"Falha no login.");
        location.href="/dashboard";
      }catch(err){error.textContent=err.message}
    };
  </script>
</body>
</html>`;
}

function formatMoney(cents) {
  return `${(Number(cents || 0) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}💷`;
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

function profileSnowPattern(opacity = 1) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><g opacity="${opacity}" fill="none" stroke="#e8f8ff" stroke-width="2" stroke-linecap="round"><path d="M25 25v18m-8-13 16 8m0-8-16 8M88 72v20m-9-15 18 10m0-10-18 10"/></g><g opacity="${opacity}" fill="#e8f8ff"><circle cx="66" cy="25" r="2"/><circle cx="48" cy="85" r="1.5"/><circle cx="103" cy="39" r="1.5"/></g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
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

  const profileTheme = profileCosmetics.getProfileBackground(profile.economy.background);
  const profileOutline = profileCosmetics.getProfileOutline(profile.economy.outline);
  const profileCircle = profileCosmetics.getProfileCircle(profile.economy.circle);
  const profileEffect = profileCosmetics.getProfileEffect(profile.economy.effect);
  const profileStyle = [
    profileTheme
      ? `--profile-surface:${profileTheme.stops[1]};--profile-deep:${profileTheme.stops[2]};--profile-accent:${profileTheme.accent};--profile-border:${profileTheme.stops[0]};--profile-background:${profileCosmetics.getProfileBackgroundCss(profileTheme.key)}`
      : "",
    profileOutline ? `--profile-outline:${profileOutline.color}` : "",
    profileCircle ? `--profile-circle:${profileCircle.rainbow ? "rainbow" : profileCircle.color}` : ""
  ].filter(Boolean).join(";");
  const profileClasses = [
    profileTheme ? "profile-themed-background" : "",
    profileTheme?.rainbow ? "rainbow-background" : "",
    profileOutline ? "profile-outline" : "",
    profileOutline?.rainbow ? "rainbow-outline" : "",
    profileOutline?.frozen ? "frozen-outline" : "",
    profileCircle ? "profile-circle" : "",
    profileCircle?.rainbow ? "rainbow-circle" : "",
    profileCircle?.frozen ? "frozen-circle" : "",
    profileEffect?.snowflakes ? "profile-frozen" : ""
  ].filter(Boolean).join(" ");
  const circleFrostMarks = profileCircle?.frozen
    ? `<span class="frozen-circle-marks" aria-hidden="true">${["top", "upper-right", "right", "lower-right", "bottom", "lower-left", "left", "upper-left"].map(position => `<span class="frozen-circle-mark frozen-circle-${position}">❄</span>`).join("")}</span>`
    : "";
  const outlineFrostMarks = profileOutline?.frozen
    ? `<span class="frozen-outline-marks" aria-hidden="true">${["top-left", "top-center", "top-right", "left-mid", "right-mid"].map(position => `<span class="frozen-outline-mark frozen-outline-${position}">❄</span>`).join("")}</span>`
    : "";
  const profileAnimationStyles = profileClasses
    ? `<style>
      @keyframes profile-rainbow-background{to{background-position:100% 50%}}
      @keyframes profile-rainbow-outline{to{background-position:100% 50%,100% 50%}}
      .card.profile-themed-background{background:var(--profile-background)!important}
      .card.rainbow-background{background:var(--profile-background)!important;background-size:300% 300%!important;animation:profile-rainbow-background 5s linear infinite}
      .card.profile-outline{border:4px solid var(--profile-outline)}
      .card.profile-outline .grid article{border:4px solid var(--profile-outline)}
      .card.rainbow-outline{border:8px solid transparent;background:var(--profile-background,linear-gradient(145deg,var(--profile-surface,#1c2438),var(--profile-deep,#111521))) padding-box,linear-gradient(90deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744) border-box!important;background-size:300% 300%,300% 100%;animation:profile-rainbow-outline 5s linear infinite}
      .card.rainbow-outline .grid article{border:8px solid transparent;background:linear-gradient(var(--profile-surface,#202a40),var(--profile-surface,#202a40)) padding-box,linear-gradient(90deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744) border-box;background-size:100% 100%,300% 100%;animation:profile-rainbow-outline 5s linear infinite}
      .card.profile-circle .avatar{border:3px solid var(--profile-circle);border-radius:50%}
      .card.rainbow-circle .avatar{border:5px solid transparent;border-radius:50%;background:linear-gradient(var(--profile-surface,#202a40),var(--profile-surface,#202a40)) padding-box,linear-gradient(90deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744) border-box;background-size:100% 100%,300% 100%;animation:profile-rainbow-outline 5s linear infinite}
      .card.frozen-circle .avatar{position:relative;border:4px double #f5fcff;background:linear-gradient(var(--profile-surface,#202a40),var(--profile-surface,#202a40)) padding-box,linear-gradient(145deg,#fff,var(--profile-circle),#dff8ff,var(--profile-circle),#fff) border-box;box-shadow:0 0 0 2px var(--profile-circle),0 0 0 5px #f5fcff88,0 0 20px var(--profile-circle),inset 0 0 12px #c9f2ff88}
      .frozen-circle-marks{position:absolute;inset:0;z-index:3;pointer-events:none}
      .frozen-circle-mark{position:absolute;color:#f5fcff;font-size:13px;line-height:1;text-shadow:0 0 4px #fff,0 0 9px var(--profile-circle)}
      .frozen-circle-top{top:1px;left:50%;transform:translateX(-50%)}
      .frozen-circle-upper-right{top:8px;right:8px}
      .frozen-circle-right{top:50%;right:1px;transform:translateY(-50%)}
      .frozen-circle-lower-right{right:8px;bottom:8px}
      .frozen-circle-bottom{bottom:1px;left:50%;transform:translateX(-50%)}
      .frozen-circle-lower-left{bottom:8px;left:8px}
      .frozen-circle-left{top:50%;left:1px;transform:translateY(-50%)}
      .frozen-circle-upper-left{top:8px;left:8px}
      body.profile-frozen:after,.rank-row.profile-frozen:after{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.015;background-image:url("${profileSnowPattern()}");background-size:180px 180px}
      body.profile-frozen>*{position:relative;z-index:1}
      .rank-row.profile-frozen{position:relative;isolation:isolate;overflow:hidden}
      .rank-row.profile-frozen:after{position:absolute}
      .card.profile-outline.frozen-outline{border:5px double #f5fcff;box-shadow:0 0 0 2px var(--profile-outline),0 0 20px var(--profile-outline),inset 0 0 16px #c9f2ff33}
      .card.profile-outline.frozen-outline .grid article{position:relative;border:3px double #eaf7ff;box-shadow:0 0 0 1px var(--profile-outline),0 0 14px var(--profile-outline)}
      .card.profile-outline.frozen-outline .grid article:after{content:"❄";position:absolute;top:-9px;right:18px;color:#f5fcff;font-size:14px;line-height:1;text-shadow:0 0 4px #fff,0 0 9px var(--profile-outline);pointer-events:none}
      .card.frozen-outline{position:relative;isolation:isolate}
      .frozen-outline-marks{position:absolute;inset:0;z-index:4;pointer-events:none}
      .frozen-outline-mark{position:absolute;color:#f5fcff;font-size:16px;line-height:1;text-shadow:0 0 4px #fff,0 0 10px var(--profile-outline)}
      .frozen-outline-top-left{top:-9px;left:24%}.frozen-outline-top-center{top:-9px;left:50%;transform:translateX(-50%)}.frozen-outline-top-right{top:-9px;left:76%}
      .frozen-outline-left-mid{top:50%;left:-9px;transform:translateY(-50%)}.frozen-outline-right-mid{top:50%;right:-9px;transform:translateY(-50%)}
      @media(prefers-reduced-motion:reduce){.card.rainbow-background,.card.rainbow-outline,.card.rainbow-outline .grid article,.card.rainbow-circle .avatar{animation:none}}
    </style>`
    : "";
  const pageBackground = profileTheme
    ? `style="background:radial-gradient(circle at top, ${profileTheme.stops[0]} 0, ${profileTheme.stops[2]} 55%, #090b10 100%)"`
    : "";
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Perfil de ${escapeHtml(profile.name)} - ${escapeHtml(botName)}</title><style>${styles()}</style>${profileAnimationStyles}</head>
<body class="${profileEffect?.snowflakes ? "profile-frozen" : ""}" ${pageBackground}>
  <main class="card${profileClasses ? ` ${profileClasses}` : ""}" ${profileStyle ? `style="${profileStyle}"` : ""}>
    ${outlineFrostMarks}
    <div class="brand">${escapeHtml(botName)} <span>PERFIL</span></div>
    <header>    <div class="avatar">${escapeHtml(profile.name.charAt(0).toUpperCase())}${avatarContent}${circleFrostMarks}</div><div><h1>${escapeHtml(profile.name)}</h1><p class="muted">ID: ${escapeHtml(profile.userId)}</p></div></header>
    <div class="scope">Plataforma: ${escapeHtml(profile.platform)} <span>•</span> ${escapeHtml(profile.groupName)} <span>•</span> ID: ${escapeHtml(profile.groupId)}</div>
    <section class="grid">
      <article><div class="label">PATRIMÔNIO TOTAL</div><div class="value money">${formatMoney(profile.economy.balance)}</div><div class="meta">Carteira: ${formatMoney(profile.economy.walletBalance)}<br>Cofre protegido: ${formatMoney(profile.economy.vaultBalance)}<br>Posição no ranking: ${economyPosition}</div></article>
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
      entries: await Promise.all(selectedUsers.map(async user => {
        const cosmetics = economy.getProfileCosmetics(message, user.userId);
        return {
          position: users.findIndex(item => String(item.userId) === String(user.userId)) + 1,
          name: user.displayName || user.username || user.userId,
          userId: user.userId,
          avatarUrl: await getProfileAvatar(platform, groupId, user.userId),
          xp: Number(user.xp) || 0,
          level: xp.levelForXp(user.xp).level,
          background: cosmetics.background,
          outline: cosmetics.outline,
          circle: cosmetics.circle,
          effect: cosmetics.effect
        };
      }))
    };
  }

  if (!economy.isEnabled(message)) return { error: "A economia está desativada neste grupo/servidor." };
  return {
    type,
    platform,
    groupId,
    groupName,
    includesVault: economy.getIncludeVaultInRanking(message),
    entries: await Promise.all(economy.getRanking(message, order === "poor" ? "poor" : "rich").map(async (account, index) => {
      const cosmetics = economy.getProfileCosmetics(message, account.userId);
      return {
        position: index + 1,
        name: account.name || account.username || account.userId,
        userId: account.userId,
        avatarUrl: await getProfileAvatar(platform, groupId, account.userId),
        balance: Number(account.balance) || 0,
        walletBalance: Number(account.walletBalance) || 0,
        vaultBalance: Number(account.vaultBalance) || 0,
        includesVault: account.includesVault === true,
        background: cosmetics.background,
        outline: cosmetics.outline,
        circle: cosmetics.circle,
        effect: cosmetics.effect
      };
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

  const selectedUsers = includeAll
    ? users
    : order === "poor"
      ? users.slice().sort((a, b) => a.total - b.total || String(a.userId).localeCompare(String(b.userId))).slice(0, 5)
      : users.slice(0, 5);
  const entries = await Promise.all(selectedUsers.map(async (user, index) => {
    const cosmetics = economy.getProfileCosmetics(message, user.userId);
    return {
      position: index + 1,
      name: user.displayName || user.username || user.userId,
      userId: user.userId,
      avatarUrl: includeAll ? null : await getProfileAvatar(platform, groupId, user.userId),
      total: user.total,
      dailyTotal: user.dailyTotal,
      messages: user.messages,
      commands: user.commands,
      stickers: user.stickers,
      files: user.files,
      background: cosmetics.background,
      outline: cosmetics.outline,
      circle: cosmetics.circle,
      effect: cosmetics.effect,
      profileAvailable: user.profileAvailable !== false
    };
  }));
  return {
    type: "activity",
    platform,
    groupId,
    groupName,
    entries: entries.sort((a, b) => (order === "poor" ? a.total - b.total : b.total - a.total) ||
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
  const title = isXp ? "Ranking XP" : isActivity ? (ranking.includeAll ? "Ranking de atividade — todos" : "Ranking de atividade") : ranking.includesVault ? "Ranking de patrimônio total" : "Ranking de carteira";
  const rows = ranking.entries.length
    ? ranking.entries.map(entry => isXp
      ? renderRankingEntry(ranking, entry, `<b>${entry.xp} XP</b><em>Nível ${entry.level}</em>`)
      : isActivity
        ? renderRankingEntry(ranking, entry, `<b>${entry.total} atividades</b><em>💬 ${entry.messages} • ⚙️ ${entry.commands} • 🎨 ${entry.stickers} • 📎 ${entry.files}</em>`)
      : renderRankingEntry(ranking, entry, `<b class="money">${formatMoney(entry.balance)}</b><em>${entry.includesVault ? `Carteira: ${formatMoney(entry.walletBalance)} · Cofre: ${formatMoney(entry.vaultBalance)}` : `Saldo da carteira · Cofre fora do ranking: ${formatMoney(entry.vaultBalance)}`}</em>`)
    ).join("")
    : `<p class="muted">Ainda não há usuários neste ranking.</p>`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)} - ${escapeHtml(botName)}</title><style>${styles()} @keyframes rank-rainbow-cycle{to{background-position:100% 50%,100% 50%}}.ranking{margin-top:22px;display:grid;gap:10px}.rank-row{display:grid;grid-template-columns:60px 42px 1fr auto auto;align-items:center;gap:14px;padding:17px 18px;border:1px solid #334566;border-radius:14px;background:var(--rank-background,#202a40);color:inherit;text-decoration:none;transition:transform .15s ease,border-color .15s ease,filter .15s ease}.rank-row.rainbow-background{background-size:300% 300%;animation:rank-rainbow-cycle 5s linear infinite}.rank-row.rainbow-outline{border:6px solid transparent;background:var(--rank-background,linear-gradient(#202a40,#202a40)) padding-box,linear-gradient(90deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744) border-box;background-size:100% 100%,300% 100%;animation:rank-rainbow-cycle 5s linear infinite}.rank-row.rainbow-outline.rainbow-background{background-size:300% 300%,300% 100%}.rank-row:hover,.rank-row:focus-visible{transform:translateY(-2px);border-color:#7ea7ff;filter:brightness(1.12);outline:none}.rank-row.rainbow-outline:hover,.rank-row.rainbow-outline:focus-visible{border-color:transparent}.rank-row strong{font-size:22px;color:#8eaaff}.rank-row span{font-weight:700}.rank-avatar{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#111827;color:#dcecff!important;font-size:16px}.rank-avatar.has-circle{border:3px solid var(--rank-circle)}.rank-avatar.rainbow-circle{border:4px solid transparent;background:linear-gradient(#111827,#111827) padding-box,linear-gradient(90deg,#ff1744,#ff9100,#ffea00,#00e676,#00b0ff,#651fff,#ff1744) border-box;background-size:100% 100%,300% 100%;animation:rank-rainbow-cycle 5s linear infinite}      .rank-avatar.frozen-circle{position:relative;border:3px double #f5fcff;box-shadow:0 0 0 2px var(--rank-circle),0 0 14px var(--rank-circle)}.rank-avatar.frozen-circle:before,.rank-avatar.frozen-circle:after{position:absolute;color:#eaf7ff;font-size:12px;text-shadow:0 0 5px #83dfff}.rank-avatar.frozen-circle:before{content:"❄";bottom:-5px;left:-5px}.rank-avatar.frozen-circle:after{content:"❄";top:-5px;right:-5px}.rank-row.profile-frozen{position:relative;isolation:isolate;overflow:hidden}.rank-row.profile-frozen:after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.015;background-image:url("${profileSnowPattern()}");background-size:180px 180px}    .rank-row.frozen-outline{position:relative;isolation:isolate;overflow:hidden;border:4px double #f5fcff;box-shadow:0 0 0 2px var(--rank-outline),0 0 18px var(--rank-outline)}
  .rank-row.frozen-outline:before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.03;background-image:url("${profileSnowPattern()}");background-size:180px 180px}.rank-row small{display:block;color:#8998b3;font-weight:400;font-size:11px;margin-top:4px}.rank-row b{white-space:nowrap}.rank-row em{font-style:normal;color:#b8c3d9;font-size:13px}@media(prefers-reduced-motion:reduce){.rank-row.rainbow-background,.rank-row.rainbow-outline,.rank-avatar.rainbow-circle{animation:none}}@media(max-width:600px){.rank-row{grid-template-columns:42px 36px 1fr auto}.rank-row em{grid-column:3}.rank-row b{font-size:13px}}</style></head><body><main class="card"><div class="brand">${escapeHtml(botName)} <span>RANKING</span></div><header><div><h1>${escapeHtml(title)}</h1><p class="muted">${escapeHtml(ranking.groupName)}</p></div></header><div class="scope">Plataforma: ${escapeHtml(ranking.platform)} <span>•</span> ID: ${escapeHtml(ranking.groupId)}</div><section class="ranking">${rows}</section><footer>Ranking local do grupo/servidor • ${escapeHtml(botName)}</footer></main></body></html>`;
}

function renderRankingEntry(ranking, entry, metrics) {
  const profileUrl = `/perfil?grupo=${encodeURIComponent(ranking.groupId)}&plataforma=${encodeURIComponent(ranking.platform)}&usuario=${encodeURIComponent(entry.userId)}`;
  const outline = profileCosmetics.getProfileOutline(entry.outline);
  const circle = profileCosmetics.getProfileCircle(entry.circle);
  const styleProperties = [
    entry.background ? `--rank-background:${profileCosmetics.getProfileBackgroundCss(entry.background)}` : "",
    outline ? `--rank-outline:${outline.color}` : "",
    outline && !outline.rainbow && !outline.frozen ? `border:4px solid ${outline.color}` : "",
    circle && !circle.rainbow ? `--rank-circle:${circle.color}` : ""
  ].filter(Boolean).join(";");
  const style = styleProperties ? `style="${styleProperties}"` : "";
  const classes = [
    "rank-row",
    profileCosmetics.getProfileBackground(entry.background)?.rainbow ? "rainbow-background" : "",
    outline ? "profile-outline" : "",
    outline?.rainbow ? "rainbow-outline" : "",
    outline?.frozen ? "frozen-outline" : "",
    entry.effect === "congelado" ? "profile-frozen" : ""
  ].filter(Boolean).join(" ");
  const avatarClasses = [
    "rank-avatar",
    circle ? "has-circle" : "",
    circle?.rainbow ? "rainbow-circle" : "",
    circle?.frozen ? "frozen-circle" : ""
  ].filter(Boolean).join(" ");
  const initial = Array.from(String(entry.name || "?"))[0] || "?";
  const outlineFrostMarks = outline?.frozen
    ? `<span aria-hidden="true" style="position:absolute;inset:0;z-index:2;pointer-events:none"><span style="position:absolute;top:0;left:16%;color:#f5fcff;font-size:14px;line-height:1;text-shadow:0 0 3px #fff,0 0 8px var(--rank-outline)">❄</span><span style="position:absolute;top:0;left:50%;color:#f5fcff;font-size:14px;line-height:1;transform:translateX(-50%);text-shadow:0 0 3px #fff,0 0 8px var(--rank-outline)">❄</span><span style="position:absolute;top:0;left:84%;color:#f5fcff;font-size:14px;line-height:1;text-shadow:0 0 3px #fff,0 0 8px var(--rank-outline)">❄</span><span style="position:absolute;bottom:0;left:32%;color:#f5fcff;font-size:14px;line-height:1;text-shadow:0 0 3px #fff,0 0 8px var(--rank-outline)">❄</span><span style="position:absolute;bottom:0;left:68%;color:#f5fcff;font-size:14px;line-height:1;text-shadow:0 0 3px #fff,0 0 8px var(--rank-outline)">❄</span></span>`
    : "";
  const circleFrostMarks = circle?.frozen
    ? `<span aria-hidden="true" style="position:absolute;inset:0;z-index:2;pointer-events:none"><span style="position:absolute;top:-5px;left:-5px;color:#f5fcff;font-size:11px;line-height:1;text-shadow:0 0 3px #fff,0 0 7px var(--rank-circle)">❄</span><span style="position:absolute;right:-5px;bottom:-5px;color:#f5fcff;font-size:11px;line-height:1;text-shadow:0 0 3px #fff,0 0 7px var(--rank-circle)">❄</span></span>`
    : "";
  const avatarStyle = entry.avatarUrl ? `style="position:relative"` : "";
  const avatarImage = entry.avatarUrl
    ? `<img src="${escapeHtml(entry.avatarUrl)}" alt="" aria-hidden="true" referrerpolicy="no-referrer" style="position:absolute;inset:0;width:100%;height:100%;border-radius:50%;object-fit:cover" onerror="this.remove()">`
    : "";
  const row = `${outlineFrostMarks}<strong>#${entry.position}</strong><span class="${avatarClasses}" ${avatarStyle}>${escapeHtml(initial)}${avatarImage}${circleFrostMarks}</span><span>${escapeHtml(entry.name)}<small>ID: ${escapeHtml(entry.userId)}</small></span>${metrics}`;
  return entry.profileAvailable === false
    ? `<div class="${classes}" ${style}>${row}</div>`
    : `<a class="${classes}" ${style} href="${profileUrl}" aria-label="Abrir perfil de ${escapeHtml(entry.name)}">${row}</a>`;
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
  return `:root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at top,#27365d 0,#10131c 48%,#090b10 100%)}.card{width:min(860px,100%);padding:34px;border:1px solid var(--profile-border,#334366);border-radius:24px;background:linear-gradient(145deg,var(--profile-surface,#1c2438ee),var(--profile-deep,#111521f2));box-shadow:0 24px 80px #0008}.brand{letter-spacing:.18em;color:var(--profile-accent,#7ea7ff);font-weight:800}.brand span{color:#9da8bd;font-weight:500;font-size:.75em}header{display:flex;align-items:center;gap:18px;margin:34px 0 18px}.avatar{position:relative;overflow:hidden;flex:none;width:72px;height:72px;border-radius:20px;display:grid;place-items:center;background:linear-gradient(135deg,var(--profile-accent,#6d5dfc),var(--profile-border,#3aa8ff));font-size:32px;font-weight:800}.avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}h1{margin:0;font-size:clamp(28px,5vw,46px)}p{margin:8px 0}.muted,.hint{color:#9da8bd}.scope{padding:13px 16px;border-radius:12px;background:var(--profile-deep,#0e1422);color:#b7c5e7;font-size:14px}.scope span{color:var(--profile-accent,#536486);margin:0 8px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px}.grid article{padding:22px;border-radius:16px;background:var(--profile-surface,#202a40);border:1px solid var(--profile-outline,var(--profile-border,#334566))}.label{color:#9da8bd;font-size:12px;letter-spacing:.12em;font-weight:700}.value{font-size:32px;font-weight:800;margin:12px 0 8px}.value.small{font-size:22px}.money{color:#8ff0bf}.meta{color:#b8c3d9;font-size:14px}footer{margin-top:26px;color:#71809d;font-size:13px}.error{text-align:center}.error h1{margin-top:28px}@media(max-width:600px){.card{padding:24px}.grid{grid-template-columns:1fr}header{margin-top:26px}}`;
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

    if (request.method === "GET" && requestUrl.pathname === "/api/account/me") {
      let central;
      try {
        central = await getSessionCentral(request);
      } catch (error) {
        console.error("[WEB] Falha ao validar sessão para consulta da Conta Central:", error.message || error);
        sendJson(response, 500, { error: "Não foi possível validar sua sessão agora." });
        return;
      }
      if (!central) {
        sendJson(response, 401, { error: "Sua sessão expirou. Entre novamente para continuar." });
        return;
      }

      try {
        const vipStatus = vipHelper.getVipStatus(central.id);
        const nofapStatus = nofapHelper.getNofapStatus(central.id);
        sendJson(response, 200, {
          account: {
            id: central.id,
            username: central.webAuth?.username || null,
            name: central.name || null,
            createdAt: central.createdAt || null,
            lastActivityAt: central.lastActivityAt || null,
            platformAccounts: (central.platformAccounts || []).map(account => ({
              platform: account.platform,
              platformId: account.platformId,
              displayName: account.displayName || null,
              username: account.username || null,
              linkedAt: account.linkedAt || null
            })),
            vip: {
              active: vipStatus.active,
              permanent: vipStatus.permanent,
              startedAt: vipStatus.startedAt,
              expiresAt: vipStatus.expiresAt,
              remainingText: vipStatus.remainingText
            },
            nofap: nofapStatus
          }
        });
      } catch (error) {
        console.error("[WEB] Falha ao carregar dados da Conta Central:", error.message || error);
        sendJson(response, 500, { error: "Não foi possível carregar os dados da sua conta agora." });
      }
      return;
    }

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

      if (requestUrl.pathname === "/api/account/local/admin-chat-control") {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        const action = payload?.action;
        const requestedChannelId = typeof payload?.channelId === "string" ? payload.channelId.trim() : "";
        if (!["discord", "whatsapp"].includes(platform) ||
            !["open", "close", "status"].includes(action) ||
            (platform === "discord" && !/^\d{15,25}$/.test(requestedChannelId))) {
          sendJson(response, 400, { error: "Plataforma, ação ou canal inválido." });
          return;
        }
        try {
          await getGroupAdminData(central, platform, groupId);
          const platformAccount = central.platformAccounts.find(account => account.platform === platform);
          let chatId = String(groupId);
          let raw = {};
          if (platform === "discord") {
            const client = global.discordClient;
            if (!client?.isReady?.()) throw new Error("O Discord está offline no momento.");
            const guild = await client.guilds.fetch(String(groupId));
            const channel = await guild.channels.fetch(requestedChannelId);
            if (!channel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type)) {
              throw new Error("Escolha um canal de texto ou anúncios deste servidor.");
            }
            chatId = String(channel.id);
            raw = { guild, channel };
          }
          const adapter = global.platformRegistry?.[platform];
          if (!await adapter?.checkUserPermission?.(chatId, String(platformAccount.platformId), "manageChat")) {
            throw new Error("Sua conta vinculada não tem permissão para gerenciar este chat.");
          }
          if (!await adapter?.checkBotPermission?.(chatId, "manageChat")) {
            throw new Error("O bot não tem permissão para alterar as configurações deste chat.");
          }
          const message = {
            ...getLocalGroupMessage(platform, groupId, String(platformAccount.platformId)),
            chatId,
            raw
          };
          let changed = false;
          if (action !== "status") {
            const result = await chatControl.setChatState(message, action === "open");
            changed = result.changed;
          }
          const isOpen = await chatControl.getChatState(message);
          if (action !== "status" && isOpen !== (action === "open")) {
            throw new Error("A plataforma não confirmou a alteração do estado deste chat.");
          }
          const state = isOpen ? "aberto" : "fechado";
          sendJson(response, 200, {
            success: true,
            isOpen,
            changed,
            message: action === "status"
              ? `Estado atual do chat: ${state}.`
              : changed
                ? `Chat ${state}. A alteração foi aplicada.`
                : `O chat já estava ${state}. Nenhuma alteração necessária.`
          });
        } catch (error) {
          const reason = String(error?.message || "");
          const statusCode = /não participa|não está vinculada|permissão|tem permissão/i.test(reason) ? 403
            : /offline|não está disponível/i.test(reason) ? 503
              : /inválido|escolha um canal|não encontrado|não funciona|não aceita|comunidades/i.test(reason) ? 400 : 500;
          if (statusCode === 500) console.error("[WEB] Falha ao alterar abertura do chat:", error.message || error);
          sendJson(response, statusCode, {
            error: statusCode === 403 || statusCode === 503 || statusCode === 400
              ? reason
              : "Não foi possível alterar a abertura deste chat."
          });
        }
        return;
      }

      if (requestUrl.pathname === "/api/account/local/admin-audit-logs") {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        try {
          await getGroupAdminData(central, platform, groupId);
          const platformAccount = central.platformAccounts.find(account => account.platform === platform);
          const message = getLocalGroupMessage(platform, groupId, String(platformAccount.platformId));
          if (payload?.auditLogs === undefined) {
            sendJson(response, 200, { auditLogs: auditLogs.getConfig(message) });
            return;
          }

          const settings = payload.auditLogs;
          const categoryKeys = Object.keys(auditLogs.CATEGORIES);
          if (!settings || typeof settings !== "object" || Array.isArray(settings) ||
              typeof settings.enabled !== "boolean" ||
              !settings.categories || typeof settings.categories !== "object" || Array.isArray(settings.categories) ||
              categoryKeys.some(key => typeof settings.categories[key] !== "boolean") ||
              Object.keys(settings.categories).some(key => !categoryKeys.includes(key))) {
            sendJson(response, 400, { error: "Configuração de logs inválida." });
            return;
          }
          const saved = auditLogs.updateConfig(message, {
            enabled: settings.enabled,
            categories: settings.categories
          });
          sendJson(response, 200, { success: true, auditLogs: saved });
        } catch (error) {
          const reason = String(error?.message || "");
          const statusCode = /não participa|não está vinculada|permissão administrativa/i.test(reason) ? 403
            : /offline/i.test(reason) ? 503 : /inválido/i.test(reason) ? 400 : 500;
          if (statusCode === 500) console.error("[WEB] Falha ao carregar ou salvar logs de auditoria:", error.message || error);
          sendJson(response, statusCode, {
            error: statusCode === 403 || statusCode === 503 || statusCode === 400
              ? reason
              : "Não foi possível salvar as configurações dos logs."
          });
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
        "/api/account/local/admin-schedules-media",
        "/api/account/local/admin-schedules-overview"
      ].includes(requestUrl.pathname)) {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        const isStateRequest = requestUrl.pathname.endsWith("-state");
        try {
          const adminData = await getGroupAdminData(central, platform, groupId);
          if (requestUrl.pathname.endsWith("-overview")) {
            sendJson(response, 200, {
              schedules: await getAdminSchedulesOverview(platform, groupId, adminData.groupName)
            });
            return;
          }
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
        "/api/account/local/admin-autoia-state",
        "/api/account/local/admin-autoia",
        "/api/account/local/admin-monitor-state",
        "/api/account/local/admin-monitor"
      ].includes(requestUrl.pathname)) {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        const setting = requestUrl.pathname.includes("/admin-monitor")
          ? (typeof payload?.setting === "string" && Object.prototype.hasOwnProperty.call(ADMIN_MONITOR_HELPERS, payload.setting) ? payload.setting : "")
          : ["antimedia", "antipalavras", "antiraid", "blockcmd", "welcome", "goodbye", "autorepo", "autodownload", "autoia"].find(key => requestUrl.pathname.includes(key)) || "antilink";
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
            autoia: getAdminAutoIAConfig,
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
            autoia: saveAdminAutoIAConfig,
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

      if (requestUrl.pathname === "/api/account/local/admin-economy-ranking-state" ||
          requestUrl.pathname === "/api/account/local/admin-economy-ranking") {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        const isStateRequest = requestUrl.pathname.endsWith("-state");
        try {
          await getGroupAdminData(central, platform, groupId);
          const platformAccount = central.platformAccounts.find(account => account.platform === platform);
          const message = getLocalGroupMessage(platform, groupId, String(platformAccount.platformId));
          if (!isStateRequest) {
            if (typeof payload?.includeVault !== "boolean") {
              throw new Error("Informe se o cofre deve ser considerado no ranking.");
            }
            economy.setIncludeVaultInRanking(message, payload.includeVault);
          }
          sendJson(response, 200, {
            success: true,
            includeVault: economy.getIncludeVaultInRanking(message)
          });
        } catch (error) {
          const reason = String(error?.message || "");
          const statusCode = /não participa|não está vinculada|permissão administrativa/i.test(reason) ? 403
            : /offline/i.test(reason) ? 503
              : /informe/i.test(reason) ? 400 : 500;
          if (statusCode === 500 || statusCode === 503) console.error("[WEB] Falha ao configurar o ranking da economia:", error.message || error);
          sendJson(response, statusCode, {
            error: statusCode === 500 ? "Não foi possível carregar ou salvar a configuração do ranking." : reason
          });
        }
        return;
      }

      if (requestUrl.pathname === "/api/account/local/admin-vault-config-state" ||
          requestUrl.pathname === "/api/account/local/admin-vault-config") {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        const isStateRequest = requestUrl.pathname.endsWith("-state");
        try {
          await getGroupAdminData(central, platform, groupId);
          const platformAccount = central.platformAccounts.find(account => account.platform === platform);
          const message = getLocalGroupMessage(platform, groupId, String(platformAccount.platformId));
          if (isStateRequest) {
            sendJson(response, 200, { success: true, vaultConfig: economy.getVaultConfig(message) });
            return;
          }

          const input = payload?.config;
          if (!input || typeof input !== "object" || Array.isArray(input) ||
              !Number.isSafeInteger(input.minimumMovement) || input.minimumMovement < 0 ||
              !Number.isSafeInteger(input.taxRateBasisPoints) || input.taxRateBasisPoints < 0 || input.taxRateBasisPoints > 10000 ||
              !Number.isSafeInteger(input.taxFixedAmount) || input.taxFixedAmount < 0 ||
              !Number.isSafeInteger(input.robberyVaultChance) || input.robberyVaultChance < 0 || input.robberyVaultChance > 100) {
            throw new Error("Informe valores válidos para o mínimo, imposto e chance de roubo.");
          }
          const previousVaultConfig = economy.getVaultConfig(message);
          const vaultConfig = economy.updateVaultConfig(message, {
            mode: input.mode,
            minimumMovement: input.minimumMovement,
            taxType: input.taxType,
            taxRateBasisPoints: input.taxRateBasisPoints,
            taxFixedAmount: input.taxFixedAmount,
            robberyVaultChance: input.robberyVaultChance
          });
          if (!vaultConfig) throw new Error("Configuração do cofre inválida.");
          const changes = describeVaultConfigChanges(previousVaultConfig, vaultConfig);
          if (changes.length) {
            await auditLogs.log(
              message,
              "vault",
              `👤 Responsável: ${auditLogs.describeActor(message)}\nAlterações: ${changes.join("; ")}`
            );
          }
          sendJson(response, 200, { success: true, vaultConfig });
        } catch (error) {
          const reason = String(error?.message || "");
          const statusCode = /não participa|não está vinculada|permissão administrativa/i.test(reason) ? 403
            : /offline/i.test(reason) ? 503
              : /informe valores|configuração do cofre inválida/i.test(reason) ? 400 : 500;
          if (statusCode === 500 || statusCode === 503) console.error("[WEB] Falha ao configurar o cofre:", error.message || error);
          sendJson(response, statusCode, {
            error: statusCode === 500 ? "Não foi possível carregar ou salvar a configuração do cofre." : reason
          });
        }
        return;
      }

      if (requestUrl.pathname === "/api/account/local/admin-local-signal-search-state" ||
          requestUrl.pathname === "/api/account/local/admin-local-signal-search") {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        const isStateRequest = requestUrl.pathname.endsWith("-state");
        try {
          await getGroupAdminData(central, platform, groupId);
          const platformAccount = central.platformAccounts.find(account => account.platform === platform);
          const message = getLocalGroupMessage(platform, groupId, String(platformAccount.platformId));
          if (isStateRequest) {
            sendJson(response, 200, { success: true, localSignalSearch: economy.getLocalSignalSearch(message) });
            return;
          }
          const input = payload?.config;
          if (!input || typeof input !== "object" || Array.isArray(input) ||
              !input.tiers || typeof input.tiers !== "object" || Array.isArray(input.tiers)) {
            throw new Error("Configuração da Busca Local inválida.");
          }
          const price = parseAdminStorePrice(input.price);
          const tiers = {};
          for (const rarity of economy.LOCAL_SIGNAL_RARITIES) {
            const tier = input.tiers[rarity];
            if (!tier || typeof tier !== "object" || Array.isArray(tier) ||
                !Array.isArray(tier.botItems) || !Array.isArray(tier.marketItems) ||
                !Array.isArray(tier.backgrounds) || !Array.isArray(tier.outlines)) {
              throw new Error("Configure as chances e os prêmios de todas as raridades.");
            }
            const cashMin = tier.cashMin === null || tier.cashMin === "" ? null : parseAdminStorePrice(tier.cashMin);
            const cashMax = tier.cashMax === null || tier.cashMax === "" ? null : parseAdminStorePrice(tier.cashMax);
            if ((tier.cashMin !== null && tier.cashMin !== "" && cashMin === null) ||
                (tier.cashMax !== null && tier.cashMax !== "" && cashMax === null)) {
              throw new Error("Informe valores monetários válidos nos prêmios em SatCoins.");
            }
            tiers[rarity] = {
              chance: Number(tier.chance),
              guaranteeAfter: tier.guaranteeAfter === null || tier.guaranteeAfter === "" ? null : Number(tier.guaranteeAfter),
              cashMin,
              cashMax,
              botItems: tier.botItems,
              marketItems: tier.marketItems.map(Number),
              backgrounds: tier.backgrounds,
              outlines: tier.outlines
            };
          }
          const config = {
            enabled: input.enabled === true,
            price,
            tiers,
            featured: input.featured
          };
          const updated = economy.updateLocalSignalSearch(message, config);
          if (!updated) {
            throw new Error("A soma das chances deve ser 100%. Cada raridade com chance precisa ter prêmio; confira também garantias, destaques e itens cadastrados.");
          }
          sendJson(response, 200, { success: true, localSignalSearch: updated });
        } catch (error) {
          const reason = String(error?.message || "");
          const statusCode = /não participa|não está vinculada|permissão administrativa/i.test(reason) ? 403
            : /offline/i.test(reason) ? 503
              : /inválid|configure|soma das chances|informe valores|cada raridade/i.test(reason) ? 400 : 500;
          if (statusCode === 500 || statusCode === 503) console.error("[WEB] Falha ao configurar Busca Local:", error.message || error);
          sendJson(response, statusCode, {
            error: statusCode === 500 ? "Não foi possível carregar ou salvar a Busca Local." : reason
          });
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
                  typeof item.category !== "string" || item.category.trim().length > 80 ||
                  (item.rarity !== undefined && item.rarity !== null &&
                    !Object.values(economy.ITEM_RARITY).includes(item.rarity))) {
                throw new Error("Informe nome, categoria e importância válidos para o item.");
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
                quantity,
                rarity: item.rarity === undefined ? undefined : item.rarity
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
              : /inválid|configure uma cidade|cadastre ao menos uma cidade|cadastre ao menos uma consulta|escolha o canal de destino/i.test(reason) ? 400 : 500;
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

      if (requestUrl.pathname === "/api/account/local/shop-purchase") {
        const platform = typeof payload?.platform === "string" ? payload.platform : "";
        const groupId = typeof payload?.groupId === "string" ? payload.groupId : "";
        const shop = typeof payload?.shop === "string" ? payload.shop : "";
        const selection = typeof payload?.selection === "string" ? payload.selection.trim() : "";
        const platformAccount = central.platformAccounts.find(account => account.platform === platform);
        if (!platformAccount?.platformId) {
          sendJson(response, 404, { error: "Esta plataforma não está vinculada à sua Conta Central." });
          return;
        }
        if (!isValidPlatformGroupId(groupId) || !["bot", "market"].includes(shop) ||
            !selection || selection.length > 100) {
          sendJson(response, 400, { error: "Loja ou item inválido." });
          return;
        }

        try {
          if (!await isPlatformGroupMember(platform, groupId, String(platformAccount.platformId))) {
            sendJson(response, 403, { error: "Sua conta vinculada não participa mais deste grupo ou servidor." });
            return;
          }
          const message = getLocalGroupMessage(platform, groupId, String(platformAccount.platformId));
          message.displayName = platformAccount.displayName || platformAccount.username || platformAccount.platformId;

          if (shop === "bot") {
            const result = economy.buyStoreItem(message, selection);
            if (!result.purchased) {
              const errors = {
                invalid_item: "Este item não foi encontrado na Loja do Bot.",
                not_ready: "O limite diário desta atividade ainda não acabou; o reset só pode ser comprado depois de esgotá-lo.",
                shield_active: "Você já possui um escudo ativo. Só poderá comprar outro quando as cargas acabarem.",
                shield_min_balance: `Você precisa ter pelo menos ${economy.formatMoney(economy.MIN_SHIELD_BALANCE)} para comprar um escudo.`,
                all_not_ready: "O reset de todos só pode ser comprado quando trabalho, pesca, mineração e roubo atingirem seus limites.",
                insufficient_balance: `Saldo insuficiente. Você precisa de ${economy.formatMoney(result.item.price)}.`
              };
              sendJson(response, 400, { error: errors[result.reason] || "Não foi possível concluir a compra." });
              return;
            }
            sendJson(response, 200, {
              success: true,
              balance: economy.formatMoney(result.balance),
              balanceValue: result.balance,
              itemName: result.item.name,
              itemKey: result.item.key,
              price: economy.formatMoney(result.item.price),
              shieldCharges: result.shieldCharges || 0
            });
            return;
          }

          const result = economy.buyCommunityStoreItem(message, selection);
          if (!result.purchased) {
            const errors = {
              not_found: "Item não encontrado no Mercado Local.",
              out_of_stock: "Este item está esgotado.",
              insufficient_balance: `Saldo insuficiente. Você precisa de ${economy.formatMoney(result.item.price)}.`
            };
            sendJson(response, 400, { error: errors[result.reason] || "Não foi possível concluir a compra." });
            return;
          }
          sendJson(response, 200, {
            success: true,
            balance: economy.formatMoney(result.balance),
            balanceValue: result.balance,
            itemId: result.item.id,
            itemName: result.item.name,
            orderId: result.order.id,
            quantity: result.item.quantity
          });
        } catch (error) {
          const reason = String(error?.message || "");
          const statusCode = /não participa|não está vinculada/i.test(reason) ? 403
            : /offline|não está disponível/i.test(reason) ? 503
              : /inválid|não encontrado|não foi possível/i.test(reason) ? 400 : 500;
          if (statusCode === 500 || statusCode === 503) {
            console.error("[WEB] Falha ao concluir compra pelo painel:", error.message || error);
          }
          sendJson(response, statusCode, {
            error: statusCode === 500 ? "Não foi possível concluir a compra agora." : reason
          });
        }
        return;
      }

      if (requestUrl.pathname === "/api/account/local/merge" ||
          requestUrl.pathname === "/api/account/local/transfer" ||
          requestUrl.pathname === "/api/account/local/vault" ||
          requestUrl.pathname === "/api/account/local/cosmetics" ||
          requestUrl.pathname === "/api/account/local/signal-search") {
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

          if (requestUrl.pathname === "/api/account/local/signal-search") {
            const level = typeof payload?.level === "string" ? payload.level : "";
            const quantity = payload?.quantity;
            const isLocalSearch = level === "local";
            if ((!isLocalSearch && !Object.prototype.hasOwnProperty.call(economy.SIGNAL_SEARCH_LEVELS, level)) ||
                (quantity !== 1 && quantity !== 10)) {
              sendJson(response, 400, { error: "Nível ou quantidade de buscas inválido." });
              return;
            }
            const message = getLocalGroupMessage(platform, groupId, String(platformAccount.platformId));
            if (!economy.isEnabled(message)) {
              sendJson(response, 400, { error: "A economia está desativada neste grupo ou servidor." });
              return;
            }
            const result = isLocalSearch
              ? economy.searchLocalSignals(message, quantity)
              : economy.searchSignals(message, level, quantity);
            if (!result.searched) {
              const errors = {
                "insufficient-balance": `Saldo insuficiente. Esta busca custa ${economy.formatMoney(result.price)} e sua carteira tem ${economy.formatMoney(result.balance)}. O saldo do cofre não pode ser usado.`,
                "invalid-level": "Nível de busca inválido.",
                "invalid-quantity": "Quantidade de buscas inválida.",
                disabled: "A Busca Local ainda não está configurada ou está desativada pelos administradores.",
                "unavailable-prizes": "Uma das raridades configuradas está sem prêmios disponíveis. Avise um administrador para revisar a Busca Local."
              };
              sendJson(response, 400, { error: errors[result.reason] || "Não foi possível fazer esta busca." });
              return;
            }
            const dailyProfits = economy.getDailyProfits(message);
            const totalBalance = economy.getTotalBalance(economy.getAccount(message).account);
            sendJson(response, 200, {
              success: true,
              balance: economy.formatMoney(result.balance),
              totalBalance: economy.formatMoney(totalBalance),
              rewards: result.rewards.map(reward => ({
                ...reward,
                amountFormatted: reward.type === "money" ? economy.formatMoney(reward.amount) : undefined
              })),
              dailyProfitTotal: economy.formatMoney(dailyProfits.total),
              dailySearchProfit: economy.formatMoney(dailyProfits.profits.busca),
              state: isLocalSearch ? { local: result.state } : result.state.levels
            });
            return;
          }

          if (requestUrl.pathname === "/api/account/local/cosmetics") {
            const message = getLocalGroupMessage(platform, groupId, String(platformAccount.platformId));
            if (payload?.action === "set") {
              const result = economy.setProfileBackground(message, payload?.background);
              if (!result.purchased) {
                sendJson(response, 400, {
                  error: result.reason === "insufficient-balance"
                    ? `Saldo insuficiente. Você precisa de ${economy.formatMoney(result.price)} e tem ${economy.formatMoney(result.balance)}.`
                    : "A cor selecionada não é válida."
                });
                return;
              }
              sendJson(response, 200, {
                success: true,
                background: result.background,
                boughtNow: result.boughtNow,
                balance: economy.formatMoney(result.balance)
              });
              return;
            }
            if (payload?.action === "setOutline") {
              const result = economy.setProfileOutline(message, payload?.outline);
              if (!result.purchased) {
                sendJson(response, 400, {
                  error: result.reason === "insufficient-balance"
                    ? `Saldo insuficiente. Você precisa de ${economy.formatMoney(result.price)} e tem ${economy.formatMoney(result.balance)}.`
                    : "A cor do outline selecionada não é válida."
                });
                return;
              }
              sendJson(response, 200, {
                success: true,
                outline: result.outline,
                boughtNow: result.boughtNow,
                balance: economy.formatMoney(result.balance)
              });
              return;
            }
            if (payload?.action === "setCircle") {
              const result = economy.setProfileCircle(message, payload?.circle);
              if (!result.purchased) {
                sendJson(response, 400, {
                  error: result.reason === "insufficient-balance"
                    ? `Saldo insuficiente. Você precisa de ${economy.formatMoney(result.price)} e tem ${economy.formatMoney(result.balance)}.`
                    : "O círculo de perfil selecionado não é válido."
                });
                return;
              }
              sendJson(response, 200, {
                success: true,
                circle: result.circle,
                boughtNow: result.boughtNow,
                balance: economy.formatMoney(result.balance)
              });
              return;
            }
            if (payload?.action === "setEffect") {
              const result = economy.setProfileEffect(message, payload?.effect);
              if (!result.purchased) {
                sendJson(response, 400, {
                  error: result.reason === "insufficient-balance"
                    ? `Saldo insuficiente. Você precisa de ${economy.formatMoney(result.price)} e tem ${economy.formatMoney(result.balance)}.`
                    : "O efeito de perfil selecionado não é válido."
                });
                return;
              }
              sendJson(response, 200, {
                success: true,
                effect: result.effect,
                boughtNow: result.boughtNow,
                balance: economy.formatMoney(result.balance)
              });
              return;
            }
            if (payload?.action === "reset") {
              const result = economy.resetProfileBackground(message);
              sendJson(response, 200, {
                success: true,
                changed: result.changed,
                balance: economy.formatMoney(economy.getBalance(message))
              });
              return;
            }
            if (payload?.action === "resetOutline") {
              const result = economy.resetProfileOutline(message);
              sendJson(response, 200, {
                success: true,
                changed: result.changed,
                balance: economy.formatMoney(economy.getBalance(message))
              });
              return;
            }
            if (payload?.action === "resetCircle" || payload?.action === "resetEffect") {
              const result = payload.action === "resetCircle"
                ? economy.resetProfileCircle(message)
                : economy.resetProfileEffect(message);
              sendJson(response, 200, {
                success: true,
                changed: result.changed,
                balance: economy.formatMoney(economy.getBalance(message))
              });
              return;
            }
            sendJson(response, 400, { error: "Ação de cosmético inválida." });
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

          if (requestUrl.pathname === "/api/account/local/vault") {
            const action = payload?.action === "deposit" ? "deposit" : payload?.action === "withdraw" ? "withdraw" : null;
            const amount = parseSatcoinAmount(payload?.amount, 1);
            if (!action || amount === null || amount <= 0) {
              sendJson(response, 400, { error: "Informe se deseja depositar ou sacar e uma quantia válida maior que zero." });
              return;
            }
            const message = getLocalGroupMessage(platform, groupId, String(platformAccount.platformId));
            if (!economy.isEnabled(message)) {
              sendJson(response, 400, { error: "A economia está desativada neste grupo/servidor." });
              return;
            }
            const result = action === "deposit"
              ? economy.depositToVault(message, amount)
              : economy.withdrawFromVault(message, amount);
            if (!result.moved) {
              const errors = {
                invalid_amount: action === "deposit"
                  ? `O valor mínimo por movimentação é de ${economy.formatMoney(result.minimumMovement)}.`
                  : `O valor mínimo por movimentação é de ${economy.formatMoney(result.minimumMovement)}.`,
                insufficient_balance: "Sua carteira não tem saldo suficiente para esse depósito.",
                insufficient_vault: "O cofre não tem saldo suficiente para esse saque.",
                daily_limit: `Você já fez ${action === "deposit" ? "um depósito" : "um saque"} hoje. Tente novamente amanhã.`
              };
              sendJson(response, 400, { error: errors[result.reason] || "Não foi possível movimentar o saldo do cofre." });
              return;
            }
            sendJson(response, 200, {
              success: true,
              balance: economy.formatMoney(result.balance),
              vaultBalance: economy.formatMoney(result.vaultBalance),
              totalBalance: economy.formatMoney(result.totalBalance),
              amount: economy.formatMoney(result.amount),
              requestedAmount: economy.formatMoney(result.requestedAmount),
              taxPaid: result.taxPaid ? economy.formatMoney(result.taxPaid) : null,
              taxPeriods: result.taxPeriods,
              shortfall: result.shortfall ? economy.formatMoney(result.shortfall) : null
            });
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
          const updatedAccount = economy.getAccount(message).account;
          sendJson(response, 200, {
            success: true,
            balance: economy.formatMoney(result.balance),
            vaultBalance: economy.formatMoney(updatedAccount.vaultBalance),
            totalBalance: economy.formatMoney(economy.getTotalBalance(updatedAccount)),
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

    if (requestUrl.pathname === "/demo-busca-sinais") {
      const central = await getSessionCentral(request);
      if (!central) {
        response.writeHead(302, { Location: "/dashboard", "Cache-Control": "no-store" });
        response.end();
        return;
      }
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff"
      });
      response.end(renderSignalSearchDemo(config.getBotName()));
      return;
    }

    const signalAudioFiles = {
      "/sinal.mp3": "sinal.mp3",
      "/sinal2.mp3": "sinal2.mp3"
    };
    if (Object.prototype.hasOwnProperty.call(signalAudioFiles, requestUrl.pathname)) {
      if (!await getSessionCentral(request)) {
        response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
        response.end("Sign in to play demo audio.");
        return;
      }
      try {
        const audio = await fs.promises.readFile(path.join(__dirname, "..", signalAudioFiles[requestUrl.pathname]));
        response.writeHead(200, {
          "Content-Type": "audio/mpeg",
          "Content-Length": audio.length,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(audio);
      } catch (error) {
        if (error.code === "ENOENT") {
          response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
          response.end("Demo audio file is missing.");
          return;
        }
        console.error(`[WEB] Não foi possível carregar o áudio ${signalAudioFiles[requestUrl.pathname]}:`, error.message || error);
        response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
        response.end("Demo audio unavailable.");
      }
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

    if (request.method === "GET" && requestUrl.pathname === "/api/account/local/home") {
      let central;
      try {
        central = await getSessionCentral(request);
      } catch (error) {
        console.error("[WEB] Falha ao validar sessão para o painel local do app:", error.message || error);
        sendJson(response, 500, { error: "Não foi possível validar sua sessão agora." });
        return;
      }
      if (!central) {
        sendJson(response, 401, { error: "Sua sessão expirou. Entre novamente para continuar." });
        return;
      }

      const platform = String(requestUrl.searchParams.get("platform") || "").toLowerCase();
      const groupId = String(requestUrl.searchParams.get("groupId") || "");
      if (!["discord", "telegram", "whatsapp"].includes(platform) || !isValidPlatformGroupId(groupId)) {
        sendJson(response, 400, { error: "Plataforma ou identificador do grupo inválido." });
        return;
      }

      try {
        const data = await getLocalAccountData(central, platform, groupId);
        const message = getLocalGroupMessage(platform, groupId, data.platformId);
        const xpEnabled = xp.load(message)?.enabled === true;
        const activityData = activity.ranking(message);
        const activityUser = activityData?.users?.find(user => String(user.userId) === data.platformId);
        const activityEnabled = activityData?.enabled === true;
        const challenge = data.localProfile.september;
        const participant = challenge?.participant;
        let nofapPosition = null;
        if (challenge && participant?.active) {
          nofapPosition = nofapGroupHelper.getGroupRankings(platform, groupId)
            .find(member => String(member.centralId) === central.id)?.position || null;
        }

        let groupType = platform === "discord" ? "server" : "group";
        if (platform === "telegram") {
          const bot = global.telegramBot;
          if (!bot?.telegram) throw new Error("O Telegram está offline no momento.");
          const chat = await bot.telegram.getChat(groupId);
          if (chat.is_forum) groupType = "forum";
        }

        const backgroundDefinition = data.profileBackground
          ? economy.PROFILE_BACKGROUNDS[data.profileBackground]
          : null;
        const outlineDefinition = data.profileOutline
          ? economy.PROFILE_OUTLINES[data.profileOutline]
          : null;
        const circleDefinition = data.profileCircle
          ? economy.PROFILE_CIRCLES[data.profileCircle]
          : null;
        const effectDefinition = data.profileEffect
          ? economy.PROFILE_EFFECTS[data.profileEffect]
          : null;
        const cosmetics = {
          enabled: true,
          applied: Boolean(backgroundDefinition || outlineDefinition || circleDefinition || effectDefinition),
          background: backgroundDefinition ? {
            key: data.profileBackground,
            label: backgroundDefinition.label,
            stops: backgroundDefinition.stops,
            accent: backgroundDefinition.accent,
            rainbow: Boolean(backgroundDefinition.rainbow)
          } : null,
          outline: outlineDefinition ? {
            key: data.profileOutline,
            label: outlineDefinition.label,
            color: outlineDefinition.color,
            rainbow: Boolean(outlineDefinition.rainbow),
            frozen: Boolean(outlineDefinition.frozen)
          } : null,
          circle: circleDefinition ? {
            key: data.profileCircle,
            label: circleDefinition.label,
            color: circleDefinition.color,
            rainbow: Boolean(circleDefinition.rainbow),
            frozen: Boolean(circleDefinition.frozen)
          } : null,
          effect: effectDefinition ? {
            key: data.profileEffect,
            label: effectDefinition.label,
            snowflakes: Boolean(effectDefinition.snowflakes)
          } : null
        };
        const groupTypeLabels = {
          server: "Servidor",
          group: "Grupo",
          forum: "Grupo com tópicos"
        };
        const platformNames = {
          discord: "Discord",
          telegram: "Telegram",
          whatsapp: "WhatsApp"
        };

        sendJson(response, 200, {
          user: {
            id: data.platformId,
            name: data.userName,
            avatarUrl: data.avatarUrl
          },
          group: {
            id: data.groupId,
            name: data.groupName,
            type: groupType,
            typeLabel: groupTypeLabels[groupType]
          },
          platform,
          platformName: platformNames[platform],
          warnings: {
            enabled: true,
            count: data.warnings,
            maximum: data.maxWarnings
          },
          xp: {
            enabled: xpEnabled,
            value: xpEnabled ? data.localProfile.xp.value : 0,
            level: xpEnabled ? data.localProfile.xp.level : 0,
            position: xpEnabled ? data.localProfile.xp.position : null
          },
          activity: {
            enabled: activityEnabled,
            total: activityEnabled ? data.localProfile.activity.total : 0,
            byType: {
              messages: activityEnabled ? data.localProfile.activity.messages : 0,
              commands: activityEnabled ? data.localProfile.activity.commands : 0,
              stickers: activityEnabled ? data.localProfile.activity.stickers : 0,
              files: activityEnabled ? data.localProfile.activity.files : 0
            },
            today: {
              total: activityEnabled ? Number(activityUser?.dailyTotal) || 0 : 0,
              byType: {
                messages: activityEnabled ? Number(activityUser?.dailyMessages) || 0 : 0,
                commands: activityEnabled ? Number(activityUser?.dailyCommands) || 0 : 0,
                stickers: activityEnabled ? Number(activityUser?.dailyStickers) || 0 : 0,
                files: activityEnabled ? Number(activityUser?.dailyFiles) || 0 : 0
              }
            },
            position: activityEnabled ? data.localProfile.activity.position : null
          },
          economy: {
            enabled: data.economyEnabled,
            walletBalance: data.economyEnabled ? data.account.balance : 0,
            vaultBalance: data.economyEnabled ? data.account.vaultBalance : 0,
            position: data.economyEnabled ? data.ranks.balance : null
          },
          nofap: {
            enabled: Boolean(challenge),
            active: Boolean(challenge && participant?.active),
            currentDays: challenge && participant?.active ? participant.currentDays : 0,
            resets: challenge && participant?.active ? participant.resetCount : 0,
            position: challenge && participant?.active ? nofapPosition : null
          },
          cosmetics
        });
      } catch (error) {
        const reason = String(error?.message || "");
        const statusCode = /não participa|não está vinculada/i.test(reason) ? 403
          : /offline/i.test(reason) ? 503
            : /inválido/i.test(reason) ? 400 : 500;
        if (statusCode === 500 || statusCode === 503) {
          console.error("[WEB] Falha ao carregar o painel local do app:", error.message || error);
        }
        const errorMessage = statusCode === 400 || statusCode === 403
          ? reason
          : statusCode === 503
            ? "A plataforma está indisponível no momento."
            : "Não foi possível carregar o painel deste grupo.";
        sendJson(response, statusCode, { error: errorMessage });
      }
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/api/account/local/bank") {
      let central;
      try {
        central = await getSessionCentral(request);
      } catch (error) {
        console.error("[WEB] Falha ao validar sessão para o banco do app:", error.message || error);
        sendJson(response, 500, { error: "Não foi possível validar sua sessão agora." });
        return;
      }
      if (!central) {
        sendJson(response, 401, { error: "Sua sessão expirou. Entre novamente para continuar." });
        return;
      }

      const platform = String(requestUrl.searchParams.get("platform") || "").toLowerCase();
      const groupId = String(requestUrl.searchParams.get("groupId") || "");
      if (!["discord", "telegram", "whatsapp"].includes(platform) || !isValidPlatformGroupId(groupId)) {
        sendJson(response, 400, { error: "Plataforma ou identificador do grupo inválido." });
        return;
      }

      try {
        const data = await getLocalAccountData(central, platform, groupId);
        const message = getLocalGroupMessage(platform, groupId, data.platformId);
        const account = economy.getAccountByUser(message, data.platformId);
        const today = economy.getLocalDate();
        const vaultConfig = data.vaultConfig || economy.getVaultConfig(message);
        const minimumVaultAmount = Math.max(1, Number(vaultConfig?.minimumMovement) || 0);
        const balance = Number(data.account.balance) || 0;
        const vaultBalance = Number(data.account.vaultBalance) || 0;
        const taskStatus = (used, maximum, extra = {}) => ({
          used,
          maximum,
          remaining: Math.max(0, maximum - used),
          ...extra
        });
        const statementLabels = [
          ["resgate", "Resgate diário"],
          ["trabalho", "Trabalho"],
          ["pesca", "Pesca"],
          ["mineracao", "Mineração"],
          ["cassino", "Cassino"],
          ["transferenciaEnviada", "Transferências enviadas"],
          ["transferenciaRecebida", "Transferências recebidas"],
          ["roubo", "Roubos feitos"],
          ["rouboSofrido", "Roubos sofridos"],
          ["loja", "Loja"],
          ["busca", "Busca de Sinais"],
          ["impostoCofre", "Impostos pagos no cofre"]
        ];
        const statementEntries = statementLabels.map(([key, label]) => {
          const amount = Number(data.dailyProfits?.[key]) || 0;
          return {
            key,
            label,
            amountMinorUnits: amount,
            amountFormatted: amount > 0
              ? `+${economy.formatMoney(amount)}`
              : economy.formatMoney(amount)
          };
        });
        const groupType = platform === "discord" ? "server" : "group";
        const groupTypeLabel = platform === "discord" ? "Servidor" : "Grupo";
        const totalBalance = balance + vaultBalance;
        const transferMinimum = economy.MIN_TRANSFER_AMOUNT;
        const depositUsedToday = account?.vaultDepositDate === today;
        const withdrawalUsedToday = account?.vaultWithdrawDate === today;

        sendJson(response, 200, {
          platform,
          group: {
            id: data.groupId,
            name: data.groupName,
            type: groupType,
            typeLabel: groupTypeLabel
          },
          user: {
            id: data.platformId,
            name: data.userName,
            avatarUrl: data.avatarUrl
          },
          economyEnabled: data.economyEnabled,
          balances: {
            walletMinorUnits: balance,
            walletFormatted: economy.formatMoney(balance),
            vaultMinorUnits: vaultBalance,
            vaultFormatted: economy.formatMoney(vaultBalance),
            totalMinorUnits: totalBalance,
            totalFormatted: economy.formatMoney(totalBalance),
            position: data.ranks.balance
          },
          dailyActivities: {
            date: today,
            dailyClaim: {
              claimed: data.account.dailyClaimed,
              ...taskStatus(data.account.dailyClaimed ? 1 : 0, 1)
            },
            work: taskStatus(data.account.workCount, economy.MAX_WORKS_PER_DAY, {
              lastJob: data.account.lastJob
            }),
            fishing: taskStatus(data.account.fishingCount, economy.MAX_WORKS_PER_DAY),
            mining: taskStatus(data.account.miningCount, economy.MAX_WORKS_PER_DAY),
            casino: taskStatus(data.account.casinoCount, economy.MAX_CASINO_PER_DAY),
            robberies: taskStatus(data.account.robberyCount, economy.MAX_ROBBERIES_PER_DAY),
            transfers: taskStatus(data.account.transferCount, economy.MAX_TRANSFERS_PER_DAY)
          },
          statement: {
            date: today,
            entries: statementEntries,
            netMinorUnits: Number(data.dailyProfitTotal) || 0,
            netFormatted: economy.formatMoney(Number(data.dailyProfitTotal) || 0)
          },
          limits: {
            transferMinimumMinorUnits: transferMinimum,
            transferMinimumFormatted: economy.formatMoney(transferMinimum),
            transfersPerDay: economy.MAX_TRANSFERS_PER_DAY,
            depositsPerDay: 1,
            withdrawalsPerDay: 1
          },
          vault: {
            enabled: data.economyEnabled,
            mode: vaultConfig.mode,
            modeDescription: vaultModeDescription(vaultConfig),
            configuredMinimumMinorUnits: vaultConfig.minimumMovement,
            minimumAmountMinorUnits: minimumVaultAmount,
            minimumAmountFormatted: economy.formatMoney(minimumVaultAmount),
            depositUsedToday,
            depositsRemainingToday: depositUsedToday ? 0 : 1,
            withdrawalUsedToday,
            withdrawalsRemainingToday: withdrawalUsedToday ? 0 : 1
          }
        });
      } catch (error) {
        const reason = String(error?.message || "");
        const statusCode = /não participa|não está vinculada/i.test(reason) ? 403
          : /offline|não está disponível/i.test(reason) ? 503
            : /inválido/i.test(reason) ? 400 : 500;
        if (statusCode === 500 || statusCode === 503) {
          console.error("[WEB] Falha ao carregar o banco do app:", error.message || error);
        }
        const errorMessage = statusCode === 400 || statusCode === 403
          ? reason
          : statusCode === 503
            ? "A plataforma está indisponível no momento."
            : "Não foi possível carregar os dados do banco.";
        sendJson(response, statusCode, { error: errorMessage });
      }
      return;
    }

    if (request.method === "GET" && (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html")) {
      const central = await getSessionCentral(request);
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff"
      });
      response.end(renderHome(config.getBotName(), null, "", Boolean(central)));
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/dashboard") {
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

    if (request.method === "GET" && requestUrl.pathname === "/novidades") {
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff"
      });
      response.end(renderChangelog(config.getBotName()));
      return;
    }

    if (request.method === "GET" && ["/painel-local", "/painel-banco", "/busca-sinais"].includes(requestUrl.pathname)) {
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
        response.end(requestUrl.pathname === "/busca-sinais"
          ? renderSignalSearch(data)
          : requestUrl.pathname === "/painel-banco"
            ? renderLocalBank(data)
            : renderLocalAccount(data));
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
        const pageTitle = requestUrl.pathname === "/busca-sinais" ? "Busca indisponível" : "Painel local indisponível";
        response.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${pageTitle}</title><body style="font-family:Segoe UI,Arial;background:#10131c;color:#f5f7fb;padding:40px"><h1>${pageTitle}</h1><p>${escapeHtml(reason)}</p><a href="/dashboard" style="color:#b9c6ff">Voltar à Conta Central</a></body></html>`);
      }
      return;
    }

    if (request.method === "GET" && ["/loja-cosmeticos", "/loja-bot", "/mercado-local"].includes(requestUrl.pathname)) {
      const central = await getSessionCentral(request);
      if (!central) {
        response.writeHead(302, { Location: "/dashboard", "Cache-Control": "no-store" });
        response.end();
        return;
      }
      const platform = String(requestUrl.searchParams.get("plataforma") || "").toLowerCase();
      const groupId = String(requestUrl.searchParams.get("grupo") || "");
      const shopType = requestUrl.pathname === "/loja-bot"
        ? "bot"
        : requestUrl.pathname === "/mercado-local"
          ? "market"
          : "cosmetics";
      try {
        const accountData = await getLocalAccountData(central, platform, groupId);
        const message = getLocalGroupMessage(platform, groupId, accountData.platformId);
        const pageData = {
          platform,
          groupId,
          groupName: accountData.groupName,
          userName: accountData.userName,
          balance: accountData.account.balance,
          shieldCharges: accountData.account.shieldCharges,
          account: accountData.account,
          profileBackground: accountData.profileBackground,
          profileOutline: accountData.profileOutline
        };
        let html;
        if (shopType === "cosmetics") {
          pageData.cosmetics = economy.getProfileCosmetics(message, accountData.platformId);
          html = renderCosmeticsStore(pageData);
        } else if (shopType === "bot") {
          pageData.items = economy.getStoreItems();
          html = renderShopCatalog(pageData, shopType);
        } else {
          pageData.store = economy.getCommunityStore(message);
          if (!pageData.store) throw new Error("Mercado Local indisponível para este grupo ou servidor.");
          html = renderShopCatalog(pageData, shopType);
        }
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(html);
      } catch (error) {
        const reason = String(error?.message || "");
        const statusCode = /não participa|não está vinculada/i.test(reason) ? 403
          : /offline/i.test(reason) ? 503 : 400;
        if (statusCode === 503) {
          console.error("[WEB] Falha ao abrir uma loja do painel local:", error.message || error);
        }
        response.writeHead(statusCode, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Loja indisponível</title><body style="font-family:Segoe UI,Arial;background:#10131c;color:#f5f7fb;padding:40px"><h1>Loja indisponível</h1><p>${escapeHtml(reason)}</p><a href="/dashboard" style="color:#b9c6ff">Voltar à Conta Central</a></body></html>`);
      }
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/painel-economia") {
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
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(renderEconomyAdmin(data));
      } catch (error) {
        const reason = String(error?.message || "");
        const statusCode = /não participa|não está vinculada|permissão administrativa/i.test(reason) ? 403
          : /offline/i.test(reason) ? 503 : /inválid/i.test(reason) ? 400 : 500;
        if (statusCode === 503 || statusCode === 500) {
          console.error("[WEB] Falha ao abrir as configurações da economia:", error.message || error);
        }
        response.writeHead(statusCode, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Configurações indisponíveis</title><body style="font-family:Segoe UI,Arial;background:#10131c;color:#f5f7fb;padding:40px"><h1>Configurações da economia indisponíveis</h1><p>${escapeHtml(reason || "Não foi possível carregar as configurações.")}</p><a href="/dashboard" style="color:#b9c6ff">Voltar à Conta Central</a></body></html>`);
      }
      return;
    }

    if (request.method === "GET" && ["/painel-agendamentos", "/painel-monitores"].includes(requestUrl.pathname)) {
      const central = await getSessionCentral(request);
      if (!central) {
        response.writeHead(302, { Location: "/dashboard", "Cache-Control": "no-store" });
        response.end();
        return;
      }
      const platform = String(requestUrl.searchParams.get("plataforma") || "").toLowerCase();
      const groupId = String(requestUrl.searchParams.get("grupo") || "");
      let requestedScope = null;
      try {
        requestedScope = JSON.parse(String(requestUrl.searchParams.get("scope") || "null"));
      } catch {
        requestedScope = null;
      }
      try {
        const data = await getGroupAdminData(central, platform, groupId);
        const html = requestUrl.pathname === "/painel-agendamentos"
          ? renderSchedulesAdmin({ ...data, requestedScope })
          : renderMonitorsAdmin({ ...data, requestedScope });
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(html);
      } catch (error) {
        const reason = String(error?.message || "");
        const statusCode = /não participa|não está vinculada|permissão administrativa/i.test(reason) ? 403
          : /offline/i.test(reason) ? 503 : /inválid/i.test(reason) ? 400 : 500;
        if (statusCode === 503 || statusCode === 500) {
          console.error("[WEB] Falha ao abrir painel de agendamentos ou monitores:", error.message || error);
        }
        response.writeHead(statusCode, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Painel indisponível</title><body style="font-family:Segoe UI,Arial;background:#10131c;color:#f5f7fb;padding:40px"><h1>Painel indisponível</h1><p>${escapeHtml(reason || "Não foi possível carregar as configurações.")}</p><a href="/painel-admin?plataforma=${encodeURIComponent(platform)}&grupo=${encodeURIComponent(groupId)}" style="color:#b9c6ff">Voltar ao painel de administração</a></body></html>`);
      }
      return;
    }

    if (request.method === "GET" && [
      "/painel-autodownload", "/painel-autoia", "/painel-autorepo", "/painel-transcrever"
    ].includes(requestUrl.pathname)) {
      const setting = requestUrl.pathname === "/painel-autodownload" ? "autodownload"
        : requestUrl.pathname === "/painel-autoia" ? "autoia"
          : requestUrl.pathname === "/painel-autorepo" ? "autorepo" : "autoTranscribe";
      const central = await getSessionCentral(request);
      if (!central) {
        response.writeHead(302, { Location: "/dashboard", "Cache-Control": "no-store" });
        response.end();
        return;
      }
      const platform = String(requestUrl.searchParams.get("plataforma") || "").toLowerCase();
      const groupId = String(requestUrl.searchParams.get("grupo") || "");
      let requestedScope = null;
      try {
        requestedScope = JSON.parse(String(requestUrl.searchParams.get("scope") || "null"));
      } catch {
        requestedScope = null;
      }
      try {
        const data = await getGroupAdminData(central, platform, groupId);
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(renderAutomationAdmin(data, setting, requestedScope));
      } catch (error) {
        const reason = String(error?.message || "");
        const statusCode = /não participa|não está vinculada|permissão administrativa/i.test(reason) ? 403
          : /offline/i.test(reason) ? 503 : /inválid/i.test(reason) ? 400 : 500;
        if (statusCode === 503 || statusCode === 500) {
          console.error("[WEB] Falha ao abrir painel de automação:", error.message || error);
        }
        response.writeHead(statusCode, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Painel indisponível</title><body style="font-family:Segoe UI,Arial;background:#10131c;color:#f5f7fb;padding:40px"><h1>Painel indisponível</h1><p>${escapeHtml(reason || "Não foi possível carregar as configurações.")}</p><a href="/painel-admin?plataforma=${encodeURIComponent(platform)}&grupo=${encodeURIComponent(groupId)}" style="color:#b9c6ff">Voltar ao painel de administração</a></body></html>`);
      }
      return;
    }

    if (request.method === "GET" && ["/painel-xp", "/painel-atividade"].includes(requestUrl.pathname)) {
      const setting = requestUrl.pathname === "/painel-xp" ? "xp" : "activity";
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
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(renderRpSystemAdmin(data, setting));
      } catch (error) {
        const reason = String(error?.message || "");
        const statusCode = /não participa|não está vinculada|permissão administrativa/i.test(reason) ? 403
          : /offline/i.test(reason) ? 503 : /inválid/i.test(reason) ? 400 : 500;
        if (statusCode === 503 || statusCode === 500) {
          console.error("[WEB] Falha ao abrir painel de XP ou atividade:", error.message || error);
        }
        response.writeHead(statusCode, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Painel indisponível</title><body style="font-family:Segoe UI,Arial;background:#10131c;color:#f5f7fb;padding:40px"><h1>Painel indisponível</h1><p>${escapeHtml(reason || "Não foi possível carregar as configurações.")}</p><a href="/painel-admin?plataforma=${encodeURIComponent(platform)}&grupo=${encodeURIComponent(groupId)}" style="color:#b9c6ff">Voltar ao painel de administração</a></body></html>`);
      }
      return;
    }

    if (request.method === "GET" && [
      "/painel-antilink", "/painel-antipalavras", "/painel-antimedia", "/painel-antiraid", "/painel-blockcmd", "/painel-boas-vindas"
    ].includes(requestUrl.pathname)) {
      const setting = requestUrl.pathname === "/painel-antipalavras" ? "antipalavras"
        : requestUrl.pathname === "/painel-antimedia" ? "antimedia"
          : requestUrl.pathname === "/painel-antiraid" ? "antiraid"
            : requestUrl.pathname === "/painel-blockcmd" ? "blockcmd"
              : requestUrl.pathname === "/painel-boas-vindas" ? "boas-vindas" : "antilink";
      const renderPage = setting === "antipalavras" ? renderAntipalavrasAdmin
        : setting === "antimedia" ? renderAntimediaAdmin
          : setting === "antiraid" ? renderAntiraidAdmin
            : setting === "blockcmd" ? renderBlockcmdAdmin
              : setting === "boas-vindas" ? renderWelcomeAdmin : renderAntilinkAdmin;
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
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(renderPage(data));
      } catch (error) {
        const reason = String(error?.message || "");
        const statusCode = /não participa|não está vinculada|permissão administrativa/i.test(reason) ? 403
          : /offline/i.test(reason) ? 503 : /inválid/i.test(reason) ? 400 : 500;
        if (statusCode === 503 || statusCode === 500) {
          console.error(`[WEB] Falha ao abrir as configurações de ${setting}:`, error.message || error);
        }
        response.writeHead(statusCode, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        });
        response.end(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Configurações indisponíveis</title><body style="font-family:Segoe UI,Arial;background:#10131c;color:#f5f7fb;padding:40px"><h1>Configurações de ${escapeHtml(setting)} indisponíveis</h1><p>${escapeHtml(reason || "Não foi possível carregar as configurações.")}</p><a href="/dashboard" style="color:#b9c6ff">Voltar à Conta Central</a></body></html>`);
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

module.exports = { start, readProfile, renderProfile, readRanking, readActivityRanking, renderRanking, renderChangelog, renderLocalAccount, renderLocalBank, renderSignalSearch, renderCosmeticsStore, renderShopCatalog, renderGroupAdmin, renderEconomyAdmin, renderAntilinkAdmin, renderAntipalavrasAdmin, renderAntimediaAdmin, renderAntiraidAdmin, renderBlockcmdAdmin, renderWelcomeAdmin, renderAutomationAdmin, renderRpSystemAdmin, renderSchedulesAdmin, renderMonitorsAdmin, canManagePlatformGroup };
