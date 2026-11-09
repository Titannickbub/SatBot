const { isOwner } = require("../../../functions/owners");
const { readLocalPackage } = require("../../../functions/autoUpdate");
const config = require("../../../functions/config");

const DESCRIPTION = `🔄 Consulta a configuração de atualização do bot.

🔐 Disponível apenas para superusuários / donos do bot.

📋 1. Consulte o status atual:
{prefix}autoupdate status

Na branch beta, as atualizações são sempre manuais: use update_beta.bat ou update_beta.sh.

❌ 2. Desative o Auto Update:
{prefix}autoupdate off

O canal beta não aplica atualizações automaticamente, mesmo se essa opção estiver ativada em configurações antigas.`;

module.exports = {
    name: "autoupdate",
    category: "system/configurações",
    description: DESCRIPTION,
    usage: "{prefix}autoupdate [texto]",
    examples: [
        "{prefix}autoupdate status",
        "{prefix}autoupdate off"
    ],

    async execute(message) {
        if (!isOwner(message)) {
            return message.reply({ text: "❌ Apenas superusuários podem configurar o Auto Update." });
        }

        const pkg = readLocalPackage();
        const action = String(message.args?.[0] || "status").toLowerCase();
        if (action === "status") {
            return message.reply({
                text: `🔄 *Canal beta:* atualizações automáticas desativadas\n📦 Versão local: *${pkg.version}*\n\nPara atualizar manualmente, execute update_beta.bat (Windows) ou bash update_beta.sh (Linux).`
            });
        }
        if (action !== "on" && action !== "off") {
            return message.reply({ text: `❌ No canal beta, use *${message.prefix || "!"}autoupdate status|off*.` });
        }

        if (action === "on") {
            return message.reply({ text: "ℹ️ O canal beta é atualizado manualmente. Execute update_beta.bat (Windows) ou bash update_beta.sh (Linux)." });
        }

        const enabled = config.setAutoUpdateEnabled(action === "on");
        return message.reply({
            text: `✅ Auto Update ${enabled ? "ativado" : "desativado"} nas configurações. O canal beta permanece manual.`
        });
    }
};
