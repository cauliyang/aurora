const e={version:"1.1.0",date:"2025-04-08",features:["Node ranking by property, degree, and centrality","Clear highlights button functionality","Enhanced tooltip functionality with improved styling","Improved walks panel with advanced search functionality","Gene annotation functionality and enhanced graph data structure","Global alert utility for system notifications","Bootstrap integration for improved styling","Enhanced gene file upload functionality and handling","Support for raw text file transformation","Improved JSON editor with mode selection and keyboard shortcuts","Aurora IDs file upload functionality and enhanced walk filtering"],fixes:["Improved highlightNode function to handle existing highlights and node not found errors","Updated label data attributes for consistency","Enhanced walk sorting logic","Sorted overlapping genes by overlap percentage","Various UI and styling improvements"]},t="aurora_release_notes_seen";function a(){let a=document.getElementById("releaseNotesModal");a||((a=document.createElement("div")).id="releaseNotesModal",a.className="modal fade",a.tabIndex=-1,a.setAttribute("aria-labelledby","releaseNotesModalLabel"),a.setAttribute("aria-hidden","true"),a.innerHTML=`
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="releaseNotesModalLabel">
                            <i class="bi bi-lightning-charge-fill me-2"></i>
                            Aurora ${e.version} - Release Notes
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="release-date mb-3">
                            <span class="badge bg-secondary">${e.date}</span>
                        </div>

                        <div class="mb-4">
                            <h5><i class="bi bi-stars me-2"></i>New Features</h5>
                            <ul class="list-group">
                                ${e.features.map(e=>`<li class="list-group-item">
                                        <i class="bi bi-check-circle-fill text-success me-2"></i>
                                        ${e}
                                    </li>`).join("")}
                            </ul>
                        </div>

                        <div>
                            <h5><i class="bi bi-tools me-2"></i>Bug Fixes</h5>
                            <ul class="list-group">
                                ${e.fixes.map(e=>`<li class="list-group-item">
                                        <i class="bi bi-bug-fill text-danger me-2"></i>
                                        ${e}
                                    </li>`).join("")}
                            </ul>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <div class="form-check me-auto">
                            <input class="form-check-input" type="checkbox" id="doNotShowAgainCheck">
                            <label class="form-check-label" for="doNotShowAgainCheck">
                                Don't show for this version again
                            </label>
                        </div>
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" id="viewFullChangelogBtn">
                            View Full Changelog
                        </button>
                    </div>
                </div>
            </div>
        `,document.body.appendChild(a),document.getElementById("doNotShowAgainCheck").addEventListener("change",function(){this.checked?localStorage.setItem(t,e.version):localStorage.removeItem(t)}),document.getElementById("viewFullChangelogBtn").addEventListener("click",function(){window.open("https://github.com/cauliyang/aurora/blob/main/CHANGELOG.md","_blank")})),new bootstrap.Modal(a).show()}function i(){localStorage.getItem(t)!==e.version&&setTimeout(()=>{a()},1e3);let i=document.getElementById("showReleaseNotesBtn");i&&i.addEventListener("click",e=>{e.preventDefault(),a()})}window.showReleaseNotes=a,window.initReleaseNotes=i,document.addEventListener("DOMContentLoaded",i);
//# sourceMappingURL=app.976b73bf.js.map
