# Sat Bot

O Sat Bot é um bot multi-plataforma para **Discord, Telegram e WhatsApp**,
desenvolvido em Node.js. Ele reúne comandos e ferramentas para comunidades
em um só bot.

## O que o bot faz

- Oferece comandos de administração, moderação e diversão.
- Automatiza tarefas e configurações de grupos e servidores.
- Inclui recursos de IA, downloads, economia virtual e sistema de XP.
- Consulta a apuração oficial das eleições pelo comando `!eleicao`.
- Permite configurar envios periódicos de resultados eleitorais com `!monitoreleicao`.
- Permite que Super Usuários gerenciem VIPs temporários ou permanentes e
  recursos exclusivos.
- Permite usar as plataformas suportadas de forma integrada.

## Contatos das plataformas

- WhatsApp: https://chat.whatsapp.com/Kz372Jw4zax7Sik0wW8UpT
- Telegram: https://t.me/satela_chats
- Discord: https://discord.gg/yaC9CrgrF4

## Saiba mais

- [Instalação](./docs/instalacao.md)
- [Configuração](./docs/configuracao.md)
- [Anti-PV e OnlyChats](./docs/antipv-onlychats.md)
- [VIP e `set_vip`](./docs/setvip.md)

## VIP

O comando `!set_vip`, exclusivo de Super Usuários, permite consultar e
gerenciar o acesso VIP: conceder uma duração (`!set_vip set <ID> 30d`),
adicionar tempo, cancelar ou tornar o VIP permanente (`!set_vip perm <ID>`).
Também configura comandos e chats exclusivos para VIPs. O bypass do Anti-PV
pode ser habilitado por plataforma para todos os usuários VIP ativos.
Consulte [VIP e `set_vip`](./docs/setvip.md) para ver os comandos e as
opções disponíveis.
