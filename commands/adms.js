const { cleanJid } = require("../functions/moderationHelper");

module.exports = {
    name: "adms",
    category: "utilitarios",
    platformSupport: ["whatsapp", "telegram"],
    description: `📢 Marca os administradores do grupo para pedir ajuda.

Disponível em grupos do WhatsApp e Telegram. No Discord, use o cargo de administradores.`,
    usage: "{prefix}adms",

    async execute(message) {
        if (message.platform === "discord") {
            return message.reply({ text: "ℹ️ No Discord, use o cargo de administradores do servidor." });
        }

        const isGroup = message.platform === "whatsapp"
            ? String(message.chatId || "").endsWith("@g.us")
            : ["group", "supergroup"].includes(message.chatType);
        if (!isGroup) {
            return message.reply({ text: "❌ Este comando só funciona em grupos do WhatsApp ou Telegram." });
        }

        try {
            if (message.platform === "whatsapp") {
                return await mentionWhatsAppAdmins(message);
            }
            if (message.platform === "telegram") {
                return await mentionTelegramAdmins(message);
            }
            return message.reply({ text: "❌ Esta plataforma não é compatível com o comando." });
        } catch (error) {
            console.error(`[ADMS] Falha ao buscar administradores do ${message.platform}:`, error);
            return message.reply({ text: "❌ Não foi possível carregar os administradores do grupo. Tente novamente mais tarde." });
        }
    }
};

async function mentionWhatsAppAdmins(message) {
    const sock = global.whatsappSock;
    if (!sock || typeof sock.groupMetadata !== "function") {
        throw new Error("Conexão do WhatsApp indisponível.");
    }

    const metadata = await sock.groupMetadata(message.chatId);
    const admins = (metadata.participants || []).filter(participant => participant.admin);
    if (!admins.length) {
        return message.reply({ text: "ℹ️ Não encontrei administradores neste grupo." });
    }

    const mentions = [...new Set(admins
        .map(admin => admin.phoneNumber || admin.id || admin.lid)
        .filter(Boolean)
        .map(id => cleanJid(id)))];
    if (!mentions.length) {
        throw new Error("Os administradores não têm identificadores válidos para menção.");
    }

    const labels = mentions.map(id => `@${id.split("@")[0]}`);
    return message.reply({
        text: `📢 Administradores do grupo, precisamos de vocês:\n${labels.join(" ")}`,
        mentions
    });
}

async function mentionTelegramAdmins(message) {
    const telegram = global.telegramBot?.telegram;
    if (!telegram || typeof telegram.getChatAdministrators !== "function") {
        throw new Error("Conexão do Telegram indisponível.");
    }

    const admins = await telegram.getChatAdministrators(message.chatId);
    const users = admins
        .map(member => member.user)
        .filter(user => user && !user.is_bot);
    if (!users.length) {
        return message.reply({ text: "ℹ️ Não encontrei administradores neste grupo." });
    }

    const escapeHtml = value => String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const mentions = users.map(user => {
        const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || user.id;
        return `<a href="tg://user?id=${encodeURIComponent(user.id)}">${escapeHtml(name)}</a>`;
    });

    return message.reply({
        text: `📢 Administradores do grupo, precisamos de vocês:\n${mentions.join(" ")}`,
        parse_mode: "HTML"
    });
}
