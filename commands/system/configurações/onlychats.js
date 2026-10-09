const {
    getOnlyChatsConfig,
    setOnlyChatsEnabled,
    setOnlyChatsMode,
    setOnlyChatsMessage,
    addOnlyChatsItem,
    removeOnlyChatsItem
} = require("../../../functions/config");
const { isOwner } = require("../../../functions/owners");

const DESCRIPTION = `🔒 Gerencia a restrição exclusiva de chats e servidores (whitelist global).

🔐 Disponível apenas para superusuários / donos do bot.

📌 Regras importantes:
• Quando ativado, o bot responde apenas em contextos autorizados pela lista branca (servidores, categorias, chats, tópicos ou comandos liberados).
• Donos do bot (SU) continuam com acesso total em qualquer chat.
• Não afeta mensagens privadas (PV), que continuam gerenciadas pelo {prefix}antipv.

📋 1. Consulte o status e a lista branca:
{prefix}onlychats list
{prefix}onlychats status

Exibe o estado atual (ON/OFF), modo de bloqueio, mensagem de aviso e a lista completa de itens liberados.

✅ 2. Ative ou desative a restrição:
{prefix}onlychats on
{prefix}onlychats off

💬 3. Escolha o comportamento em chats não autorizados:
{prefix}onlychats mode reply
{prefix}onlychats mode ignore

O modo reply envia a mensagem de aviso configurada. O modo ignore silencia sem responder.

📝 4. Personalize a mensagem de aviso:
{prefix}onlychats msg <texto>
{prefix}onlychats msg ⚠️ Atendimento não autorizado neste chat.

➕ 5. Adicione itens à lista branca:
{prefix}onlychats add server
{prefix}onlychats add chat
{prefix}onlychats add categoria
{prefix}onlychats add topico
{prefix}onlychats add server 123456789 Servidor Principal

Se o ID for omitido, o sistema detecta automaticamente o contexto atual (servidor, chat, categoria ou tópico).

🎯 6. Libere comandos específicos em chats bloqueados:
{prefix}onlychats add comando ping
{prefix}onlychats allowcmd add ping
{prefix}onlychats allowcmd list

Permite que comandos essenciais (ex: ping, ajuda) funcionem mesmo em chats não autorizados.

➖ 7. Remova itens da lista branca:
{prefix}onlychats del server 123456789
{prefix}onlychats del chat 123456789
{prefix}onlychats del comando ping
{prefix}onlychats allowcmd del ping

Remove um item pelo seu ID ou nome da lista branca.`;

module.exports = {
    name: "onlychats",
    description: DESCRIPTION,
    category: "system/configurações",
    usage: "{prefix}onlychats [subcomando]",
    examples: [
        "{prefix}onlychats list",
        "{prefix}onlychats on",
        "{prefix}onlychats off",
        "{prefix}onlychats mode reply",
        "{prefix}onlychats msg ⚠️ Atendimento não autorizado neste chat.",
        "{prefix}onlychats add chat",
        "{prefix}onlychats add comando ping",
        "{prefix}onlychats allowcmd add ping",
        "{prefix}onlychats add server 123456789 Servidor Principal",
        "{prefix}onlychats del chat 123456789"
    ],

    async execute(message) {
        const isSuperUser = message.sender?.isOwner || isOwner(message);
        if (!isSuperUser) {
            return await message.reply({
                text: "❌ Apenas Super Usuários podem usar este comando."
            });
        }

        const args = message.args || [];
        const p = message.prefix || "!";

        if (!args.length) {
            return await showStatus(message);
        }

        const action = args[0].toLowerCase();

        if (action === "list" || action === "status") {
            return await showStatus(message);
        }

        if (action === "on") {
            setOnlyChatsEnabled(true);
            return await message.reply({
                text: "✅ Modo `onlychats` ATIVADO. O bot responderá apenas em chats/servidores autorizados."
            });
        }

        if (action === "off") {
            setOnlyChatsEnabled(false);
            return await message.reply({
                text: "✅ Modo `onlychats` DESATIVADO. O bot responderá em qualquer chat normalmente."
            });
        }

        if (action === "mode") {
            const modeInput = args[1] ? args[1].toLowerCase() : "";
            if (modeInput !== "ignore" && modeInput !== "reply" && modeInput !== "mensagem") {
                return await message.reply({
                    text: `❌ Modo inválido. Use:\n• \`${p}onlychats mode ignore\` (silêncio total)\n• \`${p}onlychats mode reply\` (envia aviso de bloqueio)`
                });
            }
            const mode = setOnlyChatsMode(modeInput);
            return await message.reply({
                text: `✅ Modo do \`onlychats\` alterado para: *${mode}*`
            });
        }

        if (action === "msg" || action === "message" || action === "mensagem") {
            const newMsg = (message.getArgText ? message.getArgText(1) : args.slice(1).join(" ")).trim();
            if (!newMsg) {
                return await message.reply({
                    text: `❌ Informe o texto da mensagem de bloqueio.\nExemplo: \`${p}onlychats msg ⚠️ Este bot não está autorizado a responder neste chat.\``
                });
            }
            setOnlyChatsMessage(newMsg);
            return await message.reply({
                text: `✅ Mensagem de bloqueio atualizada:\n"${newMsg}"`
            });
        }

        if (action === "allowcmd" || action === "cmd" || action === "command") {
            const subAction = args[1] ? args[1].toLowerCase() : "list";
            const cmdName = args[2] ? args[2].toLowerCase().replace(/^!/, "") : "";

            if (subAction === "add") {
                if (!cmdName) {
                    return await message.reply({ text: `❌ Informe o nome do comando.\nExemplo: \`${p}onlychats allowcmd add ping\`` });
                }
                addOnlyChatsItem("comando", cmdName, cmdName);
                return await message.reply({ text: `✅ Comando \`${cmdName}\` adicionado à lista de comandos liberados do \`onlychats\`.` });
            }

            if (subAction === "del" || subAction === "remove" || subAction === "rem") {
                if (!cmdName) {
                    return await message.reply({ text: `❌ Informe o nome do comando para remover.\nExemplo: \`${p}onlychats allowcmd del ping\`` });
                }
                const removed = removeOnlyChatsItem("comando", cmdName);
                if (removed) {
                    return await message.reply({ text: `✅ Comando \`${cmdName}\` removido da lista de comandos liberados.` });
                } else {
                    return await message.reply({ text: `❌ Comando \`${cmdName}\` não foi encontrado na whitelist de comandos.` });
                }
            }

            // Default fallback is list
            return await showStatus(message);
        }

        if (action === "add") {
            const typeInput = args[1];
            if (!typeInput) {
                return await message.reply({
                    text: `❌ Especifique o tipo de item para adicionar.\nUso: \`${p}onlychats add <server|categoria|chat|topico|comando> [id/nome] [descricao]\``
                });
            }

            const typeNormalized = normalizeTypeInput(typeInput);
            if (!typeNormalized) {
                return await message.reply({
                    text: `❌ Tipo inválido. Escolha entre: \`server\`, \`categoria\`, \`chat\`, \`topico\` ou \`comando\`.`
                });
            }

            let id = args[2];
            let name = args.slice(3).join(" ");

            if (typeNormalized === "comando") {
                if (!id) {
                    return await message.reply({
                        text: `❌ Informe o nome do comando a ser liberado.\nExemplo: \`${p}onlychats add comando ping\``
                    });
                }
                id = id.toLowerCase().replace(/^!/, "");
                name = name || id;
            } else {
                if (!id) {
                    // Tenta capturar do contexto atual
                    const detected = detectContext(message, typeNormalized);
                    if (!detected) {
                        return await message.reply({
                            text: `❌ Não foi possível detectar o ID de *${typeNormalized}* neste chat.\nPor favor, informe o ID manualmente: \`${p}onlychats add ${typeNormalized} <id> [nome]\``
                        });
                    }
                    id = detected.id;
                    name = name || detected.name;
                } else if (!name) {
                    name = id;
                }
            }

            const success = addOnlyChatsItem(typeNormalized, id, name);
            if (success) {
                return await message.reply({
                    text: `✅ Adicionado à whitelist do \`onlychats\`:\n• *Tipo:* ${typeNormalized}\n• *Nome/Identificador:* ${name}\n• *ID/Key:* \`${id}\``
                });
            } else {
                return await message.reply({
                    text: `❌ Falha ao adicionar item.`
                });
            }
        }

        if (action === "del" || action === "remove" || action === "rem") {
            const typeInput = args[1];
            const id = args[2];

            if (!typeInput || !id) {
                return await message.reply({
                    text: `❌ Uso incorreto. Sintaxe: \`${p}onlychats del <server|categoria|chat|topico|comando> <id|comando>\``
                });
            }

            const typeNormalized = normalizeTypeInput(typeInput);
            if (!typeNormalized) {
                return await message.reply({
                    text: `❌ Tipo inválido. Escolha entre: \`server\`, \`categoria\`, \`chat\`, \`topico\` ou \`comando\`.`
                });
            }

            const removed = removeOnlyChatsItem(typeNormalized, id);
            if (removed) {
                return await message.reply({
                    text: `✅ Item removido da whitelist de *${typeNormalized}* (ID/Comando: \`${id}\`).`
                });
            } else {
                return await message.reply({
                    text: `❌ \`${id}\` não foi encontrado na whitelist de *${typeNormalized}*.`
                });
            }
        }

        return await help(message);
    }
};

function normalizeTypeInput(input) {
    if (!input) return null;
    const t = String(input).toLowerCase().trim();
    if (t === "server" || t === "servers" || t === "servidor" || t === "servidores") return "server";
    if (t === "categoria" || t === "categorias" || t === "category" || t === "categories") return "categoria";
    if (t === "chat" || t === "chats" || t === "canal" || t === "canais" || t === "grupo" || t === "grupos") return "chat";
    if (t === "topico" || t === "topicos" || t === "topic" || t === "topics" || t === "thread" || t === "threads") return "topico";
    if (t === "comando" || t === "comandos" || t === "command" || t === "commands" || t === "cmd" || t === "cmds") return "comando";
    return null;
}

function detectContext(message, type) {
    const raw = message.raw || {};
    let id = null;
    let name = null;

    if (type === "server") {
        id = message.serverId || message.guildId || raw.guild?.id || raw.communityId || message.communityId;
        name = raw.guild?.name || message.serverName || raw.communityName || id;
    } else if (type === "categoria") {
        if (raw.channel) {
            if (typeof raw.channel.isThread === "function" && raw.channel.isThread()) {
                id = raw.channel.parent?.parentId || raw.channel.parent?.parent?.id;
                name = raw.channel.parent?.parent?.name || message.categoryName || id;
            } else {
                id = raw.channel.parentId || raw.channel.parent?.id;
                name = raw.channel.parent?.name || message.categoryName || id;
            }
        } else {
            id = message.categoryId;
            name = message.categoryName || id;
        }
    } else if (type === "chat") {
        if (raw.channel && typeof raw.channel.isThread === "function" && raw.channel.isThread()) {
            id = raw.channel.parentId || message.chatId;
            name = raw.channel.parent?.name || message.chatName || id;
        } else {
            id = message.chatId || message.target?.chatId || raw.channel?.id || (raw.chat ? raw.chat.id : null);
            name = raw.channel?.name || raw.chat?.title || message.chatName || id;
        }
    } else if (type === "topico") {
        id = message.threadId || message.topicId || raw.message_thread_id ||
            (raw.channel && typeof raw.channel.isThread === "function" && raw.channel.isThread() ? raw.channel.id : null);
        name = raw.channel?.name || message.topicName || id;
    }

    if (!id) return null;
    return { id: String(id), name: String(name || id) };
}

async function showStatus(message) {
    const cfg = getOnlyChatsConfig();
    const statusText = cfg.enabled ? "🟢 ATIVADO" : "🔴 DESATIVADO";
    const modeText = cfg.mode === "reply" ? "reply (Aviso)" : "ignore (Silêncio)";

    const formatList = (arr) => {
        if (!Array.isArray(arr) || !arr.length) return "_(nenhum)_";
        return arr.map(item => {
            if (typeof item === "object" && item !== null) {
                return `• ${item.name || item.id} (\`${item.id}\`)`;
            }
            return `• \`${item}\``;
        }).join("\n");
    };

    const text = `🔒 *Configuração OnlyChats (Exclusividade de Chats)*

• *Status:* ${statusText}
• *Modo:* ${modeText}
• *Mensagem:* ${cfg.message || "_(padrão)_"}

📋 *Lista Branca (Whitelist):*

🏰 *Servidores (${cfg.whitelist.servers.length}):*
${formatList(cfg.whitelist.servers)}

📁 *Categorias (${cfg.whitelist.categories.length}):*
${formatList(cfg.whitelist.categories)}

💬 *Chats / Canais (${cfg.whitelist.chats.length}):*
${formatList(cfg.whitelist.chats)}

📌 *Tópicos / Threads (${cfg.whitelist.topics.length}):*
${formatList(cfg.whitelist.topics)}

⚡ *Comandos Liberados (${cfg.whitelist.commands.length}):*
${formatList(cfg.whitelist.commands)}
`;

    return await message.reply({ text });
}

async function help(message) {
    const p = message.prefix || "!";
    const text = `🔒 *Comandos OnlyChats*

${p}onlychats list (exibe status e whitelist)
${p}onlychats on (ativa modo exclusivo)
${p}onlychats off (desativa modo exclusivo)
${p}onlychats mode <ignore|reply>
${p}onlychats msg <mensagem de aviso>
${p}onlychats add <server|categoria|chat|topico|comando> [id/nome]
${p}onlychats del <server|categoria|chat|topico|comando> <id/nome>
${p}onlychats allowcmd <add|del|list> <comando>`;

    return await message.reply({ text });
}
