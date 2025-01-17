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

export function createTooltip() {
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
