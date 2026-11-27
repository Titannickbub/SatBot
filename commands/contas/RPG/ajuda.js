const { getCommandPrefix } = require('../../../functions/rpgUserCommands');

module.exports = {
    name: "ajuda",
    category: "contas/RPG",
    description: "Mostra ajuda dos comandos de texto, especialmente para WhatsApp.",
    usage: "{prefix}ajuda",
    async execute(message) {
        const p = message.prefix || '!';
        const helpText = `🛠️ *Comandos de texto disponíveis*\n` +
            `• ${p}catalogo <nome|id> – exibe o catálogo ou detalhes de um personagem.\n` +
            `• ${p}ajuda – mostra esta mensagem de ajuda.\n` +
            `Exemplo: ${p}catalogo rezero\n` +
            `Caso o comando não seja reconhecido, o bot responderá com sugestão para usar ${p}ajuda.`;
        await message.reply({ text: helpText });
    },
    async handleInteraction(interaction) {
        // Não há interação de botões para ajuda; responde igualmente.
        const msg = interaction.message || {};
        const p = msg.prefix || '!';
        const helpText = `🛠️ *Comandos de texto disponíveis*\n` +
            `• ${p}catalogo <nome|id> – exibe o catálogo ou detalhes de um personagem.\n` +
            `• ${p}ajuda – mostra esta mensagem de ajuda.`;
        await interaction.reply({ text: helpText });
    }
};
