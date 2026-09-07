const { setWhatsAppCommunityAnnouncementGroup } = require("../../../functions/groupSettings");

module.exports = {
    name: "setgroup_c",
    aliases: ["setcommunitygroup", "setgroupcommunity", "setgrupo_comunidade"],
    category: "adm/configurações",
    platformSupport: {
        whatsapp: "full",
        telegram: "none",
        discord: "none"
    },
    description: "Marca este grupo do WhatsApp como canal de avisos da comunidade e salva o nome de referência no JSON sem alterar o nome real do chat.",
    usage: "{prefix}setgroup_c",
    examples: [
        "{prefix}setgroup_c"
    ],

    async execute(message) {
        if (message.platform !== "whatsapp") {
            return message.reply({ text: "❌ Este comando é exclusivo para o WhatsApp." });
        }

        if (!message.chatId?.endsWith("@g.us")) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos do WhatsApp." });
        }

        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : (message.sender?.isAdmin || message.sender?.isOwner);

        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores podem usar este comando." });
        }

        const args = message.args || [];
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
