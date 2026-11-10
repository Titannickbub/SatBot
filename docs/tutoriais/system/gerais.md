# ⚙️ Comandos gerais do System

<p><a href="../system.md">← Voltar ao menu System</a> · <a href="../../tutoriais.md">Tutoriais</a></p>

Estes comandos aparecem diretamente em `!menu system`. O prefixo nos exemplos
é `!`.

## 🏓 `!ping` — latência e tempo de atividade

Consulta a velocidade de resposta do bot, a latência reportada pela API da
plataforma e o uptime do processo:

```text
!ping
```

- **Latência de mensagem:** tempo de processamento da mensagem.
- **Latência da API:** tempo de resposta da plataforma, quando disponível.
- **Uptime:** tempo desde a inicialização atual do bot.

O comando é somente de consulta e não exige argumentos nem permissão SU.

## 🤖 `!botname` — nome público do bot

Sem argumentos, consulta o nome atual:

```text
!botname
```

Para alterá-lo, informe o novo nome:

```text
!botname Satela
!botname Sat Bot
```

Disponível apenas para superusuários. A alteração é aplicada imediatamente
em menus, menções e respostas da IA. Aliases: `!setbotname` e `!nomebot`.

## 🎭 `!discordemoji` — traduções de emojis do Discord

Este comando mantém um dicionário usado para traduzir emojis personalizados
do Discord para emojis padrão em mensagens que circulam entre plataformas
(crossplay). Consulte os registros com:

```text
!discordemoji
!discordemoji list
```

Adicione ou atualize uma tradução usando o emoji e o equivalente padrão:

```text
!discordemoji <:pepehappy:123456789012345678> 😊
!discordemoji pepehappy 😊
!discordemoji add pepehappy 😊
```

Também aceita links de emojis do Vencord:

```text
!discordemoji [NaoSmile](https://cdn.discordapp.com/emojis/123456789012345678.png) 😅
```

Remova um registro pelo nome, ID ou emoji:

```text
!discordemoji remove pepehappy
!discordemoji del pepehappy
```

A listagem é pública; somente administradores do chat e superusuários podem
adicionar ou remover traduções. Emojis sem tradução podem ser substituídos por
⚠️ ou enviados como imagem quando aparecem sozinhos. Aliases:
`!setemoji` e `!emojidict`.

## 👑 `!set_vip` — assinaturas e acesso VIP

Comando exclusivo de superusuários para consultar e administrar assinaturas,
comandos liberados e áreas em modo VIP-only. O usuário-alvo pode ser indicado
por ID, menção ou ID da Conta Central, conforme disponível:

```text
!set_vip check @usuario
!set_vip check 123456789
```

### Duração da assinatura

```text
!set_vip set @usuario 15d
!set_vip add @usuario 2h 30m
!set_vip rem @usuario 5d
!set_vip date @usuario 31/12/2026 23:59
!set_vip perm @usuario
!set_vip reset @usuario
```

- `set` substitui a duração existente e começa a contar a partir de agora.
- `add` acrescenta tempo à assinatura.
- `rem` desconta tempo restante.
- `date` define uma expiração exata no formato `dd/mm/aaaa`, com hora
  opcional `hh:mm`.
- `perm` concede VIP permanente.
- `reset` (ou `cancel`) remove o VIP.

Unidades aceitas: `d` (dias), `h` (horas) e `m` (minutos), que podem ser
combinadas, como `15d 12h 30m`.

### Comandos e áreas exclusivas

```text
!set_vip listcmd
!set_vip addcmd play
!set_vip remcmd play
```

`addcmd` e `remcmd` incluem ou removem comandos da lista de comandos VIP.
Para consultar quais estão configurados, use `listcmd`.

O bypass de Anti-PV pode ser controlado por plataforma:

```text
!set_vip pv on whatsapp
!set_vip pv off telegram
```

O modo VIP-only pode ser aplicado ao chat atual, servidor ou categoria atual:

```text
!set_vip chat on
!set_vip server on
!set_vip categorie on
```

Use `off` no mesmo escopo para desativar. Os comandos de escopo dependem de
estar no chat, servidor ou categoria que deseja configurar. Alias:
`!setvip`.

## 🌐 `!actG_edit` — catálogo global de ações RP

Administra o catálogo de ações de roleplay compartilhado entre grupos e
servidores. Apenas superusuários podem usar a versão global; ações locais
podem ter precedência no chat quando usam o mesmo nome ou alias.

```text
!actG_edit list
!actG_edit new wave
!actG_edit message wave {user1} acenou para {user2}!
!actG_edit alias wave oi
!actG_edit enable wave
```

O editor global aceita os mesmos tipos de operações do editor local:
criar ações, adicionar frases e mídias, configurar aliases, inspecionar,
ativar, desativar e excluir. Consulte
[o guia detalhado do editor de ações](../act_edit.md) para limites, variáveis,
formatos aceitos e demais subcomandos.

Aliases globais: `!actedit`, `!act_inspect`, `!actinspect`, `!actedit_G`,
`!act_inspect_G` e `!actinspect_G`.
