const maintenance = require("../../functions/maintenanceHelper");
const { isOwner } = require("../../functions/owners");

const DESCRIPTION = `🧹 Remove os registros locais de membros que já saíram deste grupo ou servidor.

🔐 Disponível para administradores do chat e superusuários.
⚠️ A limpeza é permanente e pode apagar saldo, escudos, XP, atividade, advertências, casamentos e participação no Setembro.
✅ O comando sem confirmação apenas exibe este aviso.

Confirme a limpeza:
{prefix}atualizar_membros confirmar

No Telegram, o bot verifica individualmente os IDs encontrados nos dados salvos. Se não conseguir confirmar a situação de alguém, preserva os dados dessa pessoa.

❔ Ajuda:
{prefix}atualizar_membros help`;

function isAdmin(message) {
    return Boolean(message.sender?.isAdmin || message.sender?.isOwner || isOwner(message));
}

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

function formatReport(report) {
    const labels = {
        activity: "atividade",
        economy: "economia/escudos",
        xp: "XP",
        marriages: "casamentos/pedidos",
        warnings: "advertências",
        september: "participação no Setembro"
    };
    const records = Object.entries(report.removedRecords)
        .map(([type, count]) => `${labels[type] || type}: ${count}`)
        .join(", ") || "nenhum registro removido";
    return [
        "✅ Atualização de membros concluída.",
        `Grupo/servidor: ${report.groupId} (${report.platform}).`,
        `Verificados: ${report.checkedMembers} · fora do grupo: ${report.absentMembers} · não confirmados: ${report.unverifiedMembers}.`,
        `Registros removidos: ${records}.`,
        report.errors.length
            ? `⚠️ Pendências (${report.errors.length}): ${report.errors.slice(0, 4).join(" | ")}${report.errors.length > 4 ? " | ..." : ""}`
            : null
    ].filter(Boolean).join("\n");
}

module.exports = {
    name: "atualizar_membros",
    aliases: ["atualizar-membros"],
    category: "adm/membros",
    description: DESCRIPTION,
    usage: "{prefix}atualizar_membros confirmar",

    async execute(message) {
        if (!isAdmin(message)) {
            return message.reply({ text: "❌ Apenas administradores deste grupo/servidor podem atualizar os dados dos membros." });
        }
        if (["help", "ajuda"].includes(String(message.args?.[0] || "").toLowerCase())) {
            return message.reply({ text: helpText(message) });
        }
        if (String(message.args?.[0] || "").toLowerCase() !== "confirmar") {
            return message.reply({
                text: `⚠️ Esta ação apagará permanentemente os dados locais dos membros que saíram, inclusive saldos de economia. Para continuar, envie ${message.prefix || "!"}atualizar_membros confirmar.`
            });
        }

        try {
            const report = await maintenance.updateGroupMembers(message);
            return message.reply({ text: formatReport(report) });
        } catch (error) {
            console.error("[MAINTENANCE] Falha em atualizar_membros:", error);
            return message.reply({ text: `❌ A limpeza não foi concluída. Nenhuma alteração foi iniciada: ${error.message || error}` });
        }
    }
};
