const economy = require("../../functions/economy");
const { renderRanking } = require("../../functions/imageBanner");

module.exports = {
    name: "rank",
    category: "adm/RP",
    description: "Consulta o ranking de satcoins da economia atual: sem opção ou com `rico`, envia uma imagem dos cinco maiores saldos; com `pobre`, lista os cinco menores.",
    usage: "{prefix}rank [rico|pobre|help]",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ O ranking só funciona em grupos ou servidores." });
        }

        const subcommand = String(message.args?.[0] || "").toLocaleLowerCase();
        if (subcommand === "help" || subcommand === "ajuda") {
            return message.reply({
                text: [
                    `📊 RANK DE ECONOMIA`,
                    "",
                    `${message.prefix}rank ou ${message.prefix}rank rico - imagem dos 5 mais ricos`,
                    `${message.prefix}rank pobre - imagem dos 5 mais pobres`,
                    `${message.prefix}rank help - exibe esta ajuda`
                ].join("\n")
            });
        }

        if (subcommand && subcommand !== "rico" && subcommand !== "pobre") {
            return message.reply({
                text: `❌ Subcomando inválido. Use ${message.prefix}rank help para ver os comandos disponíveis.`
            });
        }

        const order = subcommand === "pobre" ? "poor" : "rich";
        const result = await renderRanking(message, "rich", order);
        if (result.error) return message.reply({ text: `❌ ${result.error}` });
        return message.replyImg({ image: result.buffer, caption: result.caption, fileName: "rankcoins.png" });
    }
};
