const { setWarnConfig, getWarnConfig } = require("../../../functions/warnHelper");
const { isOwner } = require("../../../functions/owners");

const DESCRIPTION = `⚠️ Define quantas advertências levam a uma punição automática neste grupo ou servidor.

🔐 Disponível para administradores do chat e superusuários.

1. Escolha o limite de advertências e a ação aplicada ao atingir esse limite:
{prefix}warnconfig <quantidade> <kick|ban>

Exemplos:
{prefix}warnconfig 3 ban
{prefix}warnconfig 5 kick

Use kick para expulsar o membro, permitindo que ele volte, ou ban para bani-lo. A quantidade deve ser maior que zero.

2. Confira a configuração atual:
{prefix}warnconfig status`;

module.exports = {
    name: "warnconfig",
    category: "adm/configurações",
    description: DESCRIPTION,
    usage: "{prefix}warnconfig <max> <kick|ban>",

    async execute(message) {
        if (message.isPrivate) return message.reply({ text: "❌ Comando apenas para grupos/servidores." });

        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : message.sender?.isAdmin;

        if (!userOk && !isOwner(message)) {
            return message.reply({ text: "❌ Apenas administradores podem usar este comando." });
        }

        const args = Array.isArray(message.args) ? message.args : [];
        const first = (args[0] || "").toLowerCase();

        // Help / status
        if (!args.length || first === "help" || first === "ajuda") {
            return message.reply({ text: _help(message) });
        }

        if (first === "status") {
            const current = getWarnConfig(message);
            if (!current) return message.reply({ text: `🔕 Nenhuma configuração de warns definida para este chat.` });
            return message.reply({ text: `📋 Configuração atual:\n• Máx: ${current.max} avisos\n• Ação: ${current.action}` });
        }

        if (args.length < 2) {
            const current = getWarnConfig(message);
            const status = current 
                ? `\n\nAtual: Máx. ${current.max} avisos → Ação: ${current.action}`
                : "";
            return message.reply({ text: `❌ Uso incorreto.\nExemplo: ${message.prefix}warnconfig 3 ban${status}` });
        }

        const max = parseInt(args[0]);
        const action = args[1].toLowerCase();

        if (isNaN(max) || max < 1) {
            return message.reply({ text: "❌ O número máximo de advertências deve ser maior que zero." });
        }

        if (action !== "kick" && action !== "ban") {
            return message.reply({ text: "❌ A ação deve ser 'kick' ou 'ban'." });
        }

        const success = setWarnConfig(message, max, action);
        if (success) {
            return message.reply({ text: `✅ Configuração de warns atualizada!\nLímite: ${max} advertências\nAção ao atingir: ${action}` });
        } else {
            return message.reply({ text: "❌ Ocorreu um erro ao salvar a configuração." });
        }
    }
};

function _help(message) {
    const p = message.prefix;
    const plat = message.platform;

    let header = '⚠️ *CONFIGURAÇÃO DE WARNS — AJUDA*';
    if (plat === 'discord') header = '🎮 *WARNS (Discord) — AJUDA*';
    else if (plat === 'whatsapp') header = '📱 *WARNS (WhatsApp) — AJUDA*';
    else if (plat === 'telegram') header = '✈️ *WARNS (Telegram) — AJUDA*';

    const lines = [];
    lines.push(header);
    lines.push('');
    lines.push('Gerencia o limite de advertências que leva a uma ação automática (kick/ban).');
    lines.push('');
    lines.push('📋 COMANDOS:');
    lines.push('  `' + p + 'warnconfig <max> <kick|ban>`');
    lines.push('    ↳ Define o número máximo de avisos e a ação ao atingir o limite.');
    lines.push('');
    lines.push('  `' + p + 'warnconfig status`');
    lines.push('    ↳ Exibe a configuração atual deste chat.');
    lines.push('');
    lines.push('💡 REGRAS E DICAS:');
    lines.push('  • Defina um número razoável (ex: 3) para evitar expulsões acidentais.');
    lines.push('  • Apenas administradores podem alterar esta configuração.');
    lines.push('');
    lines.push('📌 EXEMPLOS:');
    lines.push('  ' + p + 'warnconfig 3 ban');
    lines.push('  ' + p + 'warnconfig 5 kick');

    return lines.join('\n');
}
