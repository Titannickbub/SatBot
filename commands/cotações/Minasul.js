const { getCotacaoMinasul } = require("../../functions/Minasul");
const { loadMonitorState, buildSnapshot, getWeeklyBestMap, getMetricChangeText, findPreviousSnapshotForSource, formatPrice } = require("../../functions/cafeMonitor");

module.exports = {
    name: "minasul",
    category: "cotações",
    description: `☕ Exibe a cotação atual do café direto da cooperativa Minasul para os diferentes padrões de grãos.

📝 1. Execute o comando para verificar os preços:
{prefix}minasul

O bot consulta os valores praticados pela Minasul (Cereja Descascado, Bebida Mole, Bebida Dura), trazendo a variação e o melhor preço registrado na semana.`,
    usage: "{prefix}minasul",

    async execute(message) {
        try {
            await message.reply({ text: "⏳ Aguarde, estou verificando a cotação na Minasul..." });
            const data = await getCotacaoMinasul();
            const state = loadMonitorState();
            const currentSnapshot = buildSnapshot({ Minasul: data });
            const bestMap = getWeeklyBestMap(state, currentSnapshot);

            let text = `☕ *Cotações ${data.fonte}*\n`;
            text += `🕒 _Atualizado em: ${data.atualizadoEm}_\n\n`;

            const c = data.cotacoes;
            const baselineSnapshot = findPreviousSnapshotForSource(state, "Minasul", data.atualizadoEm) || state?.lastSnapshot;

            const metrics = [
                { key: "cerejaDescascado", label: c.cerejaDescascado?.nome, value: c.cerejaDescascado?.preco },
                { key: "bebidaMole", label: c.bebidaMole?.nome, value: c.bebidaMole?.preco },
                { key: "bebidaDuraTipo6", label: c.bebidaDuraTipo6?.nome, value: c.bebidaDuraTipo6?.preco },
                { key: "bebidaDuraTipo67", label: c.bebidaDuraTipo67?.nome, value: c.bebidaDuraTipo67?.preco }
            ];

            for (const item of metrics) {
                if (!item.label || item.value == null) continue;
                const changeText = getMetricChangeText("Minasul", item.key, item.value, baselineSnapshot);
                const best = bestMap?.[`Minasul::${item.key}`];
                const bestText = best ? ` 🏆 Melhor da semana: ${formatPrice(best.value)}` : "";
                text += `*${item.label}*\n➔ ${item.value}${changeText}${bestText}\n\n`;
            }

            text += `🌐 *Fonte:* ${data.fonte}`;
            await message.reply({ text });
            await message.react("✅");
        } catch (error) {
            console.error("[COMANDO MINASUL]", error.message);
            await message.reply({ text: "⚠️ O serviço de cotações da Minasul está indisponível ou instável no momento. Tente novamente em alguns minutos." });
        }
    }
};
