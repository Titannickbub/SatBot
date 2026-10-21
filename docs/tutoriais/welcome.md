[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como configurar boas-vindas automáticas com `!welcome`

O comando `!welcome` (também chamado `!boasvindas` ou `!welc`) configura
mensagens automáticas que são enviadas quando um novo membro entra no grupo
ou servidor. A mensagem pode ser apenas texto ou incluir uma imagem, vídeo
ou GIF.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e onde funciona

- **Quem pode usar:** apenas **administradores** do chat e Super Usuários.
- **Onde funciona:**
  - **WhatsApp:** grupos de conversa. **Não** funciona em comunidades nem em
    conversas privadas.
  - **Telegram:** chat principal ou tópico específico.
  - **Discord:** canal de texto ou thread. **Apenas um canal** pode estar
    ativo por servidor — ativar em outro canal desativa o anterior
    automaticamente.

---

## Passo a passo de configuração

Recomenda-se personalizar o texto e (opcionalmente) a mídia antes de ativar
o sistema.

### 1. Personalizar o texto da mensagem

```text
!welcome text Seja bem-vindo(a) ao {group}, {user}! Agora somos {count} membros.
```

#### Variáveis disponíveis

As variáveis abaixo são substituídas automaticamente quando alguém entra:

| Variável | Resultado |
| --- | --- |
| `{user}` ou `{mention}` | Menção ou nome do novo membro |
| `{group}` ou `{server}` | Nome do grupo ou servidor |
| `{count}` ou `{members}` | Quantidade total de membros |

### 2. Escolher o modo de envio

O bot pode enviar a mensagem de duas formas:

```text
!welcome mode texto
!welcome mode media
```

| Modo | Comportamento |
| --- | --- |
| `texto` | Envia apenas a mensagem de texto |
| `media` | Envia a mensagem junto com uma imagem, vídeo ou GIF configurado |

### 3. Configurar a mídia (opcional)

Se escolher o modo `media`, é necessário configurar qual mídia será enviada.
Existem três formas de fazer isso:

#### a) Enviar a mídia diretamente com o comando na legenda

Envie uma foto, vídeo ou GIF e escreva na legenda:

```text
!welcome media
```

A mídia será salva permanentemente no bot. Se a legenda contiver texto
adicional (além do comando), ele também será usado como texto de boas-vindas.

#### b) Responder a uma mídia existente

Responda a uma foto, vídeo ou GIF já enviada no chat com:

```text
!welcome media
```

#### c) Informar uma URL

```text
!welcome media https://exemplo.com/imagem.png
```

O bot baixará a mídia e a salvará permanentemente no disco local.

> [!NOTE]
> Mídias enviadas diretamente ao bot ou baixadas de URL são armazenadas
> permanentemente em disco local e não expiram.

### 4. Testar a prévia da mensagem

Antes de ativar, confira como a mensagem ficará com:

```text
!welcome test
```

O bot enviará uma demonstração usando o texto e modo configurados, com dados
de exemplo.

### 5. Ativar as boas-vindas

```text
!welcome on
```

A partir desse momento, todo novo membro que entrar receberá a mensagem
automática.

Para desativar sem perder as configurações:

```text
!welcome off
```

---

## Consultar a configuração atual (`!welcome status`)

```text
!welcome status
```

O bot exibirá um painel como este:

```text
👋 SISTEMA DE BOAS-VINDAS — STATUS

📌 ESTADO E CONFIGURAÇÕES:
  • Estado:           ✅ ATIVADO
  • Modo de Envio:    🖼️ Mídia + Texto
  • Mensagem:         "Seja bem-vindo(a) ao {group}, {user}!"
  • Mídia Anexada:
     • Arquivo: welcome_media.png
     • Tipo: IMAGE
     💾 Armazenamento: Disco Local Permanente (não expira)
```

---

## Restaurar configurações padrão (`!welcome reset`)

Para desativar o sistema e redefinir todas as configurações ao padrão:

```text
!welcome reset
```

---

## Resumo dos comandos

| Comando | Descrição |
| --- | --- |
| `!welcome on` | Ativa as boas-vindas automáticas |
| `!welcome off` | Desativa sem apagar as configurações |
| `!welcome status` | Exibe o estado e configurações atuais |
| `!welcome text <mensagem>` | Define o texto da mensagem de boas-vindas |
| `!welcome mode texto` | Define o modo somente texto |
| `!welcome mode media` | Define o modo com mídia + texto |
| `!welcome media` | Salva a mídia anexada ou respondida |
| `!welcome media <URL>` | Baixa e salva mídia de uma URL |
| `!welcome test` | Envia uma prévia da mensagem configurada |
| `!welcome reset` | Restaura todas as configurações ao padrão |
| `!welcome help` | Exibe a ajuda detalhada no chat |

---

## Solução de problemas comuns

1. **"Este comando só pode ser usado em grupos ou servidores":** o welcome
   não funciona em conversas privadas. Execute-o dentro de um grupo.
2. **"Disponível apenas em grupos de conversa" (WhatsApp):** comunidades do
   WhatsApp não são suportadas; use em um grupo comum.
3. **A mensagem não aparece quando alguém entra:**
   - Confirme que o sistema está ativado (`!welcome status`).
   - No Discord, verifique se o canal correto está ativo (apenas um por
     servidor).
   - Verifique se o bot possui permissão de enviar mensagens no chat.
4. **A mídia não aparece na mensagem:**
   - Certifique-se de que o modo está em `media` (`!welcome mode media`).
   - Confirme que a mídia foi salva (`!welcome status` mostra a mídia
     anexada).
5. **"Aviso de Mídia Expirável":** mídias configuradas por link externo
   antigo podem expirar. Redefina enviando a mídia diretamente com
   `!welcome media` para salvá-la permanentemente.
