const fs = require("fs");
const path = require("path");
const { resolvePlatformProfile } = require("../../../functions/profiles");
const { fetchBuffer } = require("../../../functions/api");
const vipHelper = require("../../../functions/vipHelper");
const nofapHelper = require("../../../functions/nofapHelper");

module.exports = {
    name: "perfil",
    aliases: ["profile", "minhaconta"],
    category: "contas/exibir",
    description: "Mostra a conta atual e a conta central vinculada.",
    usage: "{prefix}perfil",

    async execute(message) {
        const platform = message.platform;
        const username = message.username ? `@${message.username}` : null;

        const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts;
        const central = store?.findByPlatform(platform, message.userId);
        const vipStatus = central ? vipHelper.getVipStatus(central.id) : { active: false, permanent: false, remainingText: '❌ Não', display: '❌ Não' };
        const vipLabel = vipStatus.permanent ? '👑 Permanente' : vipStatus.active ? `⏳ ${vipStatus.remainingText}` : '❌ Não';
        const nofapStatus = central ? nofapHelper.getNofapStatus(central.id) : { active: false, currentDays: 0, recordDays: 0, totalResets: 0, title: '🌱 Iniciante' };

        const profile = await resolvePlatformProfile(platform, message.userId, { raw: message.raw, username: message.username });
        const imageUrl = profile?.avatarUrl || null;
        const fallbackImage = path.join(__dirname, "..", "..", "semfoto.jpg");

        const centralInfo = central
            ? [
                `🔗 Conta Central`,
                `━━━━━━━━━━━━━━━━━━━━━━`,
                `👑 Nome da conta central: ${central.name || "—"}`,
                `🆔 ID central: ${central.id}`,
                `⚡ Última atividade: ${_formatRelativeTime(central.lastActivityAt)}`,
                `⌛ Após 2 dias: ${_formatTwoDayTime(central.lastActivityAt)}`,
                `🌐 Plataformas vinculadas: ${central.platformAccounts?.length || 0}`,
                ...((central.platformAccounts || []).map(p => `   • ${_platformLabel(p.platform)}: ${p.username || p.displayName || p.platformId}`)),
                `🗓️ Criada em: ${_formatDateTime(central.createdAt)}`
            ].join("\n")
            : [
                `🔗 Conta Central`,
                `━━━━━━━━━━━━━━━━━━━━━━`,
                `⚠️ Nenhuma conta central vinculada a este usuário neste momento.`
            ].join("\n");

        const lines = [
            `👤 Conta Atual`,
            `━━━━━━━━━━━━━━━━━━━━━━`,
            `📱 Plataforma: ${_platformLabel(platform)}`,
            `🆔 ID: ${message.userId}`,
            username ? `💬 Usuário: ${username}` : null,
            `⭐ VIP: ${vipLabel}`,
            `🔥 NoFap: ${nofapStatus.active ? `${nofapStatus.currentDays} dias • ${nofapStatus.title}` : '🚫 Inativo'}`,
            "",
            centralInfo,
            "",
            `⚙️ Comandos do setor de contas`,
            `━━━━━━━━━━━━━━━━━━━━━━`,
            `• ${message.prefix}nomecentral <nome> - alterar o nome da conta central`,
            `• ${message.prefix}gerar_unir - gerar código para unir outra conta`,
            `• ${message.prefix}unir <codigo> - unir sua conta com outra conta`
        ].filter(Boolean);

        const caption = lines.join("\n");
        const isWhatsApp = platform === "whatsapp";

        if (imageUrl) {
            if (isWhatsApp) {
                try {
                    const imageBuffer = await fetchBuffer(imageUrl);
                    return await message.replyImg({
                        image: imageBuffer,
                        caption
                    });
                } catch (err) {
                    console.error("[PERFIL] Falha ao baixar imagem do WhatsApp:", err.message || err);
                }
            }

            try {
                return await message.replyImg({
                    url: imageUrl,
                    caption
                });
            } catch (err) {
                console.error("[PERFIL] Falha ao enviar imagem via URL:", err.message || err);
                try {
                    const imageBuffer = await fetchBuffer(imageUrl);
                    return await message.replyImg({
                        file: imageBuffer,
                        caption
                    });
                } catch (fallbackErr) {
                    console.error("[PERFIL] Falha ao enviar imagem via buffer:", fallbackErr.message || fallbackErr);
                }
            }
        }

        if (fs.existsSync(fallbackImage)) {
            try {
                return await message.replyImg({
                    file: fallbackImage,
                    caption
                });
            } catch {
                return await message.reply({ text: caption });
            }
        }

        return message.reply({ text: caption });
    }
};

function _platformLabel(platform) {
    return {
        discord: "Discord",
        telegram: "Telegram",
        whatsapp: "WhatsApp"
    }[platform] || platform;
}

function _formatRelativeTime(dateString) {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    const diff = Date.now() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (seconds < 60) return `${seconds} segundos atrás`;
    if (minutes < 60) return `${minutes} minutos atrás`;
    if (hours < 24) return `${hours} horas atrás`;
    return `${days} dias atrás`;
}

function _formatTwoDayTime(dateString) {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / (24 * 3600 * 1000));
    return days < 2 ? _formatRelativeTime(dateString) : _formatDateTime(dateString);
}

function _formatDateTime(dateString) {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
}
