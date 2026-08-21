/*
============================================================

COMANDO SU (SUPER USUÁRIO)

LOCAL RECOMENDADO:

commands/system/su.js

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

    require("../../functions/owners")

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
const { resolvePlatformProfile } = require("../../functions/profiles");
const suTokenCommand = require("./su-token");

module.exports = {

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
                    ? "❌ Já existe um super usuário registrado. Use !su add <plataforma> <id> para adicionar outro."
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

    await message.reply({
        text:
            "🔄 Reiniciando Satella..."
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

${p}su onlychats [opção]

${p}su restart`

    });

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

