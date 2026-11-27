const rpgCommands = require("../../../functions/rpgUserCommands");
const rpgMaker = require("../../../functions/rpgMaker");

// Tamanho da página usado pelo módulo de comandos RPG (mesmo valor usado na UI de botões)
const PAGE_SIZE = 10;

/**
 * Retorna a lista de bases únicas presentes no catálogo, ordenadas alfabeticamente.
 */
function getBases() {
    const catalog = rpgMaker.readCatalog();
    const basesSet = new Set();
    for (const char of catalog.personagens) {
        if (char.base && typeof char.base === "string") {
            basesSet.add(char.base.trim());
        }
    }
    return Array.from(basesSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

/**
 * Formata e envia a lista de bases disponíveis.
 */
async function sendBases(message) {
    const bases = getBases();
    if (!bases.length) {
        await message.reply({ text: "⚠️ Nenhuma base encontrada no catálogo." });
        return;
    }
    const prefix = message.prefix;
    let text = "📚 *Bases disponíveis*\n";
    bases.forEach((b, i) => {
        text += `${i + 1}. ${b}\n`;
    });
    text += `\nUse ${prefix}catalogo <número> ou ${prefix}catalogo <nome> para listar os personagens desta base.\n`;
    text += `Exemplo: ${prefix}catalogo 1`;
    await message.reply({ text });
}

/**
 * Lista os personagens de uma base, paginada.
 */
async function sendCharacters(message, baseName, page = 1) {
    const catalog = rpgMaker.readCatalog();
    const chars = catalog.personagens.filter(c => String(c.base).toLowerCase() === baseName.toLowerCase());
    if (!chars.length) {
        await message.reply({ text: `❌ Nenhum personagem encontrado na base "${baseName}".` });
        return;
    }
    const totalPages = Math.max(1, Math.ceil(chars.length / PAGE_SIZE));
    if (page < 1 || page > totalPages) {
        await message.reply({ text: `❌ Página ${page} inválida. Existem ${totalPages} páginas para a base "${baseName}".` });
        return;
    }
    const start = (page - 1) * PAGE_SIZE;
    const slice = chars.slice(start, start + PAGE_SIZE);
    const prefix = message.prefix;
    let text = `📜 *Base:* ${baseName} – página ${page}/${totalPages}\n`;
    slice.forEach(ch => {
        text += `• ${ch.id} – ${ch.nome}\n`;
    });
    text += `\nPara ver detalhes de um personagem use ${prefix}catalogo ${baseName} <id>.\n`;
    if (page < totalPages) {
        text += `Para a próxima página use ${prefix}catalogo ${baseName} ${page + 1}.`;
    }
    await message.reply({ text });
}

/**
 * Manipulação principal do comando `!catalogo`.
 *
 * - Sem argumentos → lista as bases.
 * - Número ou "base <n>" → lista personagens da base indicada (página 1).
 * - Nome da base + número da página → lista página específica.
 * - Nome da base + id do personagem → delega ao rpgCommands para exibir o card.
 */
module.exports = {
    name: "catalogo",
    category: "contas/RPG",
    description: "Consulta o catálogo de personagens RPG e permite escolher seu personagem inicial.",
    usage: "{prefix}catalogo [base|número] [página|id]",
    async execute(message) {
        // Em plataformas com interface rica (Discord, Telegram) delegamos ao fluxo original que gera embeds e botões.
        // Apenas no WhatsApp usamos a lógica de texto que implementamos.
        if (message.platform !== "whatsapp") {
            // Mantém comportamento original (embeds, botões etc.)
            return rpgCommands.execute(message, "catalog", message.args || []);
        }
        // Lógica exclusiva para WhatsApp (texto puro)
        const args = message.args || [];
        const prefix = message.prefix;
        // Sem argumentos → lista bases
        if (!args.length) {
            await sendBases(message);
            return;
        }
        const first = args[0].toLowerCase();
        const bases = getBases();
        // Ajuda rápida
        if (first === "help" || first === "ajuda") {
            const help = `📖 *Como usar ${prefix}catalogo*\n` +
                `• ${prefix}catalogo – lista todas as bases disponíveis.\n` +
                `• ${prefix}catalogo <número> – lista os personagens da base de número <número> (página 1).\n` +
                `• ${prefix}catalogo <nome> – lista os personagens da base "<nome>" (página 1).\n` +
                `• ${prefix}catalogo <nome> <página> – navega entre as páginas da base.\n` +
                `• ${prefix}catalogo <nome> <id> – mostra detalhes do personagem com aquele ID.\n` +
                `Exemplo: ${prefix}catalogo rezero 2`;
            await message.reply({ text: help });
            return;
        }
        // Detecta padrão "base <n>"
        if (first === "base" && args[1]) {
            const idx = parseInt(args[1], 10) - 1;
            if (isNaN(idx) || idx < 0 || idx >= bases.length) {
                await message.reply({ text: `❌ Base número ${args[1]} não encontrada. Use ${prefix}catalogo para ver a lista.` });
                return;
            }
            const baseName = bases[idx];
            const page = args[2] && !isNaN(args[2]) ? parseInt(args[2], 10) : 1;
            await sendCharacters(message, baseName, page);
            return;
        }
        // Se o primeiro argumento for numérico → trata como índice da base
        if (!isNaN(first)) {
            const idx = parseInt(first, 10) - 1;
            if (idx < 0 || idx >= bases.length) {
                await message.reply({ text: `❌ Base número ${first} não encontrada. Use ${prefix}catalogo para ver a lista.` });
                return;
            }
            const baseName = bases[idx];
            const page = args[1] && !isNaN(args[1]) ? parseInt(args[1], 10) : 1;
            await sendCharacters(message, baseName, page);
            return;
        }
        // Primeiro argumento é texto – pode ser nome da base ou ID de personagem
        const possibleBase = bases.find(b => b.toLowerCase() === first);
        if (possibleBase) {
            const second = args[1];
            if (second && !isNaN(second)) {
                const third = args[2];
                if (third && !isNaN(third)) {
                    // Página especificada
                    await sendCharacters(message, possibleBase, parseInt(second, 10));
                } else {
                    // Verifica se o número corresponde a um ID de personagem da base
                    const catalog = rpgMaker.readCatalog();
                    const charExists = catalog.personagens.some(c =>
                        String(c.base).toLowerCase() === possibleBase.toLowerCase() &&
                        String(c.id) === second
                    );
                    if (charExists) {
                        // Delegar ao comando original para exibir o card do personagem por ID
                        return rpgCommands.execute(message, "catalog", args);
                    } else {
                        // Tratar como número de página (deve começar em 1)
                        const pageNum = parseInt(second, 10);
                        if (pageNum < 1) {
                            await message.reply({ text: `❌ Página ${pageNum} inválida. Comece a contar a partir de 1.` });
                            return;
                        }
                        await sendCharacters(message, possibleBase, pageNum);
                    }
                }
                return;
            }
            // Apenas o nome da base → lista página 1
            await sendCharacters(message, possibleBase, 1);
            return;
        }
        // Nenhuma base encontrada – delega ao comportamento original (busca por ID ou erro)
        return rpgCommands.execute(message, "catalog", args);
    },
    async handleInteraction(interaction) {
        // Botões já existentes continuam chamando o handler original
        return rpgCommands.handleInteraction(interaction, ["catalogo"]);
    }
};