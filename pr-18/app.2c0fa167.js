var e=globalThis,t={},a={},o=e.parcelRequire4cf7;null==o&&((o=function(e){if(e in t)return t[e].exports;if(e in a){var o=a[e];delete a[e];var n={id:e,exports:{}};return t[e]=n,o.call(n.exports,n,n.exports),n.exports}var r=Error("Cannot find module '"+e+"'");throw r.code="MODULE_NOT_FOUND",r}).register=function(e,t){a[e]=t},e.parcelRequire4cf7=o),(0,o.register)("jXlrK",function(e,t){e.exports=import("0E2O5").then(()=>o("cCo8R"))});var n=o("5qD1E"),r=o("2UrZ2"),l=o("e8aKe"),i=o("ftuQo"),s=o("2pLFv");let d=null;async function c(){return d||(d=await o("jXlrK")),d}async function p(){try{let e=await c();e.invalidateGlobalAnalysisCache?.(),e.resetGeneAnalysis?.();let t=document.getElementById("globalAnalysisPane");t&&t.classList.contains("active")&&await e.renderGlobalAnalysis()}catch(e){console.error("Failed to refresh global analysis after upload:",e)}}const g=document.getElementById("cy"),m=document.getElementById("info"),u=document.getElementById("walks"),h=document.getElementById("toggleMaximize");let f=!1;h?h.addEventListener("click",()=>{f?(g.style.width="",g.style.height="",m.style.display="",u.style.display="",f=!1):(g.style.width="100%",g.style.height="100vh",m.style.display="none",u.style.display="none",f=!0)}):console.warn("Element with ID 'toggleMaximize' not found in the DOM");const w=document.getElementById("hiddenLabel");w?w.addEventListener("click",function(){let e=(0,l.getLabelsVisible)()?"":function(e){return e.data("gene_name")?e.data("gene_name"):""},t=(0,l.getLabelsVisible)()?"":function(e){return e.data("weight")?e.data("weight"):""};n.STATE.cy.style().selector("node").style({label:e}).selector("edge").style({label:t}).update(),(0,l.setLabelsVisible)(!(0,l.getLabelsVisible)())}):console.warn("Element with ID 'hiddenLabel' not found in the DOM");const b=document.getElementById("captureGraph");async function y(e,t={}){let a,o;if(!n.STATE.cy)throw Error("No graph loaded");let{scale:r=2,fullGraph:l=!0,transparentBg:i=!1}=t,s=new Date().toISOString().slice(0,19).replace(/:/g,"-");switch(e){case"png":a=n.STATE.cy.png({full:l,scale:r,bg:i?"transparent":"#ffffff"}),o=`graph_${s}.png`;break;case"jpg":a=n.STATE.cy.jpg({full:l,scale:r,bg:"#ffffff",quality:.9}),o=`graph_${s}.jpg`;break;case"svg":let d=new Blob([n.STATE.cy.svg({full:l,bg:i?"transparent":"#ffffff"})],{type:"image/svg+xml"});a=URL.createObjectURL(d),o=`graph_${s}.svg`;break;case"json":let c=new Blob([JSON.stringify(n.STATE.cy.json(),null,2)],{type:"application/json"});a=URL.createObjectURL(c),o=`graph_${s}.json`;break;default:throw Error(`Unsupported format: ${e}`)}let p=document.createElement("a");p.href=a,p.download=o,p.click(),("svg"===e||"json"===e)&&setTimeout(()=>URL.revokeObjectURL(a),100)}b?b.addEventListener("click",()=>{!function(){if(!n.STATE.cy)return window.showAlert?.("No graph loaded to export","error");let e=document.getElementById("exportModal");e||(e=function(){let e=document.createElement("div");if(e.id="exportModal",e.className="modal fade",e.setAttribute("tabindex","-1"),e.innerHTML=`
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
    `,document.head.appendChild(e)}return e}(),document.body.appendChild(e));let t=new bootstrap.Modal(e);t.show(),function(e,t){let a=e.querySelectorAll(".export-format-option");a.forEach(t=>{t.addEventListener("click",()=>{a.forEach(e=>e.classList.remove("active")),t.classList.add("active"),function(e,t){let a=t.querySelector("#scaleOptions"),o=t.querySelector("#exportOptions");"json"===e?(a.style.display="none",o.style.display="none"):(a.style.display="svg"===e?"none":"block",o.style.display="block")}(t.dataset.format,e)})});let o=e.querySelector("#exportScale"),n=e.querySelector("#scaleValue");o&&n&&o.addEventListener("input",e=>{n.textContent=`${e.target.value}x`});let r=e.querySelector("#confirmExport");r&&(r.replaceWith(r.cloneNode(!0)),e.querySelector("#confirmExport").addEventListener("click",async()=>{let a=e.querySelector(".export-format-option.active"),n=a?.dataset.format||"svg",r=parseFloat(o?.value||2),l=e.querySelector("#exportFullGraph")?.checked??!0,i=e.querySelector("#exportTransparentBg")?.checked??!1;try{await y(n,{scale:r,fullGraph:l,transparentBg:i}),t.hide(),window.showAlert?.(`Graph exported as ${n.toUpperCase()}!`,"success",2e3)}catch(e){console.error("Export failed:",e),window.showAlert?.(`Export failed: ${e.message}`,"error")}}))}(e,t)}()}):console.warn("Element with ID 'captureGraph' not found in the DOM"),document.addEventListener("DOMContentLoaded",()=>{(0,r.resizePanels)()});const v=document.getElementById("uploadInput"),E=document.getElementById("uploadBtn");function x(e){return n.STATE.graph_ids&&n.STATE.graph_ids[e]||`Graph ${e+1}`}function T(e,t=!0){if(!n.STATE.graph_jsons||e<0||e>=n.STATE.graph_jsons.length)return console.warn(`loadGraphByIndex: invalid index ${e}`),!1;if(e===n.STATE.currentGraphIndex&&n.STATE.cy)return!0;try{let a=JSON.parse(n.STATE.graph_jsons[e]);(0,n.loadGraphDataFromServer)(a),n.STATE.currentGraphIndex=e;let o=document.getElementById("graphSelect");return o&&String(o.value)!==String(e)&&(o.value=String(e)),t&&window.showAlert?.(`Loaded ${x(e)}`,"success",2e3),!0}catch(t){return console.error("Error loading selected graph:",t),window.showAlert?.(`Error loading ${x(e)}: ${t.message}`,"error"),!1}}v?v.addEventListener("change",function(e){let t=e.target.files[0];if(!t)return;let a=`upload-${Date.now()}`;window.loadingIndicator?.show(a,{message:`Loading ${t.name}...`,type:"spinner",overlay:!0});let o=new FileReader;o.onload=async e=>{let o=e.target.result,r=t.name.split(".").pop().toLowerCase();try{if("json"===r){window.loadingIndicator?.updateMessage(a,"Parsing JSON data...");let e=JSON.parse(o);window.loadingIndicator?.updateMessage(a,"Rendering graph..."),(0,n.loadGraphDataFromServer)(e),n.STATE.graph_jsons=[o],n.STATE.graph_ids=[],n.STATE.currentGraphIndex=0,document.getElementById("graphSelectorContainer").classList.add("d-none"),window.loadingIndicator?.hide(a),window.showAlert?.("Graph loaded successfully!","success",2e3)}else if("tsg"===r){window.loadingIndicator?.updateMessage(a,"Parsing TSG file..."),n.STATE.graph_jsons=await window.parse_tsgFile(o);let e=function(e){let t=[];if("string"!=typeof e)return t;for(let a of e.split(/\r?\n/))if(/^G\s/.test(a)){let e=a.split(/\s+/);e.length>=2&&e[1]&&t.push(e[1].trim())}return t}(o);n.STATE.graph_ids=e.length===n.STATE.graph_jsons.length?e:[];let t=n.STATE.graph_jsons.length;window.loadingIndicator?.updateMessage(a,`Found ${t} graph${t>1?"s":""}...`),t>1?function(e){let t=document.getElementById("graphSelect"),a=document.getElementById("graphSelectorContainer");t.innerHTML="";for(let a=0;a<e;a++){let e=document.createElement("option");e.value=a,e.textContent=x(a),e.title=`Graph ${a+1}${n.STATE.graph_ids[a]?` (${n.STATE.graph_ids[a]})`:""}`,t.appendChild(e)}a.classList.remove("d-none");let o=t.cloneNode(!0);t.parentNode.replaceChild(o,t),o.addEventListener("change",function(){T(parseInt(this.value))})}(t):document.getElementById("graphSelectorContainer").classList.add("d-none"),window.loadingIndicator?.updateMessage(a,"Rendering graph...");let r=JSON.parse(n.STATE.graph_jsons[0]);(0,n.loadGraphDataFromServer)(r),n.STATE.currentGraphIndex=0,window.loadingIndicator?.hide(a),window.showAlert?.(`Loaded ${t} graph${t>1?"s":""} successfully!`,"success",2e3)}p()}catch(e){console.error("Error processing file:",e),window.loadingIndicator?.hide(a),window.showAlert?.("Error processing file: "+e.message,"error")}},o.onerror=()=>{window.loadingIndicator?.hide(a),window.showAlert?.("Failed to read file","error")},o.readAsText(t),e.target.value=""}):console.warn("Element with ID 'uploadInput' not found in the DOM"),E&&v?E.addEventListener("click",()=>v.click()):console.warn("Upload button or input not found in the DOM"),window.loadGraphByIndex=T;const S=document.getElementById("circlePlotBtn");S?S.addEventListener("click",()=>{try{(0,s.showBreakpointCirclePlotModal)()}catch(e){console.error("Failed to open circle plot:",e),window.showAlert?.("Failed to open circle plot: "+(e?.message||e),"error")}}):console.warn("Element with ID 'circlePlotBtn' not found in the DOM");const A=document.getElementById("globalAnalysisTab");A&&(A.addEventListener("show.bs.tab",function(){let e=document.getElementById("tooltip");e&&(e.classList.remove("tooltip-visible"),e.style.display="none")}),A.addEventListener("shown.bs.tab",async()=>{try{let e=await c();await e.renderGlobalAnalysis()}catch(e){console.error("Failed to render global analysis:",e),window.showAlert?.("Failed to render global analysis: "+(e?.message||e),"error")}}));const I=document.getElementById("ga-refresh-btn");I&&I.addEventListener("click",async()=>{try{let e=await c();e.invalidateGlobalAnalysisCache?.(),await e.renderGlobalAnalysis()}catch(e){console.error("Failed to refresh global analysis:",e),window.showAlert?.("Failed to refresh global analysis: "+(e?.message||e),"error")}});const L=document.getElementById("ga-annotate-genes-btn");L&&L.addEventListener("click",async()=>{try{let e=await c();await e.renderGeneAnalysis()}catch(e){console.error("Failed to annotate genes:",e),window.showAlert?.("Failed to annotate genes: "+(e?.message||e),"error")}});const k=document.getElementById("clearHighlights");k?k.addEventListener("click",()=>{(0,n.clearNodeHighlights)(n.STATE.cy)}):console.warn("Element with ID 'clearHighlights' not found in the DOM");const B=document.getElementById("geneAnnotationBtn");async function G(){let e=`gene-annotation-${Date.now()}`;try{if(window.loadingIndicator?.show(e,{message:"Loading gene database...",type:"bar",overlay:!0}),await (0,i.loadGeneData)()&&n.STATE.cy){window.loadingIndicator?.updateMessage(e,"Annotating nodes...");let t=n.STATE.cy.nodes().length,a=await (0,i.annotateAllNodes)(n.STATE.cy);window.loadingIndicator?.updateProgress(e,100),setTimeout(()=>{window.loadingIndicator?.hide(e),window.showAlert?.(`Annotated ${a} of ${t} nodes with gene information!`,"success",3e3)},500)}else console.error("Could not load gene data or graph not initialized"),window.loadingIndicator?.hide(e),window.showAlert?.("Failed to load gene annotations.","error")}catch(t){console.error("Error in gene annotation:",t),window.loadingIndicator?.hide(e),window.showAlert?.("Error in gene annotation process: "+t.message,"error")}}B?B.addEventListener("click",async e=>{if(e.ctrlKey||!window.bootstrap)e.preventDefault(),await G();else try{new bootstrap.Modal(document.getElementById("geneAnnotationModal")).show()}catch(e){console.error("Error showing modal, falling back to direct annotation:",e),await G()}}):console.warn("Element with ID 'geneAnnotationBtn' not found in the DOM"),document.addEventListener("click",e=>{("uploadAuroraIds"===e.target.id||e.target.parentElement&&"uploadAuroraIds"===e.target.parentElement.id)&&document.getElementById("auroraIdsFile")&&window.handleAuroraIdsFileUpload&&window.handleAuroraIdsFileUpload()}),document.addEventListener("DOMContentLoaded",function(){let e=document.getElementById("collapseToolbarBtn"),t=document.querySelector(".toolbar-responsive");e&&t&&(window.innerWidth<768&&(t.classList.add("toolbar-collapsed"),e.innerHTML='<i class="bi bi-chevron-down"></i>'),e.addEventListener("click",function(){t.classList.toggle("toolbar-collapsed"),t.classList.contains("toolbar-collapsed")?e.innerHTML='<i class="bi bi-chevron-down"></i>':e.innerHTML='<i class="bi bi-chevron-up"></i>'}))}),window.addEventListener("resize",function(){let e=document.querySelector(".toolbar-responsive"),t=document.getElementById("collapseToolbarBtn");e&&t&&(window.innerWidth>=768?e.classList.remove("toolbar-collapsed"):e.classList.contains("toolbar-collapsed")||(e.classList.add("toolbar-collapsed"),t.innerHTML='<i class="bi bi-chevron-down"></i>'))});
//# sourceMappingURL=app.2c0fa167.js.map
