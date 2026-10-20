const { executeRoleChange } = require("../../../functions/discordRoles");

module.exports = {
    name: "darcargo",
    category: "adm/membros",
    platformSupport: {
        discord: "full",
        telegram: "none",
        whatsapp: "none"
    },
    description: `🎭 Atribui um ou mais cargos a um membro do servidor Discord.

👤 Você precisa da permissão Gerenciar Cargos ou Administrador.
🤖 O bot também precisa da permissão Gerenciar Cargos.
📊 Os cargos atribuídos devem estar abaixo do maior cargo do bot. Você só pode alterar membros abaixo do seu maior cargo.

📌 Uso:
{prefix}darcargo @membro @cargo1 [@cargo2...]

💡 Exemplo:
{prefix}darcargo @membro @MembroVerificado @Jogador

Mencione primeiro o membro e depois um ou mais cargos a conceder. Cargos gerenciados e @everyone não podem ser atribuídos.`,
    usage: "{prefix}darcargo @membro @cargo1 @cargo2",
    examples: [
        "{prefix}darcargo @membro @MembroVerificado",
        "{prefix}darcargo @membro @MembroVerificado @Jogador"
    ],
    async execute(message) {
        const result = await executeRoleChange(message);
        return message.reply({ text: result.error || result.text });
    }
};
