const { PermissionFlagsBits } = require("discord.js");
const { isOwner } = require("./owners");

function getGuild(message) {
    if (message.platform !== "discord" || message.isPrivate || !message.raw?.guild) {
        return null;
    }
    return message.raw.guild;
}

function getMentionedMember(message, guild) {
    const mentioned = message.raw?.mentions?.members?.first?.();
    if (mentioned) return mentioned;

    const candidate = String(message.args?.[0] || "").replace(/[<@!>]/g, "");
    return /^\d+$/.test(candidate) ? guild.members.cache.get(candidate) || null : null;
}

function resolveRoles(message, guild, argsStart) {
    const mentionedRoles = message.raw?.mentions?.roles;
    const roles = [];
    const seen = new Set();

    for (const role of mentionedRoles?.values?.() || []) {
        if (!seen.has(role.id)) {
            seen.add(role.id);
            roles.push(role);
        }
    }

    for (const value of (message.args || []).slice(argsStart)) {
        const id = String(value).replace(/[<@&>]/g, "");
        const role = guild.roles.cache.get(id) ||
            guild.roles.cache.find((item) => item.name.toLowerCase() === String(value).toLowerCase());
        if (role && !seen.has(role.id)) {
            seen.add(role.id);
            roles.push(role);
        }
    }

    return roles;
}

function validateRoles(message, roles, botMember) {
    if (!roles.length) return "❌ Informe pelo menos um cargo.";
    if (!botMember?.permissions?.has(PermissionFlagsBits.ManageRoles)) {
        return "❌ O bot precisa da permissão **Gerenciar Cargos** neste servidor.";
    }
    if (roles.some((role) => role.managed || role.id === role.guild.id)) {
        return "❌ Cargos gerenciados ou o cargo @everyone não podem ser alterados.";
    }
    if (roles.some((role) => botMember.roles.highest.comparePositionTo(role) <= 0)) {
        return "❌ O bot só pode gerenciar cargos abaixo do seu maior cargo.";
    }
    return null;
}

async function executeRoleChange(message, { targetSelf = false, remove = false }) {
    const guild = getGuild(message);
    if (!guild) {
        return { error: "❌ Este comando é exclusivo para servidores do Discord." };
    }

    const actor = message.raw.member;
    if (!targetSelf) {
        const canManage = actor?.permissions?.has(PermissionFlagsBits.ManageRoles) ||
            actor?.permissions?.has(PermissionFlagsBits.Administrator) ||
            isOwner(message);
        if (!canManage) {
            return { error: "❌ Apenas administradores com permissão para gerenciar cargos podem usar este comando." };
        }
    } else if (!isOwner(message)) {
        return { error: "❌ Apenas Super Usuários podem usar este comando." };
    }

    const botMember = guild.members.me || await guild.members.fetchMe();
    const target = targetSelf ? actor : getMentionedMember(message, guild);
    if (!target) {
        return { error: "❌ Informe ou mencione o membro que receberá os cargos." };
    }

    const roles = resolveRoles(message, guild, targetSelf ? 0 : 1);
    const validationError = validateRoles(message, roles, botMember);
    if (validationError) return { error: validationError };

    if (!targetSelf && actor?.roles?.highest?.comparePositionTo(target.roles.highest) <= 0 && !isOwner(message)) {
        return { error: "❌ Você só pode alterar cargos de membros abaixo do seu maior cargo." };
    }

    if (remove) {
        await target.roles.remove(roles);
    } else {
        await target.roles.add(roles);
    }

    return {
        text: `✅ ${roles.length} cargo(s) ${remove ? "removido(s) de" : "atribuído(s) a"} ${target}.`
    };
}

module.exports = { executeRoleChange };
