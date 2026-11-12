# 💰 Comandos do menu Economia

<p><a href="../tutoriais.md"><img src="https://img.shields.io/badge/%E2%86%90%20Voltar-Tutoriais-5865F2?style=for-the-badge" alt="Voltar para Tutoriais"></a></p>

Este guia explica os comandos de membro que aparecem no menu **Economia** e
nos submenus **Trabalhos** e **Loja**:

```text
!menu economia
!menu economia/trabalhos
!menu economia/loja
```

O prefixo dos exemplos é `!`; troque-o pelo prefixo configurado no bot, se
necessário. A economia funciona em grupos e servidores, e cada um mantém seus
próprios saldos e registros. Os valores aparecem em SatCoins (por exemplo,
`10,00💷`). Em geral, os comandos financeiros não funcionam em conversas
privadas.

## 💼 Carteira, cofre e transferências

### `!carteira` — consultar seu saldo

Gera um cartão com o saldo disponível na carteira, o valor guardado no cofre,
o patrimônio total e a situação da recompensa diária.

```text
!carteira
```

O comando consulta sua carteira no grupo ou servidor atual. Aliases:
`!saldo` e `!wallet`.

### `!cofre` — guardar ou retirar SatCoins

Sem ação, mostra o saldo do cofre, as regras aplicadas nesse grupo e o
eventual imposto calculado:

```text
!cofre
!cofre help
```

Para mover dinheiro entre sua carteira e o cofre:

```text
!cofre depositar 500
!cofre sacar 100
```

Os valores aceitam até duas casas decimais. Cada membro pode fazer um depósito
e um saque por dia; o mínimo por movimentação é definido para o grupo (o padrão
é `500,00💷`). Se o cofre estiver no modo com imposto, um saque pode sofrer
desconto antes de o valor voltar à carteira. O saldo do cofre não pode ser
usado diretamente em compras, apostas ou transferências. Aliases:
`!banco` e `!vault`.

### `!transferir` — enviar dinheiro a alguém

Informe o valor e identifique um membro que tenha carteira neste mesmo grupo
ou servidor:

```text
!transferir 50 @membro
!transferir 10,50 5511999999999
```

Também pode responder à mensagem do destinatário:

```text
!transferir 25
```

O mínimo é `10,00💷`; o valor é descontado da sua carteira e creditado na do
destinatário. Não é possível transferir para si mesmo. O limite é de três
transferências por dia, e o cofre não pode ser usado como origem. Aliases:
`!transfer`, `!enviar` e `!pagar`.

### `!lucro` — consultar o resultado do dia

Exibe um extrato com ganhos e gastos líquidos do dia e o total:

```text
!lucro
```

O extrato pode incluir resgate diário, trabalho, pesca, mineração, cassino,
transferências, roubos, loja, Busca de Sinais e imposto do cofre. Aliases:
`!ganhos`, `!lucrodiario`, `!lucro-diario` e `!media`.

## 🎁 Busca de Sinais

### `!buscasinais` — buscar prêmios

Há três modalidades. Consulte primeiro as regras, preços e prêmios possíveis:

```text
!buscasinais ajuda
!buscasinais itens
!buscasinais itens recruta
!buscasinais itens especializada
!buscasinais itens local
```

Faça uma busca por vez:

```text
!buscasinais recruta
!buscasinais especializada
!buscasinais local
```

Para executar dez buscas de uma vez, acrescente `x10`:

```text
!buscasinais recruta x10
!buscasinais especializada x10
```

- **Recruta:** no padrão atual custa `100,00💷` por busca e pode dar SatCoins
  ou um reset da Loja do Bot.
- **Especializada:** no padrão atual custa `500,00💷` por busca e pode dar
  SatCoins, um reset ou um cosmético.
- **Local:** usa o preço e o catálogo definidos pelos administradores daquele
  grupo ou servidor. Se não estiver configurada e ativada, não será possível
  usá-la.

O custo de `x10` é dez vezes o valor de uma busca, sem desconto. O pagamento
sai da carteira, não do cofre. A ajuda e o catálogo informam os valores,
prêmios e garantias em vigor. Aliases incluem `!busca`, `!sinais`,
`!buscar` e `!buscarsinais`; `!buscasinais` sem argumentos mostra os destaques.

Para configurar a modalidade Local, consulte
[o guia de configuração da Busca de Sinais](./configbuscasinais.md).

## 🎨 Cosméticos do perfil e escudo

### `!cosmeticos` — consultar e equipar cosméticos de perfil

Abra a loja de cosméticos e confira o que está equipado:

```text
!cosmeticos
!cosmeticos fundo
!cosmeticos linha
!cosmeticos circulo
!cosmeticos efeito
```

Para ver uma prévia, informe a cor listada no catálogo. Para equipar, é
necessário já possuir o item:

```text
!cosmeticos previa fundo azul
!cosmeticos previa linha azul
!cosmeticos previa circulo azul
!cosmeticos previa efeito congelado
!cosmeticos fundo azul
!cosmeticos linha azul
!cosmeticos circulo azul
!cosmeticos efeito congelado
```

Compre um cosmético pelo nome com `!comprar fundo <cor>`,
`!comprar linha <cor>`, `!comprar circulo <cor>` ou `!comprar efeito congelado`.
O catálogo também mostra IDs, preços e itens que você já possui. Para remover
um cosmético equipado sem perder os itens comprados:

```text
!cosmeticos fundo padrao
!cosmeticos linha padrao
!cosmeticos circulo padrao
!cosmeticos efeito padrao
```

Aliases do comando: `!cosmetico`, `!cosmético`, `!cosméticos` e `!cosmetics`.

### `!escudo` — consultar proteção contra roubos

Mostra o estado do seu escudo anti-roubo neste grupo ou servidor:

```text
!escudo
```

Um escudo tem cinco cargas e perde uma ao bloquear uma tentativa de roubo.
Para comprar outro, use `!comprar escudo`; é preciso ter pelo menos
`500,00💷` na carteira e não ter um escudo ativo. Alias: `!shield`.

## 🧰 Trabalhos e atividades

Os comandos abaixo são individuais e têm limite diário por membro. As
tentativas se renovam na virada do dia; os comandos de trabalho, pesca e
mineração também podem conceder XP de atividade se o sistema estiver ativo.

### `!resgatar` — recompensa diária

Resgata uma vez por dia a recompensa gratuita, creditada na sua carteira:

```text
!resgatar
```

O valor atual é `20,00💷`. Aliases: `!daily`, `!diario` e `!diária`.

### `!trabalhar` — salário por trabalho aleatório

Realiza uma atividade de trabalho e informa o pagamento ou o resultado do
expediente:

```text
!trabalhar
```

Há até duas tentativas por dia. O resultado pode incluir salário, bônus ou
desconto por um imprevisto. Aliases: `!work` e `!trabalho`.

### `!pescar` — pescaria aleatória

```text
!pescar
```

Há até duas pescarias por dia. O resultado pode ser um peixe comum ou raro,
um evento especial, lixo ou um imprevisto com prejuízo. Aliases: `!pesca` e
`!fish`.

### `!minerar` — procurar minérios

```text
!minerar
```

Há até duas minerações por dia. Você pode encontrar minérios comuns, raros ou
valiosos; também pode ocorrer um imprevisto com custo de reparo. Aliases:
`!mineracao`, `!mineração` e `!mine`.

### `!cassino` — apostar no caça-níqueis

Sem valor informado, a aposta é `10,00💷`. Também é possível escolher o valor:

```text
!cassino
!cassino 25
!cassino 10.50
```

O prêmio máximo ocorre quando as três frutas são iguais: o pagamento é 11
vezes a aposta (incluindo a aposta; lucro líquido de 10 vezes). Há até cinco
jogadas por dia, e a aposta precisa estar disponível na carteira. Jogue com
responsabilidade: o resultado é aleatório. Para valores com centavos, use
ponto como separador decimal. Aliases: `!casino` e `!slot`.

### `!roubar` — tentar roubar outro membro

Informe ou mencione alguém que já tenha carteira neste grupo ou servidor.
Também é possível responder à mensagem da pessoa:

```text
!roubar @membro
!roubar 5511999999999
```

Há até três tentativas por dia e não é permitido escolher a mesma vítima duas
vezes no mesmo dia. O resultado pode ser sucesso parcial ou total, falha,
multa, indenização ou bloqueio por escudo. Dependendo das regras do cofre
configuradas no grupo, o alvo pode ser a carteira ou o cofre. Aliases:
`!roubo` e `!assaltar`.

## 🛒 Lojas e compras

### `!loja` — itens e resets da Loja do Bot

Mostra os itens, posições e preços atuais. O catálogo pode variar conforme as
regras da economia; confira a lista antes de comprar:

```text
!loja
```

Use a posição ou o nome do item com `!comprar`. Por exemplo:

```text
!comprar 1
!comprar resetar trabalho
!comprar escudo
```

Os resets só podem ser comprados quando o limite da atividade correspondente
acabou. O reset geral depende de as atividades exigidas estarem no limite. O
escudo exige o saldo mínimo e não pode ser comprado enquanto outro estiver
ativo.

### `!loja2` — mercado configurado pelos administradores

Mostra os produtos, IDs, preços e estoque do mercado local:

```text
!loja2
```

Compre pelo ID ou nome:

```text
!comprar 1001
!comprar Fanart
```

O pagamento é descontado da carteira e cria um pedido para entrega manual pela
equipe do grupo ou servidor. Se o pedido for cancelado, o valor é devolvido.
Use `!comprar2 <id|nome>` para comprar especificamente no mercado local.
Alias de `!loja2`: `!mercado`.

### `!comprar` — comprar produtos e resets

Use o número, nome ou ID mostrado pela loja correspondente:

```text
!comprar 1
!comprar resetar pesca
!comprar 1001
!comprar fundo azul
!comprar linha azul
```

`!comprar` atende a Loja do Bot, o mercado local e os cosméticos do perfil.
Para distinguir: os IDs do mercado local começam em `1001`; os cosméticos
também podem ser comprados pelo nome ou pelo ID indicado no catálogo de
`!cosmeticos`. A resposta confirma o valor cobrado ou explica por que a compra
não pôde ser concluída. Aliases: `!buy` e `!comprar2` (este último direciona
ao mercado local).

## Resumo dos comandos

| Comando | Categoria | Uso principal |
| --- | --- | --- |
| `!carteira` | Economia | Consulta carteira, cofre e patrimônio |
| `!cofre` | Economia | Consulta o cofre e deposita ou saca |
| `!transferir` | Economia | Envia SatCoins a outro membro |
| `!lucro` | Economia | Consulta o extrato líquido do dia |
| `!buscasinais` | Economia | Busca prêmios em três modalidades |
| `!cosmeticos` | Economia | Consulta, compra e equipa cosméticos |
| `!escudo` | Economia | Consulta as cargas do escudo anti-roubo |
| `!resgatar` | Economia/Trabalhos | Resgata a recompensa diária |
| `!trabalhar` | Economia/Trabalhos | Trabalha por SatCoins e XP |
| `!pescar` | Economia/Trabalhos | Pesca por SatCoins e XP |
| `!minerar` | Economia/Trabalhos | Minera por SatCoins e XP |
| `!cassino` | Economia/Trabalhos | Aposta no caça-níqueis |
| `!roubar` | Economia/Trabalhos | Tenta roubar outro membro |
| `!loja` | Economia/Loja | Lista itens e resets da Loja do Bot |
| `!loja2` | Economia/Loja | Lista produtos do mercado local |
| `!comprar` | Economia/Loja | Compra produto, reset ou cosmético |

Para a ajuda de um comando no próprio bot, use `!info <comando>`, por exemplo
`!info cofre`. Administradores: veja também
[o guia de configuração da economia](./economia.md) e
[o guia da Busca de Sinais Local](./configbuscasinais.md).
