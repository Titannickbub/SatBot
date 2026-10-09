# Sat Bot — Changelog Versão 1.2.40

Esta versão introduz o sistema completo de **Autoresposta Híbrida** (`!autorepo` e `!autorepo_G`) e o suporte a **Fuso Horário Configurável** (`!fuso`) com persistência, retrocompatibilidade e validação de padrões IANA.

---

## 🌐 1. Fuso Horário Configurável do Sistema

- **Configuração Centralizada:**
  - O fuso horário do bot agora é gerenciado dinamicamente através do arquivo `settings/config.json` no campo `timezone` (padrão de fábrica: `"America/Sao_Paulo"`).
  - O Node.js inicializa `process.env.TZ` lendo a configuração do sistema em `index.js`, garantindo que todas as datas, logs, agendamentos e resets diários respeitem o fuso escolhido.

- **Comando de Superusuário (`!fuso`):**
  - Adicionado o comando `!fuso` (com aliases `!setfuso`, `!timezone`, `!settimezone`, `!fuso_horario` e `!fusohorario`) na categoria `system/configurações`.
  - `!fuso status` ou `!fuso`: exibe o fuso horário configurado, a data e hora local em tempo real e o offset UTC/GMT.
  - `!fuso comuns` ou `!fuso lista`: exibe uma lista organizada com todos os fusos horários oficiais dos países lusófonos (Brasil, Portugal, Angola, Moçambique, Cabo Verde, Guiné-Bissau, São Tomé e Príncipe, Timor-Leste, Macau e UTC) com horários em tempo real.
  - `!fuso <identificador_iana_ou_atalho>`: altera o fuso horário com persistência imediata em `settings/config.json`.
  - Suporta qualquer fuso IANA válido e atalhos práticos (ex: `sp`, `brasilia`, `manaus`, `lisboa`, `luanda`, `maputo`, `caboverde`, `utc`).

- **Integração com `!config status`:**
  - O comando `!config status` agora exibe a linha `Fuso Horário` com o fuso ativo e a hora local formatada.

- **Retrocompatibilidade Total:**
  - Bases e arquivos de configuração existentes que não possuem o campo `timezone` assumem automaticamente `"America/Sao_Paulo"` sem quebras.

---

## 🤖 2. Sistema de Autoresposta Híbrida (Autorepo)

O sistema de respostas e reações automáticas foi construído em arquitetura híbrida, unindo um **catálogo oficial global** mantido pelo desenvolvedor/SU e **personalização total por grupo** para os administradores.

### 👥 A. Comando no Grupo: `!autorepo`
- **Arquivo:** `commands/adm/configurações/autorepo.js`
- **Categoria:** `adm/configurações`
- **Permissão:** Administradores do grupo e Superusuários
- **Aliases:** `!autoresposta`, `!auto_resposta`, `!autoresp`, `!respostas`

- **Comportamento e Ativação:**
  - **Inativo por padrão:** Novos grupos iniciam com o autorepo desativado (`OFF`).
  - `!autorepo on`: Ativa o autorepo no grupo. Ao ativar, o grupo utiliza **tanto as respostas locais quanto o catálogo global oficial** simultaneamente.
  - `!autorepo off`: Desativa completamente o autorepo no grupo.
  - `!autorepo global off`: Desativa apenas as respostas globais oficiais no grupo, mantendo estritamente as respostas cadastradas localmente pelo grupo.
  - `!autorepo global on`: Reativa o uso do catálogo global oficial para o grupo.

- **Gerenciamento Local:**
  - `!autorepo add <gatilho> = <resposta>`: Adiciona uma resposta em texto exata (padrão).
  - `!autorepo add react <gatilho> = <emoji>`: Adiciona uma reação automática com emoji.
  - `!autorepo add contains <gatilho> = <resposta>`: Aciona quando a mensagem contiver o termo.
  - `!autorepo add starts <gatilho> = <resposta>`: Aciona quando a mensagem começar com o termo.
  - `!autorepo del <gatilho>`: Remove a resposta local do grupo.
  - `!autorepo list`: Lista as respostas locais cadastradas e exibe o estado das globais.
  - `!autorepo status`: Exibe o resumo detalhado da configuração do grupo.
  - `!autorepo limpar`: Remove todas as respostas locais cadastradas no grupo.

---

### 👑 B. Catálogo Global Oficial: `!autorepo_G`
- **Arquivo:** `commands/system/configurações/autorepo_G.js`
- **Armazenamento:** `commands/system/configurações/autorepo_G.json`
- **Categoria:** `system/configurações`
- **Permissão:** Exclusivo para **Superusuários (SU)**
- **Aliases:** `!autorepo_g`, `!autorepog`, `!autorepo_global`, `!autoresposta_global`

- **Benefícios da Nova Localização:**
  - Por estar localizado na pasta `commands/system/configurações/`, o arquivo `autorepo_G.json` é versionado pelo Git e distribuído oficialmente em atualizações de código no GitHub.
  - Permite disponibilizar uma lista extensa de respostas padrão de fábrica sem pesar arquivos `.js`.
  - Se o arquivo for excluído, o sistema recria automaticamente com as respostas padrão.

- **Subcomandos de Gerenciamento:**
  - `!autorepo_G add <gatilho> = <resposta>`: Adiciona resposta oficial ao catálogo global.
  - `!autorepo_G del <gatilho>`: Remove resposta oficial do catálogo global.
  - `!autorepo_G list`: Lista todas as respostas cadastradas no catálogo global.
  - `!autorepo_G status`: Exibe o total de respostas no catálogo global.

---

## 🔤 3. Variáveis Dinâmicas Universais em Respostas

Tanto as respostas locais do grupo (`!autorepo`) quanto as globais (`!autorepo_G`) suportam substituição dinâmica de placeholders:

| Variável | Exemplo | Descrição |
| :--- | :--- | :--- |
| `{user}` ou `{nome}` | `Carlos Silva` | Nome da pessoa que enviou a mensagem (extraído com precisão no WhatsApp, Discord e Telegram) |
| `{bot}` | `Sat Bot` | Nome oficial configurado do bot |
| `{grupo}` ou `{chat}` | `Galera VIP` | Nome do grupo ou servidor |
| `{hora}` ou `{horario}` | `14:05` | Hora e minuto no fuso horário configurado |
| `{horas}` | `14:05:32` | Hora completa com segundos |
| `{data}` | `09/10/2026` | Data atual formatada (DD/MM/AAAA) |
| `{dia_semana}` ou `{semana}` | `sexta-feira` | Dia da semana |
| `{saudacao}` | `Boa tarde` | Saudação automática baseada no horário |

---

## 🛡️ 4. Isolamento, Segurança e Middleware

- **Middleware em Tempo Real (`middlewares/autoresposta.js`):**
  - Prioridade: `45` (executa após proteções de segurança e Auto-IA).
  - Ignora mensagens privadas (PV), mensagens do próprio bot e comandos.
  - **Comunidades do WhatsApp:** totalmente ignoradas e bloqueadas por segurança.
  - Sistema de cooldown anti-spam automático por gatilho/chat para prevenir loops de mensagens.

- **Isolamento de Armazenamento por Plataforma:**
  - **WhatsApp:** `settings/autorepo/whatsapp_<chatId>.json` (separado por grupo)
  - **Discord:** `settings/autorepo/discord_<guildId>.json` (separado por servidor/guild)
  - **Telegram:** `settings/autorepo/telegram_<chatId>.json` (separado por grupo/supergrupo, com ou sem tópicos)

- **Integração com `!status`:**
  - O comando `!status` no grupo agora inclui a linha `Autoresposta` com o estado e contagem de respostas locais ativas.

---

## 🌐 5. Unificação do Comando de Crossplay (`!crossplay`)

- **Novo Comando Unificado:**
  - O sistema de gerenciamento de crossplay foi unificado no comando `!crossplay` em [crossplay.js](file:///c:/Users/titan/Documents/satela/commands/adm/configura%C3%A7%C3%B5es/crossplay.js).
  - Substitui os comandos individuais anteriores (`crossplay_link`, `crossplay_claim`, `crossplay_unlink`, `crossplay_pref`) por um único centro de controle completo.
  - Aliases retrocompatíveis mantidos: `!crossplay_link`, `!crossplay_claim`, `!crossplay_unlink`, `!crossplay_pref` e `!cplay`.

- **Operações Disponíveis:**
  - `!crossplay link` (ou `!crossplay gerar`): Gera o código temporário de vínculo de 8 caracteres (expira em 5 minutos).
  - `!crossplay claim <codigo>` (ou `!crossplay <codigo>`): Conecta o grupo atual ao grupo de crossplay do código informado.
  - `!crossplay unlink` (ou `!crossplay desvincular`): Desconecta o chat atual do crossplay.
  - `!crossplay pref [receber|ignorar] [tipo]`: Configura ou consulta os filtros de mídias suportadas (`text`, `image`, `video`, `audio`, `document`, `sticker`).
  - `!crossplay status` (ou `!crossplay info`): Exibe o status da conexão, ID da rede, plataformas conectadas e preferências ativas.
  - `!crossplay help`: Manual completo de instruções no padrão descritivo oficial.

---

## 📈 6. Dólar no Monitor da Bolsa

- O comando administrativo `!monitorbolsa` agora permite acompanhar o dólar comercial junto aos índices e ativos já disponíveis.
- Use `!monitorbolsa set dolar` para acompanhar apenas o dólar ou inclua `dolar` na lista de ativos separados por vírgula.
- A cotação apresenta valores de compra e venda, variação diária e horário da atualização, usando a AwesomeAPI.
- Ao deixar a lista de ativos vazia, o monitor inclui o dólar entre todos os ativos acompanhados.
- As cotações dos índices continuam usando o Yahoo Finance.

---

## 🖼️ 7. Conversão Automática de Figurinhas (Autofigu)

- Adicionado o comando administrativo `!autofigu` (alias `!autofigurinha`) para ativar, desativar ou consultar o recurso por grupo/canal.
- `!autofigu on`, `!autofigu off` e `!autofigu status` controlam e consultam a opção, disponível para administradores do chat e superusuários.
- Quando ativo, fotos, GIFs e vídeos compatíveis enviados no chat são convertidos em figurinhas usando os conversores existentes.
- O recurso está disponível apenas no WhatsApp e Telegram, inicia desativado e não tenta criar figurinhas no Discord.
