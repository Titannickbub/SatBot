const { executeRoleChange } = require("../../../functions/discordRoles");

module.exports = {
    name: "delcargo",
    category: "system/ações imediatas",
    description: `🛡️ Remove imediatamente um ou mais cargos do próprio usuário que executou o comando no Discord.

🔐 Exclusivo para o Discord. Disponível apenas para superusuários / donos do bot.

📝 1. Informe os cargos que deseja remover de você:
{prefix}delcargo @cargo
{prefix}delcargo @Membro @VIP

O bot remove instantaneamente os cargos indicados do seu perfil no servidor do Discord.`,
    usage: "{prefix}delcargo @cargo1 @cargo2",
    async execute(message) {
        const result = await executeRoleChange(message, { targetSelf: true, remove: true });
        return message.reply({ text: result.error || result.text });
    }
};
