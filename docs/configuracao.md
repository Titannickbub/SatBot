# Configuração

Para configurar o bloqueio de mensagens privadas e a lista de chats
autorizados, consulte [Anti-PV e OnlyChats](./antipv-onlychats.md).

## Super Usuários

Super Usuários (SU) são as pessoas com privilégios globais de administração
do Sat Bot. O bot identifica cada SU pela combinação da plataforma em que a
pessoa está usando o bot e do ID dessa conta. Por isso, ser SU no WhatsApp,
por exemplo, não torna automaticamente a conta da mesma pessoa no Telegram ou
Discord um SU.

## Como descobrir um ID

Use o comando `!id` na própria plataforma em que pretende dar ou remover o
acesso:

```text
!id
```

O bot responde com o ID da conta que enviou o comando. Para descobrir o ID de
outra pessoa, mencione-a ou responda a uma mensagem dela:

```text
!id @pessoa
```

No Telegram, selecione a pessoa nas sugestões de menção ou responda a uma
mensagem dela. Digitar somente `@username` não permite obter o ID numérico.

O resultado do `!id` pertence à plataforma atual. Use esse ID com o nome da
mesma plataforma: `discord`, `telegram` ou `whatsapp`.

## Adicionar um Super Usuário

O primeiro Super Usuário é registrado com o código exibido no terminal na
inicialização do bot:

```text
!su code <CÓDIGO>
```

Depois disso, qualquer SU já cadastrado pode adicionar outra conta. Primeiro,
obtenha o ID da pessoa na plataforma desejada e então execute:

```text
!su add <plataforma> <ID>
```

Exemplos:

```text
!su add discord 123456789012345678
!su add telegram 123456789
!su add whatsapp 5511999999999@s.whatsapp.net
```

O bot responde `✅ Super usuário adicionado.` quando o cadastro é feito. Se
essa combinação de plataforma e ID já estiver cadastrada, responde
`❌ Usuário já cadastrado.`.

Se a mesma pessoa precisar dos privilégios em mais de uma plataforma, repita
o cadastro com o ID próprio de cada uma. O comando `!su list` mostra os
Super Usuários cadastrados, com plataforma, nome/username quando disponível
e ID:

```text
!su list
```

## Remover um Super Usuário

Qualquer Super Usuário pode remover um cadastro usando a plataforma e o ID
exatos:

```text
!su del <plataforma> <ID>
```

Exemplo:

```text
!su del telegram 123456789
```

Se a conta for encontrada, o bot responde `✅ Super usuário removido.`; se
não, responde `❌ Usuário não encontrado.`. O comando não permite remover o
último Super Usuário cadastrado. Para retirar o acesso de alguém em várias
plataformas, remova cada combinação de plataforma e ID.

## O que um Super Usuário pode fazer

- Administrar a lista de Super Usuários: consultar, adicionar e remover
  cadastros.
- Registrar tokens de Discord e Telegram com `!su token` e solicitar login
  do WhatsApp com `!su whatsapp`.
- Usar comandos de administração global do bot, incluindo configurações e
  ações que normalmente exigem permissão de administrador no grupo ou
  servidor. O alcance depende do comando.
- Reiniciar o bot com `!su restart`.

Os privilégios de SU são reconhecidos globalmente pelo bot; não dependem de a
conta ser administradora do grupo ou servidor atual. Isso não concede ao SU
acesso à conta pessoal da plataforma, mas permite controlar recursos e dados
gerenciados pelo bot.

## Aviso de segurança

Cadastre somente pessoas de confiança e confirme cuidadosamente a plataforma
e o ID antes de adicionar alguém. Um ID errado pode conceder privilégios à
conta de outra pessoa.

Não há níveis nem hierarquia entre Super Usuários: qualquer SU pode adicionar
outros SUs e remover cadastros existentes, exceto que o último SU não pode
ser removido pelo comando. Assim, cada pessoa adicionada poderá conceder
privilégios a terceiros e administrar o bot. Se alguém não precisar mais
desse acesso, remova seu cadastro com `!su del`.

Não compartilhe o código de primeiro acesso, tokens de bots, arquivos de
configuração nem sessões autenticadas. Os comandos deste guia usam o prefixo
padrão `!`; se ele tiver sido alterado, substitua `!` pelo prefixo configurado.

## Desativar ou reativar uma plataforma

Um Super Usuário pode desligar uma plataforma que não está sendo usada sem
remover suas credenciais de login. Use:

```text
!config plataforma <discord|telegram|whatsapp> off
```

Por exemplo, para desativar temporariamente o Telegram:

```text
!config plataforma telegram off
Bot: ✅ Plataforma telegram desativada.

⚠️ Reinicie Sat Bot.
```

Reinicie o bot para aplicar a alteração. Enquanto estiver desativada, essa
plataforma não será iniciada pelo bot. Os tokens e a sessão autenticada são
preservados.

Para ligar a plataforma novamente, use `on` no lugar de `off`:

```text
!config plataforma telegram on
Bot: ✅ Plataforma telegram ativada.

⚠️ Reinicie Sat Bot.
```

Depois de reiniciar, o bot volta a conectar usando as credenciais que já
estavam salvas; não é necessário fazer o login novamente, desde que a sessão
ou o token ainda sejam válidos. O mesmo comando serve para Discord, Telegram
e WhatsApp.

## Alterar o prefixo global

Se outro bot no mesmo grupo ou servidor, como Loritta, Nekotina ou outro,
também responder ao prefixo `!`, um Super Usuário pode trocar o prefixo do Sat
Bot:

```text
!config prefix <novo-prefixo>
```

Por exemplo, para mudar para `sat!`:

```text
Você: !config prefix sat!
Bot: ✅ Prefixo alterado para:

sat!

⚠️ Reinicie Sat Bot.
```

A alteração vale para o bot inteiro em todas as plataformas. Reinicie-o para
aplicar: se iniciou com `start.bat` ou `bash start.sh`, o processo será
iniciado novamente automaticamente; se iniciou com `node index.js`, execute
esse comando outra vez. Após o reinício, use o novo prefixo:

```text
sat!menu
sat!config status
```

O formato aceito é qualquer texto não vazio e sem espaços, incluindo um
símbolo (`#`, `$`, `.`) ou uma combinação de letras e símbolos (`sat!`,
`bot#`). Prefira um prefixo curto, fácil de digitar e diferente dos prefixos
usados pelos outros bots do grupo. Por exemplo, `sat!` tende a evitar
conflitos com bots que usam `!`, `.` ou `#`. Evite usar um prefixo comum no
mesmo chat.

Para verificar qual prefixo está ativo:

- **Discord:** use o comando de barra `/start`.
- **Telegram:** envie `/start` ao bot.
- **WhatsApp:** ainda não há um comando `/start` para consultar o prefixo.
  Consulte o valor `prefix` em `settings/config.json` ou veja-o com `/start`
  no Discord ou Telegram conectados ao mesmo bot.

Ao esquecer o prefixo, não é possível executar `!config prefix` com um valor
antigo e esperar que ele seja reconhecido: primeiro descubra o valor atual e
use-o no comando. A alteração também só pode ser feita por um Super Usuário.

## Tempo de aquecimento inicial (`ignoreinitial`)

O tempo de aquecimento é um intervalo contado desde que o bot inicia. Durante
esse período, mensagens recebidas são mostradas no console, mas não são
processadas pelo bot — comandos também são ignorados. Isso ajuda a evitar que
mensagens antigas ou acumuladas durante a conexão sejam executadas logo após
uma reinicialização.

Um Super Usuário pode configurar o intervalo com:

```text
!config ignoreinitial <tempo>
```

Exemplos:

```text
!config ignoreinitial 30s
!config ignoreinitial 2m
!config ignoreinitial 1h
!config ignoreinitial 0
```

São aceitos segundos (`s`), minutos (`m`) e horas (`h`), por exemplo `45s`,
`5m` ou `2h`. Um número sem unidade também representa segundos. O padrão é
`30s`. Configure `0` para não ignorar mensagens durante a inicialização.

Ao alterar o valor, o bot responde com o intervalo configurado:

```text
Bot: ✅ Tempo de aquecimento inicial alterado para: *2m (120s)*.

⚠️ Mensagens recebidas no período de aquecimento após ligar o bot serão ignoradas (mas continuarão visíveis no console).
```

A mudança é salva e passa a valer imediatamente, sem reiniciar o bot. No
console, as mensagens ignoradas aparecem com um registro semelhante a:

```text
⏳[CORE] Mensagem ignorada (carregamento inicial / warmup: 5.2s / 2m (120s))
```

Quando o período termina, o console informa que as mensagens voltam a ser
processadas normalmente. O intervalo é global para o bot, não uma configuração
separada para cada plataforma.
