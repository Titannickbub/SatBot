const path = require("path");

module.exports = {

    name: "testsend",

    description:
        "Testa as funções send e sendImg usando functions.send ao invés de reply.",

    usage:
        "{prefix}testsend text\n{prefix}testsend url\n{prefix}testsend file",

    examples: [
        "{prefix}testsend text",
        "{prefix}testsend url",
        "{prefix}testsend file"
    ],

    async execute(message) {

        const subcommand =
            message.args[0]
                ?.toLowerCase();

        if (subcommand === "text") {

            try {

                await message.functions.send.send(
                    message.platform,
                    message.chatId,
                    message.threadId,
                    "✔️ Mensagem enviada via functions.send.send()"
                );

            } catch (err) {

                console.error(
                    "[TESTSEND] Erro ao enviar texto:",
                    err
                );

                await message.reply({
                    text: `❌ Erro: ${err.message}`
                });

            }

            return;

        }

        if (subcommand === "url") {

            try {

                await message.functions.send.sendImg(
                    message.platform,
                    message.chatId,
                    message.threadId,
                    "https://wallpapercave.com/wp/wp8277752.png",
                    "📸 Imagem enviada via functions.send.sendImg()"
                );

            } catch (err) {

                console.error(
                    "[TESTSEND] Erro ao enviar imagem URL:",
                    err
                );

                await message.reply({
                    text: `❌ Erro: ${err.message}`
                });

            }

            return;

        }

        if (subcommand === "file") {

            try {

                await message.functions.send.sendImg(
                    message.platform,
                    message.chatId,
                    message.threadId,
                    path.join(__dirname, "teste.jpg"),
                    "📁 Imagem local enviada via functions.send.sendImg()"
                );

            } catch (err) {

                console.error(
                    "[TESTSEND] Erro ao enviar arquivo local:",
                    err
                );

                await message.reply({
                    text: `❌ Erro: ${err.message}`
                });

            }

            return;

        }

        await message.reply({
            text:
                "Use: !testsend text | !testsend url | !testsend file"
        });

    }

};
