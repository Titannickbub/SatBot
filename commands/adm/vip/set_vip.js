const { PermissionFlagsBits } = require("discord.js");
const { isOwner } = require("../../../functions/owners");
const economy = require("../../../functions/economy");
const communityVip = require("../../../functions/communityVip");
const vipHelper = require("../../../functions/vipHelper");

const DESCRIPTION = `Gerencia o VIP local deste grupo ou servidor.

Disponível para administradores e membros com permissão para gerenciar membros/cargos.

Exemplos:
{prefix}set_vip @membro 30d
{prefix}set_vip @membro permanente
{prefix}set_vip @membro remover
{prefix}set_vip loja add 30d 5000
{prefix}set_vip manual add 30d 10,00
{prefix}set_vip pedidos
{prefix}set_vip aprovar 1`;

function parsePrice(value, manual) {
    const text = String(value || "").trim();
    if (manual) {
        if (!/^\d+(?:[.,]\d{1,2})?$/.test(text)) return null;
        const [units, cents = ""] = text.replace(",", ".").split(".");
        return Number(units) * 100 + Number(cents.padEnd(2, "0"));
    }
    if (!/^\d+$/.test(text)) return null;
    return Number(text);
}

function targetId(message, raw) {
    const mention = message.raw?.mentions?.members?.first?.() ||
        message.raw?.mentions?.users?.first?.();
    return String(mention?.id || raw || "").replace(/[<@!>]/g, "").trim();
}

function formatOffer(offer, type) {
    const price = type === "shop"
        ? `${economy.formatMoney(offer.price)}`
        : `R$ ${(offer.priceCents / 100).toFixed(2).replace(".", ",")}`;
    return `#${offer.id} · ${vipHelper.formatDurationText(offer.durationMs)} · ${price}`;
}

async function setDiscordRole(message, value) {
    if (message.platform !== "discord" || !message.raw?.guild) {
        return { error: "O cargo VIP só pode ser configurado no Discord." };
    }
    const guild = message.raw.guild;
    const roleMention = message.raw?.mentions?.roles?.first?.();
    if (!roleMention && !value) {
        return { error: `Uso: ${message.prefix || "!"}set_vip cargo <ID ou menção do cargo>|off.` };
    }
    const roleId = String(roleMention?.id || value || "").replace(/[<@&>]/g, "");
    if (!roleId || roleId.toLowerCase() === "off" || roleId.toLowerCase() === "remover") {
        economy.setCommunityVipRole(message, null);
        return { text: "Cargo VIP automático removido." };
    }
    const role = await guild.roles.fetch(roleId);
    const botMember = guild.members.me || await guild.members.fetchMe();
    if (!role || role.managed || role.id === guild.id) return { error: "Informe um cargo válido e não gerenciado." };
    const actor = message.raw.member;
    if (!actor?.permissions?.has(PermissionFlagsBits.Administrator) &&
        actor?.roles?.highest?.comparePositionTo(role) <= 0 && !isOwner(message)) {
        return { error: "Você só pode configurar um cargo abaixo do seu maior cargo." };
    }
    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles) ||
        botMember.roles.highest.comparePositionTo(role) <= 0) {
        return { error: "O bot precisa de Gerenciar Cargos e de um cargo acima do cargo VIP." };
    }
    economy.setCommunityVipRole(message, role.id);
    return { text: `Cargo VIP automático definido: ${role.name}.` };
}

module.exports = {
    name: "set_vip",
    aliases: ["setvip"],
    category: "adm/vip",
    description: DESCRIPTION,
    usage: "{prefix}set_vip help",
    examples: ["{prefix}set_vip @membro 30d", "{prefix}set_vip loja add 30d 5000"],

    async execute(message) {
        if (!communityVip.canManageCommunityVip(message) && !isOwner(message)) {
            return message.reply({ text: "⚠️ Você precisa de permissão para gerenciar membros ou cargos neste grupo/servidor." });
        }
        if (!economy.getScope(message)) {
            return message.reply({ text: "⚠️ Este comando só pode ser usado em um grupo ou servidor." });
        }

        const args = String(message.text || "").trim().split(/\s+/).slice(1);
        if (!args.length || args[0].toLowerCase() === "help") {
            return message.reply({ text: DESCRIPTION.replaceAll("{prefix}", message.prefix || "!") });
        }

        const first = args[0].toLowerCase();
        try {
            if (first === "loja" || first === "manual") {
                const type = first === "loja" ? "shop" : "manual";
                const action = String(args[1] || "listar").toLowerCase();
                const vip = economy.getCommunityVip(message);
                const offers = type === "shop" ? vip.shopOffers : vip.manualOffers;
                if (action === "listar" || action === "list") {
                    return message.reply({
                        text: offers.length
                            ? `Ofertas ${first} VIP:\n${offers.map(offer => formatOffer(offer, type)).join("\n")}`
                            : `Nenhuma oferta cadastrada para ${first} VIP.`
                    });
                }
                if (action === "rem" || action === "remover") {
                    const removed = economy.removeCommunityVipOffer(message, type, args[2]);
                    return message.reply({ text: removed ? `Oferta removida: #${removed.id}.` : "Oferta não encontrada." });
                }
                const editing = action === "edit" || action === "editar";
                if (!editing && !["add", "adicionar"].includes(action)) {
                    return message.reply({ text: `Use listar, add, edit ou rem em ${message.prefix || "!"}set_vip ${first}.` });
                }
                const durationText = args[editing ? 3 : 2];
                const priceText = args[editing ? 4 : 3];
                const durationMs = vipHelper.parseDurationString(durationText);
                const price = parsePrice(priceText, type === "manual");
                if (!durationMs || price === null || !Number.isSafeInteger(price)) {
                    return message.reply({
                        text: `Uso: ${message.prefix || "!"}set_vip ${first} ${editing ? "edit <id> " : "add "}<duração> <${type === "shop" ? "SatCoins inteiros" : "preço em reais"}>.`
                    });
                }
                const offer = economy.upsertCommunityVipOffer(
                    message,
                    type,
                    type === "shop" ? { durationMs, price } : { durationMs, priceCents: price },
                    editing ? args[2] : null
                );
                return message.reply({ text: offer ? `Oferta ${editing ? "atualizada" : "adicionada"}: ${formatOffer(offer, type)}.` : "Não foi possível salvar a oferta." });
            }

            if (first === "pedidos" || first === "aprovar" || first === "rejeitar") {
                if (first === "pedidos") {
                    const orders = economy.getCommunityVipOrders(message, "pending");
                    return message.reply({
                        text: orders.length
                            ? `Pedidos VIP pendentes:\n${orders.map(order => `#${order.id} · ${order.displayName} (${order.userId}) · R$ ${(order.priceCents / 100).toFixed(2).replace(".", ",")}`).join("\n")}`
                            : "Não há pedidos VIP pendentes."
                    });
                }
                const status = first === "aprovar" ? "approved" : "rejected";
                const order = economy.resolveCommunityVipOrder(message, args[1], status);
                if (!order) return message.reply({ text: "Pedido pendente não encontrado." });
                let roleWarning = "";
                if (status === "approved" && message.platform === "discord") {
                    try {
                        await communityVip.syncMessageVipRole({ ...message, userId: order.userId });
                    } catch (error) {
                        console.error("[VIP_LOCAL_COMMAND] Pedido aprovado, mas falhou sincronização do cargo:", error.message || error);
                        roleWarning = ` O VIP foi concedido, mas o cargo não foi sincronizado: ${error.message || "erro desconhecido"}`;
                    }
                }
                return message.reply({ text: `Pedido #${order.id} ${status === "approved" ? "aprovado; VIP concedido" : "recusado"}.${roleWarning}` });
            }

            if (first === "cargo") {
                const result = await setDiscordRole(message, args[1]);
                return message.reply({ text: result.error || result.text });
            }

            if (first === "comandos") {
                const action = String(args[1] || "listar").toLowerCase();
                const name = args[2];
                if (action === "listar" || action === "list") {
                    const commands = economy.getCommunityVip(message).vipCommands;
                    return message.reply({ text: commands.length ? `Comandos VIP locais: ${commands.join(", ")}` : "Nenhum comando VIP local configurado." });
                }
                if (!["add", "adicionar", "rem", "remover"].includes(action)) {
                    return message.reply({ text: `Uso: ${message.prefix || "!"}set_vip comandos [add|rem] <comando>.` });
                }
                const result = economy.updateCommunityVipCommand(message, name, ["add", "adicionar"].includes(action));
                if (!result) return message.reply({ text: `Uso: ${message.prefix || "!"}set_vip comandos [add|rem] <comando>.` });
                return message.reply({ text: `Comando ${name} ${["add", "adicionar"].includes(action) ? "adicionado à" : "removido da"} lista VIP local.` });
            }

            if (first === "check" || first === "consulta") {
                const userId = targetId(message, args[1] || message.userId);
                const vip = economy.getCommunityVip(message);
                const member = vip.members[userId];
                const active = economy.isCommunityVipActive(message, userId);
                const status = !active ? "Inativo"
                    : member.permanent ? "Permanente"
                        : `Ativo até ${vipHelper.formatDateTimeDetailed(member.expiresAt)}`;
                return message.reply({ text: `VIP local de ${userId}: ${status}.` });
            }

            const explicitActions = ["set", "add", "rem", "perm", "permanente", "reset", "cancel", "remove", "remover"];
            const explicit = explicitActions.includes(first);
            const userId = targetId(message, explicit ? args[1] : first);
            const action = explicit ? first : String(args[1] || "").toLowerCase();
            const durationArgs = explicit ? args.slice(2) : args.slice(1);
            if (!userId || !action) {
                return message.reply({ text: `Uso: ${message.prefix || "!"}set_vip <membro> <duração|permanente|remover>.` });
            }
            if (["remover", "remove", "reset", "cancel"].includes(action)) {
                const result = await communityVip.removeMember(message, userId);
                return message.reply({
                    text: `${result.removed ? `VIP local removido de ${userId}.` : `O membro ${userId} não tinha VIP local.`}${result.roleSyncWarning ? ` Aviso: ${result.roleSyncWarning}` : ""}`
                });
            }
            const permanent = ["permanente", "perm"].includes(action);
            const durationMs = permanent ? 0 : vipHelper.parseDurationString(durationArgs.join(" "));
            if (!permanent && !durationMs) {
                return message.reply({ text: `Duração inválida. Exemplo: ${message.prefix || "!"}set_vip ${userId} 30d.` });
            }
            if (action === "set" || !explicit) await communityVip.removeMember(message, userId);
            if (action === "rem") {
                const result = await communityVip.removeDuration(message, userId, durationMs);
                return message.reply({
                    text: `${result?.permanent
                        ? `O VIP permanente de ${userId} não foi alterado.`
                        : result?.expired
                            ? `O VIP local de ${userId} expirou e foi removido.`
                            : result?.member
                                ? `Tempo removido do VIP local de ${userId}. Nova expiração: ${vipHelper.formatDateTimeDetailed(result.member.expiresAt)}.`
                                : `O membro ${userId} não tinha VIP local ativo.`}${result?.roleSyncWarning ? ` Aviso: ${result.roleSyncWarning}` : ""}`
                });
            }
            const member = await communityVip.setMember(message, userId, durationMs, permanent);
            const status = member.permanent ? "permanente" : `até ${vipHelper.formatDateTimeDetailed(member.expiresAt)}`;
            return message.reply({ text: `VIP local concedido a ${userId} ${status}.${member.roleSyncWarning ? ` Aviso: ${member.roleSyncWarning}` : ""}` });
        } catch (error) {
            console.error("[VIP_LOCAL_COMMAND]", error);
            return message.reply({ text: `❌ ${error.message || "Não foi possível concluir a operação de VIP local."}` });
        }
    }
};
