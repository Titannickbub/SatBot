const autoAccept = require("../../../functions/autoAccept");
const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "autoaceitar",
    aliases: ["autoaprovar", "autoapprove"],
    category: "adm/configurações",
    platformSupport: { whatsapp: "full", telegram: "full", discord: "none" },
    description: "Configura a aprovação automática de pedidos para entrar em grupos do Telegram e WhatsApp. Permite ativar/desativar, consultar status, definir intervalo e horários e bloquear pedidos por nome ou símbolo.",
    usage: "{prefix}autoaceitar [subcomando]",
    examples: [
        "{prefix}autoaceitar on",
        "{prefix}autoaceitar intervalo 30",
        "{prefix}autoaceitar bloquear nome spam",
        "{prefix}autoaceitar bloquear simbolo 🔞",
        "{prefix}autoaceitar horarios 08:00-18:00"
    ],

    async execute(message) {
        if (message.isPrivate || !["telegram", "whatsapp"].includes(message.platform)) {
            return message.reply({ text: "❌ O autoaceitar só está disponível em grupos do Telegram e WhatsApp." });
        }

        const authorized = message.sender?.isAdmin || message.sender?.isOwner || message.sender?.canManageMessages || isOwner(message);
        if (!authorized) return message.reply({ text: "❌ Apenas administradores podem configurar o autoaceitar." });

        const target = {
            platform: message.platform,
            chatId: message.chatId,
            threadId: message.threadId || null,
            raw: message.raw
        };
        const args = message.args || [];
        const command = (args[0] || "status").toLowerCase();
        const current = autoAccept.getConfig(target);

        if (command === "status") {
            return message.reply({ text: _status(message, current) });
        }
        if (["on", "ativar", "enable"].includes(command) || ["off", "desativar", "disable"].includes(command)) {
            const enabled = ["on", "ativar", "enable"].includes(command);
            autoAccept.saveConfig(target, { ...current, enabled });
            return message.reply({ text: enabled ? "✅ Autoaceitar ativado." : "🔕 Autoaceitar desativado." });
        }
        if (["intervalo", "interval"].includes(command)) {
            const seconds = Number(args[1]);
            if (!Number.isFinite(seconds) || seconds < 0) {
                return message.reply({ text: "❌ Informe um intervalo válido em segundos." });
            }
            autoAccept.saveConfig(target, { ...current, intervalSeconds: Math.round(seconds) });
            return message.reply({ text: `✅ Intervalo entre aprovações: ${Math.round(seconds)} segundo(s).` });
        }
        if (["bloquear", "block"].includes(command)) {
            const kind = (args[1] || "").toLowerCase();
            const value = args.slice(2).join(" ").trim();
            if (!["nome", "name", "simbolo", "símbolo", "symbol"].includes(kind) || !value) {
                return message.reply({ text: `❌ Use: ${message.prefix}autoaceitar bloquear nome <texto> ou bloquear simbolo <símbolo>` });
            }
            const key = ["nome", "name"].includes(kind) ? "blockedNames" : "blockedSymbols";
            autoAccept.saveConfig(target, { ...current, [key]: [...new Set([...current[key], value])] });
            return message.reply({ text: `✅ Filtro adicionado em ${key === "blockedNames" ? "nomes" : "símbolos"}.` });
        }
        if (["desbloquear", "unblock"].includes(command)) {
            const kind = (args[1] || "").toLowerCase();
            const value = args.slice(2).join(" ").trim().toLowerCase();
            const key = ["nome", "name"].includes(kind) ? "blockedNames" : "blockedSymbols";
            const values = current[key].filter(item => item.toLowerCase() !== value);
            autoAccept.saveConfig(target, { ...current, [key]: values });
            return message.reply({ text: "✅ Filtro removido." });
        }
        if (["horarios", "horário", "horario", "schedule"].includes(command)) {
            const value = args.slice(1).join(" ").trim();
            if (["off", "none", "limpar"].includes(value.toLowerCase())) {
                autoAccept.saveConfig(target, { ...current, schedules: [] });
                return message.reply({ text: "✅ Restrição de horários removida." });
            }
            const schedules = value.split(",").map(item => {
                const [start, end] = item.trim().split("-");
                return { start, end };
            });
            if (!schedules.length || schedules.some(item => autoAccept.parseTime(item.start) === null || autoAccept.parseTime(item.end) === null)) {
                return message.reply({ text: `❌ Use horários como: ${message.prefix}autoaceitar horarios 08:00-12:00,18:00-22:00` });
            }
            autoAccept.saveConfig(target, { ...current, schedules });
            return message.reply({ text: `✅ Horários configurados: ${schedules.map(item => `${item.start}-${item.end}`).join(", ")}` });
        }

        return message.reply({ text: _help(message) });
    }
};

function _status(message, config) {
    return [
        "📌 Autoaceitar:",
        `Estado: ${config.enabled ? "Ativo" : "Desativado"}`,
        `Intervalo: ${config.intervalSeconds}s`,
        `Bloqueios por nome: ${config.blockedNames.length ? config.blockedNames.join(", ") : "(nenhum)"}`,
        `Bloqueios por símbolo: ${config.blockedSymbols.length ? config.blockedSymbols.join(", ") : "(nenhum)"}`,
        `Horários: ${config.schedules.length ? config.schedules.map(item => `${item.start}-${item.end}`).join(", ") : "todos"}`
    ].join("\n");
}

function _help(message) {
    const p = message.prefix;
    return [
        "✅ *AUTOACEITAR — AJUDA*",
        `${p}autoaceitar on|off`,
        `${p}autoaceitar status`,
        `${p}autoaceitar intervalo <segundos>`,
        `${p}autoaceitar bloquear nome <texto>`,
        `${p}autoaceitar bloquear simbolo <símbolo>`,
        `${p}autoaceitar desbloquear nome|simbolo <valor>`,
        `${p}autoaceitar horarios HH:MM-HH:MM[,HH:MM-HH:MM]`,
        `${p}autoaceitar horarios off`
    ].join("\n");
}
