const DESCRIPTION = `🔓 Revela e reenvia como mídia permanente fotos, vídeos ou áudios enviados com visualização única (View Once).

🔐 Comando público disponível para todos os usuários.

📌 Regras por plataforma:
• WhatsApp: suporte completo para mensagens de visualização única.
• Discord / Telegram: indisponível (plataformas sem o recurso equivalente de view once).

🔓 1. Como revelar uma mídia de visualização única:
{prefix}revelar
{prefix}vo
{prefix}desocultar

Responda (cite) diretamente à foto, vídeo ou áudio de visualização única enviando o comando.

📦 2. Tipos de mídia suportados:
• 🖼️ Imagens / Fotos de visualização única.
• 🎥 Vídeos de visualização única.
• 🎙️ Mensagens de áudio / recados de voz protegidos.

ℹ️ A mídia será reenviada no chat como arquivo comum e permanente, preservando a legenda original quando houver.`;

module.exports = {
    name: "revelar",
    aliases: ["revela", "viewonce", "vo", "quebrar", "antivo", "readvo", "desocultar"],
    category: "utilitários",
    platformSupport: {
        whatsapp: "full",
        telegram: "none",
        discord: "none"
    },
    description: DESCRIPTION,
    usage: "{prefix}revelar (respondendo a uma mídia de visualização única)",
    examples: [
        "{prefix}revelar",
        "{prefix}vo",
        "{prefix}revela",
        "{prefix}desocultar"
    ],
    info(message) {
        return DESCRIPTION.replaceAll("{prefix}", message.prefix || "!");
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
