const { renderProfile } = require("../../../functions/imageBanner");

module.exports = {
    name: "perfil",
    aliases: ["profile", "minhaconta"],
    category: "contas/exibir",
    description: "Gera uma imagem com os dados do seu perfil, nível, XP e atividade no grupo ou servidor atual.",
    usage: "{prefix}perfil",

    async execute(message) {
        const result = await renderProfile(message);
        if (result.error) return message.reply({ text: `❌ ${result.error}` });
        return message.replyImg({
            image: result.buffer,
            caption: `${result.caption}\n\nℹ️ O antigo modelo em texto está disponível em ${message.prefix}perfil_text.`,
            fileName: "perfil.png"
        });
    }
};
