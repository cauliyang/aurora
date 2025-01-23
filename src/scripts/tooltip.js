import { STATE } from "./graph";

function createTooltipContent(elementData) {
    let content = "<ul>";
    for (const key in elementData) {
        if (elementData.hasOwnProperty(key)) {
            content += `<li><strong>${key}:</strong> ${elementData[key]}</li>`;
        }
    }
    content += "</ul>";
    return content;
}

let tooltipDisabled = false; // Initial state is false, tooltip starts enabled

export function createTooltip() {
    if (!tooltipDisabled) {
        STATE.cy.on("mouseover", "node, edge", (event) => {
            const target = event.target;
            const elementData = target.data();

            const tooltip = document.getElementById("tooltip");
            tooltip.innerHTML = createTooltipContent(elementData);
            tooltip.style.display = "block";
            tooltip.style.left = `${event.originalEvent.pageX}px`;
            tooltip.style.top = `${event.originalEvent.pageY}px`;
            tooltip.style.opacity = "1";
            tooltip.style.transform = "translateY(0px)";
        });

        STATE.cy.on("mouseout", "node, edge", () => {
            const tooltip = document.getElementById("tooltip");
            tooltip.style.display = "none";
            tooltip.style.opacity = "0";
            tooltip.style.transform = "translateY(-10px)";
        });
    }
}

export function toggleTooltip() {
    tooltipDisabled = !tooltipDisabled;
    console.log("Tooltip disabled:", tooltipDisabled);

    const tooltip = document.getElementById("tooltip");
    if (tooltipDisabled) {
        tooltip.style.display = "none";
        tooltip.style.opacity = "0";
        tooltip.style.transform = "translateY(-10px)";
        // Remove event listeners when disabled
        STATE.cy.off('mouseover', 'node, edge');
        STATE.cy.off('mouseout', 'node, edge');
    } else {
        createTooltip();
    }
}

document.getElementById("toggleTooltip").addEventListener("click", toggleTooltip);
