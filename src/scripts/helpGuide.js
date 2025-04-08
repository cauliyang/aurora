/**
 * Help Guide System
 * Shows helpful popover messages for all buttons when users first open the application
 */

// Key for storing user preference in localStorage
const HELP_GUIDE_SEEN_KEY = "aurora_help_guide_seen";

// Tracking currently visible popovers
let activePopovers = [];
let popoverDisplayInterval;

// Map of button IDs to their help messages
const BUTTON_HELP = {
  // Navigation buttons
  showReleaseNotesBtn: "View the latest features and updates in Aurora",

  // Main toolbar buttons
  toggleMaximize: "Toggle fullscreen mode for a larger graph view",
  uploadInput: "Upload a JSON or TSG file to visualize your graph data",
  captureGraph: "Capture the current graph view as a PNG image",
  hiddenLabel: "Toggle visibility of node and edge labels",
  toggleTooltip:
    "Enable or disable tooltips when hovering over nodes and edges",
  resetGraph: "Reset the graph layout to default settings",
  clearHighlights: "Clear all highlighted nodes and edges",
  geneAnnotationBtn: "Configure gene annotation settings for your graph",

  // Layout and filter controls
  layoutSelect:
    "Choose different layout algorithms for your graph visualization",
  graphSelect: "Switch between multiple loaded graphs",
  minEdgeWeight: "Filter edges based on minimum weight value",
  MinDepth: "Set the minimum depth for path traversal",
  MaxDepth: "Set the maximum depth for path traversal",

  // Utility buttons
  openJsonEditor: "Open the JSON editor to view and modify graph data",
  redirectToIgv: "Open the Integrative Genomics Viewer (IGV)",
  showNodeRanking: "View ranked nodes based on their properties",
  walkSearch: "Search for specific walks or nodes in the graph",
  uploadAuroraIds: "Upload a list of Aurora IDs to highlight specific walks",
};

/**
 * Initialize the help guide system
 */
function initHelpGuide() {
  // Check if user has already seen the help guide
  if (localStorage.getItem(HELP_GUIDE_SEEN_KEY)) {
    return;
  }

  // Create help toggle button in the navigation bar
  createHelpToggle();

  // Show welcome message
  showWelcomeMessage();

  // Enable popovers for all buttons with a small delay
  setTimeout(() => {
    initializeHelpDisplay();
  }, 1000);
}

/**
 * Create a toggle button for the help system in the navbar
 */
function createHelpToggle() {
  const navbarNav = document.querySelector(".navbar-nav");
  if (!navbarNav) return;

  const helpToggleItem = document.createElement("li");
  helpToggleItem.className = "nav-item";
  helpToggleItem.innerHTML = `
    <a class="nav-link" href="#" id="toggleHelpGuide">
      <i class="bi bi-question-circle"></i> Help
    </a>
  `;

  navbarNav.appendChild(helpToggleItem);

  // Add event listener to toggle button
  document
    .getElementById("toggleHelpGuide")
    .addEventListener("click", toggleHelpGuide);
}

/**
 * Show welcome message with instructions
 */
function showWelcomeMessage() {
  window.showAlert(
    `<strong>Welcome to Aurora!</strong> <br>
    We'll show you how to use this application with helpful tips.
    <div class="mt-2">
      <button id="dismissHelp" class="btn btn-sm btn-primary">Got it, don't show again</button>
    </div>`,
    "info",
    0
  );

  // Add event listener to dismiss button
  setTimeout(() => {
    document.getElementById("dismissHelp")?.addEventListener("click", () => {
      dismissHelpGuide();
      document.querySelector(".alert")?.querySelector(".btn-close")?.click();
    });
  }, 100);
}

/**
 * Toggle the help guide on/off
 */
function toggleHelpGuide() {
  const helpEnabled = document.body.hasAttribute("data-help-enabled");

  if (helpEnabled) {
    // Disable all popovers
    hideAllPopovers();
    document.body.removeAttribute("data-help-enabled");
  } else {
    // Enable all popovers
    document.body.setAttribute("data-help-enabled", "true");
    initializeHelpDisplay();
  }
}

/**
 * Initialize and display help popovers
 */
function initializeHelpDisplay() {
  // Disable any existing popovers first
  hideAllPopovers();

  // Mark body as having help enabled
  document.body.setAttribute("data-help-enabled", "true");

  // Add custom styles for help popovers
  addHelpStyles();

  // Arrange buttons into groups based on their spatial location
  const buttonGroups = organizeButtonsIntoSpatialGroups();

  // Display one group at a time with delay between groups
  displayGroupsSequentially(buttonGroups);
}

/**
 * Organize buttons into spatial groups to avoid overlapping
 */
function organizeButtonsIntoSpatialGroups() {
  // Get all elements that should have help messages
  const elements = getAllHelpTargetElements();

  // Group elements by their spatial location
  const groups = [];
  let currentGroup = [];

  // Sort elements by their position from top to bottom, left to right
  const sortedElements = elements.sort((a, b) => {
    const rectA = a.element.getBoundingClientRect();
    const rectB = b.element.getBoundingClientRect();

    // If elements are on roughly the same horizontal line (within 40px)
    if (Math.abs(rectA.top - rectB.top) < 40) {
      return rectA.left - rectB.left;
    }
    return rectA.top - rectB.top;
  });

  // Group elements that are spatially close to each other
  sortedElements.forEach((item, index) => {
    const rect = item.element.getBoundingClientRect();

    // Start a new group if this is the first element or it's spatially distant from previous elements
    if (index === 0) {
      currentGroup = [item];
    } else {
      const prevRect =
        sortedElements[index - 1].element.getBoundingClientRect();

      // Check if current element is in a new "row" or far from previous element horizontally
      const isNewRow = rect.top - (prevRect.top + prevRect.height) > 20;
      const isFarHorizontally =
        rect.left - (prevRect.left + prevRect.width) > 200;

      if (isNewRow || isFarHorizontally) {
        // This element is spatially distant, so start a new group
        groups.push([...currentGroup]);
        currentGroup = [item];
      } else {
        // Add to current group
        currentGroup.push(item);
      }
    }

    // Add the last group if we're at the end
    if (index === sortedElements.length - 1) {
      groups.push([...currentGroup]);
    }
  });

  return groups;
}

/**
 * Get all elements that should have help messages
 */
function getAllHelpTargetElements() {
  const elements = [];

  // Add elements with explicit help messages
  Object.entries(BUTTON_HELP).forEach(([id, helpText]) => {
    const element =
      id === "uploadInput"
        ? document.querySelector(`label[for="${id}"]`)
        : document.getElementById(id);

    if (element) {
      elements.push({ element, helpText });
    }
  });

  // Add elements with title attributes
  document
    .querySelectorAll(".btn[title]:not([id]), button[title]:not([id])")
    .forEach((element) => {
      if (element.title) {
        elements.push({ element, helpText: element.title });
      }
    });

  return elements;
}

/**
 * Display groups of popovers sequentially with delays
 * @param {Array} groups - Array of element groups
 */
function displayGroupsSequentially(groups) {
  let currentGroupIndex = 0;

  // Function to display a single group of popovers
  const displayGroup = (group) => {
    // Hide previous group if there are more than 2 groups on screen
    if (activePopovers.length > 0 && currentGroupIndex > 1) {
      const prevGroup = groups[currentGroupIndex - 2];
      if (prevGroup) {
        prevGroup.forEach((item) => hidePopover(item.element));
      }
    }

    // Show popovers for current group with optimal placement
    group.forEach((item, index) => {
      // For elements in the same group, stagger their placement
      const placement = getOptimalPlacement(item.element, index, group.length);
      showPopover(item.element, item.helpText, placement);
    });
  };

  // Display first group immediately
  if (groups.length > 0) {
    displayGroup(groups[0]);
    currentGroupIndex = 1;

    // Schedule display of remaining groups
    if (groups.length > 1) {
      popoverDisplayInterval = setInterval(() => {
        if (currentGroupIndex >= groups.length) {
          clearInterval(popoverDisplayInterval);
          return;
        }

        displayGroup(groups[currentGroupIndex]);
        currentGroupIndex++;
      }, 3000); // Show each group after 3 seconds

      // Set a timeout to clear all popovers after a certain duration
      setTimeout(() => {
        clearInterval(popoverDisplayInterval);
        hideAllPopovers();
      }, 20000); // End the tour after 20 seconds
    }
  }
}

/**
 * Get optimal placement for a popover
 * @param {HTMLElement} element - The element to show popover for
 * @param {number} indexInGroup - Element's index in its group
 * @param {number} groupSize - Size of the element's group
 * @returns {string} Placement direction ('top', 'bottom', 'left', 'right')
 */
function getOptimalPlacement(element, indexInGroup, groupSize) {
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Check element's position relative to viewport
  const isNearTop = rect.top < 150;
  const isNearBottom = viewportHeight - rect.bottom < 150;
  const isNearLeft = rect.left < 150;
  const isNearRight = viewportWidth - rect.right < 150;

  // Distribute placements within the group
  if (groupSize <= 1) {
    // Single element in group, choose based on viewport position
    if (isNearTop) return isNearLeft ? "right" : "bottom";
    if (isNearBottom) return isNearLeft ? "right" : "top";
    if (isNearLeft) return "right";
    if (isNearRight) return "left";
    return "bottom"; // Default
  } else {
    // Multiple elements in group, distribute placements
    if (groupSize <= 2) {
      // For 2 elements, use left/right or top/bottom
      return indexInGroup === 0 ? "left" : "right";
    } else {
      // For 3+ elements, use a rotating pattern
      const placements = ["top", "right", "bottom", "left"];
      return placements[indexInGroup % placements.length];
    }
  }
}

/**
 * Show a popover for an element
 * @param {HTMLElement} element - The element to attach the popover to
 * @param {string} content - The content to show in the popover
 * @param {string} placement - Where to place the popover
 */
function showPopover(element, content, placement = "auto") {
  // Don't show popovers for hidden elements
  if (!isElementVisible(element)) return;

  // First remove any existing popover
  hidePopover(element);

  // Create a unique ID for this popover
  const popoverId = "popover-" + Math.random().toString(36).substring(2, 9);

  // Add data attribute to track which element has this popover
  element.setAttribute("data-popover-id", popoverId);

  // Create popover with specified placement
  const popover = new bootstrap.Popover(element, {
    content: content,
    trigger: "manual",
    placement: placement,
    container: "body",
    template: `
      <div class="popover help-popover" role="tooltip" id="${popoverId}">
        <div class="popover-arrow"></div>
        <div class="popover-body"></div>
      </div>
    `,
    animation: true,
    html: true,
    sanitize: false,
  });

  // Show the popover and add to active popovers
  popover.show();
  activePopovers.push(element);

  // Add a class to indicate this element has an active popover
  element.classList.add("has-active-help-popover");

  // Add click handler to dismiss popover when clicked
  setTimeout(() => {
    const popoverElement = document.getElementById(popoverId);
    if (popoverElement) {
      popoverElement.addEventListener("click", () => {
        hidePopover(element);
      });
    }
  }, 100);
}

/**
 * Check if an element is visible in the DOM
 */
function isElementVisible(element) {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  ) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Hide a popover for an element
 * @param {HTMLElement} element - The element whose popover should be hidden
 */
function hidePopover(element) {
  if (!element) return;

  // Remove from active popovers array
  activePopovers = activePopovers.filter((el) => el !== element);

  // Get the Bootstrap popover instance and destroy it
  const popover = bootstrap.Popover.getInstance(element);
  if (popover) {
    popover.hide();
    popover.dispose();
  }

  // Remove the active popover class
  element.classList.remove("has-active-help-popover");

  // Remove data attribute
  element.removeAttribute("data-popover-id");
}

/**
 * Hide all popovers
 */
function hideAllPopovers() {
  // Clear any interval that might be showing popovers
  if (popoverDisplayInterval) {
    clearInterval(popoverDisplayInterval);
    popoverDisplayInterval = null;
  }

  // Create a copy of activePopovers array since we'll be modifying it
  const popoversToHide = [...activePopovers];
  popoversToHide.forEach((element) => hidePopover(element));

  // Also try to find and clear any stray popovers
  document.querySelectorAll(".has-active-help-popover").forEach((el) => {
    hidePopover(el);
  });

  // Clear the array
  activePopovers = [];
}

/**
 * Dismiss help guide permanently (or until localStorage is cleared)
 */
function dismissHelpGuide() {
  hideAllPopovers();
  document.body.removeAttribute("data-help-enabled");
  localStorage.setItem(HELP_GUIDE_SEEN_KEY, "true");
}

/**
 * Add custom styles for help popovers
 */
function addHelpStyles() {
  if (document.getElementById("help-guide-styles")) return;

  const style = document.createElement("style");
  style.id = "help-guide-styles";
  style.textContent = `
    .help-popover {
      --bs-popover-max-width: 250px;
      --bs-popover-border-color: rgba(0, 123, 255, 0.5);
      --bs-popover-body-padding-x: 1rem;
      --bs-popover-body-padding-y: 0.75rem;
      animation: fadeInPopover 0.3s ease-in-out;
      box-shadow: 0 0 15px rgba(0, 0, 0, 0.15);
      z-index: 9999 !important;
      border: 2px solid #007bff;
      background-color: #fff;
      pointer-events: auto; /* Make popovers clickable */
      cursor: pointer;
    }
    
    .help-popover::after {
      content: "Click to dismiss";
      display: block;
      font-size: 10px;
      color: #6c757d;
      text-align: center;
      padding-top: 5px;
      font-style: italic;
    }
    
    @keyframes fadeInPopover {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    
    .help-popover .popover-body {
      font-size: 0.9rem;
      color: #212529;
      line-height: 1.4;
    }
    
    .has-active-help-popover {
      position: relative;
      z-index: 1050;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
    }
    
    /* Animation for buttons with active popovers */
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.4); }
      70% { box-shadow: 0 0 0 6px rgba(0, 123, 255, 0); }
      100% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0); }
    }
    
    .has-active-help-popover.btn {
      animation: pulse 2s infinite;
    }
    
    /* Ensure popover arrows are clearly visible */
    .help-popover .popover-arrow::before,
    .help-popover .popover-arrow::after {
      border-color: #007bff !important;
    }
    
    /* Prevent overflow on mobile */
    @media (max-width: 576px) {
      .help-popover {
        --bs-popover-max-width: 200px;
      }
    }
  `;

  document.head.appendChild(style);
}

// Initialize the help guide when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", initHelpGuide);

// Export functions for external use
export { initHelpGuide, toggleHelpGuide, dismissHelpGuide, hideAllPopovers };
