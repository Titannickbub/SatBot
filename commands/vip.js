const { isOwner } = require("../functions/owners");
const {
    getVipConfig,
    addVipCommand,
    removeVipCommand,
    setVipPvPlatform,
    setVipOnlyEnabled,
    addVipOnlyItem,
    removeVipOnlyItem
} = require("../functions/config");
const vipHelper = require("../functions/vipHelper");

function _renderVipCard(message, central, status) {
    const userName = message.username || message.displayName || message.name || 'Usuário';
    const targetCentral = central || null;
    return vipHelper.formatVipStatusCard({
        userName,
        centralId: targetCentral ? targetCentral.id : (message.userId || '—'),
        status: status || {
            active: false,
            permanent: false,
            expiresAt: null,
            remainingMs: 0
        }
    });
}

function _helpText(message) {
    const prefix = message.prefix || '!';
    return [
        '👑 *SISTEMA VIP / PREMIUM — AJUDA*',
        '',
        '🔹 *Comandos principais:*',
        `• \`${prefix}vip\` ou \`${prefix}vip check [@user|id]\` — Consulta o status VIP do usuário atual ou de um alvo.` ,
        `• \`${prefix}vip set @user <tempo>\` — Define um VIP com duração exata a partir de agora.`,
        `• \`${prefix}vip add @user <tempo>\` — Soma tempo ao VIP já ativo.`,
        `• \`${prefix}vip rem @user <tempo>\` — Remove tempo do VIP ativo.`,
        `• \`${prefix}vip reset @user\` / \`${prefix}vip cancel @user\` — Cancela e zera o VIP.`,
        `• \`${prefix}vip date @user <data> [hora]\` — Define uma data/hora exatas de expiração.`,
        `• \`${prefix}vip perm @user\` — Concede VIP permanente.`,
        '',
        '🔹 *Gerenciamento de comandos e PV:*',
        `• \`${prefix}vip addcmd <cmd>\` — Adiciona comando liberado para usuários VIP.`,
        `• \`${prefix}vip remcmd <cmd>\` — Remove comando VIP liberado.`,
        `• \`${prefix}vip listcmd\` — Lista todos os comandos VIP permitidos.`,
        `• \`${prefix}vip pv on|off <plataforma>\` — Habilita ou desabilita o bypass de PV por plataforma.`,
        '',
        '🔹 *Modo exclusivo VIP:*',
        `• \`${prefix}vip chat on|off\` — Ativa/desativa o modo VIP-only no chat atual.`,
        `• \`${prefix}vip server on|off\` — Ativa/desativa o modo VIP-only no servidor atual.`,
        `• \`${prefix}vip categorie on|off\` — Ativa/desativa o modo VIP-only na categoria atual.`,
        '',
        '📌 *Formatos aceitos no tempo:*',
        '• `10d` → 10 dias',
        '• `2h 30m` → 2 horas e 30 minutos',
        '• `30d` / `12h` / `90m`',
        '',
        '💡 *Exemplos:*',
        `• \`${prefix}vip check\``,
        `• \`${prefix}vip set @José 15d\``,
        `• \`${prefix}vip add @José 30d\``,
        `• \`${prefix}vip rem @José 5d\``,
        `• \`${prefix}vip perm @José\``,
        `• \`${prefix}vip pv on whatsapp\``,
        '',
        '⚙️ *Observação:* os comandos de gerenciamento do VIP exigem privilégios de SU.'
    ].join('\n');
}

module.exports = {
    name: "vip",
    aliases: ["premium"],
    description: "Gerencia status VIP, permissões e regras exclusivas.",
    usage: "{prefix}vip [subcomando]",
    async execute(message) {
        const args = (message.text || "").trim().split(/\s+/).slice(1);
        const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts;

        const ensureSu = () => {
            const isSuperUser = message.sender?.isOwner || isOwner(message);
            return !!isSuperUser;
        };

        const resolveTarget = (rawTarget) => {
            const target = rawTarget || message.userId;
            const id = String(target).replace(/^@/, "").trim();
            if (!id) return null;

            if (store && typeof store.getCentralById === 'function') {
                const byCentralId = store.getCentralById(id);
                if (byCentralId) {
                    return { userId: byCentralId.platformAccounts?.[0]?.platformId || id, central: byCentralId };
                }
            }

            if (!store || typeof store.getOrCreateByPlatform !== 'function') {
                return { userId: id, central: null };
            }

            const foundByPlatform = store.findByPlatform ? store.findByPlatform(message.platform, id) : null;
            if (foundByPlatform) {
                return { userId: id, central: foundByPlatform };
            }

            const central = store.getOrCreateByPlatform(message.platform, id, { username: id, displayName: id });
            return { userId: id, central };
        };

        if (!args.length || args[0].toLowerCase() === "check") {
            const target = resolveTarget(args[1] || message.userId);
            const central = target ? await target.central : null;
            const finalCentral = central || (store && typeof store.findByPlatform === 'function' ? store.findByPlatform(message.platform, target ? target.userId : message.userId) : null);
            const status = finalCentral ? vipHelper.getVipStatus(finalCentral.id) : { active: false, permanent: false, remainingMs: 0, expiresAt: null };
            return message.reply({ text: _renderVipCard(message, finalCentral, status) });
        }

        if (args[0].toLowerCase() === "help") {
            return message.reply({ text: _helpText(message) });
        }

        const sub = args[0].toLowerCase();

        if (!ensureSu()) {
            return message.reply({ text: "⚠️ Apenas usuários com nível SU podem gerenciar VIP." });
        }

        try {
            if (sub === "set") {
                const target = resolveTarget(args[1]);
                const duration = vipHelper.parseDurationString(args.slice(2).join(" "));
                const central = target && target.central ? await target.central : (store && typeof store.findByPlatform === 'function' ? store.findByPlatform(message.platform, target ? target.userId : message.userId) : null);
                if (!central) {
                    return message.reply({ text: "⚠️ Não foi possível localizar a conta central do alvo." });
                }
                const result = vipHelper.setVipDuration(central.id, duration);
                return message.reply({ text: `✅ VIP definido para ${target.userId}: ${result.display}` });
            }

            if (sub === "add") {
                const target = resolveTarget(args[1]);
                const duration = vipHelper.parseDurationString(args.slice(2).join(" "));
                const central = target && target.central ? await target.central : (store && typeof store.findByPlatform === 'function' ? store.findByPlatform(message.platform, target ? target.userId : message.userId) : null);
                if (!central) {
                    return message.reply({ text: "⚠️ Não foi possível localizar a conta central do alvo." });
                }
                const result = vipHelper.addVipDuration(central.id, duration);
                return message.reply({ text: `✅ Tempo adicionado ao VIP de ${target.userId}: ${result.display}` });
            }

            if (sub === "rem") {
                const target = resolveTarget(args[1]);
                const duration = vipHelper.parseDurationString(args.slice(2).join(" "));
                const central = target && target.central ? await target.central : (store && typeof store.findByPlatform === 'function' ? store.findByPlatform(message.platform, target ? target.userId : message.userId) : null);
                if (!central) {
                    return message.reply({ text: "⚠️ Não foi possível localizar a conta central do alvo." });
                }
                const result = vipHelper.removeVipDuration(central.id, duration);
                return message.reply({ text: `✅ Tempo removido do VIP de ${target.userId}: ${result.display}` });
            }

            if (sub === "reset" || sub === "cancel") {
                const target = resolveTarget(args[1]);
                const central = target && target.central ? await target.central : (store && typeof store.findByPlatform === 'function' ? store.findByPlatform(message.platform, target ? target.userId : message.userId) : null);
                if (!central) {
                    return message.reply({ text: "⚠️ Não foi possível localizar a conta central do alvo." });
                }
                vipHelper.resetVip(central.id);
                return message.reply({ text: `✅ VIP resetado para ${target.userId}.` });
            }

            if (sub === "date") {
                const target = resolveTarget(args[1]);
                const dateValue = args.slice(2).join(" ");
                if (!dateValue) {
                    return message.reply({ text: "⚠️ Use: !vip date @user <dd/mm/yyyy> [hh:mm]" });
                }
                const dateParts = dateValue.trim().split(/\s+/);
                const dateInput = dateParts[0];
                const timeInput = dateParts[1] || null;
                const central = target && target.central ? await target.central : (store && typeof store.findByPlatform === 'function' ? store.findByPlatform(message.platform, target ? target.userId : message.userId) : null);
                if (!central) {
                    return message.reply({ text: "⚠️ Não foi possível localizar a conta central do alvo." });
                }
                const result = vipHelper.setVipDate(central.id, dateInput, timeInput);
                return message.reply({ text: `✅ Data do VIP definida para ${target.userId}: ${result.display}` });
            }

            if (sub === "perm") {
                const target = resolveTarget(args[1]);
                const central = target && target.central ? await target.central : (store && typeof store.findByPlatform === 'function' ? store.findByPlatform(message.platform, target ? target.userId : message.userId) : null);
                if (!central) {
                    return message.reply({ text: "⚠️ Não foi possível localizar a conta central do alvo." });
                }
                const result = vipHelper.setPermanentVip(central.id);
                return message.reply({ text: `✅ VIP permanente concedido para ${target.userId}: ${result.display}` });
            }

            if (sub === "addcmd") {
                const cmd = String(args[1] || '').replace(/^!/, '').toLowerCase();
                if (!cmd) return message.reply({ text: "⚠️ Use: !vip addcmd <comando>" });
                const ok = addVipCommand(cmd);
                return message.reply({ text: ok ? `✅ Comando VIP adicionado: ${cmd}` : `ℹ️ O comando ${cmd} já estava na lista.` });
            }

            if (sub === "remcmd") {
                const cmd = String(args[1] || '').replace(/^!/, '').toLowerCase();
                if (!cmd) return message.reply({ text: "⚠️ Use: !vip remcmd <comando>" });
                const ok = removeVipCommand(cmd);
                return message.reply({ text: ok ? `✅ Comando VIP removido: ${cmd}` : `ℹ️ O comando ${cmd} não estava na lista.` });
            }

            if (sub === "listcmd") {
                const cmds = getVipConfig().vipCommands || [];
                return message.reply({ text: cmds.length ? `📋 Comandos VIP: ${cmds.join(', ')}` : '📋 Nenhum comando VIP configurado.' });
            }

            if (sub === "pv") {
                const action = (args[1] || '').toLowerCase();
                const platform = (args[2] || message.platform || '').toLowerCase();
                if (!platform) return message.reply({ text: "⚠️ Use: !vip pv on/off <plataforma>" });
                const enabled = action === 'on' || action === 'enable' || action === 'true';
                setVipPvPlatform(platform, enabled);
                return message.reply({ text: `✅ Bypass de PV do VIP em ${platform}: ${enabled ? 'ativo' : 'inativo'}.` });
            }

            if (sub === "chat" || sub === "server" || sub === "categorie" || sub === "category") {
                const action = (args[1] || '').toLowerCase();
                const enabled = action === 'on' || action === 'enable' || action === 'true';
                const targetId = sub === 'chat' ? (message.chatId || message.target?.chatId || message.raw?.channel?.id) : sub === 'server' ? (message.serverId || message.guildId || message.communityId || message.raw?.guild?.id) : (message.categoryId || message.raw?.channel?.parentId || message.raw?.channel?.parent?.id);
                if (!targetId) return message.reply({ text: "⚠️ Não foi possível identificar este chat/servidor/categoria para aplicar o modo VIP-only." });
                if (enabled) {
                    addVipOnlyItem(sub, targetId);
                    setVipOnlyEnabled(true);
                } else {
                    removeVipOnlyItem(sub, targetId);
                }
                return message.reply({ text: `✅ Modo VIP-only para ${sub} ${enabled ? 'ativado' : 'desativado'} neste alvo.` });
            }

            return message.reply({ text: "⚠️ Uso inválido. Use: !vip [check|help|set|add|rem|reset|date|perm|addcmd|remcmd|listcmd|pv|chat|server|categorie]" });
        } catch (err) {
            console.error('[VIP_COMMAND]', err);
            return message.reply({ text: "❌ Não foi possível concluir essa operação VIP. Confira os dados e tente novamente." });
        }
    }
};
