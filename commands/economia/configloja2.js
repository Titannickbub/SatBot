const economy = require("../../functions/economy");
const admin = require("../../functions/economyAdmin");

const FIELD_NAMES = {
    nome: "name",
    name: "name",
    categoria: "category",
    category: "category",
    preco: "price",
    preço: "price",
    price: "price",
    quantidade: "quantity",
    estoque: "quantity",
    quantity: "quantity"
};

module.exports = {
    name: "configloja2",
    aliases: ["gerenciarloja2"],
    category: "adm/economia",
    description: `⚙️ Configura a loja local e administra os pedidos deste grupo/servidor.

🔐 Apenas administradores do grupo/servidor podem usar este comando.

📝 1. Personalize o título e o aviso exibidos na loja:
{prefix}configloja2 titulo Loja de Artes da Comunidade
{prefix}configloja2 aviso Prêmios artesanais feitos sob encomenda!

🛍️ 2. Cadastre um item informando nome, preço, categoria e quantidade, nesta ordem:
{prefix}configloja2 adicionar Wallpaper | 20.000,00 | Comum | 5
{prefix}configloja2 adicionar Pack de brush | 15.000,00 | Comum | infinito

⚠️ É obrigatório separar os quatro campos com | (barra vertical). Não basta separar os dados com espaços.
Use um número na quantidade ou infinito para um estoque que nunca acaba.

✏️ 3. Edite ou remova itens pelo ID (os IDs começam em 1001):
{prefix}configloja2 editar 1001 preço 25.000,00
{prefix}configloja2 editar 1001 quantidade infinito
{prefix}configloja2 remover 1001

📦 4. Consulte os pedidos e informe quando forem entregues ou cancelados:
{prefix}pedidos
{prefix}entregar 1
{prefix}configloja2 cancelar 1

Ao cancelar um pedido, o valor é devolvido ao comprador. Ao marcar como entregue, o pagamento é mantido.
Você também pode consultar e entregar pedidos diretamente com {prefix}pedidos e {prefix}entregar <número>.`,
    usage: "{prefix}configloja2 <ação>",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ Este comando só funciona em grupos ou servidores." });
        }
        if (!admin.isAdmin(message)) {
            return message.reply({ text: "❌ Apenas administradores podem configurar a loja e administrar os pedidos." });
        }

        const [action, ...args] = message.args || [];
        const value = args.join(" ").trim();
        if (!action) return message.reply({ text: usage(message) });

        switch (action.toLocaleLowerCase()) {
            case "titulo":
            case "título":
                return updateStoreText(message, "title", value, "Título");
            case "aviso":
            case "descricao":
            case "descrição":
                return updateStoreText(message, "notice", value, "Aviso");
            case "adicionar":
            case "add":
                return addItem(message, value);
            case "editar":
            case "edit":
                return editItem(message, args);
            case "remover":
            case "excluir":
            case "deletar":
                return removeItem(message, args[0]);
            case "pedidos":
                return listOrders(message);
            case "entregar":
                return updateOrder(message, args[0], "delivered");
            case "cancelar":
                return updateOrder(message, args[0], "cancelled");
            default:
                return message.reply({ text: usage(message) });
        }
    }
};

function updateStoreText(message, field, value, label) {
    if (!value || !economy.setCommunityStoreText(message, field, value)) {
        return message.reply({ text: `❌ Informe o texto. Uso: ${message.prefix}configloja2 ${field === "title" ? "titulo" : "aviso"} <texto>` });
    }
    return message.reply({ text: `✅ ${label} da loja 2 atualizado.` });
}

function addItem(message, value) {
    const fields = value.split("|").map(field => field.trim());
    if (fields.length !== 4 || !fields[0] || !fields[2]) {
        return message.reply({ text: getAddItemHelp(message, "❌ Para cadastrar o item, separe os quatro campos usando | (barra vertical).") });
    }
    const price = parseStorePrice(fields[1]);
    const quantity = parseQuantity(fields[3]);
    if (price === null || quantity === undefined) {
        return message.reply({
            text: getAddItemHelp(message, "❌ Preço ou quantidade inválidos. Informe o preço em formato numérico e a quantidade como inteiro ou infinito.")
        });
    }
    const item = economy.addCommunityStoreItem(message, {
        name: fields[0],
        price,
        category: fields[2],
        quantity
    });
    if (!item) return message.reply({ text: "❌ Não foi possível cadastrar o item." });
    return message.reply({
        text: `✅ Item cadastrado: ${item.name} — ${economy.formatMoney(item.price)} | categoria ${item.category} | ID ${item.id}${item.quantity === null ? " | estoque infinito" : ` | estoque ${item.quantity}`}`
    });
}

function getAddItemHelp(message, notice) {
    return [
        notice,
        "",
        "Informe nesta ordem: nome | preço | categoria | quantidade.",
        "Exemplo:",
        `\`${message.prefix}configloja2 adicionar satpremio | 100,50 | Épico | 12\``,
        "",
        "Use | para separar cada campo; não substitua por espaços.",
        "Para estoque infinito, escreva infinito no último campo."
    ].join("\n");
}

function editItem(message, args) {
    const itemId = Number(args[0]);
    const field = FIELD_NAMES[String(args[1] || "").toLocaleLowerCase()];
    const rawValue = args.slice(2).join(" ").trim();
    if (!Number.isSafeInteger(itemId) || !field || !rawValue) {
        return message.reply({
            text: `❌ Uso: ${message.prefix}configloja2 editar <id> <nome|preço|categoria|quantidade> <valor>`
        });
    }

    let value = rawValue;
    if (field === "price") value = parseStorePrice(rawValue);
    if (field === "quantity") value = parseQuantity(rawValue);
    if (value === undefined || (field !== "quantity" && value === null)) {
        return message.reply({ text: "❌ Valor inválido. Preço deve ser válido; quantidade deve ser um inteiro ou infinito." });
    }
    const item = economy.editCommunityStoreItem(message, itemId, field, value);
    if (!item) return message.reply({ text: `❌ Item ${itemId} não encontrado ou valor inválido.` });
    return message.reply({ text: `✅ Item ${item.id} atualizado: ${item.name} — ${economy.formatMoney(item.price)} | ${item.category} | ${item.quantity === null ? "estoque infinito" : `estoque ${item.quantity}`}` });
}

function removeItem(message, rawId) {
    const itemId = Number(rawId);
    const item = Number.isSafeInteger(itemId) ? economy.removeCommunityStoreItem(message, itemId) : null;
    if (!item) return message.reply({ text: `❌ Informe um ID de item válido. Uso: ${message.prefix}configloja2 remover <id>` });
    return message.reply({ text: `✅ Item ${item.id} (${item.name}) removido da loja. Pedidos já criados permanecem no histórico.` });
}

function listOrders(message) {
    const orders = economy.getCommunityStoreOrders(message, "pending");
    if (!orders || orders.length === 0) return message.reply({ text: "📭 Não há pedidos aguardando entrega." });
    const lines = orders.map(order =>
        `#${order.id} — ${order.itemName} (${economy.formatMoney(order.price)}) | ${order.displayName} [${order.userId}]`
    );
    return message.reply({ text: ["🧾 PEDIDOS AGUARDANDO ENTREGA", "━━━━━━━━━━━━━━━━━━━━━━", ...lines].join("\n") });
}

function updateOrder(message, rawId, status) {
    const orderId = Number(rawId);
    if (!Number.isSafeInteger(orderId) || orderId < 1) {
        return message.reply({ text: `❌ Informe o número do pedido. Uso: ${message.prefix}configloja2 ${status} <pedido>` });
    }
    const order = economy.updateCommunityStoreOrder(message, orderId, status);
    if (!order) return message.reply({ text: `❌ Pedido #${orderId} não encontrado ou já finalizado.` });
    if (status === "delivered") {
        return message.reply({ text: `✅ Pedido #${order.id} (${order.itemName}) marcado como entregue. O pagamento foi mantido.` });
    }
    return message.reply({
        text: `✅ Pedido #${order.id} (${order.itemName}) cancelado. ${economy.formatMoney(order.price)} devolvidos ao comprador. Saldo atual: ${economy.formatMoney(order.balance)}.`
    });
}

function parseStorePrice(value) {
    let normalized = String(value || "").trim().replace(/(?:💷|satcoins?)/gi, "").replace(/\s/g, "");
    if (normalized.includes(",") && normalized.includes(".")) {
        normalized = normalized.replace(/\./g, "").replace(",", ".");
    } else if (normalized.includes(",")) {
        normalized = normalized.replace(",", ".");
    }
    return admin.parseAmount(normalized);
}

function parseQuantity(value) {
    if (/^(?:infinito|infinite|∞)$/i.test(String(value).trim())) return null;
    const quantity = Number(value);
    return Number.isSafeInteger(quantity) && quantity >= 0 ? quantity : undefined;
}

function usage(message) {
    const prefix = message.prefix || "!";
    return [
        "⚙️ Gerenciamento da loja 2",
        `${prefix}configloja2 titulo <texto>`,
        `${prefix}configloja2 aviso <texto>`,
        `${prefix}configloja2 adicionar <nome> | <preço> | <categoria> | <quantidade|infinito>`,
        `${prefix}configloja2 editar <id> <nome|preço|categoria|quantidade> <valor>`,
        `${prefix}configloja2 remover <id>`,
        `${prefix}configloja2 pedidos`,
        `${prefix}configloja2 entregar <pedido>`,
        `${prefix}configloja2 cancelar <pedido>`
    ].join("\n");
}
