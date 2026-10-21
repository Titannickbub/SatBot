const marriage = require("../../functions/marriageService");
const imageBanner = require("../../functions/imageBanner");
const activity = require("../../functions/activity");
const economy = require("../../functions/economy");
const xp = require("../../functions/xp");

module.exports = {
    name: "casamento",
    aliases: ["marriage"],
    category: "diversão/RPG",
    description: `💍 Mostra seus dados de casamento neste grupo ou servidor e gera um banner com as fotos do casal.

📝 Uso:
{prefix}casamento
{prefix}casamento 2
{prefix}casamento @parceiro`,
    usage: "{prefix}casamento [numero]\n{prefix}casamento @marcar",

    async execute(message) {
        try {
            const scope = marriage.getScope(message);
            if (!scope) {
                return message.reply({
                    text: "❌ Este comando só pode ser usado em grupos do WhatsApp/Telegram ou em servidores do Discord."
                });
            }

            const relationships = marriage.getMarriages(message);
            if (!relationships.length) {
                return message.reply({ text: `💔 Você não está casado(a) neste grupo/servidor. Use \`${message.prefix}casar\` para fazer um pedido.` });
            }

            const args = Array.isArray(message.args) ? message.args : [];
            const selection = String(args[0] || "").trim().toLowerCase();
            let current = null;
            let partner = null;
            if (["me", "mim", "self"].includes(selection)) {
                current = marriage.getMarriageWithPartner(message, message.userId);
            } else if (/^\d+$/.test(selection)) {
                current = relationships[Number(selection) - 1] || null;
            } else {
                partner = getSelectedPartner(message);
                if (partner?.unresolved) {
                    return message.reply({ text: "⚠️ Não consegui identificar essa pessoa. No Telegram, selecione o usuário pela lista de menções ou responda a uma mensagem dele." });
                }
                if (partner?.id) current = marriage.getMarriageWithPartner(message, partner.id);
                else if (relationships.length === 1) current = relationships[0];
            }

            if (!current && relationships.length > 1 && !selection && !partner) {
                const options = relationships.map((relationship, index) =>
                    `${index + 1}. ${relationship.selfMarriage ? "consigo mesmo(a)" : relationship.partnerName}`
                );
                return message.reply({
                    text: `💍 Você tem mais de um relacionamento. Escolha qual banner gerar:\n${options.map((option, index) => `${option} — \`${message.prefix}casamento ${index + 1}\``).join("\n")}`
                });
            }
            if (!current) {
                return message.reply({ text: `⚠️ Não encontrei esse relacionamento. Use \`${message.prefix}casamento\` para ver as opções.` });
            }

            const banner = await imageBanner.renderMarriageBanner(message, current);
            if (banner.error) return message.reply({ text: `❌ ${banner.error}` });
            return message.replyImg({
                image: banner.buffer,
                caption: banner.caption,
                fileName: "casamento.png"
            });
        } catch (error) {
            console.error("[CASAMENTO] Erro ao consultar casamento:", error);
            return message.reply({ text: "❌ Não foi possível carregar as informações do casamento agora." });
        }
    }
};

function getSelectedPartner(message) {
    if (message.quoted?.userId && !message.quoted.isBot && !message.quoted.fromMe) {
        return { id: String(message.quoted.userId) };
    }

    if (message.platform === "whatsapp") {
        const id = message.mentionedJids?.[0];
        return id ? { id: String(id) } : null;
    }

    if (message.platform === "discord") {
        const user = message.raw?.mentions?.users?.first?.();
        return user ? { id: String(user.id) } : null;
    }

    if (message.platform === "telegram") {
        const rawMessage = message.raw?.message || {};
        const text = rawMessage.text || rawMessage.caption || "";
        for (const entity of rawMessage.entities || rawMessage.caption_entities || []) {
            if (entity.type === "text_mention" && entity.user) {
                return { id: String(entity.user.id) };
            }
            if (entity.type !== "mention") continue;
            const mention = text.substring(entity.offset, entity.offset + entity.length);
            const found = economy.findAccount(message, mention) ||
                activity.findUser(message, mention) ||
                xp.findUser(message, mention);
            return found ? { id: String(found.userId) } : { unresolved: true };
        }
    }
    return null;
}
