const fs = require("fs");
const path = require("path");
const { getAntiPVConfig, getAutoDownloadConfig } = require("../functions/config");
const { isOwner } = require("../functions/owners");
const bronxys = require("../functions/bronxys");

module.exports = {
    name: "antipv",
    priority: 95,
    runOn: "all",

    async execute(message) {
        // Anti-PV aplica-se apenas para chats privados (PV)
        if (!message.isPrivate) {
            return true;
        }

        const antipvConfig = getAntiPVConfig();
        if (!antipvConfig || !antipvConfig.enabled) {
            return true;
        }

        const text = message.text ? message.text.trim() : "";
        const prefix = message.prefix || "!";
        const urls = text.match(/https?:\/\/[^\s]+/gi) || [];
        const supportedUrls = urls.filter((url) => bronxys.detectMediaLinkType(url));
        const commandName = text.startsWith(prefix)
            ? text.split(/\s+/)[0].replace(prefix, "").toLowerCase()
            : "";
        const hasAutodownloadBypass =
            commandName === "autodownload" || commandName === "downloadlink" || commandName === "adl";

        if (hasAutodownloadBypass) {
            console.log(`[ANTIPV] 🔓 Liberado (Comando Autodownload em PV) | user: ${message.userId}`);
            return true;
        }

        // 1. Super Usuários (su) ignoram o Anti-PV
        const isSuperUser = message.sender?.isOwner || isOwner(message);
        if (isSuperUser) {
            console.log(`[ANTIPV] 🔓 Liberado (SU) | user: ${message.userId}`);
            return true;
        }

        // 2. Usuários da lista branca do Anti-PV
        const userWhitelist = Array.isArray(antipvConfig.userWhitelist) ? antipvConfig.userWhitelist : [];
        if (userWhitelist.includes(String(message.userId))) {
            console.log(`[ANTIPV] 🔓 Liberado (User Whitelist) | user: ${message.userId}`);
            return true;
        }

        // 3. Comandos da lista branca do Anti-PV
        if (text.startsWith(prefix)) {
            const commandWhitelist = Array.isArray(antipvConfig.commandWhitelist)
                ? antipvConfig.commandWhitelist.map(c => c.toLowerCase())
                : [];
            if (commandName && commandWhitelist.includes(commandName)) {
                console.log(`[ANTIPV] 🔓 Liberado (Comando Whitelist: ${commandName}) | user: ${message.userId}`);
                return true;
            }
        }

        console.log(`[ANTIPV] ⛔ Bloqueado | user: ${message.userId} | modo: ${antipvConfig.mode}`);

        // Se o modo for 'reply', envia a resposta personalizada (texto e mídia se configurada)
        if (antipvConfig.mode === "reply") {
            const customText = antipvConfig.message || "⚠️ O atendimento no PV está desativado no momento.";
            const media = antipvConfig.media;

            if (typeof message.reply !== "function") {
                return false;
            }

            if (media && media.path && fs.existsSync(media.path)) {
                try {
                    const mediaType = media.type || "photo";
                    if (mediaType === "video" && typeof message.replyVideo === "function") {
                        await message.replyVideo({ file: media.path, text: customText });
                    } else if (mediaType === "audio" && typeof message.replyAudio === "function") {
                        await message.replyAudio({ file: media.path, text: customText });
                    } else if (mediaType === "document" && typeof message.replyFile === "function") {
                        await message.replyFile({ file: media.path, text: customText, mimetype: media.mimeType, filename: media.fileName });
                    } else if (typeof message.replyImg === "function") {
                        await message.replyImg({ file: media.path, text: customText });
                    } else {
                        await message.reply({ text: customText });
                    }
                } catch (err) {
                    console.error("[ANTIPV] Erro ao enviar mídia configurada:", err);
                    await message.reply({ text: customText }).catch(() => {});
                }
            } else {
                await message.reply({ text: customText }).catch(() => {});
            }
        }

        // Retorna false para interromper o processamento da mensagem no core
        return false;
    }
};
