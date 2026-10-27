[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como configurar a loja comunitária e gerenciar pedidos com `!configloja2`

O comando `!configloja2` (também acessível por `!gerenciarloja2`) permite que administradores configurem e gerenciem a **Loja Comunitária (Loja 2)** do grupo ou servidor.

Diferente da loja padrão com itens globais do bot, a Loja 2 permite cadastrar produtos e recompensas exclusivos do seu grupo (por exemplo: cargos VIPs, artes sob encomenda, wallpapers, permissões ou produtos reais), controlando preços em satcoins, categorias, estoque e aprovação/entrega dos pedidos dos membros.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Quem pode usar:** administradores do grupo ou servidor e superusuários do bot.
- **Onde funciona:** exclusivamente em grupos e servidores (WhatsApp, Telegram e Discord).
- **Mensagens privadas (PV):** **não suportado** (o catálogo e os pedidos pertencem à comunidade local).

## Gerenciar pelo dashboard

Administradores também podem abrir o painel administrativo do grupo ou
servidor, localizar o cartão **Economia** e selecionar o botão de configurações
da **Loja 2** ao lado dele. Pelo painel é possível alterar o título e o aviso,
cadastrar, editar e remover itens do catálogo e marcar pedidos pendentes como
entregues ou cancelá-los com estorno.

---

## 1. Personalizar título e aviso da loja

Você pode definir o cabeçalho que os membros verão ao abrir o catálogo da Loja 2 (`!loja2`):

- **Alterar o título da loja:**
  ```text
  !configloja2 titulo <texto>
  ```
  *Exemplo:* `!configloja2 titulo Loja de Recompensas da Comunidade`

- **Alterar o aviso ou descrição da loja:**
  ```text
  !configloja2 aviso <texto>
  ```
  *Exemplo:* `!configloja2 aviso Prêmios artesanais feitos sob encomenda pelos moderadores!`

---

## 2. Cadastrar novos itens (`adicionar`)

Para adicionar produtos, informe os **4 campos obrigatórios** separados por **`|` (barra vertical)** nesta ordem exata:

```text
!configloja2 adicionar <Nome> | <Preço> | <Categoria> | <Quantidade>
```

> [!IMPORTANT]
> É obrigatório utilizar o caractere `|` (barra vertical) para separar os campos. Não separe apenas com espaços.

### Regras dos campos:
- **Nome:** nome do produto ou recompensa.
- **Preço:** valor em satcoins (aceita números simples ou formato com vírgula/ponto, ex.: `100`, `250,50` ou `20.000,00`).
- **Categoria:** etiqueta organizadora (ex.: `Cargos`, `Artes`, `Itens`, `Comum`, `Épico`).
- **Quantidade:** quantidade em estoque (número inteiro) ou a palavra `infinito` para itens ilimitados.

### Exemplos práticos:
```text
!configloja2 adicionar Cargo VIP 30 dias | 50.000,00 | Cargos | 10
!configloja2 adicionar Wallpaper Exclusivo | 15.000,00 | Artes | infinito
!configloja2 adicionar Desenho Personalizado | 80.000,00 | Encomendas | 3
```

Cada item cadastrado recebe automaticamente um **identificador numérico único (ID)**, iniciando a partir de `1001`.

---

## 3. Editar itens existentes (`editar`)

Você pode alterar qualquer propriedade de um produto pelo seu ID:

```text
!configloja2 editar <ID> <campo> <novo valor>
```

Campos editáveis: `nome`, `preço` (ou `preco`), `categoria` e `quantidade` (ou `estoque`).

### Exemplos:
```text
!configloja2 editar 1001 preço 45.000,00
!configloja2 editar 1001 quantidade 15
!configloja2 editar 1001 quantidade infinito
!configloja2 editar 1001 categoria Especial
```

---

## 4. Remover itens da loja (`remover`)

Exclui um produto do catálogo da loja pelo ID:

```text
!configloja2 remover <ID>
```
*(ou `!configloja2 excluir <ID>`, `!configloja2 deletar <ID>`)*

*Exemplo:* `!configloja2 remover 1001`

> [!NOTE]
> Remover um item retira-o de novas compras na loja, mas os pedidos pendentes já realizados permanecem salvos no histórico até serem entregues ou cancelados.

---

## 5. Administrar pedidos dos membros

Quando um membro compra um item na Loja 2 via `!comprar`, um pedido pendente é gerado para a administração do grupo.

### Consultar pedidos pendentes:
```text
!configloja2 pedidos
```
*(ou simplesmente pelo atalho `!pedidos`)*

Exibe a lista de pedidos aguardando atendimento:
```text
🧾 PEDIDOS DA LOJA 2 AGUARDANDO ENTREGA
━━━━━━━━━━━━━━━━━━━━━━
#1 — Cargo VIP 30 dias (50.000 satcoins) | Nick do Usuário [12345678]
#2 — Desenho Personalizado (80.000 satcoins) | Outro Membro [87654321]
```

---

### Marcar pedido como entregue:
Após entregar a recompensa ao comprador (ex.: atribuir o cargo VIP ou enviar o arquivo):

```text
!configloja2 entregar <número-do-pedido>
```
*(ou pelo atalho `!entregar <número>`)*

*Exemplo:* `!entregar 1`

O pedido é finalizado com sucesso e o pagamento em satcoins é confirmado.

---

### Cancelar pedido e estornar valor:
Caso não seja possível entregar o item, ou a pedido do membro:

```text
!configloja2 cancelar <número-do-pedido>
```

*Exemplo:* `!configloja2 cancelar 2`

> [!TIP]
> Ao cancelar o pedido, o Sat Bot **estorna automaticamente o valor integral** em satcoins de volta para a carteira do comprador!

---

## Resumo de comandos e atalhos

| Ação | Comando Completo | Atalho Rápido | Descrição |
| --- | --- | --- | --- |
| Definir Título | `!configloja2 titulo <texto>` | — | Altera o título da loja comunitária |
| Definir Aviso | `!configloja2 aviso <texto>` | — | Altera a descrição/aviso exibido no catálogo |
| Cadastrar Item | `!configloja2 adicionar <dados>` | `!configloja2 add` | Adiciona item: `nome \| preço \| categoria \| estoque` |
| Editar Item | `!configloja2 editar <id> <campo> <valor>` | `!configloja2 edit` | Atualiza nome, preço, categoria ou estoque do item |
| Remover Item | `!configloja2 remover <id>` | `!configloja2 excluir` | Deleta um item da loja pelo seu ID |
| Ver Pedidos | `!configloja2 pedidos` | `!pedidos` | Lista os pedidos pendentes de entrega |
| Entregar Pedido | `!configloja2 entregar <id>` | `!entregar <id>` | Conclui o pedido e confirma o pagamento |
| Cancelar Pedido | `!configloja2 cancelar <id>` | — | Cancela o pedido e devolve o saldo ao comprador |

---

## Solução de problemas comuns

### 1. "❌ Para cadastrar o item, separe os quatro campos usando | (barra vertical)."
Você esqueceu de usar a barra vertical `|` para separar os 4 dados obrigatórios do item. Siga o formato: `Nome | Preço | Categoria | Quantidade`.

### 2. "❌ Preço ou quantidade inválidos."
Verifique se o preço contém apenas números e pontuação válida, e se a quantidade é um número inteiro ou a palavra `infinito`.

### 3. "❌ Pedido #X não encontrado ou já finalizado."
O pedido informado já foi marcado como entregue, foi cancelado anteriormente ou o número de identificação não existe. Verifique com `!pedidos`.
