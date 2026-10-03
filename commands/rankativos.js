const activity = require("../functions/activity");
const { renderRanking } = require("../functions/imageBanner");
const { cleanJid, sameUserId } = require("../functions/moderationHelper");

function userName(user) {
    return user.displayName || user.username || user.userId;
}

async function listWhatsAppMembers(message) {
    if (message.platform !== "whatsapp") {
        return message.reply({ text: "❌ A opção list é exclusiva do WhatsApp." });
    }
    if (!String(message.chatId || "").endsWith("@g.us")) {
        return message.reply({ text: "❌ Use esta opção em um grupo do WhatsApp." });
    }

    const sock = global.whatsappSock;
    if (!sock || typeof sock.groupMetadata !== "function") {
        return message.reply({ text: "❌ O suporte ao WhatsApp não está disponível no momento." });
    }

    let metadata;
    try {
        metadata = await sock.groupMetadata(message.chatId);
    } catch (error) {
        console.error("[RANKATIVOS] Falha ao buscar membros do grupo WhatsApp:", error);
        return message.reply({ text: "❌ Não foi possível carregar os membros deste grupo. Tente novamente mais tarde." });
    }

    const participants = Array.isArray(metadata?.participants) ? metadata.participants : [];
    const result = activity.ranking(message);
    if (!result) {
        return message.reply({ text: "❌ Não foi possível carregar os dados de atividade deste grupo." });
    }

    const members = participants.map((participant, index) => {
        const identifiers = [participant.id, participant.lid, participant.phoneNumber].filter(Boolean);
        const recordedUser = result.users.find(user =>
            identifiers.some(identifier => sameUserId(identifier, user.userId))
        );
        const mentionId = cleanJid(String(participant.phoneNumber || participant.id || participant.lid || ""));
        const identifier = mentionId || `membro-${index + 1}`;
        const mention = identifier.includes("@")
            ? `@${identifier.split("@")[0].split(":")[0]}`
            : userName(recordedUser || { userId: identifier });
        return {
            identifier,
            mention,
            total: recordedUser?.total || 0,
            messages: recordedUser?.messages || 0,
            commands: recordedUser?.commands || 0,
            stickers: recordedUser?.stickers || 0,
            files: recordedUser?.files || 0
        };
    }).sort((a, b) => b.total - a.total || a.identifier.localeCompare(b.identifier));
    const lines = members.flatMap((member, index) => [
        `${index + 1}. ${member.mention} — ${member.total} atividades`,
        `   💬 Mensagens: ${member.messages}`,
        `   ⚙️ Comandos: ${member.commands}`,
        `   🎨 Figurinhas: ${member.stickers}`,
        `   📎 Arquivos: ${member.files}`,
        "━━━━━━━━━━━━━━━━━━━━━━"
    ]);
    const mentions = [...new Set(members
        .map(member => member.identifier)
        .filter(identifier => identifier.includes("@")))];

    const groupName = metadata.subject || message.chatName || "Grupo";
    return message.reply({
        text: [
            `📊 ATIVIDADE DOS MEMBROS — ${groupName}`,
            "━━━━━━━━━━━━━━━━━━━━━━",
            `👥 Total de membros: ${participants.length}`,
            "",
            ...lines.slice(0, -1)
        ].join("\n"),
        mentions
    });
}

module.exports = {
    name: "rankativos",
    aliases: ["rankingativos", "ranking-ativos", "rankatividade"],
    category: "adm/RP",
    description: "Gera uma imagem com os cinco membros mais ativos do grupo ou servidor. No WhatsApp, use `list` para listar em texto todos os membros do grupo e suas atividades, incluindo 0 para quem ainda não tem registro.",
    usage: "{prefix}rankativos [list]",

    async execute(message) {
        if (String(message.args?.[0] || "").toLowerCase() === "list") {
            return listWhatsAppMembers(message);
        }

        const result = activity.ranking(message);
        if (!result) return message.reply({ text: "❌ O ranking de atividade só funciona em grupos ou servidores." });
        if (!result.enabled) {
            return message.reply({ text: "ℹ️ O sistema de atividade está desativado neste grupo/servidor." });
        }
        if (!result.users.length) {
            return message.reply({ text: "ℹ️ Ainda não há atividade registrada neste grupo/servidor." });
        }

        const rendered = await renderRanking(message, "activity");
        if (rendered.error) return message.reply({ text: `❌ ${rendered.error}` });
        return message.replyImg({ image: rendered.buffer, caption: rendered.caption, fileName: "rankatividade.png" });
    }
};
