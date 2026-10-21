[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como renomear servidores, categorias e canais com `!setname`

O comando `!setname` (também acessível por `!setname_chat`, `!chatname` ou `!rename`) permite que administradores alterem o nome de servidores, categorias, canais, tópicos de fórum ou grupos diretamente por mensagem, sem precisar abrir as configurações manuais do aplicativo.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Quem pode usar:** administradores do grupo ou servidor, e superusuários do bot.
- **Permissões do bot por plataforma:**
  - **WhatsApp:** o bot precisa ser **administrador do grupo** com permissão para editar dados do grupo.
  - **Telegram:** o bot precisa ser **administrador do grupo** com permissão para alterar informações do chat ou gerenciar tópicos (caso esteja em fórum).
  - **Discord:** o bot precisa ter permissão de **Gerenciar Servidor** (*Manage Guild*), **Gerenciar Canais** (*Manage Channels*) e/ou **Gerenciar Threads** (*Manage Threads*), conforme o nível escolhido.
- **Onde funciona:**
  - Em grupos do WhatsApp, grupos/supergrupos do Telegram e canais de servidores do Discord.
  - **Mensagens privadas (PV):** **não suportado**.

---

## Níveis suportados por plataforma

O comando aceita um parâmetro opcional de **nível** antes do novo nome. Veja o comportamento por plataforma:

| Plataforma | Níveis válidos | O que cada nível renomeia |
| --- | --- | --- |
| **Discord** | `server`, `categoria`, `chat` | • `server`: o servidor inteiro<br>• `categoria`: a categoria onde o canal atual está localizado<br>• `chat`: o canal de texto ou thread atual |
| **Telegram** | `server`, `chat` | • `server`: o grupo/chat<br>• `chat`: o tópico atual (em grupos com tópicos/fórum) ou o próprio grupo caso executado fora de tópicos |
| **WhatsApp** | `server`, `chat` | Ambos (`server` ou `chat`) renomeiam o grupo atual do WhatsApp |

> [!NOTE]
> Se você **omitir o nível**, o bot utilizará automaticamente o nível padrão `chat` (renomeando o canal, tópico ou grupo atual).

---

## Sintaxe e exemplos práticos

### 1. Renomeação rápida (nível padrão `chat`)
Quando você não especifica o nível, o bot renomeia o canal atual (Discord), o tópico/grupo atual (Telegram) ou o grupo atual (WhatsApp):

```text
!setname <novo nome>
```

**Exemplos:**
```text
!setname Grupo de Discussões
!setname bate-papo-geral
```

---

### 2. Renomear o servidor (`server`)
Altera o nome do servidor no Discord ou do grupo no Telegram/WhatsApp:

```text
!setname server <novo nome>
```

**Exemplo:**
```text
!setname server Comunidade Oficial Sat Bot
```

---

### 3. Renomear uma categoria no Discord (`categoria`)
Disponível exclusivamente no Discord. Altera o nome da categoria pai à qual o canal atual pertence:

```text
!setname categoria <novo nome>
```

**Exemplo:**
```text
!setname categoria Canais de Jogos
```

---

### 4. Renomear canal ou tópico (`chat`)
Especifica explicitamente a alteração do canal/thread no Discord ou do tópico no Telegram:

```text
!setname chat <novo nome>
```

**Exemplos:**
```text
!setname chat anúncios-e-regras
!setname chat Dúvidas Frequentes
```

---

### 5. Exibir ajuda
Para ver os níveis e regras direto no chat:

```text
!setname help
```
*(ou `!setname ajuda`)*

---

## Resumo de comandos e aliases

| Comando | Aliases | Descrição |
| --- | --- | --- |
| `!setname <nome>` | `!setname_chat`, `!chatname`, `!rename` | Renomeia o chat/canal/grupo atual (nível padrão `chat`) |
| `!setname server <nome>` | — | Renomeia o servidor (Discord) ou o grupo (Telegram/WhatsApp) |
| `!setname categoria <nome>` | — | Renomeia a categoria do canal atual (apenas Discord) |
| `!setname chat <nome>` | — | Renomeia o canal/thread atual (Discord) ou tópico/grupo (Telegram/WhatsApp) |
| `!setname help` | `!setname ajuda` | Exibe a ajuda com os níveis válidos por plataforma |

---

## Solução de problemas comuns

### 1. "❌ Nível inválido. Níveis válidos para..."
Você informou um nível que não existe na plataforma atual (por exemplo, usar `categoria` no WhatsApp ou Telegram). No WhatsApp e Telegram, use apenas `server` ou `chat` (ou omita o nível).

### 2. "❌ Você não tem permissão para renomear esse nível no Discord."
No Discord, o bot checa as permissões específicas do membro:
- Para `server`: requer **Gerenciar Servidor** (*Manage Guild*) ou **Administrador**.
- Para `categoria` e `chat`: requer **Gerenciar Canais** (*Manage Channels*) ou **Administrador** (ou **Gerenciar Threads** caso esteja em um tópico).

### 3. "❌ Não foi possível identificar a categoria deste canal."
No Discord, você usou `!setname categoria`, mas o canal de texto atual não pertence a nenhuma categoria (está solto na raiz do servidor).

### 4. "❌ Não foi possível alterar o nome. Verifique as permissões e tente novamente."
O bot pode não ter cargo superior ao elemento que está tentando alterar (hierarquia de cargos no Discord), ou no WhatsApp/Telegram as configurações do grupo estão travadas apenas para administradores e o bot não é admin.
