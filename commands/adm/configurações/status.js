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
    • Exibe todos os nós configurados no servidor/grupo para o recurso selecionado.
  !status antilink
    • Exibe o status apenas do antilink.
  !status antipalavras
    • Exibe o status apenas do antipalavras.

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
    getWelcomeConfig,
    getGoodbyeConfig,
    getDefaultWelcomeConfig,
    getDefaultGoodbyeConfig
} = require("../../../functions/welcomeHelper");
const { getWarnConfig } = require("../../../functions/warnHelper");
const { loadSettings } = require("../../../functions/groupSettings");

const FEATURES = {
    antilink: {
        label: "Antilink",
        resolve: resolveAntilinkConfig,
        getSet: getSetAntilink,
        read: readAntilink,
        fields: ["enabled", "action", "ignoreParent", "ignoreSameGroup", "ignoreMedia", "whitelist", "userWhitelist"]
    },
    antipalavras: {
        label: "Antipalavras",
        resolve: resolveAntipalavrasConfig,
        getSet: getSetAntipalavras,
        read: readAntipalavras,
        fields: ["enabled", "action", "ignoreParent", "words", "userWhitelist"]
    },
    antimedia: {
        label: "Antimedia",
        resolve: resolveAntimediaConfig,
        getSet: getSetAntimedia,
        read: readAntimedia,
        fields: ["enabled", "action", "ignoreParent", "mediaTypes", "userWhitelist"]
    }
};

module.exports = {
    name: "status",
    category: "adm/configurações",
    description: `Exibe o estado hierárquico das regras de moderação, welcome/goodbye e warns no chat atual.
Use este comando para ver quais configurações estão ativas ✅ ou desativadas ❌, e para entender a permissão final aplicada ao chat.
Disponível para Antilink, Antipalavras, Welcome, Goodbye e Warnconfig.
`,
    usage: "{prefix}status",
    examples: [
        "{prefix}status",
        "{prefix}status full",
        "{prefix}status full all",
        "{prefix}status antilink",
        "{prefix}status antimedia",
        "{prefix}status welcome",
        "{prefix}status goodbye",
        "{prefix}status warnconfig",
        "{prefix}status full welcome"
    ],
    info(message) {
        return _help(message);
    },

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos/servidores." });
        }

        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : message.sender?.isAdmin;

        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores podem usar este comando." });
        }

        const args = message.args || [];
        const first = args[0]?.toLowerCase();

        if (!first) {
            return message.reply({ text: _summary(message) });
        }

        if (first === "help" || first === "?") {
            return message.reply({ text: _help(message) });
        }

        if (first === "full") {
            const second = args[1]?.toLowerCase();
            if (second === "all") {
                const text = await _fullAll(message);
                return _sendChunkedReply(message, text);
            }
            if (["antilink", "antipalavras", "antimedia", "welcome", "goodbye", "warnconfig"].includes(second)) {
                return message.reply({ text: await _fullFeature(message, second) });
            }
            return message.reply({ text: await _fullCurrent(message) });
        }

        if (["antilink", "antipalavras", "antimedia"].includes(first)) {
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

        return message.reply({ text: _help(message) });
    }
};

function _help(message) {
    const p = message.prefix;
    return (
`📌 Status - Ajuda

Use este comando para inspecionar o estado das configurações do grupo e a hierarquia aplicada ao chat atual.

${p}status
  • Resumo rápido do chat atual para todas as regras.

${p}status full
  • Permissão final aplicada ao chat atual, considerando hierarquia.

${p}status full all
  • Exibe todos os nós configurados no servidor/grupo para todos os recursos.

${p}status antilink
  • Resumo apenas do Antilink.

${p}status antipalavras
  • Resumo apenas do Antipalavras.

${p}status antimedia
  • Resumo apenas do Antimedia.

${p}status welcome
  • Resumo do sistema de boas-vindas.

${p}status goodbye
  • Resumo do sistema de despedida.

${p}status warnconfig
  • Resumo da configuração de warns deste grupo.

${p}status full welcome
  • Exibe a configuração final do Welcome para este chat.
`
    );
}

function _summary(message) {
    const blocks = ["🔎 Status geral deste chat:"];

    for (const featureName of Object.keys(FEATURES)) {
        blocks.push(_featureSummaryLines(message, featureName).join("\n"));
    }

    blocks.push(_welcomeSummaryLines(message).join("\n"));
    blocks.push(_goodbyeSummaryLines(message).join("\n"));
    blocks.push(_warnSummaryLines(message).join("\n"));
    blocks.push("Use \"status full\" para ver a permissão final considerando a hierarquia.");

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
    const status = config?.enabled ? "✅ Ativo" : "❌ Desativado";
    return [
        `🔎 Welcome - ${status}`,
        `  modo: ${config?.mode || "texto"}`,
        `  texto: ${config?.text ? config.text : "(padrão)"}`,
        `  mídia: ${config?.media?.url ? "✅ configurada" : "❌ não configurada"}`
    ];
}

function _goodbyeSummaryLines(message, config) {
    const status = config?.enabled ? "✅ Ativo" : "❌ Desativado";
    return [
        `🔎 Goodbye - ${status}`,
        `  modo: ${config?.mode || "texto"}`,
        `  texto: ${config?.text ? config.text : "(padrão)"}`,
        `  mídia: ${config?.media?.url ? "✅ configurada" : "❌ não configurada"}`
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
        `🔎 Warnconfig - ✅ Configurado`,
        `  máx. warns: ${config.max}`,
        `  ação: ${config.action}`
    ];
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
    lines.push(..._featureFinalLines(message, "antilink"));
    lines.push("");
    lines.push(..._featureFinalLines(message, "antipalavras"));
    lines.push("");
    lines.push(..._featureFinalLines(message, "antimedia"));
    lines.push("");
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
            `texto: ${config.text}`,
            `mídia: ${config.media?.url ? "✅ configurada" : "❌ não configurada"}`
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
            `texto: ${config.text}`,
            `mídia: ${config.media?.url ? "✅ configurada" : "❌ não configurada"}`
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
    const feature = FEATURES[featureName];
    const lines = [];
    if (featureName === "antilink") {
        lines.push(`Ação: ${config.action || "delete"}`);
        lines.push(`Ignorar superior: ${formatBool(config.ignoreParent)}`);
        lines.push(`Ignorar mesmo grupo: ${formatBool(config.ignoreSameGroup)}`);
        lines.push(`Ignorar mídia: ${formatBool(config.ignoreMedia)}`);
        lines.push(`Whitelist: ${config.whitelist?.length ? config.whitelist.join(", ") : "(nenhuma)"}`);
        lines.push(`Usuários na whitelist: ${config.userWhitelist?.length ? config.userWhitelist.join(", ") : "(nenhum)"}`);
    } else if (featureName === "antipalavras") {
        lines.push(`Ação: ${config.action || "delete"}`);
        lines.push(`Ignorar superior: ${formatBool(config.ignoreParent)}`);
        lines.push(`Palavras: ${config.words?.length ? config.words.join(", ") : "(nenhuma)"}`);
        lines.push(`Usuários na whitelist: ${config.userWhitelist?.length ? config.userWhitelist.join(", ") : "(nenhum)"}`);
    } else if (featureName === "antimedia") {
        lines.push(`Ação: ${config.action || "delete"}`);
        lines.push(`Ignorar superior: ${formatBool(config.ignoreParent)}`);
        lines.push(`Mídias: ${config.mediaTypes?.length ? config.mediaTypes.join(", ") : "(todas)"}`);
        lines.push(`Usuários na whitelist: ${config.userWhitelist?.length ? config.userWhitelist.join(", ") : "(nenhum)"}`);
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
    const feature = FEATURES[featureName];
    const platform = message.platform;
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
    return "";
}

function formatYesNo(value) {
    return value ? "yes" : "no";
}

function _collectAllNodes(message, featureName) {
    const { platform, chatId, raw, threadId } = message;
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
            nodes.push({ level: "chat", levelLabel: getLevelLabel(platform, "chat"), name: chat.name || chat.id, config: feature.read(chat.settings) });
            for (const topico of chat.topico || []) {
                nodes.push({ level: "chat", levelLabel: `${getLevelLabel(platform, "chat")} / Tópico`, name: topico.name || topico.id, config: feature.read(topico.settings) });
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
    if (typeof feature.read === "function") {
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
