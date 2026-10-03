const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { readProfile, readRanking } = require("./webServer");
const { fetchBuffer } = require("./api");
const config = require("./config");
const { resolvePlatformProfile } = require("./profiles");
const { getTestInfo } = require("./testeHelper");

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

function baseSvg(width, height, title, subtitle, body, titleX = 70) {
    const botName = config.getBotName();
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#27365d"/><stop offset="0.55" stop-color="#111827"/><stop offset="1" stop-color="#090b10"/></linearGradient></defs>
<rect width="${width}" height="${height}" fill="url(#bg)"/>
<rect x="28" y="28" width="${width - 56}" height="${height - 56}" rx="26" fill="#111521dd" stroke="#334366"/>
${text(botName, 70, 88, 24, "#7ea7ff", 800)}
    ${text(title, titleX, 140, 38, "#f5f7fb", 800)}
    ${text(subtitle, titleX, 174, 16, "#9da8bd")}
${body}
${text(`${botName} • economia e experiência local`, 70, height - 50, 14, "#71809d")}
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
    let avatarBuffer = null;
    let avatarUrl = profile.platform === "discord" ? profile.avatarUrl : null;
    if (profile.platform === "telegram") {
        const platformProfile = await resolvePlatformProfile("telegram", message.userId, {
            raw: message.raw,
            username: message.username
        });
        avatarUrl = platformProfile?.avatarUrl || null;
    }

    try {
        if (profile.platform !== "whatsapp" && avatarUrl) {
            const avatarMask = Buffer.from(
                '<svg width="96" height="96" xmlns="http://www.w3.org/2000/svg"><circle cx="48" cy="48" r="48" fill="white"/></svg>'
            );
            const avatarImage = await fetchBuffer(avatarUrl);
            avatarBuffer = await sharp(avatarImage)
                .resize(96, 96, { fit: "cover" })
                .composite([{ input: avatarMask, blend: "dest-in" }])
                .png()
                .toBuffer();
        }
    } catch (error) {
        console.warn(`[IMG_PERFIL] Não foi possível carregar a imagem de perfil de ${profile.userId}:`, error.message || error);
    }
    if (!avatarBuffer) {
        try {
            const placeholderPath = path.join(__dirname, "..", "commands", "semfoto.jpg");
            avatarBuffer = await sharp(await fs.promises.readFile(placeholderPath))
                .resize(96, 96, { fit: "cover" })
                .png()
                .toBuffer();
        } catch (error) {
            console.error(`[IMG_PERFIL] Não foi possível carregar a imagem padrão de perfil:`, error.message || error);
        }
    }
    const body = [
        `<rect x="70" y="205" width="1060" height="64" rx="14" fill="#0e1422"/>`,
        text(`${profile.groupName} • ${profile.platform} • ID ${profile.userId}`, 94, 245, 16, "#b7c5e7"),
        card(70, 295, 510, "SATCOINS", formatMoney(profile.economy.balance), `Posição no dinheiro: ${moneyPosition}`, "#8ff0bf"),
        card(600, 295, 530, "XP • NÍVEL", `${profile.xp.value} XP • Nível ${profile.xp.level}`, `Posição no XP: ${xpPosition}`),
        card(70, 445, 510, "ATIVIDADE", profile.activity.total, `Posição no ranking: ${profile.activity.position ? `#${profile.activity.position}` : "Não classificado"}`),
        card(600, 445, 530, "NOFAP", nofap, `Recorde: ${profile.nofap.recordDays || 0} dias • Resets: ${profile.nofap.totalResets || 0}`)
    ].join("");
    const image = sharp(Buffer.from(baseSvg(
        1200,
        650,
        profile.name,
        `Perfil de ${profile.name}`,
        body,
        avatarBuffer ? 190 : 70
    )));
    if (avatarBuffer) {
        image.composite([{ input: avatarBuffer, left: 70, top: 102 }]);
    }
    return {
        buffer: await image.png().toBuffer(),
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

async function renderCoupleTest(message, pair, percentage) {
    const people = await Promise.all(pair.map(async (target, index) => {
        const isAuthor = String(target.id) === String(message.userId);
        const profile = await resolvePlatformProfile(message.platform, target.id, isAuthor
            ? { raw: message.raw, username: message.username }
            : {});
        const name = resolveCoupleDisplayName(target.name, profile?.name, index);
        const avatar = await loadCoupleAvatar(profile?.avatarUrl, target.id);
        return { name, avatar };
    }));
    const childName = mixNames(people[0].name, people[1].name);
    const test = getTestInfo("casal2");
    const result = test.results[percentage >= 85 ? 4 : percentage >= 70 ? 3 : percentage >= 50 ? 2 : percentage >= 25 ? 1 : 0];
    const botName = config.getBotName();
    const title = "Teste de compatibilidade";
    const body = [
        `<circle cx="340" cy="302" r="104" fill="#57233d" stroke="#ff8db5" stroke-width="5"/>`,
        `<circle cx="860" cy="302" r="104" fill="#57233d" stroke="#ff8db5" stroke-width="5"/>`,
        text(initials(people[0].name), 340, 325, 60, "#ffe0ec", 800, "middle"),
        text(initials(people[1].name), 860, 325, 60, "#ffe0ec", 800, "middle"),
        `<g transform="translate(600 304) scale(1.25)" fill="#ff6b9d"><path d="M0 20C-10 11-23 2-23-9c0-12 16-17 23-5 7-12 23-7 23 5 0 11-13 20-23 29Z"/></g>`,
        text(fitCoupleName(people[0].name), 340, 440, coupleNameFont(people[0].name), "#fff5f8", 800, "middle"),
        text("♡  COMBINA COM  ♡", 600, 452, 15, "#ff9cbb", 700, "middle"),
        text(fitCoupleName(people[1].name), 860, 440, coupleNameFont(people[1].name), "#fff5f8", 800, "middle"),
        `<rect x="200" y="478" width="800" height="104" rx="26" fill="#3b1e32" stroke="#a94469" stroke-width="2"/>`,
        text(`COMPATIBILIDADE  •  ${percentage}%`, 600, 518, 20, "#ffd1e0", 800, "middle"),
        `<rect x="300" y="540" width="600" height="16" rx="8" fill="#6b334e"/>`,
        `<rect x="300" y="540" width="${Math.round(percentage * 6)}" height="16" rx="8" fill="url(#score)"/>`,
        `<rect x="250" y="604" width="700" height="82" rx="24" fill="#321b2b" stroke="#87435e"/>`,
        text("👶 NOME DO FILHO(A)", 600, 634, 14, "#f3a9c3", 700, "middle"),
        text(fitCoupleName(childName, 26), 600, 671, coupleNameFont(childName, 42), "#fff1f6", 800, "middle"),
        text("❤", 282, 651, 23, "#ff6b9d", 700, "middle"),
        text("❤", 918, 651, 23, "#ff6b9d", 700, "middle"),
        text(`${botName} • teste romântico`, 600, 728, 13, "#cb8ba5", 600, "middle")
    ].join("");
    const svg = `<svg width="1200" height="760" viewBox="0 0 1200 760" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="romance-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b1837"/><stop offset="0.5" stop-color="#241426"/><stop offset="1" stop-color="#120f19"/></linearGradient>
  <linearGradient id="score" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff789e"/><stop offset="1" stop-color="#ffb4cb"/></linearGradient>
  <radialGradient id="glow"><stop offset="0" stop-color="#b53d6b" stop-opacity=".42"/><stop offset="1" stop-color="#b53d6b" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1200" height="760" fill="url(#romance-bg)"/>
<circle cx="140" cy="200" r="240" fill="url(#glow)"/><circle cx="1060" cy="390" r="300" fill="url(#glow)"/>
<rect x="28" y="28" width="1144" height="704" rx="34" fill="#160f1caa" stroke="#773451" stroke-width="2"/>
${text("♥", 160, 120, 22, "#d95782", 700, "middle")}${text("♥", 1040, 172, 18, "#d95782", 700, "middle")}
${text(botName, 600, 78, 18, "#ff9cbb", 800, "middle")}
${text(title, 600, 122, 34, "#fff0f5", 800, "middle")}
${text("Duas pessoas, uma história e um futuro cheio de amor...", 600, 155, 16, "#d6a9ba", 400, "middle")}
${body}
</svg>`;
    const composites = people
        .map((person, index) => person.avatar ? {
            input: person.avatar,
            left: index === 0 ? 245 : 765,
            top: 207
        } : null)
        .filter(Boolean);
    composites.push({
        input: Buffer.from(`<svg width="1200" height="760" xmlns="http://www.w3.org/2000/svg">
<circle cx="340" cy="302" r="102" fill="none" stroke="#ff8db5" stroke-width="5"/>
<circle cx="860" cy="302" r="102" fill="none" stroke="#ff8db5" stroke-width="5"/>
</svg>`)
    });
    const buffer = await sharp(Buffer.from(svg))
        .composite(composites)
        .png()
        .toBuffer();
    return {
        buffer,
        caption: `💘 ${people[0].name} + ${people[1].name}\n👶 Nome do filho(a): ${childName}\n✨ Compatibilidade: ${percentage}% — ${result}`
    };
}

async function loadCoupleAvatar(avatarUrl, userId) {
    if (avatarUrl) {
        try {
            const image = await fetchBuffer(avatarUrl);
            const mask = Buffer.from('<svg width="196" height="196" xmlns="http://www.w3.org/2000/svg"><circle cx="98" cy="98" r="98" fill="white"/></svg>');
            return await sharp(image)
                .resize(196, 196, { fit: "cover" })
                .composite([{ input: mask, blend: "dest-in" }])
                .png()
                .toBuffer();
        } catch (error) {
            console.warn(`[TESTAR_CASAL2] Falha ao carregar o avatar de ${userId}; usando imagem padrão:`, error.message || error);
        }
    }

    try {
        const placeholder = await fs.promises.readFile(path.join(__dirname, "..", "commands", "semfoto.jpg"));
        const mask = Buffer.from('<svg width="196" height="196" xmlns="http://www.w3.org/2000/svg"><circle cx="98" cy="98" r="98" fill="white"/></svg>');
        return await sharp(placeholder)
            .resize(196, 196, { fit: "cover" })
            .composite([{ input: mask, blend: "dest-in" }])
            .png()
            .toBuffer();
    } catch (error) {
        console.error("[TESTAR_CASAL2] Não foi possível carregar a imagem padrão de perfil:", error.message || error);
        return null;
    }
}

function resolveCoupleDisplayName(targetName, profileName, index) {
    const providedName = String(targetName || "").trim();
    const normalizedName = providedName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const isFallback = !providedName ||
        /^<@!?\d+>$/.test(providedName) ||
        /^@[\d:+.-]+$/.test(providedName) ||
        ["usuario", "participante"].includes(normalizedName);
    if (isFallback) return String(profileName || `Pessoa ${index + 1}`).trim();
    return providedName || `Pessoa ${index + 1}`;
}

function initials(name) {
    return String(name)
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => Array.from(part)[0] || "")
        .join("")
        .toLocaleUpperCase("pt-BR");
}

function coupleNameFont(name, maxSize = 32) {
    const length = Array.from(String(name)).length;
    return Math.max(12, Math.min(maxSize, Math.floor(440 / (Math.max(length, 1) * 0.65))));
}

function fitCoupleName(name, maxLength = 26) {
    const characters = Array.from(String(name));
    return characters.length > maxLength
        ? `${characters.slice(0, maxLength - 1).join("")}…`
        : String(name);
}

function mixNames(nameA, nameB) {
    const first = String(nameA).trim().split(/\s+/)[0];
    const second = String(nameB).trim().split(/\s+/)[0];
    const lettersA = Array.from(first);
    const lettersB = Array.from(second);
    const firstHalfA = Math.ceil(lettersA.length / 2);
    const firstHalfB = Math.ceil(lettersB.length / 2);
    const candidates = [
        lettersA.slice(0, firstHalfA).join("") + lettersB.slice(Math.floor(lettersB.length / 2)).join(""),
        lettersB.slice(0, firstHalfB).join("") + lettersA.join("")
    ].filter(Boolean);
    const normalizedFirst = candidates[0]?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const childName = normalizedFirst === "anao" ? candidates[1] : candidates[0] || candidates[1] || "Amor";
    const lowerCaseName = childName.toLocaleLowerCase("pt-BR");
    return lowerCaseName.charAt(0).toLocaleUpperCase("pt-BR") + lowerCaseName.slice(1);
}

function messageScope(message) {
    const platform = String(message.platform || "").toLowerCase();
    const groupId = platform === "discord"
        ? message.raw?.guild?.id || message.raw?.guildId || message.guildId
        : message.chatId;
    return platform && groupId ? { platform, id: String(groupId) } : null;
}

module.exports = { renderProfile, renderRanking, renderCoupleTest };
