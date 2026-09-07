const { isOwner } = require("../../../functions/owners");
const configFn = require("../../../functions/config");

module.exports = {
    name: "antipv",
    category: "system/configurações",
    description: `Gerencia o bloqueio de mensagens em PV (Anti-PV).

Subcomandos:
  status / list
    • Exibe o estado atual do Anti-PV.

  on / off
    • Ativa ou desativa o bloqueio em mensagens privadas.

  mode <ignore|reply>
    • ignore: bloqueia sem responder.
    • reply: responde com a mensagem configurada.

  msg <texto>
    • Define a mensagem personalizada enviada em modo reply.

  media [none]
    • Define ou remove a mídia enviada junto com a mensagem de bloqueio.

  allowcmd <add|remove|list> <comando>
    • Libera comandos específicos para continuarem trabalhando em PV.

  allowuser <add|remove|list> <userId>
    • Libera usuários específicos para continuar usando o bot em PV.`,
    usage: "{prefix}antipv [subcomando]",
    examples: [
        "{prefix}antipv status",
        "{prefix}antipv on",
        "{prefix}antipv mode reply",
        "{prefix}antipv msg ⚠️ Atendimento indisponível no PV.",
        "{prefix}antipv allowcmd add ping",
        "{prefix}antipv allowuser add 123456789"
    ],

    async execute(message) {
        const isSuperUser = message.sender?.isOwner || isOwner(message);
        if (!isSuperUser) {
            return await message.reply({
                text: "❌ Apenas Super Usuários podem usar este comando."
            });
        }

        const args = message.args || [];
        const prefix = message.prefix || "!";

        if (!args.length) {
            // Quando nenhum subcomando for informado, exibir a ajuda padronizada em vez do status.
            return await message.reply({ text: _help(message) });
        }

        const first = (args[0] || "").toLowerCase();
        if (first === "help" || first === "ajuda" || first === "?") {
            return await message.reply({ text: _help(message) });
        }

        const action = args[0].toLowerCase();

        if (action === "list" || action === "status") {
            return await showStatus(message);
        }

        if (["on", "enable", "ligar", "1"].includes(action)) {
            configFn.setAntiPVEnabled(true);
            return await message.reply({ text: "✅ Anti-PV ativado com sucesso." });
        }

        if (["off", "disable", "desligar", "0"].includes(action)) {
            configFn.setAntiPVEnabled(false);
            return await message.reply({ text: "✅ Anti-PV desativado com sucesso." });
        }

        if (action === "mode" || action === "modo") {
            const targetMode = args[1] ? args[1].toLowerCase() : "";
            if (!["ignore", "reply", "mensagem", "ignorar"].includes(targetMode)) {
                return await message.reply({
                    text: `❌ Modo inválido. Use:\n- ${prefix}antipv mode ignore\n- ${prefix}antipv mode reply`
                });
            }
            const newMode = configFn.setAntiPVMode(targetMode);
            return await message.reply({
                text: `✅ Modo do Anti-PV alterado para: *${newMode === "reply" ? "resposta personalizada (reply)" : "apenas ignorar (ignore)"}*`
            });
        }

        if (action === "msg" || action === "mensagem" || action === "message") {
            const textMsg = (message.getArgText ? message.getArgText(1) : args.slice(1).join(" ")).trim();
            if (!textMsg) {
                return await message.reply({
                    text: `❌ Informe o texto da mensagem personalizada do Anti-PV.\nExemplo: ${prefix}antipv msg ⚠️ Atendimento indisponível no PV.`
                });
            }
            configFn.setAntiPVMessage(textMsg);
            return await message.reply({ text: "✅ Mensagem personalizada do Anti-PV atualizada com sucesso." });
        }

        if (action === "media" || action === "midia") {
            const val = args[1] ? args[1].toLowerCase() : "";
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
                    console.error("[ANTIPV] Erro ao extrair mídia:", err);
                    return await message.reply({ text: "❌ Não foi possível ler a mídia da mensagem. Tente novamente." });
                }
            } else if (args[1] && /^https?:\/\//i.test(args[1])) {
                try {
                    buffer = await api.fetchBuffer(args[1]);
                    mimeType = "image/png";
                    fileName = "media_url";
                } catch (err) {
                    console.error("[ANTIPV] Erro ao baixar mídia:", err);
                    return await message.reply({ text: "❌ Não foi possível baixar a mídia do endereço informado. Confira o link e tente novamente." });
                }
            }

            if (!buffer) {
                return await message.reply({
                    text: "❌ Nenhuma mídia detectada.\n\nUse este comando enviando uma foto/vídeo/áudio/documento na legenda ou respondendo a uma mídia no chat."
                });
            }

            try {
                const savedMedia = configFn.saveAntiPVMediaLocally(buffer, fileName, mimeType);
                configFn.setAntiPVMedia(savedMedia);
                return await message.reply({
                    text: `✅ Mídia do Anti-PV salva com sucesso nos arquivos internos (${savedMedia.fileName}).`
                });
            } catch (err) {
                return await message.reply({
                    text: "❌ Não foi possível salvar a mídia do Anti-PV. Tente novamente."
                });
            }
        }

        if (action === "allowcmd" || action === "cmdwhitelist") {
            const op = args[1] ? args[1].toLowerCase() : "";
            const cmdName = args[2] ? args[2].toLowerCase().trim() : "";
            const antipv = configFn.getAntiPVConfig();

            if (op === "list") {
                const list = antipv.commandWhitelist || [];
                return await message.reply({
                    text: `📋 Comandos liberados no Anti-PV:\n${list.length ? list.map(c => `• ${c}`).join("\n") : "Nenhum comando liberado."}`
                });
            }

            if (op === "add") {
                if (!cmdName) return await message.reply({ text: "❌ Informe o nome do comando." });
                const added = configFn.addAntiPVCommand(cmdName);
                return await message.reply({
                    text: added ? `✅ Comando *${cmdName}* adicionado à lista branca do Anti-PV.` : `⚠️ Comando *${cmdName}* já estava na lista branca.`
                });
            }

            if (op === "remove" || op === "del") {
                if (!cmdName) return await message.reply({ text: "❌ Informe o nome do comando." });
                const removed = configFn.removeAntiPVCommand(cmdName);
                return await message.reply({
                    text: removed ? `✅ Comando *${cmdName}* removido da lista branca do Anti-PV.` : `⚠️ Comando *${cmdName}* não foi encontrado na lista branca.`
                });
            }

            return await message.reply({ text: `❌ Uso: ${prefix}antipv allowcmd <add|remove|list> <comando>` });
        }

        if (action === "allowuser" || action === "userwhitelist") {
            const op = args[1] ? args[1].toLowerCase() : "";
            let targetId = args[2] ? args[2].trim() : "";
            const antipv = configFn.getAntiPVConfig();

            if (message.quoted?.userId) {
                targetId = message.quoted.userId;
            }

            if (op === "list") {
                const list = antipv.userWhitelist || [];
                return await message.reply({
                    text: `📋 Usuários liberados no Anti-PV:\n${list.length ? list.map(u => `• ${u}`).join("\n") : "Nenhum usuário liberado."}`
                });
            }

            if (op === "add") {
                if (!targetId) return await message.reply({ text: "❌ Informe o ID ou responda ao usuário." });
                const added = configFn.addAntiPVUser(targetId);
                return await message.reply({
                    text: added ? `✅ Usuário *${targetId}* adicionado à lista branca do Anti-PV.` : `⚠️ Usuário *${targetId}* já estava na lista branca.`
                });
            }

            if (op === "remove" || op === "del") {
                if (!targetId) return await message.reply({ text: "❌ Informe o ID ou responda ao usuário." });
                const removed = configFn.removeAntiPVUser(targetId);
                return await message.reply({
                    text: removed ? `✅ Usuário *${targetId}* removido da lista branca do Anti-PV.` : `⚠️ Usuário *${targetId}* não foi encontrado na lista branca.`
                });
            }

            return await message.reply({ text: `❌ Uso: ${prefix}antipv allowuser <add|remove|list> <userId>` });
        }

        return await message.reply({
            text: `❌ Opção de antipv inválida. Use status, on, off, mode, msg, media, allowcmd ou allowuser.`
        });
    }
};

async function showStatus(message) {
    const antipv = configFn.getAntiPVConfig();
    let txt = "⚙️ Status do Anti-PV\n\n";
    txt += `• Estado: ${antipv.enabled ? "✅ ATIVADO" : "❌ DESATIVADO"}\n`;
    txt += `• Modo de resposta: ${antipv.mode === "reply" ? "💬 Resposta personalizada" : "🔇 Apenas ignorar"}\n`;
    txt += `• Mensagem: ${antipv.message || "Nenhuma"}\n`;
    txt += `• Mídia salva: ${antipv.media ? (antipv.media.fileName || antipv.media.type || "Salva") : "Nenhuma"}\n`;
    txt += `• Comandos liberados: ${antipv.commandWhitelist?.length ? antipv.commandWhitelist.join(", ") : "Nenhum"}\n`;
    txt += `• Usuários liberados: ${antipv.userWhitelist?.length ? antipv.userWhitelist.join(", ") : "Nenhum"}\n`;
    return await message.reply({ text: txt });
}

function _help(message) {
    const p = message.prefix || "!";
    const plat = message.platform;

    let header = '*🛡️ ANTI-PV — AJUDA*';
    if (plat === 'discord') header = '🎮 *ANTI-PV (Discord) — AJUDA*';
    else if (plat === 'whatsapp') header = '📱 *ANTI-PV (WhatsApp) — AJUDA*';
    else if (plat === 'telegram') header = '✈️ *ANTI-PV (Telegram) — AJUDA*';

    const lines = [];
    lines.push(header);
    lines.push('');
    lines.push('Gerencia o bloqueio de mensagens em mensagens privadas (PV).');
    lines.push('');
    lines.push('⚙️ COMANDOS:');
    lines.push('  `' + p + 'antipv status|list`');
    lines.push('    ↳ Mostra status atual do Anti-PV.');
    lines.push('  `' + p + 'antipv on`');
    lines.push('  `' + p + 'antipv off`');
    lines.push('  `' + p + 'antipv mode <ignore|reply>`');
    lines.push('  `' + p + 'antipv msg <texto>`');
    lines.push('  `' + p + 'antipv media` (envie junto a mídia ou responda a uma mídia)');
    lines.push('  `' + p + 'antipv media none` (remove a mídia salva)');
    lines.push('  `' + p + 'antipv allowcmd <add|remove|list> <comando>`');
    lines.push('  `' + p + 'antipv allowuser <add|remove|list> <userId>` (ou responda ao usuário)');
    lines.push('');
    lines.push('📌 VARIÁVEIS / DICAS:');
    lines.push('  - Ao usar `media`, responda a uma mídia ou passe uma URL pública.');
    lines.push('  - Para liberar um usuário responda a mensagem do usuário com: `' + p + 'antipv allowuser add`');
    lines.push('');
    lines.push('📌 EXEMPLOS:');
    lines.push('  ' + p + 'antipv mode reply');
    lines.push('  ' + p + 'antipv msg ⚠️ Atendimento indisponível no PV.');
    lines.push('  ' + p + 'antipv allowcmd add ping');
    lines.push('');
    lines.push('Use `' + p + 'antipv help` para ver esta ajuda.');
    return lines.join('\n');
}
