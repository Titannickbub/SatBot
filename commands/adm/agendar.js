/*
=================================================================

COMANDO: !agendar

Gerencia agendamentos de mensagens automáticas por chat.
Os dados ficam em settings/schedules.json (independente do config do grupo).

Sub-comandos:
  !agendar list
  !agendar add <nome>
  !agendar del <id>
  !agendar on <id>
  !agendar off <id>
  !agendar status <id>
  !agendar test <id>
  !agendar set <id> trigger interval <Xh Ym>
  !agendar set <id> trigger fixed <HH:MM> [HH:MM ...]
  !agendar set <id> repeat once|daily|weekly|monthly [args]
  !agendar set <id> text <mensagem...>
  !agendar set <id> media [url]
  !agendar set <id> mode text|media
  !agendar help

=================================================================
*/

const {
    addSchedule,
    editSchedule,
    removeSchedule,
    listSchedules,
    getSchedule,
    parseIntervalToMs,
    parseDayOfWeek,
    formatMs,
    formatTs,
    storeMedia
} = require("../../functions/schedulerHelper");

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ─────────────────────────────────────────────────────────────
// Helpers de permissão
// ─────────────────────────────────────────────────────────────

async function checkPermission(message) {
    if (message.sender?.isOwner) return true;
    const adapter = (message.platforms || []).find(p => p.name === message.platform);
    if (adapter?.checkUserPermission) {
        return adapter.checkUserPermission(message.chatId, message.userId);
    }
    return !!(message.sender?.isAdmin);
}

// ─────────────────────────────────────────────────────────────
// Formatação
// ─────────────────────────────────────────────────────────────

function fmtTrigger(s) {
    if (!s.trigger) return "—";
    if (s.trigger.type === "interval") {
        return `Intervalo: ${formatMs(s.trigger.intervalMs)}`;
    }
    if (s.trigger.type === "fixed") {
        return `Horário fixo: ${(s.trigger.times || []).join(", ") || "—"}`;
    }
    return "—";
}


function fmtRepeat(s) {
    if (!s.repeat) return "—";
    const m = s.repeat.mode;
    if (m === "once")    return "Uma vez";
    if (m === "daily")   return "Diário";
    if (m === "weekly") {
        const days = (s.repeat.days || []).map(d => DAY_NAMES[d] || d).join(", ");
        return `Semanal: ${days || "—"}`;
    }
    if (m === "monthly") return `Mensal: dia ${s.repeat.monthDay || "—"}`;
    return m;
}

function fmtStatus(s) {
    const icon = s.enabled ? "✅" : "🔕";
    const done = s.state?.done ? " (concluído)" : "";
    return `${icon}${done}`;
}

function scheduleCard(s, prefix) {
    const lines = [
        `📅 *[${s.id}] ${s.name}*`,
        `  Estado: ${fmtStatus(s)}`,
        `  Trigger: ${fmtTrigger(s)}`,
        `  Repetição: ${fmtRepeat(s)}`,
        `  Modo: ${s.message?.mode === "media" ? "🖼 Mídia + Texto" : "📝 Texto"}`,
        `  Texto: "${s.message?.text || "—"}"`,
        `  Próximo disparo: ${formatTs(s.state?.nextFireAt)}`,
        `  Disparos: ${s.state?.firedCount ?? 0}`
    ];
    return lines.join("\n");
}

function helpText(message) {
    const p = message.prefix;
    const plat = message.platform;

    let header = '*⏰ SISTEMA DE AGENDAMENTOS — AJUDA*';
    if (plat === 'discord') header = '🎮 *AGENDAMENTOS (Discord) — AJUDA*';
    else if (plat === 'whatsapp') header = '📱 *AGENDAMENTOS (WhatsApp) — AJUDA*';
    else if (plat === 'telegram') header = '✈️ *AGENDAMENTOS (Telegram) — AJUDA*';

    const lines = [];
    lines.push(header);
    lines.push('');
    lines.push('*Criação e gerenciamento:*');
    lines.push('  `' + p + 'agendar list` — Lista agendamentos do chat');
    lines.push('  `' + p + 'agendar add <nome>` — Cria novo agendamento (desativado)');
    lines.push('  `' + p + 'agendar del <id>` — Remove agendamento');
    lines.push('  `' + p + 'agendar on <id>` — Ativa');
    lines.push('  `' + p + 'agendar off <id>` — Desativa');
    lines.push('  `' + p + 'agendar status <id>` — Detalhes do agendamento');
    lines.push('  `' + p + 'agendar test <id>` — Dispara imediatamente (teste)');
    lines.push('');
    lines.push('*Configuração de gatilho (`set ... trigger`):*');
    lines.push('  `' + p + 'agendar set <id> trigger interval 2h30m` — A cada X tempo');
    lines.push('  `' + p + 'agendar set <id> trigger fixed 07:00 20:00` — Em horário(s) fixo(s)');
    lines.push('');
    lines.push('*Configuração de repetição (`set ... repeat`):*');
    lines.push('  `' + p + 'agendar set <id> repeat once` — Executa uma vez');
    lines.push('  `' + p + 'agendar set <id> repeat daily` — Todo dia');
    lines.push('  `' + p + 'agendar set <id> repeat weekly seg qua sex` — Dias da semana');
    lines.push('  `' + p + 'agendar set <id> repeat monthly 15` — Dia 15 de cada mês');
    lines.push('');
    lines.push('*Mensagem e mídia:*');
    lines.push('  `' + p + 'agendar set <id> text <texto...>` — Define o texto');
    lines.push('  `' + p + 'agendar set <id> mode text|media` — Alterna modo');
    lines.push('  `' + p + 'agendar set <id> media <url>` — Mídia via URL');
    lines.push('  `' + p + 'agendar set <id> media` — Mídia via anexo ou reply');
    lines.push('');
    lines.push('*Dias da semana aceitos:* seg/mon, ter/tue, qua/wed, qui/thu, sex/fri, sab/sat, dom/sun ou 0-6');

    lines.push('');
    lines.push('💡 EXEMPLOS:');
    lines.push('  ' + p + 'agendar list');
    lines.push('  ' + p + 'agendar add Bom dia');
    lines.push('  ' + p + 'agendar set abc1 trigger fixed 07:00');
    lines.push('  ' + p + 'agendar set abc1 repeat daily');
    lines.push('  ' + p + 'agendar set abc1 text Bom dia! ☀️');
    lines.push('  ' + p + 'agendar on abc1');

    return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────
// Handlers de subcomandos
// ─────────────────────────────────────────────────────────────

async function handleList(message) {
    const list = listSchedules(message.chatId, message.platform);
    if (!list.length) {
        return message.reply({ text: `📋 Nenhum agendamento configurado para este chat.\n\nCrie com \`${message.prefix}agendar add <nome>\`.` });
    }
    const lines = list.map(s => scheduleCard(s, message.prefix));
    return message.reply({ text: lines.join("\n\n─────────────────\n") });
}

async function handleAdd(message, args) {
    const name = args.slice(1).join(" ").trim();
    if (!name) {
        return message.reply({ text: `❌ Informe o nome do agendamento.\nExemplo: \`${message.prefix}agendar add Bom dia\`` });
    }

    const schedule = addSchedule({
        name,
        chatId:   message.chatId,
        threadId: message.threadId || null,
        platform: message.platform,
        chatName: message.raw?.chat?.title
            || message.raw?.guild?.name
            || null
    });

    return message.reply({
        text: [
            `✅ Agendamento *"${schedule.name}"* criado! ID: \`${schedule.id}\``,
            ``,
            `Configure antes de ativar:`,
            `  • Gatilho: \`${message.prefix}agendar set ${schedule.id} trigger fixed 07:00\``,
            `  • Repetição: \`${message.prefix}agendar set ${schedule.id} repeat daily\``,
            `  • Texto: \`${message.prefix}agendar set ${schedule.id} text Bom dia!\``,
            `  • Ativar: \`${message.prefix}agendar on ${schedule.id}\``
        ].join("\n")
    });
}

async function handleDel(message, args) {
    const id = args[1];
    if (!id) return message.reply({ text: `❌ Informe o ID do agendamento.` });

    const s = getSchedule(id);
    if (!s || (s.chatId !== message.chatId || s.platform !== message.platform)) {
        return message.reply({ text: `❌ Agendamento \`${id}\` não encontrado neste chat.` });
    }

    removeSchedule(id);
    return message.reply({ text: `🗑️ Agendamento *"${s.name}"* (\`${id}\`) removido.` });
}

async function handleOnOff(message, args) {
    const enabling = args[0].toLowerCase() === "on";
    const id = args[1];
    if (!id) return message.reply({ text: `❌ Informe o ID do agendamento.` });

    const s = getSchedule(id);
    if (!s || s.chatId !== message.chatId || s.platform !== message.platform) {
        return message.reply({ text: `❌ Agendamento \`${id}\` não encontrado neste chat.` });
    }

    // Validações antes de ativar
    if (enabling) {
        if (!s.message?.text && s.message?.mode !== "media") {
            return message.reply({ text: `⚠️ Configure um texto antes de ativar: \`${message.prefix}agendar set ${id} text <texto>\`` });
        }
        if (!s.trigger?.type) {
            return message.reply({ text: `⚠️ Configure um gatilho antes de ativar: \`${message.prefix}agendar set ${id} trigger ...\`` });
        }
    }

    const updated = editSchedule(id, { enabled: enabling });
    const icon    = enabling ? "✅" : "🔕";
    return message.reply({
        text: `${icon} Agendamento *"${updated.name}"* ${enabling ? "ativado" : "desativado"}.\n  Próximo disparo: ${formatTs(updated.state?.nextFireAt)}`
    });
}

async function handleStatus(message, args) {
    const id = args[1];
    if (!id) return message.reply({ text: `❌ Informe o ID do agendamento.` });

    const s = getSchedule(id);
    if (!s || s.chatId !== message.chatId || s.platform !== message.platform) {
        return message.reply({ text: `❌ Agendamento \`${id}\` não encontrado neste chat.` });
    }

    return message.reply({ text: scheduleCard(s, message.prefix) });
}

async function handleTest(message, args) {
    const id = args[1];
    if (!id) return message.reply({ text: `❌ Informe o ID do agendamento.` });

    const s = getSchedule(id);
    if (!s || s.chatId !== message.chatId || s.platform !== message.platform) {
        return message.reply({ text: `❌ Agendamento \`${id}\` não encontrado neste chat.` });
    }

    // Importa e dispara usando o fireSchedule interno via schedulerHelper
    const { fireSchedule } = require("../../functions/schedulerHelper");
    if (typeof fireSchedule !== "function") {
        // fireSchedule não é exportado — faz disparo inline
        const registry = global.platformRegistry || {};
        const adapter  = registry[s.platform];
        if (!adapter) return message.reply({ text: `❌ Plataforma \`${s.platform}\` não disponível.` });

        const msg = s.message;
        try {
            if (msg.mode === "media" && msg.media?.url) {
                const type = msg.media.type || "photo";
                if (type === "video") {
                    await adapter.sendVideo(s.chatId, s.threadId, msg.media.url, msg.text || "");
                } else {
                    await adapter.sendImg(s.chatId, s.threadId, msg.media.url, msg.text || "");
                }
            } else {
                await adapter.sendText(s.chatId, s.threadId, msg.text || "(mensagem vazia)");
            }
            return message.reply({ text: `🧪 Teste do agendamento *"${s.name}"* enviado!` });
        } catch (err) {
            return message.reply({ text: `❌ Erro no teste: ${err.message}` });
        }
    }

    await fireSchedule(s);
    return message.reply({ text: `🧪 Teste do agendamento *"${s.name}"* enviado!` });
}

// ─────────────────────────────────────────────────────────────
// handleSet — !agendar set <id> <campo> [valores...]
// ─────────────────────────────────────────────────────────────

async function handleSet(message, args) {
    // args: ["set", "<id>", "<campo>", ...resto]
    const id    = args[1];
    const field = (args[2] || "").toLowerCase();
    const rest  = args.slice(3);

    if (!id || !field) {
        return message.reply({ text: `❌ Uso: \`${message.prefix}agendar set <id> <campo> <valor>\`` });
    }

    const s = getSchedule(id);
    if (!s || s.chatId !== message.chatId || s.platform !== message.platform) {
        return message.reply({ text: `❌ Agendamento \`${id}\` não encontrado neste chat.` });
    }

    // ── trigger ───────────────────────────────────────────────
    if (field === "trigger") {
        const subtype = (rest[0] || "").toLowerCase();

        if (subtype === "interval") {
            const intervalStr = rest[1] || "";
            const ms = parseIntervalToMs(intervalStr);
            if (!ms) {
                return message.reply({ text: `❌ Intervalo inválido. Exemplos: \`30m\`, \`1h\`, \`2h30m\`, \`1d\`` });
            }
            editSchedule(id, { trigger: { type: "interval", intervalMs: ms, times: [] } });
            return message.reply({ text: `✅ Gatilho definido: a cada *${formatMs(ms)}*.` });
        }

        if (subtype === "fixed") {
            const times = rest.slice(1).filter(t => /^\d{1,2}:\d{2}$/.test(t));
            if (!times.length) {
                return message.reply({ text: `❌ Informe pelo menos um horário no formato HH:MM.\nExemplo: \`${message.prefix}agendar set ${id} trigger fixed 07:00 20:00\`` });
            }
            editSchedule(id, { trigger: { type: "fixed", intervalMs: null, times } });
            return message.reply({ text: `✅ Gatilho definido: horários fixos *${times.join(", ")}*.` });
        }

        return message.reply({ text: `❌ Tipo de gatilho inválido. Use \`interval\` ou \`fixed\`.` });
    }

    // ── repeat ────────────────────────────────────────────────
    if (field === "repeat") {
        const mode = (rest[0] || "").toLowerCase();

        if (mode === "once") {
            editSchedule(id, { repeat: { mode: "once", days: [], monthDay: null } });
            return message.reply({ text: `✅ Repetição: *uma vez* (será desativado após disparar).` });
        }

        if (mode === "daily") {
            editSchedule(id, { repeat: { mode: "daily", days: [], monthDay: null } });
            return message.reply({ text: `✅ Repetição: *diário*.` });
        }

        if (mode === "weekly") {
            const days = rest.slice(1).map(parseDayOfWeek).filter(d => d !== null);
            if (!days.length) {
                return message.reply({ text: `❌ Informe pelo menos um dia da semana.\nExemplo: \`${message.prefix}agendar set ${id} repeat weekly seg qua sex\`` });
            }
            const uniqueDays = [...new Set(days)].sort((a, b) => a - b);
            editSchedule(id, { repeat: { mode: "weekly", days: uniqueDays, monthDay: null } });
            const dayNames = uniqueDays.map(d => DAY_NAMES[d]).join(", ");
            return message.reply({ text: `✅ Repetição: semanal nos dias *${dayNames}*.` });
        }

        if (mode === "monthly") {
            const day = Number(rest[1]);
            if (!day || day < 1 || day > 31) {
                return message.reply({ text: `❌ Informe o dia do mês (1–31).\nExemplo: \`${message.prefix}agendar set ${id} repeat monthly 15\`` });
            }
            editSchedule(id, { repeat: { mode: "monthly", days: [], monthDay: day } });
            return message.reply({ text: `✅ Repetição: mensal, dia *${day}*.` });
        }

        return message.reply({ text: `❌ Modo inválido. Use: \`once\`, \`daily\`, \`weekly\`, \`monthly\`.` });
    }

    // ── text ──────────────────────────────────────────────────
    if (field === "text" || field === "texto") {
        const text = (message.getArgText ? message.getArgText(3) : rest.join(" ")).trim();
        if (!text) return message.reply({ text: `❌ Informe o texto da mensagem.` });
        editSchedule(id, { message: { text } });
        return message.reply({ text: `✅ Texto atualizado:\n"${text}"` });
    }

    // ── mode ──────────────────────────────────────────────────
    if (field === "mode" || field === "modo") {
        const mode = (rest[0] || "").toLowerCase();
        if (mode !== "text" && mode !== "media" && mode !== "texto" && mode !== "midia") {
            return message.reply({ text: `❌ Modo inválido. Use \`text\` ou \`media\`.` });
        }
        const normalized = (mode === "texto" || mode === "text") ? "text" : "media";
        editSchedule(id, { message: { mode: normalized } });
        return message.reply({ text: `✅ Modo: *${normalized === "media" ? "🖼 Mídia + Texto" : "📝 Apenas Texto"}*.` });
    }

    // ── media / midia ─────────────────────────────────────────
    if (field === "media" || field === "midia") {
        const urlArg = rest[0];

        // 1. URL direta
        if (urlArg && /^https?:\/\//i.test(urlArg)) {
            let mediaType = "photo";
            const lower = urlArg.toLowerCase();
            if (lower.includes(".mp4") || lower.includes("video")) mediaType = "video";
            else if (lower.includes(".gif")) mediaType = "gif";
            editSchedule(id, { message: { media: { url: urlArg, type: mediaType } } });
            return message.reply({ text: `✅ Mídia configurada via URL.\nTipo: ${mediaType.toUpperCase()}` });
        }

        // 2. Anexo ou mensagem citada
        const targetMedia = message.media || message.quoted?.media;
        if (targetMedia && typeof targetMedia.getBuffer === "function") {
            await message.reply({ text: `⏳ Baixando e armazenando mídia...` });
            try {
                const buffer = await targetMedia.getBuffer();
                if (!buffer) return message.reply({ text: `❌ Não foi possível extrair a mídia.` });

                const uploaded = await storeMedia(
                    message.platform,
                    message,
                    buffer,
                    targetMedia.fileName || "schedule_media",
                    targetMedia.mimeType || "image/png"
                );

                const updateObj = { message: { media: { url: uploaded.url, type: uploaded.type } } };
                const captionText = (message.getArgText ? message.getArgText(3) : "").trim();
                if (captionText && !/^https?:\/\//i.test(captionText)) {
                    updateObj.message.text = captionText;
                }

                editSchedule(id, updateObj);

                return message.reply({
                    text: [
                        `✅ Mídia armazenada com sucesso!`,
                        `📁 Tipo: ${uploaded.type.toUpperCase()}`,
                        `📊 Tamanho: ${(uploaded.size / (1024 * 1024)).toFixed(2)} MB`,
                        `💡 Ative o modo mídia: \`${message.prefix}agendar set ${id} mode media\``
                    ].join("\n")
                });
            } catch (err) {
                return message.reply({ text: `❌ Erro ao salvar mídia: ${err.message}` });
            }
        }

        // 3. Nenhuma mídia encontrada
        return message.reply({
            text: [
                `❌ Nenhuma mídia detectada.`,
                ``,
                `Como definir a mídia:`,
                `1️⃣ Envie uma foto/vídeo com legenda \`${message.prefix}agendar set ${id} media\``,
                `2️⃣ Responda a uma mídia com \`${message.prefix}agendar set ${id} media\``,
                `3️⃣ Use URL: \`${message.prefix}agendar set ${id} media https://...\``
            ].join("\n")
        });
    }

    return message.reply({ text: `❌ Campo desconhecido: \`${field}\`.\n\nUse: trigger, repeat, text, mode, media` });
}

// ─────────────────────────────────────────────────────────────
// Execute principal
// ─────────────────────────────────────────────────────────────

module.exports = {
    name: "agendar",
    aliases: ["schedule", "agendamento"],
    category: "adm",

    description: `Gerencia agendamentos de mensagens automáticas por chat.

Permite configurar mensagens com texto e/ou mídia para serem enviadas:
• A cada X horas/minutos (intervalo)
• Em horários fixos do dia (ex: 07:00, 20:00)

Modos de repetição:
• Uma vez (once) — dispara e para
• Diário (daily)
• Semanal (weekly) — escolha os dias
• Mensal (monthly) — escolha o dia do mês

Os dados são salvos em settings/schedules.json, independente das configurações do grupo.`,

    usage: "{prefix}agendar",
    examples: [
        "{prefix}agendar list",
        "{prefix}agendar add Bom dia",
        "{prefix}agendar set abc1 trigger fixed 07:00",
        "{prefix}agendar set abc1 repeat daily",
        "{prefix}agendar set abc1 text Bom dia! ☀️",
        "{prefix}agendar on abc1",
        "{prefix}agendar test abc1"
    ],

    async execute(message) {
        const ok = await checkPermission(message);
        if (!ok) {
            return message.reply({ text: `❌ Apenas administradores do chat ou super usuários podem gerenciar agendamentos.` });
        }

        const args = message.args || [];
        const sub  = (args[0] || "").toLowerCase();

        if (!sub || sub === "help" || sub === "ajuda") {
            return message.reply({ text: helpText(message) });
        }

        if (sub === "list" || sub === "lista") return handleList(message);
        if (sub === "add"  || sub === "criar") return handleAdd(message, args);
        if (sub === "del"  || sub === "rm" || sub === "remove" || sub === "remover") return handleDel(message, args);
        if (sub === "on"   || sub === "off") return handleOnOff(message, args);
        if (sub === "status") return handleStatus(message, args);
        if (sub === "test" || sub === "teste") return handleTest(message, args);
        if (sub === "set"  || sub === "edit") return handleSet(message, args);

        return message.reply({ text: `❌ Sub-comando desconhecido: \`${sub}\`\n\nUse \`${message.prefix}agendar help\` para ver os comandos disponíveis.` });
    }
};


