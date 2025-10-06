var e=globalThis,t={},o={},a=e.parcelRequireaed0;null==a&&((a=function(e){if(e in t)return t[e].exports;if(e in o){var a=o[e];delete o[e];var n={id:e,exports:{}};return t[e]=n,a.call(n.exports,n,n.exports),n.exports}var r=Error("Cannot find module '"+e+"'");throw r.code="MODULE_NOT_FOUND",r}).register=function(e,t){o[e]=t},e.parcelRequireaed0=a),a.register;var n=a("5qD1E"),r=a("2UrZ2"),l=a("e8aKe"),i=a("ftuQo");const d=document.getElementById("cy"),s=document.getElementById("info"),c=document.getElementById("walks"),p=document.getElementById("toggleMaximize");let g=!1;p?p.addEventListener("click",()=>{g?(d.style.width="",d.style.height="",s.style.display="",c.style.display="",g=!1):(d.style.width="100%",d.style.height="100vh",s.style.display="none",c.style.display="none",g=!0)}):console.warn("Element with ID 'toggleMaximize' not found in the DOM");const m=document.getElementById("hiddenLabel");m?m.addEventListener("click",function(){let e=(0,l.getLabelsVisible)()?"":function(e){return e.data("gene_name")?e.data("gene_name"):""},t=(0,l.getLabelsVisible)()?"":function(e){return e.data("weight")?e.data("weight"):""};n.STATE.cy.style().selector("node").style({label:e}).selector("edge").style({label:t}).update(),(0,l.setLabelsVisible)(!(0,l.getLabelsVisible)())}):console.warn("Element with ID 'hiddenLabel' not found in the DOM");const u=document.getElementById("captureGraph");async function f(e,t={}){let o,a;if(!n.STATE.cy)throw Error("No graph loaded");let{scale:r=2,fullGraph:l=!0,transparentBg:i=!1}=t,d=new Date().toISOString().slice(0,19).replace(/:/g,"-");switch(e){case"png":o=n.STATE.cy.png({full:l,scale:r,bg:i?"transparent":"#ffffff"}),a=`graph_${d}.png`;break;case"jpg":o=n.STATE.cy.jpg({full:l,scale:r,bg:"#ffffff",quality:.9}),a=`graph_${d}.jpg`;break;case"svg":let s=new Blob([n.STATE.cy.svg({full:l,bg:i?"transparent":"#ffffff"})],{type:"image/svg+xml"});o=URL.createObjectURL(s),a=`graph_${d}.svg`;break;case"json":let c=new Blob([JSON.stringify(n.STATE.cy.json(),null,2)],{type:"application/json"});o=URL.createObjectURL(c),a=`graph_${d}.json`;break;default:throw Error(`Unsupported format: ${e}`)}let p=document.createElement("a");p.href=o,p.download=a,p.click(),("svg"===e||"json"===e)&&setTimeout(()=>URL.revokeObjectURL(o),100)}u?u.addEventListener("click",()=>{!function(){if(!n.STATE.cy)return window.showAlert?.("No graph loaded to export","error");let e=document.getElementById("exportModal");e||(e=function(){let e=document.createElement("div");if(e.id="exportModal",e.className="modal fade",e.setAttribute("tabindex","-1"),e.innerHTML=`
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
        border-color: #007bff;
        background: var(--bg-secondary, #f8f9fa);
      }

      .export-format-option.active {
        border-color: #007bff;
        background: rgba(0, 123, 255, 0.1);
      }

      .export-format-option i {
        font-size: 2rem;
        color: #007bff;
        margin-bottom: 8px;
      }

      .format-name {
        font-weight: bold;
        margin-bottom: 4px;
        color: var(--text-primary, #212529);
      }

      .format-desc {
        font-size: 0.75rem;
        color: #6c757d;
      }

      [data-theme="dark"] .export-format-option {
        background: var(--bg-primary, #1a1a1a);
        border-color: #495057;
      }

      [data-theme="dark"] .export-format-option:hover {
        background: var(--bg-secondary, #2d2d2d);
      }
    `,document.head.appendChild(e)}return e}(),document.body.appendChild(e));let t=new bootstrap.Modal(e);t.show(),function(e,t){let o=e.querySelectorAll(".export-format-option");o.forEach(t=>{t.addEventListener("click",()=>{o.forEach(e=>e.classList.remove("active")),t.classList.add("active"),function(e,t){let o=t.querySelector("#scaleOptions"),a=t.querySelector("#exportOptions");"json"===e?(o.style.display="none",a.style.display="none"):(o.style.display="svg"===e?"none":"block",a.style.display="block")}(t.dataset.format,e)})});let a=e.querySelector("#exportScale"),n=e.querySelector("#scaleValue");a&&n&&a.addEventListener("input",e=>{n.textContent=`${e.target.value}x`});let r=e.querySelector("#confirmExport");r&&(r.replaceWith(r.cloneNode(!0)),e.querySelector("#confirmExport").addEventListener("click",async()=>{let o=e.querySelector(".export-format-option.active"),n=o?.dataset.format||"svg",r=parseFloat(a?.value||2),l=e.querySelector("#exportFullGraph")?.checked??!0,i=e.querySelector("#exportTransparentBg")?.checked??!1;try{await f(n,{scale:r,fullGraph:l,transparentBg:i}),t.hide(),window.showAlert?.(`Graph exported as ${n.toUpperCase()}!`,"success",2e3)}catch(e){console.error("Export failed:",e),window.showAlert?.(`Export failed: ${e.message}`,"error")}}))}(e,t)}()}):console.warn("Element with ID 'captureGraph' not found in the DOM"),document.addEventListener("DOMContentLoaded",()=>{(0,r.resizePanels)()});const h=document.getElementById("uploadInput");h?h.addEventListener("change",function(e){let t=e.target.files[0];if(console.log(t),!t)return;let o=`upload-${Date.now()}`;window.loadingIndicator?.show(o,{message:`Loading ${t.name}...`,type:"spinner",overlay:!0});let a=new FileReader;a.onload=async e=>{let a=e.target.result,r=t.name.split(".").pop().toLowerCase();try{if("json"===r){window.loadingIndicator?.updateMessage(o,"Parsing JSON data...");let e=JSON.parse(a);console.log("Loaded JSON data:",e),window.loadingIndicator?.updateMessage(o,"Rendering graph..."),(0,n.loadGraphDataFromServer)(e),document.getElementById("graphSelectorContainer").style.display="none",window.loadingIndicator?.hide(o),window.showAlert?.("Graph loaded successfully!","success",2e3)}else if("tsg"===r){window.loadingIndicator?.updateMessage(o,"Parsing TSG file..."),console.log("Loaded TSG data"),n.STATE.graph_jsons=await window.parse_tsgFile(a),console.log(`Number of graph JSONs: ${n.STATE.graph_jsons.length}`);let e=n.STATE.graph_jsons.length;window.loadingIndicator?.updateMessage(o,`Found ${e} graph${e>1?"s":""}...`),e>1?function(e){let t=document.getElementById("graphSelect"),o=document.getElementById("graphSelectorContainer");t.innerHTML="";for(let o=0;o<e;o++){let e=document.createElement("option");e.value=o,e.textContent=`Graph ${o+1}`,t.appendChild(e)}o.style.display="block",t.addEventListener("change",function(){let e=parseInt(this.value);if(n.STATE.graph_jsons&&n.STATE.graph_jsons.length>e)try{let t=JSON.parse(n.STATE.graph_jsons[e]);(0,n.loadGraphDataFromServer)(t),window.showAlert(`Loaded graph ${e+1}`,"success",2e3)}catch(t){console.error("Error loading selected graph:",t),window.showAlert(`Error loading graph ${e+1}: ${t.message}`,"error")}})}(e):document.getElementById("graphSelectorContainer").style.display="none",window.loadingIndicator?.updateMessage(o,"Rendering graph...");let t=JSON.parse(n.STATE.graph_jsons[0]);(0,n.loadGraphDataFromServer)(t),window.loadingIndicator?.hide(o),window.showAlert?.(`Loaded ${e} graph${e>1?"s":""} successfully!`,"success",2e3)}}catch(e){console.error("Error processing file:",e),window.loadingIndicator?.hide(o),window.showAlert?.("Error processing file: "+e.message,"error")}},a.onerror=()=>{window.loadingIndicator?.hide(o),window.showAlert?.("Failed to read file","error")},a.readAsText(t)}):console.warn("Element with ID 'uploadInput' not found in the DOM");const w=document.getElementById("clearHighlights");w?w.addEventListener("click",()=>{(0,n.clearNodeHighlights)(n.STATE.cy)}):console.warn("Element with ID 'clearHighlights' not found in the DOM");const b=document.getElementById("geneAnnotationBtn");async function y(){let e=`gene-annotation-${Date.now()}`;try{if(console.log("Starting gene annotation process directly..."),window.loadingIndicator?.show(e,{message:"Loading gene database...",type:"bar",overlay:!0}),await (0,i.loadGeneData)()&&n.STATE.cy){console.log("Gene data loaded successfully, annotating nodes..."),window.loadingIndicator?.updateMessage(e,"Annotating nodes...");let t=n.STATE.cy.nodes().length,o=await (0,i.annotateAllNodes)(n.STATE.cy);window.loadingIndicator?.updateProgress(e,100),setTimeout(()=>{window.loadingIndicator?.hide(e),window.showAlert?.(`Annotated ${o} of ${t} nodes with gene information!`,"success",3e3)},500)}else console.error("Could not load gene data or graph not initialized"),window.loadingIndicator?.hide(e),window.showAlert?.("Failed to load gene annotations.","error")}catch(t){console.error("Error in gene annotation:",t),window.loadingIndicator?.hide(e),window.showAlert?.("Error in gene annotation process: "+t.message,"error")}}b?b.addEventListener("click",async e=>{if(e.ctrlKey||!window.bootstrap)e.preventDefault(),await y();else try{new bootstrap.Modal(document.getElementById("geneAnnotationModal")).show()}catch(e){console.error("Error showing modal, falling back to direct annotation:",e),await y()}}):console.warn("Element with ID 'geneAnnotationBtn' not found in the DOM"),document.addEventListener("click",e=>{("uploadAuroraIds"===e.target.id||e.target.parentElement&&"uploadAuroraIds"===e.target.parentElement.id)&&document.getElementById("auroraIdsFile")&&window.handleAuroraIdsFileUpload&&window.handleAuroraIdsFileUpload()}),"undefined"!=typeof window&&void 0===window.handleAuroraIdsFileUpload&&"function"==typeof handleAuroraIdsFileUpload&&(window.handleAuroraIdsFileUpload=handleAuroraIdsFileUpload),document.addEventListener("DOMContentLoaded",function(){let e=document.getElementById("collapseToolbarBtn"),t=document.querySelector(".toolbar-responsive");e&&t&&(window.innerWidth<768&&(t.classList.add("toolbar-collapsed"),e.innerHTML='<i class="bi bi-chevron-down"></i>'),e.addEventListener("click",function(){t.classList.toggle("toolbar-collapsed"),t.classList.contains("toolbar-collapsed")?e.innerHTML='<i class="bi bi-chevron-down"></i>':e.innerHTML='<i class="bi bi-chevron-up"></i>'}))}),window.addEventListener("resize",function(){let e=document.querySelector(".toolbar-responsive"),t=document.getElementById("collapseToolbarBtn");e&&t&&(window.innerWidth>=768?e.classList.remove("toolbar-collapsed"):e.classList.contains("toolbar-collapsed")||(e.classList.add("toolbar-collapsed"),t.innerHTML='<i class="bi bi-chevron-down"></i>'))});
//# sourceMappingURL=app.8a19d59f.js.map
