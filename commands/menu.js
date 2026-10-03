const core = require("../core");
const { getCommandPlatformIndicator } = require("../functions/commandPlatformSupport");

module.exports = {
    name: "menu",
    aliases: ["help", "ajuda"],
    description: "Exibe o menu de comandos e permite listar comandos por categoria.",
    usage: "{prefix}menu [categoria]",
    examples: [
        "{prefix}menu",
        "{prefix}menu downloads",
        "{prefix}menu diversão"
    ],
    async execute(message) {
        const commands = core.getCommands();
        const normalizeCategory = (value) => core.normalizeCommandName(value);
        const category = normalizeCategory(message.args.join(" "));
        const headerText = `💡 Qualquer dúvida? Use ${message.prefix}info <comando ou categoria> para detalhes.`;

        const uniqueCommands = (() => {
            const seen = new Set();
            return Object.values(commands).filter((cmd) => {
                const signature = `${cmd.name || ""}|${cmd.category || ""}|${cmd.file || ""}`;
                if (seen.has(signature)) {
                    return false;
                }
                seen.add(signature);
                return true;
            });
        })();

        const formatCommand = (cmd) => {
            const indicator = getCommandPlatformIndicator(cmd, message.platform);
            const usage = cmd.usage
                ? cmd.usage.replace(/\{prefix\}/g, message.prefix)
                : `${message.prefix}${cmd.name}`;
            return usage
                .split("\n")
                .map(line => line.trim())
                .filter(Boolean)
                .map(line => `${indicator.icon} ${line}`);
        };

        const formatSection = (title, items, prefix = "🔶") => {
            if (!items.length) return "";

            let text = "===================\n";
            text += `${title}\n\n`;
            text += items.map((item) => prefix ? `${prefix} ${item}` : item).join("\n");
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

        const categorizedCommands = uniqueCommands.filter((cmd) =>
            normalizeCategory(cmd.category)
        );

        if (!category) {
            const rootCommands = [];
            const categories = new Set();

            for (const cmd of uniqueCommands) {
                if (!cmd.category) {
                    rootCommands.push(cmd);
                } else if (categorizedCommands.includes(cmd)) {
                    categories.add(normalizeCategory(cmd.category).split("/")[0]);
                }
            }

            let text = `${headerText}\n\n`;

            if (rootCommands.length) {
                const pages = paginate(rootCommands, 10);
                pages.forEach((page) => {
                    text += formatSection(
                        "📄 Comandos:",
                        page.flatMap(formatCommand),
                        ""
                    );
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
            const pages = paginate(commandsToFormat, 10);
            pages.forEach((page, pageIndex) => {
                const pageTitle = pages.length > 1
                    ? `📂 ${sectionTitle} (${pageIndex + 1}/${pages.length})`
                    : `📂 ${sectionTitle}`;
                text += formatSection(
                    pageTitle,
                    page.flatMap(formatCommand),
                    ""
                );
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
