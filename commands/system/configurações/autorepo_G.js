/*
=================================================================

COMANDO: !autorepo_G

Gerencia o catálogo oficial de respostas e reações automáticas globais do bot.
Os dados ficam salvos em commands/system/configurações/autorepo_G.json.

Sub-comandos:
  !autorepo_G add <gatilho> = <resposta>
  !autorepo_G del <gatilho>
  !autorepo_G list
  !autorepo_G status
  !autorepo_G help

=================================================================
*/

const owners = require("../../../functions/owners");
const autorepoHelper = require("../../../functions/autorepoHelper");

function checkOwner(message) {
    if (message.functions?.owners?.isOwner) {
        return message.functions.owners.isOwner(message);
    }
    return owners.isOwner(message);
}

const DESCRIPTION = `🌐 Gerencia o catálogo oficial de respostas e reações automáticas globais do bot.

🔐 Disponível apenas para superusuários / donos do bot.

Os grupos escolhem se desejam ou não utilizar este catálogo oficial através do comando {prefix}autorepo global on/off.

➕ 1. Adicione uma resposta global oficial ao catálogo:

Resposta de texto exata (padrão):
{prefix}autorepo_G add bom dia = Bom dia, {user}! Tenha um excelente dia! ☀️
{prefix}autorepo_G add boa noite = Boa noite, {user}! Descanse bem! 🌙
{prefix}autorepo_G add bot = Olá! Eu sou o {bot}, em que posso ajudar?

Reação com Emoji:
{prefix}autorepo_G add react satbot = 🤖
{prefix}autorepo_G add react parabens = 🎉

Gatilho por palavra contida na mensagem (contains):
{prefix}autorepo_G add contains novidade = 📢 Fique por dentro de todas as novidades!

Gatilho por início da mensagem (starts):
{prefix}autorepo_G add starts suporte = 💡 Precisa de suporte? Digite {prefix}menu!

📌 Variáveis aceitas no texto da resposta:
• {user} ou {nome} — Nome do usuário que enviou a mensagem
• {bot} — Nome configurado do bot
• {grupo} ou {chat} — Nome do grupo atual
• {hora} ou {horario} — Hora atual do sistema (ex: 08:55)
• {horas} — Hora completa com segundos (ex: 08:55:40)
• {data} — Data atual (ex: 09/10/2026)
• {dia_semana} — Dia da semana (ex: sexta-feira)
• {saudacao} — Saudação automática conforme o horário (Bom dia / Boa tarde / Boa noite)

➖ 2. Remova uma resposta do catálogo oficial:
{prefix}autorepo_G del bom dia
{prefix}autorepo_G del satbot

📋 3. Consulte as respostas cadastradas no catálogo global:
{prefix}autorepo_G list
{prefix}autorepo_G status`;

module.exports = {
    name: "autorepo_g",
    aliases: [
        "autorepo_G",
        "autorepog",
        "autorepo_global",
        "autoresposta_global",
        "autorepoglobal"
    ],
    category: "system/configurações",
    description: DESCRIPTION,
    usage: "{prefix}autorepo_G <add|del|list|status>",
    examples: [
        "{prefix}autorepo_G status",
        "{prefix}autorepo_G add bom dia = Bom dia, {user}! ☀️",
        "{prefix}autorepo_G add react satbot = 🤖",
        "{prefix}autorepo_G add contains novidade = 📢 Novidades em breve!",
        "{prefix}autorepo_G del bom dia",
        "{prefix}autorepo_G list"
    ],

    async execute(message) {
        if (!checkOwner(message)) {
            return await message.reply({
                text: "❌ Apenas superusuários podem gerenciar o catálogo global de respostas automáticas."
            });
        }

        const prefix = message.prefix || "!";
        const args = (message.args || []).map(arg => String(arg).trim()).filter(Boolean);
        const action = (args[0] || "status").toLowerCase();

        // Ajuda
        if (["help", "ajuda", "manual"].includes(action)) {
            return await message.reply({
                text: DESCRIPTION.replaceAll("{prefix}", prefix)
            });
        }

        const globalData = autorepoHelper.loadGlobal();

        // Status
        if (action === "status" && args.length <= 1) {
            const count = (globalData.responses || []).length;

            return await message.reply({
                text: `🌐 *Catálogo Global Oficial de Autoresposta*\n\n` +
                    `• Respostas Oficiais Cadastradas: *${count}*\n` +
                    `• Arquivo de Armazenamento: \`commands/system/configurações/autorepo_G.json\`\n` +
                    `ℹ️ _Cada grupo decide se deseja utilizar este catálogo através de \`${prefix}autorepo global off/on\`._\n\n` +
                    `⚙️ *Opções de Gerenciamento:*\n` +
                    `• \`${prefix}autorepo_G add <gatilho> = <resposta>\` — Adiciona resposta oficial\n` +
                    `• \`${prefix}autorepo_G del <gatilho>\` — Remove resposta oficial\n` +
                    `• \`${prefix}autorepo_G list\` — Lista todas as respostas oficiais\n\n` +
                    `❔ Ajuda detalhada: \`${prefix}autorepo_G help\``
            });
        }

        // Adicionar Resposta Global Oficial (autorepo_G add <gatilho> = <resposta>)
        if (action === "add" || action === "adicionar" || action === "criar" || action === "set") {
            const rawParams = args.slice(1).join(" ");
            if (!rawParams || !rawParams.includes("=")) {
                return await message.reply({
                    text: `❌ Formato incorreto!\n\n` +
                        `Use: \`${prefix}autorepo_G add <gatilho> = <resposta>\`\n` +
                        `Ou: \`${prefix}autorepo_G add react <gatilho> = <emoji>\`\n` +
                        `Ou: \`${prefix}autorepo_G add contains <gatilho> = <resposta>\`\n` +
                        `Ou: \`${prefix}autorepo_G add starts <gatilho> = <resposta>\`\n\n` +
                        `Exemplo: \`${prefix}autorepo_G add bom dia = Bom dia, {user}! ☀️\``
                });
            }

            let matchType = "exact";
            let responseAction = "reply";
            let rawBeforeEqual = rawParams.substring(0, rawParams.indexOf("=")).trim();
            const rawAfterEqual = rawParams.substring(rawParams.indexOf("=") + 1).trim();

            if (!rawAfterEqual) {
                return await message.reply({ text: "❌ O conteúdo da resposta não pode ficar em branco após o sinal de '='." });
            }

            const tokens = rawBeforeEqual.split(/\s+/);
            if (tokens.length > 1) {
                const firstMod = tokens[0].toLowerCase();
                if (firstMod === "react" || firstMod === "reacao" || firstMod === "emoji") {
                    responseAction = "react";
                    rawBeforeEqual = tokens.slice(1).join(" ");
                } else if (firstMod === "contains" || firstMod === "contem" || firstMod === "contém") {
                    matchType = "contains";
                    rawBeforeEqual = tokens.slice(1).join(" ");
                } else if (firstMod === "starts" || firstMod === "comeca" || firstMod === "começa") {
                    matchType = "starts";
                    rawBeforeEqual = tokens.slice(1).join(" ");
                }
            }

            const trigger = rawBeforeEqual.trim();
            if (!trigger) {
                return await message.reply({ text: "❌ O gatilho não pode ficar em branco." });
            }

            const created = autorepoHelper.addGlobalResponse({
                trigger,
                action: responseAction,
                content: rawAfterEqual,
                matchType,
                cooldown: 5
            });

            return await message.reply({
                text: `✅ *Resposta Global Cadastrada no Catálogo Oficial!*\n\n` +
                    `📍 *Gatilho:* "${created.trigger}"\n` +
                    `⚙️ *Tipo de Busca:* ${created.matchType}\n` +
                    `🎯 *Ação:* ${created.action === "react" ? "Reagir com Emoji" : "Responder com Texto"}\n` +
                    `💬 *Conteúdo:* ${created.content}\n\n` +
                    `💾 Salvo em \`commands/system/configurações/autorepo_G.json\`.`
            });
        }

        // Remover Resposta Global Oficial (autorepo_G del <gatilho>)
        if (action === "del" || action === "delete" || action === "remover" || action === "rem") {
            const target = args.slice(1).join(" ").trim();
            if (!target) {
                return await message.reply({
                    text: `❌ Informe o gatilho a ser removido.\nExemplo: \`${prefix}autorepo_G del bom dia\``
                });
            }

            const removed = autorepoHelper.removeGlobalResponse(target);
            if (removed) {
                return await message.reply({
                    text: `✅ Resposta global para o gatilho "*${target}*" foi removida do catálogo oficial!`
                });
            } else {
                return await message.reply({
                    text: `❌ Não foi encontrada nenhuma resposta global com o gatilho "*${target}*".`
                });
            }
        }

        // Listar Catálogo Global Oficial (autorepo_G list)
        if (action === "list" || action === "lista" || action === "listar") {
            const responses = globalData.responses || [];
            if (responses.length === 0) {
                return await message.reply({
                    text: `📋 *Catálogo Global Oficial de Respostas*\n\nNenhuma resposta cadastrada atualmente em \`commands/system/configurações/autorepo_G.json\`.`
                });
            }

            let text = `📋 *Catálogo Global Oficial de Respostas (${responses.length})*\n\n`;
            responses.forEach((item, index) => {
                const actionIcon = item.action === "react" ? "✨ [Reação]" : "💬 [Texto]";
                const matchInfo = item.matchType !== "exact" ? ` (${item.matchType})` : "";
                text += `${index + 1}. *"${item.trigger}"*${matchInfo} ➔ ${actionIcon} ${item.content}\n`;
            });

            return await message.reply({ text: text.trim() });
        }

        return await message.reply({
            text: `❌ Opção inválida.\n\nDigite \`${prefix}autorepo_G help\` para ver todos os comandos disponíveis.`
        });
    }
};
