const path = require("path");
const fs = require("fs");
const api = require("./api");

const CONFIG_FILE = path.join(__dirname, "..", "settings", "ai.json");

function loadConfig() {
    if (!fs.existsSync(CONFIG_FILE)) {
        const defaultConfig = {
            provider: "gemini",
            geminiKey: "",
            groqKey: "",
            openrouterKey: ""
        };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 4), "utf8");
        return defaultConfig;
    }

    try {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    } catch {
        return {
            provider: "gemini",
            geminiKey: "",
            groqKey: "",
            openrouterKey: ""
        };
    }
}

function saveConfig(config) {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 4), "utf8");
}

function setKey(provider, key) {
    const config = loadConfig();
    const prov = String(provider).toLowerCase().trim();
    const cleanKey = String(key || "").trim();

    if (prov === "gemini" || prov === "google") {
        config.geminiKey = cleanKey;
        config.provider = "gemini";
    } else if (prov === "groq") {
        config.groqKey = cleanKey;
        config.provider = "groq";
    } else if (prov === "openrouter") {
        config.openrouterKey = cleanKey;
        config.provider = "openrouter";
    } else {
        throw new Error("Provedor inválido. Use gemini, groq ou openrouter.");
    }

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
 * Responde texto por IA usando Gemini, Groq, OpenRouter ou fallback explicativo
 */
async function chatAI(prompt, options = {}) {
    const config = loadConfig();
    const configFn = require("./config");
    const botName = typeof configFn.getBotName === "function" ? configFn.getBotName() : "Satella";
    const systemPrompt = options.system || `Você é o/a ${botName}, um(a) assistente virtual inteligente, útil, amigável e educado(a). Responda em português de forma clara e objetiva.`;

    let lastError = null;

    // 1. Tenta Gemini (Google AI Studio)
    if (config.geminiKey) {
        const models = [
            "gemini-3.6-flash",
            "gemini-3.7-flash",
            "gemini-flash-latest",
            "gemini-2.5-flash-lite",
            "gemini-2.5-pro"
        ];
        for (const model of models) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiKey}`;
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
                const apiErrMsg = err.response?.data?.error?.message || err.message || String(err);
                lastError = `[Gemini (${model})]: ${apiErrMsg}`;
                console.error(`[AI] Erro no modelo ${model}:`, apiErrMsg);
            }
        }
    }

    // 2. Tenta Groq
    if (config.groqKey) {
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
                    Authorization: `Bearer ${config.groqKey}`
                },
                timeout: 20000
            });
            const reply = res?.choices?.[0]?.message?.content;
            if (reply) {
                return reply.trim();
            }
        } catch (err) {
            const apiErrMsg = err.response?.data?.error?.message || err.message || String(err);
            lastError = `[Groq]: ${apiErrMsg}`;
            console.error("[AI] Erro no Groq:", apiErrMsg);
        }
    }

    // 3. Tenta OpenRouter
    if (config.openrouterKey) {
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
                    Authorization: `Bearer ${config.openrouterKey}`
                },
                timeout: 20000
            });
            const reply = res?.choices?.[0]?.message?.content;
            if (reply) {
                return reply.trim();
            }
        } catch (err) {
            const apiErrMsg = err.response?.data?.error?.message || err.message || String(err);
            lastError = `[OpenRouter]: ${apiErrMsg}`;
            console.error("[AI] Erro no OpenRouter:", apiErrMsg);
        }
    }

    // Se houve erro na API com a chave fornecida
    if (lastError) {
        return `❌ *Erro da API de IA*\n\n${lastError}\n\n📌 *Dica:* A chave de API do Gemini no Google AI Studio (https://aistudio.google.com) começa com \`AIzaSy...\`. Verifique sua chave e redefina com:\n\`!setai gemini SUA_CHAVE\``;
    }

    // Se NENHUMA chave estiver configurada
    return "💡 *Inteligência Artificial (Satella)*\n\nNenhuma chave de API de IA válida está configurada no momento.\n\nPara ativar respostas de IA gratuitamente:\n1️⃣ Obtenha uma chave grátis no Google AI Studio (https://aistudio.google.com) que começa com `AIzaSy...` ou no Groq (https://console.groq.com).\n2️⃣ Configure no bot usando o comando:\n`!setai gemini SUA_CHAVE_AQUI` ou `!setai groq SUA_CHAVE_AQUI`\n\n*(Dica: A geração de imagens com `!imagine` funciona 100% grátis sem chave!)*";
}

module.exports = {
    loadConfig,
    saveConfig,
    getConfig,
    setKey,
    generateImage,
    chatAI
};
