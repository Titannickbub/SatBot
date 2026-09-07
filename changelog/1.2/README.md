# Sat Bot — Changelog Versão 1.2

## 📝 Revisão do lançamento

Esta revisão consolida as melhorias entregues na versão 1.2 e corrige a documentação da versão 1.1:

- `!infobot` apresenta aos usuários a versão atual, responsável, contatos e informações da base do bot.
- `!setbotinfo` permite que Super Usuários configurem essas informações públicas.
- O `!botstatus` passou a exibir informações globais de execução, plataformas, recursos carregados e configurações.
- Erros técnicos deixaram de ser enviados diretamente em vários comandos; o usuário recebe orientações simples e os detalhes ficam registrados no console.
- O processamento de figurinhas foi reforçado para imagens grandes, orientação EXIF e recorte central.
- O WhatsApp recebe WebP puro por padrão, sem EXIF customizado, reduzindo o risco de stickers vazios em versões incompatíveis do aplicativo.

---

## 🖼️ Correção das figurinhas com recorte central

- O `!rsticker` / `!rfig` agora faz o recorte quadrado central de forma explícita antes de redimensionar.
- A conversão aplica a orientação EXIF da imagem, suporta dimensões muito grandes e valida o WebP gerado antes do envio.
- Imagens estáticas, WebP, GIFs e mídias animadas seguem fluxos separados para evitar figurinhas vazias.
- O envio padrão para WhatsApp não injeta mais EXIF customizado, evitando incompatibilidade que podia exibir a figurinha vazia em algumas versões do aplicativo.
- O WhatsApp só recebe o resultado quando a conversão realmente gerou um WebP válido.

---

## 📌 Visão Geral

A versão 1.2 do Sat Bot entrega o Sistema VIP / Premium centralizado por conta central, permitindo controle unificado de acesso e benefícios entre WhatsApp, Telegram e Discord.

Este módulo adiciona regras de expiração, bônus de tempo, bypass de PV por plataforma, modo VIP-only em chats e suporte a campos permanentes e com data específica.

---

## 🌐 Setembro / NoFap multiplataforma

O comando `!setembro` agora funciona em comunidades das três plataformas:

- grupos do WhatsApp;
- grupos e supergrupos do Telegram;
- servidores do Discord.

O ranking e os participantes continuam isolados por plataforma e comunidade,
evitando misturar dados entre grupos ou servidores diferentes.

---

## 🔗 Correção do Antilink no WhatsApp

### Falha identificada

O antilink registrava a ação como concluída, mas algumas mensagens não eram removidas. A chave de exclusão estava sendo reconstruída com `fromMe: true` quando o ID da mensagem coincidia com a mensagem recebida. No antilink, porém, essa mensagem pertence ao membro que enviou o link, não ao bot. Além disso, o erro da API era ignorado, gerando um falso log de sucesso.

### Solução aplicada

- Preservação da chave original (`msg.key`) da mensagem recebida.
- Uso do valor real de `fromMe`, sem inferência pelo ID.
- Inclusão do participante correto do grupo, com suporte a identificadores LID (`@lid`).
- Erros de exclusão agora são propagados para o tratamento do antilink, evitando o registro de sucesso quando o WhatsApp rejeita a operação.
- O fluxo passa a usar a mesma estrutura de chave validada pelo comando `!d`.

### Auditoria dos demais sistemas automáticos

A mesma falha também foi identificada e corrigida nos middlewares `antipalavras`, `antimedia`, `antiraid` e `blockcmd`. Esses fluxos agora:

- informam o participante correto ao excluir mensagens de grupos;
- preservam o comportamento de mensagens identificadas por LID;
- não ocultam falhas da API do WhatsApp;
- só seguem o fluxo de sucesso após a exclusão ser confirmada.

---

## 🚀 Novidades e Novas Funcionalidades

### 👑 Sistema VIP / Premium

- **Conta Central Vinculada ao Usuário**:
  - O VIP passa a ser gerido por uma conta central compartilhada entre as plataformas, permitindo o mesmo status em WhatsApp, Telegram e Discord.
  - A conta central armazena identificadores, plataformas vinculadas, nome, histórico e dados do VIP.

- **Tempo Dinâmico e Expiração Automática**:
  - Suporte a parsing de tempo em formatos como `10d 2h 30m`, `30d`, `12h`, `90m`.
  - Acúmulo de tempo em VIP ativo com soma ao prazo restante (`!vip add`).
  - Subtração de tempo sem cancelar o VIP imediatamente (`!vip rem`).
  - Expiração automática ao encerrar o prazo.

- **VIP Permanente e Data Fixa**:
  - `!vip perm` concede acesso vitalício sem expiração.
  - `!vip date @user <dd/mm/yyyy> [hh:mm]` define uma expiração específica em data e hora.

---

### 🧩 Comando Gerenciador `!vip`

O comando principal foi implementado em `commands/vip.js` e suporta:

- `!vip` / `!vip check [@user|id]` — consulta status VIP.
- `!vip set @user <tempo>` — define tempo exato a partir de agora.
- `!vip add @user <tempo>` — acumula tempo.
- `!vip rem @user <tempo>` — remove tempo.
- `!vip reset @user` / `!vip cancel @user` — cancela o VIP.
- `!vip date @user <data> [hora]` — define vencimento exato.
- `!vip perm @user` — concede VIP permanente.
- `!vip addcmd <cmd>` / `!vip remcmd <cmd>` / `!vip listcmd` — gerencia comandos VIP liberados.
- `!vip pv on|off <plataforma>` — ativa/desativa bypass de PV por plataforma.
- `!vip chat on|off` / `server on|off` / `categorie on|off` — ativa modos exclusivos VIP.
- `!vip help` — exibe ajuda detalhada com exemplos.

---

### 🔐 Segurança e Bloqueio VIP

- **Middlewares de proteção adicionados/ajustados**:
  - `middlewares/vip.js`: bloqueia uso de comandos VIP e chegada em chats em modo `vipOnly` para usuários sem VIP.
  - `middlewares/antipv.js`: libera uso do bot em PV para membros VIP nas plataformas configuradas.

- **Modo VIP-only**:
  - Chat, servidor ou categoria podem ser configurados como exclusivos para usuários VIP.
  - Respostas personalizadas podem ser exibidas quando o acesso é bloqueado.
 
---

### 🔥 Sistema NoFap / Setembro

- **Conta central e sequência pessoal**:
  - O NoFap agora é salvo na conta central vinculada ao usuário, permitindo continuar o progresso mesmo em plataformas diferentes.
  - `!nofap status` exibe sequência atual, recorde e título do desafio.
  - `!nofap iniciar` e `!nofap reset` controlam o início e o reset da contagem.

- **Desafio por grupo**:
  - `!setembro entrar` registra o usuário no desafio do grupo atual.
  - `!setembro rank` exibe o ranking por sequência e última interação ativa dos participantes.
  - A última atividade é atualizada automaticamente por middleware para manter o ranking consistente.

- **Perfil integrado**:
  - O comando `!perfil` passou a mostrar também o status do NoFap, como sequência atual e título do desafio.

---

### 🧾 Perfil Integrado com Status VIP

O comando `commands/perfil.js` agora mostra diretamente o status do usuário, incluindo:

- usuário
- ID central
- status (ativo/inativo)
- tipo (permanente ou duração)
- tempo restante
- data de expiração

Exemplo de visualização:

```text
Sistema VIP / Premium

Usuário: José Vitor
ID Central: a264f79c-bc63-4abf-99eb-82db8c523e3a

Status: 🟢 VIP ATIVO
Tipo: ⏳ Duração
Tempo Restante: 23 horas e 59 minutos
Expira em: 03/09/2026, 11:50:02
```

---

### 🧪 Testes e Validação

A lógica foi validada com o script de teste do sistema VIP, cobrindo:

- parsing de duração (`10d 2h 30m`, `30d`, `12h`)
- parsing de data/hora
- definição de VIP (`SET`)
- acúmulo (`ADD`)
- subtração (`REM`)
- bypass de PV
- reset do VIP

O resultado do script confirmou que o sistema está funcionando corretamente.

---

### 🎭 Ações interativas multiplataforma

Adicionado o sistema universal `!act`, compatível com WhatsApp, Telegram e
Discord. Ações, aliases, frases e mídias ficam configurados em
`commands/diversão/act.json`; menções e usuários respondidos são resolvidos
automaticamente e o envio de mídia possui fallback para texto.

Super Usuários podem consultar e administrar as ações com `!act_edit list`,
`show`, `new`, `message`, `image`, `alias`, `enable`, `disable`, `delete` e as
operações de remoção. Anexos enviados ao gerenciador são armazenados pelo
mesmo fluxo de `storeMedia` utilizado pelo `welcome`, com persistência
atômica e validação de limites, URLs e tipos de mídia.

---

## ✅ Impacto da Atualização

Esta release transforma o bot em uma solução mais premium e organizada para gestão de membros VIP, com:

- controle centralizado
- expiração automática
- regras por plataforma e chat
- divisões claras de acesso
- melhor experiência para usuários e administradores

A versão 1.2 deixa o Sat Bot preparado para uso profissional em comunidades, servidores e grupos com privilégio VIP.

---

## 🎬 Auto Download com exclusão opcional do link

Grupos de WhatsApp, Telegram e Discord podem configurar `autodownload deletelink on|off`. Quando ativada, a opção exclui o link original após o envio bem-sucedido da mídia e identifica o autor na mensagem da mídia, reduzindo a poluição do chat. A opção fica desativada por padrão e pode ser consultada com `autodownload deletelink status`.

---

## 🔄 Auto Update seguro

O `settings/config.json` agora possui `autoUpdate: false` por padrão. Superusuários podem consultar ou alterar a opção com `!autoupdate status`, `!autoupdate on` e `!autoupdate off`.

Na inicialização, o bot consulta a versão do `package.json` no GitHub. Com o recurso desativado, o aviso de versão continua sendo exibido e orienta a atualizar manualmente com `update.bat`/`update.sh` ou ignorar o aviso para permanecer na versão atual. Se o Auto Update estiver ativado, a configuração fica persistida em `settings/config.json` (preservada pelos scripts de atualização) e a atualização é executada somente na próxima inicialização usando o script correspondente. Versões remotas iguais ou mais antigas nunca substituem a versão local, bloqueando downgrades acidentais — especialmente enquanto o repositório remoto estiver na versão 1.1 e o bot local na 1.2.

O console também informa o estado do Auto Update em toda inicialização (`ATIVADO` ou `DESATIVADO`).

---

## 🗂️ Organização de menus, categorias e comandos

- O menu passou a aceitar subcategorias no formato `categoria/subcategoria`.
- `!menu <categoria>` exibe diretamente uma seção para cada subcategoria,
  seguida pelos comandos legados da categoria principal, sem menus aninhados.
- Categorias vazias não são exibidas; somente categorias com comandos carregados
  aparecem no menu.
- O comando `info` continua explicando apenas categorias e comandos, sem criar
  uma seção de explicação para subcategorias.
- Os comandos também foram reorganizados fisicamente em pastas compatíveis com
  suas categorias, com os imports relativos atualizados.

### Categorias administrativas

- `adm/ações imediatas`: ban, clear, d, kick, mute, unmute, unwarn, warn e warns.
- `adm/membros`: promover e rebaixar.
- `adm/configurações`: warnconfig, agendar, goodbye, welcome, status,
  crossplay, monitorcafe e autoia.
- `adm/segurança`: antilink, antimedia, antipalavras, antiraid e blockcmd.
- `seradm` e `sermb`: `system/ações imediatas`.

### Categorias de sistema e contas

- `system/configurações`: antipv, autodownload, autoupdate, blockcmd_su,
  config, onlychats, setai, su-token e su.
- `system/info`: botstatus.
- `start` passou a aparecer na raiz.
- A categoria `contas` foi dividida em `exibir`, `conectar`,
  `edição de perfil` e `atividades`.
- `play` e `video` foram movidos para `downloads`; a categoria `utilitarios`
  deixou de existir.

---

## 🌐 Setembro multiplataforma

O comando `!setembro` passou a funcionar em grupos do WhatsApp, grupos e
supergrupos do Telegram e servidores do Discord. Rankings e participantes
continuam separados por plataforma e comunidade.

---

## ⏱️ Conclusão da restrição de inicialização

Ao terminar o período de `ignoreInitialSeconds`, o console informa que a
restrição de inicialização foi finalizada e que as mensagens serão processadas
normalmente.

---

## 🎭 Gerenciamento de cargos no Discord

Foram adicionados comandos exclusivos para servidores do Discord:

- `!darcargo @membro @cargo1 @cargo2` e `!removecargo @membro @cargo1 @cargo2`
  para administradores com permissão de gerenciar cargos;
- `!sercargo @cargo1 @cargo2` e `!delcargo @cargo1 @cargo2` para Super Usuários,
  aplicados aos cargos do próprio usuário que envia o comando.

As operações respeitam a hierarquia de cargos do Discord e exigem que o bot
tenha a permissão `Gerenciar Cargos`.

---

## 🗃️ Migração dos dados para `settings`

Os dados persistentes de Contas Centrais e Crossplay passaram a ser armazenados
junto das demais configurações:

- `settings/central-accounts.json`;
- `settings/crossplay.json`.

Na inicialização, instalações antigas são convertidas automaticamente a partir
de `data/` (e da antiga `config/`, quando aplicável). A conversão valida os
arquivos antes de remover os arquivos legados e a pasta antiga, evitando perda
de dados. Os scripts `start.bat`, `start.sh`, `update.bat` e `update.sh` também
foram ajustados para usar e preservar `settings/`.

O bloco duplicado `centralIdentities` foi removido do Crossplay. Os grupos
Crossplay agora mantêm somente o `centralId`, que referencia diretamente a
Conta Central no sistema principal de contas.

---

## 🎉 Comando de diversão `porcentagem`

Adicionado o comando `!porcentagem`, com os aliases `!porcent`, `!%` e `!pct`.
O formato é genérico: `!porcentagem <argumento> [alguém]`. O primeiro argumento
é analisado como o texto da avaliação, uma porcentagem aleatória é calculada e
o resultado informa que o alvo possui aquela porcentagem do argumento. O alvo
pode ser uma menção, uma mensagem respondida ou, quando não informado, o
remetente do comando.

---

## 🎵 Melhorias nos downloads do YouTube

- O comando `!play` passou a usar o título exibido na prévia como nome do
  arquivo de áudio, mantendo a extensão `.mp3`.
- Caracteres inválidos para nomes de arquivos são removidos e títulos muito
  longos são limitados para evitar falhas no envio ou no armazenamento.
- WhatsApp, Telegram e Discord agora recebem e preservam o nome personalizado
  do áudio; `audio.mp3` permanece apenas como fallback quando não há título.

Arquivos relacionados: [`commands/downloads/play.js`](../../commands/downloads/play.js),
[`platforms/telegram.js`](../../platforms/telegram.js),
[`platforms/whatsapp.js`](../../platforms/whatsapp.js) e
[`platforms/discord.js`](../../platforms/discord.js).

---

## 🤖 Estabilidade do Telegram durante downloads

- O processamento de comandos demorados, como `!play`, não bloqueia mais o
  ciclo de polling do Telegram.
- Falhas assíncronas no processamento de mensagens agora são registradas no
  console, sem deixar o bot silenciosamente sem resposta.
- As requisições HTTP da API passaram a ter timeouts explícitos: 45 segundos
  para consultas e 90 segundos para downloads de mídia.

Arquivos relacionados: [`functions/api.js`](../../functions/api.js) e
[`platforms/telegram.js`](../../platforms/telegram.js).

---

## 📦 Instaladores externos para hospedagens

- Adicionados `install.bat` e `install.sh` para facilitar a instalação em
  hospedagens e repositórios de terceiros.
- Os scripts clonam o repositório principal apenas quando o SatBot ainda não
  está instalado no diretório de destino.
- A instalação é não destrutiva: conflitos são detectados antes da cópia e
  nenhum arquivo existente é sobrescrito.
- O repositório e a branch podem ser personalizados pelas variáveis
  `SATBOT_REPO_URL` e `SATBOT_BRANCH`.

Arquivos relacionados: [`install.bat`](../../install.bat),
[`install.sh`](../../install.sh) e [`README.md`](../../README.md).

---

## 🏷️ Nome central configurável

- Referências fixas ao nome antigo `Satella` foram removidas das mensagens,
  logs, prompts de IA e scripts de inicialização.
- Esses pontos agora usam o nome central definido em `settings/config.json`
  pelo comando de configuração do bot.
- O alias legado `satella` do comando de IA e identificadores históricos de
  sessões permanecem preservados para compatibilidade.

Arquivos relacionados: [`functions/config.js`](../../functions/config.js),
[`functions/aiHelper.js`](../../functions/aiHelper.js),
[`commands/ia/ia.js`](../../commands/ia/ia.js) e
[`core.js`](../../core.js).

---

## 📴 Saída dos desafios e desativação de monitores

- `!nofap sair` pausa a contagem pessoal do NoFap sem apagar o recorde ou o
  histórico de resets.
- `!setembro sair` remove o usuário do ranking do desafio no grupo atual.
- `!monitorcafe disable` desativa os envios automáticos de cotações no chat.
- `!clima disable` (também aceitando `desativar` e `off`) desativa o monitor
  automático de previsão do tempo no chat.

Arquivos relacionados: [`commands/contas/atividades/nofap.js`](../../commands/contas/atividades/nofap.js),
[`commands/setembro.js`](../../commands/setembro.js),
[`commands/adm/configurações/monitorcafe.js`](../../commands/adm/configurações/monitorcafe.js) e
[`commands/clima.js`](../../commands/clima.js).
