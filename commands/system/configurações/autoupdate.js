const { isOwner } = require("../../../functions/owners");
const { readLocalPackage } = require("../../../functions/autoUpdate");
const config = require("../../../functions/config");

module.exports = {
    name: "autoupdate",
    category: "system/configurações",
    description: "Consulta ou controla as atualizações automáticas do bot a partir das versões do GitHub. Use `status` para conferir a configuração, `on` para ativar ou `off` para desativar; atualizações e reinicialização ocorrem conforme o ciclo do bot.",
    usage: "{prefix}autoupdate [subcomando]",

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
