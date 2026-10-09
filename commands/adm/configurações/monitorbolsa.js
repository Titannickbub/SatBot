const stockMonitor = require("../../../functions/stockMonitor");
const { normalizeMarketSymbols } = require("../../../functions/mercado");
const { isOwner } = require("../../../functions/owners");

const DESCRIPTION = `📈 Configura o envio automático de cotações da bolsa neste chat.

🔐 Administradores do chat e superusuários podem configurar o monitor.
📊 As cotações dos índices são obtidas do Yahoo Finance; o dólar comercial é obtido da AwesomeAPI.

📝 1. Escolha quais ativos acompanhar:
{prefix}monitorbolsa set <ativos>
{prefix}monitorbolsa set ibovespa,nasdaq,dolar

Ativos disponíveis:
• ibovespa — Ibovespa
• sp500 — S&P 500
• nasdaq — Nasdaq
• cafe — Café Arábica
• dolar — Dólar comercial (compra e venda)

Informe um ou mais nomes separados por vírgula. Uma nova seleção substitui a anterior. Para acompanhar todos, informe os cinco ativos.

⏰ 2. Defina os horários diários de envio:
{prefix}monitorbolsa times <HH:MM,HH:MM>
{prefix}monitorbolsa times 09:00,15:30

Use o formato de 24 horas HH:MM. Informe um ou mais horários separados por vírgula; uma nova configuração substitui os horários anteriores. O padrão é 09:00.

✅ 3. Ative os envios automáticos:
{prefix}monitorbolsa on

O relatório será enviado diariamente nos horários configurados. Para pausar os envios sem apagar as configurações:
{prefix}monitorbolsa off

🧪 Consultar as cotações agora:
{prefix}monitorbolsa run

Busca e exibe um relatório imediatamente, sem alterar os horários ou o estado do monitor.

📋 Conferir o estado e as configurações:
{prefix}monitorbolsa status

❔ Exibir esta ajuda:
{prefix}monitorbolsa help`;

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

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "monitorbolsa",
    aliases: ["bolsamonitor", "monitor bolsa"],
    category: "adm/configurações",
    description: DESCRIPTION,
    usage: "{prefix}monitorbolsa <set|times|on|off|status|run|help>",

    async execute(message) {
        const target = getTarget(message);
        const prefix = message.prefix || "!";
        const args = message.args || [];
        const action = String(args.shift() || "status").toLowerCase();
        let config = stockMonitor.loadMonitorConfig(target);

        if (["help", "ajuda"].includes(action)) {
            return message.reply({ text: helpText(message) });
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
                return message.reply({ text: helpText(message) });
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
