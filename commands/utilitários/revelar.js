module.exports = {
    name: "revelar",
    aliases: ["revela", "viewonce", "vo", "quebrar", "antivo", "readvo", "desocultar"],
    category: "utilitários",
    platformSupport: {
        whatsapp: "full",
        telegram: "none",
        discord: "none"
    },
    description: "Revela e envia como mídia normal uma foto, vídeo ou áudio de visualização única (View Once) respondida.",
    usage: "{prefix}revelar (respondendo a uma mídia de visualização única)",
    examples: [
        "{prefix}revelar",
        "{prefix}vo",
        "{prefix}revela"
    ],
    info(message) {
        const prefix = message.prefix || "!";
        return [
            "🔓 *REVELADOR DE VISUALIZAÇÃO ÚNICA*",
            "",
            "Quebra o modo de visualização única e envia a mídia permanente no chat.",
            "",
            "📋 *COMO USAR:*",
            `  • Responda à imagem, vídeo ou áudio de visualização única com \`${prefix}revelar\` ou \`${prefix}vo\`.`,
            "",
            "📌 *PLATAFORMAS:*",
            "  • Exclusivo para *WhatsApp*."
        ].join("\n");
    },

    async execute(message) {
        if (message.platform !== "whatsapp") {
            return message.reply({ text: "❌ Este comando é exclusivo para o WhatsApp." });
        }

        const targetMedia = message.quoted?.media || message.media;
        if (!targetMedia || typeof targetMedia.getBuffer !== "function") {
            return message.reply({
                text: "❌ Responda a uma foto, vídeo ou áudio de visualização única com o comando para revelá-la."
            });
        }

        try {
            if (typeof message.react === "function") {
                await message.react("⏳");
            }

            const buffer = await targetMedia.getBuffer();
            if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
                if (typeof message.react === "function") await message.react("❌");
                return message.reply({
                    text: "❌ Não foi possível baixar a mídia de visualização única. Ela pode ter expirado ou já ter sido removida dos servidores do WhatsApp."
                });
            }

            const type = String(targetMedia.type || "image").toLowerCase();
            const originalCaption = message.quoted?.text || message.text || "";
            const captionHeader = "🔓 *Mídia de visualização única revelada!*";
            const caption = originalCaption ? `${captionHeader}\n\n📝 *Legenda original:* ${originalCaption}` : captionHeader;

            if (type === "video") {
                if (typeof message.replyVideo === "function") {
                    await message.replyVideo({ video: buffer, caption });
                } else {
                    await message.reply({ video: buffer, caption });
                }
            } else if (type === "audio") {
                if (typeof message.replyAudio === "function") {
                    await message.replyAudio({ audio: buffer, caption, ptt: true });
                } else {
                    await message.reply({ audio: buffer, caption });
                }
            } else if (type === "document") {
                if (typeof message.replyFile === "function") {
                    await message.replyFile({ file: buffer, caption });
                } else {
                    await message.reply({ file: buffer, caption });
                }
            } else {
                // Imagem (padrão)
                if (typeof message.replyImg === "function") {
                    await message.replyImg({ image: buffer, caption });
                } else {
                    await message.reply({ image: buffer, caption });
                }
            }

            if (typeof message.react === "function") {
                await message.react("✅");
            }
        } catch (error) {
            console.error("[REVELAR] Erro ao revelar mídia de visualização única:", error);
            if (typeof message.react === "function") {
                await message.react("❌").catch(() => {});
            }
            return message.reply({
                text: `❌ Falha ao revelar a mídia: ${error.message || "Erro desconhecido ao processar a descriptografia."}`
            });
        }
    }
};
