const fs = require("fs");
const path = require("path");

module.exports = {
    name: "testaudio",

    description: "Testa envio de áudio",

    usage:
        "{prefix}testaudio <subcomando>\n" +
        "Subcomandos: url, file",

    examples: [
        "{prefix}testaudio url",
        "{prefix}testaudio file"
    ],

    async execute(message) {

        const subcommand = message.args[0]?.toLowerCase();

        try {

            if (subcommand === "url") {

                await message.reply({
                    text: "🎵 Enviando áudio de URL..."
                });

                const audioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

                const msgId = await message.replyAudio({
                    audio: audioUrl,
                    caption: "Teste de Áudio - URL"
                });

                await message.reply({
                    text: `✅ Áudio enviado!\nMsg ID: ${msgId}`
                });

            } else if (subcommand === "file") {

                await message.reply({
                    text: "📁 Procurando arquivo de áudio local..."
                });

                // CORREÇÃO: Mudado de process.cwd() para __dirname
                const testPath = path.join(
                    __dirname,
                    "test-audio.mp3"
                );

                if (fs.existsSync(testPath)) {

                    const msgId = await message.replyAudio({
                        audio: testPath,
                        caption: "Teste de Áudio - Arquivo Local"
                    });

                    await message.reply({
                        text: `✅ Áudio do arquivo enviado!\nMsg ID: ${msgId}`
                    });

                } else {

                    await message.reply({
                        text: `❌ Arquivo não encontrado em: ${testPath}\n\nColoque o arquivo 'test-audio.mp3' na mesma pasta deste comando.`
                    });

                }

            } else {

                await message.reply({
                    text: `Use: ${message.prefix}testaudio <subcomando>\n\nSubcomandos:\n- url: testa áudio de URL\n- file: testa áudio de arquivo local`
                });

            }

        } catch (err) {

            console.error("[TESTAUDIO] Erro:", err.message);

            await message.reply({
                text: `❌ Erro: ${err.message}`
            });

        }

    }

};
