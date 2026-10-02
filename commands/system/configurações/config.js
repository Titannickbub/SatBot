/*
============================================================

COMANDO CONFIG

Gerencia configurações globais
do bot.

Apenas Super Usuários podem
alterar configurações.

Todas as alterações exigem
reinicialização do bot.

============================================================

COMANDOS

{prefix}config status

Mostra as configurações atuais.

============================================================

{prefix}config prefix simbolo

Altera o prefixo.
O prefixo pode ter mais de um caractere, mas não pode conter espaços.

Exemplos:

{prefix}config prefix !
{prefix}config prefix #
{prefix}config prefix $
{prefix}config prefix sat!

============================================================

{prefix}config plataforma nome estado

Ativa ou desativa plataformas.

Exemplos:

{prefix}config plataforma whatsapp off
{prefix}config plataforma telegram on
{prefix}config plataforma discord disable

============================================================
*/

module.exports = {
    category: "system/configurações",
    platformSupport: {
        whatsapp: "partial",
        telegram: "partial",
        discord: "partial"
    },

    name: "config",

    description: `Gerencia configurações globais do bot.

Subcomandos:
  status
    • Exibe o prefixo atual, o estado de cada plataforma, uploads e anti-pv.

  prefix <símbolo>
    • Define um novo prefixo de comando, com um ou mais caracteres e sem espaços.

  botname <nome>
    • Define um nome personalizado para o bot (salvo em settings/config.json e preservado em atualizações).

  plataforma <nome> <on|off>
    • Ativa ou desativa a plataforma especificada (discord, telegram, whatsapp).

  setuploads <discord|telegram> <id|none>
    • Define ou remove o canal/chat fixo para onde o bot enviará uploads de mídia.

  ignoreinitial <tempo>
    • Define o tempo de aquecimento inicial para ignorar mensagens antigas ao ligar (ex: 30s, 2m, 1h). Padrão: 30s.

  antipv <status|on|off|mode|msg|media|allowcmd|allowuser>
   • Alias de compatibilidade do comando dedicado !antipv.
   • Gerencia o sistema Anti-PV (ignora usuários no PV exceto Super Usuários, comandos liberados ou usuários liberados).
`,

    usage:
        `{prefix}config [opção]`,

    examples: [

        "{prefix}config status",

        "{prefix}config prefix #",

        "{prefix}config plataforma telegram off",

        "{prefix}config setuploads discord 1532068325771972798",

        "{prefix}config ignoreinitial 30s",

        "{prefix}config ignoreinitial 2m",

        "{prefix}config antipv status",

        "{prefix}config antipv on",

        "{prefix}config antipv mode reply",

        "{prefix}config antipv msg Atendimento indisponível no PV.",

        "{prefix}config antipv allowcmd add ping",

        "{prefix}config antipv allowuser add 123456789"

    ],

    async execute(message) {

        const owners =
            message.functions.owners;

        const config =
            message.functions.config;

        if (
            !owners.isOwner(
                message
            )
        ) {

            return await message.reply({
                text:
                    "❌ Apenas Super Usuários podem usar este comando."
            });

        }

        const args =
            message.args;

        if (!args.length) {

            return await ajuda(
                message
            );

        }

        const action =
            args[0]
                .toLowerCase();

        if (
            action === "status"
        ) {

            return await status(
                message
            );

        }

        if (
            action === "prefix"
        ) {

            return await alterarPrefixo(
                message,
                args[1]
            );

        }

        if (
            action === "botname" ||
            action === "nome" ||
            action === "name"
        ) {

            return await alterarBotName(
                message,
                args.slice(1).join(" ")
            );

        }

        if (
            action ===
            "plataforma"
        ) {

            return await alterarPlataforma(
                message,
                args[1],
                args[2]
            );

        }

        if (
            action ===
            "setuploads"
        ) {

            return await alterarUploadChannel(
                message,
                args[1],
                args[2]
            );

        }

        if (
            action === "ignoreinitial" ||
            action === "warmup" ||
            action === "tempoinicial"
        ) {

            return await alterarIgnoreInitial(
                message,
                args[1]
            );

        }

        if (
            action === "antipv"
        ) {

            const antipvCommand = require("./antipv");
            message.args = args.slice(1);
            return await antipvCommand.execute(message);

        }

        if (action === "onlychats") {
            const onlychatsCmd = require("./onlychats");
            message.args = args.slice(1);
            return await onlychatsCmd.execute(message);
        }

        if (
            action === "sticker" ||
            action === "stickers" ||
            action === "figurinha" ||
            action === "figurinhas"
        ) {
            return await alterarStickerConfig(
                message,
                args.slice(1)
            );
        }

        return await ajuda(
            message
        );

    }

};

async function ajuda(
    message
) {

    const p =
        message.prefix;

    await message.reply({

        text:

            `⚙️ Config

${p}config status

${p}config prefix #

${p}config plataforma telegram off

${p}config setuploads discord 1532068325771972798

${p}config ignoreinitial 30s
${p}config ignoreinitial 5m

🎨 Figurinhas (Stickers):
${p}config sticker
${p}config sticker pack <nome do pacote>
${p}config sticker autor <nome do autor>
${p}config sticker <pacote> | <autor>

🔒 Anti-PV:
${p}config antipv status
${p}config antipv on / off
${p}config antipv mode ignore / reply
${p}config antipv msg <texto>
${p}config antipv media [none]
${p}config antipv allowcmd <add|remove|list> <comando>
${p}config antipv allowuser <add|remove|list> <user>

⚠️ Alterações entram em vigor imediatamente ou exigem reinicialização.`

    });

}

async function status(
    message
) {

    const configFn = message.functions.config;
    const config = configFn.getConfig();

    const icons = {

        whatsapp:
            "📩",

        telegram:
            "✈️",

        discord:
            "🎧"

    };

    const warmupSeconds = config.ignoreInitialSeconds !== undefined ? config.ignoreInitialSeconds : 30;
    const warmupDisplay = typeof configFn.formatTimeString === "function"
        ? configFn.formatTimeString(warmupSeconds)
        : `${warmupSeconds}s`;

    const botName = typeof configFn.getBotName === "function" ? configFn.getBotName() : "Sat Bot";

    let text =

        `⚙️ Configurações

Nome do Bot:
${botName}

Prefixo:
${config.prefix}

Tempo Inicial (Warmup):
${warmupDisplay}

Plataformas

`;

    for (
        const platform
        of Object.keys(
            config.platforms
        )
    ) {

        const icon =
            icons[
            platform
            ] || "🔹";

        text +=

            `${icon} ${platform}: ${config.platforms[
                platform
            ]
                ? "ON"
                : "OFF"
            }\n`;

    }

    const uploads = config.uploads || {};

    // Determina o provedor ativo com base na configuração e disponibilidade
    let activeProvider = "💾 Local (disco)";
    let activeProviderHint = "Configure com !config setuploads para usar nuvem.";
    if (uploads.discordChannelId && global.discordClient) {
        activeProvider = `☁️ Discord CDN (canal ${uploads.discordChannelId})`;
        activeProviderHint = "Todas as plataformas usarão este canal para uploads.";
    } else if (uploads.telegramChatId) {
        activeProvider = `☁️ Telegram (chat ${uploads.telegramChatId})`;
        activeProviderHint = "Todas as plataformas usarão este chat para uploads.";
    } else if (uploads.discordChannelId) {
        activeProvider = `⚠️ Discord configurado, mas offline (canal ${uploads.discordChannelId})`;
        activeProviderHint = "Discord está offline — usando disco local como fallback.";
    }

    text += `\nUploads de Mídia\n`;
    text += `  • Provedor ativo: ${activeProvider}\n`;
    text += `  • Discord: ${uploads.discordChannelId || "não configurado"}\n`;
    text += `  • Telegram: ${uploads.telegramChatId || "não configurado"}\n`;
    text += `  ℹ️ ${activeProviderHint}\n`;

    const stickerCfg = typeof configFn.getStickerConfig === "function" ? configFn.getStickerConfig() : { packName: "Sat Bot", authorName: "Satela" };
    text += `\n🎨 Figurinhas (Stickers)\n`;
    text += `  • Pacote (Pack): ${stickerCfg.packName}\n`;
    text += `  • Autor (Publisher): ${stickerCfg.authorName}\n`;

    const antipv = message.functions.config.getAntiPVConfig ? message.functions.config.getAntiPVConfig() : {};
    text += `\n🔒 Anti-PV\n`;
    text += `  • Estado: ${antipv.enabled ? "Ativado (ON)" : "Desativado (OFF)"}\n`;
    text += `  • Modo: ${antipv.mode || "ignore"}\n`;
    text += `  • Comandos Liberados: ${antipv.commandWhitelist?.length ? antipv.commandWhitelist.join(", ") : "Nenhum"}\n`;
    text += `  • Usuários Liberados: ${antipv.userWhitelist?.length ? antipv.userWhitelist.length + " usuário(s)" : "Nenhum"}\n`;

    text +=

        `\n⚠️ Reinicie ${botName} para aplicar alterações.`;

    await message.reply({
        text
    });

}

async function alterarStickerConfig(message, subArgs) {
    const configFn = message.functions.config;
    if (!configFn || typeof configFn.getStickerConfig !== "function") {
        return await message.reply({ text: "❌ Módulo de configuração não disponível." });
    }

    if (!subArgs || !subArgs.length) {
        const cfg = configFn.getStickerConfig();
        return await message.reply({
            text: `🎨 *Configuração de Figurinhas (Stickers)*\n\n` +
                  `📦 *Nome do Pacote (Pack):* ${cfg.packName}\n` +
                  `👤 *Autor (Publisher):* ${cfg.authorName}\n\n` +
                  `⚙️ *Como alterar:*\n` +
                  `• \`${message.prefix}config sticker pack <nome>\`\n` +
                  `• \`${message.prefix}config sticker autor <nome>\`\n` +
                  `• \`${message.prefix}config sticker <pacote> | <autor>\`\n` +
                  `• \`${message.prefix}config sticker reset\` (restaura padrão)`
        });
    }

    const sub = subArgs[0].toLowerCase();
    const restText = subArgs.slice(1).join(" ").trim();

    if (sub === "pack" || sub === "pacote") {
        if (!restText) {
            return await message.reply({ text: `❌ Informe o nome do pacote.\nExemplo: \`${message.prefix}config sticker pack Meus Stickers\`` });
        }
        const updated = configFn.setStickerPack(restText);
        return await message.reply({ text: `✅ Nome do pacote de figurinhas atualizado para: *${updated.packName}*` });
    }

    if (sub === "author" || sub === "autor" || sub === "publisher") {
        if (!restText) {
            return await message.reply({ text: `❌ Informe o nome do autor.\nExemplo: \`${message.prefix}config sticker autor Meu Nome\`` });
        }
        const updated = configFn.setStickerAuthor(restText);
        return await message.reply({ text: `✅ Autor das figurinhas atualizado para: *${updated.authorName}*` });
    }

    if (sub === "reset" || sub === "padrao") {
        const botName = typeof configFn.getBotName === "function" ? configFn.getBotName() : "Sat Bot";
        const updated = configFn.setStickerConfig(botName, "Satela");
        return await message.reply({ text: `✅ Configuração de figurinhas restaurada:\n📦 Pacote: *${updated.packName}*\n👤 Autor: *${updated.authorName}*` });
    }

    const fullText = subArgs.join(" ").trim();
    if (fullText.includes("|") || fullText.includes(",")) {
        const separator = fullText.includes("|") ? "|" : ",";
        const parts = fullText.split(separator).map(s => s.trim());
        const packName = parts[0];
        const authorName = parts.slice(1).join(separator).trim();

        if (packName && authorName) {
            const updated = configFn.setStickerConfig(packName, authorName);
            return await message.reply({
                text: `✅ Configuração de figurinhas atualizada!\n📦 Pacote: *${updated.packName}*\n👤 Autor: *${updated.authorName}*`
            });
        }
    }

    return await message.reply({
        text: `❌ Subcomando inválido.\n\n` +
              `Uso:\n` +
              `• \`${message.prefix}config sticker pack <nome>\`\n` +
              `• \`${message.prefix}config sticker autor <nome>\`\n` +
              `• \`${message.prefix}config sticker <pacote> | <autor>\``
    });
}

async function alterarIgnoreInitial(message, timeStr) {
    if (!timeStr) {
        return await message.reply({
            text: "❌ Informe o tempo desejado.\n\nExemplos:\n- !config ignoreinitial 30s\n- !config ignoreinitial 5m\n- !config ignoreinitial 1h\n- !config ignoreinitial 0"
        });
    }

    const configFn = message.functions.config;
    const parsedSec = typeof configFn.parseTimeString === "function"
        ? configFn.parseTimeString(timeStr)
        : parseInt(timeStr, 10);

    if (parsedSec === null || isNaN(parsedSec) || parsedSec < 0) {
        return await message.reply({
            text: "❌ Tempo inválido.\n\nUse formatos como *30s* (segundos), *5m* (minutos) ou *1h* (horas)."
        });
    }

    if (configFn && typeof configFn.setIgnoreInitialSeconds === "function") {
        configFn.setIgnoreInitialSeconds(parsedSec);
    }

    const displayTime = typeof configFn.formatTimeString === "function"
        ? configFn.formatTimeString(parsedSec)
        : `${parsedSec}s`;

    return await message.reply({
        text: `✅ Tempo de aquecimento inicial alterado para: *${displayTime}*.\n\n⚠️ Mensagens recebidas no período de aquecimento após ligar o bot serão ignoradas (mas continuarão visíveis no console).`
    });
}

async function gerenciarAntiPV(message, subArgs) {
    const configFn = message.functions.config;
    if (!configFn || typeof configFn.getAntiPVConfig !== "function") {
        return await message.reply({ text: "❌ Módulo de Anti-PV não encontrado em functions.config." });
    }

    const subAction = subArgs[0] ? subArgs[0].toLowerCase() : "status";
    const antipv = configFn.getAntiPVConfig();
    const prefix = message.prefix || "!";

    if (subAction === "status") {
        let txt = `⚙️ Status do Anti-PV\n\n`;
        txt += `• Estado: ${antipv.enabled ? "✅ ATIVADO" : "❌ DESATIVADO"}\n`;
        txt += `• Modo de resposta: ${antipv.mode === "reply" ? "💬 Resposta personalizada" : "🔇 Apenas ignorar"}\n`;
        txt += `• Mensagem: ${antipv.message || "Nenhuma"}\n`;
        txt += `• Mídia salva: ${antipv.media ? (antipv.media.fileName || antipv.media.type || "Salva") : "Nenhuma"}\n`;
        txt += `• Comandos liberados: ${antipv.commandWhitelist.length ? antipv.commandWhitelist.join(", ") : "Nenhum"}\n`;
        txt += `• Usuários liberados: ${antipv.userWhitelist.length ? antipv.userWhitelist.join(", ") : "Nenhum"}\n`;
        return await message.reply({ text: txt });
    }

    if (["on", "enable", "ligar", "1"].includes(subAction)) {
        configFn.setAntiPVEnabled(true);
        return await message.reply({ text: "✅ Anti-PV ativado com sucesso." });
    }

    if (["off", "disable", "desligar", "0"].includes(subAction)) {
        configFn.setAntiPVEnabled(false);
        return await message.reply({ text: "✅ Anti-PV desativado com sucesso." });
    }

    if (subAction === "mode" || subAction === "modo") {
        const targetMode = subArgs[1] ? subArgs[1].toLowerCase() : "";
        if (!["ignore", "reply", "mensagem", "ignorar"].includes(targetMode)) {
            return await message.reply({ text: `❌ Modo inválido. Use:\n- ${prefix}config antipv mode ignore\n- ${prefix}config antipv mode reply` });
        }
        const newMode = configFn.setAntiPVMode(targetMode);
        return await message.reply({ text: `✅ Modo do Anti-PV alterado para: *${newMode === "reply" ? "resposta personalizada (reply)" : "apenas ignorar (ignore)"}*` });
    }

    if (subAction === "msg" || subAction === "mensagem") {
        const textMsg = (message.getArgText ? message.getArgText(2) : subArgs.slice(1).join(" ")).trim();
        if (!textMsg) {
            return await message.reply({ text: "❌ Informe o texto da mensagem personalizada do Anti-PV." });
        }
        configFn.setAntiPVMessage(textMsg);
        return await message.reply({ text: "✅ Mensagem personalizada do Anti-PV atualizada com sucesso." });
    }

    if (subAction === "media" || subAction === "midia") {
        const val = subArgs[1] ? subArgs[1].toLowerCase() : "";
        if (["none", "clear", "remover", "off", "del"].includes(val)) {
            configFn.setAntiPVMedia(null);
            return await message.reply({ text: "✅ Mídia do Anti-PV removida com sucesso." });
        }

        const targetMedia = message.media || message.quoted?.media;
        const api = message.functions?.api || require("../../../functions/api");
        let buffer = null;
        let mimeType = null;
        let fileName = null;

        if (targetMedia && typeof targetMedia.getBuffer === "function") {
            try {
                buffer = await targetMedia.getBuffer();
                mimeType = targetMedia.mimeType;
                fileName = targetMedia.fileName || "media";
            } catch (err) {
                console.error("[CONFIG] Erro ao extrair mídia:", err);
                return await message.reply({ text: "❌ Não foi possível ler a mídia da mensagem. Tente novamente." });
            }
        } else if (subArgs[1] && /^https?:\/\//i.test(subArgs[1])) {
            try {
                buffer = await api.fetchBuffer(subArgs[1]);
                mimeType = "image/png";
                fileName = "media_url";
            } catch (err) {
                console.error("[CONFIG] Erro ao baixar mídia:", err);
                return await message.reply({ text: "❌ Não foi possível baixar a mídia do endereço informado. Confira o link e tente novamente." });
            }
        }

        if (!buffer) {
            return await message.reply({ text: `❌ Nenhuma mídia detectada.\n\nUse este comando enviando uma foto/vídeo/áudio/documento na legenda ou respondendo a uma mídia no chat.` });
        }

        try {
            const savedMedia = configFn.saveAntiPVMediaLocally(buffer, fileName, mimeType);
            configFn.setAntiPVMedia(savedMedia);
            return await message.reply({ text: `✅ Mídia do Anti-PV salva com sucesso nos arquivos internos (${savedMedia.fileName}).` });
        } catch (err) {
            console.error("[CONFIG] Erro ao salvar mídia do Anti-PV:", err);
            return await message.reply({ text: "❌ Não foi possível salvar a mídia do Anti-PV. Tente novamente." });
        }
    }

    if (subAction === "allowcmd" || subAction === "cmdwhitelist") {
        const op = subArgs[1] ? subArgs[1].toLowerCase() : "";
        const cmdName = subArgs[2] ? subArgs[2].toLowerCase().trim() : "";

        if (op === "list") {
            const list = antipv.commandWhitelist || [];
            return await message.reply({ text: `📋 Comandos liberados no Anti-PV:\n${list.length ? list.map(c => `• ${c}`).join("\n") : "Nenhum comando liberado."}` });
        }

        if (op === "add") {
            if (!cmdName) return await message.reply({ text: "❌ Informe o nome do comando." });
            const added = configFn.addAntiPVCommand(cmdName);
            return await message.reply({ text: added ? `✅ Comando *${cmdName}* adicionado à lista branca do Anti-PV.` : `⚠️ Comando *${cmdName}* já estava na lista branca.` });
        }

        if (op === "remove" || op === "del") {
            if (!cmdName) return await message.reply({ text: "❌ Informe o nome do comando." });
            const removed = configFn.removeAntiPVCommand(cmdName);
            return await message.reply({ text: removed ? `✅ Comando *${cmdName}* removido da lista branca do Anti-PV.` : `⚠️ Comando *${cmdName}* não foi encontrado na lista branca.` });
        }

        return await message.reply({ text: `❌ Uso: ${prefix}config antipv allowcmd <add|remove|list> <comando>` });
    }

    if (subAction === "allowuser" || subAction === "userwhitelist") {
        const op = subArgs[1] ? subArgs[1].toLowerCase() : "";
        let targetId = subArgs[2] ? subArgs[2].trim() : "";

        if (message.quoted?.userId) {
            targetId = message.quoted.userId;
        }

        if (op === "list") {
            const list = antipv.userWhitelist || [];
            return await message.reply({ text: `📋 Usuários liberados no Anti-PV:\n${list.length ? list.map(u => `• ${u}`).join("\n") : "Nenhum usuário liberado."}` });
        }

        if (op === "add") {
            if (!targetId) return await message.reply({ text: "❌ Informe o ID ou responda ao usuário." });
            const added = configFn.addAntiPVUser(targetId);
            return await message.reply({ text: added ? `✅ Usuário *${targetId}* adicionado à lista branca do Anti-PV.` : `⚠️ Usuário *${targetId}* já estava na lista branca.` });
        }

        if (op === "remove" || op === "del") {
            if (!targetId) return await message.reply({ text: "❌ Informe o ID ou responda ao usuário." });
            const removed = configFn.removeAntiPVUser(targetId);
            return await message.reply({ text: removed ? `✅ Usuário *${targetId}* removido da lista branca do Anti-PV.` : `⚠️ Usuário *${targetId}* não foi encontrado na lista branca.` });
        }

        return await message.reply({ text: `❌ Uso: ${prefix}config antipv allowuser <add|remove|list> <userId>` });
    }

    return await message.reply({ text: `❌ Opção de antipv inválida. Use status, on, off, mode, msg, media, allowcmd ou allowuser.` });
}

async function alterarPrefixo(
    message,
    prefix
) {

    const configFn = message.functions.config;

    const normalizedPrefix = String(prefix || "").trim();
    if (!normalizedPrefix) {

        return await message.reply({

            text:
                "❌ Informe um prefixo."

        });

    }

    if (/\s/.test(normalizedPrefix)) {

        return await message.reply({

            text:
                "❌ O prefixo não pode conter espaços."

        });

    }

    message.functions
        .config
        .setPrefix(
            normalizedPrefix
        );

    await message.reply({

        text:
            `✅ Prefixo alterado para:

${normalizedPrefix}

⚠️ Reinicie ${typeof configFn.getBotName === "function" ? configFn.getBotName() : "Sat Bot"}.`

    });

}

async function alterarBotName(message, nameInput) {
    const configFn = message.functions.config;
    if (!nameInput || !nameInput.trim()) {
        const currentName = typeof configFn.getBotName === "function" ? configFn.getBotName() : "Sat Bot";
        return await message.reply({
            text: `ℹ️ O nome atual do bot é: *${currentName}*\n\nPara alterar o nome, use:\n\`!config botname Novo Nome Do Bot\``
        });
    }

    const cleanName = nameInput.trim();
    if (typeof configFn.setBotName === "function") {
        configFn.setBotName(cleanName);
    }

    return await message.reply({
        text: `✅ Nome do bot alterado para: *${cleanName}*\n\nAgora a Inteligência Artificial e o sistema utilizarão este nome!`
    });
}

async function alterarPlataforma(
    message,
    platform,
    value
) {

    const configFn = message.functions.config;

    if (
        !platform ||
        !value
    ) {

        return await message.reply({

            text:
                "❌ Uso inválido."

        });

    }

    platform =
        platform
            .toLowerCase();

    const config =
        message.functions
            .config
            .getConfig();

    if (
        typeof config
            .platforms[
        platform
        ] ===
        "undefined"
    ) {

        return await message.reply({

            text:
                "❌ Plataforma não encontrada."

        });

    }

    value =
        value
            .toLowerCase();

    const enabledValues = [

        "1",
        "true",
        "on",
        "enable",
        "ligar"

    ];

    const disabledValues = [

        "0",
        "false",
        "off",
        "disable",
        "desligar"

    ];

    let state;

    if (
        enabledValues.includes(
            value
        )
    ) {

        state = true;

    } else if (

        disabledValues.includes(
            value
        )

    ) {

        state = false;

    } else {

        return await message.reply({

            text:
                "❌ Valor inválido."

        });

    }

    message.functions
        .config
        .setPlatform(
            platform,
            state
        );

    await message.reply({

        text:

            `✅ Plataforma ${platform} ${state
                ? "ativada"
                : "desativada"
            }.

⚠️ Reinicie ${typeof configFn.getBotName === "function" ? configFn.getBotName() : "Sat Bot"}.`

    });

}

async function alterarUploadChannel(
    message,
    platform,
    channelId
) {
    if (
        !platform
    ) {
        return await message.reply({
            text: "❌ Uso inválido. Informe a plataforma e o ID do canal."
        });
    }

    platform = platform.toLowerCase();
    if (platform !== "discord" && platform !== "telegram") {
        return await message.reply({
            text: "❌ Plataforma inválida. Use discord ou telegram."
        });
    }

    const clearValues = ["clear", "none", "off", "disable", "desabilitar", "null"];
    if (!channelId || clearValues.includes(channelId.toLowerCase())) {
        message.functions.config.setUploadChannel(platform, null);
        return await message.reply({
            text: `✅ Upload por ${platform} foi resetado. O bot voltará a usar o chat atual ou armazenamento local conforme a plataforma.`
        });
    }

    channelId = channelId.trim();
    message.functions.config.setUploadChannel(platform, channelId);
    return await message.reply({
        text: `✅ Canal de uploads definido para ${platform}: ${channelId}`
    });
}