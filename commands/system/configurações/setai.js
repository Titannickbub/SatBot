module.exports = {
    name: "setai",
    aliases: ["setkeyai", "aikey"],
    category: "system/configurações",
    description: "Configura chaves de API para IA (Gemini, Groq, OpenRouter) com suporte a até 3 chaves para rotação e failover.",
    usage: "{prefix}setai <gemini|groq|openrouter> [1|2|3] <sua_chave>",
    examples: [
        "{prefix}setai gemini AIzaSy...",
        "{prefix}setai gemini 2 AIzaSy_SegundaChave...",
        "{prefix}setai gemini AIzaSy_1, AIzaSy_2, AIzaSy_3"
    ],

    async execute(message) {
        const owners = message.functions.owners;
        if (owners && !owners.isOwner(message)) {
            return await message.reply({
                text: "❌ Apenas Super Usuários podem configurar chaves de API."
            });
        }

        const args = Array.isArray(message.args) ? message.args : [];
        const first = (args[0] || "").toLowerCase();

        if (!args.length || first === "help" || first === "ajuda") {
            return message.reply({ text: _help(message) });
        }

        if (args.length < 2) {
            return message.reply({ text: `❌ Uso incorreto. ${message.prefix}setai <gemini|groq|openrouter> [1|2|3] <sua_chave>` });
        }

        const provider = args[0].toLowerCase();
        let slot = 1;
        let key = "";

        if (["1", "2", "3"].includes(args[1])) {
            slot = parseInt(args[1], 10);
            key = args.slice(2).join(" ").trim();
        } else {
            key = args.slice(1).join(" ").trim();
        }

        if (!key) {
            return message.reply({ text: `❌ Forneça a chave de API ou 'clear' para remover.` });
        }

        const aiHelper = message.functions.aiHelper || require("../../../functions/aiHelper");

        try {
            const config = aiHelper.setKey(provider, key, slot);
            const provUpper = provider.toUpperCase();

            if (key.toLowerCase() === "clear" || key.toLowerCase() === "limpar") {
                return await message.reply({
                    text: `🗑️ Chaves de API para *${provUpper}* foram removidas.`
                });
            }

            const targetKeys = provUpper === "GEMINI" ? config.geminiKeys : (provUpper === "GROQ" ? config.groqKeys : config.openrouterKeys);
            const totalCount = targetKeys ? targetKeys.length : 1;

            return await message.reply({
                text: `✅ Chave de API para *${provUpper}* (Posição ${slot}) configurada com sucesso!\n📊 Total de chaves ativas para ${provUpper}: *${totalCount}*\n\nTeste digitando: \`${message.prefix}ia Olá, tudo bem?\``
            });
        } catch (err) {
            console.error("[SETIAI] Erro ao salvar chave:", err);
            return await message.reply({
                text: "❌ Não foi possível salvar a chave de API. Confira os dados e tente novamente."
            });
        }
    }
};

function maskKey(key) {
    if (!key || typeof key !== "string") return "❌ Não configurada";
    if (key.length <= 10) return "✅ " + key.substring(0, 3) + "***";
    return "✅ " + key.substring(0, 6) + "..." + key.substring(key.length - 4);
}

function _help(message) {
    const p = message.prefix;
    const plat = message.platform;
    const aiHelper = message.functions?.aiHelper || require("../../../functions/aiHelper");
    const config = aiHelper.getConfig ? aiHelper.getConfig() : {};

    const isDiscord = plat === 'discord';
    const b = (txt) => isDiscord ? `**${txt}**` : `*${txt}*`;

    let header = '🔑 ' + b('SET AI — GERENCIAMENTO DE CHAVES');
    if (plat === 'discord') header = '🎮 ' + b('SET AI (Discord) — GERENCIAMENTO DE CHAVES');
    else if (plat === 'whatsapp') header = '📱 ' + b('SET AI (WhatsApp) — GERENCIAMENTO DE CHAVES');
    else if (plat === 'telegram') header = '✈️ ' + b('SET AI (Telegram) — GERENCIAMENTO DE CHAVES');

    const gKeys = config.geminiKeys || (config.geminiKey ? [config.geminiKey] : []);
    const grKeys = config.groqKeys || (config.groqKey ? [config.groqKey] : []);
    const oKeys = config.openrouterKeys || (config.openrouterKey ? [config.openrouterKey] : []);

    const lines = [];
    lines.push(header);
    lines.push('');
    lines.push('Gerencie até 3 chaves de API para cada provedor (Gemini, Groq, OpenRouter).');
    lines.push('Se uma chave atingir o limite (Rate Limit 429), o bot alterna automaticamente para a próxima chave!');
    lines.push('');
    lines.push('📋 ' + b('STATUS DAS CHAVES ATIVAS:'));
    lines.push(`  • ${b('Gemini (Google AI Studio)')}:`);
    lines.push(`    ├─ Chave 1: ${maskKey(gKeys[0])}`);
    lines.push(`    ├─ Chave 2: ${maskKey(gKeys[1])}`);
    lines.push(`    └─ Chave 3: ${maskKey(gKeys[2])}`);
    lines.push(`  • ${b('Groq')}:`);
    lines.push(`    ├─ Chave 1: ${maskKey(grKeys[0])}`);
    lines.push(`    ├─ Chave 2: ${maskKey(grKeys[1])}`);
    lines.push(`    └─ Chave 3: ${maskKey(grKeys[2])}`);
    lines.push(`  • ${b('OpenRouter')}:`);
    lines.push(`    ├─ Chave 1: ${maskKey(oKeys[0])}`);
    lines.push(`    ├─ Chave 2: ${maskKey(oKeys[1])}`);
    lines.push(`    └─ Chave 3: ${maskKey(oKeys[2])}`);
    lines.push('');
    lines.push('⚙️ ' + b('COMANDOS:'));
    lines.push('  `' + p + 'setai <gemini|groq|openrouter> <chave>` (Chave 1)');
    lines.push('  `' + p + 'setai <gemini|groq|openrouter> <1|2|3> <chave>` (Slot Específico)');
    lines.push('  `' + p + 'setai <gemini|groq|openrouter> <chave1>, <chave2>, <chave3>` (Múltiplas)');
    lines.push('  `' + p + 'setai <gemini|groq|openrouter> clear` (Limpar)');
    lines.push('');
    lines.push('📌 ' + b('EXEMPLOS:'));
    lines.push('  ' + p + 'setai gemini AIzaSy...');
    lines.push('  ' + p + 'setai gemini 2 AIzaSy_SegundaChave...');
    lines.push('  ' + p + 'setai gemini 3 AIzaSy_TerceiraChave...');

    return lines.join('\n');
}
