const owners = require("../../../functions/owners");
const config = require("../../../functions/config");

module.exports = {
    name: "set_dominio",
    aliases: ["setdominio", "set-domain"],
    category: "system/configurações",
    description: "Define o domínio e a porta do painel web.",
    usage: "{prefix}set_dominio <domínio:porta>",

    async execute(message) {
        if (!owners.isOwner(message)) {
            return message.reply({ text: "❌ Apenas super usuários podem configurar o domínio do painel." });
        }

        const value = String(message.args?.[0] || "").trim();
        const match = value.match(/^((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}|localhost|(?:\d{1,3}\.){3}\d{1,3}):(\d{1,5})$/i);
        if (!match) {
            return message.reply({
                text: "❌ Domínio inválido. Informe domínio e porta juntos, por exemplo: !set_dominio painel.exemplo.com:32013"
            });
        }

        const port = Number(match[2]);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            return message.reply({ text: "❌ A porta deve ser um número entre 1 e 65535." });
        }

        const domain = `${match[1]}:${port}`;
        config.setWebDomain(domain);
        return message.reply({
            text: `✅ Domínio do painel web configurado como ${domain}.\nO painel será iniciado na porta ${port} no próximo início do bot.`
        });
    }
};
