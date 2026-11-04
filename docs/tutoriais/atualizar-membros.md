[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como limpar os dados de membros que saíram

O comando `!atualizar_membros` verifica os registros locais do grupo ou servidor
e remove os dados associados a membros que já saíram. Pode limpar saldos,
escudos, XP, atividade, advertências, casamentos e participação no Setembro.

> [!WARNING]
> A remoção é permanente. O comando sem confirmação mostra o aviso, mas não
> apresenta uma prévia dos membros ou registros que serão removidos.

## Permissões e onde funciona

- **Quem pode usar:** administradores do grupo/servidor e Super Usuários.
- **Onde funciona:** grupos e servidores do WhatsApp, Telegram e Discord.
- **Dados não confirmados:** são preservados. No Telegram, se não for possível
  verificar se uma pessoa ainda está no grupo, os dados dela não são apagados.

## Como executar

Primeiro, envie o comando sem confirmação para receber o aviso sobre a limpeza:

```text
!atualizar_membros
```

Para confirmar e iniciar a verificação:

```text
!atualizar_membros confirmar
```

O bot informa quantos registros foram verificados, quantos membros foram
identificados como ausentes ou não puderam ser confirmados, e quais dados foram
removidos. Se a verificação não puder ser concluída, o comando informa o erro.

Para consultar a ajuda no próprio chat:

```text
!atualizar_membros help
```

> [!NOTE]
> Se o prefixo do bot foi alterado, substitua `!` pelo prefixo configurado.

---

[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)
