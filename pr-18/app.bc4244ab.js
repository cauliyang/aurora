class e{constructor(){this.helpSteps=[{target:"#cy",title:"Graph Visualization Panel",content:"This is the main graph visualization area. Here you can interact with your graph: zoom in/out, pan, select nodes and edges, and visualize your data structure. You can click and drag nodes to rearrange them manually.",placement:"left"},{target:"#info",title:"Information Panel",content:"When you select a node or edge in the graph, detailed information about that element will be displayed here. This panel shows properties, metrics, and other attributes associated with the selected element.",placement:"left"},{target:"#walks",title:"Graph Walks Panel",content:"This panel displays all walks (paths) in your graph. You can search for specific walks, highlight them in the graph visualization, and upload Aurora IDs for batch searching. Walks provide important connectivity information in your graph structure.",placement:"left"},{target:"#toggleMaximize",title:"Toggle Fullscreen",content:"Click this button to enter or exit fullscreen mode, giving you more space to work with your graph.",placement:"bottom"},{target:"#uploadForm",title:"Upload Files",content:"Upload your JSON or TSG files here to visualize your graph data.",placement:"bottom"},{target:"#captureGraph",title:"Capture Graph",content:"Save your current graph view as a PNG image to use in presentations or documentation.",placement:"bottom"},{target:"#hiddenLabel",title:"Toggle Labels",content:"Show or hide node and edge labels to customize your graph visualization.",placement:"bottom"},{target:"#toggleTooltip",title:"Toggle Tooltips",content:"Enable or disable tooltips that show information when hovering over graph elements.",placement:"bottom"},{target:"#resetGraph",title:"Reset Graph",content:"Reset the graph layout to its original state.",placement:"bottom"},{target:"#clearHighlights",title:"Clear Highlights",content:"Remove all highlights from nodes in the graph.",placement:"bottom"},{target:"#geneAnnotationBtn",title:"Gene Annotations",content:"Add biological context to your graph by annotating nodes with gene information.",placement:"bottom"},{target:"#layoutSelect",title:"Layout Selection",content:"Choose different layout algorithms to organize your graph in various ways.",placement:"bottom"},{target:"#graphSelectorContainer",title:"Graph Selector",content:"If your data contains multiple graphs, you can switch between them using this dropdown menu. Each graph represents a different dataset or view that you can analyze independently.",placement:"bottom"},{target:"#minEdgeWeight",title:"Minimum Edge Weight",content:"Filter the graph by setting the minimum weight for edges. Edges with weights below this value will be hidden, allowing you to focus on the strongest connections in your graph.",placement:"bottom"},{target:"#MinDepth",title:"Minimum Depth",content:"Set the minimum depth for graph traversal. This limits the graph to only show paths that have at least this many edges, helping to filter out shallow or less significant paths.",placement:"bottom"},{target:"#MaxDepth",title:"Maximum Depth",content:"Set the maximum depth for graph traversal. This prevents the graph from showing excessively long paths, making the visualization more manageable and focused on the most relevant connections.",placement:"bottom"},{target:"#openJsonEditor",title:"JSON Editor",content:"Open the JSON editor to view or modify the underlying graph data structure.",placement:"left"},{target:"#redirectToIgv",title:"IGV Browser",content:"Launch the Integrative Genomics Viewer for detailed genomic visualization.",placement:"left"},{target:"#showNodeRanking",title:"Node Ranking",content:"View nodes ranked by importance based on graph metrics.",placement:"left"},{target:"#walkSearch",title:"Search Walks",content:"Search for specific walks or Aurora IDs in the graph.",placement:"top"},{target:"#uploadAuroraIds",title:"Batch Search",content:"Upload a list of Aurora IDs for batch searching across your graph.",placement:"top"}],this.currentStepIndex=0,this.isGuideActive=!1,this.overlay=null,this.tooltip=null,this.loadProgress(),this.addHelpButton(),this.showWelcomeIfFirstVisit()}showWelcomeIfFirstVisit(){if(!localStorage.getItem("auroraHelpGuideWelcomeSeen")){let e=`
        <div class="help-guide-welcome-toast">
          <div class="help-guide-welcome-header">
            <i class="bi bi-question-circle text-primary me-2"></i>
            <strong>Welcome to Aurora!</strong>
            <button class="help-guide-welcome-close">&times;</button>
          </div>
          <div class="help-guide-welcome-body">
            <p>We've added an interactive help guide to help you learn how to use Aurora.</p>
            <p class="mb-2">Click the Help link in the navbar to start the interactive tour.</p>
            <button class="btn btn-sm btn-primary w-100" id="startWelcomeHelpBtn">
              <i class="bi bi-question-circle me-2"></i> Start Help Guide
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
          background-color: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }

        .help-guide-welcome-close {
          margin-left: auto;
          background: none;
          border: none;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          color: #6c757d;
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
      `,document.head.appendChild(t);let i=document.createElement("div");i.innerHTML=e,document.body.appendChild(i),document.querySelector(".help-guide-welcome-close").addEventListener("click",()=>{document.querySelector(".help-guide-welcome-toast").remove(),localStorage.setItem("auroraHelpGuideWelcomeSeen","true")}),document.getElementById("startWelcomeHelpBtn").addEventListener("click",()=>{document.querySelector(".help-guide-welcome-toast").remove(),localStorage.setItem("auroraHelpGuideWelcomeSeen","true"),this.startGuide()}),setTimeout(()=>{let e=document.querySelector(".help-guide-welcome-toast");e&&(e.style.animation="slideInUp 0.4s ease-out reverse",setTimeout(()=>{e.parentNode&&(e.remove(),localStorage.setItem("auroraHelpGuideWelcomeSeen","true"))},400))},3e4)}}addHelpButton(){let e=document.getElementById("showReleaseNotesBtn");if(e){let t=document.createElement("li");t.className="nav-item";let i=document.createElement("a");i.id="helpGuideButton",i.className="nav-link",i.href="#",i.title="Start Help Guide",i.innerHTML='<i class="bi bi-question-circle"></i> Help',i.addEventListener("click",e=>{e.preventDefault(),this.startGuide()}),t.appendChild(i);let o=e.closest("ul"),n=e.closest("li");n&&o&&o.insertBefore(t,n.nextSibling)}}startGuide(){this.isGuideActive||(this.isGuideActive=!0,this.createOverlay(),this.showStep(0))}createOverlay(){if(!this.overlay){this.overlay=document.createElement("div"),this.overlay.className="help-guide-overlay",document.body.appendChild(this.overlay);let e=document.createElement("style");e.textContent=`
                .help-guide-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    z-index: 9998;
                    pointer-events: none;
                }

                .help-guide-tooltip {
                    position: absolute;
                    z-index: 9999;
                    background-color: white;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                    border-radius: 4px;
                    padding: 15px;
                    max-width: 300px;
                    pointer-events: auto;
                }

                .help-guide-tooltip h5 {
                    margin-top: 0;
                    color: #007bff;
                }

                .help-guide-tooltip p {
                    margin-bottom: 10px;
                }

                .help-guide-buttons {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    margin-top: 10px;
                }

                .help-guide-nav-group {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .help-guide-step-indicator {
                    min-width: 70px;
                    text-align: center;
                    font-weight: 500;
                }

                .target-highlight {
                    position: relative;
                    z-index: 9999;
                    pointer-events: auto;
                }
            `,document.head.appendChild(e)}this.tooltip||(this.tooltip=document.createElement("div"),this.tooltip.className="help-guide-tooltip",document.body.appendChild(this.tooltip))}showStep(e){if(e<0||e>=this.helpSteps.length)return void this.endGuide();this.currentStepIndex=e;let t=this.helpSteps[e],i=document.querySelector(t.target);if(!i){console.error(`Target element ${t.target} not found`),this.nextStep();return}i.classList.add("target-highlight"),this.scrollElementIntoView(i).then(()=>{this.positionTooltip(i,t.placement),this.tooltip.innerHTML=`
        <h5>${t.title}</h5>
        <p>${t.content}</p>
        <div class="help-guide-buttons">
          <div class="help-guide-nav-group">
            <button id="helpGuidePrev" class="btn btn-sm btn-outline-secondary"${0===e?" disabled":""}>
              <i class="bi bi-chevron-left"></i> Previous
            </button>
            <span class="help-guide-step-indicator">${e+1} of ${this.helpSteps.length}</span>
            <button id="helpGuideNext" class="btn btn-sm btn-outline-primary">
              ${e===this.helpSteps.length-1?'Finish <i class="bi bi-check-lg"></i>':'Next <i class="bi bi-chevron-right"></i>'}
            </button>
          </div>
          <button id="helpGuideClose" class="btn btn-sm btn-outline-danger">
            <i class="bi bi-x-lg"></i> Close
          </button>
        </div>
      `,document.getElementById("helpGuidePrev").addEventListener("click",()=>{this.previousStep()}),document.getElementById("helpGuideNext").addEventListener("click",()=>{this.nextStep()}),document.getElementById("helpGuideClose").addEventListener("click",()=>{this.endGuide()}),this.saveProgress()})}positionTooltip(e,t){this.scrollElementIntoView(e);let i=e.getBoundingClientRect();setTimeout(()=>{let e,o,n=this.tooltip.getBoundingClientRect();switch(t){case"top":e=i.top-n.height-15,o=i.left+(i.width-n.width)/2;break;case"bottom":default:e=i.bottom+15,o=i.left+(i.width-n.width)/2;break;case"left":e=i.top+(i.height-n.height)/2,o=i.left-n.width-15;break;case"right":e=i.top+(i.height-n.height)/2,o=i.right+15}let a=window.innerWidth,l=window.innerHeight;o<15&&(o=15),o+n.width>a-15&&(o=a-n.width-15),e<15&&(e="top"===t?i.bottom+15:15),e+n.height>l-15&&("bottom"===t?(e=i.top-n.height-15)<15&&(e=15):e=l-n.height-15),this.tooltip.style.top=`${e}px`,this.tooltip.style.left=`${o}px`},250)}scrollElementIntoView(e){let t=e.getBoundingClientRect(),i=window.innerHeight;return t.top>=0&&t.left>=0&&t.bottom<=i&&t.right<=window.innerWidth?Promise.resolve():(e.scrollIntoView({behavior:"smooth",block:"center",inline:"center"}),new Promise(e=>setTimeout(e,200)))}nextStep(){let e=this.helpSteps[this.currentStepIndex],t=document.querySelector(e.target);t&&t.classList.remove("target-highlight"),this.currentStepIndex===this.helpSteps.length-1?this.endGuide():this.showStep(this.currentStepIndex+1)}previousStep(){let e=this.helpSteps[this.currentStepIndex],t=document.querySelector(e.target);t&&t.classList.remove("target-highlight"),this.currentStepIndex>0&&this.showStep(this.currentStepIndex-1)}endGuide(){this.isGuideActive=!1;let e=this.helpSteps[this.currentStepIndex];if(e){let t=document.querySelector(e.target);t&&t.classList.remove("target-highlight")}this.overlay&&(document.body.removeChild(this.overlay),this.overlay=null),this.tooltip&&(document.body.removeChild(this.tooltip),this.tooltip=null),this.saveProgress()}saveProgress(){localStorage.setItem("auroraHelpGuideProgress",JSON.stringify({lastViewedStep:this.currentStepIndex,lastViewedDate:new Date().toISOString()}))}loadProgress(){try{let e=JSON.parse(localStorage.getItem("auroraHelpGuideProgress"));if(e){let t=new Date(e.lastViewedDate);(new Date-t)/864e5<=7&&(this.currentStepIndex=e.lastViewedStep)}}catch(e){console.error("Error loading help guide progress:",e),this.currentStepIndex=0}}}document.addEventListener("DOMContentLoaded",()=>{window.auroraHelpGuide=new e});
//# sourceMappingURL=app.bc4244ab.js.map
