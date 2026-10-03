const stockMonitor = require("../../../functions/stockMonitor");
const { normalizeMarketSymbols } = require("../../../functions/mercado");
const { isOwner } = require("../../../functions/owners");

function getTarget(message) {
    return {
        platform: message.platform,
        chatId: message.chatId,
        threadId: message.threadId || null,
        chatName: message.chatName || null
    };
}

function canConfigure(message) {
    return Boolean(
        message.isPrivate ||
        message.sender?.isOwner ||
        message.sender?.isAdmin ||
        message.isAdmin ||
        message.isOwner ||
        isOwner(message)
    );
}

function help(prefix) {
    return [
        "📈 *Monitor da Bolsa*",
        "",
        `• *${prefix}monitorbolsa set <ativos>*`,
        "  Define os ativos separados por vírgula. Ex.: ibovespa,nasdaq,cafe",
        `• *${prefix}monitorbolsa times HH:MM,HH:MM*`,
        "  Define os horários diários.",
        `• *${prefix}monitorbolsa on|off*`,
        "  Ativa ou desativa os envios automáticos.",
        `• *${prefix}monitorbolsa status*`,
        "  Exibe a configuração atual.",
        `• *${prefix}monitorbolsa run*`,
        "  Envia a cotação imediatamente.",
        "",
        "Ativos: ibovespa, sp500, nasdaq e cafe."
    ].join("\n");
}

module.exports = {
    name: "monitorbolsa",
    aliases: ["bolsamonitor", "monitor bolsa"],
    category: "adm/configurações",
    description: "Configura o envio automático de cotações de Ibovespa, S&P 500, Nasdaq e café neste chat. Use `set` para escolher ativos, `times` para definir horários, `on`/`off` para controlar o envio, `status` para consultar ou `run` para enviar agora.",
    usage: "{prefix}monitorbolsa <set|times|on|off|status|run|help>",

    async execute(message) {
        const target = getTarget(message);
        const prefix = message.prefix || "!";
        const args = message.args || [];
        const action = String(args.shift() || "status").toLowerCase();
        let config = stockMonitor.loadMonitorConfig(target);

        if (["help", "ajuda"].includes(action)) {
            return message.reply({ text: help(prefix) });
        }

        if (action === "run") {
            try {
                await message.reply({ text: "⏳ Buscando as cotações da bolsa..." });
                const result = await stockMonitor.runStockReport({ config, send: false, target });
                return message.reply({ text: result.text });
            } catch (error) {
                console.error("[COMANDO MONITORBOLSA]", error.message || error);
                return message.reply({ text: "⚠️ Não foi possível consultar as cotações agora." });
            }
        }

        if (!canConfigure(message)) {
            return message.reply({ text: "❌ Apenas administradores podem configurar o monitor da bolsa." });
        }

        try {
            if (action === "set") {
                const symbols = args.join(" ").split(",").map((value) => value.trim()).filter(Boolean);
                if (!symbols.length) return message.reply({ text: `❌ Informe os ativos. Use *${prefix}monitorbolsa help*.` });
                normalizeMarketSymbols(symbols);
                config = stockMonitor.saveMonitorConfig({ symbols }, target);
            } else if (action === "times") {
                const times = args.join(" ").split(",").map((value) => value.trim());
                if (!times.every((time) => /^\d{2}:\d{2}$/.test(time) && Number(time.slice(0, 2)) < 24 && Number(time.slice(3)) < 60)) {
                    return message.reply({ text: "❌ Horários inválidos. Use o formato HH:MM,HH:MM." });
                }
                config = stockMonitor.saveMonitorConfig({ times }, target);
            } else if (["on", "ativar", "enable"].includes(action)) {
                config = stockMonitor.saveMonitorConfig({ enabled: true }, target);
            } else if (["off", "desativar", "disable"].includes(action)) {
                config = stockMonitor.saveMonitorConfig({ enabled: false }, target);
            } else if (action !== "status") {
                return message.reply({ text: help(prefix) });
            }

            if (action !== "status") {
                await stockMonitor.syncMonitorSchedules(config, target);
            }

            const active = config.enabled ? "✅ Ativo" : "❌ Desativado";
            const symbols = config.symbols?.length ? config.symbols.join(", ") : "todos";
            return message.reply({
                text: `📈 *Monitor da Bolsa*\n\nStatus: ${active}\nAtivos: ${symbols}\nHorários: ${(config.times || ["09:00"]).join(", ")}`
            });
        } catch (error) {
            console.error("[COMANDO MONITORBOLSA]", error.message || error);
            return message.reply({ text: `❌ Não foi possível atualizar o monitor: ${error.message}` });
        }
    }
};
