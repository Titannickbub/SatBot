# Sat Bot

## Site do desenvolvedor

https://titannickbub.neocities.org/

## Grupos do bot

- WhatsApp: https://chat.whatsapp.com/Kz372Jw4zax7Sik0wW8UpT
- Telegram: https://t.me/satela_chats
- Discord: https://discord.gg/yaC9CrgrF4

Sat Bot é um bot multi-plataforma para Discord, Telegram e WhatsApp, pensado para rodar em qualquer ambiente com Node.js.

Ele foi estruturado como base de automação e atendimento, com carregamento automático de comandos, funções e plataformas, além de suporte a execução em Windows, Linux, macOS e Termux.

## Visão geral

- Discord, Telegram e WhatsApp em um único bot
- carregamento dinâmico de comandos e módulos
- estrutura modular para manutenção fácil
- inicialização por scripts cross-platform
- suporte a IA, downloads, automações e integrações extras

## Requisitos

- Node.js 18 ou superior
- npm
- terminal disponível

## Como instalar

- Clone o repositório: https://github.com/Titannickbub/SatBot
- ou baixe o ZIP e extraia na pasta onde o bot vai rodar
- confirme que o ambiente tem Node.js funcionando
- entre na pasta do projeto (`SatBot`)

### Windows

```bat
start.bat
```

### Linux, macOS, Android/Termux e hospedagens simples

```bash
bash start.sh
```

### Execução direta

```bash
node index.js
```

## Primeira execução

Na primeira vez, o bot faz o `npm install` automaticamente para baixar as dependências necessárias.

Depois ele cria arquivos e pastas iniciais, como:

- `settings/.env`
- `settings/config.json`
- pastas de autenticação
- arquivos JSON locais de persistência

Você pode ver algo como:

```text
==================================================
[BOOT] Bot: sat bot
[BOOT] Versão: 0.2
[BOOT] Ambiente: development
==================================================

[INFO] Instalando dependencias...
```

Em seguida, o bot vai carregar middlewares, comandos e plataformas:

```text
✅[CORE] Middleware carregado: antilink
✅[CORE] Middleware carregado: antimedia
✅[CORE] Middleware carregado: antipalavras
✅[CORE] Middleware carregado: antipv
✅[CORE] Middleware carregado: antiraid
✅[CORE] Middleware carregado: autodownload
✅[CORE] Middleware carregado: autoia...
```

E também:

```text
✅[CORE] Comando carregado: su-token > system
✅[CORE] Comando carregado: su > system
✅[CORE] Plataforma carregada: discord.js
✅[CORE] Plataforma carregada: telegram.js
✅[CORE] Plataforma carregada: whatsapp.js
```

Se não houver superusuário configurado, será exibido um código inicial:

```text
=================================
[SU] Nenhum Super Usuário encontrado.
[SU] Código: HLVZ-OO65-2ZTE
=================================
```

Esse código é usado para configurar o dono do bot.

## Conectando as plataformas

Ao iniciar, o bot pergunta qual plataforma você quer autenticar primeiro:

```text
[AUTH] Nenhuma plataforma autenticada. Escolha uma para iniciar:
  1. Discord
  2. Telegram
  3. WhatsApp
Digite o número da plataforma:
```

### Discord

- crie um bot no site de desenvolvimento do Discord
- copie o token do bot
- cole na pergunta exibida no terminal

### Telegram

- crie o bot com o BotFather
- copie o token
- cole no terminal quando solicitado

### WhatsApp

O WhatsApp usa QR Code no terminal.

```text
[WHATSAPP] QR code gerado. Escaneie com o app do WhatsApp:
```

Abra o WhatsApp no celular, vá em "Aparelhos conectados" e escaneie o código.

Se o QR ficar pequeno, ajuste o zoom da janela do terminal.

## Conectando mais de uma plataforma

Se você quiser conectar outra plataforma depois da primeira, use:

```text
!su token <discord|telegram> <token>
```

Exemplo:

```text
!su token discord <SEU_TOKEN_AQUI>
```

ou

```text
!su token telegram <SEU_TOKEN_AQUI>
```

Se a primeira plataforma conectada for o WhatsApp, o restante pode ser autenticado por token conforme o fluxo do bot.

## Como virar super usuário

Ao iniciar, pode aparecer algo assim:

```text
=================================
[SU] Nenhum Super Usuário encontrado.
[SU] Código: HLVZ-OO65-2ZTE
=================================
```

Para se tornar super usuário, envie o código na plataforma autenticada com:

```text
!su code
```

Exemplo:

```text
!su code HLVZ-OO65-2ZTE
```

Depois disso, o usuário que executou o comando passa a ser super usuário do bot.

## Desligando plataformas que você não usa

Se quiser evitar QR Code ou conexões desnecessárias, desative a plataforma com:

```text
!config plataforma<discord|telegram|whatsapp> off
```

Exemplo:

```text
!config plataforma whatsapp off
```

Para reativar:

```text
!config plataforma whatsapp on
```

Isso é útil principalmente para esconder o WhatsApp quando ele não for usado.

## Permissões importantes do Discord

Para o Discord funcionar corretamente, é importante que o cargo do bot esteja acima da maioria dos cargos, exceto os cargos de administrador.

### Recomendação

- coloque o cargo do bot no topo da hierarquia da guild
- ou pelo menos acima da maioria dos cargos não administrativos
- isso evita falhas em respostas automáticas, moderação e leitura de canais

### Permissões recomendadas

O ideal é dar ao bot permissões de administrador para reduzir conflitos de acesso, especialmente em servidores com muitas regras.

Se não quiser usar administrador, pelo menos deixe habilitado:

- gerenciar mensagens
- ler mensagens e histórico
- enviar mensagens
- anexar arquivos
- vincular embeds
- ver canais
- gerenciar cargos

## Aviso importante para WhatsApp

O WhatsApp é integrado com Baileys, uma biblioteca leve e gratuita para acesso via WhatsApp Web.

Importante: essa integração usa a conexão do WhatsApp Web e pode estar sujeita às regras do próprio WhatsApp. O projeto não se responsabiliza por banimentos, suspensão de conta, punições ou qualquer problema causado por uso indevido.

Recomendações:

- não use o bot em muitos grupos ao mesmo tempo
- evite flood, spam e links em massa
- não use o bot para conteúdo contra as diretrizes do WhatsApp
- mantenha a automação responsável e controlada

## Downloads com API Bronxyshost

Para deixar o bot mais leve e reduzir dependência de módulos pesados, o projeto usa a API da Bronxyshost para downloads de mídia de diferentes redes.

Site oficial:

- https://api.bronxyshost.com.br/

### Custo

A API funciona por créditos, com custo aproximado de:

- cerca de R$ 1 para cada 1.000 requisições

### Como configurar

Depois de comprar a chave, use:

```text
!setkey <nova_chave>
```

O bot valida a chave automaticamente.

### Verificando saldo

```text
!testbronxys
```

Esse comando mostra quantas requisições ainda restam de crédito.

## Uso de IA

O bot também pode usar IA para chat e geração de imagens, mas isso exige uma chave da provedora escolhida.

### Provedores suportados

- `gemini`
- `groq`
- `openrouter`

### Como conseguir a chave

Você precisa gerar uma chave em plataformas como:

- Google AI Studio / Gemini
- Groq
- OpenRouter

O uso gratuito normalmente existe, mas há limites de quota. Em geral, estes limites podem incluir:

- requisições por minuto
- tokens por resposta
- limite diário ou por janela de uso
- desaceleração ou bloqueio temporário quando a cota acaba

### Como configurar a IA

```text
!setai <gemini|groq|openrouter> <sua_chave>
```

Exemplo:

```text
!setai gemini SUA_CHAVE_AQUI
```

### Comandos de IA

```text
!ia <texto>
```

```text
!imagine <prompt>
```

Exemplo:

```text
!imagine um astronauta em uma floresta de neon, estilo cyberpunk
```

A IA gratuita pode falhar às vezes por conta de limites de quota. O projeto está em desenvolvimento para melhorar isso.

## Estrutura do projeto

```text
satela/
├── commands/            # Comandos do bot
├── functions/           # Lógica auxiliar e utilitários
├── middlewares/         # Filtros e interceptadores
├── platforms/           # Adaptadores para Discord, Telegram e WhatsApp
├── settings/            # Arquivos de configuração e ambiente
├── data/                # Dados persistentes locais, quando existirem
├── index.js             # Bootstrap e watcher
├── core.js              # Núcleo do bot
├── package.json         # Dependências e scripts
├── start.sh             # Inicialização em Linux/macOS/Termux
├── start.bat            # Inicialização em Windows
├── README.md            # Documentação principal
├── changelog/           # Histórico e notas de release
└── .gitignore           # Arquivos sensíveis e temporáveis
```

## Open source e segurança

Sat Bot foi pensado para ser compartilhado como base open source, sem expor dados privados da instância local.

Antes de publicar, evite:

- `.env` com tokens reais
- sessão autenticada do WhatsApp
- logs sensíveis
- uploads locais
- dados de usuários ou grupos

Esses itens devem ser ignorados e gerados em cada ambiente individual.

## Changelog

Acompanhe as mudanças do projeto em:

- [changelog/1.1/README.md](changelog/1.1/README.md)
- [changelog/1.0/README.md](changelog/1.0/README.md)

## Site do desenvolvedor

- https://titannickbub.neocities.org/

## Licença

Defina a licença antes da publicação pública. A MIT é uma opção comum para projetos de bot open source.

## Resumo

Sat Bot é uma base de bot multi-plataforma modular, pronta para uso em Discord, Telegram e WhatsApp. O projeto foi pensado para ser leve, flexível e fácil de rodar em múltiplos ambientes, com suporte a automação, IA, downloads e expansão futura.
