const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const catalogStore = require("./rpgMaker");
const rpgPlayer = require("./rpgPlayer");

const COMPONENT_CONTEXT = Symbol.for("satbot.componentMessageContext");
const CARD_WIDTH = 1200;
const CARD_HEIGHT = 675;
const PORTRAIT_WIDTH = 420;
const PORTRAIT_HEIGHT = 555;
const PAGE_SIZE = 10;
const RARITY_COLORS = Object.freeze({
    comum: "#b9d5e8",
    incomum: "#68d391",
    raro: "#67b7ff",
    epico: "#bd8cff",
    lendario: "#f4c66b"
});
const DECORATIVE_STAT_BARS = Object.freeze({
    hp: { color: "#f07178", width: 218 },
    mana: { color: "#63b9ff", width: 184 },
    stamina: { color: "#63d6a0", width: 202 },
    agilidade: { color: "#b18aff", width: 158 }
});

function getStores(message) {
    const centralAccounts = message.functions?.centralAccounts || global.centralAccounts;
    if (!centralAccounts || typeof centralAccounts.findByPlatform !== "function") {
        throw new Error("O sistema de Contas Centrais não está disponível.");
    }
    const central = centralAccounts.findByPlatform(message.platform, message.userId);
    if (!central) throw new Error("Não encontrei sua Conta Central. Tente novamente em instantes.");
    return { centralAccounts, central };
}

function escapeXml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escapeMarkdown(value) {
    return String(value ?? "").replace(/[\\`*_{}\[\]()#+\-.!<>|~]/g, "\\$&");
}

function fitText(value, maxLength) {
    const characters = Array.from(String(value ?? ""));
    if (characters.length <= maxLength) return characters.join("");
    return `${characters.slice(0, maxLength - 1).join("")}…`;
}

function getMoveEntries(character, catalog) {
    const moveIds = character.podeClonarGolpes
        ? [character.golpeClonagemId]
        : character.golpesPermanentes;
    return moveIds.map(id => catalog.golpes.find(move => move.id === id)).filter(Boolean);
}

function getCharacterImagePath(character) {
    const file = character.media?.[0]?.file;
    if (typeof file !== "string" || path.basename(file) !== file) {
        throw new Error(`A imagem do personagem ${character.id} tem uma referência inválida.`);
    }
    const imagePath = path.resolve(catalogStore.MEDIA_DIR, file);
    const mediaRoot = `${path.resolve(catalogStore.MEDIA_DIR)}${path.sep}`;
    if (!imagePath.startsWith(mediaRoot)) {
        throw new Error(`A imagem do personagem ${character.id} está fora da pasta de mídias.`);
    }
    return imagePath;
}

function renderStatCard(label, value, key, left, top) {
    const bar = DECORATIVE_STAT_BARS[key];
    return `<rect x="${left}" y="${top}" width="276" height="86" rx="16" fill="#0b1b2a" stroke="#41607a"/>
<text x="${left + 22}" y="${top + 29}" fill="#94b7ce" font-family="Arial,Segoe UI,sans-serif" font-size="13px" font-weight="800" letter-spacing="1">${label}</text>
<rect x="${left + 22}" y="${top + 43}" width="232" height="10" rx="5" fill="#233d52"/>
<rect x="${left + 22}" y="${top + 43}" width="${bar.width}" height="10" rx="5" fill="${bar.color}"/>
<text x="${left + 22}" y="${top + 78}" fill="#f2f8ff" font-family="Arial,Segoe UI,sans-serif" font-size="25px" font-weight="800">${escapeXml(value)}</text>`;
}

async function renderCharacterCard(character, catalog, imageBuffer = null) {
    const portraitSource = imageBuffer || await fs.promises.readFile(getCharacterImagePath(character));
    const rarityColor = RARITY_COLORS[character.raridade] || RARITY_COLORS.comum;
    const rarity = catalogStore.RARITY_LABELS[character.raridade] || character.raridade;
    const weaknesses = character.fraquezas
        .map(id => catalog.fraquezas.find(entry => entry.id === id)?.nome)
        .filter(Boolean)
        .join(" · ") || "Nenhuma";
    const affinities = (character.afinidades || [])
        .map(id => catalog.fraquezas.find(entry => entry.id === id)?.nome)
        .filter(Boolean)
        .join(" · ") || "Nenhuma";
    const moves = getMoveEntries(character, catalog).slice(0, 4);
    const moveRows = moves.map((move, index) => {
        const top = 504 + index * 29;
        return `<text x="550" y="${top}" fill="#eaf7ff" font-family="Arial,Segoe UI,sans-serif" font-size="17px" font-weight="700">${escapeXml(fitText(move.nome, 29))}</text>
<text x="1105" y="${top}" fill="#93b9d2" font-family="Arial,Segoe UI,sans-serif" font-size="14px" font-weight="700" text-anchor="end">NÍVEL ${escapeXml(move.nivelDesbloqueio)}</text>`;
    }).join("");
    const additionalMoves = getMoveEntries(character, catalog).length - moves.length;
    const extraMoves = additionalMoves > 0
        ? `<text x="550" y="615" fill="#93b9d2" font-family="Arial,Segoe UI,sans-serif" font-size="13px">+ ${additionalMoves} golpe(s)</text>`
        : "";
    const svg = `<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="card-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#132b42"/><stop offset=".58" stop-color="#0d1b2b"/><stop offset="1" stop-color="#17223a"/></linearGradient>
  <linearGradient id="card-panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b344c"/><stop offset="1" stop-color="#122235"/></linearGradient>
  <radialGradient id="ice-glow"><stop offset="0" stop-color="#85d7ff" stop-opacity=".2"/><stop offset="1" stop-color="#85d7ff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#card-bg)"/>
<circle cx="1110" cy="55" r="330" fill="url(#ice-glow)"/>
<circle cx="35" cy="650" r="260" fill="#7651bd" opacity=".12"/>
<rect x="22" y="22" width="1156" height="631" rx="32" fill="#07111d" opacity=".72"/>
<rect x="34" y="34" width="1132" height="607" rx="28" fill="url(#card-panel)" stroke="#6ea6c7" stroke-opacity=".48" stroke-width="2"/>
<rect x="482" y="66" width="2" height="535" fill="#a2d9f3" opacity=".25"/>
<text x="535" y="88" fill="${rarityColor}" font-family="Arial,Segoe UI,sans-serif" font-size="15px" font-weight="800" letter-spacing="2">NÍVEL DE RARIDADE: ${escapeXml(String(rarity).toUpperCase())}</text>
<text x="535" y="153" fill="#f3f8ff" font-family="Arial,Segoe UI,sans-serif" font-size="45px" font-weight="800">${escapeXml(fitText(character.nome, 25))}</text>
<text x="535" y="200" fill="#a9c5d8" font-family="Arial,Segoe UI,sans-serif" font-size="13px" font-weight="700">BASE: ${escapeXml(fitText(character.base || "Sem base", 40))}</text>
<text x="1105" y="200" fill="#a9c5d8" font-family="Arial,Segoe UI,sans-serif" font-size="13px" font-weight="700" text-anchor="end">ID ${escapeXml(character.id)}</text>
<g>
  ${renderStatCard("HP", character.hp, "hp", 535, 235)}
  ${renderStatCard("MANA", character.mana, "mana", 829, 235)}
  ${renderStatCard("STAMINA", character.stamina, "stamina", 535, 337)}
  ${renderStatCard("AGILIDADE", character.agilidade, "agilidade", 829, 337)}
</g>
<text x="535" y="457" fill="#94b7ce" font-family="Arial,Segoe UI,sans-serif" font-size="13px" font-weight="800" letter-spacing="1">FRAQUEZAS</text>
<text x="675" y="457" fill="#eaf7ff" font-family="Arial,Segoe UI,sans-serif" font-size="15px" font-weight="700">${escapeXml(fitText(weaknesses, 24))}</text>
<text x="890" y="457" fill="#94b7ce" font-family="Arial,Segoe UI,sans-serif" font-size="13px" font-weight="800" letter-spacing="1">AFINIDADES</text>
<text x="1020" y="457" fill="#eaf7ff" font-family="Arial,Segoe UI,sans-serif" font-size="15px" font-weight="700">${escapeXml(fitText(affinities, 14))}</text>
<text x="535" y="484" fill="#8fcee9" font-family="Arial,Segoe UI,sans-serif" font-size="13px" font-weight="800" letter-spacing="2">GOLPES</text>
${moveRows}
${extraMoves}
<text x="1088" y="635" fill="#90aabe" font-family="Arial,Segoe UI,sans-serif" font-size="12px" font-weight="700" text-anchor="end">${character.raridade === "comum" ? "ELEGÍVEL COMO PERSONAGEM INICIAL" : "PERSONAGEM DO CATÁLOGO GLOBAL"}</text>
</svg>`;
    const portrait = await sharp(portraitSource)
        .rotate()
        .resize(PORTRAIT_WIDTH, PORTRAIT_HEIGHT, { fit: "cover", position: "attention" })
        .png()
        .toBuffer();
    const mask = Buffer.from(
        `<svg width="${PORTRAIT_WIDTH}" height="${PORTRAIT_HEIGHT}" xmlns="http://www.w3.org/2000/svg"><rect width="${PORTRAIT_WIDTH}" height="${PORTRAIT_HEIGHT}" rx="22" fill="white"/></svg>`
    );
    const roundedPortrait = await sharp(portrait)
        .composite([{ input: mask, blend: "dest-in" }])
        .png()
        .toBuffer();
    return sharp(Buffer.from(svg))
        .composite([
            { input: roundedPortrait, left: 52, top: 60 },
            {
                input: Buffer.from(`<svg width="${PORTRAIT_WIDTH + 8}" height="${PORTRAIT_HEIGHT + 8}" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="${PORTRAIT_WIDTH + 4}" height="${PORTRAIT_HEIGHT + 4}" rx="25" fill="none" stroke="${rarityColor}" stroke-opacity=".9" stroke-width="3"/></svg>`),
                left: 48,
                top: 56
            }
        ])
        .png()
        .toBuffer();
}

function makeCardComponents(
    platform,
    character,
    returnCommand = "rpgcatalogo",
    returnPage = 1,
    allowInitialChoice = false,
    { returnBaseIndex = null, basesPage = 1, returnToBases = false } = {}
) {
    const backId = returnBaseIndex !== null
        ? `${returnCommand}:backbase:${returnBaseIndex}:${returnPage}:${basesPage}`
        : returnToBases
            ? `${returnCommand}:basespage:${basesPage}`
            : `${returnCommand}:back:${returnPage}`;
    const chooseId = `rpgcatalogo:initial:${character.id}`;
    const backLabel = returnBaseIndex !== null || returnToBases
        ? "Voltar às bases"
        : "Voltar à lista";
    if (platform === "discord") {
        const components = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(backId)
                    .setLabel(backLabel)
                    .setStyle(ButtonStyle.Secondary)
            )
        ];
        if (allowInitialChoice) {
            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(chooseId)
                    .setLabel("Escolher como inicial")
                    .setStyle(ButtonStyle.Primary)
            ));
        }
        return { components };
    }
    if (platform === "telegram") {
        const inlineKeyboard = [[{
            text: `⬅️ ${backLabel}`,
            callback_data: backId
        }]];
        if (allowInitialChoice) {
            inlineKeyboard.push([{
                text: "🎁 Escolher como inicial",
                callback_data: chooseId
            }]);
        }
        return {
            reply_markup: { inline_keyboard: inlineKeyboard }
        };
    }
    return {};
}

async function sendCharacterCard(message, character, catalog, options = {}) {
    const image = await renderCharacterCard(character, catalog);
    const returnCommand = options.returnCommand || "rpgcatalogo";
    const returnPage = options.returnPage || 1;
    const allowInitialChoice = options.allowInitialChoice === true;
    const backCommand = options.returnBaseIndex !== undefined && options.returnBaseIndex !== null
        ? `!rpgcatalogo base ${options.returnBaseIndex} ${returnPage}`
        : options.returnToBases
            ? `!rpgcatalogo ${options.basesPage || 1}`
            : `!${returnCommand} ${returnPage}`;
    let caption = options.caption || formatCharacterCaption(message.platform, character);
    if (message.platform === "discord") {
        caption += `\n↩️ **Voltar:** \`${escapeMarkdown(backCommand)}\``;
        if (allowInitialChoice) caption += `\n🎁 **Inicial:** \`!rpgcatalogo escolher ${character.id}\``;
    } else if (message.platform === "telegram") {
        caption += `\n↩️ <b>Voltar:</b> <code>${escapeHtml(backCommand)}</code>`;
        if (allowInitialChoice) caption += `\n🎁 <b>Inicial:</b> <code>!rpgcatalogo escolher ${character.id}</code>`;
    } else {
        caption += `\n↩️ *Voltar:* \`${backCommand}\``;
        if (allowInitialChoice) caption += `\n🎁 *Inicial:* \`!rpgcatalogo escolher ${character.id}\``;
    }
    const payload = {
        image,
        fileName: `rpg-personagem-${character.id}.png`,
        caption
    };
    if (message.platform === "telegram") payload.parse_mode = "HTML";
    Object.assign(payload, makeCardComponents(
        message.platform,
        character,
        returnCommand,
        returnPage,
        allowInitialChoice,
        options
    ));
    if (typeof message.replyImg !== "function") {
        throw new Error("Este canal não permite enviar cards de personagem.");
    }
    return message.replyImg(payload);
}

function characterDescription(character, save, catalog) {
    return save.learnedMoveIds
        .map(id => catalog.golpes.find(move => move.id === id)?.nome || `ID ${id}`)
        .join(", ") || "nenhum ainda";
}

function parsePage(args = []) {
    let value = args[0];
    if (normalizeSearch(value) === "pagina" || normalizeSearch(value) === "page") {
        value = args[1];
    }
    if (value === undefined) return 1;
    const page = Number(value);
    if (!Number.isInteger(page) || page < 1) {
        throw new Error("Informe um número de página válido, começando em 1.");
    }
    return page;
}

function makeBasePageComponents(platform, commandName, page, totalPages, pageItems) {
    if (platform === "discord") {
        const rows = [];
        for (let index = 0; index < pageItems.length; index += 5) {
            rows.push(new ActionRowBuilder().addComponents(
                ...pageItems.slice(index, index + 5).map(base =>
                    new ButtonBuilder()
                        .setCustomId(`${commandName}:base:${base.id}:${page}`)
                        .setLabel(`${base.id} · ${fitText(base.name, 70)}`.slice(0, 80))
                        .setStyle(ButtonStyle.Primary)
                )
            ));
        }
        const navigation = [];
        if (page > 1) {
            navigation.push(new ButtonBuilder()
                .setCustomId(`${commandName}:basepage:${page - 1}`)
                .setLabel("Bases anteriores")
                .setStyle(ButtonStyle.Secondary));
        }
        if (page < totalPages) {
            navigation.push(new ButtonBuilder()
                .setCustomId(`${commandName}:basepage:${page + 1}`)
                .setLabel("Mais bases")
                .setStyle(ButtonStyle.Secondary));
        }
        if (navigation.length) rows.push(new ActionRowBuilder().addComponents(...navigation));
        return { components: rows };
    }
    if (platform === "telegram") {
        const keyboard = pageItems.map(base => [{
            text: `${base.id} · ${fitText(base.name, 50)}`.slice(0, 60),
            callback_data: `${commandName}:base:${base.id}:${page}`
        }]);
        const navigation = [];
        if (page > 1) {
            navigation.push({
                text: "⬅️ Bases anteriores",
                callback_data: `${commandName}:basepage:${page - 1}`
            });
        }
        if (page < totalPages) {
            navigation.push({
                text: "Mais bases ➡️",
                callback_data: `${commandName}:basepage:${page + 1}`
            });
        }
        if (navigation.length) keyboard.push(navigation);
        return keyboard.length ? { reply_markup: { inline_keyboard: keyboard } } : {};
    }
    return {};
}

function makePageComponents(platform, commandName, page, totalPages, viewableCharacters = [], catalogContext = null) {
    const characterPageId = catalogContext
        ? `${commandName}:characterpage:${catalogContext.baseIndex}:`
        : `${commandName}:page:`;
    const viewId = character => catalogContext
        ? `${commandName}:view:${character.id}:${page}:${catalogContext.baseIndex}:${catalogContext.basesPage}`
        : `${commandName}:view:${character.id}:${page}`;
    if (platform === "discord") {
        const rows = [];
        for (let index = 0; index < viewableCharacters.length; index += 5) {
            rows.push(new ActionRowBuilder().addComponents(
                ...viewableCharacters.slice(index, index + 5).map(character =>
                    new ButtonBuilder()
                        .setCustomId(viewId(character))
                        .setLabel(`${character.id} · ${fitText(character.nome, 70)}`.slice(0, 80))
                        .setStyle(ButtonStyle.Primary)
                )
            ));
        }
        const navigation = [];
        if (page > 1) {
            navigation.push(new ButtonBuilder()
                .setCustomId(`${characterPageId}${page - 1}${catalogContext ? `:${catalogContext.basesPage}` : ""}`)
                .setLabel("Página anterior")
                .setStyle(ButtonStyle.Secondary));
        }
        if (page < totalPages) {
            navigation.push(new ButtonBuilder()
                .setCustomId(`${characterPageId}${page + 1}${catalogContext ? `:${catalogContext.basesPage}` : ""}`)
                .setLabel("Próxima página")
                .setStyle(ButtonStyle.Secondary));
        }
        if (navigation.length) rows.push(new ActionRowBuilder().addComponents(...navigation));
        if (catalogContext) {
            rows.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`${commandName}:basespage:${catalogContext.basesPage}`)
                    .setLabel("Voltar às bases")
                    .setStyle(ButtonStyle.Secondary)
            ));
        }
        return { components: rows };
    }
    if (platform === "telegram") {
        const keyboard = viewableCharacters.map(character => [{
            text: `${character.id} · ${fitText(character.nome, 50)}`.slice(0, 60),
            callback_data: viewId(character)
        }]);
        const navigation = [];
        if (page > 1) {
            navigation.push({
                text: "⬅️ Anterior",
                callback_data: `${characterPageId}${page - 1}${catalogContext ? `:${catalogContext.basesPage}` : ""}`
            });
        }
        if (page < totalPages) {
            navigation.push({
                text: "Próxima ➡️",
                callback_data: `${characterPageId}${page + 1}${catalogContext ? `:${catalogContext.basesPage}` : ""}`
            });
        }
        if (navigation.length) keyboard.push(navigation);
        if (catalogContext) {
            keyboard.push([{
                text: "⬅️ Voltar às bases",
                callback_data: `${commandName}:basespage:${catalogContext.basesPage}`
            }]);
        }
        return keyboard.length ? { reply_markup: { inline_keyboard: keyboard } } : {};
    }
    return {};
}

function makePagedResponse({
    platform,
    commandName,
    title,
    items,
    page,
    renderItem,
    renderPage,
    viewableCharacters = [],
    componentBuilder,
    catalogContext,
    metadata = {},
    emptyMessage
}) {
    const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    if (page > totalPages) {
        throw new Error(`Essa página não existe. O total disponível é ${totalPages}.`);
    }
    const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const lines = renderPage
        ? renderPage(pageItems)
        : pageItems.map(renderItem);
    const text = [
        title,
        `Página ${page}/${totalPages}`,
        "",
        ...(lines.length ? lines : [emptyMessage || "Nenhum personagem encontrado."])
    ].join("\n");
    const buttons = componentBuilder
        ? componentBuilder({ page, totalPages, pageItems })
        : makePageComponents(platform, commandName, page, totalPages, viewableCharacters, catalogContext);
    return { text, title, lines, ...buttons, page, totalPages, ...metadata };
}

function getPageInstructions(platform, commandName, paged) {
    const { mode = null, baseIndex = null, page = 1, basesPage = 1 } = paged;
    const catalogCommand = commandName === "rpginicial" ? "rpgcatalogo" : commandName;
    if (platform === "whatsapp") {
        if (catalogCommand === "rpgcatalogo") {
            if (mode === "characters") {
                return `Outra página: !rpgcatalogo base ${baseIndex} <página>. Card: !rpgcatalogo ver <id> base ${baseIndex} pagina ${page}. Voltar às bases: !rpgcatalogo ${basesPage}.`;
            }
            return `Escolher uma base: !rpgcatalogo base <número>. Próxima página: !rpgcatalogo <página>.`;
        }
        return `Para abrir outra página: !${catalogCommand} <página>. Card: !rpgver <id>.`;
    }
    if (catalogCommand === "rpgcatalogo") {
        if (mode === "characters") {
            return "Selecione um personagem para abrir o card. Use Voltar às bases para escolher outra base; personagens comuns podem ser escolhidos como inicial.";
        }
        return "Selecione uma base para ver seus personagens.";
    }
    return "Use os botões para abrir um card ou mudar de página.";
}

function formatPagedLine(line, platform, mode = null) {
    if (!line) return "";
    if (mode === "bases") {
        const match = line.match(/^(\d+) · (.+)$/);
        if (match) {
            if (platform === "discord") return `🎬 **Base ${match[1]} · ${escapeMarkdown(match[2])}**`;
            if (platform === "telegram") return `🎬 <b>Base ${match[1]} · ${escapeHtml(match[2])}</b>`;
            return `🎬 *Base ${match[1]}:* ${match[2]}`;
        }
    }
    if (line.startsWith("📂 BASE:")) {
        const base = line.slice("📂 BASE:".length).trim();
        if (platform === "discord") return `**📂 BASE: ${escapeMarkdown(base)}**`;
        if (platform === "telegram") return `<b>📂 BASE: ${escapeHtml(base)}</b>`;
        return `📂 *BASE:* ${base}`;
    }
    if (platform === "discord") return `• ${escapeMarkdown(line)}`;
    if (platform === "telegram") return `• ${escapeHtml(line)}`;
    return `• ${line}`;
}

function formatPagedPayload(message, paged, commandName, notice = "") {
    const platform = message.platform;
    const instructions = getPageInstructions(platform, commandName, paged);
    const formattedLines = paged.lines.map(line => formatPagedLine(line, platform, paged.mode));
    if (platform === "discord") {
        const description = [
            `*📄 Página ${paged.page}/${paged.totalPages}*`,
            "",
            ...formattedLines,
            notice ? `\n${escapeMarkdown(notice)}` : "",
            `\n_${escapeMarkdown(instructions)}_`
        ].join("\n");
        const color = paged.mode === "bases" ? 0x7c5ce7 : paged.mode === "characters" ? 0x2787d4 : 0x28a879;
        return {
            embed: {
                color,
                title: paged.title,
                description: fitText(description, 4000),
                footer: { text: "SatBot RPG · Catálogo global" }
            },
            components: paged.components || []
        };
    }
    if (platform === "telegram") {
        const text = [
            `<b>${escapeHtml(paged.title)}</b>`,
            `<i>📄 Página ${paged.page}/${paged.totalPages}</i>`,
            "",
            ...formattedLines,
            notice ? `\n<i>${escapeHtml(notice)}</i>` : "",
            `\n<i>${escapeHtml(instructions)}</i>`
        ].join("\n");
        return {
            text: fitText(text, 4000),
            parse_mode: "HTML",
            ...(paged.reply_markup ? { reply_markup: paged.reply_markup } : {})
        };
    }
    return {
        text: [
            `*${paged.title}*`,
            `📄 *Página ${paged.page}/${paged.totalPages}*`,
            "",
            ...formattedLines,
            notice ? `\n_${notice}_` : "",
            `\n_${instructions}_`
        ].join("\n")
    };
}

function formatSimplePayload(message, title, lines, color = 0x5865f2) {
    if (message.platform === "discord") {
        return {
            embed: {
                color,
                title,
                description: lines.map(line => `• ${escapeMarkdown(line)}`).join("\n"),
                footer: { text: "SatBot RPG · Progresso global" }
            }
        };
    }
    if (message.platform === "telegram") {
        return {
            text: `<b>${escapeHtml(title)}</b>\n\n${lines.map(line => `• ${escapeHtml(line)}`).join("\n")}`,
            parse_mode: "HTML"
        };
    }
    return {
        text: `*${title}*\n\n${lines.map(line => `• ${line}`).join("\n")}`
    };
}

function formatCharacterCaption(platform, character) {
    const rarity = catalogStore.RARITY_LABELS[character.raridade] || character.raridade;
    const base = character.base || "Sem base";
    if (platform === "discord") {
        return `🎴 **${escapeMarkdown(character.nome)}**\n✨ **${escapeMarkdown(rarity)}** · 🎬 ${escapeMarkdown(base)} · 🆔 \`${character.id}\``;
    }
    if (platform === "telegram") {
        return `🎴 <b>${escapeHtml(character.nome)}</b>\n✨ <b>${escapeHtml(rarity)}</b> · 🎬 ${escapeHtml(base)} · 🆔 <code>${character.id}</code>`;
    }
    return `🎴 *Personagem:* ${character.nome}\n✨ *Raridade:* ${rarity} · 🎬 *Base:* ${base} · 🆔 ${character.id}`;
}

function sortCharactersByBase(characters) {
    return [...characters].sort((left, right) =>
        normalizeSearch(left.base || "Sem base").localeCompare(
            normalizeSearch(right.base || "Sem base"),
            "pt-BR"
        ) || left.id - right.id
    );
}

function getCatalogBases(catalog) {
    const basesByKey = new Map();
    for (const character of catalog.personagens) {
        const name = String(character.base || "Sem base").trim();
        const key = normalizeSearch(name);
        if (!basesByKey.has(key)) basesByKey.set(key, name);
    }
    return [...basesByKey.values()]
        .sort((left, right) => normalizeSearch(left).localeCompare(normalizeSearch(right), "pt-BR"))
        .map((name, index) => ({ id: index + 1, name }));
}

function findCatalogBase(catalog, baseId) {
    const id = Number(baseId);
    if (!Number.isInteger(id) || id < 1) {
        throw new Error("Informe o número da base mostrado na lista.");
    }
    const base = getCatalogBases(catalog).find(entry => entry.id === id);
    if (!base) throw new Error("Essa base não existe no catálogo.");
    return base;
}

function renderCatalogPage(characters, catalog) {
    const lines = [];
    let previousBase = null;
    for (const character of characters) {
        const base = String(character.base || "Sem base").trim();
        const baseKey = normalizeSearch(base);
        if (baseKey !== previousBase) {
            if (lines.length) lines.push("");
            lines.push(`📂 BASE: ${base}`);
            previousBase = baseKey;
        }
        const rarity = catalogStore.RARITY_LABELS[character.raridade] || character.raridade;
        lines.push(
            `${character.id} · ${character.nome} — ${rarity} | HP ${character.hp} · Mana ${character.mana} · Stamina ${character.stamina} · Agilidade ${character.agilidade}`
        );
    }
    return lines;
}

function getPagedAction(message, commandName, args = []) {
    const { centralAccounts, central } = getStores(message);
    const profile = centralAccounts.getRpgProfile(central.id);
    const catalog = catalogStore.readCatalog();

    if (commandName === "rpgcatalogo" || commandName === "rpginicial") {
        if (normalizeSearch(args[0]) === "base") {
            const base = findCatalogBase(catalog, args[1]);
            const items = sortCharactersByBase(catalog.personagens.filter(character =>
                normalizeSearch(character.base || "Sem base") === normalizeSearch(base.name)
            ));
            const page = parsePage(args.slice(2));
            const basesPage = args[3] === undefined ? 1 : parsePage([args[3]]);
            return makePagedResponse({
                platform: message.platform,
                commandName: "rpgcatalogo",
                title: "📚 PERSONAGENS DA BASE",
                items,
                page,
                renderPage: pageItems => renderCatalogPage(pageItems, catalog),
                viewableCharacters: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
                catalogContext: { baseIndex: base.id, basesPage },
                metadata: { mode: "characters", baseIndex: base.id, basesPage },
                emptyMessage: `Ainda não há personagens na base ${base.name}.`
            });
        }

        const items = getCatalogBases(catalog);
        const page = parsePage(args);
        return makePagedResponse({
            platform: message.platform,
            commandName: "rpgcatalogo",
            title: "📚 BASES DO CATÁLOGO RPG",
            items,
            page,
            renderItem: base => `${base.id} · ${base.name}`,
            componentBuilder: ({ page: currentPage, totalPages, pageItems }) =>
                makeBasePageComponents(message.platform, "rpgcatalogo", currentPage, totalPages, pageItems),
            metadata: { mode: "bases" },
            emptyMessage: "Ainda não há bases no catálogo."
        });
    }

    if (commandName === "rpgpersonagens") {
        const items = profile.characters;
        const page = parsePage(args);
        return makePagedResponse({
            platform: message.platform,
            commandName,
            title: "🧙 SEUS PERSONAGENS",
            items,
            page,
            renderItem: save => {
                const character = catalog.personagens.find(entry => entry.id === save.characterId);
                return character
                    ? `${character.id} · ${character.nome} — Base: ${character.base || "Sem base"} · nível ${save.level} · golpes: ${characterDescription(character, save, catalog)}`
                    : `ID ${save.characterId} · definição não encontrada no catálogo.`;
            },
            viewableCharacters: items
                .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
                .map(save => catalog.personagens.find(entry => entry.id === save.characterId))
                .filter(Boolean),
            emptyMessage: "Você ainda não possui personagens. Use !rpginicial para escolher o inicial."
        });
    }

    throw new Error("Não foi possível abrir essa lista do RPG.");
}

function normalizeSearch(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase()
        .trim();
}

function findCharacter(catalog, query) {
    const term = String(query || "").trim();
    if (!term) throw new Error("Informe o ID ou o nome do personagem. Exemplo: !rpgver 0");
    if (/^\d+$/.test(term)) {
        const byId = catalog.personagens.find(character => character.id === Number(term));
        if (byId) return byId;
        throw new Error("Não encontrei um personagem com esse ID.");
    }
    const normalized = normalizeSearch(term);
    const exact = catalog.personagens.filter(character => normalizeSearch(character.nome) === normalized);
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) throw new Error("Há mais de um personagem com esse nome. Use o ID.");
    const partial = catalog.personagens.filter(character => normalizeSearch(character.nome).includes(normalized));
    if (partial.length === 1) return partial[0];
    if (partial.length > 1) throw new Error("Esse nome corresponde a vários personagens. Use o ID.");
    throw new Error("Personagem não encontrado no catálogo.");
}

async function executeAction(message, action = "menu", args = []) {
    const { centralAccounts, central } = getStores(message);
    const profile = centralAccounts.getRpgProfile(central.id);
    const catalog = catalogStore.readCatalog();
    const displayName = central.name || message.displayName || message.userId;

    if (action === "menu") {
        return message.reply(formatSimplePayload(message, "🌐 RPG GLOBAL", [
            `👤 Conta Central: ${displayName}`,
            `⭐ XP de RPG: ${profile.xp}`,
            "📚 Catálogo: escolha uma base e depois um personagem para abrir o card.",
            "⌨️ !rpgcatalogo [página] · !rpgcatalogo base <número> [página]"
        ]));
    }

    if (action === "perfil") {
        const initial = profile.initialCharacterId === null
            ? "ainda não escolhido"
            : catalog.personagens.find(character => character.id === profile.initialCharacterId)?.nome || "indisponível";
        return message.reply(formatSimplePayload(message, "🌐 PERFIL RPG", [
            `👤 Conta Central: ${displayName}`,
            `⭐ XP de RPG: ${profile.xp}`,
            `🎁 Personagem inicial: ${initial}`,
            `🧙 Personagens possuídos: ${profile.characters.length}`
        ], 0xb68bff));
    }

    if (action === "personagens") {
        const paged = getPagedAction(message, "rpgpersonagens", args);
        return message.reply(formatPagedPayload(message, paged, "rpgpersonagens"));
    }

    if (action === "catalog") {
        const catalogAction = normalizeSearch(args[0]);
        if (catalogAction === "ver" || catalogAction === "abrir") {
            const baseMarker = args.findIndex((value, index) =>
                index > 1 && normalizeSearch(value) === "base"
            );
            const pageMarker = args.findIndex((value, index) =>
                index > 1 && normalizeSearch(value) === "pagina"
            );
            const firstMarker = [baseMarker, pageMarker].filter(index => index >= 0)
                .reduce((lowest, index) => Math.min(lowest, index), args.length);
            const characterQuery = args.slice(1, firstMarker).join(" ");
            const returnBase = baseMarker < 0 ? null : findCatalogBase(catalog, args[baseMarker + 1]);
            const returnPage = pageMarker < 0 ? 1 : parsePage(args.slice(pageMarker + 1));
            const character = findCharacter(catalog, characterQuery);
            if (returnBase && normalizeSearch(character.base || "Sem base") !== normalizeSearch(returnBase.name)) {
                throw new Error("Esse personagem não pertence à base informada.");
            }
            const canChooseInitial = profile.initialCharacterId === null &&
                rpgPlayer.getStartingCharacters(catalog).some(candidate => candidate.id === character.id);
            return sendCharacterCard(message, character, catalog, {
                allowInitialChoice: canChooseInitial,
                returnPage,
                returnBaseIndex: returnBase?.id ?? null,
                returnToBases: returnBase === null,
                basesPage: 1
            });
        }
        if (catalogAction === "escolher" || catalogAction === "inicial") {
            const { character } = await rpgPlayer.chooseInitialCharacter(
                centralAccounts,
                central.id,
                catalog,
                args[1]
            );
            return message.reply(formatSimplePayload(message, "🎉 Personagem inicial escolhido!", [
                `${character.nome} foi adicionado à sua conta RPG no nível 1.`
            ], 0x28a879));
        }
        const paged = getPagedAction(message, "rpgcatalogo", args);
        const initialNotice = profile.initialCharacterId === null
            ? ""
            : "Seu personagem inicial já foi escolhido; você ainda pode consultar os cards.";
        return message.reply(formatPagedPayload(message, paged, "rpgcatalogo", initialNotice));
    }

    if (action === "initial") {
        const selectionRequested = normalizeSearch(args[0]) === "escolher" ||
            normalizeSearch(args[0]) === "selecionar";
        if (selectionRequested) {
            const { character } = await rpgPlayer.chooseInitialCharacter(
                centralAccounts,
                central.id,
                catalog,
                args[1]
            );
            return message.reply(formatSimplePayload(message, "🎉 Personagem inicial escolhido!", [
                `${character.nome} foi adicionado à sua conta RPG no nível 1.`
            ], 0x28a879));
        }
        const paged = getPagedAction(message, "rpgcatalogo", args);
        const notice = profile.initialCharacterId === null
            ? ""
            : "Seu personagem inicial já foi escolhido; você ainda pode consultar os cards.";
        return message.reply(formatPagedPayload(message, paged, "rpgcatalogo", notice));
    }

    if (action === "view") {
        const character = findCharacter(catalog, args.join(" "));
        const canChooseInitial = profile.initialCharacterId === null &&
            rpgPlayer.getStartingCharacters(catalog).some(candidate => candidate.id === character.id);
        return sendCharacterCard(message, character, catalog, {
            allowInitialChoice: canChooseInitial,
            returnCommand: "rpgcatalogo",
            returnToBases: true
        });
    }

    throw new Error("Comando RPG desconhecido. Use !rpg para consultar os comandos disponíveis.");
}

async function execute(message, action, args = []) {
    try {
        return await executeAction(message, action, args);
    } catch (error) {
        return message.reply({ text: `❌ ${error.message}` });
    }
}

async function showCardFromInteraction(
    interaction,
    message,
    characterId,
    returnCommand,
    returnPage,
    returnContext = {}
) {
    const { central, centralAccounts } = getStores(message);
    const profile = centralAccounts.getRpgProfile(central.id);
    const catalog = catalogStore.readCatalog();
    const character = findCharacter(catalog, characterId);
    if (returnCommand === "rpgcatalogo" && returnContext.baseIndex != null) {
        const base = findCatalogBase(catalog, returnContext.baseIndex);
        if (normalizeSearch(character.base || "Sem base") !== normalizeSearch(base.name)) {
            throw new Error("Esse personagem não pertence à base selecionada.");
        }
    }
    const allowInitialChoice = profile.initialCharacterId === null &&
        rpgPlayer.getStartingCharacters(catalog).some(candidate => candidate.id === character.id);
    const image = await renderCharacterCard(character, catalog);
    const controls = makeCardComponents(
        message.platform,
        character,
        returnCommand,
        returnPage,
        allowInitialChoice,
        {
            returnBaseIndex: returnContext.baseIndex ?? null,
            basesPage: returnContext.basesPage || 1,
            returnToBases: returnCommand === "rpgcatalogo" && returnContext.baseIndex == null
        }
    );
    const caption = formatCharacterCaption(message.platform, character);

    if (interaction.callbackQuery) {
        await interaction.answerCbQuery();
        const options = {
            caption,
            parse_mode: "HTML",
            ...(controls.reply_markup ? { reply_markup: controls.reply_markup } : {})
        };
        const threadId = interaction.callbackQuery.message?.message_thread_id;
        if (threadId) options.message_thread_id = threadId;
        if (typeof interaction.replyWithPhoto !== "function") {
            throw new Error("Não foi possível enviar o card neste chat do Telegram.");
        }
        return interaction.replyWithPhoto({ source: image }, options);
    }

    const fileName = `rpg-personagem-${character.id}.png`;
    const embed = new EmbedBuilder()
        .setColor(Number.parseInt((RARITY_COLORS[character.raridade] || RARITY_COLORS.comum).slice(1), 16))
        .setTitle(character.nome)
        .setDescription(`✨ **${escapeMarkdown(catalogStore.RARITY_LABELS[character.raridade] || character.raridade)}** · 🎬 **Base:** ${escapeMarkdown(character.base || "Sem base")}`)
        .setImage(`attachment://${fileName}`)
        .setFooter({ text: `ID ${character.id} · Catálogo RPG global` });
    return interaction.reply({
        embeds: [embed],
        files: [{ attachment: image, name: fileName }],
        components: controls.components || [],
        ephemeral: true
    });
}

async function handleInteraction(interaction, acceptedPrefixes = ["rpgcatalogo"]) {
    const componentId = String(interaction.customId || interaction.callbackQuery?.data || "");
    const [prefix, action, id, pageValue, baseIndexValue, basesPageValue] = componentId.split(":");
    if (!acceptedPrefixes.includes(prefix) ||
        !["initial", "page", "view", "back", "base", "basepage", "characterpage", "basespage", "backbase"].includes(action)) return false;

    const message = interaction[COMPONENT_CONTEXT];
    if (!message) return true;

    let callbackAcknowledged = false;
    const replyError = async error => {
        const response = `❌ ${error.message}`;
        if (interaction.callbackQuery) {
            if (!callbackAcknowledged) {
                return interaction.answerCbQuery(response.slice(0, 190), { show_alert: true });
            }
            return interaction.reply(response);
        }
        if (interaction.replied || interaction.deferred) {
            return interaction.followUp({ content: response, ephemeral: true });
        }
        return interaction.reply({ content: response, ephemeral: true });
    };

    const updatePagedList = async (paged, commandName) => {
        const payload = formatPagedPayload(message, paged, commandName);
        if (interaction.callbackQuery) {
            await interaction.answerCbQuery();
            callbackAcknowledged = true;
            return interaction.editMessageText(payload.text, {
                parse_mode: payload.parse_mode,
                reply_markup: payload.reply_markup || { inline_keyboard: [] }
            });
        }
        return interaction.update({
            content: null,
            embeds: [new EmbedBuilder(payload.embed)],
            components: payload.components || []
        });
    };

    if (action === "view") {
        try {
            const returnPage = parsePage([pageValue]);
            const returnCommand = prefix === "rpgpersonagens"
                ? "rpgpersonagens"
                : "rpgcatalogo";
            return await showCardFromInteraction(
                interaction,
                message,
                id,
                returnCommand,
                returnPage,
                {
                    baseIndex: baseIndexValue ? Number(baseIndexValue) : null,
                    basesPage: basesPageValue ? Number(basesPageValue) : 1
                }
            );
        } catch (error) {
            return replyError(error);
        }
    }

    if (action === "base" || action === "basepage" || action === "characterpage" || action === "basespage") {
        try {
            let paged;
            if (action === "base") {
                paged = getPagedAction(message, "rpgcatalogo", ["base", id, "1", pageValue]);
            } else if (action === "characterpage") {
                paged = getPagedAction(message, "rpgcatalogo", ["base", id, pageValue, baseIndexValue]);
            } else {
                paged = getPagedAction(message, "rpgcatalogo", [id]);
            }
            return await updatePagedList(paged, "rpgcatalogo");
        } catch (error) {
            return replyError(error);
        }
    }

    if (action === "backbase") {
        try {
            const paged = getPagedAction(message, "rpgcatalogo", [
                "base",
                id,
                pageValue,
                baseIndexValue
            ]);
            const payload = formatPagedPayload(message, paged, "rpgcatalogo");
            if (interaction.callbackQuery) {
                await interaction.answerCbQuery();
                callbackAcknowledged = true;
                await interaction.editMessageCaption("⬅️ Voltando aos personagens…", {
                    reply_markup: { inline_keyboard: [] }
                });
                const sourceMessage = interaction.callbackQuery.message;
                const options = {
                    parse_mode: payload.parse_mode,
                    ...(payload.reply_markup ? { reply_markup: payload.reply_markup } : {})
                };
                const threadId = sourceMessage?.message_thread_id;
                if (threadId) options.message_thread_id = threadId;
                return interaction.telegram.sendMessage(sourceMessage.chat.id, payload.text, options);
            }
            return interaction.update({
                content: null,
                embeds: [new EmbedBuilder(payload.embed)],
                components: payload.components || []
            });
        } catch (error) {
            return replyError(error);
        }
    }

    if (action === "back") {
        try {
            const page = parsePage([id]);
            const returnCommand = prefix === "rpgpersonagens"
                ? "rpgpersonagens"
                : "rpgcatalogo";
            const paged = getPagedAction(message, returnCommand, [page]);
            const payload = formatPagedPayload(message, paged, returnCommand);
            if (interaction.callbackQuery) {
                await interaction.answerCbQuery();
                callbackAcknowledged = true;
                await interaction.editMessageCaption("⬅️ Voltando à lista…", {
                    reply_markup: { inline_keyboard: [] }
                });
                const sourceMessage = interaction.callbackQuery.message;
                const options = {
                    parse_mode: payload.parse_mode,
                    ...(payload.reply_markup ? { reply_markup: payload.reply_markup } : {})
                };
                const threadId = sourceMessage?.message_thread_id;
                if (threadId) options.message_thread_id = threadId;
                return interaction.telegram.sendMessage(sourceMessage.chat.id, payload.text, options);
            }
            return interaction.update({
                content: null,
                embeds: [new EmbedBuilder(payload.embed)],
                components: payload.components || []
            });
        } catch (error) {
            return replyError(error);
        }
    }

    if (action === "page") {
        try {
            const commandName = prefix === "rpginicial" || prefix === "rpg"
                ? "rpgcatalogo"
                : prefix;
            const paged = getPagedAction(message, commandName, [id]);
            const payload = formatPagedPayload(message, paged, commandName);
            if (interaction.callbackQuery) {
                await interaction.answerCbQuery();
                callbackAcknowledged = true;
                return interaction.editMessageText(payload.text, {
                    parse_mode: payload.parse_mode,
                    reply_markup: payload.reply_markup || { inline_keyboard: [] }
                });
            }
            return interaction.update({
                content: null,
                embeds: [new EmbedBuilder(payload.embed)],
                components: payload.components || []
            });
        } catch (error) {
            return replyError(error);
        }
    }

    try {
        const { centralAccounts, central } = getStores(message);
        const catalog = catalogStore.readCatalog();
        const { character } = await rpgPlayer.chooseInitialCharacter(
            centralAccounts,
            central.id,
            catalog,
            id
        );
        const success = formatSimplePayload(message, "🎉 Personagem inicial escolhido!", [
            `${character.nome} foi adicionado à sua conta RPG no nível 1.`
        ], 0x28a879);
        if (interaction.callbackQuery) {
            await interaction.answerCbQuery();
            callbackAcknowledged = true;
            if (interaction.callbackQuery.message?.photo?.length) {
                return interaction.editMessageCaption(success.text, {
                    parse_mode: success.parse_mode,
                    reply_markup: { inline_keyboard: [] }
                });
            }
            return interaction.editMessageText(success.text, {
                parse_mode: success.parse_mode,
                reply_markup: { inline_keyboard: [] }
            });
        }
        return interaction.update({
            content: null,
            embeds: [new EmbedBuilder(success.embed)],
            components: []
        });
    } catch (error) {
        return replyError(error);
    }
}

module.exports = {
    execute,
    handleInteraction,
    _internals: {
        executeAction,
        findCharacter,
        makeCardComponents,
        makePagedResponse,
        makePageComponents,
        parsePage,
        renderCatalogPage,
        sortCharactersByBase,
        renderCharacterCard
    }
};
