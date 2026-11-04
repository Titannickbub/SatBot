[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como consultar o status do grupo ou servidor com `!status`

O comando `!status` permite consultar as configurações e o estado de recursos
do grupo ou servidor, como regras de moderação, boas-vindas, despedidas,
advertências, monitores e agendamentos.

## Permissões e onde funciona

- **Quem pode usar:** administradores do grupo/servidor e Super Usuários.
- **Onde funciona:** grupos e servidores; não funciona em conversas privadas.

## Consultar o status

Para ver o resumo geral:

```text
!status
```

Para consultar o estado de um recurso específico:

```text
!status antilink
!status antipalavras
!status antimedia
!status antiraid
!status blockcmd
!status welcome
!status goodbye
!status warnconfig
```

Para ver a configuração efetiva aplicada ao chat, considerando a hierarquia
entre os níveis configurados:

```text
!status full
```

Para consultar todos os níveis e recursos, ou um recurso específico nessa
configuração:

```text
!status full all
!status full antiraid
```

O comando também aceita `!status help` para exibir a ajuda no chat. Se o
prefixo do bot foi alterado, substitua `!` pelo prefixo configurado.

---

[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)
