[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como configurar o canal de logs do Discord com `!logs_chanel`

O comando `!logs_chanel` define o canal de texto do servidor que receberá os
avisos e logs enviados pelo dashboard. Ele está disponível somente em
servidores do Discord.

## Permissões e pré-requisitos

- **Quem pode usar:** administradores do servidor e Super Usuários.
- **Onde funciona:** servidores do Discord; não funciona em conversas privadas
  nem nas integrações do WhatsApp ou Telegram.
- O bot precisa estar online e ter permissão para ver o canal e enviar mensagens
  nele.

## Definir o canal de logs

No canal que deseja usar, envie o comando sem argumentos:

```text
!logs_chanel
```

Ou informe a menção, o ID ou o nome do canal:

```text
!logs_chanel #logs
!logs_chanel 123456789012345678
!logs_chanel logs
```

Use um canal de texto ou de anúncios do servidor. Para desativar os logs:

```text
!logs_chanel off
```

O comando também aceita `!logs_chanel help` para exibir as instruções no chat.
O alias `!logs_channel` também é aceito. Se o prefixo do bot foi alterado,
substitua `!` pelo prefixo configurado.

---

[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)
