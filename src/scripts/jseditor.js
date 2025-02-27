import { loadGraphDataFromServer } from "./graph.js";
import { Modal } from "bootstrap";
import JSONEditor from "jsoneditor";
import "jsoneditor/dist/jsoneditor.min.css";

let editor; // Global variable to store the editor instance

const exampleJson = {
    nodes: [
        { data: { id: "S1", name: "S1", chrom: "chr8", ref_start: 127793975, ref_end: 127794734, strand: "+", ptc: 1, ptf: 0, exons: "[127793975-127794734]", } },
        {
            data: {
                id: "S2",
                name: "S2",
                chrom: "chr8",
                ref_start: 62250799,
                ref_end: 62302403,
                strand: "-",
                exons: "[62250620-62252614,62302311-62302403]",
            },

        },
        {
            data: {
                id: "A",
                name: "A",
                chrom: "chr8",
                ref_start: 62251526,
                ref_end: 62302403,
                strand: "-",
                ptc: 2,
                ptf: 0.2,
                exons: '[62250799-62252614, 62302311-62302403]',
            }
        },
        {
            data: {
                id: "B",
                name: "B",
                ptc: 3,
                ptf: 0.1,
                chrom: "chr8",
                ref_start: 62250799,
                ref_end: 62302403,
                strand: "-",
                exons: "[62250799-62252614,62284023-62284107,62284814-62284911,62302311-62302403]",
            }
        },
        {
            data: {
                id: "C",
                name: "C",
                ptc: 5,
                ptf: 0.1,
                chrom: "chr8",
                ref_start: 62299562,
                ref_end: 62302403,
                strand: "-",
                exons: "[62299562-62302403]",

            }
        },
        {
            data: {
                id: "D",
                name: "D",
                ptc: 1,
                ptf: 0.4,
                chrom: "chr8",
                ref_start: 62251531,
                ref_end: 62302403,
                strand: "-",
                exons: "[62251531-62252614,62284023-62284107,62284826-62284911,62302311-62302403]",
            }
        },
        {
            data: {
                id: "E",
                name: "E",
                ptc: 2,
                ptf: 0.3,
                chrom: "chr8",
                ref_start: 62250651,
                ref_end: 62302403,
                strand: "-",
                exons: "[62250651-62252614,62284023-62284107,62284814-62284911,62302311-62302403]",
            }
        },
    ],
    edges: [{
            data: {
                id: "S1A",
                source: "S1",
                target: "A",
                label: "S1 to A",
                weight: 2,
            },
        },
        {
            data: {
                id: "AB",
                source: "A",
                target: "B",
                label: "A to B",
                weight: 3,
            },
        },
        {
            data: {
                id: "BS2",
                source: "B",
                target: "S2",
                label: "B to S2",
                weight: 4,
            },
        },
        {
            data: {
                id: "S1C",
                source: "S1",
                target: "C",
                label: "S1 to C",
                weight: 5,
            },
        },
        {
            data: {
                id: "CD",
                source: "C",
                target: "D",
                label: "C to D",
                weight: 1,
            },
        },
        {
            data: {
                id: "DE",
                source: "D",
                target: "E",
                label: "D to E",
                weight: 3,
            },
        },
        {
            data: {
                id: "ES2",
                source: "E",
                target: "S2",
                label: "E to S2",
                weight: 2,
            },
        },
    ],
};

document.getElementById("jsonModal").addEventListener("shown.bs.modal", () => {
    const container = document.getElementById("jsoneditor");
    const options = {
        mode: "code",
        modes: ["code", "tree"],
    };

    // Only create a new editor if one doesn't already exist
    if (!editor) {
        editor = new JSONEditor(container, options);
        editor.set(exampleJson); // Set example data
    }
});

document.getElementById("openJsonEditor").addEventListener("click", () => {
    const jsonModal = new Modal(document.getElementById("jsonModal"));
    jsonModal.show();
});

document.getElementById("closeEditor").addEventListener("click", () => {
    // You can add any cleanup or reset actions here, if needed.
    // For now, just close the modal.
    const jsonModal = new Modal(document.getElementById("jsonModal"));
    jsonModal.hide();
});

document.getElementById("saveEditedJson").addEventListener("click", () => {
    // Here, you can get the edited JSON data from the JSONEditor and save or process it.
    try {
        const editedData = editor.get();
        loadGraphDataFromServer(editedData);

        // Close the modal
        const jsonModalInstance = Modal.getInstance(
            document.getElementById("jsonModal"),
        );
        jsonModalInstance.hide();
    } catch (error) {
        console.error("Error parsing edited JSON:", error);
    }
});