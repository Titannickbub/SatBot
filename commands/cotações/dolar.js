const {
    getDollarQuote,
    formatCurrency,
    formatChange
} = require("../../functions/mercado");

module.exports = {
    name: "dolar",
    aliases: ["dólar", "usd"],
    category: "cotações",
    description: "Exibe a cotação atual do dólar comercial em reais.",
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
