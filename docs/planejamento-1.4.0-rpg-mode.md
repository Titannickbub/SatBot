# Planejamento — RPG Mode (1.4.0)

**Status:** progressão inicial e regras centrais do combate PvP implementadas;
fontes de XP fora das batalhas e detalhes da economia ainda precisam ser
especificados.

## Visão

Adicionar batalhas por turnos entre membros, com regras comuns para WhatsApp,
Telegram e Discord. O progresso do RPG pertence ao jogador e acompanha sua
participação entre grupos. As batalhas do MVP acontecem em um grupo por vez;
isso não torna o save do RPG local ao grupo.

## Direção definida

1. **O sistema de RPG é global.** XP do RPG, moeda do RPG, personagens
   desbloqueados e seus níveis não são separados por grupo.
2. **SatCoins continuam locais.** O saldo SatCoins de cada grupo permanece
   independente da moeda global do RPG. Não há conversão entre as carteiras.
3. **O XP do RPG é próprio e global.** Ele não reutiliza o XP social/local e não
   aparece no perfil local. Usa a mesma curva do XP local: nível 1 precisa de
   100 XP, e cada nível seguinte exige mais 100 XP que o anterior.
4. **Cada jogador escolhe uma única vez um personagem inicial gratuito** entre
   os personagens de raridade comum, o nível mais baixo.
5. **Personagens têm definições globais.** Atributos, fraquezas, ataques,
   habilidades e demais características vêm de um catálogo compartilhado, não
   de cópias personalizadas por grupo.
6. **O save global do jogador registra a posse e o nível de cada personagem.**
   Não há evolução ou cópia do personagem por grupo.
7. **Estados de batalha não persistem entre batalhas.** Vida, efeitos e demais
   estados temporários começam novos em cada combate e não são carregados para
   o próximo.
8. **A loja do RPG é global** e usa a moeda global do RPG. Poderá oferecer itens
   de cura e outros itens do modo; regras de inventário e uso ainda precisam
   ser definidas.
9. **Personagens não são vendidos como compra direta.** O desbloqueio será
   tratado pela página global “Loja de Sinais”: a moeda global compra sinais ou
   tíquetes, que são usados para desbloquear personagens. Preços e regras de
   resgate ainda serão definidos.
10. **Ativar/desativar o modo em um grupo só controla os comandos do RPG
    naquele grupo.** Essa configuração não altera saldos, XP, personagens,
    níveis, itens ou batalhas salvos.
11. **Cada level up da Conta Central concede 1 ponto de Ascensão.** Um ponto
    pode subir em 1 nível um personagem possuído. XP e Ascensão são globais;
    use `!ascensao <id>` ou o botão no card do personagem para gastar um ponto.
    Comprar Ascensão com a moeda global fica para uma etapa futura.
12. **Os atributos crescem somente nas cópias possuídas.** Cada atributo
    numérico efetivo é `floor(valor base × (100 + 5 × (nível − 1)) / 100)`.
    O cálculo usa sempre os valores-base do catálogo; atributos com valor zero
    continuam em zero. Catálogo e loja não recebem esse crescimento.
13. **Combate PvP:** cada jogador salva uma equipe ordenada de 1 a 3
    personagens. O personagem vivo mais ágil começa; depois os lados alternam,
    cada personagem vivo age uma vez por rodada, respeitando a ordem da equipe.
    O primeiro personagem vivo da equipe adversária recebe os golpes.
14. **Dano e efeitos:** fraqueza dobra o dano; afinidade reduz o dano imediato
    pela metade. Congelado causa 4 de dano passivo no fim de cada rodada,
    dura até a batalha terminar e não acumula. A afinidade do alvo ao tipo do
    efeito impede aplicá-lo, mas não anula o dano imediato do golpe; fraqueza
    ao tipo dobra o dano passivo.
15. **Turnos e recompensas:** 60 segundos sem agir encerram a batalha por
    timeout. Vitória por derrota de equipe, desistência ou timeout concede
    10 XP ao vencedor e 1 XP ao perdedor; a concessão é idempotente.

## Escopo global e contexto de grupo

- Dados e progresso pertencem ao jogador, não ao grupo em que ele está usando
  o bot.
- Uma batalha ainda precisa de um chat para os participantes interagirem. No
  MVP, os dois participantes iniciam e jogam no mesmo grupo; batalhas entre
  grupos ficam fora do escopo inicial.
- Desativar os comandos do RPG em um grupo não apaga nem reinicia os dados
  globais. Ao reativar, os mesmos dados continuam disponíveis.
- O XP social e os SatCoins locais continuam sob as regras e permissões
  existentes. O sistema global de RPG não concede aos administradores locais
  autoridade sobre XP ou moeda global.
- A identidade global do jogador será a Conta Central, que também fornece o
  nome global personalizável. Antes de usar essa identidade para saves do RPG,
  o fluxo de união deve preservar dados, credenciais e sessões quando duas
  Contas Centrais forem mescladas; o identificador antigo precisa continuar
  resolvendo para a conta resultante ou seus dados precisam ser migrados.

## Decisões em aberto

| Tema | Definição atual / pendência |
|---|---|
| Escopo | Global para progresso e economia do RPG; batalhas do MVP no mesmo grupo |
| XP | XP próprio e global; curva igual ao XP local; fontes e quantidade pendentes |
| Ascensão | 1 ponto por nível da Conta Central; gastar 1 ponto sobe 1 nível de personagem |
| Moeda | Carteira global do RPG separada de SatCoins; nome e formas de obtenção pendentes |
| Personagem inicial | Uma escolha gratuita por Conta Central entre personagens de raridade comum |
| Níveis | Nível guardado globalmente por personagem possuído; curva e efeitos pendentes |
| Loja global | Itens de cura e outros itens do RPG; catálogo e consumo pendentes |
| Loja de Sinais | Moeda global compra sinais/tíquetes usados para desbloquear personagens; preços e resgate pendentes |
| Equipe | 1 a 3 personagens salvos em ordem no perfil global; a ordem afeta turnos e alvos |
| Identidade | Conta Central; primeiro corrigir uniões para não perder dados ou login quando IDs forem consolidados |
| Ranking | Definir critérios e apresentação do ranking global |
| Administração | Definir controles SU para carteira e dados globais; admins locais não editam esses dados |
| Desafio pendente | Definir prazo para aceitar ou recusar um convite |

## Fluxo de jogo proposto

1. O jogador recebe a opção de escolher gratuitamente um personagem básico
   inicial.
2. O jogador seleciona até três personagens que possui para uma batalha.
3. Um membro desafia outro no grupo atual; o alvo aceita ou recusa por botão no
   Discord/Telegram ou pelos comandos em qualquer plataforma.
4. Ao iniciar o combate, o bot registra os personagens selecionados e seus
   níveis como um snapshot imutável daquela batalha.
5. Vida, efeitos e outros estados de combate são inicializados para a batalha e
   descartados ao terminar; não são salvos como condição persistente do
   personagem.
6. A cada turno, o jogador escolhe um golpe disponível ou desiste. Os botões no
   Discord/Telegram e os comandos validam o mesmo estado do combate.
7. O bot valida o turno, aplica dano/efeitos e mostra o resultado aos
   participantes. Quem não agir em 60 segundos perde por timeout.
8. Ao terminar, o bot concede uma única vez 10 XP ao vencedor e 1 XP ao
   perdedor.

## Escopo sugerido do MVP

### Incluído

- Catálogo global de personagens originais, com atributos, fraquezas, ataques,
  habilidades e regras de nível compartilhados.
- Escolha gratuita, uma única vez, de um personagem de raridade comum.
- Dados globais do jogador com XP do RPG, carteira RPG e, por personagem,
  indicação de posse e nível.
- Equipe de até três personagens elegíveis, congelada durante cada batalha.
- Estados de vida e combate temporários, reinicializados a cada batalha.
- Duelos PvP entre dois membros no mesmo grupo, com convite, aceite e recusa.
- Turnos, prazo, desistência, cancelamento e recuperação de batalhas após
  reinício do bot.
- Loja global do RPG usando a moeda global, incluindo itens de cura; efeitos e
  regras de consumo definidos antes da implementação.
- Página global “Loja de Sinais”: comprar sinais/tíquetes com moeda global e
  resgatá-los para desbloquear personagens; preços e regras de resgate definidos
  antes da implementação.
- Configuração por grupo que habilita ou bloqueia somente os comandos do RPG.
- Comandos equivalentes nas três plataformas; botões no Discord e Telegram e
  fluxo por texto no WhatsApp.
- Equipe ordenada de 1 a 3 personagens, golpe no personagem vivo da frente,
  fraquezas, afinidades e efeito Congelado.
- Recompensa fixa de 10 XP para vitória e 1 XP para derrota, inclusive por
  desistência ou timeout.
- Aplicação idempotente de XP e prêmios para evitar duplicação após repetição
  de ação ou reinício.

### Fora do MVP

- Alterar ou unificar SatCoins entre grupos.
- Converter SatCoins em moeda RPG ou vice-versa.
- Salvar evolução, saldo RPG, vida ou inventário de RPG por grupo.
- Batalhas e matchmaking entre grupos.
- Compra direta de personagens com SatCoins ou com a moeda global; desbloqueios
  devem seguir o fluxo de sinais/tíquetes da Loja de Sinais.
- Itens pagos com dinheiro real ou vantagens pagas que afetem o equilíbrio.
- Edição de dados, níveis ou moeda globais por administradores locais.

Os personagens, habilidades, nomes, imagens e universo devem ser originais;
referências a jogos existentes servem apenas como inspiração de gênero.

## Economia e permissões

- **SatCoins locais:** continuam vinculados à plataforma e ao grupo, conforme
  o funcionamento atual. A administração local existente não é alterada por
  este planejamento.
- **Moeda global do RPG:** carteira separada por identidade global do jogador.
  Seu nome, fontes de obtenção, limites, histórico de transações e política de
  suporte/reset continuam pendentes.
- **Sem câmbio:** nenhuma operação converte ou transfere valor entre SatCoins
  locais e moeda global do RPG.
- **Permissões:** administradores locais não podem alterar XP, níveis,
  personagens ou moeda globais. Controles de suporte ou administração global
  devem ser definidos para SU e registrados em auditoria.
- **Loja:** compras globais afetam a conta do jogador, nunca apenas o grupo em
  que o comando foi usado. Uma transação deve ter identificador único para
  impedir débito ou concessão duplicados.

## Arquitetura e dados conceituais

- O formato inicial dos personagens, fraquezas e golpes está em
  [Planejamento — Dados do criador de personagens](./planejamento-rpg-dados-globais.md).
- **Motor de batalha:** regras comuns às plataformas; recebe estado e ação,
  valida e devolve o próximo estado e eventos.
- **Catálogo global `RpgCharacter`:** definição compartilhada de atributos,
  fraquezas, ataques, habilidades e progressão de nível.
- **Perfil global `RpgPlayer`:** identidade do jogador, XP RPG, moeda global,
  inventário global e lista de personagens possuídos com seus níveis. Para
  personagens clonadores, registra também os IDs dos golpes aprendidos por
  aquele jogador.
- **Batalha `RpgBattle`:** grupo de origem, participantes, snapshot dos
  personagens e níveis, estados temporários, turno, prazo, ações e prêmios já
  aplicados. Vida e efeitos não são mantidos como estado entre batalhas.
- **Configuração `RpgGroupSettings`:** somente o estado que habilita ou bloqueia
  comandos do RPG naquele grupo; não guarda cópias da progressão global.
- **Transações e auditoria:** histórico de compras, recompensas e intervenções
  globais, com IDs únicos e registro de responsável.
- **Identidade:** usar o ID estável da Conta Central como chave global do
  jogador; o nome global personalizável é apenas dado de exibição, não chave.
  A união de contas deve manter IDs antigos resolvíveis ou migrar seus dados
  antes que a Conta Central de origem seja removida.

## Interface proposta

Os nomes são rascunhos; a sintaxe final deve seguir o parser atual.

- `!rpg` — perfil RPG global; não altera nem substitui o perfil local.
- `!meus_personagens [página]` — lista personagens possuídos em texto, até 10 por
  página.
- `!catalogo [help|página]` — exibe ajuda ou lista somente as bases, até 10 por página; escolha
  uma base para então listar seus personagens.
- `!catalogo base <número> [página]` — abre os personagens de uma base.
- No Discord e Telegram, abrir um personagem mostra seu card com opção de
  voltar à lista da base; no WhatsApp, use
  `!catalogo ver <id> base <número> pagina <página>`.
- A opção de escolher o personagem inicial fica no card dos personagens comuns,
  dentro do catálogo; a orientação para escolher só aparece se o jogador ainda
  não possuir personagens.
- `!rpgver <id ou nome>` — exibe o card de um personagem do catálogo.
- No WhatsApp, omitir a página mostra a primeira; use
  `!catalogo escolher <id>` para escolher o personagem inicial.
- `!rpg equipe` — selecionar até três personagens para a próxima batalha.
- `!rpg loja` — loja global com a moeda RPG.
- `!rpg sinais` — página global para adquirir sinais/tíquetes e desbloquear
  personagens.
- `!rpg desafiar <membro>` — envia convite no grupo atual.
- `!rpg aceitar` / `!rpg recusar` — responde ao desafio pendente.
- `!rpg batalha` — consulta estado e turno do combate no grupo atual.
- `!rpg agir ataque|defender|habilidade <nome>` — executa uma ação no WhatsApp.
- `!rpg desistir` — encerra a própria participação.
- `!rpg ranking` — consulta o ranking global, se aprovado.
- `!rpg admin on|off` — habilita ou bloqueia apenas os comandos do RPG no grupo,
  conforme a autorização administrativa padrão.
- `!rpg su ...` — controles globais exclusivos do SU, definidos com auditoria.

Botões no Discord e Telegram podem oferecer as mesmas ações. Cada interação
deve revalidar jogador, turno, batalha e prazo no servidor.

### Comandos PvP

- `!equipe` abre a montagem guiada: Discord e Telegram oferecem botões para
  selecionar, ordenar e salvar até três personagens; no WhatsApp, o bot lista
  os IDs possuídos e explica a sintaxe.
- Se o jogador ainda não possui personagens, o botão do catálogo abre a
  seleção de personagem inicial; no WhatsApp, o bot orienta a usar o catálogo,
  escolher um personagem comum e então voltar à equipe.
- `!equipe <id1> [id2] [id3]` também salva diretamente os personagens na ordem
  informada.
- `!desafiar [menção]` envia um convite; também é possível responder à mensagem
  da pessoa sem informar uma menção.
- `!aceitar_desafio` / `!recusar_desafio` respondem ao convite pendente.
- `!ataque <nome ou id do golpe>` usa um golpe no personagem vivo da frente.
- `!desistir_desafio` concede a vitória ao oponente; `!status_batalha` consulta
  o combate e convites pendentes.
- Discord usa embeds e botões; Telegram usa HTML e botões inline; WhatsApp usa
  formatação de texto e comandos.

## Segurança, equilíbrio e recuperação

- Somente o participante do turno atual pode agir.
- Equipe e níveis usados ficam congelados no snapshot; não se altera a equipe
  durante uma batalha.
- Vida, efeitos e demais estados temporários não sobrevivem à batalha.
- Compras, XP e prêmios globais devem ser idempotentes e registrados.
- Administradores locais não podem modificar a carteira ou progressão global.
- Desbloqueios de personagens devem ser únicos por jogador, segundo a mecânica
  de sinais/tíquetes da Loja de Sinais; cada resgate deve ser idempotente.
- A ativação/desativação local não pode zerar, suspender, duplicar ou modificar
  dados globais; apenas aceita ou bloqueia comandos naquele grupo.
- Reinícios não devem duplicar prêmios nem deixar batalhas válidas em estado
  inconsistente.
- Definir o que acontece com uma batalha ativa se o modo for desativado no grupo
  ou se um participante perder acesso ao chat.

## Etapas de implementação

1. **Pré-requisito — corrigir a união de Contas Centrais:** mesclar dados sem
   perda, preservar ou migrar acesso ao painel web e manter os identificadores
   antigos resolvendo para a conta resultante. Definir tratamento de conflitos
   quando ambas as contas tiverem credenciais ou dados próprios.
2. Definir a chave global do RPG com a identidade da Conta Central, sem usar o
   nome público como identificador.
3. Fechar moeda global, fontes do XP RPG, níveis e preços/regras de resgate da
   Loja de Sinais.
4. Definir armazenamento global, transações idempotentes, controles SU e
   auditoria.
5. Implementar o motor de combate e testes determinísticos.
6. Implementar desafios, turnos, prazos, desistência e recuperação.
7. Implementar catálogo global, personagem inicial, níveis e equipe.
8. Implementar moeda, inventário e loja global.
9. Integrar as três plataformas, comando local de ativação e documentação.

## Critérios de aceite propostos

- O jogador pode escolher um personagem básico inicial gratuitamente.
- Personagens possuídos e seus níveis acompanham o jogador entre grupos.
- XP RPG e moeda RPG são globais e separados de XP social e SatCoins locais.
- XP RPG não aparece nem modifica o perfil local.
- Vida e estados temporários são reinicializados em cada batalha.
- A equipe usada tem no máximo três personagens e não muda durante a batalha.
- Administradores locais não conseguem editar XP, níveis ou moeda globais.
- Desativar o modo em um grupo apenas bloqueia os comandos ali e não altera
  dados ou batalhas salvos.
- Ações inválidas, repetidas ou fora de turno não avançam a batalha nem pagam
  prêmios duplicados.
- Batalhas do MVP ocorrem no grupo onde os participantes interagem.
- SatCoins locais não são convertidos nem usados como moeda global do RPG.
