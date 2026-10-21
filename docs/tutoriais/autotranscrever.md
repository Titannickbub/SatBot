[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Autotranscrever — transcrição automática de áudios

O comando `!autotranscrever` ativa a transcrição automática de áudios e músicas
recebidos no grupo, servidor ou canal. Quando ativado, toda mensagem de voz ou
áudio enviada é automaticamente convertida em texto pelo bot.

## Permissões

- Administradores do chat
- Superusuários (owners)

## Aliases

`!autotranscricao`, `!autotranscrição`

## Níveis de configuração

A configuração pode ser aplicada em diferentes níveis, dependendo da plataforma.
O nível mais específico sempre prevalece sobre os superiores.

| Plataforma | Níveis disponíveis |
|---|---|
| **Discord** | servidor, categoria, chat (canal/tópico) |
| **WhatsApp** | comunidade (quando disponível), chat (grupo) |
| **Telegram** | servidor, chat (tópico, quando disponível) |

Se nenhum nível for informado, a configuração é aplicada ao **chat atual**.

## Subcomandos

| Comando | Descrição |
|---|---|
| `!autotranscrever on` | Ativa no chat atual |
| `!autotranscrever off` | Desativa no chat atual |
| `!autotranscrever servidor on` | Ativa no nível do servidor |
| `!autotranscrever servidor off` | Desativa no nível do servidor |
| `!autotranscrever categoria on` | Ativa no nível da categoria (Discord) |
| `!autotranscrever categoria off` | Desativa no nível da categoria (Discord) |
| `!autotranscrever chat on` | Ativa explicitamente no nível do chat |
| `!autotranscrever chat off` | Desativa explicitamente no nível do chat |
| `!autotranscrever status` | Exibe se a transcrição está ativa e em qual nível |
| `!autotranscrever help` | Mostra a ajuda do comando |

## Como usar

### Ativar para o chat atual

```
!autotranscrever on
```

### Ativar para todo o servidor

```
!autotranscrever servidor on
```

### Desativar apenas para uma categoria (Discord)

```
!autotranscrever categoria off
```

Isso desativa a transcrição na categoria mesmo que esteja ativada no servidor.

### Consultar status

```
!autotranscrever status
```

O bot informa se a transcrição está ativa e qual nível está definindo o estado.

## Observações

- Funciona **apenas em grupos/servidores** — não disponível no privado.
- Quando ativado, áudios e músicas são transcritos automaticamente em texto.
- O nível mais específico (chat) prevalece sobre os mais gerais (categoria, servidor).
