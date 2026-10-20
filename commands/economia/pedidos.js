const economy = require("../../functions/economy");
const admin = require("../../functions/economyAdmin");

module.exports = {
    name: "pedidos",
    category: "adm/economia",
    description: `🧾 Lista os pedidos da loja 2 que aguardam entrega neste grupo/servidor.

🔐 Disponível apenas para administradores do grupo/servidor.

📝 Consulte os pedidos pendentes:
{prefix}pedidos

Para concluir um pedido, use {prefix}entregar <número>. Para cancelar e devolver o valor, use {prefix}configloja2 cancelar <número>.`,
    usage: "{prefix}pedidos",
    examples: ["{prefix}pedidos"],

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ Este comando só funciona em grupos ou servidores." });
        }
        if (!admin.isAdmin(message)) {
            return message.reply({ text: "❌ Apenas administradores podem consultar os pedidos da loja." });
        }

        const orders = economy.getCommunityStoreOrders(message, "pending");
        if (!orders || orders.length === 0) {
            return message.reply({ text: "📭 Não há pedidos aguardando entrega." });
        }

        const lines = orders.map(order =>
            `#${order.id} — ${order.itemName} (${economy.formatMoney(order.price)}) | ${order.displayName} [${order.userId}]`
        );
        return message.reply({
            text: [
                "🧾 PEDIDOS DA LOJA 2 AGUARDANDO ENTREGA",
                "━━━━━━━━━━━━━━━━━━━━━━",
                ...lines,
                "",
                `Para marcar como entregue: ${message.prefix}entregar <número>`
            ].join("\n")
        });
    }
};
