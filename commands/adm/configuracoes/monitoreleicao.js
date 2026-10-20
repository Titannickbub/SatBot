const electionMonitor = require("../../../functions/electionMonitor");
const electionResults = require("../../../functions/electionResults");
const schedulerHelper = require("../../../functions/schedulerHelper");
const { isOwner } = require("../../../functions/owners");

const OPTION_ALIASES = Object.freeze({
    cargo: "office",
    uf: "state",
    estado: "state",
    municipio: "municipality",
    cidade: "municipality",
    busca: "query",
    buscar: "query",
    pesquisar: "query",
    candidato: "query",
    partido: "query",
    intervalo: "interval",
    cada: "interval",
    every: "interval",
    inicio: "delay",
    apos: "delay",
    depois: "delay",
    delay: "delay"
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

function getTarget(message) {
    return {
        platform: message.platform,
        chatId: message.chatId,
        threadId: message.threadId || null,
        chatName: message.chatName || null
    };
}

async function canConfigure(message) {
    if (message.isPrivate || message.sender?.isOwner || isOwner(message)) return true;
    const adapter = (message.platforms || []).find(platform => platform.name === message.platform);
    if (adapter?.checkUserPermission) {
        return adapter.checkUserPermission(message.chatId, message.userId);
    }
    return Boolean(message.sender?.isAdmin || message.isAdmin);
}

function getOption(token) {
    const normalized = electionResults.normalize(token);
    return OPTION_ALIASES[normalized] ? { key: OPTION_ALIASES[normalized] } : null;
}

function parseDuration(value, label, allowZero = false) {
    const normalized = String(value || "").replace(/\s+/g, "").toLowerCase();
    if (allowZero && /^0+(s|m|h|d)?$/.test(normalized)) return 0;
    if (!/^(?:\d+[dhms])+$/.test(normalized)) {
        throw new Error(`Formato de ${label} inválido. Use, por exemplo, 5m, 2h ou 1h30m.`);
    }
    const milliseconds = schedulerHelper.parseIntervalToMs(normalized);
    if (!milliseconds || (allowZero && milliseconds < 0)) {
        throw new Error(`${label} precisa ser maior que zero.`);
    }
    return milliseconds;
}

function parseJobArguments(args) {
    const values = {};
    const positional = [];

    for (let index = 0; index < args.length;) {
        const option = getOption(args[index]);
        if (!option) {
            positional.push(args[index]);
            index += 1;
            continue;
        }

        const optionToken = args[index];
        const collected = [];
        index += 1;
        while (index < args.length && !getOption(args[index])) {
            collected.push(args[index]);
            index += 1;
        }
        if (!collected.length) throw new Error(`Informe um valor após "${optionToken}".`);
        if (values[option.key]) throw new Error(`A opção "${option.key}" foi informada mais de uma vez.`);
        values[option.key] = collected.join(" ").trim();
    }

    const normalized = positional.map(electionResults.normalize);
    let office = null;
    const remaining = [];
    for (let index = 0; index < positional.length;) {
        const phrase = OFFICE_PHRASES.find(candidate => {
            const words = candidate.split(" ");
            return words.every((word, offset) => normalized[index + offset] === word);
        });
        if (phrase) {
            office = office || OFFICE_ALIASES[phrase];
            index += phrase.split(" ").length;
        } else {
            remaining.push(positional[index]);
            index += 1;
        }
    }

    if (values.office) {
        const value = electionResults.normalize(values.office).replace(/\s+/g, " ");
        office = OFFICE_ALIASES[value];
        if (!office) throw new Error("Cargo inválido. Use presidente, governador, senador, deputado federal ou deputado estadual.");
    }

    if (!office) {
        throw new Error("Informe um cargo. Ex.: `add presidente intervalo 5m inicio 0m`.");
    }

    const intervalMs = parseDuration(values.interval || "5m", "intervalo");
    if (intervalMs < 60_000) throw new Error("O intervalo mínimo entre consultas é 1 minuto.");
    const initialDelayMs = values.delay === undefined
        ? intervalMs
        : parseDuration(values.delay, "atraso inicial", true);
    if (initialDelayMs > 30 * 24 * 60 * 60 * 1000) {
        throw new Error("O atraso inicial máximo é 30 dias.");
    }

    if (!values.state && remaining.length) values.state = remaining.shift();
    if (!values.municipality && remaining.length) values.municipality = remaining.join(" ");

    if (office.startsWith("deputado") && !values.query) {
        throw new Error("Para monitorar deputados, informe uma busca por nome, número ou partido. Ex.: busca PT.");
    }

    return {
        office,
        state: values.state || "",
        municipality: values.municipality || "",
        query: values.query || "",
        intervalMs,
        initialDelayMs
    };
}

function formatJobStatus(job, schedule, index) {
    const next = schedule?.state?.nextFireAt
        ? new Date(schedule.state.nextFireAt).toLocaleString("pt-BR")
        : "aguardando ativação";
    const cadence = electionMonitor.formatDuration(job.intervalMs);
    const delay = electionMonitor.formatDuration(job.initialDelayMs);
    const query = job.query ? ` · busca: ${job.query}` : "";
    return [
        `${index + 1}. *${electionMonitor.getJobLabel(job)}* (ID: \`${job.id}\`)`,
        `   Início: ${delay} · repetição: a cada ${cadence}${query}`,
        `   Próximo envio: ${next}`
    ].join("\n");
}

module.exports = {
    name: "monitoreleicao",
    aliases: ["monitoreleicoes", "monitoreleição"],
    category: "adm/configurações",
    description: "Agenda parciais eleitorais do TSE por cargo e localidade, com início e intervalo configuráveis.",
    usage: "{prefix}monitoreleicao <add|remove|on|off|status|run|help>",
    examples: [
        "{prefix}monitoreleicao add presidente intervalo 5m inicio 0m",
        "{prefix}monitoreleicao add senador uf MG intervalo 10m inicio 30m",
        "{prefix}monitoreleicao add governador uf MG municipio Belo Horizonte intervalo 5m inicio 0m",
        "{prefix}monitoreleicao on"
    ],

    async execute(message) {
        const target = getTarget(message);
        const prefix = message.prefix || "!";
        const args = [...(message.args || [])];
        const action = electionResults.normalize(args.shift() || "status");

        if (["help", "ajuda"].includes(action)) {
            return message.reply({ text: buildHelp(prefix) });
        }

        const config = electionMonitor.loadMonitorConfig(target);
        if (action === "status") {
            return message.reply({ text: buildStatus(config, target) });
        }

        if (!await canConfigure(message)) {
            return message.reply({ text: "❌ Apenas administradores podem configurar o monitor eleitoral deste chat." });
        }

        try {
            if (action === "add" || action === "adicionar") {
                const jobOptions = parseJobArguments(args);
                if (config.jobs.length >= 20) {
                    throw new Error("Este chat já possui 20 consultas configuradas. Remova uma antes de adicionar outra.");
                }
                await electionResults.getResults({ ...jobOptions, page: 1 });
                const job = electionMonitor.createJob(jobOptions);
                const updated = electionMonitor.saveMonitorConfig({ jobs: [...config.jobs, job] }, target);
                await electionMonitor.syncMonitorSchedules(updated, target);
                return message.reply({
                    text: `✅ Monitor adicionado (ID: \`${job.id}\`):\n${electionMonitor.getJobLabel(job)}\nInício: ${electionMonitor.formatDuration(job.initialDelayMs)} · repetição: a cada ${electionMonitor.formatDuration(job.intervalMs)}\n\n${updated.enabled ? "Está ativo neste chat." : `Está pausado. Use \`${prefix}monitoreleicao on\` para iniciar.`}`
                });
            }

            if (["remove", "remover", "del", "delete"].includes(action)) {
                const id = args[0];
                if (!id) return message.reply({ text: `❌ Informe o ID da consulta. Veja com \`${prefix}monitoreleicao status\`.` });
                const jobs = electionResults.normalize(id) === "all"
                    ? []
                    : config.jobs.filter(job => job.id !== id);
                if (jobs.length === config.jobs.length) {
                    throw new Error(`Não encontrei uma consulta com ID "${id}".`);
                }
                const updated = electionMonitor.saveMonitorConfig({ jobs }, target);
                await electionMonitor.syncMonitorSchedules(updated, target);
                return message.reply({ text: electionResults.normalize(id) === "all" ? "✅ Todas as consultas eleitorais foram removidas." : `✅ Consulta ${id} removida.` });
            }

            if (["on", "ativar", "enable", "off", "desativar", "disable"].includes(action)) {
                if (!config.jobs.length) {
                    throw new Error(`Nenhuma consulta configurada. Adicione uma com \`${prefix}monitoreleicao add ...\`.`);
                }
                const enabled = ["on", "ativar", "enable"].includes(action);
                const updated = electionMonitor.saveMonitorConfig({ enabled }, target);
                await electionMonitor.syncMonitorSchedules(updated, target);
                return message.reply({ text: enabled ? "✅ Monitor eleitoral ativado." : "ℹ️ Monitor eleitoral pausado." });
            }

            if (action === "run" || action === "agora") {
                const selected = args[0] && electionResults.normalize(args[0]) !== "all"
                    ? config.jobs.filter(job => job.id === args[0])
                    : config.jobs;
                if (!selected.length) throw new Error("Não há consultas eleitorais para executar.");

                const adapter = global.platformRegistry?.[message.platform] || null;
                for (const job of selected) {
                    const result = await electionMonitor.runElectionMonitor({
                        config,
                        jobId: job.id,
                        send: Boolean(adapter),
                        target,
                        adapter
                    });
                    if (!adapter) {
                        await message.reply({ text: result.text });
                    }
                }
                if (adapter) return message.reply({ text: `✅ ${selected.length} parcial(is) enviada(s) agora.` });
                return;
            }

            return message.reply({ text: buildHelp(prefix) });
        } catch (error) {
            console.error("[MONITORELEICAO] Erro ao atualizar ou executar monitor:", error.message || error);
            return message.reply({ text: `⚠️ ${error.message || "Não foi possível concluir a operação do monitor eleitoral."}` });
        }
    }
};

function buildStatus(config, target) {
    const schedules = target?.platform && target?.chatId
        ? schedulerHelper.listSchedules(target.chatId, target.platform)
            .filter(schedule => schedule.meta?.kind === "election-monitor" && (schedule.threadId || null) === (target.threadId || null))
        : [];
    const schedulesByJob = new Map(schedules.map(schedule => [schedule.meta.jobId, schedule]));
    const lines = [
        "🗳️ *MONITOR ELEITORAL*",
        "",
        `Status: ${config.enabled ? "✅ Ativo" : "⏸️ Pausado"}`,
        `Consultas: ${config.jobs.length}`
    ];
    if (config.jobs.length) {
        lines.push("", ...config.jobs.map((job, index) => formatJobStatus(job, schedulesByJob.get(job.id), index)));
    } else {
        lines.push("", "Nenhuma consulta configurada.");
    }
    return lines.join("\n");
}

function buildHelp(prefix) {
    return [
        "🗳️ *MONITORELEICAO — AJUDA*",
        "",
        "Configure várias parciais oficiais por chat. Cada consulta inicia no atraso escolhido e depois se repete no intervalo configurado.",
        "",
        `• \`${prefix}monitoreleicao add presidente intervalo 5m inicio 0m\``,
        `• \`${prefix}monitoreleicao add senador uf MG intervalo 10m inicio 30m\``,
        `• \`${prefix}monitoreleicao add governador uf MG municipio Belo Horizonte intervalo 5m inicio 0m\``,
        `• \`${prefix}monitoreleicao add deputado federal uf SP busca PT intervalo 15m inicio 0m\``,
        `• \`${prefix}monitoreleicao on\` / \`${prefix}monitoreleicao off\` — Ativa ou pausa todos os envios.`,
        `• \`${prefix}monitoreleicao status\` — Exibe as consultas, horários e IDs.`,
        `• \`${prefix}monitoreleicao run [ID|all]\` — Envia uma ou todas as parciais agora.`,
        `• \`${prefix}monitoreleicao remove <ID|all>\` — Remove uma ou todas as consultas.`,
        "",
        "Cargos: presidente, governador, senador, deputado federal e deputado estadual.",
        "Município exige estado. Para deputados, busca por nome, número ou partido é obrigatória. Intervalo mínimo entre consultas: 1 minuto; atraso inicial padrão: o mesmo intervalo.",
        "Os horários usam o fuso local do servidor. O início `0m` dispara no próximo ciclo do agendador (até 30 segundos)."
    ].join("\n");
}
