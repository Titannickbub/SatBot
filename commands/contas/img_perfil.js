const { renderProfile } = require("../../functions/imageBanner");

module.exports = {
    name: "img_perfil",
    aliases: ["img-perfil", "perfilimg"],
    category: "contas",
    description: "Cria e envia uma imagem com os dados do seu perfil, nível e progresso de XP no grupo ou servidor atual.",
    usage: "{prefix}img_perfil",

    async execute(message) {
        const result = await renderProfile(message);
        if (result.error) return message.reply({ text: `❌ ${result.error}` });
        return message.replyImg({ image: result.buffer, caption: result.caption, fileName: "perfil.png" });
    }
};
