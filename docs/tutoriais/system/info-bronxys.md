# 📊 Status e integração Bronxys

<p><a href="../system.md">← Voltar ao menu System</a> · <a href="../../tutoriais.md">Tutoriais</a></p>

Esta página reúne o comando de diagnóstico em `!menu system/info` e as
ferramentas de API no submenu `!menu system/bronxys`. O prefixo dos exemplos
é `!`.

## 📊 `!botstatus` — diagnóstico global

Exibe um relatório operacional do processo:

```text
!botstatus
```

O relatório inclui versão local e disponibilidade de atualização, versão do
Node.js, sistema operacional, PID, uptime, uso de memória, estado e latência
das plataformas, contagem de comandos e funções, contas centrais, grupos
crossplay e estado de algumas configurações globais.

O comando é restrito a superusuários. Se houver versão nova, o relatório
indica isso; consulte `!autoupdate status` para ver e alterar a política de
atualização.

## 🔑 `!setkey` — configurar a API Bronxys

Valida uma chave antes de salvá-la. Apenas superusuários podem alterar a
configuração:

```text
!setkey SUA_API_KEY
```

Em hospedagem Bronxys, a chave de host pode ser reativada com:

```text
!setkey bronxys
```

O comando não mostra a chave enviada. Se a validação falhar ou a chave estiver
expirada, a configuração anterior é preservada. Fora da hospedagem Bronxys,
obtenha uma chave pelo serviço oficial e mantenha-a privada; não a envie em
chats públicos, documentação ou repositórios.

Aliases: `!setbronxyskey`, `!setkeybronxys`, `!bronxyskey`, `!apikey` e
`!apikeybronxys`.

## 🧪 `!testbronxys` — testar a conexão e consultar saldo

Verifica a chave Bronxys já salva sem substituí-la:

```text
!testbronxys
```

Se a validação for bem-sucedida, o bot informa quantos pedidos estão
disponíveis. Se a chave estiver ausente, inválida ou expirada, o comando
apresenta o erro sem alterar a configuração. Para trocar a chave, use
`!setkey`.
