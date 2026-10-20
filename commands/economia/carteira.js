const economy = require("../../functions/economy");
const { renderWalletBanner } = require("../../functions/walletBanner");
const { fetchBuffer } = require("../../functions/api");
const { resolvePlatformProfile } = require("../../functions/profiles");

module.exports = {
    name: "carteira",
    aliases: ["saldo", "wallet"],
    category: "economia",
    description: `💰 Consulta o seu saldo de satcoins na economia local do grupo ou servidor atual.

📝 1. Execute o comando dentro de um grupo ou servidor:
{prefix}carteira

O bot gera um banner com seu saldo, identificação e disponibilidade da recompensa diária para resgate ({prefix}resgatar).

⚠️ A economia e os saldos são separados individualmente por grupo/servidor.`,
    usage: "{prefix}carteira",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ A carteira só funciona em grupos ou servidores." });
        }

        const account = economy.getAccount(message);
        const name = message.displayName || message.username || message.userId;
        const balance = economy.formatMoney(account.account.balance);
        const scope = economy.getScope(message);
        const canClaimDaily = economy.canClaimDaily(message);
        let avatar = null;
        try {
            const profile = await resolvePlatformProfile(message.platform, message.userId, {
                raw: message.raw,
                username: message.username
            });
            if (profile?.avatarUrl) {
                avatar = await fetchBuffer(profile.avatarUrl, { timeout: 12000 });
            }
        } catch (error) {
            console.warn(`[CARTEIRA] Não foi possível carregar o avatar de ${message.userId}:`, error.message || error);
        }

        const banner = await renderWalletBanner({
            name,
            userId: message.userId,
            balance,
            scopeName: scope.name,
            scopeType: scope.type,
            platform: message.platform,
            canClaimDaily,
            dailyReward: economy.formatMoney(economy.DAILY_REWARD),
            avatar
        });

        return message.replyImg({
            image: banner,
            caption: `💰 Carteira de ${name} — saldo: ${balance}`,
            fileName: "carteira.png"
        });
    }
};
