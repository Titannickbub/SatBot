/*
    O menu pertence à categoria explícita
    "adm/ações imediatas"; o caminho para o Core
    acompanha a localização física deste arquivo.
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

    2. A primeira subpasta define a categoria quando o comando
       não informa `category` explicitamente.

       Ex:
       commands/system/ping.js

       Categoria:
       system

    3. Uma categoria explícita pode usar `/` para criar
       subcategorias.

       Ex:
       category: "adm/ações imediatas"

       O comando aparece na seção da subcategoria:
       !menu adm/ações imediatas

    Exemplos:

       !menu

       Mostra:
       - comandos da raiz
       - categorias disponíveis

       !menu adm

       Mostra uma seção para cada subcategoria e, ao final,
       os comandos antigos diretamente em `adm`.

    As categorias são detectadas automaticamente
    durante o carregamento dos comandos pelo Core.
*/

const core = require("../../../core");

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
            return text;
        };

        const paginate = (items, pageSize) => {
            const pages = [];
            for (let i = 0; i < items.length; i += pageSize) {
                pages.push(items.slice(i, i + pageSize));
            }
            return pages;
        };

        const normalizeCategory = (value) => String(value || "")
            .trim()
            .toLocaleLowerCase();
        const categorizedCommands = uniqueCommands.filter((cmd) =>
            normalizeCategory(cmd.category)
        );

        if (!category) {
            const rootCommands = [];
            const categories = new Set();

            for (const cmd of uniqueCommands) {
                if (!cmd.category) {
                    rootCommands.push(formatCommand(cmd));
                } else if (categorizedCommands.includes(cmd)) {
                    categories.add(normalizeCategory(cmd.category).split("/")[0]);
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

        const categoryPath = normalizeCategory(message.args.join(" "));
        const categoryCommands = uniqueCommands
            .filter((cmd) => normalizeCategory(cmd.category) === categoryPath);
        const subcategoryCommands = new Map();

        for (const cmd of categorizedCommands) {
            const commandCategory = normalizeCategory(cmd.category);
            if (!commandCategory.startsWith(`${categoryPath}/`)) continue;

            const relativeParts = commandCategory
                .slice(categoryPath.length + 1)
                .split("/");
            const subcategoryPath = `${categoryPath}/${relativeParts[0]}`;
            if (!subcategoryCommands.has(subcategoryPath)) {
                subcategoryCommands.set(subcategoryPath, []);
            }
            subcategoryCommands.get(subcategoryPath).push(cmd);
        }

        if (!categoryCommands.length && !subcategoryCommands.size) {
            return await message.reply({ text: "❌ Categoria não encontrada." });
        }

        let text = `${headerText}\n\n`;
        const appendCommandSections = (sectionTitle, commandsToFormat) => {
            const pages = paginate(commandsToFormat.map(formatCommand), 10);
            pages.forEach((page, pageIndex) => {
                const pageTitle = pages.length > 1
                    ? `📂 ${sectionTitle} (${pageIndex + 1}/${pages.length})`
                    : `📂 ${sectionTitle}`;
                text += formatSection(pageTitle, page);
            });
        };

        Array.from(subcategoryCommands.keys()).sort().forEach((subcategory) => {
            appendCommandSections(subcategory, subcategoryCommands.get(subcategory));
        });

        if (categoryCommands.length) {
            appendCommandSections(categoryPath, categoryCommands);
        }
        text += "===================";

        await message.reply({ text });

    }

};