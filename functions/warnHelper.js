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

    return data;
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
    const target = getWarnTarget(message);
    if (!target) return 0;

    const data = getWarnData(message.platform, target.id, target.type);
    return data.settings.warnsData[String(userId)] || 0;
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
    let currentWarns = (warnsData[uid] || 0) + 1;
    warnsData[uid] = currentWarns;

    saveSettings(message.platform, target.id, target.type, data, message);

    const result = {
        currentWarns,
        maxWarns: max,
        punished: false,
        action
    };

    if (currentWarns >= max) {
        result.punished = true;
        // Reseta os warns após a punição
        delete data.settings.warnsData[uid];
        saveSettings(message.platform, target.id, target.type, data, message);

        try {
            if (action === "kick") {
                await kickMember(message.platform, message);
            } else if (action === "ban") {
                await banMember(message.platform, message, reason);
            }
        } catch (err) {
            console.error("[WARN] Erro ao aplicar punição automática:", err);
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
    } else {
        data.settings.warnsData[uid] -= amount;
        if (data.settings.warnsData[uid] <= 0) {
            delete data.settings.warnsData[uid];
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
    addWarn,
    removeWarns
};
