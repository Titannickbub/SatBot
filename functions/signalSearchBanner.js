const sharp = require("sharp");
const economy = require("./economy");

const WIDTH = 1200;
const HEIGHT = 760;
const RARITY_LABELS = {
    [economy.ITEM_RARITY.COMMON]: "COMUM",
    [economy.ITEM_RARITY.UNCOMMON]: "INCOMUM",
    [economy.ITEM_RARITY.RARE]: "RARO",
    [economy.ITEM_RARITY.EPIC]: "ÉPICO",
    [economy.ITEM_RARITY.LEGENDARY]: "LENDÁRIO"
};
const RARITY_COLORS = {
    [economy.ITEM_RARITY.COMMON]: "#9aa7bc",
    [economy.ITEM_RARITY.UNCOMMON]: "#60d394",
    [economy.ITEM_RARITY.RARE]: "#68adff",
    [economy.ITEM_RARITY.EPIC]: "#d68aff",
    [economy.ITEM_RARITY.LEGENDARY]: "#ffd166"
};

function escapeXml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function shorten(value, length) {
    const text = String(value || "");
    return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function formatBannerMoney(amount) {
    return economy.formatMoney(amount).replace(/💷/g, " SatCoins");
}

function resolveTheme(cosmetics = {}) {
    const background = economy.PROFILE_BACKGROUNDS[cosmetics.background] || null;
    const outline = economy.PROFILE_OUTLINES[cosmetics.outline] || null;
    return {
        stops: background?.stops || ["#27365d", "#111827", "#090b10"],
        backgroundRainbow: Boolean(background?.rainbow),
        accent: background?.rainbow ? "#ff70cf" : background?.accent || outline?.color || "#7ea7ff",
        outlineColor: outline?.color || background?.accent || "#38445c",
        outlineRainbow: Boolean(outline?.rainbow)
    };
}

function bannerFrame(kicker, title, subtitle, cosmetics) {
    const theme = resolveTheme(cosmetics);
    const backgroundPaint = theme.backgroundRainbow ? "url(#profileRainbow)" : "url(#profileBackground)";
    const frameStroke = theme.outlineRainbow ? "url(#profileOutline)" : theme.outlineColor;
    return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="profileBackground" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${theme.stops[0]}"/><stop offset=".58" stop-color="${theme.stops[1]}"/><stop offset="1" stop-color="${theme.stops[2]}"/></linearGradient>
  <linearGradient id="profileRainbow" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#ff1744"/><stop offset=".17" stop-color="#ff9100"/><stop offset=".34" stop-color="#ffea00"/><stop offset=".51" stop-color="#00e676"/><stop offset=".68" stop-color="#00b0ff"/><stop offset=".84" stop-color="#651fff"/><stop offset="1" stop-color="#ff1744"/></linearGradient>
  <linearGradient id="profileOutline" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#ff1744"/><stop offset=".17" stop-color="#ff9100"/><stop offset=".34" stop-color="#ffea00"/><stop offset=".51" stop-color="#00e676"/><stop offset=".68" stop-color="#00b0ff"/><stop offset=".84" stop-color="#651fff"/><stop offset="1" stop-color="#ff1744"/></linearGradient>
  <linearGradient id="cardCommon" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#173b56"/><stop offset=".58" stop-color="#101a2d"/><stop offset="1" stop-color="#101423"/></linearGradient>
  <linearGradient id="cardEpic" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#633c79"/><stop offset=".58" stop-color="#261f43"/><stop offset="1" stop-color="#151426"/></linearGradient>
  <linearGradient id="cardRainbow" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#ff1744"/><stop offset=".17" stop-color="#ff9100"/><stop offset=".34" stop-color="#ffea00"/><stop offset=".51" stop-color="#00e676"/><stop offset=".68" stop-color="#00b0ff"/><stop offset=".84" stop-color="#651fff"/><stop offset="1" stop-color="#ff1744"/></linearGradient>
  <linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#17223a"/><stop offset=".58" stop-color="#101522"/><stop offset="1" stop-color="#090d16"/></linearGradient>
  <linearGradient id="rainbow" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#ff1744"/><stop offset=".17" stop-color="#ff9100"/><stop offset=".34" stop-color="#ffea00"/><stop offset=".51" stop-color="#00e676"/><stop offset=".68" stop-color="#00b0ff"/><stop offset=".84" stop-color="#651fff"/><stop offset="1" stop-color="#ff1744"/></linearGradient>
  <radialGradient id="glow"><stop stop-color="#9257ff" stop-opacity=".34"/><stop offset="1" stop-color="#9257ff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${WIDTH}" height="${HEIGHT}" fill="${backgroundPaint}"/>
<circle cx="1070" cy="90" r="330" fill="url(#glow)"/>
<rect x="22" y="22" width="1156" height="716" rx="28" fill="${theme.stops[2]}" fill-opacity=".84" stroke="${frameStroke}" stroke-width="${theme.outlineRainbow ? 7 : 2}"/>
<text x="64" y="75" fill="${theme.accent}" font-family="Arial,Segoe UI,sans-serif" font-size="17px" font-weight="800" letter-spacing="3">✦ ${escapeXml(kicker)}</text>
<text x="64" y="130" fill="#f5f4fb" font-family="Arial,Segoe UI,sans-serif" font-size="38px" font-weight="800">${escapeXml(title)}</text>
<text x="66" y="166" fill="#aeb9ce" font-family="Arial,Segoe UI,sans-serif" font-size="18px">${escapeXml(subtitle)}</text>`;
}

function finishBanner(content, footer, cosmetics) {
    const theme = resolveTheme(cosmetics);
    const footerColor = theme.backgroundRainbow ? "#ff9bdc" : theme.accent;
    const separatorColor = theme.outlineRainbow ? "url(#profileOutline)" : theme.outlineColor;
    const svg = `${content}
<rect x="64" y="688" width="1072" height="1" fill="${separatorColor}" opacity=".65"/>
<text x="64" y="718" fill="${footerColor}" font-family="Arial,Segoe UI,sans-serif" font-size="16px">${escapeXml(footer)}</text>
<text x="1136" y="718" fill="#69768d" font-family="Arial,Segoe UI,sans-serif" font-size="14px" text-anchor="end">BUSCA DE SINAIS</text>
</svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
}

function featuredCard({ x, name, id, price, accent, outline }) {
    const frame = outline
        ? `<rect x="${x + 25}" y="260" width="474" height="270" rx="22" fill="#151c2a" stroke="url(#rainbow)" stroke-width="8"/><rect x="${x + 39}" y="274" width="446" height="242" rx="14" fill="#101725" stroke="#35415a"/>`
        : `<rect x="${x + 25}" y="260" width="474" height="270" rx="22" fill="url(#rainbow)"/><rect x="${x + 33}" y="268" width="458" height="254" rx="17" fill="#111827" fill-opacity=".72"/>`;
    return `${frame}
<text x="${x + 58}" y="314" fill="#d6b3ff" font-family="Arial,Segoe UI,sans-serif" font-size="15px" font-weight="800" letter-spacing="2">ÉPICO · DESTAQUE ATUAL</text>
<text x="${x + 58}" y="390" fill="#ffffff" font-family="Arial,Segoe UI,sans-serif" font-size="38px" font-weight="800">${escapeXml(name)}</text>
<text x="${x + 58}" y="433" fill="${escapeXml(accent)}" font-family="Arial,Segoe UI,sans-serif" font-size="19px" font-weight="700">ID ${escapeXml(id)}</text>
<text x="${x + 58}" y="486" fill="#c0cbdd" font-family="Arial,Segoe UI,sans-serif" font-size="17px">Disponível na Busca Especializada</text>
<text x="${x + 58}" y="556" fill="#ffffff" font-family="Arial,Segoe UI,sans-serif" font-size="20px" font-weight="700">Loja: ${escapeXml(formatBannerMoney(price))}</text>`;
}

async function renderHighlightsBanner(cosmetics) {
    const background = economy.PROFILE_BACKGROUNDS.rgb;
    const outline = economy.PROFILE_OUTLINES.rgb;
    const content = bannerFrame(
        "DESTAQUES DE AGORA",
        "Prêmios em destaque",
        "Destaques épicos disponíveis na Busca Especializada",
        cosmetics
    );
    const cards = [
        featuredCard({
            x: 64,
            name: `Fundo ${background.label}`,
            id: background.id,
            price: economy.getProfileBackgroundPrice("rgb"),
            accent: "#ff9bdc"
        }),
        featuredCard({
            x: 576,
            name: `Outline ${outline.label}`,
            id: outline.id,
            price: economy.getProfileOutlinePrice("rgb"),
            accent: "#8fdcff",
            outline: true
        })
    ].join("");
    const commands = `    <text x="64" y="625" fill="#e1d7f0" font-family="Arial,Segoe UI,sans-serif" font-size="18px" font-weight="700">Recruta: ${escapeXml(formatBannerMoney(economy.SIGNAL_SEARCH_LEVELS.recruta.price))} por tentativa</text>
    <text x="64" y="655" fill="#e1d7f0" font-family="Arial,Segoe UI,sans-serif" font-size="18px" font-weight="700">Especializada: ${escapeXml(formatBannerMoney(economy.SIGNAL_SEARCH_LEVELS.especializada.price))} por tentativa · ambas com busca x10</text>`;
    return finishBanner(`${content}${cards}${commands}`, "Use o comando de Busca de Sinais para consultar prêmios e fazer suas buscas.", cosmetics);
}

function rewardCard(reward, index, quantity) {
    const isSingle = quantity === 1;
    const columns = isSingle ? 1 : 5;
    const cardWidth = isSingle ? 1030 : 202;
    const cardHeight = isSingle ? 418 : 194;
    const gap = isSingle ? 0 : 14;
    const rowGap = 12;
    const startX = isSingle ? 85 : 64;
    const startY = isSingle ? 218 : 225;
    const x = startX + (index % columns) * (cardWidth + gap);
    const y = startY + Math.floor(index / columns) * (cardHeight + rowGap);
    const color = RARITY_COLORS[reward.rarity] || RARITY_COLORS[economy.ITEM_RARITY.COMMON];
    const nameSize = isSingle ? 38 : 17;
    const detailSize = isSingle ? 21 : 12;
    const nameMax = isSingle ? 40 : 20;
    const detail = reward.type === "money"
        ? isSingle
            ? `${reward.converted ? "Conversão em SatCoins" : "Prêmio em SatCoins"} · ${formatBannerMoney(reward.amount)}`
            : `${reward.converted ? "Convertido" : "+"} ${formatBannerMoney(reward.amount)}`
        : reward.type === "reset"
            ? isSingle ? "Reset aplicado à sua conta" : "Reset aplicado"
            : reward.converted
                ? isSingle ? `Cosmético repetido · ${formatBannerMoney(reward.amount)}` : `Convertido · ${formatBannerMoney(reward.amount)}`
                : isSingle ? "Cosmético adicionado à coleção" : "Adicionado à coleção";
    const guaranteeLabel = reward.guarantee
        ? reward.guarantee === "work"
            ? isSingle ? "GARANTIA · RESET DE TRABALHO" : "GARANTIA"
            : RARITY_LABELS[reward.guarantee]
                ? `GARANTIA · ${RARITY_LABELS[reward.guarantee]}`
                : isSingle ? "GARANTIA ÉPICA" : "GARANTIA"
        : "";
    const icon = reward.type === "reset" ? "↻" : reward.cosmeticType === "outline" ? "◫" : "▧";
    const nameMaxY = isSingle ? y + 192 : y + 152;
    const detailY = isSingle ? y + 242 : y + 172;
    const textX = isSingle ? x + 350 : x + cardWidth / 2;
    const nameAnchor = isSingle ? "start" : "middle";
    const detailAnchor = nameAnchor;
    const shortName = shorten(reward.name, nameMax);
    const rarity = RARITY_LABELS[reward.rarity] || String(reward.rarity || "PRÊMIO").toUpperCase();
    const isEpic = reward.rarity === economy.ITEM_RARITY.EPIC || reward.rarity === economy.ITEM_RARITY.LEGENDARY;
    const cardFill = isEpic ? "url(#cardEpic)" : "url(#cardCommon)";
    const status = guaranteeLabel || (reward.isNew && isEpic
        ? "NOVO"
        : reward.converted
            ? "CONVERTIDO"
            : "");
    const badge = status
        ? `<text x="${x + cardWidth - 22}" y="${y + 31}" fill="${color}" font-family="Arial,Segoe UI,sans-serif" font-size="${isSingle ? 14 : 9}px" text-anchor="end" font-weight="800" letter-spacing="1">${escapeXml(status)}</text>`
        : "";
    const swatchX = isSingle ? x + 52 : x + 58;
    const swatchY = isSingle ? y + 80 : y + 47;
    const swatchWidth = isSingle ? 238 : 86;
    const swatchHeight = isSingle ? 286 : 80;
    const outline = reward.type === "cosmetic" && reward.cosmeticType === "outline"
        ? economy.PROFILE_OUTLINES[reward.cosmeticKey]
        : null;
    const background = reward.type === "cosmetic" && reward.cosmeticType === "background"
        ? economy.PROFILE_BACKGROUNDS[reward.cosmeticKey]
        : null;
    const rainbowOutline = Boolean(outline?.rainbow);
    const outlineStroke = rainbowOutline ? "url(#cardRainbow)" : outline?.color || color;
    const swatchFill = background?.rainbow
        ? "url(#cardRainbow)"
        : background?.stops?.[1] || "#0c1422";
    const swatch = outline
        ? `<rect x="${swatchX}" y="${swatchY}" width="${swatchWidth}" height="${swatchHeight}" rx="${isSingle ? 24 : 14}" fill="#111827" stroke="${outlineStroke}" stroke-width="${rainbowOutline ? (isSingle ? 16 : 7) : (isSingle ? 8 : 4)}"/><rect x="${swatchX + (isSingle ? 16 : 7)}" y="${swatchY + (isSingle ? 16 : 7)}" width="${swatchWidth - (isSingle ? 32 : 14)}" height="${swatchHeight - (isSingle ? 32 : 14)}" rx="${isSingle ? 14 : 8}" fill="#111827" stroke="#ffffff22" stroke-width="2"/>`
        : `<rect x="${swatchX}" y="${swatchY}" width="${swatchWidth}" height="${swatchHeight}" rx="${isSingle ? 24 : 14}" fill="${background ? swatchFill : cardFill}" stroke="${background?.accent || color}" stroke-width="${isSingle ? 3 : 2}"/>`;
    const ornament = outline || background
        ? ""
        : reward.type === "money"
            ? `<circle cx="${swatchX + swatchWidth / 2}" cy="${swatchY + swatchHeight / 2}" r="${isSingle ? 61 : 27}" fill="${color}" fill-opacity=".16" stroke="${color}" stroke-width="${isSingle ? 5 : 3}"/><text x="${swatchX + swatchWidth / 2}" y="${swatchY + swatchHeight / 2 + (isSingle ? 22 : 10)}" fill="${color}" font-family="Arial,Segoe UI,sans-serif" font-size="${isSingle ? 76 : 34}px" text-anchor="middle" font-weight="900">S</text>`
            : `<text x="${swatchX + swatchWidth / 2}" y="${swatchY + swatchHeight / 2 + (isSingle ? 20 : 13)}" fill="${color}" font-family="Arial,Segoe UI,sans-serif" font-size="${isSingle ? 94 : 38}px" text-anchor="middle" font-weight="800">${escapeXml(icon)}</text>`;
    const labelY = isSingle ? y + 55 : y + 29;
    const footerY = isSingle ? y + 328 : y + 189;
    const textDetail = shorten(detail, isSingle ? 64 : 25);
    return `<g>
<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="${isSingle ? 24 : 16}" fill="${cardFill}" stroke="${color}" stroke-width="${isEpic ? (isSingle ? 3 : 2) : 1}"/>
<rect x="${x + 2}" y="${y + 2}" width="${cardWidth - 4}" height="${isSingle ? 10 : 6}" rx="4" fill="${color}" opacity=".9"/>
<text x="${isSingle ? x + 350 : x + cardWidth / 2}" y="${labelY}" fill="${color}" font-family="Arial,Segoe UI,sans-serif" font-size="${isSingle ? 16 : 10}px" text-anchor="${isSingle ? "start" : "middle"}" font-weight="900" letter-spacing="1">${escapeXml(rarity)}</text>
${badge}${swatch}${ornament}
<text x="${textX}" y="${nameMaxY}" fill="#f4f6fb" font-family="Arial,Segoe UI,sans-serif" font-size="${nameSize}px" text-anchor="${nameAnchor}" font-weight="800">${escapeXml(shortName)}</text>
<text x="${textX}" y="${detailY}" fill="#b9c5d8" font-family="Arial,Segoe UI,sans-serif" font-size="${detailSize}px" text-anchor="${detailAnchor}">${escapeXml(textDetail)}</text>
<text x="${isSingle ? x + 350 : x + cardWidth / 2}" y="${footerY}" fill="#aab8cf" font-family="Arial,Segoe UI,sans-serif" font-size="${isSingle ? 15 : 9}px" text-anchor="${isSingle ? "start" : "middle"}">${escapeXml(isSingle ? "BUSCA DE SINAIS · PRÊMIO REVELADO" : `${index + 1} / 10`)}</text>
</g>`;
}

async function renderResultBanner(result, cosmetics) {
    const level = result.level === "local"
        ? { label: "Local" }
        : economy.SIGNAL_SEARCH_LEVELS[result.level];
    if (!level || !Array.isArray(result.rewards) || result.rewards.length !== result.quantity) {
        throw new Error("Os dados da busca não correspondem às recompensas recebidas.");
    }
    const isBatch = result.quantity === 10;
    const state = result.level === "local"
        ? result.state
        : result.state.levels[result.level];
    const subtitle = `${level.label} · ${isBatch ? "10 sinais" : "1 sinal"} · Custo ${formatBannerMoney(result.price)}`;
    let content = bannerFrame(
        isBatch ? "RESULTADO DA BUSCA X10" : "RESULTADO DA BUSCA",
        `${level.label}${isBatch ? " x10" : ""}`,
        subtitle,
        cosmetics
    );
    content += result.rewards.map((reward, index) => rewardCard(reward, index, result.quantity)).join("");
    const guarantees = result.level === "local"
        ? Object.entries(state.pullsUntilGuarantee || {})
            .filter(([, pulls]) => pulls !== null)
            .map(([rarity, pulls]) => `${RARITY_LABELS[rarity] || rarity} em até ${pulls} busca(s)`)
            .join(" · ")
        : [
            `Épico em até ${state.pullsUntilEpic} busca(s)`,
            state.pullsUntilWorkReset === null ? "" : `Reset de trabalho em até ${state.pullsUntilWorkReset} busca(s)`
        ].filter(Boolean).join(" · ");
    const footer = `Carteira: ${formatBannerMoney(result.balance)} · ${guarantees}`;
    return finishBanner(content, footer, cosmetics);
}

module.exports = { renderHighlightsBanner, renderResultBanner };
