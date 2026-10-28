[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como abrir e fechar o chat

Os comandos `!abrirchat` e `!fecharchat` alteram quem pode enviar mensagens
no grupo ou canal atual. Use `!abrirchat` para permitir que os membros
conversem e `!fecharchat` para restringir o envio a administradores.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e onde funciona

Quem executa o comando precisa ser administrador ou ter permissão para
gerenciar o chat. O próprio bot também precisa dessa permissão na plataforma.

Os comandos funcionam em:

- **WhatsApp:** grupos; não funcionam em comunidades.
- **Telegram:** grupos e supergrupos.
- **Discord:** canais de texto; não funcionam em threads.

Eles não funcionam em conversas privadas. A plataforma também precisa permitir
que o bot controle o estado do chat.

## Usar o painel web

No painel administrativo, use os botões **Abrir chat** e **Fechar chat**:

- **WhatsApp:** a ação é aplicada diretamente ao grupo aberto no painel; não
  é necessário selecionar o grupo novamente.
- **Discord:** selecione um canal de texto ou anúncios antes de executar a
  ação. Threads não são aceitas.

O painel mostra se o chat está aberto ou fechado e exibe somente o botão da
ação oposta. Depois da tentativa, informa se a alteração foi aplicada ou se o
chat já estava no estado solicitado.

As alterações feitas pelo painel não têm prazo automático. Para programar uma
reversão, use os comandos no chat com uma duração ou horário.

## Abrir ou fechar sem prazo

Sem informar um horário ou duração, a alteração permanece até alguém executar
o comando oposto ou até outra programação alterar o estado:

```text
!abrirchat
!fecharchat
```

Por exemplo, use `!fecharchat` para encerrar a conversa durante a noite e
`!abrirchat` no dia seguinte para liberar as mensagens novamente.

## Alteração temporária

Passe uma duração para reverter automaticamente a ação. Ao abrir
temporariamente, o chat será fechado ao fim do período; ao fechar
temporariamente, ele será aberto:

```text
!fecharchat 2h
!abrirchat 30m
```

As durações aceitam dias (`d`), horas (`h`) e minutos (`m`), inclusive
combinados, sem espaços:

```text
!fecharchat 1d
!abrirchat 2h30m
!fecharchat 45m
```

O período mínimo é de 1 minuto. A reversão é agendada pelo bot; mantenha-o em
execução para que a ação programada seja aplicada.

## Usar um horário

Em vez de uma duração, informe um horário no formato `HH:MM`:

```text
!fecharchat 22:00
!abrirchat 08:00
```

O comando altera o estado agora e agenda a reversão para esse horário. Se o
horário informado já tiver passado no dia atual, a reversão será no dia
seguinte. O horário usa a hora local do servidor e precisa estar a pelo menos
1 minuto de distância.

## Dicas e diferenças

- Se o chat já estiver no estado pedido, o bot informa que não houve mudança.
- Executar novamente qualquer um dos comandos cancela a reversão temporária
  anterior desse chat, mesmo que o estado pedido já esteja ativo.
- Esses comandos fazem alterações manuais ou temporárias. Para repetir
  horários semanalmente, use `!autoabrir`; consulte
  `!autoabrir ajuda` para ver a configuração da programação.
- Também é possível consultar a ajuda diretamente no chat com
  `!abrirchat ajuda` ou `!fecharchat ajuda`.
