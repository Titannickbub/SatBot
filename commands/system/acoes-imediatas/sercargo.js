const { executeRoleChange } = require("../../../functions/discordRoles");

module.exports = {
    name: "sercargo",
    category: "system/ações imediatas",
    description: `🛡️ Atribui imediatamente um ou mais cargos ao próprio usuário que executou o comando no Discord.

🔐 Exclusivo para o Discord. Disponível apenas para superusuários / donos do bot.

📝 1. Informe os cargos que deseja receber:
{prefix}sercargo @cargo
{prefix}sercargo @Administrador @VIP

O bot adiciona instantaneamente os cargos indicados ao seu perfil no servidor do Discord.`,
    usage: "{prefix}sercargo @cargo1 @cargo2",
    async execute(message) {
        const result = await executeRoleChange(message, { targetSelf: true });
        return message.reply({ text: result.error || result.text });
    }
};
