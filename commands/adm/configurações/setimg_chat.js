const { fetchBuffer } = require("../../../functions/api");
const { isOwner } = require("../../../functions/owners");
const { PermissionFlagsBits } = require("discord.js");

const DESCRIPTION = `🖼️ Altera a imagem do grupo no WhatsApp ou Telegram, ou do servidor no Discord.

🔐 Disponível para administradores do grupo/servidor e superusuários.
🤖 No Discord, o bot também precisa da permissão Gerenciar Servidor.
📱 No WhatsApp e Telegram, funciona apenas em grupos.

1. Escolha como fornecer a imagem:

Envie uma imagem com o comando na legenda:
{prefix}setimg_chat

Ou responda a uma mensagem que contenha uma imagem:
{prefix}setimg_chat

Ou informe uma URL da imagem:
{prefix}setimg_chat <URL>
{prefix}setimg_chat https://exemplo.com/foto.png

2. O bot baixa a imagem e a define como foto do grupo ou servidor. O comando aceita arquivos de imagem; vídeos e outros tipos de arquivo não são aceitos.

❔ Exiba esta ajuda:
{prefix}setimg_chat help`;

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "setimg_chat",
    aliases: ["setimgchat", "setimg"],
    category: "adm/configurações",
    platformSupport: {
        whatsapp: "full",
        telegram: "full",
        discord: "full"
    },
    description: DESCRIPTION,
    usage: "{prefix}setimg_chat [imagem|URL]",
    examples: [
        "{prefix}setimg_chat",
        "{prefix}setimg_chat https://exemplo.com/foto.png",
        "{prefix}setimg_chat help"
    ],

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos ou servidores." });
        }

        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = isOwner(message) || (adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : (message.sender?.isAdmin || message.sender?.isOwner));

        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores do grupo/servidor podem usar este comando." });
        }

        const args = message.args || [];
        if (["help", "ajuda"].includes(String(args[0] || "").toLowerCase())) {
            return message.reply({ text: helpText(message) });
        }
        const targetMedia = message.media || message.quoted?.media;
        let buffer = null;
        let mimeType = null;
        let fileName = null;

        if (targetMedia && typeof targetMedia.getBuffer === "function") {
            try {
                buffer = await targetMedia.getBuffer();
                mimeType = targetMedia.mimeType;
                fileName = targetMedia.fileName;
            } catch (err) {
                console.error("[setimg_chat] Falha ao baixar mídia:", err);
                console.error("[SETIMG_CHAT] Erro ao processar imagem:", err);
                return message.reply({ text: "❌ Não foi possível processar a imagem. Verifique o arquivo e tente novamente." });
            }
        }

        if (!buffer) {
            // Se houver um URL passado, tenta baixar
            const maybeUrl = args[0] && typeof args[0] === "string" ? args[0].trim() : null;
            if (maybeUrl && /^(https?:\/\/)/i.test(maybeUrl)) {
                try {
                    buffer = await fetchBuffer(maybeUrl);
                    mimeType = "image/png";
                } catch (err) {
                    console.error("[SETIMG_CHAT] Erro ao baixar imagem:", err);
                    return message.reply({ text: "❌ Não foi possível baixar a imagem do endereço informado. Confira o link e tente novamente." });
                }
            }
        }

        if (!buffer) {
            return message.reply({ text: `❌ Nenhuma imagem detectada.

Use este comando enviando uma imagem com a legenda ou respondendo a uma imagem com o comando.` });
        }

        if (mimeType && !mimeType.startsWith("image/")) {
            return message.reply({ text: "❌ O arquivo enviado não é uma imagem válida. Use uma foto PNG, JPG ou GIF." });
        }

        try {
            if (message.platform === "whatsapp") {
                if (!message.chatId.endsWith("@g.us")) {
                    return message.reply({ text: "❌ Este comando está disponível apenas para grupos do WhatsApp." });
                }

                if (!global.whatsappSock || typeof global.whatsappSock.updateProfilePicture !== "function") {
                    return message.reply({ text: "❌ O suporte a alteração de imagem do grupo no WhatsApp não está disponível no momento." });
                }

                await global.whatsappSock.updateProfilePicture(message.chatId, buffer);
                return message.reply({ text: "✅ Imagem do grupo do WhatsApp atualizada com sucesso." });
            }

            if (message.platform === "telegram") {
                if (!global.telegramBot || !global.telegramBot.telegram) {
                    return message.reply({ text: "❌ O suporte ao Telegram não está disponível no momento." });
                }

                await global.telegramBot.telegram.setChatPhoto(message.chatId, { source: buffer });
                return message.reply({ text: "✅ Imagem do grupo do Telegram atualizada com sucesso." });
            }

            if (message.platform === "discord") {
                const discordMsg = message.raw;
                const guild = discordMsg?.guild;

                if (!guild) {
                    return message.reply({ text: "❌ Este comando deve ser usado em um servidor do Discord." });
                }

                if (guild.members?.me && !guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
                    return message.reply({ text: "❌ O bot precisa da permissão Gerenciar Servidor para alterar a imagem do servidor." });
                }

                await guild.setIcon(buffer);
                return message.reply({ text: "✅ Imagem do servidor do Discord atualizada com sucesso." });
            }

            return message.reply({ text: "❌ Plataforma não suportada para este comando." });
        } catch (err) {
            console.error("[setimg_chat] Erro ao alterar imagem do chat:", err);
            console.error("[SETIMG_CHAT] Erro ao alterar imagem:", err);
            let errorMessage = "❌ Não foi possível alterar a imagem deste chat. Verifique as permissões e tente novamente.";
            if (message.platform === "discord" && err.code === 50035) {
                errorMessage = "❌ Imagem inválida para o Discord. Use um arquivo JPG ou PNG de tamanho apropriado.";
            }
            return message.reply({ text: errorMessage });
        }
    }
};
