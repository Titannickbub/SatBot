const { resolvePlatformProfile } = require("../functions/profiles");

module.exports = {
    name: "start",
    aliases: ["iniciar", "inicio"],
    category: "system",
    description: "Exibe a mensagem de apresentação do bot e primeiros passos.",
    usage: "{prefix}start",

    async execute(message) {
        const prefix = message.prefix || "!";
        const platform = message.platform;
        const platformLabel = {
            discord: "Discord",
            telegram: "Telegram",
            whatsapp: "WhatsApp"
        }[platform] || platform;

        // Busca informações da Conta Central do usuário
        const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts;
        const central = store?.findByPlatform(platform, message.userId);

        const userName = message.displayName || message.username || "Membro";
        const centralName = central?.name || userName;

        let avatarUrl = null;
        try {
            const profile = await resolvePlatformProfile(platform, message.userId, { raw: message.raw, username: message.username });
            avatarUrl = profile?.avatarUrl || null;
        } catch {
            // Ignora erro de perfil
        }

        const lines = [
            `✨ *Olá, ${userName}! Seja bem-vindo(a) à Satela!* ✨`,
            `━━━━━━━━━━━━━━━━━━━━━━`,
            `🤖 Sou seu assistente inteligente multi-plataforma.`,
            ``,
            `👑 *Conta Central:* ${centralName}`,
            `📱 *Plataforma Atual:* ${platformLabel}`,
            `🆔 *Seu ID:* \`${message.userId}\``,
            ``,
            `📌 *Por onde começar:*`,
            `• *${prefix}menu* — Lista todos os comandos e categorias disponíveis.`,
            `• *${prefix}perfil* — Exibe os detalhes da sua conta e vínculos.`,
            `• *${prefix}nomecentral <nome>* — Altera o nome da sua Conta Central.`,
            `• *${prefix}gerar_unir* — Gera código para vincular esta conta a outra plataforma.`,
            `• *${prefix}unir <code>* — Conecta suas contas de outras plataformas.`,
            ``,
            `💡 *Dica:* Use *${prefix}info <comando>* para detalhes de qualquer funcionalidade.`,
            `━━━━━━━━━━━━━━━━━━━━━━`
        ];

        const text = lines.join("\n");

        if (avatarUrl) {
            try {
                return await message.replyImg({
                    url: avatarUrl,
                    caption: text
                });
            } catch {
                // Fallback para envio de mensagem em formato texto
            }
        }

        return await message.reply({ text });
    }
};
