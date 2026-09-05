const { getAutoIAMode, shouldTriggerAutoIA } = require("../functions/autoiaHelper");
const configFn = require("../functions/config");
const aiHelper = require("../functions/aiHelper");

function getSafeBotName() {
    if (typeof configFn?.getBotName === "function") {
        return configFn.getBotName();
    }
    return "Sat Bot";
}

module.exports = {
    name: "autoia",
    priority: 40, // executa após antilink/antimedia/antipv/autodownload
    runOn: "all",

    async execute(message) {
        // Ignora no PV (no PV o comando !ia já é usado diretamente)
        if (message.isPrivate) return true;

        // Ignora mensagens enviadas pelo próprio bot
        if (message.fromMe || message.sender?.isBot) return true;

        const text = typeof message.text === "string" ? message.text.trim() : "";
        if (!text) return true;

        // Ignora se for um comando do bot (ex: !ping, !ia, !help)
        const prefix = message.prefix || "!";
        if (text.startsWith(prefix)) return true;

        // Obtém o modo de Auto-IA para este grupo
        const mode = getAutoIAMode(message);
        if (mode === "off") return true;

        const botName = getSafeBotName();
        const shouldTrigger = shouldTriggerAutoIA(message, mode, botName);

        if (!shouldTrigger) return true;

        console.log(`🤖[AUTO-IA] Ativado | chat: ${message.chatId} | modo: ${mode} | user: ${message.userId} | text: "${text.substring(0, 40)}..."`);

        // Reação opcional no chat indicando que o bot está pensando
        if (typeof message.react === "function") {
            await message.react("🔎", true).catch(() => {});
        }

        try {
            const promptWithContext = message.quoted?.text
                ? `[Mensagem respondida: "${message.quoted.text}"]\n\n${text}`
                : text;

            const responseText = await aiHelper.chatAI(promptWithContext, {
                system: `Você é ${botName}, um(a) assistente virtual inteligente interagindo em um grupo de bate-papo. Responda de forma clara, natural, útil e amigável em português.`
            });

            if (typeof message.react === "function") {
                await message.react("🔎", false).catch(() => {});
            }

            if (responseText) {
                await message.reply({ text: responseText });
            }

            return false; // Interrompe a propagação do middleware para esta mensagem
        } catch (err) {
            console.error("❌[AUTO-IA] Erro ao gerar resposta automática:", err.message || err);

            if (typeof message.react === "function") {
                await message.react("🧠", false).catch(() => {});
            }

            return true;
        }
    }
};
