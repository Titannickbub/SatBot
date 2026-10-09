const {
    getMarketIndexes,
    formatNumber,
    formatChange
} = require("../../functions/mercado");

module.exports = {
    name: "bolsa",
    aliases: ["indices", "índices"],
    category: "cotações",
    description: `📈 Consulta os principais índices do mercado financeiro global (Ibovespa, S&P 500, Nasdaq, etc.) com valores e variações em tempo real.

📝 1. Execute o comando para consultar as cotações:
{prefix}bolsa

O bot busca as informações mais recentes diretamente do mercado financeiro, trazendo pontuação, oscilação percentual e horário da última atualização.`,
    usage: "{prefix}bolsa",
    examples: ["{prefix}bolsa"],

    async execute(message) {
        try {
            await message.reply({ text: "⏳ Buscando os índices da bolsa de valores..." });
            const indexes = await getMarketIndexes();
            const lines = [
                "📈 *ÍNDICES DA BOLSA*",
                ""
            ];

            for (const index of indexes) {
                const unit = index.unit || "pontos";
                lines.push(`*${index.label}*: ${formatNumber(index.value)} ${unit}`);
                lines.push(`Variação: *${formatChange(index.change)}*`);
                if (index.market) lines.push(`Bolsa: ${index.market}`);
                if (index.updatedAt) lines.push(`Atualizado em: ${index.updatedAt}`);
                lines.push("");
            }

            lines.push("🌐 Fonte: Yahoo Finance");
            await message.reply({ text: lines.join("\n") });
            await message.react("✅");
        } catch (error) {
            console.error("[COMANDO BOLSA]", error.message || error);
            await message.reply({
                text: "⚠️ O serviço de índices da bolsa está indisponível ou instável no momento. Tente novamente em alguns minutos."
            });
        }
    }
};
