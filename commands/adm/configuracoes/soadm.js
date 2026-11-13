const soAdmHelper = require("../../../functions/soAdmHelper");
const { isOwner } = require("../../../functions/owners");

const DESCRIPTION = `🔒 Ativa ou desativa o modo somente administradores neste grupo ou servidor.

🔐 Disponível para administradores e pessoas com permissão para gerenciar mensagens.

Ativar: {prefix}soadm on
Desativar: {prefix}soadm off`;

module.exports = {
    name: "soadm",
    aliases: ["somenteadm", "somenteadmins"],
    category: "adm/configuracoes",
    description: DESCRIPTION,
    usage: "{prefix}soadm on|off",

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos ou servidores." });
        }
        if (!message.sender?.isAdmin &&
            !message.sender?.canManageMessages &&
            !message.sender?.isOwner &&
            !isOwner(message)) {
            return message.reply({ text: "❌ Apenas administradores ou pessoas com permissão para gerenciar mensagens podem usar este comando." });
        }

        const action = String(message.args?.[0] || "").trim().toLowerCase();
        if (["help", "ajuda"].includes(action)) {
            return message.reply({ text: DESCRIPTION.replaceAll("{prefix}", message.prefix || "!") });
        }
        if (!["on", "off"].includes(action)) {
            return message.reply({ text: `❌ Uso: ${message.prefix || "!"}soadm on|off` });
        }

        try {
            const enabled = action === "on";
            soAdmHelper.setEnabled(message, enabled);
            return message.reply({
                text: enabled
                    ? "✅ Modo somente administradores ativado. Membros comuns não receberão respostas nem respostas automáticas do bot neste grupo/servidor."
                    : "✅ Modo somente administradores desativado."
            });
        } catch (error) {
            console.error("[SOADM] Falha ao alterar a configuração:", error);
            return message.reply({ text: `❌ Não foi possível atualizar o modo somente administradores: ${error.message}` });
        }
    }
};
