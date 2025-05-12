(0,globalThis.parcelRequireaed0.register)("iNwrO",function(t,e){function o(t,e,n,r=null){let i=Math.min(...t.map(t=>t.start)),s=Math.max(...t.map(t=>t.end)),l=s-i+1,d={top:45,right:30,bottom:50,left:60},c=e.clientWidth-d.left-d.right,p=d3.select(e).append("svg").attr("width",c+d.left+d.right).attr("height",180+d.top+d.bottom).attr("class","exon-svg").append("g").attr("transform",`translate(${d.left},${d.top})`);r?p.append("text").attr("x",c/2).attr("y",-5).attr("text-anchor","middle").attr("class","chromosome-info text-header").text(`Total Exons: ${t.length} | Chromosome ${r.chrom}${r.strand?`, Strand: ${r.strand}`:""}`):p.append("text").attr("x",c/2).attr("y",-5).attr("text-anchor","middle").attr("class","text-header").style("font-size","14px").style("fill","#666").text(`Total Exons: ${t.length}`);let x=p.append("defs"),m=d3.scaleLinear().domain([i,s]).range([0,c]),h=d3.axisBottom(m).tickFormat(t=>t.toLocaleString()).ticks(Math.min(10,c/100)),u=p.append("g").attr("class","x-axis").attr("transform","translate(0,170)").call(h);u.selectAll("text").style("font-size","10px").style("font-weight","bold"),u.selectAll("line").style("stroke","#ccc"),u.selectAll("path").style("stroke","#ccc").style("stroke-width","2px"),p.append("text").attr("x",c/2).attr("y",180+d.bottom-10).style("text-anchor","middle").style("font-size","12px").style("font-weight","bold").text("Genomic Position"),p.append("g").attr("class","grid-lines").selectAll("line").data(m.ticks(10)).enter().append("line").attr("x1",t=>m(t)).attr("y1",0).attr("x2",t=>m(t)).attr("y2",170).attr("stroke","#eee").attr("stroke-width",1);let g=t.reduce((t,e)=>t+e.length,0),f=[];for(let e=0;e<t.length-1;e++)t[e].end<t[e+1].start&&f.push({start:t[e].end+1,end:t[e+1].start-1,length:t[e+1].start-t[e].end-1,index:e});p.append("line").attr("x1",m(i)).attr("y1",90).attr("x2",m(s)).attr("y2",90).attr("stroke","#ccc").attr("stroke-width",3),x.append("pattern").attr("id","intron-pattern").attr("patternUnits","userSpaceOnUse").attr("width",6).attr("height",6).append("path").attr("d","M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2").attr("stroke","#999").attr("stroke-width",1),p.selectAll(".intron").data(f).enter().append("line").attr("class","intron").attr("x1",t=>m(t.start)).attr("y1",90).attr("x2",t=>m(t.start)).attr("y2",90).attr("stroke","#999").attr("stroke-width",3).attr("stroke-dasharray","5,5").transition().duration(1e3).delay((t,e)=>100*e).attr("x2",t=>m(t.end));let b=[d3.interpolateBlues,d3.interpolateGreens,d3.interpolateOranges,d3.interpolatePurples],v=b[t.length%b.length],y=d3.scaleSequential().domain([0,t.length-1]).interpolator(v),w=p.selectAll(".exon-group").data(t).enter().append("g").attr("class","exon-group").attr("transform",t=>`translate(${m(t.start)}, 70)`);return w.append("rect").attr("class","exon").attr("x",0).attr("y",0).attr("width",0).attr("height",0).attr("fill",(t,e)=>y(e)).attr("stroke","#333").attr("stroke-width",2).attr("rx",6).attr("ry",6).transition().duration(800).delay((t,e)=>100*e).attr("height",40).transition().duration(400).attr("width",t=>Math.max(6,m(t.end)-m(t.start))),w.append("text").attr("class","exon-label").attr("x",t=>Math.max(3,(m(t.end)-m(t.start))/2)).attr("y",25).attr("text-anchor","middle").attr("fill","white").attr("font-weight","bold").attr("font-size","12px").attr("pointer-events","none").style("opacity",0).text((t,e)=>e+1),w.on("mouseover",function(e,o){let n=t.indexOf(o);d3.select(this).select("rect").transition().duration(150).attr("stroke-width",2).attr("stroke","#ff7f0e"),d3.select(this).select(".exon-label").transition().duration(150).style("opacity",1);let a=d3.select("#tooltip");if(a.empty())return void console.warn("Tooltip element not found");a.transition().duration(200).style("opacity",1),a.html(`
                <div class="exon-tooltip">
                    <h6 class="mb-1">Exon ${n+1}</h6>
                    <p class="mb-1"><strong>Position:</strong> ${o.start.toLocaleString()}-${o.end.toLocaleString()}</p>
                    <p class="mb-1"><strong>Length:</strong> ${o.length.toLocaleString()} bp</p>
                    <p class="mb-0"><strong>% of Transcript:</strong> ${(o.length/l*100).toFixed(2)}%</p>
                </div>
            `).style("left",`${e.pageX+10}px`).style("top",`${e.pageY-10}px`)}).on("mouseout",function(){d3.select(this).select("rect").transition().duration(150).attr("stroke-width",1).attr("stroke","#333"),d3.select(this).select(".exon-label").transition().duration(150).style("opacity",0);let t=d3.select("#tooltip");t.empty()||t.transition().duration(200).style("opacity",0)}).on("click",function(t,e){let o;if(o=r&&r.chrom?`${r.chrom}:${e.start.toLocaleString()}-${e.end.toLocaleString()}`:`${e.start.toLocaleString()}-${e.end.toLocaleString()}`,navigator.clipboard)navigator.clipboard.writeText(o).then(()=>{a("success",`Copied: ${o}`)},()=>{a("error","Failed to copy coordinate")});else{let t=document.createElement("textarea");t.value=o,document.body.appendChild(t),t.select();try{document.execCommand("copy"),a("success",`Copied: ${o}`)}catch(t){a("error","Failed to copy coordinate")}document.body.removeChild(t)}}),new ResizeObserver(()=>{if(Math.abs(n.clientWidth-c)>20){let t=e.clientWidth-d.left-d.right;d3.select(e).select("svg").attr("width",t+d.left+d.right),m.range([0,t]),p.select(".x-axis").call(h.ticks(Math.min(10,t/100))),w.attr("transform",t=>`translate(${m(t.start)}, 70)`),w.select("rect").attr("width",t=>Math.max(6,m(t.end)-m(t.start))),w.select("text").attr("x",t=>Math.max(3,(m(t.end)-m(t.start))/2)),p.selectAll(".intron").attr("x1",t=>m(t.start)).attr("x2",t=>m(t.end)),p.selectAll(".text-header").attr("x",t/2)}}).observe(n),{exonCount:t.length,intronCount:f.length,totalLength:l,exonLength:g,intronLength:l-g}}function n(t,e="Node Structure",r=null){let i=document.getElementById("exonVisualizationModal");if(!document.getElementById("tooltip")){let t=document.createElement("div");t.id="tooltip",t.className="exon-tooltip-container",t.style.position="absolute",t.style.opacity="0",t.style.pointerEvents="none",t.style.zIndex="1000",document.body.appendChild(t)}if(i)document.getElementById("exonVisualizationModalLabel").textContent=e;else if((i=document.createElement("div")).id="exonVisualizationModal",i.className="modal fade",i.tabIndex="-1",i.innerHTML=`
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="exonVisualizationModalLabel">${e}</h5>
            <div class="ms-auto">
              <button type="button" id="exportExonSvgBtn" class="btn btn-sm btn-outline-success me-2" title="Export as SVG">
                <i class="bi bi-download me-1"></i> Export SVG
              </button>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
          </div>
          <div class="modal-body p-0">
            <div id="exonVisualizationContainer" class="exon-container"></div>
            <div id="exonStatsContainer" class="mt-3 px-3 pb-3"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    `,document.body.appendChild(i),!document.getElementById("exon-visualization-styles")){let t=document.createElement("style");t.id="exon-visualization-styles",t.textContent=`
                .modal-xl {
                    max-width: 90%;
                    width: 1200px;
                }
                .modal-body {
                    overflow: hidden;
                }
                .exon-container {
                    position: relative;
                    height: 350px;
                    width: 100%;
                    background: #f9f9f9;
                }
                .exon-visualization-container {
                    height: 100%;
                    width: 100%;
                    background: linear-gradient(to bottom, #ffffff, #f9f9f9);
                }
                .exon-tooltip {
                    background-color: rgba(255, 255, 255, 0.95);
                    border-radius: 5px;
                    padding: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                    font-size: 14px;
                    z-index: 1000;
                }
                .exon-tooltip h6 {
                    border-bottom: 1px solid #eee;
                    padding-bottom: 5px;
                    margin-bottom: 5px;
                    color: #333;
                    font-size: 16px;
                }
                .exon-svg {
                    background: linear-gradient(to bottom, #ffffff, #f9f9f9);
                }
                .stat-card {
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .stat-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                }
                .stat-value {
                    font-size: 1.5rem;
                    font-weight: bold;
                }
                .chromosome-info {
                    font-size: 14px;
                    color: #555;
                    font-style: italic;
                }
                .text-header {
                    font-size: 14px;
                    margin-bottom: 5px;
                }
                .exon-label {
                    dominant-baseline: middle;
                    user-select: none;
                    text-shadow: 0px 1px 2px rgba(0,0,0,0.7);
                    font-size: 13px;
                    letter-spacing: 0.5px;
                }
                .exon-group {
                    cursor: pointer;
                }
                .exon-group:hover .exon {
                    filter: brightness(110%);
                }
                .exon-group:hover .exon-label {
                    font-weight: bolder;
                    text-shadow: 0px 1px 3px rgba(0,0,0,0.9);
                }
            `,document.head.appendChild(t)}let s=new bootstrap.Modal(i);i.addEventListener("shown.bs.modal",()=>{let e=document.getElementById("exonVisualizationContainer"),n=document.getElementById("exonStatsContainer"),i=function(t,e,n=null){if(!t||"string"!=typeof t){e.innerHTML='<div class="alert alert-warning">No exon information available</div>';return}try{let a=t.replace(/^\[|\]$/g,"").split(",");if(0===a.length){e.innerHTML='<div class="alert alert-warning">No exons found</div>';return}let r=a.map(t=>{let[e,o]=t.split("-").map(Number);return{start:e,end:o,length:o-e+1}});r.sort((t,e)=>t.start-e.start),e.innerHTML="";let i=document.createElement("div");i.className="exon-visualization-container",i.style.width="100%",i.style.height="300px",i.style.position="relative",e.appendChild(i),window.d3?o(r,i,e,n):new Promise((t,e)=>{if(window.d3)return void t();let o=document.createElement("script");o.src="https://d3js.org/d3.v7.min.js",o.onload=()=>t(),o.onerror=t=>e(t),document.head.appendChild(o)}).then(()=>o(r,i,e,n))}catch(o){console.error("Error parsing exons:",o),e.innerHTML=`<div class="alert alert-warning">Could not parse exon information: ${t}</div>`}}(t,e,r),s=document.getElementById("exportExonSvgBtn");if(s&&s.addEventListener("click",()=>{!function(t,e){let o=t.querySelector("svg");if(!o){console.error("No SVG element found in container"),a("error","Failed to export SVG: No visualization found");return}try{let t=function(t){let e=t.cloneNode(!0);e.style.background="white",e.setAttribute("xmlns","http://www.w3.org/2000/svg"),e.setAttribute("xmlns:xlink","http://www.w3.org/1999/xlink");let o=document.createElementNS("http://www.w3.org/2000/svg","style");return o.textContent=function(){let t=document.styleSheets,e="",o=[".exon",".intron",".exon-svg","svg","rect","path","line","text","g","circle","polyline","polygon"];try{for(let n=0;n<t.length;n++){let a=t[n];try{let t=a.cssRules||a.rules;if(!t)continue;for(let n=0;n<t.length;n++){let a=t[n];a.selectorText&&o.some(t=>a.selectorText.includes(t))&&(e+=a.cssText+"\n")}}catch(t){console.warn("Could not access stylesheet:",t)}}}catch(t){console.warn("Error extracting styles:",t)}return e+=`
        .exon { fill-opacity: 1; stroke-width: 2px; }
        .intron { stroke-dasharray: 5,5; }
        text { font-family: Arial, sans-serif; }
        .exon:hover { stroke: #ff7f0e; stroke-width: 2px; }
    `}(),e.insertBefore(o,e.firstChild),new XMLSerializer().serializeToString(e)}(o),n=new Blob([t],{type:"image/svg+xml;charset=utf-8"}),r=document.createElement("a");r.href=URL.createObjectURL(n),r.download=`${e}.svg`,r.style.display="none",document.body.appendChild(r),r.click(),setTimeout(()=>{document.body.removeChild(r),URL.revokeObjectURL(r.href),a("success","SVG exported successfully!")},100)}catch(t){console.error("Error exporting SVG:",t),a("error",`Failed to export SVG: ${t.message}`)}}(e,r?`exon_structure_chr${r.chrom}_${new Date().toISOString().slice(0,10)}`:`exon_structure_${new Date().toISOString().slice(0,10)}`)}),i){let t=(i.exonLength/i.totalLength*100).toFixed(1),e=(i.intronLength/i.totalLength*100).toFixed(1);n.innerHTML=`
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-light">
            <h6 class="mb-0 fw-bold">Transcript Structure Statistics</h6>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-4">
                <div class="stat-card p-3 border bg-primary bg-opacity-10 text-center h-100">
                  <div class="d-flex flex-column h-100">
                    <div class="mb-2">
                      <i class="bi bi-box me-1"></i>
                      <h6 class="mb-0">Exons</h6>
                    </div>
                    <div class="flex-grow-1 d-flex flex-column justify-content-center">
                      <div class="stat-value">${i.exonCount}</div>
                      <div class="text-muted small">
                        ${i.exonLength.toLocaleString()} bp (${t}%)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="stat-card p-3 border bg-secondary bg-opacity-10 text-center h-100">
                  <div class="d-flex flex-column h-100">
                    <div class="mb-2">
                      <i class="bi bi-dash-lg me-1"></i>
                      <h6 class="mb-0">Introns</h6>
                    </div>
                    <div class="flex-grow-1 d-flex flex-column justify-content-center">
                      <div class="stat-value">${i.intronCount}</div>
                      <div class="text-muted small">
                        ${i.intronLength.toLocaleString()} bp (${e}%)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="stat-card p-3 border bg-info bg-opacity-10 text-center h-100">
                  <div class="d-flex flex-column h-100">
                    <div class="mb-2">
                      <i class="bi bi-rulers me-1"></i>
                      <h6 class="mb-0">Total Length</h6>
                    </div>
                    <div class="flex-grow-1 d-flex flex-column justify-content-center">
                      <div class="stat-value">${i.totalLength.toLocaleString()}</div>
                      <div class="text-muted small">
                        base pairs
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              ${r?`
              <div class="col-12 mt-3">
                <div class="alert alert-info mb-0">
                  <i class="bi bi-info-circle me-2"></i>
                  <strong>Chromosome Location:</strong>
                  Chr${r.chrom}${r.strand?`, Strand: ${r.strand}`:""}
                  (${r.start?.toLocaleString()||""}-${r.end?.toLocaleString()||""})
                </div>
              </div>
              `:""}
            </div>
          </div>
        </div>
      `}}),s.show()}function a(t,e){let o=document.getElementById("exportNotification");o&&o.remove();let n=document.createElement("div");if(n.id="exportNotification",n.className=`export-notification ${t}`,n.innerHTML=`
        <div class="d-flex align-items-center">
            <i class="bi ${"success"===t?"bi-check-circle":"bi-exclamation-triangle"} me-2"></i>
            <span>${e}</span>
        </div>
    `,!document.getElementById("export-notification-styles")){let t=document.createElement("style");t.id="export-notification-styles",t.textContent=`
            .export-notification {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 10px 20px;
                border-radius: 4px;
                color: white;
                box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                z-index: 9999;
                animation: fadeInOut 3s forwards;
            }
            .export-notification.success {
                background-color: #28a745;
            }
            .export-notification.error {
                background-color: #dc3545;
            }
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(20px); }
                10% { opacity: 1; transform: translateY(0); }
                80% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-20px); }
            }
        `,document.head.appendChild(t)}document.body.appendChild(n),setTimeout(()=>{n.parentNode&&n.parentNode.removeChild(n)},3e3)}Object.defineProperty(t.exports,"showExonVisualizationModal",{get:()=>n,set:void 0,enumerable:!0,configurable:!0})});
//# sourceMappingURL=exonVisualization.5b6e4922.js.map
