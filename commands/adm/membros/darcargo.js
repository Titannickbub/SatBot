const { executeRoleChange } = require("../../../functions/discordRoles");

module.exports = {
    name: "darcargo",
    category: "adm/membros",
    platformSupport: {
        discord: "full",
        telegram: "none",
        whatsapp: "none"
    },
    description: "Atribui no Discord um ou mais cargos aos membros mencionados. Inclua primeiro as menções dos membros e depois as menções dos cargos que deseja conceder.",
    usage: "{prefix}darcargo @membro @cargo1 @cargo2",
    async execute(message) {
        const result = await executeRoleChange(message);
        return message.reply({ text: result.error || result.text });
    }
};
