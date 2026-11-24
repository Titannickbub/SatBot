const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { isOwner } = require("./owners");
const catalogStore = require("./rpgMaker");

const drafts = new Map();
const COMPONENT_CONTEXT = Symbol.for("satbot.componentMessageContext");

function draftKey(command, message) {
    return `${command}:${message.platform}:${message.userId}`;
}

function getText(message, startIndex = 1) {
    return typeof message.getArgText === "function"
        ? message.getArgText(startIndex).trim()
        : (message.args || []).slice(startIndex).join(" ").trim();
}

function makeChoices(message, choices) {
    if (message.platform === "discord") {
        const rows = [];
        for (let index = 0; index < choices.length; index += 5) {
            rows.push(new ActionRowBuilder().addComponents(
                ...choices.slice(index, index + 5).map(choice =>
                    new ButtonBuilder()
                        .setCustomId(choice.id)
                        .setLabel(choice.label.slice(0, 80))
                        .setStyle(choice.style || ButtonStyle.Secondary)
                )
            ));
        }
        return { components: rows };
    }
    if (message.platform === "telegram") {
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

function selectionChoices(command, field, entries, selected, doneLabel = "Concluir seleção") {
    const choices = entries.slice(0, 20).map(entry => ({
        id: `${command}:toggle:${field}:${entry.id}`,
        label: `${selected.includes(entry.id) ? "✅ " : ""}${entry.id} · ${entry.nome}`
    }));
    choices.push({ id: `${command}:done:${field}`, label: doneLabel, style: ButtonStyle.Success });
    return choices;
}

function hasPermission(message) {
    return Boolean(message.sender?.isOwner || isOwner(message));
}

async function reply(message, text, buttons = [], interaction = null) {
    const payload = {
        text,
        ...makeChoices(message, buttons)
    };
    if (!interaction) return message.reply(payload);
    if (interaction.callbackQuery) {
        await interaction.answerCbQuery();
        return interaction.editMessageText(text, payload.reply_markup ? {
            reply_markup: payload.reply_markup
        } : { reply_markup: { inline_keyboard: [] } });
    }
    return interaction.update({
        content: text,
        embeds: [],
        components: payload.components || []
    });
}

function promptForMove(message, draft, interaction = null) {
    const prompts = {
        nome: "Informe o nome do golpe com `!rpggolpe continuar <nome>`.",
        dano: "Informe o dano base (número >= 0).",
        mana: "Informe o custo de mana (número >= 0).",
        stamina: "Informe o custo de stamina (número >= 0).",
        hp: "Informe o custo de HP (número >= 0). Pode ser letal.",
        tipo: "Escolha o tipo do golpe. Selecione um atributo ou use golpe sem tipo.",
        nivel: "Informe o nível de desbloqueio (inteiro >= 0).",
        frases: "Envie uma frase para o golpe; use `{personagem}` e `{alvo}`. Para terminar, envie `fim`.",
        efeitos: "Selecione os efeitos do golpe e conclua. No WhatsApp, use `!rpggolpe efeito <id>` e depois `!rpggolpe fim`.",
        complete: "Todas as etapas foram concluídas. Envie `!rpggolpe salvar` para criar o golpe."
    };
    const catalog = catalogStore.readCatalog();
    let buttons = [];
    if (draft.step === "tipo") {
        buttons = catalog.fraquezas.map(item => ({
            id: `rpggolpe:type:${item.id}`,
            label: `${item.id} · ${item.nome}`
        }));
        buttons.push({ id: "rpggolpe:type:none", label: "Sem tipo" });
    } else if (draft.step === "efeitos") {
        buttons = selectionChoices("rpggolpe", "efeitos", catalog.efeitos, draft.data.efeitos);
    }
    return reply(message, `🗡️ Criador de golpes · Etapa ${draft.step}\n${prompts[draft.step]}\n\nProgresso: ${Object.keys(draft.data).join(", ") || "iniciando"}`, buttons, interaction);
}

function promptForCharacter(message, draft, interaction = null) {
    const prompts = {
        nome: "Informe o nome do personagem com `!rpgpersonagem continuar <nome>`.",
        hp: "Informe o HP inicial (> 0).",
        mana: "Informe a mana inicial (>= 0).",
        stamina: "Informe a stamina inicial (>= 0).",
        agilidade: "Informe a agilidade inicial (>= 0).",
        imagem: "Anexe uma imagem PNG, JPEG, GIF ou WebP e envie `!rpgpersonagem continuar`.",
        fraquezas: "Selecione uma ou mais fraquezas/afinidades de combate. Conclua quando terminar.",
        clonador: "O personagem pode clonar golpes?",
        golpes: "Selecione os golpes permanentes. Conclua quando terminar.",
        limite: "Informe o limite total de golpes, ou escolha ilimitado.",
        complete: "Todas as etapas foram concluídas. Envie `!rpgpersonagem salvar` para criar o personagem."
    };
    const catalog = catalogStore.readCatalog();
    let buttons = [];
    if (draft.step === "fraquezas") {
        buttons = selectionChoices("rpgpersonagem", "fraquezas", catalog.fraquezas, draft.data.fraquezas);
        buttons.push({
            id: "rpgpersonagem:next:afinidades",
            label: "Continuar para afinidades (opcional)",
            style: ButtonStyle.Primary
        });
    } else if (draft.step === "afinidades") {
        buttons = selectionChoices("rpgpersonagem", "afinidades", catalog.fraquezas, draft.data.afinidades);
    } else if (draft.step === "clonador") {
        buttons = [
            { id: "rpgpersonagem:clone:yes", label: "Sim, pode clonar", style: ButtonStyle.Success },
            { id: "rpgpersonagem:clone:no", label: "Não clona", style: ButtonStyle.Secondary }
        ];
    } else if (draft.step === "golpes") {
        buttons = selectionChoices("rpgpersonagem", "golpes", catalog.golpes, draft.data.golpesPermanentes);
    } else if (draft.step === "limite") {
        buttons = [{ id: "rpgpersonagem:limit:unlimited", label: "Sem limite", style: ButtonStyle.Primary }];
    }
    return reply(message, `🧙 Criador de personagens · Etapa ${draft.step}\n${prompts[draft.step]}`, buttons, interaction);
}

function beginDraft(message, command, kind) {
    const draft = kind === "move"
        ? { step: "nome", data: { frases: [], efeitos: [] } }
        : {
            step: "nome",
            data: {
                fraquezas: [],
                afinidades: [],
                golpesPermanentes: [],
                podeClonarGolpes: false
            }
        };
    drafts.set(draftKey(command, message), draft);
    return draft;
}

function advanceDraft(draft, kind) {
    const moveSteps = ["nome", "dano", "mana", "stamina", "hp", "tipo", "nivel", "frases", "efeitos"];
    const characterSteps = ["nome", "hp", "mana", "stamina", "agilidade", "imagem", "fraquezas", "clonador"];
    const steps = kind === "move" ? moveSteps : characterSteps;
    const currentIndex = steps.indexOf(draft.step);
    draft.step = steps[currentIndex + 1] || "complete";
}

function parseNumber(value, label, integer = false) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || (integer && !Number.isInteger(number))) {
        throw new Error(`${label} inválido.`);
    }
    return number;
}

async function executeMove(message, args) {
    const action = String(args[0] || "").toLowerCase();
    const key = draftKey("rpggolpe", message);
    if (action === "criar") {
        const catalog = catalogStore.readCatalog();
        if (!catalog.fraquezas.length) throw new Error("Crie primeiro os atributos com !rpgatributo adicionar <nome>.");
        const draft = beginDraft(message, "rpggolpe", "move");
        return promptForMove(message, draft);
    }
    const draft = drafts.get(key);
    if (action === "cancelar") {
        drafts.delete(key);
        return message.reply({ text: "Criação do golpe cancelada." });
    }
    if (!draft) throw new Error("Nenhuma criação de golpe ativa. Use !rpggolpe criar.");
    if (action === "continuar") {
        const input = getText(message, 1);
        if (draft.step === "frases") {
            if (input.toLowerCase() === "fim") {
                if (!draft.data.frases.length) throw new Error("Adicione ao menos uma frase antes de concluir.");
                draft.step = "efeitos";
            } else {
                if (!input) throw new Error("Informe a frase ou `fim`.");
                if (input.length > 300) throw new Error("Cada frase pode ter até 300 caracteres.");
                draft.data.frases.push(input);
            }
        } else if (draft.step === "efeitos") {
            if (input.toLowerCase() !== "fim") throw new Error("Use os botões para escolher efeitos ou envie `fim`.");
            draft.step = "complete";
        } else if (draft.step === "tipo") {
            throw new Error("Escolha o tipo pelos botões ou use `!rpggolpe tipo nenhum`.");
        } else {
            const text = input;
            if (!text) throw new Error("Informe um valor para esta etapa.");
            if (draft.step === "nome") draft.data.nome = text;
            else if (draft.step === "dano") draft.data.dano = parseNumber(text, "Dano");
            else if (draft.step === "mana") draft.data.custo ||= {}, draft.data.custo.mana = parseNumber(text, "Custo de mana");
            else if (draft.step === "stamina") draft.data.custo ||= {}, draft.data.custo.stamina = parseNumber(text, "Custo de stamina");
            else if (draft.step === "hp") draft.data.custo ||= {}, draft.data.custo.hp = parseNumber(text, "Custo de HP");
            else if (draft.step === "nivel") draft.data.nivelDesbloqueio = parseNumber(text, "Nível", true);
            advanceDraft(draft, "move");
        }
        return promptForMove(message, draft);
    }
    if (action === "tipo") {
        const type = String(args[1] || "").toLowerCase();
        if (type === "nenhum") {
            draft.data.tipoFraquezaId = null;
        } else {
            const id = parseNumber(type, "ID do tipo", true);
            if (!catalogStore.readCatalog().fraquezas.some(item => item.id === id)) {
                throw new Error("Atributo não encontrado.");
            }
            draft.data.tipoFraquezaId = id;
        }
        draft.step = "nivel";
        return promptForMove(message, draft);
    }
    if (action === "efeito") {
        const id = parseNumber(args[1], "ID do efeito", true);
        const catalog = catalogStore.readCatalog();
        if (!catalog.efeitos.some(effect => effect.id === id)) throw new Error("Efeito não encontrado.");
        if (!draft.data.efeitos.includes(id)) draft.data.efeitos.push(id);
        return promptForMove(message, draft);
    }
    if (action === "fim" && draft.step === "efeitos") {
        draft.step = "complete";
        return promptForMove(message, draft);
    }
    if (action === "salvar") {
        if (draft.step !== "complete") throw new Error("Conclua todas as etapas antes de salvar.");
        const catalog = catalogStore.readCatalog();
        const move = catalogStore.createMove(catalog, draft.data);
        catalogStore.persist(catalog);
        drafts.delete(key);
        return message.reply({ text: `✅ Golpe "${move.nome}" criado com ID ${move.id}.` });
    }
    if (action === "tipo") return promptForMove(message, draft);
    throw new Error("Use !rpggolpe criar, continuar <valor>, tipo nenhum, efeito <id>, fim, salvar ou cancelar.");
}

async function executeCharacter(message, args) {
    const action = String(args[0] || "").toLowerCase();
    const key = draftKey("rpgpersonagem", message);
    if (action === "criar") {
        const catalog = catalogStore.readCatalog();
        if (!catalog.fraquezas.length) throw new Error("Crie primeiro atributos com !rpgatributo adicionar <nome>.");
        if (!catalog.golpes.length) throw new Error("Crie primeiro golpes com !rpggolpe criar.");
        const draft = beginDraft(message, "rpgpersonagem", "character");
        return promptForCharacter(message, draft);
    }
    const draft = drafts.get(key);
    if (action === "cancelar") {
        drafts.delete(key);
        return message.reply({ text: "Criação do personagem cancelada." });
    }
    if (!draft) throw new Error("Nenhuma criação de personagem ativa. Use !rpgpersonagem criar.");
    if (action === "continuar") {
        const value = getText(message, 1);
        if (draft.step === "imagem") {
            const media = message.media || message.quoted?.media;
            if (!media || typeof media.getBuffer !== "function") throw new Error("Anexe ou responda com uma imagem.");
            draft.image = await media.getBuffer();
            catalogStore.detectImageFormat(draft.image);
            draft.step = "fraquezas";
        } else if (draft.step === "fraquezas") {
            const id = parseNumber(value, "ID da fraqueza", true);
            const catalog = catalogStore.readCatalog();
            if (!catalog.fraquezas.some(item => item.id === id)) throw new Error("Atributo não encontrado.");
            if (!draft.data.fraquezas.includes(id)) draft.data.fraquezas.push(id);
        } else if (draft.step === "afinidades") {
            const id = parseNumber(value, "ID da afinidade", true);
            const catalog = catalogStore.readCatalog();
            if (!catalog.fraquezas.some(item => item.id === id)) throw new Error("Atributo não encontrado.");
            if (!draft.data.afinidades.includes(id)) draft.data.afinidades.push(id);
        } else {
            if (!value) throw new Error("Informe um valor para esta etapa.");
            if (draft.step === "nome") draft.data.nome = value;
            else if (["hp", "mana", "stamina", "agilidade"].includes(draft.step)) {
                draft.data[draft.step] = parseNumber(value, draft.step, draft.step !== "hp");
                if (draft.step === "hp" && draft.data.hp === 0) throw new Error("HP precisa ser maior que zero.");
            } else if (draft.step === "limite") {
                draft.data.limiteGolpesAprendidos = parseNumber(value, "Limite", true);
                draft.step = "complete";
            } else if (draft.step === "golpes") {
                const id = parseNumber(value, "ID do golpe", true);
                const catalog = catalogStore.readCatalog();
                if (!catalog.golpes.some(move => move.id === id)) throw new Error("Golpe não encontrado.");
                if (!draft.data.golpesPermanentes.includes(id)) draft.data.golpesPermanentes.push(id);
            } else {
                throw new Error("Use os botões para escolher a próxima etapa.");
            }
            if (["nome", "hp", "mana", "stamina", "agilidade"].includes(draft.step)) {
                advanceDraft(draft, "character");
            }
        }
        return promptForCharacter(message, draft);
    }
    if (action === "fim") {
        if (draft.step === "fraquezas") {
            if (!draft.data.fraquezas.length) throw new Error("Selecione ao menos uma fraqueza.");
            draft.step = "afinidades";
        }
        else if (draft.step === "afinidades") draft.step = "clonador";
        else if (draft.step === "golpes") draft.step = "limite";
        else throw new Error("Não há seleção aberta para concluir.");
        return promptForCharacter(message, draft);
    }
    if (action === "clonar" && draft.step === "clonador") {
        const value = String(args[1] || "").toLowerCase();
        if (!["sim", "nao", "não"].includes(value)) {
            throw new Error("Use `!rpgpersonagem clonar sim` ou `!rpgpersonagem clonar nao`.");
        }
        draft.data.podeClonarGolpes = value === "sim";
        draft.step = draft.data.podeClonarGolpes ? "limite" : "golpes";
        return promptForCharacter(message, draft);
    }
    if (action === "golpe") {
        if (draft.step !== "golpes") throw new Error("A seleção de golpes permanentes ainda não está aberta.");
        const id = parseNumber(args[1], "ID do golpe", true);
        const catalog = catalogStore.readCatalog();
        if (!catalog.golpes.some(move => move.id === id)) throw new Error("Golpe não encontrado.");
        if (!draft.data.golpesPermanentes.includes(id)) draft.data.golpesPermanentes.push(id);
        return promptForCharacter(message, draft);
    }
    if (action === "limite" && args[1]?.toLowerCase() === "ilimitado") {
        draft.data.limiteGolpesAprendidos = null;
        draft.step = "complete";
        return promptForCharacter(message, draft);
    }
    if (action === "salvar") {
        if (draft.step !== "complete") throw new Error("Conclua todas as etapas antes de salvar.");
        if (!draft.image) throw new Error("A imagem do personagem é obrigatória.");
        const catalog = catalogStore.readCatalog();
        const character = catalogStore.saveCharacter(catalog, draft.data, draft.image);
        drafts.delete(key);
        return message.reply({ text: `✅ Personagem "${character.nome}" criado com ID ${character.id}.` });
    }
    throw new Error("Use !rpgpersonagem criar, continuar <valor>, fim, golpe <id>, limite ilimitado, salvar ou cancelar.");
}

function createAttributeCommand() {
    return {
        name: "rpgatributo",
        aliases: ["rpg_atributo"],
        category: "system/rpg_maker",
        description: "Cria os tipos globais usados por fraquezas, afinidades e golpes. Somente SU.",
        usage: "!rpgatributo adicionar <nome> | listar",
        async execute(message) {
            if (!hasPermission(message)) return message.reply({ text: "❌ Somente superusuários podem editar os dados globais do RPG." });
            try {
                const [rawAction, ...rest] = message.args || [];
                const action = String(rawAction || "").toLowerCase();
                const catalog = catalogStore.readCatalog();
                if (action === "adicionar") {
                    const name = typeof message.getArgText === "function" ? message.getArgText(1).trim() : rest.join(" ").trim();
                    const item = catalogStore.createAttribute(catalog, name);
                    catalogStore.persist(catalog);
                    return message.reply({ text: `✅ Atributo "${item.nome}" criado com ID ${item.id}.` });
                }
                if (action === "efeito" && String(rest[0] || "").toLowerCase() === "adicionar") {
                    const name = typeof message.getArgText === "function" ? message.getArgText(2).trim() : rest.slice(1).join(" ").trim();
                    const effect = catalogStore.createEffect(catalog, name);
                    catalogStore.persist(catalog);
                    return message.reply({ text: `✅ Efeito "${effect.nome}" criado com ID ${effect.id}.` });
                }
                if (action === "listar" || action === "efeitos") {
                    const entries = action === "efeitos" ? catalog.efeitos : catalog.fraquezas;
                    const label = action === "efeitos" ? "Efeitos globais" : "Atributos globais";
                    const text = entries.map(item => `${item.id} · ${item.nome}`).join("\n") || `Nenhum ${action === "efeitos" ? "efeito" : "atributo"} cadastrado.`;
                    return message.reply({ text: `🌐 ${label}\n${text}` });
                }
                return message.reply({ text: "Uso: !rpgatributo adicionar <nome>, !rpgatributo listar, !rpgatributo efeito adicionar <nome> ou !rpgatributo efeitos." });
            } catch (error) {
                return message.reply({ text: `❌ ${error.message}` });
            }
        }
    };
}

function createMoveCommand() {
    return {
        name: "rpggolpe",
        aliases: ["rpg_golpe"],
        category: "system/rpg_maker",
        description: "Criador passo a passo de golpes globais do RPG. Somente SU.",
        usage: "!rpggolpe criar",
        async execute(message) {
            if (!hasPermission(message)) return message.reply({ text: "❌ Somente superusuários podem editar os dados globais do RPG." });
            try {
                return await executeMove(message, message.args || []);
            } catch (error) {
                return message.reply({ text: `❌ ${error.message}` });
            }
        },
        async handleInteraction(interaction) {
            const id = String(interaction.customId || interaction.callbackQuery?.data || "");
            if (!id.startsWith("rpggolpe:")) return false;
            const message = interaction[COMPONENT_CONTEXT];
            if (!message || !hasPermission(message)) return true;
            const [, action, value] = id.split(":");
            const draft = drafts.get(draftKey("rpggolpe", message));
            if (!draft) return reply(message, "❌ Essa etapa expirou. Inicie novamente com !rpggolpe criar.", [], interaction);
            if (action === "type") {
                draft.data.tipoFraquezaId = value === "none" ? null : Number(value);
                draft.step = "nivel";
            } else if (action === "toggle" && value === "efeitos") {
                const effectId = Number(id.split(":")[3]);
                draft.data.efeitos = draft.data.efeitos.includes(effectId)
                    ? draft.data.efeitos.filter(item => item !== effectId)
                    : [...draft.data.efeitos, effectId];
            } else if (action === "done" && value === "efeitos") {
                draft.step = "complete";
            }
            return promptForMove(message, draft, interaction);
        }
    };
}

function createCharacterCommand() {
    return {
        name: "rpgpersonagem",
        aliases: ["rpg_personagem"],
        category: "system/rpg_maker",
        description: "Criador passo a passo de personagens globais do RPG. Somente SU.",
        usage: "!rpgpersonagem criar",
        async execute(message) {
            if (!hasPermission(message)) return message.reply({ text: "❌ Somente superusuários podem editar os dados globais do RPG." });
            try {
                return await executeCharacter(message, message.args || []);
            } catch (error) {
                return message.reply({ text: `❌ ${error.message}` });
            }
        },
        async handleInteraction(interaction) {
            const id = String(interaction.customId || interaction.callbackQuery?.data || "");
            if (!id.startsWith("rpgpersonagem:")) return false;
            const message = interaction[COMPONENT_CONTEXT];
            if (!message || !hasPermission(message)) return true;
            const draft = drafts.get(draftKey("rpgpersonagem", message));
            if (!draft) return reply(message, "❌ Essa etapa expirou. Inicie novamente com !rpgpersonagem criar.", [], interaction);
            const [, action, field, rawValue] = id.split(":");
            const value = rawValue === undefined ? field : rawValue;
            if (action === "toggle") {
                const list = field === "fraquezas" ? "fraquezas"
                    : field === "afinidades" ? "afinidades" : "golpesPermanentes";
                const targetId = Number(rawValue);
                draft.data[list] = draft.data[list] || [];
                draft.data[list] = draft.data[list].includes(targetId)
                    ? draft.data[list].filter(item => item !== targetId)
                    : [...draft.data[list], targetId];
            } else if (action === "done") {
                if (field === "fraquezas" && !draft.data.fraquezas.length) {
                    return reply(message, "❌ Selecione ao menos uma fraqueza.", [], interaction);
                }
                draft.step = field === "fraquezas" ? "afinidades"
                    : field === "afinidades" ? "clonador"
                        : "limite";
            } else if (action === "next" && field === "afinidades") {
                draft.step = "afinidades";
            } else if (action === "clone") {
                draft.data.podeClonarGolpes = field === "yes";
                if (draft.data.podeClonarGolpes) {
                    draft.step = "limite";
                } else {
                    draft.step = "golpes";
                }
            } else if (action === "limit" && field === "unlimited") {
                draft.data.limiteGolpesAprendidos = null;
                draft.step = "complete";
            } else {
                return false;
            }
            return promptForCharacter(message, draft, interaction);
        }
    };
}

module.exports = {
    createAttributeCommand,
    createMoveCommand,
    createCharacterCommand,
    _internals: { drafts, executeMove, executeCharacter, promptForMove, promptForCharacter }
};
