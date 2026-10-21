[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Auto-IA — respostas automáticas da inteligência artificial

O comando `!autoia` configura quando a IA do bot responde automaticamente às
mensagens do grupo. Você pode escolher entre desativado, responder apenas
quando mencionado ou responder a tudo.

## Permissões

- Administradores do chat
- Superusuários (owners)

## Modos disponíveis

| Modo | Descrição |
|---|---|
| `off` | Desativa as respostas automáticas da IA |
| `mention` | Responde quando mencionarem o bot, responderem a uma mensagem dele ou citarem o nome dele |
| `all` | Responde a **todas** as mensagens que não sejam comandos |

## Aliases

`!setautoia`, `!iaauto`, `!iaautomatica`

## Subcomandos

| Comando | Descrição |
|---|---|
| `!autoia off` | Desativa a IA automática |
| `!autoia mention` | Ativa no modo menção |
| `!autoia all` | Ativa para todas as mensagens |
| `!autoia status` | Exibe o modo atual |
| `!autoia help` | Mostra a ajuda do comando |

## Como usar

### Ativar por menção

```
!autoia mention
```

O bot responde automaticamente quando:
1. Alguém marcar o bot (`@bot`)
2. Alguém responder a uma mensagem do bot
3. Alguém citar o nome do bot no texto

### Ativar para todas as mensagens

```
!autoia all
```

O bot responde a **toda** mensagem no grupo que não seja um comando.

### Desativar

```
!autoia off
```

### Consultar status

```
!autoia status
```

Exibe o modo atual do Auto-IA no grupo junto com todas as opções de configuração.

## Observações

- Funciona **apenas em grupos** — no privado, use `!ia <pergunta>` diretamente.
- Apenas administradores ou superusuários podem alterar a configuração.
