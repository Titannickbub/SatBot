const { isAutoDownloadEnabledForChat, setAutoDownloadForGroup, getAutoDownloadSettings, setAutoDownloadDeleteLink } = require("../../../functions/autodownloadHelper");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "autodownload",
    aliases: ["downloadlink", "adl"],
    category: "system/configurações",
    description: "Gerencia a funcionalidade de baixar automaticamente mídias de links enviados no chat (YouTube, TikTok, Instagram, Twitter/X, Facebook, Kwai). No PV fica sempre ativo por padrão (respeitando o Anti-PV) e em grupos pode ser ativado ou desativado por administradores.",
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

        if (isPrivate) {
            if (action === "status") {
                const text = `🎬 *Sistema de Auto Download (PV)*

📌 *Estado no PV:* ✅ *Sempre Ativo* (Respeita o Anti-PV)
📌 *Em Grupos:* ⚙️ Inativo por padrão (Ativável por grupo)

ℹ️ *Como Usar no PV:*
Basta enviar qualquer link de mídia suportado diretamente neste chat privado para o bot realizar o download automaticamente.

📖 *Comandos Disponíveis:*
• *${p}autodownload* ou *${p}autodownload status* → Exibe este painel e guia de uso.
• *${p}autodownload on/off* → Utilizado dentro dos grupos para ativar ou desativar o recurso.

🌐 *Plataformas e Conteúdos Suportados:*
• 🎵 *YouTube* (Música em MP3)
• 🎬 *TikTok* (Vídeos)
• 🎬 *Instagram* (Reels e Vídeos)
• 🎬 *X / Twitter* (Vídeos)
• 🎬 *Facebook* (Vídeos)
• 🎬 *Kwai* (Vídeos)`;

                return await message.reply({ text });
            }

            if (action === "on" || action === "off") {
                return await message.reply({
                    text: `ℹ️ No PV o *AutoDownload* já fica sempre ativo por padrão (respeitando o Anti-PV).\n\nPara configurar em grupos, use *${p}autodownload <on|off>* diretamente dentro do grupo desejado.`
                });
            }

            return await message.reply({
                text: `❌ *Ação inválida!*\n\n💡 *Como usar:* Use *${p}autodownload* ou *${p}autodownload status* para ver o guia.`
            });
        }

        // --- Nível de Grupo ---
        const isGroupAdmin = message.sender?.isAdmin || message.sender?.isOwner || isOwner(message);
        const isEnabled = isAutoDownloadEnabledForChat(message);
        const settings = getAutoDownloadSettings(message);

        if (action === "deletelink") {
            const value = message.args[1]?.toLowerCase();
            if (!["on", "off", "status"].includes(value)) {
                return message.reply({ text: `❌ Use *${p}autodownload deletelink on|off|status*.` });
            }
            if (value === "status") {
                return message.reply({ text: `🔗 Exclusão do link original: ${settings.deletelink ? "✅ *ATIVADA*" : "❌ *DESATIVADA*"}` });
            }
            if (!isGroupAdmin) {
                return message.reply({ text: "❌ Apenas administradores do grupo podem alterar esta opção." });
            }
            setAutoDownloadDeleteLink(message, value === "on");
            return message.reply({ text: `✅ Exclusão do link original ${value === "on" ? "ativada" : "desativada"} neste grupo.` });
        }

        if (action === "status") {
            const statusBadge = isEnabled ? "✅ *ATIVADO*" : "❌ *DESATIVADO* (Padrão)";
            const usageInfo = isEnabled
                ? "Envie qualquer link de mídia suportado no grupo para o bot realizar o download automaticamente."
                : `O AutoDownload está desativado neste grupo. Administradores podem ativá-lo com *${p}autodownload on*.`;

            const text = `🎬 *Sistema de Auto Download (Grupo)*

📌 *Estado neste Grupo:* ${statusBadge}
🔗 *Excluir link original:* ${settings.deletelink ? "✅ *ATIVADO*" : "❌ *DESATIVADO*"}

ℹ️ *Como Usar:*
${usageInfo}

📖 *Comandos de Gerenciamento (Apenas Admins):*
• *${p}autodownload on* → Ativa o download automático neste grupo.
• *${p}autodownload off* → Desativa o download automático neste grupo.
• *${p}autodownload status* → Exibe este painel de status e guia de uso.
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
            if (!isGroupAdmin) {
                return await message.reply({
                    text: "❌ Apenas administradores do grupo podem ativar o AutoDownload."
                });
            }

            if (isEnabled) {
                return await message.reply({ text: "✅ O AutoDownload já está ativado neste grupo." });
            }

            setAutoDownloadForGroup(message, true);
            return await message.reply({
                text: `✅ *AutoDownload ativado com sucesso neste grupo!*\n\nAgora, quando alguém enviar um link de mídia suportado (YouTube, TikTok, Instagram, Twitter, Facebook, Kwai), o bot baixará automaticamente.`
            });
        }

        if (action === "off") {
            if (!isGroupAdmin) {
                return await message.reply({
                    text: "❌ Apenas administradores do grupo podem desativar o AutoDownload."
                });
            }

            if (!isEnabled) {
                return await message.reply({ text: "❌ O AutoDownload já está desativado neste grupo." });
            }

            setAutoDownloadForGroup(message, false);
            return await message.reply({
                text: `📵 *AutoDownload desativado com sucesso neste grupo!*`
            });
        }

        return await message.reply({
            text: `❌ *Ação inválida!*\n\n💡 *Como usar:* Use *${p}autodownload <on|off|status>*\nExemplo: *${p}autodownload on*`
        });
    }
};
