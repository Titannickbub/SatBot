const { runCafeMonitor, saveMonitorConfig, loadMonitorConfig, syncMonitorSchedules, normalizeSourceName } = require("../../../functions/cafeMonitor");
const { isOwner } = require("../../../functions/owners");

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
    if (message.sender?.isOwner || isOwner(message)) return true;
    const adapter = (message.platforms || []).find(p => p.name === message.platform);
    if (adapter?.checkUserPermission) {
        return adapter.checkUserPermission(message.chatId, message.userId);
    }
    return !!(message.sender?.isAdmin);
}

const DESCRIPTION = `☕ Monitora e compara cotações de café das fontes Minasul, Coocafé e CCCMG.

🔐 Administradores do chat e superusuários podem configurar ou desativar o monitor.
📊 Os dados coletados alimentam o histórico das cotações.

⚙️ 1. Configure o monitor no chat atual:
{prefix}monitorcafe config [modo] [fontes] [horários]

Modos disponíveis:
• loop — envia as cotações nos horários definidos.
• monitor — verifica as fontes a cada hora e envia uma mensagem apenas quando detecta alteração de preço.
• both — combina o envio nos horários definidos com os alertas de alteração a cada hora.

Fontes disponíveis: minasul, coocafe e cccmg. Separe várias fontes por vírgula. Use all para acompanhar todas.
loop também pode ser informado como scheduled ou agendado.

Exemplo com envio em horários fixos:
{prefix}monitorcafe config loop minasul,coocafe 07:00 13:00 20:00

Exemplo com verificação de alterações a cada hora:
{prefix}monitorcafe config monitor cccmg

Exemplo combinando os dois modos:
{prefix}monitorcafe config both all 07:00 13:00 20:00

Se não informar o modo, será usado both. Sem fontes, serão acompanhadas todas; sem horários, serão usados 07:00, 13:00 e 20:00. Os horários só controlam os envios do modo loop; monitor verifica as cotações a cada hora.

🧪 2. Faça uma consulta imediata:
{prefix}monitorcafe run

Consulta as fontes selecionadas, atualiza o histórico e envia o relatório no chat, sem alterar a configuração.

📋 Consulte a configuração e o histórico:
{prefix}monitorcafe status

🔕 Desative os envios automáticos sem apagar as opções:
{prefix}monitorcafe disable

❔ Exiba esta ajuda:
{prefix}monitorcafe help`;

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "monitorcafe",
    category: "adm/configurações",
    description: DESCRIPTION,
    usage: "{prefix}monitorcafe [config|run|status|disable|help]",
    examples: [
        "{prefix}monitorcafe config both minasul,coocafe",
        "{prefix}monitorcafe config loop minasul,coocafe 07:00 13:00 20:00",
        "{prefix}monitorcafe config monitor cccmg",
        "{prefix}monitorcafe run",
        "{prefix}monitorcafe status",
        "{prefix}monitorcafe help"
    ],

    async execute(message) {
        const sub = String(message.args?.[0] || "help").toLowerCase();
        const config = loadMonitorConfig({ platform: message.platform, chatId: message.chatId, threadId: message.threadId || null });

        if (["disable", "desativar", "off", "desligar"].includes(sub)) {
            const canConfigure = await checkMonitorPermission(message);
            if (!canConfigure) {
                return message.reply({ text: "❌ Apenas administradores do chat ou super usuários podem desativar o monitor do café." });
            }

            const target = {
                platform: message.platform,
                chatId: message.chatId,
                threadId: message.threadId || null
            };
            const disabledConfig = saveMonitorConfig({ enabled: false }, target);
            await syncMonitorSchedules(disabledConfig, target);
            return message.reply({ text: "ℹ️ Monitor do café desativado neste chat." });
        }

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
        const monitorState = require("../../../functions/cafeMonitor").loadMonitorState();
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
