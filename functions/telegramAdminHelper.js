const LEVELS = Object.freeze({
    staff: Object.freeze({
        label: "staff",
        can_delete_messages: true,
        can_restrict_members: true
    }),
    mod: Object.freeze({
        label: "mod",
        can_delete_messages: true,
        can_restrict_members: true,
        can_invite_users: true,
        can_change_info: true,
        can_manage_video_chats: true
    }),
    gerente: Object.freeze({
        label: "gerente",
        can_manage_chat: true,
        can_delete_messages: true,
        can_restrict_members: true,
        can_invite_users: true,
        can_change_info: true,
        can_manage_video_chats: true,
        can_post_messages: true,
        can_edit_messages: true,
        can_pin_messages: true,
        can_manage_topics: true,
        can_post_stories: true,
        can_edit_stories: true,
        can_delete_stories: true,
        can_promote_members: false,
        is_anonymous: false
    }),
    adm: Object.freeze({
        label: "adm",
        can_manage_chat: true,
        can_delete_messages: true,
        can_restrict_members: true,
        can_invite_users: true,
        can_change_info: true,
        can_manage_video_chats: true,
        can_post_messages: true,
        can_edit_messages: true,
        can_pin_messages: true,
        can_manage_topics: true,
        can_post_stories: true,
        can_edit_stories: true,
        can_delete_stories: true,
        can_promote_members: true,
        is_anonymous: false
    })
});

function getBot() {
    return global.telegramBot || null;
}

function getTargetId(message, levelArg) {
    const rawTarget = message.args?.[levelArg ? 1 : 0];
    if (message.quoted?.userId) return String(message.quoted.userId);

    const mentioned = message.mentionedJids?.find((value) => /^\d+$/.test(String(value)));
    if (mentioned) return String(mentioned);

    const target = String(rawTarget || "").replace(/[<@>]/g, "").trim();
    return /^\d+$/.test(target) ? target : null;
}

function normalizeLevel(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase()
        .trim();
}

function getLevel(message) {
    const level = normalizeLevel(message.args?.[0]);
    return LEVELS[level] ? level : null;
}

function getPermissions(level) {
    const permissions = {
        can_manage_chat: false,
        can_delete_messages: false,
        can_manage_video_chats: false,
        can_restrict_members: false,
        can_promote_members: false,
        can_change_info: false,
        can_invite_users: false,
        can_post_messages: false,
        can_edit_messages: false,
        can_pin_messages: false,
        can_manage_topics: false,
        can_post_stories: false,
        can_edit_stories: false,
        can_delete_stories: false,
        is_anonymous: false
    };
    return { ...permissions, ...LEVELS[level] };
}

function getMemberPermissions() {
    return Object.fromEntries(
        Object.keys(getPermissions("adm")).map((key) => [key, false])
    );
}

async function executeTelegramPromotion(message) {
    if (message.platform !== "telegram") {
        return { text: "❌ Este comando é exclusivo do Telegram." };
    }
    if (message.isPrivate || !["group", "supergroup"].includes(message.chatType)) {
        return { text: "❌ Este comando só pode ser usado em grupos ou supergrupos." };
    }

    const bot = getBot();
    if (!bot) return { text: "❌ A conexão do Telegram não está disponível." };

    const level = getLevel(message);
    if (!level) {
        return { text: "❌ Informe o nível: staff, mod, gerente ou adm." };
    }

    const targetId = getTargetId(message, true);
    if (!targetId) {
        return { text: `❌ Informe o ID do usuário ou responda à mensagem dele.\nExemplo: ${message.prefix}tpromote ${level} 123456789` };
    }
    if (targetId === String(message.botId)) {
        return { text: "❌ O bot não pode ser promovido por este comando." };
    }

    try {
        const actor = await bot.telegram.getChatMember(message.chatId, Number(message.userId));
        if (!["creator", "administrator"].includes(actor.status) ||
            (actor.status === "administrator" && !actor.can_promote_members)) {
            return { text: "❌ Apenas administradores podem usar este comando." };
        }

        const botMember = await bot.telegram.getChatMember(message.chatId, Number(message.botId));
        if (botMember.status !== "creator" && (botMember.status !== "administrator" || !botMember.can_promote_members)) {
            return { text: "❌ O bot precisa da permissão para adicionar novos administradores." };
        }

        const target = await bot.telegram.getChatMember(message.chatId, Number(targetId));
        if (target.status === "creator") {
            return { text: "❌ O criador do grupo não pode ser alterado." };
        }
        if (target.status === "administrator" && target.user.id === Number(message.botId)) {
            return { text: "❌ O bot não pode alterar as próprias permissões." };
        }

        await bot.telegram.promoteChatMember(
            message.chatId,
            Number(targetId),
            getPermissions(level)
        );

        try {
            await bot.telegram.setChatAdministratorCustomTitle(
                message.chatId,
                Number(targetId),
                LEVELS[level].label
            );
        } catch (error) {
            console.error("❌[TELEGRAM] Falha ao definir a tag do administrador:", error);
            return { text: `⚠️ Usuário promovido como ${LEVELS[level].label}, mas não foi possível definir a tag personalizada.` };
        }

        return { text: `✅ Usuário promovido como ${LEVELS[level].label}.` };
    } catch (error) {
        console.error("❌[TELEGRAM] Falha ao promover membro:", error);
        return { text: "❌ Não foi possível promover o membro. Verifique as permissões do bot e se o usuário está no grupo." };
    }
}

async function executeTelegramDemotion(message) {
    if (message.platform !== "telegram") {
        return { text: "❌ Este comando é exclusivo do Telegram." };
    }
    if (message.isPrivate || !["group", "supergroup"].includes(message.chatType)) {
        return { text: "❌ Este comando só pode ser usado em grupos ou supergrupos." };
    }

    const bot = getBot();
    if (!bot) return { text: "❌ A conexão do Telegram não está disponível." };

    const targetId = getTargetId(message, false);
    if (!targetId) {
        return { text: `❌ Informe o ID do usuário ou responda à mensagem dele.\nExemplo: ${message.prefix}trebaixar 123456789` };
    }
    if (targetId === String(message.botId)) {
        return { text: "❌ O bot não pode remover as próprias permissões." };
    }

    try {
        const actor = await bot.telegram.getChatMember(message.chatId, Number(message.userId));
        if (!["creator", "administrator"].includes(actor.status) ||
            (actor.status === "administrator" && !actor.can_promote_members)) {
            return { text: "❌ Apenas administradores podem usar este comando." };
        }

        const botMember = await bot.telegram.getChatMember(message.chatId, Number(message.botId));
        if (botMember.status !== "creator" && (botMember.status !== "administrator" || !botMember.can_promote_members)) {
            return { text: "❌ O bot precisa da permissão para adicionar novos administradores." };
        }

        const target = await bot.telegram.getChatMember(message.chatId, Number(targetId));
        if (target.status === "creator") {
            return { text: "❌ O criador do grupo não pode ser rebaixado." };
        }

        await bot.telegram.promoteChatMember(
            message.chatId,
            Number(targetId),
            getMemberPermissions()
        );

        return { text: "✅ Usuário rebaixado para membro." };
    } catch (error) {
        console.error("❌[TELEGRAM] Falha ao rebaixar membro:", error);
        return { text: "❌ Não foi possível rebaixar o membro. Verifique as permissões do bot e se o usuário está no grupo." };
    }
}

module.exports = {
    executeTelegramPromotion,
    executeTelegramDemotion,
    LEVELS
};
