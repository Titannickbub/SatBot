const { isOwner } = require("../../functions/owners");
const {
    getVipConfig,
    addVipCommand,
    removeVipCommand,
    setVipPvPlatform,
    setVipOnlyEnabled,
    addVipOnlyItem,
    removeVipOnlyItem
} = require("../../functions/config");
const vipHelper = require("../../functions/vipHelper");

function _helpText(message) {
    const prefix = message.prefix || '!';
    return [
        '👑 *GERENCIAMENTO VIP / PREMIUM — AJUDA*',
        '',
        '🔹 *Comandos principais:*',
        `• \`${prefix}vip\` — Consulta o próprio status VIP e o tempo restante.`,
        `• \`${prefix}set_vip check [@user|id]\` — Consulta o status VIP do usuário atual ou de um alvo.`,
        `• \`${prefix}set_vip set @user <tempo>\` — Define um VIP com duração exata a partir de agora.`,
        `• \`${prefix}set_vip add @user <tempo>\` — Soma tempo ao VIP já ativo.`,
        `• \`${prefix}set_vip rem @user <tempo>\` — Remove tempo do VIP ativo.`,
        `• \`${prefix}set_vip reset @user\` / \`${prefix}set_vip cancel @user\` — Cancela e zera o VIP.`,
        `• \`${prefix}set_vip date @user <data> [hora]\` — Define uma data/hora exatas de expiração.`,
        `• \`${prefix}set_vip perm @user\` — Concede VIP permanente.`,
        '',
        '🔹 *Gerenciamento de comandos e PV:*',
        `• \`${prefix}set_vip addcmd <cmd>\` — Adiciona comando liberado para usuários VIP.`,
        `• \`${prefix}set_vip remcmd <cmd>\` — Remove comando VIP liberado.`,
        `• \`${prefix}set_vip listcmd\` — Lista todos os comandos VIP permitidos.`,
        `• \`${prefix}set_vip pv on|off <plataforma>\` — Habilita ou desabilita o bypass de PV por plataforma.`,
        '',
        '🔹 *Modo exclusivo VIP:*',
        `• \`${prefix}set_vip chat on|off\` — Ativa/desativa o modo VIP-only no chat atual.`,
        `• \`${prefix}set_vip server on|off\` — Ativa/desativa o modo VIP-only no servidor atual.`,
        `• \`${prefix}set_vip categorie on|off\` — Ativa/desativa o modo VIP-only na categoria atual.`,
        '',
        '📌 *Formatos aceitos no tempo:*',
        '• `10d` → 10 dias',
        '• `2h 30m` → 2 horas e 30 minutos',
        '• `30d` / `12h` / `90m`',
        '',
        '💡 *Exemplos:*',
        `• \`${prefix}vip\``,
        `• \`${prefix}set_vip set @José 15d\``,
        `• \`${prefix}set_vip add @José 30d\``,
        `• \`${prefix}set_vip rem @José 5d\``,
        `• \`${prefix}set_vip perm @José\``,
        `• \`${prefix}set_vip pv on whatsapp\``,
        '',
        '⚙️ *Atenção:* todo o comando `set_vip` exige privilégios de SU.'
    ].join('\n');
}

module.exports = {
    name: "set_vip",
    aliases: ["setvip"],
    category: "system",
    description: "Gerencia manualmente assinaturas e configurações VIP. Uso exclusivo de Super Usuários.",
    usage: "{prefix}set_vip [subcomando]",
    async execute(message) {
        if (!(message.sender?.isOwner || isOwner(message))) {
            return message.reply({ text: "⚠️ Apenas usuários com nível SU podem gerenciar ou consultar assinaturas VIP." });
        }

        const args = (message.text || "").trim().split(/\s+/).slice(1);
        const store = (message.functions && message.functions.centralAccounts) || global.centralAccounts;

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

        if (!args.length) {
            return message.reply({ text: _helpText(message) });
        }

        if (args[0].toLowerCase() === "check") {
            const target = resolveTarget(args[1] || message.userId);
            const central = target ? await target.central : null;
            const finalCentral = central || (store && typeof store.findByPlatform === 'function' ? store.findByPlatform(message.platform, target ? target.userId : message.userId) : null);
            const status = finalCentral ? vipHelper.getVipStatus(finalCentral.id) : { active: false, permanent: false, remainingMs: 0, expiresAt: null };
            return message.reply({ text: vipHelper.formatVipStatusCard({
                userName: finalCentral?.name || message.username || message.displayName || message.name || "Usuário",
                centralId: finalCentral?.id || target?.userId || message.userId || "—",
                status
            }) });
        }

        if (args[0].toLowerCase() === "help") {
            return message.reply({ text: _helpText(message) });
        }

        const sub = args[0].toLowerCase();

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
                    return message.reply({ text: `⚠️ Use: ${message.prefix || "!"}set_vip date @user <dd/mm/yyyy> [hh:mm]` });
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
                if (!cmd) return message.reply({ text: `⚠️ Use: ${message.prefix || "!"}set_vip addcmd <comando>` });
                const ok = addVipCommand(cmd);
                return message.reply({ text: ok ? `✅ Comando VIP adicionado: ${cmd}` : `ℹ️ O comando ${cmd} já estava na lista.` });
            }

            if (sub === "remcmd") {
                const cmd = String(args[1] || '').replace(/^!/, '').toLowerCase();
                if (!cmd) return message.reply({ text: `⚠️ Use: ${message.prefix || "!"}set_vip remcmd <comando>` });
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
                if (!platform) return message.reply({ text: `⚠️ Use: ${message.prefix || "!"}set_vip pv on/off <plataforma>` });
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

            return message.reply({ text: `⚠️ Uso inválido. Use: ${message.prefix || "!"}set_vip [check|help|set|add|rem|reset|date|perm|addcmd|remcmd|listcmd|pv|chat|server|categorie]` });
        } catch (err) {
            console.error('[VIP_COMMAND]', err);
            return message.reply({ text: "❌ Não foi possível concluir essa operação VIP. Confira os dados e tente novamente." });
        }
    }
};
