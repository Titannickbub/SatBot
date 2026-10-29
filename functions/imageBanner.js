const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { readProfile, readRanking } = require("./webServer");
const { fetchBuffer } = require("./api");
const config = require("./config");
const { resolvePlatformProfile } = require("./profiles");
const { cleanJid } = require("./moderationHelper");
const marriage = require("./marriageService");
const activity = require("./activity");
const economy = require("./economy");
const xp = require("./xp");
const profileCosmetics = require("./profileCosmetics");

function escapeXml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function formatMoney(cents) {
    return `${(Number(cents || 0) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}💷`;
}

function createQuery(values) {
    const query = new URLSearchParams(values).toString();
    return new URL(`http://localhost/?${query}`);
}

function text(value, x, y, size, color = "#f5f7fb", weight = 400, anchor = "start") {
    return `<text x="${x}" y="${y}" fill="${color}" font-family="Arial,Segoe UI,sans-serif" font-size="${size}px" font-weight="${weight}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
}

function card(x, y, width, label, value, detail, valueColor = "#f5f7fb", theme) {
    return [
        `<rect x="${x}" y="${y}" width="${width}" height="130" rx="18" fill="${theme?.stops[1] || "#202a40"}" stroke="${theme?.accent || "#334566"}"/>`,
        text(label, x + 22, y + 32, 14, "#9da8bd", 700),
        text(value, x + 22, y + 76, 28, valueColor, 800),
        text(detail, x + 22, y + 108, 14, "#b8c3d9")
    ].join("");
}

function baseSvg(width, height, title, subtitle, body, titleX = 70, theme) {
    const botName = config.getBotName();
    const stops = theme?.stops || ["#27365d", "#111827", "#090b10"];
    const panelFill = theme ? `${stops[2]}dd` : "#111521dd";
    const panelStroke = theme?.accent || "#334366";
    const brandColor = theme?.accent || "#7ea7ff";
    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${stops[0]}"/><stop offset="0.55" stop-color="${stops[1]}"/><stop offset="1" stop-color="${stops[2]}"/></linearGradient></defs>
<rect width="${width}" height="${height}" fill="url(#bg)"/>
<rect x="28" y="28" width="${width - 56}" height="${height - 56}" rx="26" fill="${panelFill}" stroke="${panelStroke}"/>
${text(botName, 70, 88, 24, brandColor, 800)}
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
    }), { allowEmpty: true });
    if (profile.error) return profile;

    const marriages = Array.isArray(profile.marriages) && profile.marriages.length
        ? profile.marriages
        : profile.marriage ? [profile.marriage] : [];
    const currentMarriage = marriages[0] || profile.marriage || null;
    const moneyPosition = profile.economy.position ? `#${profile.economy.position}` : "Não classificado";
    const xpPosition = profile.xp.position ? `#${profile.xp.position}` : "Não classificado";
    const marriageValue = currentMarriage
        ? currentMarriage.selfMarriage
            ? "Casado(a) consigo"
            : fitCoupleName(currentMarriage.partnerName, 22)
        : "Solteiro(a)";
    const marriageDetail = currentMarriage
        ? `Há ${currentMarriage.duration} • desde ${new Date(currentMarriage.marriedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
        : "Sem casamento neste grupo/servidor";
    const backgroundTheme = profileCosmetics.getProfileBackground(profile.economy.background);
    let avatarBuffer = null;
    let avatarUrl = profile.platform === "discord" ? profile.avatarUrl : null;
    if (profile.platform !== "discord" || !avatarUrl) {
        const platformProfile = await resolvePlatformProfile(profile.platform, message.userId, {
            raw: message.raw,
            username: message.username
        });
        avatarUrl = platformProfile?.avatarUrl || null;
    }

    try {
        if (avatarUrl) {
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
    let partnerAvatarBuffer = null;
    let partnerBackgroundTheme = null;
    let multiPartnerAvatars = [];
    if (marriages.length === 1 && currentMarriage && !currentMarriage.selfMarriage && currentMarriage.partnerId) {
        const partnerProfile = await resolvePlatformProfile(profile.platform, currentMarriage.partnerId, {
            centralAccounts: message.functions?.centralAccounts
        });
        const partnerBackground = economy.getProfileCosmetics(message, currentMarriage.partnerId).background;
        partnerBackgroundTheme = profileCosmetics.getProfileBackground(partnerBackground);
        const partnerAvatar = await loadCoupleAvatar(partnerProfile?.avatarUrl, currentMarriage.partnerId);
        if (partnerAvatar) {
            partnerAvatarBuffer = await sharp(partnerAvatar).resize(76, 76).png().toBuffer();
        }
    } else if (marriages.length > 1) {
        multiPartnerAvatars = await Promise.all(marriages.slice(0, 3).map(async relationship => {
            const partnerId = String(relationship.partnerId);
            const partnerAvatarUrl = partnerId === String(profile.userId)
                ? avatarUrl
                : (await resolvePlatformProfile(profile.platform, partnerId, {
                    centralAccounts: message.functions?.centralAccounts
                }))?.avatarUrl;
            const avatar = await loadCoupleAvatar(partnerAvatarUrl, partnerId);
            return avatar ? sharp(avatar).resize(76, 76).png().toBuffer() : null;
        }));
    }
    const marriageTheme = currentMarriage && !currentMarriage.selfMarriage
        ? partnerBackgroundTheme
        : backgroundTheme;
    const marriageCard = marriages.length > 1
        ? [
            `<rect x="600" y="445" width="530" height="130" rx="18" fill="${backgroundTheme?.stops[1] || "#202a40"}" stroke="${backgroundTheme?.accent || "#334566"}"/>`,
            text("CASAMENTO", 622, 477, 14, "#9da8bd", 700)
        ].join("")
        : currentMarriage && !currentMarriage.selfMarriage
            ? [
                `<rect x="600" y="445" width="530" height="130" rx="18" fill="${marriageTheme?.stops[1] || "#202a40"}" stroke="${marriageTheme?.accent || "#334566"}"/>`,
                text("CASAMENTO", 622, 477, 14, "#9da8bd", 700),
                `<circle cx="660" cy="526" r="42" fill="${marriageTheme?.stops[2] || "#0e1422"}" stroke="${marriageTheme?.accent || "#e9a8c6"}" stroke-width="3"/>`,
                text(fitCoupleName(currentMarriage.partnerName, 22), 716, 530, 19, "#f5f7fb", 800),
                text(marriageDetail, 716, 557, 12, "#b8c3d9")
            ].join("")
            : card(600, 445, 530, "CASAMENTO", marriageValue, marriageDetail, "#f5f7fb", backgroundTheme);
    const body = [
        `<rect x="70" y="205" width="1060" height="64" rx="14" fill="${backgroundTheme?.stops[2] || "#0e1422"}"/>`,
        text(`${profile.groupName} • ${profile.platform} • ID ${profile.userId}`, 94, 245, 16, "#b7c5e7"),
        card(70, 295, 510, "SATCOINS", formatMoney(profile.economy.balance), `Posição no dinheiro: ${moneyPosition}`, "#8ff0bf", backgroundTheme),
        card(600, 295, 530, "XP • NÍVEL", `${profile.xp.value} XP • Nível ${profile.xp.level}`, `Posição no XP: ${xpPosition}`, "#f5f7fb", backgroundTheme),
        card(70, 445, 510, "ATIVIDADE", profile.activity.total, `Posição no ranking: ${profile.activity.position ? `#${profile.activity.position}` : "Não classificado"}`, "#f5f7fb", backgroundTheme),
        marriageCard
    ].join("");
    const image = sharp(Buffer.from(baseSvg(
        1200,
        650,
        profile.name,
        `Perfil de ${profile.name}`,
        body,
        avatarBuffer ? 190 : 70,
        backgroundTheme
    )));
    const composites = [];
    if (avatarBuffer) composites.push({ input: avatarBuffer, left: 70, top: 102 });
    if (partnerAvatarBuffer) composites.push({ input: partnerAvatarBuffer, left: 622, top: 488 });
    if (multiPartnerAvatars.length) {
        const visibleAvatars = multiPartnerAvatars.filter(Boolean);
        const hasMoreRelationships = marriages.length > 3;
        const itemCount = visibleAvatars.length + (hasMoreRelationships ? 1 : 0);
        const avatarSize = 76;
        const gap = 24;
        const totalWidth = itemCount * avatarSize + Math.max(0, itemCount - 1) * gap;
        const startX = 600 + (530 - totalWidth) / 2;
        const avatarTop = 488;
        const frames = [];
        visibleAvatars.forEach((avatar, index) => {
            const left = startX + index * (avatarSize + gap);
            composites.push({ input: avatar, left, top: avatarTop });
            frames.push(`<circle cx="${left + avatarSize / 2}" cy="${avatarTop + avatarSize / 2}" r="38" fill="none" stroke="#e9a8c6" stroke-width="3"/>`);
        });
        if (hasMoreRelationships) {
            const left = startX + visibleAvatars.length * (avatarSize + gap);
            frames.push(`<circle cx="${left + avatarSize / 2}" cy="${avatarTop + avatarSize / 2}" r="38" fill="#352338" stroke="#e9a8c6" stroke-width="3"/>`);
            frames.push(text("+", left + avatarSize / 2, avatarTop + 50, 36, "#fff3f8", 800, "middle"));
        }
        composites.push({
            input: Buffer.from(`<svg width="1200" height="650" xmlns="http://www.w3.org/2000/svg">${frames.join("")}</svg>`)
        });
    }
    if (composites.length) image.composite(composites);
    return {
        buffer: await image.png().toBuffer(),
        caption: `👤 Perfil de ${profile.name}\n🏠 ${profile.groupName}`
    };
}

async function renderProfileBackgroundPreview(backgroundKey) {
    const background = profileCosmetics.getProfileBackground(backgroundKey);
    if (!background) return { error: "Cor inválida." };

    const body = [
        `<rect x="70" y="215" width="1060" height="340" rx="24" fill="${background.stops[2]}" stroke="${background.accent}" stroke-width="2"/>`,
        text("PRÉVIA DO FUNDO", 105, 270, 16, background.accent, 800),
        text("Seu perfil com este visual", 105, 323, 30, "#f5f7fb", 800),
        `<rect x="105" y="355" width="990" height="150" rx="18" fill="${background.stops[1]}" stroke="${background.accent}" stroke-opacity=".55"/>`,
        `<circle cx="170" cy="430" r="36" fill="${background.stops[0]}" stroke="${background.accent}" stroke-width="3"/>`,
        text("U", 170, 439, 25, "#f5f7fb", 800, "middle"),
        text("Seu nome", 230, 415, 22, "#f5f7fb", 800),
        text("Destaques e cartões usam esta paleta", 230, 449, 16, "#b8c3d9"),
        `<rect x="820" y="390" width="235" height="70" rx="14" fill="${background.stops[2]}" stroke="${background.accent}"/>`,
        text(background.label, 937, 433, 21, background.accent, 800, "middle"),
        text("A imagem é apenas uma prévia; nada será comprado ou alterado.", 105, 535, 15, "#b8c3d9")
    ].join("");
    const buffer = await sharp(Buffer.from(baseSvg(
        1200,
        650,
        `Fundo ${background.label}`,
        "Prévia do cosmético • não altera seu perfil",
        body,
        70,
        background
    ))).png().toBuffer();

    return {
        buffer,
        caption: `🎨 Prévia do fundo ${background.label}. Esta imagem é demonstrativa e não compra nem aplica a cor.`
    };
}

async function renderMarriageBanner(message, currentMarriage = marriage.getMarriage(message)) {
    if (!currentMarriage) return { error: "Você não está casado(a) neste grupo/servidor." };

    const people = await Promise.all([
        { id: String(message.userId), name: currentMarriage.userName || message.displayName || message.username || String(message.userId) },
        { id: String(currentMarriage.partnerId), name: currentMarriage.partnerName || String(currentMarriage.partnerId) }
    ].map(async (person, index) => {
        const isAuthor = index === 0;
        const profile = await resolvePlatformProfile(message.platform, person.id, message.platform === "whatsapp"
            ? {
                ...(isAuthor ? { raw: message.raw, username: message.username } : {}),
                centralAccounts: message.functions?.centralAccounts
            }
            : { raw: isAuthor ? message.raw : undefined, username: person.name });
        return {
            name: resolveCoupleDisplayName(person.name, profile?.name, index),
            avatar: await loadCoupleAvatar(profile?.avatarUrl, person.id),
            background: economy.getProfileCosmetics(message, person.id).background
        };
    }));

    const marriedDate = new Date(currentMarriage.marriedAt);
    const dateLabel = marriedDate.toLocaleString("pt-BR", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo"
    });
    const duration = marriage.formatDuration(currentMarriage.marriedAt);
    const botName = config.getBotName();
    const selfMarriage = currentMarriage.selfMarriage;
    const subtitle = selfMarriage
        ? "Um compromisso especial consigo mesmo(a)"
        : "Uma história escrita a dois";
    const defaultWeddingStops = ["#352044", "#171827", "#10131c"];
    const primaryBackground = profileCosmetics.getProfileBackground(people[0].background);
    const partnerBackground = profileCosmetics.getProfileBackground(people[1].background);
    const leftStops = primaryBackground?.stops || defaultWeddingStops;
    const rightStops = partnerBackground?.stops || defaultWeddingStops;
    const weddingGlow = primaryBackground?.accent || partnerBackground?.accent || "#d18aab";
    const svg = `<svg width="1200" height="680" viewBox="0 0 1200 680" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="wedding-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${leftStops[0]}"/><stop offset=".5" stop-color="${leftStops[1]}"/><stop offset=".5001" stop-color="${rightStops[1]}"/><stop offset="1" stop-color="${rightStops[2]}"/></linearGradient>
  <radialGradient id="wedding-glow"><stop offset="0" stop-color="${weddingGlow}" stop-opacity=".32"/><stop offset="1" stop-color="${weddingGlow}" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1200" height="680" fill="url(#wedding-bg)"/>
<circle cx="190" cy="250" r="280" fill="url(#wedding-glow)"/><circle cx="1010" cy="360" r="300" fill="url(#wedding-glow)"/>
<rect x="28" y="28" width="1144" height="624" rx="34" fill="#111521cc" stroke="#79516d" stroke-width="2"/>
${text(botName, 600, 76, 20, "#e4a9c6", 800, "middle")}
${text("CASAMENTO", 600, 130, 38, "#fff2f8", 800, "middle")}
${text(subtitle, 600, 166, 18, "#d1b1c4", 400, "middle")}
<circle cx="300" cy="310" r="119" fill="#352338" stroke="#e9a8c6" stroke-width="6"/>
<circle cx="900" cy="310" r="119" fill="#352338" stroke="#e9a8c6" stroke-width="6"/>
${text(selfMarriage ? "♥" : "♡", 600, 326, 64, "#f08db7", 800, "middle")}
${text(fitCoupleName(people[0].name, 22), 300, 472, coupleNameFont(people[0].name, 42), "#fff3f8", 800, "middle")}
${text(selfMarriage ? "UMA ESCOLHA DE AMOR-PRÓPRIO" : "JUNTOS DESDE", 600, 469, 16, "#e6a8c4", 700, "middle")}
${text(fitCoupleName(people[1].name, 22), 900, 472, coupleNameFont(people[1].name, 42), "#fff3f8", 800, "middle")}
<rect x="220" y="510" width="760" height="92" rx="24" fill="#241c2b" stroke="#71465f" stroke-width="2"/>
${text(dateLabel, 600, 550, 23, "#fff0f6", 800, "middle")}
${text(`Há ${duration}`, 600, 583, 17, "#d5adc1", 600, "middle")}
${text(`${botName} • ${message.platform}`, 600, 628, 13, "#a8829a", 600, "middle")}
</svg>`;

    const composites = people
        .map((person, index) => person.avatar ? {
            input: person.avatar,
            left: index === 0 ? 202 : 802,
            top: 212
        } : null)
        .filter(Boolean);
    composites.push({
        input: Buffer.from(`<svg width="1200" height="680" xmlns="http://www.w3.org/2000/svg"><circle cx="300" cy="310" r="117" fill="none" stroke="#e9a8c6" stroke-width="6"/><circle cx="900" cy="310" r="117" fill="none" stroke="#e9a8c6" stroke-width="6"/></svg>`)
    });

    return {
        buffer: await sharp(Buffer.from(svg)).composite(composites).png().toBuffer(),
        caption: selfMarriage
            ? `💍 ${people[0].name} está casado(a) consigo mesmo(a) desde ${dateLabel}.`
            : `💍 ${people[0].name} e ${people[1].name}\n📅 Casados desde ${dateLabel}\n⏳ Há ${duration}.`
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
    const entries = ranking.entries.slice(0, 5);
    const currentUserId = String(message.userId || "");
    const currentUserInTop = entries.some(entry => String(entry.userId) === currentUserId);
    if (order !== "poor" && !currentUserInTop && currentUserId) {
        const requester = getRequesterRankingEntry(message, type);
        if (requester) {
            entries[entries.length >= 5 ? 4 : entries.length] = requester;
        }
    }

    const cards = await Promise.all(Array.from({ length: 5 }, async (_, index) => {
        const entry = entries[index];
        if (!entry) return { entry: null, avatar: null };
        if (scope.platform === "whatsapp" && isPoor) {
            const avatar = await loadCoupleAvatar(null, entry.userId);
            return {
                entry,
                avatar: avatar ? await sharp(avatar).resize(136, 136).png().toBuffer() : null,
                background: economy.getProfileCosmetics(message, entry.userId).background
            };
        }

        const profile = await resolvePlatformProfile(scope.platform, entry.userId, {
            ...(String(entry.userId) === currentUserId
                ? { raw: message.raw, username: message.username }
                : {}),
            centralAccounts: message.functions?.centralAccounts
        });
        const avatar = await loadCoupleAvatar(profile?.avatarUrl, entry.userId);
        return {
            entry,
            avatar: avatar ? await sharp(avatar).resize(136, 136).png().toBuffer() : null,
            background: economy.getProfileCosmetics(message, entry.userId).background
        };
    }));

    const cardWidth = 242;
    const cardGap = 20;
    const startX = 55;
    const cardY = 200;
    const cardHeight = 420;
    const title = isXp
        ? "RANKING DE XP"
        : isActivity
            ? "RANKING DE ATIVIDADE"
            : "RANKING DE SATCOINS";
    const cardSvg = cards.map(({ entry, background }, index) => {
        const x = startX + index * (cardWidth + cardGap);
        const colors = ["#667c27", "#a9345c", "#9b4939", "#315d83", "#6d4c8d"];
        const color = colors[index];
        const theme = profileCosmetics.getProfileBackground(background);
        const name = entry?.name || "Perfil não encontrado";
        const clippedName = Array.from(String(name)).slice(0, 20).join("");
        const position = entry?.position === "—" ? "—" : `#${entry?.position || index + 1}`;
        const isRequester = entry &&
            (entry.isRequester || String(entry.userId) === currentUserId);
        const metric = !entry
            ? "—"
            : isXp
                ? `${entry.xp} XP`
                : isActivity
                    ? `${entry.total} atividades`
                    : formatMoney(entry.balance);
        const detail = !entry
            ? "SEM DADOS"
            : isXp
                ? `NÍVEL ${entry.level}`
                : isActivity
                    ? `HOJE ${entry.dailyTotal || 0}`
                    : isPoor
                        ? "MENOR SALDO"
                        : "SALDO";
        return [
            `<rect x="${x}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" rx="22" fill="${theme?.stops[1] || "#161b24"}" stroke="${color}" stroke-width="4"/>`,
            `<path d="M${x + 2} ${cardY + 22} Q${x + 2} ${cardY + 2} ${x + 22} ${cardY + 2} H${x + cardWidth - 22} Q${x + cardWidth - 2} ${cardY + 2} ${x + cardWidth - 2} ${cardY + 22} V${cardY + 178} H${x + 2} Z" fill="${theme?.stops[0] || color}" opacity="0.76"/>`,
            `<circle cx="${x + cardWidth / 2}" cy="${cardY + 91}" r="68" fill="#0c1018" stroke="#f4f1e9" stroke-width="4"/>`,
            text(entry ? position : `#${index + 1}`, x + 18, cardY + 220, 20, "#f4d66b", 800),
            text(clippedName, x + cardWidth / 2, cardY + 265, 20, "#f5f7fb", 800, "middle"),
            text(metric, x + cardWidth / 2, cardY + 327, 25, "#f5f7fb", 800, "middle"),
            text(detail, x + cardWidth / 2, cardY + 367, 15, "#b8c3d9", 700, "middle"),
            isRequester
                ? `<rect x="${x + cardWidth - 76}" y="${cardY + 16}" width="60" height="24" rx="12" fill="#f4d66b"/>${text("VOCÊ", x + cardWidth - 46, cardY + 33, 11, "#171a20", 800, "middle")}`
                : ""
        ].join("");
    }).join("");
    const body = [
        `<rect x="35" y="180" width="1330" height="470" rx="28" fill="#0b0e14" stroke="#343b48" stroke-width="2"/>`,
        cardSvg
    ].join("");
    const composites = cards
        .map(({ avatar }, index) => avatar ? {
            input: avatar,
            left: startX + index * (cardWidth + cardGap) + 53,
            top: cardY + 23
        } : null)
        .filter(Boolean);
    const image = sharp(Buffer.from(baseSvg(
        1400,
        700,
        `${isPoor ? "PIORES" : "TOP 5"} • ${title}`,
        `${ranking.groupName} • ${ranking.platform}`,
        body
    )));
    const rankingName = isXp ? "XP" : isActivity ? "atividade" : "Satcoins";
    return {
        buffer: await image.composite(composites).png().toBuffer(),
        caption: `🏆 ${isPoor ? "5 piores" : "5 melhores"} — Ranking de ${rankingName}\n🏠 ${ranking.groupName}`
    };
}

function getRequesterRankingEntry(message, type) {
    const userId = String(message.userId);
    const displayName = message.displayName || message.name || message.username || userId;
    if (type === "xp") {
        const users = xp.ranking(message);
        const index = users.findIndex(user => String(user.userId) === userId);
        const user = index >= 0 ? users[index] : null;
        return {
            userId,
            name: user?.displayName || user?.username || displayName,
            xp: Number(user?.xp) || 0,
            level: xp.levelForXp(user?.xp || 0).level,
            position: index >= 0 ? index + 1 : "—",
            isRequester: true
        };
    }

    if (type === "activity") {
        const users = activity.ranking(message)?.users || [];
        const index = users.findIndex(user => String(user.userId) === userId);
        const user = index >= 0 ? users[index] : null;
        return {
            userId,
            name: user?.displayName || user?.username || displayName,
            total: Number(user?.total) || 0,
            dailyTotal: Number(user?.dailyTotal) || 0,
            position: index >= 0 ? index + 1 : "—",
            isRequester: true
        };
    }

    const account = economy.getAccountByUser(message, userId);
    return {
        userId,
        name: account?.displayName || account?.username || displayName,
        balance: Number(account?.balance) || 0,
        position: economy.getBalancePosition(message, userId) || "—",
        isRequester: true
    };
}

async function renderCoupleTest(message, pair, percentage) {
    const people = await Promise.all(pair.map(async (target, index) => {
        const isAuthor = message.platform === "whatsapp"
            ? cleanJid(String(target.id)) === cleanJid(String(message.userId))
            : String(target.id) === String(message.userId);
        const profileContext = message.platform === "whatsapp"
            ? {
                ...(isAuthor ? { raw: message.raw, username: message.username } : {}),
                centralAccounts: message.functions?.centralAccounts
            }
            : { raw: message.raw, username: target.name };
        const profile = await resolvePlatformProfile(message.platform, target.id, profileContext);
        const name = resolveCoupleDisplayName(target.name, profile?.name, index);
        const avatar = await loadCoupleAvatar(profile?.avatarUrl, target.id);
        return { name, avatar };
    }));
    const childName = mixNames(people[0].name, people[1].name);
    const botName = config.getBotName();
    const title = "Teste de compatibilidade";
    const body = [
        `<circle cx="340" cy="302" r="104" fill="#57233d" stroke="#ff8db5" stroke-width="5"/>`,
        `<circle cx="860" cy="302" r="104" fill="#57233d" stroke="#ff8db5" stroke-width="5"/>`,
        text(initials(people[0].name), 340, 325, 60, "#ffe0ec", 800, "middle"),
        text(initials(people[1].name), 860, 325, 60, "#ffe0ec", 800, "middle"),
        `<g transform="translate(600 304) scale(1.25)" fill="#ff6b9d"><path d="M0 20C-10 11-23 2-23-9c0-12 16-17 23-5 7-12 23-7 23 5 0 11-13 20-23 29Z"/></g>`,
        text(fitCoupleName(people[0].name), 340, 440, coupleNameFont(people[0].name, 36), "#fff5f8", 800, "middle"),
        text("♡  COMBINA COM  ♡", 600, 452, 17, "#ff9cbb", 700, "middle"),
        text(fitCoupleName(people[1].name), 860, 440, coupleNameFont(people[1].name, 36), "#fff5f8", 800, "middle"),
        `<rect x="200" y="478" width="800" height="104" rx="26" fill="#3b1e32" stroke="#a94469" stroke-width="2"/>`,
        text(`COMPATIBILIDADE  •  ${percentage}%`, 600, 518, 23, "#ffd1e0", 800, "middle"),
        `<rect x="300" y="540" width="600" height="16" rx="8" fill="#6b334e"/>`,
        `<rect x="300" y="540" width="${Math.round(percentage * 6)}" height="16" rx="8" fill="url(#score)"/>`,
        `<rect x="250" y="604" width="700" height="82" rx="24" fill="#321b2b" stroke="#87435e"/>`,
        text("👶 NOME DO FILHO(A)", 600, 634, 17, "#f3a9c3", 700, "middle"),
        text(fitCoupleName(childName, 26), 600, 671, coupleNameFont(childName, 46), "#fff1f6", 800, "middle"),
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
${text(botName, 600, 78, 20, "#ff9cbb", 800, "middle")}
${text(title, 600, 122, 38, "#fff0f5", 800, "middle")}
${text("Duas pessoas, uma história e um futuro cheio de amor...", 600, 155, 18, "#d6a9ba", 400, "middle")}
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
        childName
    };
}

async function renderShieldBanner(message) {
    const scope = messageScope(message);
    if (!scope) return { error: "Este comando só pode ser usado em grupo ou servidor." };
    const scopeType = scope.platform === "discord" ? "SERVIDOR" : "GRUPO";
    const scopeName = message.groupName || message.chatName ||
        message.raw?.guild?.name || message.raw?.chat?.name ||
        message.raw?.chat?.title || scope.id;
    const prefix = message.prefix || config.getPrefix() || "!";

    const account = economy.getAccountByUser(message, String(message.userId));
    const shieldCharges = Math.max(0, Math.min(
        economy.SHIELD_DURABILITY,
        Number(account?.shieldCharges) || 0
    ));
    const shieldActive = shieldCharges > 0;
    const background = profileCosmetics.getProfileBackground(
        economy.getProfileCosmetics(message, String(message.userId)).background
    ) || { stops: ["#27365d", "#111827", "#090b10"], accent: "#7ea7ff" };
    const displayName = fitCoupleName(
        account?.displayName || account?.username || message.displayName || message.username || message.userId,
        30
    );
    const status = shieldActive ? "ESCUDO ATIVO" : "SEM PROTECAO";
    const statusColor = shieldActive ? "#80e9c3" : "#ffae91";
    const chargeBars = Array.from({ length: economy.SHIELD_DURABILITY }, (_, index) => {
        const charged = index < shieldCharges;
        const x = 132 + index * 90;
        return [
            `<rect x="${x}" y="405" width="70" height="14" rx="7" fill="${charged ? background.accent : "#ffffff"}" opacity="${charged ? 0.95 : 0.16}"/>`,
            text(charged ? "●" : "○", x + 35, 457, 22, charged ? background.accent : "#748097", 800, "middle")
        ].join("");
    }).join("");
    const shieldGraphic = `<g transform="translate(832 190)">
      <path d="M142 0 270 44v101c0 104-64 176-128 210C78 321 14 249 14 145V44L142 0Z" fill="${background.stops[2]}" stroke="${background.accent}" stroke-width="8"/>
      <path d="M142 25 245 60v85c0 82-45 143-103 179-58-36-103-97-103-179V60l103-35Z" fill="${background.stops[1]}" stroke="${background.accent}" stroke-width="3"/>
      ${shieldActive
        ? `<path d="m93 161 33 34 67-77" fill="none" stroke="${background.accent}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<path d="m111 130 62 62m0-62-62 62" fill="none" stroke="${statusColor}" stroke-width="14" stroke-linecap="round"/>`}
      <circle cx="142" cy="145" r="118" fill="none" stroke="${background.accent}" stroke-width="2" opacity=".18"/>
    </g>`;
    const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shield-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${background.stops[0]}"/><stop offset=".56" stop-color="${background.stops[1]}"/><stop offset="1" stop-color="${background.stops[2]}"/>
        </linearGradient>
        <linearGradient id="shield-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${background.stops[1]}" stop-opacity=".92"/><stop offset="1" stop-color="${background.stops[2]}" stop-opacity=".96"/>
        </linearGradient>
        <radialGradient id="shield-glow">
          <stop offset="0" stop-color="${background.accent}" stop-opacity=".24"/><stop offset="1" stop-color="${background.accent}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#shield-bg)"/>
      <circle cx="1010" cy="250" r="330" fill="url(#shield-glow)"/>
      <circle cx="105" cy="540" r="210" fill="${background.accent}" opacity=".06"/>
      <rect x="34" y="32" width="1132" height="566" rx="32" fill="#070b13" opacity=".48"/>
      <rect x="48" y="44" width="1104" height="542" rx="28" fill="url(#shield-panel)" stroke="${background.accent}" stroke-opacity=".55" stroke-width="2"/>
      <rect x="88" y="88" width="7" height="40" rx="3.5" fill="${background.accent}"/>
      ${text(config.getBotName(), 116, 105, 17, background.accent, 800)}
      ${text("PROTECAO DA ECONOMIA LOCAL", 116, 129, 12, "#aab7ca", 700)}
      <rect x="88" y="152" width="1024" height="1" fill="#ffffff" opacity=".14"/>
      ${text("ESCUDO ANTI-ROUBO", 104, 214, 34, "#f5f7fb", 800)}
      ${text(fitCoupleName(`${scopeType} • ${scopeName}`, 48), 104, 245, 15, "#b8c3d9", 500)}
      <rect x="104" y="270" width="324" height="48" rx="24" fill="${statusColor}" fill-opacity=".12" stroke="${statusColor}" stroke-opacity=".65"/>
      <circle cx="130" cy="294" r="6" fill="${statusColor}"/>
      ${text(status, 148, 300, 14, statusColor, 800)}
      ${shieldGraphic}
      ${text(shieldActive ? "CARGAS DE PROTECAO" : "PROTECAO ESGOTADA", 104, 375, 12, "#aab7ca", 800)}
      ${text(`${shieldCharges}/${economy.SHIELD_DURABILITY}`, 582, 376, 20, shieldActive ? background.accent : statusColor, 800, "end")}
      ${chargeBars}
      <rect x="104" y="489" width="992" height="1" fill="#ffffff" opacity=".14"/>
      ${shieldActive
        ? text("Cada tentativa de roubo bloqueada consome 1 carga.", 104, 530, 16, "#dce5ef", 600)
        : text(`Compre outro em ${prefix}comprar escudo (saldo minimo: ${economy.formatMoney(economy.MIN_SHIELD_BALANCE)}).`, 104, 530, 16, "#dce5ef", 600)}
      ${text(displayName, 1096, 565, 14, "#f5f7fb", 700, "end")}
      ${text(`${scope.platform.toUpperCase()} • ${message.userId}`, 1096, 584, 10, "#8997ad", 500, "end")}
    </svg>`;

    const layers = [];
    const avatarProfile = await resolvePlatformProfile(message.platform, message.userId, {
        raw: message.raw,
        username: message.username
    });
    if (avatarProfile?.avatarUrl) {
        try {
            const avatar = await fetchBuffer(avatarProfile.avatarUrl, { timeout: 12000 });
            const mask = Buffer.from(
                '<svg width="104" height="104" xmlns="http://www.w3.org/2000/svg"><circle cx="52" cy="52" r="52" fill="white"/></svg>'
            );
            const avatarBuffer = await sharp(avatar)
                .resize(104, 104, { fit: "cover" })
                .composite([{ input: mask, blend: "dest-in" }])
                .png()
                .toBuffer();
            layers.push({ input: avatarBuffer, left: 990, top: 76 });
            layers.push({
                input: Buffer.from(`<svg width="116" height="116" xmlns="http://www.w3.org/2000/svg"><circle cx="58" cy="58" r="55" fill="none" stroke="${background.accent}" stroke-width="3"/></svg>`),
                left: 984,
                top: 70
            });
        } catch (error) {
            console.warn(`[IMG_ESCUDO] Nao foi possivel carregar o avatar de ${message.userId}:`, error.message || error);
        }
    }

    return {
        buffer: await sharp(Buffer.from(svg)).composite(layers).png().toBuffer(),
        caption: shieldActive
            ? `🛡️ Seu escudo está ativo com ${shieldCharges}/${economy.SHIELD_DURABILITY} cargas. Cada roubo bloqueado consome uma carga.`
            : `🛡️ Você está sem proteção. Use ${prefix}comprar escudo para ativar um novo escudo.`
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

module.exports = {
    renderProfile,
    renderProfileBackgroundPreview,
    renderRanking,
    renderCoupleTest,
    renderMarriageBanner,
    renderShieldBanner
};
