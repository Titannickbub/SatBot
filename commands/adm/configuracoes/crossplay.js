/*
=================================================================

COMANDO: !crossplay

Gerencia a ponte e sincronização de mensagens entre plataformas
(WhatsApp, Discord e Telegram) para grupos/chats.

Sub-comandos:
  !crossplay link (ou gerar)
  !crossplay claim <codigo> (ou !crossplay <codigo>)
  !crossplay unlink (ou desvincular)
  !crossplay pref [receber|ignorar] [tipo]
  !crossplay status (ou info)
  !crossplay help

Aliases mantidos para compatibilidade:
  !crossplay_link
  !crossplay_claim
  !crossplay_unlink
  !crossplay_pref
  !cplay

=================================================================
*/

const owners = require("../../../functions/owners");

function checkOwner(message) {
    if (message.functions?.owners?.isOwner) {
        return message.functions.owners.isOwner(message);
    }
    return owners.isOwner(message);
}

function checkAdmin(message) {
    return Boolean(
        message.sender?.isAdmin ||
        message.sender?.isOwner ||
        message.sender?.canManageMessages ||
        checkOwner(message)
    );
}

const DESCRIPTION = `🌐 Gerencia o sistema de Crossplay (sincronização de mensagens e mídias entre grupos de WhatsApp, Telegram e Discord).

🔐 Disponível para administradores do chat e superusuários.

🔗 1. Iniciar vínculo e gerar código:
{prefix}crossplay link
(ou {prefix}crossplay gerar)

Gera um código temporário de 8 caracteres que expira em 5 minutos. Use esse código no grupo da outra plataforma para conectá-los.

📥 2. Conectar este grupo usando um código gerado:
{prefix}crossplay claim <codigo>
(ou {prefix}crossplay <codigo>)

Exemplo:
{prefix}crossplay claim A1B2C3D4

Conecta imediatamente este chat ao mesmo grupo de crossplay do código.

📊 3. Ver status e chats conectados:
{prefix}crossplay status
(ou {prefix}crossplay info)

Mostra se este grupo está conectado, quais outras plataformas fazem parte da ponte e as configurações de mídia.

🎛️ 4. Configurar preferências e filtros de mídia:
{prefix}crossplay pref
{prefix}crossplay pref receber <tipo>
{prefix}crossplay pref ignorar <tipo>

Tipos de mídia suportados:
text, image, video, audio, document, sticker

Exemplos:
{prefix}crossplay pref ignorar sticker
{prefix}crossplay pref receber audio

🔌 5. Desvincular e desconectar o chat do crossplay:
{prefix}crossplay unlink
(ou {prefix}crossplay desvincular)

Remove este chat da ponte e interrompe o encaminhamento de mensagens.`;

module.exports = {
    category: "adm/configurações",
    name: "crossplay",
    aliases: ["crossplay_link", "crossplay_claim", "crossplay_unlink", "crossplay_pref", "cplay"],
    description: DESCRIPTION,
    usage: "{prefix}crossplay <link|claim|unlink|pref|status|help>",

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({ text: "❌ Este comando só funciona em grupos/chats de grupo." });
        }

        const prefix = message.prefix || "!";
        const store = (message.functions && message.functions.crossplay) || global.crossplayStore;
        const centralStore = (message.functions && message.functions.centralAccounts) || global.centralAccounts;

        if (!store) {
            return message.reply({ text: "❌ O sistema de crossplay não está disponível no momento." });
        }

        // Verifica permissão de administrador/dono
        if (!checkAdmin(message)) {
            return message.reply({
                text: "⛔ *Apenas administradores deste chat ou donos do bot podem gerenciar o crossplay.*"
            });
        }

        const args = message.args || [];
        const threadId = message.threadId || (message.target && message.target.threadId) || null;
        const rawCmd = (message.command || "").toLowerCase();

        // Mapeamento automático de aliases antigos para subcomandos
        let sub = (args[0] || "").toLowerCase();
        let codeArg = args[1] || "";

        if (rawCmd === "crossplay_link") {
            sub = "link";
        } else if (rawCmd === "crossplay_claim") {
            sub = "claim";
            codeArg = args[0] || "";
        } else if (rawCmd === "crossplay_unlink") {
            sub = "unlink";
        } else if (rawCmd === "crossplay_pref") {
            sub = "pref";
        }

        // Se o usuário digitou diretamente `!crossplay A1B2C3D4` (código alfanumérico)
        if (sub && /^[A-Za-z0-9]{6,12}$/.test(sub) && !["link", "claim", "unlink", "pref", "status", "info", "help", "ajuda", "gerar", "sair", "filtro", "listar"].includes(sub)) {
            codeArg = sub;
            sub = "claim";
        }

        // =========================================================================
        // SUBCOMANDO: LINK / GERAR
        // =========================================================================
        if (sub === "link" || sub === "gerar" || sub === "novo") {
            let central = null;
            if (centralStore) {
                if (typeof centralStore.findByPlatform === "function") {
                    central = await centralStore.findByPlatform(message.platform, message.userId);
                }
                if (!central && typeof centralStore.getOrCreateByPlatform === "function") {
                    try {
                        central = await centralStore.getOrCreateByPlatform(message.platform, message.userId, {
                            username: message.username,
                            displayName: message.displayName || message.name
                        });
                    } catch {}
                }
            }

            try {
                const codeObj = await store.createLinkCode(message.platform, message.chatId, {
                    centralId: central?.id || null,
                    centralName: central?.name || message.displayName || message.name || null,
                    threadId,
                    ttlMinutes: 5
                });

                const code = codeObj.code;
                const responseText = [
                    "🔗 *VÍNCULO DE CROSSPLAY*",
                    "",
                    `🔑 Código gerado: *${code}*`,
                    "⏳ Validade: *5 minutos*",
                    "",
                    "📋 *Como conectar o outro grupo:*",
                    `1. Vá até o grupo da outra plataforma (WhatsApp / Discord / Telegram).`,
                    `2. Digite o comando:`,
                    `   *${prefix}crossplay claim ${code}*`,
                    `   *(ou simplesmente: ${prefix}crossplay ${code})*`,
                    "",
                    "💡 *Nota:* As mensagens enviadas a partir de agora serão retransmitidas entre os chats vinculados."
                ].join("\n");

                return message.reply({ text: responseText });
            } catch (err) {
                console.error("❌[CROSSPLAY] Erro ao gerar código de crossplay:", err);
                return message.reply({ text: "❌ Falha ao gerar código de crossplay. Tente novamente." });
            }
        }

        // =========================================================================
        // SUBCOMANDO: CLAIM / VINCULAR / CONECTAR
        // =========================================================================
        if (sub === "claim" || sub === "vincular" || sub === "conectar" || sub === "entrar") {
            const targetCode = (codeArg || (sub === "claim" ? args[1] : args[0]) || "").trim().toUpperCase();

            if (!targetCode) {
                return message.reply({
                    text: [
                        "❌ *Informe o código de crossplay para vincular!*",
                        "",
                        `Uso correto:`,
                        `👉 *${prefix}crossplay claim <código>*`,
                        `👉 *${prefix}crossplay <código>*`,
                        "",
                        `Exemplo: *${prefix}crossplay claim A1B2C3D4*`
                    ].join("\n")
                });
            }

            let central = null;
            if (centralStore) {
                if (typeof centralStore.findByPlatform === "function") {
                    central = await centralStore.findByPlatform(message.platform, message.userId);
                }
                if (!central && typeof centralStore.getOrCreateByPlatform === "function") {
                    try {
                        central = await centralStore.getOrCreateByPlatform(message.platform, message.userId, {
                            username: message.username,
                            displayName: message.displayName || message.name
                        });
                    } catch {}
                }
            }

            try {
                const linkedGroup = await store.claimLinkCode(targetCode, message.platform, message.chatId, {
                    centralId: central?.id || null,
                    centralName: central?.name || null,
                    threadId
                });

                const groupObj = linkedGroup || (await store.findByChat(message.platform, message.chatId, threadId));
                const totalChats = groupObj?.chats?.length || 2;

                const responseText = [
                    "✅ *CROSSPLAY VINCULADO COM SUCESSO!*",
                    "",
                    `🌐 Este grupo agora faz parte da ponte de crossplay.`,
                    `👥 Total de chats conectados nesta rede: *${totalChats}*`,
                    "",
                    `💬 As mensagens e mídias compatíveis enviadas aqui serão sincronizadas com os outros grupos vinculados.`,
                    "",
                    `⚙️ Para gerenciar filtros de mídia, use *${prefix}crossplay pref*.`,
                    `📊 Para ver os chats conectados, use *${prefix}crossplay status*.`
                ].join("\n");

                return message.reply({ text: responseText });
            } catch (err) {
                if (err.message === "invalid-code") {
                    return message.reply({ text: "❌ *Código inválido ou inexistente.* Verifique se digitou corretamente." });
                }
                if (err.message === "code-expired") {
                    return message.reply({
                        text: `❌ *Este código expirou.* Gere um novo código no outro chat usando *${prefix}crossplay link*.`
                    });
                }
                if (err.message === "group-not-found") {
                    return message.reply({ text: "❌ *Grupo de crossplay de origem não encontrado.*" });
                }
                console.error("❌[CROSSPLAY] Erro ao resgatar código:", err);
                return message.reply({ text: `❌ Falha ao vincular o crossplay: ${err.message || "Erro desconhecido"}` });
            }
        }

        // =========================================================================
        // SUBCOMANDO: UNLINK / DESVINCULAR / SAIR
        // =========================================================================
        if (sub === "unlink" || sub === "desvincular" || sub === "sair" || sub === "remover") {
            try {
                const removed = await store.unlinkChat(message.platform, message.chatId, threadId);
                if (removed) {
                    return message.reply({
                        text: [
                            "🔌 *CROSSPLAY DESCONECTADO*",
                            "",
                            "✅ Este chat foi desvinculado com sucesso.",
                            "O encaminhamento de mensagens e mídias para este grupo foi encerrado."
                        ].join("\n")
                    });
                } else {
                    return message.reply({
                        text: "⚠️ *Este chat não possui nenhuma vinculação ativa no crossplay.*"
                    });
                }
            } catch (err) {
                console.error("❌[CROSSPLAY] Erro ao desvincular chat:", err);
                return message.reply({ text: "❌ Falha ao desvincular o chat do crossplay." });
            }
        }

        // =========================================================================
        // SUBCOMANDO: PREF / PREFERÊNCIAS / FILTRO
        // =========================================================================
        if (sub === "pref" || sub === "preferencias" || sub === "filtro") {
            const link = await store.findByChat(message.platform, message.chatId, threadId);
            if (!link) {
                return message.reply({
                    text: `❌ *Este chat ainda não está vinculado ao crossplay.*\nUse *${prefix}crossplay link* para gerar um código ou *${prefix}crossplay claim <codigo>* para conectar.`
                });
            }

            const rawMode = rawCmd === "crossplay_pref" ? (args[0] || "").toLowerCase() : (args[1] || "").toLowerCase();
            const rawType = rawCmd === "crossplay_pref" ? (args[1] || "").toLowerCase() : (args[2] || "").toLowerCase();

            const prefs = await store.getPlatformPreferences(link.id, message.platform, message.chatId, threadId);

            const VALID_TYPES = ["text", "image", "video", "audio", "document", "sticker"];

            if (!rawMode || !rawType) {
                const receiving = (prefs.receiveMedia || []).length > 0 ? prefs.receiveMedia.join(", ") : "nenhum";
                const ignoring = (prefs.ignoreMedia || []).length > 0 ? prefs.ignoreMedia.join(", ") : "nenhum";

                return message.reply({
                    text: [
                        "🎛️ *PREFERÊNCIAS DE MÍDIA DO CROSSPLAY*",
                        "",
                        `📥 *Recebendo:* ${receiving}`,
                        `🚫 *Ignorando:* ${ignoring}`,
                        "",
                        "⚙️ *Para alterar as preferências:*",
                        `• *${prefix}crossplay pref receber <tipo>*`,
                        `• *${prefix}crossplay pref ignorar <tipo>*`,
                        "",
                        `Tipos válidos: *${VALID_TYPES.join(", ")}*`
                    ].join("\n")
                });
            }

            if (!VALID_TYPES.includes(rawType)) {
                return message.reply({
                    text: `❌ Tipo de mídia inválido: *${rawType}*.\nTipos válidos: *${VALID_TYPES.join(", ")}*`
                });
            }

            const next = { ...prefs };
            if (rawMode === "receber" || rawMode === "allow" || rawMode === "permitir") {
                next.receiveMedia = Array.from(new Set([...(next.receiveMedia || []), rawType]));
                next.ignoreMedia = (next.ignoreMedia || []).filter(item => item !== rawType);
            } else if (rawMode === "ignorar" || rawMode === "block" || rawMode === "bloquear") {
                next.ignoreMedia = Array.from(new Set([...(next.ignoreMedia || []), rawType]));
                next.receiveMedia = (next.receiveMedia || []).filter(item => item !== rawType);
            } else {
                return message.reply({
                    text: `❌ Modo inválido. Use *${prefix}crossplay pref receber ${rawType}* ou *${prefix}crossplay pref ignorar ${rawType}*.`
                });
            }

            await store.setPlatformPreferences(link.id, message.platform, message.chatId, next, threadId);

            return message.reply({
                text: `✅ *Preferência atualizada:* O tipo *${rawType}* foi configurado para *${rawMode}* com sucesso.`
            });
        }

        // =========================================================================
        // SUBCOMANDO: STATUS / INFO / LISTAR
        // =========================================================================
        if (sub === "status" || sub === "info" || sub === "listar") {
            const link = await store.findByChat(message.platform, message.chatId, threadId);

            if (!link) {
                return message.reply({
                    text: [
                        "📊 *STATUS DO CROSSPLAY*",
                        "",
                        "⚠️ *Status:* Desconectado / Inativo neste chat.",
                        "",
                        "💡 *Para iniciar:*",
                        `• *${prefix}crossplay link* (para criar e conectar outro grupo)`,
                        `• *${prefix}crossplay claim <codigo>* (para entrar em um grupo existente)`
                    ].join("\n")
                });
            }

            const prefs = await store.getPlatformPreferences(link.id, message.platform, message.chatId, threadId);
            const chats = Array.isArray(link.chats) ? link.chats : [];

            const platformIcons = {
                whatsapp: "🟢 WhatsApp",
                discord: "🟣 Discord",
                telegram: "🔵 Telegram"
            };

            const chatList = chats.map((c, idx) => {
                const icon = platformIcons[c.platform] || `🌐 ${c.platform}`;
                const isCurrent = c.platform === message.platform && String(c.chatId) === String(message.chatId);
                return `  ${idx + 1}. ${icon} ${isCurrent ? "*(este chat)*" : ""}`;
            }).join("\n");

            return message.reply({
                text: [
                    "📊 *STATUS DO CROSSPLAY*",
                    "",
                    `🌐 *Grupo Crossplay ID:* \`${link.id}\``,
                    `👤 *Conta Central:* ${link.displayName || "Conta Central"}`,
                    `🔗 *Chats conectados (${chats.length}):*`,
                    chatList || "  (nenhum chat registrado)",
                    "",
                    `📥 *Mídias recebidas:* ${prefs.receiveMedia?.join(", ") || "todas"}`,
                    `🚫 *Mídias ignoradas:* ${prefs.ignoreMedia?.join(", ") || "nenhuma"}`,
                    "",
                    `⚙️ Use *${prefix}crossplay help* para ver todos os comandos disponíveis.`
                ].join("\n")
            });
        }

        // =========================================================================
        // DEFAULT / HELP
        // =========================================================================
        const formattedDesc = DESCRIPTION.replace(/\{prefix\}/g, prefix);
        return message.reply({ text: formattedDesc });
    }
};
