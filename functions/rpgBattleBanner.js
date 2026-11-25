const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const catalogStore = require("./rpgMaker");

const BANNER_WIDTH = 860;
const BANNER_HEIGHT = 980;
const VICTORY_BANNER_HEIGHT = 610;
const CHALLENGE_BANNER_HEIGHT = 620;
const CARD_WIDTH = 796;
const CARD_HEIGHT = 118;
const PORTRAIT_WIDTH = 94;
const PORTRAIT_HEIGHT = 98;
const TEAM_SIZE = 3;

const STAT_COLORS = Object.freeze({
    hp: "#f07178",
    mana: "#63b9ff",
    stamina: "#63d6a0"
});

const REASON_LABELS = Object.freeze({
    team_defeated: "Por nocaute",
    effect_damage: "Por dano de efeito",
    surrender: "Por desistência",
    timeout: "Por tempo esgotado"
});

function escapeXml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function fitText(value, maxLength) {
    const chars = Array.from(String(value ?? ""));
    if (chars.length <= maxLength) return chars.join("");
    return `${chars.slice(0, Math.max(1, maxLength - 1)).join("")}…`;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function resolvePortraitPath(character) {
    const file = character?.media?.[0]?.file;
    if (typeof file !== "string" || !file || path.basename(file) !== file) return null;
    const resolved = path.resolve(catalogStore.MEDIA_DIR, file);
    const mediaRoot = `${path.resolve(catalogStore.MEDIA_DIR)}${path.sep}`;
    if (!resolved.startsWith(mediaRoot)) return null;
    return resolved;
}

async function loadPortraitBuffer(character, defeated) {
    const imagePath = resolvePortraitPath(character);
    if (!imagePath) return null;
    try {
        const source = await fs.promises.readFile(imagePath);
        let pipeline = sharp(source)
            .rotate()
            .resize(PORTRAIT_WIDTH, PORTRAIT_HEIGHT, { fit: "cover", position: "attention" });
        if (defeated) {
            pipeline = pipeline.modulate({ saturation: 0.2, brightness: 0.55 });
        }
        const resized = await pipeline.png().toBuffer();
        const mask = Buffer.from(
            `<svg width="${PORTRAIT_WIDTH}" height="${PORTRAIT_HEIGHT}" xmlns="http://www.w3.org/2000/svg"><rect width="${PORTRAIT_WIDTH}" height="${PORTRAIT_HEIGHT}" rx="12" fill="white"/></svg>`
        );
        return await sharp(resized)
            .composite([{ input: mask, blend: "dest-in" }])
            .png()
            .toBuffer();
    } catch {
        return null;
    }
}

function renderStatBar(label, currentValue, maxValue, color, x, baselineY, totalWidth) {
    const current = Math.max(0, Number(currentValue ?? 0));
    const max = Math.max(1, Number(maxValue ?? 1));
    const ratio = clamp(current / max, 0, 1);
    const labelWidth = 98;
    const valueWidth = 112;
    const barX = x + labelWidth;
    const barWidth = Math.max(40, totalWidth - labelWidth - valueWidth);
    const barY = baselineY - 14;
    const fillWidth = current <= 0 ? 0 : Math.max(6, Math.round(barWidth * ratio));
    const valueLabel = `${current}/${Math.max(0, Number(maxValue ?? 0))}`;

    return [
        `<text x="${x}" y="${baselineY}" fill="${color}" font-family="Arial,Segoe UI,sans-serif" font-size="16px" font-weight="800" letter-spacing="0.6">${escapeXml(label)}</text>`,
        `<rect x="${barX}" y="${barY}" width="${barWidth}" height="16" rx="8" fill="#172436"/>`,
        fillWidth > 0
            ? `<rect x="${barX}" y="${barY}" width="${fillWidth}" height="16" rx="8" fill="${color}"/>`
            : "",
        `<text x="${x + totalWidth}" y="${baselineY}" fill="#eef5ff" font-family="Arial,Segoe UI,sans-serif" font-size="18px" font-weight="800" text-anchor="end">${escapeXml(valueLabel)}</text>`
    ].join("");
}

function renderEmptySlot(x, y, slotNumber) {
    return [
        `<rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="16" fill="#0b1522" fill-opacity="0.55" stroke="#2c425c" stroke-width="2" stroke-dasharray="8 6"/>`,
        `<text x="${x + CARD_WIDTH / 2}" y="${y + CARD_HEIGHT / 2 - 2}" fill="#6e89a5" font-family="Arial,Segoe UI,sans-serif" font-size="18px" font-weight="800" text-anchor="middle">SLOT #${slotNumber}</text>`,
        `<text x="${x + CARD_WIDTH / 2}" y="${y + CARD_HEIGHT / 2 + 20}" fill="#4d647d" font-family="Arial,Segoe UI,sans-serif" font-size="14px" font-weight="600" text-anchor="middle">Espaço vazio na equipe</text>`
    ].join("");
}

function renderPortraitFallback(x, y, name, defeated, accentColor) {
    const initials = Array.from(String(name || "?"))
        .filter(char => /\S/.test(char))
        .slice(0, 2)
        .join("")
        .toUpperCase() || "?";
    return [
        `<rect x="${x}" y="${y}" width="${PORTRAIT_WIDTH}" height="${PORTRAIT_HEIGHT}" rx="12" fill="${defeated ? "#181d26" : "#162a42"}"/>`,
        `<text x="${x + PORTRAIT_WIDTH / 2}" y="${y + PORTRAIT_HEIGHT / 2 + 11}" fill="${defeated ? "#6c7687" : accentColor}" font-family="Arial,Segoe UI,sans-serif" font-size="32px" font-weight="800" text-anchor="middle">${escapeXml(initials)}</text>`
    ].join("");
}

function renderFighterSlot(fighter, {
    x,
    y,
    slotNumber,
    sideColor,
    isActor,
    isTarget,
    isWinner,
    hasPortrait
}) {
    if (!fighter) return renderEmptySlot(x, y, slotNumber);

    const hp = Math.max(0, Number(fighter.hp ?? 0));
    const defeated = hp <= 0;
    const borderColor = defeated
        ? "#4a5568"
        : isActor || isWinner
            ? "#f6c453"
            : isTarget
                ? "#f87171"
                : sideColor;
    const borderWidth = isActor || isTarget || isWinner ? 2.8 : 1.6;
    const cardFill = defeated ? "#0d141f" : "#112236";
    const portraitX = x + 12;
    const portraitY = y + 10;
    const infoX = x + 122;
    const infoWidth = CARD_WIDTH - 138;

    const tags = [];
    if (defeated) {
        tags.push({ label: "DERROTADO", bg: "#3b1d26", text: "#fda4af" });
    } else {
        if (isWinner) tags.push({ label: "CAMPEÃO", bg: "#3d3012", text: "#fcd34d" });
        if (isActor) tags.push({ label: "AGINDO", bg: "#3d3012", text: "#fcd34d" });
        if (isTarget) tags.push({ label: "ALVO", bg: "#3f1b24", text: "#fca5a5" });
    }
    for (const effect of (fighter.effects || []).slice(0, 2)) {
        tags.push({ label: fitText(effect.name, 14).toUpperCase(), bg: "#1b3350", text: "#93c5fd" });
    }

    let badgeRight = infoX + infoWidth - 68;
    const badgesSvg = tags.slice(0, 3).reverse().map(tag => {
        const width = Math.max(66, tag.label.length * 8 + 18);
        const bx = badgeRight - width;
        badgeRight = bx - 8;
        return [
            `<rect x="${bx}" y="${y + 11}" width="${width}" height="22" rx="11" fill="${tag.bg}"/>`,
            `<text x="${bx + width / 2}" y="${y + 26}" fill="${tag.text}" font-family="Arial,Segoe UI,sans-serif" font-size="12px" font-weight="800" text-anchor="middle">${escapeXml(tag.label)}</text>`
        ].join("");
    }).join("");

    const levelLabel = `Nv.${fighter.level ?? 1}`;
    const nameLabel = `#${slotNumber} ${fitText(fighter.name || "Personagem", 20)}`;

    return [
        `<rect x="${x}" y="${y}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="16" fill="${cardFill}" stroke="${borderColor}" stroke-width="${borderWidth}"/>`,
        !hasPortrait ? renderPortraitFallback(portraitX, portraitY, fighter.name, defeated, sideColor) : "",
        !hasPortrait ? `<rect x="${portraitX - 1}" y="${portraitY - 1}" width="${PORTRAIT_WIDTH + 2}" height="${PORTRAIT_HEIGHT + 2}" rx="13" fill="none" stroke="${borderColor}" stroke-opacity="0.85" stroke-width="2"/>` : "",
        !hasPortrait && defeated
            ? `<rect x="${portraitX}" y="${portraitY + PORTRAIT_HEIGHT - 22}" width="${PORTRAIT_WIDTH}" height="22" rx="6" fill="#090d14" fill-opacity="0.82"/><text x="${portraitX + PORTRAIT_WIDTH / 2}" y="${portraitY + PORTRAIT_HEIGHT - 7}" fill="#fda4af" font-family="Arial,Segoe UI,sans-serif" font-size="11px" font-weight="800" text-anchor="middle">DERROTADO</text>`
            : "",
        `<text x="${infoX}" y="${y + 29}" fill="${defeated ? "#8d99ae" : "#f3f8ff"}" font-family="Arial,Segoe UI,sans-serif" font-size="22px" font-weight="800">${escapeXml(nameLabel)}</text>`,
        badgesSvg,
        `<text x="${infoX + infoWidth}" y="${y + 29}" fill="#93b9d2" font-family="Arial,Segoe UI,sans-serif" font-size="17px" font-weight="800" text-anchor="end">${escapeXml(levelLabel)}</text>`,
        renderStatBar("HP", fighter.hp, fighter.maxHp, STAT_COLORS.hp, infoX, y + 57, infoWidth),
        renderStatBar("MANA", fighter.mana, fighter.maxMana, STAT_COLORS.mana, infoX, y + 82, infoWidth),
        renderStatBar("STAMINA", fighter.stamina, fighter.maxStamina, STAT_COLORS.stamina, infoX, y + 107, infoWidth)
    ].join("");
}

function buildCharactersMap(catalog) {
    const resolvedCatalog = catalog || catalogStore.readCatalog();
    return new Map(
        (resolvedCatalog?.personagens || []).map(character => [character.id, character])
    );
}

async function buildTeamSlots({
    team = [],
    charactersById,
    columnX,
    startY,
    sideColor,
    isActorAt = () => false,
    isTargetAt = () => false,
    isWinnerAt = () => false
}) {
    const rowStep = CARD_HEIGHT + 8;
    const portraits = await Promise.all(
        Array.from({ length: TEAM_SIZE }, (_, index) => {
            const fighter = team[index] || null;
            if (!fighter) return null;
            const definition = charactersById.get(fighter.characterId);
            return loadPortraitBuffer(definition, Number(fighter.hp ?? 0) <= 0);
        })
    );

    const composites = [];
    const slotSvgs = [];

    for (let index = 0; index < TEAM_SIZE; index += 1) {
        const fighter = team[index] || null;
        const slotY = startY + index * rowStep;
        const portrait = portraits[index];
        const isActor = Boolean(fighter && isActorAt(fighter, index));
        const isTarget = Boolean(fighter && isTargetAt(fighter, index));
        const isWinner = Boolean(fighter && isWinnerAt(fighter, index));
        if (portrait) {
            const defeated = Number(fighter.hp ?? 0) <= 0;
            const borderColor = defeated
                ? "#4a5568"
                : isActor || isWinner
                    ? "#f6c453"
                    : isTarget
                        ? "#f87171"
                        : sideColor;
            const portraitOverlay = `<svg width="${PORTRAIT_WIDTH + 4}" height="${PORTRAIT_HEIGHT + 4}" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="${PORTRAIT_WIDTH + 2}" height="${PORTRAIT_HEIGHT + 2}" rx="13" fill="none" stroke="${borderColor}" stroke-opacity="0.92" stroke-width="2.4"/>${defeated ? `<rect x="2" y="${PORTRAIT_HEIGHT - 20}" width="${PORTRAIT_WIDTH}" height="22" rx="6" fill="#090d14" fill-opacity="0.82"/><text x="${PORTRAIT_WIDTH / 2 + 2}" y="${PORTRAIT_HEIGHT - 5}" fill="#fda4af" font-family="Arial,Segoe UI,sans-serif" font-size="11px" font-weight="800" text-anchor="middle">DERROTADO</text>` : ""}</svg>`;
            composites.push(
                { input: portrait, left: columnX + 12, top: slotY + 10 },
                { input: Buffer.from(portraitOverlay), left: columnX + 10, top: slotY + 8 }
            );
        }
        slotSvgs.push(renderFighterSlot(fighter, {
            x: columnX,
            y: slotY,
            slotNumber: index + 1,
            sideColor,
            isActor,
            isTarget,
            isWinner,
            hasPortrait: Boolean(portrait)
        }));
    }

    return { composites, slotSvgs };
}

function renderPlayerHeader(player, side, x, y, width, battle, turn) {
    const isWinner = battle.status === "completed" && battle.winnerSide === side;
    const isActiveTurn = battle.status === "active" && turn?.actor?.side === side;
    const sideColor = side === 0 ? "#67b7ff" : "#c084fc";
    const statusText = isWinner
        ? "VENCEDOR"
        : isActiveTurn
            ? "SUA VEZ"
            : "AGUARDANDO";
    const statusBg = isWinner
        ? "#184332"
        : isActiveTurn
            ? "#3d3012"
            : "#162538";
    const statusFg = isWinner
        ? "#6ee7b7"
        : isActiveTurn
            ? "#fcd34d"
            : "#8da9c4";

    const badgeWidth = 136;
    const badgeX = x + width - badgeWidth - 10;

    return [
        `<rect x="${x}" y="${y}" width="${width}" height="44" rx="14" fill="#0d1b2c" stroke="${sideColor}" stroke-opacity="0.5" stroke-width="1.6"/>`,
        `<circle cx="${x + 18}" cy="${y + 22}" r="6" fill="${sideColor}"/>`,
        `<text x="${x + 34}" y="${y + 30}" fill="#f3f8ff" font-family="Arial,Segoe UI,sans-serif" font-size="22px" font-weight="800">${escapeXml(fitText(player?.name || `Jogador ${side + 1}`, 28))}</text>`,
        `<rect x="${badgeX}" y="${y + 8}" width="${badgeWidth}" height="28" rx="14" fill="${statusBg}"/>`,
        `<text x="${badgeX + badgeWidth / 2}" y="${y + 27}" fill="${statusFg}" font-family="Arial,Segoe UI,sans-serif" font-size="13px" font-weight="800" text-anchor="middle">${escapeXml(statusText)}</text>`
    ].join("");
}

async function renderBattleBanner(battle, { turn = null, catalog = null } = {}) {
    const charactersById = buildCharactersMap(catalog);
    const columnX = 32;
    const teamStarts = [82, 564];
    const headerY = [30, 512];
    const targetSide = turn ? 1 - turn.actor.side : -1;
    const targetIndex = targetSide >= 0
        ? (battle.players[targetSide]?.team || []).findIndex(fighter =>
            fighter === turn.target || (fighter.hp > 0 && fighter.characterId === turn.target?.characterId)
        )
        : -1;

    const composites = [];
    const slotSvgs = [];

    for (let side = 0; side < 2; side += 1) {
        const player = battle.players?.[side] || { name: `Jogador ${side + 1}`, team: [] };
        const built = await buildTeamSlots({
            team: Array.isArray(player.team) ? player.team : [],
            charactersById,
            columnX,
            startY: teamStarts[side],
            sideColor: side === 0 ? "#5aa9f5" : "#a87ff3",
            isActorAt: (fighter, index) => (
                battle.status === "active" &&
                turn?.actor &&
                turn.actor.side === side &&
                (turn.actor.characterIndex !== undefined
                    ? turn.actor.characterIndex === index
                    : turn.actor.fighter === fighter)
            ),
            isTargetAt: (_fighter, index) => (
                battle.status === "active" &&
                targetSide === side &&
                targetIndex === index
            )
        });
        composites.push(...built.composites);
        slotSvgs.push(...built.slotSvgs);
    }

    const roundLabel = battle.status === "completed"
        ? "ENCERRADA  •  VS"
        : `RODADA ${battle.round || 1}  •  VS`;
    const svg = `<svg width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" viewBox="0 0 ${BANNER_WIDTH} ${BANNER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="arena-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#102238"/><stop offset="0.52" stop-color="#0b1524"/><stop offset="1" stop-color="#181933"/></linearGradient>
  <linearGradient id="arena-panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14283e"/><stop offset="1" stop-color="#0d1828"/></linearGradient>
  <radialGradient id="left-glow"><stop offset="0" stop-color="#5aa9f5" stop-opacity="0.16"/><stop offset="1" stop-color="#5aa9f5" stop-opacity="0"/></radialGradient>
  <radialGradient id="right-glow"><stop offset="0" stop-color="#a87ff3" stop-opacity="0.16"/><stop offset="1" stop-color="#a87ff3" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" fill="url(#arena-bg)"/>
<circle cx="150" cy="80" r="280" fill="url(#left-glow)"/>
<circle cx="710" cy="900" r="280" fill="url(#right-glow)"/>
<rect x="16" y="16" width="${BANNER_WIDTH - 32}" height="${BANNER_HEIGHT - 32}" rx="24" fill="url(#arena-panel)" fill-opacity="0.88" stroke="#426384" stroke-opacity="0.55" stroke-width="2"/>
${renderPlayerHeader(battle.players?.[0], 0, columnX, headerY[0], CARD_WIDTH, battle, turn)}
${renderPlayerHeader(battle.players?.[1], 1, columnX, headerY[1], CARD_WIDTH, battle, turn)}
<line x1="${columnX}" y1="482" x2="${columnX + CARD_WIDTH}" y2="482" stroke="#375473" stroke-opacity="0.55" stroke-width="2" stroke-dasharray="6 6"/>
<rect x="305" y="462" width="250" height="40" rx="20" fill="#172a42" stroke="#6088b0" stroke-width="1.6"/>
<text x="430" y="488" fill="#f3f8ff" font-family="Arial,Segoe UI,sans-serif" font-size="16px" font-weight="900" text-anchor="middle" letter-spacing="1">${escapeXml(roundLabel)}</text>
${slotSvgs.join("")}
<text x="430" y="954" fill="#6f8ca8" font-family="Arial,Segoe UI,sans-serif" font-size="12px" font-weight="700" text-anchor="middle">BATALHA ${escapeXml(battle.id || "")}  •  ALVOS SELECIONADOS PELA ORDEM DA EQUIPE</text>
</svg>`;

    const base = sharp(Buffer.from(svg));
    if (composites.length) {
        base.composite(composites);
    }
    return base.png().toBuffer();
}

async function renderVictoryBanner(battle, { catalog = null } = {}) {
    const charactersById = buildCharactersMap(catalog);
    const winnerSide = battle.winnerSide === 1 ? 1 : 0;
    const loserSide = 1 - winnerSide;
    const winner = battle.players?.[winnerSide] || { name: "Vencedor", team: [] };
    const loser = battle.players?.[loserSide] || { name: "Adversário", team: [] };
    const winnerXp = battle.xpRewards?.[winnerSide]?.amount ?? 10;
    const loserXp = battle.xpRewards?.[loserSide]?.amount ?? 1;
    const reasonLabel = REASON_LABELS[battle.reason] || "Batalha encerrada";

    const columnX = 32;
    const built = await buildTeamSlots({
        team: Array.isArray(winner.team) ? winner.team : [],
        charactersById,
        columnX,
        startY: 168,
        sideColor: "#fbbf24",
        isWinnerAt: fighter => Number(fighter.hp ?? 0) > 0
    });

    const svg = `<svg width="${BANNER_WIDTH}" height="${VICTORY_BANNER_HEIGHT}" viewBox="0 0 ${BANNER_WIDTH} ${VICTORY_BANNER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="victory-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f2d27"/><stop offset="0.55" stop-color="#0a1826"/><stop offset="1" stop-color="#221e10"/></linearGradient>
  <linearGradient id="victory-panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#11292a"/><stop offset="1" stop-color="#0c1724"/></linearGradient>
  <radialGradient id="gold-glow"><stop offset="0" stop-color="#fbbf24" stop-opacity="0.22"/><stop offset="1" stop-color="#fbbf24" stop-opacity="0"/></radialGradient>
  <radialGradient id="emerald-glow"><stop offset="0" stop-color="#34d399" stop-opacity="0.18"/><stop offset="1" stop-color="#34d399" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${BANNER_WIDTH}" height="${VICTORY_BANNER_HEIGHT}" fill="url(#victory-bg)"/>
<circle cx="430" cy="70" r="300" fill="url(#gold-glow)"/>
<circle cx="140" cy="520" r="240" fill="url(#emerald-glow)"/>
<rect x="16" y="16" width="${BANNER_WIDTH - 32}" height="${VICTORY_BANNER_HEIGHT - 32}" rx="24" fill="url(#victory-panel)" fill-opacity="0.9" stroke="#d4a748" stroke-opacity="0.7" stroke-width="2"/>
<rect x="${columnX}" y="32" width="${CARD_WIDTH}" height="114" rx="18" fill="#102426" stroke="#f6c453" stroke-opacity="0.6" stroke-width="1.6"/>
<rect x="${columnX + 20}" y="48" width="128" height="28" rx="14" fill="#3d3012" stroke="#f6c453" stroke-opacity="0.5"/>
<text x="${columnX + 84}" y="67" fill="#fcd34d" font-family="Arial,Segoe UI,sans-serif" font-size="13px" font-weight="900" text-anchor="middle" letter-spacing="1.2">VITÓRIA</text>
<rect x="${columnX + CARD_WIDTH - 144}" y="48" width="124" height="28" rx="14" fill="#153c2f" stroke="#34d399" stroke-opacity="0.45"/>
<text x="${columnX + CARD_WIDTH - 82}" y="67" fill="#6ee7b7" font-family="Arial,Segoe UI,sans-serif" font-size="13px" font-weight="800" text-anchor="middle">+${escapeXml(winnerXp)} XP</text>
<text x="${columnX + 20}" y="106" fill="#fffbeb" font-family="Arial,Segoe UI,sans-serif" font-size="28px" font-weight="900">${escapeXml(fitText(winner.name || "Vencedor", 28))}</text>
<text x="${columnX + 20}" y="132" fill="#a7f3d0" font-family="Arial,Segoe UI,sans-serif" font-size="15px" font-weight="700">${escapeXml(`Derrotou ${fitText(loser.name || "Adversário", 24)}  •  ${reasonLabel}`)}</text>
${built.slotSvgs.join("")}
<text x="430" y="582" fill="#9fb8b4" font-family="Arial,Segoe UI,sans-serif" font-size="12px" font-weight="700" text-anchor="middle">BATALHA ${escapeXml(battle.id || "")}  •  RODADA ${escapeXml(battle.round || 1)}  •  XP: +${escapeXml(winnerXp)} VENCEDOR / +${escapeXml(loserXp)} PERDEDOR</text>
</svg>`;

    const base = sharp(Buffer.from(svg));
    if (built.composites.length) {
        base.composite(built.composites);
    }
    return base.png().toBuffer();
}

async function renderChallengeBanner(challenge, { catalog = null } = {}) {
    const charactersById = buildCharactersMap(catalog);
    const challenger = challenge.challenger || { name: "Desafiante", team: [] };
    const opponent = challenge.opponent || { name: "Desafiado" };
    const team = Array.isArray(challenger.team) ? challenger.team : [];
    const columnX = 32;

    const built = await buildTeamSlots({
        team,
        charactersById,
        columnX,
        startY: 196,
        sideColor: "#8b5cf6"
    });

    const svg = `<svg width="${BANNER_WIDTH}" height="${CHALLENGE_BANNER_HEIGHT}" viewBox="0 0 ${BANNER_WIDTH} ${CHALLENGE_BANNER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="challenge-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c183b"/><stop offset="0.55" stop-color="#0d1527"/><stop offset="1" stop-color="#12233d"/></linearGradient>
  <linearGradient id="challenge-panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#191b36"/><stop offset="1" stop-color="#0d1729"/></linearGradient>
  <radialGradient id="violet-glow"><stop offset="0" stop-color="#8b5cf6" stop-opacity="0.22"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></radialGradient>
  <radialGradient id="blue-glow"><stop offset="0" stop-color="#38bdf8" stop-opacity="0.16"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${BANNER_WIDTH}" height="${CHALLENGE_BANNER_HEIGHT}" fill="url(#challenge-bg)"/>
<circle cx="200" cy="80" r="280" fill="url(#violet-glow)"/>
<circle cx="700" cy="540" r="260" fill="url(#blue-glow)"/>
<rect x="16" y="16" width="${BANNER_WIDTH - 32}" height="${CHALLENGE_BANNER_HEIGHT - 32}" rx="24" fill="url(#challenge-panel)" fill-opacity="0.9" stroke="#7c5ce7" stroke-opacity="0.65" stroke-width="2"/>
<rect x="295" y="30" width="270" height="28" rx="14" fill="#2b2152" stroke="#8b5cf6" stroke-opacity="0.55"/>
<text x="430" y="49" fill="#ddd6fe" font-family="Arial,Segoe UI,sans-serif" font-size="13px" font-weight="900" text-anchor="middle" letter-spacing="1.2">DESAFIO DE BATALHA RPG</text>
<rect x="${columnX}" y="70" width="346" height="78" rx="16" fill="#131c33" stroke="#67b7ff" stroke-opacity="0.55" stroke-width="1.6"/>
<text x="${columnX + 18}" y="96" fill="#7dd3fc" font-family="Arial,Segoe UI,sans-serif" font-size="12px" font-weight="800" letter-spacing="1">DESAFIANTE</text>
<text x="${columnX + 18}" y="129" fill="#f8fafc" font-family="Arial,Segoe UI,sans-serif" font-size="23px" font-weight="800">${escapeXml(fitText(challenger.name || "Desafiante", 21))}</text>
<rect x="392" y="88" width="76" height="42" rx="21" fill="#2b2152" stroke="#a78bfa" stroke-width="1.8"/>
<text x="430" y="115" fill="#f5f3ff" font-family="Arial,Segoe UI,sans-serif" font-size="17px" font-weight="900" text-anchor="middle">VS</text>
<rect x="482" y="70" width="346" height="78" rx="16" fill="#131c33" stroke="#a78bfa" stroke-opacity="0.55" stroke-width="1.6"/>
<text x="810" y="96" fill="#c4b5fd" font-family="Arial,Segoe UI,sans-serif" font-size="12px" font-weight="800" text-anchor="end" letter-spacing="1">DESAFIADO</text>
<text x="810" y="129" fill="#f8fafc" font-family="Arial,Segoe UI,sans-serif" font-size="23px" font-weight="800" text-anchor="end">${escapeXml(fitText(opponent.name || "Desafiado", 21))}</text>
<text x="${columnX}" y="180" fill="#c4b5fd" font-family="Arial,Segoe UI,sans-serif" font-size="14px" font-weight="800" letter-spacing="0.8">${escapeXml(`EQUIPE DO DESAFIANTE (${team.length}/3)`)}</text>
${built.slotSvgs.join("")}
<text x="430" y="592" fill="#8b9cc2" font-family="Arial,Segoe UI,sans-serif" font-size="12px" font-weight="700" text-anchor="middle">DESAFIO ${escapeXml(challenge.id || "")}  •  O DESAFIADO PRECISA TER UMA EQUIPE CONFIGURADA</text>
</svg>`;

    const base = sharp(Buffer.from(svg));
    if (built.composites.length) {
        base.composite(built.composites);
    }
    return base.png().toBuffer();
}

module.exports = {
    BANNER_WIDTH,
    BANNER_HEIGHT,
    VICTORY_BANNER_HEIGHT,
    CHALLENGE_BANNER_HEIGHT,
    renderBattleBanner,
    renderVictoryBanner,
    renderChallengeBanner,
    _internals: {
        resolvePortraitPath,
        renderStatBar
    }
};
