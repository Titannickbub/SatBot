const path = require("path");

module.exports = {

    name: "testvideo",

    description:
        "Testa as funções sendVideo e replyVideo do bot usando vídeo remoto ou local.",

    usage:
        "{prefix}testvideo text\n{prefix}testvideo url\n{prefix}testvideo file",

    examples: [
        "{prefix}testvideo text",
        "{prefix}testvideo url",
        "{prefix}testvideo file"
    ],

    async execute(message) {

        const subcommand =
            message.args[0]
                ?.toLowerCase();

        if (subcommand === "text") {
            return await message.reply({
                text: "Use url ou file para testar envio de vídeo via sendVideo."
            });
        }

        if (subcommand === "url") {
            try {
                const msgId = await message.functions.send.sendVideo(
                    message.platform,
                    message.chatId,
                    message.threadId,
                    "https://www.w3schools.com/html/mov_bbb.mp4",
                    "📹 Vídeo remoto enviado via functions.send.sendVideo()"
                );

                await message.reply({
                    text: `📌 ID do vídeo enviado: ${msgId}`
                });
            } catch (err) {
                console.error("[TESTVIDEO] Erro ao enviar vídeo remoto:", err);
                await message.reply({ text: `❌ Erro: ${err.message}` });
            }
            return;
        }

        if (subcommand === "file") {
            try {
                const msgId = await message.functions.send.sendVideo(
                    message.platform,
                    message.chatId,
                    message.threadId,
                    path.join(__dirname, "teste.mp4"),
                    "📹 Vídeo local enviado via functions.send.sendVideo()"
                );

                await message.reply({
                    text: `📌 ID do vídeo local enviado: ${msgId}`
                });
            } catch (err) {
                console.error("[TESTVIDEO] Erro ao enviar vídeo local:", err);
                await message.reply({ text: `❌ Erro: ${err.message}` });
            }
            return;
        }

        await message.reply({
            text: "Use: !testvideo url | !testvideo file"
        });
    }

};
