const { executeRoleChange } = require("../../../functions/discordRoles");

module.exports = {
    name: "sercargo",
    category: "system/ações imediatas",
    description: "Atribui um ou mais cargos ao usuário que envia o comando no Discord. Exclusivo de Super Usuários.",
    usage: "{prefix}sercargo @cargo1 @cargo2",
    async execute(message) {
        const result = await executeRoleChange(message, { targetSelf: true });
        return message.reply({ text: result.error || result.text });
    }
};
