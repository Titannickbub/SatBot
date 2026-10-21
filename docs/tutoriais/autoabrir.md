[Voltar para Comandos de administração](./comandos-adm.md) · [Voltar para Tutoriais](../tutoriais.md)

# Como programar horários de abrir e fechar o chat com `!autoabrir`

O comando `!autoabrir` (também acessível por `!abrefecha`) permite automatizar
a abertura e o fechamento recorrente do grupo ou servidor. Com ele, você pode
definir rotinas semanais para que o chat abra e feche sozinho em horários
planejados (por exemplo, fechar durante a noite e reabrir pela manhã, com
regras distintas para dias úteis e fins de semana).

O prefixo nos exemplos é `!`. Se o prefixo do bot foi alterado, substitua-o
pelo prefixo configurado.

## Permissões e onde funciona

- **Quem pode usar:** administradores do chat ou membros com permissão de
  gerenciar o chat / servidor.
- **Permissão do bot:** o bot precisa ter permissão de administrador ou de
  gerenciamento de mensagens e configurações do chat na plataforma.
- **Onde funciona:**
  - **WhatsApp:** apenas em grupos comuns (não funciona em comunidades).
  - **Telegram:** grupos e supergrupos.
  - **Discord:** canais de texto (não funciona em tópicos/threads).
  - O comando não funciona em conversas privadas (PV).

---

## Como criar as programações

O bot suporta duas categorias de programação: `semana` (para dias de semana) e
`fds` (para fins de semana).

### Sintaxe

```text
!autoabrir add <semana|fds> <horários> <dias>
```

- **Horários:** use o formato `ABERTURA-FECHAMENTO`. Múltiplas faixas em um mesmo
  dia podem ser separadas por vírgula (sem espaços).
- **Dias da semana:** informe um ou mais dias abreviados: `seg`, `ter`, `qua`,
  `qui`, `sex`, `sab`, `dom`.

### Exemplos práticos

1. **Horário comercial para dias úteis (abre às 08h e fecha às 18h):**
   ```text
   !autoabrir add semana 08:00-18:00 seg ter qua qui sex
   ```

2. **Horário diferenciado para o fim de semana:**
   ```text
   !autoabrir add fds 10:00-22:00 sab dom
   ```

3. **Múltiplas faixas no mesmo dia (ex: almoço e tarde):**
   ```text
   !autoabrir add semana 07:00-12:00,14:00-20:00 seg ter qua qui sex
   ```

4. **Horário que vira a noite:**
   ```text
   !autoabrir add fds 20:00-04:00 sex sab
   ```
   *Uma faixa como `20:00-04:00` abre às 20h e fecha às 04h da madrugada
   seguinte. O fechamento continua valendo mesmo que o dia seguinte não esteja
   na lista de dias programados.*

---

## Regras importantes dos horários

- **Duração mínima de 2 horas:** cada período com o chat aberto e cada intervalo
  com o chat fechado deve durar pelo menos 2 horas.
- **Sem sobreposição:** faixas de horário no mesmo dia não podem se sobrepor;
  elas devem ser programadas em sequência.

---

## Ativar, pausar e consultar

Após cadastrar as faixas desejadas, gerencie o funcionamento com os comandos:

### 1. Ativar as programações (`!autoabrir on`)

```text
!autoabrir on
```

Ativa o sistema. A partir desse momento, o bot começará a abrir e fechar o chat
automaticamente nos horários programados.

### 2. Pausar o autoabrir (`!autoabrir off`)

```text
!autoabrir off
```

Desativa as ações automáticas. As faixas de horários cadastradas permanecem
salvas, permitindo que você reative o sistema quando desejar com `!autoabrir on`.

### 3. Consultar a programação atual (`!autoabrir status`)

```text
!autoabrir status
```

Exibe se o sistema está ativo ou desativado e lista todos os perfis cadastrados
com seus respectivos horários e dias da semana.

### 4. Remover uma programação (`!autoabrir remove`)

```text
!autoabrir remove semana
!autoabrir remove fds
```

Apaga a programação especificada (`semana` ou `fds`). Caso haja outra
programação cadastrada, ela continuará ativa normalmente.

---

## Relação com `!abrirchat` e `!fecharchat`

- **`!abrirchat` e `!fecharchat`:** executam alterações manuais e imediatas ou
  temporárias pontuais (por exemplo: `!fecharchat 2h`).
- **`!autoabrir`:** cria uma rotina semanal automática que continua se repetindo
  indefinidamente.
- Alterações manuais pontuais feitas com `!abrirchat` ou `!fecharchat` não
  cancelam a programação semanal configurada no `!autoabrir`. Para mais
  detalhes dos comandos manuais, veja o
  [tutorial de abrir e fechar chat](./abrir-fechar-chat.md).

---

## Solução de problemas comuns

1. **"Cadastre ao menos uma faixa antes de ativar":** você precisa usar
   `!autoabrir add` para definir pelo menos uma programação antes de executar
   `!autoabrir on`.
2. **"O bot não tem permissão para alterar as configurações deste chat":**
   verifique se o bot é administrador no grupo do WhatsApp/Telegram ou se tem
   permissão de *Gerenciar Canais* no Discord.
3. **"A programação não está disponível em comunidades do WhatsApp":** o
   recurso só funciona em grupos comuns do WhatsApp.
4. **Erro de intervalo inferior a 2 horas:** verifique se a duração entre a
   abertura e o fechamento (ou entre um fechamento e a próxima abertura) possui
   no mínimo 2 horas de distância.
