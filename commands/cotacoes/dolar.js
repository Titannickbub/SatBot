const {
    getDollarQuote,
    formatCurrency,
    formatChange
} = require("../../functions/mercado");

module.exports = {
    name: "dolar",
    aliases: ["dólar", "usd"],
    category: "cotações",
    description: `💵 Consulta a cotação atual do dólar comercial em reais (BRL), com valores de compra, venda e variação diária.

📝 1. Execute o comando para consultar a taxa de câmbio:
{prefix}dolar

O bot consulta o mercado de câmbio em tempo real, exibindo os preços de compra e venda da moeda americana e a oscilação percentual do dia.`,
    usage: "{prefix}dolar",
    examples: ["{prefix}dolar"],

    async execute(message) {
        try {
            await message.reply({ text: "⏳ Buscando a cotação do dólar..." });
            const quote = await getDollarQuote();
            const text = [
                "💵 *DÓLAR COMERCIAL*",
                "",
                `💰 Compra: *${formatCurrency(quote.bid)}*`,
                `💰 Venda: *${formatCurrency(quote.ask)}*`,
                `📊 Variação: *${formatChange(quote.change)}*`,
                `🕒 Atualizado em: ${quote.updatedAt || "—"}`,
                "",
                "🌐 Fonte: AwesomeAPI"
            ].join("\n");

            await message.reply({ text });
            await message.react("✅");
        } catch (error) {
            console.error("[COMANDO DOLAR]", error.message || error);
            await message.reply({
                text: "⚠️ O serviço de cotação do dólar está indisponível ou instável no momento. Tente novamente em alguns minutos."
            });
        }
    }
};
