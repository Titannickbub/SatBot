const owners = require("../../../functions/owners");
const config = require("../../../functions/config");

function checkOwner(message) {
    if (message.functions?.owners?.isOwner) {
        return message.functions.owners.isOwner(message);
    }
    return owners.isOwner(message);
}

const REGIONAL_SHORTCUTS = {
    // Brasil
    "sao_paulo": "America/Sao_Paulo",
    "saopaulo": "America/Sao_Paulo",
    "sp": "America/Sao_Paulo",
    "brasilia": "America/Sao_Paulo",
    "bsb": "America/Sao_Paulo",
    "manaus": "America/Manaus",
    "belem": "America/Belem",
    "fortaleza": "America/Fortaleza",
    "recife": "America/Recife",
    "salvador": "America/Bahia",
    "bahia": "America/Bahia",
    "maceio": "America/Maceio",
    "cuiaba": "America/Cuiaba",
    "campo_grande": "America/Campo_Grande",
    "campogrande": "America/Campo_Grande",
    "porto_velho": "America/Porto_Velho",
    "portovelho": "America/Porto_Velho",
    "boa_vista": "America/Boa_Vista",
    "boavista": "America/Boa_Vista",
    "rio_branco": "America/Rio_Branco",
    "riobranco": "America/Rio_Branco",
    "noronha": "America/Noronha",
    "fernando_de_noronha": "America/Noronha",

    // Portugal
    "lisboa": "Europe/Lisbon",
    "lisbon": "Europe/Lisbon",
    "portugal": "Europe/Lisbon",
    "porto": "Europe/Lisbon",
    "madeira": "Atlantic/Madeira",
    "funchal": "Atlantic/Madeira",
    "acores": "Atlantic/Azores",
    "azores": "Atlantic/Azores",

    // Países Lusófonos / CPLP
    "luanda": "Africa/Luanda",
    "angola": "Africa/Luanda",
    "maputo": "Africa/Maputo",
    "mocambique": "Africa/Maputo",
    "mozambique": "Africa/Maputo",
    "praia": "Atlantic/Cape_Verde",
    "caboverde": "Atlantic/Cape_Verde",
    "cabo_verde": "Atlantic/Cape_Verde",
    "bissau": "Africa/Bissau",
    "guine_bissau": "Africa/Bissau",
    "saotome": "Africa/Sao_Tome",
    "sao_tome": "Africa/Sao_Tome",
    "dili": "Asia/Dili",
    "timor": "Asia/Dili",
    "timor_leste": "Asia/Dili",
    "macau": "Asia/Macau",
    "malabo": "Africa/Malabo",

    // Universais
    "utc": "UTC",
    "gmt": "GMT"
};

const COMMON_TIMEZONES = [
    {
        region: "🇧🇷 Brasil",
        items: [
            { name: "America/Sao_Paulo", desc: "Brasília / Sul / Sudeste / Nordeste / Centro-Oeste (GMT-3)" },
            { name: "America/Manaus", desc: "Amazonas (GMT-4)" },
            { name: "America/Belem", desc: "Pará / Amapá (GMT-3)" },
            { name: "America/Fortaleza", desc: "Ceará / Nordeste (GMT-3)" },
            { name: "America/Recife", desc: "Pernambuco (GMT-3)" },
            { name: "America/Bahia", desc: "Bahia (GMT-3)" },
            { name: "America/Cuiaba", desc: "Mato Grosso (GMT-4)" },
            { name: "America/Campo_Grande", desc: "Mato Grosso do Sul (GMT-4)" },
            { name: "America/Porto_Velho", desc: "Rondônia (GMT-4)" },
            { name: "America/Boa_Vista", desc: "Roraima (GMT-4)" },
            { name: "America/Rio_Branco", desc: "Acre (GMT-5)" },
            { name: "America/Noronha", desc: "Fernando de Noronha (GMT-2)" }
        ]
    },
    {
        region: "🇵🇹 Portugal",
        items: [
            { name: "Europe/Lisbon", desc: "Portugal Continental (Lisboa / Porto)" },
            { name: "Atlantic/Madeira", desc: "Arquipélago da Madeira" },
            { name: "Atlantic/Azores", desc: "Arquipélago dos Açores" }
        ]
    },
    {
        region: "🌍 Países de Língua Portuguesa (CPLP)",
        items: [
            { name: "Africa/Luanda", desc: "🇦🇴 Angola (Luanda - GMT+1)" },
            { name: "Africa/Maputo", desc: "🇲🇿 Moçambique (Maputo - GMT+2)" },
            { name: "Atlantic/Cape_Verde", desc: "🇨🇻 Cabo Verde (Praia - GMT-1)" },
            { name: "Africa/Bissau", desc: "🇬🇼 Guiné-Bissau (Bissau - GMT+0)" },
            { name: "Africa/Sao_Tome", desc: "🇸🇹 São Tomé e Príncipe (GMT+0)" },
            { name: "Asia/Dili", desc: "🇹🇱 Timor-Leste (Díli - GMT+9)" },
            { name: "Asia/Macau", desc: "🇲🇴 Macau (GMT+8)" },
            { name: "Africa/Malabo", desc: "🇬🇶 Guiné Equatorial (GMT+1)" }
        ]
    },
    {
        region: "🌐 Padrões Globais",
        items: [
            { name: "UTC", desc: "Tempo Universal Coordenado (GMT+0)" },
            { name: "America/New_York", desc: "Estados Unidos (Leste)" }
        ]
    }
];

function formatTimeInTimezone(tz) {
    try {
        const now = new Date();
        return new Intl.DateTimeFormat("pt-BR", {
            timeZone: tz,
            timeZoneName: "shortOffset",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(now);
    } catch {
        return "Horário indisponível";
    }
}

function resolveTimezoneInput(input) {
    if (!input || typeof input !== "string") return null;
    const clean = input.trim();
    const normalizedKey = clean
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[-\s]+/g, "_");

    if (REGIONAL_SHORTCUTS[normalizedKey]) {
        return REGIONAL_SHORTCUTS[normalizedKey];
    }

    return config.normalizeTimezone(clean);
}

const DESCRIPTION = `🌐 Configura o fuso horário (Timezone) padrão do sistema do bot.

🔐 Disponível apenas para superusuários / donos do bot.

📋 1. Consulte o fuso horário atual:
{prefix}fuso
{prefix}fuso status

Exibe o fuso horário configurado e a data/hora atual do sistema com base nele.

🌍 2. Altere o fuso horário do bot:
{prefix}fuso America/Sao_Paulo
{prefix}fuso Europe/Lisbon
{prefix}fuso Africa/Luanda
{prefix}fuso Africa/Maputo
{prefix}fuso Atlantic/Cape_Verde
{prefix}fuso UTC

Aceita qualquer fuso horário IANA válido ou atalhos práticos (ex: sp, brasilia, lisboa, luanda, maputo, caboverde, etc.).

📜 3. Consulte os fusos recomendados para países lusófonos:
{prefix}fuso comuns
{prefix}fuso lista

A alteração é salva em settings/config.json e passa a valer imediatamente no sistema.`;

module.exports = {
    name: "fuso",
    aliases: [
        "setfuso",
        "set_fuso",
        "timezone",
        "settimezone",
        "set_timezone",
        "fusohorario",
        "fuso_horario"
    ],
    category: "system/configurações",
    description: DESCRIPTION,
    usage: "{prefix}fuso [fuso_horario|status|comuns|lista]",
    examples: [
        "{prefix}fuso status",
        "{prefix}fuso America/Sao_Paulo",
        "{prefix}fuso Europe/Lisbon",
        "{prefix}fuso Africa/Luanda",
        "{prefix}fuso Africa/Maputo",
        "{prefix}fuso comuns"
    ],

    async execute(message) {
        if (!checkOwner(message)) {
            return message.reply({ text: "❌ Apenas superusuários podem configurar o fuso horário do sistema." });
        }

        const args = (message.args || []).map(arg => String(arg).trim()).filter(Boolean);
        const prefix = message.prefix || "!";
        const currentTz = config.getTimezone();

        if (args.length === 0 || args[0].toLowerCase() === "status") {
            const formatted = formatTimeInTimezone(currentTz);
            return message.reply({
                text: `🌐 *Fuso Horário do Sistema*\n\n` +
                    `📍 *Fuso Atual:* \`${currentTz}\`\n` +
                    `🕒 *Data e Hora Local:* ${formatted}\n\n` +
                    `💡 Para alterar o fuso horário, use:\n` +
                    `*${prefix}fuso <identificador_iana>*\n` +
                    `Exemplo: *${prefix}fuso Europe/Lisbon*\n\n` +
                    `📜 Para ver fusos comuns de países de língua portuguesa, use:\n` +
                    `*${prefix}fuso comuns*`
            });
        }

        const action = args[0].toLowerCase();
        if (action === "comuns" || action === "lista" || action === "list" || action === "ajuda") {
            let listText = `🌍 *Fusos Horários Recomendados (Países Lusófonos)*\n\n`;
            for (const group of COMMON_TIMEZONES) {
                listText += `*${group.region}*\n`;
                for (const item of group.items) {
                    const sampleTime = formatTimeInTimezone(item.name);
                    listText += `• \`${item.name}\` — ${item.desc}\n  🕒 _${sampleTime}_\n`;
                }
                listText += `\n`;
            }
            listText += `⚙️ Use *${prefix}fuso <fuso>* para aplicar (ex: *${prefix}fuso ${currentTz}*).`;
            return message.reply({ text: listText.trim() });
        }

        const input = args.join(" ");
        const resolvedTz = resolveTimezoneInput(input);

        if (!resolvedTz) {
            return message.reply({
                text: `❌ Fuso horário "*${input}*" não é válido ou não foi reconhecido.\n\n` +
                    `Use um identificador IANA válido (ex: *America/Sao_Paulo*, *Europe/Lisbon*, *Africa/Luanda*, *UTC*).\n\n` +
                    `💡 Digite *${prefix}fuso comuns* para ver a lista de fusos horários disponíveis.`
            });
        }

        const savedTz = config.setTimezone(resolvedTz);
        if (!savedTz) {
            return message.reply({ text: "❌ Ocorreu uma falha ao salvar o fuso horário nas configurações." });
        }

        const newFormatted = formatTimeInTimezone(savedTz);
        return message.reply({
            text: `✅ *Fuso horário atualizado com sucesso!*\n\n` +
                `📍 *Novo fuso:* \`${savedTz}\`\n` +
                `🕒 *Data e hora ajustada:* ${newFormatted}\n\n` +
                `💾 A configuração foi salva em \`settings/config.json\` e aplicada a todo o sistema do bot.`
        });
    }
};
