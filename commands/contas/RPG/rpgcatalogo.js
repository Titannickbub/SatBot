const rpgCommands = require("../../../functions/rpgUserCommands");

module.exports = {
    name: "catalogo",
    category: "contas/RPG",
    description: "Consulta o catálogo de personagens RPG e permite escolher seu personagem inicial.",
    usage: "{prefix}catalogo <personagem> – exibe o catálogo ou detalhes do personagem.",
    async execute(message) {
        // Se o usuário pediu ajuda ou não forneceu argumentos, devolva instruções claras
        const firstArg = (message.args && message.args[0])?.toLowerCase();
        if (!firstArg || firstArg === "help" || firstArg === "ajuda") {
            const helpText = `📚 *Como usar o comando* ${message.prefix}catalogo:
` +
                `• **${message.prefix}catalogo <nome>** – lista os personagens que correspondem ao nome.
` +
                `• **${message.prefix}catalogo <id>** – exibe detalhes do personagem com aquele ID.
` +
                `Exemplo: ${message.prefix}catalogo rezero\n` +
                `Se precisar de mais informações, use ${message.prefix}ajuda.`;
            await message.reply({ text: helpText });
            return;
        }
        try {
            // Delegamos ao módulo de comandos RPG a lógica principal
            await rpgCommands.execute(message, "catalog", message.args || []);
        } catch (err) {
            // Mensagem de erro amigável para o usuário
            const errMsg = `❌ Erro ao processar o catálogo. Verifique se o nome ou ID está correto.
` +
                `Uso: ${message.prefix}catalogo <personagem>
` +
                `Exemplo: ${message.prefix}catalogo rezero`;
            console.error(`${_ts()} ❌[CATALOGO] ${err.message}`);
            await message.reply({ text: errMsg });
        }
    },
    async handleInteraction(interaction) {
        return rpgCommands.handleInteraction(interaction, ["catalogo"]);
    }
};
