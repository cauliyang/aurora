var e=globalThis,t={},a={},r=e.parcelRequire4cf7;null==r&&((r=function(e){if(e in t)return t[e].exports;if(e in a){var r=a[e];delete a[e];var n={id:e,exports:{}};return t[e]=n,r.call(n.exports,n,n.exports),n.exports}var o=Error("Cannot find module '"+e+"'");throw o.code="MODULE_NOT_FOUND",o}).register=function(e,t){a[e]=t},e.parcelRequire4cf7=r),(0,r.register)("jXlrK",function(e,t){e.exports=import("0E2O5").then(()=>r("cCo8R"))});var n=r("5qD1E"),o=r("2UrZ2"),l=r("e8aKe"),i=r("ftuQo"),s=r("2pLFv");let d=null;async function c(){return d||(d=await r("jXlrK")),d}async function p(){try{let e=await c();e.invalidateGlobalAnalysisCache?.(),e.resetGeneAnalysis?.();let t=document.getElementById("globalAnalysisPane");t&&t.classList.contains("active")&&await e.renderGlobalAnalysis()}catch(e){console.error("Failed to refresh global analysis after upload:",e)}}let g=document.getElementById("cy"),m=document.getElementById("info"),u=document.getElementById("walks"),h=document.getElementById("toggleMaximize"),f=!1;h?h.addEventListener("click",()=>{f?(g.style.width="",g.style.height="",m.style.display="",u.style.display="",f=!1):(g.style.width="100%",g.style.height="100vh",m.style.display="none",u.style.display="none",f=!0)}):console.warn("Element with ID 'toggleMaximize' not found in the DOM");let y=document.getElementById("hiddenLabel");y?y.addEventListener("click",function(){let e=(0,l.getLabelsVisible)()?"":function(e){return e.data("gene_name")?e.data("gene_name"):""},t=(0,l.getLabelsVisible)()?"":function(e){return e.data("weight")?e.data("weight"):""};n.STATE.cy.style().selector("node").style({label:e}).selector("edge").style({label:t}).update(),(0,l.setLabelsVisible)(!(0,l.getLabelsVisible)())}):console.warn("Element with ID 'hiddenLabel' not found in the DOM");let w=document.getElementById("captureGraph");async function b(e,t={}){let a,r;if(!n.STATE.cy)throw Error("No graph loaded");let{scale:o=2,fullGraph:l=!0,transparentBg:i=!1}=t,s=new Date().toISOString().slice(0,19).replace(/:/g,"-");switch(e){case"png":a=n.STATE.cy.png({full:l,scale:o,bg:i?"transparent":"#ffffff"}),r=`graph_${s}.png`;break;case"jpg":a=n.STATE.cy.jpg({full:l,scale:o,bg:"#ffffff",quality:.9}),r=`graph_${s}.jpg`;break;case"svg":let d=new Blob([n.STATE.cy.svg({full:l,bg:i?"transparent":"#ffffff"})],{type:"image/svg+xml"});a=URL.createObjectURL(d),r=`graph_${s}.svg`;break;case"json":let c=new Blob([JSON.stringify(n.STATE.cy.json(),null,2)],{type:"application/json"});a=URL.createObjectURL(c),r=`graph_${s}.json`;break;default:throw Error(`Unsupported format: ${e}`)}let p=document.createElement("a");p.href=a,p.download=r,p.click(),("svg"===e||"json"===e)&&setTimeout(()=>URL.revokeObjectURL(a),100)}w?w.addEventListener("click",()=>{!function(){var e,t;let a,r,o,l;if(!n.STATE.cy)return window.showAlert?.("No graph loaded to export","error");let i=document.getElementById("exportModal");i||(i=function(){let e=document.createElement("div");if(e.id="exportModal",e.className="modal fade",e.setAttribute("tabindex","-1"),e.innerHTML=`
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-download me-2"></i>Export Graph
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label fw-bold">Select Export Format:</label>
            <div class="export-format-grid">
              <div class="export-format-option" data-format="png">
                <i class="bi bi-file-earmark-image"></i>
                <div class="format-name">PNG</div>
                <div class="format-desc">Raster image, best for presentations</div>
              </div>
              <div class="export-format-option" data-format="jpg">
                <i class="bi bi-file-earmark-image-fill"></i>
                <div class="format-name">JPG</div>
                <div class="format-desc">Compressed image, smaller file size</div>
              </div>
              <div class="export-format-option active" data-format="svg">
                <i class="bi bi-file-earmark-code"></i>
                <div class="format-name">SVG</div>
                <div class="format-desc">Vector image, scalable and editable</div>
              </div>
              <div class="export-format-option" data-format="json">
                <i class="bi bi-filetype-json"></i>
                <div class="format-name">JSON</div>
                <div class="format-desc">Graph data for reloading</div>
              </div>
            </div>
          </div>

          <div class="mb-3" id="exportOptions">
            <label class="form-label fw-bold">Options:</label>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="exportFullGraph" checked>
              <label class="form-check-label" for="exportFullGraph">
                Export full graph (include all elements)
              </label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="exportTransparentBg">
              <label class="form-check-label" for="exportTransparentBg">
                Transparent background
              </label>
            </div>
          </div>

          <div class="mb-3" id="scaleOptions">
            <label for="exportScale" class="form-label fw-bold">Scale:</label>
            <input type="range" class="form-range" id="exportScale" min="1" max="4" step="0.5" value="2">
            <div class="d-flex justify-content-between">
              <small>1x</small>
              <small id="scaleValue">2x</small>
              <small>4x</small>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="confirmExport">
            <i class="bi bi-download me-2"></i>Export
          </button>
        </div>
      </div>
    </div>
  `,!document.getElementById("exportModalStyles")){let e=document.createElement("style");e.id="exportModalStyles",e.textContent=`
      .export-format-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-top: 12px;
      }

      .export-format-option {
        border: 2px solid #dee2e6;
        border-radius: 8px;
        padding: 16px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        background: var(--bg-primary, #fff);
      }

      .export-format-option:hover {
        border-color: var(--aurora-primary, #6366f1);
        background: var(--bg-secondary, #f8f9fa);
      }

      .export-format-option.active {
        border-color: var(--aurora-primary, #6366f1);
        background: rgba(0, 123, 255, 0.1);
      }

      .export-format-option i {
        font-size: 2rem;
        color: var(--aurora-primary, #6366f1);
        margin-bottom: 8px;
      }

      .format-name {
        font-weight: bold;
        margin-bottom: 4px;
        color: var(--text-primary, #212529);
      }

      .format-desc {
        font-size: 0.75rem;
        color: var(--text-secondary, #475569);
      }

      [data-theme="dark"] .export-format-option {
        background: var(--bg-primary, #1a1a1a);
        border-color: #495057;
      }

      [data-theme="dark"] .export-format-option:hover {
        background: var(--bg-secondary, #2d2d2d);
      }
    `,document.head.appendChild(e)}return e}(),document.body.appendChild(i));let s=new bootstrap.Modal(i);s.show(),e=i,t=s,(a=e.querySelectorAll(".export-format-option")).forEach(t=>{t.addEventListener("click",()=>{var r,n;let o,l;a.forEach(e=>e.classList.remove("active")),t.classList.add("active"),r=t.dataset.format,o=(n=e).querySelector("#scaleOptions"),l=n.querySelector("#exportOptions"),"json"===r?(o.style.display="none",l.style.display="none"):(o.style.display="svg"===r?"none":"block",l.style.display="block")})}),r=e.querySelector("#exportScale"),o=e.querySelector("#scaleValue"),r&&o&&r.addEventListener("input",e=>{o.textContent=`${e.target.value}x`}),(l=e.querySelector("#confirmExport"))&&(l.replaceWith(l.cloneNode(!0)),e.querySelector("#confirmExport").addEventListener("click",async()=>{let a=e.querySelector(".export-format-option.active"),n=a?.dataset.format||"svg",o=parseFloat(r?.value||2),l=e.querySelector("#exportFullGraph")?.checked??!0,i=e.querySelector("#exportTransparentBg")?.checked??!1;try{await b(n,{scale:o,fullGraph:l,transparentBg:i}),t.hide(),window.showAlert?.(`Graph exported as ${n.toUpperCase()}!`,"success",2e3)}catch(e){console.error("Export failed:",e),window.showAlert?.(`Export failed: ${e.message}`,"error")}}))}()}):console.warn("Element with ID 'captureGraph' not found in the DOM"),document.addEventListener("DOMContentLoaded",()=>{(0,o.resizePanels)()});let v=document.getElementById("uploadInput"),E=document.getElementById("uploadBtn");function x(e){return n.STATE.graph_ids&&n.STATE.graph_ids[e]||`Graph ${e+1}`}function T(e,t=!0){if(!n.STATE.graph_jsons||e<0||e>=n.STATE.graph_jsons.length)return console.warn(`loadGraphByIndex: invalid index ${e}`),!1;if(e===n.STATE.currentGraphIndex&&n.STATE.cy)return!0;try{let a=JSON.parse(n.STATE.graph_jsons[e]);(0,n.loadGraphDataFromServer)(a),n.STATE.currentGraphIndex=e;let r=document.getElementById("graphSelect");return r&&String(r.value)!==String(e)&&(r.value=String(e)),t&&window.showAlert?.(`Loaded ${x(e)}`,"success",2e3),!0}catch(t){return console.error("Error loading selected graph:",t),window.showAlert?.(`Error loading ${x(e)}: ${t.message}`,"error"),!1}}function S(e,t){let a=e.toLowerCase(),r=t.toLowerCase();if(!a)return 0;let n=r.indexOf(a);if(-1!==n)return 1e3-2*n-(r.length-a.length);let o=0,l=0,i=0,s=-2;for(let e=0;e<a.length;e++){let t=a[e],n=-1;for(let e=o;e<r.length;e++)if(r[e]===t){n=e;break}if(-1===n)return -1;n===s+1?(i+=1,l+=5+2*i):(i=0,l+=1),0===n&&(l+=4),s=n,o=n+1}return l-.2*Math.max(0,r.length-a.length)}v?v.addEventListener("change",function(e){let t=e.target.files[0];if(!t)return;let a=`upload-${Date.now()}`;window.loadingIndicator?.show(a,{message:`Loading ${t.name}...`,type:"spinner",overlay:!0});let r=new FileReader;r.onload=async e=>{let r=e.target.result,o=t.name.split(".").pop().toLowerCase();try{if("json"===o){window.loadingIndicator?.updateMessage(a,"Parsing JSON data...");let e=JSON.parse(r);window.loadingIndicator?.updateMessage(a,"Rendering graph..."),(0,n.loadGraphDataFromServer)(e),n.STATE.graph_jsons=[r],n.STATE.graph_ids=[],n.STATE.graph_max_path_len=[],n.STATE.graph_path_lengths=[],n.STATE.graph_path_count=[],n.STATE.currentGraphIndex=0,document.getElementById("graphSelectorContainer").classList.add("d-none"),window.showAlert?.("Graph loaded successfully!","success",2e3)}else if("tsg"===o||"gta"===o){let e=o.toUpperCase();window.loadingIndicator?.updateMessage(a,`Parsing ${e} file...`),n.STATE.graph_jsons=await window.parse_tsgFile(r);let t=function(e){let t=[];if("string"!=typeof e)return t;for(let a of e.split(/\r?\n/))if(/^G\s/.test(a)){let e=a.split(/\s+/);e.length>=2&&e[1]&&t.push(e[1].trim())}return t}(r);n.STATE.graph_ids=t.length===n.STATE.graph_jsons.length?t:[];let l=function(e){let t=[],a=[],r=[];if("string"!=typeof e)return{maxPathLen:t,pathLengths:a,pathCount:r};let n=e.split(/\r?\n/),o=-1;for(let e of n){if(/^G\s/.test(e)){t[o+=1]=null,a[o]=[],r[o]=0;continue}if(o>=0&&/^P\s/.test(e)){let n=e.split(/\s+/),l=0;for(let e=2;e<n.length;e++)n[e]&&n[e].startsWith("TSN")&&(l+=1);a[o].push(l),r[o]+=1,l>(t[o]||0)&&(t[o]=l)}}return{maxPathLen:t,pathLengths:a,pathCount:r}}(r),i=l.maxPathLen.length===n.STATE.graph_jsons.length;n.STATE.graph_max_path_len=i?l.maxPathLen:[],n.STATE.graph_path_lengths=i?l.pathLengths:[],n.STATE.graph_path_count=i?l.pathCount:[];let s=n.STATE.graph_jsons.length;window.loadingIndicator?.updateMessage(a,`Found ${s} graph${s>1?"s":""}...`),s>1?function(e){let t=document.getElementById("graphSelect"),a=document.getElementById("graphSelectorContainer");t.innerHTML="";for(let a=0;a<e;a++){let e=document.createElement("option");e.value=a,e.textContent=x(a),e.title=`Graph ${a+1}${n.STATE.graph_ids[a]?` (${n.STATE.graph_ids[a]})`:""}`,t.appendChild(e)}a.classList.remove("d-none");let r=t.cloneNode(!0);t.parentNode.replaceChild(r,t),r.addEventListener("change",function(){let e=parseInt(this.value);Number.isNaN(e)||T(e)}),function(e){let t=document.getElementById("graphSearchInput"),a=document.getElementById("graphSearchResults");if(!t||!a)return;let r=t.cloneNode(!0);t.parentNode.replaceChild(r,t),r.value="",a.innerHTML="",a.classList.add("d-none");let o=[];for(let t=0;t<e;t++)o.push({index:t,label:x(t)});let l=[];function i(e){let t,a=document.getElementById("graphSelect");if(!a)return;let r=(e||"").trim();t=r?o.map(e=>({index:e.index,score:S(r,e.label)})).filter(e=>e.score>=0).sort((e,t)=>t.score-e.score).map(e=>e.index):o.map(e=>e.index);let l=a.value;if(a.innerHTML="",!t.length){let e=document.createElement("option");e.value="",e.textContent="No matching graph",e.disabled=!0,e.selected=!0,a.appendChild(e);return}for(let e of t){let t=document.createElement("option");t.value=e,t.textContent=x(e),t.title=`Graph ${e+1}${n.STATE.graph_ids[e]?` (${n.STATE.graph_ids[e]})`:""}`,a.appendChild(t)}t.includes(Number(l))?a.value=l:t.includes(n.STATE.currentGraphIndex)?a.value=String(n.STATE.currentGraphIndex):a.value=String(t[0])}function s(e){return e.trim()?o.map(t=>({...t,score:S(e,t.label)})).filter(e=>e.score>=0).sort((e,t)=>t.score-e.score).slice(0,12):o.slice(0,20).map(e=>({...e,score:0}))}function d(e){let t;if(l=e,t=r.getBoundingClientRect(),a.style.top=`${t.bottom+2}px`,a.style.left=`${t.left}px`,a.style.minWidth=`${Math.max(t.width,240)}px`,!e.length){a.innerHTML='<div class="graph-search-empty">No matching graph</div>',a.classList.remove("d-none");return}a.innerHTML=e.map((e,t)=>{var a;return`<button type="button" class="graph-search-item${0===t?" active":""}"
                        data-index="${e.index}">
                        <span class="gs-label">${a=e.label,String(a).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}</span>
                        <span class="gs-idx">#${e.index+1}</span>
                    </button>`}).join(""),a.classList.remove("d-none"),a.querySelectorAll(".graph-search-item").forEach(e=>{e.addEventListener("mousedown",t=>{t.preventDefault(),c(parseInt(e.getAttribute("data-index"),10))})})}function c(e){T(e),r.value="",a.classList.add("d-none"),i("");let t=document.getElementById("graphSelect");t&&(t.value=String(e))}r.addEventListener("input",()=>{d(s(r.value)),i(r.value)}),r.addEventListener("focus",()=>{d(s(r.value))}),r.addEventListener("keydown",e=>{"Enter"===e.key?(e.preventDefault(),l.length&&c(l[0].index)):"Escape"===e.key&&(a.classList.add("d-none"),r.value="",i(""),r.blur())}),r.addEventListener("blur",()=>{setTimeout(()=>a.classList.add("d-none"),120)})}(e)}(s):document.getElementById("graphSelectorContainer").classList.add("d-none"),window.loadingIndicator?.updateMessage(a,"Rendering graph...");let d=JSON.parse(n.STATE.graph_jsons[0]);(0,n.loadGraphDataFromServer)(d),n.STATE.currentGraphIndex=0,window.showAlert?.(`Loaded ${s} graph${s>1?"s":""} successfully!`,"success",2e3)}else throw Error(`Unsupported file type ".${o}". Please upload a .json, .tsg, or .gta file.`);p()}catch(e){console.error("Error processing file:",e),window.showAlert?.("Error processing file: "+e.message,"error")}finally{window.loadingIndicator?.hide(a)}},r.onerror=()=>{window.loadingIndicator?.hide(a),window.showAlert?.("Failed to read file","error")},r.readAsText(t),e.target.value=""}):console.warn("Element with ID 'uploadInput' not found in the DOM"),E&&v?E.addEventListener("click",()=>v.click()):console.warn("Upload button or input not found in the DOM"),window.loadGraphByIndex=T;let A=document.getElementById("circlePlotBtn");A?A.addEventListener("click",()=>{try{(0,s.showBreakpointCirclePlotModal)()}catch(e){console.error("Failed to open circle plot:",e),window.showAlert?.("Failed to open circle plot: "+(e?.message||e),"error")}}):console.warn("Element with ID 'circlePlotBtn' not found in the DOM");let L=document.getElementById("globalAnalysisTab");L&&(L.addEventListener("show.bs.tab",function(){let e=document.getElementById("tooltip");e&&(e.classList.remove("tooltip-visible"),e.style.display="none")}),L.addEventListener("shown.bs.tab",async()=>{try{let e=await c();await e.renderGlobalAnalysis()}catch(e){console.error("Failed to render global analysis:",e),window.showAlert?.("Failed to render global analysis: "+(e?.message||e),"error")}}));let I=document.getElementById("ga-refresh-btn");I&&I.addEventListener("click",async()=>{try{let e=await c();e.invalidateGlobalAnalysisCache?.(),await e.renderGlobalAnalysis({force:!0})}catch(e){console.error("Failed to refresh global analysis:",e),window.showAlert?.("Failed to refresh global analysis: "+(e?.message||e),"error")}});let B=document.getElementById("ga-export-csv-btn");B&&B.addEventListener("click",async()=>{try{let e=await c();e.exportSummaryCsv?.()}catch(e){console.error("Failed to export CSV:",e),window.showAlert?.("Failed to export CSV: "+(e?.message||e),"error")}});let k=document.getElementById("globalAnalysisPane");k&&k.addEventListener("click",async e=>{let t=e.target.closest(".ga-png-btn");if(!t)return;e.preventDefault();let a=t.getAttribute("data-export-chart"),r=t.getAttribute("data-export-name")||"ga_figure";if(a)try{let e=await c();e.exportChartPng?.(a,r)}catch(e){console.error("Failed to export figure PNG:",e),window.showAlert?.("Failed to export figure: "+(e?.message||e),"error")}});let G=document.getElementById("ga-filter-apply-btn"),_=document.getElementById("ga-filter-clear-btn");G&&G.addEventListener("click",async()=>{try{let e,t,a=await c();a.setGlobalFilters?.((e=e=>{let t=document.getElementById(e),a=t?parseFloat(t.value):0;return Number.isFinite(a)&&a>0?a:0},t=e=>{let t=document.getElementById(e);return t?t.value.trim():""},{minNodes:e("ga-filter-min-nodes"),minEdges:e("ga-filter-min-edges"),minTotalWeight:e("ga-filter-min-weight"),minTotalJsr:e("ga-filter-min-jsr"),svType:t("ga-filter-svtype"),chrom:t("ga-filter-chrom")})),await a.renderGlobalAnalysis()}catch(e){console.error("Failed to apply global analysis filters:",e),window.showAlert?.("Failed to apply filters: "+(e?.message||e),"error")}}),_&&_.addEventListener("click",async()=>{["ga-filter-min-nodes","ga-filter-min-edges","ga-filter-min-weight","ga-filter-min-jsr"].forEach(e=>{let t=document.getElementById(e);t&&(t.value="0")}),["ga-filter-svtype","ga-filter-chrom"].forEach(e=>{let t=document.getElementById(e);t&&(t.value="")});try{let e=await c();e.setGlobalFilters?.({minNodes:0,minEdges:0,minTotalWeight:0,minTotalJsr:0,svType:"",chrom:""}),await e.renderGlobalAnalysis()}catch(e){console.error("Failed to clear global analysis filters:",e)}});let M=document.getElementById("ga-annotate-genes-btn");M&&M.addEventListener("click",async()=>{try{let e=await c();await e.renderGeneAnalysis()}catch(e){console.error("Failed to annotate genes:",e),window.showAlert?.("Failed to annotate genes: "+(e?.message||e),"error")}});let C=document.getElementById("clearHighlights");C?C.addEventListener("click",()=>{(0,n.clearNodeHighlights)(n.STATE.cy)}):console.warn("Element with ID 'clearHighlights' not found in the DOM");let F=document.getElementById("geneAnnotationBtn");async function $(){let e=`gene-annotation-${Date.now()}`;try{if(window.loadingIndicator?.show(e,{message:"Loading gene database...",type:"bar",overlay:!0}),await (0,i.loadGeneData)()&&n.STATE.cy){window.loadingIndicator?.updateMessage(e,"Annotating nodes...");let t=n.STATE.cy.nodes().length,a=await (0,i.annotateAllNodes)(n.STATE.cy);window.loadingIndicator?.updateProgress(e,100),setTimeout(()=>{window.loadingIndicator?.hide(e),window.showAlert?.(`Annotated ${a} of ${t} nodes with gene information!`,"success",3e3)},500)}else console.error("Could not load gene data or graph not initialized"),window.loadingIndicator?.hide(e),window.showAlert?.("Failed to load gene annotations.","error")}catch(t){console.error("Error in gene annotation:",t),window.loadingIndicator?.hide(e),window.showAlert?.("Error in gene annotation process: "+t.message,"error")}}F?F.addEventListener("click",async e=>{if(e.ctrlKey||!window.bootstrap)e.preventDefault(),await $();else try{new bootstrap.Modal(document.getElementById("geneAnnotationModal")).show()}catch(e){console.error("Error showing modal, falling back to direct annotation:",e),await $()}}):console.warn("Element with ID 'geneAnnotationBtn' not found in the DOM"),document.addEventListener("click",e=>{("uploadAuroraIds"===e.target.id||e.target.parentElement&&"uploadAuroraIds"===e.target.parentElement.id)&&document.getElementById("auroraIdsFile")&&window.handleAuroraIdsFileUpload&&window.handleAuroraIdsFileUpload()}),document.addEventListener("DOMContentLoaded",function(){let e=document.getElementById("collapseToolbarBtn"),t=document.querySelector(".toolbar-responsive");e&&t&&(window.innerWidth<768&&(t.classList.add("toolbar-collapsed"),e.innerHTML='<i class="bi bi-chevron-down"></i>'),e.addEventListener("click",function(){t.classList.toggle("toolbar-collapsed"),t.classList.contains("toolbar-collapsed")?e.innerHTML='<i class="bi bi-chevron-down"></i>':e.innerHTML='<i class="bi bi-chevron-up"></i>'}))}),window.addEventListener("resize",function(){let e=document.querySelector(".toolbar-responsive"),t=document.getElementById("collapseToolbarBtn");e&&t&&(window.innerWidth>=768?e.classList.remove("toolbar-collapsed"):e.classList.contains("toolbar-collapsed")||(e.classList.add("toolbar-collapsed"),t.innerHTML='<i class="bi bi-chevron-down"></i>'))});
//# sourceMappingURL=app.c6eec5a6.js.map
