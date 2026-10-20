const autoTranscribe = require("../../../functions/autoTranscribeHelper");
const { getAvailableLevels, getLevelLabel } = require("../../../functions/antilinkHelper");
const { isOwner } = require("../../../functions/owners");

const DESCRIPTION = `🎙️ Transcreve automaticamente áudios e músicas recebidos em grupos, servidores ou canais.

🔐 Apenas administradores do chat e superusuários podem configurar.
🚫 Em conversas privadas, a função fica sempre desativada e não pode ser ativada.

📍 Configure por nível:
• Discord: servidor, categoria ou chat (canal/tópico).
• WhatsApp: comunidade (quando disponível) ou chat (grupo).
• Telegram: servidor ou chat (tópico, quando disponível).

Se nenhum nível for informado, a configuração será aplicada ao chat atual.
O nível mais específico prevalece sobre os níveis superiores.

✅ Ative ou desative:
{prefix}autotranscrever on
{prefix}autotranscrever servidor on
{prefix}autotranscrever categoria off
{prefix}autotranscrever chat on

📊 Consulte o estado efetivo no chat atual:
{prefix}autotranscrever status`;

const LEVEL_ALIASES = {
    server: "server",
    servidor: "server",
    categoria: "categoria",
    category: "categoria",
    chat: "chat"
};

module.exports = {
    name: "autotranscrever",
    aliases: ["autotranscricao", "autotranscrição"],
    category: "adm/configurações",
    description: DESCRIPTION,
    usage: "{prefix}autotranscrever <on|off|status>",
    examples: [
        "{prefix}autotranscrever on",
        "{prefix}autotranscrever servidor on",
        "{prefix}autotranscrever categoria off",
        "{prefix}autotranscrever chat on",
        "{prefix}autotranscrever status"
    ],

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({
                text: "🚫 A transcrição automática não está disponível em conversas privadas."
            });
        }

        const input = (message.args || []).map(value => String(value).toLocaleLowerCase("pt-BR"));
        const adapter = (message.platforms || []).find(platform => platform.name === message.platform);
        const authorized =
            isOwner(message) ||
            (adapter?.checkUserPermission
                ? await adapter.checkUserPermission(message.chatId, message.userId)
                : Boolean(message.sender?.isAdmin || message.sender?.canManageMessages));
        if (!authorized) {
            return message.reply({
                text: "❌ Apenas administradores do chat ou superusuários podem configurar a transcrição automática."
            });
        }

        if (!input.length || ["help", "ajuda"].includes(input[0])) {
            return message.reply({
                text: DESCRIPTION.replaceAll("{prefix}", message.prefix || "!")
            });
        }

        if (input[0] === "status") {
            const state = autoTranscribe.getAutoTranscribeState(message);
            const source = state.level ? ` (nível: ${getLevelLabel(message.platform, state.level)})` : "";
            return message.reply({
                text: state.enabled
                    ? `🎙️ A transcrição automática está ativada neste chat${source}.`
                    : "🔕 A transcrição automática está desativada neste chat."
            });
        }

        const explicitLevel = Object.prototype.hasOwnProperty.call(LEVEL_ALIASES, input[0]);
        const level = explicitLevel ? LEVEL_ALIASES[input[0]] : "chat";
        const action = explicitLevel ? input[1] : input[0];
        const available = getAvailableLevels(message);
        const telegramChatFallback = message.platform === "telegram" && level === "chat" && !message.threadId;
        if (!available.includes(level) && !telegramChatFallback) {
            const levels = available.map(item => `• ${item} (${getLevelLabel(message.platform, item)})`).join("\n");
            return message.reply({
                text: `❌ O nível *${level}* não está disponível aqui.\n\nNíveis disponíveis:\n${levels || "Nenhum."}`
            });
        }

        if (!["on", "off", "ativar", "desativar"].includes(action)) {
            return message.reply({
                text: `❌ Use ${message.prefix}autotranscrever [chat|categoria|servidor] <on|off> ou ${message.prefix}autotranscrever status.`
            });
        }

        const enabled = action === "on" || action === "ativar";
        try {
            autoTranscribe.setAutoTranscribeSetting(message, level, enabled);
        } catch (error) {
            console.error("[AUTO-TRANSCRIBE] Falha ao atualizar configuração:", error);
            return message.reply({
                text: "❌ Não foi possível salvar a configuração da transcrição automática."
            });
        }

        const label = getLevelLabel(message.platform, level);
        return message.reply({
            text: enabled
                ? `✅ Transcrição automática ativada no nível *${label}*. Áudios e músicas recebidos serão transcritos.`
                : `🔕 Transcrição automática desativada no nível *${label}*.`
        });
    }
};
