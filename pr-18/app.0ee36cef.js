const e="1.1.0",t=["Node ranking by property, degree, and centrality","Clear highlights button functionality","Enhanced tooltip functionality with improved styling","Improved walks panel with advanced search functionality","Gene annotation functionality and enhanced graph data structure","Global alert utility for system notifications","Bootstrap integration for improved styling","Enhanced gene file upload functionality and handling","Support for raw text file transformation","Improved JSON editor with mode selection and keyboard shortcuts","Aurora IDs file upload functionality and enhanced walk filtering"],a=["Improved highlightNode function to handle existing highlights and node not found errors","Updated label data attributes for consistency","Enhanced walk sorting logic","Sorted overlapping genes by overlap percentage","Various UI and styling improvements"],i="aurora_release_notes_seen";function o(){let o=document.getElementById("releaseNotesModal");o||((o=document.createElement("div")).id="releaseNotesModal",o.className="modal fade",o.tabIndex=-1,o.setAttribute("aria-labelledby","releaseNotesModalLabel"),o.setAttribute("aria-hidden","true"),o.innerHTML=`
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="releaseNotesModalLabel">
                            <i class="bi bi-lightning-charge-fill me-2"></i>
                            Aurora ${e} - Release Notes
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="release-date mb-3">
                            <span class="badge bg-secondary">2025-04-08</span>
                        </div>

                        <div class="mb-4">
                            <h5><i class="bi bi-stars me-2"></i>New Features</h5>
                            <ul class="list-group">
                                ${t.map(e=>`<li class="list-group-item">
                                        <i class="bi bi-check-circle-fill text-success me-2"></i>
                                        ${e}
                                    </li>`).join("")}
                            </ul>
                        </div>

                        <div>
                            <h5><i class="bi bi-tools me-2"></i>Bug Fixes</h5>
                            <ul class="list-group">
                                ${a.map(e=>`<li class="list-group-item">
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
        `,document.body.appendChild(o),document.getElementById("doNotShowAgainCheck").addEventListener("change",function(){this.checked?localStorage.setItem(i,e):localStorage.removeItem(i)}),document.getElementById("viewFullChangelogBtn").addEventListener("click",function(){window.open("https://github.com/cauliyang/aurora/blob/main/CHANGELOG.md","_blank")})),new bootstrap.Modal(o).show()}function l(){localStorage.getItem(i)!==e&&setTimeout(()=>{o()},1e3);let t=document.getElementById("showReleaseNotesBtn");t&&t.addEventListener("click",e=>{e.preventDefault(),o()})}window.showReleaseNotes=o,window.initReleaseNotes=l,document.addEventListener("DOMContentLoaded",l);
//# sourceMappingURL=app.0ee36cef.js.map
