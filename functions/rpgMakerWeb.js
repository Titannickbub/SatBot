const rpgMaker = require("./rpgMaker");

function renderPage(platform) {
    const safePlatform = JSON.stringify(platform);
    const rarityOptions = rpgMaker.CHARACTER_RARITIES
        .map(rarity => `<option value="${rarity}">${rpgMaker.RARITY_LABELS[rarity]}</option>`)
        .join("");
    const sexOptions = rpgMaker.CHARACTER_SEXES
        .map(sex => `<option value="${sex}">${rpgMaker.SEX_LABELS[sex]}</option>`)
        .join("");
    const characterForm = (id, edit = false) => `
      <form id="${id}" class="character-form">
        ${edit ? '<label>Personagem<select name="id" data-window-target="characters" required><option value="">Selecione um personagem</option></select></label>' : ""}
        <div class="grid"><label>Nome<input name="nome" maxlength="80" required></label><label>Base/obra de origem<input name="base" maxlength="80" placeholder="Ex.: REZERO" required></label></div>
        <label>Sexo<select name="sexo" required><option value="">Selecione</option>${sexOptions}</select></label>
        <label>Imagem (opcional na edição; PNG, JPEG, GIF ou WebP, até 8 MB)<input name="imagem" type="file" accept="image/png,image/jpeg,image/gif,image/webp" ${edit ? "" : "required"}></label>
        <label>Raridade<select name="raridade" required>${rarityOptions}</select><span class="hint">Personagens comuns podem ser escolhidos como personagem inicial gratuito.</span></label>
        <div class="grid"><label>HP inicial<input name="hp" type="number" min="1" step="1" required></label><label>Mana inicial<input name="mana" type="number" min="0" step="1" required></label></div>
        <div class="grid"><label>Stamina inicial<input name="stamina" type="number" min="0" step="1" required></label><label>Agilidade inicial<input name="agilidade" type="number" min="0" step="1" required></label></div>
        <div class="grid"><label>Fraquezas<select name="fraquezas" multiple required></select></label><label>Afinidades (opcional)<select name="afinidades" multiple></select></label></div>
        <label class="check"><input name="clonador" type="checkbox"> Pode clonar golpes (ganha Clone Travado, que não pode ser esquecido)</label>
        <label>Golpes permanentes<select name="golpes" multiple></select><span class="hint">Obrigatório para personagens que não clonam. O limite total inclui golpes permanentes e clonados.</span></label>
        <div class="grid"><label>Limite total de golpes<input name="limite" type="number" min="0" step="1" required></label><label class="check"><input name="ilimitado" type="checkbox"> Sem limite de golpes</label></div>
        <button class="primary" type="submit">${edit ? "Salvar alterações" : "Criar personagem"}</button>
      </form>`;

    return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>RPG Maker · SatBot</title>
  <style>
    :root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb;--line:#334366;--muted:#9da8bd}
    *{box-sizing:border-box}body{margin:0;padding:24px;background:radial-gradient(circle at top,#27365d 0,#10131c 48%,#090b10 100%)}
    .page{width:min(980px,100%);margin:0 auto}.top{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 0 18px;border-bottom:1px solid var(--line)}
    a{color:#b9c6ff;text-decoration:none;font-weight:700}.panel{margin-top:18px;padding:20px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(145deg,#1c2438,#131925)}
    h1{margin:5px 0;font-size:clamp(23px,4vw,34px)}h2{margin:0 0 6px;font-size:18px}.muted{color:var(--muted);font-size:13px;line-height:1.55}
    .main-tabs,.action-tabs{display:flex;gap:8px;overflow:auto;padding:16px 0 0}
    .tab{flex:none;padding:10px 15px;border:1px solid var(--line);border-radius:999px;background:#ffffff08;color:#dce2f3;font-weight:700;cursor:pointer}
    .tab[aria-selected="true"]{border-color:#9b8cff;background:#8b7bff30;color:#fff}
    .window[hidden],.action-pane[hidden]{display:none}
    form{display:grid;gap:12px;margin-top:16px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    label{display:grid;gap:7px;color:#dce2f3;font-size:12px;font-weight:700}input,textarea,select{width:100%;padding:10px 11px;border:1px solid #485776;border-radius:9px;background:#0e1422;color:#f5f7fb;font:inherit}
    select[multiple]{min-height:110px}textarea{min-height:82px;resize:vertical}.row{display:flex;gap:9px;flex-wrap:wrap;align-items:center}
    button{padding:10px 14px;border:1px solid #7582a3;border-radius:9px;background:#ffffff0b;color:#f5f7fb;font-weight:700;cursor:pointer}
    button:hover{border-color:#9b8cff;background:#8b7bff20}button:disabled{opacity:.55;cursor:wait}.primary{border-color:#9b8cff;background:#8b7bff30}
    .feedback{min-height:20px;margin:0;color:#9cf0cf;font-size:13px}.feedback.error{color:#ff9eaa}.summary,.list{display:grid;gap:8px}
    .summary{display:flex;flex-wrap:wrap}.pill{padding:6px 10px;border:1px solid var(--line);border-radius:999px;color:#cbd2e2;font-size:12px}
    .columns{display:grid;grid-template-columns:1fr 1fr;gap:16px}.hint{font-size:11px;color:var(--muted)}
    .check{display:flex;align-items:center;gap:9px}.check input{width:18px;height:18px;flex:none;accent-color:#9b8cff}
    .list-item{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:13px;border:1px solid var(--line);border-radius:11px;background:#ffffff05}
    .list-item strong{display:block;color:#f5f7fb;font-size:13px}.list-item small{display:block;margin-top:5px;color:var(--muted);font-size:11px;line-height:1.5;overflow-wrap:anywhere}
    .list-empty{padding:16px;border:1px dashed var(--line);border-radius:10px;color:var(--muted);font-size:13px}
    @media(max-width:680px){body{padding:14px}.grid,.columns{grid-template-columns:1fr}.panel{padding:16px}}
  </style>
</head>
<body><main class="page">
  <nav class="top"><a href="/painel-su?plataforma=${encodeURIComponent(platform)}">← Painel de superusuário</a><span>RPG Maker · ${platform}</span></nav>
  <section class="panel"><h1>Criador global de RPG</h1><p class="muted">Gerencie atributos, golpes e personagens do catálogo global.</p><div id="summary" class="summary"></div><p id="feedback" class="feedback" role="status" aria-live="polite"></p></section>
  <nav class="main-tabs" role="tablist" aria-label="Partes do RPG Maker">
    <button class="tab" type="button" role="tab" data-window-tab="attributes" aria-selected="true">Atributos</button>
    <button class="tab" type="button" role="tab" data-window-tab="moves" aria-selected="false">Golpes</button>
    <button class="tab" type="button" role="tab" data-window-tab="characters" aria-selected="false">Personagens</button>
  </nav>

  <section class="window panel" data-window="attributes">
    <h2>Atributos e efeitos</h2><p class="muted">Atributos definem fraquezas, afinidades e tipos de golpes. Efeitos também são administrados nesta área.</p>
    <nav class="action-tabs" role="tablist" aria-label="Ações de atributos">
      <button class="tab" type="button" data-action-tab="attributes:create" aria-selected="true">Criar</button>
      <button class="tab" type="button" data-action-tab="attributes:edit" aria-selected="false">Editar</button>
      <button class="tab" type="button" data-action-tab="attributes:list" aria-selected="false">Ver lista</button>
    </nav>
    <div class="action-pane" data-action-pane="attributes:create">
      <div class="columns">
        <form id="attributeCreateForm"><h2>Novo atributo</h2><label>Nome<input name="nome" maxlength="40" required placeholder="Ex.: Fogo"></label><button class="primary" type="submit">Criar atributo</button></form>
        <form id="effectCreateForm"><h2>Novo efeito</h2><label>Nome<input name="nome" maxlength="40" required placeholder="Ex.: Congelado"></label><button type="submit">Criar efeito</button></form>
      </div>
    </div>
    <div class="action-pane" data-action-pane="attributes:edit" hidden>
      <div class="columns">
        <form id="attributeEditForm"><h2>Editar atributo</h2><label>Atributo<select name="id" data-window-target="attributes" required><option value="">Selecione um atributo</option></select></label><label>Novo nome<input name="nome" maxlength="40" required></label><button class="primary" type="submit">Salvar atributo</button></form>
        <form id="effectEditForm"><h2>Editar efeito</h2><label>Efeito<select name="id" data-window-target="attributes" required><option value="">Selecione um efeito</option></select></label><label>Novo nome<input name="nome" maxlength="40" required></label><button type="submit">Salvar efeito</button></form>
      </div>
    </div>
    <div class="action-pane" data-action-pane="attributes:list" hidden>
      <div class="columns"><section><h2>Atributos</h2><div id="attributeList" class="list"></div></section><section><h2>Efeitos</h2><div id="effectList" class="list"></div></section></div>
    </div>
  </section>

  <section class="window panel" data-window="moves" hidden>
    <h2>Golpes</h2><p class="muted">Cada golpe tem um ID estável; edições atualizam a definição global usada pelos personagens.</p>
    <nav class="action-tabs" role="tablist" aria-label="Ações de golpes">
      <button class="tab" type="button" data-action-tab="moves:create" aria-selected="true">Criar</button>
      <button class="tab" type="button" data-action-tab="moves:edit" aria-selected="false">Editar</button>
      <button class="tab" type="button" data-action-tab="moves:list" aria-selected="false">Ver lista</button>
    </nav>
    <div class="action-pane" data-action-pane="moves:create"><form id="moveCreateForm" class="move-form">
      <div class="grid"><label>Nome<input name="nome" maxlength="60" required></label><label>Dano base<input name="dano" type="number" min="0" step="1" required></label></div>
      <div class="grid"><label>Custo de mana<input name="mana" type="number" min="0" step="1" value="0" required></label><label>Custo de stamina<input name="stamina" type="number" min="0" step="1" value="0" required></label></div>
      <div class="grid"><label>Custo de HP<input name="hp" type="number" min="0" step="1" value="0" required></label><label>Nível de desbloqueio<input name="nivel" type="number" min="0" step="1" value="1" required></label></div>
      <label>Tipo do golpe<select name="tipo"></select></label>
      <label>Frases (uma por linha; placeholders: {personagem}, {alvo})<textarea name="frases" required></textarea></label>
      <label>Efeitos<select name="efeitos" multiple></select><span class="hint">Use Ctrl/Cmd para selecionar mais de um. Pode deixar vazio.</span></label>
      <button class="primary" type="submit">Criar golpe</button>
    </form></div>
    <div class="action-pane" data-action-pane="moves:edit" hidden><form id="moveEditForm" class="move-form">
      <label>Golpe<select name="id" data-window-target="moves" required><option value="">Selecione um golpe</option></select></label>
      <div class="grid"><label>Nome<input name="nome" maxlength="60" required></label><label>Dano base<input name="dano" type="number" min="0" step="1" required></label></div>
      <div class="grid"><label>Custo de mana<input name="mana" type="number" min="0" step="1" required></label><label>Custo de stamina<input name="stamina" type="number" min="0" step="1" required></label></div>
      <div class="grid"><label>Custo de HP<input name="hp" type="number" min="0" step="1" required></label><label>Nível de desbloqueio<input name="nivel" type="number" min="0" step="1" required></label></div>
      <label>Tipo do golpe<select name="tipo"></select></label>
      <label>Frases (uma por linha; placeholders: {personagem}, {alvo})<textarea name="frases" required></textarea></label>
      <label>Efeitos<select name="efeitos" multiple></select><span class="hint">Use Ctrl/Cmd para selecionar mais de um.</span></label>
      <button class="primary" type="submit">Salvar alterações</button>
    </form></div>
    <div class="action-pane" data-action-pane="moves:list" hidden><div id="moveList" class="list"></div></div>
  </section>

  <section class="window panel" data-window="characters" hidden>
    <h2>Personagens</h2><p class="muted">Edite atributos, golpes, limite e imagem. Se a imagem for mantida em branco na edição, a atual será preservada.</p>
    <nav class="action-tabs" role="tablist" aria-label="Ações de personagens">
      <button class="tab" type="button" data-action-tab="characters:create" aria-selected="true">Criar</button>
      <button class="tab" type="button" data-action-tab="characters:edit" aria-selected="false">Editar</button>
      <button class="tab" type="button" data-action-tab="characters:list" aria-selected="false">Ver lista</button>
    </nav>
    <div class="action-pane" data-action-pane="characters:create">${characterForm("characterCreateForm")}</div>
    <div class="action-pane" data-action-pane="characters:edit" hidden>${characterForm("characterEditForm", true)}</div>
    <div class="action-pane" data-action-pane="characters:list" hidden><div id="characterList" class="list"></div></div>
  </section>
</main>
<script>
const platform=${safePlatform};
const feedback=document.getElementById("feedback");
const api=async(method,body=null)=>{
  const url="/api/rpg-maker/catalog?plataforma="+encodeURIComponent(platform);
  const response=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:body?JSON.stringify({...body,platform}):undefined});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||"Falha ao salvar o catálogo.");
  return result;
};
const selectedValues=select=>Array.from(select.selectedOptions).filter(option=>option.value!=="").map(option=>Number(option.value));
const setOptions=(select,items,placeholder="Selecione...")=>{
  const old=select.multiple?selectedValues(select):(select.value===""?[]:[Number(select.value)]);
  select.replaceChildren();
  if(!select.multiple)select.add(new Option(placeholder,""));
  for(const item of items){
    const option=new Option(item.id+" · "+item.nome,String(item.id));
    select.add(option);
    option.selected=old.includes(item.id);
  }
};
const setSelected=(select,values)=>{
  const ids=new Set(values||[]);
  for(const option of select.options)option.selected=ids.has(Number(option.value));
};
let catalog;
function setFeedback(text,error=false){
  feedback.classList.toggle("error",error);
  feedback.textContent=text;
}
function setWindow(name){
  document.querySelectorAll("[data-window]").forEach(pane=>pane.hidden=pane.dataset.window!==name);
  document.querySelectorAll("[data-window-tab]").forEach(tab=>tab.setAttribute("aria-selected",String(tab.dataset.windowTab===name)));
}
function setAction(owner,action){
  document.querySelectorAll("[data-action-pane]").forEach(pane=>pane.hidden=pane.dataset.actionPane!==owner+":"+action);
  document.querySelectorAll("[data-action-tab]").forEach(tab=>tab.setAttribute("aria-selected",String(tab.dataset.actionTab===owner+":"+action)));
}
document.querySelectorAll("[data-window-tab]").forEach(tab=>tab.addEventListener("click",()=>setWindow(tab.dataset.windowTab)));
document.querySelectorAll("[data-action-tab]").forEach(tab=>tab.addEventListener("click",()=>setAction(...tab.dataset.actionTab.split(":"))));

function renderList(container,items,describe,onEdit,canEdit=()=>true){
  container.replaceChildren();
  if(!items.length){
    const empty=document.createElement("p");empty.className="list-empty";empty.textContent="Nenhum registro cadastrado.";
    container.append(empty);return;
  }
  for(const item of items){
    const row=document.createElement("article");row.className="list-item";
    const content=document.createElement("div");
    const title=document.createElement("strong");title.textContent="#"+item.id+" · "+item.nome;
    const details=document.createElement("small");details.textContent=describe(item);
    content.append(title,details);
    row.append(content);
    if(canEdit(item)){
      const edit=document.createElement("button");edit.type="button";edit.textContent="Editar";edit.addEventListener("click",()=>onEdit(item));row.append(edit);
    }
    container.append(row);
  }
}
function selectForEdit(select,item,fill){
  setWindow(select.dataset.windowTarget);
  setAction(select.dataset.windowTarget,"edit");
  select.value=String(item.id);
  select.dispatchEvent(new Event("change"));
  fill?.();
}
function fillMoveForm(form,item){
  form.elements.nome.value=item.nome;
  form.elements.dano.value=item.dano;
  form.elements.mana.value=item.custo.mana;
  form.elements.stamina.value=item.custo.stamina;
  form.elements.hp.value=item.custo.hp;
  form.elements.nivel.value=item.nivelDesbloqueio;
  form.elements.tipo.value=item.tipoFraquezaId===null?"":String(item.tipoFraquezaId);
  form.elements.frases.value=item.frases.join("\\n");
  setSelected(form.elements.efeitos,item.efeitos);
}
function movePayload(form){
  return {
    nome:form.elements.nome.value,dano:Number(form.elements.dano.value),
    custo:{mana:Number(form.elements.mana.value),stamina:Number(form.elements.stamina.value),hp:Number(form.elements.hp.value)},
    tipoFraquezaId:form.elements.tipo.value===""?null:Number(form.elements.tipo.value),
    nivelDesbloqueio:Number(form.elements.nivel.value),
    frases:String(form.elements.frases.value).split(/\\r?\\n/).map(line=>line.trim()).filter(Boolean),
    efeitos:selectedValues(form.elements.efeitos)
  };
}
function fillCharacterForm(form,item){
  form.elements.nome.value=item.nome;
  form.elements.base.value=item.base;
  form.elements.sexo.value=item.sexo;
  form.elements.raridade.value=item.raridade;
  form.elements.hp.value=item.hp;
  form.elements.mana.value=item.mana;
  form.elements.stamina.value=item.stamina;
  form.elements.agilidade.value=item.agilidade;
  setSelected(form.elements.fraquezas,item.fraquezas);
  setSelected(form.elements.afinidades,item.afinidades||[]);
  form.elements.clonador.checked=item.podeClonarGolpes;
  setSelected(form.elements.golpes,item.golpesPermanentes||[]);
  form.elements.ilimitado.checked=item.limiteGolpesAprendidos===null;
  form.elements.limite.value=item.limiteGolpesAprendidos===null?"":item.limiteGolpesAprendidos;
  syncCharacterOptions(form);
}
function syncCharacterOptions(form){
  form.elements.golpes.disabled=form.elements.clonador.checked;
  form.elements.limite.disabled=form.elements.ilimitado.checked;
}
async function load(){
  const result=await api("GET");catalog=result.catalog;
  const summary=document.getElementById("summary");summary.replaceChildren();
  [["Atributos",catalog.fraquezas.length],["Efeitos",catalog.efeitos.length],["Golpes",catalog.golpes.length],["Personagens",catalog.personagens.length]].forEach(([label,count])=>{
    const pill=document.createElement("span");pill.className="pill";pill.textContent=label+": "+count;summary.append(pill);
  });
  document.querySelectorAll('select[name="tipo"]').forEach(select=>setOptions(select,catalog.fraquezas,"Sem tipo"));
  document.querySelectorAll('select[name="efeitos"]').forEach(select=>setOptions(select,catalog.efeitos));
  document.querySelectorAll('select[name="fraquezas"],select[name="afinidades"]').forEach(select=>setOptions(select,catalog.fraquezas));
  document.querySelectorAll('select[name="golpes"]').forEach(select=>setOptions(select,catalog.golpes));
  setOptions(document.querySelector("#attributeEditForm select[name=id]"),catalog.fraquezas,"Selecione um atributo");
  setOptions(document.querySelector("#effectEditForm select[name=id]"),catalog.efeitos,"Selecione um efeito");
  setOptions(document.querySelector("#moveEditForm select[name=id]"),catalog.golpes.filter(move=>move.podeEsquecer!==false&&move.nome!=="Clone Travado"),"Selecione um golpe");
  document.querySelectorAll(".character-form select[name=id]").forEach(select=>setOptions(select,catalog.personagens,"Selecione um personagem"));
  renderList(document.getElementById("attributeList"),catalog.fraquezas,()=> "Usado em fraquezas, afinidades e tipos de golpes.",item=>{
    const form=document.getElementById("attributeEditForm");selectForEdit(form.elements.id,item,()=>{form.elements.nome.value=item.nome});
  });
  renderList(document.getElementById("effectList"),catalog.efeitos,()=> "Efeito global.",item=>{
    const form=document.getElementById("effectEditForm");selectForEdit(form.elements.id,item,()=>{form.elements.nome.value=item.nome});
  });
  const weaknessName=id=>catalog.fraquezas.find(item=>item.id===id)?.nome||String(id);
  const effectName=id=>catalog.efeitos.find(item=>item.id===id)?.nome||String(id);
  renderList(document.getElementById("moveList"),catalog.golpes,item=>
    "Dano "+item.dano+" · Mana "+item.custo.mana+" · Stamina "+item.custo.stamina+" · HP "+item.custo.hp+
    " · Tipo "+(item.tipoFraquezaId===null?"sem tipo":weaknessName(item.tipoFraquezaId))+
    " · Nível "+item.nivelDesbloqueio+" · Efeitos "+(item.efeitos.map(effectName).join(", ")||"nenhum"),
    item=>{
      const form=document.getElementById("moveEditForm");selectForEdit(form.elements.id,item,()=>fillMoveForm(form,item));
    },item=>item.podeEsquecer!==false&&item.nome!=="Clone Travado");
  renderList(document.getElementById("characterList"),catalog.personagens,item=>
    "Base "+item.base+" · "+rpgSexLabel(item.sexo)+" · "+rpgRarityLabel(item.raridade)+" · HP "+item.hp+" · Mana "+item.mana+" · Stamina "+item.stamina+" · Agilidade "+item.agilidade+
    " · Fraquezas "+item.fraquezas.map(weaknessName).join(", ")+
    " · Afinidades "+((item.afinidades||[]).map(weaknessName).join(", ")||"nenhuma")+
    " · "+(item.podeClonarGolpes?"clonador":"não clonador")+" · Limite "+(item.limiteGolpesAprendidos===null?"ilimitado":item.limiteGolpesAprendidos),
    item=>{
      const form=document.getElementById("characterEditForm");selectForEdit(form.elements.id,item,()=>fillCharacterForm(form,item));
    });
}
function rpgRarityLabel(rarity){
  return ${JSON.stringify(rpgMaker.RARITY_LABELS)}[rarity]||rarity;
}
function rpgSexLabel(sex){
  return ${JSON.stringify(rpgMaker.SEX_LABELS)}[sex]||sex;
}
async function submitForm(form,action,build){
  form.addEventListener("submit",async event=>{
    event.preventDefault();const button=form.querySelector('button[type="submit"]');button.disabled=true;setFeedback("Salvando...");
    try{
      const result=await api("POST",{action,...build(new FormData(form),form)});
      setFeedback(result.message||"Salvo.");form.reset();
      if(form.classList.contains("character-form"))syncCharacterOptions(form);
      await load();
    }catch(error){setFeedback(error.message,true)}
    finally{button.disabled=false}
  });
}
submitForm(document.getElementById("attributeCreateForm"),"attribute",fd=>({nome:fd.get("nome")}));
submitForm(document.getElementById("effectCreateForm"),"effect",fd=>({nome:fd.get("nome")}));
submitForm(document.getElementById("attributeEditForm"),"attribute.update",fd=>({id:Number(fd.get("id")),nome:fd.get("nome")}));
submitForm(document.getElementById("effectEditForm"),"effect.update",fd=>({id:Number(fd.get("id")),nome:fd.get("nome")}));
submitForm(document.getElementById("moveCreateForm"),"move",(_fd,form)=>movePayload(form));
submitForm(document.getElementById("moveEditForm"),"move.update",(fd,form)=>({id:Number(fd.get("id")),...movePayload(form)}));
document.querySelectorAll(".move-form select[name=id]").forEach(select=>select.addEventListener("change",()=>{
  const item=catalog?.golpes.find(move=>move.id===Number(select.value));if(item)fillMoveForm(select.form,item);
}));
async function readImage(file){
  if(file.size>8*1024*1024)throw new Error("A imagem deve ter até 8 MB.");
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(new Error("Não foi possível ler a imagem."));reader.readAsDataURL(file);
  });
}
function characterPayload(form){
  return {
    nome:form.elements.nome.value,base:form.elements.base.value,sexo:form.elements.sexo.value,hp:Number(form.elements.hp.value),mana:Number(form.elements.mana.value),
    raridade:form.elements.raridade.value,
    stamina:Number(form.elements.stamina.value),agilidade:Number(form.elements.agilidade.value),
    fraquezas:selectedValues(form.elements.fraquezas),afinidades:selectedValues(form.elements.afinidades),
    podeClonarGolpes:form.elements.clonador.checked,golpesPermanentes:selectedValues(form.elements.golpes),
    limiteGolpesAprendidos:form.elements.ilimitado.checked?null:Number(form.elements.limite.value)
  };
}
async function submitCharacter(form,action){
  form.addEventListener("submit",async event=>{
    event.preventDefault();const button=form.querySelector('button[type="submit"]');button.disabled=true;setFeedback("Salvando personagem...");
    try{
      const payload=characterPayload(form);
      if(action==="character.update")payload.id=Number(form.elements.id.value);
      const file=form.elements.imagem.files[0];if(file)payload.imageData=await readImage(file);
      const result=await api("POST",{action,...payload});
      setFeedback(result.message);form.reset();syncCharacterOptions(form);await load();
    }catch(error){setFeedback(error.message,true)}
    finally{button.disabled=false}
  });
}
submitCharacter(document.getElementById("characterCreateForm"),"character");
submitCharacter(document.getElementById("characterEditForm"),"character.update");
document.querySelectorAll(".character-form").forEach(form=>{
  form.elements.clonador.addEventListener("change",()=>syncCharacterOptions(form));
  form.elements.ilimitado.addEventListener("change",()=>syncCharacterOptions(form));
  form.elements.id?.addEventListener("change",()=>{
    const item=catalog?.personagens.find(character=>character.id===Number(form.elements.id.value));
    if(item)fillCharacterForm(form,item);
  });
});
load().catch(error=>setFeedback(error.message,true));
</script></body></html>`;
}

module.exports = { renderPage };
