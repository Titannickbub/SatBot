[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como aprovar participantes automaticamente com `!autoaceitar`

O comando `!autoaceitar` (também conhecido por `!autoaprovar` ou `!autoapprove`)
automatiza a aprovação de solicitações de entrada de novos membros em grupos que
exigem aprovação prévia dos administradores.

O recurso inclui filtros de segurança (bloqueio por palavras-chave ou símbolos) e
limitação por horários de funcionamento para proteger a comunidade contra contas
suspeitas ou bots de spam.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e onde funciona

- **Quem pode usar:** apenas **administradores** do chat e Super Usuários.
- **Permissão do bot:** o bot precisa ser **administrador** do grupo para
  conseguir aprovar as solicitações de entrada.
- **Onde funciona:**
  - **WhatsApp:** grupos com a opção *"Aprovar novos participantes"* ativada.
  - **Telegram:** grupos e supergrupos com a opção *"Aprovar novos membros"*
    (*Join Requests*) ativada.
  - **Discord:** **não disponível** (o Discord não utiliza fila de pedidos de
    entrada nesse formato).

---

## Passo a passo de configuração

Recomenda-se configurar os filtros e intervalos desejados antes de ativar o
recurso.

### 1. Definir o intervalo entre aprovações

Para evitar sobrecarga de notificações ou bloqueios de requisições na
plataforma, defina um espaçamento (em segundos) entre as aprovações:

```text
!autoaceitar intervalo 30
!autoaceitar intervalo 10
```

Se desejar que as aprovações ocorram imediatamente assim que o pedido chegar,
use `0`:

```text
!autoaceitar intervalo 0
```

### 2. Configurar filtros de segurança (bloqueios)

Você pode configurar filtros para que pedidos com determinados termos ou
símbolos no nome não sejam aprovados automaticamente:

#### Bloquear palavras no nome ou usuário

```text
!autoaceitar bloquear nome spam
!autoaceitar bloquear nome bot
!autoaceitar bloquear nome casino
```

#### Bloquear símbolos ou emojis

```text
!autoaceitar bloquear simbolo 🔞
!autoaceitar bloquear simbolo ⚠️
```

> [!NOTE]
> Pedidos que coincidirem com os filtros configurados não são aprovados pelo
> bot, permanecendo na fila para que os administradores revisem manualmente.

#### Remover filtros cadastrados

Para desbloquear um termo ou símbolo, informe o mesmo valor utilizado:

```text
!autoaceitar desbloquear nome spam
!autoaceitar desbloquear simbolo 🔞
```

### 3. Limitar a horários de funcionamento (opcional)

Caso prefira que as aprovações automáticas só ocorram em horários específicos
do dia (por exemplo, enquanto houver moderadores online):

```text
!autoaceitar horarios 08:00-18:00
```

Para definir mais de uma faixa no dia, separe-as por vírgula (sem espaços):

```text
!autoaceitar horarios 08:00-12:00,14:00-20:00
```

Para remover a restrição e permitir aprovações 24 horas por dia:

```text
!autoaceitar horarios off
```

### 4. Ativar o autoaceitar

Com as regras configuradas, ative o sistema:

```text
!autoaceitar on
```

A partir desse momento, novos pedidos válidos serão aprovados automaticamente
pelo bot.

Para pausar o serviço a qualquer momento sem perder os filtros configurados:

```text
!autoaceitar off
```

---

## Consultar a configuração atual (`!autoaceitar status`)

Digite o comando abaixo para visualizar o resumo das regras ativas no grupo:

```text
!autoaceitar status
```

O bot exibirá um painel como este:

```text
📌 Autoaceitar:
Estado: Ativo
Intervalo: 30s
Bloqueios por nome: spam, bot
Bloqueios por símbolo: 🔞
Horários: 08:00-18:00
```

---

## Resumo dos comandos

| Comando | Descrição |
| --- | --- |
| `!autoaceitar on` | Ativa a aprovação automática de pedidos |
| `!autoaceitar off` | Pausa a aprovação automática |
| `!autoaceitar status` | Exibe as regras e o estado atual do grupo |
| `!autoaceitar intervalo <segundos>` | Define o intervalo entre cada aprovação (`0` para imediato) |
| `!autoaceitar bloquear nome <texto>` | Adiciona filtro para ignorar pedidos com esse termo |
| `!autoaceitar bloquear simbolo <símbolo>` | Adiciona filtro para ignorar pedidos com esse símbolo/emoji |
| `!autoaceitar desbloquear nome <texto>` | Remove um termo do filtro de nomes |
| `!autoaceitar desbloquear simbolo <símbolo>` | Remove um símbolo do filtro de símbolos |
| `!autoaceitar horarios <início-fim>` | Restringe aprovações aos horários informados (`HH:MM`) |
| `!autoaceitar horarios off` | Libera aprovações para qualquer horário |
| `!autoaceitar help` | Exibe a ajuda detalhada no chat |

---

## Solução de problemas comuns

1. **"O autoaceitar só está disponível em grupos do Telegram e WhatsApp":** o
   recurso não opera no Discord nem em conversas privadas.
2. **Pedidos não estão sendo aprovados:**
   - Certifique-se de que o recurso está ativado (`!autoaceitar status`).
   - Verifique se a opção de aprovação manual de membros está ativada nas
     configurações do próprio grupo no WhatsApp ou Telegram.
   - Confira se o bot é administrador do grupo e possui permissão para aprovar
     novos participantes.
   - Verifique se o pedido não foi barrado por um filtro de nome/símbolo ou se
     está fora do horário configurado.
