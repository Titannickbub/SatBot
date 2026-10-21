[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como gerar link web do ranking de XP com `!gerarlink_rankxp`

O comando `!gerarlink_rankxp` (também acessível por `!gerarlink-rankxp` ou `!linkrankxp`) gera um link exclusivo para visualizar a página web com o ranking de experiência (XP) e níveis de todos os membros do grupo ou servidor.

Com esse link, qualquer participante pode consultar pelo navegador a tabela completa de classificação, níveis atuais e barras de progresso da comunidade.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Quem pode usar:** apenas administradores do chat e superusuários do bot.
- **Onde funciona:** exclusivamente em grupos e servidores (**WhatsApp**, **Telegram** e **Discord**). Não funciona em conversas privadas (PV).
- **Pré-requisito do painel web:** o domínio base do painel web precisa estar configurado pelo superusuário (dono do bot) através do comando `!set_dominio`. Caso contrário, o bot avisará que o painel web não está configurado.

---

## Como gerar o link

Execute o comando dentro do grupo ou servidor:

```text
!gerarlink_rankxp
```

### Apelidos (aliases) disponíveis:
```text
!gerarlink-rankxp
!linkrankxp
```

---

## O que o painel web exibe

Ao abrir o link no navegador:
- **Tabela de classificação:** lista ordenada dos participantes com maior quantidade de XP acumulada.
- **Níveis atuais:** indicação visual do nível de cada participante (*Level 1, 2, 3...*).
- **Identificação:** foto de perfil/avatar e nome de exibição de cada membro na plataforma.
- **Pódio:** destaque visual com os líderes do ranking.

---

## Resumo do comando

| Comando | Aliases | Descrição |
| --- | --- | --- |
| `!gerarlink_rankxp` | `!gerarlink-rankxp`, `!linkrankxp` | Gera o link web para a página do ranking de experiência e níveis |

---

## Solução de problemas comuns

### 1. "❌ Apenas administradores podem gerar links dos rankings."
Apenas membros com cargo administrativo ou superusuários do bot podem gerar o link web do ranking.

### 2. "❌ O painel web ainda não está configurado. Peça a um super usuário para usar set_dominio."
A URL base do painel web ainda não foi definida no bot. Solicite ao dono do bot que execute `!set_dominio <URL>` para cadastrar o endereço da hospedagem.

### 3. "❌ Este comando só pode ser usado dentro de um grupo ou servidor."
O comando foi enviado no privado (PV). Execute-o dentro do grupo ou servidor correspondente.
