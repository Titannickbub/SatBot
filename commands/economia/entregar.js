const economy = require("../../functions/economy");
const admin = require("../../functions/economyAdmin");

module.exports = {
    name: "entregar",
    category: "adm/economia",
    description: `✅ Marca como entregue um pedido pendente da loja 2 deste grupo/servidor.

🔐 Disponível apenas para administradores do grupo/servidor.

📝 Consulte o número do pedido com {prefix}pedidos e conclua a entrega:
{prefix}entregar <número>

Exemplo:
{prefix}entregar 1

O pagamento é mantido quando o pedido é marcado como entregue.`,
    usage: "{prefix}entregar <número>",
    examples: ["{prefix}entregar 1"],

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ Este comando só funciona em grupos ou servidores." });
        }
        if (!admin.isAdmin(message)) {
            return message.reply({ text: "❌ Apenas administradores podem marcar pedidos como entregues." });
        }

        const orderId = Number(message.args?.[0]);
        if (!Number.isSafeInteger(orderId) || orderId < 1) {
            return message.reply({
                text: `❌ Informe o número do pedido. Exemplo: ${message.prefix}entregar 1. Use ${message.prefix}pedidos para consultar a lista.`
            });
        }

        const order = economy.updateCommunityStoreOrder(message, orderId, "delivered");
        if (!order) {
            return message.reply({ text: `❌ Pedido #${orderId} não encontrado ou já finalizado. Use ${message.prefix}pedidos para consultar os pedidos pendentes.` });
        }
        return message.reply({
            text: `✅ Pedido #${order.id} (${order.itemName}) marcado como entregue. O pagamento foi mantido.`
        });
    }
};
