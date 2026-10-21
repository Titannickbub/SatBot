const { isOwner } = require("../../../functions/owners");
const centralAccounts = require("../../../functions/centralAccounts");
const afk = require("../../../functions/afkHelper");

module.exports = {
    name: "afk",
    category: "adm/ações imediatas",
    description: `💤 Ativa o modo AFK com uma mensagem de ausência.

Super Usuários ativam o AFK global, compartilhado entre plataformas ligadas à mesma Conta Central. Administradores ativam o AFK somente no grupo atual.
O modo é desativado automaticamente quando você voltar a enviar uma mensagem.

{prefix}afk tô trabalhando
{prefix}afk volto às 19h`,
    usage: "{prefix}afk [texto]",

    async execute(message) {
        const owner = isOwner(message) || Boolean(message.sender?.isOwner);
        if (!owner && !message.sender?.isAdmin) {
            return message.reply({ text: "❌ Apenas administradores do grupo ou Super Usuários podem ativar o modo AFK." });
        }

        if (!owner && !isGroupMessage(message)) {
            return message.reply({ text: "❌ O AFK de administrador só pode ser ativado em um grupo." });
        }

        const reason = message.getArgText(0).trim();
        if (!reason) {
            return message.reply({ text: `❌ Informe o motivo da ausência. Exemplo: ${message.prefix}afk tô trabalhando` });
        }

        const store = message.functions?.centralAccounts || global.centralAccounts || centralAccounts;
        let accountId = message.centralAccountId;
        if (!accountId) {
            const account = await store.getOrCreateByPlatform(message.platform, message.userId, {
                username: message.username,
                displayName: message.displayName || message.name || message.username || null
            });
            accountId = account?.id;
        }
        if (!accountId) {
            throw new Error("Não foi possível resolver sua Conta Central para ativar o AFK.");
        }

        const record = {
            reason,
            name: message.displayName || message.username || "Um usuário",
            platform: message.platform,
            platformId: String(message.userId),
            scope: owner ? "global" : "group",
            since: new Date().toISOString()
        };

        if (owner) {
            afk.setGlobal(accountId, record);
            return message.reply({ text: `💤 Seu AFK global foi ativado: ${reason}` });
        }

        afk.setGroup(message.platform, message.chatId, accountId, record);
        return message.reply({ text: `💤 Seu AFK foi ativado neste grupo: ${reason}` });
    }
};

function isGroupMessage(message) {
    if (message.platform === "whatsapp") return String(message.chatId || "").endsWith("@g.us");
    return ["group", "supergroup"].includes(message.chatType) ||
        (message.platform === "discord" && !message.isPrivate);
}
