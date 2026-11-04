[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como ativar, desativar e verificar a economia com `!economia`

O comando `!economia` (também acessível por `!configeconomia` ou `!economy`) permite que administradores controlem o sistema financeiro de satcoins no grupo ou servidor.

Com a economia ativada, os membros podem trabalhar, pescar, minerar, apostar no cassino, comprar itens em lojas e transferir moedas. Ao desativar a economia, todas as atividades financeiras são temporariamente suspensas, **preservando integralmente os saldos** de todos os membros.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Quem pode usar:** administradores do chat e superusuários do bot.
- **Onde funciona:** exclusivamente em grupos e servidores (WhatsApp, Telegram e Discord).
- **Mensagens privadas (PV):** **não suportado** (a economia possui configurações e saldos locais por grupo/servidor).

---

## Cofre protegido

O cofre guarda satcoins separadamente da carteira. O saldo guardado não pode ser usado em compras, apostas, transferências ou roubos; para voltar a usá-lo, é necessário sacar para a carteira.

```text
!cofre
!cofre depositar 500
!cofre sacar 200
```

Cada depósito deve ser de pelo menos **500,00 satcoins**. Saques não têm valor mínimo e podem retirar qualquer quantia disponível. A carteira, o cofre e o patrimônio total aparecem no comando `!carteira`, no perfil web e no painel local. Os rankings `!rank rico` e `!rank pobre` consideram somente o saldo disponível na carteira; o saldo do cofre é exibido separadamente, mas não influencia a posição. Para subir no ranking, é necessário manter satcoins disponíveis e sujeitos aos riscos da economia.

Os comandos do cofre também estão disponíveis pelo perfil web local. O saldo fica salvo junto à conta da economia do respectivo grupo ou servidor.

---

## Subcomandos e modos de uso

### 1. Ativar a economia
Habilita todas as funcionalidades de economia no grupo ou servidor:

```text
!economia ativar
```
*(ou `!economia on`, `!economia enable`)*

**O que acontece quando ativada:**
- Membros podem consultar a carteira e o cofre (`!carteira`, `!cofre`), trabalhar (`!trabalhar`), pescar (`!pescar`), minerar (`!minerar`), apostar (`!cassino`), transferir (`!transferir`) e usar as lojas do chat (`!loja`, `!loja2`).

---

### 2. Desativar a economia
Pausa o módulo financeiro no chat sem apagar o histórico nem os saldos existentes:

```text
!economia desativar
```
*(ou `!economia off`, `!economia disable`)*

> [!NOTE]
> Desativar a economia **não apaga** as moedas de ninguém. Os saldos e inventários permanecem salvos no banco de dados e voltam a ficar disponíveis assim que a economia for reativada.

---

### 3. Consultar o estado atual (`status`)
Verifica se o sistema financeiro está ativo ou inativo no grupo:

```text
!economia status
```
*(ou apenas `!economia`)*

O bot responderá informando o status: `💰 Economia: ativada` ou `💰 Economia: desativada`.

---

### 4. Consultar o manual rápido (`help`)
Exibe as instruções de uso e opções disponíveis diretamente no chat:

```text
!economia help
```
*(ou `!economia ajuda`)*

---

## Resumo de comandos e aliases

| Comando | Aliases | Descrição |
| --- | --- | --- |
| `!economia ativar` | `!economia on`, `!economia enable` | Ativa o sistema financeiro de satcoins no chat |
| `!economia desativar` | `!economia off`, `!economia disable` | Pausa a economia preservando os saldos |
| `!economia status` | `!economia` | Consulta se a economia está ligada ou desligada |
| `!economia help` | `!economia ajuda` | Exibe o menu de ajuda no chat |

---

## Busca de Sinais

Faça buscas com `!buscasinais recruta` ou `!buscasinais especializada`. Os atalhos `!buscarsinais`, `!buscarsinal` e `!buscasinal` também são aceitos; as formas `!busca_sinais`, `!buscar_sinais`, `!buscar_sinal` e `!busca_sinal` funcionam da mesma maneira. Use o sufixo `x10` para fazer dez tentativas seguidas; por exemplo, `!buscasinais recruta x10`. O comando sem argumentos mostra um banner com os destaques atuais (Fundo RGB e Outline RGB); cada busca envia um banner com o resultado e o saldo atualizado. O fundo, os detalhes e a borda do banner acompanham os cosméticos de perfil equipados por quem executou o comando, sem alterar a aparência dos cartões de prêmio. O cartão do Fundo RGB exibe seu próprio gradiente arco-íris. A apresentação do texto acompanha a formatação nativa do Discord, Telegram ou WhatsApp. No painel local, abra **Busca de Sinais** para escolher o nível, fazer x1/x10 e consultar os prêmios disponíveis. O Fundo RGB e a Outline RGB aparecem em destaque; clicar em um prêmio abre a prévia animada. O custo da busca x10 é dez vezes o valor unitário, sem desconto.

- **Recruta:** custa **100,00 satcoins** por tentativa; cada busca tem **70%** de chance de prêmio em dinheiro (5,00–30,00) e **30%** de reset da Loja do Bot. Garante um reset de trabalho em até **5** buscas e um Épico em até **10**.
- **Especializada:** custa **500,00 satcoins** por tentativa; cada busca tem **55%** de chance de prêmio em dinheiro (20,00–100,00), **20%** de reset e **25%** de cosmético. Garante um Épico em até **10** buscas.

Os contadores são independentes por categoria e ficam salvos na economia local. A carteira paga as buscas; o saldo no cofre não pode ser usado. Um reset só é aplicado quando a atividade atingiu o limite diário. Se o reset não puder ser aplicado, ou se o cosmético sorteado já estiver na coleção, o prêmio converte em **50% do preço da loja**. Cosméticos inéditos entram na coleção e podem ser equipados em `!cosmeticos`.

### Busca Local

Administradores podem configurar a **Busca Local** no painel administrativo do grupo ou servidor, pelo botão **Configurar Busca Local** na configuração da economia. Ela é uma terceira opção na página **Busca de Sinais** e só aparece quando estiver ativada. A configuração — incluindo preço, probabilidades, garantias e prêmios — fica salva junto à economia daquele grupo ou servidor.

Defina o preço de uma tentativa (o x10 custa automaticamente dez vezes esse valor) e as chances de cada raridade — **Comum, Incomum, Raro, Épico e Lendário** — que devem somar 100%. Para cada raridade com chance maior que zero, escolha ao menos um prêmio: dinheiro (valor mínimo e máximo), itens da Loja do Bot ou itens cadastrados no Mercado Local. Os itens do Mercado Local sorteados geram pedidos pendentes gratuitos para a equipe entregar; o estoque é reservado no sorteio. Itens da Loja do Bot são aplicados quando possíveis e, caso contrário, convertidos em 50% do preço da loja. Também é possível configurar garantias por raridade e selecionar até dois destaques entre os prêmios configurados. Os destaques substituem os prêmios em destaque na apresentação da busca.

---

## Cosméticos de perfil

Cada usuário pode personalizar o fundo do perfil separadamente em cada grupo ou servidor:

**WhatsApp, Telegram e Discord**

```text
!cosmeticos
!cosmeticos fundo
!cosmeticos fundo oceano
!cosmeticos fundo padrao
!cosmeticos previa fundo oceano
!comprar 2001
!comprar fundo oceano
```

`!cosmeticos` abre o menu da loja, e `!cosmeticos fundo` lista os fundos disponíveis por raridade, com IDs a partir de **2000**. Cada cor tradicional custa **1.000,00 satcoins**; o fundo **RGB** (ID 2009), Épico, custa **4.000,00 satcoins**. Compre com `!comprar <id>` ou `!comprar fundo <cor>`. Depois, `!cosmeticos fundo <cor>` aplica o fundo se você já o possui; caso contrário, o bot informa como comprá-lo. Para pré-visualizar, use `!cosmeticos previa fundo <cor>`. O fundo escolhido aparece nos banners de perfil e de casamento, nos rankings e nos perfis web. O RGB fica como arco-íris fixo nos banners de imagem e anima a mudança de cores no painel web. A opção `padrao` restaura o visual original sem apagar as cores compradas. Contas antigas sem cosméticos continuam usando os fundos originais.

Também é possível personalizar o **outline dos cartões/bolhas do perfil** — isso não altera a moldura do avatar. A linha padrão acompanha a cor do fundo. Os outlines são organizados por raridade: as cores tradicionais custam **1.000,00 satcoins** e são **Raras**; o outline **RGB** (ID 3009) custa **4.000,00 satcoins** e é **Épico**. Os IDs começam em **3000**:

```text
!cosmeticos linha
!cosmeticos linha oceano
!cosmeticos linha padrao
!cosmeticos previa linha oceano
!comprar 3001
!comprar linha oceano
```

Use `!cosmeticos linha <cor>` para equipar uma opção comprada e `!cosmeticos linha padrao` para voltar ao outline dinâmico, sem perder as cores adquiridas. O outline aparece nos cartões do perfil web e nos banners de perfil; o RGB é arco-íris fixo nas imagens e anima a mudança de cores no painel web. A loja de cosméticos do perfil web também permite comprar, equipar e restaurar a linha.

As opções incluem azul, oceano, verde, roxo, rosa, vermelho, dourado, rubi, grafite e RGB. No perfil, a bolha de casamento usa as cores do perfil da pessoa com quem você está casado(a).

Os itens da loja de resets e os cosméticos têm níveis de raridade exibidos no catálogo. Os níveis disponíveis são **Comum**, **Incomum**, **Raro**, **Épico** e **Lendário**. As cores cosméticas tradicionais são **Raras**; RGB é **Épico**. Nos resets, itens abaixo de **100,00** são **Comuns**, de **100,00** até abaixo de **500,00** são **Incomuns**, e de **500,00** a **700,00** são **Raros**; resetar trabalho, transferência e roubo são exceções classificadas como **Comuns**. **Resetar todos** é **Épico**. O escudo anti-roubo é uma exceção e está classificado como **Raro**.

Para ver uma imagem antes de escolher, use `!cosmeticos previa fundo <cor>` (por exemplo, `!cosmeticos previa fundo oceano`). A prévia não compra nem aplica a cor. Também é possível abrir a **Loja de cosméticos** pelo perfil da Conta Central em um grupo: a página mostra a prévia ao vivo, permite reaplicar cores compradas e pede confirmação antes de descontar o saldo. A cor escolhida também personaliza o cabeçalho, o fundo e os destaques dos painéis local e administrativo daquele grupo.

## Lojas pelo painel web

No perfil da Conta Central, abra um grupo ou servidor e acesse a seção
**Lojas**. A **Loja do Bot** permite comprar resets e itens de proteção pelo
saldo local; os resets continuam sujeitos aos limites diários e o escudo às
regras da loja. O **Mercado Local** permite comprar os itens cadastrados pela
equipe: o saldo e o estoque são atualizados na compra, e um pedido fica
pendente até a entrega manual pelos administradores. As lojas usam o saldo da
economia daquele grupo ou servidor.

## Escudo anti-roubo

Consulte o estado da sua proteção com um banner personalizado:

```text
!escudo
```

O escudo começa com cinco cargas. Cada tentativa de roubo bloqueada consome uma carga; ao zerar, você fica sem proteção até comprar outro com `!comprar escudo`. A compra custa **200,00 satcoins** e exige saldo mínimo de **500,00 satcoins**. O banner usa o fundo cosmético selecionado para seu perfil neste grupo ou servidor.

---

## Solução de problemas comuns

### 1. "❌ Apenas administradores podem configurar a economia."
Apenas membros com cargo administrativo ou superusuários do bot podem ligar ou desligar a economia no grupo.

### 2. "❌ A economia só pode ser configurada em grupos ou servidores."
O comando foi enviado no privado (PV). Execute-o dentro do grupo ou servidor desejado.

### 3. Os membros tentam usar comandos de economia e recebem aviso de economia desativada
Execute `!economia ativar` no grupo para liberar o uso dos comandos econômicos.
