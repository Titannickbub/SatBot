const {
    addSchedule,
    editSchedule,
    loadSchedules,
    parseIntervalToMs,
    formatTs
} = require("../functions/schedulerHelper");

const MAX_REMINDERS = 3;

function isPrivateChat(message) {
    return message.isPrivate || message.chatType === "private";
}

function parseFixedTime(value) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || "");
    if (!match) return null;
    return `${match[1]}:${match[2]}`;
}

function getOwnerKey(message) {
    return `${message.platform}:${message.userId}`;
}

function getReminderCount(message) {
    const ownerKey = getOwnerKey(message);
    return loadSchedules().filter(schedule =>
        schedule.meta?.kind === "reminder" &&
        schedule.meta.ownerKey === ownerKey &&
        !schedule.state?.done
    ).length;
}

function formatMention(message) {
    if (isPrivateChat(message)) return "";
    if (message.platform === "discord") return `<@${message.userId}> `;
    if (message.platform === "whatsapp") return `@${String(message.userId).split("@")[0]} `;
    if (message.username) return `@${message.username} `;
    return "";
}

function helpText(message) {
    return [
        "🔔 *LEMBRETES*",
        `Use \`${message.prefix}lembrete 2h dar bump no server\` para lembrar daqui a um intervalo.`,
        `Use \`${message.prefix}lembrete 12:00 fazer o sorteio\` para lembrar em um horário.`,
        `Você pode manter no máximo ${MAX_REMINDERS} lembretes ativos.`
    ].join("\n");
}

async function execute(message) {
    if (!isPrivateChat(message) && !message.sender?.isAdmin && !message.sender?.isOwner) {
        await message.reply({ text: "❌ Em grupos, o comando lembrete está disponível apenas para administradores." });
        return;
    }

    const args = message.args || [];
    if (!args.length || ["ajuda", "help"].includes(String(args[0]).toLowerCase())) {
        await message.reply({ text: helpText(message) });
        return;
    }

    const reminderText = message.getArgText(1).trim();
    if (!reminderText) {
        await message.reply({ text: `❌ Informe o texto do lembrete.\nExemplo: \`${message.prefix}lembrete 2h dar bump no server\`` });
        return;
    }

    const intervalMs = parseIntervalToMs(args[0]);
    const fixedTime = parseFixedTime(args[0]);
    if (!intervalMs && !fixedTime) {
        await message.reply({
            text: `❌ Tempo inválido. Use um intervalo como \`2h\`, \`30m\` ou um horário como \`12:00\`.`
        });
        return;
    }

    const currentCount = getReminderCount(message);
    if (currentCount >= MAX_REMINDERS) {
        await message.reply({ text: `❌ Você já possui ${MAX_REMINDERS} lembretes ativos, que é o limite por pessoa.` });
        return;
    }

    const ownerKey = getOwnerKey(message);
    const mention = formatMention(message);
    const schedule = addSchedule({
        name: `Lembrete de ${message.displayName || message.username || message.userId}`,
        chatId: message.chatId,
        threadId: message.threadId,
        platform: message.platform
    });

    const trigger = intervalMs
        ? { type: "interval", intervalMs, times: [] }
        : { type: "fixed", times: [fixedTime], intervalMs: 0 };

    editSchedule(schedule.id, {
        enabled: true,
        trigger,
        repeat: { mode: "once", days: [], monthDay: null },
        message: { text: `${mention}🔔 Lembrete: ${reminderText}`, mode: "text", media: null },
        meta: {
            kind: "reminder",
            ownerKey,
            ownerId: String(message.userId),
            mentions: message.platform === "whatsapp" && !isPrivateChat(message)
                ? [String(message.userId)]
                : []
        }
    });

    const saved = loadSchedules().find(item => item.id === schedule.id);
    await message.reply({
        text: `✅ Lembrete marcado para ${formatTs(saved?.state?.nextFireAt)}.\nVocê ainda pode criar ${MAX_REMINDERS - currentCount - 1} lembrete(s).`
    });
}

module.exports = {
    name: "lembrete",
    aliases: ["reminder"],
    category: "utilitários",
    description: "Cria até três lembretes pessoais, enviados uma vez após um intervalo (como 2h ou 30m) ou em um horário do dia (HH:MM). Em grupos, somente administradores podem criar lembretes.",
    usage: "{prefix}lembrete <intervalo|HH:MM> <texto>",
    examples: [
        "{prefix}lembrete 2h dar bump no server",
        "{prefix}lembrete 30m verificar o forno",
        "{prefix}lembrete 12:00 fazer o sorteio"
    ],
    execute
};
