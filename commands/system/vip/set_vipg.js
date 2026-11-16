const { isOwner } = require("../../../functions/owners");
const { setVipPvPlatform } = require("../../../functions/config");
const vipHelper = require("../../../functions/vipHelper");

const DESCRIPTION = `👑 Gerencia o VIPG global da Conta Central e o bypass de Anti-PV.

🔐 Disponível exclusivamente para superusuários / donos do bot.

🔍 1. Consulte o status VIP de um usuário:
{prefix}set_vipg check
{prefix}set_vipg check @usuario
{prefix}set_vipg check 123456789

Exibe o cartão detalhado com tempo restante, data de expiração e tipo de plano (temporário ou permanente).

⏱️ 2. Defina uma duração de VIP a partir de agora:
{prefix}set_vipg set @usuario 15d
{prefix}set_vipg set @usuario 2h 30m

Substitui qualquer VIP anterior e inicia a contagem com o tempo informado.

➕ 3. Adicione mais tempo a um VIP ativo:
{prefix}set_vipg add @usuario 30d
{prefix}set_vipg add @usuario 12h

Soma o tempo informado ao período que o usuário já possui.

➖ 4. Remova tempo do VIP ativo:
{prefix}set_vipg rem @usuario 5d

Reduz o tempo de assinatura restante do usuário.

♾️ 5. Conceda VIP permanente (vitalício):
{prefix}set_vipg perm @usuario

Ativa o plano VIP sem data de expiração.

📅 6. Defina uma data e hora exatas para expiração:
{prefix}set_vipg date @usuario 31/12/2026
{prefix}set_vipg date @usuario 31/12/2026 23:59

Configura o término do VIP exatamente na data e horário especificados.

🗑️ 7. Cancele ou zere o VIP de um usuário:
{prefix}set_vipg reset @usuario
{prefix}set_vipg cancel @usuario

Remove o status VIP imediatamente e zera o tempo restante.

📩 8. Configure o bypass global de Anti-PV para usuários VIP:
{prefix}set_vipg pv on whatsapp
{prefix}set_vipg pv off telegram

Quando ativado, membros VIP podem usar o bot no privado mesmo com o Anti-PV global ligado na plataforma.

📌 Formatos de tempo aceitos:
• d — dias (ex: 30d, 15d)
• h — horas (ex: 12h, 2h)
• m — minutos (ex: 45m, 30m)
• Combinações compostas: 15d 12h 30m`;

function _helpText(message) {
    const prefix = message.prefix || '!';
    return DESCRIPTION.replaceAll('{prefix}', prefix);
}

module.exports = {
    name: "set_vipg",
    aliases: ["setvipg"],
    category: "system/vip",
    description: DESCRIPTION,
    usage: "{prefix}set_vipg help",
    examples: [
        "{prefix}set_vipg check @usuario",
        "{prefix}set_vipg set @usuario 30d",
        "{prefix}set_vipg add @usuario 15d",
        "{prefix}set_vipg perm @usuario",
        "{prefix}set_vipg date @usuario 31/12/2026",
        "{prefix}set_vipg pv on whatsapp"
    ],
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
                    return message.reply({ text: `⚠️ Use: ${message.prefix || "!"}set_vipg date @user <dd/mm/yyyy> [hh:mm]` });
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

            if (sub === "pv") {
                const action = (args[1] || '').toLowerCase();
                const platform = (args[2] || message.platform || '').toLowerCase();
                if (!platform) return message.reply({ text: `⚠️ Use: ${message.prefix || "!"}set_vipg pv on/off <plataforma>` });
                const enabled = action === 'on' || action === 'enable' || action === 'true';
                setVipPvPlatform(platform, enabled);
                return message.reply({ text: `✅ Bypass de PV do VIP em ${platform}: ${enabled ? 'ativo' : 'inativo'}.` });
            }

            return message.reply({ text: `⚠️ Uso inválido. Use: ${message.prefix || "!"}set_vipg [check|help|set|add|rem|reset|date|perm|pv]` });
        } catch (err) {
            console.error('[VIP_COMMAND]', err);
            return message.reply({ text: "❌ Não foi possível concluir essa operação VIP. Confira os dados e tente novamente." });
        }
    }
};
