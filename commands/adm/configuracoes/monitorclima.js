const weatherMonitor = require("../../../functions/weatherMonitor");
const { isOwner } = require("../../../functions/owners");

const DESCRIPTION = `⛅ Agenda o envio diário da previsão do tempo neste chat ou tópico.

🔐 Administradores do chat e superusuários podem configurar, ativar, desativar ou testar o monitor.

📍 1. Escolha a cidade:
{prefix}monitorclima set <cidade>
{prefix}monitorclima set São Paulo

O nome pode conter espaços. Para procurar uma cidade antes de configurar, consulte:
{prefix}clima São Paulo

⏰ 2. Defina os horários diários de envio:
{prefix}monitorclima times <HH:MM,HH:MM>
{prefix}monitorclima times 08:00,18:00

Informe os horários no formato de 24 horas, separados por vírgulas. O horário padrão é 08:00.

✅ 3. Ative os envios automáticos:
{prefix}monitorclima enable

A previsão será enviada diariamente nos horários configurados. Para pausar os envios sem apagar cidade ou horários:
{prefix}monitorclima disable

🧪 Consulte a previsão imediatamente:
{prefix}monitorclima run

Envia uma previsão de teste para a cidade configurada, sem alterar a programação.

📋 Consulte as configurações:
{prefix}monitorclima status

❔ Exiba esta ajuda:
{prefix}monitorclima help`;

async function checkAdminPermission(message) {
    if (message.isPrivate || message.sender?.isOwner || isOwner(message)) return true;
    const adapter = (message.platforms || []).find(platform => platform.name === message.platform);
    if (adapter?.checkUserPermission) {
        return adapter.checkUserPermission(message.chatId, message.userId);
    }
    return !!message.sender?.isAdmin;
}

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "monitorclima",
    category: "adm/configurações",
    description: DESCRIPTION,
    usage: "{prefix}monitorclima <set|times|enable|disable|status|run|help>",
    examples: [
        "{prefix}monitorclima set São Paulo",
        "{prefix}monitorclima times 08:00,18:00",
        "{prefix}monitorclima enable",
        "{prefix}monitorclima status",
        "{prefix}monitorclima run"
    ],

    async execute(message) {
        const args = message.args || [];
        const query = args.join(" ").trim();
        if (!query || ["help", "ajuda"].includes(query.toLowerCase())) {
            return message.reply({ text: helpText(message) });
        }

        const target = {
            platform: message.platform,
            chatId: message.chatId,
            threadId: message.threadId || null
        };
        const parts = query.split(/\s+/);
        const command = parts.shift().toLowerCase();

        if (["set", "times", "enable", "disable", "ativar", "desativar", "on", "off", "run"].includes(command)) {
            const isAdmin = await checkAdminPermission(message);
            if (!isAdmin) {
                return message.reply({ text: "❌ Apenas administradores podem configurar o monitor de clima do grupo." });
            }
        }

        if (command === "set") {
            const city = parts.join(" ").trim();
            if (!city) return message.reply({ text: `❌ Informe a cidade. Ex: ${message.prefix}monitorclima set São Paulo` });
            const config = weatherMonitor.saveMonitorConfig({ city }, target);
            await weatherMonitor.syncMonitorSchedules(config, target);
            return message.reply({ text: `✅ Cidade definida: ${city}` });
        }

        if (command === "times") {
            const rest = parts.join(" ").trim();
            if (!rest) return message.reply({ text: `❌ Informe os horários separados por vírgula. Ex: ${message.prefix}monitorclima times 08:00,18:00` });
            const times = rest.split(",").map(time => time.trim()).filter(Boolean);
            const config = weatherMonitor.saveMonitorConfig({ times }, target);
            await weatherMonitor.syncMonitorSchedules(config, target);
            return message.reply({ text: `✅ Horários atualizados: ${times.join(", ")}` });
        }

        if (["enable", "disable", "ativar", "desativar", "on", "off"].includes(command)) {
            const enabled = ["enable", "ativar", "on"].includes(command);
            const config = weatherMonitor.saveMonitorConfig({ enabled }, target);
            await weatherMonitor.syncMonitorSchedules(config, target);
            return message.reply({ text: enabled ? "✅ Monitor de clima ativado." : "ℹ️ Monitor de clima desativado." });
        }

        if (command === "status") {
            const config = weatherMonitor.loadMonitorConfig(target);
            return message.reply({
                text: `📌 Monitor de clima:\nCidade: ${config.city || "(não definida)"}\nAtivo: ${config.enabled ? "Sim" : "Não"}\nHorários: ${Array.isArray(config.times) ? config.times.join(", ") : "(nenhum)"}`
            });
        }

        if (command === "run") {
            const config = weatherMonitor.loadMonitorConfig(target);
            if (!config.city) {
                return message.reply({ text: `❌ Nenhuma cidade configurada para este chat. Use: ${message.prefix}monitorclima set <cidade>` });
            }

            const adapter = global.platformRegistry?.[message.platform] || null;
            try {
                if (adapter) {
                    await weatherMonitor.runWeatherReport({ config, send: true, target, adapter });
                    return message.reply({ text: "✅ Previsão enviada (execução de teste)." });
                }
                const result = await weatherMonitor.runWeatherReport({ config, send: false, target });
                return message.reply({ text: `✅ Pré-visualização:\n\n${result.text}` });
            } catch (err) {
                console.error("[MONITORCLIMA] Erro ao executar o teste:", err);
                return message.reply({ text: "❌ Não foi possível executar o teste do monitor de clima. Verifique a configuração e tente novamente." });
            }
        }

        return message.reply({ text: helpText(message) });
    }
};
