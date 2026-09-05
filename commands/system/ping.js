module.exports = {

    name: "ping",

    description:
        "Verifica a latência do bot.",

    usage:
        "{prefix}ping",

    examples: [
        "{prefix}ping"
    ],

    async execute(message) {

        const ping =
            message.messagePing;

        const apiPing =
            message.apiPing;

        // Convertemos o uptime total para segundos
        const totalSeconds = 
            Math.floor(message.uptime / 1000);

        // Cálculos para formatar o tempo
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        // Criamos uma array para juntar apenas o que for maior que zero
        const uptimeArray = [];
        if (days > 0) uptimeArray.push(`${days}d`);
        if (hours > 0) uptimeArray.push(`${hours}h`);
        if (minutes > 0) uptimeArray.push(`${minutes}m`);
        if (seconds > 0 || uptimeArray.length === 0) uptimeArray.push(`${seconds}s`);

        // Junta os elementos com um espaço (Ex: "1d 4h 20m 15s")
        const uptimeFormated = uptimeArray.join(' ');

        let text =
`🏓 Pong!

📨 Latência:
${ping} ms`;

        if (
            apiPing !== null &&
            apiPing !== undefined
        ) {

            text +=
`\n📡 API:
${apiPing} ms`;

        }

        text +=
`\n⏱️ Uptime:
${uptimeFormated}`;

        await message.reply({
            text
        });

    }

};
