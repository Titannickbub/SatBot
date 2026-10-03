const path = require("path");
const { cleanJid } = require("../../functions/moderationHelper");
const { getTestInfo, getSavedMedia, resolveTestKey, TESTES_MEDIA_DIR, TESTES_FILE } = require("../../functions/testeHelper");
const { renderCoupleTest } = require("../../functions/imageBanner");
const actModule = require("./act");

const { sendMedia } = actModule._internals || {};

module.exports = {
    name: "testar",
    aliases: ["teste"],
    category: "diversão",
    description: "Executa testes aleatórios de diversão, incluindo o teste romântico de casal com banner e fotos dos participantes.",
    usage: [
        "{prefix}testar gay",
        "{prefix}testar lesbica",
        "{prefix}testar bonito",
        "{prefix}testar feio",
        "{prefix}testar casal",
        "{prefix}testar casal2",
        "{prefix}testar gado",
        "{prefix}testar corno",
        "{prefix}testar burro",
        "{prefix}testar golpe",
        "{prefix}testar gostoso",
        "{prefix}testar triste",
        "{prefix}testar doido",
        "{prefix}testar otaku"
    ].join("\n"),

    async execute(message) {
        const rawInput = String(message.args?.[0] || "").trim();
        const testKey = resolveTestKey(rawInput);

        if (!rawInput || rawInput.toLowerCase() === "help" || rawInput.toLowerCase() === "ajuda") {
            return message.reply({ text: help(message) });
        }

        if (!testKey) {
            return message.reply({
                text: `❌ Teste inválido. Escolha um destes: ${getSupportedList()}.\n\n${help(message)}`
            });
        }

        try {
            const percentage = Math.floor(Math.random() * 101);
            let caption;
            let mentions;
            let casalPair;

            if (testKey === "casal" || testKey === "casal2") {
                const casalTargets = resolveCasalTargets(message);
                if (!casalTargets || casalTargets.length < 2) {
                    return message.reply({
                        text: `❌ Para testar ${testKey}, marque 1 pessoa ou 2 pessoas.\nExemplo: \`${message.prefix || "!"}testar ${testKey} @usuario\` ou \`${message.prefix || "!"}testar ${testKey} @a @b\``
                    });
                }

                casalPair = casalTargets.slice(0, 2);
                caption = buildCasalCaption(casalPair[0], casalPair[1], percentage, message.platform);
                mentions = buildCasalMentions(message, casalPair);
            } else {
                const profile = getTestInfo(testKey);
                const target = resolveTarget(message);
                caption = buildCaption(profile, target, percentage);
                mentions = buildMentions(message, target);
            }

            await message.reply({ text: "🔎 Verificando..." });
            await new Promise(resolve => setTimeout(resolve, 1200));

            if (testKey === "casal2") {
                const banner = await renderCoupleTest(message, casalPair, percentage);
                return await message.replyImg({
                    image: banner.buffer,
                    caption: banner.caption,
                    fileName: "casal2.png",
                    mentions
                });
            }

            const mediaMeta = getSavedMedia(testKey);

            if (mediaMeta && sendMedia && typeof sendMedia === "function") {
                try {
                    const fs = require("fs");
                    const mediaFile = mediaMeta.file ? path.resolve(TESTES_MEDIA_DIR, path.basename(mediaMeta.file)) : null;
                    if (mediaFile && fs.existsSync(mediaFile)) {
                        const fileExt = path.extname(mediaFile).toLowerCase();
                        const isGif = (mediaMeta.type === "gif" || fileExt === ".gif");

                        if (message.platform === "discord" && isGif) {
                            const imageBuffer = fs.readFileSync(mediaFile);
                            return await message.replyImg({
                                image: imageBuffer,
                                caption,
                                fileName: mediaMeta.fileName || path.basename(mediaFile)
                            });
                        }

                        return await sendMedia(message, {
                            type: mediaMeta.type || "photo",
                            file: mediaFile,
                            fileName: mediaMeta.fileName || path.basename(mediaFile),
                        }, caption, mentions);
                    }
                } catch (error) {
                    console.error("[TESTAR] Falha ao enviar mídia configurada do teste:", error);
                }
            }

            return message.reply({
                text: caption,
                mentions
            });
        } catch (error) {
            console.error("[TESTAR] Erro ao executar teste:", error);
            return message.reply({ text: `❌ Não foi possível executar esse teste agora.\n\n${help(message)}` });
        }
    }
};

function getSupportedList() {
    return require("../../functions/testeHelper").getSupportedTestKeys()
        .map(item => `• \`testar ${item}\``)
        .join(", ");
}

function buildCaption(profile, target, percentage) {
    const targetLabel = target.label || target.name || "usuário";
    const result = getResultFor(profile, percentage);
    const flavor = getFlavorFor(profile.label, percentage);

    return `${profile.title}\n\n「 ${targetLabel} 」 Você é: ❰ ${percentage}% ❱ ${profile.label} ${profile.emoji}\n\n${result}\n${flavor}`;
}

function getResultFor(profile, percentage) {
    const index = percentage >= 85 ? 4 : percentage >= 70 ? 3 : percentage >= 50 ? 2 : percentage >= 25 ? 1 : 0;
    return profile.results[index] || profile.results[0];
}

function getFlavorFor(label, percentage) {
    if (percentage >= 85) {
        return ".";
    }
    if (percentage >= 70) {
        return ".";
    }
    if (percentage >= 50) {
        return ".";
    }
    if (percentage >= 25) {
        return ".";
    }
    return ".";
}

function resolveTarget(message) {
    let id = null;
    let name = null;

    if (message.quoted?.userId) {
        id = String(message.quoted.userId);
        name = message.quoted.displayName || message.quoted.username || message.quoted.name || null;
    }

    if (!id && message.platform === "whatsapp") {
        const firstMention = message.mentionedJids?.[0] || message.mentionedJidList?.[0];
        if (firstMention) {
            id = String(firstMention);
        }
    }

    if (!id && message.platform === "discord") {
        if (message.raw?.mentions?.users?.size > 0) {
            const user = message.raw.mentions.users.first();
            id = String(user.id);
            name = user.globalName || user.displayName || user.username || null;
        }
    }

    if (!id && message.platform === "telegram") {
        const entities = message.raw?.message?.entities || [];
        const mentionEntity = entities.find(entity => entity.type === "text_mention" && entity.user);
        if (mentionEntity) {
            id = String(mentionEntity.user.id);
            name = mentionEntity.user.first_name || mentionEntity.user.username || null;
        }
    }

    if (!id) {
        id = String(message.userId || "");
    }

    const cleanId = cleanJid(String(id || ""));
    const selfName = message.displayName || message.username || message.sender?.displayName || message.sender?.username || "Você";
    const targetName = name || (cleanId === cleanJid(String(message.userId || "")) ? selfName : displayFallback(message, cleanId));

    return {
        id: cleanId,
        name: targetName,
        label: formatTargetLabel(message, cleanId, targetName)
    };
}

function displayFallback(message, id) {
    if (message.platform === "whatsapp") {
        return `@${String(id).split("@")[0].split(":")[0]}`;
    }
    if (message.platform === "discord") {
        return `<@${String(id).replace(/\D/g, "")}>`;
    }
    if (message.platform === "telegram") {
        return String(id).startsWith("@") ? String(id) : "usuário";
    }
    return "usuário";
}

function formatTargetLabel(message, id, name) {
    if (message.platform === "whatsapp") {
        return `@${String(id).split("@")[0].split(":")[0]}`;
    }
    if (message.platform === "discord") {
        return `<@${String(id).replace(/\D/g, "")}>`;
    }
    if (message.platform === "telegram") {
        return String(name || "usuário");
    }
    return String(name || "usuário");
}

function resolveCasalTargets(message) {
    const candidates = [];

    if (message.platform === "whatsapp") {
        const mentioned = Array.isArray(message.mentionedJids) ? message.mentionedJids : (Array.isArray(message.mentionedJidList) ? message.mentionedJidList : []);
        if (mentioned.length) {
            for (const item of mentioned) {
                const clean = cleanJid(String(item || ""));
                if (clean) candidates.push({ id: clean, name: displayFallback(message, clean) });
            }
        }
    }

    if (message.platform === "discord") {
        const users = Array.from(message.raw?.mentions?.users?.values?.() || []);
        for (const user of users) {
            const id = String(user.id);
            candidates.push({ id, name: user.globalName || user.displayName || user.username || displayFallback(message, id) });
        }
    }

    if (message.platform === "telegram") {
        const entities = message.raw?.message?.entities || [];
        for (const entity of entities) {
            if (entity.type === "text_mention" && entity.user) {
                const id = String(entity.user.id);
                candidates.push({ id, name: entity.user.first_name || entity.user.username || displayFallback(message, id) });
            }
        }
    }

    if (message.quoted?.userId && !candidates.some(c => cleanJid(c.id) === cleanJid(String(message.quoted.userId)))) {
        const quotedId = String(message.quoted.userId);
        candidates.push({ id: quotedId, name: message.quoted.displayName || message.quoted.username || message.quoted.name || displayFallback(message, quotedId) });
    }

    const unique = [];
    const seen = new Set();
    for (const candidate of candidates) {
        const clean = cleanJid(String(candidate.id || ""));
        if (!clean || seen.has(clean)) continue;
        seen.add(clean);
        unique.push({ id: clean, name: candidate.name || displayFallback(message, clean) });
    }

    if (unique.length >= 2) {
        return unique.slice(0, 2);
    }

    if (unique.length === 1) {
        const author = {
            id: cleanJid(String(message.userId || "")),
            name: message.displayName || message.username || message.sender?.displayName || message.sender?.username || "Você"
        };
        return [author, unique[0]];
    }

    return null;
}

function buildCasalCaption(targetA, targetB, percentage, platform) {
    const aLabel = formatTargetLabel({ platform }, String(targetA.id || ""), targetA.name || "usuário");
    const bLabel = formatTargetLabel({ platform }, String(targetB.id || ""), targetB.name || "usuário");
    const profile = getTestInfo("casal");
    const result = getResultFor(profile, percentage);
    const flavor = getFlavorFor("casal", percentage);

    return `${profile.title}\n\n「 ${aLabel} 」 x 「 ${bLabel} 」 = ❰ ${percentage}% ❱ compatíveis ${profile.emoji}\n\n${result}\n${flavor}`;
}

function buildCasalMentions(message, pair) {
    if (message.platform !== "whatsapp") return undefined;
    const uniqueIds = Array.from(new Set(pair.map(candidate => cleanJid(String(candidate.id || "")).trim()).filter(Boolean)));
    return uniqueIds.length ? uniqueIds : undefined;
}

function buildMentions(message, target) {
    if (message.platform !== "whatsapp") return undefined;
    const uniqueIds = Array.from(new Set([
        cleanJid(String(message.userId || "")),
        cleanJid(String(target.id || ""))
    ].filter(Boolean)));

    return uniqueIds.length ? uniqueIds : undefined;
}

function help(message) {
    const prefix = message.prefix || "!";
    return [
        "🧪 *TESTES ALEATÓRIOS*",
        "",
        "Testes disponíveis:",
        getSupportedList().replace(/, /g, "\n"),
        "",
        `Adicione \`@membro\` ou responda a uma mensagem para testar outra pessoa.`
    ].join("\n");
}
