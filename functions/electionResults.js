const axios = require("axios");

const TSE_BASE_URL = "https://resultados.tse.jus.br/oficial";
const ELECTION_CONFIG_URL = `${TSE_BASE_URL}/comum/config/ele-c.jws`;
const CONFIG_CACHE_MS = 60 * 60 * 1000;
const RESULTS_CACHE_MS = 30 * 1000;
const PAGE_SIZE = 15;
const cache = new Map();

const OFFICES = Object.freeze({
    presidente: { code: "1", label: "Presidente" },
    governador: { code: "3", label: "Governador" },
    senador: { code: "5", label: "Senador" },
    "deputado federal": { code: "6", label: "Deputado Federal" },
    "deputado estadual": { code: "7", label: "Deputado Estadual" }
});

function normalize(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR")
        .trim();
}

function decodeJws(value, description) {
    const parts = String(value || "").split(".");
    if (parts.length !== 3 || !parts[1]) {
        throw new Error(`Formato JWS inválido recebido do TSE (${description}).`);
    }

    let payload;
    try {
        payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    } catch (error) {
        throw new Error(`Não foi possível interpretar os dados do TSE (${description}): ${error.message}`);
    }

    if (!payload || typeof payload !== "object") {
        throw new Error(`Dados inválidos recebidos do TSE (${description}).`);
    }
    return payload;
}

async function fetchTseData(url, description, cacheKey, cacheDuration) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    const separator = url.includes("?") ? "&" : "?";
    const response = await axios.get(`${url}${separator}nocache=${Date.now()}`, {
        timeout: 15000,
        responseType: "text",
        headers: {
            "Accept": "application/json",
            "User-Agent": "SatBot/1.0 (TSE election results)"
        }
    });
    const data = decodeJws(response.data, description);
    cache.set(cacheKey, { data, expiresAt: Date.now() + cacheDuration });
    return data;
}

async function getElectionConfig() {
    return fetchTseData(ELECTION_CONFIG_URL, "configuração das eleições", "election-config", CONFIG_CACHE_MS);
}

function getYear(cycle) {
    const match = String(cycle || "").match(/ele(\d{4})/i);
    return match ? Number(match[1]) : 0;
}

function getCargoCodes(election) {
    const codes = new Set();
    for (const region of election?.abr || []) {
        for (const office of region.cp || []) {
            codes.add(String(office.cd));
        }
    }
    return codes;
}

function selectElection(config, officeCode) {
    const currentYear = new Date().getFullYear();
    const options = [];

    for (const plan of config.pl || []) {
        const year = getYear(plan.c);
        if (!year || year > currentYear) continue;

        for (const election of plan.e || []) {
            if (getCargoCodes(election).has(officeCode)) {
                options.push({ cycle: plan.c, year, election });
            }
        }
    }

    options.sort((a, b) => b.year - a.year);
    if (!options.length) {
        throw new Error("O TSE ainda não publicou uma eleição disponível para esse cargo.");
    }
    return options[0];
}

async function getMunicipalityConfig(cycle, electionId) {
    const paddedId = String(electionId).padStart(6, "0");
    const url = `${TSE_BASE_URL}/${cycle}/${electionId}/config/mun-e${paddedId}-cm.jws`;
    return fetchTseData(url, "lista de estados e municípios", `municipalities:${cycle}:${electionId}`, CONFIG_CACHE_MS);
}

function findLocation(municipalityConfig, stateQuery, municipalityQuery) {
    const states = municipalityConfig.abr || [];
    let state = null;

    if (stateQuery) {
        const normalizedState = normalize(stateQuery);
        const stateMatches = states.filter(item =>
            normalize(item.cd) === normalizedState || normalize(item.ds) === normalizedState
        );
        if (stateMatches.length !== 1) {
            throw new Error(`Não reconheci o estado "${stateQuery}". Informe a sigla ou o nome completo, como MG ou Minas Gerais.`);
        }
        state = stateMatches[0];
    }

    if (!municipalityQuery) {
        return state
            ? { code: state.cd, label: `${state.ds}` }
            : { code: "br", label: "Brasil" };
    }

    if (!state) {
        throw new Error("Para escolher um município, informe também o estado. Exemplo: uf MG municipio Belo Horizonte.");
    }

    const normalizedMunicipality = normalize(municipalityQuery);
    const municipalities = state.mu || [];
    const exactMatches = municipalities.filter(item =>
        normalize(item.nm) === normalizedMunicipality || normalize(item.cd) === normalizedMunicipality
    );
    const matches = exactMatches.length
        ? exactMatches
        : municipalities.filter(item => normalize(item.nm).includes(normalizedMunicipality));

    if (matches.length !== 1) {
        if (matches.length > 1) {
            const suggestions = matches.slice(0, 5).map(item => item.nm).join(", ");
            throw new Error(`Encontrei mais de um município para "${municipalityQuery}". Seja mais específico. Sugestões: ${suggestions}.`);
        }
        throw new Error(`Não encontrei o município "${municipalityQuery}" em ${state.ds}. Confira o nome e tente novamente.`);
    }

    const municipality = matches[0];
    return {
        code: `${state.cd}${municipality.cd}`,
        label: `${municipality.nm} - ${state.ds}`
    };
}

function buildResultsUrl(cycle, electionId, locationCode, officeCode) {
    const paddedElectionId = String(electionId).padStart(6, "0");
    const paddedOfficeCode = String(officeCode).padStart(4, "0");
    const directory = locationCode === "br" ? "br" : locationCode.slice(0, 2);
    const file = `${locationCode}-c${paddedOfficeCode}-e${paddedElectionId}-u.jws`;
    return `${TSE_BASE_URL}/${cycle}/${electionId}/dados/${directory}/${file}`;
}

function parseVotes(value) {
    const parsed = Number(String(value ?? "0").replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
}

function collectCandidates(cargo) {
    const candidates = [];

    function visit(node, party = null) {
        if (Array.isArray(node)) {
            for (const item of node) visit(item, party);
            return;
        }
        if (!node || typeof node !== "object") return;

        if (Array.isArray(node.par)) {
            visit(node.par, party);
            return;
        }

        if (Array.isArray(node.cand)) {
            const currentParty = {
                abbreviation: node.sg || node.com || party?.abbreviation || "",
                name: node.nm || party?.name || "",
                number: node.n || party?.number || ""
            };
            for (const candidate of node.cand) {
                if (candidate && typeof candidate === "object") {
                    candidates.push({ ...candidate, party: currentParty });
                }
            }
            return;
        }
    }

    visit(cargo?.agr || []);
    return candidates;
}

function candidateMatches(candidate, query) {
    const normalizedQuery = normalize(query);
    const fields = [
        candidate.n,
        candidate.nmu,
        candidate.nm,
        candidate.party?.abbreviation,
        candidate.party?.name,
        candidate.party?.number
    ];
    return fields.some(value => normalize(value).includes(normalizedQuery));
}

function getCargoData(payload, officeCode) {
    return (payload.carg || []).find(cargo => String(cargo.cd) === officeCode) || null;
}

async function getResults(options = {}) {
    const office = OFFICES[options.office] || OFFICES.presidente;
    const config = await getElectionConfig();
    const selectedElection = selectElection(config, office.code);
    const electionId = String(selectedElection.election.cd);

    const geographyElection = (config.pl || [])
        .filter(plan => plan.c === selectedElection.cycle)
        .flatMap(plan => plan.e || [])
        .find(election => getCargoCodes(election).has("1")) || selectedElection.election;
    const municipalities = await getMunicipalityConfig(selectedElection.cycle, geographyElection.cd);
    const location = findLocation(municipalities, options.state, options.municipality);
    const url = buildResultsUrl(
        selectedElection.cycle,
        electionId,
        location.code,
        office.code
    );
    const cacheKey = `results:${url}`;
    const payload = await fetchTseData(url, `${office.label} em ${location.label}`, cacheKey, RESULTS_CACHE_MS);
    const cargo = getCargoData(payload, office.code);

    if (!cargo) {
        throw new Error(`O TSE ainda não disponibilizou dados para ${office.label} em ${location.label}.`);
    }

    let candidates = collectCandidates(cargo);
    if (options.query) {
        candidates = candidates.filter(candidate => candidateMatches(candidate, options.query));
    }

    candidates = candidates
        .map((candidate, index) => ({ ...candidate, sourceOrder: index }))
        .sort((a, b) =>
            parseVotes(b.vap) - parseVotes(a.vap) ||
            parseVotes(a.seq) - parseVotes(b.seq) ||
            a.sourceOrder - b.sourceOrder
        );

    const totalCandidates = candidates.length;
    const page = Math.max(1, Math.floor(Number(options.page) || 1));
    const pages = Math.max(1, Math.ceil(totalCandidates / PAGE_SIZE));
    const visibleCandidates = candidates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return {
        election: {
            cycle: selectedElection.cycle,
            year: selectedElection.year,
            id: electionId,
            updatedDate: payload.dg || "",
            updatedTime: payload.hg || ""
        },
        office: cargo.nmn || cargo.nmm || office.label,
        location,
        summary: {
            sections: payload.s || {},
            electorate: payload.e || {},
            votes: payload.v || {}
        },
        candidates: visibleCandidates,
        totalCandidates,
        page,
        pages,
        query: options.query || ""
    };
}

module.exports = {
    OFFICES,
    PAGE_SIZE,
    getResults,
    normalize
};
