const PROFILE_BACKGROUND_PRICE = 100000;

const PROFILE_BACKGROUNDS = Object.freeze({
    azul: Object.freeze({
        label: "Azul",
        stops: Object.freeze(["#354f82", "#1c2a43", "#101722"]),
        accent: "#8fb5ff"
    }),
    oceano: Object.freeze({
        label: "Oceano",
        stops: Object.freeze(["#176b75", "#173b43", "#101a20"]),
        accent: "#83e3e3"
    }),
    verde: Object.freeze({
        label: "Verde",
        stops: Object.freeze(["#32714f", "#1b3c2b", "#101a15"]),
        accent: "#9be7b2"
    }),
    roxo: Object.freeze({
        label: "Roxo",
        stops: Object.freeze(["#674b88", "#30243e", "#17121f"]),
        accent: "#c6a9f5"
    }),
    rosa: Object.freeze({
        label: "Rosa",
        stops: Object.freeze(["#803f60", "#402334", "#1d141b"]),
        accent: "#f0a8c6"
    }),
    dourado: Object.freeze({
        label: "Dourado",
        stops: Object.freeze(["#79602e", "#40351f", "#19170f"]),
        accent: "#f0d28b"
    }),
    rubi: Object.freeze({
        label: "Rubi",
        stops: Object.freeze(["#843f46", "#422326", "#1b1314"]),
        accent: "#ffabad"
    }),
    grafite: Object.freeze({
        label: "Grafite",
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

function getProfileBackgroundCss(value, fallbackStops = ["#27365d", "#111827", "#090b10"]) {
    const background = getProfileBackground(value);
    const stops = background?.stops || fallbackStops;
    return `linear-gradient(145deg, ${stops[0]}, ${stops[1]} 55%, ${stops[2]})`;
}

module.exports = {
    PROFILE_BACKGROUND_PRICE,
    PROFILE_BACKGROUNDS,
    getProfileBackground,
    getProfileBackgroundCss,
    normalizeProfileBackground
};
