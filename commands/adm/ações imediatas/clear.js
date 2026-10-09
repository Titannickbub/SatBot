/*
=================================================================

COMANDO: {prefix}clear

Apaga mensagens com controle de quantidade, escopo e exclusões.
É necessário que o usuário e o bot tenham permissão para gerenciar mensagens.

Sintaxe:
  {prefix}clear <1-20>                    → canal atual
  {prefix}clear <1-20> all                → todos os canais do servidor
  {prefix}clear <1-20> all !#ch1 !#ch2    → todos EXCETO ch1 e ch2
  {prefix}clear <1-20> #ch1 #ch2          → apenas ch1 e ch2

Observações:
  • Máximo de 20 mensagens por canal.
  • Apenas mensagens com até 2 dias de idade são apagadas.
  • bulkDelete só apaga mensagens com menos de 14 dias (Discord).
  • !# antes de um canal = EXCLUIR da operação (modo all).

=================================================================
*/

const { isOwner } = require("../../../functions/owners");

module.exports = {
    name: "clear",
    aliases: ["limpar", "purge", "deletar", "apagar"],
    category: "adm/ações imediatas",
    platformSupport: {
        discord: "full",
        telegram: "none",
        whatsapp: "none"
    },
    description: `🧹 Apaga mensagens com controle de quantidade, escopo e exclusões.

📏 Máximo de 20 mensagens por canal.
⏳ Apaga apenas mensagens com até 2 dias de idade.
🤖 O bot precisa ter permissão para gerenciar mensagens.
👤 Você também precisa ter permissão para gerenciar mensagens.

📌 Uso:
Apagar mensagens no chat atual:
{prefix}clear {1-20}
{prefix}clear 15

Apagar mensagens em todos os chats do servidor:
{prefix}clear {1-20} all
{prefix}clear 15 ALL

Apagar mensagens em todos os chats, exceto os selecionados:
{prefix}clear {1-20} all !#chat1 !#chat2
{prefix}clear 15 all !#chat_adms !#chat_geral

Apagar mensagens apenas nos chats selecionados:
{prefix}clear {1-20} #chat1 #chat2
{prefix}clear 15 #chat_geral #midia`,

    usage: "{prefix}clear <1-20>",
    examples: [
        "{prefix}clear 15",
        "{prefix}clear 15 all",
        "{prefix}clear 15 all !#chat_adms !#chat_geral",
        "{prefix}clear 15 #chat_geral #midia"
    ],

    info(message) {
        return _help(message);
    },

    async execute(message) {
        if (!message || message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos ou servidores." });
        }

        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const sender = message.sender || {};
        const userCanManageMessages = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId, "delete")
            : sender.canManageMessages;
        if (!userCanManageMessages && !sender.isOwner && !isOwner(message)) {
            return message.reply({ text: "❌ Você precisa ter permissão para gerenciar mensagens neste chat." });
        }

        if (adapter?.checkBotPermission) {
            const botCanManageMessages = await adapter.checkBotPermission(message.chatId, "delete");
            if (!botCanManageMessages) {
                return message.reply({ text: "❌ O bot não tem permissão para gerenciar mensagens neste chat." });
            }
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
            console.error("[CLEAR] Falha ao limpar mensagens:", err);
            return message.reply({ text: "❌ Não foi possível limpar as mensagens. Verifique as permissões e tente novamente." });
        }
    }

    if (message.platform === "telegram") {
        return message.reply({
            text: "❌ Este comando é exclusivo do Discord."
        });
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
            if (!await canManageMessagesInChannel(message, ch.id)) continue;

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

            if (!await canManageMessagesInChannel(message, ch.id)) {
                results.push(`⚠️ <#${channelId}>: você ou o bot não tem permissão para gerenciar mensagens.`);
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
            console.error(`[CLEAR] Falha ao limpar o canal ${channelId}:`, err);
            results.push(`❌ <#${channelId}>: não foi possível limpar`);
        }
    }

    return message.reply({
        text: `🧹 *Limpeza concluída!* (${totalDeleted} mensagem(ns) no total)\n\n${results.join("\n")}`
    }).catch(() => console.warn("[CLEAR] Falha ao responder após limpeza de canais específicos."));
}

async function canManageMessagesInChannel(message, channelId) {
    const adapter = (message.platforms || []).find(p => p.name === message.platform);
    if (!adapter) return true;

    const ownerOverride = message.sender?.isOwner || isOwner(message);
    const [userCanManageMessages, botCanManageMessages] = await Promise.all([
        ownerOverride
            ? Promise.resolve(true)
            : adapter.checkUserPermission
            ? adapter.checkUserPermission(channelId, message.userId, "delete")
            : Promise.resolve(message.sender?.canManageMessages),
        adapter.checkBotPermission
            ? adapter.checkBotPermission(channelId, "delete")
            : Promise.resolve(true)
    ]);

    return !!userCanManageMessages && !!botCanManageMessages;
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

  • \`${p}clear <1-20>\`
    ↳ Apaga **N** mensagens do canal/chat atual.

  • \`${p}clear <1-20> all\`
    ↳ Apaga **N** msgs de **todos** os canais do servidor. *(Discord)*

  • \`${p}clear <1-20> all !#ch1 !#ch2\`
    ↳ Apaga **N** msgs de todos os canais, **exceto** os marcados com \`!\`. *(Discord)*

  • \`${p}clear <1-20> #ch1 #ch2\`
    ↳ Apaga **N** msgs **apenas** nos canais mencionados. *(Discord)*

🤖 O bot e quem executa precisam da permissão para gerenciar mensagens.
${platformNotes}

💡 *EXEMPLOS:*
  \`${p}clear 15\`
  \`${p}clear 15 all\`
  \`${p}clear 15 all !#chat_adms !#chat_geral\`
  \`${p}clear 15 #chat_geral #midia\``
    );
}
