# 🎲 Comandos de diversão

<p><a href="../tutoriais.md"><img src="https://img.shields.io/badge/%E2%86%90%20Voltar-Tutoriais-5865F2?style=for-the-badge" alt="Voltar para Tutoriais"></a></p>

Este guia reúne os principais comandos do menu **Diversão**, organizados
pelas categorias e submenus exibidos pelo bot:

```text
!menu diversão
!menu diversão/RPG
!menu diversão/Testes
!menu diversão/Ações imediatas
```

O prefixo dos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
nos exemplos. Casamento e desafio de Setembro são usados em grupos ou
servidores; ações locais de roleplay também são específicas do chat em que
foram cadastradas.

## 🎲 Porcentagem

### `!porcentagem` — sorteio de 0% a 100%

Escolha um tema ou característica e, opcionalmente, indique a pessoa que será
avaliada. Sem menção ou resposta a uma mensagem, o resultado é sobre você.

```text
!porcentagem sorte
!porcentagem bonito @membro
```

Também é possível responder à mensagem de alguém e usar `!porcentagem tema`.
Aliases: `!porcent`, `!%` e `!pct`.

## 🔥 Desafio NoFap e ranking de Setembro

### `!nofap` — sua sequência pessoal

As estatísticas ficam vinculadas à sua conta central, não apenas ao chat.

```text
!nofap iniciar
!nofap status
!nofap reset
!nofap sair
```

- `iniciar` começa a sequência; `status` (ou somente `!nofap`) mostra o
  progresso.
- `reset` zera a sequência atual e registra o reset, preservando o recorde.
- `sair` pausa a contagem.

Aliases do comando: `!nofapset` e `!semana`.

### `!setembro` — participação e classificação do grupo

O desafio de Setembro mantém uma lista de participantes e um ranking próprio
para cada grupo ou servidor.

```text
!setembro entrar
!setembro rank
!setembro reset
!setembro sair
```

Sem ação informada, `!setembro` mostra o ranking. `entrar` inclui você no
placar e inicia a contagem; `reset` zera sua sequência; `sair` remove você do
ranking daquele chat. Aliases: `!setembronofap` e `!ranksetembro`.

## 💍 Casamento e relacionamentos

Os relacionamentos são registrados separadamente em cada grupo ou servidor.
Use uma menção ou responda à mensagem da pessoa quando indicado.

### `!casar` — pedidos e consulta

```text
!casar @pessoa
!casar me
!casar pedidos
!casar aceitar
!casar status @pessoa
```

O pedido fica disponível por **5 minutos**. A pessoa pode aceitá-lo
respondendo à mensagem do pedido com `!casar aceitar`, ou usando
`!casar aceitar @pretendente`. Para recusar, use `!casar rejeitar`. O comando
`!casar me` registra um casamento consigo mesmo(a).

### `!casamento` — banner do relacionamento

Gera um banner com as fotos do casal:

```text
!casamento
!casamento @parceiro
```

Se houver mais de um relacionamento no chat, escolha pelo número mostrado,
por exemplo `!casamento 2`.

### `!divorciar` — encerrar o casamento

Marque o cônjuge ou responda a uma mensagem dele. Sem indicar a pessoa, o
comando apenas explica como confirmar:

```text
!divorciar @parceiro
```

Aliases: `!divorcio` e `!separar`. O encerramento vale somente para o grupo ou
servidor atual.

## 🧪 Testes

### `!testar` — resultado aleatório

Informe um teste para receber uma porcentagem e uma frase temática. Você pode
fazer o teste sobre si mesmo, mencionar alguém ou responder à mensagem dessa
pessoa.

```text
!testar bonito
!testar gado @membro
!testar feio
```

Testes disponíveis: `gay`, `lesbica`, `bonito`, `feio`, `casal`, `gado`,
`corno`, `burro`, `golpe`, `gostoso`, `gostosa`, `triste`, `doido` e `otaku`.
Para testar um casal, indique uma pessoa (você será o outro participante) ou
duas pessoas:

```text
!testar casal @membro
!testar casal @pessoa1 @pessoa2
```

O teste de casal gera um banner com as fotos dos participantes. Os testes
também podem ser chamados diretamente pelo nome, por exemplo `!bonito` ou
`!casal`. `!teste` é alias de `!testar`; os nomes dos testes também funcionam
como comandos diretos.

## 🎭 Ações imediatas

### `!act` — ação de roleplay com outro membro

Escolha uma ação disponível e marque alguém ou responda à mensagem dessa
pessoa:

```text
!act kiss @membro
!act hug
```

No segundo exemplo, responda à mensagem da pessoa para direcionar a ação a ela.
Também é possível chamar uma ação cadastrada diretamente, como `!kiss` ou
`!beijo`. O bot escolhe uma frase e, quando cadastrada, uma mídia para a ação.
Use `!act` ou `!act help` para consultar as ações disponíveis.

O menu mostra as ações disponíveis, globais e locais, neste chat; uma ação
local prevalece se tiver o mesmo nome de uma global. A configuração de frases,
mídias e aliases é feita por administradores com `!act_edit`; consulte
[o guia de ações de roleplay](./act_edit.md).

## Resumo rápido

| Comando | Categoria | Para que serve |
| --- | --- | --- |
| `!porcentagem` | Diversão | Sorteia uma porcentagem para um tema ou pessoa |
| `!nofap` | Diversão/RPG | Consulta e gerencia sua sequência pessoal |
| `!setembro` | Diversão | Participa do desafio e consulta o ranking do chat |
| `!casar` | Diversão/RPG | Envia e gerencia pedidos de casamento |
| `!casamento` | Diversão/RPG | Exibe o banner de um relacionamento |
| `!divorciar` | Diversão/RPG | Encerra o casamento no chat atual |
| `!testar` | Diversão/Testes | Executa testes aleatórios |
| `!act` | Diversão/Ações imediatas | Executa ações interativas de roleplay |

Para ver a ajuda detalhada de um comando, use `!info <comando>`, por exemplo
`!info casar`.
