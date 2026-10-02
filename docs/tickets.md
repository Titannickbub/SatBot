# Plano de tickets multiplataforma

## Objetivo

Criar um sistema de atendimento que mantenha o mesmo ciclo de vida nas três
plataformas, mas use a interface mais natural de cada uma:

- **Discord:** um canal privado por ticket, com botões e categoria de suporte.
- **Telegram:** um tópico de fórum por ticket, com botões e possibilidade de
  continuar o atendimento no privado.
- **WhatsApp:** fluxo orientado por comandos e mensagens, com encaminhamento
  para um grupo de atendentes ou para uma conversa privada.

Não é necessário forçar a mesma experiência visual nas três plataformas. O que
deve ser igual é o estado do ticket, as regras de acesso, o histórico e as
ações administrativas.

## Conceito comum

Cada ticket representa uma solicitação de atendimento e possui:

```text
id              Identificador interno e número público, por exemplo #1042
platform        discord | telegram | whatsapp
originChatId    Chat/grupo em que o ticket foi aberto
originUserId    Usuário que abriu o ticket
assignedTo      Atendente responsável, opcional
subject         Assunto informado pelo usuário
status          open | waiting_user | waiting_staff | closed
priority        low | normal | high
createdAt       Data de criação
updatedAt       Última movimentação
closedAt        Data de encerramento, quando aplicável
closedBy        Usuário ou atendente que encerrou
```

O conteúdo das mensagens pode continuar na plataforma de origem. O banco
precisa armazenar pelo menos os eventos importantes (abertura, atribuição,
mudança de status, transferência e encerramento) para auditoria e relatórios.

## Ciclo de vida

1. Usuário abre um ticket.
2. O bot confirma a abertura e informa o número do ticket.
3. O ticket entra como `open` e fica disponível para os atendentes.
4. Um atendente assume o ticket; o status passa para `waiting_staff` ou
   permanece `open`, conforme a regra escolhida.
5. O atendente responde e pode marcar `waiting_user`.
6. O usuário responde e o ticket volta para `waiting_staff`.
7. Qualquer lado pode solicitar encerramento.
8. O bot confirma o encerramento e mantém o histórico como somente leitura.
9. Um ticket fechado pode ser reaberto por uma janela configurável, por
   exemplo 24 horas, ou pode gerar um novo ticket.

### Regras recomendadas

- Um usuário pode ter no máximo um ticket aberto por plataforma e contexto.
- O usuário pode fechar o próprio ticket.
- Somente atendentes autorizados podem assumir, transferir, priorizar e
  visualizar tickets de outras pessoas.
- O ticket deve ser identificado pelo ID interno, nunca apenas pelo nome do
  usuário.
- O encerramento deve exigir confirmação para evitar cliques acidentais.
- Tickets inativos devem receber lembrete e, depois, encerramento automático.
- Toda mudança de status deve ser registrada em uma tabela de eventos.

## Discord

### Experiência do usuário

O usuário executa `/ticket` ou `!ticket`, opcionalmente informando o assunto.
O bot cria um canal de texto privado dentro de uma categoria configurada:

```text
Suporte
├── ticket-1042
├── ticket-1043
└── ticket-1044
```

O canal deve ser visível apenas para:

- usuário que abriu o ticket;
- cargo ou cargos de atendentes;
- bot.

Na primeira mensagem do canal, o bot publica o assunto, o número e os botões:

- **Assumir**
- **Transferir**
- **Marcar como aguardando usuário**
- **Fechar ticket**

### Vantagens

- Isolamento de permissões já suportado nativamente pelo Discord.
- Histórico completo fica no próprio canal.
- Botões e modais tornam o fluxo simples para usuário e equipe.
- Pode haver um painel fixo com botão “Abrir ticket”.

### Cuidados

- Limitar a quantidade de canais para não atingir limites do servidor.
- Reutilizar ou arquivar canais antigos quando fizer sentido.
- Verificar permissões do bot para criar canais, gerenciar permissões e
  enviar mensagens.
- Não depender apenas do nome do canal; armazenar o ID do canal no ticket.
- Ao fechar, remover o acesso do usuário ou mover o canal para uma categoria de
  arquivados antes de apagar, conforme a política de retenção.

## Telegram

### Opção recomendada: grupo de suporte com tópicos

O bot utiliza um supergrupo configurado como fórum. Cada ticket cria um tópico
com o título:

```text
#1042 - José Vitor - Problema no comando welcome
```

O usuário pode abrir o ticket por comando em conversa privada ou no grupo de
suporte. O bot cria o tópico, fixa a mensagem inicial e utiliza botões inline:

- **Assumir ticket**
- **Aguardando usuário**
- **Fechar**
- **Reabrir**

Os atendentes trabalham no tópico. O bot pode restringir quem pode escrever
diretamente no grupo e usar o tópico como fila de atendimento.

### Alternativa: atendimento via conversa privada

Se a instalação não utilizar grupos com fórum, o bot pode receber `/ticket` no
privado e encaminhar cada nova mensagem para um grupo privado de atendentes,
incluindo o número do ticket e o usuário de origem. Respostas dos atendentes
devem usar um botão ou comando de resposta para que o bot encaminhe o texto ao
usuário correto.

Essa alternativa é mais compatível, mas exige um roteamento explícito das
respostas e é menos transparente que um tópico.

### Cuidados

- Tópicos dependem de o grupo estar configurado como fórum.
- O bot precisa ser administrador para criar, fechar e editar tópicos.
- Guardar `chatId` e `message_thread_id`; o segundo é o identificador do ticket
  no fórum.
- Validar se o usuário ainda pode receber mensagens privadas antes de
  encaminhar respostas.
- Usar callback queries para ações e responder cada callback, evitando
  botões presos em estado de carregamento.

## WhatsApp

O WhatsApp não oferece canais privados, tópicos ou botões com a mesma
flexibilidade. A melhor abordagem é assumir um fluxo conversacional.

### Opção recomendada: triagem em conversa privada + grupo de atendentes

O usuário envia:

```text
!ticket
```

O bot responde com um pequeno menu textual:

```text
1 - Abrir atendimento
2 - Ver meu ticket
3 - Fechar meu ticket
4 - Falar sobre um ticket existente
```

Após a abertura, o bot coleta o assunto e cria o ticket. As mensagens do
usuário ficam associadas ao ticket e são encaminhadas para um grupo configurado
de atendentes. Cada encaminhamento deve conter:

```text
[TICKET #1042]
Usuário: José Vitor
Assunto: Problema no comando welcome
Mensagem: ...
```

O atendente responde no grupo usando uma convenção clara:

```text
!responder 1042 texto da resposta
!assumir 1042
!aguardar 1042
!fechar 1042
```

O bot encaminha a resposta para a conversa privada do usuário.

### Alternativa: ticket dentro do grupo de origem

Em grupos que utilizam o bot, pode-se permitir `!ticket assunto`. Nesse caso,
o bot cria o ticket, mas deve evitar publicar dados sensíveis no grupo. A
confirmação deve convidar o usuário a continuar no privado:

```text
Ticket #1042 criado. Continue a conversa no privado do bot.
```

### Cuidados

- Não criar um grupo novo para cada ticket; isso seria difícil de administrar.
- Não expor o número de telefone ou a mensagem completa do usuário para
  pessoas que não sejam atendentes.
- Normalizar JID/LID e armazenar o identificador real usado para responder.
- Tratar mensagens sem texto, mídia, áudio e documentos como eventos do ticket.
- Adicionar limite de frequência para impedir spam de abertura de tickets.
- Se o grupo de atendentes estiver indisponível, informar o erro ao usuário e
  manter o ticket aberto para nova tentativa.
- O grupo de atendentes deve ser configurável por instalação, não codificado no
  comando.

## Arquitetura sugerida

### Camada comum

Criar um serviço independente da plataforma, por exemplo
`functions/ticketService.js`, responsável por:

- criar e buscar tickets;
- aplicar limite de tickets abertos;
- alterar status;
- assumir e transferir;
- registrar eventos;
- gerar número público;
- encontrar o ticket ativo de um usuário;
- fechar e reabrir;
- aplicar regras de inatividade.

O serviço não deve chamar diretamente APIs do Discord, Telegram ou WhatsApp.
Ele recebe dados normalizados e retorna o novo estado.

### Adaptadores de plataforma

Cada plataforma teria um adaptador próprio:

```text
functions/ticketService.js       Regras e persistência comuns
functions/ticketPermissions.js   Permissões de atendentes
platforms/discord.js              Canal, botões, permissões e respostas
platforms/telegram.js             Tópicos, callbacks e respostas
platforms/whatsapp.js             Comandos, roteamento e encaminhamento
```

Os adaptadores devem converter a mensagem nativa para o formato comum já usado
no projeto (`platform`, `chatId`, `userId`, `text`, `raw`, `quoted`) e chamar o
serviço. Isso evita duplicar as regras de negócio.

### Persistência

Se o projeto já utiliza a camada de configuração/banco existente, adicionar
tabelas ou coleções específicas para:

- `tickets`;
- `ticket_events`;
- `ticket_settings`;
- opcionalmente `ticket_messages`, caso seja necessário guardar uma cópia das
  mensagens fora da plataforma.

Configurações importantes:

- grupo/categoria de atendentes;
- cargos ou IDs de atendentes;
- prefixo e próximo número;
- limite por usuário;
- tempo de lembrete e encerramento automático;
- retenção de tickets fechados;
- plataforma habilitada.

## Plano de implementação

### Fase 1 — núcleo

- Definir o modelo de ticket e os estados.
- Implementar persistência e `ticketService`.
- Implementar permissões e eventos de auditoria.
- Criar comandos administrativos para configurar atendentes.

### Fase 2 — Discord

- Criar comando e painel de abertura.
- Criar canal privado e permissões.
- Adicionar botões, modais e encerramento.
- Testar reexecução do bot sem perder os canais vinculados.

### Fase 3 — Telegram

- Implementar tópicos de fórum.
- Adicionar callbacks inline.
- Implementar fallback por conversa privada caso fórum não esteja disponível.

### Fase 4 — WhatsApp

- Implementar menu textual e coleta do assunto.
- Implementar grupo de atendentes e roteamento por número.
- Adicionar suporte a respostas com texto e mídia.

### Fase 5 — operação

- Lembretes e encerramento automático.
- Exportação ou consulta do histórico.
- Métricas: tickets abertos, tempo até primeira resposta e tickets por
  atendente.
- Testes de reconexão, mensagens duplicadas e falha de permissões.

## Decisão recomendada para o MVP

Começar pelo Discord, porque ele fornece o melhor isolamento e a melhor
experiência de ticket. Em seguida implementar Telegram usando tópicos de
fórum. Deixar WhatsApp com o fluxo de grupo de atendentes, sem tentar simular
um canal privado por ticket.

Assim, as três plataformas entregam a mesma capacidade de atendimento, mas cada
uma respeita suas limitações e seus recursos nativos.
