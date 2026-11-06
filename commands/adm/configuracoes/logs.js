const auditLogs = require("../../../functions/auditLogs");

const CATEGORY_NAMES = Object.fromEntries(
    Object.entries(auditLogs.CATEGORIES).map(([key, name]) => [normalize(name), key])
);
const HELP_TEXT = `📋 Configure os registros de auditoria deste grupo ou servidor.

• Consulte as opções: {prefix}logs status
• Ative ou desative todos: {prefix}logs on | {prefix}logs off
• Configure uma categoria:
  {prefix}logs saldo on|off
  {prefix}logs loja on|off
  {prefix}logs sinais on|off
  {prefix}logs advertencias on|off

Destinos: Discord usa o canal selecionado no painel; WhatsApp usa este chat; Telegram usa o chat principal por padrão.
No Telegram, execute {prefix}logs topico dentro do tópico desejado para direcionar os registros para ele. Use {prefix}logs topico off para voltar ao chat principal.`;

module.exports = {
    name: "logs",
    aliases: ["configlogs", "auditlogs"],
    category: "adm/configurações",
    description: "Ativa, desativa e configura os registros de auditoria do grupo ou servidor.",
    usage: "{prefix}logs help",

    async execute(message) {
        if (!auditLogs.getTarget(message)) {
            return message.reply({ text: "❌ Configure os logs em um grupo ou servidor, não em conversa privada." });
        }
        if (!await auditLogs.canConfigure(message)) {
            return message.reply({ text: "❌ Apenas administradores podem configurar os logs." });
        }

        const [rawAction, rawValue] = message.args || [];
        const action = normalize(rawAction || "status");
        const value = normalize(rawValue || "");
        const current = auditLogs.getConfig(message);
        if (["ajuda", "help"].includes(action)) {
            return message.reply({ text: HELP_TEXT.replaceAll("{prefix}", message.prefix || "!") });
        }
        if (["status", "estado"].includes(action)) {
            return message.reply({ text: formatStatus(message, current) });
        }
        if (["on", "ligar", "ativar", "off", "desligar", "desativar"].includes(action)) {
            const enabled = ["on", "ligar", "ativar"].includes(action);
            auditLogs.updateConfig(message, { enabled });
            return message.reply({ text: `✅ Logs ${enabled ? "ativados" : "desativados"}.` });
        }
        if (["topico", "tópico", "topic"].includes(action)) {
            if (message.platform !== "telegram") {
                return message.reply({ text: "❌ A configuração de tópico está disponível apenas no Telegram." });
            }
            if (["off", "desativar", "chat"].includes(value)) {
                auditLogs.updateConfig(message, { topicId: null });
                return message.reply({ text: "✅ Os logs do Telegram serão enviados no chat principal." });
            }
            const threadId = String(message.threadId || message.topicId || "");
            if (!threadId) {
                return message.reply({ text: "❌ Execute este comando dentro do tópico que receberá os logs, ou use `logs topico off`." });
            }
            auditLogs.updateConfig(message, { topicId: threadId });
            return message.reply({ text: `✅ Tópico ${threadId} definido para os logs.` });
        }

        const category = CATEGORY_NAMES[action];
        const enabled = ["on", "ligar", "ativar"].includes(value)
            ? true
            : ["off", "desligar", "desativar"].includes(value)
                ? false
                : null;
        if (!category || enabled === null) {
            return message.reply({ text: `${formatStatus(message, current)}\n\nUso: ${message.prefix || "!"}logs <saldo|loja|sinais|advertencias> <on|off>` });
        }
        auditLogs.updateConfig(message, { category, categoryEnabled: enabled });
        return message.reply({ text: `✅ Logs de ${auditLogs.CATEGORIES[category]} ${enabled ? "ativados" : "desativados"}.` });
    }
};

function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

function formatStatus(message, config) {
    const categories = Object.entries(config.categories)
        .map(([key, enabled]) => `• ${auditLogs.CATEGORIES[key]}: ${enabled ? "ativados" : "desativados"}`);
    const destination = message.platform === "discord"
        ? "Canal de destino: selecionado no painel do Discord."
        : message.platform === "telegram"
            ? `Destino: ${config.topicId ? `tópico ${config.topicId}` : "chat principal"}.`
            : "Destino: este chat.";
    return [
        `📋 Logs de auditoria: ${config.enabled ? "ativados" : "desativados"}.`,
        destination,
        ...categories,
        `Use ${message.prefix || "!"}logs <categoria> on|off para configurar cada tipo.`
    ].join("\n");
}
