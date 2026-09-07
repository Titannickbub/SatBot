/*
=================================================================

COMANDO: !goodbye / !despedida

Gerencia o sistema de Despedida (Goodbye) para membros que saem.
Apenas administradores do chat podem usar este comando.

Regras e Limitações por Plataforma:

  🎮 Discord:
    • O goodbye é ativo por canal de texto ou thread.
    • REGRA DE CANAL ÚNICO: Apenas 1 (um) único canal pode estar ativo por servidor.

  ✈️ Telegram:
    • Pode ser configurado em um tópico específico ou no chat principal.

  📱 WhatsApp:
    • Suportado exclusivamente em GRUPOS.
    • NÃO disponível em Comunidades ou mensagens privadas.

Sub-comandos:
  !goodbye status
  !goodbye on | off
  !goodbye mode texto | media
  !goodbye text <texto...>
  !goodbye media [url]
  !goodbye reset
  !goodbye test
  !goodbye help

=================================================================
*/

const {
    getGoodbyeConfig,
    saveGoodbyeConfig,
    getDefaultGoodbyeConfig,
    downloadAndSaveMediaLocally,
    storeMedia,
    formatWelcomeText
} = require("../../../functions/welcomeHelper");
const path = require("path");

module.exports = {
    name: "goodbye",
    aliases: ["despedida", "bye"],
    category: "adm/configurações",
    description: `Gerencia o sistema de Despedida (Goodbye) para membros que saem do grupo ou servidor.

Recursos principais:
• Ativação/Desativação individual por chat/tópico.
• Modos de envio: Apenas Texto ou Texto + Mídia (imagem, vídeo, GIF).
• Armazenamento inteligente de mídias: Discord CDN, Telegram ou local (por prioridade de disponibilidade).
• Variáveis dinâmicas no texto: {user}, {mention}, {group}, {server}, {count}, {members}.
• Teste em tempo real com !goodbye test.

Regras por plataforma:
• Discord: Apenas 1 canal de despedida ativo por servidor por vez.
• Telegram: Suporta tópicos e chat principal.
• WhatsApp: Suportado apenas em grupos (bloqueado em comunidades).`,

    usage: "{prefix}goodbye",
    examples: [
        "{prefix}goodbye status",
        "{prefix}goodbye on",
        "{prefix}goodbye mode media",
        "{prefix}goodbye text Até mais, {user}! Sentiremos sua falta no {group}.",
        "{prefix}goodbye media (enviar imagem/vídeo/gif com a legenda ou responder a uma mídia)",
        "{prefix}goodbye test",
        "{prefix}goodbye reset"
    ],

    info(message) {
        return _help(message);
    },

    async execute(message) {
        // ── 1. Bloqueio em chats privados ──────────────────────────────
        if (message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos ou servidores." });
        }

        // ── 2. Bloqueio específico do WhatsApp (somente grupos) ──────────
        if (message.platform === "whatsapp" && !message.chatId.endsWith("@g.us")) {
            return message.reply({
                text: "❌ O sistema de despedida no WhatsApp está disponível apenas em grupos de conversa.\n\n⚠️ *Não disponível em comunidades ou mensagens diretas.*"
            });
        }

        // ── 3. Permissão do USUÁRIO ─────────────────────────────────────
        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : (message.sender?.isAdmin || message.sender?.isOwner);

        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores do grupo/servidor podem configurar o sistema de despedida." });
        }

        const args = message.args || [];

        if (!args.length) {
            return message.reply({ text: _help(message) });
        }

        const subCommand = args[0].toLowerCase();
        const platform = message.platform;
        const chatId = message.chatId;
        const threadId = message.threadId || null;
        const serverId = platform === "discord" ? String(message.raw?.guild?.id || "") : null;

        const { config: currentConfig } = getGoodbyeConfig(platform, serverId, chatId, threadId);

        // ── AJUDA / HELP ────────────────────────────────────────────────
        if (subCommand === "help") {
            return message.reply({ text: _help(message) });
        }

        // ── STATUS ──────────────────────────────────────────────────────
        if (subCommand === "status") {
            return message.reply({ text: _status(message, currentConfig) });
        }

        // ── ON / OFF ────────────────────────────────────────────────────
        if (subCommand === "on" || subCommand === "off") {
            const enabling = subCommand === "on";
            try {
                saveGoodbyeConfig(platform, serverId, chatId, threadId, { enabled: enabling });

                if (enabling) {
                    let msg = `✅ *Sistema de Despedida ATIVADO neste chat!*\n\n`;
                    msg += `🎨 *Modo atual:* ${currentConfig.mode === "media" ? "🖼️ Mídia + Texto" : "📝 Apenas Texto"}\n`;
                    msg += `💬 *Mensagem:* "${currentConfig.text}"\n`;
                    if (platform === "discord") {
                        msg += `\nℹ️ *Nota Discord:* Este é agora o **único canal ativo** de despedida do servidor.`;
                    }
                    return message.reply({ text: msg });
                } else {
                    return message.reply({ text: `🔕 *Sistema de Despedida DESATIVADO neste chat.*` });
                }
            } catch (err) {
                console.error("[GOODBYE] Erro ao alterar estado:", err);
                return message.reply({ text: "❌ Não foi possível alterar o goodbye. Tente novamente." });
            }
        }

        // ── MODE ────────────────────────────────────────────────────────
        if (subCommand === "mode" || subCommand === "modo") {
            const modeArg = (args[1] || "").toLowerCase();
            if (modeArg !== "texto" && modeArg !== "media" && modeArg !== "text" && modeArg !== "midia") {
                let errText = `❌ *Modo inválido.*\n\n`;
                errText += `Modos disponíveis:\n`;
                errText += `  • \`${message.prefix}goodbye mode texto\` → Envia apenas a mensagem de texto\n`;
                errText += `  • \`${message.prefix}goodbye mode media\` → Envia a imagem/vídeo/GIF com o texto`;
                return message.reply({ text: errText });
            }

            const targetMode = (modeArg === "text" || modeArg === "texto") ? "texto" : "media";
            saveGoodbyeConfig(platform, serverId, chatId, threadId, { mode: targetMode });

            let modeMsg = `✅ *Modo de Despedida atualizado!*\n\n`;
            if (targetMode === "media") {
                modeMsg += `🖼️ *Novo Modo:* **Mídia + Texto**\n`;
                if (!currentConfig.media?.url) {
                    modeMsg += `⚠️ *Atenção:* Nenhuma mídia está configurada ainda. Use \`${message.prefix}goodbye media\`.`;
                } else {
                    modeMsg += `🔗 *Mídia ativa:* [Link Discord CDN](${currentConfig.media.url})`;
                }
            } else {
                modeMsg += `📝 *Novo Modo:* **Apenas Texto**`;
            }
            return message.reply({ text: modeMsg });
        }

        // ── TEXT ────────────────────────────────────────────────────────
        if (subCommand === "text" || subCommand === "texto" || subCommand === "message" || subCommand === "mensagem") {
            const newText = (message.getArgText ? message.getArgText(1) : args.slice(1).join(" ")).trim();
            if (!newText) {
                let textHelp = `❌ *Por favor, digite o texto da mensagem de despedida.*\n\n`;
                textHelp += `Exemplo:\n`;
                textHelp += `  \`${message.prefix}goodbye text Até logo, {user}! Sentiremos sua falta no {group}.\`\n\n`;
                textHelp += `⚙️ *Variáveis suportadas:*\n`;
                textHelp += `  • \`{user}\` / \`{mention}\` → Membro que saiu\n`;
                textHelp += `  • \`{group}\` / \`{server}\` → Nome do grupo ou servidor\n`;
                textHelp += `  • \`{count}\` / \`{members}\` → Total de membros`;
                return message.reply({ text: textHelp });
            }

            saveGoodbyeConfig(platform, serverId, chatId, threadId, { text: newText });
            return message.reply({
                text: `✅ *Mensagem de Despedida atualizada com sucesso!*\n\n💬 *Nova mensagem:*\n"${newText}"\n\n💡 Use \`${message.prefix}goodbye test\` para testar.`
            });
        }

        // ── MEDIA ───────────────────────────────────────────────────────
        if (subCommand === "media" || subCommand === "midia") {
            let mediaUrlArg = args[1] ? args[1].trim() : null;

            // 1. URL direta via argumento (baixa e armazena localmente)
            if (mediaUrlArg && (mediaUrlArg.startsWith("http://") || mediaUrlArg.startsWith("https://"))) {
                await message.reply({ text: `⏳ *Baixando mídia do link e salvando permanentemente no disco local...*` });

                try {
                    const saved = await downloadAndSaveMediaLocally(mediaUrlArg, "goodbye_media");

                    saveGoodbyeConfig(platform, serverId, chatId, threadId, {
                        media: { url: saved.url, type: saved.type, fileName: saved.fileName }
                    });

                    let responseMsg = `✅ *Mídia de Despedida baixada e salva com sucesso!*\n\n`;
                    responseMsg += `📁 *Arquivo:* \`${saved.fileName}\`\n`;
                    responseMsg += `📁 *Tipo:* ${saved.type.toUpperCase()}\n`;
                    responseMsg += `📊 *Tamanho:* ${(saved.size / (1024 * 1024)).toFixed(2)} MB\n`;
                    responseMsg += `💾 *Armazenamento:* Disco Local Permanente (não expira).\n\n`;
                    responseMsg += `🎨 *Dica:* Se necessário, ative o modo com \`${message.prefix}goodbye mode media\`.`;
                    return message.reply({ text: responseMsg });
                } catch (err) {
                    console.error("[goodbye command] Erro ao baixar mídia da URL:", err);
                    return message.reply({ text: `❌ Não foi possível baixar a imagem/vídeo a partir do link fornecido. Verifique a URL ou envie o arquivo diretamente.` });
                }
            }

            const targetMedia = message.media || message.quoted?.media;
            if (targetMedia && typeof targetMedia.getBuffer === "function") {
                await message.reply({ text: `⏳ *Armazenando mídia no disco local...*` });

                try {
                    const buffer = await targetMedia.getBuffer();
                    if (!buffer) return message.reply({ text: `❌ Não foi possível extrair o conteúdo da mídia.` });

                    const uploaded = await storeMedia(
                        platform,
                        message,
                        buffer,
                        targetMedia.fileName || "goodbye_media",
                        targetMedia.mimeType || "image/png"
                    );

                    const updateData = { media: { url: uploaded.url, type: uploaded.type, fileName: uploaded.fileName } };

                    const captionText = (message.getArgText ? message.getArgText(1) : "").trim();
                    if (captionText && !captionText.startsWith("http://") && !captionText.startsWith("https://")) {
                        updateData.text = captionText;
                    }

                    saveGoodbyeConfig(platform, serverId, chatId, threadId, updateData);

                    let responseText = `✅ *Mídia de Despedida armazenada com sucesso!*\n\n`;
                    responseText += `📁 *Arquivo:* \`${uploaded.fileName}\`\n`;
                    responseText += `📁 *Tipo:* ${uploaded.type.toUpperCase()}\n`;
                    responseText += `📊 *Tamanho:* ${(uploaded.size / (1024 * 1024)).toFixed(2)} MB\n`;
                    responseText += `💾 *Armazenamento:* Disco Local Permanente (não expira).\n\n`;
                    responseText += `💡 *Dica:* Se necessário, altere o modo para mídia com \`${message.prefix}goodbye mode media\`.`;

                    return message.reply({ text: responseText });
                } catch (err) {
                    console.error("[GOODBYE] Falha ao processar mídia:", err);
                    return message.reply({ text: "❌ Não foi possível processar essa mídia. Verifique o arquivo e tente novamente." });
                }
            }

            return message.reply({
                text: `❌ *Nenhuma mídia detectada.*\n\n` +
                      `Como definir a mídia de despedida:\n` +
                      `1️⃣ Envie uma foto, vídeo ou GIF com a legenda \`${message.prefix}goodbye media\`\n` +
                      `2️⃣ Responda a uma mídia com \`${message.prefix}goodbye media\`\n` +
                      `3️⃣ Ou informe uma URL: \`${message.prefix}goodbye media <URL>\``
            });
        }

        // ── RESET ───────────────────────────────────────────────────────
        if (subCommand === "reset" || subCommand === "reseta") {
            saveGoodbyeConfig(platform, serverId, chatId, threadId, getDefaultGoodbyeConfig());
            return message.reply({ text: `🔄 *Configurações de Despedida resetadas para o padrão!*\n\nEstado: 🔕 Desativado\nModo: 📝 Apenas Texto` });
        }

        // ── TEST ────────────────────────────────────────────────────────
        if (subCommand === "test" || subCommand === "teste") {
            const sampleUser = message.username ? `@${message.username}` : `Usuário Teste`;
            const sampleGroup = message.chatType === "group" ? "Grupo de Demonstração" : "Servidor de Demonstração";

            const previewText = formatWelcomeText(currentConfig.text, {
                user: sampleUser,
                group: sampleGroup,
                count: 99
            });

            let testHeader = `🧪 *[DEMONSTRAÇÃO / TESTE DE DESPEDIDA]*\n\n`;

            if (currentConfig.mode === "media" && currentConfig.media?.url) {
                if (typeof message.replyImg === "function") {
                    try {
                        return await message.replyImg({ url: currentConfig.media.url, caption: `${testHeader}${previewText}` });
                    } catch (err) {
                        console.error("[goodbye test] Erro ao enviar preview com replyImg:", err);
                    }
                }
            }

            return message.reply({ text: `${testHeader}${previewText}` });
        }

        return message.reply({ text: _help(message) });
    }
};

// ─────────────────────────────────────────────────────────────
//  FUNÇÕES DE RESPOSTA FORMATADA
// ─────────────────────────────────────────────────────────────

function _help(message) {
    const p = message.prefix;
    const plat = message.platform;

    let header = `👋 *SISTEMA DE DESPEDIDA (GOODBYE) — AJUDA*`;
    if (plat === "discord") header = `🎮 *DESPEDIDA (Discord) — AJUDA*`;
    else if (plat === "whatsapp") header = `📱 *DESPEDIDA (WhatsApp) — AJUDA*`;
    else if (plat === "telegram") header = `✈️ *DESPEDIDA (Telegram) — AJUDA*`;

    return (
`${header}

Gerencie o envio automático de mensagens quando membros saem.

📋 *COMANDOS DISPONÍVEIS:*
  • \`${p}goodbye status\`
    ↳ Exibe as configurações ativas e detalhes do chat.

  • \`${p}goodbye on\` | \`${p}goodbye off\`
    ↳ Ativa ou desativa a despedida neste chat/tópico.

  • \`${p}goodbye mode <texto | media>\`
    ↳ Define o formato: apenas texto ou texto com imagem/vídeo/GIF.

  • \`${p}goodbye text <mensagem...>\`
    ↳ Define a mensagem personalizada de despedida.

  • \`${p}goodbye media [URL]\`
    ↳ Define a mídia enviando/respondendo ou informando um link.

  • \`${p}goodbye test\`
    ↳ Simula o envio da despedida para conferir o visual.

  • \`${p}goodbye reset\`
    ↳ Restaura as configurações padrão.

⚙️ *VARIÁVEIS DISPONÍVEIS NO TEXTO:*
  • \`{user}\` ou \`{mention}\` → Nome do membro que saiu
  • \`{group}\` ou \`{server}\` → Nome do grupo ou servidor
  • \`{count}\` ou \`{members}\` → Quantidade total de participantes

📌 *REGRAS DE ESCOPO:*
  • *Discord:* Apenas **1 único canal ativo** por servidor.
  • *Telegram:* Funciona no chat geral ou em tópicos específicos.
  • *WhatsApp:* Válido apenas em **Grupos** (bloqueado em Comunidades).

💡 *EXEMPLOS:*
  ${p}goodbye on
  ${p}goodbye mode media
  ${p}goodbye text Até logo, {user}! Sentiremos sua falta no {group}.
  ${p}goodbye media (com imagem/vídeo anexado)
  ${p}goodbye test`
    );
}

function _status(message, cfg) {
    const plat = message.platform;

    let header = `👋 *SISTEMA DE DESPEDIDA — STATUS*`;
    if (plat === "discord") header = `🎮 *SISTEMA DE DESPEDIDA (Discord) — STATUS*`;
    else if (plat === "whatsapp") header = `📱 *SISTEMA DE DESPEDIDA (WhatsApp) — STATUS*`;
    else if (plat === "telegram") header = `✈️ *SISTEMA DE DESPEDIDA (Telegram) — STATUS*`;

    const statusIcon = cfg.enabled ? "✅ ATIVADO" : "🔕 DESATIVADO";
    const modeTxt = cfg.mode === "media" ? "🖼️ Mídia + Texto" : "📝 Apenas Texto";
    const msgTxt = cfg.text ? `"${cfg.text}"` : "(mensagem padrão)";

    let mediaTxt = "Nenhuma mídia vinculada";
    if (cfg.media?.url) {
        const typeLabel = (cfg.media.type || "foto").toUpperCase();
        const isWeb = String(cfg.media.url).startsWith("http://") || String(cfg.media.url).startsWith("https://");
        if (isWeb) {
            mediaTxt = `\n     • Link: ${cfg.media.url}\n     • Tipo: ${typeLabel}\n     ⚠️ *Aviso de Mídia Expirável:* Esta mídia foi configurada com um link web antigo que pode expirar. Recomendamos redefinir a mídia enviando a imagem diretamente com \`${message.prefix}goodbye media\` para salvá-la permanentemente no bot!`;
        } else {
            mediaTxt = `\n     • Arquivo: \`${path.basename(cfg.media.url)}\`\n     • Tipo: ${typeLabel}\n     💾 *Armazenamento:* Disco Local Permanente (não expira)`;
        }
    }

    let platRules = "";
    if (plat === "discord") {
        platRules = `\nℹ️ *Escopo Discord:* REGRA DE CANAL ÚNICO. Apenas 1 canal ativo por servidor.`;
    } else if (plat === "telegram") {
        platRules = `\nℹ️ *Escopo Telegram:* Ativo no tópico/chat atual (${message.threadId ? "Tópico ID: " + message.threadId : "Chat Principal"}).`;
    } else if (plat === "whatsapp") {
        platRules = `\nℹ️ *Escopo WhatsApp:* Ativo apenas no Grupo (${message.chatId}).`;
    }

    return (
`${header}

📌 *ESTADO E CONFIGURAÇÕES:*
  • *Estado:*           ${statusIcon}
  • *Modo de Envio:*    ${modeTxt}
  • *Mensagem:*         ${msgTxt}
  • *Mídia Anexada:*    ${mediaTxt}${platRules}

⚙️ *VARIÁVEIS NO TEXTO:*
  • \`{user}\` / \`{mention}\` → Membro que saiu
  • \`{group}\` / \`{server}\` → Grupo ou Servidor
  • \`{count}\` / \`{members}\` → Total de membros

💡 Para alterar as configurações, use \`${message.prefix}goodbye help\`.`
    );
}
