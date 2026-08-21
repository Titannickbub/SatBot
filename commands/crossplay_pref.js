module.exports = {
  category: 'adm',
  name: 'crossplay_pref',
  description: 'Define quais mídias serão recebidas e quais ignoradas para este chat vinculado',
  usage: '{prefix}crossplay_pref <receber|ignorar> <tipo>',
  async execute(message) {
    if (message.isPrivate) return message.reply({ text: '❌ Este comando só funciona em grupos/chats de grupo.' });

    const args = message.args || [];
    const mode = (args[0] || '').toLowerCase();
    const mediaType = (args[1] || '').toLowerCase();
    const store = (message.functions && message.functions.crossplay) || global.crossplayStore;
    if (!store) return message.reply({ text: '❌ Sistema de crossplay não está disponível.' });

    const threadId = message.threadId || (message.target && message.target.threadId) || null;
    const link = await store.findByChat(message.platform, message.chatId, threadId);
    if (!link) return message.reply({ text: '❌ Este chat/tópico ainda não está vinculado ao crossplay.' });

    const prefs = await store.getPlatformPreferences(link.id, message.platform, message.chatId, threadId);
    if (!mode || !mediaType) {
      return message.reply({ text: `📡 Preferências atuais:\nReceber: ${prefs.receiveMedia.join(', ') || '—'}\nIgnorar: ${prefs.ignoreMedia.join(', ') || '—'}` });
    }

    const next = { ...prefs };
    if (mode === 'receber') {
      next.receiveMedia = Array.from(new Set([...(next.receiveMedia || []), mediaType]));
      next.ignoreMedia = (next.ignoreMedia || []).filter(item => item !== mediaType);
    } else if (mode === 'ignorar') {
      next.ignoreMedia = Array.from(new Set([...(next.ignoreMedia || []), mediaType]));
      next.receiveMedia = (next.receiveMedia || []).filter(item => item !== mediaType);
    } else {
      return message.reply({ text: '❌ Use receber ou ignorar.' });
    }

    await store.setPlatformPreferences(link.id, message.platform, message.chatId, next, threadId);
    return message.reply({ text: `✅ Preferência atualizada para ${mediaType}.` });
  }
};
