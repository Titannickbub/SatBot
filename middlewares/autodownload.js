const { isAutoDownloadEnabledForChat } = require('../functions/autodownloadHelper');
const bronxys = require('../functions/bronxys');

const PLATFORM_NAMES = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  twitter: 'X (Twitter)',
  facebook: 'Facebook',
  kwai: 'Kwai'
};

module.exports = {
  name: 'autodownload',
  priority: 80,
  runOn: 'all',

  async execute(message) {
    const text = typeof message.text === 'string' ? message.text.trim() : '';
    if (!text) {
      return true;
    }

    const prefix = message.prefix || '!';
    if (text.startsWith(prefix)) {
      return true;
    }

    const urls = text.match(/https?:\/\/[^\s]+/gi) || [];
    const targetUrl = urls.find((url) => bronxys.detectMediaLinkType(url));
    if (!targetUrl) {
      return true;
    }

    // Verifica se o autodownload está ativado para este chat (PV sempre ativo, Grupos inativo por padrão)
    if (!isAutoDownloadEnabledForChat(message)) {
      return true;
    }

    const detected = bronxys.detectMediaLinkType(targetUrl);
    const platformName = PLATFORM_NAMES[detected.platform?.toLowerCase()] || detected.platform || 'Mídia';

    // 1. Reação e Mensagem de Notificação Inicial (semelhante ao comando play)
    if (typeof message.react === 'function') {
      await message.react('🔎', true).catch(() => {});
    }

    const statusText = `📥 *Autodownload:* Obtendo mídia de *${platformName}*... Aguarde um momento.`;
    if (typeof message.reply === 'function') {
      await message.reply({ text: statusText }).catch(() => {});
    }

    try {
      // 2. Download da Mídia
      const result = await bronxys.autodownloadSupportedLink(targetUrl, message.platform);

      if (typeof message.react === 'function') {
        await message.react('🔎', false).catch(() => {});
        await message.react('📥', true).catch(() => {});
      }

      const sourceLabel = message.username || message.displayName || message.name || 'Usuário';
      const caption = detected.type === 'audio'
        ? `🎵 *Música do ${platformName}*\n📤 Enviado por: ${sourceLabel}`
        : `🎬 *Vídeo do ${platformName}*\n📤 Enviado por: ${sourceLabel}`;

      // 3. Envio da Mídia (Áudio ou Vídeo)
      if (detected.type === 'audio' && typeof message.replyAudio === 'function') {
        await message.replyAudio({ audio: result.buffer, caption });
      } else if (typeof message.replyVideo === 'function') {
        await message.replyVideo({ video: result.buffer, caption });
      } else if (typeof message.reply === 'function') {
        await message.reply({ text: caption });
      }

      if (typeof message.react === 'function') {
        await message.react('📥', false).catch(() => {});
        await message.react('✅', true).catch(() => {});
      }

      console.log(`[AUTO-DOWNLOAD] Link suportado processado com sucesso: ${targetUrl}`);
      return false;
    } catch (err) {
      console.error('[AUTO-DOWNLOAD] Falha ao processar link suportado:', err.message || err);

      if (typeof message.react === 'function') {
        await message.react('🔎', false).catch(() => {});
        await message.react('📥', false).catch(() => {});
        await message.react('❌', true).catch(() => {});
      }

      let errorMessage = `❌ *Autodownload:* Não foi possível baixar a mídia de *${platformName}*.`;
      if (err && err.message) {
        errorMessage += `\n*Motivo:* ${err.message}`;
      }

      if (typeof message.reply === 'function') {
        await message.reply({ text: errorMessage }).catch(() => {});
      }

      return false;
    }
  }
};
