const owners = require("../../../functions/owners");
const config = require("../../../functions/config");

module.exports = {
    name: "set_dominio",
    aliases: ["setdominio", "set-domain"],
    category: "system/configurações",
    description: "Configura o protocolo e o endereço do painel web. Use HTTP (padrão) para um servidor sem TLS ou HTTPS quando houver TLS/reverse proxy configurado; informe o domínio e a porta no formato `domínio:porta`. A configuração é aplicada na próxima inicialização.",
    usage: "{prefix}set_dominio [http|https] <domínio:porta>",
    examples: [
        "{prefix}set_dominio painel.exemplo.com:32013",
        "{prefix}set_dominio http painel.exemplo.com:32013",
        "{prefix}set_dominio https painel.exemplo.com:443"
    ],

    async execute(message) {
        if (!owners.isOwner(message)) {
            return message.reply({ text: "❌ Apenas super usuários podem configurar o domínio do painel." });
        }

        const args = (message.args || []).map(value => String(value).trim()).filter(Boolean);
        let protocol = "http";
        let value = "";
        if (args.length === 1) {
            value = args[0];
        } else if (args.length === 2) {
            const first = args[0].toLowerCase();
            const second = args[1].toLowerCase();
            if (first === "http" || first === "https") {
                protocol = first;
                value = args[1];
            } else if (second === "http" || second === "https") {
                protocol = second;
                value = args[0];
            }
        }

        const urlProtocol = value.match(/^(https?):\/\//i);
        if (urlProtocol) {
            protocol = urlProtocol[1].toLowerCase();
            value = value.slice(urlProtocol[0].length);
        }
        const match = value.match(/^((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}|localhost|(?:\d{1,3}\.){3}\d{1,3}):(\d{1,5})$/i);
        if (!match) {
            return message.reply({
                text: `❌ Domínio inválido. Use ${message.prefix || "!"}set_dominio [http|https] <domínio:porta>, por exemplo: ${message.prefix || "!"}set_dominio http painel.exemplo.com:32013`
            });
        }

        const port = Number(match[2]);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            return message.reply({ text: "❌ A porta deve ser um número entre 1 e 65535." });
        }

        const domain = `${match[1]}:${port}`;
        config.setWebProtocol(protocol);
        config.setWebDomain(domain);
        return message.reply({
            text: `✅ Painel web configurado como ${protocol}://${domain}.\nO painel será iniciado na porta ${port} no próximo início do bot.${protocol === "https" ? "\n⚠️ HTTPS exige TLS configurado por um proxy reverso; o servidor do painel atende HTTP internamente." : ""}`
        });
    }
};
