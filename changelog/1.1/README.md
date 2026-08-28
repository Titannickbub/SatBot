# Sat Bot — Changelog Versão 1.1

## 📌 Visão Geral

A versão **1.1** do Sat Bot traz uma grande evolução em usabilidade, estabilidade, criação de mídia e inteligência no tratamento de falhas externas. Esta versão introduz o comando de **criação de figurinhas (!sticker / !fsticker)** no WhatsApp, suporte avançado a **figurinhas do Vencord/FakeNitro** no Crossplay, sistema de **re-tentativa automática em 5 minutos** para instabilidades de provedores externos, preservação de **mensagens multilinhas (`\n`)**, além de uma drástica redução de poluição no console através do **silenciamento de logs desnecessários**.

---

## 🚀 Novidades e Novas Funcionalidades

### 🎨 Comando de Figurinhas (`!sticker` / `!f` / `!r`) no WhatsApp
- **Criação Instantânea de Stickers**: Permite gerar figurinhas a partir de fotos, imagens, GIFs animados ou vídeos diretamente no WhatsApp.
- **Três Modos de Redimensionamento**:
  - **Manter Proporção Original** (`!sticker`, `!s`, `!fig`, `!figurinha`): Ajusta a mídia mantendo a proporção original com preenchimento transparente (WebP 512x512).
  - **Esticar Total** (`!f`, `!fsticker`, `!ffig`, `!ffigurinha`): Estica a mídia até preencher totalmente o quadrado de 512x512 sem bordas.
  - **Cortar Quadrado no Centro** (`!r`, `!rsticker`, `!rfig`, `!rfigurinha`): Recorta um quadrado centralizado da mídia proporcionalmente.
- **Metadados Personalizados de Pacote e Autor (EXIF)**:
  - Injeção automática de metadados de pacote e autor no arquivo WebP da figurinha.
  - Personalização pelo comando `!config sticker` (`pack`, `autor` ou `pacote | autor`).
- **Formas de Uso Suportadas**:
  - Enviar o comando na **legenda** da foto, GIF ou vídeo.
  - **Responder / Marcar** uma foto, GIF, vídeo ou figurinha com o comando.
- **Arquitetura Técnica**:
  - Processamento e redimensionamento via `sharp` com modos de ajuste (`fit: contain`, `fit: fill`, `fit: cover`).
  - Injeção binária de chunk `EXIF` em buffers WebP (`addExifToWebp`).
  - Extração inteligente de mídias citadas através da propriedade `quoted.media` no adapter do WhatsApp (`platforms/whatsapp.js`).
  - Adição dos métodos `replySticker` e `sendSticker` no adapter para transmissão nativa via Baileys.

---

### 🎭 Comando de Criação de Emojis no Discord (`!emoji` / `!femoji` / `!remoji`) [ADM]
- **Adição Instantânea de Emojis ao Servidor**: Cria e registra novos emojis customizados diretamente no servidor do Discord.
- **Três Modos de Encaixe de Imagem**:
  - **Proporção Original** (`!emoji`, `!addemoji`, `!semoji`, `!e`): Redimensiona a imagem mantendo a proporção com fundo transparente.
  - **Esticar Total** (`!femoji`, `!fe`): Estica a mídia para preencher a resolução quadrada (128x128).
  - **Cortar Quadrado no Centro** (`!remoji`, `!re`): Cortar um quadrado centralizado proporcional da mídia.
- **Fontes de Mídia Suportadas**:
  - Fotos, GIFs ou vídeos anexados/citados.
  - Emojis de outros servidores do Discord (`<:nome:id>` ou `<a:nome:id>`).
  - Emojis e figurinhas do Vencord / FakeNitro (`[Nome](https://cdn.discordapp.com/...)`).
  - Links diretos de imagem/GIF.
- **Verificação Estrita de Permissões**:
  - Requer a permissão **Gerenciar Emojis e Figurinhas** (`ManageGuildExpressions`) tanto do usuário quanto do bot no servidor.

---

### 🎨 Comando de Criação de Figurinhas no Discord (`!dsticker` / `!fdsticker` / `!rdsticker`) [ADM]
- **Adição Instantânea de Figurinhas ao Servidor**: Registra novas figurinhas (stickers) diretamente na lista do servidor do Discord (512x512, até 512 KB).
- **Três Modos de Encaixe de Imagem**:
  - **Proporção Original** (`!dsticker`, `!ds`, `!dfig`, `!dfigurinha`): Ajusta a mídia mantendo a proporção com fundo transparente.
  - **Esticar Total** (`!fdsticker`, `!fds`, `!fdfig`, `!fdfigurinha`): Estica a mídia para preencher totalmente o quadrado de 512x512.
  - **Cortar Quadrado no Centro** (`!rdsticker`, `!rds`, `!rdfig`, `!rdfigurinha`): Recorta um quadrado centralizado proporcional da mídia.
- **Fontes de Mídia Suportadas**:
  - Fotos, GIFs ou vídeos anexados/citados.
  - Emojis de outros servidores do Discord (`<:nome:id>` ou `<a:nome:id>`).
  - Emojis e figurinhas do Vencord / FakeNitro (`[Nome](https://cdn.discordapp.com/...)`).
  - Figurinhas nativas anexadas à mensagem.
  - Links diretos de imagem/GIF.
- **Verificação Estrita de Permissões**:
  - Requer a permissão **Gerenciar Emojis e Figurinhas** (`ManageGuildExpressions`) tanto do usuário quanto do bot no servidor.

---

### ✈️ Figurinhas e Pacotes Pessoais no Telegram (`!sticker` / `!s` / `!f` / `!r`)
- **Envio Direto no Chat (`replySticker`)**: Transmissão nativa de figurinhas WebP (512x512) no Telegram em conversas privadas ou grupos.
- **Pacote Pessoal Vinculado à Conta Central**:
  - Usuários com Conta Central e conta do Telegram vinculada recebem automaticamente um **pacote de stickers público no Telegram** (`https://t.me/addstickers/sat_<centralId>_by_<bot_username>`).
  - O bot adiciona cada figurinha gerada ao pacote pessoal do usuário (`createNewStickerSet` / `addStickerToSet`) e fornece o link direto para instalação na criação do pacote.
  - Nome do pacote salvo permanentemente no objeto da Conta Central (`telegramStickerPack`).
- **Reorganização Geral de Categoria (`category: "sticker"`)**:
  - Todos os comandos de figurinhas e emojis em todas as plataformas (`!sticker` no WhatsApp/Telegram, `!delpack` no Telegram, `!emoji` e `!dsticker` no Discord) foram unificados e organizados na categoria dedicada `sticker`.
- **Gerenciamento e Exclusão de Pacotes (`!delpack` / `!delfig`)**:
  - `!delpack` / `!deletarpacote`: Exclui o pacote inteiro do usuário no Telegram via `deleteStickerSet` e reseta os registros na Conta Central.
  - `!delfig` / `!delsticker`: Permite excluir uma figurinha específica marcada no chat respondendo a ela via `deleteStickerFromSet`.
  - **Mensagens Amigáveis de Erro**: Captura de exceções brutas da API do Telegram (`STICKERSET_NOT_MODIFIED`, `STICKER_INVALID`, `STICKERSET_INVALID`) para exibir avisos claros e amigáveis ao usuário (ex: `"ℹ️ Esta figurinha já foi removida anteriormente do seu pacote."`).

---

### 👾 Compatibilidade com Figurinhas e Emojis do Vencord / FakeNitro (Crossplay)
- **Suporte a Stickers com Nomes Complexos**: Expressões regulares atualizadas no `crossplay.js` e `discordEmojiHelper.js` para aceitar nomes com espaços (ex: `[Pode não man]`), acentuação e caracteres especiais.
- **Links Diretos e Markdown**: Compatibilidade com figurinhas nos formatos Markdown do Vencord (`[Nome](https://media.discordapp.net/stickers/ID.png...)`) e URLs diretas do CDN do Discord.
- **Conversão Automática**: Stickers isolados enviados do Discord são identificados e convertidos em figurinhas mídias nativas ao serem repassados para WhatsApp, Telegram ou outros canais.

---

### ⏱️ Re-tentativa Automática de 5 Minutos e Mensagens Amigáveis de Erro
- **Resiliência contra Instabilidades Externas (WTTR / Scrapers)**:
  - **1ª Falha (Monitores de Clima e Café)**: Caso ocorra erro HTTP 500 ou queda de conexão no provedor externo durante o envio automático do monitor, o bot envia uma mensagem de aviso no chat:
    - *Clima*: `"⚠️ Não foi possível consultar o clima atual por instabilidade do provedor. Tentaremos novamente em 5 minutos..."`
    - *Café*: `"⚠️ Não foi possível consultar o mercado do café por instabilidade do provedor. Tentaremos novamente em 5 minutos..."`
  - **Tentativa de Backup**: O sistema reagenda a execução via `setTimeout` para exatamente 5 minutos depois. Se a 2ª tentativa for bem-sucedida, o relatório é enviado normalmente. Se falhar novamente, o bot notifica que não foi possível realizar a consulta após nova tentativa.
- **Mensagens Amigáveis nos Comandos Manuais (`!clima`, `!cotacao`, `!coocafe`, `!minasul`, `!cccmg`)**:
  - Exceções brutas de servidor (como `Request failed with status code 500`) foram substituídas por respostas amigáveis orientando o usuário a tentar novamente em instantes.

---

### 🤖 Slash Command `/start` e Apresentação da Satela
- Registro oficial do Slash Command `/start` na integração com o Discord.
- Exibição de mensagem padronizada de boas-vindas com menu explicativo de recursos e primeiros passos.

---

### 🔑 Suporte a Múltiplas Chaves de IA com Rotação e Failover Automático
- **Capacidade Triplicada**: Permite cadastrar até **3 chaves de API gratuitas** para cada provedor (`Gemini`, `Groq`, `OpenRouter`).
- **Failover Transparente**: Caso uma chave atinja o limite por minuto (Rate Limit 429), apresente instabilidade no servidor (Status 503) ou falhe, o bot alterna instantaneamente para a próxima chave configurada sem interromper o atendimento.
- **Gerenciador de Chaves Expandido (`!setai`)**:
  - `!setai gemini SUA_CHAVE` (Define a Chave 1)
  - `!setai gemini <1|2|3> SUA_CHAVE` (Define a Chave em uma posição específica)
  - `!setai gemini CHAVE1, CHAVE2, CHAVE3` (Cadastra até 3 chaves de uma só vez)
  - `!setai help` (Exibe o status de cada slot com mascaramento de caracteres secretos)

---

## 🐛 Correções de Bugs e Melhores Práticas

### 📝 Preservação de Quebras de Linha (`\n`) em Textos e Legendas
- **Problema**: Onde mensagens com recuos, listas e parágrafos enviados pelos usuários eram achatados em uma única linha devido à divisão básica por espaços no parsing de argumentos.
- **Solução**: Implementado o método utilitário `message.getArgText(fromIndex)` no `core.js`, preservando a formatação original e quebras de linha em comandos como:
  - `!welcome text` e `!welcome media`
  - `!goodbye text` e `!goodbye media`
  - `!agendar set <id> text`
  - `!antipv msg`, `!onlychats msg`
  - `!antilink`, `!antimedia`, `!antipalavras`
  - `!ia` e `!imagine`

---

### 🔗 Sincronização e Prevenção de Duplicidade no Crossplay
- **Causa**: Códigos de vínculo geravam novos UUIDs de grupo sem verificar se o chat já pertencia a um grupo existente, criando registros isolados e impedindo o repasse de mensagens.
- **Solução**:
  - `createLinkCode`: Reaproveita a estrutura do grupo existente caso o chat já esteja vinculado.
  - `claimLinkCode`: Desvincula automaticamente o chat de grupos antigos (`unlinkChat`) antes da inclusão no novo grupo.
  - **Persistência Imediata (`saveNow`)**: Gravamento direto no arquivo `crossplay.json` evitando perda de dados por reinicializações do servidor.
  - **Limpeza Automática (`cleanupDuplicatesAndOrphans`)**: Varredura na inicialização para remover códigos expirados, grupos vazios e chats duplicados.

---

### 🤖 Tratamento de Erros da API do Gemini e Mensagens Amigáveis no Discord
- **Problema**: O bot exibia intermitentemente mensagens de erro apontando para o modelo descontinuado `gemini-2.5-pro` (`This model models/gemini-2.5-pro is no longer available to new users...`), mesmo quando o usuário fazia poucas requisições. Além disso, exibia trechos técnicos de configuração para membros normais em servidores do Discord.
- **Causa**: A lista de fallback no `aiHelper.js` continha modelos obsoletos (`gemini-2.5-pro`, `gemini-2.5-flash-lite`). Quando os modelos primários sofriam oscilações temporárias de rede ou estouro de cota por minuto (Rate Limit HTTP 429), o loop de fallback executava até o modelo descontinuado no final da lista, sobrescrevendo a variável `lastError`.
- **Solução**:
  - Remoção de modelos legados/obsoletos da lista de fallback, mantendo apenas modelos oficiais ativos (`gemini-3.6-flash` e `gemini-flash-latest`).
  - Implementação de captura específica para HTTP 429 (Rate Limit / Excesso de Quota). Se o limite por minuto da API for atingido, a mensagem reporta com clareza a restrição temporária de taxa em vez de exibir um erro de modelo descontinuado.
  - **Mensagens Amigáveis para Usuários (Discord & Comunidade)**:
    - Ocultação de detalhes técnicos de chave de API (`!setai`) para membros normais do servidor/chat, exibindo orientações claras e educadas. Dicas de configuração avançada continuam restritas a Super Usuários (Dono).
    - Formatação adaptativa de Markdown (`**negrito**` no Discord vs `*negrito*` no WhatsApp/Telegram).

### 👤 Reorganização dos Comandos de Perfil e Conta Central na Raiz
- **Acesso Facilitado aos Comandos de Conta**: Os comandos `!perfil` e `!nomecentral` foram movidos da subpasta `commands/system/` para a raiz da pasta `commands/`.
- **Categoria Raiz**: As definições foram ajustadas para a categoria raiz (`null`), permitindo que apareçam diretamente na listagem principal do comando `!menu`.

---

## ⚙️ Otimização do Sistema e Limpeza de Logs

### 🔇 Silenciamento de Logs de Módulos Inativos (Anti-Raid / Anti-Link)
- **Problema**: Módulos como o Anti-Raid imprimiam um log no console a cada mensagem recebida nos chats onde a funcionalidade não estava ativa (`[ANTIRAID] 🚫 Ignorado | motivo: sem config ativa`).
- **Solução**: Removidos os logs de ignorado em chats desativados e para usuários imunes (`middlewares/antiraid.js` e `middlewares/antilink.js`). Os logs continuam sendo exibidos com destaque em chats com Anti-Raid ativo quando um risco for detectado (`🚨 Risco detectado`) ou quando uma ação de bloqueio for executada (`✅ Bloqueado`).

### ⏰ Timestamp nos Logs do Console
- Adicionada a hora atual no formato `[HH:MM:SS]` em todos os logs do `core.js` e adaptadores das plataformas.

### 🧹 Desduplicação de Aliases na Listagem de Categorias (`!info <categoria>`)
- **Problema**: Ao consultar as informações de uma categoria via `!info <categoria>` (ex: `!info sticker`), cada comando era listado repetidamente para todos os seus aliases registrados (ex: `+dsticker` 12 vezes, `+emoji` 8 vezes, `+sticker` 12 vezes).
- **Solução**: Implementado filtro de unicidade por assinatura (`name | category | file`) em `commands/info.js`, garantindo que cada comando da categoria seja exibido uma única vez.

### 🛡️ Gerenciador de Bloqueio de Comandos por Níveis (`!blockcmd`) [ADM]
- **Bloqueio Selecionável de Comandos e Categorias**: Permite proibir o uso de comandos específicos (ex: `cotacao`, `ia`, `sticker`) ou categorias inteiras em chats e servidores.
- **Estrutura Hierárquica de Níveis**:
  - **Discord**: `server` | `categoria` | `chat`
  - **WhatsApp**: `server` (comunidades) | `chat` (grupos)
  - **Telegram**: `server` | `chat` (tópicos de fórum)
- **Modos Flexíveis de Ação (`action`)**:
  - `ignore`: Ignora a execução silenciosamente sem enviar mensagem no chat (evita poluição).
  - `reply`: Responde com aviso (suporta mensagens personalizadas com variáveis `{cmd}`, `{user}` e `{prefix}`).
  - `delete`: Apaga a mensagem do comando e pode responder com o aviso.
- **Imunidade de Moderação**: Administradores e Donos do bot continuam imunes ao bloqueio.
- **Filtro de Conversas Privadas**: O recurso é desativado em PV/DM, aplicando-se estritamente a grupos e servidores.
### 👑 Bloqueio Global de Comandos para Super Usuários (`!blockcmd_su`) [SYSTEM / SU]
- **Proibição Bot-Wide Global**: Permite que os Donos do Bot proíbam a execução de comandos ou categorias inteiras em **todas as plataformas, grupos, servidores e mensagens privadas (PV/DM)**.
- **Hierarquia Absoluta**: O bloqueio global sobrepõe qualquer permissão local de grupos ou servidores. Administradores de grupos normais não conseguem executar comandos desativados pelo dono do bot.
- **Imunidade de Super Usuário**: Donos e desenvolvedores do bot (`isOwner`) permanecem imunes para manter a gestão e testes.
- **Modos Globais (`action`)**: `ignore` (silencioso em todo o bot), `reply` (mensagem de aviso personalizada) ou `delete` (remoção da mensagem + aviso).

---

## 📁 Relação de Arquivos Criados e Atualizados

| Arquivo | Descrição das Modificações |
| :--- | :--- |
| [`commands/system/blockcmd_su.js`](../../commands/system/blockcmd_su.js) | **[NOVO]** Comando de Super Usuário (SU) para gerenciar o bloqueio global de comandos e categorias em todo o bot. |
| [`commands/adm/blockcmd.js`](../../commands/adm/blockcmd.js) | **[NOVO]** Comando ADM para gerenciar regras de bloqueio de comandos por níveis hierárquicos, ações e mensagens de aviso. |
| [`middlewares/blockcmd.js`](../../middlewares/blockcmd.js) | **[NOVO]** Middleware interceptador (priority 95) para cancelar comandos bloqueados local ou globalmente antes da execução. |
| [`functions/blockcmdHelper.js`](../../functions/blockcmdHelper.js) | **[NOVO]** Utilitário de leitura/escrita no `groupSettings`, resolução de herança por nível e teste de bloqueio. |
| [`functions/config.js`](../../functions/config.js) | Adicionado o nó `blockcmd_su` no `config.json` com os métodos `getGlobalBlockcmd` e `setGlobalBlockcmd`. |
| [`commands/info.js`](../../commands/info.js) | Desduplicação de comandos por assinatura na listagem por categoria (`infoCategoriaText`). |
| [`commands/delpack.js`](../../commands/delpack.js) | **[NOVO]** Comando para exclusão do pacote completo de figurinhas no Telegram (`!delpack`) ou de uma figurinha específica marcada (`!delfig`). |
| [`commands/adm/dsticker.js`](../../commands/adm/dsticker.js) | **[NOVO]** Comando ADM para geração e adição de figurinhas (stickers) customizadas em servidores do Discord com 3 modos (`!dsticker`, `!fdsticker`, `!rdsticker`). |
| [`commands/adm/emoji.js`](../../commands/adm/emoji.js) | **[NOVO]** Comando ADM para geração e adição de emojis customizados em servidores do Discord com 3 modos (`!emoji`, `!femoji`, `!remoji`). |
| [`commands/sticker.js`](../../commands/sticker.js) | Comando para geração de figurinhas no WhatsApp e Telegram com 3 modalidades (`!sticker` / `!s`, `!f` para esticar, `!r` para recortar centro) e integração com pacotes do Telegram. |
| [`functions/telegramStickerHelper.js`](../../functions/telegramStickerHelper.js) | **[NOVO]** Utilitário para criação e adição de figurinhas a pacotes de stickers públicos no Telegram (`createNewStickerSet` / `addStickerToSet`). |
| [`functions/centralAccounts.js`](../../functions/centralAccounts.js) | Adicionados métodos `getTelegramStickerPack` e `setTelegramStickerPack` para associar pacotes de figurinhas do Telegram à Conta Central. |
| [`platforms/telegram.js`](../../platforms/telegram.js) | Adicionado o método `replySticker` para envio direto de figurinhas WebP no chat. |
| [`functions/stickerHelper.js`](../../functions/stickerHelper.js) | **[NOVO]** Utilitário de conversão de imagens, GIFs e mídias para WebP 512x512 com suporte aos modos `contain`, `fill` e `cover` via `sharp`. |
| [`commands/perfil.js`](../../commands/perfil.js) | Comando `!perfil` movido para a raiz de `commands/` com categoria raiz. |
| [`commands/nomecentral.js`](../../commands/nomecentral.js) | Comando `!nomecentral` movido para a raiz de `commands/` com categoria raiz. |
| [`platforms/whatsapp.js`](../../platforms/whatsapp.js) | Adição de suporte a mídias em mensagens citadas (`quoted.media`), método `replySticker` e export da função `sendSticker`. |
| [`functions/aiHelper.js`](../../functions/aiHelper.js) | Atualização dos modelos ativos do Gemini (`gemini-3.6-flash`), diagnóstico de Rate Limit (429) e formatação amigável para Discord. |
| [`commands/ia/ia.js`](../../commands/ia/ia.js) | Repasse de parâmetros de plataforma e permissões para resposta personalizada amigável em chats do Discord. |
| [`functions/weatherMonitor.js`](../../functions/weatherMonitor.js) | Re-tentativa automática em 5 minutos para falhas no monitor de clima e aviso amigável ao chat. |
| [`functions/cafeMonitor.js`](../../functions/cafeMonitor.js) | Re-tentativa automática em 5 minutos para falhas no monitor de cotações do café. |
| [`commands/clima.js`](../../commands/clima.js) | Tratamento amigável de instabilidades em buscas manuais de previsão do tempo. |
| [`commands/scrapers/cotacao.js`](../../commands/scrapers/cotacao.js) | Tratamento amigável em falhas na consulta de cotações do café. |
| [`commands/scrapers/coocafe.js`](../../commands/scrapers/coocafe.js) | Mensagem amigável de erro na cotação da Coocafé. |
| [`commands/scrapers/Minasul.js`](../../commands/scrapers/Minasul.js) | Mensagem amigável de erro na cotação da Minasul. |
| [`commands/scrapers/cccmg.js`](../../commands/scrapers/cccmg.js) | Mensagem amigável de erro na cotação do CCCMG. |
| [`middlewares/antiraid.js`](../../middlewares/antiraid.js) | Ocultação de logs de ignorado em chats sem anti-raid ativo ou para administradores imunes. |
| [`middlewares/antilink.js`](../../middlewares/antilink.js) | Silenciamento de logs quando o antilink estiver desativado no grupo. |
| [`functions/crossplay.js`](../../functions/crossplay.js) | Suporte a stickers do Vencord com espaços/acentos, salvamento imediato e prevenção de duplicações. |
| [`functions/discordEmojiHelper.js`](../../functions/discordEmojiHelper.js) | Suporte a emojis do Vencord com espaços e caracteres acentuados. |
| [`core.js`](../../core.js) | Implementação do `message.getArgText` e padronização dos logs com timestamp `[HH:MM:SS]`. |
| [`platforms/discord.js`](../../platforms/discord.js) | Registro do Slash Command `/start`. |
| [`commands/start.js`](../../commands/start.js) | Comando de apresentação inicial da Satela. |
