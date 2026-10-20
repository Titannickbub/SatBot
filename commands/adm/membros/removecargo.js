const { executeRoleChange } = require("../../../functions/discordRoles");

module.exports = {
    name: "removecargo",
    category: "adm/membros",
    platformSupport: {
        discord: "full",
        telegram: "none",
        whatsapp: "none"
    },
    description: `🎭 Remove um ou mais cargos de um membro do servidor Discord.

👤 Você precisa da permissão Gerenciar Cargos ou Administrador.
🤖 O bot também precisa da permissão Gerenciar Cargos.
📊 Os cargos removidos devem estar abaixo do maior cargo do bot. Você só pode alterar membros abaixo do seu maior cargo.

📌 Uso:
{prefix}removecargo @membro @cargo1 [@cargo2...]

💡 Exemplo:
{prefix}removecargo @membro @Jogador

Mencione primeiro o membro e depois um ou mais cargos a remover. Cargos gerenciados e @everyone não podem ser alterados.`,
    usage: "{prefix}removecargo @membro @cargo1 @cargo2",
    examples: [
        "{prefix}removecargo @membro @Jogador",
        "{prefix}removecargo @membro @Jogador @MembroVerificado"
    ],
    async execute(message) {
        const result = await executeRoleChange(message, { remove: true });
        return message.reply({ text: result.error || result.text });
    }
};
