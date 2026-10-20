const notes = require("../functions/notesHelper");
const { isOwner } = require("../functions/owners");

function getArgumentText(message, index) {
    if (typeof message.getArgText === "function") return message.getArgText(index).trim();
    return (message.args || []).slice(index).join(" ").trim();
}

function helpText(message, noteList) {
    const prefix = message.prefix || "!";
    return [
        `📝 *Notas do grupo/servidor*`,
        ``,
        `Todos podem ler as notas; apenas administradores podem adicionar ou apagar.`,
        ``,
        `• Ver esta ajuda e a lista: \`${prefix}notas\``,
        `• Adicionar: \`${prefix}notas add título - texto da nota\``,
        `• Ler pelo título: \`${prefix}notas título\``,
        `• Ler pelo número: \`${prefix}notas 1\``,
        `• Apagar pelo título: \`${prefix}notas del título\``,
        ``,
        `📋 *Notas cadastradas:*`,
        noteList || "Ainda não há notas cadastradas."
    ].join("\n");
}

function formatNoteList(data) {
    if (!data.notes.length) return "";
    return data.notes.map((note, index) => `${index + 1}. ${note.title}`).join("\n");
}

async function isChatAdmin(message) {
    if (isOwner(message) || message.sender?.isOwner) return true;
    const adapter = (message.platforms || []).find(platform => platform.name === message.platform);
    if (typeof adapter?.checkUserPermission === "function") {
        return adapter.checkUserPermission(message.chatId, message.userId);
    }
    return Boolean(message.sender?.isAdmin);
}

module.exports = {
    name: "notas",
    aliases: [],
    category: "utilitarios",
    description: `📝 Notas separadas por grupo/servidor.

Todos podem ler as notas; apenas administradores podem gerenciar.

{prefix}notas — mostra esta ajuda e a lista de notas.
{prefix}notas add título - texto da nota — adiciona uma nota.
{prefix}notas título — exibe uma nota pelo título.
{prefix}notas 1 — exibe a primeira nota da lista.
{prefix}notas del título — apaga uma nota pelo título.`,
    usage: "{prefix}notas [add|del|título|número]",
    examples: [
        "{prefix}notas",
        "{prefix}notas add Regras - Leiam as regras do grupo.",
        "{prefix}notas Regras",
        "{prefix}notas 1",
        "{prefix}notas del Regras"
    ],

    async execute(message) {
        const args = message.args || [];
        const action = String(args[0] || "").toLocaleLowerCase("pt-BR");

        try {
            const data = notes.load(message);
            if (!data) {
                return message.reply({ text: "❌ Este comando só pode ser usado em grupos ou servidores." });
            }

            if (!args.length) {
                return message.reply({ text: helpText(message, formatNoteList(data)) });
            }

            if (action === "add") {
                if (!await isChatAdmin(message)) {
                    return message.reply({ text: "❌ Apenas administradores podem adicionar notas." });
                }
                const input = getArgumentText(message, 1);
                const separator = input.match(/\s+-\s+/);
                if (!separator) {
                    return message.reply({ text: `❌ Uso: \`${message.prefix}notas add título - texto da nota\`` });
                }
                const separatorIndex = separator.index;
                const title = input.slice(0, separatorIndex).trim();
                const text = input.slice(separatorIndex + separator[0].length).trim();
                if (!title || !text) {
                    return message.reply({ text: `❌ Informe o título e o texto. Exemplo: \`${message.prefix}notas add Regras - Leiam as regras do grupo.\`` });
                }
                const result = notes.add(message, title, text);
                if (result.error === "duplicate") {
                    return message.reply({ text: "❌ Já existe uma nota com esse título. Apague a nota existente antes de criar outra." });
                }
                if (result.error) {
                    return message.reply({ text: "❌ Não foi possível salvar a nota neste grupo/servidor." });
                }
                return message.reply({ text: `✅ Nota *${result.note.title}* adicionada.` });
            }

            if (action === "del") {
                if (!await isChatAdmin(message)) {
                    return message.reply({ text: "❌ Apenas administradores podem apagar notas." });
                }
                const title = getArgumentText(message, 1);
                if (!title) {
                    return message.reply({ text: `❌ Uso: \`${message.prefix}notas del título\`` });
                }
                if (!notes.remove(message, title)) {
                    return message.reply({ text: `❌ Não encontrei uma nota com o título *${title}*.` });
                }
                return message.reply({ text: `✅ Nota *${title}* apagada.` });
            }

            const selector = getArgumentText(message, 0);
            const note = notes.find(message, selector);
            if (!note) {
                return message.reply({ text: `❌ Não encontrei essa nota. Use \`${message.prefix}notas\` para ver a lista.` });
            }
            return message.reply({ text: `📝 *${note.title}*\n\n${note.text}` });
        } catch (error) {
            console.error("[NOTAS] Erro ao processar notas:", error);
            return message.reply({ text: "❌ Ocorreu um erro ao acessar as notas. Tente novamente." });
        }
    }
};
