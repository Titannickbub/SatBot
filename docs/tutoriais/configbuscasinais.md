[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como configurar a Busca de Sinais Local com `!configbuscasinais`

O comando `!configbuscasinais` permite que administradores criem uma busca de
recompensas exclusiva do grupo ou servidor. É possível definir o preço, as
chances de cada raridade, as garantias e os prêmios disponíveis em cada faixa.

A Busca Local é separada das buscas Recruta e Especializada. Ela pode sortear
SatCoins, itens da Loja do Bot, itens do Mercado Local, fundos e outlines de
perfil. O prefixo nos exemplos é `!`; troque-o pelo prefixo configurado no bot,
se necessário.

---

## Permissões e onde funciona

- **Quem pode configurar:** administradores do grupo ou servidor e
  superusuários do bot.
- **Onde funciona:** grupos e servidores com economia local.
- **Mensagens privadas:** não é possível configurar a loja em uma conversa
  privada.
- **Escopo:** cada grupo ou servidor mantém sua própria configuração e catálogo.

Também é possível configurar a Busca Local pelo painel web: abra o painel
administrativo do grupo, acesse **Economia, loja e busca** e selecione a seção
**Busca de Sinais**.

---

## 1. Consultar a ajuda, o estado e os itens

Sem argumentos, o comando mostra a ajuda:

```text
!configbuscasinais
!configbuscasinais help
```

Consulte a configuração atual:

```text
!configbuscasinais status
```

O status mostra se a busca está ativada, o preço, a soma das chances, as
garantias, os prêmios por raridade e os destaques. Para ver os identificadores
aceitos ao configurar recompensas, consulte o catálogo:

```text
!configbuscasinais itens
```

O catálogo lista as chaves dos itens da Loja do Bot, os IDs do Mercado Local e
as chaves de fundos e outlines. Use esses identificadores nos comandos; para os
itens do Mercado Local também é possível usar o nome sem espaços.

Depois de cada alteração salva, o comando informa a próxima configuração
recomendada. Quando uma alteração não pode ser salva, a resposta explica a
regra que falhou e mostra como corrigi-la. Use o comando indicado na resposta;
consulte `status` e `itens` para conferir os valores e identificadores atuais.

---

## 2. Configure com a busca desativada

Uma busca nova começa desativada. Mantenha-a desativada enquanto configura as
raridades e recompensas. Isso permite salvar etapas incompletas como rascunho;
a ativação só será aceita quando as chances e os prêmios estiverem válidos.
Se editar uma busca ativa e uma mudança deixar a configuração inválida, ela não
será salva: desative a busca, faça os ajustes e ative-a novamente.

Para pausar uma busca já ativa antes de editar:

```text
!configbuscasinais desativar
```

---

## 3. Defina o preço

O valor informado é o preço de **uma** busca. Os membros também podem fazer
dez buscas de uma vez, pelo custo de dez tentativas.

```text
!configbuscasinais preco <valor>
```

Exemplos:

```text
!configbuscasinais preco 250
!configbuscasinais preco 250,50
!configbuscasinais preco 1.000,00
```

O preço precisa ser maior que zero e é debitado da carteira dos membros.

---

## 4. Distribua as chances entre as raridades

Defina as cinco probabilidades em um único comando, sempre nesta ordem:
**comum, incomum, raro, épico e lendário**.

```text
!configbuscasinais chances <comum> <incomum> <raro> <epico> <lendario>
```

Exemplo:

```text
!configbuscasinais chances 60 25 10 4 1
```

Cada valor deve ser um número inteiro de 0 a 100, e a soma precisa ser
exatamente **100**. Uma raridade com chance zero não sorteia prêmios e não pode
ter uma garantia configurada.

---

## 5. Configure os prêmios

Cada raridade com chance maior que zero precisa ter ao menos um prêmio. Os
prêmios podem ser combinados na mesma raridade.

### Prêmio em SatCoins

Defina o valor mínimo e máximo que pode ser sorteado:

```text
!configbuscasinais dinheiro <raridade> <mínimo> <máximo>
!configbuscasinais dinheiro <raridade> remover
```

Exemplos:

```text
!configbuscasinais dinheiro comum 10 100
!configbuscasinais dinheiro epico 500,00 2.000,00
!configbuscasinais dinheiro raro remover
```

O valor máximo precisa ser igual ou maior que o mínimo.

### Itens e cosméticos

Use `premio add` para adicionar uma recompensa e `premio remover` para
retirá-la. Tipos aceitos:

| Tipo | O que pode ser sorteado |
| --- | --- |
| `bot` | Resets e itens da Loja do Bot |
| `mercado` | Itens cadastrados no Mercado Local |
| `fundo` | Fundos de perfil |
| `linha` | Outlines de perfil |

Formato:

```text
!configbuscasinais premio add <raridade> <tipo> <item>
!configbuscasinais premio remover <raridade> <tipo> <item>
```

Exemplos:

```text
!configbuscasinais premio add comum bot work
!configbuscasinais premio add raro mercado 1001
!configbuscasinais premio add epico fundo rgb
!configbuscasinais premio add epico linha rgb
!configbuscasinais premio remover comum bot work
```

Confira `!configbuscasinais itens` para identificar os itens disponíveis. Os
fundos e outlines sorteados são adicionados à coleção do membro. Um item do
Mercado Local sorteado gera um pedido para a equipe, sem cobrar SatCoins do
membro; a entrega segue o fluxo de pedidos do mercado.

---

## 6. Configure garantias opcionais

Uma garantia faz com que a raridade seja selecionada quando o membro alcançar
o número definido de buscas sem recebê-la. A garantia vale somente para a
Busca Local e seus contadores são independentes para cada membro e raridade.

```text
!configbuscasinais garantia <raridade> <número de buscas>
!configbuscasinais garantia <raridade> off
```

Exemplos:

```text
!configbuscasinais garantia epico 20
!configbuscasinais garantia lendario off
```

O número aceito vai de 1 a 10.000. A raridade precisa ter chance maior que zero
para receber uma garantia.

---

## 7. Escolha os destaques

Até dois prêmios configurados podem aparecer em destaque na página web da Busca
de Sinais Local. O prêmio precisa estar incluído em pelo menos uma raridade
antes de ser destacado.

```text
!configbuscasinais destaque add <tipo> <item>
!configbuscasinais destaque remover <tipo> <item>
!configbuscasinais destaque limpar
```

Exemplos:

```text
!configbuscasinais destaque add fundo rgb
!configbuscasinais destaque add mercado 1001
!configbuscasinais destaque remover fundo rgb
!configbuscasinais destaque limpar
```

---

## 8. Revise e ative

Antes de liberar a busca, confira o status:

```text
!configbuscasinais status
```

Verifique se:

1. As chances das cinco raridades somam 100%.
2. Toda raridade com chance maior que zero tem ao menos um prêmio.
3. Garantias estão configuradas somente em raridades com chance.
4. Os destaques escolhidos ainda estão entre os prêmios de alguma raridade.

Ative quando estiver tudo pronto:

```text
!configbuscasinais ativar
```

Para pausar novamente, use `!configbuscasinais desativar`. A configuração e os
contadores dos membros são preservados.

---

## Se uma alteração for recusada

Leia a mensagem de erro: ela identifica a raridade ou prêmio problemático e
indica o comando para corrigir. Os casos mais comuns são:

| Mensagem/causa | Como corrigir |
| --- | --- |
| As chances não somam 100% | Defina os cinco valores com `chances <comum> <incomum> <raro> <epico> <lendario>`. |
| Uma raridade com chance não tem prêmio | Adicione SatCoins ou um item àquela raridade; consulte `itens` para escolher o identificador correto. |
| Chance zero com garantia configurada | Remova a garantia com `garantia <raridade> off` ou aumente a chance da raridade. |
| Prêmio ou destaque não existe mais | Consulte `itens`, remova o identificador antigo e adicione um item disponível. |
| Destaque não está em nenhuma raridade | Adicione-o primeiro como prêmio com `premio add <raridade> <tipo> <item>`. |
| Alteração recusada enquanto a busca está ativa | Use `desativar`, faça as alterações e, quando a configuração estiver completa, use `ativar`. |

O comando `status` mostra a configuração salva, não alterações recusadas.
Depois de corrigir o problema, consulte `status` novamente antes de ativar.

---

## Referência rápida

| Comando | Ação |
| --- | --- |
| `!configbuscasinais status` | Mostra o estado e a configuração atual |
| `!configbuscasinais itens` | Lista os itens e identificadores disponíveis |
| `!configbuscasinais preco <valor>` | Define o preço unitário |
| `!configbuscasinais chances <5 valores>` | Define as chances na ordem das raridades |
| `!configbuscasinais dinheiro <raridade> <mínimo> <máximo>` | Configura SatCoins como prêmio |
| `!configbuscasinais premio add\|remover ...` | Adiciona ou remove um prêmio |
| `!configbuscasinais garantia <raridade> <número\|off>` | Define ou remove uma garantia |
| `!configbuscasinais destaque add\|remover ...` | Gerencia os prêmios em destaque |
| `!configbuscasinais ativar\|desativar` | Libera ou pausa as buscas |

Se uma alteração for recusada, consulte o status e o catálogo. A Busca Local
ativa não aceita mudanças que deixem as chances, os prêmios ou os destaques
inválidos.
