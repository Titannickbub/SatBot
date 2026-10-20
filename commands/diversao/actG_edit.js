const localEditor = require("./act_edit");

module.exports = {
    ...localEditor,
    name: "actG_edit",
    aliases: ["actedit", "act_inspect", "actinspect", "actedit_G", "act_inspect_G", "actinspect_G"],
    description: localEditor.description
        .replaceAll("act_edit", "actG_edit")
        .replace("🔐 Disponível para administradores deste grupo/servidor e superusuários.", "🔐 Disponível apenas para superusuários / donos do bot.")
        .replace("As ações ficam exclusivas deste grupo/servidor. Se uma ação local tiver o mesmo nome ou alias de uma global, a versão local será usada neste grupo.", "As ações são compartilhadas por todos os grupos/servidores. Uma ação local com o mesmo nome ou alias tem prioridade naquele grupo."),
    usage: "{prefix}actG_edit [subcomando]",
    examples: localEditor.examples.map(example => example.replaceAll("act_edit", "actG_edit")),
    info(message) {
        message._actScope = "global";
        return localEditor.info(message);
    },
    async execute(message) {
        return localEditor.execute(message, "global");
    }
};
