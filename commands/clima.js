const weatherMonitor = require("../functions/weatherMonitor");

module.exports = {
    name: "clima",
    aliases: ["tempo", "weather"],
    description: "Consulta a previsão do tempo. Subcomandos: 'set <cidade>' define cidade para envios agendados; 'times HH:MM,HH:MM' configura horários diários; 'enable'/'disable' ativa/desativa os envios; 'status' exibe a configuração atual. Sem subcomando, busca previsão imediata para a cidade informada.",
    usage: `{prefix}clima [cidade]`,
    examples: ["{prefix}clima Salvador", "{prefix}clima set São Paulo", "{prefix}clima times 08:00,18:00", "{prefix}clima enable", "{prefix}clima run"],

    async execute(message) {
        const args = message.args || [];
        const q = args.join(" ").trim();

        // Subcomandos administrativos
        const target = { platform: message.platform, chatId: message.chatId, threadId: message.threadId || null };

        if (!q) {
            return message.reply({ text: _help(message) });
        }

        const parts = q.split(/\s+/);
        const cmd = parts[0].toLowerCase();

        if (cmd === "help" || cmd === "ajuda") {
            return message.reply({ text: _help(message) });
        }

        if (cmd === "set") {
            const city = parts.slice(1).join(" ").trim();
            if (!city) return message.reply({ text: "❌ Informe a cidade. Ex: set São Paulo" });
            const cfg = weatherMonitor.saveMonitorConfig({ city }, target);
            await weatherMonitor.syncMonitorSchedules(cfg, target);
            return message.reply({ text: `✅ Cidade definida: ${city}` });
        }

        if (cmd === "times") {
            const rest = parts.slice(1).join(" ").trim();
            if (!rest) return message.reply({ text: "❌ Informe os horários separados por vírgula. Ex: times 08:00,18:00" });
            const times = rest.split(",").map(s => s.trim()).filter(Boolean);
            const cfg = weatherMonitor.saveMonitorConfig({ times }, target);
            await weatherMonitor.syncMonitorSchedules(cfg, target);
            return message.reply({ text: `✅ Horários atualizados: ${times.join(", ")}` });
        }

        if (["enable", "disable", "ativar", "desativar", "on", "off"].includes(cmd)) {
            const enabled = ["enable", "ativar", "on"].includes(cmd);
            const cfg = weatherMonitor.saveMonitorConfig({ enabled }, target);
            await weatherMonitor.syncMonitorSchedules(cfg, target);
            return message.reply({ text: enabled ? "✅ Monitor de clima ativado." : "ℹ️ Monitor de clima desativado." });
        }

        if (cmd === "status") {
            const cfg = weatherMonitor.loadMonitorConfig(target);
            return message.reply({ text: `📌 Monitor de clima:\nCidade: ${cfg.city || "(não definida)"}\nAtivo: ${cfg.enabled ? "Sim" : "Não"}\nHorários: ${Array.isArray(cfg.times) ? cfg.times.join(", ") : "(nenhum)"}` });
        }

        if (cmd === "run") {
            // Executa o envio imediato como se fosse o agendador
            const cfg = weatherMonitor.loadMonitorConfig(target);
            const city = cfg.city || null;
            if (!city) return message.reply({ text: "❌ Nenhuma cidade configurada para este chat. Use: set <cidade>" });

            const adapter = global.platformRegistry?.[message.platform] || null;
            try {
                if (adapter) {
                    await weatherMonitor.runWeatherReport({ config: cfg, send: true, target, adapter });
                    return message.reply({ text: "✅ Previsão enviada (execução de teste)." });
                } else {
                    // Sem adapter — mostrar prévia para teste
                    const res = await weatherMonitor.runWeatherReport({ config: cfg, send: false, target });
                    return message.reply({ text: `✅ Pré-visualização:\n\n${res.text}` });
                }
            } catch (err) {
                console.error("[CLIMA] Erro ao executar o teste:", err);
                return message.reply({ text: "❌ Não foi possível executar o teste do monitor de clima. Verifique a configuração e tente novamente." });
            }
        }

        // Consulta direta: trata como cidade instantânea
        const cityQuery = q;
        await message.reply({ text: "☁️ Consultando previsão do tempo, aguarde..." });
        try {
            const res = await weatherMonitor.runWeatherReport({ city: cityQuery, send: false });
            if (res.error) {
                return message.reply({ text: "⚠️ O serviço de previsão do tempo está indisponível ou instável no momento. Tente novamente em alguns minutos." });
            }
            return message.reply({ text: res.text });
        } catch (err) {
            return message.reply({ text: "⚠️ O serviço de previsão do tempo está indisponível ou instável no momento. Tente novamente em alguns minutos." });
        }
    }

};

function _help(message) {
    const p = message.prefix;
    const plat = message.platform;

    let header = '☁️ *CLIMA — AJUDA*';
    if (plat === 'discord') header = '🎮 *CLIMA (Discord) — AJUDA*';
    else if (plat === 'whatsapp') header = '📱 *CLIMA (WhatsApp) — AJUDA*';
    else if (plat === 'telegram') header = '✈️ *CLIMA (Telegram) — AJUDA*';

    const lines = [];
    lines.push(header);
    lines.push('');
    lines.push('Consulte a previsão do tempo e configure envios automáticos por chat.');
    lines.push('');
    lines.push('📋 COMANDOS:');
    lines.push('  `' + p + 'clima <cidade>`');
    lines.push('    ↳ Busca a previsão imediata para a cidade informada.');
    lines.push('');
    lines.push('  `' + p + 'clima set <cidade>`');
    lines.push('    ↳ Define a cidade padrão para envios agendados neste chat.');
    lines.push('');
    lines.push('  `' + p + 'clima times HH:MM,HH:MM`');
    lines.push('    ↳ Define horários diários para envio automático.');
    lines.push('');
    lines.push('  `' + p + 'clima enable|disable`');
    lines.push('    ↳ Ativa ou desativa os envios automáticos de previsão.');
    lines.push('');
    lines.push('  `' + p + 'clima status`');
    lines.push('    ↳ Mostra a configuração atual do monitor de clima neste chat.');
    lines.push('');
    lines.push('  `' + p + 'clima run`');
    lines.push('    ↳ Executa uma verificação imediata e envia a previsão (teste).');
    lines.push('');
    lines.push('💡 DICAS:');
    lines.push('  • Para busca rápida: `' + p + 'clima São Paulo`');
    lines.push('  • Configure horários e ative o monitor para receber previsões automáticas.');
    lines.push('');
    lines.push('📌 EXEMPLOS:');
    lines.push('  ' + p + 'clima Salvador');
    lines.push('  ' + p + 'clima set São Paulo');
    lines.push('  ' + p + 'clima times 08:00,18:00');
    lines.push('  ' + p + 'clima enable');
    lines.push('  ' + p + 'clima run');

    return lines.join('\n');
}
