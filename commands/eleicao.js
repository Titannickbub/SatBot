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

module.exports = {
    name: "eleicao",
    aliases: ["eleição", "eleicoes", "eleições"],
    description: "Consulta a apuração oficial das eleições no TSE por cargo, estado e município.",
    usage: "{prefix}eleicao",
    examples: [
        "{prefix}eleicao",
        "{prefix}eleicao governador uf MG municipio Belo Horizonte",
        "{prefix}eleicao deputado federal uf SP busca PT",
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
            const results = await electionResults.getResults(options);
            if (options.page > results.pages) {
                throw new Error(`Essa busca tem ${results.pages} página(s), mas você pediu a página ${options.page}.`);
            }
            const output = formatResults(results, message.platform);

            if (typeof output === "string") {
                return message.reply({ text: output });
            }
            return message.reply(output);
        } catch (error) {
            console.error("[ELEICAO] Erro ao consultar a apuração do TSE:", error.message || error);
            return message.reply({
                text: `⚠️ Não consegui consultar os resultados eleitorais agora.\n${error.message || "Tente novamente em instantes."}\n\nFonte oficial: https://resultados.tse.jus.br/`
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

    office = office || "presidente";
    if (!electionResults.OFFICES[office]) {
        throw new Error("Cargo não reconhecido. Use presidente, governador, senador, deputado federal ou deputado estadual.");
    }

    if (["deputado federal", "deputado estadual"].includes(office) && !values.query) {
        throw new Error("Para evitar uma lista enorme, informe uma busca por nome, número ou partido para deputados. Exemplo: busca 1313.");
    }

    const page = values.page ? Number(values.page) : 1;
    if (!Number.isInteger(page) || page < 1) {
        throw new Error("O número da página deve ser um inteiro maior que zero.");
    }

    return {
        office,
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
    throw new Error("Cargo não reconhecido. Use presidente, governador, senador, deputado federal ou deputado estadual.");
}

function buildHelp(prefix) {
    return [
        "🗳️ *ELEIÇÃO — RESULTADOS OFICIAIS DO TSE*",
        "",
        "Consulte a parcial por cargo, estado ou município. Sem opções, mostra todos os candidatos a presidente no Brasil.",
        "",
        "📌 *Como usar*",
        `• \`${prefix}eleicao\` — Presidente no Brasil`,
        `• \`${prefix}eleicao presidente uf MG\` — Presidente em um estado`,
        `• \`${prefix}eleicao governador uf MG municipio Belo Horizonte\``,
        `• \`${prefix}eleicao senador uf SP\``,
        `• \`${prefix}eleicao deputado federal uf SP busca PT\` — filtra por partido`,
        `• \`${prefix}eleicao deputado estadual uf RJ busca nome do candidato\``,
        "",
        "🔎 Para deputados, a busca é obrigatória e pode ser por nome, número ou partido. Os resultados aparecem em páginas de 15; avance com `pagina 2`, `pagina 3` etc.",
        "📍 Município exige estado. Não há filtro por seção: a apuração usa todas as seções da localidade escolhida.",
        "",
        "Os dados são publicados pelo TSE e podem estar zerados antes do início da apuração. O horário de atualização aparece no resultado."
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
        `📊 *PARCIAL — ${results.election.year}*`,
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
    const title = `🗳️ ${results.office} — ${results.location.label}`;

    if (platform === "discord") {
        const candidateList = candidates.join("\n\n");
        return {
            embed: {
                color: 0x168A50,
                title,
                description: [...summary.slice(2), "", "📋 *Candidatos*", "", candidateList].join("\n"),
                footer: { text: "Fonte oficial: Tribunal Superior Eleitoral (TSE)" }
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
            text: `${telegramSummary.join("\n")}\n\n📋 CANDIDATOS\n\n${telegramCandidates.join("\n\n")}\n\nFonte: TSE — https://resultados.tse.jus.br/`,
            parse_mode: "HTML"
        };
    }

    return `${summary.join("\n")}\n\n📋 *CANDIDATOS*\n\n${candidates.join("\n\n")}\n\nFonte: TSE — https://resultados.tse.jus.br/`;
}
