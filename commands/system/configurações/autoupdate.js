const { isOwner } = require("../../../functions/owners");
const { readLocalPackage } = require("../../../functions/autoUpdate");
const config = require("../../../functions/config");

const DESCRIPTION = `🔄 Gerencia as atualizações automáticas do bot a partir das versões publicadas no GitHub.

🔐 Disponível apenas para superusuários / donos do bot.

📋 1. Consulte o status atual:
{prefix}autoupdate status

Exibe se o Auto Update está ativado ou desativado e a versão local instalada. A atualização só ocorre se o GitHub tiver uma versão mais nova — downgrades são bloqueados automaticamente.

✅ 2. Ative o Auto Update:
{prefix}autoupdate on

A configuração ficará salva em settings/config.json e a atualização ocorrerá na próxima reinicialização, caso haja versão mais nova disponível.

❌ 3. Desative o Auto Update:
{prefix}autoupdate off

O aviso de versão continuará sendo exibido no console; apenas a atualização automática ficará desativada.`;

module.exports = {
    name: "autoupdate",
    category: "system/configurações",
    description: DESCRIPTION,
    usage: "{prefix}autoupdate [subcomando]",
    examples: [
        "{prefix}autoupdate status",
        "{prefix}autoupdate on",
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
                text: `🔄 *Auto Update:* ${config.getAutoUpdateEnabled() ? "✅ ATIVADO" : "❌ DESATIVADO"}\n📦 Versão local: *${pkg.version}*\n\nA atualização só ocorre se o GitHub tiver uma versão mais nova. Downgrades são bloqueados.`
            });
        }
        if (action !== "on" && action !== "off") {
            return message.reply({ text: `❌ Use *${message.prefix || "!"}autoupdate on|off|status*.` });
        }

        const enabled = config.setAutoUpdateEnabled(action === "on");
        return message.reply({
            text: `✅ Auto Update ${enabled ? "ativado" : "desativado"}. ${enabled ? "A configuração ficará salva em settings/config.json e a atualização ocorrerá na próxima reinicialização, se houver versão mais nova." : "O aviso de versão continuará sendo exibido; apenas a atualização automática ficará desativada."}`
        });
    }
};
