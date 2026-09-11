# Instalação e configuração

## Requisitos

- Node.js 18 ou superior
- npm
- terminal disponível

## Instalação

Clone o repositório ou use os instaladores externos:

- Windows: `install.bat`
- Linux, macOS, Android/Termux: `bash install.sh`

Os instaladores clonam o repositório principal na branch `main`, detectam
conflitos e abortam sem sobrescrever arquivos existentes. Para personalizar:

```bash
SATBOT_REPO_URL=https://github.com/exemplo/bot.git SATBOT_BRANCH=main bash install.sh
```

Na primeira execução, as dependências são instaladas automaticamente.

## Inicialização

```bat
start.bat
```

```bash
bash start.sh
```

Ou execute diretamente:

```bash
node index.js
```

O bot cria `settings/config.json`, `settings/.env`, autenticações e arquivos
locais de persistência conforme necessário.

## Autenticação

Na primeira inicialização, escolha Discord, Telegram ou WhatsApp.

- Discord: crie um bot no portal de desenvolvedores e informe o token.
- Telegram: crie o bot pelo BotFather e informe o token.
- WhatsApp: no primeiro bootstrap, escolha QR Code no terminal ou código de
  pareamento por número.

### Login inicial do WhatsApp

Quando o WhatsApp for escolhido como a primeira plataforma no terminal, o bot
oferece duas opções:

1. **QR Code no terminal**: escaneie o QR com o aplicativo do WhatsApp em
   `Configurações > Aparelhos conectados > Conectar aparelho`.
2. **Código de pareamento**: informe o número com DDI. O número aceita formatos
   copiados normalmente, por exemplo:

   ```text
   +55 33 9986-5716
   55 (33) 9986-5716
   553399865716
   ```

   Espaços, `+`, parênteses, hífens e outros símbolos são removidos
   automaticamente antes da solicitação ao WhatsApp.

Se Discord ou Telegram já estiverem autenticado(s), o WhatsApp não inicia um
QR automaticamente quando não possui sessão. Nesse caso, um Super Usuário deve
solicitar o método de login por comando.

Para adicionar outra plataforma depois:

```text
<prefixo>su token <discord|telegram> <SEU_TOKEN>
```

O `<prefixo>` é o prefixo configurado no bot. Se ele for `!`, por exemplo:

```text
!su token telegram <SEU_TOKEN>
```

Para solicitar um novo login do WhatsApp como Super Usuário:

```text
<prefixo>su whatsapp qr
<prefixo>su whatsapp codigo <número com DDI>
```

Exemplos usando o prefixo padrão `!`:

```text
!su whatsapp qr
!su whatsapp codigo +55 12 1234-1234
```

No modo QR, o QR é enviado como imagem no chat onde o comando foi executado.
No modo de código, o código de pareamento é exibido no terminal e enviado no
mesmo chat. O bot reinicia para iniciar a nova sessão e remove as credenciais
anteriores do WhatsApp antes do login.

Se um código de superusuário for exibido no primeiro boot, envie:

```text
<prefixo>su code <CODIGO>
```

Plataformas podem ser desativadas com:

```text
!config plataforma whatsapp off
!config plataforma whatsapp on
```

## Atualização

Use `update.bat` no Windows ou `bash update.sh` em sistemas Unix. Os scripts
preservam a pasta `settings`.
