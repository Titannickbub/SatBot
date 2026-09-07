/*
=================================================================

COMANDO: !welcome / !boasvindas

Gerencia o sistema de Boas-Vindas (Welcome) aos novos membros.
Apenas administradores do chat podem usar este comando.

Regras e Limitações por Plataforma:

  🎮 Discord:
    • O welcome é ativo por canal de texto ou thread.
    • REGRA DE CANAL ÚNICO: Apenas 1 (um) único canal de boas-vindas pode
      estar ativo por servidor ao mesmo tempo. Ativar em outro canal desativa o anterior.

  ✈️ Telegram:
    • Pode ser configurado em um tópico específico ou no chat principal.

  📱 WhatsApp:
    • Suportado exclusivamente em GRUPOS (chatType = group).
    • NÃO disponível em Comunidades ou mensagens privadas.

Armazenamento Otimizado de Mídias:
  • Mídias enviadas com !welcome media são armazenadas automaticamente
    no melhor provedor disponível: Discord CDN, Telegram ou disco local.
  • A prioridade é: Discord configurado → Telegram configurado → disco local.
  • Isso economiza espaço em disco independente da plataforma usada.

Sub-comandos:
  !welcome status
  !welcome on | off
  !welcome mode texto | media
  !welcome text <texto...>
  !welcome media [url]
  !welcome reset
  !welcome test
  !welcome help

=================================================================
*/

const {
    getWelcomeConfig,
    getGoodbyeConfig,
    saveWelcomeConfig,
    saveGoodbyeConfig,
    getDefaultWelcomeConfig,
    getDefaultGoodbyeConfig,
    downloadAndSaveMediaLocally,
    storeMedia,
    formatWelcomeText
} = require("../../../functions/welcomeHelper");
const path = require("path");

module.exports = {
    name: "welcome",
    aliases: ["boasvindas", "welc"],
    category: "adm/configurações",
    description: `Gerencia o sistema de Boas-Vindas (Welcome) para novos membros do grupo ou servidor.

Recursos principais:
• Ativação/Desativação individual por chat/tópico.
• Modos de envio: Apenas Texto ou Texto + Mídia (imagem, vídeo, GIF).
• Armazenamento inteligente de mídias: Discord CDN, Telegram ou local (por prioridade de disponibilidade).
• Variáveis dinâmicas no texto: {user}, {mention}, {group}, {server}, {count}, {members}.
• Teste em tempo real com !welcome test.

Regras por plataforma:
• Discord: Apenas 1 canal de boas-vindas ativo por servidor por vez.
• Telegram: Suporta tópicos e chat principal.
• WhatsApp: Suportado apenas em grupos (bloqueado em comunidades).`,

    usage: "{prefix}welcome",
    examples: [
        "{prefix}welcome status",
        "{prefix}welcome on",
        "{prefix}welcome mode media",
        "{prefix}welcome text Seja bem-vindo(a) ao {group}, {user}! Somos {count} membros.",
        "{prefix}welcome media (enviar imagem/vídeo/gif com a legenda ou responder a uma mídia)",
        "{prefix}welcome media https://cdn.discordapp.com/attachments/exemplo.png",
        "{prefix}welcome test",
        "{prefix}welcome reset"
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
                text: "❌ O sistema de boas-vindas no WhatsApp está disponível apenas em grupos de conversa.\n\n⚠️ *Não disponível em comunidades ou mensagens diretas.*"
            });
        }

        // ── 3. Permissão do USUÁRIO ─────────────────────────────────────
        const adapter = (message.platforms || []).find(p => p.name === message.platform);
        const userOk = adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : (message.sender?.isAdmin || message.sender?.isOwner);

        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores do grupo/servidor podem configurar o sistema de boas-vindas." });
        }

        const args = message.args || [];

        // Sem argumentos → exibe a ajuda completa
        if (!args.length) {
            return message.reply({ text: _help(message) });
        }

        const subCommand = args[0].toLowerCase();
        const platform = message.platform;
        const chatId = message.chatId;
        const threadId = message.threadId || null;
        const serverId = platform === "discord" ? String(message.raw?.guild?.id || "") : null;

        // Busca a configuração atual
        const { config: currentConfig } = getWelcomeConfig(platform, serverId, chatId, threadId);

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
                saveWelcomeConfig(platform, serverId, chatId, threadId, { enabled: enabling });

                if (enabling) {
                    let msg = `✅ *Sistema de Boas-Vindas ATIVADO neste chat!*\n\n`;
                    msg += `🎨 *Modo atual:* ${currentConfig.mode === "media" ? "🖼️ Mídia + Texto" : "📝 Apenas Texto"}\n`;
                    msg += `💬 *Mensagem:* "${currentConfig.text}"\n`;

                    if (platform === "discord") {
                        msg += `\nℹ️ *Nota Discord:* Este é agora o **único canal ativo** de boas-vindas do servidor. Se havia outro canal ativo, ele foi desativado automaticamente.`;
                    }
                    return message.reply({ text: msg });
                } else {
                    return message.reply({ text: `🔕 *Sistema de Boas-Vindas DESATIVADO neste chat.*` });
                }
            } catch (err) {
                console.error("[WELCOME] Erro ao alterar estado:", err);
                return message.reply({ text: "❌ Não foi possível alterar o welcome. Tente novamente." });
            }
        }

        // ── MODE (texto | media) ────────────────────────────────────────
        if (subCommand === "mode" || subCommand === "modo") {
            const modeArg = (args[1] || "").toLowerCase();

            if (modeArg !== "texto" && modeArg !== "media" && modeArg !== "text" && modeArg !== "midia") {
                let errText = `❌ *Modo inválido.*\n\n`;
                errText += `Modos disponíveis:\n`;
                errText += `  • \`${message.prefix}welcome mode texto\` → Envia apenas a mensagem de texto\n`;
                errText += `  • \`${message.prefix}welcome mode media\` → Envia a imagem/vídeo/GIF acompanhado do texto\n\n`;
                errText += `Exemplo:\n  \`${message.prefix}welcome mode media\``;
                return message.reply({ text: errText });
            }

            const targetMode = (modeArg === "text" || modeArg === "texto") ? "texto" : "media";
            saveWelcomeConfig(platform, serverId, chatId, threadId, { mode: targetMode });

            let modeMsg = `✅ *Modo de Boas-Vindas atualizado!*\n\n`;
            if (targetMode === "media") {
                modeMsg += `🖼️ *Novo Modo:* **Mídia + Texto**\n`;
                if (!currentConfig.media?.url) {
                    modeMsg += `⚠️ *Atenção:* Nenhuma mídia está configurada ainda. Anexe ou responda a uma imagem/vídeo/GIF usando \`${message.prefix}welcome media\`.`;
                } else {
                    modeMsg += `🔗 *Mídia ativa:* [Link Discord CDN](${currentConfig.media.url})`;
                }
            } else {
                modeMsg += `📝 *Novo Modo:* **Apenas Texto**`;
            }

            return message.reply({ text: modeMsg });
        }

        // ── TEXT (mensagem de boas-vindas) ─────────────────────────────
        if (subCommand === "text" || subCommand === "texto" || subCommand === "message" || subCommand === "mensagem") {
            const newText = (message.getArgText ? message.getArgText(1) : args.slice(1).join(" ")).trim();

            if (!newText) {
                let textHelp = `❌ *Por favor, digite o texto da mensagem de boas-vindas.*\n\n`;
                textHelp += `Exemplo:\n`;
                textHelp += `  \`${message.prefix}welcome text Seja muito bem-vindo(a) ao grupo {group}, {user}! Agora somos {count} membros.\`\n\n`;
                textHelp += `⚙️ *Variáveis suportadas:*\n`;
                textHelp += `  • \`{user}\` ou \`{mention}\` → Marca/menciona o novo membro\n`;
                textHelp += `  • \`{group}\` ou \`{server}\` → Nome do grupo ou servidor\n`;
                textHelp += `  • \`{count}\` ou \`{members}\` → Quantidade total de membros`;
                return message.reply({ text: textHelp });
            }

            saveWelcomeConfig(platform, serverId, chatId, threadId, { text: newText });

            let responseText = `✅ *Mensagem de Boas-Vindas atualizada com sucesso!*\n\n`;
            responseText += `💬 *Nova mensagem:*\n"${newText}"\n\n`;
            responseText += `💡 *Dica:* Teste o visual da mensagem digitando \`${message.prefix}welcome test\`.`;
            return message.reply({ text: responseText });
        }

        // ── MEDIA (configuração de mídias) ─────────────────────────────
        if (subCommand === "media" || subCommand === "midia") {
            let mediaUrlArg = args[1] ? args[1].trim() : null;

            // 1. URL direta via argumento (baixa e armazena localmente)
            if (mediaUrlArg && (mediaUrlArg.startsWith("http://") || mediaUrlArg.startsWith("https://"))) {
                await message.reply({ text: `⏳ *Baixando mídia do link e salvando permanentemente no disco local...*` });

                try {
                    const saved = await downloadAndSaveMediaLocally(mediaUrlArg, "welcome_media");

                    saveWelcomeConfig(platform, serverId, chatId, threadId, {
                        media: { url: saved.url, type: saved.type, fileName: saved.fileName }
                    });

                    let responseMsg = `✅ *Mídia de Boas-Vindas baixada e salva com sucesso!*\n\n`;
                    responseMsg += `📁 *Arquivo:* \`${saved.fileName}\`\n`;
                    responseMsg += `📁 *Tipo:* ${saved.type.toUpperCase()}\n`;
                    responseMsg += `📊 *Tamanho:* ${(saved.size / (1024 * 1024)).toFixed(2)} MB\n`;
                    responseMsg += `💾 *Armazenamento:* Disco Local Permanente (não expira).\n\n`;
                    responseMsg += `🎨 *Dica:* Se necessário, ative o modo com \`${message.prefix}welcome mode media\`.`;
                    return message.reply({ text: responseMsg });
                } catch (err) {
                    console.error("[welcome command] Erro ao baixar mídia da URL:", err);
                    return message.reply({ text: `❌ Não foi possível baixar a imagem/vídeo a partir do link fornecido. Verifique a URL ou envie o arquivo diretamente.` });
                }
            }

            // 2. Anexo na mensagem atual ou mensagem citada (quoted)
            const targetMedia = message.media || message.quoted?.media;

            if (targetMedia && typeof targetMedia.getBuffer === "function") {
                await message.reply({ text: `⏳ *Armazenando mídia no disco local...*` });

                try {
                    const buffer = await targetMedia.getBuffer();
                    if (!buffer) {
                        return message.reply({ text: `❌ Não foi possível extrair o conteúdo da mídia.` });
                    }

                    const uploaded = await storeMedia(
                        platform,
                        message,
                        buffer,
                        targetMedia.fileName || "welcome_media",
                        targetMedia.mimeType || "image/png"
                    );

                    const updateData = {
                        media: {
                            url: uploaded.url,
                            type: uploaded.type,
                            fileName: uploaded.fileName || "welcome_media"
                        }
                    };

                    const captionText = (message.getArgText ? message.getArgText(1) : "").trim();
                    if (captionText && !captionText.startsWith("http://") && !captionText.startsWith("https://")) {
                        updateData.text = captionText;
                    }

                    saveWelcomeConfig(platform, serverId, chatId, threadId, updateData);

                    let successMsg = `✅ *Mídia de Boas-Vindas armazenada com sucesso!*\n\n`;
                    successMsg += `📁 *Arquivo:* \`${uploaded.fileName}\`\n`;
                    successMsg += `📁 *Tipo de Mídia:* ${uploaded.type.toUpperCase()}\n`;
                    successMsg += `📊 *Tamanho:* ${(uploaded.size / (1024 * 1024)).toFixed(2)} MB\n`;
                    successMsg += `💾 *Armazenamento:* Disco Local Permanente (não expira).\n\n`;
                    successMsg += `💡 *Dica:* Se necessário, altere o modo para mídia com \`${message.prefix}welcome mode media\`.`;

                    return message.reply({ text: successMsg });
                } catch (err) {
                    console.error("[welcome command] Erro ao processar e salvar mídia:", err);
                    return message.reply({ text: "❌ Não foi possível processar essa mídia. Verifique o arquivo e tente novamente." });
                }
            }

            return message.reply({
                text: `❌ Nenhuma mídia foi detectada. Envie uma imagem/vídeo/GIF ou use um link com \`${message.prefix}welcome media <url>\`.`
            });
        }

        if (subCommand === "test" || subCommand === "teste") {
            // No Discord, a mencião real é <@userId> (renderizada pelo cliente)
            const sampleUser = platform === "discord"
                ? `<@${message.userId}>`
                : (message.username ? `@${message.username}` : `@Usuário Teste`);
            const sampleGroup = platform === "discord"
                ? (message.raw?.guild?.name || "Servidor de Demonstração")
                : (message.chatType === "group" ? "Grupo de Demonstração" : "Servidor de Demonstração");

            const previewText = formatWelcomeText(currentConfig.text, {
                user: sampleUser,
                group: sampleGroup,
                count: 100
            });

            let testHeader = `🧪 *[DEMONSTRAÇÃO / TESTE DE BOAS-VINDAS]*\n\n`;

            if (currentConfig.mode === "media" && currentConfig.media?.url) {
                if (typeof message.replyImg === "function") {
                    try {
                        return await message.replyImg({
                            url: currentConfig.media.url,
                            caption: `${testHeader}${previewText}`
                        });
                    } catch (err) {
                        console.error("[welcome test] Erro ao enviar preview com replyImg:", err);
                    }
                }
            }

            return message.reply({ text: `${testHeader}${previewText}` });
        }

        // Subcomando inválido
        return message.reply({ text: _help(message) });
    }
};

// ─────────────────────────────────────────────────────────────
//  FUNÇÕES DE RESPOSTA FORMATADA (AJUDA E STATUS DETALHADOS)
// ─────────────────────────────────────────────────────────────

function _help(message) {
    const p = message.prefix;
    const plat = message.platform;

    let header = `👋 *SISTEMA DE BOAS-VINDAS (WELCOME) — AJUDA*`;
    if (plat === "discord") header = `🎮 *BOAS-VINDAS (Discord) — AJUDA*`;
    else if (plat === "whatsapp") header = `📱 *BOAS-VINDAS (WhatsApp) — AJUDA*`;
    else if (plat === "telegram") header = `✈️ *BOAS-VINDAS (Telegram) — AJUDA*`;

    return (
`${header}

Gerencie o envio automático de saudações para novos membros.

📋 *COMANDOS DISPONÍVEIS:*
  • \`${p}welcome status\`
    ↳ Exibe as configurações ativas e detalhes do chat.

  • \`${p}welcome on\` | \`${p}welcome off\`
    ↳ Ativa ou desativa as boas-vindas neste chat/tópico.

  • \`${p}welcome mode <texto | media>\`
    ↳ Define o formato: apenas texto ou texto com imagem/vídeo/GIF.

  • \`${p}welcome text <mensagem...>\`
    ↳ Define a mensagem personalizada de recepção.

  • \`${p}welcome media [URL]\`
    ↳ Envia/responda uma mídia ou informe um link para upload CDN.

  • \`${p}welcome test\`
    ↳ Simula o envio das boas-vindas para conferir o visual.

  • \`${p}welcome reset\`
    ↳ Restaura as configurações padrão.

⚙️ *VARIÁVEIS DISPONÍVEIS NO TEXTO:*
  • \`{user}\` ou \`{mention}\` → Mencionador/Nome do novo membro
  • \`{group}\` ou \`{server}\` → Nome do grupo ou servidor
  • \`{count}\` ou \`{members}\` → Quantidade total de participantes

📌 *REGRAS DE ESCOPO:*
  • *Discord:* Permite apenas **1 único canal ativo** por servidor.
  • *Telegram:* Funciona no chat geral ou em tópicos específicos.
  • *WhatsApp:* Válido apenas em **Grupos** (bloqueado em Comunidades).

💡 *EXEMPLOS:*
  ${p}welcome on
  ${p}welcome mode media
  ${p}welcome text Seja bem-vindo(a) ao {group}, {user}! Somos {count} membros.
  ${p}welcome media (com imagem/vídeo anexado)
  ${p}welcome test`
    );
}

function _status(message, cfg) {
    const plat = message.platform;

    let header = `👋 *SISTEMA DE BOAS-VINDAS — STATUS*`;
    if (plat === "discord") header = `🎮 *SISTEMA DE BOAS-VINDAS (Discord) — STATUS*`;
    else if (plat === "whatsapp") header = `📱 *SISTEMA DE BOAS-VINDAS (WhatsApp) — STATUS*`;
    else if (plat === "telegram") header = `✈️ *SISTEMA DE BOAS-VINDAS (Telegram) — STATUS*`;

    const statusIcon = cfg.enabled ? "✅ ATIVADO" : "🔕 DESATIVADO";
    const modeTxt = cfg.mode === "media" ? "🖼️ Mídia + Texto" : "📝 Apenas Texto";
    const msgTxt = cfg.text ? `"${cfg.text}"` : "(mensagem padrão)";

    let mediaTxt = "Nenhuma mídia vinculada";
    if (cfg.media?.url) {
        const typeLabel = (cfg.media.type || "foto").toUpperCase();
        const isWeb = String(cfg.media.url).startsWith("http://") || String(cfg.media.url).startsWith("https://");
        if (isWeb) {
            mediaTxt = `\n     • Link: ${cfg.media.url}\n     • Tipo: ${typeLabel}\n     ⚠️ *Aviso de Mídia Expirável:* Esta mídia foi configurada com um link web antigo que pode expirar. Recomendamos redefinir a mídia enviando a imagem diretamente com \`${message.prefix}welcome media\` para salvá-la permanentemente no bot!`;
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
  • \`{user}\` / \`{mention}\` → Novo membro
  • \`{group}\` / \`{server}\` → Grupo ou Servidor
  • \`{count}\` / \`{members}\` → Total de membros

💡 Para alterar as configurações, use \`${message.prefix}welcome help\`.`
    );
}
