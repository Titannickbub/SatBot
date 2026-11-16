const vipHelper = require("../../../functions/vipHelper");
const economy = require("../../../functions/economy");
const communityVip = require("../../../functions/communityVip");

function localVipStatus(message, userId) {
    if (!economy.getScope(message)) return "Consulte em um grupo ou servidor para ver o VIP local.";
    const vip = economy.getCommunityVip(message);
    const member = vip?.members[String(userId)];
    if (!economy.isCommunityVipActive(message, userId)) return "Inativo";
    return member.permanent
        ? "Permanente"
        : `Ativo até ${vipHelper.formatDateTimeDetailed(member.expiresAt)}`;
}

function offerLines(vip) {
    const lines = [];
    if (vip.shopOffers.length) {
        lines.push("🪙 *Loja VIP local (SatCoins):*");
        for (const offer of vip.shopOffers) {
            lines.push(`• #${offer.id} — ${vipHelper.formatDurationText(offer.durationMs)} — ${economy.formatMoney(offer.price)}`);
        }
    }
    if (vip.manualOffers.length) {
        lines.push("🧾 *Pedidos VIP locais:*");
        for (const offer of vip.manualOffers) {
            lines.push(`• #${offer.id} — ${vipHelper.formatDurationText(offer.durationMs)} — R$ ${(offer.priceCents / 100).toFixed(2).replace(".", ",")}`);
        }
    }
    return lines;
}

module.exports = {
    name: "vip",
    aliases: ["premium"],
    category: "contas/exibir",
    description: `Consulta o VIP local deste grupo e o VIPG global da Conta Central.

Use {prefix}vip comprar <oferta> para comprar com SatCoins ou {prefix}vip pedido <oferta> para criar um pedido manual.`,
    usage: "{prefix}vip [comprar|pedido] <id da oferta>",

    async execute(message) {
        const args = String(message.text || "").trim().split(/\s+/).slice(1);
        const action = String(args[0] || "").toLowerCase();
        const local = economy.getCommunityVip(message);

        if (action === "comprar") {
            const result = economy.buyCommunityVipOffer(message, String(message.userId), args[1]);
            if (!result.purchased) {
                const reason = result.reason === "insufficient_balance"
                    ? `Saldo insuficiente. Você tem ${economy.formatMoney(result.balance)}.`
                    : result.reason === "not_found" ? "Oferta VIP não encontrada."
                        : result.reason === "already_permanent" ? "Você já possui VIP local permanente neste grupo."
                            : "Não foi possível fazer esta compra.";
                return message.reply({ text: `❌ ${reason}` });
            }
            let roleNotice = "";
            if (message.platform === "discord" && local?.discordRoleId) {
                try {
                    await communityVip.syncMessageVipRole(message);
                } catch (error) {
                    console.error("[VIP_LOCAL] Compra concluída, mas falhou a sincronização do cargo:", error.message || error);
                    roleNotice = `\n⚠️ A compra foi concluída, mas não consegui sincronizar o cargo: ${error.message || "erro desconhecido"}`;
                }
            }
            return message.reply({
                text: `✅ VIP local adquirido por ${vipHelper.formatDurationText(result.offer.durationMs)}. Saldo restante: ${economy.formatMoney(result.balance)}.${roleNotice}`
            });
        }

        if (action === "pedido") {
            const order = economy.createCommunityVipOrder(message, String(message.userId), args[1]);
            if (order?.error === "already_permanent") {
                return message.reply({ text: "❌ Você já possui VIP local permanente neste grupo." });
            }
            if (!order) return message.reply({ text: "❌ Oferta de pedido manual não encontrada." });
            return message.reply({
                text: `✅ Pedido VIP local #${order.id} criado para ${vipHelper.formatDurationText(order.durationMs)} por R$ ${(order.priceCents / 100).toFixed(2).replace(".", ",")}. Aguarde o pagamento e a aprovação dos administradores.`
            });
        }

        const centralStore = message.functions?.centralAccounts || global.centralAccounts;
        const central = centralStore?.findByPlatform?.(message.platform, String(message.userId));
        const globalStatus = central
            ? vipHelper.getVipStatus(central.id)
            : { active: false, permanent: false, remainingText: "⏳ 0 minutos", expiresAt: null };
        const globalLabel = globalStatus.permanent
            ? "Permanente"
            : globalStatus.active
                ? globalStatus.remainingText
                : "Inativo";
        const lines = [
            "👑 *RESUMO DO VIP*",
            `🌐 VIPG global (Conta Central): ${globalLabel}`,
            `🏠 VIP local deste grupo/servidor: ${localVipStatus(message, String(message.userId))}`
        ];
        if (central && globalStatus.expiresAt) {
            lines.push(`Expiração VIPG: ${vipHelper.formatDateTimeDetailed(globalStatus.expiresAt)}`);
        }
        if (local) lines.push("", ...offerLines(local));
        if (economy.getScope(message)) {
            const ownOrders = (economy.getCommunityVipOrders(message, "pending") || [])
                .filter(order => String(order.userId) === String(message.userId));
            if (ownOrders.length) {
                lines.push("", `🕒 Pedidos pendentes: ${ownOrders.map(order => `#${order.id}`).join(", ")}`);
            }
        }
        lines.push("", `Use ${message.prefix || "!"}vip comprar <id> ou ${message.prefix || "!"}vip pedido <id> para escolher uma oferta.`);
        return message.reply({ text: lines.join("\n") });
    }
};
