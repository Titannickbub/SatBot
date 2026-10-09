const { isOwner } = require("../../../functions/owners");
const autofiguHelper = require("../../../functions/autofiguHelper");

const DESCRIPTION = `🖼️ Converte automaticamente fotos, GIFs e vídeos em figurinhas neste grupo.

📱 Exclusivo para grupos do WhatsApp e Telegram. Não funciona no Discord.

🔐 Apenas administradores do chat e superusuários podem ativar ou desativar.

✅ Ative ou desative:
{prefix}autofigu on
{prefix}autofigu off

📊 Consulte o estado:
{prefix}autofigu status`;

module.exports = {
    name: "autofigu",
    aliases: ["autofigurinha"],
    category: "adm/configurações",
    platformSupport: { whatsapp: "full", telegram: "full", discord: "none" },
    description: DESCRIPTION,
    usage: "{prefix}autofigu <on|off|status>",
    examples: [
        "{prefix}autofigu on",
        "{prefix}autofigu off",
        "{prefix}autofigu status"
    ],

    async execute(message) {
        if (message.isPrivate || !["whatsapp", "telegram"].includes(message.platform)) {
            return message.reply({
                text: "❌ O Autofigu só está disponível em grupos do WhatsApp e Telegram."
            });
        }

        const action = String(message.args?.[0] || "status").toLowerCase();
        if (["help", "ajuda"].includes(action)) {
            return message.reply({
                text: DESCRIPTION.replaceAll("{prefix}", message.prefix || "!")
            });
        }

        if (action === "status") {
            const enabled = autofiguHelper.getAutofiguEnabled(message);
            return message.reply({
                text: enabled
                    ? "🖼️ Autofigu está ativado neste chat."
                    : "🔕 Autofigu está desativado neste chat."
            });
        }

        const enabled = ["on", "ativar", "enable"].includes(action);
        const disabled = ["off", "desativar", "disable"].includes(action);
        if (!enabled && !disabled) {
            return message.reply({
                text: `❌ Opção inválida. Use ${message.prefix}autofigu on, ${message.prefix}autofigu off ou ${message.prefix}autofigu status.`
            });
        }

        const authorized =
            message.sender?.isAdmin ||
            message.sender?.isOwner ||
            message.sender?.canManageMessages ||
            isOwner(message);
        if (!authorized) {
            return message.reply({
                text: "❌ Apenas administradores do chat ou superusuários podem alterar o Autofigu."
            });
        }

        try {
            autofiguHelper.setAutofiguEnabled(message, enabled);
        } catch (error) {
            console.error("[AUTOFIGU] Falha ao atualizar configuração:", error);
            return message.reply({
                text: "❌ Não foi possível salvar a configuração do Autofigu."
            });
        }

        return message.reply({
            text: enabled
                ? "✅ Autofigu ativado. Fotos, GIFs e vídeos compatíveis serão convertidos em figurinhas."
                : "🔕 Autofigu desativado neste chat."
        });
    }
};
