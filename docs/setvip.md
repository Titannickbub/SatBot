# VIP e comando `set_vip`

O sistema VIP associa o acesso à **Conta Central** do usuário. Assim, quando
as contas de uma pessoa estão vinculadas, o status VIP acompanha essa conta
central nas plataformas conectadas.

Todos os subcomandos de `!set_vip` são restritos a Super Usuários (SU),
inclusive consultas administrativas. O comando também aceita o alias
`!setvip`. Os exemplos usam o prefixo padrão `!`; substitua-o se o prefixo do
bot foi alterado.

## Identificar o usuário

Para conceder ou alterar um VIP, informe um ID como argumento. O comando
aceita o ID da plataforma usada no chat atual ou o ID Central mostrado pela
consulta `!vip`. Exemplo:

```text
!set_vip set 123456789 30d
```

Um ID de plataforma é específico daquela plataforma. Para gerenciar a mesma
pessoa por um ID Central entre plataformas, use o ID Central da Conta Central.
Não envie tokens ou códigos de autenticação como IDs.

## Consultar o status

Um SU pode consultar a própria conta ou informar um ID:

```text
!set_vip check
!set_vip check <ID ou ID Central>
```

A resposta informa o status, tipo do VIP, tempo restante e expiração. Cada
usuário também pode consultar o próprio status com:

```text
!vip
```

`!vip` mostra o ID Central e o estado das contas vinculadas. Ele não aceita
consultar outra pessoa; para isso, use `!set_vip check <ID>` como SU.

## Conceder e ajustar VIP

### Definir uma duração

`set` define a duração a partir do momento do comando. Se já houver VIP, a
data de expiração anterior é substituída:

```text
!set_vip set <ID> 30d
```

### Adicionar tempo

`add` soma tempo ao VIP ativo. Se o VIP estiver expirado ou inativo, o novo
período começa a partir de agora:

```text
!set_vip add <ID> 7d
```

Adicionar ou remover tempo não altera um VIP permanente.

### Remover tempo

`rem` reduz o período restante. Se a nova expiração ficar no passado, o VIP
deixa de estar ativo:

```text
!set_vip rem <ID> 2d
```

### Definir a data de expiração

`date` define uma data e, opcionalmente, hora de expiração. O formato
recomendado é dia/mês/ano e hora de 24 horas:

```text
!set_vip date <ID> 31/12/2026
!set_vip date <ID> 31/12/2026 23:59
```

A data deve ser válida e futura. A interpretação de horário segue o relógio
local do processo do bot.

### Conceder VIP permanente ou remover o VIP

```text
!set_vip perm <ID>
!set_vip reset <ID>
```

`perm` concede VIP permanente. `reset` remove o estado VIP e seus tempos.
`cancel` é alias de `reset`:

```text
!set_vip cancel <ID>
```

## Formatos de duração

As unidades aceitas são segundos (`s`), minutos (`m`), horas (`h`) e dias
(`d`). É possível combinar unidades:

```text
30s
90m
12h
10d
2h 30m
1d 12h
```

Um número sem unidade é interpretado como segundos. Para evitar concessões
acidentais, prefira sempre indicar a unidade, por exemplo `30d` para trinta
dias.

## Comandos exclusivos para VIP

É possível adicionar nomes de comandos à lista de comandos VIP, consultar a
lista e remover nomes:

```text
!set_vip addcmd <comando>
!set_vip listcmd
!set_vip remcmd <comando>
```

Informe o nome do comando sem o prefixo. A lista é usada pelo controle
VIP-only; quando esse controle está desligado, adicioná-lo à lista não
restringe o comando por si só.

## Bypass do Anti-PV para VIPs

Por padrão, o status VIP não libera mensagens privadas. Um SU pode habilitar
ou desabilitar o bypass por plataforma:

```text
!set_vip pv on whatsapp
!set_vip pv off whatsapp
```

Também são aceitos `discord` e `telegram`. Essa opção é global por plataforma:
quando ligada, qualquer pessoa com VIP ativo ou permanente naquela plataforma
passa pelo Anti-PV. Ela não concede VIP. Para o Anti-PV controlar mensagens
privadas, ele também precisa estar ativado.

Veja a explicação detalhada em [Anti-PV e OnlyChats](./antipv-onlychats.md).

## Modo VIP-only e limitação atual

O comando fornece subcomandos para registrar o chat, servidor ou categoria
atual:

```text
!set_vip chat on
!set_vip chat off
!set_vip server on
!set_vip server off
!set_vip categorie on
!set_vip categorie off
```

O subcomando `categorie` também aceita `category`. Ao executar `on`, o bot
registra o ID do contexto atual e ativa o indicador global de VIP-only. Ao
executar `off`, remove o ID desse contexto.

**Limitação da implementação atual:** o middleware VIP verifica o indicador
global, mas não consulta os IDs de chats, servidores ou categorias registrados
por esses subcomandos. Portanto, quando o VIP-only está ativado, o bloqueio
pode ser aplicado globalmente — inclusive em outros chats e mensagens
privadas — em vez de ficar restrito ao contexto escolhido. Além disso,
`chat/server/categorie off` remove apenas o ID do contexto; não desativa o
indicador global, e não há atualmente um subcomando disponível para desligá-lo.
Também não há subcomandos disponíveis para personalizar o modo de resposta ou
a mensagem do VIP-only. Leve isso em conta antes de ativar esse recurso.

## Segurança e boas práticas

- Conceda VIP somente para a pessoa e duração pretendidas; confira o ID e a
  Conta Central antes de executar o comando.
- `set` substitui a duração anterior; `add` soma tempo; `reset` remove o VIP.
- VIP permanente não é alterado por `add` ou `rem`; use `reset` para removê-lo.
- O bypass de PV se aplica a todos os VIPs da plataforma selecionada, não a
  uma pessoa individual.
- Todos os recursos administrativos de `set_vip` exigem SU. Cadastre como SU
  apenas pessoas de confiança.

Para a administração geral, consulte [Configuração](./configuracao.md).
