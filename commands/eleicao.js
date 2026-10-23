const electionResults = require("../functions/electionResults");

const OPTION_ALIASES = Object.freeze({
    cargo: "office",
    office: "office",
    uf: "state",
    estado: "state",
    municipio: "municipality",
    cidade: "municipality",
    busca: "query",
    buscar: "query",
    pesquisar: "query",
    candidato: "query",
    partido: "query",
    pagina: "page",
    page: "page"
});

const OFFICE_ALIASES = Object.freeze({
    presidente: "presidente",
    governador: "governador",
    senador: "senador",
    "deputado federal": "deputado federal",
    "dep federal": "deputado federal",
    "deputado estadual": "deputado estadual",
    "dep estadual": "deputado estadual"
});

const OFFICE_PHRASES = Object.keys(OFFICE_ALIASES)
    .sort((a, b) => b.split(" ").length - a.split(" ").length);

const OFFICIAL_URL = "https://resultados.tse.jus.br/oficial/app/index.html#/eleicao/6258/uf/br/cargo/1/vis/nominal/resultados";

module.exports = {
    name: "eleicao",
    aliases: ["eleição", "eleicoes", "eleições", "eleicao2", "eleição2", "2turno", "segundoturno"],
    description: "Consulta a apuração oficial do 2º turno das eleições (Presidente) no TSE.",
    usage: "{prefix}eleicao",
    examples: [
        "{prefix}eleicao",
        "{prefix}eleicao uf SP",
        "{prefix}eleicao uf MG municipio Belo Horizonte",
        "{prefix}eleicao help"
    ],

    async execute(message) {
        const args = message.args || [];
        if (args.some(arg => ["help", "ajuda"].includes(electionResults.normalize(arg)))) {
            return message.reply({ text: buildHelp(message.prefix || "!") });
        }

        let options;
        try {
            options = parseArguments(args);
            const results = await electionResults.getResults({
                ...options,
                office: "presidente",
                turn: 2,
                electionId: "6258"
            });
            if (options.page > results.pages) {
                throw new Error(`Essa busca tem ${results.pages} página(s), mas você pediu a página ${options.page}.`);
            }
            const output = formatResults(results, message.platform);

            if (typeof output === "string") {
                return message.reply({ text: output });
            }
            return message.reply(output);
        } catch (error) {
            console.error("[ELEICAO] Erro ao consultar a apuração do 2º turno do TSE:", error.message || error);
            return message.reply({
                text: `⚠️ Não consegui consultar os resultados eleitorais agora.\n${error.message || "Tente novamente em instantes."}\n\nFonte oficial: ${OFFICIAL_URL}`
            });
        }
    }
};

module.exports.formatResults = formatResults;

function getOption(token) {
    const equalsIndex = token.indexOf("=");
    const rawKey = equalsIndex >= 0 ? token.slice(0, equalsIndex) : token.replace(/^--?/, "");
    const key = OPTION_ALIASES[electionResults.normalize(rawKey)];
    return key ? { key, value: equalsIndex >= 0 ? token.slice(equalsIndex + 1) : "" } : null;
}

function parseArguments(args) {
    const values = {};
    const positional = [];

    for (let index = 0; index < args.length;) {
        const option = getOption(args[index]);
        if (!option) {
            positional.push(args[index]);
            index += 1;
            continue;
        }

        const collected = option.value ? [option.value] : [];
        index += 1;
        while (index < args.length && !getOption(args[index])) {
            collected.push(args[index]);
            index += 1;
        }
        if (!collected.join(" ").trim()) {
            const optionLabels = {
                office: "cargo",
                state: "estado",
                municipality: "município",
                query: "busca",
                page: "página"
            };
            throw new Error(`Informe um valor após "${optionLabels[option.key]}".`);
        }
        values[option.key] = collected.join(" ").trim();
    }

    let office = values.office ? resolveOffice(values.office) : null;
    const remaining = [];
    const normalizedPositional = positional.map(electionResults.normalize);

    for (let index = 0; index < positional.length;) {
        let matchedOffice = null;
        let matchedLength = 0;
        for (const phrase of OFFICE_PHRASES) {
            const words = phrase.split(" ");
            if (words.every((word, offset) => normalizedPositional[index + offset] === word)) {
                matchedOffice = OFFICE_ALIASES[phrase];
                matchedLength = words.length;
                break;
            }
        }

        if (matchedOffice) {
            if (!office) office = matchedOffice;
            index += matchedLength;
        } else {
            remaining.push(positional[index]);
            index += 1;
        }
    }

    if (!values.state && remaining.length) {
        values.state = remaining.shift();
    }
    if (!values.municipality && remaining.length) {
        values.municipality = remaining.join(" ");
    }

    if (office && office !== "presidente") {
        throw new Error("No 2º turno das eleições 2026, está disponível apenas o cargo de Presidente.\nPara consultar os resultados do 1º turno (governador, senador, deputados), use o comando !eleicao1.");
    }

    const page = values.page ? Number(values.page) : 1;
    if (!Number.isInteger(page) || page < 1) {
        throw new Error("O número da página deve ser um inteiro maior que zero.");
    }

    return {
        office: "presidente",
        state: values.state || "",
        municipality: values.municipality || "",
        query: values.query || "",
        page
    };
}

function resolveOffice(value) {
    const normalized = electionResults.normalize(value).replace(/\s+/g, " ");
    const alias = OFFICE_ALIASES[normalized];
    if (alias) return alias;
    throw new Error("Cargo não reconhecido. No 2º turno, utilize o cargo de Presidente (ou use !eleicao1 para o 1º turno).");
}

function buildHelp(prefix) {
    return [
        "🗳️ *ELEIÇÃO 2º TURNO — RESULTADOS OFICIAIS DO TSE*",
        "",
        "Consulte a parcial oficial do 2º turno para Presidente no Brasil, por estado ou por município.",
        "",
        "📌 *Como usar*",
        `• \`${prefix}eleicao\` — Presidente no Brasil (2º Turno)`,
        `• \`${prefix}eleicao uf MG\` — Presidente em Minas Gerais`,
        `• \`${prefix}eleicao uf SP municipio Campinas\` — Presidente em Campinas/SP`,
        `• \`${prefix}eleicao busca Lula\` — Filtra candidato`,
        "",
        `💡 Para consultar os resultados do 1º turno (Presidente, Governador, Senador, Deputados), use \`${prefix}eleicao1\`.`,
        "",
        `Fonte oficial: ${OFFICIAL_URL}`
    ].join("\n");
}

function number(value) {
    const parsed = Number(String(value ?? "0").replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed.toLocaleString("pt-BR") : "0";
}

function percent(value) {
    const raw = String(value ?? "0,00");
    return raw.includes(",") ? raw : `${raw.replace(".", ",")},00`;
}

function getSummaryLines(results) {
    const { sections, electorate, votes } = results.summary;
    const totalSections = Number(sections.ts || 0);
    const countedSections = Number(sections.st || 0);
    const remainingSections = Math.max(0, totalSections - countedSections);

    return [
        `📊 *PARCIAL — 2º TURNO ${results.election.year}*`,
        `📍 ${results.office} — ${results.location.label}`,
        `🗳️ Apuração: ${number(countedSections)} de ${number(totalSections)} seções (${percent(sections.pst)}%)`,
        `⏳ Faltam: ${number(remainingSections)} seções`,
        `✅ Votos válidos: ${number(votes.vvc ?? votes.vv)}`,
        `⬜ Brancos: ${number(votes.vb)}`,
        `🚫 Nulos: ${number(votes.vn)}`,
        `👥 Comparecimento: ${number(electorate.c)}`,
        `🕒 Atualização TSE: ${results.election.updatedDate} ${results.election.updatedTime}`
    ];
}

function getCandidateLines(results) {
    if (!results.candidates.length) {
        return ["Nenhum candidato encontrado para essa busca."];
    }

    const candidateLines = results.candidates.map(candidate => {
        const name = candidate.nmu || candidate.nm || "Candidato sem nome";
        const party = [candidate.party?.abbreviation, candidate.n]
            .filter(Boolean)
            .join("-");
        return [
            `👤 *${name}* — ${percent(candidate.pvap)}%`,
            party ? `🏷️ ${party}` : "",
            `🗳️ ${number(candidate.vap)} votos`
        ].filter(Boolean).join("\n");
    });

    if (results.totalCandidates > electionResults.PAGE_SIZE && results.page < results.pages) {
        candidateLines.push(`📄 Página ${results.page}/${results.pages}. Use \`pagina ${results.page + 1}\` para ver a próxima.`);
    } else if (results.pages > 1) {
        candidateLines.push(`📄 Página ${results.page}/${results.pages}.`);
    }
    if (results.query) {
        candidateLines.unshift(`🔎 Busca: ${results.query}`);
    }
    return candidateLines;
}

function formatResults(results, platform) {
    const summary = getSummaryLines(results);
    const candidates = getCandidateLines(results);
    const title = `🗳️ 2º Turno — ${results.office} — ${results.location.label}`;

    if (platform === "discord") {
        const candidateList = candidates.join("\n\n");
        return {
            embed: {
                color: 0x168A50,
                title,
                description: [...summary.slice(2), "", "📋 *Candidatos*", "", candidateList].join("\n"),
                footer: { text: "Fonte oficial: Tribunal Superior Eleitoral (TSE) — 2º Turno" }
            }
        };
    }

    if (platform === "telegram") {
        const escapeHtml = value => String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        const telegramText = value => escapeHtml(value).replace(/\*([^*]+)\*/g, "<b>$1</b>");
        const telegramSummary = summary.map(telegramText);
        const telegramCandidates = candidates.map(telegramText);
        return {
            text: `${telegramSummary.join("\n")}\n\n📋 CANDIDATOS\n\n${telegramCandidates.join("\n\n")}\n\nFonte: TSE — ${OFFICIAL_URL}`,
            parse_mode: "HTML"
        };
    }

    return `${summary.join("\n")}\n\n📋 *CANDIDATOS*\n\n${candidates.join("\n\n")}\n\nFonte: TSE — ${OFFICIAL_URL}`;
}
