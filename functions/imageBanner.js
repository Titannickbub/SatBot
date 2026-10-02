const sharp = require("sharp");
const { readProfile, readRanking } = require("./webServer");

function escapeXml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function formatMoney(cents) {
    return `${(Number(cents || 0) / 100).toFixed(2)}💷`;
}

function createQuery(values) {
    const query = new URLSearchParams(values).toString();
    return new URL(`http://localhost/?${query}`);
}

function text(value, x, y, size, color = "#f5f7fb", weight = 400, anchor = "start") {
    return `<text x="${x}" y="${y}" fill="${color}" font-family="Arial,Segoe UI,sans-serif" font-size="${size}px" font-weight="${weight}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
}

function card(x, y, width, label, value, detail, valueColor = "#f5f7fb") {
    return [
        `<rect x="${x}" y="${y}" width="${width}" height="130" rx="18" fill="#202a40" stroke="#334566"/>`,
        text(label, x + 22, y + 32, 14, "#9da8bd", 700),
        text(value, x + 22, y + 76, 28, valueColor, 800),
        text(detail, x + 22, y + 108, 14, "#b8c3d9")
    ].join("");
}

function baseSvg(width, height, title, subtitle, body) {
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#27365d"/><stop offset="0.55" stop-color="#111827"/><stop offset="1" stop-color="#090b10"/></linearGradient></defs>
<rect width="${width}" height="${height}" fill="url(#bg)"/>
<rect x="28" y="28" width="${width - 56}" height="${height - 56}" rx="26" fill="#111521dd" stroke="#334366"/>
${text("SATBOT", 70, 88, 24, "#7ea7ff", 800)}
${text(title, 70, 140, 38, "#f5f7fb", 800)}
${text(subtitle, 70, 174, 16, "#9da8bd")}
${body}
${text("SatBot • economia e experiência local", 70, height - 50, 14, "#71809d")}
</svg>`;
}

async function renderProfile(message) {
    const scope = messageScope(message);
    if (!scope) return { error: "Este comando só pode ser usado em grupo ou servidor." };
    const profile = await readProfile(createQuery({
        grupo: scope.id,
        plataforma: scope.platform,
        usuario: String(message.userId)
    }));
    if (profile.error) return profile;

    const moneyPosition = profile.economy.position ? `#${profile.economy.position}` : "Não classificado";
    const xpPosition = profile.xp.position ? `#${profile.xp.position}` : "Não classificado";
    const nofap = profile.nofap.active
        ? `${profile.nofap.currentDays} dias • ${profile.nofap.title}`
        : "Inativo";
    const body = [
        `<rect x="70" y="205" width="1060" height="64" rx="14" fill="#0e1422"/>`,
        text(`${profile.groupName} • ${profile.platform} • ID ${profile.userId}`, 94, 245, 16, "#b7c5e7"),
        card(70, 295, 510, "SATCOINS", formatMoney(profile.economy.balance), `Posição no dinheiro: ${moneyPosition}`, "#8ff0bf"),
        card(600, 295, 530, "XP", profile.xp.value, `Posição no XP: ${xpPosition}`),
        card(70, 445, 510, "NÍVEL", profile.xp.level, "Nível de experiência"),
        card(600, 445, 530, "NOFAP", nofap, `Recorde: ${profile.nofap.recordDays || 0} dias • Resets: ${profile.nofap.totalResets || 0}`)
    ].join("");
    return {
        buffer: await sharp(Buffer.from(baseSvg(1200, 650, profile.name, `Perfil de ${profile.name}`, body))).png().toBuffer(),
        caption: `👤 Perfil de ${profile.name}\n🏠 ${profile.groupName}`
    };
}

async function renderRanking(message, type, order = "rich") {
    const scope = messageScope(message);
    if (!scope) return { error: "Este comando só pode ser usado em grupo ou servidor." };
    const ranking = await readRanking(createQuery({
        grupo: scope.id,
        plataforma: scope.platform
    }), type, order);
    if (ranking.error) return ranking;

    const isXp = type === "xp";
    const isActivity = type === "activity";
    const isPoor = order === "poor";
    const rows = Array.from({ length: 5 }, (_, index) => {
        const entry = ranking.entries[index];
        const y = 292 + index * 54;
        const position = entry ? `#${entry.position}` : `#${index + 1}`;
        const name = entry?.name || "Perfil não encontrado";
        const metric = entry
            ? isXp
                ? `${entry.xp} XP • nível ${entry.level}`
                : isActivity
                    ? `${entry.total} atividades • hoje ${entry.dailyTotal || 0}`
                : formatMoney(entry.balance)
            : "—";
        return [
            text(position, 94, y, 17, "#8eaaff", 800),
            text(name, 180, y, 17, entry ? "#f5f7fb" : "#9da8bd", 700),
            text(metric, 1080, y, 16, entry ? (isXp ? "#b8c3d9" : "#8ff0bf") : "#71809d", 700, "end")
        ].join("");
    }).join("");
    const body = [
        `<rect x="70" y="198" width="1060" height="390" rx="18" fill="#202a40" stroke="#334566"/>`,
        text(`${ranking.groupName} • ${ranking.platform}`, 94, 238, 16, "#b7c5e7"),
        rows
    ].join("");
    return {
        buffer: await sharp(Buffer.from(baseSvg(
            1200,
            650,
            `${isPoor ? "Piores" : "Melhores"} ranking de ${isXp ? "XP" : isActivity ? "atividade" : "Satcoins"}`,
            `${isPoor ? "5 menores" : "5 maiores"} do grupo/servidor`,
            body
        ))).png().toBuffer(),
        caption: `🏆 ${isPoor ? "5 piores" : "5 melhores"} — ${isXp ? "Ranking de XP" : isActivity ? "Ranking de atividade" : "Ranking de satcoins"}\n🏠 ${ranking.groupName}`
    };
}

function messageScope(message) {
    const platform = String(message.platform || "").toLowerCase();
    const groupId = platform === "discord"
        ? message.raw?.guild?.id || message.raw?.guildId || message.guildId
        : message.chatId;
    return platform && groupId ? { platform, id: String(groupId) } : null;
}

module.exports = { renderProfile, renderRanking };
