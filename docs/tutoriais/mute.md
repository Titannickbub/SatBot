[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como silenciar e dessilenciar usuários com `!mute` e `!unmute`

Os comandos `!mute` e `!unmute` gerenciam o silenciamento temporário (castigo /
timeout) de membros no grupo ou servidor.

- **`!mute`:** retira temporariamente a permissão do usuário de enviar mensagens
  no chat por um período determinado.
- **`!unmute`:** revoga o silenciamento imediatamente, permitindo que o usuário
  volte a conversar.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e onde funciona

O comando funciona exclusivamente em grupos e servidores. Ele não funciona em
conversas privadas (PV).

- **Quem executa:** precisa ter permissão para aplicar castigos / moderar
  membros na plataforma, ou ser Super Usuário.
- **Permissão do bot:** o bot precisa ter permissão correspondente na plataforma
  para aplicar e remover castigos (*Timeout* no Discord e restringir membros no
  Telegram).
- **Limitações:**
  - Não é possível silenciar administradores do grupo ou servidor.
  - Não é possível silenciar o próprio bot.
  - No Discord, a hierarquia de cargos se aplica (o bot e o moderador precisam
    estar em posições acima do usuário).

### ⚠️ Compatibilidade por plataforma

- **Discord:** suporte completo via recurso nativo de Castigo (*Timeout*).
- **Telegram:** suporte completo via restrição temporária de envio de mensagens
  no grupo ou supergrupo.
- **WhatsApp:** **não disponível**. O protocolo comum do WhatsApp não possui um
  recurso nativo de castigo/silenciamento individual temporário de
  participantes. Para restringir mensagens no WhatsApp, use o
  [tutorial de abrir/fechar chat](./abrir-fechar-chat.md) ou os comandos de
  [banir ou remover](./ban.md).

---

## Como silenciar com `!mute`

### Sintaxe

```text
!mute <@usuário|id> [tempo em minutos]
```

O tempo é informado em minutos inteiros. Se você **não** informar o tempo, o bot
aplicará automaticamente a duração padrão de **10 minutos**.

### Exemplos de uso

1. **Silenciar com duração padrão (10 minutos):**
   ```text
   !mute @user
   !mute 123456789012345678
   ```
2. **Silenciar com tempo personalizado:**
   ```text
   !mute @user 15
   !mute @user 60
   !mute 123456789012345678 30
   ```
3. **Respondendo diretamente à mensagem da pessoa:**
   Basta citar/responder à mensagem do usuário e enviar:
   ```text
   !mute
   ```
   ou com a duração desejada:
   ```text
   !mute 20
   ```

Ao silenciar respondendo a uma mensagem específica, o bot tenta apagar tanto a
mensagem citada quanto o próprio comando enviado (no Discord).

---

## Como remover o silenciamento com `!unmute`

Caso queira liberar o usuário antes do término do tempo do castigo, utilize o
`!unmute`.

### Sintaxe

```text
!unmute <@usuário|id>
```

### Exemplos de uso

```text
!unmute @user
!unmute 123456789012345678
```

Ou simplesmente responda a uma mensagem anterior do usuário com:

```text
!unmute
```

O bot removerá o castigo na hora e confirmará no chat que o usuário foi
dessilenciado com sucesso.

---

## Solução de problemas comuns

1. **"O mute não está disponível no WhatsApp":** o comando só pode ser utilizado
   no Discord e Telegram devido a limitações nativas da plataforma do WhatsApp.
2. **"Você precisa ter permissão para aplicar castigos":** certifique-se de que
   seu cargo possui permissão para moderar membros / aplicar timeout.
3. **"O bot não tem permissão para aplicar castigos":** no Discord, confirme se
   o cargo do bot tem a permissão *Moderar Membros* (*Moderate Members / Timeout*)
   e se o cargo do bot está acima do cargo do usuário. No Telegram, verifique se
   o bot é administrador com permissão de restringir membros.
4. **Alvo é administrador:** administradores não podem receber castigos por
   comando.
