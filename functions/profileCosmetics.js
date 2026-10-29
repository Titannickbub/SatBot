const itemRarity = require("./itemRarity");

const PROFILE_BACKGROUND_PRICE = 100000;

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
    })
});

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
    const stops = background?.stops || fallbackStops;
    return `linear-gradient(145deg, ${stops[0]}, ${stops[1]} 55%, ${stops[2]})`;
}

module.exports = {
    PROFILE_BACKGROUND_PRICE,
    PROFILE_BACKGROUNDS,
    getProfileBackground,
    getProfileBackgroundById,
    getProfileBackgroundCss,
    normalizeProfileBackground,
    resolveProfileBackground
};
