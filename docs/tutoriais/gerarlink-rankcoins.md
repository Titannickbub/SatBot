[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como gerar link web do ranking de economia com `!gerarlink_rankcoins`

O comando `!gerarlink_rankcoins` (também acessível por `!gerarlink-rankcoins`, `!gerarlink_rankrico`, `!linkrankcoins` ou `!linkrankrico`) gera um link exclusivo para visualizar o painel web com o ranking dos membros mais ricos (maiores saldos em satcoins) do grupo ou servidor.

Com esse link, membros e administradores podem conferir tabelas completas com posições, saldos e patrimônios da comunidade através do navegador.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Quem pode usar:** administradores do chat e superusuários do bot.
- **Onde funciona:** exclusivamente em grupos e servidores (WhatsApp, Telegram e Discord).
- **Mensagens privadas (PV):** **não suportado** (o ranking é vinculado ao chat específico).
- **Pré-requisito do painel web:** o domínio base do painel web precisa estar configurado pelo superusuário (dono do bot) através do comando `!set_dominio`. Caso contrário, o bot avisará que o painel não está configurado.

---

## Como gerar o link

Execute o comando dentro do grupo ou servidor desejado:

```text
!gerarlink_rankcoins
```

### Apelidos (aliases) disponíveis:
```text
!gerarlink-rankcoins
!gerarlink_rankrico
!linkrankcoins
!linkrankrico
```

---

## O que o painel web exibe

Ao acessar o link gerado pelo navegador:
- **Tabela de classificação:** lista ordenada dos participantes com maiores reservas de satcoins.
- **Saldos:** exibição formatada dos valores acumulados por cada membro.
- **Identificação:** nome de exibição e avatar dos membros na plataforma.
- **Pódio:** destaque visual dos 3 membros mais ricos do grupo.

---

## Resumo do comando

| Comando | Aliases | Descrição |
| --- | --- | --- |
| `!gerarlink_rankcoins` | `!gerarlink-rankcoins`, `!gerarlink_rankrico`, `!linkrankcoins`, `!linkrankrico` | Gera o link web para a página do ranking de saldos da economia |

---

## Solução de problemas comuns

### 1. "❌ Apenas administradores podem gerar links dos rankings."
Apenas moderadores e administradores do chat têm permissão para gerar links do painel web.

### 2. "❌ O painel web ainda não está configurado. Peça a um super usuário para usar set_dominio."
O bot ainda não tem a URL pública do painel web cadastrada. Solicite ao dono/administrador geral da hospedagem do Sat Bot que configure o domínio com `!set_dominio <URL>`.

### 3. "❌ Este comando só pode ser usado dentro de um grupo ou servidor."
O comando foi enviado em conversa privada (PV). Execute-o dentro do grupo ou servidor correspondente.
