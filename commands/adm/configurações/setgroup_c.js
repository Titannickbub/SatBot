const { setWhatsAppCommunityAnnouncementGroup } = require("../../../functions/groupSettings");
const { isOwner } = require("../../../functions/owners");

const DESCRIPTION = `📣 Define este grupo do WhatsApp como canal de avisos da comunidade vinculada.

🔐 Disponível para administradores do grupo e superusuários.
📱 Este comando funciona apenas no WhatsApp e em grupos vinculados a uma comunidade.

1. Execute o comando no grupo que será usado para os avisos:
{prefix}setgroup_c

O bot identifica a comunidade vinculada e salva este grupo como canal de avisos. O grupo precisa estar associado a uma comunidade.

2. Opcionalmente, informe um nome de referência para a comunidade:
{prefix}setgroup_c <nome>
{prefix}setgroup_c Minha Comunidade

Sem um nome informado, será usado o nome atual do grupo (ou “Comunidade”, se não estiver disponível). O nome salvo é uma referência nas configurações e não altera o nome real do grupo.

❔ Exiba esta ajuda:
{prefix}setgroup_c help`;

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "setgroup_c",
    aliases: ["setcommunitygroup", "setgroupcommunity", "setgrupo_comunidade"],
    category: "adm/configurações",
    platformSupport: {
        whatsapp: "full",
        telegram: "none",
        discord: "none"
    },
    description: DESCRIPTION,
    usage: "{prefix}setgroup_c [nome|help]",
    examples: [
        "{prefix}setgroup_c",
        "{prefix}setgroup_c Minha Comunidade",
        "{prefix}setgroup_c help"
    ],

    async execute(message) {
        if (message.platform !== "whatsapp") {
            return message.reply({ text: "❌ Este comando é exclusivo para o WhatsApp." });
        }

        if (!message.chatId?.endsWith("@g.us")) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos do WhatsApp." });
        }

        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = isOwner(message) || (adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : (message.sender?.isAdmin || message.sender?.isOwner));

        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores podem usar este comando." });
        }

        const args = message.args || [];
        if (["help", "ajuda"].includes(String(args[0] || "").toLowerCase())) {
            return message.reply({ text: helpText(message) });
        }
        const providedName = args.join(" ").trim();

        if (!global.whatsappSock || typeof global.whatsappSock.groupMetadata !== "function") {
            return message.reply({ text: "❌ O suporte ao WhatsApp não está disponível no momento." });
        }

        let metadata = null;
        try {
            metadata = await global.whatsappSock.groupMetadata(message.chatId);
        } catch (err) {
            console.error("[setgroup_c] Falha ao buscar metadados do grupo:", err);
        }

        const chatName = metadata?.subject || message.raw?.chat?.title || message.raw?.groupName || null;
        const communityName = providedName || chatName || "Comunidade";
        const effectiveCommunityId = metadata?.linkedParent || null;

        if (!effectiveCommunityId) {
            return message.reply({ text: "❌ Não foi possível identificar a comunidade vinculada a este grupo no momento." });
        }

        const ok = setWhatsAppCommunityAnnouncementGroup(
            String(message.chatId),
            String(effectiveCommunityId),
            String(message.chatId),
            communityName
        );

        if (!ok) {
            return message.reply({ text: "❌ Falha ao salvar a configuração do grupo de avisos da comunidade." });
        }

        return message.reply({ text: `✅ Grupo marcado como canal de avisos da comunidade.\nNome salvo: ${communityName}` });
    }
};
