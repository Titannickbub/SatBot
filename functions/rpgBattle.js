const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const economy = require("./economy");
const rpgPlayer = require("./rpgPlayer");

const DEFAULT_FILE = path.join(__dirname, "..", "settings", "rpg", "batalhas.json");
const TURN_TIMEOUT_MS = 60_000;
const WINNER_XP = 10;
const LOSER_XP = 1;

function emptyData() {
    return { challenges: [], battles: [] };
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function assertGroup(message) {
    const scope = economy.getScope(message);
    if (!scope) throw new Error("As batalhas só podem ser iniciadas em grupos ou servidores.");
    if (!message.chatId) throw new Error("Não foi possível identificar este chat.");
    return scope;
}

function getTeamSnapshot(profile, catalog, characterIds = profile.teamCharacterIds) {
    if (!Array.isArray(characterIds) || characterIds.length < 1 || characterIds.length > 3) {
        throw new Error("Monte uma equipe com 1 a 3 personagens usando o comando equipe.");
    }
    if (new Set(characterIds).size !== characterIds.length) {
        throw new Error("A equipe não pode conter o mesmo personagem mais de uma vez.");
    }

    return characterIds.map(characterId => {
        const save = rpgPlayer.getCharacterSave(profile, characterId);
        const definition = catalog.personagens.find(entry => entry.id === characterId);
        if (!save || !definition) {
            throw new Error(`Você não possui o personagem ${characterId} ou ele não existe mais no catálogo.`);
        }
        const stats = rpgPlayer.getCharacterStats(definition, save);
        const moves = save.learnedMoveIds
            .map(moveId => catalog.golpes.find(move => move.id === moveId))
            .filter(move => move && move.nivelDesbloqueio <= save.level)
            .map(move => ({
                ...clone(move),
                efeitos: move.efeitos
                    .map(effectId => catalog.efeitos.find(effect => effect.id === effectId))
                    .filter(Boolean)
                    .map(effect => clone(effect))
            }));
        if (!moves.length) {
            throw new Error(`${definition.nome} não tem golpes disponíveis para a batalha.`);
        }
        return {
            characterId,
            name: definition.nome,
            level: save.level,
            maxHp: stats.hp,
            hp: stats.hp,
            maxMana: stats.mana,
            mana: stats.mana,
            maxStamina: stats.stamina,
            stamina: stats.stamina,
            agility: stats.agilidade,
            weaknesses: [...definition.fraquezas],
            affinities: [...(definition.afinidades || [])],
            effects: [],
            moves
        };
    });
}

function availableMoves(fighter) {
    return fighter.moves.filter(move =>
        fighter.hp >= move.custo.hp &&
        fighter.mana >= move.custo.mana &&
        fighter.stamina >= move.custo.stamina
    );
}

function damageForType(amount, typeId, target) {
    let multiplier = 1;
    if (typeId !== null && typeId !== undefined) {
        if (target.weaknesses.includes(typeId)) multiplier = 2;
        else if (target.affinities.includes(typeId)) multiplier = 0.5;
    }
    return Math.floor(amount * multiplier);
}

function frontCharacter(team) {
    return team.find(fighter => fighter.hp > 0) || null;
}

function aliveIndexes(team) {
    return team
        .map((fighter, index) => fighter.hp > 0 ? index : -1)
        .filter(index => index >= 0);
}

function createRoundOrder(battle, firstSide, firstActor = null) {
    const remaining = battle.players.map(player => aliveIndexes(player.team));
    const order = [];
    if (firstActor) {
        remaining[firstActor.side] = remaining[firstActor.side]
            .filter(index => index !== firstActor.characterIndex);
        order.push(firstActor);
    }

    let side = firstActor ? 1 - firstActor.side : firstSide;
    while (remaining[0].length || remaining[1].length) {
        if (!remaining[side].length && remaining[1 - side].length) side = 1 - side;
        if (!remaining[side].length) break;
        order.push({ side, characterIndex: remaining[side].shift() });
        side = 1 - side;
    }
    return order;
}

function getCurrentActor(battle) {
    const turn = battle.roundOrder[battle.roundOrderIndex];
    if (!turn) return null;
    return {
        ...turn,
        player: battle.players[turn.side],
        fighter: battle.players[turn.side].team[turn.characterIndex]
    };
}

function createBattleStore({
    filePath = DEFAULT_FILE,
    scheduleTimers = true,
    now = () => Date.now()
} = {}) {
    let data = emptyData();
    let initialized = false;
    let centralAccounts = null;
    const timers = new Map();

    function save() {
        if (!filePath) throw new Error("Caminho dos dados de batalha não configurado.");
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        const temporaryPath = `${filePath}.${process.pid}.tmp`;
        fs.writeFileSync(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
        fs.renameSync(temporaryPath, filePath);
    }

    function ensureInitialized() {
        if (!initialized) throw new Error("O sistema de batalhas RPG ainda não foi inicializado.");
    }

    function findBattle(battleId) {
        return data.battles.find(entry => entry.id === battleId) || null;
    }

    function clearTimer(battleId) {
        const timer = timers.get(battleId);
        if (timer) clearTimeout(timer);
        timers.delete(battleId);
    }

    function activeBattleForPlayer(centralId, platform, scopeId) {
        return data.battles.find(battle =>
            battle.status === "active" &&
            battle.platform === platform &&
            battle.scopeId === scopeId &&
            battle.players.some(player => player.centralId === centralId)
        ) || null;
    }

    function hasPendingChallenge(centralId, platform, scopeId) {
        return data.challenges.some(challenge =>
            challenge.platform === platform &&
            challenge.scopeId === scopeId &&
            [challenge.challenger.centralId, challenge.opponent.centralId].includes(centralId)
        );
    }

    function scheduleTimeout(battle) {
        clearTimer(battle.id);
        if (!scheduleTimers || battle.status !== "active") return;
        const delay = Math.max(0, Date.parse(battle.turnDeadlineAt) - now());
        const timer = setTimeout(() => {
            expireBattle(battle.id).catch(error => {
                console.error("[rpgBattle] Falha ao processar o tempo limite:", error);
            });
        }, delay);
        timer.unref?.();
        timers.set(battle.id, timer);
    }

    function rememberBattle(battle) {
        data.battles.push(battle);
        const completed = data.battles
            .filter(entry => entry.status === "completed" && entry.rewardsApplied)
            .sort((left, right) => Date.parse(right.endedAt) - Date.parse(left.endedAt));
        const keep = new Set(completed.slice(0, 100).map(entry => entry.id));
        data.battles = data.battles.filter(entry =>
            entry.status === "active" || !entry.rewardsApplied || keep.has(entry.id)
        );
    }

    async function awardBattleXp(battle) {
        if (battle.status !== "completed" || battle.rewardsApplied) return;
        if (!centralAccounts) throw new Error("Contas Centrais indisponíveis para conceder XP.");
        for (let side = 0; side < battle.players.length; side += 1) {
            const player = battle.players[side];
            const amount = side === battle.winnerSide ? WINNER_XP : LOSER_XP;
            await rpgPlayer.addRpgXp(
                centralAccounts,
                player.centralId,
                amount,
                `${battle.id}:${side}`
            );
        }
        battle.rewardsApplied = true;
        save();
    }

    function applyEffect(target, effect) {
        if (target.hp <= 0) return { applied: false, reason: "defeated" };
        const affinityId = effect.afinidadeId;
        if (affinityId !== null && target.affinities.includes(affinityId)) {
            return { applied: false, reason: "immune" };
        }
        if (target.effects.some(entry => entry.id === effect.id)) {
            return { applied: false, reason: "already_active" };
        }
        target.effects.push({
            id: effect.id,
            name: effect.nome,
            afinidadeId: affinityId,
            danoPassivoPorRodada: effect.danoPassivoPorRodada
        });
        return { applied: true };
    }

    function tickEffects(battle) {
        const events = [];
        for (const player of battle.players) {
            for (const fighter of player.team) {
                if (fighter.hp <= 0) continue;
                for (const effect of fighter.effects) {
                    let damage = effect.danoPassivoPorRodada;
                    if (effect.afinidadeId !== null &&
                        fighter.weaknesses.includes(effect.afinidadeId)) {
                        damage *= 2;
                    }
                    damage = Math.min(fighter.hp, damage);
                    fighter.hp -= damage;
                    events.push(
                        damage > 0
                            ? `${fighter.name} sofre ${damage} de dano de ${effect.name} (HP ${fighter.hp}/${fighter.maxHp}).`
                            : `${effect.name} continua afetando ${fighter.name}.`
                    );
                }
            }
        }
        return events;
    }

    async function finishBattle(battle, winnerSide, reason) {
        clearTimer(battle.id);
        battle.status = "completed";
        battle.winnerSide = winnerSide;
        battle.reason = reason;
        battle.endedAt = new Date(now()).toISOString();
        battle.rewardsApplied = false;
        battle.xpRewards = battle.players.map((player, side) => ({
            centralId: player.centralId,
            amount: side === winnerSide ? WINNER_XP : LOSER_XP
        }));
        save();
        await awardBattleXp(battle);
    }

    async function init(nextFilePath = filePath, accounts = centralAccounts) {
        if (!nextFilePath) throw new Error("Caminho dos dados de batalha não configurado.");
        filePath = nextFilePath;
        centralAccounts = accounts;
        try {
            const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
            if (!parsed || typeof parsed !== "object" ||
                !Array.isArray(parsed.challenges) || !Array.isArray(parsed.battles)) {
                throw new Error("Arquivo de batalhas RPG inválido.");
            }
            data = parsed;
        } catch (error) {
            if (error.code !== "ENOENT") throw error;
            data = emptyData();
            save();
        }
        initialized = true;
        for (const battle of data.battles) {
            if (battle.status === "active") scheduleTimeout(battle);
            if (battle.status === "completed" && !battle.rewardsApplied) {
                await awardBattleXp(battle);
            }
        }
        return data;
    }

    async function setTeam(centralId, characterIds, catalog) {
        ensureInitialized();
        if (!Array.isArray(characterIds) || characterIds.length < 1 || characterIds.length > 3) {
            throw new Error("Escolha de 1 a 3 personagens para sua equipe.");
        }
        const ids = characterIds.map(value => {
            const id = Number(value);
            if (!Number.isSafeInteger(id) || id < 0) throw new Error(`ID de personagem inválido: ${value}.`);
            return id;
        });
        if (new Set(ids).size !== ids.length) {
            throw new Error("A equipe não pode conter o mesmo personagem mais de uma vez.");
        }
        const profile = await centralAccounts.updateRpgProfile(centralId, current => {
            for (const id of ids) {
                if (!rpgPlayer.getCharacterSave(current, id)) {
                    throw new Error(`Você não possui o personagem ${id}.`);
                }
            }
            getTeamSnapshot(current, catalog, ids);
            current.teamCharacterIds = ids;
            return current;
        });
        return profile.teamCharacterIds;
    }

    function createChallenge({
        message,
        centralId,
        centralName,
        opponentCentralId,
        opponentPlatformId,
        opponentName,
        catalog
    }) {
        ensureInitialized();
        const scope = assertGroup(message);
        if (!centralId || !opponentCentralId || centralId === opponentCentralId) {
            throw new Error("Escolha outro usuário que tenha uma Conta Central.");
        }
        if (activeBattleForPlayer(centralId, message.platform, scope.id) ||
            activeBattleForPlayer(opponentCentralId, message.platform, scope.id) ||
            hasPendingChallenge(centralId, message.platform, scope.id) ||
            hasPendingChallenge(opponentCentralId, message.platform, scope.id)) {
            throw new Error("Um dos jogadores já está em uma batalha ou tem um desafio pendente neste grupo.");
        }
        const challengerAccount = centralAccounts.getCentralById(centralId);
        const challengerProfile = centralAccounts.getRpgProfile(centralId);
        const challengerTeam = getTeamSnapshot(challengerProfile, catalog);
        if (!challengerAccount) throw new Error("Conta Central do desafiante não encontrada.");

        const id = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
        const challenge = {
            id,
            platform: message.platform,
            chatId: String(message.chatId),
            threadId: message.threadId || null,
            scopeId: scope.id,
            createdAt: new Date(now()).toISOString(),
            challenger: {
                centralId,
                platformId: String(message.userId),
                name: centralName || message.displayName || message.username || String(message.userId),
                team: challengerTeam
            },
            opponent: {
                centralId: opponentCentralId,
                platformId: String(opponentPlatformId),
                name: opponentName || String(opponentPlatformId)
            }
        };
        data.challenges.push(challenge);
        save();
        return clone(challenge);
    }

    async function acceptChallenge({
        challengeId,
        message,
        centralId,
        centralName,
        catalog
    }) {
        ensureInitialized();
        const scope = assertGroup(message);
        const challengeIndex = data.challenges.findIndex(entry => entry.id === challengeId);
        const challenge = data.challenges[challengeIndex];
        if (!challenge) throw new Error("Desafio não encontrado ou já respondido.");
        if (challenge.platform !== message.platform || challenge.scopeId !== scope.id) {
            throw new Error("Esse desafio pertence a outro grupo ou plataforma.");
        }
        if (challenge.opponent.centralId !== centralId) {
            throw new Error("Somente o usuário desafiado pode aceitar.");
        }
        if ([challenge.challenger.centralId, centralId].some(playerId =>
            activeBattleForPlayer(playerId, message.platform, scope.id)
        )) {
            throw new Error("Um dos jogadores já está em uma batalha neste grupo.");
        }
        const opponentProfile = centralAccounts.getRpgProfile(centralId);
        const opponentTeam = getTeamSnapshot(opponentProfile, catalog);
        const players = [
            {
                centralId: challenge.challenger.centralId,
                platformId: challenge.challenger.platformId,
                name: challenge.challenger.name,
                team: challenge.challenger.team
            },
            {
                centralId,
                platformId: String(message.userId),
                name: centralName || message.displayName || message.username || String(message.userId),
                team: opponentTeam
            }
        ];
        let fastest = { side: 0, characterIndex: 0, agility: -1 };
        for (let side = 0; side < players.length; side += 1) {
            for (let characterIndex = 0; characterIndex < players[side].team.length; characterIndex += 1) {
                const agility = players[side].team[characterIndex].agility;
                if (agility > fastest.agility) fastest = { side, characterIndex, agility };
            }
        }
        const id = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
        const battle = {
            id,
            challengeId,
            platform: message.platform,
            chatId: challenge.chatId,
            threadId: challenge.threadId,
            scopeId: scope.id,
            status: "active",
            players,
            round: 1,
            roundStartSide: fastest.side,
            roundOrder: [],
            roundOrderIndex: 0,
            turnDeadlineAt: new Date(now() + TURN_TIMEOUT_MS).toISOString(),
            startedAt: new Date(now()).toISOString(),
            rewardsApplied: false
        };
        battle.roundOrder = createRoundOrder(
            battle,
            fastest.side,
            { side: fastest.side, characterIndex: fastest.characterIndex }
        );
        data.challenges.splice(challengeIndex, 1);
        rememberBattle(battle);
        save();
        scheduleTimeout(battle);
        return clone(battle);
    }

    function declineChallenge({ challengeId, message, centralId }) {
        ensureInitialized();
        const scope = assertGroup(message);
        const index = data.challenges.findIndex(entry => entry.id === challengeId);
        const challenge = data.challenges[index];
        if (!challenge) throw new Error("Desafio não encontrado ou já respondido.");
        if (challenge.platform !== message.platform || challenge.scopeId !== scope.id) {
            throw new Error("Esse desafio pertence a outro grupo ou plataforma.");
        }
        if (challenge.opponent.centralId !== centralId) {
            throw new Error("Somente o usuário desafiado pode recusar.");
        }
        data.challenges.splice(index, 1);
        save();
        return clone(challenge);
    }

    function getBattleForPlayer(centralId, platform, scopeId) {
        const battle = activeBattleForPlayer(centralId, platform, scopeId);
        return battle ? clone(battle) : null;
    }

    function getTurnState(battle) {
        const actor = getCurrentActor(battle);
        if (!actor) throw new Error("A batalha não tem um turno válido.");
        const target = frontCharacter(battle.players[1 - actor.side].team);
        if (!target) throw new Error("Não há personagem adversário disponível.");
        return {
            actor,
            target,
            availableMoves: availableMoves(actor.fighter)
        };
    }

    async function advanceAfterAction(battle, events) {
        const defeatedSide = battle.players.findIndex(player => !frontCharacter(player.team));
        if (defeatedSide >= 0) {
            await finishBattle(battle, 1 - defeatedSide, "team_defeated");
            return { completed: true, events };
        }
        battle.roundOrderIndex += 1;
        if (battle.roundOrderIndex >= battle.roundOrder.length) {
            events.push(...tickEffects(battle));
            const afterEffectsDefeatedSide = battle.players.findIndex(player => !frontCharacter(player.team));
            if (afterEffectsDefeatedSide >= 0) {
                await finishBattle(battle, 1 - afterEffectsDefeatedSide, "effect_damage");
                return { completed: true, events };
            }
            battle.round += 1;
            battle.roundStartSide = 1 - battle.roundStartSide;
            battle.roundOrder = createRoundOrder(battle, battle.roundStartSide);
            battle.roundOrderIndex = 0;
        }
        battle.turnDeadlineAt = new Date(now() + TURN_TIMEOUT_MS).toISOString();
        save();
        scheduleTimeout(battle);
        return { completed: false, events };
    }

    async function attack({ battleId, centralId, moveId }) {
        ensureInitialized();
        const battle = findBattle(battleId);
        if (!battle || battle.status !== "active") throw new Error("Batalha não encontrada ou já encerrada.");
        if (Date.parse(battle.turnDeadlineAt) <= now()) {
            await expireBattle(battle.id);
            return { expired: true, battle: clone(battle) };
        }
        const state = getTurnState(battle);
        if (state.actor.player.centralId !== centralId) {
            throw new Error("Ainda não é o turno da sua equipe.");
        }
        const id = Number(moveId);
        if (!Number.isSafeInteger(id) || id < 0) throw new Error("Informe um ID de golpe válido.");
        const move = state.actor.fighter.moves.find(entry => entry.id === id);
        if (!move) throw new Error(`${state.actor.fighter.name} não conhece esse golpe.`);
        if (!state.availableMoves.some(entry => entry.id === id)) {
            throw new Error("Esse golpe não pode ser usado: faltam HP, mana ou stamina.");
        }

        const attacker = state.actor.fighter;
        const target = state.target;
        attacker.hp = Math.max(0, attacker.hp - move.custo.hp);
        attacker.mana -= move.custo.mana;
        attacker.stamina -= move.custo.stamina;
        const damage = Math.min(target.hp, damageForType(move.dano, move.tipoFraquezaId, target));
        target.hp -= damage;
        const phrase = move.frases[Math.floor(Math.random() * move.frases.length)]
            .replace(/\{personagem\}/g, attacker.name)
            .replace(/\{alvo\}/g, target.name);
        const events = [
            `${phrase} Dano: ${damage}. ${target.name}: ${target.hp}/${target.maxHp} HP.`
        ];
        if (attacker.hp === 0) events.push(`${attacker.name} foi derrotado pelo custo de HP do golpe.`);

        if (target.hp > 0) {
            for (const effect of move.efeitos) {
                const outcome = applyEffect(target, effect);
                if (outcome.applied) {
                    events.push(`${target.name} foi afetado por ${effect.nome}.`);
                } else if (outcome.reason === "immune") {
                    events.push(`${target.name} é imune ao efeito ${effect.nome} por sua afinidade.`);
                } else if (outcome.reason === "already_active") {
                    events.push(`${target.name} já está afetado por ${effect.nome}; o efeito não acumula.`);
                }
            }
        }

        const result = await advanceAfterAction(battle, events);
        return { battle: clone(battle), ...result };
    }

    async function surrender({ battleId, centralId }) {
        ensureInitialized();
        const battle = findBattle(battleId);
        if (!battle || battle.status !== "active") throw new Error("Batalha não encontrada ou já encerrada.");
        const side = battle.players.findIndex(player => player.centralId === centralId);
        if (side < 0) throw new Error("Você não participa desta batalha.");
        await finishBattle(battle, 1 - side, "surrender");
        return clone(battle);
    }

    async function expireBattle(battleId) {
        ensureInitialized();
        const battle = findBattle(battleId);
        if (!battle || battle.status !== "active") return null;
        if (Date.parse(battle.turnDeadlineAt) > now()) {
            scheduleTimeout(battle);
            return null;
        }
        const actor = getCurrentActor(battle);
        if (!actor) throw new Error("Não há turno ativo para expirar.");
        await finishBattle(battle, 1 - actor.side, "timeout");
        const send = require("./send");
        const winner = battle.players[battle.winnerSide];
        const loser = battle.players[1 - battle.winnerSide];
        await send.text(
            battle.platform,
            battle.chatId,
            battle.threadId,
            `⏰ ${loser.name} não agiu em 60 segundos. ${winner.name} venceu por tempo. XP: ${WINNER_XP} para o vencedor e ${LOSER_XP} para o perdedor.`
        );
        return clone(battle);
    }

    async function recoverRewards() {
        ensureInitialized();
        for (const battle of data.battles) {
            if (battle.status === "completed" && !battle.rewardsApplied) {
                await awardBattleXp(battle);
            }
        }
    }

    function stop() {
        for (const timer of timers.values()) clearTimeout(timer);
        timers.clear();
    }

    return {
        init,
        setTeam,
        createChallenge,
        acceptChallenge,
        declineChallenge,
        getBattleForPlayer,
        getTurnState,
        attack,
        surrender,
        expireBattle,
        recoverRewards,
        stop,
        get data() {
            return clone(data);
        },
        _internals: {
            getTeamSnapshot,
            availableMoves,
            damageForType,
            createRoundOrder,
            tickEffects,
            findBattle
        }
    };
}

const defaultStore = createBattleStore();
module.exports = defaultStore;
module.exports.createBattleStore = createBattleStore;
module.exports.TURN_TIMEOUT_MS = TURN_TIMEOUT_MS;
module.exports.WINNER_XP = WINNER_XP;
module.exports.LOSER_XP = LOSER_XP;
