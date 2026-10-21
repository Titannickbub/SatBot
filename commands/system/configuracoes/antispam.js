const { isOwner } = require("../../../functions/owners");
const configFn = require("../../../functions/config");

const DESCRIPTION = `🛡️ Limita a frequência de comandos por usuário para evitar flood.

🔐 Disponível apenas para superusuários / donos do bot.

📋 Consulte a configuração:
{prefix}antispam status

✅ Ative ou desative:
{prefix}antispam on
{prefix}antispam off

⏱️ Defina o intervalo entre comandos:
{prefix}antispam tempo 10s
{prefix}antispam tempo 2m

💬 Escolha se o bloqueio envia um aviso:
{prefix}antispam aviso on
{prefix}antispam aviso off

O primeiro comando de cada usuário passa; outros comandos enviados antes do fim do intervalo são bloqueados. O limite é separado por usuário e chat, vale para todos os comandos e não se aplica a superusuários. Quando o aviso está ligado, ele é enviado apenas uma vez durante cada intervalo bloqueado.`;

module.exports = {
    name: "antispam",
    aliases: ["anti-spam", "antiflood"],
    category: "system/configurações",
    description: DESCRIPTION,
    usage: "{prefix}antispam help",
    examples: [
        "{prefix}antispam status",
        "{prefix}antispam on",
        "{prefix}antispam tempo 10s",
        "{prefix}antispam aviso off"
    ],

    async execute(message) {
        if (!(message.sender?.isOwner || isOwner(message))) {
            return message.reply({ text: "❌ Apenas Super Usuários podem configurar o Anti-Spam." });
        }

        const args = message.args || [];
        const action = String(args[0] || "help").toLowerCase();
        const config = configFn.getAntiSpamConfig();

        if (action === "help" || action === "ajuda" || action === "?") {
            return message.reply({ text: _help(message) });
        }

        if (action === "status") {
            return message.reply({
                text: [
                    "🛡️ Status do Anti-Spam",
                    `• Estado: ${config.enabled ? "✅ Ativado" : "❌ Desativado"}`,
                    `• Intervalo: ${configFn.formatTimeString(config.seconds)}`,
                    `• Aviso: ${config.notify ? "Ativado" : "Desativado"}`,
                    "• Escopo: por usuário e chat; todos os comandos"
                ].join("\n")
            });
        }

        if (["on", "ativar", "ligar"].includes(action)) {
            configFn.setAntiSpamConfig({ enabled: true });
            return message.reply({ text: "✅ Anti-Spam ativado." });
        }

        if (["off", "desativar", "desligar"].includes(action)) {
            configFn.setAntiSpamConfig({ enabled: false });
            return message.reply({ text: "✅ Anti-Spam desativado." });
        }

        if (["tempo", "intervalo"].includes(action)) {
            if (args.length !== 2) {
                return message.reply({
                    text: `❌ Informe um intervalo válido. Exemplo: ${message.prefix}antispam tempo 10s`
                });
            }

            const seconds = configFn.parseTimeString(args[1]);
            if (!Number.isSafeInteger(seconds) || seconds < 1) {
                return message.reply({
                    text: "❌ Tempo inválido. Use um valor positivo como 10s, 2m ou 1h."
                });
            }

            configFn.setAntiSpamConfig({ seconds });
            return message.reply({
                text: `✅ Intervalo do Anti-Spam definido para ${configFn.formatTimeString(seconds)}.`
            });
        }

        if (["aviso", "avisar"].includes(action)) {
            const mode = String(args[1] || "").toLowerCase();
            if (args.length !== 2 || !["on", "off", "ativar", "desativar"].includes(mode)) {
                return message.reply({
                    text: `❌ Use ${message.prefix}antispam aviso on ou ${message.prefix}antispam aviso off.`
                });
            }

            const notify = ["on", "ativar"].includes(mode);
            configFn.setAntiSpamConfig({ notify });
            return message.reply({
                text: `✅ Aviso do Anti-Spam ${notify ? "ativado" : "desativado"}.`
            });
        }

        return message.reply({
            text: `❌ Opção inválida. Use ${message.prefix}antispam status para ver as configurações.`
        });
    }
};

function _help(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}
