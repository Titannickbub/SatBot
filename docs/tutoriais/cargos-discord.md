[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como gerenciar cargos no Discord com `!darcargo` e `!removecargo`

Os comandos `!darcargo` e `!removecargo` permitem que a equipe de moderação atribua ou retire cargos de membros em servidores do Discord diretamente por comando de texto, sem a necessidade de acessar o painel de configurações do servidor.

- **`!darcargo`:** concede um ou múltiplos cargos ao membro indicado.
- **`!removecargo`:** retira um ou múltiplos cargos do membro indicado.

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o pelo prefixo configurado.

---

## Permissões e requisitos no Discord

- **Compatibilidade:** exclusivo para o **Discord** (não aplicável ao WhatsApp ou Telegram).
- **Permissão do usuário executor:** o moderador precisa ter a permissão de **Gerenciar Cargos** (*Manage Roles*) ou **Administrador** no servidor.
- **Permissão do bot:** o cargo do Sat Bot precisa ter a permissão de **Gerenciar Cargos** (*Manage Roles*).
- **Regras de hierarquia de cargos do Discord:**
  1. O cargo mais alto do bot deve estar **acima** de todos os cargos que ele for atribuir ou remover.
  2. O cargo do usuário que executa o comando deve estar **acima** do cargo do membro alvo.
  3. Cargos integrados/gerenciados por bots e o cargo padrão `@everyone` não podem ser atribuídos nem removidos.

---

## 1. Atribuir cargos (`!darcargo`)

Concede um ou mais cargos ao usuário mencionado.

### Sintaxe
```text
!darcargo @membro @cargo1 [@cargo2...]
```

> [!NOTE]
> Mencione **primeiro o membro** e, em seguida, **um ou mais cargos** que deseja conceder.

### Exemplos práticos:
- Atribuir um único cargo:
  ```text
  !darcargo @usuario @MembroVerificado
  ```
- Atribuir múltiplos cargos de uma vez só:
  ```text
  !darcargo @usuario @Jogador @AcessoVip @Notificacoes
  ```

---

## 2. Remover cargos (`!removecargo`)

Retira um ou mais cargos do usuário mencionado.

### Sintaxe
```text
!removecargo @membro @cargo1 [@cargo2...]
```

### Exemplos práticos:
- Remover um único cargo:
  ```text
  !removecargo @usuario @Jogador
  ```
- Remover múltiplos cargos simultaneamente:
  ```text
  !removecargo @usuario @AcessoVip @Jogador
  ```

---

## Resumo dos comandos

| Comando | Descrição | Exemplo |
| --- | --- | --- |
| `!darcargo` | Adiciona um ou mais cargos ao membro no Discord | `!darcargo @membro @Cargo1 @Cargo2` |
| `!removecargo` | Remove um ou mais cargos do membro no Discord | `!removecargo @membro @Cargo1` |

---

## Solução de problemas comuns

### 1. "❌ Você precisa da permissão Gerenciar Cargos ou Administrador."
O seu cargo no Discord não tem a permissão nativa de **Gerenciar Cargos**. Peça ao proprietário do servidor para conceder essa permissão ao seu cargo de moderador.

### 2. "❌ O bot precisa da permissão Gerenciar Cargos."
O cargo do Sat Bot está sem a permissão **Gerenciar Cargos** nas configurações do servidor. Ative essa opção no cargo do bot.

### 3. "❌ Não foi possível alterar o cargo devido à hierarquia."
No Discord, um bot ou usuário nunca pode conceder ou remover um cargo que esteja em uma posição igual ou superior à sua própria. Vá em `Configurações do Servidor > Cargos` e arraste o cargo do Sat Bot para uma posição mais alta na lista.

### 4. "❌ Cargos gerenciados e @everyone não podem ser atribuídos."
Cargos criados automaticamente por integrações de bots, assinaturas da Twitch/YouTube ou o cargo `@everyone` são restritos pelo próprio Discord e não podem ser manipulados.
