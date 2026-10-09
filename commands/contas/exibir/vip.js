const vipHelper = require("../../../functions/vipHelper");

module.exports = {
    name: "vip",
    aliases: ["premium"],
    category: "contas/exibir",
    description: `👑 Consulta a sua assinatura VIP atual, validade restante e status em todas as contas vinculadas à Conta Central.

📝 1. Execute o comando para verificar seu status VIP:
{prefix}vip

O bot exibe se o seu VIP está ativo, quanto tempo resta (ou se é permanente), data de expiração e o resumo por plataforma vinculada.

ℹ️ Administradores que desejam conceder ou gerenciar assinaturas VIP devem utilizar o comando {prefix}set_vip.`,
    usage: "{prefix}vip",

    async execute(message) {
        if (Array.isArray(message.args) && message.args.length > 0) {
            return message.reply({
                text: `ℹ️ ${message.prefix || "!"}vip consulta seu próprio status. Para gerenciar assinaturas, use ${message.prefix || "!"}set_vip.`
            });
        }

        const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts;
        const central = store?.findByPlatform?.(message.platform, String(message.userId));
        if (!central) {
            return message.reply({ text: "❌ Não encontrei sua Conta Central para consultar o status VIP." });
        }

        const status = vipHelper.getVipStatus(central.id);
        const platformNames = {
            discord: "Discord",
            telegram: "Telegram",
            whatsapp: "WhatsApp"
        };
        const platformAccounts = Array.isArray(central.platformAccounts)
            ? central.platformAccounts
            : [];
        const accountLines = platformAccounts.length
            ? platformAccounts.map(account => {
                const active = status.active || status.permanent;
                const remaining = status.permanent
                    ? "👑 Permanente"
                    : active
                        ? status.remainingText
                        : "⏳ 0 minutos";
                const expiration = status.permanent
                    ? "♾️ Permanente"
                    : status.expiresAt
                        ? `🗓️ ${vipHelper.formatDateTimeDetailed(status.expiresAt)}`
                        : "🗓️ —";
                return [
                    `🔹 *${platformNames[account.platform] || account.platform}* — ID: \`${account.platformId}\``,
                    `   ${active ? "✅ Ativo" : "❌ Inativo"} • ${remaining}`,
                    `   ${expiration}`
                ].join("\n");
            })
            : ["⚠️ Nenhuma plataforma vinculada à Conta Central."];

        return message.reply({
            text: [
                "👑 *RESUMO DA ASSINATURA VIP*",
                `🪪 ID Central: \`${central.id}\``,
                `📊 Status geral: ${status.active || status.permanent ? "✅ VIP ativo" : "❌ VIP inativo"}`,
                "",
                "🌐 *Contas vinculadas:*",
                ...accountLines
            ].join("\n")
        });
    }
};
