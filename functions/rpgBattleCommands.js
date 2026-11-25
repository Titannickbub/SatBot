const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const battleStore = require("./rpgBattle");
const catalogStore = require("./rpgMaker");
const send = require("./send");
const economy = require("./economy");
const config = require("./config");

const COMPONENT_CONTEXT = Symbol.for("satbot.componentMessageContext");

function getCommandPrefix(message) {
    return String(message?.prefix || config.getPrefix());
}

function getStores(message) {
    const centralAccounts = message.functions?.centralAccounts || global.centralAccounts;
    if (!centralAccounts || typeof centralAccounts.findByPlatform !== "function") {
        throw new Error("O sistema de Contas Centrais não está disponível.");
    }
    if (!message.functions?.rpgBattle && !global.rpgBattle) {
        throw new Error("O sistema de batalhas RPG não está disponível.");
    }
    const central = centralAccounts.findByPlatform(message.platform, message.userId);
    if (!central) throw new Error("Não encontrei sua Conta Central.");
    return {
        centralAccounts,
        central,
        store: message.functions?.rpgBattle || global.rpgBattle || battleStore
    };
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

function makeButtons(platform, choices) {
    if (platform === "discord") {
        const rows = [];
        for (let index = 0; index < choices.length; index += 5) {
            rows.push(new ActionRowBuilder().addComponents(
                ...choices.slice(index, index + 5).map(choice =>
                    new ButtonBuilder()
                        .setCustomId(choice.id)
                        .setLabel(choice.label.slice(0, 80))
                        .setStyle(choice.style || ButtonStyle.Primary)
                        .setDisabled(Boolean(choice.disabled))
                )
            ));
        }
        return { components: rows };
    }
    if (platform === "telegram") {
        return {
            reply_markup: {
                inline_keyboard: choices.map(choice => [{
                    text: choice.label.slice(0, 60),
                    callback_data: choice.id
                }])
            }
        };
    }
    return {};
}

function makeChallengePayload(message, challenge) {
    const targetMention = challengeMention(message.platform, challenge.opponent);
    const choices = [
        {
            id: `equipe:accept:${challenge.id}`,
            label: "Aceitar batalha",
            style: ButtonStyle.Success
        },
        {
            id: `equipe:decline:${challenge.id}`,
            label: "Recusar",
            style: ButtonStyle.Secondary
        }
    ];
    const team = challenge.challenger.team.map((fighter, index) =>
        `${index + 1}. ${fighter.name} (nível ${fighter.level})`
    );
    const details = [
        `Equipe: ${team.join(" · ")}`,
        `Desafio: ${challenge.id}`,
        `Para responder: ${getCommandPrefix(message)}aceitar_desafio ou ${getCommandPrefix(message)}recusar_desafio.`
    ];
    if (message.platform === "discord") {
        return {
            embed: {
                color: 0x7c5ce7,
                title: "⚔️ Desafio de batalha RPG",
                description: [
                    `${escapeMarkdown(challenge.challenger.name)} desafiou ${escapeMarkdown(challenge.opponent.name)} para uma batalha!`,
                    ...details.map(escapeMarkdown)
                ].join("\n"),
                footer: { text: "O desafiado precisa ter uma equipe configurada." }
            },
            text: targetMention.content,
            allowedMentions: targetMention.allowedMentions,
            ...makeButtons(message.platform, choices)
        };
    }
    if (message.platform === "telegram") {
        return {
            text: [
                "<b>⚔️ DESAFIO DE BATALHA RPG</b>",
                "",
                `${targetMention.text} ${escapeHtml(challenge.challenger.name)} te desafiou para uma batalha RPG!`,
                ...details.map(escapeHtml)
            ].join("\n"),
            parse_mode: "HTML",
            ...makeButtons(message.platform, choices)
        };
    }
    return {
        text: [
            "*⚔️ DESAFIO DE BATALHA RPG*",
            "",
            `${targetMention.text} ${challenge.challenger.name} te desafiou para uma batalha RPG!`,
            ...details
        ].join("\n"),
        ...(targetMention.mentions ? { mentions: targetMention.mentions } : {})
    };
}

function makeTurnMention(platform, player, fighter) {
    const playerId = String(player.platformId || "");
    const playerName = player.name || playerId || "jogador";
    const fighterName = fighter.name || "personagem";
    const line = `🔔 Vez de ${playerName}: ${fighterName}.`;

    if (platform === "discord" && /^\d+$/.test(playerId)) {
        return {
            line,
            content: `🔔 <@${playerId}>, sua vez de agir!`,
            allowedMentions: { users: [playerId] }
        };
    }
    if (platform === "telegram" && /^\d+$/.test(playerId)) {
        return {
            line,
            telegramLine: `🔔 Vez de <a href="tg://user?id=${playerId}">${escapeHtml(playerName)}</a>: ${escapeHtml(fighterName)}.`
        };
    }
    if (platform === "whatsapp" && playerId.includes("@")) {
        const label = playerId.split("@")[0].split(":")[0];
        return {
            line: `🔔 Vez de @${label}: ${fighterName}.`,
            mentions: [playerId]
        };
    }
    return { line };
}

function makeBattlePayload(message, battle, store, extraEvents = []) {
    const players = battle.players.map((player, side) => {
        const team = player.team.map((fighter, index) => {
            const status = fighter.effects.length
                ? ` · ${fighter.effects.map(effect => effect.name).join(", ")}`
                : "";
            return `${index + 1}. ${fighter.name} Nv.${fighter.level} · HP ${fighter.hp}/${fighter.maxHp} · Mana ${fighter.mana}/${fighter.maxMana} · Stamina ${fighter.stamina}/${fighter.maxStamina}${status}`;
        });
        return `${player.name}${side === battle.winnerSide && battle.status === "completed" ? " 🏆" : ""}\n${team.join("\n")}`;
    });
    const lines = [
        `Batalha ${battle.id} · Rodada ${battle.round}`,
        "",
        ...players,
        ...extraEvents.map(event => `• ${event}`)
    ];
    const choices = [];
    let turnMention = null;
    let turnLineIndex = -1;
    if (battle.status === "active") {
        const turn = store.getTurnState(battle);
        turnMention = makeTurnMention(message.platform, turn.actor.player, turn.actor.fighter);
        turnLineIndex = lines.length + 1;
        lines.push(
            "",
            turnMention.line,
            `Alvo: ${turn.target.name}.`
        );
        if (turn.availableMoves.length) {
            lines.push("Golpes disponíveis:");
            for (const move of turn.availableMoves.slice(0, 24)) {
                lines.push(
                    `${move.id} · ${move.nome} — dano ${move.dano}; custo ${move.custo.mana} mana, ${move.custo.stamina} stamina, ${move.custo.hp} HP`
                );
                choices.push({
                    id: `equipe:attack:${battle.id}:${move.id}`,
                    label: `${move.id} · ${move.nome}`
                });
            }
        } else {
            lines.push(`Sem golpes que possa pagar. Use ${getCommandPrefix(message)}desistir_desafio para encerrar.`);
        }
        choices.push({
            id: `equipe:surrender:${battle.id}`,
            label: "Desistir da batalha",
            style: ButtonStyle.Danger
        });
        lines.push(
            `Use ${getCommandPrefix(message)}ataque <nome ou id do golpe> em até 60 segundos; ou ${getCommandPrefix(message)}desistir_desafio.`
        );
    } else {
        const winner = battle.players[battle.winnerSide];
        const loser = battle.players[1 - battle.winnerSide];
        lines.push(
            "",
            `${winner.name} venceu! ${loser.name} recebe ${battle.xpRewards[1 - battle.winnerSide].amount} XP; vencedor recebe ${battle.xpRewards[battle.winnerSide].amount} XP.`
        );
    }

    const description = message.platform === "discord"
        ? lines.map(escapeMarkdown).join("\n")
        : message.platform === "telegram"
            ? lines.map((line, index) => index === turnLineIndex && turnMention.telegramLine
                ? turnMention.telegramLine
                : escapeHtml(line)).join("\n")
            : lines.join("\n");
    const controls = battle.status === "active"
        ? makeButtons(message.platform, choices)
        : {};
    if (message.platform === "discord") {
        return {
            embed: {
                color: battle.status === "active" ? 0x2787d4 : 0x28a879,
                title: battle.status === "active" ? "⚔️ Batalha RPG" : "🏁 Batalha encerrada",
                description,
                footer: { text: "Os alvos são selecionados pela ordem da equipe." }
            },
            ...(turnMention?.content ? {
                text: turnMention.content,
                allowedMentions: turnMention.allowedMentions
            } : {}),
            ...controls
        };
    }
    if (message.platform === "telegram") {
        return {
            text: `<b>${battle.status === "active" ? "⚔️ BATALHA RPG" : "🏁 BATALHA ENCERRADA"}</b>\n\n${description}`,
            parse_mode: "HTML",
            ...controls
        };
    }
    return {
        text: `*${battle.status === "active" ? "⚔️ BATALHA RPG" : "🏁 BATALHA ENCERRADA"}*\n\n${description}`,
        ...(turnMention?.mentions ? { mentions: turnMention.mentions } : {})
    };
}

function challengeMention(platform, opponent) {
    const platformId = String(opponent.platformId || "");
    const name = opponent.name || opponent.account?.displayName || opponent.account?.username || platformId;
    if (platform === "discord" && /^\d+$/.test(platformId)) {
        return {
            text: `<@${platformId}>`,
            content: `<@${platformId}>`,
            allowedMentions: { users: [platformId] }
        };
    }
    if (platform === "telegram") {
        const text = /^\d+$/.test(platformId)
            ? `<a href="tg://user?id=${platformId}">${escapeHtml(name)}</a>`
            : opponent.account?.username
                ? `@${escapeHtml(String(opponent.account.username).replace(/^@/, ""))}`
                : escapeHtml(name);
        return { text };
    }
    if (platform === "whatsapp") {
        const jid = platformId.includes("@") ? platformId : `${platformId}@s.whatsapp.net`;
        const number = jid.split("@")[0];
        return {
            text: /^\d+$/.test(number) ? `@${number}` : escapeMarkdown(name),
            mentions: /^\d+$/.test(number) ? [jid] : undefined
        };
    }
    return { text: escapeMarkdown(name) };
}

function getChallengeTargetIdentifier(message, args = message.args || []) {
    const discordMention = message.platform === "discord"
        ? message.raw?.mentions?.users?.first?.()?.id
        : null;
    return discordMention ||
        message.mentionedJids?.[0] ||
        message.quoted?.userId ||
        args.join(" ").trim();
}

function findTargetCentral(centralAccounts, platform, rawIdentifier) {
    const token = String(rawIdentifier || "").trim();
    if (!token) throw new Error("Mencione ou informe o ID do usuário que deseja desafiar.");
    const cleaned = token
        .replace(/^<@!?/, "")
        .replace(/>$/, "")
        .replace(/^@/, "")
        .toLowerCase();
    const accounts = centralAccounts.getAllCentralAccounts();
    for (const central of accounts) {
        const linked = (central.platformAccounts || [])
            .filter(account => account.platform === platform);
        const matched = linked.find(account => {
            const platformId = String(account.platformId || "").toLowerCase();
            const username = String(account.username || "").replace(/^@/, "").toLowerCase();
            if (platformId === cleaned || username === cleaned) return true;
            if (platform === "whatsapp") {
                const tokenDigits = cleaned.replace(/\D/g, "");
                const idDigits = platformId.split("@")[0].replace(/\D/g, "");
                return tokenDigits && tokenDigits === idDigits;
            }
            return false;
        });
        if (matched) return { central, platformId: matched.platformId, account: matched };
    }
    throw new Error("Não encontrei uma Conta Central vinculada a esse usuário nesta plataforma.");
}

function currentScope(message) {
    const scope = economy.getScope(message);
    if (!scope) throw new Error("As batalhas só podem ser iniciadas em grupos ou servidores.");
    return scope;
}

function buildActionMessage(message, battle, store, events) {
    return makeBattlePayload(message, battle, store, events);
}

function makeNoticePayload(message, title, lines) {
    const body = lines.join("\n");
    if (message.platform === "discord") {
        return {
            embed: {
                color: 0x2787d4,
                title,
                description: escapeMarkdown(body)
            }
        };
    }
    if (message.platform === "telegram") {
        return {
            text: `<b>${escapeHtml(title)}</b>\n\n${escapeHtml(body)}`,
            parse_mode: "HTML"
        };
    }
    return { text: `*${title}*\n\n${body}` };
}

function encodeTeamIds(ids) {
    return ids.length ? ids.map(id => Number(id).toString(36)).join(",") : "-";
}

function decodeTeamIds(value) {
    if (!value || value === "-") return [];
    return value.split(",").map(token => {
        const id = Number.parseInt(token, 36);
        if (!Number.isSafeInteger(id) || id < 0) {
            throw new Error("A seleção da equipe expirou. Execute o comando equipe novamente.");
        }
        return id;
    });
}

function makeInitialCharacterGuide(message) {
    const prefix = getCommandPrefix(message);
    const lines = [
        "Você ainda não possui personagens para montar uma equipe.",
        `1. Abra ${prefix}catalogo e escolha uma base.`,
        "2. Abra o card de um personagem comum e escolha-o como personagem inicial.",
        `3. Volte aqui e use ${prefix}equipe <id> para formar sua equipe.`
    ];
    const choices = [{
        id: "catalogo:page:1",
        label: "📚 Abrir catálogo",
        style: ButtonStyle.Success
    }];
    if (message.platform === "discord") {
        return {
            embed: {
                color: 0x7c5ce7,
                title: "🎁 Primeiro, escolha seu personagem",
                description: escapeMarkdown(lines.join("\n"))
            },
            ...makeButtons(message.platform, choices)
        };
    }
    if (message.platform === "telegram") {
        return {
            text: `<b>🎁 Primeiro, escolha seu personagem</b>\n\n${lines.map(escapeHtml).join("\n")}`,
            parse_mode: "HTML",
            ...makeButtons(message.platform, choices)
        };
    }
    return { text: `*🎁 Primeiro, escolha seu personagem*\n\n${lines.join("\n")}` };
}

function makeTeamWizardPayload(message, profile, catalog, selectedIds, page = 1) {
    const prefix = getCommandPrefix(message);
    const owned = profile.characters
        .map(save => ({
            save,
            character: catalog.personagens.find(entry => entry.id === save.characterId)
        }))
        .filter(entry => entry.character);
    const ownedIds = new Set(owned.map(entry => entry.character.id));
    const selected = selectedIds.filter(id => ownedIds.has(id)).slice(0, 3);
    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(owned.length / pageSize));
    const currentPage = Math.max(1, Math.min(Number(page) || 1, totalPages));
    const pageCharacters = owned.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const selectedLines = selected.length
        ? selected.map((id, index) => {
            const character = catalog.personagens.find(entry => entry.id === id);
            return `${index + 1}. ${id} · ${character?.nome || "Personagem"}`;
        })
        : ["Nenhum personagem selecionado."];
    const lines = [
        "Toque/clique nos personagens para adicionar ou remover da equipe.",
        "A ordem selecionada é mantida; você pode escolher até 3.",
        `Selecionados (${selected.length}/3):`,
        ...selectedLines,
        `Página ${currentPage}/${totalPages}.`
    ];
    const choices = pageCharacters
        .filter(({ character }) => selected.length < 3 || selected.includes(character.id))
        .map(({ character }) => {
            const selectedIndex = selected.indexOf(character.id);
            const marker = selectedIndex >= 0
                ? ["1️⃣", "2️⃣", "3️⃣"][selectedIndex]
                : "➕";
            return {
                id: `equipe:pick:${character.id.toString(36)}:${encodeTeamIds(selected)}:${currentPage}`,
                label: `${marker} ${character.id} · ${character.nome}`,
                style: selectedIndex >= 0 ? ButtonStyle.Success : ButtonStyle.Primary
            };
        });
    if (currentPage > 1) {
        choices.push({
            id: `equipe:page:${currentPage - 1}:${encodeTeamIds(selected)}`,
            label: "⬅️ Anterior",
            style: ButtonStyle.Secondary
        });
    }
    if (currentPage < totalPages) {
        choices.push({
            id: `equipe:page:${currentPage + 1}:${encodeTeamIds(selected)}`,
            label: "Próxima ➡️",
            style: ButtonStyle.Secondary
        });
    }
    if (selected.length) {
        choices.push({
            id: `equipe:save:${encodeTeamIds(selected)}`,
            label: `✅ Salvar equipe (${selected.length}/3)`,
            style: ButtonStyle.Success
        });
    }

    if (message.platform === "discord") {
        return {
            embed: {
                color: 0x2787d4,
                title: "🧩 Monte sua equipe RPG",
                description: escapeMarkdown(lines.join("\n")),
                footer: { text: "Sua formação é salva na Conta Central." }
            },
            ...makeButtons(message.platform, choices)
        };
    }
    if (message.platform === "telegram") {
        return {
            text: `<b>🧩 MONTE SUA EQUIPE RPG</b>\n\n${lines.map(escapeHtml).join("\n")}`,
            parse_mode: "HTML",
            ...makeButtons(message.platform, choices)
        };
    }
    return {
        text: [
            "*🧩 MONTE SUA EQUIPE RPG*",
            "",
            ...lines,
            "",
            "Para salvar pelo WhatsApp, informe os IDs em ordem:",
            `${prefix}equipe <id1> [id2] [id3]`,
            `Veja seus personagens com ${prefix}meus_personagens.`
        ].join("\n")
    };
}

async function sendPublicUpdate(message, battle, store, events = []) {
    const payload = buildActionMessage(message, battle, store, events);
    const options = message.platform === "discord"
        ? {
            embed: payload.embed,
            components: payload.components || [],
            ...(payload.text ? { content: payload.text } : {}),
            ...(payload.allowedMentions ? { allowedMentions: payload.allowedMentions } : {})
        }
        : message.platform === "telegram"
            ? {
                parse_mode: payload.parse_mode || "HTML",
                ...(payload.reply_markup ? { reply_markup: payload.reply_markup } : {})
            }
            : payload.mentions;
    return send.text(
        battle.platform,
        battle.chatId,
        battle.threadId,
        message.platform === "discord" ? payload.text || payload.embed.description : payload.text,
        options
    );
}

async function executeAction(message, action, args = []) {
    const { centralAccounts, central, store } = getStores(message);
    const scope = action === "team" ? null : currentScope(message);
    const catalog = catalogStore.readCatalog();
    if (action === "team") {
        const profile = centralAccounts.getRpgProfile(central.id);
        if (!profile.characters.length) return message.reply(makeInitialCharacterGuide(message));
        if (!args.length) {
            const payload = makeTeamWizardPayload(
                message,
                profile,
                catalog,
                profile.teamCharacterIds || []
            );
            return message.reply(payload);
        }
        const teamIds = await store.setTeam(central.id, args, catalog);
        const members = teamIds.map(id => {
            const character = catalog.personagens.find(entry => entry.id === id);
            return `${id} · ${character?.nome || "Personagem"}`;
        });
        return message.reply(makeNoticePayload(message, "✅ Equipe RPG salva", [
            ...members,
            "A ordem define quem age primeiro entre seus personagens; o primeiro vivo também fica na linha de frente."
        ]));
    }

    if (action === "challenge") {
        const identifier = getChallengeTargetIdentifier(message, args);
        const target = findTargetCentral(centralAccounts, message.platform, identifier);
        const challenge = store.createChallenge({
            message,
            centralId: central.id,
            centralName: central.name,
            opponentCentralId: target.central.id,
            opponentPlatformId: target.platformId,
            opponentName: target.central.name || target.account.displayName || target.account.username,
            catalog
        });
        return message.reply(makeChallengePayload(message, challenge));
    }

    if (action === "accept") {
        const challengeId = args[0] || store.data.challenges.find(challenge =>
            challenge.platform === message.platform &&
            challenge.scopeId === scope.id &&
            challenge.opponent.centralId === central.id
        )?.id;
        if (!challengeId) throw new Error("Não há desafio pendente para você neste grupo.");
        const battle = await store.acceptChallenge({
            challengeId,
            message,
            centralId: central.id,
            centralName: central.name,
            catalog
        });
        return message.reply(makeBattlePayload(message, battle, store, [
            `${battle.players[battle.roundStartSide].team[battle.roundOrder[0].characterIndex].name} começa por ter maior agilidade.`
        ]));
    }

    if (action === "decline") {
        const challengeId = args[0] || store.data.challenges.find(challenge =>
            challenge.platform === message.platform &&
            challenge.scopeId === scope.id &&
            challenge.opponent.centralId === central.id
        )?.id;
        if (!challengeId) throw new Error("Não há desafio pendente para você neste grupo.");
        const challenge = store.declineChallenge({
            challengeId,
            message,
            centralId: central.id
        });
        return message.reply(makeNoticePayload(message, "❌ Desafio recusado", [
            `${challenge.opponent.name} recusou o desafio de ${challenge.challenger.name}.`
        ]));
    }

    if (action === "status") {
        const battle = store.getBattleForPlayer(central.id, message.platform, scope.id);
        if (!battle) {
            const pending = store.data.challenges.filter(challenge =>
                challenge.platform === message.platform &&
                challenge.scopeId === scope.id &&
                [challenge.challenger.centralId, challenge.opponent.centralId].includes(central.id)
            );
            return message.reply(makeNoticePayload(message, "📋 Status da batalha", pending.length
                ? pending.map(challenge =>
                    `Desafio ${challenge.id}: ${challenge.challenger.name} → ${challenge.opponent.name}`
                )
                : ["Você não tem batalha ativa nem desafios pendentes neste grupo."]));
        }
        return message.reply(makeBattlePayload(message, battle, store));
    }

    if (action === "attack") {
        const battle = store.getBattleForPlayer(central.id, message.platform, scope.id);
        if (!battle) throw new Error("Você não tem uma batalha ativa neste grupo.");
        const requestedMove = args.join(" ").trim();
        if (!requestedMove) throw new Error(`Informe o nome ou ID do golpe: ${getCommandPrefix(message)}ataque <nome ou id>.`);
        const numericId = /^\d+$/.test(requestedMove) ? Number(requestedMove) : null;
        const matchingMoves = catalog.golpes.filter(move =>
            move.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() ===
            requestedMove.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        );
        if (numericId === null && matchingMoves.length > 1) {
            throw new Error("Há mais de um golpe com esse nome. Use o ID do golpe.");
        }
        const moveId = numericId ?? matchingMoves[0]?.id;
        if (moveId === undefined) throw new Error(`Não encontrei o golpe "${requestedMove}".`);
        const outcome = await store.attack({
            battleId: battle.id,
            centralId: central.id,
            moveId
        });
        if (outcome.expired) {
            return message.reply(makeNoticePayload(message, "⏰ Turno expirado", [
                "Seu turno expirou e a batalha foi encerrada."
            ]));
        }
        return message.reply(makeBattlePayload(message, outcome.battle, store, outcome.events));
    }

    if (action === "surrender") {
        const battle = store.getBattleForPlayer(central.id, message.platform, scope.id);
        if (!battle) throw new Error("Você não tem uma batalha ativa neste grupo.");
        const completed = await store.surrender({ battleId: battle.id, centralId: central.id });
        return message.reply(makeBattlePayload(message, completed, store, [
            `${central.name || message.displayName || "Um jogador"} desistiu.`
        ]));
    }

    throw new Error("Comando de batalha desconhecido.");
}

async function execute(message, action) {
    try {
        return await executeAction(message, action, message.args || []);
    } catch (error) {
        return message.reply(makeNoticePayload(message, "❌ Não foi possível concluir", [error.message]));
    }
}

async function handleInteraction(interaction) {
    const componentId = String(interaction.customId || interaction.callbackQuery?.data || "");
    const [prefix, action, battleId, value, pageValue] = componentId.split(":");
    const teamActions = ["pick", "page", "save"];
    if (prefix !== "equipe" ||
        (!teamActions.includes(action) && !["accept", "decline", "attack", "surrender"].includes(action))) {
        return false;
    }
    const message = interaction[COMPONENT_CONTEXT];
    if (!message) return true;

    let acknowledged = false;
    const acknowledge = async (text = null) => {
        if (interaction.callbackQuery) {
            acknowledged = true;
            return interaction.answerCbQuery(
                text || undefined,
                text ? { show_alert: true } : undefined
            );
        }
        if (!interaction.deferred && !interaction.replied) {
            const result = await interaction.deferUpdate();
            acknowledged = true;
            return result;
        }
        acknowledged = true;
        return undefined;
    };
    try {
        const { central, centralAccounts, store } = getStores(message);
        const catalog = catalogStore.readCatalog();
        if (teamActions.includes(action)) {
            const profile = centralAccounts.getRpgProfile(central.id);
            if (action === "save") {
                const selected = decodeTeamIds(battleId);
                if (!selected.length) throw new Error("Selecione ao menos um personagem para salvar a equipe.");
                const teamIds = await store.setTeam(central.id, selected, catalog);
                const members = teamIds.map(id => {
                    const character = catalog.personagens.find(entry => entry.id === id);
                    return `${id} · ${character?.nome || "Personagem"}`;
                });
                const payload = makeNoticePayload(message, "✅ Equipe RPG salva", members);
                if (interaction.callbackQuery) {
                    await acknowledge();
                    await interaction.editMessageText(payload.text, {
                        parse_mode: payload.parse_mode,
                        reply_markup: { inline_keyboard: [] }
                    });
                } else {
                    acknowledged = true;
                    await interaction.update({
                        content: null,
                        embeds: [payload.embed],
                        components: []
                    });
                }
                return true;
            }

            let selected;
            let page;
            if (action === "pick") {
                selected = decodeTeamIds(value);
                page = pageValue;
                const characterId = Number.parseInt(battleId, 36);
                if (!Number.isSafeInteger(characterId) ||
                    !profile.characters.some(save => save.characterId === characterId)) {
                    throw new Error("Esse personagem não pertence à sua conta.");
                }
                selected = selected.filter(id =>
                    profile.characters.some(save => save.characterId === id)
                );
                if (selected.includes(characterId)) {
                    selected = selected.filter(id => id !== characterId);
                } else if (selected.length >= 3) {
                    throw new Error("A equipe aceita até 3 personagens. Remova um antes de adicionar outro.");
                } else {
                    selected.push(characterId);
                }
            } else {
                selected = decodeTeamIds(value);
                page = battleId;
            }
            const payload = makeTeamWizardPayload(message, profile, catalog, selected, page);
            if (interaction.callbackQuery) {
                await acknowledge();
                await interaction.editMessageText(payload.text, {
                    parse_mode: payload.parse_mode,
                    reply_markup: payload.reply_markup || { inline_keyboard: [] }
                });
            } else {
                acknowledged = true;
                await interaction.update({
                    content: null,
                    embeds: [payload.embed],
                    components: payload.components || []
                });
            }
            return true;
        }
        if (action === "accept") {
            const battle = await store.acceptChallenge({
                challengeId: battleId,
                message,
                centralId: central.id,
                centralName: central.name,
                catalog
            });
            await acknowledge();
            await sendPublicUpdate(message, battle, store, [
                `${battle.players[battle.roundStartSide].team[battle.roundOrder[0].characterIndex].name} começa por ter maior agilidade.`
            ]);
            return true;
        }
        if (action === "decline") {
            const challenge = store.declineChallenge({
                challengeId: battleId,
                message,
                centralId: central.id
            });
            await acknowledge();
            await send.text(
                message.platform,
                message.chatId,
                message.threadId,
                `${challenge.opponent.name} recusou o desafio de ${challenge.challenger.name}.`
            );
            return true;
        }
        const scope = currentScope(message);
        const battle = store.getBattleForPlayer(central.id, message.platform, scope.id);
        if (!battle || battle.id !== battleId) throw new Error("Esta batalha não está ativa para você.");
        if (action === "attack") {
            const outcome = await store.attack({
                battleId,
                centralId: central.id,
                moveId: value
            });
            if (outcome.expired) throw new Error("Seu turno expirou e a batalha foi encerrada.");
            await acknowledge();
            await sendPublicUpdate(message, outcome.battle, store, outcome.events);
            return true;
        }
        const completed = await store.surrender({ battleId, centralId: central.id });
        await acknowledge();
        await sendPublicUpdate(message, completed, store, [
            `${central.name || message.displayName || "Um jogador"} desistiu.`
        ]);
        return true;
    } catch (error) {
        if (interaction.callbackQuery && !acknowledged) {
            await interaction.answerCbQuery(error.message.slice(0, 180), { show_alert: true });
        } else if (interaction.callbackQuery) {
            console.error("[rpgBattle] Ação processada, mas não foi possível publicar o resultado:", error);
        } else {
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: `❌ ${error.message}`, ephemeral: true });
            } else {
                await interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
            }
        }
        return true;
    }
}

module.exports = {
    execute,
    executeAction,
    handleInteraction,
    _internals: {
        makeChallengePayload,
        makeBattlePayload,
        findTargetCentral,
        getChallengeTargetIdentifier,
        challengeMention,
        makeNoticePayload,
        makeInitialCharacterGuide,
        makeTeamWizardPayload,
        encodeTeamIds,
        decodeTeamIds,
        sendPublicUpdate
    }
};
