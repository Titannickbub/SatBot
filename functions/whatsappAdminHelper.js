const { isOwner } = require("./owners");
const { parseTargetFromMessage, formatUserMention } = require("./moderationHelper");

function sameUserId(left, right) {
    if (!left || !right) return false;
    const leftValue = String(left);
    const rightValue = String(right);
    if (leftValue === rightValue) return true;
    return leftValue.split("@")[0].split(":")[0] === rightValue.split("@")[0].split(":")[0];
}

function getCentralStore(message) {
    return message.functions?.centralAccounts || global.centralAccounts || null;
}

async function resolveTarget(message) {
    const rawArg = message.args?.[0]?.trim();
    const store = getCentralStore(message);
    let targetId = rawArg;

    if (store && rawArg && typeof store.getCentralById === "function" && store.getCentralById(rawArg)) {
        const central = store.getCentralById(rawArg);
        const account = central.platformAccounts?.find((item) => item.platform === "whatsapp");
        if (account?.platformId) return String(account.platformId);
    }

    const parsed = parseTargetFromMessage(message);
    targetId = parsed.targetId;

    if (rawArg?.startsWith("@") && message.mentionedJids?.length) {
        targetId = String(message.mentionedJids[0]);
    }

    if (store && targetId && typeof store.getCentralById === "function") {
        const central = store.getCentralById(targetId);
        const account = central?.platformAccounts?.find((item) => item.platform === "whatsapp");
        if (account?.platformId) targetId = String(account.platformId);
    }

    return targetId;
}

async function setWhatsAppAdmin(message, action, selfOnly = false) {
    if (message.platform !== "whatsapp") {
        return { ok: false, text: "❌ Este comando é exclusivo do WhatsApp." };
    }

    if (message.isPrivate || !message.chatId.endsWith("@g.us")) {
        return { ok: false, text: "❌ Este comando só pode ser usado em grupos do WhatsApp." };
    }

    if (selfOnly && !message.sender?.isOwner && !isOwner(message)) {
        return { ok: false, text: "❌ Apenas o superusuário do bot pode usar este comando." };
    }

    if (selfOnly && (message.args?.length || message.quoted?.userId || message.mentionedJids?.length)) {
        return { ok: false, text: `❌ ${message.command} altera apenas o próprio bot e não aceita usuário alvo.` };
    }

    const targetId = selfOnly
        ? null
        : await resolveTarget(message);
    if (!targetId && !selfOnly) {
        return {
            ok: false,
            text: `❌ Informe o usuário por resposta à mensagem ou ID.\nExemplo: ${message.prefix}${message.command} 5511999999999`
        };
    }

    const sock = global.whatsappSock;
    if (!sock || typeof sock.groupMetadata !== "function" || typeof sock.groupParticipantsUpdate !== "function") {
        return { ok: false, text: "❌ A conexão do WhatsApp não está disponível." };
    }

    try {
        const metadata = await sock.groupMetadata(message.chatId);
        const target = metadata.participants.find((participant) => {
            const ids = [participant.id, participant.lid, participant.phoneNumber].filter(Boolean);
            const candidates = selfOnly ? [message.userId] : [targetId];
            return ids.some((id) => candidates.some((candidate) => sameUserId(id, candidate)));
        });

        if (!target) {
            return { ok: false, text: "❌ Usuário não encontrado neste grupo." };
        }

        const participantId = target.id || target.lid || target.phoneNumber;
        await sock.groupParticipantsUpdate(message.chatId, [participantId], action);

        const mention = selfOnly ? "você" : formatUserMention(message, participantId);
        return {
            ok: true,
            text: action === "promote"
                ? `✅ Usuário ${mention} promovido a administrador.`
                : `✅ Usuário ${mention} rebaixado para membro.`
        };
    } catch (err) {
        console.error(`[${message.command}] Erro ao alterar administração no WhatsApp:`, err);
        return { ok: false, text: "❌ Falha ao alterar o administrador. Verifique se o bot é administrador e se o usuário está no grupo." };
    }
}

module.exports = { setWhatsAppAdmin };
