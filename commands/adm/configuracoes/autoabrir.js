const chatControl = require("../../../functions/chatControl");
const { isOwner } = require("../../../functions/owners");

const DAY_LABELS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
const DESCRIPTION = `🗓️ Programa os horários recorrentes para abrir e fechar este chat.

🔐 Disponível para administradores ou pessoas com permissão para gerenciar o chat. O bot precisa ter permissão para alterar as configurações.

📱 WhatsApp: apenas grupos, não comunidades.
✈️ Telegram: grupos e supergrupos.
🎮 Discord: canais de texto (não threads).

➕ Configure uma programação para dias específicos:
{prefix}autoabrir add semana <horários> <dias>
{prefix}autoabrir add semana 12:00-18:00,06:00-10:00 seg ter qua

➕ Configure outra programação, por exemplo para o fim de semana:
{prefix}autoabrir add fds <horários> <dias>
{prefix}autoabrir add fds 10:00-22:00 sab dom

Cada faixa usa ABERTURA-FECHAMENTO. Uma faixa como 22:00-03:00 abre às 22h e fecha às 03h do dia seguinte. O fechamento continua valendo mesmo que o dia seguinte não esteja na lista; a próxima abertura só ocorre nos dias programados.

⏱️ Cada período aberto e cada intervalo fechado entre mudanças deve durar pelo menos 2 horas. Faixas sobrepostas não são aceitas; programe-as em sequência.

✅ Ative ou pause as programações:
{prefix}autoabrir on
{prefix}autoabrir off

📋 Consulte as configurações:
{prefix}autoabrir status

🗑️ Remova uma programação:
{prefix}autoabrir remove semana
{prefix}autoabrir remove fds

Os comandos {prefix}abrirchat e {prefix}fecharchat fazem alterações manuais ou temporárias; intervalos temporários são independentes desta programação.`;

function getAdapter(message) {
    return (message.platforms || []).find(platform => platform.name === message.platform) ||
        global.platformRegistry?.[message.platform];
}

async function canManage(message) {
    if (message.sender?.isOwner || isOwner(message)) return true;
    const adapter = getAdapter(message);
    if (adapter?.checkUserPermission) {
        return adapter.checkUserPermission(message.chatId, message.userId, "manageChat");
    }
    return Boolean(message.sender?.isAdmin || message.sender?.canManageChats);
}

async function botCanManage(message) {
    const adapter = getAdapter(message);
    return Boolean(adapter?.checkBotPermission &&
        await adapter.checkBotPermission(message.chatId, "manageChat"));
}

function formatProfile(profile) {
    const days = profile.days.map(day => DAY_LABELS[day]).join(", ");
    const times = profile.intervals.map(interval => `${interval.startText}-${interval.endText}`).join(", ");
    return `• ${profile.name}: ${times} (${days})`;
}

module.exports = {
    name: "autoabrir",
    aliases: ["abrefecha"],
    category: "adm/configurações",
    platformSupport: { whatsapp: "full", telegram: "full", discord: "full" },
    description: DESCRIPTION,
    usage: "{prefix}autoabrir <add|remove|on|off|status>",
    examples: [
        "{prefix}autoabrir add semana 12:00-18:00,06:00-11:00 seg ter qua",
        "{prefix}autoabrir add fds 10:00-22:00 sab dom",
        "{prefix}autoabrir on",
        "{prefix}autoabrir status",
        "{prefix}autoabrir remove semana"
    ],

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos ou canais compatíveis." });
        }
        if (message.platform === "whatsapp" && message.isCommunity) {
            return message.reply({ text: "❌ A programação não está disponível em comunidades do WhatsApp." });
        }
        if (!await canManage(message)) {
            return message.reply({ text: "❌ Apenas administradores ou pessoas com permissão para gerenciar o chat podem programar os horários." });
        }

        const args = (message.args || []).map(value => String(value).trim()).filter(Boolean);
        const action = String(args[0] || "status").toLowerCase();
        if (["help", "ajuda"].includes(action)) {
            return message.reply({ text: DESCRIPTION.replaceAll("{prefix}", message.prefix || "!") });
        }

        try {
            if (action === "status" || action === "list" || action === "lista") {
                const config = chatControl.getConfig(message);
                const profiles = config.profiles.length
                    ? config.profiles.map(formatProfile).join("\n")
                    : "Nenhuma programação cadastrada.";
                return message.reply({
                    text: `🗓️ *Autoabrir*\n\nStatus: ${config.enabled ? "✅ Ativo" : "🔕 Desativado"}\n${profiles}`
                });
            }

            if (action === "add" || action === "adicionar") {
                const name = String(args[1] || "").toLowerCase();
                const intervalText = args[2] || "";
                const days = args.slice(3);
                if (!["semana", "fds"].includes(name) || !intervalText || !days.length) {
                    return message.reply({
                        text: `❌ Use: ${message.prefix}autoabrir add semana <horários> <dias> ou ${message.prefix}autoabrir add fds <horários> <dias>.`
                    });
                }
                if (!await botCanManage(message)) {
                    return message.reply({ text: "❌ O bot não tem permissão para alterar as configurações deste chat." });
                }
                await chatControl.assertSupported(message);
                const profile = chatControl.addProfile(message, name, intervalText, days);
                return message.reply({
                    text: `✅ Programação *${name}* salva.\n${formatProfile(profile.profiles.find(item => item.id === name))}\n${profile.enabled ? "A programação está ativa." : "Use " + message.prefix + "autoabrir on para ativar os horários."}`
                });
            }

            if (action === "remove" || action === "del" || action === "remover") {
                const name = String(args[1] || "").toLowerCase();
                if (!name) return message.reply({ text: `❌ Informe a programação: ${message.prefix}autoabrir remove semana|fds.` });
                const config = chatControl.removeProfile(message, name);
                return message.reply({ text: `✅ Programação *${name}* removida.${config.enabled ? " As demais programações continuam ativas." : ""}` });
            }

            if (["on", "ativar", "enable"].includes(action)) {
                if (!await botCanManage(message)) {
                    return message.reply({ text: "❌ O bot não tem permissão para alterar as configurações deste chat." });
                }
                await chatControl.assertSupported(message);
                const config = chatControl.getConfig(message);
                if (!config.profiles.length) {
                    return message.reply({ text: `❌ Cadastre ao menos uma faixa com ${message.prefix}autoabrir add antes de ativar.` });
                }
                chatControl.setAutoEnabled(message, true);
                return message.reply({ text: "✅ Autoabrir ativado. Os horários programados serão aplicados neste chat." });
            }

            if (["off", "desativar", "disable"].includes(action)) {
                chatControl.setAutoEnabled(message, false);
                return message.reply({ text: "🔕 Autoabrir desativado. Os horários recorrentes foram cancelados." });
            }

            return message.reply({ text: DESCRIPTION.replaceAll("{prefix}", message.prefix || "!") });
        } catch (error) {
            console.error("[AUTOABRIR] Falha ao atualizar programação:", error);
            return message.reply({ text: `❌ Não foi possível atualizar a programação: ${error.message}` });
        }
    }
};
