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

    removeOwner,

    isOwner,

    hasOwners,

    generateCode,

    getCode,

    claimFirstOwner

};