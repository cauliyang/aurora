const e="1.2.0",t=["Breakpoint Circle Plot: publication-quality hg38 karyotype with directional chord ribbons, SV-type coloring (INV/DEL/DUP/TRA/IT**/IC**), legend filtering, dedup/expand modes, count badges, and SVG export",'Renamed user-facing "Aurora ID" to "GTAViz ID" across the walks panel, help guide, alerts, and tooltips',"Edge info panel now surfaces breakpoint coordinates and an inline 'View on Circle Plot' shortcut","Modernized UI with Aurora glassmorphism theme and CSS variable design system","Redesigned landing page, info panel, toolbar, and compact footer","Improved HTML semantics and accessibility (ARIA labels, keyboard navigation)","Unified icon system with Bootstrap Icons across the entire app","Interactive help guide with step-by-step tour and keyboard shortcuts","Consistent color theming via Aurora CSS variables (no more hardcoded colors)"],o=["Circle plot: SV-type legend now hides matching count badges in addition to ribbons when toggled off","Circle plot: direction-preserving grouping by (chr1,pos1,chr2,pos2,svType) with perpendicular offset for co-located different-SVTYPE edges","Circle plot: distinct color per SV type (ITTL/ITPL/ICRL no longer share hues)","Switched circle-plot module to static import to avoid stale dynamic-chunk failures after dev-server restarts","Fixed upload button unresponsive due to CSS overflow clipping","Fixed broken optional chaining syntax across event handlers","Fixed memory leaks in exon modal and graph selector listeners","Fixed global CSS leaks affecting h3 styles and container padding","Fixed @keyframes animation conflicts between stylesheets","Removed ~1,500 lines of dead code and ~50 debug console.log statements"],a="aurora_release_notes_seen";function i(){let i=document.getElementById("releaseNotesModal");i||((i=document.createElement("div")).id="releaseNotesModal",i.className="modal fade",i.tabIndex=-1,i.setAttribute("aria-labelledby","releaseNotesModalLabel"),i.setAttribute("aria-hidden","true"),i.innerHTML=`
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header text-white" style="background: var(--aurora-gradient-accent)">
                        <h5 class="modal-title" id="releaseNotesModalLabel">
                            <i class="bi bi-lightning-charge-fill me-2"></i>
                            GTAViz ${e} - Release Notes
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="release-date mb-3">
                            <span class="badge bg-secondary">2026-06-18</span>
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
                                ${o.map(e=>`<li class="list-group-item">
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
        `,document.body.appendChild(i),document.getElementById("doNotShowAgainCheck").addEventListener("change",function(){this.checked?localStorage.setItem(a,e):localStorage.removeItem(a)}),document.getElementById("viewFullChangelogBtn").addEventListener("click",function(){window.open("https://github.com/cauliyang/aurora/blob/main/CHANGELOG.md","_blank")})),new bootstrap.Modal(i).show()}function s(){localStorage.getItem(a)!==e&&setTimeout(()=>{i()},1e3);let t=document.getElementById("showReleaseNotesBtn");t&&t.addEventListener("click",e=>{e.preventDefault(),i()})}window.showReleaseNotes=i,window.initReleaseNotes=s,document.addEventListener("DOMContentLoaded",s);
//# sourceMappingURL=app.80d43ccc.js.map
