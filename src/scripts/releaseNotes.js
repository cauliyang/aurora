/**
 * Release Notes Popup
 * Shows release notes as a modal popup when users open the web app
 */

// Get release notes from the latest version in the CHANGELOG
const RELEASE_NOTES = {
  version: "1.1.0",
  date: "2025-04-08",
  features: [
    "Node ranking by property, degree, and centrality",
    "Clear highlights button functionality",
    "Enhanced tooltip functionality with improved styling",
    "Improved walks panel with advanced search functionality",
    "Gene annotation functionality and enhanced graph data structure",
    "Global alert utility for system notifications",
    "Bootstrap integration for improved styling",
    "Enhanced gene file upload functionality and handling",
    "Support for raw text file transformation",
    "Improved JSON editor with mode selection and keyboard shortcuts",
    "Aurora IDs file upload functionality and enhanced walk filtering",
  ],
  fixes: [
    "Improved highlightNode function to handle existing highlights and node not found errors",
    "Updated label data attributes for consistency",
    "Enhanced walk sorting logic",
    "Sorted overlapping genes by overlap percentage",
    "Various UI and styling improvements",
  ],
};

// Local Storage key to track when release notes were last shown
const RELEASE_NOTES_SEEN_KEY = "aurora_release_notes_seen";

/**
 * Check if release notes should be shown
 * @returns {boolean} True if release notes should be shown
 */
function shouldShowReleaseNotes() {
  // Get the last version the user has seen
  const lastSeenVersion = localStorage.getItem(RELEASE_NOTES_SEEN_KEY);

  // Show notes if user hasn't seen this version
  return lastSeenVersion !== RELEASE_NOTES.version;
}

/**
 * Mark release notes as seen
 */
function markReleaseNotesSeen() {
  localStorage.setItem(RELEASE_NOTES_SEEN_KEY, RELEASE_NOTES.version);
}

/**
 * Show release notes in a modal dialog
 */
function showReleaseNotes() {
  // Check if we already created a modal
  let modal = document.getElementById("releaseNotesModal");

  // Create the modal if it doesn't exist
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "releaseNotesModal";
    modal.className = "modal fade";
    modal.tabIndex = -1;
    modal.setAttribute("aria-labelledby", "releaseNotesModalLabel");
    modal.setAttribute("aria-hidden", "true");

    // Build modal content
    modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="releaseNotesModalLabel">
                            <i class="bi bi-lightning-charge-fill me-2"></i>
                            Aurora ${RELEASE_NOTES.version} - Release Notes
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="release-date mb-3">
                            <span class="badge bg-secondary">${
                              RELEASE_NOTES.date
                            }</span>
                        </div>
                        
                        <div class="mb-4">
                            <h5><i class="bi bi-stars me-2"></i>New Features</h5>
                            <ul class="list-group">
                                ${RELEASE_NOTES.features
                                  .map(
                                    (feature) =>
                                      `<li class="list-group-item">
                                        <i class="bi bi-check-circle-fill text-success me-2"></i>
                                        ${feature}
                                    </li>`
                                  )
                                  .join("")}
                            </ul>
                        </div>
                        
                        <div>
                            <h5><i class="bi bi-tools me-2"></i>Bug Fixes</h5>
                            <ul class="list-group">
                                ${RELEASE_NOTES.fixes
                                  .map(
                                    (fix) =>
                                      `<li class="list-group-item">
                                        <i class="bi bi-bug-fill text-danger me-2"></i>
                                        ${fix}
                                    </li>`
                                  )
                                  .join("")}
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
        `;

    // Add the modal to the document
    document.body.appendChild(modal);

    // Handle "Don't show again" checkbox
    document
      .getElementById("doNotShowAgainCheck")
      .addEventListener("change", function () {
        if (this.checked) {
          markReleaseNotesSeen();
        } else {
          localStorage.removeItem(RELEASE_NOTES_SEEN_KEY);
        }
      });

    // Handle "View Full Changelog" button
    document
      .getElementById("viewFullChangelogBtn")
      .addEventListener("click", function () {
        // You could either:
        // 1. Open a new page with the full changelog
        window.open(
          "https://github.com/cauliyang/aurora/blob/main/CHANGELOG.md",
          "_blank"
        );

        // 2. Or dismiss this modal and show another with the full changelog
        // const bsModal = bootstrap.Modal.getInstance(document.getElementById('releaseNotesModal'));
        // bsModal.hide();
        // showFullChangelog();
      });
  }

  // Show the modal
  const bsModal = new bootstrap.Modal(modal);
  bsModal.show();
}

/**
 * Initialize release notes functionality
 * Should be called when the page loads
 */
function initReleaseNotes() {
  // Check if we should show release notes
  if (shouldShowReleaseNotes()) {
    // Wait a short time to let the page load
    setTimeout(() => {
      showReleaseNotes();
    }, 1000); // Show after 1 second
  }

  // Add event listener for the "What's New" button in navbar
  const showReleaseNotesBtn = document.getElementById("showReleaseNotesBtn");
  if (showReleaseNotesBtn) {
    showReleaseNotesBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showReleaseNotes();
    });
  }
}

// Export functions for use in other files
window.showReleaseNotes = showReleaseNotes;
window.initReleaseNotes = initReleaseNotes;

// Initialize when the document is loaded
document.addEventListener("DOMContentLoaded", initReleaseNotes);
