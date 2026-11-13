const localEditor = require("./act18_edit");
const editor = require("./act_edit");

module.exports = {
    ...localEditor,
    name: "act18G_edit",
    category: "system",
    description: localEditor.description
        .replaceAll("act18_edit", "act18G_edit")
        .replace(
            "As ações ficam exclusivas deste grupo/servidor. Se uma ação local tiver o mesmo nome ou alias de uma global, a versão local será usada neste grupo.",
            "As ações são compartilhadas por todos os grupos/servidores. Uma ação local com o mesmo nome ou alias tem prioridade naquele grupo."
        )
        .replace(
            "🔞 Disponível somente em chats com permissão adulta; a mídia fica armazenada em buffer no catálogo.",
            "🔞 Disponível somente em chats com permissão adulta e apenas para superusuários; a mídia fica armazenada em buffer no catálogo."
        ),
    usage: "{prefix}act18G_edit help",
    examples: localEditor.examples.map(example => example.replaceAll("act18_edit", "act18G_edit")),
    info(message) {
        message._actScope = "global";
        message._actCatalog = "adult";
        return localEditor.info(message);
    },
    async execute(message) {
        return editor.execute(message, "global", "adult");
    }
};
