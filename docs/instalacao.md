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
- WhatsApp: escaneie o QR Code exibido no terminal.

Para adicionar outra plataforma depois:

```text
!su token <discord|telegram|whatsapp> <SEU_TOKEN>
```

Se um código de superusuário for exibido no primeiro boot, envie:

```text
!su code <CODIGO>
```

Plataformas podem ser desativadas com:

```text
!config plataforma whatsapp off
!config plataforma whatsapp on
```

## Atualização

Use `update.bat` no Windows ou `bash update.sh` em sistemas Unix. Os scripts
preservam a pasta `settings`.
