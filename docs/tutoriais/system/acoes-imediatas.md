# ⚡ Ações imediatas do menu System

<p><a href="../system.md">← Voltar ao menu System</a> · <a href="../../tutoriais.md">Tutoriais</a></p>

Estes comandos aparecem em `!menu system/ações imediatas`. São comandos de
manutenção ou gestão de permissões e todos exigem nível SU. Execute-os somente
na plataforma indicada e confira o contexto antes de alterar permissões.

## 📱 `!seradm` — promover o bot a administrador no WhatsApp

Use no grupo do WhatsApp para promover a própria conta do bot:

```text
!seradm
```

O bot precisa estar no grupo e ter permissão para promover participantes.
Esse comando não promove o autor da mensagem; promove o bot.

## 📱 `!sermb` — rebaixar o bot no WhatsApp

Use no grupo do WhatsApp para remover os privilégios de administrador da
própria conta do bot:

```text
!sermb
```

O bot deixa de ser administrador e passa a membro comum, o que pode impedir
comandos que dependam de permissões administrativas.

## 💬 `!sercargo` — adicionar cargos a si mesmo no Discord

Mencione um ou mais cargos que devem ser atribuídos ao próprio usuário SU:

```text
!sercargo @Cargo
!sercargo @Administrador @VIP
```

O comando é exclusivo de servidores Discord. O bot e o usuário precisam ter
permissão suficiente; a hierarquia de cargos do Discord também se aplica.

## 💬 `!delcargo` — remover cargos de si mesmo no Discord

Mencione os cargos que devem ser removidos do próprio usuário SU:

```text
!delcargo @Cargo
!delcargo @Membro @VIP
```

Também exclusivo do Discord e sujeito às permissões e à hierarquia de cargos
do servidor. Não altera os cargos de outras pessoas.
