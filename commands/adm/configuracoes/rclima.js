/*
=================================================================

COMANDO: !rclima

Configura o monitor de previsão do tempo aleatória para o chat atual.
Permite cadastrar uma lista de cidades e enviar automaticamente
a previsão de uma cidade sorteada nos horários agendados.

Apenas administradores podem alterar configurações e horários.

=================================================================
*/

const randomWeatherMonitor = require("../../../functions/randomWeatherMonitor");
const { isOwner } = require("../../../functions/owners");

async function checkAdminPermission(message) {
    if (message.sender?.isOwner || isOwner(message)) return true;
    const adapter = (message.platforms || []).find(p => p.name === message.platform);
    if (adapter?.checkUserPermission) {
        return adapter.checkUserPermission(message.chatId, message.userId);
    }
    return !!(message.sender?.isAdmin);
}

const DESCRIPTION = `🎲 Agenda previsões diárias de uma cidade sorteada entre as cadastradas neste chat ou tópico.

🔐 Administradores do chat e superusuários podem configurar, ativar, desativar ou testar o monitor.

📍 1. Adicione as cidades que poderão ser sorteadas:
{prefix}rclima add <cidade>
{prefix}rclima add Salvador
{prefix}rclima add São Paulo

Adicione cada cidade separadamente. Cidades repetidas não são duplicadas.

🗑️ Para remover uma cidade da lista:
{prefix}rclima remove <cidade>
{prefix}rclima remove Salvador

Para remover todas as cidades de uma vez:
{prefix}rclima clear

⏰ 2. Defina os horários diários:
{prefix}rclima times <HH:MM,HH:MM>
{prefix}rclima times 08:00,18:00

Informe um ou mais horários separados por vírgula. Cada nova configuração substitui os horários anteriores. O horário padrão é 08:00.

✅ 3. Ative os envios automáticos:
{prefix}rclima enable

Uma cidade da lista será sorteada em cada horário configurado. Para pausar os envios sem apagar cidades ou horários:
{prefix}rclima disable

🧪 Faça um sorteio e envie uma previsão agora:
{prefix}rclima run

É necessário ter pelo menos uma cidade cadastrada. A execução imediata não altera a programação.

📋 Consulte a lista, o estado e os horários:
{prefix}rclima status

❔ Exiba esta ajuda:
{prefix}rclima help`;

function helpText(message) {
    return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
}

module.exports = {
    name: "rclima",
    category: "adm/configurações",
    aliases: ["randomclima", "climarandom"],
    description: DESCRIPTION,
    usage: "{prefix}rclima <add|remove|clear|times|enable|disable|run|status|help>",
    examples: [
        "{prefix}rclima add Salvador",
        "{prefix}rclima add São Paulo",
        "{prefix}rclima remove Salvador",
        "{prefix}rclima clear",
        "{prefix}rclima times 08:00,18:00",
        "{prefix}rclima enable",
        "{prefix}rclima disable",
        "{prefix}rclima status",
        "{prefix}rclima run",
        "{prefix}rclima help"
    ],
    platformSupport: {
        whatsapp: "full",
        telegram: "full",
        discord: "full"
    },

    async execute(message) {
        if (message.isPrivate) {
            return message.reply({ text: "❌ Este comando só pode ser usado em grupos, canais ou servidores." });
        }

        const args = message.args || [];
        const query = args.join(" ").trim();
        const target = { platform: message.platform, chatId: message.chatId, threadId: message.threadId || null };
        const parts = query.split(/\s+/);
        const command = (parts.shift() || "status").toLowerCase();
        const config = randomWeatherMonitor.loadMonitorConfig(target);

        if (["help", "ajuda", "?"].includes(command)) {
            return message.reply({ text: helpText(message) });
        }

        if (command === "list" || command === "status") {
            return message.reply({
                text: `📌 *Monitor rclima:*\n• Cidades: ${config.cities.length ? config.cities.join(", ") : "(nenhuma)"}\n• Ativo: ${config.enabled ? "✅ Sim" : "❌ Não"}\n• Horários: ${config.times?.length ? config.times.join(", ") : "(nenhum)"}`
            });
        }

        const isAdmin = await checkAdminPermission(message);
        if (!isAdmin) {
            return message.reply({ text: "❌ Apenas administradores podem configurar o monitor rclima." });
        }

        if (["add", "adicionar"].includes(command)) {
            const city = parts.join(" ").trim();
            if (!city) return message.reply({ text: "❌ Informe a cidade. Ex: !rclima add São Paulo" });
            const cities = [...new Set([...config.cities, city])];
            const updated = randomWeatherMonitor.saveMonitorConfig({ cities }, target);
            await randomWeatherMonitor.syncMonitorSchedules(updated, target);
            return message.reply({ text: `✅ Cidade adicionada à lista do rclima: ${city}` });
        }

        if (["remove", "remover", "del"].includes(command)) {
            const city = parts.join(" ").trim();
            if (!city) return message.reply({ text: "❌ Informe a cidade que deseja remover." });
            const cities = config.cities.filter(item => item.toLowerCase() !== city.toLowerCase());
            if (cities.length === config.cities.length) return message.reply({ text: "❌ Essa cidade não está na lista." });
            const updated = randomWeatherMonitor.saveMonitorConfig({ cities }, target);
            await randomWeatherMonitor.syncMonitorSchedules(updated, target);
            return message.reply({ text: `✅ Cidade removida do rclima: ${city}` });
        }

        if (["clear", "limpar"].includes(command)) {
            const updated = randomWeatherMonitor.saveMonitorConfig({ cities: [] }, target);
            await randomWeatherMonitor.syncMonitorSchedules(updated, target);
            return message.reply({ text: "✅ Lista de cidades do rclima limpa com sucesso." });
        }

        if (command === "times") {
            const times = parts.join(" ").split(",").map(item => item.trim()).filter(Boolean);
            if (!times.length) return message.reply({ text: "❌ Informe os horários separados por vírgula. Ex: !rclima times 08:00,18:00" });
            const updated = randomWeatherMonitor.saveMonitorConfig({ times }, target);
            await randomWeatherMonitor.syncMonitorSchedules(updated, target);
            return message.reply({ text: `✅ Horários do rclima atualizados: ${times.join(", ")}` });
        }

        if (["enable", "disable", "ativar", "desativar", "on", "off"].includes(command)) {
            const enabled = ["enable", "ativar", "on"].includes(command);
            const updated = randomWeatherMonitor.saveMonitorConfig({ enabled }, target);
            await randomWeatherMonitor.syncMonitorSchedules(updated, target);
            return message.reply({ text: enabled ? "✅ Monitor rclima ativado para este chat." : "ℹ️ Monitor rclima desativado." });
        }

        if (command === "run") {
            if (!config.cities.length) {
                return message.reply({ text: "❌ Nenhuma cidade cadastrada na lista do rclima. Use: !rclima add <cidade>" });
            }
            const adapter = global.platformRegistry?.[message.platform] || null;
            const result = await randomWeatherMonitor.runRandomWeatherReport({ config, send: Boolean(adapter), target, adapter });
            return message.reply({ text: adapter ? "✅ Previsão aleatória enviada (execução de teste)." : `✅ Pré-visualização:\n\n${result.text}` });
        }

        return message.reply({ text: helpText(message) });
    }
};
