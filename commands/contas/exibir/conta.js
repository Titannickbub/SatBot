const vipHelper = require("../../../functions/vipHelper");

module.exports = {
    name: "conta",
    aliases: ["contaglobal", "global"],
    category: "contas/exibir",
    description: `🌐 Exibe os dados detalhados da sua Conta Global/Central e lista todas as contas de plataformas vinculadas (WhatsApp, Discord, Telegram).

📝 1. Execute o comando para ver os dados da sua conta:
{prefix}conta

O bot exibe o nome central, ID global, status VIP, data de criação, última atividade e as plataformas atualmente conectadas.`,
    usage: "{prefix}conta",

    async execute(message) {
        const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts;
        if (!store || typeof store.findByPlatform !== "function") {
            return message.reply({ text: "❌ Sistema de contas centralizadas não está disponível." });
        }

        const central = store.findByPlatform(message.platform, message.userId);
        if (!central) {
            return message.reply({ text: "❌ Nenhuma conta global encontrada para este usuário." });
        }

        const vipStatus = vipHelper.getVipStatus(central.id);
        const vipLabel = vipStatus.permanent
            ? "👑 Permanente"
            : vipStatus.active
                ? `⏳ ${vipStatus.remainingText}`
                : "❌ Não";
        const accounts = central.platformAccounts || [];
        const links = ["whatsapp", "discord", "telegram"].map(platform => {
            const account = accounts.find(item => item.platform === platform);
            return `${platformEmoji(platform)} ${platformLabel(platform)}: ${account ? formatPlatformAccount(account) : "não vinculada"}`;
        });

        const lines = [
            "🌐 CONTA GLOBAL",
            "━━━━━━━━━━━━━━━━━━━━━━",
            `👤 Nome central: ${central.name || "—"}`,
            `🆔 ID global: ${central.id}`,
            `👑 VIP: ${vipLabel}`,
            "",
            `🗓️ Criado em: ${formatDateTime(central.createdAt)}`,
            `⚡ Última atividade: ${formatDaysAgo(central.lastActivityAt)}`,
            `🔗 Plataformas vinculadas: ${accounts.length}`,
            "",
            "🔗 LINKS",
            ...links,
            "",
            "⚙️ COMANDOS DE CONTA",
            `• ${message.prefix}perfil — conta atual, NoFap e satcoins`,
            `• ${message.prefix}conta — exibe esta conta global`,
            `• ${message.prefix}nomecentral <nome> — altera o nome central`,
            `• ${message.prefix}gerar_unir — gera código para vincular uma conta`,
            `• ${message.prefix}unir <código> — vincula outra plataforma`
        ];

        return message.reply({ text: lines.join("\n") });
    }
};

function platformLabel(platform) {
    return {
        whatsapp: "WhatsApp",
        discord: "Discord",
        telegram: "Telegram"
    }[platform] || platform;
}

function platformEmoji(platform) {
    return {
        whatsapp: "📱",
        discord: "💬",
        telegram: "✈️"
    }[platform] || "🔗";
}

function formatPlatformAccount(account) {
    const handle = account.username || account.displayName || account.platformId;
    if (account.platform === "telegram" && account.username) {
        return `https://t.me/${String(account.username).replace(/^@/, "")}`;
    }
    if (account.platform === "discord") {
        return `${handle} (${account.platformId})`;
    }
    if (account.platform === "whatsapp") {
        return `${handle} (${account.platformId})`;
    }
    return handle;
}

function formatDateTime(dateString) {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatDaysAgo(dateString) {
    if (!dateString) return "—";
    const timestamp = new Date(dateString).getTime();
    if (Number.isNaN(timestamp)) return dateString;
    const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
    return days === 0 ? "hoje" : `há ${days} ${days === 1 ? "dia" : "dias"}`;
}
