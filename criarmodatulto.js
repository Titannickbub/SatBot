const crypto = require("crypto");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { strToU8, zipSync } = require("fflate");
const actStorage = require("./functions/actStorage");
const act18Loader = require("./functions/act18Loader");
const editor = require("./commands/diversao/act_edit");

const HOST = "127.0.0.1";
const DEFAULT_PORT = 4173;
const SETTINGS_DIR = path.join(__dirname, "settings");
const MOD_ZIP_PATH = path.join(SETTINGS_DIR, "MOD_ADULTO.zip");
const MAX_UPLOAD_SIZE = 200 * 1024 * 1024;
const MAX_MEDIA_SIZE = 50 * 1024 * 1024;
const MAX_PACKAGE_SIZE = 300 * 1024 * 1024;
const GLOBAL_PATHS = actStorage.getPaths(null, "global", "adult");

const PAGE = String.raw`<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Criador de Mod Adulto - SatBot</title>
<style>
:root{color-scheme:dark;font:15px Segoe UI,Arial,sans-serif;background:#10131c;color:#f5f7fb}
*{box-sizing:border-box}body{margin:0;padding:24px}button,input,textarea{font:inherit}
button{padding:9px 13px;border:1px solid #53617e;border-radius:9px;background:#20283a;color:#fff;cursor:pointer}
button:hover{border-color:#a89cff}button.danger{border-color:#803c4a;color:#ffb5c0}
input,textarea{width:100%;padding:10px;border:1px solid #39445b;border-radius:8px;background:#0d111a;color:#f5f7fb}
textarea{min-height:84px;resize:vertical}.layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:20px;max-width:1180px;margin:auto}
header{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:14px;padding-bottom:15px;border-bottom:1px solid #30394c}
h1{margin:0;font-size:23px}h2{font-size:18px;margin:0 0 16px}.muted{color:#a7b0c2;font-size:13px;line-height:1.5}
.actions,.panel{padding:16px;border:1px solid #30394c;border-radius:13px;background:#171c28}
.action-list{display:grid;gap:7px;margin:14px 0}.action-choice{text-align:left}.action-choice.active{border-color:#9c8cff;background:#342e55}
.panel{min-height:440px}.field{display:grid;gap:7px;margin:13px 0}.field label,.section-label{font-size:13px;font-weight:700}
.toolbar{display:flex;flex-wrap:wrap;gap:8px}.top-actions{display:flex;gap:8px}.item{margin:10px 0;padding:12px;border:1px solid #30394c;border-radius:10px;background:#111620}
.item-head{display:flex;justify-content:space-between;gap:10px;margin-bottom:8px}.item textarea{min-height:68px}
.media-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:10px 0}
.media-card{min-width:0;padding:9px;border:1px solid #30394c;border-radius:9px}.media-card img,.media-card video{display:block;width:100%;max-height:180px;object-fit:contain;background:#090b10}
.media-card .muted{overflow-wrap:anywhere;margin:7px 0}.status{min-height:22px;margin-top:12px;color:#a8e7c6}.status.error{color:#ff9eaa}
.empty{padding:30px;text-align:center;color:#a7b0c2}.checkbox{display:flex;align-items:center;gap:9px}.checkbox input{width:auto}
@media(max-width:720px){body{padding:12px}.layout{grid-template-columns:1fr}header{align-items:flex-start;flex-direction:column}.top-actions{width:100%}.top-actions button{flex:1}}
</style>
</head>
<body>
<div class="layout">
<header>
  <div><h1>Criador de Mod Adulto</h1><div class="muted">Editor local; usa o catálogo global ou o ZIP de settings se ainda não houver catálogo. Exporta sem iniciar o bot.</div></div>
  <div class="top-actions"><button id="reload">Recarregar catálogo global</button><button id="export">Exportar MOD_ADULTO.zip</button></div>
</header>
<aside class="actions">
  <h2>Ações</h2>
  <button id="new-action">Nova ação</button>
  <div id="action-list" class="action-list"></div>
  <div class="muted">O ZIP terá act18.json na raiz e as mídias em act18_media/.</div>
</aside>
<main id="editor" class="panel"><div class="empty">Carregando catálogo...</div></main>
</div>
<div id="status" class="status" role="status"></div>
<script>
const state={actions:{},selected:null};
const actionList=document.getElementById("action-list");
const editorPanel=document.getElementById("editor");
const statusLine=document.getElementById("status");
const reserved=new Set(["constructor","prototype","__proto__"]);
function el(tag,props,children){const node=document.createElement(tag);if(props)for(const [key,value]of Object.entries(props)){if(key==="text")node.textContent=value;else if(key==="className")node.className=value;else if(key==="checked")node.checked=value;else if(key==="value")node.value=value;else node.setAttribute(key,value)}if(children)for(const child of children)node.append(child);return node}
function setStatus(text,error){statusLine.textContent=text;statusLine.className=error?"status error":"status"}
function validName(value){return /^[\p{L}\p{N}][\p{L}\p{N}_-]{0,31}$/u.test(value)&&!reserved.has(value.toLowerCase())}
function actionKeys(){return Object.keys(state.actions)}
function renderList(){actionList.replaceChildren();for(const name of actionKeys()){const button=el("button",{className:"action-choice"+(name===state.selected?" active":"") ,text:name+" · "+((state.actions[name].enabled===false)?"desativada":"ativa")});button.onclick=()=>{state.selected=name;render()};actionList.append(button)}}
function render(){renderList();if(!state.selected||!state.actions[state.selected]){editorPanel.replaceChildren(el("div",{className:"empty",text:"Crie uma ação ou selecione uma da lista."}));return}renderEditor(state.selected)}
function addField(parent,labelText,control){const wrap=el("div",{className:"field"});wrap.append(el("label",{text:labelText}),control);parent.append(wrap);return control}
function renderEditor(originalName){
 const action=state.actions[originalName];editorPanel.replaceChildren();
 editorPanel.append(el("h2",{text:"Editar ação"}));
 const nameInput=addField(editorPanel,"Nome da ação",el("input",{value:originalName,maxlength:"32"}));
 nameInput.onchange=()=>{const next=nameInput.value.trim();if(!validName(next)){nameInput.value=originalName;setStatus("Nome inválido. Use letras, números, _ ou - (até 32 caracteres).",true);return}if(next!==originalName&&state.actions[next]){nameInput.value=originalName;setStatus("Já existe uma ação com esse nome.",true);return}if(next!==originalName){state.actions[next]=state.actions[originalName];delete state.actions[originalName];state.selected=next;render()}};
 const enabled=el("input",{type:"checkbox",checked:action.enabled!==false});const enabledLabel=el("label",{className:"checkbox"});enabledLabel.append(enabled,document.createTextNode("Ação ativada"));editorPanel.append(enabledLabel);enabled.onchange=()=>{action.enabled=enabled.checked};
 const aliases=addField(editorPanel,"Aliases (separados por vírgula)",el("input",{value:(action.aliases||[]).join(", ")}));aliases.onchange=()=>{action.aliases=aliases.value.split(",").map(value=>value.trim()).filter(Boolean)};
 const messagesSection=el("section");messagesSection.append(el("div",{className:"section-label",text:"Frases"}));const messagesList=el("div");
 (action.messages||[]).forEach((text,index)=>{const item=el("div",{className:"item"});const top=el("div",{className:"item-head"});top.append(el("strong",{text:"Frase "+(index+1)}));const remove=el("button",{className:"danger",text:"Remover"});remove.onclick=()=>{action.messages.splice(index,1);renderEditor(originalName)};top.append(remove);const input=el("textarea",{maxlength:"500",value:text});input.onchange=()=>{action.messages[index]=input.value};item.append(top,input);messagesList.append(item)});
 const addMessage=el("button",{text:"Adicionar frase"});addMessage.onclick=()=>{action.messages.push("");renderEditor(originalName)};messagesSection.append(messagesList,addMessage);editorPanel.append(messagesSection);
 const mediaSection=el("section");mediaSection.append(el("div",{className:"section-label",text:"Mídias (até 30 por ação)"}));const mediaGrid=el("div",{className:"media-grid"});
 (action.media||[]).forEach((media,index)=>{const card=el("div",{className:"media-card"});let source=null;let mime=media.mimeType||"";if(media.base64){source=media.base64.startsWith("data:")?media.base64:"data:"+(mime||"application/octet-stream")+";base64,"+media.base64}
 if(source&&(mime.startsWith("video/")||/\.(mp4|webm|mov)(?:$|[?#])/i.test(media.fileName||media.file||media.url||""))){card.append(el("video",{src:source,controls:""}))}else if(source&&(mime.startsWith("image/")||media.type==="photo"||media.type==="gif")){card.append(el("img",{src:source,alt:media.fileName||media.file||"Mídia"}))}else{card.append(el("div",{className:"muted",text:"Prévia indisponível"}))}
 card.append(el("div",{className:"muted",text:media.fileName||media.file||media.url||("Mídia "+(index+1))}));const remove=el("button",{className:"danger",text:"Remover mídia"});remove.onclick=()=>{action.media.splice(index,1);renderEditor(originalName)};card.append(remove);mediaGrid.append(card)});
 const upload=el("input",{type:"file",multiple:"",accept:"image/*,video/*,.gif,.mp4,.webm,.mov"});upload.onchange=async()=>{const files=Array.from(upload.files||[]);let added=0;for(const file of files){if(file.size>52428800){setStatus(file.name+" excede 50 MB.",true);continue}const lower=file.name.toLowerCase();const isImage=file.type.startsWith("image/")||/\.(png|jpe?g|gif|webp|bmp)$/i.test(lower);const isVideo=file.type.startsWith("video/")||/\.(mp4|webm|mov|avi|mkv)$/i.test(lower);if(!isImage&&!isVideo){setStatus(file.name+" não é imagem ou vídeo compatível.",true);continue}if(action.media.length>=30){setStatus("O limite é de 30 mídias por ação.",true);break}try{const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error||new Error("Falha ao ler "+file.name));reader.readAsDataURL(file)});const parts=String(dataUrl).split(",");if(parts.length<2)throw new Error("O navegador não conseguiu codificar "+file.name);action.media.push({type:(file.type==="image/gif"||isVideo)?"gif":"photo",base64:parts[1],mimeType:file.type||"application/octet-stream",fileName:file.name});added++}catch(error){setStatus(error.message,true)}}renderEditor(originalName);if(added)setStatus(added+" mídia(s) adicionada(s) ao editor.")};
 mediaSection.append(mediaGrid,addField(mediaSection,"Adicionar imagens ou vídeos",upload));editorPanel.append(mediaSection);
 const buttons=el("div",{className:"toolbar"});const removeAction=el("button",{className:"danger",text:"Excluir ação"});removeAction.onclick=()=>{if(!confirm("Excluir a ação "+originalName+"?"))return;delete state.actions[originalName];state.selected=actionKeys()[0]||null;render()};buttons.append(removeAction);editorPanel.append(buttons);
}
async function loadCatalog(){setStatus("Carregando catálogo...");try{const response=await fetch("/api/catalog");const data=await response.json();if(!response.ok)throw new Error(data.error||"Falha ao carregar o catálogo.");state.actions=data.actions||{};state.selected=actionKeys()[0]||null;render();setStatus("Catálogo carregado. As alterações só serão gravadas no ZIP exportado.")}catch(error){setStatus(error.message,true)}}
document.getElementById("new-action").onclick=()=>{const name=prompt("Nome da nova ação:");if(name===null)return;const normalized=name.trim().toLowerCase();if(!validName(normalized)||state.actions[normalized]){setStatus("Nome inválido ou já cadastrado.",true);return}state.actions[normalized]={enabled:true,aliases:[],messages:[],media:[]};state.selected=normalized;render()};
document.getElementById("reload").onclick=loadCatalog;
document.getElementById("export").onclick=async()=>{const button=document.getElementById("export");button.disabled=true;setStatus("Compactando o pacote...");try{for(const [name,action]of Object.entries(state.actions)){action.aliases=(action.aliases||[]).map(value=>value.trim()).filter(Boolean);action.messages=(action.messages||[]).map(value=>value.trim()).filter(Boolean);if(!action.aliases.length)action.aliases=[]}
 const response=await fetch("/api/export",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({actions:state.actions})});if(!response.ok){const result=await response.json();throw new Error(result.error||"Não foi possível gerar o ZIP.")}const blob=await response.blob();const url=URL.createObjectURL(blob);const link=el("a",{href:url,download:"MOD_ADULTO.zip"});document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);setStatus("MOD_ADULTO.zip exportado. Copie-o para a pasta settings da instalação que deseja usar.")}catch(error){setStatus(error.message,true)}finally{button.disabled=false}};
loadCatalog();
</script>
</body>
</html>`;

function decodeBase64(value) {
    const text = String(value || "").replace(/^data:[^,]*;base64,/i, "").replace(/\s/g, "");
    if (!text || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) {
        throw new Error("Uma mídia contém dados base64 inválidos.");
    }
    const buffer = Buffer.from(text, "base64");
    if (!buffer.length || buffer.length > MAX_MEDIA_SIZE) {
        throw new Error("Uma mídia está vazia ou excede o limite de 50 MB.");
    }
    return buffer;
}

function getExtension(media) {
    return ".bin";
}

function sanitizeName(value) {
    const normalized = String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^A-Za-z0-9_-]/g, "_")
        .slice(0, 32);
    return normalized || "acao";
}

function loadCatalog() {
    if (fs.existsSync(GLOBAL_PATHS.actionsFile)) {
        const actions = JSON.parse(fs.readFileSync(GLOBAL_PATHS.actionsFile, "utf8"));
        editor._internals.validateActions(actions);
        for (const action of Object.values(actions)) {
            for (const media of action.media) {
                if (media.base64 || media.data || media.url || !media.file) continue;
                const fileName = path.basename(media.file);
                const filePath = path.join(GLOBAL_PATHS.mediaDir, fileName);
                if (fs.existsSync(filePath)) {
                    const fileSize = fs.statSync(filePath).size;
                    if (fileSize === 0 || fileSize > MAX_MEDIA_SIZE) {
                        throw new Error(`A mídia "${fileName}" está vazia ou excede 50 MB.`);
                    }
                    media.base64 = fs.readFileSync(filePath).toString("base64");
                } else {
                    media.missing = true;
                }
            }
        }
        return actions;
    }

    if (fs.existsSync(MOD_ZIP_PATH)) {
        if (fs.statSync(MOD_ZIP_PATH).size > MAX_PACKAGE_SIZE) {
            throw new Error("MOD_ADULTO.zip excede o limite de 300 MB.");
        }
        const packaged = act18Loader.readArchive(fs.readFileSync(MOD_ZIP_PATH));
        for (const action of Object.values(packaged.importedActions)) {
            for (const media of action.media) {
                if (!media.base64 && media.file) {
                    media.base64 = packaged.archiveMedia.get(media.file).toString("base64");
                }
            }
        }
        return packaged.importedActions;
    }

    return {};
}

function createPackage(actions) {
    if (!actions || typeof actions !== "object" || Array.isArray(actions)) {
        throw new Error("O catálogo precisa ser um objeto de ações.");
    }
    const packagedActions = JSON.parse(JSON.stringify(actions));
    editor._internals.validateActions(packagedActions);

    const entries = {};
    let mediaCount = 0;
    let packageSize = 0;
    for (const [actionName, action] of Object.entries(packagedActions)) {
        action.media = action.media.map((media, index) => {
            let mediaBuffer;
            if (media.base64) {
                mediaBuffer = decodeBase64(media.base64);
            } else if (media.data) {
                mediaBuffer = decodeBase64(media.data);
            } else if (media.file && !media.missing) {
                const fileName = path.basename(media.file);
                if (fileName !== media.file || media.file.includes("\\")) {
                    throw new Error(`Nome de mídia inválido na ação ${actionName}.`);
                }
                const filePath = path.join(GLOBAL_PATHS.mediaDir, fileName);
                if (!fs.existsSync(filePath)) {
                    throw new Error(`Não foi encontrado o arquivo de mídia "${fileName}".`);
                }
                if (fs.statSync(filePath).size > MAX_MEDIA_SIZE) {
                    throw new Error(`A mídia "${fileName}" excede 50 MB.`);
                }
                mediaBuffer = fs.readFileSync(filePath);
                if (!mediaBuffer.length || mediaBuffer.length > MAX_MEDIA_SIZE) {
                    throw new Error(`A mídia "${fileName}" está vazia ou excede 50 MB.`);
                }
            } else {
                throw new Error(`A mídia "${media.fileName || media.url || actionName}" precisa estar anexada como arquivo.`);
            }

            packageSize += mediaBuffer.length;
            if (packageSize > MAX_PACKAGE_SIZE) {
                throw new Error("O tamanho total das mídias excede 300 MB.");
            }
            const digest = crypto.createHash("sha256").update(mediaBuffer).digest("hex").slice(0, 12);
            const fileName = `${sanitizeName(actionName)}_${index + 1}_${digest}${getExtension(media)}`;
            entries[`act18_media/${fileName}`] = new Uint8Array(mediaBuffer);
            mediaCount++;

            const packagedMedia = { ...media, file: fileName };
            delete packagedMedia.base64;
            delete packagedMedia.data;
            delete packagedMedia.url;
            delete packagedMedia.missing;
            return packagedMedia;
        });
    }

    const jsonBuffer = strToU8(`${JSON.stringify(packagedActions, null, 2)}\n`);
    if (jsonBuffer.length > 50 * 1024 * 1024) throw new Error("act18.json excede o limite de 50 MB.");
    entries["act18.json"] = jsonBuffer;
    const zip = zipSync(entries, { level: 1 });
    if (zip.length > MAX_PACKAGE_SIZE) throw new Error("O ZIP gerado excede 300 MB.");
    return { zip: Buffer.from(zip), actionCount: Object.keys(packagedActions).length, mediaCount };
}

function sendJson(response, statusCode, value) {
    const body = Buffer.from(JSON.stringify(value));
    response.writeHead(statusCode, {
        "content-type": "application/json; charset=utf-8",
        "content-length": body.length,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff"
    });
    response.end(body);
}

function readRequestBody(request) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let length = 0;
        let exceeded = false;
        request.on("data", chunk => {
            if (exceeded) return;
            length += chunk.length;
            if (length > MAX_UPLOAD_SIZE) {
                exceeded = true;
                chunks.length = 0;
                reject(new Error("O envio excede o limite de 200 MB."));
                request.resume();
                return;
            }
            chunks.push(chunk);
        });
        request.on("end", () => {
            if (!exceeded) resolve(Buffer.concat(chunks));
        });
        request.on("error", error => {
            if (!exceeded) reject(error);
        });
    });
}

function createServer(port) {
    const expectedHost = `${HOST}:${port}`;
    const expectedOrigin = `http://${expectedHost}`;
    return http.createServer(async (request, response) => {
        if (request.headers.host !== expectedHost) {
            return sendJson(response, 403, { error: "Host não permitido." });
        }
        if (request.headers.origin && request.headers.origin !== expectedOrigin) {
            return sendJson(response, 403, { error: "Origem não permitida." });
        }

        let requestUrl;
        try {
            requestUrl = new URL(request.url, expectedOrigin);
        } catch {
            return sendJson(response, 400, { error: "URL de requisição inválida." });
        }
        if (request.method === "GET" && requestUrl.pathname === "/") {
            response.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "content-length": Buffer.byteLength(PAGE),
                "cache-control": "no-store",
                "x-content-type-options": "nosniff"
            });
            response.end(PAGE);
            return;
        }
        if (request.method === "GET" && requestUrl.pathname === "/api/catalog") {
            try {
                return sendJson(response, 200, { actions: loadCatalog() });
            } catch (error) {
                console.error("[CRIARMODADULTO] Falha ao carregar catálogo:", error);
                return sendJson(response, 500, { error: `Não foi possível carregar o catálogo: ${error.message}` });
            }
        }
        if (request.method === "POST" && requestUrl.pathname === "/api/export") {
            try {
                const body = await readRequestBody(request);
                const payload = JSON.parse(body.toString("utf8"));
                const result = createPackage(payload.actions);
                response.writeHead(200, {
                    "content-type": "application/zip",
                    "content-length": result.zip.length,
                    "content-disposition": 'attachment; filename="MOD_ADULTO.zip"',
                    "cache-control": "no-store",
                    "x-content-type-options": "nosniff"
                });
                response.end(result.zip);
                console.log(`[CRIARMODADULTO] ZIP exportado: ${result.actionCount} ações, ${result.mediaCount} mídias.`);
                return;
            } catch (error) {
                console.error("[CRIARMODADULTO] Falha ao exportar ZIP:", error);
                const status = error.message && error.message.includes("limite de 200 MB") ? 413 : 400;
                return sendJson(response, status, { error: error.message || "Não foi possível gerar o ZIP." });
            }
        }
        return sendJson(response, 404, { error: "Rota não encontrada." });
    });
}

function startServer(port = DEFAULT_PORT) {
    const server = createServer(port);
    server.on("error", error => {
        console.error("[CRIARMODADULTO] Não foi possível iniciar o editor:", error.message);
        process.exitCode = 1;
    });
    server.listen(port, HOST, () => {
        console.log(`[CRIARMODADULTO] Editor local: http://${HOST}:${port}`);
        console.log("[CRIARMODADULTO] Pressione Ctrl+C para encerrar; o bot não será iniciado.");
    });
    return server;
}

if (require.main === module) {
    const portValue = Number(process.env.CRIARMODADULTO_PORT || DEFAULT_PORT);
    if (!Number.isInteger(portValue) || portValue < 1 || portValue > 65535) {
        console.error("[CRIARMODADULTO] Porta inválida.");
        process.exitCode = 1;
    } else {
        startServer(portValue);
    }
}

module.exports = { createPackage, loadCatalog, startServer };
