const { getCotacaoCCCMG } = require("../../functions/CCCMG");
const { loadMonitorState, buildSnapshot, getWeeklyBestMap, getMetricChangeText, findPreviousSnapshotForSource, formatPrice, slugify } = require("../../functions/cafeMonitor");

module.exports = {
    name: "cccmg",
    category: "cotações",
    description: `☕ Exibe a cotação mais recente do café divulgada pelo CCCMG (Centro do Comércio de Café do Estado de Minas Gerais).

📝 1. Execute o comando para consultar os preços:
{prefix}cccmg

O bot busca os valores físicos da saca de 60 KG para diferentes padrões de café, exibindo a data, a variação em relação ao registro anterior e o melhor preço da semana.`,
    usage: "{prefix}cccmg",
    examples: ["{prefix}cccmg"],

    async execute(message) {
        try {
            await message.reply({ text: "⏳ Aguarde, buscando a última cotação do CCCMG..." });
            const data = await getCotacaoCCCMG();
            const state = loadMonitorState();
            const currentSnapshot = buildSnapshot({ CCCMG: data });
            const bestMap = getWeeklyBestMap(state, currentSnapshot);
            const baselineSnapshot = findPreviousSnapshotForSource(state, "CCCMG", data.data) || state?.lastSnapshot;

            let text = `☕ *CCCMG — Cotação do Café*\n`;
            text += `━━━━━━━━━━━━━━━━━━━━\n`;
            text += `📅 *Data:* ${data.data}\n`;
            text += `📦 *Saca 60 KG — Preços físicos:*\n\n`;

            for (const item of data.precos) {
                const metricKey = slugify(`CCCMG-${item.padrao}`);
                const changeText = getMetricChangeText("CCCMG", metricKey, item.preco, baselineSnapshot);
                const best = bestMap?.[`CCCMG::${metricKey}`];
                const bestText = best ? ` 🏆 Melhor da semana: ${formatPrice(best.value)}` : "";
                text += `  • *${item.padrao}*\n    ${item.preco}${changeText}${bestText}\n`;
            }

            text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
            text += `🌐 _Fonte: CCCMG — cccmg.com.br_`;

            await message.reply({ text });
            await message.react("✅");

        } catch (error) {
            console.error("[COMANDO CCCMG]", error.message);
            await message.reply({ text: "⚠️ O serviço de cotações do CCCMG está indisponível ou instável no momento. Tente novamente em alguns minutos." });
        }
    }
};
