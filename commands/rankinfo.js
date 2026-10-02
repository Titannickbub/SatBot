const activity = require("../functions/activity");
const economy = require("../functions/economy");
const xp = require("../functions/xp");

function resolveIdentifier(message) {
    return [
        message.quoted?.userId,
        message.platform === "discord" ? message.raw?.mentions?.users?.first()?.id : null,
        ...(message.mentionedJids || []),
        message.args?.slice(1).join(" ").trim()
    ].find(Boolean) || null;
}

function findTarget(message, identifier) {
    if (!identifier) return null;
    const normalized = String(identifier).trim().replace(/^@/, "").toLowerCase();
    const candidates = [identifier, normalized];
    for (const candidate of candidates) {
        const found = activity.findUser(message, candidate) ||
            xp.findUser(message, candidate) ||
            economy.findAccount(message, candidate);
        if (found) return found;
    }
    return null;
}

function nameOf(user) {
    return user.displayName || user.name || user.username || user.userId;
}

module.exports = {
    name: "rankinfo",
    aliases: ["consultarank", "rankusuario", "inforank"],
    category: "adm/RP",
    description: "Consulta os detalhes de um usuário nos rankings.",
    usage: "{prefix}rankinfo <atividade|xp|rico> <id|@usuário>",

    async execute(message) {
        const scope = economy.getScope(message);
        if (!scope) return message.reply({ text: "❌ Este comando só funciona em grupos ou servidores." });

        const type = String(message.args?.[0] || "atividade").toLowerCase();
        const aliases = {
            atividade: "activity",
            atividades: "activity",
            ativo: "activity",
            xp: "xp",
            experiencia: "xp",
            rico: "rich",
            riqueza: "rich",
            satcoins: "rich",
            dinheiro: "rich"
        };
        const rankingType = aliases[type];
        if (!rankingType) {
            return message.reply({ text: `❌ Ranking inválido. Use ${message.prefix}rankinfo atividade|xp|rico <usuário>.` });
        }

        const identifier = resolveIdentifier(message);
        const target = findTarget(message, identifier);
        if (!target) {
            return message.reply({
                text: `❌ Usuário não encontrado. Marque, responda à mensagem ou informe o ID.\nUso: ${message.prefix}rankinfo ${type} <id|@usuário>`
            });
        }

        if (rankingType === "activity") {
            const data = activity.ranking(message);
            const user = data?.users?.find(item => String(item.userId) === String(target.userId));
            if (!data?.enabled) return message.reply({ text: "ℹ️ O sistema de atividade está desativado neste grupo/servidor." });
            if (!user) return message.reply({ text: "ℹ️ Esse usuário ainda não possui atividade registrada." });
            const position = data.users.findIndex(item => String(item.userId) === String(user.userId)) + 1;
            return message.reply({
                text: [
                    `📊 ATIVIDADE DE ${nameOf(user)}`,
                    `🏆 Posição: #${position}`,
                    `📈 Total: ${user.total}`,
                    `📅 Hoje: ${user.dailyTotal}`,
                    `💬 Mensagens: ${user.messages}`,
                    `⚙️ Comandos: ${user.commands}`,
                    `🎨 Figurinhas: ${user.stickers}`,
                    `📎 Arquivos: ${user.files}`
                ].join("\n")
            });
        }

        if (rankingType === "xp") {
            const data = xp.load(message);
            const user = data?.users?.[String(target.userId)];
            if (!data?.enabled) return message.reply({ text: "ℹ️ O sistema de XP está desativado neste grupo/servidor." });
            if (!user) return message.reply({ text: "ℹ️ Esse usuário ainda não possui XP registrado." });
            const position = xp.position(message, user.userId);
            const level = xp.levelForXp(user.xp);
            return message.reply({
                text: [
                    `⭐ XP DE ${nameOf(user)}`,
                    `🏆 Posição: ${position ? `#${position}` : "Não classificado"}`,
                    `⭐ XP: ${user.xp}`,
                    `🎚️ Nível: ${level.level}`,
                    `📈 Próximo nível: ${level.nextLevelXp - user.xp} XP`
                ].join("\n")
            });
        }

        const account = economy.getAccountByUser(message, target.userId);
        if (!economy.isEnabled(message)) return message.reply({ text: "ℹ️ A economia está desativada neste grupo/servidor." });
        if (!account) return message.reply({ text: "ℹ️ Esse usuário ainda não possui saldo registrado." });
        const position = economy.getBalancePosition(message, account.userId);
        return message.reply({
            text: [
                `💷 RIQUEZA DE ${nameOf(account)}`,
                `🏆 Posição: ${position ? `#${position}` : "Não classificado"}`,
                `💰 Saldo: ${economy.formatMoney(account.balance)}`
            ].join("\n")
        });
    }
};
