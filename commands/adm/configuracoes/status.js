/*
=================================================================

COMANDO: !status

Mostra o estado hierárquico das regras de moderação no chat atual.
Apenas administradores podem usar.

Modos disponíveis:
  !status
    • Exibe resumo das regras e o nível ativo para o chat atual.
  !status full
    • Exibe a permissão final aplicada ao chat atual, considerando hierarquia.
  !status full all
    • Exibe todos os nós configurados no servidor/grupo para todos os recursos.
  !status antilink
    • Exibe o status apenas do antilink.
  !status antipalavras
    • Exibe o status apenas do antipalavras.
  !status antimedia
    • Exibe o status apenas do antimedia.
  !status antiraid
    • Exibe o status apenas do anti-raid.
  !status blockcmd
    • Exibe o status apenas do bloqueio de comandos.
  !status welcome
    • Exibe o status do welcome (boas-vindas).
  !status goodbye
    • Exibe o status do goodbye (despedida).
  !status warnconfig
    • Exibe o status das advertências (warns).

=================================================================
*/

const {
    getLevelLabel,
    getAvailableLevels,
    resolveAntilinkConfig,
    getSetAntilink,
    readAntilink
} = require("../../../functions/antilinkHelper");
const {
    resolveAntipalavrasConfig,
    getSetAntipalavras,
    readAntipalavras
} = require("../../../functions/antipalavrasHelper");
const {
    resolveAntimediaConfig,
    getSetAntimedia,
    readAntimedia
} = require("../../../functions/antimediaHelper");
const {
    resolveAntiRaidConfig,
    getSetAntiRaid,
    readAntiRaid
} = require("../../../functions/antiraidHelper");
const {
    resolveBlockcmdConfig,
    getSetBlockcmd,
    readBlockcmd
} = require("../../../functions/blockcmdHelper");
const {
    getWelcomeConfig,
    getGoodbyeConfig,
    getDefaultWelcomeConfig,
    getDefaultGoodbyeConfig
} = require("../../../functions/welcomeHelper");
const { getWarnConfig } = require("../../../functions/warnHelper");
const { loadSettings } = require("../../../functions/groupSettings");
const { getAutoIAMode } = require("../../../functions/autoiaHelper");
const autorepoHelper = require("../../../functions/autorepoHelper");
const cafeMonitor = require("../../../functions/cafeMonitor");
const weatherMonitor = require("../../../functions/weatherMonitor");
const randomWeatherMonitor = require("../../../functions/randomWeatherMonitor");
const stockMonitor = require("../../../functions/stockMonitor");
const autoAccept = require("../../../functions/autoAccept");
const { listSchedules, formatTs } = require("../../../functions/schedulerHelper");
const { formatRoleMention } = require("../../../functions/antiHelper");

const DESCRIPTION = `📊 Consulta o estado das configurações e dos recursos deste grupo ou servidor.

🔐 Disponível para administradores do chat e superusuários.

🔎 1. Veja um resumo do chat atual:
{prefix}status

Mostra as regras de moderação, os sistemas de boas-vindas e despedida, warns, monitores, outras configurações e agendamentos.

📋 2. Consulte a configuração final aplicada:
{prefix}status full

Mostra as configurações efetivas no chat atual, considerando a hierarquia entre os níveis configurados.

Para ver todos os nós configurados e todos os recursos:
{prefix}status full all

Para consultar um recurso específico:
{prefix}status full <recurso>
{prefix}status full antiraid

🔧 3. Consulte o resumo de um recurso:
{prefix}status <recurso>
{prefix}status antilink

Recursos disponíveis: antilink, antipalavras, antimedia, antiraid, blockcmd, welcome, goodbye e warnconfig.

❔ Exiba esta ajuda:
{prefix}status help`;

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

const FEATURES = {
    antilink: {
        label: "Antilink",
        resolve: resolveAntilinkConfig,
        getSet: getSetAntilink,
        read: readAntilink,
        fields: ["enabled", "action", "ignoreParent", "ignoreSameGroup", "ignoreMedia", "whitelist", "userWhitelist", "userBlacklist", "roleWhitelist", "roleBlacklist"]
    },
    antipalavras: {
        label: "Antipalavras",
        resolve: resolveAntipalavrasConfig,
        getSet: getSetAntipalavras,
        read: readAntipalavras,
        fields: ["enabled", "action", "ignoreParent", "words", "userWhitelist", "userBlacklist", "roleWhitelist", "roleBlacklist"]
    },
    antimedia: {
        label: "Antimedia",
        resolve: resolveAntimediaConfig,
        getSet: getSetAntimedia,
        read: readAntimedia,
        fields: ["enabled", "action", "ignoreParent", "mediaTypes", "userWhitelist", "userBlacklist", "roleWhitelist", "roleBlacklist"]
    },
    antiraid: {
        label: "Anti-Raid",
        resolve: resolveAntiRaidConfig,
        getSet: getSetAntiRaid,
        read: readAntiRaid,
        fields: ["enabled", "action", "maxMessagesPerWindow", "windowSeconds", "repeatedMessageLimit", "inviteLimit", "linkLimit", "mentionLimit", "webhookLimit", "userWhitelist", "userBlacklist", "roleWhitelist", "roleBlacklist"]
    },
    blockcmd: {
        label: "Bloqueio de Comandos (Blockcmd)",
        resolve: resolveBlockcmdConfig,
        getSet: getSetBlockcmd,
        read: readBlockcmd,
        fields: ["enabled", "action", "ignoreParent", "message", "blockedCommands"]
    }
};

const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "status",
    category: "adm/configurações",
    description: DESCRIPTION,
    usage: "{prefix}status",
    examples: [
        "{prefix}status",
        "{prefix}status full",
        "{prefix}status full all",
        "{prefix}status antilink",
        "{prefix}status antipalavras",
        "{prefix}status antimedia",
        "{prefix}status antiraid",
        "{prefix}status blockcmd",
        "{prefix}status welcome",
        "{prefix}status goodbye",
        "{prefix}status warnconfig",
        "{prefix}status full welcome",
        "{prefix}status full antiraid",
        "{prefix}status help"
    ],
    info(message) {
        return helpText(message);
    },

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos/servidores." });
        }

        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = isOwner(message) || (adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : message.sender?.isAdmin);

        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores podem usar este comando." });
        }

        const args = message.args || [];
        const first = args[0]?.toLowerCase();

        if (!first) {
            return message.reply({ text: _summary(message) });
        }

        if (first === "help" || first === "?") {
            return message.reply({ text: helpText(message) });
        }

        if (first === "full") {
            const second = args[1]?.toLowerCase();
            if (second === "all") {
                const text = await _fullAll(message);
                return _sendChunkedReply(message, text);
            }
            if ([...Object.keys(FEATURES), "welcome", "goodbye", "warnconfig"].includes(second)) {
                return message.reply({ text: await _fullFeature(message, second) });
            }
            return message.reply({ text: await _fullCurrent(message) });
        }

        if (Object.keys(FEATURES).includes(first)) {
            return message.reply({ text: await _featureSummary(message, first) });
        }

        if (first === "welcome") {
            return message.reply({ text: _welcomeSummary(message) });
        }

        if (first === "goodbye") {
            return message.reply({ text: _goodbyeSummary(message) });
        }

        if (first === "warnconfig") {
            return message.reply({ text: _warnSummary(message) });
        }

        return message.reply({ text: helpText(message) });
    }
};

function _summary(message) {
    const blocks = ["🔎 Status geral deste chat:"];

    for (const featureName of Object.keys(FEATURES)) {
        blocks.push(_featureSummaryLines(message, featureName).join("\n"));
    }

    blocks.push(_welcomeSummaryLines(message).join("\n"));
    blocks.push(_goodbyeSummaryLines(message).join("\n"));
    blocks.push(_warnSummaryLines(message).join("\n"));
    blocks.push(_chatSettingsSummary(message).join("\n"));
    blocks.push(_monitorSummary(message).join("\n"));
    blocks.push(_scheduleSummary(message).join("\n"));
    blocks.push('Use "status full" para ver a permissão final considerando a hierarquia.');

    return blocks.filter(Boolean).join("\n\n");
}

async function _featureSummary(message, featureName) {
    const lines = [
        `🔎 ${FEATURES[featureName].label} - Resumo do chat atual:`
    ];
    lines.push(..._featureSummaryLines(message, featureName));
    lines.push(`\nUse "status full ${featureName}" para ver a permissão final deste recurso.`);
    return lines.join("\n");
}

function _formatMediaInfo(media) {
    if (!media) return "❌ não configurada";
    if (media.path) return `✅ configurada (💾 Local: ${media.type || "mídia"})`;
    if (media.url) return `✅ configurada (🌐 Web: ${media.type || "mídia"})`;
    return "❌ não configurada";
}

function _welcomeSummary(message) {
    const { platform, chatId, threadId, raw } = message;
    let serverId = null;
    if (platform === "discord") serverId = raw?.guild ? String(raw.guild.id) : null;

    const { config } = getWelcomeConfig(platform, serverId, chatId, threadId);
    return _welcomeSummaryLines(message, config).join("\n");
}

function _goodbyeSummary(message) {
    const { platform, chatId, threadId, raw } = message;
    let serverId = null;
    if (platform === "discord") serverId = raw?.guild ? String(raw.guild.id) : null;

    const { config } = getGoodbyeConfig(platform, serverId, chatId, threadId);
    return _goodbyeSummaryLines(message, config).join("\n");
}

function _warnSummary(message) {
    const config = getWarnConfig(message);
    return _warnSummaryLines(message, config).join("\n");
}

function _welcomeSummaryLines(message, config) {
    if (!config) {
        const { platform, chatId, threadId, raw } = message;
        let serverId = null;
        if (platform === "discord") serverId = raw?.guild ? String(raw.guild.id) : null;
        config = getWelcomeConfig(platform, serverId, chatId, threadId).config;
    }
    const status = config?.enabled ? "✅ Ativo" : "❌ Desativado";
    return [
        `🔎 Welcome - ${status}`,
        `  modo: ${config?.mode || "texto"}`,
        `  texto: ${config?.text ? config.text : "(padrão)"}`,
        `  mídia: ${_formatMediaInfo(config?.media)}`
    ];
}

function _goodbyeSummaryLines(message, config) {
    if (!config) {
        const { platform, chatId, threadId, raw } = message;
        let serverId = null;
        if (platform === "discord") serverId = raw?.guild ? String(raw.guild.id) : null;
        config = getGoodbyeConfig(platform, serverId, chatId, threadId).config;
    }
    const status = config?.enabled ? "✅ Ativo" : "❌ Desativado";
    return [
        `🔎 Goodbye - ${status}`,
        `  modo: ${config?.mode || "texto"}`,
        `  texto: ${config?.text ? config.text : "(padrão)"}`,
        `  mídia: ${_formatMediaInfo(config?.media)}`
    ];
}

function _warnSummaryLines(message, config) {
    if (!config) {
        return [
            "🔎 Warnconfig - ❌ Não configurado",
            "  padrão: máx. 3 warns, ação ban"
        ];
    }

    return [
        "🔎 Warnconfig - ✅ Configurado",
        `  máx. warns: ${config.max}`,
        `  ação: ${config.action}`
    ];
}

function _chatSettingsSummary(message) {
    const settings = _getCurrentChatSettings(message);
    const autoIA = getAutoIAMode(message);
    const autodownload = settings.autodownload;
    const nofap = settings.setembroNofap;
    const autorepoConfig = autorepoHelper.loadGroup(message);
    const autorepoStatus = autorepoConfig && autorepoConfig.enabled !== false
        ? `✅ Ativo (${(autorepoConfig.responses || []).length} locais)`
        : "❌ Desativado";

    return [
        "🔎 Outras configurações:",
        `  Auto-IA: ${autoIA === "off" ? "❌ Desativado" : `✅ Ativo (${autoIA})`}`,
        `  Autoresposta: ${autorepoStatus}`,
        `  Auto-download: ${autodownload?.enabled ? `✅ Ativo${autodownload.deletelink ? " (apagar link: Sim)" : ""}` : "❌ Desativado"}`,
        `  Setembro/NoFap no chat: ${nofap?.enabled ? `✅ Ativo (${Object.keys(nofap.participants || {}).length} participantes)` : "❌ Desativado"}`
    ];
}

function _monitorSummary(message) {
    const target = _monitorTarget(message);
    const cafe = cafeMonitor.loadMonitorConfig(target);
    const weather = weatherMonitor.loadMonitorConfig(target);
    const randomWeather = randomWeatherMonitor.loadMonitorConfig(target);
    const stock = stockMonitor.loadMonitorConfig(target);
    const autoApprove = autoAccept.getConfig(target);

    return [
        "🔎 Monitores:",
        `  Café: ${cafe.enabled ? `✅ Ativo (${cafe.mode || "both"}; ${(cafe.sources || []).join(", ")})` : "❌ Desativado"}`,
        `  Clima: ${weather.enabled ? `✅ Ativo (${weather.city || "cidade não definida"})` : "❌ Desativado"}`,
        `  Rclima: ${randomWeather.enabled ? `✅ Ativo (${randomWeather.cities.length} cidade(s))` : "❌ Desativado"}`,
        `  Bolsa: ${stock.enabled ? `✅ Ativo (${Array.isArray(stock.symbols) ? stock.symbols.length : 0} ativo(s))` : "❌ Desativado"}`,
        `  Autoaceitar: ${autoApprove.enabled ? `✅ Ativo (${autoApprove.intervalSeconds}s)` : "❌ Desativado"}`
    ];
}

function _scheduleSummary(message) {
    const schedules = listSchedules(String(message.chatId), message.platform)
        .filter(schedule => !message.threadId || !schedule.threadId || schedule.threadId === message.threadId);

    if (!schedules.length) {
        return ["🔎 Agendamentos: ❌ Nenhum configurado neste chat."];
    }

    return [
        `🔎 Agendamentos: ${schedules.length} configurado(s)`,
        ...schedules.map(schedule =>
            `  ${schedule.enabled ? "✅" : "🔕"} ${schedule.name || schedule.id} — próximo: ${formatTs(schedule.state?.nextFireAt)}`
        )
    ];
}

function _monitorTarget(message) {
    return {
        platform: message.platform,
        chatId: message.chatId,
        threadId: message.threadId || null
    };
}

function _getCurrentChatSettings(message) {
    if (message.platform === "discord") {
        const guildId = message.raw?.guild?.id;
        if (!guildId) return {};

        const serverSettings = loadSettings("discord", String(guildId), "server");
        const merged = { ...(serverSettings.settings || {}) };
        const chatId = String(message.chatId || message.raw?.channel?.id || "");
        const nodes = [
            ...(serverSettings.chat || []),
            ...(serverSettings.categoria || []).flatMap(category => category.chat || [])
        ];
        const chat = nodes.find(node => String(node.id) === chatId);
        Object.assign(merged, chat?.settings || {});
        const topic = chat?.topico?.find(node => String(node.id) === String(message.threadId));
        Object.assign(merged, topic?.settings || {});
        return merged;
    }

    const type = message.platform === "whatsapp" && message.isCommunity ? "community" : "group";
    return loadSettings(message.platform, String(message.chatId), type).settings || {};
}

function _featureSummaryLines(message, featureName) {
    const feature = FEATURES[featureName];
    const availableLevels = getAvailableLevels(message);
    const resolved = feature.resolve(message);
    const label = feature.label;

    const lines = [`🔎 ${label}:`];

    const activeLine = resolved && resolved.config
        ? `  ${resolved.config.enabled ? "✅" : "❌"} Nível final: ${getLevelLabel(message.platform, resolved.level)} (${resolved.level})`
        : "  ❌ Nenhum nível habilitado neste chat.";

    lines.push(activeLine);

    if (resolved && resolved.config && resolved.config.enabled) {
        lines.push(..._formatConfigDetails(message, featureName, resolved.config).map(line => `  ${line}`));
    }

    lines.push("  Níveis disponíveis:");

    for (const level of availableLevels) {
        const cfg = feature.getSet(message, level);
        const enabled = cfg?.enabled === true;
        const labelText = getLevelLabel(message.platform, level);
        lines.push(`    ${enabled ? "✅" : "❌"} ${labelText} (${level})`);
    }

    return lines;
}

async function _fullCurrent(message) {
    const lines = ["📋 Status completo do chat atual:"];
    for (const featureName of Object.keys(FEATURES)) {
        lines.push(..._featureFinalLines(message, featureName));
        lines.push("");
    }
    lines.push(..._fullSimpleFeature(message, "welcome"));
    lines.push("");
    lines.push(..._fullSimpleFeature(message, "goodbye"));
    lines.push("");
    lines.push(..._fullSimpleFeature(message, "warnconfig"));
    return lines.join("\n");
}

async function _fullFeature(message, featureName) {
    if (["welcome", "goodbye", "warnconfig"].includes(featureName)) {
        return _fullSimpleFeatureText(message, featureName);
    }

    const lines = [
        `📋 ${FEATURES[featureName].label} - Permissão final para este chat:`
    ];
    const resolved = FEATURES[featureName].resolve(message);
    if (!resolved || !resolved.config.enabled) {
        lines.push(`❌ Nenhum nível ativo para ${FEATURES[featureName].label}.`);
        lines.push("\nNíveis configurados:");
        lines.push(..._allLevelLines(message, featureName));
        return lines.join("\n");
    }

    lines.push(`✅ Nível final: ${getLevelLabel(message.platform, resolved.level)} (${resolved.level})`);
    lines.push(..._formatConfigDetails(message, featureName, resolved.config));
    lines.push("\nNíveis configurados:");
    lines.push(..._allLevelLines(message, featureName));
    return lines.join("\n");
}

function _fullSimpleFeatureText(message, featureName) {
    return _fullSimpleFeature(message, featureName).join("\n");
}

function _fullSimpleFeature(message, featureName) {
    if (featureName === "welcome") {
        const { platform, chatId, threadId, raw } = message;
        let serverId = null;
        if (platform === "discord") serverId = raw?.guild ? String(raw.guild.id) : null;
        const { config } = getWelcomeConfig(platform, serverId, chatId, threadId);
        return [
            "📋 Welcome - Configuração final deste chat:",
            `✅ ${config.enabled ? "Ativo" : "Desativado"}`,
            `modo: ${config.mode || "texto"}`,
            `texto: ${config.text || "(padrão)"}`,
            `mídia: ${_formatMediaInfo(config.media)}`
        ];
    }
    if (featureName === "goodbye") {
        const { platform, chatId, threadId, raw } = message;
        let serverId = null;
        if (platform === "discord") serverId = raw?.guild ? String(raw.guild.id) : null;
        const { config } = getGoodbyeConfig(platform, serverId, chatId, threadId);
        return [
            "📋 Goodbye - Configuração final deste chat:",
            `✅ ${config.enabled ? "Ativo" : "Desativado"}`,
            `modo: ${config.mode || "texto"}`,
            `texto: ${config.text || "(padrão)"}`,
            `mídia: ${_formatMediaInfo(config.media)}`
        ];
    }
    if (featureName === "warnconfig") {
        const config = getWarnConfig(message) || { max: 3, action: "ban" };
        return [
            "📋 Warnconfig - Configuração final deste grupo:",
            `máx. warns: ${config.max}`,
            `ação: ${config.action}`
        ];
    }
    return ["❌ Recurso desconhecido."];
}

function _featureFinalLines(message, featureName) {
    const feature = FEATURES[featureName];
    const resolved = feature.resolve(message);
    const lines = [`🔸 ${feature.label}`];

    if (!resolved || !resolved.config.enabled) {
        lines.push("  ❌ Nenhum nível ativo.");
        lines.push("  Níveis configurados:");
        lines.push(..._allLevelLines(message, featureName));
        return lines;
    }

    lines.push(`  ✅ Nível final: ${getLevelLabel(message.platform, resolved.level)} (${resolved.level})`);
    lines.push(..._formatConfigDetails(message, featureName, resolved.config).map(line => `  ${line}`));
    lines.push("  Níveis configurados:");
    lines.push(..._allLevelLines(message, featureName).map(line => `  ${line}`));
    return lines;
}

function _allLevelLines(message, featureName) {
    const feature = FEATURES[featureName];
    const availableLevels = getAvailableLevels(message);
    const lines = [];

    for (const level of availableLevels) {
        const cfg = feature.getSet(message, level);
        const enabled = cfg?.enabled === true;
        const label = getLevelLabel(message.platform, level);
        lines.push(`    ${enabled ? "✅" : "❌"} ${label} (${level})`);
        if (enabled) {
            lines.push(..._formatConfigDetails(message, featureName, cfg).map(line => `      ${line}`));
        }
    }

    return lines;
}

function _formatConfigDetails(message, featureName, config) {
    const lines = [];
    const isDiscord = message.platform === "discord";
    const guild = message.raw?.guild;

    const formatRoles = (roles) => {
        if (!Array.isArray(roles) || !roles.length) return "(nenhum)";
        return roles.map(r => formatRoleMention(r, guild)).join(", ");
    };

    if (featureName === "antilink") {
        lines.push(`Ação: ${config.action || "delete"}`);
        lines.push(`Ignorar superior: ${formatBool(config.ignoreParent)}`);
        lines.push(`Ignorar mesmo grupo: ${formatBool(config.ignoreSameGroup)}`);
        lines.push(`Ignorar mídia: ${formatBool(config.ignoreMedia)}`);
        lines.push(`Whitelist de links: ${config.whitelist?.length ? config.whitelist.join(", ") : "(nenhuma)"}`);
        lines.push(`Whitelist de usuários: ${config.userWhitelist?.length ? config.userWhitelist.join(", ") : "(nenhum)"}`);
        lines.push(`Blacklist de usuários: ${config.userBlacklist?.length ? config.userBlacklist.join(", ") : "(nenhum)"}`);
        if (isDiscord) {
            lines.push(`Whitelist de cargos: ${formatRoles(config.roleWhitelist)}`);
            lines.push(`Blacklist de cargos: ${formatRoles(config.roleBlacklist)}`);
        }
    } else if (featureName === "antipalavras") {
        lines.push(`Ação: ${config.action || "delete"}`);
        lines.push(`Ignorar superior: ${formatBool(config.ignoreParent)}`);
        lines.push(`Palavras: ${config.words?.length ? config.words.join(", ") : "(nenhuma)"}`);
        lines.push(`Whitelist de usuários: ${config.userWhitelist?.length ? config.userWhitelist.join(", ") : "(nenhum)"}`);
        lines.push(`Blacklist de usuários: ${config.userBlacklist?.length ? config.userBlacklist.join(", ") : "(nenhum)"}`);
        if (isDiscord) {
            lines.push(`Whitelist de cargos: ${formatRoles(config.roleWhitelist)}`);
            lines.push(`Blacklist de cargos: ${formatRoles(config.roleBlacklist)}`);
        }
    } else if (featureName === "antimedia") {
        lines.push(`Ação: ${config.action || "delete"}`);
        lines.push(`Ignorar superior: ${formatBool(config.ignoreParent)}`);
        lines.push(`Mídias proibidas: ${config.mediaTypes?.length ? config.mediaTypes.join(", ") : "(todas)"}`);
        lines.push(`Whitelist de usuários: ${config.userWhitelist?.length ? config.userWhitelist.join(", ") : "(nenhum)"}`);
        lines.push(`Blacklist de usuários: ${config.userBlacklist?.length ? config.userBlacklist.join(", ") : "(nenhum)"}`);
        if (isDiscord) {
            lines.push(`Whitelist de cargos: ${formatRoles(config.roleWhitelist)}`);
            lines.push(`Blacklist de cargos: ${formatRoles(config.roleBlacklist)}`);
        }
    } else if (featureName === "antiraid") {
        lines.push(`Ação: ${config.action || "mute"}`);
        lines.push(`Limite mensagens: ${config.maxMessagesPerWindow || 8} msgs em ${config.windowSeconds || 12}s`);
        lines.push(`Limite repetidas: ${config.repeatedMessageLimit || 4}`);
        lines.push(`Limite menções: ${config.mentionLimit || 6}`);
        lines.push(`Limite links: ${config.linkLimit || 3}`);
        lines.push(`Limite convites: ${config.inviteLimit || 2}`);
        lines.push(`Limite webhooks: ${config.webhookLimit ?? 0}`);
        lines.push(`Whitelist de usuários: ${config.userWhitelist?.length ? config.userWhitelist.join(", ") : "(nenhum)"}`);
        lines.push(`Blacklist de usuários: ${config.userBlacklist?.length ? config.userBlacklist.join(", ") : "(nenhum)"}`);
        if (isDiscord) {
            lines.push(`Whitelist de cargos: ${formatRoles(config.roleWhitelist)}`);
            lines.push(`Blacklist de cargos: ${formatRoles(config.roleBlacklist)}`);
        }
    } else if (featureName === "blockcmd") {
        lines.push(`Ação: ${config.action || "reply"}`);
        lines.push(`Ignorar superior: ${formatBool(config.ignoreParent)}`);
        lines.push(`Mensagem: ${config.message || "(padrão)"}`);
        lines.push(`Comandos bloqueados: ${config.blockedCommands?.length ? config.blockedCommands.join(", ") : "(nenhum)"}`);
    }
    return lines;
}

function formatBool(value) {
    return value ? "✅ Sim" : "❌ Não";
}

async function _fullAll(message) {
    const lines = ["🌐 Status completo de todos os nós configurados:"];
    for (const featureName of Object.keys(FEATURES)) {
        lines.push("\n" + `🔸 ${FEATURES[featureName].label}`);
        lines.push(..._allNodesOverview(message, featureName));
    }
    lines.push("\n🔸 Welcome");
    lines.push(..._fullSimpleFeature(message, "welcome"));
    lines.push("\n🔸 Goodbye");
    lines.push(..._fullSimpleFeature(message, "goodbye"));
    lines.push("\n🔸 Warnconfig");
    lines.push(..._fullSimpleFeature(message, "warnconfig"));
    return lines.join("\n");
}

function _allNodesOverview(message, featureName) {
    const allNodes = _collectAllNodes(message, featureName);
    if (!allNodes.length) {
        return ["  ❌ Não foi possível carregar o histórico de nós para esta plataforma."];
    }

    return allNodes.map(node => {
        const status = node.config?.enabled ? "✅" : "❌";
        const name = node.name ? ` ${node.name}` : "";
        const details = node.config?.enabled ? ` — ${_formatBriefConfig(featureName, node.config)}` : "";
        return `  ${status} ${node.levelLabel} (${node.level})${name}${details}`;
    });
}

function _formatBriefConfig(featureName, config) {
    if (featureName === "antilink") {
        return `action=${config.action || "delete"}, ignoreParent=${formatYesNo(config.ignoreParent)}`;
    }
    if (featureName === "antipalavras") {
        return `action=${config.action || "delete"}, ignoreParent=${formatYesNo(config.ignoreParent)}`;
    }
    if (featureName === "antimedia") {
        return `action=${config.action || "delete"}, ignoreParent=${formatYesNo(config.ignoreParent)}, mediaTypes=${config.mediaTypes?.length ? config.mediaTypes.join(",") : "all"}`;
    }
    if (featureName === "antiraid") {
        return `action=${config.action || "mute"}, window=${config.windowSeconds || 12}s, maxMsgs=${config.maxMessagesPerWindow || 8}`;
    }
    if (featureName === "blockcmd") {
        return `action=${config.action || "reply"}, ignoreParent=${formatYesNo(config.ignoreParent)}, blocked=${config.blockedCommands?.length || 0}`;
    }
    return "";
}

function formatYesNo(value) {
    return value ? "yes" : "no";
}

function _collectAllNodes(message, featureName) {
    const { platform, chatId, raw } = message;
    const feature = FEATURES[featureName];
    const nodes = [];

    if (platform === "discord") {
        const guildId = raw?.guild ? String(raw.guild.id) : null;
        if (!guildId) return nodes;
        const settings = loadSettings("discord", guildId, "server");
        nodes.push({ level: "server", levelLabel: getLevelLabel(platform, "server"), name: settings.server || guildId, config: _readFeatureConfig(feature, settings.settings, featureName) });

        for (const category of settings.categoria || []) {
            nodes.push({ level: "categoria", levelLabel: getLevelLabel(platform, "categoria"), name: category.name || category.id, config: _readFeatureConfig(feature, category.settings, featureName) });
            for (const chat of category.chat || []) {
                nodes.push({ level: "chat", levelLabel: getLevelLabel(platform, "chat"), name: chat.name || chat.id, config: _readFeatureConfig(feature, chat.settings, featureName) });
                for (const topico of chat.topico || []) {
                    nodes.push({ level: "chat", levelLabel: `${getLevelLabel(platform, "chat")} / Tópico`, name: topico.name || topico.id, config: _readFeatureConfig(feature, topico.settings, featureName) });
                }
            }
        }

        for (const chat of settings.chat || []) {
            nodes.push({ level: "chat", levelLabel: getLevelLabel(platform, "chat"), name: chat.name || chat.id, config: _readFeatureConfig(feature, chat.settings, featureName) });
            for (const topico of chat.topico || []) {
                nodes.push({ level: "chat", levelLabel: `${getLevelLabel(platform, "chat")} / Tópico`, name: topico.name || topico.id, config: _readFeatureConfig(feature, topico.settings, featureName) });
            }
        }
    } else if (platform === "whatsapp") {
        const community = _findWhatsAppCommunityId(chatId);
        if (community) {
            const settings = loadSettings("whatsapp", community, "community");
            nodes.push({ level: "server", levelLabel: getLevelLabel(platform, "server"), name: settings.server || community, config: _readFeatureConfig(feature, settings.settings, featureName) });
            for (const chat of settings.chat || []) {
                nodes.push({ level: "chat", levelLabel: getLevelLabel(platform, "chat"), name: chat.id, config: _readFeatureConfig(feature, chat.settings, featureName) });
            }
            return nodes;
        }
        const settings = loadSettings("whatsapp", chatId, "group");
        nodes.push({ level: "server", levelLabel: getLevelLabel(platform, "server"), name: chatId, config: _readFeatureConfig(feature, settings.settings, featureName) });
        nodes.push({ level: "chat", levelLabel: getLevelLabel(platform, "chat"), name: chatId, config: _readFeatureConfig(feature, settings.settings, featureName) });
    } else if (platform === "telegram") {
        const settings = loadSettings("telegram", chatId, "group");
        nodes.push({ level: "server", levelLabel: getLevelLabel(platform, "server"), name: settings.chat || chatId, config: _readFeatureConfig(feature, settings.settings, featureName) });
        for (const topico of settings.topico || []) {
            nodes.push({ level: "chat", levelLabel: getLevelLabel(platform, "chat"), name: topico.name || topico.id, config: _readFeatureConfig(feature, topico.settings, featureName) });
        }
    }

    return nodes;
}

function _readFeatureConfig(feature, settings, featureName) {
    if (typeof feature?.read === "function") {
        return feature.read(settings);
    }

    if (featureName === "antilink") {
        return readAntilink(settings);
    }
    if (featureName === "antipalavras") {
        return readAntipalavras(settings);
    }
    if (featureName === "antimedia") {
        return readAntimedia(settings);
    }
    if (featureName === "antiraid") {
        return readAntiRaid(settings);
    }
    if (featureName === "blockcmd") {
        return readBlockcmd(settings);
    }

    return {};
}

async function _sendChunkedReply(message, text) {
    const platform = message.platform;

    if (platform === "whatsapp") {
        return message.reply({ text });
    }

    const blocks = _splitTextIntoSectionBlocks(text, platform === "telegram" ? 1800 : 1800);
    if (blocks.length <= 1) {
        return message.reply({ text: blocks[0] || "" });
    }

    for (let i = 0; i < blocks.length; i++) {
        const payload = blocks.length > 1
            ? `📦 Bloco ${i + 1}/${blocks.length}\n\n${blocks[i]}`
            : blocks[i];

        await message.reply({ text: payload });

        if (i < blocks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

function _splitTextIntoSectionBlocks(text, maxChars) {
    if (!text) {
        return [text];
    }

    const lines = text.split(/\n/);
    const sections = [];
    let currentLines = [];

    const flush = () => {
        const block = currentLines.join("\n").trim();
        if (block) {
            sections.push(block);
        }
        currentLines = [];
    };

    for (const line of lines) {
        if (/^🔸 /.test(line)) {
            flush();
            currentLines.push(line);
            continue;
        }

        if (currentLines.length || line.trim()) {
            currentLines.push(line);
        }
    }

    flush();

    const blocks = [];
    for (const section of sections) {
        if (section.length <= maxChars) {
            blocks.push(section);
            continue;
        }

        blocks.push(..._splitTextIntoChunks(section, maxChars));
    }

    return blocks.filter(Boolean);
}

function _splitTextIntoChunks(text, maxChars) {
    if (!text || text.length <= maxChars) {
        return [text];
    }

    const lines = text.split(/\n/);
    const chunks = [];
    let current = "";

    for (const line of lines) {
        const candidate = current ? `${current}\n${line}` : line;
        if (candidate.length > maxChars && current) {
            chunks.push(current.trim());
            current = line;
            continue;
        }
        current = candidate;
    }

    if (current.trim()) {
        chunks.push(current.trim());
    }

    return chunks.filter(Boolean);
}

function _findWhatsAppCommunityId(chatId) {
    const fs = require("fs");
    const path = require("path");
    const groupsDir = path.join(__dirname, "..", "..", "..", "settings", "groups");
    if (!fs.existsSync(groupsDir)) return null;
    const files = fs.readdirSync(groupsDir);

    for (const file of files) {
        if (!file.startsWith("waC") || !file.endsWith(".json")) continue;
        try {
            const data = JSON.parse(fs.readFileSync(path.join(groupsDir, file), "utf8"));
            if (Array.isArray(data.chat) && data.chat.some(c => c.id === chatId)) {
                return data.server;
            }
        } catch {
        }
    }
    return null;
}
