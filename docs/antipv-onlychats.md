# Anti-PV e OnlyChats

Os comandos deste guia usam o prefixo padrão `!`. Se ele foi alterado, use o
prefixo atual do bot. A configuração desses recursos é restrita a Super
Usuários e é salva imediatamente, sem precisar reiniciar o bot.

## Anti-PV

O Anti-PV controla como o bot trata mensagens privadas (PV). Use-o para
desativar o atendimento por mensagem direta, por exemplo quando quiser que o
bot funcione somente em grupos, servidores ou canais públicos.

Quando ativado, mensagens privadas de usuários não liberados não são
processadas. Isso evita que comandos e outras funções do bot sejam executados
no PV. O Anti-PV não impede que alguém envie uma mensagem para a conta do bot;
ele controla o processamento da mensagem pelo Sat Bot.

Por padrão, o Anti-PV está desativado. Para consultar o estado e as listas
atuais:

```text
!antipv status
```

Ative ou desative o recurso:

```text
!antipv on
!antipv off
```

### Comportamento no PV bloqueado

Escolha o modo `ignore` para ignorar sem responder, ou `reply` para enviar uma
mensagem de aviso:

```text
!antipv mode ignore
!antipv mode reply
!antipv msg ⚠️ O atendimento no PV está desativado. Fale com o bot em um grupo autorizado.
```

No modo `reply`, a mensagem padrão informa que o atendimento privado está
desativado; `msg` permite personalizá-la. Também é possível definir uma mídia
para acompanhar o aviso enviando uma foto, vídeo, áudio ou documento com o
comando na legenda, respondendo a uma mensagem com mídia ou fornecendo uma URL
pública:

```text
!antipv media
```

Para remover a mídia salva:

```text
!antipv media none
```

### Liberar usuários ou comandos

Super Usuários sempre passam pelo Anti-PV. Também é possível liberar usuários
específicos usando o ID da conta na plataforma onde o bot recebeu a mensagem:

```text
!antipv allowuser add <ID>
!antipv allowuser list
!antipv allowuser remove <ID>
```

Ou responda à mensagem da pessoa ao executar o comando, sem informar o ID:

```text
!antipv allowuser add
```

Para liberar somente determinados comandos no PV:

```text
!antipv allowcmd add ping
!antipv allowcmd list
!antipv allowcmd remove ping
```

O comando `autodownload` e seus aliases `downloadlink` e `adl` também passam
pelo Anti-PV.

### Bypass de PV para usuários VIP

O `!set_vip` permite que Super Usuários gerenciem VIPs e habilitem o bypass de
PV para todos os VIPs de uma plataforma. Para conceder VIP, consulte o status
ou veja todos os subcomandos e limitações, acesse a página
[VIP e `set_vip`](./setvip.md).

Por padrão, ter VIP não libera automaticamente mensagens privadas. Para
permitir que **todos os VIPs ativos** em uma plataforma usem o bot no PV,
ative o bypass naquela plataforma:

```text
!set_vip pv on whatsapp
!set_vip pv on telegram
!set_vip pv on discord
```

Para desativá-lo novamente:

```text
!set_vip pv off whatsapp
```

Essa opção é global por plataforma, não individual: com o bypass do WhatsApp
ativo, qualquer usuário com VIP válido no WhatsApp passa pelo Anti-PV. Ela não
concede VIP; cada pessoa ainda precisa ter um VIP ativo ou permanente. Mesmo
com bypass, o Anti-PV precisa estar ativado para controlar as outras mensagens
privadas.

**Atenção:** um usuário ou comando liberado pode continuar usando no PV as
funções disponíveis para ele. Libere apenas o que for necessário. A lista de
usuários guarda somente o ID, sem associá-lo a uma plataforma; se o mesmo ID
existir em outra plataforma conectada, essa conta também poderá ser liberada.

## OnlyChats

OnlyChats restringe em quais chats, grupos, servidores, canais, categorias ou
tópicos o bot pode responder. Use-o, por exemplo, para limitar a operação do
bot a uma comunidade ou a canais aprovados.

Por padrão, OnlyChats está desativado. Quando ativado, mensagens em contextos
que não correspondem à lista autorizada são ignoradas, ou recebem um aviso se
o modo `reply` estiver configurado. Mensagens privadas não são afetadas por
OnlyChats; elas são controladas separadamente pelo Anti-PV. Super Usuários
podem usar o bot em qualquer chat.

Consulte o estado e a lista de permissões com:

```text
!onlychats list
```

Ative ou desative a restrição global:

```text
!onlychats on
!onlychats off
```

Ao ativar OnlyChats, cadastre antes os contextos onde o bot deve funcionar.
Tipos aceitos:

- `server`: servidor ou comunidade.
- `categoria`: categoria de canais.
- `chat`: grupo ou canal.
- `topico`: tópico ou thread.
- `comando`: comando que pode ser executado mesmo fora dos contextos liberados.

Para autorizar o chat, servidor, categoria ou tópico atual, execute o comando
nele sem informar um ID. O bot tentará detectar o contexto; essa detecção
depende das informações fornecidas pela plataforma:

```text
!onlychats add chat
!onlychats add server
!onlychats add categoria
!onlychats add topico
```

Se o contexto não puder ser detectado automaticamente, informe o ID e,
opcionalmente, um nome para facilitar a identificação na lista:

```text
!onlychats add chat <ID> <nome>
!onlychats add server <ID> <nome>
```

Veja os itens cadastrados com `!onlychats list`. Para remover um item, use o
tipo e o ID (ou, no caso de comandos, o nome):

```text
!onlychats del chat <ID>
!onlychats del server <ID>
```

Também é possível permitir comandos individualmente fora dos chats
autorizados:

```text
!onlychats allowcmd add ping
!onlychats allowcmd list
!onlychats allowcmd del ping
```

Use esse recurso com cuidado: comandos adicionados à lista de exceções podem
ser executados em chats que não estão na lista autorizada. Revise a lista com
`!onlychats list` e remova exceções que não forem mais necessárias.

### Modo e aviso

Em contextos não autorizados, `ignore` bloqueia em silêncio. `reply` envia uma
mensagem de aviso:

```text
!onlychats mode ignore
!onlychats mode reply
!onlychats msg ⚠️ Este bot não está autorizado a responder neste chat.
```

O modo de aviso não libera o chat: o bot envia a mensagem configurada e
continua bloqueando o processamento normal.

## Diferença entre os dois recursos

- **Anti-PV:** controla mensagens privadas.
- **OnlyChats:** controla grupos, servidores, canais e tópicos; não restringe
  mensagens privadas.

Eles podem ser usados ao mesmo tempo: OnlyChats limita os locais públicos
autorizados e Anti-PV controla quem pode interagir com o bot em conversa
privada.
