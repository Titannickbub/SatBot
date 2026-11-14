const localEditor = require("./act_edit");
const act18Permissions = require("../../functions/act18Permissions");

const DESCRIPTION = localEditor.description
    .replaceAll("act_edit", "act18_edit")
    .replace(
        "O arquivo será salvo permanentemente no disco local.",
        "A mídia é salva como arquivo binário .bin; o catálogo guarda apenas sua referência."
    )
    .replace(
        "Exclui a ação do banco e remove todos os arquivos de mídia associados do disco local.",
        "Exclui a ação e remove as mídias binárias que não forem usadas por outras ações."
    )
    .replace(
        "🔐 Disponível para administradores deste grupo/servidor e superusuários.",
        "🔞 Disponível somente em chats com permissão adulta; as mídias ficam salvas como arquivos .bin."
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
