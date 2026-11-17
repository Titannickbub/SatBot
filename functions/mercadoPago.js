const fs = require("fs");
const path = require("path");
const https = require("https");

const SETTINGS_FILE = path.join(__dirname, "..", "settings", "mercado-pago.json");
const REQUEST_TIMEOUT_MS = 15_000;

function defaultSettings() {
    return { accessToken: "", automaticEnabled: false };
}

function readSettings() {
    if (!fs.existsSync(SETTINGS_FILE)) return defaultSettings();
    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    } catch (error) {
        throw new Error(`Não foi possível ler settings/mercado-pago.json: ${error.message || error}`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("O arquivo settings/mercado-pago.json possui um formato inválido.");
    }
    return {
        accessToken: typeof parsed.accessToken === "string" ? parsed.accessToken : "",
        automaticEnabled: parsed.automaticEnabled === true
    };
}

function saveSettings(settings) {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
    const temporaryFile = `${SETTINGS_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(settings, null, 2), {
        encoding: "utf8",
        mode: 0o600
    });
    fs.renameSync(temporaryFile, SETTINGS_FILE);
}

function getPublicSettings() {
    const settings = readSettings();
    return {
        automaticEnabled: settings.automaticEnabled,
        accessTokenConfigured: Boolean(settings.accessToken)
    };
}

function updateSettings(updates = {}) {
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
        throw new Error("Configuração do Mercado Pago inválida.");
    }
    const settings = readSettings();
    if (updates.clearAccessToken === true) {
        settings.accessToken = "";
    } else if (updates.accessToken !== undefined) {
        if (typeof updates.accessToken !== "string" || updates.accessToken.length > 1000 ||
            /[\r\n]/.test(updates.accessToken)) {
            throw new Error("Valor inválido para o token de acesso.");
        }
        const value = updates.accessToken.trim();
        if (value) settings.accessToken = value;
    }
    if (updates.automaticEnabled !== undefined) {
        if (typeof updates.automaticEnabled !== "boolean") {
            throw new Error("Informe se a cobrança automática será ativada.");
        }
        settings.automaticEnabled = updates.automaticEnabled;
    }
    if (!settings.accessToken) {
        if (updates.automaticEnabled === true) {
            throw new Error("Configure o token de acesso antes de ativar a cobrança automática.");
        }
        settings.automaticEnabled = false;
    }
    saveSettings(settings);
    return getPublicSettings();
}

function requestMercadoPago(method, endpoint, body, idempotencyKey) {
    const settings = readSettings();
    if (!settings.accessToken) throw new Error("Token de acesso do Mercado Pago não configurado.");
    const serializedBody = body === undefined ? null : Buffer.from(JSON.stringify(body), "utf8");
    const headers = {
        Authorization: `Bearer ${settings.accessToken}`,
        Accept: "application/json"
    };
    if (serializedBody) {
        headers["Content-Type"] = "application/json";
        headers["Content-Length"] = serializedBody.length;
    }
    if (idempotencyKey) headers["X-Idempotency-Key"] = idempotencyKey;

    return new Promise((resolve, reject) => {
        const request = https.request({
            hostname: "api.mercadopago.com",
            path: endpoint,
            method,
            headers
        }, response => {
            const chunks = [];
            let size = 0;
            response.on("data", chunk => {
                size += chunk.length;
                if (size > 1024 * 1024) {
                    request.destroy(new Error("Resposta do Mercado Pago excedeu o limite permitido."));
                    return;
                }
                chunks.push(chunk);
            });
            response.on("end", () => {
                const text = Buffer.concat(chunks).toString("utf8");
                let result = {};
                if (text) {
                    try {
                        result = JSON.parse(text);
                    } catch {
                        reject(new Error("O Mercado Pago retornou uma resposta inválida."));
                        return;
                    }
                }
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    const detail = result.message || result.error || `HTTP ${response.statusCode}`;
                    reject(new Error(`Falha na API do Mercado Pago: ${String(detail).slice(0, 240)}.`));
                    return;
                }
                resolve(result);
            });
        });
        request.setTimeout(REQUEST_TIMEOUT_MS, () =>
            request.destroy(new Error("Tempo esgotado ao conectar com o Mercado Pago."))
        );
        request.on("error", reject);
        if (serializedBody) request.write(serializedBody);
        request.end();
    });
}

async function createPixPayment({ platform, order, email, idempotencyKey }) {
    const amount = Number(order.priceCents) / 100;
    if (!Number.isSafeInteger(order.priceCents) || order.priceCents <= 0 ||
        !Number.isFinite(amount)) {
        throw new Error("A cobrança automática exige um pedido com valor maior que zero.");
    }
    const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const payment = await requestMercadoPago("POST", "/v1/payments", {
        transaction_amount: amount,
        description: `Aluguel SatBot ${order.planName}`,
        payment_method_id: "pix",
        payer: { email },
        external_reference: `satbot:${platform}:${order.id}`,
        date_of_expiration: expiration
    }, idempotencyKey);
    const transaction = payment.point_of_interaction?.transaction_data;
    if (!/^\d+$/.test(String(payment.id || "")) ||
        typeof transaction?.qr_code !== "string" ||
        !transaction.qr_code ||
        transaction.qr_code.length > 3000) {
        throw new Error("O Mercado Pago não retornou os dados do Pix para este pedido.");
    }
    const expiresAt = payment.date_of_expiration
        ? Date.parse(payment.date_of_expiration)
        : Date.parse(expiration);
    return {
        paymentId: String(payment.id),
        qrCode: transaction.qr_code,
        ticketUrl: typeof transaction.ticket_url === "string" ? transaction.ticket_url : null,
        expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.parse(expiration)
    };
}

async function getPayment(paymentId) {
    if (!/^\d+$/.test(String(paymentId || ""))) {
        throw new Error("Identificador de pagamento do Mercado Pago inválido.");
    }
    return requestMercadoPago("GET", `/v1/payments/${encodeURIComponent(paymentId)}`);
}

async function cancelPayment(paymentId) {
    if (!/^\d+$/.test(String(paymentId || ""))) {
        throw new Error("Identificador de pagamento do Mercado Pago inválido.");
    }
    return requestMercadoPago(
        "PUT",
        `/v1/payments/${encodeURIComponent(paymentId)}`,
        { status: "cancelled" },
        `satbot-cancel-${paymentId}`
    );
}

module.exports = {
    getPublicSettings,
    updateSettings,
    isAutomaticEnabled: () => readSettings().automaticEnabled,
    createPixPayment,
    getPayment,
    cancelPayment
};
