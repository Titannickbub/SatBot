const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "autoia",
    aliases: ["setautoia", "iaauto", "iaautomatica"],
    category: "adm/configurações",
    description: "Configura a resposta automática da Inteligência Artificial em grupos.",
    usage: "{prefix}autoia <off | all | mention>",
    examples: [
        "{prefix}autoia status",
        "{prefix}autoia off",
        "{prefix}autoia mention",
        "{prefix}autoia all"
    ],

    async execute(message) {
        if (message.isPrivate) {
            return await message.reply({
                text: `❌ O Auto-IA é configurável apenas em grupos.\n\nNo PV (chat privado), você pode usar o comando \`${message.prefix}ia <sua pergunta>\` diretamente.`
            });
        }

        const isAuthorized =
            message.sender?.isAdmin ||
            message.sender?.isOwner ||
            message.sender?.canManageMessages ||
            (message.functions?.owners && message.functions.owners.isOwner(message)) ||
            isOwner(message);

        const autoiaHelper = message.functions.autoiaHelper || require("../../../functions/autoiaHelper");
        const configFn = message.functions.config || require("../../../functions/config");
        const botName = configFn.getBotName ? configFn.getBotName() : "Sat Bot";
        const currentMode = autoiaHelper.getAutoIAMode(message);

        const args = message.args;
        if (!args.length || args[0].toLowerCase() === "status") {
            const modeLabels = {
                off: "❌ Desativado (OFF)",
                all: "💬 Ativo para TODAS as mensagens (ALL)",
                mention: `🏷️ Ativo por MENÇÃO, MARCAÇÃO ou RESPOSTA (${botName})`
            };

            let text = `🤖 *Status do Auto-IA no Grupo*\n\n`;
            text += `• Modo Atual: *${modeLabels[currentMode] || currentMode}*\n\n`;
            text += `⚙️ *Opções de Configuração:*\n`;
            text += `• \`${message.prefix}autoia off\` — Desativa a IA automática.\n`;
            text += `• \`${message.prefix}autoia mention\` — Responde apenas quando marcarem, responderem ou citarem "*${botName}*".\n`;
            text += `• \`${message.prefix}autoia all\` — Responde a TODAS as mensagens no grupo.\n\n`;
            text += `⚠️ *Nota:* Apenas Administradores do grupo ou Super Usuários podem alterar esta opção.`;

            return await message.reply({ text });
        }

        if (!isAuthorized) {
            return await message.reply({
                text: "❌ Apenas Administradores do grupo ou Super Usuários podem alterar a configuração do Auto-IA."
            });
        }

        const inputMode = args[0].toLowerCase();
        try {
            const newMode = autoiaHelper.setAutoIAMode(message, inputMode);

            if (newMode === "off") {
                return await message.reply({
                    text: "✅ *Auto-IA Desativado!* O bot deixará de responder mensagens automaticamente neste grupo."
                });
            }

            if (newMode === "all") {
                return await message.reply({
                    text: "✅ *Auto-IA Ativado (Todas as mensagens)!*\n\nO bot agora responderá a todas as mensagens enviadas no grupo que não sejam comandos."
                });
            }

            if (newMode === "mention") {
                return await message.reply({
                    text: `✅ *Auto-IA Ativado (Por Menção)!*\n\nO bot responderá automaticamente quando:\n1️⃣ Marcarem o bot (@bot).\n2️⃣ Responderem a uma mensagem do bot.\n3️⃣ Citarem o nome "*${botName}*" no texto.`
                });
            }
        } catch (err) {
            return await message.reply({
                text: `❌ Opção inválida.\n\nUso: \`${message.prefix}autoia <off | mention | all>\``
            });
        }
    }
};
