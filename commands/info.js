const fs = require("fs");
const path = require("path");

const core = require("../core");

/*
============================================================

COMANDO INFO

LOCAL RECOMENDADO:

commands/info.js

============================================================

IMPORTANTE

Este comando utiliza:

    require("../core")

para acessar os comandos
carregados pelo bot.

O caminho acima foi definido
considerando que este arquivo
está localizado em:

    commands/info.js

============================================================

CASO VOCÊ MOVA ESTE ARQUIVO

Será necessário ajustar
manualmente o require.

Exemplos:

commands/info.js

    require("../core")

commands/system/admin/info.js

    require("../core")

============================================================

COMO FUNCIONA

O comando consulta:

    core.getCommands()

para obter todos os comandos
carregados automaticamente
pelo bot.

Com isso ele consegue exibir:

- Nome
- Descrição
- Categoria
- Arquivo
- Uso
- Exemplos

sem precisar conhecer
previamente quais comandos
existem.

============================================================

INFORMAÇÕES DE COMANDOS

Comandos podem exportar
os seguintes campos opcionais:

    description
    usage
    examples

Exemplo:

module.exports = {

    name: "ping",

    description:
        "Verifica a latência.",

    usage:
        "{prefix}ping",

    examples: [
        "{prefix}ping"
    ]

};

============================================================

RETROCOMPATIBILIDADE

Nenhum desses campos
é obrigatório.

Comandos antigos continuam
funcionando normalmente.

Caso os campos não existam,
o comando info exibirá apenas
as informações disponíveis.

============================================================

INFORMAÇÕES DE CATEGORIAS

Cada categoria pode possuir:

    desc.txt

Exemplo:

    commands/system/desc.txt

Conteúdo:

    Comandos internos
    do bot.

O comando info lerá este
arquivo automaticamente.

============================================================

FUNCIONALIDADES

{prefix}info comando nome

    Exibe informações
    sobre um comando.

Exemplo:

    {prefix}info comando menu

============================================================

{prefix}info categoria nome

    Exibe informações
    sobre uma categoria.

Exemplo:

    {prefix}info categoria system

============================================================
 
*/


module.exports = {

    name: "info",

    description:
        "Exibe informações sobre comandos e categorias.",

    usage:
        `{prefix}info <comando|categoria>`,

    examples: [
        "{prefix}info menu",
        "{prefix}info system"
    ],

    async execute(message) {

        const args = message.args;

        if (!args.length) {
            return mostrarAjuda(message);
        }

        const nome = args[0].toLowerCase();
        const commands = core.getCommands();

        const command = commands[nome];
        const seen = new Set();
        const categoryCommands = Object.values(commands)
            .filter(cmd => {
                if (!cmd.category || categoryRoot(cmd.category) !== nome) return false;
                const signature = `${cmd.name || ''}|${cmd.category || ''}|${cmd.file || ''}`;
                if (seen.has(signature)) return false;
                seen.add(signature);
                return true;
            });

        if (!command && !categoryCommands.length) {
            return message.reply({ text: "❌ Comando ou categoria não encontrado." });
        }

        const parts = [];

        if (command) {
            parts.push(infoComandoText(message, command));
        }

        if (categoryCommands.length) {
            parts.push(infoCategoriaText(message, nome, categoryCommands));
        }

        return message.reply({ text: parts.join("\n") });
    }
};

function formatCommandText(message, cmd) {
    return cmd.usage
        ? cmd.usage.replaceAll("{prefix}", message.prefix)
        : `${message.prefix}${cmd.name}`;
}

function sectionText(title, body) {
    return `===================\n${title}\n\n${body}`;
}

function categoryRoot(category) {
    return String(category || "")
        .split("/", 1)[0]
        .trim()
        .toLocaleLowerCase();
}

function infoComandoText(message, command) {
    if (typeof command.info === "function") {
        return command.info(message);
    }
    if (typeof command.getHelp === "function") {
        return command.getHelp(message);
    }

    let body =
        `📝 Descrição:\n${command.description || "Esse comando não possui descrição."}\n\n` +
        `📂 Categoria:\n${command.category ? categoryRoot(command.category) : "Raiz"}\n\n` +
        `📁 Arquivo:\n/commands/${command.file}`;

    if (command.usage) {
        body += `\n\n⚙️ Uso:\n${command.usage.replaceAll("{prefix}", message.prefix)}`;
    }

    if (command.examples?.length) {
        body += `\n\n📌 Exemplos:\n`;
        body += command.examples
            .map((ex) => `🔶 ${ex.replaceAll("{prefix}", message.prefix)}`)
            .join("\n");
    }

    return sectionText(`📄 ${command.name}`, body);
}

function infoCategoriaText(message, categoria, categoryCommands) {
    const descFile = path.join(
        __dirname,
        "..",
        "commands",
        categoria,
        "desc.txt"
    );

    let description = "Sem descrição para esta categoria.";

    if (fs.existsSync(descFile)) {
        description = fs.readFileSync(descFile, "utf8").trim();
    }

    const commandLines = categoryCommands
        .map((cmd) => `🔶 ${formatCommandText(message, cmd)}`)
        .join("\n");

    const body =
        `📝 Descrição:\n${description}\n\n` +
        `📜 Comandos:\n${commandLines}`;

    return sectionText(`📂 ${categoryRoot(categoria)}`, body);
}

// ===================== AJUDA =====================

async function mostrarAjuda(message) {

    const p = message.prefix;

    return message.reply({
        text:
            `📖 INFO

📄 Comando ou Categoria:
${p}info <nome>

💡 Exemplo:
${p}info menu
${p}info system

📌 Use ${p}menu para ver tudo`
    });
}
