class e{constructor(){this.helpSteps=[{target:"#cy",title:"Graph Canvas",content:"Your main workspace. Zoom, pan, click nodes and edges, or drag them to rearrange. Upload a JSON or TSG file to get started.",placement:"left"},{target:"#info",title:"Details Panel",content:"Click any node or edge to see its properties here — coordinates, weight, gene annotations, and more.",placement:"left"},{target:"#walks",title:"Walks Panel",content:"Lists all discovered paths through your graph. Search, highlight, or batch-filter walks by Aurora ID.",placement:"left"},{target:"#uploadBtn",title:"Upload File",content:"Load a JSON or TSG file to visualize a transcript segment graph.",placement:"bottom"},{target:"#captureGraph",title:"Export Image",content:"Save the current graph view as a PNG image.",placement:"bottom"},{target:"#toggleMaximize",title:"Fullscreen",content:"Expand the graph canvas to fill the entire screen.",placement:"bottom"},{target:"#hiddenLabel",title:"Toggle Labels",content:"Show or hide node names and edge weights on the graph.",placement:"bottom"},{target:"#toggleTooltip",title:"Toggle Tooltips",content:"Turn hover tooltips on or off for graph elements.",placement:"bottom"},{target:"#resetGraph",title:"Reset Layout",content:"Re-run the layout algorithm to reposition all nodes.",placement:"bottom"},{target:"#clearHighlights",title:"Clear Highlights",content:"Remove all active node and walk highlights.",placement:"bottom"},{target:"#layoutSelect",title:"Layout Algorithm",content:"Switch between layout algorithms — dagre, klay, tidytree, and more — to arrange the graph differently.",placement:"bottom"},{target:"#graphSelectorContainer",title:"Graph Selector",content:"When a TSG file contains multiple graphs, use this dropdown to switch between them.",placement:"bottom"},{target:".toolbar-filter-group",title:"Graph Filters",content:"Control walk discovery: set a minimum edge weight, and minimum/maximum path depth to focus on the most relevant walks.",placement:"bottom"},{target:"#geneAnnotationBtn",title:"Gene Annotations",content:"Annotate graph nodes with gene names and exon data from GENCODE.",placement:"bottom"},{target:"#openJsonEditor",title:"JSON Editor",content:"View or edit the raw graph JSON data in a tree, code, or form view.",placement:"left"},{target:"#showNodeRanking",title:"Node Ranking",content:"Rank nodes by degree, centrality, or other graph metrics.",placement:"left"},{target:"#walkSearch",title:"Search Walks",content:"Type to filter walks by node IDs or Aurora IDs.",placement:"top"},{target:"#uploadAuroraIds",title:"Batch Search",content:"Upload a .txt file of Aurora IDs to filter walks in bulk.",placement:"top"}],this.currentStepIndex=0,this.isGuideActive=!1,this.overlay=null,this.tooltip=null,this.loadProgress(),this.addHelpButton(),this.showWelcomeIfFirstVisit()}showWelcomeIfFirstVisit(){if(!localStorage.getItem("auroraHelpGuideWelcomeSeen")){let e=`
        <div class="help-guide-welcome-toast">
          <div class="help-guide-welcome-header">
            <i class="bi bi-question-circle text-primary me-2"></i>
            <strong>Welcome to Aurora!</strong>
            <button class="help-guide-welcome-close">&times;</button>
          </div>
          <div class="help-guide-welcome-body">
            <p>New here? Take a quick interactive tour to learn the interface.</p>
            <p class="mb-2 small text-muted">Use <kbd>&larr;</kbd> <kbd>&rarr;</kbd> to navigate, <kbd>Esc</kbd> to close.</p>
            <button class="btn btn-sm btn-primary w-100" id="startWelcomeHelpBtn">
              <i class="bi bi-rocket-takeoff me-2"></i> Start Tour
            </button>
          </div>
        </div>
      `,t=document.createElement("style");t.textContent=`
        .help-guide-welcome-toast {
          position: fixed;
          bottom: 20px;
          left: 20px;
          width: 320px;
          background-color: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-radius: 6px;
          z-index: 9999;
          overflow: hidden;
          animation: slideInUp 0.4s ease-out;
        }

        .help-guide-welcome-header {
          display: flex;
          align-items: center;
          padding: 12px 15px;
          background-color: var(--bg-secondary, #f8f9fa);
          border-bottom: 1px solid var(--border-color, #dee2e6);
        }

        .help-guide-welcome-close {
          margin-left: auto;
          background: none;
          border: none;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          color: var(--text-secondary, #475569);
        }

        .help-guide-welcome-body {
          padding: 15px;
        }

        @keyframes slideInUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `,document.head.appendChild(t);let i=document.createElement("div");i.innerHTML=e,document.body.appendChild(i),document.querySelector(".help-guide-welcome-close").addEventListener("click",()=>{document.querySelector(".help-guide-welcome-toast").remove(),localStorage.setItem("auroraHelpGuideWelcomeSeen","true")}),document.getElementById("startWelcomeHelpBtn").addEventListener("click",()=>{document.querySelector(".help-guide-welcome-toast").remove(),localStorage.setItem("auroraHelpGuideWelcomeSeen","true"),this.startGuide()}),setTimeout(()=>{let e=document.querySelector(".help-guide-welcome-toast");e&&(e.style.animation="slideInUp 0.4s ease-out reverse",setTimeout(()=>{e.parentNode&&(e.remove(),localStorage.setItem("auroraHelpGuideWelcomeSeen","true"))},400))},3e4)}}addHelpButton(){let e=document.getElementById("showReleaseNotesBtn");if(e){let t=document.createElement("li");t.className="nav-item";let i=document.createElement("a");i.id="helpGuideButton",i.className="nav-link",i.href="#",i.title="Start Help Guide",i.innerHTML='<i class="bi bi-question-circle"></i> Help',i.addEventListener("click",e=>{e.preventDefault(),this.startGuide()}),t.appendChild(i);let o=e.closest("ul"),l=e.closest("li");l&&o&&o.insertBefore(t,l.nextSibling)}}startGuide(){this.isGuideActive||(this.isGuideActive=!0,this.createOverlay(),this.showStep(0))}createOverlay(){this.overlay||(this.overlay=document.createElement("div"),this.overlay.className="help-guide-overlay",document.body.appendChild(this.overlay)),this.tooltip||(this.tooltip=document.createElement("div"),this.tooltip.className="help-guide-tooltip",document.body.appendChild(this.tooltip)),this.addKeyboardListeners()}addKeyboardListeners(){this.keyboardHandler||(this.keyboardHandler=e=>{if(this.isGuideActive)switch(e.key){case"ArrowLeft":e.preventDefault(),this.previousStep();break;case"ArrowRight":case"Enter":e.preventDefault(),this.nextStep();break;case"Escape":e.preventDefault(),this.endGuide()}},document.addEventListener("keydown",this.keyboardHandler))}showStep(e,t=1){if(e<0||e>=this.helpSteps.length)return void this.endGuide();this.currentStepIndex=e;let i=this.helpSteps[e],o=document.querySelector(i.target);if(!o||null===o.offsetParent&&!o.matches("#cy")&&(o.classList.contains("d-none")||"none"===getComputedStyle(o).display)){let i=e+t;i>=0&&i<this.helpSteps.length?this.showStep(i,t):this.endGuide();return}o.classList.add("target-highlight"),this.scrollElementIntoView(o).then(()=>{this.positionTooltip(o,i.placement);let t=(e+1)/this.helpSteps.length*100;this.tooltip.innerHTML=`
        <div class="help-guide-progress">
          <div class="help-guide-progress-bar" style="width: ${t}%"></div>
        </div>
        <h5>${i.title}</h5>
        <p>${i.content}</p>
        <div class="help-guide-buttons">
          <div class="help-guide-nav-group">
            <button id="helpGuidePrev" class="btn btn-sm btn-outline-secondary"${0===e?" disabled":""}>
              <i class="bi bi-chevron-left"></i> Previous
            </button>
            <span class="help-guide-step-indicator">${e+1} of ${this.helpSteps.length}</span>
            <button id="helpGuideNext" class="btn btn-sm btn-primary">
              ${e===this.helpSteps.length-1?'Finish <i class="bi bi-check-lg"></i>':'Next <i class="bi bi-chevron-right"></i>'}
            </button>
          </div>
          <button id="helpGuideClose" class="btn btn-sm btn-outline-danger">
            <i class="bi bi-x-lg"></i> Close
          </button>
        </div>
        <div class="help-guide-shortcuts">
          <span><kbd>\u{2190}</kbd> <kbd>\u{2192}</kbd> Navigate</span>
          <span><kbd>Enter</kbd> Next</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      `,this.tooltip.setAttribute("data-placement",i.placement),this.tooltip.classList.add("step-transition"),setTimeout(()=>{this.tooltip.classList.remove("step-transition")},300),document.getElementById("helpGuidePrev").addEventListener("click",()=>{this.previousStep()}),document.getElementById("helpGuideNext").addEventListener("click",()=>{this.nextStep()}),document.getElementById("helpGuideClose").addEventListener("click",()=>{this.endGuide()}),this.saveProgress()})}positionTooltip(e,t){this.scrollElementIntoView(e);let i=e.getBoundingClientRect();setTimeout(()=>{let e,o,l=this.tooltip.getBoundingClientRect();switch(t){case"top":e=i.top-l.height-15,o=i.left+(i.width-l.width)/2;break;case"bottom":default:e=i.bottom+15,o=i.left+(i.width-l.width)/2;break;case"left":e=i.top+(i.height-l.height)/2,o=i.left-l.width-15;break;case"right":e=i.top+(i.height-l.height)/2,o=i.right+15}let n=window.innerWidth,r=window.innerHeight;o<15&&(o=15),o+l.width>n-15&&(o=n-l.width-15),e<15&&(e="top"===t?i.bottom+15:15),e+l.height>r-15&&("bottom"===t?(e=i.top-l.height-15)<15&&(e=15):e=r-l.height-15),this.tooltip.style.top=`${e}px`,this.tooltip.style.left=`${o}px`},250)}scrollElementIntoView(e){let t=e.getBoundingClientRect(),i=window.innerHeight;return t.top>=0&&t.left>=0&&t.bottom<=i&&t.right<=window.innerWidth?Promise.resolve():(e.scrollIntoView({behavior:"smooth",block:"center",inline:"center"}),new Promise(e=>setTimeout(e,200)))}nextStep(){let e=this.helpSteps[this.currentStepIndex],t=document.querySelector(e.target);t&&t.classList.remove("target-highlight"),this.currentStepIndex===this.helpSteps.length-1?this.endGuide():this.showStep(this.currentStepIndex+1)}previousStep(){let e=this.helpSteps[this.currentStepIndex],t=document.querySelector(e.target);t&&t.classList.remove("target-highlight"),this.currentStepIndex>0&&this.showStep(this.currentStepIndex-1,-1)}endGuide(){this.isGuideActive=!1;let e=this.helpSteps[this.currentStepIndex];if(e){let t=document.querySelector(e.target);t&&t.classList.remove("target-highlight")}this.overlay&&(document.body.removeChild(this.overlay),this.overlay=null),this.tooltip&&(document.body.removeChild(this.tooltip),this.tooltip=null),this.keyboardHandler&&(document.removeEventListener("keydown",this.keyboardHandler),this.keyboardHandler=null),this.saveProgress()}saveProgress(){localStorage.setItem("auroraHelpGuideProgress",JSON.stringify({lastViewedStep:this.currentStepIndex,lastViewedDate:new Date().toISOString()}))}loadProgress(){try{let e=JSON.parse(localStorage.getItem("auroraHelpGuideProgress"));if(e){let t=new Date(e.lastViewedDate);(new Date-t)/864e5<=7&&(this.currentStepIndex=e.lastViewedStep)}}catch(e){console.error("Error loading help guide progress:",e),this.currentStepIndex=0}}}document.addEventListener("DOMContentLoaded",()=>{window.auroraHelpGuide=new e});
//# sourceMappingURL=app.cf062ce1.js.map
