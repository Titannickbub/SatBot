const { executeTelegramPromotion } = require("../../../functions/telegramAdminHelper");

module.exports = {
    name: "tpromote",
    category: "adm/membros",
    platformSupport: {
        whatsapp: "none",
        telegram: "full",
        discord: "none"
    },
    description: `⬆️ Promove um membro do grupo ou supergrupo do Telegram a administrador com um nível de acesso.

👤 Você precisa ser administrador com permissão para promover membros.
🤖 O bot precisa ser administrador com permissão para adicionar administradores.

📌 Informe o nível e o ID do membro:
{prefix}tpromote <staff|mod|gerente|adm> <ID>

Ou responda à mensagem do membro:
{prefix}tpromote <staff|mod|gerente|adm>

🏷️ Níveis:
• staff — apagar mensagens e restringir/mutar membros.
• mod — permissões de staff, convites, alteração de informações e gerenciamento de chats de vídeo.
• gerente — permissões administrativas gerais, sem poder promover administradores nem usar modo anônimo.
• adm — pode promover administradores; modo anônimo não é habilitado.

💡 Exemplos:
{prefix}tpromote staff 123456789
{prefix}tpromote mod 123456789
{prefix}tpromote gerente 123456789
{prefix}tpromote adm 123456789

O criador do grupo não pode ser alterado. Para rebaixar alguém para membro, use {prefix}trebaixar.`,
    usage: "{prefix}tpromote <staff|mod|gerente|adm> <ID> ou responda à mensagem",
    examples: [
        "{prefix}tpromote staff 123456789",
        "{prefix}tpromote mod 123456789",
        "{prefix}tpromote gerente 123456789",
        "{prefix}tpromote adm 123456789",
        "Responda à mensagem do usuário com {prefix}tpromote staff"
    ],
    info(message) {
        const prefix = message.prefix;
        return [
            `📄 ${prefix}tpromote`,
            "",
            "Promove um membro do Telegram com um nível administrativo.",
            "",
            "Sintaxe:",
            `${prefix}tpromote <staff|mod|gerente|adm> <ID>`,
            `ou responda à mensagem com ${prefix}tpromote <nível>.`,
            "",
            "Níveis: staff, mod, gerente e adm.",
            `Para rebaixar para membro: ${prefix}trebaixar <ID> ou responda à mensagem.`
        ].join("\n");
    },
    getHelp(message) {
        const prefix = message.prefix;
        return [
            "📄 tpromote — Administração de membros no Telegram",
            "",
            "Promove um membro para um nível administrativo específico.",
            "O usuário pode ser informado pelo ID numérico ou por resposta",
            "direta à mensagem dele.",
            "",
            "🧭 Sintaxe:",
            `${prefix}tpromote <nível> <ID>`,
            `${prefix}tpromote <nível> (respondendo à mensagem)`,
            "",
            "🏷️ Níveis disponíveis:",
            "• staff — gerencia mensagens e restringe/muta membros.",
            "• mod — staff + banimento, links de convite, alteração de",
            "  informações/tags e gerenciamento de chats de vídeo.",
            "• gerente — permissões gerais, sem adicionar administradores",
            "  e sem modo anônimo.",
            "• adm — todas as permissões, exceto modo anônimo.",
            "",
            "🔐 Requisitos:",
            "• uso em grupo ou supergrupo do Telegram;",
            "• executor administrador com permissão para promover;",
            "• bot administrador com permissão para adicionar administradores.",
            "",
            "↩️ Para remover todas as permissões e voltar a membro:",
            `${prefix}trebaixar <ID>`,
            `ou responda à mensagem com ${prefix}trebaixar.`
        ].join("\n");
    },
    async execute(message) {
        if (!message.args?.length) {
            return message.reply({ text: this.getHelp(message) });
        }
        const result = await executeTelegramPromotion(message);
        return message.reply({ text: result.text });
    }
};
