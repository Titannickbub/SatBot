const path = require("path");

module.exports = {

    name: "testmsgid",

    description:
        "Testa e exibe o ID das mensagens enviadas via functions.send",

    usage:
        "{prefix}testmsgid text\n{prefix}testmsgid url\n{prefix}testmsgid file",

    examples: [
        "{prefix}testmsgid text",
        "{prefix}testmsgid url",
        "{prefix}testmsgid file"
    ],

    async execute(message) {

        const subcommand =
            message.args[0]
                ?.toLowerCase();

        if (subcommand === "text") {

            try {

                const msgId = await message.functions.send.send(
                    message.platform,
                    message.chatId,
                    message.threadId,
                    "✔️ Mensagem com ID rastreável via functions.send.send()"
                );

                await message.reply({
                    text: `📌 ID da mensagem: ${msgId}`
                });

            } catch (err) {

                console.error(
                    "[TESTMSGID] Erro ao enviar texto:",
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

                const msgId = await message.functions.send.sendImg(
                    message.platform,
                    message.chatId,
                    message.threadId,
                    "https://wallpapercave.com/wp/wp8277752.png",
                    "📸 Imagem com ID rastreável"
                );

                await message.reply({
                    text: `📌 ID da imagem: ${msgId}`
                });

            } catch (err) {

                console.error(
                    "[TESTMSGID] Erro ao enviar imagem URL:",
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

                const msgId = await message.functions.send.sendImg(
                    message.platform,
                    message.chatId,
                    message.threadId,
                    path.join(__dirname, "teste.jpg"),
                    "📁 Arquivo com ID rastreável"
                );

                await message.reply({
                    text: `📌 ID do arquivo: ${msgId}`
                });

            } catch (err) {

                console.error(
                    "[TESTMSGID] Erro ao enviar arquivo local:",
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
                "Use: !testmsgid text | !testmsgid url | !testmsgid file"
        });

    }

};
