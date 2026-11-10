# ⚙️ Configurações do menu System

<p><a href="../system.md">← Voltar ao menu System</a> · <a href="../../tutoriais.md">Tutoriais</a></p>

Os comandos desta página aparecem em `!menu system/configurações`. Salvo
indicação em contrário, são restritos a superusuários e alteram configurações
globais do bot. O prefixo nos exemplos é `!`.

## 👑 `!su` — Super Usuários e manutenção global

Este comando administra quem tem acesso SU, a autenticação de plataformas e
algumas tarefas globais. Esse nível dá controle amplo sobre o bot; conceda-o
somente a pessoas de confiança.

### Gerenciar superusuários

```text
!su list
!su add discord 123456789012345678
!su add telegram 123456789
!su add whatsapp 5511999999999
!su del discord 123456789012345678
```

Plataformas aceitas: `discord`, `telegram` e `whatsapp`. O último SU não pode
ser removido.

Na instalação inicial, o primeiro dono pode reivindicar o código único exibido
no terminal:

```text
!su code CODIGO_DO_TERMINAL
```

O código só é aceito quando ainda não há nenhum dono registrado.

### Entrar nas plataformas e reiniciar

Tokens do Discord e Telegram são definidos com `!su token`; veja a seção
[`!su-token`](#-su-token--configurar-token-de-plataforma). Para WhatsApp, o
bot pode pedir login por QR ou por código de pareamento:

```text
!su whatsapp qr
!su whatsapp codigo 5511999999999
```

Esses fluxos reiniciam o processo para aplicar a autenticação. Para reiniciar
manualmente:

```text
!su restart
```

### Comandos de manutenção

```text
!su onlychats list
!su nofap @usuario 01/09/2026 12:00
!su atualizar_chats confirmar
```

- `onlychats` encaminha ao comando de lista de chats permitidos.
- `nofap` corrige a data de início da sequência de um participante no
  grupo/servidor atual. Informe uma data passada válida; a hora é opcional.
- `atualizar_chats confirmar` verifica grupos e servidores salvos que o bot
  deixou e remove dados órfãos confirmados. É uma operação destrutiva: confira
  o aviso antes de confirmar. Falhas de verificação preservam os dados não
  confirmados.

### Acesso do suporte oficial

```text
!su suporte ativar
!su suporte revogar
```

A ativação pode ser feita por um SU ou pela identidade oficial de suporte
reconhecida naquela plataforma. A revogação exige um SU local. O acesso
concedido tem os mesmos privilégios amplos de um SU até ser revogado, e as
alterações são anunciadas no chat.

## 🔑 `!su token` — configurar token de plataforma

Registra ou substitui token do Discord ou Telegram e reinicia o bot para
conectar com as novas credenciais:

```text
!su token discord SEU_TOKEN
!su token telegram SEU_TOKEN
```

Disponível apenas para superusuários. O token é segredo: não o publique em
chats, prints, documentação ou repositórios. Para conectar WhatsApp, use
`!su whatsapp qr` ou `!su whatsapp codigo <número>` em vez deste comando.
O comando interno se chama `su-token`, mas a forma mostrada ao usuário é
`!su token`.

## ⚙️ `!config` — configurações globais do bot

Consulte as configurações atuais:

```text
!config status
```

O relatório inclui nome e prefixo, estado das plataformas, canais de upload,
configuração de figurinhas, fuso e Anti-PV. Alterações exigem SU.

### Prefixo e plataformas

```text
!config prefix !
!config prefix sat!
!config plataforma telegram on
!config plataforma discord off
```

O prefixo aceita mais de um caractere, mas não pode conter espaços. A mudança
do prefixo exige reinicialização. Para ativar ou desativar uma plataforma,
use `whatsapp`, `telegram` ou `discord` e `on`/`off` (também aceita
`enable`/`disable`).

### Uploads e inicialização

```text
!config setuploads discord 123456789012345678
!config setuploads telegram 123456789
!config setuploads discord none
!config ignoreinitial 30s
!config ignoreinitial 2m
```

`setuploads` escolhe um canal/chat fixo para uploads de mídia; `none` remove a
configuração. `ignoreinitial` define por quanto tempo mensagens antigas são
ignoradas no início, com unidades `s`, `m` ou `h`.

### Figurinhas e atalhos

```text
!config sticker
!config sticker pack MeuPacote
!config sticker autor SatBot
!config sticker MeuPacote | SatBot
```

Define o nome padrão do pacote e do autor das figurinhas geradas pelo bot.
O comando também encaminha as opções `antipv`, `onlychats` e `fuso` aos
respectivos comandos dedicados; para esses recursos, prefira os guias
[`!antipv`](#-antipv--controle-de-mensagens-privadas),
[`!onlychats`](#-onlychats--lista-global-de-chats-autorizados) e
[`!fuso`](#-fuso--fuso-horário-global).

## 🌐 `!onlychats` — lista global de chats autorizados

Quando ativo, o bot responde somente nos servidores, categorias, chats e
tópicos liberados. Superusuários continuam com acesso em qualquer chat.
Mensagens privadas são controladas separadamente por Anti-PV.

```text
!onlychats status
!onlychats on
!onlychats off
!onlychats mode reply
!onlychats mode ignore
!onlychats msg ⚠️ Este bot não está autorizado neste chat.
```

`reply` envia a mensagem configurada ao bloquear; `ignore` não responde.

Adicione ou remova contextos pelo tipo e ID. Se omitir o ID, o comando tenta
identificar o chat ou servidor atual:

```text
!onlychats add server
!onlychats add server 123456789 Servidor principal
!onlychats add chat
!onlychats add categoria 123456789 Categoria
!onlychats add topico 123456789 Tópico
!onlychats del server 123456789
```

Tipos aceitos incluem `server`, `categoria`, `chat`, `topico` e `comando`.
Para liberar apenas determinados comandos nos contextos bloqueados:

```text
!onlychats allowcmd add ping
!onlychats allowcmd list
!onlychats allowcmd del ping
```

Alias disponível dentro de `!su`: `!su onlychats ...`.

## 🔒 `!antipv` — controle de mensagens privadas

Configura o bloqueio global de mensagens privadas. Consulte o estado:

```text
!antipv status
```

Ative, escolha como responder e personalize a mensagem:

```text
!antipv on
!antipv mode reply
!antipv msg ⚠️ Atendimento disponível somente nos grupos oficiais.
```

- `reply` responde com a mensagem e a mídia configuradas.
- `ignore` ignora silenciosamente.
- Use `off` para desativar o bloqueio.

É possível anexar/responder a uma mídia para definir uma resposta multimídia,
ou informar uma URL:

```text
!antipv media
!antipv media https://exemplo.com/aviso.png
!antipv media none
```

Libere exceções específicas de comando ou usuário:

```text
!antipv allowcmd add ping
!antipv allowcmd list
!antipv allowcmd remove ping
!antipv allowuser add 123456789
!antipv allowuser list
!antipv allowuser remove 123456789
```

Também é possível responder à mensagem de alguém com `!antipv allowuser add`.
Disponível apenas para SU. VIPs podem ter bypass por plataforma configurado
separadamente em `!set_vip pv on|off <plataforma>`.

## 🛡️ `!antispam` — limitar frequência de comandos

Configure o intervalo mínimo por usuário e chat:

```text
!antispam status
!antispam on
!antispam tempo 10s
!antispam aviso off
!antispam off
```

O primeiro comando de cada usuário passa; os demais, enviados antes de o
intervalo acabar, são bloqueados. A regra vale para todos os comandos, é
separada por usuário e chat e não se aplica a superusuários. `aviso on|off`
controla se o bot envia notificação (no máximo uma por intervalo bloqueado).
Aceita durações como `10s`, `2m` ou `1h`. Aliases: `!anti-spam` e
`!antiflood`.

## 🌍 `!fuso` — fuso horário global

Consulte o fuso e o horário atual:

```text
!fuso
!fuso status
!fuso comuns
```

Defina um identificador IANA válido:

```text
!fuso America/Sao_Paulo
!fuso Europe/Lisbon
!fuso Africa/Luanda
!fuso UTC
```

O comando também reconhece atalhos, por exemplo `sp`, `brasilia`, `lisboa`,
`luanda`, `maputo` e `caboverde`. A mudança é salva e aplicada globalmente.
Disponível apenas para SU. Aliases: `!setfuso`, `!set_fuso`, `!timezone`,
`!settimezone`, `!set_timezone`, `!fusohorario` e `!fuso_horario`.

## 🚫 `!blockcmd_su` — bloquear comandos globalmente

Gerencia bloqueios que se aplicam a todas as plataformas, grupos, servidores e
conversas. Superusuários são imunes; administradores locais não podem
sobrepor um bloqueio global.

```text
!blockcmd_su status
!blockcmd_su on
!blockcmd_su add cotacao
!blockcmd_su add ia
!blockcmd_su list
!blockcmd_su remove cotacao
!blockcmd_su clear
```

É possível bloquear um comando ou o nome de uma categoria inteira. Escolha
como o bloqueio se comporta e personalize o aviso:

```text
!blockcmd_su action reply
!blockcmd_su action ignore
!blockcmd_su action delete
!blockcmd_su message ⚠️ {cmd} foi desativado pelo administrador.
!blockcmd_su off
```

`reply` envia aviso, `ignore` não responde e `delete` tenta apagar a mensagem
do comando antes da resposta/comportamento configurado. A mensagem aceita
`{cmd}`, `{user}` e `{prefix}`. Aliases: `!blockcmdsu`, `!su_blockcmd` e
`!sublockcmd`.

## 🔄 `!autoupdate` — atualizações automáticas

Consulte a versão local e o estado:

```text
!autoupdate status
```

Ative ou desative:

```text
!autoupdate on
!autoupdate off
```

Quando ativo, o bot instala atualização do GitHub somente se a versão remota
for mais nova; downgrades são bloqueados. A configuração é aplicada na próxima
reinicialização. Desativar a atualização automática não oculta avisos de versão.
Uso exclusivo de SU.

## 🌐 `!autorepo_G` — catálogo global de respostas automáticas

O catálogo oficial é mantido pelo SU, mas cada grupo escolhe se usa as
respostas globais pelo comando local `!autorepo global on|off`.

```text
!autorepo_G status
!autorepo_G list
!autorepo_G add bom dia = Bom dia, {user}!
!autorepo_G del bom dia
```

O modo padrão exige correspondência exata. Também há gatilhos de conteúdo,
início de mensagem e reação:

```text
!autorepo_G add contains novidade = Confira as novidades!
!autorepo_G add starts suporte = Digite !menu para ver os comandos.
!autorepo_G add react parabens = 🎉
```

Variáveis disponíveis nas respostas de texto: `{user}`/`{nome}`,
`{bot}`, `{grupo}`/`{chat}`, `{hora}`/`{horario}`, `{horas}`, `{data}`,
`{dia_semana}` e `{saudacao}`. O formato de inclusão usa `=` para separar
gatilho e conteúdo. Aliases: `!autorepo_g`, `!autorepog`,
`!autorepo_global`, `!autoresposta_global` e `!autorepoglobal`.

## 🔑 `!setai` — chaves alternativas de provedores de IA

As respostas tentam primeiro a API Bronxys configurada por `!setkey`. As
chaves Gemini, Groq e OpenRouter são alternativas. Comandos abaixo disponíveis
apenas para SU:

```text
!setai
!setai gemini SUA_CHAVE
!setai groq 2 SUA_CHAVE
!setai openrouter SUA_CHAVE_1, SUA_CHAVE_2
!setai gemini clear
```

Cada provedor aceita até três chaves. A forma sem posição altera o slot 1;
para escolher um slot, use `1`, `2` ou `3`. Se uma chave atingir rate limit,
o bot tenta a seguinte. `clear` remove as chaves do provedor. A listagem
mostra valores mascarados; ainda assim, trate chaves como segredos e nunca
publique seus valores. Aliases: `!setkeyai` e `!aikey`.

## 📋 `!setbotinfo` — informações públicas de `!infobot`

Altera os dados exibidos pelo comando público `!infobot`. Informe o campo e o
valor:

```text
!setbotinfo descricao Bot multifuncional para grupos
!setbotinfo dono Nome do responsável
!setbotinfo contato WhatsApp: +55 00 00000-0000 | Discord: usuario
!setbotinfo base SatBot
!setbotinfo desenvolvedor Nome do desenvolvedor
!setbotinfo repositorio https://github.com/usuario/repositorio
!setbotinfo licenca MIT
```

Campos: `descricao`, `dono`/`responsavel`, `contato`/`contatos`, `base`,
`desenvolvedor`, `repositorio` e `licenca`. Separe contatos múltiplos com `|`;
use `!setbotinfo contato limpar` para apagá-los. Acesso somente SU. Alias:
`!configinfobot`.

## 🌐 `!set_dominio` — endereço do painel web

Informe domínio e porta. Sem protocolo, o padrão é HTTP:

```text
!set_dominio painel.exemplo.com:32013
!set_dominio http painel.exemplo.com:32013
!set_dominio https painel.exemplo.com:443
```

HTTPS requer TLS configurado em um proxy reverso; o servidor interno do painel
atende HTTP. HTTP não criptografa a conexão e o painel exibe um aviso. A
configuração é aplicada na próxima inicialização. Disponível para SU.
Aliases: `!setdominio` e `!set-domain`.

## 🧪 `!set_teste` — imagens dos testes de Diversão

Consulta o catálogo e o estado da mídia de um teste:

```text
!set_teste list
!set_teste info gay
```

Configure uma imagem, GIF ou vídeo anexado, citado ou acessível por URL:

```text
!set_teste image gay
!set_teste image bonito https://exemplo.com/bonito.gif
```

Remova a mídia configurada:

```text
!set_teste clear gay
```

Os tipos de teste válidos são mostrados por `list`. O teste `casal` gera um
banner automaticamente e não aceita mídia customizada. A forma antiga
`!set_teste gay <mídia>` também é aceita. Uso exclusivo de SU.
Aliases: `!setteste`, `!testeset`, `!teste_edit` e `!testeedit`.
