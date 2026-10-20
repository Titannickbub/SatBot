const economy = require("./economy");

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeMarkdown(value) {
    return String(value ?? "").replace(/([*_~`\\])/g, "\\$1");
}

function createResetNotice(activityName) {
    const now = new Date();
    const resetAt = new Date(now);
    resetAt.setHours(24, 0, 0, 0);
    const secondsRemaining = Math.max(0, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));
    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);
    const seconds = secondsRemaining % 60;
    const pronoun = activityName === "trabalhos" ? "seus" : "suas";
    return `⏳ Você já usou ${pronoun} ${activityName} de hoje. Resete na loja ou aguarde a próxima virada do dia em ${hours}h ${minutes}m ${seconds}s.`;
}

function formatAmount(amount) {
    if (amount < 0) return `❌ Saldo perdido: ${economy.formatMoney(Math.abs(amount))}`;
    if (amount === 0) return "➖ Sem ganho ou perda: nenhum satcoin";
    return `💰 Saldo ganho: ${economy.formatMoney(amount)}`;
}

async function replyWorkActivity(message, {
    title,
    emoji,
    name,
    status,
    amount,
    balance,
    remaining,
    remainingLabel,
    activityLabel,
    resultLabel,
    resultValue,
    extraLabel,
    extraValue,
    xp
}) {
    const isLimited = remaining === null || remaining === undefined;
    const resetNotice = isLimited ? createResetNotice(activityLabel) : null;
    if (message.platform === "discord") {
        const fields = [
            { name: "🏷️ Nome", value: String(name || "Membro"), inline: true }
        ];
        if (!isLimited) {
            if (resultLabel && resultValue !== null && resultValue !== undefined) {
                fields.push({ name: resultLabel, value: String(resultValue), inline: true });
            }
            if (extraLabel && extraValue !== null && extraValue !== undefined) {
                fields.push({ name: extraLabel, value: String(extraValue), inline: true });
            }
            fields.push(
                { name: "💰 Resultado", value: formatAmount(amount), inline: false },
                { name: "🏦 Saldo atual", value: economy.formatMoney(balance), inline: true },
                { name: `${emoji} ${remainingLabel} restantes hoje`, value: String(remaining), inline: true }
            );
            if (xp !== null && xp !== undefined) {
                fields.push({ name: "✳️ XP da atividade", value: `+${xp}`, inline: true });
            }
        }

        return message.reply({
            embed: {
                color: isLimited ? 0xF1C40F : amount < 0 ? 0xE74C3C : amount === 0 ? 0x95A5A6 : 0x2ECC71,
                title: `${emoji} ${title}`,
                description: isLimited ? resetNotice : String(status || ""),
                fields,
                footer: { text: "Economia local deste servidor" }
            }
        });
    }

    const isTelegram = message.platform === "telegram";
    const escape = isTelegram ? escapeHtml : escapeMarkdown;
    const bold = value => isTelegram ? `<b>${escapeHtml(value)}</b>` : `*${escapeMarkdown(value)}*`;
    const heading = isTelegram ? `<b>${emoji} ${title}</b>` : `*${emoji} ${title}*`;
    const lines = [heading, "━━━━━━━━━━━━━━━━━━━━━━"];
    if (isLimited) {
        lines.push(resetNotice);
    } else {
        lines.push(
            `🏷️Nome: ${bold(name)}`,
            resultLabel && resultValue !== null && resultValue !== undefined
                ? `${resultLabel}: ${escape(resultValue)}`
                : null,
            extraLabel && extraValue !== null && extraValue !== undefined
                ? `${extraLabel}: ${escape(extraValue)}`
                : null,
            formatAmount(amount),
            `🏦Saldo atual: ${economy.formatMoney(balance)}`,
            `${emoji}${remainingLabel} restantes hoje: ${remaining}`,
            xp === null || xp === undefined ? null : `✳️XP da atividade: +${xp}`,
            "",
            escape(status)
        );
    }

    return message.reply({
        text: lines.filter(line => line !== null && line !== undefined).join("\n"),
        ...(isTelegram ? { parse_mode: "HTML" } : {})
    });
}

module.exports = { replyWorkActivity };
