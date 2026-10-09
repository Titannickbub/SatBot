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
const { isOwner } = require("../../../functions/owners");
const path = require("path");

const DESCRIPTION = `👋 Configura mensagens automáticas para quando membros saem do grupo ou servidor.

🔐 Disponível para administradores do chat e superusuários.

📌 Regras por plataforma:
• Discord: a despedida é configurada por canal ou tópico. Apenas um canal pode estar ativo por servidor.
• Telegram: configure no chat principal ou em um tópico.
• WhatsApp: disponível apenas em grupos; não funciona em comunidades ou conversas privadas.

📝 1. Personalize o texto da despedida:
{prefix}goodbye text <mensagem>
{prefix}goodbye text Até logo, {user}! Sentiremos sua falta no {group}.

Você pode usar estas variáveis, que serão substituídas quando alguém sair:
{user} ou {mention} — nome do membro que saiu.
{group} ou {server} — nome do grupo ou servidor.
{count} ou {members} — quantidade de membros.

🎨 2. Escolha o formato da mensagem:
{prefix}goodbye mode texto
{prefix}goodbye mode media

O modo texto envia somente a mensagem. O modo media envia a mensagem junto com uma mídia configurada.

🖼️ 3. Configure a mídia (opcional):
{prefix}goodbye media <URL>

Em vez de uma URL, envie uma imagem, vídeo ou GIF com esse comando na legenda, ou responda à mídia com ele. A mídia será salva permanentemente. Se a legenda não for uma URL, ela também substituirá o texto da despedida.

🧪 4. Confira a mensagem antes de ativar:
{prefix}goodbye test

Envia uma prévia usando o texto e o modo configurados.

✅ 5. Ative a despedida:
{prefix}goodbye on

Quando um membro sair, o bot enviará a mensagem neste chat ou tópico.

📋 Consulte as configurações:
{prefix}goodbye status

🔕 Desative sem apagar suas configurações:
{prefix}goodbye off

♻️ Restaure as configurações padrão:
{prefix}goodbye reset

Desativa o sistema e restaura as configurações padrão.`;

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "goodbye",
    aliases: ["despedida", "bye"],
    category: "adm/configurações",
    description: DESCRIPTION,
    usage: "{prefix}goodbye <subcomando>",
    examples: [
        "{prefix}goodbye status",
        "{prefix}goodbye on",
        "{prefix}goodbye mode texto",
        "{prefix}goodbye mode media",
        "{prefix}goodbye text Até mais, {user}! Sentiremos sua falta no {group}.",
        "{prefix}goodbye media <URL>",
        "{prefix}goodbye media",
        "{prefix}goodbye test",
        "{prefix}goodbye off",
        "{prefix}goodbye reset"
    ],

    info(message) {
        return helpText(message);
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
        const userOk = isOwner(message) || (adapter?.checkUserPermission
            ? await adapter.checkUserPermission(message.chatId, message.userId)
            : (message.sender?.isAdmin || message.sender?.isOwner));

        if (!userOk) {
            return message.reply({ text: "❌ Apenas administradores do grupo/servidor podem configurar o sistema de despedida." });
        }

        const args = message.args || [];

        if (!args.length) {
            return message.reply({ text: helpText(message) });
        }

        const subCommand = args[0].toLowerCase();
        const platform = message.platform;
        const chatId = message.chatId;
        const threadId = message.threadId || null;
        const serverId = platform === "discord" ? String(message.raw?.guild?.id || "") : null;

        const { config: currentConfig } = getGoodbyeConfig(platform, serverId, chatId, threadId);

        // ── AJUDA / HELP ────────────────────────────────────────────────
        if (subCommand === "help" || subCommand === "ajuda") {
            return message.reply({ text: helpText(message) });
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

        return message.reply({ text: helpText(message) });
    }
};

// ─────────────────────────────────────────────────────────────
//  FUNÇÕES DE RESPOSTA FORMATADA
// ─────────────────────────────────────────────────────────────

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
