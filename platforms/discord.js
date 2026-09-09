const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "..", "settings", ".env")
});

const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    ActivityType
} = require("discord.js");
const groupSettings = require("../functions/groupSettings");
const welcomeHelper = require("../functions/welcomeHelper");
const authFlow = require("../functions/authFlow");

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (secs || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(" ");
}

function extractDiscordMedia(discordMsg) {
    if (!discordMsg) return null;
    const { fetchBuffer } = require("../functions/api");

    // 1. Sticker
    const sticker = discordMsg.stickers?.first?.();
    if (sticker) {
        return {
            url: sticker.url,
            fileName: `${sticker.name || "sticker"}.png`,
            mimeType: "image/png",
            type: "sticker",
            getBuffer: async () => fetchBuffer(sticker.url)
        };
    }

    // 2. Anexo direto (Attachment)
    const attachment = discordMsg.attachments?.first?.();
    if (attachment) {
        const ct = (attachment.contentType || "").toLowerCase();
        const fn = (attachment.name || "").toLowerCase();
        let type = "document";
        if (ct.startsWith("image/") || /\.(jpeg|jpg|png|webp|gif)$/i.test(fn)) {
            type = "image";
        } else if (ct.startsWith("video/") || /\.(mp4|mkv|avi|mov|webm)$/i.test(fn)) {
            type = "video";
        } else if (ct.startsWith("audio/") || /\.(mp3|ogg|opus|wav|m4a|aac|flac)$/i.test(fn)) {
            type = "audio";
        }
        return {
            url: attachment.url,
            fileName: attachment.name,
            mimeType: attachment.contentType || (type === "image" ? (fn.endsWith(".gif") ? "image/gif" : "image/png") : ""),
            type,
            getBuffer: async () => fetchBuffer(attachment.url)
        };
    }

    // 3. Embeds (Tenor, Giphy, imagens/vídeos inseridos via link/embed)
    if (Array.isArray(discordMsg.embeds) && discordMsg.embeds.length > 0) {
        for (const embed of discordMsg.embeds) {
            const mediaUrl = embed.video?.url || embed.video?.proxyURL ||
                embed.image?.url || embed.image?.proxyURL ||
                embed.thumbnail?.url || embed.thumbnail?.proxyURL ||
                (embed.url && /\.(gif|png|jpe?g|webp|mp4)$/i.test(embed.url) ? embed.url : null);

            if (mediaUrl) {
                const lower = mediaUrl.toLowerCase().split(/[?#]/)[0];
                const isGif = lower.endsWith(".gif") ||
                    (embed.provider?.name && /tenor|giphy/i.test(embed.provider.name)) ||
                    /tenor|giphy/i.test(mediaUrl);
                const isVideo = !isGif && (!!embed.video || /\.(mp4|webm|mov)$/i.test(lower));
                const type = isVideo ? "video" : "image";
                const mimeType = isGif ? "image/gif" : (isVideo ? "video/mp4" : "image/png");
                const ext = isGif ? ".gif" : (isVideo ? ".mp4" : ".png");
                const rawName = path.basename(lower) || `media${ext}`;
                const fileName = rawName.includes(".") ? rawName : `${rawName}${ext}`;

                return {
                    url: mediaUrl,
                    fileName,
                    mimeType,
                    type,
                    getBuffer: async () => fetchBuffer(mediaUrl)
                };
            }
        }
    }

    // 4. URL de mídia presente no texto
    if (discordMsg.content && typeof discordMsg.content === "string") {
        const urlMatch = discordMsg.content.match(/https?:\/\/[^\s]+/i);
        if (urlMatch) {
            const foundUrl = urlMatch[0];
            const lower = foundUrl.toLowerCase().split(/[?#]/)[0];
            if (/\.(gif|png|jpe?g|webp|mp4|webm|mov)$/i.test(lower) || lower.includes("tenor.com") || lower.includes("giphy.com")) {
                const isGif = lower.endsWith(".gif") || lower.includes("tenor.com") || lower.includes("giphy.com");
                const isVideo = !isGif && /\.(mp4|webm|mov)$/i.test(lower);
                const type = isVideo ? "video" : "image";
                const mimeType = isGif ? "image/gif" : (isVideo ? "video/mp4" : "image/png");
                const ext = isGif ? ".gif" : (isVideo ? ".mp4" : ".png");
                const rawName = path.basename(lower) || `media${ext}`;
                const fileName = rawName.includes(".") ? rawName : `${rawName}${ext}`;

                return {
                    url: foundUrl,
                    fileName,
                    mimeType,
                    type,
                    getBuffer: async () => fetchBuffer(foundUrl)
                };
            }
        }
    }

    return null;
}

async function start(onMessage) {
    require("dotenv").config({ path: path.join(__dirname, "..", "settings", ".env"), override: true });

    const token = authFlow.getEnvValue("DISCORD_TOKEN");

    if (!token) {

        console.log(
            "🔑[DISCORD] Token não configurado."
        );

        return;
    }

    const client = new Client({

        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.DirectMessageReactions,
            GatewayIntentBits.MessageContent
        ],

        partials: [
            Partials.Channel,
            Partials.Message,
            Partials.User,
            Partials.Reaction
        ]

    });

    global.discordClient =
        client;

    const updateDiscordPresence = () => {
        if (!client.user) return;
        const uptime = formatUptime(process.uptime());
        try {
            client.user.setPresence({
                activities: [{
                    name: `Uptime: ${uptime}`,
                    type: ActivityType.Playing
                }],
                status: "online"
            });
        } catch (err) {
            console.error("❌[DISCORD] Falha ao atualizar presença:", err);
        }
    };

    async function registerSlashCommands(cli) {
        try {
            const slashCommandsArray = [
                {
                    name: "start",
                    description: "Apresentação da Satela e primeiros passos."
                }
            ];

            if (cli.application) {
                await cli.application.commands.set(slashCommandsArray);
                console.log(`🟩[DISCORD] Slash command /start registrado com sucesso!`);
            }
        } catch (err) {
            console.error("❌[DISCORD] Erro ao registrar slash command /start:", err);
        }
    }

    client.once("clientReady", async () => {
        console.log(
            `🟩[DISCORD] Conectado como ${client.user.tag}`
        );
        if (global.__pendingAuthBootstrapPlatform === "discord") {
            global.__pendingAuthBootstrapPlatform = null;
            setTimeout(() => process.exit(0), 1000);
        }
        updateDiscordPresence();
        setInterval(updateDiscordPresence, 60_000);
        await registerSlashCommands(client);
        // Sincroniza todas as guildas ativas na inicialização
        client.guilds.cache.forEach(guild => {
            syncGuild(guild);
        });
    });

    const syncedGuilds = new Set();

    function syncGuild(guild) {
        if (!guild) return;
        try {
            const activeChannels = guild.channels.cache.map(c => {
                let type = "chat";
                if (c.type === ChannelType.GuildCategory) {
                    type = "category";
                } else if (c.isThread && c.isThread()) {
                    type = "thread";
                }
                return {
                    id: String(c.id),
                    name: c.name,
                    type: type,
                    parentId: c.parentId ? String(c.parentId) : null
                };
            });
            groupSettings.syncDiscordHierarchy(String(guild.id), activeChannels);
        } catch (err) {
            console.error("❌[DISCORD_SYNC] Erro ao sincronizar hierarquia da guilda:", err);
        }
    }

    client.on("channelCreate", (channel) => {
        if (channel.guild) syncGuild(channel.guild);
    });
    client.on("channelUpdate", (oldChannel, newChannel) => {
        if (newChannel.guild) syncGuild(newChannel.guild);
    });
    client.on("channelDelete", (channel) => {
        if (channel.guild) syncGuild(channel.guild);
    });
    client.on("threadCreate", (thread) => {
        if (thread.guild) syncGuild(thread.guild);
    });
    client.on("threadUpdate", (oldThread, newThread) => {
        if (newThread.guild) syncGuild(newThread.guild);
    });
    client.on("threadDelete", (thread) => {
        if (thread.guild) syncGuild(thread.guild);
    });
    client.on("guildDelete", (guild) => {
        try {
            groupSettings.deleteSettingsFile("discord", String(guild.id), "server");
        } catch (err) {
            console.error("❌[DISCORD] Erro ao deletar config da guilda:", err);
        }
    });

    client.on("guildMemberAdd", async (member) => {
        try {
            await welcomeHelper.handleDiscordMemberJoin(member);
        } catch (err) {
            console.error("❌[DISCORD] Erro ao processar guildMemberAdd para welcome:", err);
        }
    });

    client.on("guildMemberRemove", async (member) => {
        try {
            await welcomeHelper.handleDiscordMemberLeave(member);
        } catch (err) {
            console.error("❌[DISCORD] Erro ao processar guildMemberRemove para goodbye:", err);
        }
    });

    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        try {
            await interaction.deferReply().catch(() => {});
        } catch (err) {
            console.error("❌[DISCORD] Erro ao deferir interação:", err);
        }

        const isPrivate = !interaction.guild;

        if (interaction.guild && !syncedGuilds.has(interaction.guild.id)) {
            syncGuild(interaction.guild);
            syncedGuilds.add(interaction.guild.id);
        }

        const isAdmin = isPrivate ? true : (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) || false);
        const canManageMessages = isPrivate ? true : (interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages) || false);

        const config = require("../functions/config").getConfig();
        const prefix = config.prefix || "!";

        const commandName = interaction.commandName;
        const optionsData = interaction.options?.data || [];
        const args = optionsData.map(opt => String(opt.value)).filter(Boolean);
        const commandText = `${prefix}${commandName}${args.length ? " " + args.join(" ") : ""}`;

        let repliedToInteraction = false;

        const message = {
            platform: "discord",
            chatId: String(interaction.channelId),
            threadId: interaction.channel?.isThread?.() ? String(interaction.channelId) : null,
            target: {
                chatId: String(interaction.channelId),
                threadId: interaction.channel?.isThread?.() ? String(interaction.channelId) : null
            },
            userId: String(interaction.user.id),
            username: interaction.user.username,
            displayName: (interaction.member && (interaction.member.displayName || interaction.member.nickname)) || interaction.user.username,
            text: commandText,
            raw: interaction,
            messageId: String(interaction.id),
            createdAt: interaction.createdTimestamp,
            apiPing: client.ws.ping,
            chatType: interaction.guild ? "group" : "private",
            isPrivate,
            botId: String(client.user.id),
            botUsername: client.user.username,
            mentionedJids: [],
            mentionedChannelIds: [],
            sender: {
                isAdmin,
                canManageMessages
            },
            quoted: null,
            delete: async function () {
                try {
                    await interaction.deleteReply();
                    return true;
                } catch (err) {
                    console.error("❌[DISCORD] Falha ao deletar resposta de interação:", err);
                    return false;
                }
            },
            media: null,
            reply: async function (data) {
                try {
                    if (data?.embed) {
                        const embed = new EmbedBuilder(data.embed);
                        if (!repliedToInteraction) {
                            repliedToInteraction = true;
                            if (interaction.deferred || interaction.replied) {
                                return await interaction.editReply({ embeds: [embed] });
                            }
                            return await interaction.reply({ embeds: [embed] });
                        }
                        if (interaction.deferred || interaction.replied) {
                            return await interaction.followUp({ embeds: [embed] });
                        }
                        return await interaction.channel.send({ embeds: [embed] });
                    }
                    if (typeof data === "object" && data !== null && (data.image || data.photo || data.file || data.url || data.media?.buffer || data.media?.url)) {
                        const image = data.image || data.photo || data.file || data.url || data.media?.buffer || data.media?.url;
                        return await this.replyImg({ image, caption: data.caption || data.text || "" });
                    }

                    let text = "";
                    if (typeof data === "string") {
                        text = data;
                    } else if (data && data.text) {
                        text = data.text;
                    }

                    if (!text) return null;

                    const MAX_LEN = 2000;
                    const chunks = [];
                    let remaining = text;
                    while (remaining.length > 0) {
                        if (remaining.length <= MAX_LEN) {
                            chunks.push(remaining);
                            break;
                        }
                        let cutIndex = remaining.lastIndexOf("\n", MAX_LEN);
                        if (cutIndex <= 0) cutIndex = MAX_LEN;
                        chunks.push(remaining.substring(0, cutIndex));
                        remaining = remaining.substring(cutIndex).replace(/^\n/, "");
                    }

                    for (let i = 0; i < chunks.length; i++) {
                        const chunk = chunks[i];
                        if (!repliedToInteraction) {
                            repliedToInteraction = true;
                            if (interaction.deferred || interaction.replied) {
                                await interaction.editReply({ content: chunk });
                            } else {
                                await interaction.reply({ content: chunk });
                            }
                        } else {
                            if (interaction.deferred || interaction.replied) {
                                await interaction.followUp({ content: chunk });
                            } else {
                                await interaction.channel.send(chunk);
                            }
                        }
                    }
                } catch (err) {
                    const reason = err && err.message ? err.message : String(err);
                    console.warn(`[DISCORD] ⚠️ Falha ao responder interação: ${reason}`);
                    return null;
                }
            },
            react: async function (emoji) {
                try {
                    const replyMsg = await interaction.fetchReply();
                    if (replyMsg) await replyMsg.react(emoji);
                } catch (err) {
                    console.error("❌[DISCORD] Falha ao reagir em resposta de interação:", err);
                }
            },
            replyImg: async function (data) {
                const caption = data.caption || data.text || "";
                const image = data.url || data.image || data.file;
                if (!image) throw new Error("❌[DISCORD] replyImg precisa de url, image ou file.");

                let payload = {};
                if (Buffer.isBuffer(image)) {
                    payload = { content: caption, files: [{ attachment: image, name: data.fileName || data.name || "image.png" }] };
                } else if (typeof image === "string" && /^https?:\/\//i.test(image)) {
                    payload = { embeds: [new EmbedBuilder().setImage(image).setDescription(caption)] };
                } else {
                    payload = { content: caption, files: [image] };
                }

                if (!repliedToInteraction && (interaction.deferred || interaction.replied)) {
                    repliedToInteraction = true;
                    await interaction.editReply(payload);
                } else if (!repliedToInteraction) {
                    repliedToInteraction = true;
                    await interaction.reply(payload);
                } else {
                    await interaction.followUp(payload);
                }
            },
            replyVideo: async function (data) {
                const caption = data.caption || data.text || "";
                const video = data.url || data.video || data.file;
                if (!video) throw new Error("❌[DISCORD] replyVideo precisa de url, video ou file.");

                let payload = {};
                if (Buffer.isBuffer(video)) {
                    payload = { content: caption, files: [{ attachment: video, name: "video.mp4" }] };
                } else if (typeof video === "string" && /^https?:\/\//i.test(video)) {
                    payload = { content: `${caption}${caption ? "\n" : ""}${video}` };
                } else {
                    payload = { content: caption, files: [video] };
                }

                if (!repliedToInteraction && (interaction.deferred || interaction.replied)) {
                    repliedToInteraction = true;
                    await interaction.editReply(payload);
                } else if (!repliedToInteraction) {
                    repliedToInteraction = true;
                    await interaction.reply(payload);
                } else {
                    await interaction.followUp(payload);
                }
            },
            replyAudio: async function (data) {
                const caption = data.caption || data.text || "";
                const audio = data.url || data.audio || data.file;
                if (!audio) throw new Error("❌[DISCORD] replyAudio precisa de url, audio ou file.");

                let payload = {};
                if (Buffer.isBuffer(audio)) {
                    payload = {
                        content: caption,
                        files: [{ attachment: audio, name: data.filename || "audio.mp3" }]
                    };
                } else if (typeof audio === "string" && /^https?:\/\//i.test(audio)) {
                    payload = { content: `${caption}${caption ? "\n" : ""}${audio}` };
                } else {
                    payload = { content: caption, files: [audio] };
                }

                if (!repliedToInteraction && (interaction.deferred || interaction.replied)) {
                    repliedToInteraction = true;
                    await interaction.editReply(payload);
                } else if (!repliedToInteraction) {
                    repliedToInteraction = true;
                    await interaction.reply(payload);
                } else {
                    await interaction.followUp(payload);
                }
            },
            replyFile: async function (data) {
                const caption = data.caption || data.text || "";
                const file = data.url || data.file || data.document;
                if (!file) throw new Error("❌[DISCORD] replyFile precisa de url, file ou document.");

                let fileData = file;
                if (Buffer.isBuffer(file)) {
                    fileData = { attachment: file, name: data.filename || "file.bin" };
                }
                const payload = { content: caption, files: [fileData] };

                if (!repliedToInteraction && (interaction.deferred || interaction.replied)) {
                    repliedToInteraction = true;
                    await interaction.editReply(payload);
                } else if (!repliedToInteraction) {
                    repliedToInteraction = true;
                    await interaction.reply(payload);
                } else {
                    await interaction.followUp(payload);
                }
            }
        };

        await onMessage(message);
    });

    client.on("messageCreate", async (msg) => {

        if (msg.partial) {
            try {
                await msg.fetch();
            } catch (err) {
                console.error("❌[DISCORD] Erro ao buscar mensagem partial:", err);
                return;
            }
        }

        if (msg.channel?.partial && typeof msg.channel.isDMBased === "function" && !msg.channel.isDMBased()) {
            try {
                await msg.channel.fetch();
            } catch (err) {
                console.error("❌[DISCORD] Erro ao buscar canal partial:", err);
            }
        }

        if (!msg.author || msg.author.bot) {
            return;
        }

        const isPrivate = !msg.guild;

        if (msg.guild && !syncedGuilds.has(msg.guild.id)) {
            syncGuild(msg.guild);
            syncedGuilds.add(msg.guild.id);
        }

        const isAdmin = isPrivate ? true : (msg.member?.permissions.has(PermissionFlagsBits.Administrator) || false);
        const canManageMessages = isPrivate ? true : (msg.member?.permissions.has(PermissionFlagsBits.ManageMessages) || false);

        let quoted = null;
        if (msg.reference && msg.reference.messageId) {
            try {
                const quotedMsg = msg.channel.messages.cache.get(msg.reference.messageId) ||
                    await msg.channel.messages.fetch(msg.reference.messageId);
                if (quotedMsg) {
                    quoted = {
                        messageId: String(quotedMsg.id),
                        userId: String(quotedMsg.author.id),
                        username: quotedMsg.author.username,
                        fromMe: String(quotedMsg.author.id) === String(client.user.id),
                        isBot: quotedMsg.author.bot,
                        text: quotedMsg.content,
                        raw: quotedMsg,
                        media: extractDiscordMedia(quotedMsg)
                    };
                }
            } catch (err) {
                console.error("❌[DISCORD] Falha ao buscar mensagem citada:", err);
            }
        }

        const mentionedJids = msg.mentions?.users ? msg.mentions.users.map(u => String(u.id)) : [];
        const mentionedChannelIds = msg.mentions?.channels ? msg.mentions.channels.map(c => String(c.id)) : [];

        const message = {

            platform: "discord",

            chatId: String(msg.channel.id),

            threadId:

                msg.channel.isThread?.()
                    ? String(msg.channel.id)
                    : null,

            target: {

                chatId:
                    String(msg.channel.id),

                threadId:

                    msg.channel.isThread?.()
                        ? String(
                            msg.channel.id
                        )
                        : null

            },

            userId: String(msg.author.id),

            username: msg.author.username,
            displayName: (msg.member && (msg.member.displayName || msg.member.nickname)) || msg.author.username,

            text: msg.content,

            raw: msg,

            // NOVOS CAMPOS

            messageId: String(msg.id),

            createdAt:
                msg.createdTimestamp,

            apiPing:
                client.ws.ping,

            chatType:
                msg.guild
                    ? "group"
                    : "private",

            isPrivate,

            botId:
                String(client.user.id),

            botUsername:
                client.user.username,

            mentionedJids,

            mentionedChannelIds,

            sender: {
                isAdmin,
                canManageMessages
            },

            quoted,

            delete: async function (messageId) {
                try {
                    const targetMsg = msg.channel.messages.cache.get(messageId) ||
                        await msg.channel.messages.fetch(messageId);
                    if (targetMsg) {
                        await targetMsg.delete();
                        return true;
                    }
                } catch (err) {
                    console.error("❌[DISCORD] Falha ao deletar mensagem:", err);
                    throw err;
                }
                return false;
            },

            media: extractDiscordMedia(msg),

            reply: async function (data) {
                try {
                    if (data?.embed) {
                        return await msg.reply({ embeds: [new EmbedBuilder(data.embed)] });
                    }
                    if (typeof data === "object" && data !== null && (data.image || data.photo || data.file || data.url || data.media?.buffer || data.media?.url)) {
                        const image = data.image || data.photo || data.file || data.url || data.media?.buffer || data.media?.url;
                        return await this.replyImg({ image, caption: data.caption || data.text || "" });
                    }

                    let text = "";
                    if (typeof data === "string") {
                        text = data;
                    } else if (data && data.text) {
                        text = data.text;
                    }

                    if (!text) return;

                    const MAX_LEN = 2000;
                    if (text.length <= MAX_LEN) {
                        await msg.reply(text);
                        return;
                    }

                    // Split long messages into chunks respecting newlines
                    const chunks = [];
                    let remaining = text;
                    while (remaining.length > 0) {
                        if (remaining.length <= MAX_LEN) {
                            chunks.push(remaining);
                            break;
                        }
                        let cutIndex = remaining.lastIndexOf("\n", MAX_LEN);
                        if (cutIndex <= 0) {
                            cutIndex = MAX_LEN;
                        }
                        chunks.push(remaining.substring(0, cutIndex));
                        remaining = remaining.substring(cutIndex).replace(/^\n/, "");
                    }

                    for (let i = 0; i < chunks.length; i++) {
                        if (i === 0) {
                            await msg.reply(chunks[i]);
                        } else {
                            await msg.channel.send(chunks[i]);
                        }
                    }
                } catch (err) {
                    const reason = err && err.message ? err.message : String(err);
                    const code = err && err.code ? ` [${err.code}]` : "";
                    console.warn(`[DISCORD] ⚠️ Falha ao responder mensagem, ignorando para não derrubar o bot.${code} ${reason}`);
                    return null;
                }
            },
            react: async function (emoji, add = true) {
                if (add) {
                    await msg.react(emoji);
                } else {
                    const reaction = msg.reactions.cache.get(emoji);
                    if (reaction) {
                        await reaction.users.remove(msg.client.user.id);
                    }
                }
            },

            replyImg: async function (data) {
                const caption = data.caption || data.text || "";
                const image = data.url || data.image || data.file;

                if (!image) {
                    throw new Error(
                        "❌[DISCORD] replyImg precisa de `url`, `image` ou `file`."
                    );
                }

                if (Buffer.isBuffer(image)) {
                    await msg.reply({
                        content: caption,
                        files: [{ attachment: image, name: data.fileName || data.name || "image.png" }]
                    });
                } else if (typeof image === "string" && /^https?:\/\//i.test(image)) {
                    await msg.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setImage(image)
                                .setDescription(caption)
                        ]
                    });
                } else {
                    await msg.reply({
                        content: caption,
                        files: [image]
                    });
                }
            },

            replyVideo: async function (data) {
                const caption = data.caption || data.text || "";
                const video = data.url || data.video || data.file;

                if (!video) {
                    throw new Error(
                        "❌[DISCORD] replyVideo precisa de `url`, `video` ou `file`."
                    );
                }

                if (Buffer.isBuffer(video)) {
                    await msg.reply({
                        content: caption,
                        files: [{ attachment: video, name: "video.mp4" }],
                        allowedMentions: { users: data.mentions || [] }
                    });
                } else if (typeof video === "string" && /^https?:\/\//i.test(video)) {
                    await msg.reply(`${caption}${caption ? "\n" : ""}${video}`);
                } else {
                    await msg.reply({
                        content: caption,
                        files: [video]
                    });
                }
            },

            replyAudio: async function (data) {
                const caption = data.caption || data.text || "";
                const audio = data.url || data.audio || data.file;

                if (!audio) {
                    throw new Error(
                        "❌[DISCORD] replyAudio precisa de `url`, `audio` ou `file`."
                    );
                }

                if (Buffer.isBuffer(audio)) {
                    await msg.reply({
                        content: caption,
                        files: [{ attachment: audio, name: data.filename || "audio.mp3" }],
                        allowedMentions: { users: data.mentions || [] }
                    });
                } else if (typeof audio === "string" && /^https?:\/\//i.test(audio)) {
                    await msg.reply(`${caption}${caption ? "\n" : ""}${audio}`);
                } else {
                    await msg.reply({
                        content: caption,
                        files: [audio]
                    });
                }
            },

            replyFile: async function (data) {
                const caption = data.caption || data.text || "";
                const file = data.url || data.file || data.document;

                if (!file) {
                    throw new Error(
                        "❌[DISCORD] replyFile precisa de `url`, `file` ou `document`."
                    );
                }

                if (Buffer.isBuffer(file)) {
                    await msg.reply({
                        content: caption,
                        files: [{ attachment: file, name: data.filename || "file.bin" }]
                    });
                } else if (typeof file === "string" && /^https?:\/\//i.test(file)) {
                    await msg.reply(`${caption}${caption ? "\n" : ""}${file}`);
                } else {
                    await msg.reply({
                        content: caption,
                        files: [file]
                    });
                }
            }

        };

        await onMessage(message);

    });

    await client.login(token);
}

async function getDiscordChannel(chatId) {
    if (!global.discordClient || !chatId) return null;
    let channel = global.discordClient.channels.cache.get(String(chatId));
    if (channel) return channel;

    try {
        channel = await global.discordClient.channels.fetch(String(chatId));
        if (channel) return channel;
    } catch {
        // Ignora falha de fetch no canal (ocorre em canais privados DM)
    }

    try {
        const user = await global.discordClient.users.fetch(String(chatId));
        if (user) {
            return await user.createDM();
        }
    } catch {
        // Ignora se não for ID de usuário
    }

    return null;
}

async function sendText(
    chatId,
    threadId,
    text
) {

    if (!global.discordClient) {

        throw new Error(
            "⛔[DISCORD] Cliente não iniciado."
        );

    }

    const channel = await getDiscordChannel(chatId);

    if (!channel) {

        throw new Error(
            "❌[DISCORD] Canal não encontrado."
        );

    }

    const msg = await channel.send(text);

    return msg.id;

}


async function sendImg(
    chatId,
    threadId,
    image,
    caption,
    filename
) {

    const { Readable } = require('stream');
    // Helper to convert Buffer to a readable stream for Discord API
    function bufferToStream(buffer) {
        return Readable.from(buffer);
    }

    if (!global.discordClient) {
        throw new Error(
            "⛔[DISCORD] Cliente não iniciado."
        );
    }

    const channel = await getDiscordChannel(threadId || chatId);

    if (!channel) {

        throw new Error(
            "❌[DISCORD] Canal não encontrado."
        );

    }

    const isRemoteUrl =
        typeof image === "string" &&
        /^https?:\/\//i.test(image);

    let msg;
    if (Buffer.isBuffer(image)) {
        // Buffer from WhatsApp, send as file (use Buffer directly)
        msg = await channel.send({
            files: [{ attachment: image, name: filename || 'image.png' }],
            content: caption || ""
        });
    } else if (isRemoteUrl) {
        msg = await channel.send({
            embeds: [
                new EmbedBuilder()
                    .setImage(image)
                    .setDescription(
                        caption || ""
                    )
            ]
        });
    } else {
        msg = await channel.send({
            content:
                caption || "",
            files: [image]
        });
    }

    return msg.id;

}

async function sendVideo(
    chatId,
    threadId,
    video,
    caption,
    filename
) {

    const { Readable } = require('stream');
    // Helper to convert Buffer to a readable stream for Discord API
    function bufferToStream(buffer) {
        return Readable.from(buffer);
    }
    if (!global.discordClient) {
        throw new Error(
            "⛔[DISCORD] Cliente não iniciado."
        );
    }

    const channel = await getDiscordChannel(threadId || chatId);

    if (!channel) {

        throw new Error(
            "❌[DISCORD] Canal não encontrado."
        );

    }

    const isRemoteUrl =
        typeof video === "string" &&
        /^https?:\/\//i.test(video);

    let msg;
    if (Buffer.isBuffer(video)) {
        // Buffer from WhatsApp, send as file (assume mp4)
        msg = await channel.send({
            files: [{ attachment: video, name: filename || 'video.mp4' }],
            content: caption || ""
        });
    } else if (isRemoteUrl) {
        msg = await channel.send({
            content: `${caption || ""}${caption ? "\n" : ""}${video}`
        });
    } else {
        msg = await channel.send({
            content: caption || "",
            files: [video]
        });
    }

    return msg.id;

}

async function sendAudio(
    chatId,
    threadId,
    audio,
    caption,
    filename
) {

    const { Readable } = require('stream');
    // Helper to convert Buffer to a readable stream for Discord API
    function bufferToStream(buffer) {
        return Readable.from(buffer);
    }

    if (!global.discordClient) {
        throw new Error(
            "⛔[DISCORD] Cliente não iniciado."
        );
    }

    const channel = await getDiscordChannel(threadId || chatId);

    if (!channel) {

        throw new Error(
            "❌[DISCORD] Canal não encontrado."
        );

    }

    const isRemoteUrl =
        typeof audio === "string" &&
        /^https?:\/\//i.test(audio);

    let msg;
    if (Buffer.isBuffer(audio)) {
        // Buffer from WhatsApp, send as file (assume mp3)
        msg = await channel.send({
            files: [{ attachment: audio, name: filename || 'audio.mp3' }],
            content: caption || ""
        });
    } else if (isRemoteUrl) {
        msg = await channel.send({
            content: `${caption || ""}${caption ? "\n" : ""}${audio}`
        });
    } else {
        msg = await channel.send({
            content: caption || "",
            files: [audio]
        });
    }

    return msg.id;

}

async function sendFile(
    chatId,
    threadId,
    file,
    caption,
    filename
) {
    if (!global.discordClient) {
        throw new Error(
            "⛔[DISCORD] Cliente não iniciado."
        );
    }

    const channel = await getDiscordChannel(threadId || chatId);

    if (!channel) {
        throw new Error(
            "❌[DISCORD] Canal não encontrado."
        );
    }

    let fileData = file;
    if (Buffer.isBuffer(file)) {
        fileData = { attachment: file, name: filename || "file.bin" };
    }

    const msg = await channel.send({
        content: caption || "",
        files: [fileData]
    });

    return msg.id;
}

/**
 * Verifica se o BOT possui a permissão necessária para executar uma ação no canal.
 * @param {string} chatId  ID do canal
 * @param {string} action  'delete' | 'kick' | 'ban'
 * @returns {Promise<boolean>}
 */
async function checkBotPermission(chatId, action) {
    if (!global.discordClient) return false;
    try {
        const channel = await getDiscordChannel(chatId);
        if (!channel || !channel.guild) return true; // DM — sem restrição
        const me = channel.guild.members.me;
        if (!me) return false;
        const perms = channel.permissionsFor(me);
        if (!perms) return false;
        if (action === "delete" || action === "warn") return perms.has(PermissionFlagsBits.ManageMessages);
        if (action === "kick") return perms.has(PermissionFlagsBits.KickMembers);
        if (action === "ban") return perms.has(PermissionFlagsBits.BanMembers);
        return false;
    } catch {
        return false;
    }
}

/**
 * Verifica se o MEMBRO tem permissão para alterar configurações do bot no canal.
 * @param {string} chatId  ID do canal
 * @param {string} userId  ID do usuário
 * @returns {Promise<boolean>}
 */
async function checkUserPermission(chatId, userId) {
    if (!global.discordClient) return false;
    try {
        const channel = await getDiscordChannel(chatId);
        if (!channel || !channel.guild) return true; // DM
        const member = await channel.guild.members.fetch(userId).catch(() => null);
        if (!member) return false;
        const perms = channel.permissionsFor(member);
        if (!perms) return false;
        return (
            perms.has(PermissionFlagsBits.Administrator) ||
            perms.has(PermissionFlagsBits.ManageGuild) ||
            perms.has(PermissionFlagsBits.ManageChannels)
        );
    } catch {
        return false;
    }
}

module.exports = {

    name: "discord",

    start,

    sendText,

    sendImg,

    sendVideo,

    sendAudio,

    sendFile,

    checkBotPermission,

    checkUserPermission

};