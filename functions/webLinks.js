const config = require("./config");
const economy = require("./economy");

function getBaseUrl() {
    const domain = config.getWebDomain();
    if (!domain) return null;
    const protocol = typeof config.getWebProtocol === "function"
        ? config.getWebProtocol()
        : "http";
    return `${protocol}://${domain}`;
}

function getScopeParams(message) {
    const scope = economy.getScope(message);
    if (!scope) return null;
    return {
        grupo: scope.id,
        plataforma: scope.platform
    };
}

function buildUrl(pathname, params) {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return null;
    const query = new URLSearchParams(params).toString();
    return `${baseUrl}${pathname}?${query}`;
}

function profile(message) {
    const scope = getScopeParams(message);
    if (!scope) return null;
    return buildUrl("/perfil", {
        ...scope,
        usuario: String(message.userId)
    });
}

function ranking(message, type) {
    const scope = getScopeParams(message);
    if (!scope) return null;
    const pathname = type === "xp"
        ? "/rankxp"
        : type === "activity_all"
            ? "/rankatividade-all"
        : type === "activity"
            ? "/rankatividade"
            : "/rankrico";
    return buildUrl(pathname, scope);
}

module.exports = {
    getBaseUrl,
    profile,
    ranking
};
