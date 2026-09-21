const { renderProfile } = require("../../functions/imageBanner");

module.exports = {
    name: "img_perfil",
    aliases: ["img-perfil", "perfilimg"],
    category: "contas",
    description: "Gera uma imagem do seu perfil no grupo ou servidor.",
    usage: "{prefix}img_perfil",

    async execute(message) {
        const result = await renderProfile(message);
        if (result.error) return message.reply({ text: `❌ ${result.error}` });
        return message.replyImg({ image: result.buffer, caption: result.caption, fileName: "perfil.png" });
    }
};
