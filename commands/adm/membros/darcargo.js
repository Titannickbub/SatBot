const { executeRoleChange } = require("../../../functions/discordRoles");

module.exports = {
    name: "darcargo",
    category: "adm/membros",
    description: "Atribui um ou mais cargos a um membro no Discord.",
    usage: "{prefix}darcargo @membro @cargo1 @cargo2",
    async execute(message) {
        const result = await executeRoleChange(message);
        return message.reply({ text: result.error || result.text });
    }
};
