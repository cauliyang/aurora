import { STATE } from "./graph";

function createTooltipContent(elementData, element) {
  const isNode = element.isNode();

  // Start with tooltip header
  let content = `<div class="tooltip-header ${
    isNode ? "node-header" : "edge-header"
  }">
        <strong>${isNode ? "Node" : "Edge"} Info</strong>
    </div>
    <div class="tooltip-body">`;

  // For nodes, show the most important information first
  if (isNode) {
    // Display basic node info (ID, name if available)
    content += `<div class="tooltip-section">
            <div class="tooltip-title">ID:</div>
            <div class="tooltip-value">${elementData.id || "N/A"}</div>
        </div>`;

    // If name exists and is different from ID, show it
    if (elementData.name && elementData.name !== elementData.id) {
      content += `<div class="tooltip-section">
                <div class="tooltip-title">Name:</div>
                <div class="tooltip-value">${elementData.name}</div>
            </div>`;
    }

    // Display genomic location if available
    if (elementData.chrom) {
      content += `<div class="tooltip-section">
                <div class="tooltip-title">Location:</div>
                <div class="tooltip-value">${elementData.chrom}:${
        elementData.ref_start?.toLocaleString() || "?"
      }-${elementData.ref_end?.toLocaleString() || "?"}</div>
            </div>`;
    }

    // Display PTC and PTF values if available
    if (elementData.ptc !== undefined || elementData.ptf !== undefined) {
      content += `<div class="tooltip-metrics">`;

      if (elementData.ptc !== undefined) {
        content += `<div class="tooltip-metric">
                    <span class="metric-label">PTC</span>
                    <span class="metric-value" style="background-color: #007bff;">${elementData.ptc.toFixed(
                      4
                    )}</span>
                </div>`;
      }

      if (elementData.ptf !== undefined) {
        content += `<div class="tooltip-metric">
                    <span class="metric-label">PTF</span>
                    <span class="metric-value" style="background-color: #6c757d;">${elementData.ptf.toFixed(
                      4
                    )}</span>
                </div>`;
      }

      content += `</div>`;
    }
  } else {
    // For edges, show source, target and weight
    content += `<div class="tooltip-section">
            <div class="tooltip-title">Source:</div>
            <div class="tooltip-value">${elementData.source}</div>
        </div>
        <div class="tooltip-section">
            <div class="tooltip-title">Target:</div>
            <div class="tooltip-value">${elementData.target}</div>
        </div>`;

    if (elementData.weight !== undefined) {
      content += `<div class="tooltip-section">
                <div class="tooltip-title">Weight:</div>
                <div class="tooltip-value weight-value">${elementData.weight}</div>
            </div>`;
    }
  }

  // Close tooltip body
  content += `</div>`;

  // Add a footer with hint
  content += `<div class="tooltip-footer">
        <small>Click for more details</small>
    </div>`;

  return content;
}

let tooltipDisabled = false; // Initial state is false, tooltip starts enabled

export function createTooltip() {
  // Add tooltip styles to the document
  addTooltipStyles();

  // Only setup tooltip events if not disabled
  if (!tooltipDisabled) {
    STATE.cy.on("mouseover", "node, edge", (event) => {
      const target = event.target;
      const elementData = target.data();

      const tooltip = document.getElementById("tooltip");
      tooltip.innerHTML = createTooltipContent(elementData, target);
      tooltip.style.display = "block";

      // Position tooltip near the cursor but not directly under it
      tooltip.style.left = `${event.originalEvent.pageX + 10}px`;
      tooltip.style.top = `${event.originalEvent.pageY - 10}px`;

      // Add animation class
      tooltip.classList.add("tooltip-visible");
    });

    STATE.cy.on("mouseout", "node, edge", () => {
      const tooltip = document.getElementById("tooltip");
      tooltip.classList.remove("tooltip-visible");

      // Set a small delay before hiding completely to allow smooth transition
      setTimeout(() => {
        if (!tooltip.classList.contains("tooltip-visible")) {
          tooltip.style.display = "none";
        }
      }, 300);
    });

    // Update tooltip position on mousemove to follow cursor
    STATE.cy.on("mousemove", "node, edge", (event) => {
      const tooltip = document.getElementById("tooltip");
      tooltip.style.left = `${event.originalEvent.pageX + 10}px`;
      tooltip.style.top = `${event.originalEvent.pageY - 10}px`;
    });
  }
}

export function toggleTooltip() {
  tooltipDisabled = !tooltipDisabled;
  console.log("Tooltip disabled:", tooltipDisabled);

  const tooltip = document.getElementById("tooltip");
  if (tooltipDisabled) {
    tooltip.style.display = "none";
    tooltip.classList.remove("tooltip-visible");

    // Remove event listeners when disabled
    STATE.cy.off("mouseover", "node, edge");
    STATE.cy.off("mouseout", "node, edge");
    STATE.cy.off("mousemove", "node, edge");
  } else {
    createTooltip();
  }
}

function addTooltipStyles() {
  // Check if tooltip styles already exist
  if (document.getElementById("tooltip-styles")) {
    return;
  }

  // Create style element
  const style = document.createElement("style");
  style.id = "tooltip-styles";
  style.textContent = `
        #tooltip {
            position: absolute;
            display: none;
            min-width: 200px;
            max-width: 300px;
            background-color: white;
            border-radius: 6px;
            box-shadow: 0 3px 6px rgba(0,0,0,0.2);
            z-index: 1000;
            font-size: 14px;
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: none;
            overflow: hidden;
        }

        #tooltip.tooltip-visible {
            opacity: 1;
            transform: translateY(0);
        }

        .tooltip-header {
            padding: 8px 12px;
            color: white;
            font-weight: bold;
        }

        .node-header {
            background-color: #007bff;
        }

        .edge-header {
            background-color: #28a745;
        }

        .tooltip-body {
            padding: 12px;
        }

        .tooltip-section {
            display: flex;
            margin-bottom: 4px;
        }

        .tooltip-title {
            font-weight: bold;
            width: 70px;
            color: #555;
        }

        .tooltip-value {
            flex: 1;
            word-break: break-word;
        }

        .weight-value {
            font-weight: bold;
            color: #28a745;
        }

        .tooltip-metrics {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            gap: 10px;
        }

        .tooltip-metric {
            flex: 1;
            text-align: center;
            border: 1px solid #eee;
            border-radius: 4px;
            overflow: hidden;
        }

        .metric-label {
            display: block;
            padding: 2px 0;
            font-size: 12px;
            font-weight: bold;
            color: #555;
        }

        .metric-value {
            display: block;
            padding: 4px 0;
            font-weight: bold;
            color: white;
        }

        .tooltip-footer {
            padding: 5px 12px;
            background-color: #f5f5f5;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
        }
    `;

  // Add style to document head
  document.head.appendChild(style);
}

document
  .getElementById("toggleTooltip")
  .addEventListener("click", toggleTooltip);
