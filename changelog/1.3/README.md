# Sat Bot — Changelog Versão 1.3

## 🔄 Verificação de dependências no reinício automático

- Os launchers `start.sh` e `start.bat` agora verificam as dependências a cada
  ciclo de inicialização, inclusive após um auto-update.
- Quando `node_modules` está ausente ou inconsistente com o `package.json`, o
  bot executa `npm install` antes de iniciar, evitando que o reboot automático
  fique em loop sem conseguir carregar o bot.

## 🌐 Indicadores de compatibilidade por plataforma

- Comandos podem declarar o campo opcional `platformSupport` com os estados
  `full`, `partial` e `none` para WhatsApp, Telegram e Discord.
- Comandos sem esse campo continuam sendo considerados universais, preservando
  a retrocompatibilidade.
- Portanto, comandos antigos que não possuem `platformSupport` continuam
  recebendo o indicador 🟢 em qualquer plataforma e não precisam ser
  alterados imediatamente.
- O `!menu` passou a substituir o marcador padrão dos comandos por:
  - 🟢 funcionamento completo na plataforma atual;
  - 🟡 funcionamento parcial na plataforma atual;
  - 🔴 comando não disponível na plataforma atual.
- O `!info` passou a exibir a compatibilidade do comando na plataforma atual,
  inclusive ao listar comandos de uma categoria.
- A classificação foi aplicada aos comandos administrativos e de stickers com
  suporte específico por plataforma, sem alterar a lógica de execução.

## ☕ Correção do monitor do café

- Corrigido o comando `!monitorcafe disable` (e aliases de desativação), que
  não era processado porque sua lógica estava dentro do bloco de configuração.
- A desativação agora persiste `enabled: false` e sincroniza corretamente os
  agendamentos do monitor no chat atual.

## 🎲 Monitor rclima (Clima Aleatório Agendado)

- Adicionado o comando administrativo `!rclima` (em `commands/adm/configurações/rclima.js`).
- Cada chat possui sua própria lista de cidades, horários e estado de ativação.
- Nos horários configurados, uma cidade da lista é escolhida aleatoriamente e consultada antes do envio da previsão.
- **Proteção administrativa**: Subcomandos de configuração (`add`, `remove`, `clear`, `times`, `enable`, `disable`, `run`) agora exigem permissão de administrador no grupo/servidor em ambas as ferramentas (`!rclima` e `!clima`).

## 📋 Expansão do comando status

- O comando `status` passou a exibir as configurações completas e hierárquicas do chat, incluindo:
  - Proteções anti integradas: `Antilink`, `Antipalavras`, `Antimedia`, `Anti-Raid` e `Blockcmd` (bloqueio de comandos).
  - Listas brancas e negras de usuários (`userWhitelist`, `userBlacklist`) e cargos no Discord (`roleWhitelist`, `roleBlacklist`).
  - Identificação clara do estado de armazenamento de mídias de Welcome/Goodbye (`💾 Local permanente` vs `🌐 Link web`).
  - Configurações adicionais de chat: Auto-IA, Auto-Download (com indicação de apagar links) e NoFap.
  - Monitores ativos: Café, Clima, Rclima e Autoaceitar.
  - Agendamentos configurados e data/hora da próxima execução no chat atual.
- Novos subcomandos de status específicos adicionados e suportados:
  - `!status antiraid` e `!status full antiraid`
  - `!status blockcmd` e `!status full blockcmd`
  - `!status full all` (agora exibindo todos os nós de todas as proteções, welcome, goodbye e warns).
- As informações são filtradas conforme a plataforma, chat e tópico atual, mantendo o isolamento das configurações.

## ✅ Autoaceitar

### 🤖 Aprovação automática de solicitações de entrada

- **Novo comando administrativo**: `!autoaceitar` com os aliases
  `!autoaprovar` e `!autoapprove`.
- **Ativação e desativação por chat**:
  - `!autoaceitar on`
  - `!autoaceitar off`
  - `!autoaceitar status`
- **Intervalo entre aprovações**:
  - `!autoaceitar intervalo <segundos>`
  - Permite espaçar as aprovações para evitar excesso de eventos e mensagens
    de boas-vindas em sequência.
- **Filtros de nomes e símbolos**:
  - `!autoaceitar bloquear nome <texto>`
  - `!autoaceitar bloquear simbolo <símbolo>`
  - `!autoaceitar desbloquear nome|simbolo <valor>`
  - Solicitações que correspondem a um filtro não são aprovadas automaticamente.
- **Janelas de horário**:
  - `!autoaceitar horarios HH:MM-HH:MM`
  - Aceita múltiplos períodos separados por vírgula, como
    `08:00-12:00,18:00-22:00`.
  - `!autoaceitar horarios off` remove a restrição e permite aprovação em
    qualquer horário.
- **Telegram**:
  - Processa o evento nativo `chat_join_request`.
  - Aprova a solicitação usando `approveChatJoinRequest`.
  - O recurso funciona em grupos e supergrupos, conforme as permissões do bot.
- **WhatsApp**:
  - Processa o evento nativo `group.join-request` do Baileys.
  - Aprova participantes usando `groupRequestParticipantsUpdate` com a ação
    `approve`.
  - O bot precisa ter permissão administrativa no grupo.
- **Persistência e isolamento**:
  - Configurações são salvas em `settings/groups/` dentro de
    `settings.autoApprove`.
  - O estado é separado por plataforma, chat e tópico quando aplicável.
  - As configurações de um grupo não afetam outros grupos nem outras
    plataformas.
- **Controle de flood**:
  - As solicitações são colocadas em uma fila independente por chat.
  - A fila respeita o intervalo configurado antes de cada aprovação.
  - Falhas em uma solicitação não interrompem o processamento das seguintes.
- **Compatibilidade**:
  - Disponível somente para Telegram e WhatsApp.
  - Não é exibido como funcional no Discord.

## 📱 Usages compactas no menu

- Reduzidas as linhas `usage` de comandos com muitos subcomandos para melhorar
  a leitura do menu em telas de celular.
- Os comandos agora exibem o formato curto `[subcomando]`, enquanto a ajuda
  detalhada e os exemplos continuam disponíveis dentro de cada comando.
- A alteração foi aplicada a comandos como `antiraid`, `autoaceitar`, `vip`,
  `act_edit`, `onlychats`, `antipv`, `setembro`, `autoupdate` e
  `autodownload`.

## 🔨 Correção dos comandos de moderação no WhatsApp (ban e kick)

- **Problema corrigido**:
  - Ao executar `!ban` ou `!kick` no WhatsApp, o bot afirmava que o usuário havia sido removido/banido com sucesso, porém o participante continuava no grupo.
  - A falha decorria do envio de identificadores brutos ao Baileys (com sufixos de dispositivo como `:12@s.whatsapp.net` ou referências LID/menções) sem a resolução correta dos participantes do grupo, somado a erros silenciados com `.catch(() => {})` na função base de moderação.
- **O que foi feito**:
  - **Resolução precisa de participantes**: Implementada correspondência e normalização de JIDs/números nos metadados do grupo (`groupMetadata.participants`), eliminando sufixos de dispositivo antes de solicitar a remoção.
  - **Validação da API do WhatsApp**: Ação agora valida o retorno de status da operação no Baileys (`200`/`207`) antes de emitir a confirmação.
  - **Verificação prévia de permissões**: Valida se o bot possui permissão de administrador no grupo e impede tentativas inválidas (como tentar remover administradores ou o próprio bot).
  - **Tratamento transparente de falhas**: Erros reais de permissão ou de usuário inexistente agora são repassados ao usuário em vez de gerarem falsos positivos de sucesso.

## 🧹 Auto-limpeza de credenciais do WhatsApp e QR Code

- **Problema corrigido**:
  - A pasta de autenticação do WhatsApp (`settings/whatsapp-auth`) acumulava centenas de arquivos obsoletos (`pre-key-*.json`, resíduos de sessões antigas, pastas aninhadas e arquivos temporários), poluindo o repositório e sobrecarregando o carregamento de credenciais.
  - Ao gerar um novo QR Code, arquivos órfãos de sessões desconectadas anteriores permaneciam misturados na pasta.
- **O que foi feito**:
  - **Limpeza na geração de QR Code**: Ao gerar um novo QR Code para autenticação, os resíduos de sessões antigas e chaves órfãs são automaticamente descartados para garantir uma conexão limpa.
  - **Manutenção automática de Pre-Keys**: Rotina automática que remove pre-keys antigas já consumidas pelo WhatsApp, mantendo apenas as chaves recentes ativas.
  - **Purga no Logout**: Ao ocorrer desconexão definitiva (`loggedOut`), a pasta é higienizada automaticamente para evitar conflitos na próxima conexão.
  - **Eliminação de lixo e duplicatas**: Remoção de arquivos temporários (`.tmp`, `.bak`), arquivos vazios de 0 bytes e pastas aninhadas geradas por descompactações.

## 🛡️ Listas Brancas e Negras para Proteções Anti (Usuários e Cargos)

- **Novo sistema unificado de listas de exceção e punição direta** nas proteções anti (`!antilink`, `!antimedia`, `!antipalavras` e `!antiraid`).
- **Marcação e identificação flexível de usuários**:
  - Permite adicionar ou remover usuários respondendo/citando a mensagem do alvo (`quote`).
  - Suporte a marcação direta `@usuario` no WhatsApp, Telegram e Discord.
  - Suporte a identificação via ID numérico ou telefone sem necessidade de formatações manuais complexas.
- **Isenção e bloqueio por cargos no Discord**:
  - Subcomandos `rolewhitelist` (ou `rw`) e `roleblacklist` (ou `rb`) para gerenciar cargos autorizados ou proibidos.
  - Permite que cargos específicos (ex: membros confiáveis, cargos VIP, divulgadores) tenham permissão de enviar links, mídias ou mensagens sem serem punidos.
  - Aceita menção `@Cargo`, ID do cargo ou nome direto do cargo (case-insensitive).
- **Subcomandos disponíveis nas proteções**:
  - `userwhitelist` / `uw`: `add`, `remove`, `list`
  - `userblacklist` / `ub`: `add`, `remove`, `list`
  - `rolewhitelist` / `rw`: `add`, `remove`, `list` *(exclusivo Discord)*
- **Exclusividade mútua automática**:
  - Ao adicionar um usuário ou cargo à lista branca, ele é automaticamente removido da lista negra daquela mesma função/nível.
  - Da mesma forma, ao adicionar alguém à lista negra, o registro é automaticamente removido da lista branca correspondente.
- **Hierarquia e persistência**:
  - As listas são integradas à cadeia hierárquica por níveis (`server`, `categoria`, `chat`), respeitando herança de escopos.

### 🔍 Diferença de Comportamento entre os Perfis de Usuário

| Perfil | Comportamento e Regras | Exceções Aplicáveis |
| :--- | :--- | :--- |
| **⚪ Lista Branca (`whitelist`)** | **Imunidade total** à proteção. Mensagens nunca são apagadas e o membro não sofre punições (warn, mute, kick, ban). | Todas as mensagens/mídias/links são liberados para o usuário ou cargo isento. |
| **🔵 Fora das Listas (Padrão)** | **Sujeito às regras normais** configuradas no chat/servidor. Se violar uma regra ativa, sofre a punição configurada. | Beneficia-se de exceções globais ativas no chat, como `ignoremedia on`, `ignoresame on` e domínios liberados em `whitelist add <link>`. |
| **⚫ Lista Negra (`blacklist`)** | **Tolerância zero**. Qualquer envio de link, mídia ou palavra restrita é interceptado e punido imediatamente. | **Perde todas as exceções globais** — para quem está na lista negra, mesmo mídias ou links liberados para membros comuns continuam proibidos. |

#### 📌 Detalhamento por Proteção:
1. **No `!antilink`**:
   - **Lista Branca**: Pode enviar qualquer link externo ou convite sem sofrer punição.
   - **Fora das Listas**: É punido se mandar links proibidos, mas pode enviar links liberados pelo chat (como YouTube/TikTok se `ignoremedia on`, links de convite do próprio chat se `ignoresame on`, ou domínios da lista branca de links).
   - **Lista Negra**: É punido ao enviar qualquer link, sem direito a exceções de mídia ou domínios liberados.
2. **No `!antimedia`**:
   - **Lista Branca**: Pode enviar qualquer tipo de mídia (fotos, vídeos, figurinhas, áudios, etc.).
   - **Fora das Listas**: Bloqueado apenas nos tipos de mídias específicos que foram cadastrados para bloqueio (`!antimedia add ...`).
   - **Lista Negra**: Bloqueio irrestrito de mídias.
3. **No `!antipalavras`**:
   - **Lista Branca**: Liberado para enviar qualquer mensagem, mesmo contendo palavras cadastradas no filtro.
   - **Fora das Listas**: Bloqueado e punido se a mensagem contiver palavras proibidas ativas.
   - **Lista Negra**: Punição direta ao menor indício de termos restritos.
4. **No `!antiraid`**:
   - **Lista Branca**: Isento das contagens de flood e dos bloqueios de alta frequência (ideal para bots auxiliares ou contas de serviço).
   - **Fora das Listas**: Sujeito aos limites de mensagens por janela de tempo (`flood X Y`) e filtros de menções/webhooks.
## 🎭 Correções e Melhorias no Sistema de Ações (`!act` e `!act_edit`)

- **Migração de Armazenamento: Base64 → Arquivos Locais (`act_media/`)**:
  - As mídias das ações eram armazenadas como strings Base64 gigantes dentro do próprio `act.json`, inflando o arquivo e causando lentidão na leitura/escrita.
  - Migrado para **arquivos físicos na pasta `commands/diversão/act_media/`**, referenciados pelo campo `"file"` no JSON (ex: `"file": "kiss_1788985103184_541.mp4"`).
  - O `act.json` agora armazena apenas o nome do arquivo, ficando leve e legível. As mídias são carregadas sob demanda com `fs.readFileSync()`.
  - A pasta `act_media/` acompanha o comando, mantendo a portabilidade sem depender de pastas externas como `settings/uploads/media/`.
- **🐛 Correção Crítica: GIFs Enviados como Imagem Estática no WhatsApp**:
  - **Causa raiz**: As mídias salvas pelo `!act_edit` (oriundas de URLs do Tenor/Giphy e anexos de GIF do Discord) são, na realidade, **vídeos MP4** (`ftypmp42`/H.264) e não arquivos GIF clássicos (`GIF89a`). Isso ocorre porque o Tenor, o Giphy e o próprio Discord convertem GIFs animados em vídeos MP4 para otimizar performance e largura de banda.
  - **O bug**: O campo `"type": "gif"` no `act.json` indicava a intenção de exibição como GIF animado, porém a lógica antiga de envio no WhatsApp tratava mídia com tipo `"gif"` como imagem estática (`payload.image = buffer`), ignorando que o buffer real era um vídeo MP4. O resultado: o WhatsApp recebia um container de vídeo MP4 interpretado como imagem, exibindo apenas o primeiro frame congelado.
  - **A correção**: A função `sendMedia()` agora usa **detecção por Magic Bytes** (`detectBufferFormat()`) em conjunto com o tipo declarado no JSON. Se o tipo é `"gif"` **ou** os bytes do arquivo indicam MP4 (`ftyp`), a mídia é enviada como `payload.video` com `gifPlayback: true`, garantindo reprodução animada em loop no WhatsApp (estilo GIF nativo do protocolo).
  - **Por que no Telegram e Discord funcionava**: O Telegram (`sendAnimation`) e o Discord (`replyVideo`) já aceitavam o buffer MP4 diretamente e exibiam como animação sem necessidade de flags especiais. O bug era exclusivo da API do WhatsApp/Baileys, que exige o par `video` + `gifPlayback: true` para reproduzir MP4 como GIF.
- **Detecção Inteligente de Formato Binário (*Magic Bytes*)**:
  - Implementada a função `detectBufferFormat()`, que analisa os cabeçalhos binários reais dos buffers para identificar o tipo exato da mídia: `GIF89a/GIF87a`, `Vídeo MP4 (ftyp/H.264)`, `PNG`, `JPEG` e `WebP`.
  - Essencial para distinguir entre GIFs clássicos (raros) e vídeos MP4 disfarçados de GIF (maioria das fontes modernas).
- **Novo Subcomando de Inspeção (`!act_edit inspect`)**:
  - `!act_edit inspect <ação>` (aliases `act_inspect`, `actinspect`): Inspeciona detalhadamente todas as mídias salvas de uma ação, exibindo formato real detectado, MIME type, tamanho em KB, Magic Bytes em hexadecimal e notas de compatibilidade por plataforma.
  - `!act_edit inspect` (respondendo a uma mensagem/anexo/link): Inspeciona a mídia enviada ou citada antes de salvá-la, auxiliando na verificação de compatibilidade.
- **Envio de GIFs adaptado por plataforma**:
  - **WhatsApp (Baileys)**: GIFs clássicos são convertidos para MP4 e enviados com `gifPlayback: true`, mantendo a reprodução em loop como GIF nativo.
  - **Telegram (Telegraf)**: GIFs são enviados como animações por meio de `sendAnimation`, usando diretamente o buffer GIF ou MP4.
  - **Discord**: mídias declaradas como GIF que foram armazenadas como MP4 (comum em arquivos vindos do Tenor, Giphy ou anexos do Discord) são convertidas novamente para GIF real antes do envio, evitando que sejam exibidas como vídeos.
  - Vídeos declarados explicitamente como `video` não sofrem alteração e continuam sendo enviados como vídeos.
  - Corrigido o fechamento indevido de sessões de criptografia (`libsignal`) no WhatsApp ao responder com mídias em conversas privadas / LIDs.
- **Extração Aprimorada de Mídias e Quotes no Discord (`extractDiscordMedia`)**:
  - Corrigido problema onde responder a mensagens no Discord (`quote`/`reference`) não extraía as mídias anexadas ou embeds.
  - O bot agora reconhece e extrai automaticamente anexos diretos, stickers, embeds animados do Tenor/Giphy (priorizando a stream MP4 de alta performance) e URLs de mídia presentes no texto.
- **Exibição do guia de uso em erros de sintaxe**:
  - Ao executar `!act` sem argumentos, com `help`/`ajuda` ou informando uma ação inexistente/desativada, o bot agora responde diretamente com o guia completo de como usar o comando, listando todas as ações ativas disponíveis e exemplos práticos, em vez de emitir apenas erro de ação não encontrada.
- **Resolução de alvo e ações individuais**:
  - Quando nenhuma marcação ou resposta é fornecida (ex: `!act hug`), a ação é aplicada sobre o próprio autor por padrão de forma intencional.
  - Ao fornecer um alvo, o bot resolve precisamente o destinatário em todas as plataformas (resposta a mensagens, menções `@`, menções `<@id>` no Discord, menções em texto/username no Telegram e IDs/telefones).
- **Escape e formatação no Telegram**:
  - Corrigido problema na renderização de HTML no Telegram que causava erro de entidades ao misturar textos com caracteres especiais (como `<3`) e menções clicáveis.
  - Envio de animações via `sendAnimation` com nome de arquivo adequado (`action.mp4`/`action.gif`) para garantir a reprodução automática.
- **Marcações com legenda no WhatsApp**:
  - Corrigida a ausência de `mentions` no envio de imagens/mídias com legenda no WhatsApp (`replyImg`), permitindo que as marcações `@usuario` funcionem nas mensagens de ação com mídia.
- **Padronização dos logs de conexão do WhatsApp**:
  - O log de inicialização do WhatsApp foi alinhado ao padrão visual das demais plataformas.
  - Ao conectar, o console agora exibe o número do bot, facilitando a identificação da sessão ativa sem alterar o funcionamento do adapter.
- **Retorno de erros e usabilidade no `!act_edit`**:
  - O comando agora informa a mensagem de erro exata e instruções claras quando um parâmetro está ausente ou inválido (ex: "Informe a ação", "Limite de caracteres excedido", "Ação não encontrada").

## ⚠️ Correções no Sistema de Advertências (`!warn`, `!warns` e `!unwarn`)

- **Problema corrigido no `!warns` e marcações**:
  - Ao executar `!warns @usuario`, o bot consultava e retornava as advertências de quem executou o comando em vez do usuário marcado.
  - A falha decorria da leitura do atributo inexistente `message.mentionedJidList` (as plataformas expõem `message.mentionedJids`), resultando em `undefined` e acionando o fallback para o próprio autor.
- **Problema corrigido na punição automática de advertências**:
  - No `addWarn` (`functions/warnHelper.js`), ao atingir o limite máximo de advertências para expulsão/banimento, a função invocava `kickMember` ou `banMember` passando o objeto de mensagem original sem substituir o `userId`, fazendo com que a punição fosse aplicada contra o administrador que enviou o comando em vez do usuário advertido.
- **O que foi feito**:
  - **Identificação unificada de alvo**: Os comandos `!warns`, `!warn` e `!unwarn` agora utilizam `parseTargetFromMessage()` e `formatUserMention()`, suportando menção direta (`@usuario`), resposta a mensagens (`quote`) ou digitação de ID/número em todas as plataformas (WhatsApp, Telegram, Discord).
  - **Punição correta no limite de warns**: Corrigida a chamada de expulsão/banimento automático para repassar `{ ...message, userId: uid }`, garantindo que o usuário alvo receba a punição adequada.

## 🔗 Correção no Middleware Antilink (Falsos Positivos e Punição de Mensagens Comuns)

- **Problema corrigido**:
  - Ao habilitar o `!antilink` em um chat (especialmente com ação `ban` ou `kick`), qualquer mensagem de texto enviada por membros comuns (ex: `+warns`, `oi`, etc.) era interceptada e punida imediatamente como se fosse um link.
  - A função de detecção `hasLink(text)` estava presente apenas no `console.log` de diagnóstico, faltando a condicional de liberação de mensagens sem link no fluxo de execução do middleware.
- **O que foi feito**:
  - **Interrupção antecipada**: Adicionada a checagem `if (!hasLink(text)) return true;` no início do middleware `middlewares/antilink.js`, liberando imediatamente mensagens comuns para os próximos middlewares e comandos.
  - **Expressão Regular Refinada**: Aprimorada a regex em `functions/antilinkHelper.js` para cobrir links `http/https`, `www.`, links de convite (WhatsApp, Telegram, Discord) e domínios com TLDs oficiais, prevenindo falsos positivos causados por pontuações de frases (como `palavra.outra`).

## 📦 Scripts de Compactação e Empacotamento (`pack.bat` e `pack.sh`)

- Adicionados scripts automatizados de empacotamento para Windows (`pack.bat`) e Linux/Bash (`pack.sh`).
- Compactam automaticamente os arquivos e pastas essenciais da aplicação (`changelog`, `commands`, `docs`, `functions`, `middlewares`, `platforms`, `core.js`, `index.js`, scripts de instalação/inicialização e `package.json`).
- Excluem automaticamente diretórios pesados e sensíveis como `node_modules/`, `settings/` e arquivos de trava como `package-lock.json`.
- Detectam dinamicamente a versão configurada no `package.json` para nomear o arquivo `.zip` de saída.

## 💾 Armazenamento Local Permanente de Mídias (`!welcome`, `!goodbye`, `!agendar`)

- **Problema corrigido**:
  - Mídias de boas-vindas, despedida e agendamentos hospedadas ou configuradas via links externos (como CDN do Discord com assinaturas `?ex=...`) expiravam após 24 horas. Após a expiração, a tentativa de envio resultava em arquivos corrompidos de 36 bytes (`{"message": "Signature has expired"}`) ou falhas de reenvio no WhatsApp e Telegram.
- **O que foi feito**:
  - **Eliminação de dependência de CDNs temporárias**: Remoção do armazenamento remoto em canais de upload do Discord para mídias de longo prazo.
  - **Download e armazenamento local automático**: O envio de mídia por anexo ou por link web agora realiza o download imediato do buffer e armazena permanentemente em `settings/uploads/media/`, garantindo que as imagens nunca expirem.
  - **Auto-recuperação e aviso de expiração**:
    - Ao executar boas-vindas/despedidas/agendamentos que ainda possuam links web antigos, o bot tenta baixar e salvar o arquivo localmente de forma transparente.
    - Caso o link antigo já tenha expirado na CDN, o bot envia a mensagem de texto com segurança sem anexar arquivos corrompidos e inclui um aviso para os administradores redefinirem a imagem.
    - Nos comandos de `status` (`!welcome status`, `!goodbye status`, `!agendar status`), é exibido um aviso de alerta caso a mídia configurada ainda utilize links externos temporários recomendando a redefinição da imagem.

## 🔗 Comando Multiplataforma de Convite (`!link`, `!convite`, `!invite`, `!linkgp`)

- **Novo comando universal**: Permite obter o link de convite do chat atual com compatibilidade 100% nas três plataformas (`platformSupport: { whatsapp: "full", telegram: "full", discord: "full" }`).
- **WhatsApp**:
  - Obtém dinamicamente o código de convite do grupo via Baileys (`groupInviteCode`) e gera a URL `https://chat.whatsapp.com/...`.
- **Discord**:
  - Prioriza a URL personalizada/vanity do servidor (`discord.gg/...`), ou gera um link de convite instantâneo permanente para o canal atual.
- **Telegram**:
  - Obtém o username público do grupo/canal (`t.me/...`), link de convite existente ou exporta/cria um link de convite direto do chat.
- **Tratamento de permissões**: Informa mensagens claras caso o bot necessite de privilégios de administrador ou de permissão de criação de convites.

## 🔓 Revelador de Visualização Única (`!revelar`, `!revela`, `!vo`, `!viewonce`, `!quebrar`)

- **Novo comando exclusivo do WhatsApp** (`platformSupport: { whatsapp: "full", telegram: "none", discord: "none" }`).
- **Quebra e Reenvio Permanente de Mídias de Visualização Única**:
  - Permite revelar qualquer foto, vídeo ou áudio de visualização única (`viewOnceMessage`, `viewOnceMessageV2`, `viewOnceMessageV2Extension`) marcando ou respondendo à mensagem com `!revelar`, `!revela` ou `!vo`.
  - Descriptografa e baixa o buffer original dos servidores do WhatsApp via Baileys / AES-256-CBC e o reenvia no chat como uma mídia normal e permanente.
  - Preserva a legenda original enviada junto com a foto ou vídeo.
  - Suporte completo para desempacotamento de mensagens temporárias e visualizações únicas aninhadas no `platforms/whatsapp.js`.

## 🗂️ Reorganização de Categorias e Estrutura de Comandos

- **Comando `menu` na Raiz**:
  - Movido de `commands/adm/ações imediatas/menu.js` para a raiz de comandos (`commands/menu.js`).
  - O comando agora atua como comando raiz do sistema, sendo listado na seção principal de comandos.
- **Comandos `setembro` e `nofap` na Categoria de Diversão**:
  - Movidos para `commands/diversão/setembro.js` e `commands/diversão/nofap.js`.
  - Ambos agora pertencem explicitamente à categoria `diversão`, sendo listados sob a aba de diversão (`!menu diversão`).
- **Comando `vip` na Subcategoria de Contas/Exibir**:
  - Movido para `commands/contas/exibir/vip.js` com a categoria `contas/exibir`.
  - Agora é agrupado na aba de contas (`!menu contas` ou `!menu contas/exibir`) ao lado do comando `perfil`.
