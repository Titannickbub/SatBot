[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como gerar links web do ranking de atividade

Os comandos `!gerarlink_rankativos` e `!gerarlink_rankativos_all` geram links
exclusivos para visualizar o painel web interativo com as estatísticas de
mensagens e participação dos membros do grupo ou servidor.

- **`!gerarlink_rankativos`:** exibe o ranking web dos membros que já possuem
  mensagens e atividade registradas.
- **`!gerarlink_rankativos_all`:** exibe o ranking completo com **todos** os
  participantes do grupo, incluindo membros sem atividade registrada (membros
  inativos).

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e pré-requisitos

- **Quem pode usar:** apenas **administradores** do chat e Super Usuários.
- **Onde funciona:** exclusivamente em grupos e servidores (WhatsApp, Discord e
  Telegram). O comando não funciona em conversas privadas (PV).
- **Configuração do painel web:** para que o link funcione, o bot precisa estar
  com o domínio do painel web configurado. Se o painel ainda não estiver ativo,
  solicite a um Super Usuário a configuração via comando `!set_dominio`.

---

## 1. Ranking de membros ativos (`!gerarlink_rankativos`)

Gera um link focado nos membros participantes que já possuem atividade
computada no chat.

### Sintaxe

```text
!gerarlink_rankativos
```

Também pode ser executado pelos apelidos:

```text
!gerarlink-rankativos
!linkrankativos
!gerarlink_atividade
```

### O que o painel exibe

- Lista ordenada dos membros mais ativos do grupo ou servidor.
- Contadores de mensagens e pontuação de atividade.
- Pódio com os destaques de engajamento da comunidade.

---

## 2. Ranking completo de todos os membros (`!gerarlink_rankativos_all`)

Gera um link com a lista total de participantes do grupo, inclusive aqueles que
ainda não enviaram nenhuma mensagem.

### Sintaxe

```text
!gerarlink_rankativos_all
```

Também pode ser executado pelos apelidos:

```text
!gerarlink-rankativos-all
!gerarlink_rankativos_todos
```

### Para que serve o ranking completo?

- **Identificar membros inativos ("fantasmas"):** no WhatsApp e em grupos, esse
  comando mapeia todos os participantes atuais do grupo, permitindo aos
  administradores visualizarem facilmente quem nunca interagiu ou está inativo há
  muito tempo.
- **Moderação e limpeza de membros:** facilita a conferência de quem não
  participa antes de realizar limpezas ou reestruturações no grupo.

---

## Comparativo entre os dois comandos

| Recurso | `!gerarlink_rankativos` | `!gerarlink_rankativos_all` |
| --- | --- | --- |
| **Membros exibidos** | Apenas membros com atividade registrada | Todos os participantes do grupo/servidor |
| **Inclui membros com 0 mensagens?** | Não | Sim |
| **Principal finalidade** | Visualizar engajamento e membros mais ativos | Identificar membros inativos e auditoria geral |
| **Quem pode gerar** | Administradores e Super Usuários | Administradores e Super Usuários |

---

## Solução de problemas comuns

1. **"O painel web ainda não está configurado":**
   - O servidor web do bot necessita de um endereço público configurado. Peça ao
     dono ou Super Usuário do bot para definir o endereço com o comando
     `!set_dominio <url>` (por exemplo: `!set_dominio https://painel.meubot.com`).
2. **"Apenas administradores podem gerar links dos rankings":**
   - Apenas moderadores e administradores têm permissão para acessar os links de
     estatísticas web.
3. **"Este comando só pode ser usado dentro de um grupo ou servidor":**
   - O ranking é gerado com base no identificador do chat atual. Envie o comando
     diretamente no grupo desejado.
