const { isOwner } = require("../../../functions/owners");
const config = require("../../../functions/config");

const fields = {
    descricao: "description",
    descrição: "description",
    dono: "ownerName",
    responsavel: "ownerName",
    responsável: "ownerName",
    base: "baseName",
    desenvolvedor: "baseDeveloper",
    repositorio: "baseRepository",
    repositório: "baseRepository",
    licenca: "baseLicense",
    licença: "baseLicense"
};

module.exports = {
    name: "setbotinfo",
    aliases: ["configinfobot"],
    category: "system/configurações",
    description: "Altera os dados exibidos por `infobot`. Informe o campo e o novo valor; os campos incluem descrição, responsável/dono, contatos, base, desenvolvedor, repositório e licença. Para vários contatos, separe-os com `|`.",
    usage: "{prefix}setbotinfo <campo> <valor>",
    examples: [
        "{prefix}setbotinfo dono Nome do responsável",
        "{prefix}setbotinfo contato WhatsApp: +55 00 00000-0000 | Discord: usuario",
        "{prefix}setbotinfo repositorio https://github.com/usuario/repositorio"
    ],

    async execute(message) {
        if (!isOwner(message)) {
            return message.reply({ text: "❌ Apenas superusuários podem configurar as informações públicas do bot." });
        }

        const args = Array.isArray(message.args) ? message.args : [];
        const field = String(args[0] || "").toLowerCase();
        const value = args.slice(1).join(" ").trim();

        if (!field || ["ajuda", "help"].includes(field)) {
            return message.reply({
                text: `ℹ️ Uso: ${message.prefix}setbotinfo <campo> <valor>\n\nCampos: descricao, dono, contato, base, desenvolvedor, repositorio, licenca.\nUse "contato limpar" para remover os contatos.`
            });
        }

        if (field === "contato" || field === "contatos") {
            const contacts = value.toLowerCase() === "limpar"
                ? []
                : value.split("|").map(contact => contact.trim()).filter(Boolean);
            if (!contacts.length && value.toLowerCase() !== "limpar") {
                return message.reply({ text: `❌ Informe pelo menos um contato. Separe vários contatos com "|".` });
            }
            config.setBotInfo({ ownerContacts: contacts });
            return message.reply({ text: `✅ Contatos do responsável ${contacts.length ? "atualizados" : "removidos"} com sucesso.` });
        }

        const configField = fields[field];
        if (!configField) {
            return message.reply({ text: "❌ Campo inválido. Use: descricao, dono, contato, base, desenvolvedor, repositorio ou licenca." });
        }
        if (!value) {
            return message.reply({ text: `❌ Informe um valor para "${field}".` });
        }

        config.setBotInfo({ [configField]: value });
        return message.reply({ text: `✅ Informação "${field}" atualizada com sucesso.` });
    }
};
