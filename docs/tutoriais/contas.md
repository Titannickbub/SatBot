# 👤 Comandos de contas

<p><a href="../tutoriais.md"><img src="https://img.shields.io/badge/%E2%86%90%20Voltar-Tutoriais-5865F2?style=for-the-badge" alt="Voltar para Tutoriais"></a></p>

Os comandos desta categoria podem ser consultados no menu com `!menu contas`.
O carregador do menu organiza os comandos pelas categorias declaradas em cada
arquivo: os comandos gerais aparecem em `contas`, e os demais ficam nos
submenus `contas/exibir`, `contas/conectar` e `contas/edição de perfil`.
Para abrir cada seção diretamente:

```text
!menu contas
!menu contas/exibir
!menu contas/conectar
!menu contas/edição de perfil
```

O prefixo dos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
nos exemplos.

## 👁️ Consultar perfil e contas

### `!perfil` — perfil visual

Gera um cartão em imagem com informações do perfil no grupo ou servidor atual.
Sem informar outra pessoa, mostra seus próprios dados. Para consultar outra
pessoa, marque-a, responda a uma mensagem dela ou informe o ID.

```text
!perfil
!perfil @membro
!perfil 123456789
```

Também pode ser usado com os aliases `!profile` e `!minhaconta`. Para a versão
em texto, use `!perfil_text`.

### `!perfil_text` — perfil em texto

Mostra o perfil em texto, acompanhado da foto quando disponível. Pode incluir
nome, ID, saldos da carteira e do cofre, atividade, XP e nível e status do
NoFap. A disponibilidade de cada informação depende dos sistemas configurados
no chat.

```text
!perfil_text
```

Aliases: `!perfil-text`, `!perfiltexto` e `!profiletext`.

### `!xp` — consultar seu XP

Exibe seu nível, XP acumulado, posição no ranking e quanto falta para o próximo
nível. O sistema de XP precisa estar ativado no grupo ou servidor para
contabilizar e exibir os dados.

```text
!xp
```

Aliases: `!meuxp` e `!perfilxp`.

### `!conta` — Conta Global/Central

Exibe o nome e ID da Conta Central, status VIP, data de criação, última
atividade e contas de WhatsApp, Discord e Telegram vinculadas.

```text
!conta
```

Aliases: `!contaglobal` e `!global`.

### `!vip` — consultar assinatura VIP

Consulta seu próprio status VIP, validade restante ou permanência e o resumo
das contas vinculadas. Não recebe o nome de outra pessoa como argumento.
Administradores de VIP devem usar `!set_vip`.

```text
!vip
```

Alias: `!premium`.

## 🌐 Abrir páginas web

### `!dashboard` — abrir o painel web

Envia o link do dashboard web do SatBot. Pode ser usado em qualquer conversa,
desde que o domínio do painel esteja configurado.

```text
!dashboard
```

Aliases: `!painel` e `!linkdashboard`.

### `!gerarlink_perfil` — link web do perfil

Gera o link para abrir no navegador os dados do seu perfil referentes ao grupo
ou servidor em que o comando foi executado. Use em um grupo ou servidor; o
domínio do painel web precisa estar configurado.

```text
!gerarlink_perfil
```

Aliases: `!gerarlink-perfil` e `!linkperfil`.

## ✏️ Editar a Conta Central

### `!nomecentral` — alterar nome público central

Altera o nome público da Conta Central. O novo nome é compartilhado entre as
plataformas vinculadas. Informe o nome completo depois do comando:

```text
!nomecentral Satela Master
!nomecentral Minha Conta
```

Alias: `!centralnome`.

## 🔗 Conectar contas e configurar acesso web

### `!unir_contas` — vincular plataformas à mesma Conta Central

Use duas etapas. Gere um código na conta/plataforma que deseja vincular; em
seguida, na outra conta/plataforma, use o código para confirmar a união.
O código é temporário, de uso único e expira após 24 horas.

```text
!unir_contas codigo
```

O bot retorna o código. Na outra plataforma, confirme:

```text
!unir_contas login CODIGO_RECEBIDO
```

Exemplo:

```text
!unir_contas login A1B2C3
```

Não compartilhe o código. Contas com conflito de plataforma não podem ser
unidas; cada Conta Central só pode ter uma conta por plataforma. Sem
argumentos, o comando mostra a sintaxe de uso.

### `!redefinir_senha` — criar ou redefinir acesso ao dashboard

Use **somente no privado do bot**. O comando envia um link temporário para
definir o usuário e a senha do dashboard; as credenciais são inseridas na
página, não enviadas ao bot.

```text
!redefinir_senha
```

O link expira em 15 minutos, só pode ser usado uma vez e invalida as
credenciais e sessões anteriores. O domínio do painel precisa estar
configurado. **Não compartilhe o link:** quem tiver acesso a ele poderá definir
as credenciais da sua Conta Central.

Aliases: `!definir_login` e `!configurar_login`.

## Resumo dos comandos

| Comando | Aliases | Para que serve |
| --- | --- | --- |
| `!perfil` | `!profile`, `!minhaconta` | Exibe o perfil em imagem |
| `!perfil_text` | `!perfil-text`, `!perfiltexto`, `!profiletext` | Exibe o perfil em texto |
| `!xp` | `!meuxp`, `!perfilxp` | Consulta seu XP e nível |
| `!conta` | `!contaglobal`, `!global` | Consulta a Conta Global/Central e plataformas vinculadas |
| `!vip` | `!premium` | Consulta seu próprio status VIP |
| `!dashboard` | `!painel`, `!linkdashboard` | Envia o link do dashboard |
| `!gerarlink_perfil` | `!gerarlink-perfil`, `!linkperfil` | Gera o link web do perfil no grupo/servidor |
| `!nomecentral` | `!centralnome` | Altera o nome público da Conta Central |
| `!unir_contas` | — | Gera ou usa código para vincular contas |
| `!redefinir_senha` | `!definir_login`, `!configurar_login` | Envia link temporário para configurar acesso web |

Para consultar os detalhes de um comando pelo bot, use `!info <comando>`, por
exemplo `!info unir_contas`.
