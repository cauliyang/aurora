/**
 * helpGuide.js
 * A module to manage a step-by-step help guide for the Aurora application
 */

class HelpGuide {
  constructor() {
    this.helpSteps = [
      // Panel help messages first
      {
        target: "#cy",
        title: "Graph Visualization Panel",
        content:
          "This is the main graph visualization area. Here you can interact with your graph: zoom in/out, pan, select nodes and edges, and visualize your data structure. You can click and drag nodes to rearrange them manually.",
        placement: "left",
      },
      {
        target: "#info",
        title: "Information Panel",
        content:
          "When you select a node or edge in the graph, detailed information about that element will be displayed here. This panel shows properties, metrics, and other attributes associated with the selected element.",
        placement: "left",
      },
      {
        target: "#walks",
        title: "Graph Walks Panel",
        content:
          "This panel displays all walks (paths) in your graph. You can search for specific walks, highlight them in the graph visualization, and upload Aurora IDs for batch searching. Walks provide important connectivity information in your graph structure.",
        placement: "left",
      },

      // Button help messages next
      {
        target: "#toggleMaximize",
        title: "Toggle Fullscreen",
        content:
          "Click this button to enter or exit fullscreen mode, giving you more space to work with your graph.",
        placement: "bottom",
      },
      {
        target: "#uploadForm",
        title: "Upload Files",
        content:
          "Upload your JSON or TSG files here to visualize your graph data.",
        placement: "bottom",
      },
      {
        target: "#captureGraph",
        title: "Capture Graph",
        content:
          "Save your current graph view as a PNG image to use in presentations or documentation.",
        placement: "bottom",
      },
      {
        target: "#hiddenLabel",
        title: "Toggle Labels",
        content:
          "Show or hide node and edge labels to customize your graph visualization.",
        placement: "bottom",
      },
      {
        target: "#toggleTooltip",
        title: "Toggle Tooltips",
        content:
          "Enable or disable tooltips that show information when hovering over graph elements.",
        placement: "bottom",
      },
      {
        target: "#resetGraph",
        title: "Reset Graph",
        content: "Reset the graph layout to its original state.",
        placement: "bottom",
      },
      {
        target: "#clearHighlights",
        title: "Clear Highlights",
        content: "Remove all highlights from nodes in the graph.",
        placement: "bottom",
      },
      {
        target: "#geneAnnotationBtn",
        title: "Gene Annotations",
        content:
          "Add biological context to your graph by annotating nodes with gene information.",
        placement: "bottom",
      },
      {
        target: "#layoutSelect",
        title: "Layout Selection",
        content:
          "Choose different layout algorithms to organize your graph in various ways.",
        placement: "bottom",
      },

      // Graph selection and filtering parameters
      {
        target: "#graphSelectorContainer",
        title: "Graph Selector",
        content:
          "If your data contains multiple graphs, you can switch between them using this dropdown menu. Each graph represents a different dataset or view that you can analyze independently.",
        placement: "bottom",
      },
      {
        target: "#minEdgeWeight",
        title: "Minimum Edge Weight",
        content:
          "Filter the graph by setting the minimum weight for edges. Edges with weights below this value will be hidden, allowing you to focus on the strongest connections in your graph.",
        placement: "bottom",
      },
      {
        target: "#MinDepth",
        title: "Minimum Depth",
        content:
          "Set the minimum depth for graph traversal. This limits the graph to only show paths that have at least this many edges, helping to filter out shallow or less significant paths.",
        placement: "bottom",
      },
      {
        target: "#MaxDepth",
        title: "Maximum Depth",
        content:
          "Set the maximum depth for graph traversal. This prevents the graph from showing excessively long paths, making the visualization more manageable and focused on the most relevant connections.",
        placement: "bottom",
      },

      {
        target: "#openJsonEditor",
        title: "JSON Editor",
        content:
          "Open the JSON editor to view or modify the underlying graph data structure.",
        placement: "left",
      },
      {
        target: "#redirectToIgv",
        title: "IGV Browser",
        content:
          "Launch the Integrative Genomics Viewer for detailed genomic visualization.",
        placement: "left",
      },
      {
        target: "#showNodeRanking",
        title: "Node Ranking",
        content: "View nodes ranked by importance based on graph metrics.",
        placement: "left",
      },
      {
        target: "#walkSearch",
        title: "Search Walks",
        content: "Search for specific walks or Aurora IDs in the graph.",
        placement: "top",
      },
      {
        target: "#uploadAuroraIds",
        title: "Batch Search",
        content:
          "Upload a list of Aurora IDs for batch searching across your graph.",
        placement: "top",
      },
    ];

    this.currentStepIndex = 0;
    this.isGuideActive = false;
    this.overlay = null;
    this.tooltip = null;

    // Load guide progress from local storage
    this.loadProgress();

    // Add help button to the navbar - modified to place button in left navbar
    this.addHelpButton();

    // Show welcome message for first-time visitors
    this.showWelcomeIfFirstVisit();
  }

  /**
   * Show welcome message for first-time visitors
   * Now displays in the left bottom corner of the screen
   */
  showWelcomeIfFirstVisit() {
    const hasVisitedBefore = localStorage.getItem("auroraHelpGuideWelcomeSeen");

    if (!hasVisitedBefore) {
      // Create a welcome toast instead of a modal
      const toastHtml = `
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
      `;

      // Add CSS for the welcome toast
      const style = document.createElement("style");
      style.textContent = `
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
      `;
      document.head.appendChild(style);

      // Append toast to body
      const toastContainer = document.createElement("div");
      toastContainer.innerHTML = toastHtml;
      document.body.appendChild(toastContainer);

      // Add event listeners
      document
        .querySelector(".help-guide-welcome-close")
        .addEventListener("click", () => {
          document.querySelector(".help-guide-welcome-toast").remove();
          localStorage.setItem("auroraHelpGuideWelcomeSeen", "true");
        });

      document
        .getElementById("startWelcomeHelpBtn")
        .addEventListener("click", () => {
          document.querySelector(".help-guide-welcome-toast").remove();
          localStorage.setItem("auroraHelpGuideWelcomeSeen", "true");
          this.startGuide();
        });

      // Auto-hide after 30 seconds if not interacted with
      setTimeout(() => {
        const toast = document.querySelector(".help-guide-welcome-toast");
        if (toast) {
          toast.style.animation = "slideInUp 0.4s ease-out reverse";
          setTimeout(() => {
            if (toast.parentNode) {
              toast.remove();
              localStorage.setItem("auroraHelpGuideWelcomeSeen", "true");
            }
          }, 400);
        }
      }, 30000);
    }
  }

  /**
   * Add a help button to the navbar for users to start the guide
   * Now placing it after the "What's New" link
   */
  addHelpButton() {
    // Find the "What's New" nav item
    const whatsNewNavItem = document.getElementById("showReleaseNotesBtn");

    if (whatsNewNavItem) {
      // Create a new nav item for the help guide
      const helpNavItem = document.createElement("li");
      helpNavItem.className = "nav-item";

      // Create the help button with nav-link styling to match other navbar links
      const helpButton = document.createElement("a");
      helpButton.id = "helpGuideButton";
      helpButton.className = "nav-link";
      helpButton.href = "#";
      helpButton.title = "Start Help Guide";
      helpButton.innerHTML = '<i class="bi bi-question-circle"></i> Help';
      helpButton.addEventListener("click", (e) => {
        e.preventDefault(); // Prevent default link behavior
        this.startGuide();
      });

      // Add the button to the nav item
      helpNavItem.appendChild(helpButton);

      // Find the parent ul of whatsNewNavItem
      const navParent = whatsNewNavItem.closest("ul");

      // Get the list item containing the "What's New" link
      const whatsNewLi = whatsNewNavItem.closest("li");

      // Insert the help nav item after the "What's New" nav item
      if (whatsNewLi && navParent) {
        navParent.insertBefore(helpNavItem, whatsNewLi.nextSibling);
      }
    }
  }

  /**
   * Start or continue the help guide
   */
  startGuide() {
    if (this.isGuideActive) return;

    this.isGuideActive = true;

    // Create overlay
    this.createOverlay();

    // Always start from the first step when manually clicking the help button
    // This fixes the issue with tooltips appearing off-screen
    this.showStep(0);
  }

  /**
   * Create a semi-transparent overlay with a tooltip
   */
  createOverlay() {
    // Create overlay if it doesn't exist
    if (!this.overlay) {
      this.overlay = document.createElement("div");
      this.overlay.className = "help-guide-overlay";
      document.body.appendChild(this.overlay);

      // Add CSS for overlay
      const style = document.createElement("style");
      style.textContent = `
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
                }
                
                .target-highlight {
                    position: relative;
                    z-index: 9999;
                    pointer-events: auto;
                }
            `;
      document.head.appendChild(style);
    }

    // Create tooltip if it doesn't exist
    if (!this.tooltip) {
      this.tooltip = document.createElement("div");
      this.tooltip.className = "help-guide-tooltip";
      document.body.appendChild(this.tooltip);
    }
  }

  /**
   * Show a specific step in the guide
   * @param {number} index - The index of the step to show
   */
  showStep(index) {
    // Ensure index is valid
    if (index < 0 || index >= this.helpSteps.length) {
      this.endGuide();
      return;
    }

    this.currentStepIndex = index;

    // Get target element
    const step = this.helpSteps[index];
    const targetElement = document.querySelector(step.target);

    if (!targetElement) {
      console.error(`Target element ${step.target} not found`);
      this.nextStep();
      return;
    }

    // Make target element visible through overlay
    targetElement.classList.add("target-highlight");

    // First make sure the element is in view
    this.scrollElementIntoView(targetElement).then(() => {
      // Position tooltip near target after scrolling
      this.positionTooltip(targetElement, step.placement);

      // Update tooltip content
      this.tooltip.innerHTML = `
        <h5>${step.title}</h5>
        <p>${step.content}</p>
        <div class="help-guide-buttons">
          <button id="helpGuidePrev" class="btn btn-sm btn-outline-secondary"${
            index === 0 ? " disabled" : ""
          }>
            <i class="bi bi-chevron-left"></i> Previous
          </button>
          <span>${index + 1} of ${this.helpSteps.length}</span>
          <button id="helpGuideNext" class="btn btn-sm btn-outline-primary">
            ${
              index === this.helpSteps.length - 1
                ? 'Finish <i class="bi bi-check-lg"></i>'
                : 'Next <i class="bi bi-chevron-right"></i>'
            }
          </button>
        </div>
      `;

      // Add event listeners to navigation buttons
      document.getElementById("helpGuidePrev").addEventListener("click", () => {
        this.previousStep();
      });

      document.getElementById("helpGuideNext").addEventListener("click", () => {
        this.nextStep();
      });

      // Save progress
      this.saveProgress();
    });
  }

  /**
   * Position the tooltip relative to the target element
   * @param {HTMLElement} targetElement - The target element
   * @param {string} placement - The preferred placement (top, bottom, left, right)
   */
  positionTooltip(targetElement, placement) {
    // Ensure the target element is visible first
    this.scrollElementIntoView(targetElement);

    // Get fresh measurements after scrolling
    const targetRect = targetElement.getBoundingClientRect();

    // Wait a moment for the scroll to complete before positioning the tooltip
    setTimeout(() => {
      const tooltipRect = this.tooltip.getBoundingClientRect();

      // Calculate position based on placement
      let top, left;
      const margin = 15; // Increased margin for better visibility

      // First try the preferred placement
      switch (placement) {
        case "top":
          top = targetRect.top - tooltipRect.height - margin;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case "bottom":
          top = targetRect.bottom + margin;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case "left":
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.left - tooltipRect.width - margin;
          break;
        case "right":
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.right + margin;
          break;
        default:
          top = targetRect.bottom + margin;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
      }

      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust position if tooltip would be outside viewport
      // Left edge check
      if (left < margin) {
        left = margin;
      }
      // Right edge check
      if (left + tooltipRect.width > viewportWidth - margin) {
        left = viewportWidth - tooltipRect.width - margin;
      }

      // Top edge check
      if (top < margin) {
        // If it would be off the top, try to place it at the bottom instead
        if (placement === "top") {
          top = targetRect.bottom + margin; // Try bottom placement instead
        } else {
          top = margin;
        }
      }

      // Bottom edge check
      if (top + tooltipRect.height > viewportHeight - margin) {
        // If it would be off the bottom, try to place it at the top instead
        if (placement === "bottom") {
          top = targetRect.top - tooltipRect.height - margin; // Try top placement instead

          // If that would still be off the top of the viewport, place at the top with margin
          if (top < margin) {
            top = margin;
          }
        } else {
          // Otherwise, position it so the bottom of the tooltip is just within the viewport
          top = viewportHeight - tooltipRect.height - margin;
        }
      }

      // Set tooltip position
      this.tooltip.style.top = `${top}px`;
      this.tooltip.style.left = `${left}px`;
    }, 250); // Small delay to ensure scrolling has completed
  }

  /**
   * Scroll an element into view if it's not already visible
   * @param {HTMLElement} element - The element to scroll into view
   */
  scrollElementIntoView(element) {
    const elementRect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const isInView =
      elementRect.top >= 0 &&
      elementRect.left >= 0 &&
      elementRect.bottom <= viewportHeight &&
      elementRect.right <= window.innerWidth;

    if (!isInView) {
      // Scroll element into view with some margin
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });

      // Give some time for scroll to complete
      return new Promise((resolve) => setTimeout(resolve, 200));
    }
    return Promise.resolve();
  }

  /**
   * Move to the next step in the guide
   */
  nextStep() {
    // Remove highlight from current target
    const currentStep = this.helpSteps[this.currentStepIndex];
    const currentTarget = document.querySelector(currentStep.target);
    if (currentTarget) {
      currentTarget.classList.remove("target-highlight");
    }

    // Move to next step or end guide if at last step
    if (this.currentStepIndex === this.helpSteps.length - 1) {
      this.endGuide();
    } else {
      this.showStep(this.currentStepIndex + 1);
    }
  }

  /**
   * Move to the previous step in the guide
   */
  previousStep() {
    // Remove highlight from current target
    const currentStep = this.helpSteps[this.currentStepIndex];
    const currentTarget = document.querySelector(currentStep.target);
    if (currentTarget) {
      currentTarget.classList.remove("target-highlight");
    }

    // Move to previous step if not at first step
    if (this.currentStepIndex > 0) {
      this.showStep(this.currentStepIndex - 1);
    }
  }

  /**
   * End the help guide
   */
  endGuide() {
    this.isGuideActive = false;

    // Remove highlight from current target
    const currentStep = this.helpSteps[this.currentStepIndex];
    if (currentStep) {
      const currentTarget = document.querySelector(currentStep.target);
      if (currentTarget) {
        currentTarget.classList.remove("target-highlight");
      }
    }

    // Remove overlay and tooltip
    if (this.overlay) {
      document.body.removeChild(this.overlay);
      this.overlay = null;
    }

    if (this.tooltip) {
      document.body.removeChild(this.tooltip);
      this.tooltip = null;
    }

    // Reset current step index for next time
    this.saveProgress();
  }

  /**
   * Save the current progress to local storage
   */
  saveProgress() {
    localStorage.setItem(
      "auroraHelpGuideProgress",
      JSON.stringify({
        lastViewedStep: this.currentStepIndex,
        lastViewedDate: new Date().toISOString(),
      })
    );
  }

  /**
   * Load progress from local storage
   */
  loadProgress() {
    try {
      const savedProgress = JSON.parse(
        localStorage.getItem("auroraHelpGuideProgress")
      );
      if (savedProgress) {
        // Only restore progress if it's from the last 7 days
        const lastViewedDate = new Date(savedProgress.lastViewedDate);
        const now = new Date();
        const daysDiff = (now - lastViewedDate) / (1000 * 60 * 60 * 24);

        if (daysDiff <= 7) {
          this.currentStepIndex = savedProgress.lastViewedStep;
        }
      }
    } catch (error) {
      console.error("Error loading help guide progress:", error);
      this.currentStepIndex = 0;
    }
  }
}

// Initialize the help guide when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  window.auroraHelpGuide = new HelpGuide();
});
