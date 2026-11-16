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

## 👑 VIP local e VIPG global

`!vip` consulta o VIP local do grupo/servidor atual e o VIPG da Conta Central.
O VIP local é gerenciado por administradores ou membros com permissão para
gerenciar cargos/membros:

```text
!set_vip check @usuario
!set_vip @usuario 30d
!set_vip @usuario permanente
!set_vip @usuario remover
!set_vip loja add 30d 5000
!set_vip manual add 30d 10,00
!set_vip pedidos
!set_vip aprovar 1
```

As ofertas SatCoins são compradas no grupo; pedidos manuais em reais precisam
ser pagos fora do bot e aprovados por um administrador. O painel exclusivo do
VIP local fica no painel do membro/admin. O cargo automático é compatível
somente com Discord e depende da hierarquia de cargos do bot.

Somente superusuários gerenciam o VIPG global da Conta Central. Ele controla o
bypass global do Anti-PV, não os comandos VIP locais:

```text
!set_vipg check @usuario
!set_vipg set @usuario 15d
!set_vipg add @usuario 2h 30m
!set_vipg rem @usuario 5d
!set_vipg date @usuario 31/12/2026 23:59
!set_vipg perm @usuario
!set_vipg reset @usuario
!set_vipg pv on whatsapp
!set_vipg pv off telegram
```

Unidades aceitas: `d` (dias), `h` (horas), `m` (minutos) e `s` (segundos).
Consulte [a documentação VIP completa](../../setvip.md) para os subcomandos
de ofertas, pedidos, comandos e cargo local.

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
