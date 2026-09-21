const fs = require("fs");
const path = require("path");

const COMMANDS_DIR = path.join(__dirname, "..", "commands", "diversao");
const TESTES_FILE = path.join(COMMANDS_DIR, "testes.json");
const TESTES_MEDIA_DIR = path.join(COMMANDS_DIR, "testes_media");

const TEST_DEFS = Object.freeze({
    gay: {
        label: "gay",
        emoji: "🏳️‍🌈",
        title: "O quanto você é gay?",
        results: [
            "Mamar o amigo uma vez só não te faz gay, né? ou esse teste falhou🤨",
            "Ainda não virou , mas tá dando seta, Jajá se converte😁",
            "Conhecido como 12:59, ainda não deu , mas 'uma hora' dá 😂",
            "Especialista em dar re no kibe😈",
            "Ele não dá, ele distribui🔥"
        ]
    },
    lesbica: {
        label: "lésbica",
        emoji: "💖",
        title: "O quanto você é lésbica?",
        results: [
            "Só um selinho com as amigas não faz mal neh?🫣",
            "Ela é, só não aceitou ainda 😁",
            "tara mais mulher do q muito homem😦",
            "Já pegou mais mulher q eu 😳",
            "Tô vendo q a ✂️ vai rolar solta, simplesmente absolute yuri 🙌🏻"
        ]
    },
    bonito: {
        label: "bonito",
        emoji: "✨",
        title: "O quanto você é bonito(a)?",
        results: [
            "Da pro gasto... se nascer de novo😂",
            "bonitinho vai, não é a coisa mais feia do mundo 🙃",
            "Deveria ser ator em 😊",
            "que isso ... se tiver solteiro eu quero em 🫣",
            "Tão lindo q espelho quebrado se concerta pra ver sua beleza😘"
        ]
    },
    feio: {
        label: "feio",
        emoji: "😬",
        title: "O quanto você é feio(a)?",
        results: [
            "A beleza tá no sangue , so falta circular😅",
            "Já viu o cão chupando manga? agora tá ele aí usando bot 🤭",
            "7 anos de azar , quebrou o espelho no reflexo 😬",
            "Parece um filhote de sariguê🦨",
            "Né fei não menino, e a cara do demônio, o satanás 👹"
        ]
    },
    casal: {
        label: "casal",
        emoji: "💞",
        title: "O quanto vocês formam um casal?",
        results: [
            "Acho q seram apenas amigos 😅",
            " Talvez uma ficada, não muito além disso 🤔",
            "Quem sabe um romance de verão 😌",
            "Juram q são amigos mas no off se pegam horrores 🔥",
            "Só falta se pedirem em casamento, claramente se amam❤️"
        ]
    },
    gado: {
        label: "gado",
        emoji: "🐂",
        title: "O quanto você é gado?",
        results: [
            "Ainda manda um bom dia e espera resposta até a noite 😅",
            "Defende a pessoa mesmo quando todo mundo viu a besteira 🤭",
            "Cai em qualquer story com coração e já acha que é paixão 💘",
            "Faz tudo que pedem e ainda agradece pela oportunidade 🐂",
            "Virou funcionário particular da paixão e trabalha sem salário 😂"
        ]
    },
    corno: {
        label: "corno",
        emoji: "🦌",
        title: "O quanto você é corno?",
        results: [
            "Só está desconfiado, talvez seja apenas paranoia 😅",
            "Já viu alguns sinais, mas prefere acreditar no amor 🤔",
            "O grupo inteiro sabe, só falta você descobrir 🫣",
            "Enquanto você dorme, alguém manda boa noite no seu lugar 🦌",
            "Tem mais chifre que uma manada inteira, mas continua fiel 😂"
        ]
    },
    burro: {
        label: "burro",
        emoji: "🫏",
        title: "O quanto você é burro?",
        results: [
            "Erra às vezes, mas ainda dá para colocar a culpa no sono 😅",
            "Lê a pergunta duas vezes e responde outra coisa 🤔",
            "A lógica pediu demissão depois de conversar com você 😂",
            "Se te derem duas opções, você escolhe a terceira 🫏",
            "Consegue perder no pedra, papel e tesoura jogando sozinho 😵"
        ]
    },
    golpe: {
        label: "golpe",
        emoji: "😈",
        title: "O quanto você é golpista?",
        results: [
            "N engana nem a vó 😅",
            "Deixava de usar Pix achando q tava sonegando imposto 😛",
            "Dava troco a menos trabalhando no supermercado 😬",
            "Pix caiu, foto sumiu, ganhou um dinheirinho em esquema de pirâmide💸",
            "Ficou milionário com lavagem de dinheiro 😳💰💰"
        ]
    },
    gostoso: {
        label: "gostoso",
        emoji: "🔥",
        title: "O quanto você é gostoso(a)?",
        results: [
            "Gostoso igual um limão...🍋",
            "Já dá um calorzinho só de olhar 🤔",
            "Já dá pra perder a linha e a vergonha... 🫣",
            "Se fosse o almoço, eu repetia e lambia os dedos😏",
            "Se mandar eu latir , eu faço auau, tá solteiro(a)?🫦"
        ]
    },
    gostosa: {
        label: "gostosa",
        emoji: "💋",
        title: "O quanto você é gostosa(o)?",
        results: [
            "a presença tá boa, mas ainda não entrou na categoria de 'meu Deus' 😅",
            "você tem um fator charme que faz o ambiente mudar de atmosfera 💋",
            "o nível de atração tá tão alto que até a música fica com ciúme 🔥",
            "você tá com aquela energia que faz todos pararem, olhar e depois perder a fala 💘",
            "você é gostoso(a) demais pra uma máquina de calcular porcentagem 💋"
        ]
    },
    triste: {
        label: "triste",
        emoji: "😭",
        title: "O quanto você é triste?",
        results: [
            "a vida ainda te deu um tempo, mas o melodrama já entrou na sala 😅",
            "você tem um humor melancólico bem presente, mas ainda não virou tragédia cinematográfica 😭",
            "o drama tá aí, só faltando a trilha sonora e a câmera lenta ✨",
            "você tá na fase de personagem principal de novela maluca e meio dramática 😢",
            "você é triste de um jeito que até a música de fundo pediu licença pra sofrer 😭"
        ]
    },
    doido: {
        label: "doido",
        emoji: "🤪",
        title: "O quanto você é doido(a)?",
        results: [
            "Conversa sozinho, tudo normal 🤔",
            "Comprava bicicleta pra andar apé 😂",
            "Tá dormindo em baixo da cama e puxando o pé do bixo papão 😳",
            "O mais fraco desse grupo dorme amarrado 🪢",
            "Tá amassando o pão e comendo o diabo, é os meninos do lucin papai😵"
        ]
    },
    otaku: {
        label: "otaku",
        emoji: "🎮",
        title: "O quanto você é otaku?",
        results: [
            "Assiste anime uma vez por ano e se diz otaku 😅",
            "Assistindo anime de romance toda semana e chorando no banheiro por não viver um 🎮",
            "insiste em fazer qualquer um assistir Naruto 🤭",
            "Assistiu one piece em 1 mês , e diz q não e otaku 😳",
            "Parou até de tomar banho, já assistiu todos os animes existentes, famoso otaku fedido ♨️"
        ]
    }
});

function normalizeKey(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
}

function resolveTestKey(value) {
    const normalized = normalizeKey(value);
    if (!normalized) return null;

    const aliases = {
        gay: ["gay", "gai"],
        lesbica: ["lesbica", "lesbico", "lesbiana"],
        bonito: ["bonito", "bonita", "bela", "belo"],
        feio: ["feio", "feia", "feiaaa"],
        casal: ["casal", "par", "casalzinho"],
        gado: ["gado", "gada"],
        corno: ["corno", "corna", "chifrudo", "chifruda"],
        burro: ["burro", "burra", "jumento", "jumenta"],
        golpe: ["golpe", "soco", "socoa"],
        gostoso: ["gostoso", "gostosa", "gostosaao", "gostosao"],
        triste: ["triste", "melancolico", "melancolica"],
        doido: ["doido", "doida", "louco", "louca"],
        otaku: ["otaku", "otak"],
    };

    for (const [key, variants] of Object.entries(aliases)) {
        if (variants.includes(normalized)) return key;
    }

    return Object.prototype.hasOwnProperty.call(TEST_DEFS, normalized) ? normalized : null;
}

function ensureStorage() {
    if (!fs.existsSync(COMMANDS_DIR)) {
        fs.mkdirSync(COMMANDS_DIR, { recursive: true });
    }

    if (!fs.existsSync(TESTES_MEDIA_DIR)) {
        fs.mkdirSync(TESTES_MEDIA_DIR, { recursive: true });
    }

    if (!fs.existsSync(TESTES_FILE)) {
        fs.writeFileSync(TESTES_FILE, "{}", "utf8");
    }
}

function loadTestConfig() {
    ensureStorage();
    try {
        const parsed = JSON.parse(fs.readFileSync(TESTES_FILE, "utf8"));
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function saveTestConfig(data) {
    ensureStorage();
    const normalized = data && typeof data === "object" && !Array.isArray(data) ? data : {};
    fs.writeFileSync(TESTES_FILE, JSON.stringify(normalized, null, 4), "utf8");
}

function getSavedMedia(testKey) {
    const key = resolveTestKey(testKey);
    if (!key) return null;
    const config = loadTestConfig();
    const entry = config[key];
    if (!entry) return null;

    if (Array.isArray(entry.media) && entry.media.length) {
        const picked = entry.media[0];
        if (picked && typeof picked === "object") {
            return {
                type: picked.type || "photo",
                file: picked.file || null,
                fileName: picked.fileName || null,
                updatedAt: entry.updatedAt || null
            };
        }
    }

    return {
        type: entry.type || "photo",
        file: entry.file || null,
        fileName: entry.fileName || null,
        updatedAt: entry.updatedAt || null
    };
}

function saveTestMedia(testKey, mediaMeta) {
    const key = resolveTestKey(testKey);
    if (!key) throw new Error("Tipo de teste inválido.");

    const config = loadTestConfig();
    const mediaInfo = {
        type: mediaMeta?.type || "photo",
        file: mediaMeta?.file || null,
        fileName: mediaMeta?.fileName || null,
        updatedAt: new Date().toISOString()
    };

    config[key] = {
        enabled: true,
        media: [mediaInfo]
    };

    saveTestConfig(config);
    return mediaInfo;
}

function getTestInfo(testKey) {
    const key = resolveTestKey(testKey);
    return key ? TEST_DEFS[key] : null;
}

function getSupportedTestKeys() {
    return Object.keys(TEST_DEFS);
}

module.exports = {
    COMMANDS_DIR,
    TESTES_FILE,
    TESTES_MEDIA_DIR,
    TEST_DEFS,
    normalizeKey,
    resolveTestKey,
    ensureStorage,
    loadTestConfig,
    saveTestConfig,
    getSavedMedia,
    saveTestMedia,
    getTestInfo,
    getSupportedTestKeys
};
