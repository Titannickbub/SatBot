const economy = require("../../functions/economy");
const imageBanner = require("../../functions/imageBanner");

module.exports = {
    name: "cosmeticos",
    aliases: ["cosmético", "cosmetico", "cosméticos", "cosmetics"],
    category: "economia",
    description: `🎨 Loja de cosméticos do perfil — consulte as cores, compre e aplique fundos neste grupo ou servidor.

📱 WhatsApp:
{prefix}cosmeticos fundo
{prefix}cosmeticos fundo <cor|padrao>
{prefix}cosmeticos previa fundo <cor>

✈️ Telegram:
{prefix}cosmeticos fundo
{prefix}cosmeticos fundo <cor|padrao>
{prefix}cosmeticos previa fundo <cor>

💬 Discord:
{prefix}cosmeticos fundo
{prefix}cosmeticos fundo <cor|padrao>
{prefix}cosmeticos previa fundo <cor>

Cada cor custa ${economy.formatMoney(economy.PROFILE_BACKGROUND_PRICE)}. Depois de comprada, pode ser equipada novamente sem custo. Use "{prefix}cosmeticos fundo padrao" para voltar ao visual original.

🔎 Veja as cores ao vivo na Dashboard ou gere uma imagem com "{prefix}cosmeticos previa fundo <cor>". A prévia não compra nem aplica a cor.
⚠️ Os cosméticos são individuais por grupo/servidor e não podem ser transferidos.`,
    usage: "{prefix}cosmeticos [fundo [cor|padrao] | previa fundo <cor>]",

    async execute(message) {
        if (!economy.getScope(message)) {
            return message.reply({ text: "❌ Os cosméticos só funcionam em grupos ou servidores." });
        }

        const [action, category, colorArgument] = message.args || [];
        const state = economy.getProfileCosmetics(message);
        const current = state.background
            ? economy.PROFILE_BACKGROUNDS[state.background].label
            : "Original";
        const prefix = message.prefix || "!";
        const normalizedAction = normalizeCommand(action);

        if (normalizedAction === "previa" || normalizedAction === "preview") {
            if (normalizeCommand(category) !== "fundo" || !colorArgument) {
                return message.reply({
                    text: `❌ Uso: ${prefix}cosmeticos previa fundo <cor>\nExemplo: ${prefix}cosmeticos previa fundo oceano`
                });
            }
            const background = normalizeCommand(colorArgument);
            if (!background || !economy.PROFILE_BACKGROUNDS[background]) {
                return message.reply({
                    text: `❌ Cor inválida. Use ${prefix}cosmeticos fundo para consultar as cores disponíveis.`
                });
            }

            try {
                const result = await imageBanner.renderProfileBackgroundPreview(background);
                if (result.error) return message.reply({ text: `❌ ${result.error}` });
                return message.replyImg({
                    image: result.buffer,
                    caption: result.caption,
                    fileName: `previa-fundo-${background}.png`
                });
            } catch (error) {
                console.error("[COSMETICOS] Não foi possível gerar a prévia do fundo:", error.message || error);
                return message.reply({ text: "❌ Não foi possível gerar a prévia agora. Tente novamente." });
            }
        }

        if (normalizedAction && normalizedAction !== "fundo") {
            return message.reply({
                text: `❌ Use ${prefix}cosmeticos fundo para consultar a loja ou ${prefix}cosmeticos previa fundo <cor> para ver uma prévia.`
            });
        }

        if (!normalizedAction || !category) {
            return replyCatalog(message, state, current, prefix);
        }

        const normalizedBackground = normalizeCommand(category);
        if (["padrao", "original", "default", "resetar"].includes(normalizedBackground)) {
            const result = economy.resetProfileBackground(message);
            return message.reply({
                text: result.changed
                    ? "✅ Fundo original restaurado. Suas cores compradas continuam disponíveis."
                    : "ℹ️ Seu perfil já está usando o fundo original."
            });
        }

        const result = economy.setProfileBackground(message, category);
        if (!result.purchased) {
            if (result.reason === "insufficient-balance") {
                return message.reply({
                    text: `❌ Saldo insuficiente. Você precisa de ${economy.formatMoney(result.price)} e tem ${economy.formatMoney(result.balance)}.`
                });
            }
            return message.reply({
                text: `❌ Cor inválida. Use ${prefix}cosmeticos fundo para ver as opções disponíveis ou ${prefix}cosmeticos previa fundo <cor> para gerar uma imagem de prévia.`
            });
        }

        const backgroundName = economy.PROFILE_BACKGROUNDS[result.background].label;
        return message.reply({
            text: result.boughtNow
                ? `✅ Fundo ${backgroundName} comprado e aplicado por ${economy.formatMoney(economy.PROFILE_BACKGROUND_PRICE)}.\nSaldo atual: ${economy.formatMoney(result.balance)}`
                : `✅ Fundo ${backgroundName} aplicado. Essa cor já estava comprada, então não houve cobrança.`
        });
    }
};

function replyCatalog(message, state, current, prefix) {
    const options = Object.entries(economy.PROFILE_BACKGROUNDS).map(([key, background]) => {
        const owned = state.ownedBackgrounds.includes(key);
        const selected = state.background === key;
        const status = selected ? "em uso" : owned ? "comprada" : economy.formatMoney(economy.PROFILE_BACKGROUND_PRICE);
        return `${selected ? "✅" : owned ? "☑️" : "🎨"} ${background.label} (${key}) — ${status}`;
    });
    const previewNotice = `Prévia ao vivo na Dashboard ou em imagem: ${prefix}cosmeticos previa fundo <cor>. A prévia não altera nem compra a cor.`;
    const usage = `${prefix}cosmeticos fundo [cor|padrao]\n${prefix}cosmeticos previa fundo <cor>`;

    if (message.platform === "discord") {
        return message.reply({
            embed: {
                color: 0x8fb5ff,
                title: "🎨 Loja de cosméticos",
                description: `Personalize o fundo do seu perfil neste grupo ou servidor.\nFundo atual: **${current}**`,
                fields: [
                    { name: "Cores disponíveis", value: options.map(line => `• ${line}`).join("\n") },
                    { name: "Como usar", value: `\`\`\`\n${usage}\n\`\`\`` },
                    { name: "Prévia", value: previewNotice }
                ],
                footer: {
                    text: `Cada cor custa ${economy.formatMoney(economy.PROFILE_BACKGROUND_PRICE)}; cores compradas podem ser reaplicadas sem custo.`
                }
            }
        });
    }

    if (message.platform === "telegram") {
        return message.reply({
            text: [
                "<b>🎨 LOJA DE COSMÉTICOS</b>",
                "━━━━━━━━━━━━━━━━━━━━━━",
                `<b>Fundo atual:</b> ${escapeHtml(current)}`,
                "",
                "<b>CORES DISPONÍVEIS</b>",
                ...options.map(line => escapeHtml(line)),
                "",
                "<b>COMO USAR</b>",
                `<code>${escapeHtml(usage)}</code>`,
                "",
                `<b>PRÉVIA</b>\n${escapeHtml(previewNotice)}`,
                `Cada cor custa ${escapeHtml(economy.formatMoney(economy.PROFILE_BACKGROUND_PRICE))}. Cores compradas podem ser reaplicadas sem custo.`
            ].join("\n"),
            parse_mode: "HTML"
        });
    }

    return message.reply({
        text: [
            "*🎨 LOJA DE COSMÉTICOS*",
            "━━━━━━━━━━━━━━━━━━━━━━",
            `*Fundo atual:* ${escapeMarkdown(current)}`,
            "",
            "*CORES DISPONÍVEIS*",
            ...options.map(line => `• ${escapeMarkdown(line)}`),
            "",
            "*COMO USAR*",
            `\`${escapeMarkdown(usage)}\``,
            "",
            `*PRÉVIA*\n${escapeMarkdown(previewNotice)}`,
            `Cada cor custa ${economy.formatMoney(economy.PROFILE_BACKGROUND_PRICE)}. Cores compradas podem ser reaplicadas sem custo.`
        ].join("\n")
    });
}

function normalizeCommand(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escapeMarkdown(value) {
    return String(value).replace(/([*_~`\\])/g, "\\$1");
}
