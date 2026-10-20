const nofapHelper = require("../../functions/nofapHelper");
const { ensureParticipant, leaveParticipant, buildRankingText } = require("../../functions/nofapGroupHelper");

module.exports = {
    category: "diversão",
    name: "setembro",
    aliases: ["setembronofap", "ranksetembro"],
    description: `🏆 Gerencia e exibe o ranking do desafio de Setembro / NoFap entre os membros do grupo ou servidor.

📝 1. Participe do desafio no chat atual:
{prefix}setembro entrar

Inscreve seu perfil no placar deste grupo e inicia sua contagem de dias.

📊 2. Consulte o ranking dos membros:
{prefix}setembro rank
{prefix}setembro

Exibe a tabela de classificação com a sequência de dias de todos os participantes do chat.

🔄 3. Registre uma recaída (reset):
{prefix}setembro reset

Zera sua sequência atual de dias e atualiza seus dados no ranking.

🚪 4. Deixe o desafio no grupo:
{prefix}setembro sair

Remove seu perfil do placar deste grupo ou servidor.`,
    usage: "{prefix}setembro [subcomando]",
    examples: [
        "{prefix}setembro rank",
        "{prefix}setembro entrar",
        "{prefix}setembro reset",
        "{prefix}setembro sair"
    ],
    async execute(message) {
        const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts;
        const args = (message.text || "").trim().split(/\s+/).slice(1);
        const action = (args[0] || "rank").toLowerCase();

        const isSupportedCommunity = message.platform === "whatsapp"
            ? message.chatType === "group" || String(message.chatId).endsWith("@g.us")
            : message.platform === "telegram"
                ? ["group", "supergroup"].includes(message.chatType) && !message.isPrivate
                : message.platform === "discord"
                    ? message.chatType === "group" && !message.isPrivate
                    : false;

        if (!message.chatId || !isSupportedCommunity) {
            return message.reply({
                text: "⚠️ Este comando só pode ser usado em grupos do WhatsApp/Telegram ou servidores do Discord."
            });
        }

        if (!store || typeof store.getOrCreateByPlatform !== "function") {
            return message.reply({ text: "⚠️ O módulo de contas centrais não está disponível." });
        }

        const central = await store.getOrCreateByPlatform(message.platform, message.userId, {
            username: message.username,
            displayName: message.displayName || message.name || message.username || null
        });

        if (["help", "ajuda"].includes(action)) {
            return message.reply({
                text: [
                    "🏆 *Setembro / NoFap*",
                    "",
                    `• ${message.prefix}setembro rank — mostra o ranking atual do grupo`,
                    `• ${message.prefix}setembro entrar — entra no desafio do grupo`,
                    `• ${message.prefix}setembro reset — zera sua sequência no grupo`,
                    `• ${message.prefix}setembro sair — sai do ranking deste grupo`,
                    `• ${message.prefix}nofap status — consulta sua contagem pessoal`
                ].join("\n")
            });
        }

        if (["entrar", "join", "incluir"].includes(action)) {
            const participant = ensureParticipant(message.platform, message.chatId, central.id, {
                name: message.username || message.displayName || message.name || "Usuário",
                platform: message.platform,
                platformId: message.userId,
                lastInteraction: new Date().toISOString(),
                active: true
            });
            const status = nofapHelper.startNofap(central.id);
            return message.reply({
                text: [
                    "✅ Você entrou no desafio de Setembro!",
                    "",
                    nofapHelper.formatNofapStatus(status),
                    "",
                    `👥 Participante registrado no grupo: ${participant?.name || "usuário"}`
                ].join("\n")
            });
        }

        if (["reset", "zerar"].includes(action)) {
            const status = nofapHelper.resetNofap(central.id);
            const participant = ensureParticipant(message.platform, message.chatId, central.id, {
                name: message.username || message.displayName || message.name || "Usuário",
                platform: message.platform,
                platformId: message.userId,
                lastInteraction: new Date().toISOString(),
                active: true,
                resetCount: Number((status.totalResets || 0))
            });
            return message.reply({
                text: [
                    "🔄 Reset registrado no desafio de Setembro.",
                    "",
                    nofapHelper.formatNofapStatus(status),
                    "",
                    `🧾 Participante: ${participant?.name || "usuário"}`
                ].join("\n")
            });
        }

        if (["sair", "leave", "stop", "parar"].includes(action)) {
            const participant = leaveParticipant(message.platform, message.chatId, central.id);
            if (!participant) {
                return message.reply({ text: "ℹ️ Você não está participando do desafio de Setembro neste grupo." });
            }
            return message.reply({ text: "🚪 Você saiu do desafio de Setembro e foi removido do ranking deste grupo." });
        }

        const rankingText = buildRankingText(message.platform, message.chatId, message.chatName || "Setembro");
        return message.reply({ text: rankingText });
    }
};
