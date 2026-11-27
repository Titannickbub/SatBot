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
    text += `\nUse ${prefix}catalogo base <número> ou ${prefix}catalogo base <nome> para listar os personagens.\n`;
    text += `Exemplo: ${prefix}catalogo base 1`;
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
    text += `\nPara ver o card de um personagem use ${prefix}catalogo personagem <id>.\n`;
    if (page < totalPages) {
        text += `Próxima página: ${prefix}catalogo base ${baseName} ${page + 1}`;
    }
    await message.reply({ text });
}

/**
 * Manipulação principal do comando `!catalogo`
 *
 * Sintaxe de texto (WhatsApp e plataformas sem UI rica):
 *   !catalogo                          → lista as bases disponíveis
 *   !catalogo base <nome|número> [pág] → lista personagens da base, paginado
 *   !catalogo personagem <id>          → exibe o card do personagem pelo ID
 *   !catalogo help                     → exibe ajuda do comando
 *   !catalogo escolher <id>            → escolhe personagem inicial
 *
 * Em Discord e Telegram os botões continuam funcionando normalmente via handleInteraction.
 */
module.exports = {
    name: "catalogo",
    category: "contas/RPG",
    description: "Consulta o catálogo de personagens RPG e permite escolher seu personagem inicial.",
    usage: "{prefix}catalogo [base <nome|número> [página] | personagem <id> | escolher <id> | help]",
    async execute(message) {
        // Em plataformas com interface rica (Discord, Telegram) delegamos ao fluxo original que gera embeds e botões.
        if (message.platform !== "whatsapp") {
            return rpgCommands.execute(message, "catalog", message.args || []);
        }

        // ── Lógica de texto para WhatsApp (e plataformas sem botões) ──
        const args = message.args || [];
        const prefix = message.prefix;

        // Sem argumentos → lista bases
        if (!args.length) {
            await sendBases(message);
            return;
        }

        const subcmd = args[0].toLowerCase();
        const bases = getBases();

        // !catalogo help / !catalogo ajuda
        if (subcmd === "help" || subcmd === "ajuda") {
            const help =
                `📖 *Como usar ${prefix}catalogo*\n` +
                `• ${prefix}catalogo — lista todas as bases disponíveis.\n` +
                `• ${prefix}catalogo base <número> [página] — lista personagens da base pelo número.\n` +
                `• ${prefix}catalogo base <nome> [página] — lista personagens da base pelo nome.\n` +
                `• ${prefix}catalogo personagem <id> — mostra o card do personagem com aquele ID.\n` +
                `• ${prefix}catalogo escolher <id> — escolhe um personagem comum como inicial.\n` +
                `\nExemplos:\n` +
                `  ${prefix}catalogo base rezero\n` +
                `  ${prefix}catalogo base 1 2\n` +
                `  ${prefix}catalogo personagem 0`;
            await message.reply({ text: help });
            return;
        }

        // !catalogo base <nome|número> [página]
        if (subcmd === "base") {
            const baseArg = args[1];
            if (!baseArg) {
                await message.reply({ text: `❌ Informe o nome ou número da base. Exemplo: ${prefix}catalogo base 1` });
                return;
            }
            let baseName;
            if (!isNaN(baseArg)) {
                // Argumento numérico → índice da lista
                const idx = parseInt(baseArg, 10) - 1;
                if (idx < 0 || idx >= bases.length) {
                    await message.reply({ text: `❌ Base número ${baseArg} não encontrada. Use ${prefix}catalogo para ver a lista.` });
                    return;
                }
                baseName = bases[idx];
            } else {
                // Argumento textual → nome da base (busca case-insensitive e alfanumérica)
                baseName = bases.find(b =>
                    b.toLowerCase() === baseArg.toLowerCase() ||
                    b.toLowerCase().replace(/[^a-z0-9]/g, '') === baseArg.toLowerCase().replace(/[^a-z0-9]/g, '')
                );
                if (!baseName) {
                    await message.reply({ text: `❌ Base "${baseArg}" não encontrada. Use ${prefix}catalogo para ver a lista de bases.` });
                    return;
                }
            }
            const page = args[2] && !isNaN(args[2]) ? parseInt(args[2], 10) : 1;
            await sendCharacters(message, baseName, page);
            return;
        }

        // !catalogo <nome da base> [página] (ex: !catalogo rezero 1)
        const possibleBase = bases.find(b =>
            b.toLowerCase() === subcmd ||
            b.toLowerCase().replace(/[^a-z0-9]/g, '') === subcmd.replace(/[^a-z0-9]/g, '')
        );
        if (possibleBase) {
            const page = args[1] && !isNaN(args[1]) ? parseInt(args[1], 10) : 1;
            await sendCharacters(message, possibleBase, page);
            return;
        }

        // !catalogo <número da base> [página] (ex: !catalogo 1 1)
        if (!isNaN(subcmd)) {
            const idx = parseInt(subcmd, 10) - 1;
            if (idx >= 0 && idx < bases.length) {
                const page = args[1] && !isNaN(args[1]) ? parseInt(args[1], 10) : 1;
                await sendCharacters(message, bases[idx], page);
                return;
            }
        }

        // !catalogo personagem <id>
        if (subcmd === "personagem" || subcmd === "ver" || subcmd === "abrir") {
            const idArg = args[1];
            if (!idArg) {
                await message.reply({ text: `❌ Informe o ID do personagem. Exemplo: ${prefix}catalogo personagem 0` });
                return;
            }
            // Delega ao fluxo original passando ["ver", idArg] para exibir o card
            return rpgCommands.execute(message, "catalog", ["ver", idArg]);
        }

        // !catalogo escolher <id>
        if (subcmd === "escolher" || subcmd === "inicial") {
            return rpgCommands.execute(message, "catalog", args);
        }

        // Subcomando desconhecido → erro claro, sem vazar ajuda de outra área
        await message.reply({
            text: `❓ Subcomando desconhecido. Use ${prefix}catalogo help para ver as opções disponíveis.`
        });
    },
    async handleInteraction(interaction) {
        // Botões já existentes continuam chamando o handler original
        return rpgCommands.handleInteraction(interaction, ["catalogo"]);
    }
};
