const { executeStateCommand } = require("../../../functions/chatControlCommand");

const DESCRIPTION = `🔓 Abre o chat para que os membros possam enviar mensagens.

🔐 Disponível para administradores ou pessoas com permissão para gerenciar o chat. O bot também precisa ter permissão para alterar as configurações.

📱 WhatsApp: apenas grupos, não comunidades.
✈️ Telegram: grupos e supergrupos.
🎮 Discord: canais de texto (não threads).

✅ Abrir sem prazo:
{prefix}abrirchat

⏱️ Abrir temporariamente e fechar depois:
{prefix}abrirchat <duração>
{prefix}abrirchat 2h
{prefix}abrirchat 12:00

Use durações como 1m, 2h, 2h30m ou 1d. Para horário, use HH:MM; se o horário já passou, será considerado para o próximo dia. O prazo precisa estar a pelo menos 1 minuto de distância.

📌 Horários recorrentes são configurados com {prefix}autoabrir.`;

module.exports = {
    name: "abrirchat",
    aliases: ["abrirgp", "abrirgrupo", "abrir_gp", "abrir_grupo"],
    category: "adm/ações imediatas",
    platformSupport: { whatsapp: "full", telegram: "full", discord: "full" },
    description: DESCRIPTION,
    usage: "{prefix}abrirchat [duração|HH:MM]",
    examples: [
        "{prefix}abrirchat",
        "{prefix}abrirchat 2h",
        "{prefix}abrirchat 12:00"
    ],

    async execute(message) {
        return executeStateCommand(message, true, DESCRIPTION);
    }
};
