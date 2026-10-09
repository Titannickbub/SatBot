/*
=================================================================

COMANDO: !link (aliases: !convite, !invite, !linkgp)

Exibe o link de convite do grupo/servidor atual em qualquer plataforma:
- WhatsApp: Gera o link de convite oficial do grupo (chat.whatsapp.com/...)
- Discord: Obtém a URL personalizada ou gera um convite do servidor/canal (discord.gg/...)
- Telegram: Obtém o @username público ou gera o link de convite do grupo/tópico (t.me/...)

=================================================================
*/

module.exports = {
    name: "link",
    aliases: ["convite", "invite", "linkgp"],
    category: "adm/ações imediatas",
    description: `🔗 Exibe o link de convite do grupo ou servidor.

✨ Se ainda não houver um link disponível, o comando cria um novo.
🤖 O bot precisa ter permissão para criar links de convite.
👤 Você também precisa ter permissão para criar links de convite.

📌 Uso:
{prefix}link

💡 Exemplos:
{prefix}link
{prefix}linkgp
{prefix}convite`,
    usage: "{prefix}link",
    examples: [
        "{prefix}link",
        "{prefix}convite",
        "{prefix}linkgp"
    ],
    platformSupport: {
        whatsapp: "full",
        telegram: "full",
        discord: "full"
    },

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos, canais ou servidores." });
        }

        const platform = message.platform;
        const chatId = message.chatId;
        const adapter = (message.platforms || []).find(p => p.name === platform);

        if (!adapter?.checkUserPermission || !adapter?.checkBotPermission) {
            return message.reply({ text: "❌ Não foi possível verificar as permissões para criar links de convite nesta plataforma." });
        }

        const userCanCreateInvite = await adapter.checkUserPermission(chatId, message.userId, "invite");
        if (!userCanCreateInvite) {
            return message.reply({ text: "❌ Você não tem permissão para gerenciar ou criar links de convite neste grupo/servidor." });
        }

        const botCanCreateInvite = await adapter.checkBotPermission(chatId, "invite");
        if (!botCanCreateInvite) {
            return message.reply({ text: "❌ O bot não tem permissão para gerenciar ou criar links de convite neste grupo/servidor." });
        }

        // 1. WhatsApp
        if (platform === "whatsapp") {
            if (!chatId || !chatId.endsWith("@g.us")) {
                return message.reply({ text: "❌ Este comando só funciona em grupos do WhatsApp." });
            }

            const sock = global.whatsappSock;
            if (!sock || typeof sock.groupInviteCode !== "function") {
                return message.reply({ text: "❌ O adapter do WhatsApp não está conectado no momento." });
            }

            try {
                const code = await sock.groupInviteCode(chatId);
                if (!code) {
                    return message.reply({ text: "❌ Não foi possível obter o código de convite deste grupo." });
                }

                const inviteLink = `https://chat.whatsapp.com/${code}`;
                return message.reply({
                    text: `🔗 *Link de convite do grupo:*\n${inviteLink}`
                });
            } catch (err) {
                console.error("[link] Erro ao obter convite no WhatsApp:", err);
                return message.reply({
                    text: "❌ Não foi possível gerar o link de convite. Verifique se as permissões do grupo permitem criar convites."
                });
            }
        }

        // 2. Discord
        if (platform === "discord") {
            const rawMsg = message.raw;
            const guild = rawMsg?.guild;
            const channel = rawMsg?.channel;

            if (!guild) {
                return message.reply({ text: "❌ Este comando deve ser usado dentro de um servidor do Discord." });
            }

            try {
                // Se o servidor tiver URL de vaidade/personalizada
                if (guild.vanityURLCode) {
                    return message.reply({
                        text: `🔗 **Link de convite do servidor:**\nhttps://discord.gg/${guild.vanityURLCode}`
                    });
                }

                if (!channel || typeof channel.createInvite !== "function") {
                    return message.reply({ text: "❌ Canal inválido para geração de convite." });
                }

                // Cria um convite permanente no canal atual
                const invite = await channel.createInvite({
                    maxAge: 0,
                    maxUses: 0,
                    unique: false,
                    reason: `Convite solicitado pelo usuário ${message.userId} via comando !link`
                });

                if (!invite || !invite.url) {
                    return message.reply({ text: "❌ Não foi possível gerar o link de convite do Discord." });
                }

                return message.reply({
                    text: `🔗 **Link de convite do servidor:**\n${invite.url}`
                });
            } catch (err) {
                console.error("[link] Erro ao obter convite no Discord:", err);
                return message.reply({
                    text: "❌ Não foi possível gerar o convite. Verifique se o bot possui a permissão 'Criar convite instantâneo' (Create Instant Invite)."
                });
            }
        }

        // 3. Telegram
        if (platform === "telegram") {
            const bot = global.telegramBot;
            if (!bot || !bot.telegram) {
                return message.reply({ text: "❌ O adapter do Telegram não está disponível no momento." });
            }

            try {
                let inviteLink = null;

                // Tenta pegar informações diretas do chat (username público ou invite_link existente)
                try {
                    const chatInfo = await bot.telegram.getChat(chatId);
                    if (chatInfo?.username) {
                        inviteLink = `https://t.me/${chatInfo.username}`;
                    } else if (chatInfo?.invite_link) {
                        inviteLink = chatInfo.invite_link;
                    }
                } catch (e) {
                    // segue para tentativa de export / create
                }

                // Se não tem link público/salvo, tenta exportar ou criar novo link de convite
                if (!inviteLink) {
                    try {
                        inviteLink = await bot.telegram.exportChatInviteLink(chatId);
                    } catch (e) {
                        const created = await bot.telegram.createChatInviteLink(chatId, {
                            creates_join_request: false
                        }).catch(() => null);
                        inviteLink = created?.invite_link || null;
                    }
                }

                if (!inviteLink) {
                    return message.reply({
                        text: "❌ Não foi possível obter o link do grupo. Certifique-se de que o bot é administrador e tem permissão para convidar usuários via link."
                    });
                }

                return message.reply({
                    text: `🔗 <b>Link de convite do grupo:</b>\n${inviteLink}`
                });
            } catch (err) {
                console.error("[link] Erro ao obter convite no Telegram:", err);
                return message.reply({
                    text: "❌ Falha ao obter link de convite do Telegram. Verifique as permissões de administrador do bot."
                });
            }
        }

        return message.reply({ text: "❌ Plataforma não suportada para este comando." });
    }
};
