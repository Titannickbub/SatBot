const fs = require("fs");
const path = require("path");
const { loadSettings, saveSettings } = require("./groupSettings");
const { kickMember, banMember } = require("./moderationHelper");

const groupsDir = path.join(__dirname, "..", "settings", "groups");

/**
 * Descobre o alvo principal para os warns (Servidor no Discord, Comunidade no WhatsApp, ou Grupo padrão).
 * @param {object} message O objeto da mensagem.
 * @returns {{ id: string, type: string } | null}
 */
function getWarnTarget(message) {
    const { platform, chatId, raw } = message;

    if (platform === "discord") {
        const guildId = raw?.guild?.id;
        if (!guildId) return null;
        return { id: String(guildId), type: "server" };
    }

    if (platform === "telegram") {
        return { id: String(chatId), type: "group" };
    }

    if (platform === "whatsapp") {
        if (!chatId?.endsWith("@g.us")) return null;
        
        // Verifica se pertence a alguma comunidade
        if (fs.existsSync(groupsDir)) {
            const files = fs.readdirSync(groupsDir);
            for (const file of files) {
                if (!file.startsWith("waC") || !file.endsWith(".json")) continue;
                try {
                    const data = JSON.parse(fs.readFileSync(path.join(groupsDir, file), "utf8"));
                    if (Array.isArray(data.chat) && data.chat.some(c => c.id === chatId)) {
                        return { id: String(data.server), type: "community" };
                    }
                } catch {}
            }
        }
        // Se não achar comunidade, o alvo é o próprio grupo
        return { id: String(chatId), type: "group" };
    }

    return null;
}

/**
 * Retorna as configurações de warn e os dados de warns atuais.
 */
function getWarnData(platform, targetId, targetType) {
    const data = loadSettings(platform, targetId, targetType);
    if (!data.settings) data.settings = {};
    
    // Configurações padrão
    if (!data.settings.warnConfig) {
        data.settings.warnConfig = { max: 3, action: "ban" };
    }
    
    // Armazenamento de warns por usuário
    if (!data.settings.warnsData) {
        data.settings.warnsData = {};
    }
    if (!data.settings.warnsHistory) {
        data.settings.warnsHistory = {};
    }

    return data;
}

function getWarnHistory(value, storedHistory) {
    const legacyValue = value && typeof value === "object" && !Array.isArray(value)
        ? value.count
        : Array.isArray(value) ? value.length : value;
    const count = Number.isFinite(Number(legacyValue)) ? Math.max(0, Math.floor(Number(legacyValue))) : 0;
    const storedRecords = Array.isArray(storedHistory) ? storedHistory : storedHistory?.records;
    const legacyRecords = Array.isArray(value) ? value : value?.records;
    const records = (storedRecords || legacyRecords || [])
        .filter(record => record && typeof record === "object")
        .map(record => ({
            reason: String(record.reason || ""),
            createdAt: record.createdAt || null
        }));
    if (records.length > count) records.splice(0, records.length - count);
    return { count, records, legacyCount: Math.max(0, count - records.length) };
}

/**
 * Define a configuração do sistema de warn.
 * @param {object} message 
 * @param {number} max 
 * @param {string} action "ban" ou "kick"
 */
function setWarnConfig(message, max, action) {
    const target = getWarnTarget(message);
    if (!target) return false;

    const data = getWarnData(message.platform, target.id, target.type);
    data.settings.warnConfig = { max: Number(max), action };

    return saveSettings(message.platform, target.id, target.type, data, message);
}

/**
 * Retorna a configuração atual.
 */
function getWarnConfig(message) {
    const target = getWarnTarget(message);
    if (!target) return null;

    const data = getWarnData(message.platform, target.id, target.type);
    return data.settings.warnConfig;
}

/**
 * Retorna a quantidade de warns de um usuário.
 */
function getUserWarns(message, userId) {
    return getUserWarnHistory(message, userId).count;
}

function getUserWarnHistory(message, userId) {
    const target = getWarnTarget(message);
    if (!target) return { count: 0, records: [], legacyCount: 0 };

    const data = getWarnData(message.platform, target.id, target.type);
    return getWarnHistory(
        data.settings.warnsData[String(userId)],
        data.settings.warnsHistory[String(userId)]
    );
}

/**
 * Adiciona um warn ao usuário. Se ultrapassar o máximo, aplica a punição.
 * @param {object} message Objeto da mensagem
 * @param {string} userId ID do usuário advertido
 * @param {string} reason Motivo da advertência
 * @returns {object} { currentWarns, maxWarns, punished, action }
 */
async function addWarn(message, userId, reason = "Sem motivo") {
    const target = getWarnTarget(message);
    if (!target) return null;

    const data = getWarnData(message.platform, target.id, target.type);
    const { max, action } = data.settings.warnConfig;
    const warnsData = data.settings.warnsData;

    const uid = String(userId);
    const history = getWarnHistory(warnsData[uid], data.settings.warnsHistory[uid]);
    const currentWarns = history.count + 1;
    history.records.push({
        reason: String(reason || "Sem motivo informado").trim().slice(0, 500),
        createdAt: new Date().toISOString()
    });
    warnsData[uid] = currentWarns;
    data.settings.warnsHistory[uid] = {
        legacyCount: history.legacyCount,
        records: history.records
    };

    if (!saveSettings(message.platform, target.id, target.type, data, message)) {
        throw new Error("Não foi possível salvar a advertência.");
    }

    const result = {
        currentWarns,
        maxWarns: max,
        punished: false,
        action
    };

    if (currentWarns >= max) {
        result.punished = true;
        try {
            if (action === "kick") {
                await kickMember(message.platform, { ...message, userId: uid }, reason);
            } else if (action === "ban") {
                await banMember(message.platform, { ...message, userId: uid }, reason);
            }
        } catch (err) {
            console.error("[WARN] Erro ao aplicar punição automática:", err);
            throw new Error("A advertência foi salva, mas a punição automática falhou. Verifique as permissões do bot.");
        }

        delete data.settings.warnsData[uid];
        delete data.settings.warnsHistory[uid];
        if (!saveSettings(message.platform, target.id, target.type, data, message)) {
            throw new Error("A punição foi aplicada, mas não foi possível atualizar o registro de advertências.");
        }
    }

    return result;
}

/**
 * Remove os warns de um usuário (perdoar).
 * Se amount for indefinido ou 0, zera todos os warns.
 */
function removeWarns(message, userId, amount = 0) {
    const target = getWarnTarget(message);
    if (!target) return false;

    const data = getWarnData(message.platform, target.id, target.type);
    const uid = String(userId);

    if (data.settings.warnsData[uid] === undefined) {
        return true; // nada para remover
    }

    if (amount <= 0) {
        delete data.settings.warnsData[uid];
        delete data.settings.warnsHistory[uid];
    } else {
        const history = getWarnHistory(data.settings.warnsData[uid], data.settings.warnsHistory[uid]);
        const removed = Math.min(Math.floor(amount), history.count);
        const removedLegacy = Math.min(removed, history.legacyCount);
        history.legacyCount -= removedLegacy;
        const remainingToRemove = removed - removedLegacy;
        history.records.splice(0, remainingToRemove);
        history.count -= removed;
        if (history.count <= 0) {
            delete data.settings.warnsData[uid];
            delete data.settings.warnsHistory[uid];
        } else {
            data.settings.warnsData[uid] = history.count;
            data.settings.warnsHistory[uid] = {
                legacyCount: history.legacyCount,
                records: history.records
            };
        }
    }

    return saveSettings(message.platform, target.id, target.type, data, message);
}

module.exports = {
    getWarnTarget,
    getWarnData,
    setWarnConfig,
    getWarnConfig,
    getUserWarns,
    getUserWarnHistory,
    getWarnHistory,
    addWarn,
    removeWarns
};
