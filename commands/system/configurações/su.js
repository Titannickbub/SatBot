/*
============================================================

COMANDO SU (SUPER USUÁRIO)

LOCAL RECOMENDADO:

commands/system/configurações/su.js

============================================================

⚠️ IMPORTANTE – SISTEMA DE SUPER USUÁRIO

Este comando controla os donos (SU) do bot.

Ele utiliza o módulo:

    functions/owners.js

que gerencia o arquivo:

    settings/su.json

============================================================

📌 COMO FUNCIONA O SU

O sistema possui 3 estados principais:

1) BOT SEM DONO (primeiro uso)
2) BOT COM DONOS REGISTRADOS
3) GERENCIAMENTO DE DONOS EXISTENTES

============================================================

🚀 PRIMEIRO DONO (SETUP INICIAL)

Se o bot NÃO tiver nenhum dono registrado:

- O sistema gera automaticamente um código único
- Esse código aparece apenas uma vez no terminal
- Ele NÃO fica salvo em arquivo
- Ele expira após ser usado ou reinício

Uso:

    {prefix}su code <código>

Isso define o primeiro dono do bot.

⚠️ REGRAS IMPORTANTES:
- Só funciona se NÃO existir nenhum dono
- Só pode ser usado UMA vez
- Após ativação, o código é invalidado

============================================================

👑 ADICIONAR DONO

Uso:

    {prefix}su add <plataforma> <id>

Exemplo:

    {prefix}su add discord 123456

Plataformas suportadas:

    discord
    telegram
    whatsapp

============================================================

❌ REMOVER DONO

Uso:

    {prefix}su del <plataforma> <id>

Remove um dono específico da lista.

============================================================

📋 LISTAR DONOS

Uso:

    {prefix}su list

Exibe todos os super usuários registrados.

Ícones por plataforma:

    🎧 discord
    ✈️ telegram
    📩 whatsapp

============================================================

🔐 REGRAS DE SEGURANÇA

- Apenas super usuários podem usar este comando
- O sistema NÃO possui níveis (apenas SU ou não SU)
- Não existe hierarquia entre donos
- Qualquer SU pode adicionar ou remover outros SU

============================================================

⚠️ RESTRIÇÕES IMPORTANTES

- NÃO editar manualmente o arquivo su.json
- NÃO mover este arquivo sem ajustar imports do core
- NÃO usar caminhos relativos diferentes do padrão:

    require("../../../functions/owners")

============================================================

💾 ARMAZENAMENTO

Os donos são salvos em:

    settings/su.json

Formato:

{
    "owners": [
        {
            "platform": "discord",
            "id": "123456",
            "addedAt": 123456789
        }
    ]
}

============================================================

🧠 COMPORTAMENTO DO SISTEMA

- O sistema valida SU por plataforma + ID
- IDs são sempre strings
- O sistema é independente de comandos de usuário comum
- SU tem acesso total ao bot

============================================================
*/
const { resolvePlatformProfile } = require("../../../functions/profiles");
const suTokenCommand = require("./su-token");
const nofapHelper = require("../../../functions/nofapHelper");
const { ensureParticipant } = require("../../../functions/nofapGroupHelper");

module.exports = {
    category: "system/configurações",

    name: "su",

    description:
        "Gerencia os super usuários do bot.",

    usage:
    "{prefix}su <list/function> <plataforma> [data]",
    examples: [

    "{prefix}su list",

    "{prefix}su code ABCD-1234",

    "{prefix}su add telegram 123456",

    "{prefix}su del telegram 123456",

    "{prefix}su restart"

],

    async execute(message) {

        const owners =
            message.functions.owners;

        const args =
            message.args;

        if (!args.length) {

            return await help(
                message
            );

        }

        const sub =
            args[0].toLowerCase();

        if (sub === "code") {

            const code =
                args[1];

            if (!code) {

                return await help(
                    message
                );

            }

            const success =
                owners.claimFirstOwner(
                    message,
                    code
                );

            if (!success) {
                const msg = owners.hasOwners()
                    ? `❌ Já existe um super usuário registrado. Use ${message.prefix || "!"}su add <plataforma> <id> para adicionar outro.`
                    : "❌ Código inválido ou expirado.";

                return await message.reply({
                    text: msg
                });

            }

            return await message.reply({
                text:
                    "👑 Você agora é um super usuário."
            });

        }

        if (
            !owners.isOwner(
                message
            )
        ) {

            return await message.reply({
                text:
                    "❌ Apenas super usuários podem usar este comando."
            });

        }

        if (sub === "list") {

            return await listOwners(
                message
            );

        }

        if (sub === "token") {
            return await suTokenCommand.execute(message);
        }

        if (sub === "whatsapp") {
            return await requestWhatsAppLogin(message, args.slice(1));
        }

        if (sub === "nofap") {
            return await correctNofapDate(message, args.slice(1));
        }

        if (sub === "onlychats") {
            const onlychatsCmd = require("./onlychats");
            message.args = args.slice(1);
            return await onlychatsCmd.execute(message);
        }

        if (sub === "add") {

            const platform =
                args[1];

            const id =
                args[2];

            if (
                !platform ||
                !id
            ) {

                return await help(
                    message
                );

            }

            const added =
                owners.addOwner(
                    platform,
                    id
                );

            return await message.reply({

                text: added
                    ? "✅ Super usuário adicionado."
                    : "❌ Usuário já cadastrado."

            });

        }

        if (sub === "del") {

            const platform =
                args[1];

            const id =
                args[2];

            if (
                !platform ||
                !id
            ) {

                return await help(
                    message
                );

            }

            const list =
                owners.getOwners();

            if (
                list.length <= 1
            ) {

                return await message.reply({
                    text:
                        "❌ Não é possível remover o último super usuário."
                });

            }

            const removed =
                owners.removeOwner(
                    platform,
                    id
                );

            return await message.reply({

                text: removed
                    ? "✅ Super usuário removido."
                    : "❌ Usuário não encontrado."

            });

        }
if (sub === "restart") {

    const configFn = message.functions.config || require("../../../functions/config");
    const botName = typeof configFn.getBotName === "function" ? configFn.getBotName() : "Sat Bot";

    await message.reply({
        text: `🔄 Reiniciando ${botName}...`
    });

    setTimeout(() => {

        process.exit(0);

    }, 1000);

    return;

}
        return await help(
            message
        );

    }

};

async function help(
    message
) {

    const p =
        message.prefix;

    await message.reply({

text:

`👑 Sistema de Super Usuários

${p}su list

${p}su code CODIGO

${p}su add plataforma id

${p}su del plataforma id

${p}su whatsapp qr

${p}su whatsapp codigo <número>

${p}su onlychats [opção]

${p}su nofap <ID|@menção> <dd/mm/yyyy [hh:mm]>

${p}su restart`

    });

}

async function requestWhatsAppLogin(message, args) {
    const mode = String(args[0] || "").toLowerCase();
    const authFlow = require("../../../functions/authFlow");
    const number = authFlow.normalizeWhatsAppPhone(args.slice(1).join(""));
    if (!["qr", "codigo"].includes(mode) ||
        (mode === "codigo" && (!number || number.length < 10 || number.length > 15))) {
        return message.reply({
            text: `❌ Uso:\n${message.prefix}su whatsapp qr\n${message.prefix}su whatsapp codigo <número com DDI>`
        });
    }

    authFlow.requestWhatsAppLogin(mode === "qr" ? "qr" : "pairing", number, message);
    authFlow.resetWhatsAppAuth();
    await message.reply({
        text: mode === "qr"
            ? "✅ Login por QR solicitado. Reiniciando; o QR será enviado aqui como imagem."
            : "✅ Login por número solicitado. Reiniciando; o código será enviado aqui."
    });
    setTimeout(() => process.exit(0), 1000);
}

async function correctNofapDate(message, args) {
    if (!message.chatId || message.isPrivate) {
        return message.reply({ text: "❌ Use este comando dentro do grupo/servidor do participante." });
    }

    const targetArg = String(args[0] || "").trim();
    const dateArg = String(args[1] || "").trim();
    const timeArg = String(args[2] || "00:00").trim();
    const match = dateArg.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const timeMatch = timeArg.match(/^([01]\d|2[0-3]):([0-5]\d)$/);

    if (!targetArg || !match || !timeMatch) {
        return message.reply({
            text: `❌ Uso: ${message.prefix}su nofap <ID|@menção> <dd/mm/yyyy [hh:mm]>`
        });
    }

    const [, day, month, year] = match;
    const startedAt = new Date(`${year}-${month}-${day}T${timeMatch[1]}:${timeMatch[2]}:00.000Z`);
    if (Number.isNaN(startedAt.getTime()) ||
        startedAt.getUTCFullYear() !== Number(year) ||
        startedAt.getUTCMonth() + 1 !== Number(month) ||
        startedAt.getUTCDate() !== Number(day) ||
        startedAt > new Date()) {
        return message.reply({ text: "❌ Informe uma data passada e válida." });
    }

    const store = message.functions?.centralAccounts || global.centralAccounts;
    if (!store || typeof store.getCentralById !== "function") {
        return message.reply({ text: "❌ O módulo de contas centrais não está disponível." });
    }

    const targetId = targetArg.replace(/[<@!>]/g, "");
    let central = store.getCentralById(targetId);
    if (!central && Array.isArray(message.mentionedJids)) {
        const mentionedId = String(message.mentionedJids[0] || "");
        central = findCentralByPlatformId(store, message.platform, mentionedId);
    }
    if (!central) {
        central = findCentralByPlatformId(store, message.platform, targetId);
    }
    if (!central) {
        return message.reply({ text: "❌ Conta central do participante não encontrada." });
    }

    const isoDate = startedAt.toISOString();
    await store.setNofap(central.id, {
        startedAt: isoDate,
        lastUpdatedAt: new Date().toISOString()
    });
    const status = nofapHelper.getNofapStatus(central.id);
    const participant = ensureParticipant(message.platform, message.chatId, central.id, {
        name: central.name || central.username || "Usuário",
        platform: message.platform,
        platformId: targetId,
        joinedAt: isoDate,
        startedAt: isoDate,
        lastInteraction: new Date().toISOString(),
        active: true
    });

    return message.reply({
        text: [
            "✅ Data do NoFap/Setembro corrigida.",
            `👤 Participante: ${participant?.name || "usuário"}`,
            `📅 Início ajustado para: ${startedAt.toLocaleString("pt-BR", { timeZone: "UTC" })}`,
            `⏳ Sequência atual: ${status.currentDays} dias`
        ].join("\n")
    });
}

function findCentralByPlatformId(store, platform, platformId) {
    const target = String(platformId || "");
    if (!target) return null;
    const accounts = store.data?.centralAccounts || {};
    return Object.values(accounts).find((central) =>
        central.platformAccounts?.some((account) =>
            account.platform === platform && String(account.platformId) === target
        )
    ) || null;
}

async function listOwners(
    message
) {

    const owners =
        message.functions
            .owners
            .getOwners();

    let text =
        "👑 Super Usuários\n\n";

    for (
        const owner
        of owners
    ) {

        let icon = "👤";

        if (
            owner.platform ===
            "telegram"
        ) {

            icon = "✈️";

        }

        else if (
            owner.platform ===
            "discord"
        ) {

            icon = "🎧";

        }

        else if (
            owner.platform ===
            "whatsapp"
        ) {

            icon = "📩";

        }

        const profile = await resolvePlatformProfile(owner.platform, owner.id, message);
        const name = profile?.found ? profile.name || "Perfil não encontrado" : "Perfil não encontrado";
        const username = profile?.username ? `@${profile.username}` : null;
        const details = [name, username, `ID: ${owner.id}`].filter(Boolean).join("\n");

        text +=
`${icon} ${owner.platform}
${details}

`;

    }

    await message.reply({
        text
    });

}
