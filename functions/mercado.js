const api = require("./api");

const CURRENCY_URL = "https://economia.awesomeapi.com.br/json/last/USD-BRL";
const INDEX_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const MARKET_ASSETS = [
    { symbol: "^BVSP", label: "Ibovespa" },
    { symbol: "^GSPC", label: "S&P 500", aliases: ["sp500", "s&p500"] },
    { symbol: "^IXIC", label: "Nasdaq" },
    {
        symbol: "KC=F",
        label: "Café Arábica (Coffee C)",
        aliases: ["cafe", "café", "coffee", "kc"],
        unit: "centavos US$/libra",
        market: "ICE Futures U.S. / NYBOT"
    }
];

function formatCurrency(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return number.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return number.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatChange(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    const emoji = number > 0 ? "📈" : number < 0 ? "📉" : "➡️";
    const signal = number > 0 ? "+" : "";
    return `${emoji} ${signal}${number.toFixed(2)}%`;
}

async function getDollarQuote() {
    const data = await api.fetchJson(CURRENCY_URL);
    const quote = data?.USDBRL;
    if (!quote?.bid || !quote?.ask) {
        throw new Error("A API do dólar retornou dados incompletos.");
    }

    return {
        bid: quote.bid,
        ask: quote.ask,
        change: quote.pctChange,
        updatedAt: quote.create_date
    };
}

function normalizeMarketSymbols(symbols) {
    if (!Array.isArray(symbols) || symbols.length === 0) {
        return MARKET_ASSETS;
    }

    const requested = new Set(symbols.map((value) => String(value).trim().toLowerCase()));
    const selected = MARKET_ASSETS.filter((asset) =>
        requested.has(asset.symbol.toLowerCase()) ||
        requested.has(asset.label.toLowerCase()) ||
        (asset.aliases || []).some((alias) => requested.has(alias))
    );

    if (selected.length === 0) {
        throw new Error("Nenhum ativo válido foi informado.");
    }

    return selected;
}

async function getMarketIndexes(symbols = null) {
    const wantedIndexes = normalizeMarketSymbols(symbols);

    return await Promise.all(wantedIndexes.map(async ({ symbol, label, unit, market }) => {
        const encodedSymbol = encodeURIComponent(symbol);
        const data = await api.fetchJson(
            `${INDEX_URL}/${encodedSymbol}?range=1d&interval=1d`
        );
        const quote = data?.chart?.result?.[0]?.meta;
        if (!quote || !Number.isFinite(Number(quote.regularMarketPrice))) {
            throw new Error(`Cotação indisponível para ${label}.`);
        }

        return {
            label,
            value: quote.regularMarketPrice,
            change: quote.regularMarketChangePercent ??
                ((quote.regularMarketPrice - quote.chartPreviousClose) / quote.chartPreviousClose) * 100,
            unit,
            market,
            updatedAt: quote.regularMarketTime
                ? new Date(quote.regularMarketTime * 1000).toLocaleString("pt-BR")
                : null
        };
    }));
}

module.exports = {
    getDollarQuote,
    getMarketIndexes,
    normalizeMarketSymbols,
    MARKET_ASSETS,
    formatCurrency,
    formatNumber,
    formatChange
};
