const { executeRoleChange } = require("../../../functions/discordRoles");

module.exports = {
    name: "delcargo",
    category: "system/ações imediatas",
    description: "Remove um ou mais cargos do usuário que envia o comando no Discord. Exclusivo de Super Usuários.",
    usage: "{prefix}delcargo @cargo1 @cargo2",
    async execute(message) {
        const result = await executeRoleChange(message, { targetSelf: true, remove: true });
        return message.reply({ text: result.error || result.text });
    }
};
