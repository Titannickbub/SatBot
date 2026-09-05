const { isOwner } = require("../../../functions/owners");
const { getGlobalBlockcmd, setGlobalBlockcmd } = require("../../../functions/config");

const ACTIONS = {
    reply: "💬 Responder mensagem de aviso",
    ignore: "🔇 Ignorar silenciosamente (sem responder)",
    delete: "🗑️ Deletar mensagem + avisar/ignorar"
};

module.exports = {
    name: "blockcmd_su",
    aliases: ["blockcmdsu", "su_blockcmd", "sublockcmd"],
    category: "system/configurações",
    description: "Gerencia o bloqueio global de comandos e categorias para Donos/Super Usuários. Impede a execução de comandos em todas as plataformas, chats, grupos e conversas privadas.",
    usage: "{prefix}blockcmd_su status",
    examples: [
        "{prefix}blockcmd_su status",
        "{prefix}blockcmd_su on",
        "{prefix}blockcmd_su add cotacao (bloqueia !cotacao globalmente)",
        "{prefix}blockcmd_su add ia (bloqueia a categoria ia globalmente)",
        "{prefix}blockcmd_su action ignore (ignora silenciosamente)",
        "{prefix}blockcmd_su action reply",
        "{prefix}blockcmd_su remove cotacao",
        "{prefix}blockcmd_su list",
        "{prefix}blockcmd_su message ⚠️ O comando {cmd} foi desativado globalmente pelo administrador do bot."
    ],

    info(message) {
        return _help(message);
    },

    async execute(message) {
        if (!isOwner(message)) {
            return message.reply({ text: "❌ Apenas Super Usuários (Donos do Bot) podem utilizar este comando." });
        }

        const args = message.args || [];
        if (!args.length) {
            return message.reply({ text: _help(message) });
        }

        const sub = args[0].toLowerCase();
        const subArgs = args.slice(1);

        if (sub === "status") {
            return message.reply({ text: _status(message) });
        }

        // Subcomando: ON / OFF
        if (sub === "on" || sub === "off") {
            const enabled = sub === "on";
            setGlobalBlockcmd({ enabled });
            return message.reply({
                text: `✅ Bloqueio global de comandos foi ${enabled ? "🟢 **ATIVADO**" : "🔴 **DESATIVADO**"}.`
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

            setGlobalBlockcmd({ action: act });
            return message.reply({
                text: `✅ Modo de ação global alterado para: **${ACTIONS[act]}**.`
            });
        }

        // Subcomando: MESSAGE
        if (sub === "message" || sub === "msg") {
            const textMsg = subArgs.join(" ").trim();
            if (!textMsg) {
                return message.reply({
                    text: `❌ Informe a mensagem personalizada global.\nExemplo: \`${message.prefix}blockcmd_su message ⚠️ O comando {cmd} está desativado globalmente!\``
                });
            }

            setGlobalBlockcmd({ message: textMsg });
            return message.reply({
                text: `✅ Mensagem de aviso global personalizada atualizada para:\n"${textMsg}"`
            });
        }

        // Subcomando: ADD
        if (sub === "add") {
            const targetCmd = subArgs[0]?.toLowerCase().trim().replace(/^[!/+#.]/, "");
            if (!targetCmd) {
                return message.reply({
                    text: `❌ Informe o comando ou categoria a ser bloqueado globalmente.\nExemplo: \`${message.prefix}blockcmd_su add cotacao\``
                });
            }

            const current = getGlobalBlockcmd();
            const list = new Set(current.blockedCommands || []);
            list.add(targetCmd);

            setGlobalBlockcmd({ blockedCommands: Array.from(list) });
            return message.reply({
                text: `✅ Comando/categoria \`${targetCmd}\` adicionado à lista de bloqueio **GLOBAL**.`
            });
        }

        // Subcomando: REMOVE
        if (sub === "remove" || sub === "rem" || sub === "del") {
            const targetCmd = subArgs[0]?.toLowerCase().trim().replace(/^[!/+#.]/, "");
            if (!targetCmd) {
                return message.reply({
                    text: `❌ Informe o comando ou categoria a ser removido da lista global.\nExemplo: \`${message.prefix}blockcmd_su remove cotacao\``
                });
            }

            const current = getGlobalBlockcmd();
            const list = (current.blockedCommands || []).filter(c => c.toLowerCase() !== targetCmd);

            setGlobalBlockcmd({ blockedCommands: list });
            return message.reply({
                text: `✅ Comando/categoria \`${targetCmd}\` removido da lista de bloqueio **GLOBAL**.`
            });
        }

        // Subcomando: LIST
        if (sub === "list") {
            const current = getGlobalBlockcmd();
            const list = current.blockedCommands || [];

            if (!list.length) {
                return message.reply({ text: "ℹ️ Não há comandos bloqueados na lista global no momento." });
            }

            return message.reply({
                text: `📋 **Comandos bloqueados GLOBALMENTE:**\n` +
                      list.map(c => `• \`${c}\``).join("\n")
            });
        }

        // Subcomando: CLEAR
        if (sub === "clear") {
            setGlobalBlockcmd({ blockedCommands: [] });
            return message.reply({
                text: `🧹 Lista de bloqueio global de comandos foi limpa com sucesso.`
            });
        }

        return message.reply({
            text: `❌ Subcomando não reconhecido: \`${sub}\`.\nUso: \`${message.prefix}blockcmd_su <status|on|off|add|remove|list|clear|action|message>\``
        });
    }
};

function _status(message) {
    const cfg = getGlobalBlockcmd();
    const lines = [
        "🌐 **Status do Bloqueio Global (blockcmd_su)**",
        "━━━━━━━━━━━━━━━━━━━━━━",
        `  • Status Global: ${cfg.enabled ? "🟢 Ativo" : "🔴 Desativado"}`,
        `  • Modo de Ação: ${ACTIONS[cfg.action] || cfg.action}`,
        `  • Mensagem Customizada: ${cfg.message ? `"${cfg.message}"` : "Padrão"}`,
        `  • Comandos Bloqueados Globalmente: ${cfg.blockedCommands?.length ? cfg.blockedCommands.map(c => `\`${c}\``).join(", ") : "Nenhum"}`,
        "",
        `💡 *Use \`${message.prefix}blockcmd_su add <comando>\` para proibir um comando em todo o bot.*`
    ];

    return lines.join("\n");
}

function _help(message) {
    const p = message.prefix;
    return `🌐 *BLOCKCMD_SU (SUPER USUÁRIO) — AJUDA*

O \`blockcmd_su\` permite desativar comandos ou categorias inteiras em **todas as plataformas, grupos, servidores e mensagens privadas** de forma global. Apenas Donos do Bot possuem acesso.

⚙️ **COMANDOS PRINCIPAIS:**
  • \`${p}blockcmd_su status\`
    ↳ Exibe o status e os comandos bloqueados na lista global.

  • \`${p}blockcmd_su on|off\`
    ↳ Ativa ou desativa o bloqueio global de comandos.

  • \`${p}blockcmd_su add <comando|categoria>\`
    ↳ Adiciona um comando/categoria ao bloqueio global (ex: \`cotacao\`, \`ia\`).

  • \`${p}blockcmd_su remove <comando|categoria>\`
    ↳ Remove um comando/categoria da lista global.

  • \`${p}blockcmd_su list\`
    ↳ Lista todos os comandos e categorias bloqueados globalmente.

  • \`${p}blockcmd_su clear\`
    ↳ Limpa totalmente a lista de bloqueio global.

  • \`${p}blockcmd_su action <reply|ignore|delete>\`
    ↳ Define a ação global ao barrar (reply, ignore ou delete).

  • \`${p}blockcmd_su message <texto>\`
    ↳ Mensagem personalizada de aviso global (suporta \`{cmd}\`, \`{user}\` e \`{prefix}\`).

🛡️ **AÇÕES DISPONÍVEIS:**
  • \`reply\`  — 💬 Responder mensagem de aviso no chat.
  • \`ignore\` — 🔇 Ignorar silenciosamente em qualquer chat ou PV.
  • \`delete\` — 🗑️ Deletar mensagem do comando (onde houver permissão).

💡 **OBSERVAÇÕES:**
  • Super Usuários / Donos do bot continuam imunes ao bloqueio global.
  • O bloqueio global sobrepõe qualquer permissão local de administradores de grupos.

📌 **EXEMPLOS:**
  ${p}blockcmd_su status
  ${p}blockcmd_su on
  ${p}blockcmd_su add cotacao
  ${p}blockcmd_su action ignore
  ${p}blockcmd_su message ⚠️ O comando {cmd} foi desativado temporariamente pelo desenvolvedor.`;
}
