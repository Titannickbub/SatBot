[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como consultar rankings visuais e listas com `!rank`

O comando `!rank` permite visualizar os rankings de **XP**, **Atividade** e **Satcoins (Economia)** do grupo ou servidor.

O Sat Bot disponibiliza duas formas de visualização:
1. **Banner visual de imagem (Padrão):** gera e envia automaticamente uma imagem personalizada com o **Top 5** participantes, avatares, pontuações e destaques do grupo.
2. **Lista completa em texto (`list`):** exclusiva para administradores, lista todos os membros do grupo com contadores detalhados e menções no chat.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Onde funciona:** disponível em grupos e servidores no **WhatsApp**, **Telegram** e **Discord**. Não funciona em conversas privadas (PV).
- **Quem pode consultar o banner visual (Top 5):** todos os membros do grupo.
- **Quem pode consultar a lista completa (`list`):** apenas **administradores** do grupo/servidor e superusuários, pois a lista menciona os participantes e exibe dados consolidados de todos os membros.
- **Sistemas ativos:** o sistema consultado (XP, Atividade ou Economia) precisa estar ativado no chat.

---

## Categorias e opções disponíveis

O comando `!rank` atende às três principais frentes de engajamento da comunidade:

```text
!rank <categoria> [ordem] [list]
```

### 1. Ranking de XP (Experiência e Níveis)
- **Top 5 maiores valores de XP:**
  ```text
  !rank xp
  ```
  *(Atalhos: `!rankxp`, `!rankingxp`)*
- **Menores valores de XP:**
  ```text
  !rank notxp
  ```
- **Lista completa em texto (Admins):**
  ```text
  !rank xp list
  !rank notxp list
  ```
  Exibe cada membro, total de XP e nível alcançado.

---

### 2. Ranking de Atividade (Mensagens e Participação)
- **Top 5 membros mais ativos:**
  ```text
  !rank ativos
  ```
  *(Atalhos: `!rankativos`, `!rankingativos`, `!rankatividade`)*
- **Menos ativos com registros salvos:**
  ```text
  !rank inativos
  ```
  *(Atalhos: `!rankinativos`, `!rank_inativos`)*
- **Lista completa em texto (Admins):**
  ```text
  !rank ativos list
  !rank inativos list
  ```
  Exibe o total de atividades, mensagens enviadas, comandos executados, figurinhas enviadas e arquivos anexados.

---

### 3. Ranking de Satcoins (Economia e Riqueza)
- **Top 5 membros mais ricos:**
  ```text
  !rank rico
  ```
  *(Atalhos: `!rankrico`, `!rankcoins`)*
- **Menores saldos registrados:**
  ```text
  !rank pobre
  ```
  *(Atalhos: `!rankpobre`)*
- **Lista completa em texto (Admins):**
  ```text
  !rank rico list
  !rank pobre list
  ```
  Exibe os saldos formatados de todos os membros cadastrados na economia do chat.

---

## Visualização em Banner vs. Visualização em Lista (`list`)

### Banner Visual (Padrão)
Ao enviar `!rank xp`, `!rank ativos` ou `!rank rico` sem a palavra `list`, o bot gera e envia uma **imagem estilizada** em alta definição (`rankxp.png`, `rankatividade.png` ou `rankcoins.png`) contendo o pódio com os 5 melhores classificados.

### Lista Completa em Texto (`list`)
Ao adicionar `list` (ou `lista`), o bot formata uma mensagem de texto detalhada:
```text
📊 RANKING DE ATIVIDADE — mais ativos
🏠 Comunidade dos Membros
👥 Total: 18

1. @João — 450 atividades (💬 380, ⚙️ 40, 🎨 20, 📎 10)
2. @Maria — 320 atividades (💬 300, ⚙️ 15, 🎨 5, 📎 0)
3. @Pedro — 210 atividades (💬 190, ⚙️ 12, 🎨 8, 📎 0)
...
```

> [!NOTE]
> No WhatsApp, a opção `list` sincroniza a lista de membros via metadados do grupo, incluindo todos os participantes atuais e sinalizando quem ainda não possui dados registrados.

---

## Resumo de comandos e atalhos

| Categoria | Banner Visual (Top 5) | Lista Completa (Admins) | Atalhos Diretos |
| --- | --- | --- | --- |
| **XP** | `!rank xp` | `!rank xp list` | `!rankxp`, `!rankingxp` |
| **Menos XP** | `!rank notxp` | `!rank notxp list` | — |
| **Atividade** | `!rank ativos` | `!rank ativos list` | `!rankativos`, `!rankatividade` |
| **Menos Ativos** | `!rank inativos` | `!rank inativos list` | `!rankinativos` |
| **Mais Ricos** | `!rank rico` | `!rank rico list` | `!rankrico`, `!rankcoins` |
| **Menores Saldos**| `!rank pobre` | `!rank pobre list` | `!rankpobre` |

Para consultar a ficha individual de um usuário específico, veja o tutorial do comando [`!rankinfo`](./rankinfo.md).

---

## Solução de problemas comuns

### 1. "❌ Apenas administradores podem usar a versão list dos rankings..."
Membros comuns não podem usar o sufixo `list`, pois a lista menciona todos os participantes e gera notificações em massa. Utilize a versão sem `list` para ver o banner Top 5.

### 2. "ℹ️ O sistema de [XP/Atividade/Economia] está desativado neste grupo/servidor."
O recurso consultado foi desativado pela moderação. Ative com `!atividade ativar`, `!economia ativar` ou o comando correspondente de XP.

### 3. "ℹ️ Ainda não há registros neste ranking."
Nenhum membro do grupo pontuou ainda no sistema escolhido. Conforme as mensagens forem enviadas, os dados passarão a ser contabilizados automaticamente.
