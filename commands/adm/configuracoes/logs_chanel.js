const { PermissionFlagsBits, ChannelType } = require("discord.js");
const { isOwner } = require("../../../functions/owners");
const groupSettings = require("../../../functions/groupSettings");

const HELP = `Define o canal usado para avisos e logs enviados pelo dashboard.

Use o comando no canal desejado:
{prefix}logs_chanel

Ou informe a menção, o ID ou o nome de um canal de texto do servidor:
{prefix}logs_chanel <#canal|id|nome>

Para desativar os logs:
{prefix}logs_chanel off`;

function getHelp(message) {
    return HELP.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "logs_chanel",
    aliases: ["logs_channel"],
    category: "adm/configurações",
    description: HELP,
    usage: "{prefix}logs_chanel [<#canal|id|nome>|off]",
    examples: [
        "{prefix}logs_chanel",
        "{prefix}logs_chanel #logs",
        "{prefix}logs_chanel off"
    ],

    async execute(message) {
        if (message.platform !== "discord" || message.isPrivate) {
            return message.reply({ text: "❌ Este comando está disponível apenas em servidores do Discord." });
        }

        const args = Array.isArray(message.args) ? message.args : [];
        if (["help", "ajuda"].includes(String(args[0] || "").toLowerCase())) {
            return message.reply({ text: getHelp(message) });
        }

        const adapter = (message.platforms || []).find(item => item.name === "discord");
        const canManage = isOwner(message) || (adapter?.checkUserPermission
            ? await adapter.checkUserPermission(String(message.chatId), String(message.userId))
            : Boolean(message.sender?.isAdmin || message.sender?.isOwner));
        if (!canManage) {
            return message.reply({ text: "❌ Apenas administradores do servidor podem configurar o canal de logs." });
        }

        const client = global.discordClient;
        if (!client?.isReady?.()) {
            return message.reply({ text: "❌ O Discord está offline no momento." });
        }

        const guild = message.raw?.guild;
        const guildId = String(guild?.id || "");
        if (!guildId) {
            return message.reply({ text: "❌ Não foi possível identificar este servidor." });
        }

        const requested = args.join(" ").trim();
        const clear = ["off", "desativar", "limpar"].includes(requested.toLowerCase());
        let channelId = "";
        if (!clear) {
            channelId = requested.match(/^<#(\d+)>$/)?.[1] || requested;
            if (!channelId) channelId = String(message.raw?.channel?.id || message.chatId || "");
            if (!/^\d{15,25}$/.test(channelId)) {
                const targetName = requested.replace(/^#/, "").toLocaleLowerCase("pt-BR");
                const match = [...guild.channels.cache.values()].find(candidate =>
                    candidate.name?.toLocaleLowerCase("pt-BR") === targetName &&
                    [ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(candidate.type)
                );
                channelId = match?.id || "";
            }
            if (!channelId) return message.reply({ text: `❌ Informe um canal válido do servidor.\n\n${getHelp(message)}` });
        }

        try {
            const channel = clear ? null : await guild.channels.fetch(channelId);
            if (!clear && (!channel || ![ChannelType.GuildText, ChannelType.GuildAnnouncement].includes(channel.type))) {
                return message.reply({ text: "❌ Escolha um canal de texto ou anúncios deste servidor, não um tópico." });
            }

            if (!clear) {
                const botMember = guild.members.me || await guild.members.fetch(String(client.user.id));
                const permissions = channel.permissionsFor(botMember);
                if (!permissions?.has(PermissionFlagsBits.ViewChannel) || !permissions?.has(PermissionFlagsBits.SendMessages)) {
                    return message.reply({ text: "❌ O bot precisa das permissões Ver canal e Enviar mensagens no canal selecionado." });
                }
            }

            const data = groupSettings.loadSettings("discord", guildId, "server");
            data.settings = data.settings || {};
            if (clear) delete data.settings.logsChannelId;
            else data.settings.logsChannelId = String(channel.id);
            if (!groupSettings.saveSettings("discord", guildId, "server", data, {
                raw: { guild: { id: guildId, name: guild.name || guildId } }
            })) {
                throw new Error("Não foi possível salvar as configurações do canal de logs.");
            }

            return message.reply({
                text: clear
                    ? "✅ Canal de logs desativado."
                    : `✅ Canal de logs definido para <#${channel.id}>.`
            });
        } catch (error) {
            console.error("[LOGS_CHANNEL] Falha ao configurar o canal de logs:", error.message || error);
            return message.reply({ text: "❌ Não foi possível configurar o canal de logs agora." });
        }
    }
};
