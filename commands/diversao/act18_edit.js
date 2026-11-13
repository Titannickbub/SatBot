const localEditor = require("./act_edit");
const act18Permissions = require("../../functions/act18Permissions");

const DESCRIPTION = localEditor.description
    .replaceAll("act_edit", "act18_edit")
    .replace(
        "O arquivo será salvo permanentemente no disco local.",
        "A mídia é armazenada em base64 no catálogo, sem arquivo de mídia separado."
    )
    .replace(
        "Exclui a ação do banco e remove todos os arquivos de mídia associados do disco local.",
        "Exclui a ação e remove suas mídias codificadas do catálogo."
    )
    .replace(
        "🔐 Disponível para administradores deste grupo/servidor e superusuários.",
        "🔞 Disponível somente em chats com permissão adulta; a mídia fica armazenada em buffer no catálogo."
    );

module.exports = {
    ...localEditor,
    name: "act18_edit",
    aliases: [],
    category: "adm/configurações",
    description: DESCRIPTION,
    usage: "{prefix}act18_edit help",
    examples: localEditor.examples.map(example => example.replaceAll("act_edit", "act18_edit")),
    info(message) {
        message._actCatalog = "adult";
        return localEditor.info(message);
    },
    async execute(message) {
        if (!act18Permissions.isAllowed(message)) {
            return message.reply({ text: act18Permissions.denialText(message) });
        }
        return localEditor.execute(message, "group", "adult");
    }
};
