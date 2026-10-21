[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como definir canal de avisos de comunidade com `!setgroup_c`

O comando `!setgroup_c` (também acessível por `!setcommunitygroup`, `!setgroupcommunity` ou `!setgrupo_comunidade`) define o grupo atual do WhatsApp como o canal oficial de avisos da comunidade vinculada.

Com essa configuração salva, o Sat Bot vincula o grupo à comunidade correspondente, permitindo o direcionamento correto de comunicações e recursos administrativos de comunidade.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e onde funciona

- **Quem pode usar:** administradores do grupo ou superusuários do bot.
- **Onde funciona:**
  - **WhatsApp:** funciona **exclusivamente** no WhatsApp e em grupos vinculados a uma Comunidade.
  - **Telegram:** **não suportado**.
  - **Discord:** **não suportado**.
  - **Mensagens privadas (PV):** **não suportado**.

> [!NOTE]
> Para usar este comando, o grupo precisa fazer parte de uma comunidade existente no WhatsApp. O bot identifica automaticamente o identificador da comunidade pai (*linkedParent*) através dos metadados do grupo.

---

## Como usar

Execute o comando diretamente dentro do grupo do WhatsApp que será o canal de avisos da comunidade.

### 1. Definir usando o nome atual do grupo

Se você executar o comando sem argumentos, o bot vinculará o grupo e adotará o nome atual do grupo (ou o termo padrão `"Comunidade"`) como nome de referência interna:

```text
!setgroup_c
```

### 2. Definir informando um nome de referência para a comunidade

Você pode informar um nome personalizado para identificar a comunidade nas configurações do bot:

```text
!setgroup_c <Nome da Comunidade>
```

**Exemplo:**
```text
!setgroup_c Comunidade dos Desenvolvedores
```

> [!TIP]
> O nome informado serve como referência nas configurações internas do bot e **não** altera o nome real do grupo ou da comunidade no WhatsApp. Para alterar o nome do grupo, utilize o comando [`!setname`](./setname.md).

### 3. Exibir ajuda do comando

Para consultar o manual rápido diretamente no chat:

```text
!setgroup_c help
```
*(ou `!setgroup_c ajuda`)*

---

## Resumo de comandos e aliases

| Comando | Aliases | Descrição |
| --- | --- | --- |
| `!setgroup_c` | `!setcommunitygroup`, `!setgroupcommunity`, `!setgrupo_comunidade` | Define o grupo atual como canal de avisos da comunidade vinculada |
| `!setgroup_c <nome>` | — | Define o grupo como canal de avisos com nome de identificação personalizado |
| `!setgroup_c help` | `!setgroup_c ajuda` | Exibe o texto de instruções e exemplos do comando |

---

## Solução de problemas comuns

### 1. "❌ Este comando é exclusivo para o WhatsApp."
Você tentou executar o comando no Discord ou Telegram. O comando `!setgroup_c` é exclusivo para o recurso de Comunidades nativo do WhatsApp.

### 2. "❌ Este comando só pode ser usado em grupos do WhatsApp."
O comando foi enviado em uma conversa privada (PV). Execute-o dentro do grupo correspondente.

### 3. "❌ Não foi possível identificar a comunidade vinculada a este grupo no momento."
O grupo onde você executou o comando não está vinculado a nenhuma Comunidade do WhatsApp, ou o WhatsApp ainda não sincronizou a associação. Certifique-se de adicionar o grupo à comunidade no WhatsApp antes de rodar o comando.

### 4. "❌ Apenas administradores podem usar este comando."
Você precisa ser administrador do grupo no WhatsApp ou superusuário do bot para alterar essa configuração.
