const {
    getLevelLabel,
    getAvailableLevels,
    getSetBlockcmd
} = require("../../../functions/blockcmdHelper");

const ACTIONS = {
    reply: "💬 Responder mensagem de aviso",
    ignore: "🔇 Ignorar silenciosamente (sem responder)",
    delete: "🗑️ Deletar mensagem + avisar/ignorar"
};

module.exports = {
    name: "blockcmd",
    aliases: ["bloquearcomando", "cmdblock"],
    category: "adm/segurança",
    description: "Gerencia o bloqueio de comandos por níveis hierárquicos (servidor, categoria, chat). Permite responder com mensagem de aviso ou ignorar silenciosamente.",
    usage: "{prefix}blockcmd status",
    examples: [
        "{prefix}blockcmd status",
        "{prefix}blockcmd chat on",
        "{prefix}blockcmd chat action ignore (ignorar silenciosamente)",
        "{prefix}blockcmd chat action reply (responder aviso)",
        "{prefix}blockcmd chat add cotacao (bloquear !cotacao)",
        "{prefix}blockcmd chat add ia (bloquear categoria IA)",
        "{prefix}blockcmd chat remove cotacao",
        "{prefix}blockcmd chat list",
        "{prefix}blockcmd chat message ⚠️ O comando {cmd} está desativado neste chat!",
        "{prefix}blockcmd chat ignoreparent on"
    ],

    info(message) {
        return _help(message);
    },

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos/servidores." });
        }

        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : message.sender?.isAdmin;

        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores podem configurar o bloqueio de comandos." });
        }

        const args = message.args || [];
        const platform = message.platform;

        if (!args.length) {
            return message.reply({ text: _help(message) });
        }

        const first = args[0].toLowerCase();

        if (first === "status") {
            return message.reply({ text: await _status(message, platform) });
        }

        const availableLevels = getAvailableLevels(platform);
        if (!availableLevels.includes(first)) {
            return message.reply({
                text: `❌ Nível inválido: \`${first}\`.\n📌 Níveis disponíveis nesta plataforma: ${availableLevels.map(l => `\`${l}\``).join(", ")}`
            });
        }

        const level = first;
        const sub = args[1]?.toLowerCase();
        const subArgs = args.slice(2);

        if (!sub) {
            return message.reply({
                text: `❌ Subcomando ausente para o nível \`${level}\`.\nUso: \`${message.prefix}blockcmd ${level} <on|off|add|remove|list|clear|action|message|ignoreparent>\``
            });
        }

        // Subcomando: ON / OFF
        if (sub === "on" || sub === "off") {
            const enabled = sub === "on";
            const updated = getSetBlockcmd(message, level, { enabled });
            const label = getLevelLabel(platform, level);
            return message.reply({
                text: `✅ Bloqueio de comandos no nível **${label}** foi ${enabled ? "🟢 **ATIVADO**" : "🔴 **DESATIVADO**"}.`
            });
        }

        // Subcomando: ACTION
        if (sub === "action") {
            const act = subArgs[0]?.toLowerCase();
            if (!act || !ACTIONS[act]) {
                return message.reply({
                    text: `❌ Ação inválida: \`${act || ""}\`.\n📌 Ações válidas:\n` +
                          `• \`reply\` — ${ACTIONS.reply}\n` +
                          `• \`ignore\` — ${ACTIONS.ignore}\n` +
                          `• \`delete\` — ${ACTIONS.delete}`
                });
            }

            const updated = getSetBlockcmd(message, level, { action: act });
            const label = getLevelLabel(platform, level);
            return message.reply({
                text: `✅ Modo de ação no nível **${label}** alterado para: **${ACTIONS[act]}**.`
            });
        }

        // Subcomando: MESSAGE
        if (sub === "message" || sub === "msg") {
            const textMsg = subArgs.join(" ").trim();
            if (!textMsg) {
                return message.reply({
                    text: `❌ Informe a mensagem personalizada.\nExemplo: \`${message.prefix}blockcmd ${level} message ⚠️ O comando {cmd} foi bloqueado neste chat!\``
                });
            }

            const updated = getSetBlockcmd(message, level, { message: textMsg });
            const label = getLevelLabel(platform, level);
            return message.reply({
                text: `✅ Mensagem de aviso personalizada no nível **${label}** atualizada para:\n"${textMsg}"`
            });
        }

        // Subcomando: IGNOREPARENT
        if (sub === "ignoreparent") {
            const val = subArgs[0]?.toLowerCase();
            if (val !== "on" && val !== "off") {
                return message.reply({ text: `❌ Use \`${message.prefix}blockcmd ${level} ignoreparent on|off\`` });
            }
            const ignoreParent = val === "on";
            getSetBlockcmd(message, level, { ignoreParent });
            const label = getLevelLabel(platform, level);
            return message.reply({
                text: `✅ O nível **${label}** ${ignoreParent ? "🔒 **AGORA IGNERA**" : "🔓 **NÃO IGNERA**"} as regras dos níveis superiores.`
            });
        }

        // Subcomando: ADD
        if (sub === "add") {
            const targetCmd = subArgs[0]?.toLowerCase().trim().replace(/^[!/+#.]/, "");
            if (!targetCmd) {
                return message.reply({
                    text: `❌ Informe o comando ou categoria a ser bloqueado.\nExemplo: \`${message.prefix}blockcmd ${level} add cotacao\``
                });
            }

            const current = getSetBlockcmd(message, level);
            const list = new Set(current.blockedCommands || []);
            list.add(targetCmd);

            getSetBlockcmd(message, level, { blockedCommands: Array.from(list) });
            const label = getLevelLabel(platform, level);
            return message.reply({
                text: `✅ Comando/categoria \`${targetCmd}\` adicionado à lista de bloqueados do nível **${label}**.`
            });
        }

        // Subcomando: REMOVE
        if (sub === "remove" || sub === "rem" || sub === "del") {
            const targetCmd = subArgs[0]?.toLowerCase().trim().replace(/^[!/+#.]/, "");
            if (!targetCmd) {
                return message.reply({
                    text: `❌ Informe o comando ou categoria a ser removido.\nExemplo: \`${message.prefix}blockcmd ${level} remove cotacao\``
                });
            }

            const current = getSetBlockcmd(message, level);
            const list = (current.blockedCommands || []).filter(c => c.toLowerCase() !== targetCmd);

            getSetBlockcmd(message, level, { blockedCommands: list });
            const label = getLevelLabel(platform, level);
            return message.reply({
                text: `✅ Comando/categoria \`${targetCmd}\` removido da lista de bloqueados do nível **${label}**.`
            });
        }

        // Subcomando: LIST
        if (sub === "list") {
            const current = getSetBlockcmd(message, level);
            const label = getLevelLabel(platform, level);
            const list = current.blockedCommands || [];

            if (!list.length) {
                return message.reply({ text: `ℹ️ Não há comandos bloqueados no nível **${label}**.` });
            }

            return message.reply({
                text: `📋 **Comandos bloqueados no nível ${label}:**\n` +
                      list.map(c => `• \`${c}\``).join("\n")
            });
        }

        // Subcomando: CLEAR
        if (sub === "clear") {
            getSetBlockcmd(message, level, { blockedCommands: [] });
            const label = getLevelLabel(platform, level);
            return message.reply({
                text: `🧹 Lista de comandos bloqueados do nível **${label}** foi limpa com sucesso.`
            });
        }

        return message.reply({
            text: `❌ Subcomando não reconhecido: \`${sub}\`.\nUso: \`${message.prefix}blockcmd ${level} <on|off|add|remove|list|clear|action|message|ignoreparent>\``
        });
    }
};

async function _status(message, platform) {
    const levels = getAvailableLevels(platform);
    const lines = [
        "🚫 **Status do Bloqueio de Comandos (blockcmd)**",
        "━━━━━━━━━━━━━━━━━━━━━━"
    ];

    for (const level of levels) {
        const label = getLevelLabel(platform, level);
        const cfg = getSetBlockcmd(message, level);

        lines.push(`📌 **Nível ${label} (\`${level}\`)**`);
        lines.push(`  • Status: ${cfg.enabled ? "🟢 Ativo" : "🔴 Desativado"}`);
        lines.push(`  • Modo: ${ACTIONS[cfg.action] || cfg.action}`);
        lines.push(`  • Ignorar Níveis Superiores: ${cfg.ignoreParent ? "Sim" : "Não"}`);
        lines.push(`  • Mensagem Customizada: ${cfg.message ? `"${cfg.message}"` : "Padrão"}`);
        lines.push(`  • Comandos Bloqueados: ${cfg.blockedCommands?.length ? cfg.blockedCommands.map(c => `\`${c}\``).join(", ") : "Nenhum"}`);
        lines.push("");
    }

    lines.push(`💡 *Use \`${message.prefix}blockcmd <nivel> add <comando>\` para bloquear um comando.*`);
    return lines.join("\n");
}

function _help(message) {
    const p = message.prefix;
    const plat = message.platform;
    const lvls = getAvailableLevels(plat);
    const levelList = lvls.map(l => `*${l}* (${getLevelLabel(plat, l)})`).join(" | ");

    let header = `🚫 *BLOCKCMD — AJUDA*`;
    if (plat === "discord") header = `🎮 *BLOCKCMD (Discord) — AJUDA*`;
    else if (plat === "whatsapp") header = `📱 *BLOCKCMD (WhatsApp) — AJUDA*`;
    else if (plat === "telegram") header = `✈️ *BLOCKCMD (Telegram) — AJUDA*`;

    const lines = [];
    lines.push(header);
    lines.push("");
    lines.push("Níveis disponíveis aqui:");
    lines.push("  " + levelList);
    lines.push("");
    lines.push("Descrição:");
    lines.push("Gerencia o bloqueio seletivo de comandos ou categorias inteiras por níveis hierárquicos (server/categoria/chat) em grupos e servidores.");
    lines.push("");
    lines.push("⚙️ COMANDOS PRINCIPAIS:");
    lines.push(`  • \`${p}blockcmd status\``);
    lines.push("    ↳ Exibe o status e configurações aplicadas nos níveis disponíveis.");
    lines.push("");
    lines.push(`  • \`${p}blockcmd <nivel> on|off\``);
    lines.push("    ↳ Ativa ou desativa o bloqueio de comandos no nível especificado.");
    lines.push("");
    lines.push(`  • \`${p}blockcmd <nivel> add <comando|categoria>\``);
    lines.push("    ↳ Adiciona um comando ou categoria à lista de bloqueados (ex: `cotacao`, `ia`, `sticker`).");
    lines.push("");
    lines.push(`  • \`${p}blockcmd <nivel> remove <comando|categoria>\``);
    lines.push("    ↳ Remove um comando ou categoria da lista de bloqueados.");
    lines.push("");
    lines.push(`  • \`${p}blockcmd <nivel> list\``);
    lines.push("    ↳ Lista todos os comandos e categorias bloqueados no nível.");
    lines.push("");
    lines.push(`  • \`${p}blockcmd <nivel> clear\``);
    lines.push("    ↳ Limpa totalmente a lista de bloqueio do nível.");
    lines.push("");
    lines.push(`  • \`${p}blockcmd <nivel> action <reply|ignore|delete>\``);
    lines.push("    ↳ Define o comportamento ao tentar acionar um comando bloqueado.");
    lines.push("");
    lines.push(`  • \`${p}blockcmd <nivel> message <texto...>\``);
    lines.push("    ↳ Mensagem personalizada enviada ao barrar (suporta variáveis {cmd}, {user}, {prefix}).");
    lines.push("");
    lines.push(`  • \`${p}blockcmd <nivel> ignoreparent on|off\``);
    lines.push("    ↳ Faz o nível atual ignorar (or herdar) regras dos níveis superiores.");
    lines.push("");
    lines.push("🛡️ AÇÕES DISPONÍVEIS:");
    lines.push("  • `reply`  — 💬 Responder mensagem de aviso no chat.");
    lines.push("  • `ignore` — 🔇 Ignorar silenciosamente sem responder nada no chat.");
    lines.push("  • `delete` — 🗑️ Deletar mensagem do comando (se o bot tiver permissão).");
    lines.push("");
    lines.push("💡 OBSERVAÇÕES:");
    lines.push("  • Administradores e Donos do bot são imunes ao bloqueio de comandos.");
    lines.push("  • O recurso é exclusivo para Grupos e Servidores (desativado em conversas privadas).");
    lines.push("  • Ações de exclusão (`delete`) exigem que o bot tenha permissão para apagar mensagens.");
    lines.push("");
    lines.push("📌 EXEMPLOS:");
    lines.push(`  ${p}blockcmd status`);
    lines.push(`  ${p}blockcmd chat on`);
    lines.push(`  ${p}blockcmd chat add cotacao`);
    lines.push(`  ${p}blockcmd chat add ia`);
    lines.push(`  ${p}blockcmd chat action ignore`);
    lines.push(`  ${p}blockcmd chat message ⚠️ O comando {cmd} não é permitido aqui!`);

    return lines.join("\n");
}
