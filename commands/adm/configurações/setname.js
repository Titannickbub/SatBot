const { PermissionFlagsBits } = require("discord.js");

function _formatLevels(platform) {
    if (platform === "discord") return "server | categoria | chat";
    if (platform === "telegram") return "server | chat";
    if (platform === "whatsapp") return "server | chat";
    return "chat";
}

function _getDiscordRenamePermission(channel, member, level) {
    if (!member || !member.permissions) return false;

    if (level === "server") {
        return member.permissions.has(PermissionFlagsBits.ManageGuild) || member.permissions.has(PermissionFlagsBits.Administrator);
    }

    if (level === "categoria") {
        return member.permissions.has(PermissionFlagsBits.ManageChannels) || member.permissions.has(PermissionFlagsBits.Administrator);
    }

    if (level === "chat") {
        if (channel?.isThread?.()) {
            return member.permissions.has(PermissionFlagsBits.ManageThreads) || member.permissions.has(PermissionFlagsBits.ManageChannels) || member.permissions.has(PermissionFlagsBits.Administrator);
        }
        return member.permissions.has(PermissionFlagsBits.ManageChannels) || member.permissions.has(PermissionFlagsBits.Administrator);
    }

    return false;
}

module.exports = {
    name: "setname",
    aliases: ["setname_chat", "chatname", "rename"],
    category: "adm/configurações",
    description: `Renomeia o servidor, categoria, chat ou tópico conforme o nível especificado.

Discord: server | categoria | chat.
Telegram: server | chat.
WhatsApp: server | chat.
Use {prefix}setname <nivel> <novo nome> para definir o nome do nível correto.`,
    usage: "{prefix}setname <nivel> <novo nome>",
    examples: [
        "{prefix}setname server Meu Novo Servidor",
        "{prefix}setname categoria Canal de Notícias",
        "{prefix}setname chat Nome do Canal",
        "{prefix}setname chat Assunto do Tópico"
    ],

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos, canais ou servidores." });
        }

        const args = message.args || [];
        const level = (args[0] || "").toLowerCase();
        const newName = args.slice(1).join(" ").trim();
        const platform = message.platform;
        const chatId = message.chatId;
        const adapter = (message.platforms || []).find(p => p.name === platform);
        const userOk = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(chatId, message.userId)
            : (message.sender?.isAdmin || message.sender?.isOwner);

        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores do grupo/servidor podem usar este comando." });
        }

        if (!level || !newName) {
            return message.reply({
                text:
                    `❌ Uso incorreto. Níveis válidos: ${_formatLevels(platform)}\n\n` +
                    `Exemplo: ${message.prefix}setname chat Novo nome do chat`
            });
        }

        const validLevels = {
            discord: ["server", "categoria", "chat"],
            telegram: ["server", "chat"],
            whatsapp: ["server", "chat"]
        };

        if (!validLevels[platform]?.includes(level)) {
            return message.reply({
                text: `❌ Nível inválido. Níveis válidos para ${platform}: ${_formatLevels(platform)}`
            });
        }

        try {
            if (platform === "whatsapp") {
                if (!chatId.endsWith("@g.us")) {
                    return message.reply({ text: "❌ Este comando só funciona em grupos do WhatsApp." });
                }
                if (!global.whatsappSock || typeof global.whatsappSock.groupUpdateSubject !== "function") {
                    return message.reply({ text: "❌ O suporte ao WhatsApp não permite renomear grupos no momento." });
                }
                await global.whatsappSock.groupUpdateSubject(chatId, newName);
                return message.reply({ text: `✅ Nome do grupo do WhatsApp atualizado para:
${newName}` });
            }

            if (platform === "telegram") {
                if (!global.telegramBot || !global.telegramBot.telegram) {
                    return message.reply({ text: "❌ O suporte ao Telegram não está disponível no momento." });
                }

                if (level === "server") {
                    await global.telegramBot.telegram.setChatTitle(chatId, newName);
                    return message.reply({ text: `✅ Nome do chat do Telegram atualizado para:\n${newName}` });
                }

                if (level === "chat") {
                    if (message.threadId) {
                        await global.telegramBot.telegram.editForumTopic(chatId, Number(message.threadId), { name: newName });
                        return message.reply({ text: `✅ Nome do tópico do Telegram atualizado para:\n${newName}` });
                    }
                    await global.telegramBot.telegram.setChatTitle(chatId, newName);
                    return message.reply({ text: `✅ Nome do chat do Telegram atualizado para:\n${newName}` });
                }
            }

            if (platform === "discord") {
                const discordMsg = message.raw;
                const guild = discordMsg?.guild;
                const channel = discordMsg?.channel;
                const member = channel?.guild?.members?.cache?.get(message.userId) || (await channel?.guild?.members?.fetch(message.userId).catch(() => null));

                if (!guild) {
                    return message.reply({ text: "❌ Este comando deve ser usado em um servidor do Discord." });
                }

                if (!_getDiscordRenamePermission(channel, member, level)) {
                    return message.reply({ text: "❌ Você não tem permissão para renomear esse nível no Discord." });
                }

                if (level === "server") {
                    await guild.setName(newName);
                    return message.reply({ text: `✅ Nome do servidor atualizado para:\n${newName}` });
                }

                if (level === "categoria") {
                    const parentId = channel?.parentId;
                    if (!parentId) {
                        return message.reply({ text: "❌ Não foi possível identificar a categoria deste canal." });
                    }
                    const category = guild.channels.cache.get(parentId);
                    if (!category) {
                        return message.reply({ text: "❌ Categoria não encontrada." });
                    }
                    await category.setName(newName);
                    return message.reply({ text: `✅ Nome da categoria atualizado para:\n${newName}` });
                }

                if (level === "chat") {
                    if (!channel) {
                        return message.reply({ text: "❌ Canal não encontrado." });
                    }
                    await channel.setName(newName);
                    return message.reply({ text: `✅ Nome do canal/thread atualizado para:\n${newName}` });
                }
            }

            return message.reply({ text: "❌ Plataforma não suportada para este comando." });
        } catch (err) {
            console.error("[setname] Erro ao renomear:", err);
            return message.reply({ text: "❌ Não foi possível alterar o nome. Verifique as permissões e tente novamente." });
        }
    }
};
