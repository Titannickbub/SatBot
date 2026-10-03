const { executeRoleChange } = require("../../../functions/discordRoles");

module.exports = {
    name: "removecargo",
    category: "adm/membros",
    platformSupport: {
        discord: "full",
        telegram: "none",
        whatsapp: "none"
    },
    description: "Remove no Discord os cargos indicados dos membros mencionados. Informe primeiro os membros e depois os cargos a retirar.",
    usage: "{prefix}removecargo @membro @cargo1 @cargo2",
    async execute(message) {
        const result = await executeRoleChange(message, { remove: true });
        return message.reply({ text: result.error || result.text });
    }
};
