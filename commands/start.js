const { resolvePlatformProfile } = require("../functions/profiles");
const { getBotName } = require("../functions/config");

module.exports = {
    name: "start",
    aliases: ["iniciar", "inicio"],
    category: null,
    description: "Exibe a mensagem de apresentação do bot e primeiros passos.",
    usage: "{prefix}start",

    async execute(message) {
        const prefix = message.prefix || "!";
        const platform = message.platform;
        const botName = getBotName();
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

        if (platform === "discord") {
            return await message.reply({
                embed: {
                    color: 0x5865F2,
                    title: `✨ Olá, ${userName}! Bem-vindo(a) ao ${botName}`,
                    description: `🤖 ${botName} é seu assistente inteligente multi-plataforma.`,
                    fields: [
                        { name: "👑 Conta Central", value: centralName, inline: true },
                        { name: "📱 Plataforma", value: platformLabel, inline: true },
                        { name: "🆔 Seu ID", value: `\`${message.userId}\`` },
                        {
                            name: "📌 Por onde começar",
                            value: [
                                `\`${prefix}menu\` — Lista comandos e categorias.`,
                                `\`${prefix}perfil\` — Exibe seu perfil em imagem.`,
                                `\`${prefix}perfil_text\` — Exibe os dados do perfil em texto.`,
                                `\`${prefix}nomecentral <nome>\` — Altera seu nome central.`,
                                `\`${prefix}gerar_unir\` — Gera código de vínculo.`,
                                `\`${prefix}unir <code>\` — Conecta outra plataforma.`
                            ].join("\n")
                        }
                    ],
                    footer: { text: `Use ${prefix}info <comando> para obter detalhes.` },
                    thumbnail: avatarUrl ? { url: avatarUrl } : undefined
                }
            });
        }

        if (platform === "telegram") {
            const escapeHtml = value => String(value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            const text = [
                `<b>✨ Olá, ${escapeHtml(userName)}! Seja bem-vindo(a) ao ${escapeHtml(botName)}!</b>`,
                "",
                "🤖 Sou seu assistente inteligente multi-plataforma.",
                "",
                `👑 <b>Conta Central:</b> ${escapeHtml(centralName)}`,
                `📱 <b>Plataforma Atual:</b> ${escapeHtml(platformLabel)}`,
                `🆔 <b>Seu ID:</b> <code>${escapeHtml(message.userId)}</code>`,
                "",
                "📌 <b>Por onde começar:</b>",
                `• <code>${escapeHtml(prefix)}menu</code> — Lista comandos e categorias disponíveis.`,
                `• <code>${escapeHtml(prefix)}perfil</code> — Exibe seu perfil em imagem.`,
                `• <code>${escapeHtml(prefix)}perfil_text</code> — Exibe os dados do perfil em texto.`,
                `• <code>${escapeHtml(prefix)}nomecentral &lt;nome&gt;</code> — Altera o nome da sua Conta Central.`,
                `• <code>${escapeHtml(prefix)}gerar_unir</code> — Gera código para vincular esta conta.`,
                `• <code>${escapeHtml(prefix)}unir &lt;code&gt;</code> — Conecta contas de outras plataformas.`,
                "",
                `💡 <b>Dica:</b> Use <code>${escapeHtml(prefix)}info &lt;comando&gt;</code> para detalhes.`
            ].join("\n");
            return await message.reply({ text, parse_mode: "HTML" });
        }

        const escapeWhatsApp = value => String(value).replace(/([*_~`\\])/g, "\\$1");
        const safeUserName = escapeWhatsApp(userName);
        const safeCentralName = escapeWhatsApp(centralName);
        const safePlatformLabel = escapeWhatsApp(platformLabel);
        const safeUserId = escapeWhatsApp(message.userId);
        const text = [
            `✨ *Olá, ${safeUserName}! Seja bem-vindo(a) ao ${escapeWhatsApp(botName)}!* ✨`,
            "",
            "🤖 _Sou seu assistente inteligente multi-plataforma._",
            "",
            `👑 *Conta Central:* ${safeCentralName}`,
            `📱 *Plataforma Atual:* ${safePlatformLabel}`,
            `🆔 *Seu ID:* \`${safeUserId}\``,
            "",
            "📌 *Por onde começar:*",
            `• *${prefix}menu* — Lista comandos e categorias disponíveis.`,
            `• *${prefix}perfil* — Exibe seu perfil em imagem.`,
            `• *${prefix}perfil_text* — Exibe os dados do perfil em texto.`,
            `• *${prefix}nomecentral <nome>* — Altera o nome da sua Conta Central.`,
            `• *${prefix}gerar_unir* — Gera código para vincular esta conta.`,
            `• *${prefix}unir <code>* — Conecta contas de outras plataformas.`,
            "",
            `💡 _Dica:_ Use *${prefix}info <comando>* para detalhes.`
        ].join("\n");
        return await message.reply({ text });
    }
};
