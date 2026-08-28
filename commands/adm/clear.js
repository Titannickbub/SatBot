/*
=================================================================

COMANDO: !clear

Apaga mensagens com controle de quantidade, escopo e exclusões.
Apenas administradores podem usar este comando.

Sintaxe:
  !clear help
  !clear <n>                          → canal atual (máx 20)
  !clear <n> all                      → todos os canais do servidor
  !clear <n> all !#ch1, #ch2         → todos EXCETO ch1 e ch2
  !clear <n> #ch1, #ch2              → apenas ch1 e ch2

Observações:
  • Máximo de 20 mensagens por canal.
  • Apenas mensagens com até 2 dias de idade são apagadas.
  • bulkDelete só apaga mensagens com menos de 14 dias (Discord).
  • !# antes de um canal = EXCLUIR da operação (modo all).

=================================================================
*/

module.exports = {
    name: "clear",
    aliases: ["limpar", "purge", "deletar", "apagar"],
    category: "adm",
    description: `Apaga mensagens com controle de quantidade, escopo e exclusões.

Sintaxe:
  clear <n>                      → canal atual (máx 20)
  clear <n> all                  → todos os canais do servidor (Discord)
  clear <n> all !#ch1 !#ch2     → todos EXCETO os canais marcados com !
  clear <n> #ch1, #ch2          → apenas os canais marcados`,

    usage: "{prefix}clear <quantidade> [all [!#excluir...] | #ch1, #ch2...]",
    examples: [
        "{prefix}clear help",
        "{prefix}clear 10",
        "{prefix}clear 15 all",
        "{prefix}clear 20 all !#geral !#logs",
        "{prefix}clear 10 #avisos, #suporte",
        "{prefix}clear 5 #geral #moderação"
    ],

    info(message) {
        return _help(message);
    },

    async execute(message) {
        if (!message || message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos ou servidores." });
        }

        const sender = message.sender || {};
        if (!sender.isAdmin && !sender.isOwner && !sender.canManageMessages) {
            return message.reply({ text: "❌ Apenas administradores podem usar este comando." });
        }

        const args = message.args || [];
        const sub = (args[0] || "").toLowerCase();

        if (!args.length || sub === "help" || sub === "ajuda") {
            return message.reply({ text: _help(message) });
        }

        // ── Quantidade ────────────────────────────────────────────────
        const quantArg = args.find(a => /^\d+$/.test(a));
        const limit = quantArg ? Math.min(Math.max(parseInt(quantArg, 10), 1), 20) : 10;

        // ── Modo all ─────────────────────────────────────────────────
        const isAll = args.some(a => a.toLowerCase() === "all" || a.toLowerCase() === "todos");

        // ── Parsing de canais pelo texto raw ──────────────────────────
        // No Discord, canais marcados ficam como <#ID> no message.text
        // Se precedido de ! → excluir; caso contrário → incluir
        const rawText = message.text || "";

        // Extrai IDs excluídos: padrão !<#ID>
        const excludedIds = new Set();
        const excludeRe = /!<#(\d+)>/g;
        let m;
        while ((m = excludeRe.exec(rawText)) !== null) {
            excludedIds.add(m[1]);
        }

        // Todos os canais mencionados (de message.mentionedChannelIds)
        const allMentionedIds = message.mentionedChannelIds || [];

        // Canais a incluir explicitamente = mencionados sem o ! na frente
        const includedIds = allMentionedIds.filter(id => !excludedIds.has(id));

        // ── Despacha ──────────────────────────────────────────────────
        if (isAll) {
            return _execAllChannels(message, limit, excludedIds);
        }

        if (includedIds.length > 0) {
            return _execSpecificChannels(message, limit, includedIds);
        }

        // Padrão: canal atual
        return _execCurrentChannel(message, limit);
    }
};

// ─────────────────────────────────────────────────────────────
//  MODOS DE EXECUÇÃO
// ─────────────────────────────────────────────────────────────

/** Canal/chat atual */
async function _execCurrentChannel(message, limit) {
    if (message.platform === "discord") {
        try {
            const channel = message.channel || message.raw?.channel || null;
            if (!channel || typeof channel.messages?.fetch !== "function" || typeof channel.bulkDelete !== "function") {
                return message.reply({ text: "❌ Não foi possível localizar o canal atual do Discord." });
            }

            const currentMsgId = String(message.messageId || message.id || "");
            const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
            const fetched = await channel.messages.fetch({ limit: 100 }).catch(() => new Map());
            const msgArray = Array.from(fetched.values())
                .filter(m => String(m.id) !== currentMsgId && m.createdTimestamp >= twoDaysAgo)
                .slice(0, limit);

            if (!msgArray.length) {
                return message.reply({ text: "✅ Não havia mensagens recentes para limpar neste canal." });
            }

            await channel.bulkDelete(msgArray, true).catch(() => {});
            return message.reply({ text: `✅ *${msgArray.length}* mensagem(ns) removida(s) deste canal.` })
                .catch(() => console.warn("[CLEAR] Falha ao responder após limpeza do canal."));
        } catch (err) {
            return message.reply({ text: `❌ Falha ao limpar mensagens: ${err.message || err}` });
        }
    }

    if (message.platform === "telegram") {
        try {
            const telegramApi = message.raw?.telegram || global.telegramBot;
            if (!telegramApi) return message.reply({ text: "❌ Bot do Telegram não disponível." });

            const twoDaysAgo = Math.floor((Date.now() - 2 * 24 * 60 * 60 * 1000) / 1000);
            const history = await telegramApi.getChatHistory(message.chatId, { limit }).catch(() => []);
            let deleted = 0;
            for (const m of history) {
                const id = m && m.message_id;
                if (!id) continue;
                // m.date é Unix timestamp em segundos no Telegram
                if (m.date && m.date < twoDaysAgo) continue;
                await telegramApi.deleteMessage(message.chatId, id).catch(() => {});
                deleted++;
            }
            return message.reply({ text: `✅ *${deleted}* mensagem(ns) removida(s) do chat.` });
        } catch (err) {
            return message.reply({ text: `❌ Falha ao limpar mensagens do Telegram: ${err.message || err}` });
        }
    }

    return message.reply({ text: "❌ Este comando só funciona no Discord e Telegram." });
}

/** Todos os canais do servidor, com exclusões opcionais */
async function _execAllChannels(message, limit, excludedIds = new Set()) {
    if (message.platform !== "discord") {
        return message.reply({ text: "❌ O modo `all` só está disponível no Discord." });
    }

    const guild = message.raw?.guild;
    if (!guild) return message.reply({ text: "❌ Não foi possível localizar o servidor do Discord." });

    const channels = guild.channels.cache.filter(ch =>
        ch && ch.isTextBased && typeof ch.bulkDelete === "function" && !excludedIds.has(String(ch.id))
    );

    const currentMsgId = String(message.messageId || message.id || "");
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    let totalDeleted = 0;
    let channelCount = 0;

    for (const ch of channels.values()) {
        try {
            const fetched = await ch.messages.fetch({ limit: 100 }).catch(() => new Map());
            const msgArray = Array.from(fetched.values())
                .filter(m => String(m.id) !== currentMsgId && m.createdTimestamp >= twoDaysAgo)
                .slice(0, limit);

            if (!msgArray.length) continue;
            await ch.bulkDelete(msgArray, true).catch(() => {});
            totalDeleted += msgArray.length;
            channelCount++;
        } catch {
            // ignora falha por canal
        }
    }

    const excludeNote = excludedIds.size
        ? `\n⛔ *Ignorados:* ${[...excludedIds].map(id => `<#${id}>`).join(", ")}`
        : "";

    return message.reply({
        text: `✅ *Limpeza global concluída!*\n\n📊 *${totalDeleted}* mensagem(ns) em *${channelCount}* canal(is).${excludeNote}`
    }).catch(() => console.warn("[CLEAR] Falha ao responder após limpeza global."));
}

/** Canais específicos mencionados com # */
async function _execSpecificChannels(message, limit, channelIds) {
    if (message.platform !== "discord") {
        return message.reply({ text: "❌ A seleção de canais com # só está disponível no Discord." });
    }

    const guild = message.raw?.guild;
    if (!guild) return message.reply({ text: "❌ Não foi possível localizar o servidor do Discord." });

    const currentMsgId = String(message.messageId || message.id || "");
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    let totalDeleted = 0;
    const results = [];

    for (const channelId of channelIds) {
        try {
            const ch = guild.channels.cache.get(channelId);
            if (!ch || typeof ch.bulkDelete !== "function") {
                results.push(`⚠️ <#${channelId}>: não encontrado ou sem permissão.`);
                continue;
            }

            const fetched = await ch.messages.fetch({ limit: 100 }).catch(() => new Map());
            const msgArray = Array.from(fetched.values())
                .filter(m => String(m.id) !== currentMsgId && m.createdTimestamp >= twoDaysAgo)
                .slice(0, limit);

            if (!msgArray.length) {
                results.push(`✅ <#${channelId}>: nenhuma mensagem para limpar.`);
                continue;
            }

            await ch.bulkDelete(msgArray, true).catch(() => {});
            totalDeleted += msgArray.length;
            results.push(`✅ <#${channelId}>: *${msgArray.length}* removida(s).`);
        } catch (err) {
            results.push(`❌ <#${channelId}>: falha — ${err.message || err}`);
        }
    }

    return message.reply({
        text: `🧹 *Limpeza concluída!* (${totalDeleted} mensagem(ns) no total)\n\n${results.join("\n")}`
    }).catch(() => console.warn("[CLEAR] Falha ao responder após limpeza de canais específicos."));
}

// ─────────────────────────────────────────────────────────────
//  AJUDA E STATUS
// ─────────────────────────────────────────────────────────────

function _help(message) {
    const p = message.prefix;
    const plat = message.platform;

    let header = `🧹 *CLEAR — AJUDA*`;
    if (plat === "discord") header = `🎮 *CLEAR (Discord) — AJUDA*`;
    else if (plat === "telegram") header = `✈️ *CLEAR (Telegram) — AJUDA*`;

    let platformNotes = "";
    if (plat === "discord") {
        platformNotes = `
📌 *REGRAS DO DISCORD:*
  • Máximo de **20 mensagens** por canal por execução.
  • Apenas mensagens com até **2 dias de idade** são apagadas.
  • O Discord não apaga mensagens com mais de **14 dias** via bulkDelete.
  • \`!#canal\` antes de uma menção = **excluir** esse canal da operação.
  • Vírgulas entre canais são opcionais: \`#ch1, #ch2\` ou \`#ch1 #ch2\`.`;
    } else if (plat === "telegram") {
        platformNotes = `
📌 *REGRAS DO TELEGRAM:*
  • Apaga mensagens do chat atual.
  • Os modos \`all\` e \`#canal\` não estão disponíveis no Telegram.`;
    }

    return (
`${header}

Apaga mensagens com controle de quantidade, escopo e exclusões.

📋 *MODOS DISPONÍVEIS:*

  • \`${p}clear <n>\`
    ↳ Apaga **N** mensagens do canal/chat atual.

  • \`${p}clear <n> all\`
    ↳ Apaga **N** msgs de **todos** os canais do servidor. *(Discord)*

  • \`${p}clear <n> all !#ch1 !#ch2\`
    ↳ Apaga **N** msgs de todos os canais, **exceto** os marcados com \`!\`. *(Discord)*

  • \`${p}clear <n> #ch1, #ch2\`
    ↳ Apaga **N** msgs **apenas** nos canais mencionados. *(Discord)*
${platformNotes}

💡 *EXEMPLOS:*
  \`${p}clear 10\`
  \`${p}clear 15 all\`
  \`${p}clear 20 all !#geral !#logs\`
  \`${p}clear 10 #avisos, #suporte\`
  \`${p}clear 5 #geral #moderação\``
    );
}
