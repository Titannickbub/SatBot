const { getCotacaoCoocafe } = require("../../functions/Coocafe");
const { loadMonitorState, buildSnapshot, getWeeklyBestMap, getMetricChangeText, findPreviousSnapshotForSource, formatPrice } = require("../../functions/cafeMonitor");

module.exports = {
    name: "coocafe",
    category: "cotações",
    description: "Exibe a cotação atual do café direto da Coocafé, com variação e melhor da semana.",
    usage: "{prefix}coocafe",

    async execute(message) {
        try {
            await message.reply({ text: "⏳ Aguarde, estou verificando a cotação do café..." });
            const data = await getCotacaoCoocafe();
            const state = loadMonitorState();
            const currentSnapshot = buildSnapshot({ Coocafe: data });
            const bestMap = getWeeklyBestMap(state, currentSnapshot);

            let text = `☕ *Cotações ${data.fonte}*\n`;
            text += `🕒 _Atualizado em: ${data.atualizadoEm}_\n\n`;

            const c = data.cotacoes;
            const baselineSnapshot = findPreviousSnapshotForSource(state, "Coocafe", data.atualizadoEm) || state?.lastSnapshot;

            if (c.arabicaDura && c.arabicaDura.preco) {
                const changeText = getMetricChangeText("Coocafe", "arabicaDura", c.arabicaDura.preco, baselineSnapshot);
                const best = bestMap?.[`Coocafe::arabicaDura`];
                const bestText = best ? ` 🏆 Melhor da semana: ${formatPrice(best.value)}` : "";
                text += `*${c.arabicaDura.nome}*\n➔ ${c.arabicaDura.preco}${changeText}${bestText}\n\n`;
            }

            if (c.arabicaRio && c.arabicaRio.preco) {
                const changeText = getMetricChangeText("Coocafe", "arabicaRio", c.arabicaRio.preco, baselineSnapshot);
                const best = bestMap?.[`Coocafe::arabicaRio`];
                const bestText = best ? ` 🏆 Melhor da semana: ${formatPrice(best.value)}` : "";
                text += `*${c.arabicaRio.nome}*\n➔ ${c.arabicaRio.preco}${changeText}${bestText}\n\n`;
            }

            if (c.conilon && (c.conilon.espiritoSanto || c.conilon.minasGerais)) {
                text += `*${c.conilon.nome}*\n`;
                if (c.conilon.espiritoSanto) {
                    const changeText = getMetricChangeText("Coocafe", "conilonEspiritoSanto", c.conilon.espiritoSanto, baselineSnapshot);
                    const best = bestMap?.[`Coocafe::conilonEspiritoSanto`];
                    const bestText = best ? ` 🏆 Melhor da semana: ${formatPrice(best.value)}` : "";
                    text += `➔ ES: ${c.conilon.espiritoSanto}${changeText}${bestText}\n`;
                }
                if (c.conilon.minasGerais) {
                    const changeText = getMetricChangeText("Coocafe", "conilonMinasGerais", c.conilon.minasGerais, baselineSnapshot);
                    const best = bestMap?.[`Coocafe::conilonMinasGerais`];
                    const bestText = best ? ` 🏆 Melhor da semana: ${formatPrice(best.value)}` : "";
                    text += `➔ MG: ${c.conilon.minasGerais}${changeText}${bestText}\n`;
                }
                text += `\n`;
            }

            text += `🌐 *Fonte:* ${data.fonte}`;
            await message.reply({ text });
            await message.react("✅");
        } catch (error) {
            console.error("[COMANDO COOCAFE]", error.message);
            await message.reply({ text: "⚠️ O serviço de cotações da Coocafé está indisponível ou instável no momento. Tente novamente em alguns minutos." });
        }
    }
};
