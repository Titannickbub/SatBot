const weatherMonitor = require("../../../functions/weatherMonitor");
const { isOwner } = require("../../../functions/owners");

async function checkAdminPermission(message) {
    if (message.isPrivate || message.sender?.isOwner || isOwner(message)) return true;
    const adapter = (message.platforms || []).find(platform => platform.name === message.platform);
    if (adapter?.checkUserPermission) {
        return adapter.checkUserPermission(message.chatId, message.userId);
    }
    return !!message.sender?.isAdmin;
}

module.exports = {
    name: "monitorclima",
    category: "adm/configurações",
    description: "Agenda previsões do tempo neste chat. Use `set` para escolher a cidade, `times` para definir horários, `enable`/`disable` para controlar os envios, `status` para consultar ou `run` para enviar uma previsão agora.",
    usage: "{prefix}monitorclima <set|times|enable|disable|status|run>",
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
            return message.reply({ text: _help(message) });
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

        return message.reply({ text: _help(message) });
    }
};

function _help(message) {
    const prefix = message.prefix || "!";
    return [
        "⏰ *MONITORCLIMA — AJUDA*",
        "",
        "Configura a previsão automática neste chat. Apenas administradores podem alterar o monitor.",
        "",
        `• \`${prefix}monitorclima set <cidade>\` — Define a cidade monitorada.`,
        `• \`${prefix}monitorclima times HH:MM,HH:MM\` — Define os horários diários.`,
        `• \`${prefix}monitorclima enable\` / \`${prefix}monitorclima disable\` — Ativa ou desativa os envios.`,
        `• \`${prefix}monitorclima status\` — Mostra a configuração atual.`,
        `• \`${prefix}monitorclima run\` — Executa uma previsão de teste agora.`,
        "",
        `Pesquise uma cidade em tempo real com \`${prefix}clima <cidade>\`.`
    ].join("\n");
}
