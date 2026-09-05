const path = require("path");
const fs = require("fs");
const api = require("./api");

const CONFIG_FILE = path.join(__dirname, "..", "settings", "ai.json");

function loadConfig() {
    const defaultConfig = {
        provider: "gemini",
        geminiKeys: [],
        groqKeys: [],
        openrouterKeys: []
    };

    if (!fs.existsSync(CONFIG_FILE)) {
        saveConfig(defaultConfig);
        return defaultConfig;
    }

    try {
        const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));

        const geminiKeys = Array.isArray(raw.geminiKeys)
            ? raw.geminiKeys.map(k => String(k || "").trim()).filter(Boolean)
            : (raw.geminiKey ? [String(raw.geminiKey).trim()] : []);

        const groqKeys = Array.isArray(raw.groqKeys)
            ? raw.groqKeys.map(k => String(k || "").trim()).filter(Boolean)
            : (raw.groqKey ? [String(raw.groqKey).trim()] : []);

        const openrouterKeys = Array.isArray(raw.openrouterKeys)
            ? raw.openrouterKeys.map(k => String(k || "").trim()).filter(Boolean)
            : (raw.openrouterKey ? [String(raw.openrouterKey).trim()] : []);

        return {
            provider: raw.provider || "gemini",
            geminiKeys: geminiKeys.slice(0, 3),
            groqKeys: groqKeys.slice(0, 3),
            openrouterKeys: openrouterKeys.slice(0, 3),
            geminiKey: geminiKeys[0] || "",
            groqKey: groqKeys[0] || "",
            openrouterKey: openrouterKeys[0] || ""
        };
    } catch {
        return defaultConfig;
    }
}

function saveConfig(config) {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 4), "utf8");
}

function setKey(provider, keyInput, slot = 1) {
    const config = loadConfig();
    const prov = String(provider || "").toLowerCase().trim();
    const cleanInput = String(keyInput || "").trim();

    let targetProp = "";
    if (prov === "gemini" || prov === "google") {
        targetProp = "geminiKeys";
        config.provider = "gemini";
    } else if (prov === "groq") {
        targetProp = "groqKeys";
        config.provider = "groq";
    } else if (prov === "openrouter") {
        targetProp = "openrouterKeys";
        config.provider = "openrouter";
    } else {
        throw new Error("Provedor inválido. Use gemini, groq ou openrouter.");
    }

    let keys = Array.isArray(config[targetProp]) ? [...config[targetProp]] : [];

    if (cleanInput.toLowerCase() === "clear" || cleanInput.toLowerCase() === "limpar") {
        keys = [];
    } else if (cleanInput.includes(",")) {
        keys = cleanInput.split(",").map(k => k.trim()).filter(Boolean).slice(0, 3);
    } else {
        const slotIdx = Math.max(0, Math.min(2, (parseInt(slot, 10) || 1) - 1));
        keys[slotIdx] = cleanInput;
        keys = keys.filter(Boolean).slice(0, 3);
    }

    config[targetProp] = keys;
    config.geminiKey = (config.geminiKeys || [])[0] || "";
    config.groqKey = (config.groqKeys || [])[0] || "";
    config.openrouterKey = (config.openrouterKeys || [])[0] || "";

    saveConfig(config);
    return config;
}

function getConfig() {
    return loadConfig();
}

/**
 * Gera imagens 100% grátis usando a API pública do Pollinations AI
 */
async function generateImage(prompt) {
    if (!prompt || typeof prompt !== "string") {
        throw new Error("É necessário fornecer um texto/prompt para gerar a imagem.");
    }

    const encodedPrompt = encodeURIComponent(prompt.trim());
    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}`;

    try {
        const buffer = await api.fetchBuffer(url, { timeout: 30000 });
        if (!buffer || buffer.length < 1000) {
            throw new Error("Falha ao obter imagem da API.");
        }
        return buffer;
    } catch (err) {
        throw new Error(`Erro ao gerar imagem com IA: ${err.message}`);
    }
}

/**
 * Responde texto por IA usando Gemini, Groq, OpenRouter com rotação de até 3 chaves por provedor
 */
async function chatAI(prompt, options = {}) {
    const config = loadConfig();
    const configFn = require("./config");
    const botName = typeof configFn.getBotName === "function" ? configFn.getBotName() : "Sat Bot";
    const systemPrompt = options.system || `Você é o/a ${botName}, um(a) assistente virtual inteligente, útil, amigável e educado(a). Responda em português de forma clara e objetiva.`;

    const platform = String(options.platform || "").toLowerCase();
    const isDiscord = platform === "discord";
    const isOwner = options.isOwner !== undefined ? Boolean(options.isOwner) : true;

    const b = (text) => isDiscord ? `**${text}**` : `*${text}*`;

    let lastError = null;
    let rateLimitError = null;

    // 1. Tenta Gemini (Google AI Studio) - Rotação de até 3 chaves
    const geminiKeys = config.geminiKeys && config.geminiKeys.length ? config.geminiKeys : (config.geminiKey ? [config.geminiKey] : []);
    if (geminiKeys.length > 0) {
        const models = ["gemini-3.6-flash", "gemini-flash-latest"];
        for (let k = 0; k < geminiKeys.length; k++) {
            const currentKey = geminiKeys[k];
            for (const model of models) {
                try {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;
                    const body = {
                        contents: [
                            {
                                parts: [
                                    { text: `${systemPrompt}\n\nPergunta do usuário: ${prompt}` }
                                ]
                            }
                        ]
                    };
                    const res = await api.postJson(url, body, { timeout: 20000 });
                    const reply = res?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (reply) {
                        return reply.trim();
                    }
                } catch (err) {
                    const status = err.response?.status;
                    const apiErrMsg = err.response?.data?.error?.message || err.message || String(err);
                    console.error(`[AI] Erro no Gemini (Chave ${k + 1}, modelo ${model}, status ${status || "N/A"}):`, apiErrMsg);

                    if (status === 429 || /quota|rate limit|limit/i.test(apiErrMsg)) {
                        rateLimitError = `[Gemini (Chave ${k + 1})]: Limite de requisições por minuto atingido (Rate Limit 429). Tentando próxima chave/provedor...`;
                    } else if (status === 503 || /high demand/i.test(apiErrMsg)) {
                        rateLimitError = `[Gemini (Chave ${k + 1})]: Servidores do Google Gemini com alta demanda temporária (Status 503). Tentando próxima chave/provedor...`;
                    } else {
                        lastError = `[Gemini (Chave ${k + 1}, ${model})]: ${apiErrMsg}`;
                    }
                }
            }
        }
    }

    // 2. Tenta Groq - Rotação de até 3 chaves
    const groqKeys = config.groqKeys && config.groqKeys.length ? config.groqKeys : (config.groqKey ? [config.groqKey] : []);
    if (groqKeys.length > 0) {
        for (let k = 0; k < groqKeys.length; k++) {
            const currentKey = groqKeys[k];
            try {
                const url = "https://api.groq.com/openai/v1/chat/completions";
                const body = {
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt }
                    ]
                };
                const res = await api.postJson(url, body, {
                    headers: {
                        Authorization: `Bearer ${currentKey}`
                    },
                    timeout: 20000
                });
                const reply = res?.choices?.[0]?.message?.content;
                if (reply) {
                    return reply.trim();
                }
            } catch (err) {
                const apiErrMsg = err.response?.data?.error?.message || err.message || String(err);
                lastError = `[Groq (Chave ${k + 1})]: ${apiErrMsg}`;
                console.error(`[AI] Erro no Groq (Chave ${k + 1}):`, apiErrMsg);
            }
        }
    }

    // 3. Tenta OpenRouter - Rotação de até 3 chaves
    const openrouterKeys = config.openrouterKeys && config.openrouterKeys.length ? config.openrouterKeys : (config.openrouterKey ? [config.openrouterKey] : []);
    if (openrouterKeys.length > 0) {
        for (let k = 0; k < openrouterKeys.length; k++) {
            const currentKey = openrouterKeys[k];
            try {
                const url = "https://openrouter.ai/api/v1/chat/completions";
                const body = {
                    model: "meta-llama/llama-3.3-70b-instruct:free",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt }
                    ]
                };
                const res = await api.postJson(url, body, {
                    headers: {
                        Authorization: `Bearer ${currentKey}`
                    },
                    timeout: 20000
                });
                const reply = res?.choices?.[0]?.message?.content;
                if (reply) {
                    return reply.trim();
                }
            } catch (err) {
                const apiErrMsg = err.response?.data?.error?.message || err.message || String(err);
                lastError = `[OpenRouter (Chave ${k + 1})]: ${apiErrMsg}`;
                console.error(`[AI] Erro no OpenRouter (Chave ${k + 1}):`, apiErrMsg);
            }
        }
    }

    // Se houve erro de Rate Limit ou outro erro na API em todas as chaves
    if (rateLimitError) {
        return `⚠️ ${b(`Inteligência Artificial ${botName}`)}\n\nO limite de requisições por minuto do serviço de IA foi atingido temporariamente. Por favor, aguarde alguns segundos e tente novamente!`;
    }

    if (lastError) {
        if (!isOwner) {
            return `❌ ${b("Serviço de IA Indisponível")}\n\nDesculpe, o serviço de Inteligência Artificial está temporariamente indisponível devido a uma instabilidade no provedor. Por favor, tente novamente em instantes.`;
        }

        return `❌ ${b("Erro da API de IA")}\n\n${lastError}\n\n📌 ${b("Dica:")} A chave de API do Gemini no Google AI Studio (https://aistudio.google.com) começa com \`AIzaSy...\`. Verifique suas chaves e redefina com:\n\`!setai gemini SUA_CHAVE\``;
    }

    // Se NENHUMA chave estiver configurada
    if (!isOwner) {
        return `💡 ${b(`Inteligência Artificial (${botName})`)}\n\nO serviço de respostas por Inteligência Artificial não está ativo no momento. Peça ao administrador do bot para configurar uma chave de API.`;
    }

    return `💡 ${b(`Inteligência Artificial (${botName})`)}\n\nNenhuma chave de API de IA válida está configurada no momento.\n\nPara ativar respostas de IA gratuitamente:\n1️⃣ Obtenha uma chave grátis no Google AI Studio (https://aistudio.google.com) ou no Groq (https://console.groq.com).\n2️⃣ Configure no bot usando o comando:\n\`!setai gemini SUA_CHAVE_1\` (ou \`!setai gemini 2 SUA_CHAVE_2\` para adicionar chaves de backup!)\n\n*(Dica: Você pode cadastrar até 3 chaves de cada provedor para ter failover automático!)*`;
}

module.exports = {
    loadConfig,
    saveConfig,
    getConfig,
    setKey,
    generateImage,
    chatAI
};
