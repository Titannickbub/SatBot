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
- **Arquivo:** `commands/system/configuracoes/autorepo_G.js`
- **Armazenamento atual:** `settings/autorepo-global.json`
- **Categoria:** `system/configurações`
- **Permissão:** Exclusivo para **Superusuários (SU)**
- **Aliases:** `!autorepo_g`, `!autorepog`, `!autorepo_global`, `!autoresposta_global`

- **Migração:**
  - O catálogo fica em `settings/autorepo-global.json`, fora da árvore de comandos, para preservar alterações entre atualizações e evitar problemas com nomes de pasta acentuados em hospedagens Linux.
  - Os dados do caminho antigo são migrados automaticamente na primeira inicialização após a atualização.

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

---

## 🛡️ 8. Anti-Spam de Comandos

- Adicionado o comando de superusuário `!antispam` (aliases `!anti-spam` e `!antiflood`) para controlar a frequência de comandos.
- O intervalo é independente por usuário e chat, aplica-se a todos os comandos e não afeta superusuários.
- `!antispam on` e `!antispam off` ativam ou desativam a proteção; ela começa desativada por padrão.
- `!antispam tempo <intervalo>` define o tempo mínimo entre comandos (por exemplo, `10s`, `2m` ou `1h`).
- `!antispam aviso on|off` controla o aviso enviado ao usuário bloqueado. Quando ativo, o aviso é enviado apenas uma vez durante cada intervalo.
- `!antispam status` consulta as configurações atuais.

## 📥 9. Envio de Downloads no WhatsApp

- Removido o limite preventivo fixo de 16 MB para downloads enviados pelo WhatsApp.
- O bot agora tenta enviar a mídia usando a conta de usuário conectada e informa erro de tamanho somente quando o próprio WhatsApp recusa o envio por esse motivo.
- Os limites preventivos de Discord e Telegram permanecem inalterados.

## 📁 10. Padronização dos Nomes das Pastas

- Renomeadas pastas de comandos com caracteres acentuados para nomes ASCII, evitando erros de codificação e falhas ao iniciar em hospedagens Linux.
- Exemplos: `ações imediatas` → `acoes-imediatas`, `configurações` → `configuracoes`, `segurança` → `seguranca`, `cotações` → `cotacoes` e `utilitários` → `utilitarios`.
- A padronização também foi aplicada às pastas de ações do sistema e de edição de perfil; os arquivos e comandos mantêm seu funcionamento.

---

## 💍 11. Sistema de Casamentos por Grupo e Servidor

- **Pedidos com aceite explícito:**
  - `!casar` sem argumentos exibe as instruções de uso.
  - `!casar me` envia um pedido para casar consigo mesmo(a); o pedido também precisa ser aceito explicitamente.
  - `!casar @pessoa` ou `!casar` respondendo a uma mensagem envia um pedido para outra pessoa.
  - Os pedidos expiram após 5 minutos. A mensagem informa o horário limite, e pedidos vencidos são removidos sem aviso posterior.
  - A pessoa pode receber pedidos de várias pessoas e escolher qual aceitar respondendo à mensagem do pedido ou indicando quem pediu.

- **Casamento e divórcio:**
  - Cada pessoa pode ter um casamento ativo por grupo ou servidor. Casamentos em outros grupos e servidores são independentes.
  - Uma pessoa já casada que tentar iniciar outro casamento recebe orientação para se divorciar; se a pessoa pretendida já estiver casada, o bot informa que ela não está disponível.
  - `!divorciar` sem indicar uma pessoa exibe um aviso e não altera o estado. Para confirmar, marque o cônjuge ou responda a uma mensagem dele; somente o cônjuge atual pode encerrar o casamento.

- **Comandos de consulta e apresentação:**
  - `!casar pedidos` lista os pedidos recebidos ainda válidos.
  - `!casar status [@pessoa]` consulta o casamento no grupo ou servidor atual.
  - `!casamento` envia somente o banner do casamento, com as fotos dos participantes, seus nomes, a data e o tempo de união.
  - Os comandos funcionam em grupos do WhatsApp e Telegram e em servidores do Discord; conversas privadas não são aceitas.
  - O casamento substitui o NoFap no banner de perfil. No perfil web, as informações de NoFap são mantidas e o casamento também é exibido com a data e a duração.

- **Persistência isolada:**
  - Os dados de pedidos e casamentos são salvos separadamente por plataforma e grupo/servidor em `settings/marriages/`.

---

## 📥 12. Suporte a Novas Plataformas de Download

- Adicionado suporte a links do **SoundCloud** no comando `!play`, enviando o conteúdo como áudio.
- Adicionado suporte a links do **iFunny** no comando `!video`, enviando o conteúdo como vídeo.
- O AutoDownload agora reconhece e processa links dessas duas plataformas, com o tipo de mídia correspondente.
- As plataformas suportadas são identificadas pelo domínio do link para evitar aceitar sites que apenas imitam seus endereços.
- Os fluxos existentes para Kwai, Facebook e X/Twitter permanecem disponíveis. O Spotify continua suportado pelo `!play`; não foi habilitado no AutoDownload.

## 🤖 13. API Bronxys como Primeira Opção para Respostas de IA

- Os comandos de conversa por IA, incluindo o AutoIA, agora tentam primeiro o endpoint `PERGUNTE_E_EU_RESPONDO` da API Bronxys usando a chave configurada com `!setkey`.
- Se a Bronxys estiver indisponível ou falhar, o bot continua tentando os provedores configurados no `!setai`, com rotação de chaves do Gemini, Groq e OpenRouter.
- A geração de imagens pelo comando `!imagine` não foi alterada.
