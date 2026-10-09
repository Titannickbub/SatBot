/*
=================================================================

COMANDO: !autorepo

Gerencia respostas e reações automáticas neste grupo.
As configurações locais ficam salvas em settings/autorepo/<chat>.json.

Sub-comandos:
  !autorepo on
  !autorepo off
  !autorepo global off
  !autorepo global on
  !autorepo add <gatilho> = <resposta>
  !autorepo del <gatilho>
  !autorepo list
  !autorepo status
  !autorepo limpar
  !autorepo help

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

function checkAdmin(message) {
    return Boolean(
        message.sender?.isAdmin ||
        message.sender?.isOwner ||
        message.sender?.canManageMessages ||
        checkOwner(message)
    );
}

const DESCRIPTION = `🤖 Gerencia respostas e reações automáticas para palavras-chave neste chat.

🔐 Disponível para administradores do chat e superusuários.

✅ 1. Ative ou desative as respostas no grupo:
{prefix}autorepo on
{prefix}autorepo off

Ao ativar com {prefix}autorepo on, tanto as respostas locais do grupo quanto as respostas globais oficiais são usadas simultaneamente.

🌐 2. Desative ou reative apenas as respostas globais no grupo:
{prefix}autorepo global off
{prefix}autorepo global on

Use global off se quiser que o bot ignore o catálogo oficial de respostas globais e use estritamente apenas as respostas cadastradas localmente pelo seu grupo.

➕ 3. Adicione uma resposta personalizada ao grupo:

Resposta de texto exata (padrão):
{prefix}autorepo add regras = 📜 Respeitem as regras do grupo!
{prefix}autorepo add pix = 💸 Chave Pix: pix@exemplo.com
{prefix}autorepo add oi = Olá, {user}! Bem-vindo(a) ao {grupo}!

Reação com Emoji:
{prefix}autorepo add react bom dia = ☀️
{prefix}autorepo add react satbot = 🤖
{prefix}autorepo add react parabens = 🎉

Gatilho por palavra contida na mensagem (contains):
{prefix}autorepo add contains suporte = 📞 Chame um administrador no privado!
{prefix}autorepo add contains meme = 😂

Gatilho por início da mensagem (starts):
{prefix}autorepo add starts salve = Salve, {user}! Tmj 👊

📌 Variáveis aceitas no texto da resposta:
• {user} ou {nome} — Nome do usuário que enviou a mensagem
• {bot} — Nome configurado do bot
• {grupo} ou {chat} — Nome do grupo atual
• {hora} ou {horario} — Hora atual do sistema (ex: 08:55)
• {horas} — Hora completa com segundos (ex: 08:55:40)
• {data} — Data atual (ex: 09/10/2026)
• {dia_semana} — Dia da semana (ex: sexta-feira)
• {saudacao} — Saudação automática conforme o horário (Bom dia / Boa tarde / Boa noite)

➖ 4. Remova uma resposta do grupo:
{prefix}autorepo del regras
{prefix}autorepo del bom dia

📋 5. Consulte as respostas e o status do grupo:
{prefix}autorepo list
{prefix}autorepo status

🗑️ 6. Limpar todas as respostas locais:
{prefix}autorepo limpar`;

module.exports = {
    name: "autorepo",
    aliases: [
        "autoresposta",
        "auto_resposta",
        "autoresp",
        "respostas"
    ],
    category: "adm/configurações",
    description: DESCRIPTION,
    usage: "{prefix}autorepo <on|off|global|add|del|list|status|limpar>",
    examples: [
        "{prefix}autorepo status",
        "{prefix}autorepo on",
        "{prefix}autorepo global off",
        "{prefix}autorepo add regras = 📜 Respeite as regras!",
        "{prefix}autorepo add react oi = 👋",
        "{prefix}autorepo add contains suporte = 📞 Contate os administradores",
        "{prefix}autorepo del regras",
        "{prefix}autorepo list"
    ],

    async execute(message) {
        if (message.isPrivate) {
            return await message.reply({
                text: "❌ O recurso de Autoresposta é configurável e executado apenas em grupos."
            });
        }

        if (message.isCommunity) {
            return await message.reply({
                text: "❌ O recurso de Autoresposta não está disponível em comunidades."
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

        const groupConfig = autorepoHelper.loadGroup(message) || {
            enabled: false,
            useGlobal: true,
            responses: []
        };

        // Status do grupo
        if (action === "status" && args.length <= 1) {
            const isEnabled = groupConfig.enabled === true;
            const useGlobal = groupConfig.useGlobal !== false;
            const localCount = (groupConfig.responses || []).length;
            const globalData = autorepoHelper.loadGlobal();
            const globalCount = (globalData.responses || []).length;

            return await message.reply({
                text: `🤖 *Status do Autorepo no Grupo*\n\n` +
                    `• Estado no Grupo: ${isEnabled ? "✅ ATIVADO (ON)" : "❌ DESATIVADO (OFF)"}\n` +
                    `• Respostas Globais Oficiais: ${useGlobal ? "✅ Ativas no grupo" : "❌ Desativadas no grupo"}\n` +
                    `• Respostas Locais Cadastradas: *${localCount}*\n` +
                    `• Catálogo Global Disponível: *${globalCount}* gatilhos\n\n` +
                    `⚙️ *Opções de Configuração:*\n` +
                    `• \`${prefix}autorepo on\` — Ativa todas as respostas (locais e globais)\n` +
                    `• \`${prefix}autorepo off\` — Desativa o autorepo no grupo\n` +
                    `• \`${prefix}autorepo global off\` — Desativa apenas as respostas globais\n` +
                    `• \`${prefix}autorepo global on\` — Reativa o uso das respostas globais\n` +
                    `• \`${prefix}autorepo add <gatilho> = <resposta>\` — Adiciona resposta local\n` +
                    `• \`${prefix}autorepo del <gatilho>\` — Remove resposta local\n` +
                    `• \`${prefix}autorepo list\` — Lista todas as respostas locais\n\n` +
                    `❔ Ajuda detalhada: \`${prefix}autorepo help\``
            });
        }

        // Permissão para comandos de escrita/configuração
        if (!checkAdmin(message)) {
            return await message.reply({
                text: "❌ Apenas Administradores do grupo ou Superusuários podem configurar o Autorepo."
            });
        }

        // Ativar Autorepo no Grupo (ao ativar, ambas as respostas locais e globais são usadas)
        if (action === "on" || action === "ativar" || action === "enable") {
            groupConfig.enabled = true;
            groupConfig.useGlobal = true; // Garante que ambas são usadas ao ativar
            autorepoHelper.saveGroup(message, groupConfig);
            return await message.reply({
                text: `✅ *Autorepo ATIVADO* para este grupo!\n\n` +
                    `Ambas as respostas locais do grupo e as respostas globais oficiais estão ativas.`
            });
        }

        // Desativar Autorepo no Grupo
        if (action === "off" || action === "desativar" || action === "disable") {
            groupConfig.enabled = false;
            autorepoHelper.saveGroup(message, groupConfig);
            return await message.reply({
                text: `❌ *Autorepo DESATIVADO* para este grupo.`
            });
        }

        // Configuração de Globais no Grupo (autorepo global on / autorepo global off)
        if (action === "global") {
            const subAction = (args[1] || "status").toLowerCase();

            if (subAction === "off" || subAction === "desativar" || subAction === "disable" || subAction === "false") {
                groupConfig.useGlobal = false;
                autorepoHelper.saveGroup(message, groupConfig);
                return await message.reply({
                    text: `🔒 *Respostas Globais DESATIVADAS* no grupo.\n\n` +
                        `O bot agora responderá estritamente às respostas cadastradas localmente neste grupo.`
                });
            }

            if (subAction === "on" || subAction === "ativar" || subAction === "enable" || subAction === "true") {
                groupConfig.useGlobal = true;
                autorepoHelper.saveGroup(message, groupConfig);
                return await message.reply({
                    text: `✅ *Respostas Globais REATIVADAS* no grupo!\n\n` +
                        `O grupo agora responderá tanto às respostas locais quanto ao catálogo oficial global.`
                });
            }

            return await message.reply({
                text: `⚙️ Use:\n` +
                    `• \`${prefix}autorepo global off\` — Desativa as respostas globais no grupo\n` +
                    `• \`${prefix}autorepo global on\` — Reativa as respostas globais no grupo`
            });
        }

        // Adicionar Resposta Local (autorepo add <gatilho> = <resposta>)
        if (action === "add" || action === "adicionar" || action === "criar" || action === "set") {
            const rawParams = args.slice(1).join(" ");
            if (!rawParams || !rawParams.includes("=")) {
                return await message.reply({
                    text: `❌ Formato incorreto!\n\n` +
                        `Use: \`${prefix}autorepo add <gatilho> = <resposta>\`\n` +
                        `Ou: \`${prefix}autorepo add react <gatilho> = <emoji>\`\n` +
                        `Ou: \`${prefix}autorepo add contains <gatilho> = <resposta>\`\n` +
                        `Ou: \`${prefix}autorepo add starts <gatilho> = <resposta>\`\n\n` +
                        `Exemplo: \`${prefix}autorepo add regras = 📜 Respeitem as regras do grupo!\``
                });
            }

            let matchType = "exact";
            let responseAction = "reply";
            let rawBeforeEqual = rawParams.substring(0, rawParams.indexOf("=")).trim();
            const rawAfterEqual = rawParams.substring(rawParams.indexOf("=") + 1).trim();

            if (!rawAfterEqual) {
                return await message.reply({ text: "❌ O conteúdo da resposta não pode ficar em branco após o sinal de '='." });
            }

            // Identifica modificadores antes do gatilho (react, contains, starts)
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

            const created = autorepoHelper.addGroupResponse(message, {
                trigger,
                action: responseAction,
                content: rawAfterEqual,
                matchType,
                cooldown: 5
            });

            if (!created) {
                return await message.reply({ text: "❌ Não foi possível salvar a resposta automática." });
            }

            return await message.reply({
                text: `✅ *Resposta Local Cadastrada com Sucesso!*\n\n` +
                    `📍 *Gatilho:* "${created.trigger}"\n` +
                    `⚙️ *Tipo de Busca:* ${created.matchType}\n` +
                    `🎯 *Ação:* ${created.action === "react" ? "Reagir com Emoji" : "Responder com Texto"}\n` +
                    `💬 *Conteúdo:* ${created.content}`
            });
        }

        // Remover Resposta Local (autorepo del <gatilho>)
        if (action === "del" || action === "delete" || action === "remover" || action === "rem") {
            const target = args.slice(1).join(" ").trim();
            if (!target) {
                return await message.reply({
                    text: `❌ Informe o gatilho que deseja remover.\nExemplo: \`${prefix}autorepo del regras\``
                });
            }

            const removed = autorepoHelper.removeGroupResponse(message, target);
            if (removed) {
                return await message.reply({
                    text: `✅ Resposta local para o gatilho "*${target}*" foi removida deste grupo!`
                });
            } else {
                return await message.reply({
                    text: `❌ Não foi encontrada nenhuma resposta local com o gatilho "*${target}*" neste grupo.`
                });
            }
        }

        // Listar Respostas do Grupo (autorepo list)
        if (action === "list" || action === "lista" || action === "listar") {
            const localResponses = groupConfig.responses || [];
            const globalData = autorepoHelper.loadGlobal();
            const globalResponses = globalData.responses || [];

            let text = `📋 *Respostas Automáticas no Grupo*\n\n`;

            if (localResponses.length === 0) {
                text += `*Respostas Locais:* Nenhuma cadastrada no grupo.\n` +
                    `Adicione usando \`${prefix}autorepo add <gatilho> = <resposta>\`.\n\n`;
            } else {
                text += `*Respostas Locais (${localResponses.length}):*\n`;
                localResponses.forEach((item, index) => {
                    const actionIcon = item.action === "react" ? "✨ [Reação]" : "💬 [Texto]";
                    const matchInfo = item.matchType !== "exact" ? ` (${item.matchType})` : "";
                    text += `${index + 1}. *"${item.trigger}"*${matchInfo} ➔ ${actionIcon} ${item.content}\n`;
                });
                text += `\n`;
            }

            text += `*Respostas Globais Oficiais:* ${groupConfig.useGlobal !== false ? "✅ Ativadas no grupo" : "❌ Desativadas no grupo"}\n`;
            if (groupConfig.useGlobal !== false && globalResponses.length > 0) {
                text += `Gatilhos globais disponíveis: ${globalResponses.map(g => `\`${g.trigger}\``).join(", ")}\n`;
            }

            return await message.reply({ text: text.trim() });
        }

        // Limpar todas as respostas locais do grupo
        if (action === "limpar" || action === "clear" || action === "reset") {
            autorepoHelper.clearGroupResponses(message);
            return await message.reply({
                text: `🗑️ Todas as respostas automáticas locais deste grupo foram removidas.`
            });
        }

        return await message.reply({
            text: `❌ Opção inválida.\n\nDigite \`${prefix}autorepo help\` para ver todos os comandos disponíveis.`
        });
    }
};
