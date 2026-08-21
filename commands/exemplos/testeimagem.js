const path = require("path");

module.exports = {

    name: "img",

    description:
        "Envia uma imagem segura usando um link pré-definido ou um arquivo local.",

    usage:
        "{prefix}img url\n{prefix}img file",

    examples: [
        "{prefix}img url",
        "{prefix}img file"
    ],

    async execute(message) {

        const subcommand =
            message.args[0]
                ?.toLowerCase();

        if (subcommand === "url") {

            await message.replyImg({
                url: "https://wallpapercave.com/wp/wp8277752.png",
                caption: "Imagem enviada pelo link pré-definido."
            });

            return;

        }

        if (subcommand === "file") {

            await message.replyImg({
                file: path.join(__dirname, "teste.jpg"),
                caption: "Imagem local segura enviada."
            });

            return;

        }

        await message.reply({
            text:
                "Use: !img url ou !img file"
        });

    }

};
