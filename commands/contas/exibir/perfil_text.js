const fs = require("fs");
const path = require("path");
const { resolvePlatformProfile } = require("../../../functions/profiles");
const { fetchBuffer } = require("../../../functions/api");
const nofapHelper = require("../../../functions/nofapHelper");
const economy = require("../../../functions/economy");
const xp = require("../../../functions/xp");
const activity = require("../../../functions/activity");

module.exports = {
    name: "perfil_text",
    aliases: ["perfil-text", "perfiltexto", "profiletext"],
    category: "contas/exibir",
    description: "Exibe a versão textual do perfil da plataforma atual e informa a Conta Central vinculada.",
    usage: "{prefix}perfil_text",

    async execute(message) {
        const platform = message.platform;
        const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts;
        const central = store?.findByPlatform(platform, message.userId);
        const nofapStatus = central ? nofapHelper.getNofapStatus(central.id) : { active: false, currentDays: 0, recordDays: 0, totalResets: 0, title: '🌱 Iniciante' };
        const scope = economy.getScope(message);
        const balance = scope ? economy.getBalance(message) : null;
        const xpData = scope ? xp.load(message) : null;
        const xpUser = xpData?.users?.[String(message.userId)] || { xp: 0 };
        const xpLevel = xp.levelForXp(xpUser.xp);
        const xpPosition = xpData?.enabled ? xp.position(message, message.userId) : null;
        const activityData = scope ? activity.load(message) : null;
        const activityUser = activityData?.users?.[String(message.userId)];
        const activityCount = Number(activityUser?.total) || 0;
        const currentName = message.displayName || message.username || message.userId;

        const profile = await resolvePlatformProfile(platform, message.userId, { raw: message.raw, username: message.username });
        const imageUrl = profile?.avatarUrl || null;
        const fallbackImage = path.join(__dirname, "..", "..", "semfoto.jpg");

        const lines = [
            `👤 Conta atual`,
            `━━━━━━━━━━━━━━━━━━━━━━`,
            `👤 Nome: ${currentName}`,
            `🆔 ID: ${message.userId}`,
            scope ? `💷 Satcoins (${scope.type === "servidor" ? "servidor" : "grupo"}): ${economy.formatMoney(balance)}` : null,
            scope ? `📊 Atividade: ${activityCount}` : null,
            ...(scope
                ? xpData?.enabled
                    ? [
                        `⭐ XP: ${xpUser.xp}`,
                        `🎚️ Nível: ${xpLevel.level}`,
                        `🏆 ${xpPosition ? `Posição: #${xpPosition}` : "Posição: ainda não classificado"}`
                    ]
                    : [`⭐ XP: desativado neste ${scope.type === "servidor" ? "servidor" : "grupo"}`]
                : []),
            `🔥 NoFap: ${nofapStatus.active ? `${nofapStatus.currentDays} dias • ${nofapStatus.title}` : '🚫 Inativo'}`,
            "",
            `🌐 Para ver sua conta global, use ${message.prefix}conta.`
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
                    console.error("[PERFIL_TEXT] Falha ao baixar imagem do WhatsApp:", err.message || err);
                }
            }

            try {
                return await message.replyImg({
                    url: imageUrl,
                    caption
                });
            } catch (err) {
                console.error("[PERFIL_TEXT] Falha ao enviar imagem via URL:", err.message || err);
                try {
                    const imageBuffer = await fetchBuffer(imageUrl);
                    return await message.replyImg({
                        file: imageBuffer,
                        caption
                    });
                } catch (fallbackErr) {
                    console.error("[PERFIL_TEXT] Falha ao enviar imagem via buffer:", fallbackErr.message || fallbackErr);
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
