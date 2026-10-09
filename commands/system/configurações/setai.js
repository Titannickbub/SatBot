const DESCRIPTION = `🔑 Configura chaves de API para os provedores de IA (Gemini, Groq, OpenRouter).

🔐 Disponível apenas para superusuários / donos do bot.

📝 1. Configure a chave principal (posição 1):
{prefix}setai <gemini|groq|openrouter> <sua_chave>
{prefix}setai gemini AIzaSy...

🔢 2. Configure uma chave em um slot específico (1, 2 ou 3):
{prefix}setai <gemini|groq|openrouter> <1|2|3> <sua_chave>
{prefix}setai gemini 2 AIzaSy_SegundaChave...
{prefix}setai gemini 3 AIzaSy_TerceiraChave...

O bot suporta até 3 chaves por provedor. Se uma chave atingir o limite (Rate Limit 429), o bot alterna automaticamente para a próxima chave.

📦 3. Configure múltiplas chaves de uma vez:
{prefix}setai <gemini|groq|openrouter> <chave1>, <chave2>, <chave3>
{prefix}setai gemini AIzaSy_1, AIzaSy_2, AIzaSy_3

🗑️ 4. Remova todas as chaves de um provedor:
{prefix}setai <gemini|groq|openrouter> clear
{prefix}setai gemini clear

📋 5. Consulte o status das chaves:
{prefix}setai

Exibe quais chaves estão configuradas (parcialmente mascaradas) para cada provedor.`;

module.exports = {
    name: "setai",
    aliases: ["setkeyai", "aikey"],
    category: "system/configurações",
    description: DESCRIPTION,
    usage: "{prefix}setai <gemini|groq|openrouter> [1|2|3] <sua_chave>",
    examples: [
        "{prefix}setai gemini AIzaSy...",
        "{prefix}setai gemini 2 AIzaSy_SegundaChave...",
        "{prefix}setai gemini AIzaSy_1, AIzaSy_2, AIzaSy_3",
        "{prefix}setai gemini clear"
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
    const aiHelper = message.functions?.aiHelper || require("../../../functions/aiHelper");
    const config = aiHelper.getConfig ? aiHelper.getConfig() : {};

    const gKeys = config.geminiKeys || (config.geminiKey ? [config.geminiKey] : []);
    const grKeys = config.groqKeys || (config.groqKey ? [config.groqKey] : []);
    const oKeys = config.openrouterKeys || (config.openrouterKey ? [config.openrouterKey] : []);

    const base = DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");

    const status = [
        "",
        "📊 *STATUS DAS CHAVES ATIVAS:*",
        `  • *Gemini (Google AI Studio)*:`,
        `    ├─ Chave 1: ${maskKey(gKeys[0])}`,
        `    ├─ Chave 2: ${maskKey(gKeys[1])}`,
        `    └─ Chave 3: ${maskKey(gKeys[2])}`,
        `  • *Groq*:`,
        `    ├─ Chave 1: ${maskKey(grKeys[0])}`,
        `    ├─ Chave 2: ${maskKey(grKeys[1])}`,
        `    └─ Chave 3: ${maskKey(grKeys[2])}`,
        `  • *OpenRouter*:`,
        `    ├─ Chave 1: ${maskKey(oKeys[0])}`,
        `    ├─ Chave 2: ${maskKey(oKeys[1])}`,
        `    └─ Chave 3: ${maskKey(oKeys[2])}`
    ].join("\n");

    return `${base}\n${status}`;
}
