const { loadDictionary, setEmojiMapping, removeEmojiMapping } = require("../../functions/discordEmojiHelper");
const { isOwner } = require("../../functions/owners");

module.exports = {
    name: "discordemoji",
    aliases: ["setemoji", "emojidict"],
    description: "Gerencia o dicionário de tradução de emojis customizados do Discord/Vencord para emojis padrão das outras plataformas.",
    usage: "{prefix}discordemoji <emoji_ou_id_ou_link> <emoji_padrao>",
    examples: [
        "{prefix}discordemoji list",
        "{prefix}discordemoji [NaoSmile](https://cdn.discordapp.com/emojis/845390820705697843...) 😅",
        "{prefix}discordemoji <:pepehappy:123456789012345678> 😊",
        "{prefix}discordemoji pepehappy 😊",
        "{prefix}discordemoji remove pepehappy"
    ],

    async execute(message) {
        const firstArg = message.args[0]?.trim();
        const firstArgLower = firstArg?.toLowerCase();

        // 1. Listagem (sem argumentos ou "!discordemoji list")
        if (!firstArg || firstArgLower === "list") {
            const dict = loadDictionary();
            const entries = Object.entries(dict);

            if (entries.length === 0) {
                return await message.reply({
                    text: `📖 *Dicionário de Emojis do Discord*\n\nNenhum emoji mapeado no momento.\nEmojis sem tradução são convertidos para ⚠️ ou enviados como imagem quando enviados sozinhos.\n\n💡 *Para adicionar:* ${message.prefix}discordemoji <emoji_vencord_ou_discord> <emoji_padrao>\nExemplo: ${message.prefix}discordemoji <:pepehappy:123456> 😊`
                });
            }

            const lines = entries.map(([key, val]) => `• \`${key}\` → ${val}`);
            const text = `📖 *Dicionário de Emojis do Discord*\n\n${lines.join("\n")}\n\nTotal mapeado: *${entries.length}*`;
            return await message.reply({ text });
        }

        const isSuperUser = message.sender?.isOwner || isOwner(message) || message.sender?.isAdmin;
        if (!isSuperUser) {
            return await message.reply({
                text: "❌ Apenas administradores ou donos do bot podem gerenciar o dicionário de emojis."
            });
        }

        // 2. Remoção ("!discordemoji remove <key>" ou "!discordemoji del <key>")
        if (firstArgLower === "remove" || firstArgLower === "del" || firstArgLower === "delete") {
            let keyArg = message.args[1]?.trim();
            if (!keyArg) {
                return await message.reply({
                    text: `❌ Informe o nome, ID ou link do emoji a remover.\nExemplo: ${message.prefix}discordemoji remove pepehappy`
                });
            }

            const matchStandard = keyArg.match(/<(a)?:([a-zA-Z0-9_]+):(\d+)>/i);
            const matchVencord = keyArg.match(/\[([a-zA-Z0-9_]+)\]\((https?:\/\/(?:cdn|media)\.discordapp\.(?:com|net)\/emojis\/(\d+)\.[a-zA-Z0-9]+(?:\?[^\s)]*)?)\)/i);
            const match = matchStandard || matchVencord;

            if (match) {
                const name = matchStandard ? matchStandard[2] : matchVencord[1];
                const id = matchStandard ? matchStandard[3] : matchVencord[3];
                removeEmojiMapping(name);
                removeEmojiMapping(id);
            } else {
                removeEmojiMapping(keyArg);
            }

            return await message.reply({
                text: `🗑️ Mapeamento do emoji \`${keyArg}\` removido do dicionário.`
            });
        }

        // 3. Adição direta ("!discordemoji <emoji> <traducao>" ou "!discordemoji add <emoji> <traducao>")
        let keyArg = firstArg;
        let targetEmoji = message.args[1]?.trim();

        if (firstArgLower === "add" || firstArgLower === "set") {
            keyArg = message.args[1]?.trim();
            targetEmoji = message.args[2]?.trim();
        }

        if (!keyArg || !targetEmoji) {
            return await message.reply({
                text: `❌ Uso correto: ${message.prefix}discordemoji <emoji_discord_ou_vencord_ou_id> <emoji_padrao>\nExemplo: ${message.prefix}discordemoji <:pepehappy:123456789> 😊\nExemplo Vencord: ${message.prefix}discordemoji [NaoSmile](https://cdn.discordapp.com/emojis/845390820705697843...) 😅`
            });
        }

        const matchStandard = keyArg.match(/<(a)?:([a-zA-Z0-9_]+):(\d+)>/i);
        const matchVencord = keyArg.match(/\[([a-zA-Z0-9_]+)\]\((https?:\/\/(?:cdn|media)\.discordapp\.(?:com|net)\/emojis\/(\d+)\.[a-zA-Z0-9]+(?:\?[^\s)]*)?)\)/i);
        const match = matchStandard || matchVencord;

        if (match) {
            const name = matchStandard ? matchStandard[2] : matchVencord[1];
            const id = matchStandard ? matchStandard[3] : matchVencord[3];
            setEmojiMapping(id, targetEmoji);
            setEmojiMapping(name, targetEmoji);
            return await message.reply({
                text: `✅ Emoji customizado do Discord/Vencord traduzido com sucesso!\n\n• ID (\`${id}\`) → ${targetEmoji}\n• Nome (\`${name}\`) → ${targetEmoji}`
            });
        }

        setEmojiMapping(keyArg, targetEmoji);
        return await message.reply({
            text: `✅ Mapeamento salvo no dicionário de emojis:\n• \`${keyArg}\` → ${targetEmoji}`
        });
    }
};
