/*
    IMPORTANTE:

    menu.js deve permanecer na raiz de commands/.

    Caso seja movido para outra pasta,
    ajuste o require("../core").
*/

/*
    COMO O MENU FUNCIONA

    O menu é gerado automaticamente usando os comandos
    registrados pelo Core.

    Regras:

    1. Comandos na raiz de commands/
       aparecem no menu principal.

       Ex:
       commands/ping.js
       commands/menu.js

    2. A primeira subpasta define a categoria.

       Ex:
       commands/system/ping.js

       Categoria:
       system

    3. Subpastas mais profundas servem apenas
       para organização interna.

       Ex:
       commands/downloads/youtube/mp3.js

       Continua pertencendo à categoria:
       downloads

    Exemplos:

       !menu

       Mostra:
       - comandos da raiz
       - categorias disponíveis

       !menu downloads

       Mostra todos os comandos cuja
       categoria seja "downloads".

    As categorias são detectadas automaticamente
    durante o carregamento dos comandos pelo Core.
*/

const core = require("../core");

module.exports = {

    name: "menu",

    aliases: ["help", "ajuda"],

    description:
        "Exibe o menu de comandos e permite listar comandos por categoria.",

    usage:
        "{prefix}menu [categoria]",

    examples: [
        "{prefix}menu",
        "{prefix}menu downloads"
    ],

    async execute(message) {

        const commands = core.getCommands();
        const category = message.args[0]?.toLowerCase();
        const headerText = `💡 Qualquer dúvida? Use ${message.prefix}info <comando ou categoria> para detalhes.`;

        const uniqueCommands = (() => {
            const seen = new Set();
            return Object.values(commands).filter((cmd) => {
                const signature = `${cmd.name || ''}|${cmd.category || ''}|${cmd.file || ''}`;
                if (seen.has(signature)) {
                    return false;
                }
                seen.add(signature);
                return true;
            });
        })();

        const formatCommand = (cmd) => cmd.usage
            ? cmd.usage.replace(/\{prefix\}/g, message.prefix)
            : `${message.prefix}${cmd.name}`;

        const formatSection = (title, items, prefix = "🔶") => {
            if (!items.length) return "";

            let text = "===================\n";
            text += `${title}\n\n`;
            text += items.map((item) => `${prefix} ${item}`).join("\n");
            text += "\n";
            text + "===================\n";
            return text;
        };

        const paginate = (items, pageSize) => {
            const pages = [];
            for (let i = 0; i < items.length; i += pageSize) {
                pages.push(items.slice(i, i + pageSize));
            }
            return pages;
        };

        if (!category) {
            const rootCommands = [];
            const categories = new Set();

            for (const cmd of uniqueCommands) {
                if (!cmd.category) {
                    rootCommands.push(formatCommand(cmd));
                } else {
                    categories.add(cmd.category);
                }
            }

            let text = `${headerText}\n\n`;

            if (rootCommands.length) {
                const pages = paginate(rootCommands, 10);
                pages.forEach((page) => {
                    text += formatSection("📄 Comandos:", page, "🔶");
                    text += "\n";
                });
            }

            if (categories.size) {
                const categoryLines = Array.from(categories)
                    .sort()
                    .map((categoryName) => `${message.prefix}menu ${categoryName}`);

                text += formatSection("🗃️ Sub-Menus", categoryLines, "📁");
            }

            if (!text) {
                text = "❌ Nenhum comando registrado.";
            }
            text += "===================";
            return await message.reply({ text });
        }

        const categoryCommands = uniqueCommands
            .filter((cmd) => cmd.category === category)
            .map(formatCommand);

        if (!categoryCommands.length) {
            return await message.reply({ text: "❌ Categoria não encontrada." });
        }

        let text = `${headerText}\n\n`;
        const pages = paginate(categoryCommands, 10);

        pages.forEach((page, pageIndex) => {
            const title = pages.length > 1
                ? `📂 ${category} (${pageIndex + 1}/${pages.length})`
                : `📂 ${category}`;
            text += formatSection(title, page);
        });
        text += "===================";

        await message.reply({ text });

    }

};