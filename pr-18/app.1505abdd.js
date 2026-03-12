var e=globalThis,t={},o={},a=e.parcelRequireaed0;null==a&&((a=function(e){if(e in t)return t[e].exports;if(e in o){var a=o[e];delete o[e];var r={id:e,exports:{}};return t[e]=r,a.call(r.exports,r,r.exports),r.exports}var n=Error("Cannot find module '"+e+"'");throw n.code="MODULE_NOT_FOUND",n}).register=function(e,t){o[e]=t},e.parcelRequireaed0=a),a.register;var r=a("5qD1E"),n=a("2UrZ2"),l=a("e8aKe"),i=a("ftuQo");const d=document.getElementById("cy"),s=document.getElementById("info"),c=document.getElementById("walks"),p=document.getElementById("toggleMaximize");let g=!1;p?p.addEventListener("click",()=>{g?(d.style.width="",d.style.height="",s.style.display="",c.style.display="",g=!1):(d.style.width="100%",d.style.height="100vh",s.style.display="none",c.style.display="none",g=!0)}):console.warn("Element with ID 'toggleMaximize' not found in the DOM");const m=document.getElementById("hiddenLabel");m?m.addEventListener("click",function(){let e=(0,l.getLabelsVisible)()?"":function(e){return e.data("gene_name")?e.data("gene_name"):""},t=(0,l.getLabelsVisible)()?"":function(e){return e.data("weight")?e.data("weight"):""};r.STATE.cy.style().selector("node").style({label:e}).selector("edge").style({label:t}).update(),(0,l.setLabelsVisible)(!(0,l.getLabelsVisible)())}):console.warn("Element with ID 'hiddenLabel' not found in the DOM");const u=document.getElementById("captureGraph");async function f(e,t={}){let o,a;if(!r.STATE.cy)throw Error("No graph loaded");let{scale:n=2,fullGraph:l=!0,transparentBg:i=!1}=t,d=new Date().toISOString().slice(0,19).replace(/:/g,"-");switch(e){case"png":o=r.STATE.cy.png({full:l,scale:n,bg:i?"transparent":"#ffffff"}),a=`graph_${d}.png`;break;case"jpg":o=r.STATE.cy.jpg({full:l,scale:n,bg:"#ffffff",quality:.9}),a=`graph_${d}.jpg`;break;case"svg":let s=new Blob([r.STATE.cy.svg({full:l,bg:i?"transparent":"#ffffff"})],{type:"image/svg+xml"});o=URL.createObjectURL(s),a=`graph_${d}.svg`;break;case"json":let c=new Blob([JSON.stringify(r.STATE.cy.json(),null,2)],{type:"application/json"});o=URL.createObjectURL(c),a=`graph_${d}.json`;break;default:throw Error(`Unsupported format: ${e}`)}let p=document.createElement("a");p.href=o,p.download=a,p.click(),("svg"===e||"json"===e)&&setTimeout(()=>URL.revokeObjectURL(o),100)}u?u.addEventListener("click",()=>{!function(){if(!r.STATE.cy)return window.showAlert?.("No graph loaded to export","error");let e=document.getElementById("exportModal");e||(e=function(){let e=document.createElement("div");if(e.id="exportModal",e.className="modal fade",e.setAttribute("tabindex","-1"),e.innerHTML=`
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
    `,document.head.appendChild(e)}return e}(),document.body.appendChild(e));let t=new bootstrap.Modal(e);t.show(),function(e,t){let o=e.querySelectorAll(".export-format-option");o.forEach(t=>{t.addEventListener("click",()=>{o.forEach(e=>e.classList.remove("active")),t.classList.add("active"),function(e,t){let o=t.querySelector("#scaleOptions"),a=t.querySelector("#exportOptions");"json"===e?(o.style.display="none",a.style.display="none"):(o.style.display="svg"===e?"none":"block",a.style.display="block")}(t.dataset.format,e)})});let a=e.querySelector("#exportScale"),r=e.querySelector("#scaleValue");a&&r&&a.addEventListener("input",e=>{r.textContent=`${e.target.value}x`});let n=e.querySelector("#confirmExport");n&&(n.replaceWith(n.cloneNode(!0)),e.querySelector("#confirmExport").addEventListener("click",async()=>{let o=e.querySelector(".export-format-option.active"),r=o?.dataset.format||"svg",n=parseFloat(a?.value||2),l=e.querySelector("#exportFullGraph")?.checked??!0,i=e.querySelector("#exportTransparentBg")?.checked??!1;try{await f(r,{scale:n,fullGraph:l,transparentBg:i}),t.hide(),window.showAlert?.(`Graph exported as ${r.toUpperCase()}!`,"success",2e3)}catch(e){console.error("Export failed:",e),window.showAlert?.(`Export failed: ${e.message}`,"error")}}))}(e,t)}()}):console.warn("Element with ID 'captureGraph' not found in the DOM"),document.addEventListener("DOMContentLoaded",()=>{(0,n.resizePanels)()});const h=document.getElementById("uploadInput"),w=document.getElementById("uploadBtn");h?h.addEventListener("change",function(e){let t=e.target.files[0];if(!t)return;let o=`upload-${Date.now()}`;window.loadingIndicator?.show(o,{message:`Loading ${t.name}...`,type:"spinner",overlay:!0});let a=new FileReader;a.onload=async e=>{let a=e.target.result,n=t.name.split(".").pop().toLowerCase();try{if("json"===n){window.loadingIndicator?.updateMessage(o,"Parsing JSON data...");let e=JSON.parse(a);window.loadingIndicator?.updateMessage(o,"Rendering graph..."),(0,r.loadGraphDataFromServer)(e),document.getElementById("graphSelectorContainer").classList.add("d-none"),window.loadingIndicator?.hide(o),window.showAlert?.("Graph loaded successfully!","success",2e3)}else if("tsg"===n){window.loadingIndicator?.updateMessage(o,"Parsing TSG file..."),r.STATE.graph_jsons=await window.parse_tsgFile(a);let e=r.STATE.graph_jsons.length;window.loadingIndicator?.updateMessage(o,`Found ${e} graph${e>1?"s":""}...`),e>1?function(e){let t=document.getElementById("graphSelect"),o=document.getElementById("graphSelectorContainer");t.innerHTML="";for(let o=0;o<e;o++){let e=document.createElement("option");e.value=o,e.textContent=`Graph ${o+1}`,t.appendChild(e)}o.classList.remove("d-none");let a=t.cloneNode(!0);t.parentNode.replaceChild(a,t),a.addEventListener("change",function(){let e=parseInt(this.value);if(r.STATE.graph_jsons&&r.STATE.graph_jsons.length>e)try{let t=JSON.parse(r.STATE.graph_jsons[e]);(0,r.loadGraphDataFromServer)(t),window.showAlert(`Loaded graph ${e+1}`,"success",2e3)}catch(t){console.error("Error loading selected graph:",t),window.showAlert(`Error loading graph ${e+1}: ${t.message}`,"error")}})}(e):document.getElementById("graphSelectorContainer").classList.add("d-none"),window.loadingIndicator?.updateMessage(o,"Rendering graph...");let t=JSON.parse(r.STATE.graph_jsons[0]);(0,r.loadGraphDataFromServer)(t),window.loadingIndicator?.hide(o),window.showAlert?.(`Loaded ${e} graph${e>1?"s":""} successfully!`,"success",2e3)}}catch(e){console.error("Error processing file:",e),window.loadingIndicator?.hide(o),window.showAlert?.("Error processing file: "+e.message,"error")}},a.onerror=()=>{window.loadingIndicator?.hide(o),window.showAlert?.("Failed to read file","error")},a.readAsText(t),e.target.value=""}):console.warn("Element with ID 'uploadInput' not found in the DOM"),w&&h?w.addEventListener("click",()=>h.click()):console.warn("Upload button or input not found in the DOM");const b=document.getElementById("clearHighlights");b?b.addEventListener("click",()=>{(0,r.clearNodeHighlights)(r.STATE.cy)}):console.warn("Element with ID 'clearHighlights' not found in the DOM");const v=document.getElementById("geneAnnotationBtn");async function y(){let e=`gene-annotation-${Date.now()}`;try{if(window.loadingIndicator?.show(e,{message:"Loading gene database...",type:"bar",overlay:!0}),await (0,i.loadGeneData)()&&r.STATE.cy){window.loadingIndicator?.updateMessage(e,"Annotating nodes...");let t=r.STATE.cy.nodes().length,o=await (0,i.annotateAllNodes)(r.STATE.cy);window.loadingIndicator?.updateProgress(e,100),setTimeout(()=>{window.loadingIndicator?.hide(e),window.showAlert?.(`Annotated ${o} of ${t} nodes with gene information!`,"success",3e3)},500)}else console.error("Could not load gene data or graph not initialized"),window.loadingIndicator?.hide(e),window.showAlert?.("Failed to load gene annotations.","error")}catch(t){console.error("Error in gene annotation:",t),window.loadingIndicator?.hide(e),window.showAlert?.("Error in gene annotation process: "+t.message,"error")}}v?v.addEventListener("click",async e=>{if(e.ctrlKey||!window.bootstrap)e.preventDefault(),await y();else try{new bootstrap.Modal(document.getElementById("geneAnnotationModal")).show()}catch(e){console.error("Error showing modal, falling back to direct annotation:",e),await y()}}):console.warn("Element with ID 'geneAnnotationBtn' not found in the DOM"),document.addEventListener("click",e=>{("uploadAuroraIds"===e.target.id||e.target.parentElement&&"uploadAuroraIds"===e.target.parentElement.id)&&document.getElementById("auroraIdsFile")&&window.handleAuroraIdsFileUpload&&window.handleAuroraIdsFileUpload()}),document.addEventListener("DOMContentLoaded",function(){let e=document.getElementById("collapseToolbarBtn"),t=document.querySelector(".toolbar-responsive");e&&t&&(window.innerWidth<768&&(t.classList.add("toolbar-collapsed"),e.innerHTML='<i class="bi bi-chevron-down"></i>'),e.addEventListener("click",function(){t.classList.toggle("toolbar-collapsed"),t.classList.contains("toolbar-collapsed")?e.innerHTML='<i class="bi bi-chevron-down"></i>':e.innerHTML='<i class="bi bi-chevron-up"></i>'}))}),window.addEventListener("resize",function(){let e=document.querySelector(".toolbar-responsive"),t=document.getElementById("collapseToolbarBtn");e&&t&&(window.innerWidth>=768?e.classList.remove("toolbar-collapsed"):e.classList.contains("toolbar-collapsed")||(e.classList.add("toolbar-collapsed"),t.innerHTML='<i class="bi bi-chevron-down"></i>'))});
//# sourceMappingURL=app.1505abdd.js.map
