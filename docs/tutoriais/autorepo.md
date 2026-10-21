[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Autorepo — respostas automáticas por palavras-chave

O comando `!autorepo` gerencia respostas e reações automáticas acionadas por
palavras-chave no grupo. Você pode criar gatilhos locais (exclusivos do grupo)
e controlar se o catálogo global oficial do bot também será utilizado.

## Permissões

- Administradores do chat
- Superusuários (owners)

## Aliases

`!autoresposta`, `!auto_resposta`, `!autoresp`, `!respostas`

## Subcomandos

| Comando | Descrição |
|---|---|
| `!autorepo on` | Ativa as respostas automáticas (locais + globais) |
| `!autorepo off` | Desativa o autorepo no grupo |
| `!autorepo global on` | Reativa as respostas globais oficiais no grupo |
| `!autorepo global off` | Desativa apenas as respostas globais, mantendo as locais |
| `!autorepo add <gatilho> = <resposta>` | Adiciona uma resposta de texto local |
| `!autorepo add react <gatilho> = <emoji>` | Adiciona uma reação com emoji |
| `!autorepo add contains <gatilho> = <resposta>` | Gatilho por palavra contida na mensagem |
| `!autorepo add starts <gatilho> = <resposta>` | Gatilho por início da mensagem |
| `!autorepo del <gatilho>` | Remove uma resposta local |
| `!autorepo list` | Lista todas as respostas do grupo |
| `!autorepo status` | Exibe o estado atual do autorepo |
| `!autorepo limpar` | Remove todas as respostas locais |
| `!autorepo help` | Mostra a ajuda completa |

## Como usar

### 1. Ativar ou desativar

```
!autorepo on
!autorepo off
```

Ao ativar com `!autorepo on`, tanto as respostas locais quanto as globais ficam
ativas simultaneamente.

### 2. Controlar respostas globais

```
!autorepo global off
!autorepo global on
```

Use `global off` para ignorar o catálogo oficial e usar apenas as respostas
cadastradas localmente pelo grupo.

### 3. Adicionar respostas

**Resposta de texto exata (padrão):**
```
!autorepo add regras = 📜 Respeitem as regras do grupo!
!autorepo add pix = 💸 Chave Pix: pix@exemplo.com
!autorepo add oi = Olá, {user}! Bem-vindo(a) ao {grupo}!
```

**Reação com emoji:**
```
!autorepo add react bom dia = ☀️
!autorepo add react satbot = 🤖
!autorepo add react parabens = 🎉
```

**Gatilho por palavra contida na mensagem (`contains`):**
```
!autorepo add contains suporte = 📞 Chame um administrador no privado!
!autorepo add contains meme = 😂
```

**Gatilho por início da mensagem (`starts`):**
```
!autorepo add starts salve = Salve, {user}! Tmj 👊
```

### 4. Remover uma resposta

```
!autorepo del regras
!autorepo del bom dia
```

### 5. Listar e consultar

```
!autorepo list
!autorepo status
```

### 6. Limpar todas as respostas locais

```
!autorepo limpar
```

## Variáveis aceitas no texto da resposta

| Variável | Descrição |
|---|---|
| `{user}` ou `{nome}` | Nome do usuário que enviou a mensagem |
| `{bot}` | Nome configurado do bot |
| `{grupo}` ou `{chat}` | Nome do grupo atual |
| `{hora}` ou `{horario}` | Hora atual (ex: 08:55) |
| `{horas}` | Hora completa com segundos (ex: 08:55:40) |
| `{data}` | Data atual (ex: 09/10/2026) |
| `{dia_semana}` | Dia da semana (ex: sexta-feira) |
| `{saudacao}` | Saudação automática (Bom dia / Boa tarde / Boa noite) |

## Observações

- Funciona **apenas em grupos** — não disponível no privado.
- **Não funciona em comunidades.**
- Cada resposta local tem um cooldown de 5 segundos entre ativações.
