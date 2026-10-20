const marriage = require("../../functions/marriageService");
const activity = require("../../functions/activity");
const economy = require("../../functions/economy");
const xp = require("../../functions/xp");

module.exports = {
    name: "divorciar",
    aliases: ["divorcio", "separar"],
    category: "diversão/RPG",
    description: `💔 Encerra seu casamento neste grupo ou servidor.

Marque seu cônjuge ou responda a uma mensagem dele:
{prefix}divorciar @parceiro
{prefix}divorciar (respondendo à mensagem do parceiro)

Sem marcar ninguém, o comando mostra estas instruções e não altera seu casamento.`,
    usage: "{prefix}divorciar [@parceiro]",

    async execute(message) {
        try {
            const scope = marriage.getScope(message);
            if (!scope) {
                return message.reply({
                    text: "❌ O divórcio só pode ser usado em grupos do WhatsApp/Telegram ou em servidores do Discord."
                });
            }

            const partner = getQuotedTarget(message) || getMentionedTarget(message);
            if (!partner) {
                return message.reply({
                    text: help(message)
                });
            }
            if (!partner.id) {
                return message.reply({
                    text: "⚠️ Não consegui identificar essa pessoa. No Telegram, selecione o usuário pela lista de menções ou responda a uma mensagem dele."
                });
            }

            const result = marriage.divorceWithPartner(message, partner.id);
            if (result.error) {
                return message.reply({ text: `⚠️ ${result.error}` });
            }
            return message.reply({
                text: `💔 O casamento entre ${result.marriage.firstName} e ${result.marriage.secondName} foi encerrado neste grupo/servidor.`
            });
        } catch (error) {
            console.error("[DIVORCIAR] Erro ao executar comando:", error);
            return message.reply({ text: "❌ Não foi possível concluir o divórcio agora. Tente novamente." });
        }
    }
};

function getQuotedTarget(message) {
    if (!message.quoted?.userId || message.quoted.isBot || message.quoted.fromMe) return null;
    return {
        id: String(message.quoted.userId),
        name: message.quoted.displayName || message.quoted.username || String(message.quoted.userId)
    };
}

function getMentionedTarget(message) {
    if (message.platform === "whatsapp") {
        const id = message.mentionedJids?.[0];
        return id ? { id: String(id), name: `@${String(id).split("@")[0].split(":")[0]}` } : null;
    }

    if (message.platform === "discord") {
        const user = message.raw?.mentions?.users?.first?.();
        return user
            ? { id: String(user.id), name: user.globalName || user.displayName || user.username || String(user.id) }
            : null;
    }

    if (message.platform === "telegram") {
        const rawMessage = message.raw?.message || {};
        const text = rawMessage.text || rawMessage.caption || "";
        for (const entity of rawMessage.entities || rawMessage.caption_entities || []) {
            if (entity.type === "text_mention" && entity.user) {
                return {
                    id: String(entity.user.id),
                    name: [entity.user.first_name, entity.user.last_name].filter(Boolean).join(" ") || entity.user.username || String(entity.user.id)
                };
            }
            if (entity.type !== "mention") continue;
            const mention = text.substring(entity.offset, entity.offset + entity.length);
            const found = economy.findAccount(message, mention) ||
                activity.findUser(message, mention) ||
                xp.findUser(message, mention);
            return found
                ? { id: String(found.userId), name: found.displayName || found.username || mention }
                : { id: null, name: mention };
        }
    }
    return null;
}

function help(message) {
    const prefix = message.prefix || "!";
    return [
        "💔 *AVISO DE DIVÓRCIO*",
        "Este comando encerra o casamento somente se a pessoa indicada for seu cônjuge atual neste grupo/servidor.",
        "",
        `• Marque seu parceiro: ${prefix}divorciar @parceiro`,
        `• Ou responda a uma mensagem do parceiro com: ${prefix}divorciar`,
        "",
        "Sem indicar o cônjuge, nenhum casamento é alterado."
    ].join("\n");
}
