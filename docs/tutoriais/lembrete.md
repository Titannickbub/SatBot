[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como criar lembretes com `!lembrete`

O comando `!lembrete` (também acessível por `!reminder`) permite registrar
lembretes pontuais. Quando o tempo expira ou o horário definido é atingido, o bot
envia uma mensagem no chat mencionando você diretamente para que não esqueça a
sua tarefa.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e onde funciona

- **Em grupos e servidores:** disponível apenas para **administradores** e
  Super Usuários.
- **Em conversas privadas (PV):** qualquer usuário pode criar lembretes
  pessoais diretamente com o bot.
- Funciona no WhatsApp, Telegram e Discord.

## Limite de lembretes

Cada usuário pode manter no máximo **3 lembretes ativos simultaneamente**
(contando apenas os que ainda não foram disparados).

Ao criar um lembrete, o bot confirma a data e hora do disparo e avisa quantas
vagas de lembrete você ainda tem disponíveis. Assim que o lembrete dispara, a
vaga é liberada automaticamente.

---

## Como definir o momento do lembrete

A estrutura básica do comando é:

```text
!lembrete <tempo ou horário> <texto do lembrete>
```

O texto do lembrete é obrigatório em ambos os casos. Você pode definir o momento
de duas formas:

### 1. Por intervalo de tempo

Informe daqui a quanto tempo deseja receber o aviso. Você pode usar minutos
(`m`), horas (`h`), dias (`d`) e segundos (`s`), inclusive combinados:

```text
!lembrete 30m verificar o forno
!lembrete 2h dar bump no server
!lembrete 1h30m entrar na reunião
!lembrete 45m liberar o chat
```

### 2. Por horário específico

Informe uma hora do dia no formato `HH:MM`:

```text
!lembrete 12:00 fazer o sorteio
!lembrete 18:30 fechar o atendimento
!lembrete 22:00 conferir os relatórios
```

O bot agenda o disparo para esse horário na hora local do servidor. Se o horário
informado já tiver passado hoje, ele será agendado para o mesmo horário no dia
seguinte.

---

## Como o aviso é entregue

No momento programado, o bot realiza as seguintes ações:

1. Envia a notificação no chat onde o comando foi criado:
   ```text
   @usuario 🔔 Lembrete: fazer o sorteio
   ```
2. **Menção direta:**
   - **Discord:** marca você via tag de usuário (`<@id>`).
   - **WhatsApp:** marca você na lista de menções nativas do grupo (`@número`).
   - **Telegram:** marca você via `@username`.
   - **Privado (PV):** envia a mensagem diretamente na conversa privada.
3. O lembrete é de **disparo único**: dispara uma vez e encerra, liberando a sua
   vaga de lembretes ativos.

---

## Diferença entre `!lembrete` e `!agendar`

- **`!lembrete`:** ideal para notificações rápidas, pessoais e pontuais (ex:
  "me avise em 40 minutos para checar o sorteio"). Marca você na hora exata e
  não requer comandos extras de configuração.
- **`!agendar`:** voltado para anúncios e postagens institucionais do
  grupo/servidor, com suporte a mídias (fotos/vídeos), repetições diárias,
  semanais ou mensais e IDs configuráveis. Para mais detalhes, veja o
  [tutorial do `!agendar`](./agendar.md).

---

## Dicas e resolução de problemas

- **Texto não informado:** se enviar apenas o tempo (como `!lembrete 30m`), o bot
  solicitará que você inclua o texto do aviso.
- **Formato inválido:** utilize formatos como `2h`, `45m` ou `14:00`. Evite
  espaços entre os números e as unidades (use `2h` em vez de `2 h`).
- **Limite atingido:** caso receba a mensagem de que já possui 3 lembretes
  ativos, aguarde os lembretes anteriores vencerem.
- **Ajuda no chat:** você pode consultar os exemplos rápidos a qualquer momento
  digitando `!lembrete ajuda` ou `!lembrete help`.
