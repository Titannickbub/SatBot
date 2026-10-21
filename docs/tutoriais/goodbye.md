[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como configurar despedidas automáticas com `!goodbye`

O comando `!goodbye` (também chamado `!despedida` ou `!bye`) configura
mensagens automáticas que são enviadas quando um membro sai do grupo ou
servidor. A mensagem pode ser apenas texto ou incluir uma imagem, vídeo
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
    ativo por servidor.

---

## Passo a passo de configuração

Recomenda-se personalizar o texto e (opcionalmente) a mídia antes de ativar
o sistema.

### 1. Personalizar o texto da mensagem

```text
!goodbye text Até logo, {user}! Sentiremos sua falta no {group}.
```

#### Variáveis disponíveis

As variáveis abaixo são substituídas automaticamente quando alguém sai:

| Variável | Resultado |
| --- | --- |
| `{user}` ou `{mention}` | Nome do membro que saiu |
| `{group}` ou `{server}` | Nome do grupo ou servidor |
| `{count}` ou `{members}` | Quantidade total de membros |

### 2. Escolher o modo de envio

```text
!goodbye mode texto
!goodbye mode media
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
!goodbye media
```

A mídia será salva permanentemente no bot. Se a legenda contiver texto
adicional (além do comando), ele também será usado como texto de despedida.

#### b) Responder a uma mídia existente

Responda a uma foto, vídeo ou GIF já enviada no chat com:

```text
!goodbye media
```

#### c) Informar uma URL

```text
!goodbye media https://exemplo.com/imagem.png
```

O bot baixará a mídia e a salvará permanentemente no disco local.

> [!NOTE]
> Mídias enviadas diretamente ao bot ou baixadas de URL são armazenadas
> permanentemente em disco local e não expiram.

### 4. Testar a prévia da mensagem

Antes de ativar, confira como a mensagem ficará com:

```text
!goodbye test
```

O bot enviará uma demonstração usando o texto e modo configurados, com dados
de exemplo.

### 5. Ativar a despedida

```text
!goodbye on
```

A partir desse momento, quando um membro sair, o bot enviará a mensagem
automática.

Para desativar sem perder as configurações:

```text
!goodbye off
```

---

## Consultar a configuração atual (`!goodbye status`)

```text
!goodbye status
```

O bot exibirá um painel como este:

```text
👋 SISTEMA DE DESPEDIDA — STATUS

📌 ESTADO E CONFIGURAÇÕES:
  • Estado:           ✅ ATIVADO
  • Modo de Envio:    📝 Apenas Texto
  • Mensagem:         "Até logo, {user}! Sentiremos sua falta no {group}."
  • Mídia Anexada:    Nenhuma mídia vinculada
```

---

## Restaurar configurações padrão (`!goodbye reset`)

Para desativar o sistema e redefinir todas as configurações ao padrão:

```text
!goodbye reset
```

---

## Resumo dos comandos

| Comando | Descrição |
| --- | --- |
| `!goodbye on` | Ativa a despedida automática |
| `!goodbye off` | Desativa sem apagar as configurações |
| `!goodbye status` | Exibe o estado e configurações atuais |
| `!goodbye text <mensagem>` | Define o texto da mensagem de despedida |
| `!goodbye mode texto` | Define o modo somente texto |
| `!goodbye mode media` | Define o modo com mídia + texto |
| `!goodbye media` | Salva a mídia anexada ou respondida |
| `!goodbye media <URL>` | Baixa e salva mídia de uma URL |
| `!goodbye test` | Envia uma prévia da mensagem configurada |
| `!goodbye reset` | Restaura todas as configurações ao padrão |
| `!goodbye help` | Exibe a ajuda detalhada no chat |

---

## Diferença entre `!welcome` e `!goodbye`

Os dois comandos funcionam de forma idêntica, mas em momentos opostos:

| | `!welcome` | `!goodbye` |
| --- | --- | --- |
| **Quando dispara** | Quando um membro **entra** | Quando um membro **sai** |
| **Texto padrão** | Mensagem de boas-vindas | Mensagem de despedida |
| **Configuração** | Independente | Independente |

Ambos podem estar ativos ao mesmo tempo no mesmo chat.

---

## Solução de problemas comuns

1. **"Este comando só pode ser usado em grupos ou servidores":** o goodbye
   não funciona em conversas privadas. Execute-o dentro de um grupo.
2. **"Disponível apenas em grupos de conversa" (WhatsApp):** comunidades do
   WhatsApp não são suportadas; use em um grupo comum.
3. **A mensagem não aparece quando alguém sai:**
   - Confirme que o sistema está ativado (`!goodbye status`).
   - No Discord, verifique se o canal correto está ativo (apenas um por
     servidor).
   - Verifique se o bot possui permissão de enviar mensagens no chat.
4. **A mídia não aparece na mensagem:**
   - Certifique-se de que o modo está em `media` (`!goodbye mode media`).
   - Confirme que a mídia foi salva (`!goodbye status` mostra a mídia
     anexada).
5. **"Aviso de Mídia Expirável":** mídias configuradas por link externo
   antigo podem expirar. Redefina enviando a mídia diretamente com
   `!goodbye media` para salvá-la permanentemente.
