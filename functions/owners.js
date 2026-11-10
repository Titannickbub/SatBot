const fs = require("fs");
const path = require("path");

const file =
    path.join(
        __dirname,
        "..",
        "settings",
        "su.json"
    );

let activationCode = null;
let cache = null;

function load() {

    if (cache) {

        return cache;

    }

    if (!fs.existsSync(file)) {

        cache = {
            owners: []
        };
        activationCode = null;

        return cache;

    }

    try {
        cache = JSON.parse(
            fs.readFileSync(
                file,
                "utf8"
            )
        );
    } catch {
        cache = {
            owners: []
        };
    }

    if (!Array.isArray(cache.owners)) {
        cache.owners = [];
    }

    if (cache.owners.length > 0) {
        activationCode = null;
        delete cache.activationCode;
        save(cache);
    } else {
        activationCode = cache.activationCode || null;
    }

    return cache;

}

function save(data) {

    cache = data || { owners: [] };

    if (!Array.isArray(cache.owners)) {
        cache.owners = [];
    }

    if (cache.owners.length > 0) {
        delete cache.activationCode;
    } else if (activationCode) {
        cache.activationCode = activationCode;
    } else {
        delete cache.activationCode;
    }

    fs.writeFileSync(
        file,
        JSON.stringify(
            cache,
            null,
            4
        )
    );

}

function getOwners() {

    return [...load().owners];

}

function addOwner(
    platform,
    id
) {

    const data = load();

    const exists =
        data.owners.find(
            owner =>
                owner.platform === platform &&
                owner.id === String(id)
        );

    if (exists) {
        return false;
    }

    data.owners.push({

        platform,

        id: String(id),

        addedAt:
            Date.now()

    });

    save(data);

    return true;

}

function addOwners(entries) {
    if (!Array.isArray(entries)) {
        throw new TypeError("A lista de superusuários deve ser um array.");
    }

    const data = load();
    const knownOwners = new Set(
        data.owners.map(owner => `${owner.platform}:${owner.id}`)
    );
    const additions = [];

    for (const entry of entries) {
        const platform = String(entry?.platform || "").trim().toLowerCase();
        const id = String(entry?.id || "").trim();
        if (!platform || !id) {
            throw new TypeError("Cada superusuário deve ter plataforma e ID.");
        }

        const key = `${platform}:${id}`;
        if (knownOwners.has(key)) {
            continue;
        }

        knownOwners.add(key);
        additions.push({ platform, id, addedAt: Date.now() });
    }

    if (additions.length) {
        data.owners.push(...additions);
        save(data);
    }

    return additions.map(({ platform, id }) => ({ platform, id }));
}

function removeOwner(
    platform,
    id
) {

    const data = load();

    const before =
        data.owners.length;

    data.owners =
        data.owners.filter(
            owner =>
                !(
                    owner.platform === platform &&
                    owner.id === String(id)
                )
        );

    save(data);

    return before !== data.owners.length;

}

function removeOwners(entries) {
    if (!Array.isArray(entries)) {
        throw new TypeError("A lista de superusuários deve ser um array.");
    }

    const targets = new Set(
        entries.map(entry => `${entry?.platform}:${entry?.id}`)
    );
    const data = load();
    const removed = data.owners.filter(owner =>
        targets.has(`${owner.platform}:${owner.id}`)
    );
    const remaining = data.owners.filter(owner =>
        !targets.has(`${owner.platform}:${owner.id}`)
    );

    if (!removed.length) {
        return { removed: [], blocked: false };
    }
    if (!remaining.length) {
        return { removed: [], blocked: true };
    }

    data.owners = remaining;
    save(data);

    return {
        removed: removed.map(({ platform, id }) => ({ platform, id })),
        blocked: false
    };
}

function isOwner(message) {

    const owners =
        getOwners();

    return owners.some(
        owner =>
            owner.platform ===
            message.platform &&
            owner.id ===
            String(
                message.userId
            )
    );

}

function hasOwners() {

    return getOwners().length > 0;

}

function generateCode() {

    if (hasOwners()) {

        return null;

    }

    activationCode =
        Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase()
        + "-" +
        Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase()
        + "-" +
        Math.random()
            .toString(36)
            .substring(2, 6)
            .toUpperCase();

    const data = load();
    save(data);

    return activationCode;

}

function getCode() {

    return activationCode;

}

function claimFirstOwner(
    message,
    code
) {

    if (hasOwners()) {

        return false;

    }

    const data = load();
    const persistedCode = data.activationCode || activationCode;

    if (
        !persistedCode ||
        persistedCode !== code
    ) {

        return false;

    }

    const added = addOwner(
        message.platform,
        message.userId
    );

    if (!added) {
        return false;
    }

    activationCode = null;
    const freshData = load();
    delete freshData.activationCode;
    save(freshData);

    return true;

}

module.exports = {

    getOwners,

    addOwner,

    addOwners,

    removeOwner,

    removeOwners,

    isOwner,

    hasOwners,

    generateCode,

    getCode,

    claimFirstOwner

};