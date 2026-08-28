const { runCafeMonitor, saveMonitorConfig, loadMonitorConfig, syncMonitorSchedules, normalizeSourceName } = require("../../functions/cafeMonitor");

function parseMonitorConfigArgs(args = []) {
    const rawMode = (args[1] || "both").toLowerCase();
    let mode = "both";
    if (rawMode === "loop" || rawMode === "scheduled" || rawMode === "agendado") {
        mode = "loop";
    } else if (rawMode === "monitor" || rawMode === "continuo" || rawMode === "contínuo") {
        mode = "monitor";
    } else if (rawMode === "both" || rawMode === "ambos") {
        mode = "both";
    } else {
        mode = rawMode;
    }

    const rest = (args.slice(2) || []).map(item => String(item || "").trim()).filter(Boolean);

    const timeTokens = [];
    const sourceTokens = [];

    for (const token of rest) {
        const pieces = token.split(/[,\s]+/).filter(Boolean);
        for (const piece of pieces) {
            if (/^\d{1,2}:\d{2}$/.test(piece)) {
                timeTokens.push(piece);
            } else if (piece) {
                sourceTokens.push(piece);
            }
        }
    }

    const sourcesText = sourceTokens.join(" ") || "all";
    const normalizedSources = sourcesText === "all"
        ? ["Minasul", "Coocafe", "CCCMG"]
        : sourcesText.split(/[,\s]+/).map(item => normalizeSourceName(item)).filter(Boolean);

    return {
        mode,
        sources: normalizedSources,
        times: timeTokens.length ? timeTokens : ["07:00", "13:00", "20:00"]
    };
}

async function checkMonitorPermission(message) {
    if (message.sender?.isOwner) return true;
    const adapter = (message.platforms || []).find(p => p.name === message.platform);
    if (adapter?.checkUserPermission) {
        return adapter.checkUserPermission(message.chatId, message.userId);
    }
    return !!(message.sender?.isAdmin);
}

function helpText(message) {
    const p = message.prefix;
    const plat = message.platform;

    let header = '*☕ MONITOR DO CAFÉ — AJUDA*';
    if (plat === 'discord') header = '🎮 *MONITOR DO CAFÉ (Discord) — AJUDA*';
    else if (plat === 'whatsapp') header = '📱 *MONITOR DO CAFÉ (WhatsApp) — AJUDA*';
    else if (plat === 'telegram') header = '✈️ *MONITOR DO CAFÉ (Telegram) — AJUDA*';

    const lines = [];
    lines.push(header);
    lines.push('');
    lines.push('Descrição:');
    lines.push('  Monitora e compara cotações do café usando fontes como Minasul, Coocafé e CCCMG. Mantém histórico local por chat e envia alertas conforme configuração.');
    lines.push('');
    lines.push('📋 COMANDOS DISPONÍVEIS:');
    lines.push('  `' + p + 'monitorcafe config [both|loop|monitor] [fontes...] [horarios...]`');
    lines.push('    ↳ Habilita/configura o monitor neste chat e define modo, fontes e horários.');
    lines.push('');
    lines.push('  `' + p + 'monitorcafe run`');
    lines.push('    ↳ Executa uma verificação imediata e envia resultado neste chat.');
    lines.push('');
    lines.push('  `' + p + 'monitorcafe status`');
    lines.push('    ↳ Mostra a configuração atual e o estado do monitor para este chat.');
    lines.push('');
    lines.push('  `' + p + 'monitorcafe help`');
    lines.push('    ↳ Exibe esta ajuda.');
    lines.push('');
    lines.push('⚙️ MODOS DE OPERAÇÃO:');
    lines.push('  • `both` — Combina verificação contínua (envia aviso somente se houver alteração de preço) com envios em horários fixos.');
    lines.push('    Ex.: `' + p + 'monitorcafe config both minasul,coocafe 07:00 13:00 20:00`');
    lines.push('');
    lines.push('  • `loop` / `scheduled` — Envia a cotação nos horários configurados (ex: 07:00, 13:00, 20:00).');
    lines.push('    Ex.: `' + p + 'monitorcafe config loop minasul,coocafe 07:00 13:00 20:00`');
    lines.push('');
    lines.push('  • `monitor` — Verifica periodicamente (ex: cada 1h) e envia mensagem somente se houver alteração de preço nas fontes monitoradas.');
    lines.push('    Ex.: `' + p + 'monitorcafe config monitor coocafe,cccmg`');
    lines.push('');
    lines.push('📌 COMO USAR:');
    lines.push('  1. Configure o monitor no chat desejado com o modo e fontes desejadas.');
    lines.push('  2. Opcionalmente defina horários para envios (para `both` ou `loop`).');
    lines.push('  3. Teste com `' + p + 'monitorcafe run`.');
    lines.push('  4. Consulte o estado com `' + p + 'monitorcafe status`.');
    lines.push('');
    lines.push('🔎 FONTES ACEITAS:');
    lines.push('  minasul, coocafe, cccmg, all');
    lines.push('');
    lines.push('📌 EXEMPLOS:');
    lines.push('  ' + p + 'monitorcafe config both minasul,coocafe 07:00 13:00 20:00');
    lines.push('  ' + p + 'monitorcafe config loop all 07:00 13:00 20:00');
    lines.push('  ' + p + 'monitorcafe config monitor cccmg');
    lines.push('  ' + p + 'monitorcafe run');
    lines.push('  ' + p + 'monitorcafe status');

    return lines.join('\n');
}

module.exports = {
    name: "monitorcafe",
    category: "adm",
    description: `Monitora e compara cotações do café em grupos e plataformas.

Funciona com fontes como Minasul, Coocafé e CCCMG, mantém um histórico compartilhado e permite configurar o monitor de forma independente por chat.

Use config para habilitar o monitor, run para executar uma verificação agora e status para ver a configuração atual.`,
    usage: "{prefix}monitorcafe [config|run|status]",
    examples: [
        "{prefix}monitorcafe config both minasul,coocafe",
        "{prefix}monitorcafe run",
        "{prefix}monitorcafe status"
    ],

    async execute(message) {
        const sub = (message.args[0] || "help").toLowerCase();
        const config = loadMonitorConfig({ platform: message.platform, chatId: message.chatId, threadId: message.threadId || null });

        if (sub === "config") {
            const canConfigure = await checkMonitorPermission(message);
            if (!canConfigure) {
                return message.reply({ text: "❌ Apenas administradores do chat ou super usuários podem configurar o monitor do café." });
            }

            const options = parseMonitorConfigArgs(message.args || []);
            const mode = options.mode;
            const chatId = message.chatId;
            const platform = message.platform;

            const nextConfig = saveMonitorConfig({
                enabled: true,
                mode,
                platform,
                chatId,
                threadId: message.threadId || null,
                sources: options.sources,
                sendMode: "all",
                times: options.times
            }, {
                platform,
                chatId,
                threadId: message.threadId || null
            });

            syncMonitorSchedules(nextConfig, {
                platform,
                chatId,
                threadId: message.threadId || null,
                chatName: null
            });

            return message.reply({ text: `✅ Monitor do café configurado para o modo \`${mode}\` e chat atual.\n\nHorários: ${options.times.join(", ")}` });
        }

        if (sub === "run" || sub === "test" || sub === "teste") {
            const result = await runCafeMonitor({
                config,
                sources: config.sources,
                send: true,
                target: {
                    platform: message.platform,
                    chatId: message.chatId,
                    threadId: message.threadId || null
                },
                adapter: global.platformRegistry?.[message.platform]
            });
            return message.reply({ text: result.text });
        }

        if (sub === "help" || sub === "ajuda") {
            return message.reply({ text: helpText(message) });
        }

        const state = loadMonitorConfig({ platform: message.platform, chatId: message.chatId, threadId: message.threadId || null });
        const monitorState = require("../../functions/cafeMonitor").loadMonitorState();
        const historyCount = Array.isArray(monitorState?.history) ? monitorState.history.length : 0;
        const lastSnapshot = monitorState?.lastSnapshot;
        const lastUpdated = monitorState?.lastUpdatedAt || "não registrado";
        const lastSources = lastSnapshot?.sources ? Object.keys(lastSnapshot.sources) : [];

        const statusText = [
            "☕ *Status do monitor do café*",
            `• Habilitado: ${config.enabled ? "sim" : "não"}`,
            `• Modo: ${config.mode || "both"}`,
            `• Fontes configuradas: ${(config.sources || ["Minasul", "Coocafe", "CCCMG"]).join(", ")}`,
            `• Horários: ${(config.times || ["07:00", "13:00", "20:00"]).join(", ")}`,
            `• Plataforma: ${config.platform || message.platform || "não definida"}`,
            `• Chat: ${config.chatId || message.chatId || "não definido"}`,
            `• Última atualização: ${lastUpdated}`,
            `• Registros no histórico: ${historyCount}`,
            `• Últimas fontes capturadas: ${lastSources.length ? lastSources.join(", ") : "nenhuma"}`
        ].join("\n");

        return message.reply({ text: statusText });
    }
};

module.exports.parseMonitorConfigArgs = parseMonitorConfigArgs;
