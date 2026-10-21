[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como criar e gerenciar ações de roleplay com `!act_edit`

O comando `!act_edit` permite que administradores criem, customizem e gerenciem ações interativas de roleplay (RP) exclusivas para o grupo ou servidor. Com ele, você pode adicionar comandos personalizados (como `!kiss`, `!hug`, `!tapa`, `!cafune`, etc.), cadastrando frases dinâmicas e mídias visuais (GIFs animados, vídeos MP4 ou imagens) que serão enviadas pelo bot quando os membros utilizarem essas ações.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Escopo local vs. global (`!act_edit` vs `!actG_edit`)

- **`!act_edit` (Ações locais):** As ações criadas ficam salvas exclusivamente no grupo ou servidor onde o comando foi executado. Se uma ação local tiver o mesmo nome ou atalho de uma ação global do bot, **a versão local terá prioridade** naquele chat.
- **`!actG_edit` (Ações globais):** Compartilhado por todos os chats do bot. Este comando é restrito apenas a **superusuários** (donos do bot).

---

## Permissões e onde funciona

- **Quem pode usar:** administradores do grupo ou servidor (membros com cargo de admin, proprietários do chat ou permissão de gerenciar mensagens) e superusuários do bot.
- **Onde funciona:**
  - **WhatsApp:** em grupos comuns (não funciona em canais/comunidades fechadas).
  - **Telegram:** em grupos e supergrupos.
  - **Discord:** em servidores (guilds).
  - **Mensagens privadas (PV):** **não suportado** para ações locais (ações locais dependem do identificador do grupo).

---

## Limites do sistema

| Recurso | Limite por Grupo |
| --- | --- |
| **Ações cadastradas** | Até 100 ações |
| **Frases por ação** | Até 50 frases (máx. 500 caracteres cada) |
| **Mídias por ação** | Até 30 arquivos (GIF, MP4 ou imagem) |
| **Aliases (atalhos) por ação** | Até 10 aliases |
| **Tamanho máximo de mídia** | Até 50 MB por arquivo |

---

## Passo a passo: como criar e configurar uma ação

### 1. Criar uma nova ação
Escolha um nome simples (letras, números, `_` ou `-`, até 32 caracteres):

```text
!act_edit new kiss
```

---

### 2. Adicionar frases com variáveis dinâmicas
Você pode cadastrar várias frases. Quando o comando da ação for usado no chat, o bot sorteará uma das frases cadastradas.

**Variáveis disponíveis:**
- `{user1}` — Quem executou o comando da ação.
- `{user2}` — Quem foi marcado ou respondido.

```text
!act_edit message <ação> <frase>
```

**Exemplos:**
```text
!act_edit message kiss {user1} deu um beijo carinhoso em {user2}!
!act_edit message kiss {user1} beijou apaixonadamente {user2}!
```

---

### 3. Adicionar mídias (GIFs, vídeos ou imagens)
Cada ação pode ter até 30 mídias que são sorteadas aleatoriamente junto com as frases. O bot baixa e armazena os arquivos de mídia permanentemente no disco local (`act_media/`), preservando reprodução contínua em loop para GIFs no WhatsApp (`gifPlayback`).

Você pode adicionar mídias de **3 maneiras**:

1. **Por URL direta:**
   ```text
   !act_edit image kiss https://exemplo.com/beijo.gif
   ```
2. **Enviando a imagem/GIF/vídeo com o comando na legenda:**
   ```text
   !act_edit image kiss
   ```
3. **Respondendo a uma mídia existente no chat:**
   Cite a mensagem com a imagem ou GIF e envie:
   ```text
   !act_edit image kiss
   ```

> [!TIP]
> O bot detecta automaticamente o formato real do arquivo através dos *magic bytes* do cabeçalho binário, identificando se é um GIF genuíno, MP4 ou imagem estática, garantindo a reprodução correta em todas as plataformas.

---

### 4. Adicionar apelidos / atalhos (aliases)
Permite que os membros acionem o mesmo comando por outros nomes:

```text
!act_edit alias <ação> <apelido>
```

**Exemplo:**
```text
!act_edit alias kiss beijo
!act_edit alias kiss selinho
```
Agora os membros podem usar `!kiss @usuario`, `!beijo @usuario` ou `!selinho @usuario`.

---

### 5. Consultar e listar ações

- **Listar todas as ações cadastradas no grupo:**
  ```text
  !act_edit list
  ```
  Mostra todas as ações locais com aliases, status (🟢 ativa / 🔴 desativada) e número de mídias.

- **Ver detalhes completos de uma ação:**
  ```text
  !act_edit show <ação>
  ```
  Exibe o status, todos os aliases, e a lista numerada de frases e arquivos de mídia salvos com seus respectivos tamanhos em KB.

---

### 6. Inspecionar arquivos de mídia (`inspect`)
Permite inspecionar detalhes técnicos (codec real, formato detectado, MIME type, tamanho e bytes de cabeçalho):

- **Inspecionar mídias salvas de uma ação:**
  ```text
  !act_edit inspect <ação>
  ```
  **Exemplo:** `!act_edit inspect kiss`

- **Inspecionar uma mídia antes de salvar:**
  Responda a qualquer mídia ou link no chat com:
  ```text
  !act_edit inspect
  ```

---

### 7. Remover itens ou excluir a ação

- **Remover uma frase específica:**
  Consulte a numeração da frase em `!act_edit show <ação>` e remova pelo índice:
  ```text
  !act_edit remove-message <ação> <número>
  ```
  *Exemplo:* `!act_edit remove-message kiss 1`

- **Remover uma mídia específica:**
  Consulte o número da mídia em `!act_edit show <ação>`:
  ```text
  !act_edit remove-image <ação> <número>
  ```
  *Exemplo:* `!act_edit remove-image kiss 2` *(o arquivo de mídia correspondente será excluído do disco local)*.

- **Ativar ou desativar temporariamente a ação:**
  ```text
  !act_edit disable kiss
  !act_edit enable kiss
  ```

- **Excluir a ação definitivamente:**
  ```text
  !act_edit delete kiss
  ```
  *(Remove a ação do catálogo e apaga todas as suas mídias do disco)*.

---

## Resumo rápido dos subcomandos

| Subcomando | Sintaxe | Descrição |
| --- | --- | --- |
| `list` | `!act_edit list` | Lista todas as ações locais do grupo |
| `new` | `!act_edit new <nome>` | Cria uma nova ação interativa |
| `message` | `!act_edit message <ação> <texto>` | Adiciona uma frase com `{user1}` e `{user2}` |
| `image` / `media` | `!act_edit image <ação> [URL]` | Adiciona imagem, GIF ou vídeo à ação |
| `alias` | `!act_edit alias <ação> <apelido>` | Cria um apelido alternativo para acionar a ação |
| `show` | `!act_edit show <ação>` | Exibe detalhes, frases numeradas e mídias salvas |
| `inspect` | `!act_edit inspect [ação]` | Inspeciona codec real, formato e tamanho da mídia |
| `remove-message` | `!act_edit remove-message <ação> <nº>` | Remove uma frase pelo número |
| `remove-image` | `!act_edit remove-image <ação> <nº>` | Remove uma mídia pelo número e apaga o arquivo |
| `enable` / `disable` | `!act_edit enable\|disable <ação>` | Ativa ou desativa a ação no grupo |
| `delete` | `!act_edit delete <ação>` | Remove a ação e exclui todas as mídias associadas |
| `help` | `!act_edit help` | Mostra o guia de ajuda rápido no chat |

---

## Solução de problemas comuns

### 1. "❌ Apenas Administradores do grupo/servidor ou Superusuários podem administrar as ações locais."
Você precisa ter cargo de administrador ou a permissão de gerenciar mensagens no chat para utilizar o comando.

### 2. "❌ As ações locais só podem ser administradas em grupos e servidores."
Tentativa de executar o `!act_edit` em mensagens privadas (PV) ou comunidades. Como as ações locais são associadas a um grupo específico, execute o comando dentro do grupo desejado.

### 3. "❌ Ação '<nome>' não encontrada."
Verifique se digitou o nome correto ou consulte as ações existentes com `!act_edit list`.

### 4. "❌ O limite é de 30 mídias por ação / 50 frases por ação."
A ação atingiu a capacidade máxima permitida. Remova itens antigos com `!act_edit remove-image` ou `!act_edit remove-message` antes de adicionar novos.
