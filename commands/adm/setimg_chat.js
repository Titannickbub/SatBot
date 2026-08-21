const { fetchBuffer } = require("../../functions/api");
const { PermissionFlagsBits } = require("discord.js");

module.exports = {
    name: "setimg_chat",
    aliases: ["setimgchat", "setimg"],
    category: "adm",
    description: `Define a imagem do grupo no WhatsApp e Telegram, e do servidor no Discord.

No WhatsApp e Telegram, a alteração é permitida apenas em grupos.
No Discord, altera a imagem do servidor sempre que possível.
Use enviando uma imagem com o comando, respondendo uma imagem ou informando uma URL de imagem.`,
    usage: "{prefix}setimg_chat [imagem|URL]",
    examples: [
        "{prefix}setimg_chat (enviando imagem com o comando)",
        "{prefix}setimg_chat (respondendo a uma imagem no chat)",
        "{prefix}setimg_chat https://exemplo.com/foto.png"
    ],

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos ou servidores." });
        }

        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : (message.sender?.isAdmin || message.sender?.isOwner);

        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores do grupo/servidor podem usar este comando." });
        }

        const targetMedia = message.media || message.quoted?.media;
        const args = message.args || [];
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
                return message.reply({ text: `❌ Erro ao processar a imagem: ${err.message}` });
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
                    return message.reply({ text: `❌ Não foi possível baixar a imagem do URL informado: ${err.message}` });
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
            let errorMessage = `❌ Falha ao alterar a imagem: ${err.message}`;
            if (message.platform === "discord" && err.code === 50035) {
                errorMessage = "❌ Imagem inválida para o Discord. Use um arquivo JPG ou PNG de tamanho apropriado.";
            }
            return message.reply({ text: errorMessage });
        }
    }
};
