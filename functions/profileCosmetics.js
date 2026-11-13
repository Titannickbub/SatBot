const itemRarity = require("./itemRarity");

const PROFILE_BACKGROUND_PRICE = 100000;
const PROFILE_OUTLINE_PRICE = 100000;
const PROFILE_CIRCLE_PRICE = 100000;
const PROFILE_EFFECT_PRICE = 400000;

const PROFILE_BACKGROUNDS = Object.freeze({
    azul: Object.freeze({
        id: 2000,
        label: "Azul",
        rarity: itemRarity.RARE,
        stops: Object.freeze(["#354f82", "#1c2a43", "#101722"]),
        accent: "#8fb5ff"
    }),
    oceano: Object.freeze({
        id: 2001,
        label: "Oceano",
        rarity: itemRarity.RARE,
        stops: Object.freeze(["#176b75", "#173b43", "#101a20"]),
        accent: "#83e3e3"
    }),
    verde: Object.freeze({
        id: 2002,
        label: "Verde",
        rarity: itemRarity.RARE,
        stops: Object.freeze(["#32714f", "#1b3c2b", "#101a15"]),
        accent: "#9be7b2"
    }),
    roxo: Object.freeze({
        id: 2003,
        label: "Roxo",
        rarity: itemRarity.RARE,
        stops: Object.freeze(["#674b88", "#30243e", "#17121f"]),
        accent: "#c6a9f5"
    }),
    rosa: Object.freeze({
        id: 2004,
        label: "Rosa",
        rarity: itemRarity.RARE,
        stops: Object.freeze(["#803f60", "#402334", "#1d141b"]),
        accent: "#f0a8c6"
    }),
    vermelho: Object.freeze({
        id: 2005,
        label: "Vermelho",
        rarity: itemRarity.RARE,
        stops: Object.freeze(["#96363d", "#4d2026", "#1e1114"]),
        accent: "#ff8b91"
    }),
    dourado: Object.freeze({
        id: 2006,
        label: "Dourado",
        rarity: itemRarity.RARE,
        stops: Object.freeze(["#9c7a32", "#59451f", "#211a0d"]),
        accent: "#ffe28a"
    }),
    rubi: Object.freeze({
        id: 2007,
        label: "Rubi",
        rarity: itemRarity.RARE,
        stops: Object.freeze(["#b51f37", "#661522", "#260b12"]),
        accent: "#ff4568"
    }),
    grafite: Object.freeze({
        id: 2008,
        label: "Grafite",
        rarity: itemRarity.RARE,
        stops: Object.freeze(["#4c5868", "#29323e", "#141920"]),
        accent: "#bac9dc"
    }),
    rgb: Object.freeze({
        id: 2009,
        label: "RGB",
        rarity: itemRarity.EPIC,
        price: 400000,
        stops: Object.freeze(["#62676f", "#42474f", "#24282e"]),
        accent: "#ff70cf",
        rainbow: true
    })
});

const PROFILE_OUTLINES = Object.freeze({
    ...Object.fromEntries(
    Object.entries(PROFILE_BACKGROUNDS).map(([key, background]) => [
        key,
        Object.freeze({
            id: background.id + 1000,
            label: background.label,
            rarity: background.rarity,
            price: background.price,
            color: background.accent,
            rainbow: Boolean(background.rainbow)
        })
    ])),
    congelado_branco: Object.freeze({
        id: 3010,
        label: "Congelado Branco",
        rarity: itemRarity.EPIC,
        price: PROFILE_EFFECT_PRICE,
        color: "#eaf7ff",
        frozen: true
    }),
    congelado_azul: Object.freeze({
        id: 3011,
        label: "Congelado Azul-claro",
        rarity: itemRarity.EPIC,
        price: PROFILE_EFFECT_PRICE,
        color: "#91dcff",
        frozen: true
    }),
    congelado_verde: Object.freeze({
        id: 3012,
        label: "Congelado Verde-claro",
        rarity: itemRarity.EPIC,
        price: PROFILE_EFFECT_PRICE,
        color: "#a9f3c1",
        frozen: true
    }),
    congelado_roxo: Object.freeze({
        id: 3013,
        label: "Congelado Roxo",
        rarity: itemRarity.EPIC,
        price: PROFILE_EFFECT_PRICE,
        color: "#a855f7",
        frozen: true
    }),
    congelado_azul_normal: Object.freeze({
        id: 3014,
        label: "Congelado Azul",
        rarity: itemRarity.EPIC,
        price: PROFILE_EFFECT_PRICE,
        color: "#168bff",
        frozen: true
    }),
    congelado_verde_normal: Object.freeze({
        id: 3015,
        label: "Congelado Verde",
        rarity: itemRarity.EPIC,
        price: PROFILE_EFFECT_PRICE,
        color: "#16a34a",
        frozen: true
    }),
    congelado_vermelho: Object.freeze({
        id: 3016,
        label: "Congelado Vermelho",
        rarity: itemRarity.EPIC,
        price: PROFILE_EFFECT_PRICE,
        color: "#ef4444",
        frozen: true
    }),
    congelado_rosa: Object.freeze({
        id: 3017,
        label: "Congelado Rosa",
        rarity: itemRarity.EPIC,
        price: PROFILE_EFFECT_PRICE,
        color: "#ec4899",
        frozen: true
    }),
    congelado_amarelo: Object.freeze({
        id: 3018,
        label: "Congelado Amarelo",
        rarity: itemRarity.EPIC,
        price: PROFILE_EFFECT_PRICE,
        color: "#facc15",
        frozen: true
    }),
    congelado_laranja: Object.freeze({
        id: 3019,
        label: "Congelado Laranja",
        rarity: itemRarity.EPIC,
        price: PROFILE_EFFECT_PRICE,
        color: "#f97316",
        frozen: true
    })
});

const PROFILE_CIRCLES = Object.freeze(Object.fromEntries(
    Object.entries(PROFILE_OUTLINES).map(([key, outline]) => [
        key,
        Object.freeze({
            ...outline,
            id: outline.id + 1000
        })
    ])
));

const PROFILE_EFFECTS = Object.freeze({
    congelado: Object.freeze({
        id: 5000,
        label: "Congelado",
        rarity: itemRarity.EPIC,
        price: PROFILE_EFFECT_PRICE,
        snowflakes: true
    })
});

function getProfileBackgroundPrice(value) {
    return PROFILE_BACKGROUNDS[normalizeProfileBackground(value)]?.price || PROFILE_BACKGROUND_PRICE;
}

function getProfileOutlinePrice(value) {
    return PROFILE_OUTLINES[normalizeProfileOutline(value)]?.price || PROFILE_OUTLINE_PRICE;
}

function getProfileCirclePrice(value) {
    const circle = PROFILE_CIRCLES[normalizeProfileCircle(value)];
    return circle?.price || (circle?.rarity === itemRarity.EPIC ? PROFILE_EFFECT_PRICE : PROFILE_CIRCLE_PRICE);
}

function getProfileEffectPrice(value) {
    return PROFILE_EFFECTS[normalizeProfileEffect(value)]?.price || PROFILE_EFFECT_PRICE;
}

function normalizeProfileBackground(value) {
    const key = String(value || "").trim().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    return Object.prototype.hasOwnProperty.call(PROFILE_BACKGROUNDS, key) ? key : null;
}

function getProfileBackground(value) {
    const key = normalizeProfileBackground(value);
    return key ? { key, ...PROFILE_BACKGROUNDS[key] } : null;
}

function getProfileBackgroundById(id) {
    const numericId = Number(id);
    const entry = Object.entries(PROFILE_BACKGROUNDS)
        .find(([, background]) => background.id === numericId);
    return entry ? { key: entry[0], ...entry[1] } : null;
}

function resolveProfileBackground(value) {
    const normalized = String(value || "").trim().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const categoryPrefix = normalized.match(/^(?:fundo|fundos|background|backgrounds)\s+(.+)$/);
    const selection = categoryPrefix ? categoryPrefix[1] : normalized;
    return /^\d+$/.test(selection)
        ? getProfileBackgroundById(selection)
        : getProfileBackground(selection);
}

function getProfileBackgroundCss(value, fallbackStops = ["#27365d", "#111827", "#090b10"]) {
    const background = getProfileBackground(value);
    if (background?.rainbow) {
        return "linear-gradient(110deg, #ff1744, #ff9100, #ffea00, #00e676, #00b0ff, #651fff, #ff1744)";
    }
    const stops = background?.stops || fallbackStops;
    return `linear-gradient(145deg, ${stops[0]}, ${stops[1]} 55%, ${stops[2]})`;
}

function normalizeProfileOutline(value) {
    const key = String(value || "").trim().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    return Object.prototype.hasOwnProperty.call(PROFILE_OUTLINES, key) ? key : null;
}

function getProfileOutline(value) {
    const key = normalizeProfileOutline(value);
    return key ? { key, ...PROFILE_OUTLINES[key] } : null;
}

function getProfileOutlineById(id) {
    const numericId = Number(id);
    const entry = Object.entries(PROFILE_OUTLINES)
        .find(([, outline]) => outline.id === numericId);
    return entry ? { key: entry[0], ...entry[1] } : null;
}

function resolveProfileOutline(value) {
    const normalized = String(value || "").trim().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const categoryPrefix = normalized.match(/^(?:linha|linhas|outline|contorno|contornos)\s+(.+)$/);
    const selection = categoryPrefix ? categoryPrefix[1] : normalized;
    return /^\d+$/.test(selection)
        ? getProfileOutlineById(selection)
        : getProfileOutline(selection);
}

function normalizeProfileCircle(value) {
    const key = String(value || "").trim().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    return Object.prototype.hasOwnProperty.call(PROFILE_CIRCLES, key) ? key : null;
}

function getProfileCircle(value) {
    const key = normalizeProfileCircle(value);
    return key ? { key, ...PROFILE_CIRCLES[key] } : null;
}

function getProfileCircleById(id) {
    const numericId = Number(id);
    const entry = Object.entries(PROFILE_CIRCLES)
        .find(([, circle]) => circle.id === numericId);
    return entry ? { key: entry[0], ...entry[1] } : null;
}

function resolveProfileCircle(value) {
    const normalized = String(value || "").trim().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const categoryPrefix = normalized.match(/^(?:circulo|circulos|anel|aneis|circle|circles)\s+(.+)$/);
    const selection = categoryPrefix ? categoryPrefix[1] : normalized;
    return /^\d+$/.test(selection)
        ? getProfileCircleById(selection)
        : getProfileCircle(selection);
}

function normalizeProfileEffect(value) {
    const key = String(value || "").trim().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    return Object.prototype.hasOwnProperty.call(PROFILE_EFFECTS, key) ? key : null;
}

function getProfileEffect(value) {
    const key = normalizeProfileEffect(value);
    return key ? { key, ...PROFILE_EFFECTS[key] } : null;
}

function getProfileEffectById(id) {
    const numericId = Number(id);
    const entry = Object.entries(PROFILE_EFFECTS)
        .find(([, effect]) => effect.id === numericId);
    return entry ? { key: entry[0], ...entry[1] } : null;
}

function resolveProfileEffect(value) {
    const normalized = String(value || "").trim().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const categoryPrefix = normalized.match(/^(?:efeito|efeitos|effect|effects)\s+(.+)$/);
    const selection = categoryPrefix ? categoryPrefix[1] : normalized;
    return /^\d+$/.test(selection)
        ? getProfileEffectById(selection)
        : getProfileEffect(selection);
}

module.exports = {
    PROFILE_BACKGROUND_PRICE,
    PROFILE_OUTLINE_PRICE,
    PROFILE_CIRCLE_PRICE,
    PROFILE_EFFECT_PRICE,
    PROFILE_BACKGROUNDS,
    PROFILE_OUTLINES,
    PROFILE_CIRCLES,
    PROFILE_EFFECTS,
    getProfileBackgroundPrice,
    getProfileOutlinePrice,
    getProfileCirclePrice,
    getProfileEffectPrice,
    getProfileBackground,
    getProfileBackgroundById,
    getProfileBackgroundCss,
    normalizeProfileBackground,
    resolveProfileBackground,
    getProfileOutline,
    getProfileOutlineById,
    normalizeProfileOutline,
    resolveProfileOutline,
    getProfileCircle,
    getProfileCircleById,
    normalizeProfileCircle,
    resolveProfileCircle,
    getProfileEffect,
    getProfileEffectById,
    normalizeProfileEffect,
    resolveProfileEffect
};
