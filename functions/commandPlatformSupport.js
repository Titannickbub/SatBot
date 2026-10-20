const STATUS = Object.freeze({
    FULL: "full",
    PARTIAL: "partial",
    NONE: "none"
});

const STATUS_ICONS = Object.freeze({
    [STATUS.FULL]: "🟢",
    [STATUS.PARTIAL]: "🟡",
    [STATUS.NONE]: "🔴"
});

const STATUS_LABELS = Object.freeze({
    [STATUS.FULL]: "funciona 100%",
    [STATUS.PARTIAL]: "funciona parcialmente",
    [STATUS.NONE]: "não funciona"
});

function normalizeStatus(value) {
    if (value === true || value === STATUS.FULL) return STATUS.FULL;
    if (value === false || value === STATUS.NONE) return STATUS.NONE;
    if (value === STATUS.PARTIAL) return STATUS.PARTIAL;
    return null;
}

function getCommandPlatformStatus(command, platform) {
    const support = command && command.platformSupport;

    if (!support) {
        return STATUS.FULL;
    }

    if (Array.isArray(support)) {
        return support.includes(platform) ? STATUS.FULL : STATUS.NONE;
    }

    if (typeof support === "object") {
        return normalizeStatus(support[platform]) || STATUS.NONE;
    }

    return STATUS.FULL;
}

function getCommandPlatformIndicator(command, platform) {
    const status = getCommandPlatformStatus(command, platform);
    return {
        status,
        icon: STATUS_ICONS[status],
        label: STATUS_LABELS[status]
    };
}

module.exports = {
    STATUS,
    getCommandPlatformStatus,
    getCommandPlatformIndicator
};
