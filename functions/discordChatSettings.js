const { loadSettings, saveSettings, deleteSettingsFile } = require("./groupSettings");

const LEGACY_FEATURE_KEYS = {
    autoIA: ["autoIA", "autoia"],
    autodownload: ["autodownload"]
};

function getDiscordContext(message) {
    if (message?.platform !== "discord") return null;

    const raw = message.raw || {};
    const guildId = String(message.guildId || raw.guild?.id || "");
    const rawChannel = raw.channel || {};
    const channelId = String(message.chatId || raw.channelId || rawChannel.id || "");
    if (!guildId || !channelId) return null;
    const legacyChatId = channelId;

    const isThread = Boolean(message.threadId || rawChannel.isThread?.());
    const threadId = isThread
        ? String(rawChannel.id || message.threadId || channelId)
        : null;
    const parentChannelId = isThread && rawChannel.parentId
        ? String(rawChannel.parentId)
        : channelId;

    return {
        guildId,
        channelId: parentChannelId,
        legacyChatId,
        threadId,
        channelName: isThread ? rawChannel.parent?.name || null : rawChannel.name || null,
        categoryId: !isThread && rawChannel.parentId ? String(rawChannel.parentId) : null,
        categoryName: !isThread ? rawChannel.parent?.name || null : null,
        raw
    };
}

function findChannel(serverData, channelId) {
    const directChannel = Array.isArray(serverData.chat)
        ? serverData.chat.find(channel => String(channel.id) === channelId)
        : null;
    if (directChannel) return directChannel;

    if (Array.isArray(serverData.categoria)) {
        for (const category of serverData.categoria) {
            const channel = Array.isArray(category.chat)
                ? category.chat.find(item => String(item.id) === channelId)
                : null;
            if (channel) return channel;
        }
    }
    return null;
}

function getChannel(serverData, context, create) {
    let channel = findChannel(serverData, context.channelId);
    if (channel || !create) return channel;

    channel = {
        id: context.channelId,
        name: context.channelName,
        topico: [],
        settings: {}
    };

    const category = context.categoryId && Array.isArray(serverData.categoria)
        ? serverData.categoria.find(item => String(item.id) === context.categoryId)
        : null;
    if (category) {
        category.chat = Array.isArray(category.chat) ? category.chat : [];
        category.chat.push(channel);
    } else {
        serverData.chat = Array.isArray(serverData.chat) ? serverData.chat : [];
        serverData.chat.push(channel);
    }
    return channel;
}

function getSettingsNode(serverData, context, create) {
    const channel = getChannel(serverData, context, create);
    if (!channel) return null;

    channel.settings = channel.settings || {};
    if (!context.threadId) return channel.settings;

    channel.topico = Array.isArray(channel.topico) ? channel.topico : [];
    let topic = channel.topico.find(item => String(item.id) === context.threadId);
    if (!topic && create) {
        topic = { id: context.threadId, settings: {} };
        channel.topico.push(topic);
    }
    if (!topic) return null;

    topic.settings = topic.settings || {};
    return topic.settings;
}

function persist(serverData, context) {
    if (!saveSettings("discord", context.guildId, "server", serverData, { raw: context.raw })) {
        throw new Error(`Não foi possível salvar as configurações do servidor Discord ${context.guildId}.`);
    }
}

function isLegacyFileOnlyForMigratedFeatures(legacyData, legacyChatId) {
    const allowedRootKeys = new Set([
        "server", "categoria", "chat", "settings",
        "serverName", "groupName", "chatName", "categoryName"
    ]);
    if (Object.keys(legacyData).some(key => !allowedRootKeys.has(key))) return false;
    if (legacyData.server !== null || legacyData.categoria !== null) return false;
    if ([legacyData.serverName, legacyData.groupName, legacyData.chatName, legacyData.categoryName]
        .some(value => value !== null && value !== undefined)) return false;

    const settings = legacyData.settings || {};
    const allowedSettings = new Set(Object.values(LEGACY_FEATURE_KEYS).flat());
    if (Object.keys(settings).some(key => !allowedSettings.has(key))) return false;

    if (!Array.isArray(legacyData.chat)) return false;
    return legacyData.chat.every(channel =>
        String(channel.id) === legacyChatId &&
        (!channel.name || channel.name === legacyChatId) &&
        Array.isArray(channel.topico) &&
        channel.topico.length === 0 &&
        (!channel.settings || Object.keys(channel.settings).length === 0)
    );
}

function migrateLegacyFeatureSettings(serverData, context, legacyData) {
    const legacySettings = legacyData.settings || {};
    const targetSettings = getSettingsNode(serverData, context, false);
    const pendingMigrations = [];
    let canDeleteLegacyFile = true;

    for (const [targetKey, sourceKeys] of Object.entries(LEGACY_FEATURE_KEYS)) {
        const sourceKey = sourceKeys.find(key => legacySettings[key] !== undefined);
        if (!sourceKey) continue;

        const currentTarget = targetSettings?.[targetKey];
        if (currentTarget !== undefined) {
            if (JSON.stringify(currentTarget) !== JSON.stringify(legacySettings[sourceKey])) {
                canDeleteLegacyFile = false;
            }
            continue;
        }
        pendingMigrations.push([targetKey, legacySettings[sourceKey]]);
    }

    if (pendingMigrations.length) {
        const writableSettings = getSettingsNode(serverData, context, true);
        for (const [key, value] of pendingMigrations) {
            writableSettings[key] = value;
        }
        persist(serverData, context);
    }

    const migratedSettings = getSettingsNode(serverData, context, false);
    const allLegacySettingsMigrated = Object.entries(LEGACY_FEATURE_KEYS).every(([key, aliases]) => {
        const sourceKey = aliases.find(alias => legacySettings[alias] !== undefined);
        return !sourceKey ||
            JSON.stringify(migratedSettings?.[key]) === JSON.stringify(legacySettings[sourceKey]);
    });

    if (canDeleteLegacyFile &&
        allLegacySettingsMigrated &&
        isLegacyFileOnlyForMigratedFeatures(legacyData, context.legacyChatId)) {
        deleteSettingsFile("discord", context.legacyChatId, "chat");
    }

    return { migrated: allLegacySettingsMigrated, settings: migratedSettings };
}

function getDiscordChatFeatureSetting(message, key, aliases = []) {
    const context = getDiscordContext(message);
    if (!context) return undefined;

    const serverData = loadSettings("discord", context.guildId, "server");
    const settings = getSettingsNode(serverData, context, false);
    const storedKey = [key, ...aliases].find(alias => settings?.[alias] !== undefined);
    if (storedKey) {
        return settings[storedKey];
    }

    const legacyData = loadSettings("discord", context.legacyChatId, "chat");
    const legacySettings = legacyData.settings || {};
    const hasLegacyFeature = Object.values(LEGACY_FEATURE_KEYS)
        .flat()
        .some(legacyKey => legacySettings[legacyKey] !== undefined);
    if (!hasLegacyFeature) {
        const legacyKey = [key, ...aliases].find(alias => legacySettings[alias] !== undefined);
        return legacyKey ? legacySettings[legacyKey] : undefined;
    }

    const migration = migrateLegacyFeatureSettings(serverData, context, legacyData);
    if (!migration.migrated) return undefined;
    if (key === "autoIA" || aliases.includes("autoia")) {
        return migration.settings?.autoIA ?? legacySettings.autoIA ?? legacySettings.autoia;
    }
    return migration.settings?.[key];
}

function setDiscordChatFeatureSetting(message, key, value) {
    const context = getDiscordContext(message);
    if (!context) {
        throw new Error("Não foi possível identificar o servidor e canal Discord atuais.");
    }

    const serverData = loadSettings("discord", context.guildId, "server");
    const legacyData = loadSettings("discord", context.legacyChatId, "chat");
    const hasLegacyFeature = Object.values(LEGACY_FEATURE_KEYS)
        .flat()
        .some(key => legacyData.settings?.[key] !== undefined);
    if (hasLegacyFeature) {
        migrateLegacyFeatureSettings(serverData, context, legacyData);
    }

    const settings = getSettingsNode(serverData, context, true);
    settings[key] = value;
    persist(serverData, context);
    return value;
}

module.exports = {
    getDiscordChatFeatureSetting,
    setDiscordChatFeatureSetting
};
