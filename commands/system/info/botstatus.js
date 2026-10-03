const { isOwner } = require("../../../functions/owners");
const config = require("../../../functions/config");
const { isEnabled: isAutoUpdateEnabled, getVersionStatus, readLocalPackage } = require("../../../functions/autoUpdate");

function state(enabled) {
    return enabled ? "✅ ATIVADO" : "❌ DESATIVADO";
}

function formatUptime(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (seconds || parts.length === 0) parts.push(`${seconds}s`);
    return parts.join(" ");
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "desconhecido";
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB"];
    let value = bytes;
    let unit = "B";
    for (const nextUnit of units) {
        value /= 1024;
        unit = nextUnit;
        if (value < 1024 || nextUnit === units[units.length - 1]) break;
    }
    return `${value.toFixed(1)} ${unit}`;
}

function countItems(value) {
    return value && typeof value === "object" ? Object.keys(value).length : 0;
}

module.exports = {
    name: "botstatus",
    category: "system/info",
    description: "Mostra o estado operacional do bot, incluindo plataformas conectadas, tempo de execução, recursos carregados e configurações globais relevantes.",
    usage: "{prefix}botstatus",

    async execute(message) {
        if (!isOwner(message)) {
            return message.reply({ text: "❌ Apenas superusuários podem consultar o status global do bot." });
        }

        const pkg = readLocalPackage();
        const versionStatus = await getVersionStatus(pkg);
        const core = require("../../../core");
        const commands = typeof core.getCommands === "function" ? core.getCommands() : {};
        const functions = typeof core.getFunctions === "function" ? core.getFunctions() : {};
        const coreStatus = core.status || {};
        const processMemory = process.memoryUsage();
        const versionNotice = versionStatus.comparison > 0
            ? `\n⚠️ *Nova versão disponível:* ${versionStatus.remoteVersion} (atual: ${pkg.version})\n💡 Atualize manualmente ou use !autoupdate on para atualizar na próxima reinicialização.`
            : versionStatus.error
                ? `\n⚠️ *Aviso de versão:* ${versionStatus.error}`
                : "";
        const platforms = typeof config.getPlatforms === "function"
            ? config.getPlatforms()
            : {};
        const antiPv = typeof config.getAntiPVConfig === "function"
            ? config.getAntiPVConfig()
            : {};
        const vip = typeof config.getVipConfig === "function"
            ? config.getVipConfig()
            : {};
        const onlyChats = typeof config.getOnlyChatsConfig === "function"
            ? config.getOnlyChatsConfig()
            : {};
        const autoDownload = typeof config.getAutoDownloadConfig === "function"
            ? config.getAutoDownloadConfig()
            : {};
        const blockcmd = typeof config.getGlobalBlockcmd === "function"
            ? config.getGlobalBlockcmd()
            : {};
        const uploads = typeof config.getUploadConfig === "function"
            ? config.getUploadConfig()
            : {};
        const rawConfig = typeof config.getConfig === "function" ? config.getConfig() : {};
        const discord = global.discordClient;
        const whatsapp = global.whatsappSock;
        const telegram = global.telegramBot;
        const centralAccounts = global.centralAccounts;
        const crossplay = global.crossplayStore;
        const centralAccountCount = centralAccounts && typeof centralAccounts.getAllCentralAccounts === "function"
            ? centralAccounts.getAllCentralAccounts().length
            : 0;
        const crossplayGroupCount = crossplay?.data?.crossplayGroups
            ? countItems(crossplay.data.crossplayGroups)
            : 0;
        const onlyChatsWhitelist = onlyChats.whitelist || {};
        const vipWhitelist = vip.vipOnly?.whitelist || {};
        const platformLines = [
            `• WhatsApp: ${state(platforms.whatsapp !== false)}${whatsapp?.user?.id ? ` (${whatsapp.user.id.split(":")[0]})` : " (não conectado)"}`,
            `• Telegram: ${state(platforms.telegram !== false)}${telegram?.botInfo?.username ? ` (@${telegram.botInfo.username})` : " (não conectado)"}`,
            `• Discord: ${state(platforms.discord !== false)}${discord?.user?.tag ? ` (${discord.user.tag})` : " (não conectado)"}`
        ];

        const text = `🤖 *Status Global do Bot*

👤 *Identidade e execução:*
• Nome: ${config.getBotName?.() || "Sat Bot"}
• Prefixo: ${config.getPrefix?.() || "!"}
📦 *Versão:* ${pkg.version || "desconhecida"}${versionNotice}
🔄 *Auto Update:* ${state(isAutoUpdateEnabled())}
• Node.js: ${process.version}
• Sistema: ${process.platform} (${process.arch})
• PID: ${process.pid}
• Uptime: ${formatUptime(coreStatus.startedAt ? Date.now() - coreStatus.startedAt : process.uptime() * 1000)}
• Iniciado em: ${coreStatus.startedAt ? new Date(coreStatus.startedAt).toLocaleString("pt-BR") : "desconhecido"}
• Memória: ${formatBytes(processMemory.rss)} RSS / ${formatBytes(processMemory.heapUsed)} heap

🌐 *Plataformas:*
${platformLines.join("\n")}
• Discord: ${discord?.isReady?.() ? `🟢 ping ${discord.ws?.ping ?? "?"} ms | ${discord.guilds?.cache?.size || 0} servidores | ${discord.users?.cache?.size || 0} usuários` : "⚪ cliente offline"}
• WhatsApp: ${whatsapp?.user ? "🟢 sessão autenticada" : "⚪ sessão offline"}
• Telegram: ${telegram?.botInfo ? "🟢 cliente iniciado" : "⚪ cliente offline"}

🧩 *Recursos carregados:*
• Comandos: ${countItems(commands)} (incluindo aliases)
• Funções: ${countItems(functions)}
• Contas centralizadas: ${centralAccountCount}
• Grupos crossplay: ${crossplayGroupCount}

🛡️ *Sistemas Globais:*
• Auto Download: ${state(autoDownload.enabled === true)}
• Anti-PV: ${state(antiPv.enabled === true)}
• Anti-PV modo: ${antiPv.mode || "ignore"} | listas: ${(antiPv.commandWhitelist || []).length} comandos, ${(antiPv.userWhitelist || []).length} usuários
• VIP-only: ${state(vip.vipOnly?.enabled === true)}
• VIP modo: ${vip.vipOnly?.mode || "ignore"} | comandos VIP: ${(vip.vipCommands || []).length}
• Only Chats: ${state(onlyChats.enabled === true)}
• Only Chats modo: ${onlyChats.mode || "ignore"} | whitelist: ${Object.values(onlyChatsWhitelist).reduce((total, items) => total + (Array.isArray(items) ? items.length : 0), 0)} itens
• Bloqueio global de comandos: ${state(blockcmd.enabled === true)} | ${(blockcmd.blockedCommands || []).length} bloqueados

⚙️ *Configurações globais:*
• Inicialização protegida: ${rawConfig.ignoreInitialSeconds ?? 30}s
• Uploads: Discord ${uploads.discordChannelId ? "configurado" : "não configurado"} | Telegram ${uploads.telegramChatId ? "configurado" : "não configurado"}
• Sticker: ${config.getStickerConfig?.()?.packName || "pack padrão"}
• VIP whitelist: ${Object.values(vipWhitelist).reduce((total, items) => total + (Array.isArray(items) ? items.length : 0), 0)} itens`;

        return message.reply({ text });
    }
};
