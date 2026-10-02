const { isAutoDownloadEnabledForChat, setAutoDownloadForGroup, getAutoDownloadSettings, setAutoDownloadDeleteLink } = require("../../../functions/autodownloadHelper");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "autodownload",
    aliases: ["downloadlink", "adl"],
    category: "adm/configurações",
    description: "Gerencia o download automático de mídias por chat (YouTube, TikTok, Instagram, Twitter/X, Facebook, Kwai). No PV fica sempre ativo; em grupos, administradores podem ativar ou desativar.",
    usage: "{prefix}autodownload [subcomando]",
    examples: [
        "{prefix}autodownload",
        "{prefix}autodownload status",
        "{prefix}autodownload on",
        "{prefix}autodownload off"
    ],

    async execute(message) {
        const arg = message.args[0]?.toLowerCase();
        const action = !arg || arg === "help" || arg === "info" ? "status" : arg;
        const isPrivate = !!message.isPrivate;
        const p = message.prefix || "!";

        const isAuthorized = isPrivate ||
            message.sender?.isAdmin ||
            message.sender?.isOwner ||
            isOwner(message);
        const isEnabled = isAutoDownloadEnabledForChat(message);
        const settings = getAutoDownloadSettings(message);
        const chatLabel = isPrivate ? "PV" : "grupo/chat";

        if (isPrivate && (action === "on" || action === "off")) {
            return message.reply({
                text: "ℹ️ O AutoDownload fica sempre ativo no PV. A configuração para ativar ou desativar está disponível em cada grupo."
            });
        }

        if (action === "deletelink") {
            const value = message.args[1]?.toLowerCase();
            if (!["on", "off", "status"].includes(value)) {
                return message.reply({ text: `❌ Use *${p}autodownload deletelink on|off|status*.` });
            }
            if (value === "status") {
                return message.reply({ text: `🔗 Exclusão do link original: ${settings.deletelink ? "✅ *ATIVADA*" : "❌ *DESATIVADA*"}` });
            }
            if (!isAuthorized) {
                return message.reply({ text: "❌ Apenas administradores podem alterar esta opção no grupo." });
            }
            try {
                setAutoDownloadDeleteLink(message, value === "on");
            } catch (err) {
                return message.reply({ text: `❌ Não foi possível salvar a configuração: ${err.message}` });
            }
            return message.reply({ text: `✅ Exclusão do link original ${value === "on" ? "ativada" : "desativada"} neste chat.` });
        }

        if (action === "status") {
            const statusBadge = isEnabled ? "✅ *ATIVADO*" : "❌ *DESATIVADO* (Padrão)";
            const usageInfo = isEnabled
                ? `Envie um link de mídia suportado neste chat para o bot realizar o download automaticamente.${isPrivate ? " No PV, esse recurso fica sempre ativo." : ""}`
                : `O AutoDownload está desativado neste chat. ${isPrivate ? "Use" : "Um administrador pode usar"} *${p}autodownload on* para ativá-lo.`;
            const toggleCommands = isPrivate
                ? ""
                : `• *${p}autodownload on* → Ativa o download automático neste chat.
• *${p}autodownload off* → Desativa o download automático neste chat.
`;

            const text = `🎬 *Sistema de Auto Download (${chatLabel})*

📌 *Estado neste chat:* ${statusBadge}
🔗 *Excluir link original:* ${settings.deletelink ? "✅ *ATIVADO*" : "❌ *DESATIVADO*"}

ℹ️ *Como Usar:*
${usageInfo}

📖 *Comandos de Gerenciamento${isPrivate ? "" : " (Apenas Admins)"}:*
${toggleCommands}• *${p}autodownload status* → Exibe este painel de status e guia de uso.
• *${p}autodownload deletelink on/off* → Exclui o link original após enviar a mídia, evitando poluição no chat.

🌐 *Plataformas e Conteúdos Suportados:*
• 🎵 *YouTube* (Música em MP3)
• 🎬 *TikTok* (Vídeos)
• 🎬 *Instagram* (Reels e Vídeos)
• 🎬 *X / Twitter* (Vídeos)
• 🎬 *Facebook* (Vídeos)
• 🎬 *Kwai* (Vídeos)`;

            return await message.reply({ text });
        }

        if (action === "on") {
            if (!isAuthorized) {
                return await message.reply({
                    text: "❌ Apenas administradores podem ativar o AutoDownload neste grupo."
                });
            }

            if (isEnabled) {
                return await message.reply({ text: "✅ O AutoDownload já está ativado neste chat." });
            }

            try {
                setAutoDownloadForGroup(message, true);
            } catch (err) {
                return message.reply({ text: `❌ Não foi possível salvar a configuração: ${err.message}` });
            }
            return await message.reply({
                text: `✅ *AutoDownload ativado com sucesso neste chat!*\n\nAgora, quando alguém enviar um link de mídia suportado (YouTube, TikTok, Instagram, Twitter, Facebook, Kwai), o bot baixará automaticamente.`
            });
        }

        if (action === "off") {
            if (!isAuthorized) {
                return await message.reply({
                    text: "❌ Apenas administradores podem desativar o AutoDownload neste grupo."
                });
            }

            if (!isEnabled) {
                return await message.reply({ text: "❌ O AutoDownload já está desativado neste chat." });
            }

            try {
                setAutoDownloadForGroup(message, false);
            } catch (err) {
                return message.reply({ text: `❌ Não foi possível salvar a configuração: ${err.message}` });
            }
            return await message.reply({
                text: `📵 *AutoDownload desativado com sucesso neste chat!*`
            });
        }

        return await message.reply({
            text: `❌ *Ação inválida!*\n\n💡 *Como usar:* Use *${p}autodownload <on|off|status>*\nExemplo: *${p}autodownload on*`
        });
    }
};
