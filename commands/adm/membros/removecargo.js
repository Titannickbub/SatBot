const { executeRoleChange } = require("../../../functions/discordRoles");

module.exports = {
    name: "removecargo",
    category: "adm/membros",
    description: "Remove um ou mais cargos de um membro no Discord.",
    usage: "{prefix}removecargo @membro @cargo1 @cargo2",
    async execute(message) {
        const result = await executeRoleChange(message, { remove: true });
        return message.reply({ text: result.error || result.text });
    }
};
