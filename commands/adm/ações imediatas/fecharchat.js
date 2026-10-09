const { executeStateCommand } = require("../../../functions/chatControlCommand");

const DESCRIPTION = `🔒 Fecha o chat para que somente administradores possam enviar mensagens.

🔐 Disponível para administradores ou pessoas com permissão para gerenciar o chat. O bot também precisa ter permissão para alterar as configurações.

📱 WhatsApp: apenas grupos, não comunidades.
✈️ Telegram: grupos e supergrupos.
🎮 Discord: canais de texto (não threads).

✅ Fechar sem prazo:
{prefix}fecharchat

⏱️ Fechar temporariamente e abrir depois:
{prefix}fecharchat <duração>
{prefix}fecharchat 2h
{prefix}fecharchat 12:00

Use durações como 1m, 2h, 2h30m ou 1d. Para horário, use HH:MM; se o horário já passou, será considerado para o próximo dia. O prazo precisa estar a pelo menos 1 minuto de distância.

📌 Horários recorrentes são configurados com {prefix}autoabrir.`;

module.exports = {
    name: "fecharchat",
    aliases: ["fechagp", "fechargrupo", "fechar_gp", "fechar_grupo", "fechat"],
    category: "adm/ações imediatas",
    platformSupport: { whatsapp: "full", telegram: "full", discord: "full" },
    description: DESCRIPTION,
    usage: "{prefix}fecharchat [duração|HH:MM]",
    examples: [
        "{prefix}fecharchat",
        "{prefix}fecharchat 2h",
        "{prefix}fecharchat 12:00"
    ],

    async execute(message) {
        return executeStateCommand(message, false, DESCRIPTION);
    }
};
