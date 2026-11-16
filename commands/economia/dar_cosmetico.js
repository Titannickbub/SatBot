const economy = require("../../functions/economy");
const admin = require("../../functions/economyAdmin");

module.exports = {
    name: "dar_cosmetico",
    aliases: ["darcosmetico"],
    category: "adm/economia",
    description: `🎨 Concede ao membro indicado um cosmético pelo ID, sem cobrar SatCoins.

🔐 Disponível para administradores do chat e superusuários.

📝 Uso:
{prefix}dar_cosmetico <id> @membro

Você também pode responder à mensagem do membro. O cosmético vai para a coleção sem substituir o item equipado. Se ele já possuir o item, nada será alterado.`,
    usage: "{prefix}dar_cosmetico <id> @marcar",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ Este comando só funciona em grupos ou servidores." });
        }
        if (!admin.isAdmin(message)) {
            return message.reply({ text: "❌ Apenas administradores podem usar este comando." });
        }

        const cosmeticId = String(message.args?.[0] || "").trim();
        const target = admin.resolveTarget(message, message.args?.slice(1).join(" ").trim());
        if (!/^\d+$/.test(cosmeticId) || !target) {
            return message.reply({
                text: `❌ Uso: ${message.prefix}${message.command} <id> @membro ou responda à mensagem do membro.`
            });
        }

        const result = economy.grantProfileCosmetic(message, target, cosmeticId);
        if (result.reason === "already-owned") {
            return message.reply({
                text: `ℹ️ ${target.displayName || target.username || target.userId} já possui o cosmético ${result.item.label} (ID ${result.item.id}). Nada foi alterado.`
            });
        }
        if (!result.granted) {
            return message.reply({
                text: `❌ Não encontrei um cosmético com o ID ${cosmeticId}. Consulte os IDs em ${message.prefix}cosmeticos.`
            });
        }

        return message.reply({
            text: `✅ Cosmético ${result.item.label} (ID ${result.item.id}) concedido para ${target.displayName || target.username || target.userId}. Foi adicionado à coleção sem alterar o cosmético equipado.`
        });
    }
};
