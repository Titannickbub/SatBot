[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como alterar a foto do grupo ou servidor com `!setimg_chat`

O comando `!setimg_chat` (também acessível por `!setimgchat` ou `!setimg`) permite que administradores alterem rapidamente o ícone, avatar ou foto de perfil do grupo no WhatsApp e Telegram, ou do servidor no Discord, diretamente pelo chat.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Quem pode usar:** administradores do grupo ou servidor, e superusuários do bot.
- **Permissões do bot por plataforma:**
  - **WhatsApp:** o bot precisa ser **administrador do grupo** para ter autorização de alterar a foto do perfil do grupo.
  - **Telegram:** o bot precisa ter permissão de administrador para **alterar informações do grupo**.
  - **Discord:** o bot precisa ter a permissão de servidor **Gerenciar Servidor** (*Manage Guild*).
- **Onde funciona:**
  - **WhatsApp:** apenas em grupos (não funciona em conversas privadas).
  - **Telegram:** grupos e supergrupos (não funciona no privado).
  - **Discord:** em servidores (guilds).
  - **Mensagens privadas (PV):** **não suportado**.

---

## Como fornecer a imagem

O Sat Bot aceita **3 formas práticas** para definir a nova foto:

### 1. Enviar uma imagem com o comando na legenda
Envie uma foto normalmente pelo WhatsApp, Telegram ou Discord e coloque na legenda da imagem:
```text
!setimg_chat
```

### 2. Responder a uma imagem existente com o comando
Se alguém acabou de enviar uma foto no chat (ou você já enviou antes):
1. Responda/cite a mensagem que contém a imagem.
2. Digite como texto de resposta:
```text
!setimg_chat
```

### 3. Enviar uma URL direta da imagem
Você pode fornecer um link direto que aponte para um arquivo de imagem na web (PNG, JPG ou WEBP):
```text
!setimg_chat <URL-da-imagem>
```

**Exemplo:**
```text
!setimg_chat https://i.imgur.com/exemplo.png
```

---

## Formatos e regras de arquivo

- **Formatos suportados:** Imagens estáticas ou animadas comuns (`image/png`, `image/jpeg`, `image/gif`, `image/webp`).
- **Arquivos não suportados:** Vídeos, áudios, PDFs ou outros tipos de documento não são aceitos.
- **Tamanho e proporção recomendados:**
  - Imagens quadradas (1:1) com boa resolução (ex.: 512x512 ou 1024x1024 pixels) produzem os melhores resultados e evitam distorções ou cortes indesejados.
  - No Discord, arquivos muito pesados ou com formatos fora do padrão podem retornar erro de validação da API.

---

## Resumo de comandos e aliases

| Comando | Aliases | Descrição |
| --- | --- | --- |
| `!setimg_chat` | `!setimgchat`, `!setimg` | Altera a imagem do chat atual (via anexo ou resposta à mídia) |
| `!setimg_chat <URL>` | — | Baixa a imagem da URL fornecida e define como foto do chat |
| `!setimg_chat help` | `!setimg_chat ajuda` | Exibe as instruções de uso e formatos aceitos |

---

## Solução de problemas comuns

### 1. "❌ Nenhuma imagem detectada."
Você enviou apenas o comando em texto sem anexar uma foto, sem citar/responder a uma mensagem com foto e sem informar um link de imagem válido.

### 2. "❌ O arquivo enviado não é uma imagem válida. Use uma foto PNG, JPG ou GIF."
O arquivo enviado ou referenciado é um vídeo, figurinha, documento ou outro formato que não é imagem.

### 3. "❌ O bot precisa da permissão Gerenciar Servidor para alterar a imagem do servidor."
No Discord, o cargo do Sat Bot não possui a permissão nativa **Gerenciar Servidor** (*Manage Guild*). Acesse as configurações de cargos do seu servidor e ative essa permissão para o bot.

### 4. "❌ Não foi possível baixar a imagem do endereço informado. Confira o link e tente novamente."
O link informado é inacessível, requer login ou não aponta diretamente para o arquivo da imagem. Certifique-se de que o link termine em extensões de imagem como `.jpg` ou `.png`.

### 5. "❌ Não foi possível alterar a imagem deste chat. Verifique as permissões e tente novamente."
Verifique se o bot é administrador do grupo no WhatsApp/Telegram e se as permissões do grupo permitem que administradores mudem a foto do grupo.
