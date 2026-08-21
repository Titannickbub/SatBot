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

function helpText(prefix) {
    return [
        `*☕ Monitor do café — Ajuda*`,
        ``,
        `*O que faz:*`,
        `  Monitora e compara cotações do café em grupos e plataformas, usando fontes como Minasul, Coocafé e CCCMG.`,
        `  O monitor mantém um histórico compartilhado e permite uma configuração própria por chat, sem misturar grupos.`,
        ``,
        `*Subcomandos:*`,
        `  \`${prefix}monitorcafe config [both|loop|monitor] [fontes...] [horarios...]\` — Habilita o monitor para este chat e define o modo de operação.`,
        `  \`${prefix}monitorcafe run\` — Executa uma verificação imediata agora.`,
        `  \`${prefix}monitorcafe status\` — Mostra a configuração atual deste chat.`,
        `  \`${prefix}monitorcafe help\` — Exibe esta ajuda.`,
        ``,
        `*Modos de operação:*`,
        `  • \`both\` — Combina a verificação contínua (com avisos APENAS se houver alteração de preço) com o envio da cotação nos horários selecionados.`,
        `    Uso: \`${prefix}monitorcafe config both minasul,coocafe 07:00 13:00 20:00\``,
        `  • \`loop\` (ou \`scheduled\`) — Envia a cotação atual apenas nos horários selecionados (ex: 07:00, 13:00, 20:00).`,
        `    Uso: \`${prefix}monitorcafe config loop minasul,coocafe 07:00 13:00 20:00\``,
        `  • \`monitor\` — Verifica periodicamente a cada 1h e envia aviso no chat APENAS se houver alteração de preço nas fontes acompanhadas.`,
        `    Uso: \`${prefix}monitorcafe config monitor coocafe,cccmg\``,
        ``,
        `*Como usar:*`,
        `  1. Configure o monitor no chat desejado com o modo que você quer.`,
        `  2. Informe as fontes desejadas, separadas por vírgula.`,
        `  3. Use \`${prefix}monitorcafe run\` para testar imediatamente.`,
        `  4. Use \`${prefix}monitorcafe status\` para ver o estado atual.`,
        ``,
        `*Fontes aceitas:*`,
        `  minasul, coocafe, cccmg ou all`,
        ``,
        `*Exemplos:*`,
        `  \`${prefix}monitorcafe config both minasul,coocafe 07:00 13:00 20:00\``,
        `  \`${prefix}monitorcafe config loop all 07:00 13:00 20:00\``,
        `  \`${prefix}monitorcafe config monitor cccmg\``,
        `  \`${prefix}monitorcafe run\``,
        `  \`${prefix}monitorcafe status\``
    ].join("\n");
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
            return message.reply({ text: helpText(message.prefix) });
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
