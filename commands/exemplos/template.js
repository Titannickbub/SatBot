/*
    ============================================================

    TEMPLATE DE COMANDO - SATELLA

    Antes de criar comandos, leia:

    examples/exemplo-comando.js

    Nesse arquivo estão documentados todos os
    recursos disponíveis para comandos.

    Campos mais utilizados:

    message.platform
    message.chatId
    message.threadId
    message.target

    message.userId
    message.username

    message.text
    message.command
    message.args

    message.chatType
    message.isPrivate

    message.messageId
    message.createdAt
    message.apiPing
    message.messagePing

    message.botId
    message.botUsername

    message.prefix

    message.uptime
    message.core

    message.raw

    message.reply()
    message.replyImg()

    ============================================================

    IMPORTANTE

    Não utilize diretamente APIs do Telegram,
    Discord ou outras plataformas dentro dos
    comandos quando existir uma função da
    Satella para isso.

    Exemplo:

    ✔ message.reply()
    ✔ message.replyImg()

    Evite:

    ✖ ctx.reply()
    ✖ msg.reply()

    Isso mantém compatibilidade entre todas
    as plataformas suportadas pelo bot.

    ============================================================
*/

module.exports = {

    /*
        Nome do comando.

        Exemplo:

        !ping
        !menu
        !youtube
    */
    name: "comando",

    /*
        Função executada pelo Core.

        message contém todas as informações
        da mensagem recebida.
    */
    async execute(message) {

        await message.reply({

            text:
`Olá mundo!

Plataforma: ${message.platform}
Usuário: ${message.username}
Comando: ${message.command}`

        });

    }

};