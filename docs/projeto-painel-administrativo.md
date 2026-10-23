# Projeto do painel administrativo do SatBot

## Objetivo

Organizar no site as funções administrativas que já existem nos comandos do
SatBot, sem fingir que WhatsApp, Telegram e Discord oferecem as mesmas
permissões ou capacidades. O painel deve facilitar as tarefas frequentes,
explicar indisponibilidades e manter o comando como alternativa para operações
que não combinam com uma interface web.

Este documento descreve a organização recomendada e o inventário observado no
código. **Não significa que todas as funções abaixo já estejam implementadas no
painel web.** A seção de sistemas oferece ativação e configuração detalhada dos
recursos já compatíveis com os escopos de cada plataforma.

## Princípios de organização

1. **Um painel por grupo/servidor e plataforma.** Configurações, membros,
   permissões e dados devem sempre estar vinculados ao escopo selecionado.
2. **O painel do membro e o administrativo são áreas distintas.** Os dados
   pessoais locais permanecem no painel do membro; administração fica em uma
   área própria.
3. **Permissão é por ação, não um único sinal de “é admin”.** A permissão do
   usuário e a do próprio bot são verificadas separadamente para cada função.
4. **Recursos incompatíveis não aparecem como controles utilizáveis.** Quando
   for útil explicar a diferença, mostrar o recurso desabilitado com o motivo
   (por exemplo, “Mute não disponível no WhatsApp” ou “o bot precisa de
   Gerenciar mensagens”).
5. **A autorização é revalidada no servidor ao salvar.** A presença de um botão,
   o estado do navegador ou o acesso direto a uma URL não autorizam uma ação.
6. **Ações destrutivas pedem confirmação clara.** Mostrar o escopo, o impacto e
   a possibilidade de perda antes de confirmar resets, banimentos, remoções em
   massa ou alterações de cargos.
7. **Priorizar operações frequentes e legíveis.** Recursos raros, integrações
   extensas e opções avançadas podem continuar nos comandos, com um atalho de
   ajuda no painel.

## Navegação proposta

### 1. Visão geral

Resumo de um único grupo/servidor:

- Nome, plataforma e identidade do membro que está administrando.
- Estado da conexão do bot com a plataforma.
- Cartões de **permissões do administrador**, **permissões do bot** e
  **recursos ativos**.
- Alertas que expliquem por que uma ação está indisponível e o que precisa ser
  corrigido.
- Atalhos para as tarefas mais frequentes: advertir, abrir/fechar, boas-vindas
  e estado de segurança.

Não mostrar segredos, tokens ou dados de outros grupos nesta área.

### 2. Moderação

Começar por uma busca pontual, sem carregar ou expor a lista completa de
membros. O administrador informa ID ou username, escolhe o resultado correto e
então vê as ações permitidas para sua conta e para o bot:

- **Advertências:** aplicar e remover as advertências guardadas no JSON local.
  A lista mostra a contagem, o limite e os motivos individuais. Registros
  numéricos antigos continuam sendo lidos e aparecem sem motivo registrado;
  novas datas e motivos ficam em `warnsHistory`, mantendo `warnsData` numérico
  para compatibilidade com comandos e instalações anteriores.
- **Remoção e banimento:** expulsar ou banir com confirmação e motivo opcional
  somente nas plataformas que oferecem cada ação. No WhatsApp, o painel mostra
  apenas remover do grupo; a plataforma não oferece banimento persistente.
- **Silenciamento:** aplicar/remover mute onde a plataforma oferece suporte.
- **Desbanir:** disponível quando a API da plataforma identifica o usuário como
  banido; não é uma ação disponível no WhatsApp, onde o comando de ban remove o
  participante.
- **Cargos e administração:** no Discord, atribuir/remover cargos abaixo da
  hierarquia do administrador e do bot; no WhatsApp, promover/rebaixar membros
  do grupo; no Telegram, promover para um dos níveis `staff`, `mod`, `gerente`
  ou `adm` definidos pelo bot e rebaixar para membro.

Cada ação revalida no servidor a participação do administrador, as permissões
dele e as do bot. Motivo e duração do silêncio aparecem somente quando são
aplicáveis à ação escolhida. O Discord permite pesquisa por username e ID; o WhatsApp
permite filtrar os participantes retornados pela consulta de metadados do
grupo; o Telegram exige ID numérico para usuários que não constem na lista de
advertências, pois a API de bots não oferece busca arbitrária por username.
Advertências, kick/ban e desbanir exigem confirmação adequada.

### 3. Proteção e regras

Agrupar as proteções numa tela, com estado e escopo efetivo visíveis:

- Antilink.
- Antimídia.
- Antipalavras.
- Anti-raid/flood.
- Bloqueio seletivo de comandos.
- Configuração de advertências.

Cada proteção deve explicar se herda regras de níveis superiores, qual nível
está sendo editado e qual ação será tomada (apagar, avisar, restringir,
expulsar ou banir). Listas de exceção devem ser identificadas como exceções e
não como configuração geral.

### 4. Boas-vindas e automações

Agrupar eventos de entrada/saída e automações operacionais:

- Boas-vindas e despedidas, com prévia, texto, mídia e estado.
- Aprovação automática de pedidos de entrada, com intervalo, bloqueios por
  nome/símbolo e faixas de horário no relógio local do bot.
- Horários programados para abrir/fechar.
- Respostas automáticas e Auto-IA.
- Conversão automática em figurinha, download automático e transcrição.
- Agendamentos de mensagens por horário ou intervalo, com repetição única,
  diária, semanal ou mensal, texto e mídia; bolsa, café, clima, previsão
  aleatória e apuração eleitoral. Cada monitor tem configurações detalhadas
  para ativos, fontes/modo, cidades, horários ou consultas eleitorais. Os
  agendamentos ficam vinculados ao chat ou tópico selecionado.
- Crossplay, com estado da ponte, chats vinculados e preferências de mídia.
- Canal de avisos de comunidade, quando aplicável.

As automações devem ter um indicador explícito de **ativada/desativada** e uma
prévia ou resumo da configuração antes de salvar.

### 5. Atividade, XP e economia

Separar em três cartões/telas próprias:

- **Atividade:** ativar/desativar e consultar o ranking; reset individual ou
  total deve ser tratado como ação irreversível. O painel lista os registros
  existentes com os nomes salvos e permite apagar o registro de um membro ou
  resetar todos os registros deste escopo.
- **XP:** ativar/desativar, silenciar avisos de level-up, escolher o canal ou
  tópico de destino compatível e consultar membros. O painel permite definir,
  acrescentar, retirar ou zerar o XP de um membro ou resetar o XP de todos.
- **Economia:** ativar/desativar sem apagar saldos e consultar as contas locais
  pelo nome salvo. O painel permite definir, acrescentar, retirar ou zerar o
  saldo individual ou resetar os saldos de todos; não altera contas, limites
  nem as regras econômicas.

Não misturar configurações dos sistemas com ações de edição de dados dos
membros.

Na seção de sistemas, o WhatsApp reúne controles de ativação/desativação por
grupo e anuncia cada mudança no próprio grupo, mencionando o administrador que
a fez. Discord e Telegram mostram primeiro as opções gerais do servidor/grupo.
Os controles de escopo e o filtro que limita a lista ao escopo escolhido ficam
no topo da seção. No Discord, escolher uma categoria ou chat também atualiza o
filtro automaticamente; no Telegram, isso ocorre ao escolher um tópico. O
filtro pode ser alterado livremente sem bloquear a navegação entre escopos.
No WhatsApp, o antilink, antimídia e antipalavras podem ser configurados no
grupo e, quando ele pertence a uma comunidade registrada e o recurso suporta
esse escopo, também na comunidade. O menu do antimídia permite escolher os
tipos de mídia bloqueados, ação, mensagem, herança e listas de usuários (e de
cargos no Discord). Se nenhum tipo for marcado, todos os tipos de mídia são
bloqueados. Antipalavras permite editar a lista de palavras/frases, ação,
mensagem, herança e exceções. Antiraid permite ajustar limites de mensagens,
repetições, links, convites, menções e, no Discord, webhooks, além da ação e
listas de exceção, respeitando as opções suportadas em cada plataforma. No Telegram, o
seletor de tópico só é exibido em grupos configurados como fórum. O controle do
antilink inclui um menu próprio para ação, mensagem, herança, exceções e listas
permitidas/bloqueadas, respeitando os campos suportados em cada plataforma;
ações de expulsão/banimento exigem a permissão correspondente do bot.
O bloqueio de comandos permite editar a lista de comandos/categorias, a ação
(avisar, ignorar ou apagar), a mensagem personalizada e a herança por escopo;
apagar mensagens exige a permissão correspondente do bot.
Respostas automáticas têm um menu para manter os gatilhos locais (mensagem
exata, contém ou começa com; resposta de texto ou reação; conteúdo e intervalo
entre respostas) e ativar/desativar o catálogo global oficial. O catálogo
global é somente leitura no painel; o estado geral da automação continua no
controle de ativação/desativação do cartão.
O Auto-download possui uma configuração para excluir, depois do envio da mídia,
a mensagem que continha o link original. O estado de ativação continua no
controle do cartão e as opções aparecem apenas nos escopos suportados pela
plataforma.
Avisos das alterações de configuração no Telegram são enviados no chat
principal, mesmo quando a alteração foi feita em um tópico. No Discord, os
avisos do dashboard são enviados ao canal de logs escolhido no painel ou pelo
comando `logs_chanel`; o ID fica salvo em `settings.logsChannelId` no arquivo
do servidor.
Boas-vindas e despedidas podem ser configuradas no próprio painel: texto,
formato texto/mídia e arquivo de imagem ou vídeo (JPEG, PNG, WebP, GIF ou MP4,
até 8 MB). As variáveis disponíveis no texto são `{user}`, `{mention}`,
`{group}`, `{server}`, `{count}` e `{members}`. No Discord, a ativação continua
respeitando a regra do helper de manter apenas um canal ativo por servidor.
No Discord, proteções compatíveis e transcrição automática também podem ser
configuradas por categoria e canal; boas-vindas, despedidas, Auto-IA e download
automático aparecem no escopo de canal quando suportados. No Telegram, grupos
com tópicos permitem configurações independentes por tópico somente para
recursos cujos helpers suportam esse nível. A seleção de tópicos inclui os que
o bot já observou e registrou, pois a Bot API não permite listar tópicos
desconhecidos. Recursos globais, como atividade, XP e economia, permanecem no
escopo de servidor/grupo. Alterações de texto e mídia preservam o estado de
ativação e os outros campos já armazenados.

### 6. Membros e cargos

- Busca de membro por nome/ID e acesso ao perfil local. A seleção de
  participantes do WhatsApp usa cartões próprios com nome e ID, em vez de uma
  seleção genérica.
- Alteração de cargos/permissões administrativas, respeitando os recursos
  próprios de cada plataforma: cargos do Discord, estado de administrador do
  WhatsApp e níveis de permissão do bot no Telegram.
- Atualização/limpeza de registros de membros que saíram, com prévia do total
   e dos tipos de dados afetados antes da confirmação.

No Discord, a lista de cargos exclui `@everyone`, cargos gerenciados e cargos
que estejam acima do maior cargo do administrador ou do bot. No Telegram, o
painel usa os níveis existentes no helper de administração; no WhatsApp, a ação
altera o estado nativo de administrador do participante.
Os nomes de usuários e de grupos/servidores são atualizados a partir das
mensagens recebidas nos arquivos dos sistemas que já possuem esses registros.
O nome personalizável da Conta Central não é substituído por esses nomes.

### 7. Rankings e relatórios

- Rankings de riqueza, XP e atividade.
- Consulta individual do perfil/posição.
- Links públicos de ranking.
- Relatório da última atualização de membros e pendências.
- Estado consolidado das regras, equivalente ao resumo do comando `status`.

## Compatibilidade verificada no código

Legenda:

- **Comum:** o comando declara suporte às três plataformas ou tem fluxo
  implementado para elas. Ainda pode depender do tipo de grupo/canal e das
  permissões.
- **Discord + Telegram:** disponível nesses dois; não no WhatsApp.
- **WhatsApp + Telegram:** disponível nesses dois; não no Discord.
- **Exclusivo:** recurso específico da plataforma.
- **Condicional:** o código oferece o recurso, mas o escopo ou as permissões
  podem torná-lo indisponível.

| Função | WhatsApp | Telegram | Discord | Observação para o painel |
|---|---|---|---|---|
| Advertir e consultar advertências | Comum | Comum | Comum | O painel mostra IDs e contagens persistidos; punição automática ao atingir o limite depende também da capacidade do bot de expulsar/banir. |
| Kick | Comum | Comum | Comum | No WhatsApp, remove o participante do grupo. |
| Ban | Não disponível | Comum | Comum | Requer permissão do administrador e do bot para banir. |
| Mute/unmute | Não disponível | Disponível | Disponível | A própria descrição dos comandos exclui WhatsApp. |
| Limpar mensagens | Não disponível | Não disponível | Disponível | O comando `clear` é exclusivo do Discord; limita quantidade e idade. |
| Abrir/fechar chat | Condicional | Condicional | Condicional | WhatsApp: grupo, não comunidade. Telegram: grupo/supergrupo. Discord: canal de texto, não thread. |
| Programação de abrir/fechar | Condicional | Condicional | Condicional | Mesmas limitações de escopo do controle manual. |
| Criar link de convite | Condicional | Condicional | Condicional | O comando verifica permissões de convite do usuário e do bot antes de continuar. |
| Marcar membros | Disponível | Não disponível | Disponível | `marcar` declara suporte a WhatsApp e Discord. |
| Proteções antilink/antimídia/antipalavras/anti-raid/bloqueio de comandos | Comum | Comum | Comum | A hierarquia varia: comunidade/grupo no WhatsApp; grupo/tópico no Telegram; servidor/categoria/canal no Discord. |
| Boas-vindas/despedidas | Condicional | Condicional | Condicional | WhatsApp somente em grupos de conversa. Telegram permite chat/tópico. Discord mantém um único canal ativo por servidor. |
| Autoaceitar pedidos de entrada | Disponível | Disponível | Não disponível | Exclusivo de grupos WhatsApp e Telegram. |
| Autofigu | Disponível | Disponível | Não disponível | Exclusivo de grupos WhatsApp e Telegram. |
| Atividade, XP e economia local | Comum | Comum | Comum | Configurações do grupo; XP pode direcionar avisos a canal (Discord) ou tópico (Telegram). |
| Alterar nome/foto do grupo/servidor | Condicional | Condicional | Condicional | Nome tem níveis distintos; no Discord há servidor, categoria e canal/thread. Alterar imagem também exige capacidade do bot. |
| Promover/rebaixar administradores | Exclusivo | Exclusivo | Exclusivo | WhatsApp: `promover`/`rebaixar`; Telegram: `tpromote`/`trebaixar`; Discord: cargos, não promoção genérica. |
| Gerenciar cargos | Não disponível | Não disponível | Exclusivo | Discord: exige Gerenciar cargos e respeitar a hierarquia do bot e do administrador. |
| Atualizar membros que saíram | Comum | Comum | Comum | A limpeza é permanente; no Telegram, membros não verificados devem ser preservados. |
| Crossplay | Condicional | Condicional | Condicional | Faz a ponte entre chats vinculados; depende do sistema e da configuração dos chats. |
| Ranks e perfil local | Comum | Comum | Comum | Exibir só recursos/dados disponíveis no grupo e oferecer link público correspondente. |

**Importante:** “Comum” descreve o alcance observado dos comandos, não garante
que uma determinada operação será possível em qualquer contexto. Permissões
atuais, configuração do grupo e permissões do bot continuam prevalecendo.

## Modelo de permissões recomendado

### Verificação de acesso

Antes de apresentar funções administrativas, verificar se a conta vinculada
participa do grupo e se tem ao menos uma permissão compatível com alguma ação
administrativa do painel. Revalidar os dados ao abrir a tela e em cada
solicitação de alteração.

### Verificação por função

Cada ação deve declarar seus requisitos próprios. Exemplos:

| Ação | Permissão do usuário | Permissão do bot |
|---|---|---|
| Configuração geral de recursos do SatBot | Administrador conforme as regras existentes do comando | Bot conectado e configuração local gravável |
| Apagar mensagens | Gerenciar mensagens | Gerenciar mensagens |
| Kick/ban | Permissão nativa para expulsar/banir | Permissão nativa para expulsar/banir |
| Mute/unmute | Permissão de restringir/moderar | Permissão de restringir/moderar |
| Abrir/fechar | Gerenciar o chat/canal | Alterar permissões/configuração do chat |
| Criar convite | Criar convite | Criar convite |
| Alterar nome/foto | Permissão correspondente ao objeto (servidor, canal ou grupo) | Permissão e capacidade de editar o objeto |
| Alterar cargos/promover | Gerenciar/promover membros | Bot com a mesma permissão e posição hierárquica suficiente |

### Diferenças que a interface deve respeitar

- **Discord:** usar permissões granulares, como Gerenciar mensagens, Expulsar,
  Banir, Moderar membros, Gerenciar servidor, Gerenciar canais e Gerenciar
  cargos. Permissões do canal podem diferir das permissões do servidor.
- **Telegram:** distinguir proprietário de administrador e consultar
  capacidades específicas, como apagar mensagens, restringir membros, convidar
  e promover. Ser administrador, sozinho, não significa poder executar toda
  operação.
- **WhatsApp:** a checagem disponível é principalmente o estado de
  administrador/proprietário do grupo; não há a mesma granularidade de
  permissões por ação. O bot também precisa ser administrador para ações de
  gerenciamento. Comunidades e grupos de conversa têm capacidades distintas.

O painel apresenta um critério amplo de acesso administrativo, mas revalida a
permissão específica no servidor para cada ação. A visibilidade e a autorização
devem continuar correspondendo às permissões reais exigidas pelos comandos e
APIs de cada plataforma.

## Estado do bot e explicação de bloqueios

Cada controle administrativo deve poder distinguir:

1. Usuário sem permissão.
2. Bot sem permissão.
3. Recurso incompatível com a plataforma ou com o escopo.
4. Plataforma indisponível ou erro ao consultar permissões.
5. Recurso disponível e ação concluída.

Não tratar erro de consulta como autorização. Para operações de escrita, falha
na verificação deve bloquear a ação e apresentar uma mensagem objetiva.

## Plano de implementação sugerido

### Fase 1 — Base comum

- Navegação e estado geral do grupo.
- Atividade, XP e economia, que já formam o primeiro conjunto de controles do
  painel web.
- Resumo de permissões do usuário e do bot.
- Avisos de escopo incompatível e confirmação para desativação.

### Fase 2 — Proteção e boas-vindas

- Resumo e configuração de advertências.
- Status e controles simples de antilink, antimídia, antipalavras, anti-raid e
  bloqueio de comandos.
- Welcome/goodbye com texto, modo, estado e upload/remoção de mídia.

### Fase 3 — Moderação segura

- Advertir, kick e ban primeiro.
- Mute/unmute somente em Telegram e Discord.
- Ações sempre vinculadas a um membro escolhido no próprio grupo e validadas
  pela plataforma; evitar aceitar IDs arbitrários sem confirmação do alvo.
- Limpeza de mensagens primeiro no Discord, onde o comando já é suportado.

### Fase 4 — Membros e plataforma

- Cargos do Discord, promoção do Telegram e promoção do WhatsApp como
  experiências nativas distintas.
- Renomear, foto, convite e abrir/fechar com controles condicionais.
- Relatórios, atualização de membros, resets e gestão avançada de economia
  somente com resumo e confirmação explícitos.

### Fase 5 — Automações e ferramentas avançadas

- Autoaceitar e Autofigu em WhatsApp/Telegram.
- Agendamentos, autorrespostas, Auto-IA, transcrição, download automático,
  monitores e Crossplay.
- Recursos com formulários complexos podem abrir o tutorial do comando em vez
  de receber uma interface simplificada que não exponha todas as opções.

## Inventário de comandos administrativos existente

Esta lista serve como referência para a cobertura do painel; não é uma promessa
de implementação de todos os subcomandos na interface.

- **Ações imediatas:** `abrirchat`, `fecharchat`, `afk`, `ban`, `kick`, `mute`,
  `unmute`, `warn`, `unwarn`, `warns`, `clear`, `d`, `link`, `marcar`,
  `lembrete`.
- **Proteção:** `antilink`, `antimedia`, `antipalavras`, `antiraid`,
  `blockcmd`.
- **Configurações do grupo:** `agendar`, `atividade`, `autoabrir`,
  `autoaceitar`, `autofigu`, `autoia`, `autorepo`, `autotranscrever`,
  `crossplay`, `economia`, `goodbye`, `monitorbolsa`, `monitorcafe`,
  `monitorclima`, `monitoreleicao`, `rclima`, `setgroup_c`, `setimg_chat`,
  `setname`, `status`, `warnconfig`, `welcome`, `xpconfig`.
- **Membros e cargos:** `atualizar_membros`, `darcargo`, `removecargo`,
  `promover`, `rebaixar`, `tpromote`, `trebaixar`.
- **Atividade e rankings:** `rank`, `rankinfo`, `resetatividade`,
  `resetatividadetodos`, `gerarlink_rankativos`,
  `gerarlink_rankativos_all`, `gerarlink_rankcoins`, `gerarlink_rankxp`.
- **XP:** `darxp`, `remxp`, `setxp`, `resetxp`, `resetxptodos`.
- **Economia avançada:** `configloja2`, `pedidos`, `entregar`, `darsatcoin`,
  `remsatcoin`, `setsatcoin`, `resetsatcoins`, `resetsatcoinstodos`.

Há também recursos administrativos especiais, como edição de ações de RP, que
devem ser considerados separadamente ao planejar uma interface própria
(`act_edit` e `actG_edit`).

## Referências no projeto

- Comandos administrativos e categorias: [`commands/adm/`](../commands/adm/)
- Lista atual para usuários: [`docs/tutoriais/comandos-adm.md`](./tutoriais/comandos-adm.md)
- Permissões e capacidades da plataforma: [`platforms/`](../platforms/)
- Painel web e painel local: [`functions/webServer.js`](../functions/webServer.js)
