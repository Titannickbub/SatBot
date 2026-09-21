const config = require("./config");
const economy = require("./economy");

function getBaseUrl() {
    const domain = config.getWebDomain();
    if (!domain) return null;
    return `https://${domain}`;
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
    return buildUrl(type === "xp" ? "/rankxp" : "/rankrico", scope);
}

module.exports = {
    getBaseUrl,
    profile,
    ranking
};
