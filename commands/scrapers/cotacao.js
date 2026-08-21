const { getCotacaoMinasul } = require("../../functions/Minasul");
const { getCotacaoCoocafe } = require("../../functions/Coocafe");
const { getCotacaoCCCMG }  = require("../../functions/CCCMG");
const { updateMonitorState, loadMonitorState, normalizePrice } = require("../../functions/cafeMonitor");

module.exports = {
    name: "cotacao",
    category: "cotações",
    description: "Exibe a cotação atual do café com variações e melhores preços da semana por qualidade.",
    usage: "{prefix}cotacao",
    examples: ["{prefix}cotacao"],

    async execute(message) {
        await message.reply({ text: "⏳ Buscando cotações da Minasul, Coocafé e CCCMG, aguarde..." });

        const [minasulResult, coocafeResult, cccmgResult] = await Promise.allSettled([
            getCotacaoMinasul(),
            getCotacaoCoocafe(),
            getCotacaoCCCMG()
        ]);

        const minasul = minasulResult.status === "fulfilled" ? minasulResult.value : null;
        const coocafe = coocafeResult.status === "fulfilled" ? coocafeResult.value : null;
        const cccmg   = cccmgResult.status  === "fulfilled" ? cccmgResult.value  : null;

        if (!minasul && !coocafe && !cccmg) {
            return message.reply({ text: "❌ Não foi possível buscar cotações de nenhuma fonte agora. Tente novamente mais tarde." });
        }

        // Carrega estado anterior para variação da última atualização
        const previousState = loadMonitorState();
        const previousSnapshot = previousState?.lastSnapshot;
        const historyEntries = previousState?.history || [];

        // Atualiza estado do monitor com payloads atuais
        const sourcePayloads = {
            Minasul: minasul,
            Coocafe: coocafe,
            CCCMG: cccmg
        };
        const { snapshot: currentSnapshot } = updateMonitorState(sourcePayloads);

        // ─────────────────────────────────────────────────────────────
        // Cabeçalho
        // ─────────────────────────────────────────────────────────────
        let text = `☕ *COTAÇÃO DO CAFÉ*\n`;
        text += `━━━━━━━━━━━━━━━━━━━━\n`;

        const fontes = [];
        if (minasul) fontes.push(`Minasul: _${minasul.atualizadoEm}_`);
        if (coocafe) fontes.push(`Coocafé: _${coocafe.atualizadoEm}_`);
        if (cccmg)   fontes.push(`CCCMG: _${cccmg.data}_`);
        text += fontes.join("\n") + "\n";
        text += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        // ─────────────────────────────────────────────────────────────
        // Helpers
        // ─────────────────────────────────────────────────────────────
        const mc = minasul?.cotacoes ?? {};
        const cc = coocafe?.cotacoes ?? {};

        function cccmgPreco(keywords) {
            if (!cccmg?.precos) return null;
            const item = cccmg.precos.find(p =>
                keywords.every(kw => p.padrao.toLowerCase().includes(kw.toLowerCase()))
            );
            return item ? item.preco : null;
        }

        const disponivel = (v) => v && v !== "A Consultar" && v.toLowerCase() !== "não divulgado";

        function formatarPreco(num) {
            if (num === null || num === undefined || isNaN(num)) return "—";
            return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        function getVariacaoTexto(fonte, metricKey, precoAtualStr) {
            const currNum = normalizePrice(precoAtualStr);
            if (currNum === null || !previousSnapshot) return "";

            const prevValRaw = previousSnapshot.sources?.[fonte]?.metrics?.[metricKey];
            const prevNum = normalizePrice(prevValRaw);

            if (prevNum === null || prevNum === undefined) return "";

            const diff = currNum - prevNum;
            if (diff === 0) return " _(➡️ est.)_";

            const pct = prevNum > 0 ? (diff / prevNum) * 100 : 0;
            const sinal = diff > 0 ? "+" : "-";
            const emoji = diff > 0 ? "📈" : "📉";

            return ` ${emoji} _(${sinal}R$ ${formatarNum(diff)} | ${sinal}${Math.abs(pct).toFixed(2)}%)_`;
        }

        function getMelhorSemana(extractorFn) {
            const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const snapshots = [];

            if (Array.isArray(historyEntries)) {
                for (const entry of historyEntries) {
                    const t = new Date(entry.timestamp || entry.snapshot?.capturedAt || 0).getTime();
                    if (t && t >= cutoff && entry.snapshot) {
                        snapshots.push(entry.snapshot);
                    }
                }
            }
            if (currentSnapshot) snapshots.push(currentSnapshot);

            let maxVal = null;
            let maxFontes = new Set();

            for (const snap of snapshots) {
                const items = extractorFn(snap);
                for (const item of items) {
                    if (item.num === null || item.num === undefined || isNaN(item.num)) continue;
                    if (maxVal === null || item.num > maxVal) {
                        maxVal = item.num;
                        maxFontes = new Set([item.fonte]);
                    } else if (item.num === maxVal) {
                        maxFontes.add(item.fonte);
                    }
                }
            }

            if (maxVal === null) return null;
            return {
                preco: maxVal,
                fontes: Array.from(maxFontes)
            };
        }

        // ─────────────────────────────────────────────────────────────
        // Categorias por Qualidade
        // ─────────────────────────────────────────────────────────────
        const categorias = [
            {
                label: "Bebida Dura Tipo 6",
                linhas: [
                    { fonte: "Minasul", preco: mc.bebidaDuraTipo6?.preco, metricKey: "bebidaDuraTipo6" },
                    { fonte: "CCCMG",   preco: cccmgPreco(["tipo 6", "bebida dura"]), metricKey: "cccmg-tipo6-dura" }
                ],
                extractor: (snap) => {
                    const res = [];
                    const mNum = normalizePrice(snap.sources?.Minasul?.metrics?.bebidaDuraTipo6);
                    if (mNum !== null) res.push({ fonte: "Minasul", num: mNum });

                    for (const [k, v] of Object.entries(snap.sources?.CCCMG?.metrics || {})) {
                        if (/tipo.*6/i.test(k) && /dura/i.test(k)) {
                            const cNum = normalizePrice(v);
                            if (cNum !== null) res.push({ fonte: "CCCMG", num: cNum });
                        }
                    }
                    return res;
                }
            },
            {
                label: "Bebida Dura Tipo 6/7",
                linhas: [
                    { fonte: "Minasul", preco: mc.bebidaDuraTipo67?.preco, metricKey: "bebidaDuraTipo67" },
                    { fonte: "Coocafé", preco: cc.arabicaDura?.preco, metricKey: "arabicaDura" },
                    { fonte: "CCCMG",   preco: cccmgPreco(["tipo 7", "bebida dura"]), metricKey: "cccmg-tipo7-dura" }
                ],
                extractor: (snap) => {
                    const res = [];
                    const mNum = normalizePrice(snap.sources?.Minasul?.metrics?.bebidaDuraTipo67);
                    if (mNum !== null) res.push({ fonte: "Minasul", num: mNum });

                    const coNum = normalizePrice(snap.sources?.Coocafe?.metrics?.arabicaDura);
                    if (coNum !== null) res.push({ fonte: "Coocafé", num: coNum });

                    for (const [k, v] of Object.entries(snap.sources?.CCCMG?.metrics || {})) {
                        if (/tipo.*7/i.test(k) && /dura/i.test(k)) {
                            const cNum = normalizePrice(v);
                            if (cNum !== null) res.push({ fonte: "CCCMG", num: cNum });
                        }
                    }
                    return res;
                }
            },
            {
                label: "Bebida Mole",
                linhas: [
                    { fonte: "Minasul", preco: mc.bebidaMole?.preco, metricKey: "bebidaMole" }
                ],
                extractor: (snap) => {
                    const mNum = normalizePrice(snap.sources?.Minasul?.metrics?.bebidaMole);
                    return mNum !== null ? [{ fonte: "Minasul", num: mNum }] : [];
                }
            },
            {
                label: "Cereja Descascado",
                linhas: [
                    { fonte: "Minasul", preco: mc.cerejaDescascado?.preco, metricKey: "cerejaDescascado" }
                ],
                extractor: (snap) => {
                    const mNum = normalizePrice(snap.sources?.Minasul?.metrics?.cerejaDescascado);
                    return mNum !== null ? [{ fonte: "Minasul", num: mNum }] : [];
                }
            },
            {
                label: "Bebida Rio Tipo 7",
                linhas: [
                    { fonte: "Coocafé", preco: cc.arabicaRio?.preco, metricKey: "arabicaRio" },
                    { fonte: "CCCMG",   preco: cccmgPreco(["tipo 7", "bebida rio"]), metricKey: "cccmg-tipo7-rio" }
                ],
                extractor: (snap) => {
                    const res = [];
                    const coNum = normalizePrice(snap.sources?.Coocafe?.metrics?.arabicaRio);
                    if (coNum !== null) res.push({ fonte: "Coocafé", num: coNum });

                    for (const [k, v] of Object.entries(snap.sources?.CCCMG?.metrics || {})) {
                        if (/rio/i.test(k)) {
                            const cNum = normalizePrice(v);
                            if (cNum !== null) res.push({ fonte: "CCCMG", num: cNum });
                        }
                    }
                    return res;
                }
            },
            {
                label: "Bebida Riada Tipo 6",
                linhas: [
                    { fonte: "CCCMG", preco: cccmgPreco(["bebida riada"]), metricKey: "cccmg-riada" }
                ],
                extractor: (snap) => {
                    const res = [];
                    for (const [k, v] of Object.entries(snap.sources?.CCCMG?.metrics || {})) {
                        if (/riada/i.test(k)) {
                            const cNum = normalizePrice(v);
                            if (cNum !== null) res.push({ fonte: "CCCMG", num: cNum });
                        }
                    }
                    return res;
                }
            }
        ];

        for (const cat of categorias) {
            const comValor = cat.linhas.filter(l => disponivel(l.preco));
            if (comValor.length === 0) continue;

            text += `🔷 *${cat.label}*\n`;
            for (const l of comValor) {
                const varText = getVariacaoTexto(l.fonte === "Coocafé" ? "Coocafe" : l.fonte, l.metricKey, l.preco);
                text += `  • ${l.fonte}: ${l.preco}${varText}\n`;
            }

            const melhor = getMelhorSemana(cat.extractor);
            if (melhor) {
                text += `  🏆 *Melhor da semana:* ${formatarPreco(melhor.preco)} (${melhor.fontes.join(", ")})\n`;
            }

            text += `\n`;
        }

        // Conilon Tipo 7
        if (cc.conilon && (disponivel(cc.conilon.espiritoSanto) || disponivel(cc.conilon.minasGerais))) {
            text += `🔷 *Conilon Tipo 7*\n`;
            if (disponivel(cc.conilon.espiritoSanto)) {
                const varES = getVariacaoTexto("Coocafe", "conilon", cc.conilon.espiritoSanto);
                text += `  • Coocafé ES: ${cc.conilon.espiritoSanto}${varES}\n`;
            }
            if (disponivel(cc.conilon.minasGerais)) {
                const varMG = getVariacaoTexto("Coocafe", "conilon", cc.conilon.minasGerais);
                text += `  • Coocafé MG: ${cc.conilon.minasGerais}${varMG}\n`;
            }

            const melhorConilon = getMelhorSemana((snap) => {
                const res = [];
                const coMetrics = snap.sources?.Coocafe?.metrics || {};
                for (const [k, v] of Object.entries(coMetrics)) {
                    if (/conilon/i.test(k)) {
                        const num = normalizePrice(v);
                        if (num !== null) res.push({ fonte: "Coocafé", num });
                    }
                }
                return res;
            });

            if (melhorConilon) {
                text += `  🏆 *Melhor da semana:* ${formatarPreco(melhorConilon.preco)} (${melhorConilon.fontes.join(", ")})\n`;
            }
            text += `\n`;
        }

        text += `━━━━━━━━━━━━━━━━━━━━`;

        await message.reply({ text });
        await message.react("✅");
    }
};

function formatarNum(num) {
    return Math.abs(num).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

