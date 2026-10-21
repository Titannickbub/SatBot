[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como proteger o grupo contra invasões e flood com `!antiraid`

O comando `!antiraid` (também acessível por `!raidguard`, `!anti_raid` ou `!guardraid`) ativa a defesa em tempo real do Sat Bot contra ataques coordenados de invasão (*raids*), envio excessivo de mensagens em massa (*flood*), repetição de textos e spams de links ou convites.

Quando um membro ultrapassa os limites tolerados dentro da janela de segundos configurada, o bot intervém imediatamente aplicando silenciamento (*mute*), expulsão (*kick*) ou banimento definitivo (*ban*).

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Onde funciona:** disponível em grupos e servidores (**WhatsApp**, **Telegram** e **Discord**). Não funciona em conversas privadas (PV).
- **Quem pode usar:** apenas **administradores** do grupo/servidor e superusuários do bot.
- **Quem é imune à proteção:** proprietários do chat, administradores e membros/cargos adicionados à lista branca (`userwhitelist` / `rolewhitelist`).

---

## Comportamento por plataforma

- **Discord:** monitora e soma mensagens de um mesmo usuário em todos os canais e tópicos do servidor (escopo global do servidor).
- **Telegram:** monitora todas as mensagens do grupo, incluindo tópicos de fórum.
- **WhatsApp:** monitora mensagens dentro do grupo. Como o WhatsApp não possui silenciamento individual nativo, ações de *mute* resultam na remoção do membro do grupo.
- **Imagens e anexos:** fotos, figurinhas e documentos também contam como mensagens para o limite de flood. Links e convites contam com limites e travas específicas.

---

## 1. Ativar ou desativar o anti-raid

- **Ativar:**
  ```text
  !antiraid on
  ```
- **Desativar:**
  ```text
  !antiraid off
  ```

---

## 2. Escolher a punição (`action`)

Defina qual medida o bot aplicará automaticamente contra os invasores ou membros em flood:

```text
!antiraid action <mute|kick|ban>
```

| Ação | Efeito |
| --- | --- |
| **`mute`** | Silencia temporariamente o membro (castigo no Discord e Telegram; remoção no WhatsApp). |
| **`kick`** | Expulsa o membro do grupo/servidor. |
| **`ban`** | Bane o membro permanentemente do servidor ou grupo. |

**Exemplos:**
```text
!antiraid action mute
!antiraid action ban
```

---

## 3. Configurar limite de flood e janela de tempo (`flood`)

Define o número máximo de mensagens que um usuário pode enviar dentro de uma janela de segundos:

```text
!antiraid flood <limite-de-mensagens> <segundos>
```

**Exemplo:**
```text
!antiraid flood 8 12
```
*Significa que se um membro enviar mais de 8 mensagens em um intervalo de 12 segundos, o bot aplicará a punição configurada.*

> [!TIP]
> A janela de tempo configurada no comando `flood` também é usada como referência para avaliar o limite de repetição de mensagens e spam de links.

---

## 4. Configurar limites de links e convites (`links`)

Define a quantidade máxima de links genéricos e links de convite permitidos durante a janela de tempo do anti-raid:

```text
!antiraid links <limite-de-links> <limite-de-convites>
```

**Exemplo:**
```text
!antiraid links 3 2
```
*Bloqueia e pune membros que enviarem mais de 3 links ou 2 convites dentro da janela de segundos configurada.*

---

## 5. Gerenciar listas brancas e negras de membros

- **Isentar membros confiáveis (`userwhitelist`):**
  Usuários na lista branca não são afetados pelas travas do anti-raid:
  ```text
  !antiraid userwhitelist add @membro
  !antiraid userwhitelist remove @membro
  !antiraid userwhitelist list
  ```
- **Monitorar contas sob suspeita (`userblacklist`):**
  Garante que o membro passe por monitoramento estrito contínuo:
  ```text
  !antiraid userblacklist add @membro
  !antiraid userblacklist list
  ```
- **Isentar cargos no Discord (`rolewhitelist`):**
  ```text
  !antiraid rolewhitelist add @MembroVerificado
  !antiraid rolewhitelist list
  ```

---

## 6. Consultar o status e limites atuais

Para visualizar os limites de mensagens, links, segundos e listas de exceção configurados:

```text
!antiraid status
```

O bot retornará um painel completo com:
- Estado da proteção (✅ Ativo / ❌ Não).
- Ação configurada (`mute`, `kick` ou `ban`).
- Limites de mensagens normais, repetidas, links e convites.
- Quantidade de usuários e cargos isentos.

---

## Resumo dos comandos e aliases

| Comando | Aliases | Descrição |
| --- | --- | --- |
| `!antiraid on\|off` | `!raidguard on` | Ativa ou desativa a proteção anti-raid |
| `!antiraid action <mute\|kick\|ban>` | — | Define a punição contra contas invasoras |
| `!antiraid flood <limite> <segundos>` | — | Configura o limite de mensagens e a janela de tempo |
| `!antiraid links <links> <convites>` | — | Configura o teto de links e convites na janela |
| `!antiraid userwhitelist <add\|remove\|list>` | `!antiraid uw` | Gerencia membros isentos da proteção |
| `!antiraid status` | — | Exibe o status e limites atuais do anti-raid |

---

## Solução de problemas comuns

### 1. "❌ Apenas administradores ou super usuários podem usar este comando."
Você precisa ser administrador no grupo/servidor para ajustar as configurações de segurança.

### 2. O bot não puniu quem fez flood
- Verifique com `!antiraid status` se a proteção está ativada.
- Lembre-se de que administradores do chat são **imunes** à proteção para que possam moderar e colar avisos livremente.
- Certifique-se de que o bot possui permissão de moderar membros (aplicar castigo, expulsar ou banir).
