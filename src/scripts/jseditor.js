/**
 * Enhanced JSON Editor with improved features
 */

import JSONEditor from 'jsoneditor';
import { loadGraphDataFromServer } from "./graph.js";
import { STATE } from './graph';

// Global variables
let editor = null;
let currentData = null;
let currentEditorMode = 'code'; // Default mode

// Configuration options for the editor
const editorOptions = {
    mode: 'code',
    modes: ['tree', 'code', 'form', 'text', 'view'],
    onError: function(error) {
        window.showAlert(`JSON Error: ${error.toString()}`, 'error', 5000);
    },
    onModeChange: function(newMode) {
        currentEditorMode = newMode;
        updateActiveModeButton(newMode);
    },
    // Better search functionality
    search: true,
    // Enable history (undo/redo)
    history: true,
    // Only validate on demand to improve performance
    enableTransform: false,
    enableSort: true,
    indentation: 2
};

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

/**
 * Initialize the JSON editor
 * @returns {Promise<void>} Promise that resolves when editor is ready
 */
export async function initializeJsonEditor() {
    console.log("Initializing JSON editor...");

    // Only create editor when modal is shown, to avoid unnecessary processing
    document.getElementById("jsonModal").addEventListener("shown.bs.modal", () => {
        setupEditor();
    });

    document.getElementById("openJsonEditor").addEventListener("click", openJsonEditor);
    document.getElementById("closeEditor").addEventListener("click", closeEditor);
    document.getElementById("saveEditedJson").addEventListener("click", saveJsonChanges);

    // Set up mode change buttons
    setupModeButtons();
}

/**
 * Set up the JSONEditor instance
 */
function setupEditor() {
    const container = document.getElementById("jsoneditor");
    if (!container) {
        console.error("JSON editor container not found!");
        return;
    }

    // Only create a new editor if one doesn't already exist
    if (!editor) {
        try {
            editor = new JSONEditor(container, editorOptions);
            console.log("JSON editor initialized successfully");

            // Add keyboard shortcuts
            addKeyboardShortcuts();

            // Add editor styles
            addEditorStyles();

            // Set initial data - check if we have existing data or use the example
            const dataToUse = STATE.originalGraphData || exampleJson;
            editor.set(dataToUse);
            currentData = dataToUse;

            // Set initial mode
            updateActiveModeButton(currentEditorMode);

        } catch (error) {
            console.error("Failed to initialize JSONEditor:", error);
            if (typeof window.showAlert === 'function') {
                window.showAlert("Failed to initialize JSON editor", "error", 5000);
            }
        }
    } else {
        // If editor already exists, update it with current graph data
        try {
            const currentGraphData = STATE.originalGraphData;
            if (currentGraphData) {
                editor.set(currentGraphData);
            }
        } catch (error) {
            console.error("Error updating editor data:", error);
        }
    }
}

/**
 * Set up the editor mode toggle buttons
 */
function setupModeButtons() {
    const modeButtons = document.querySelectorAll('.editor-mode-btn');

    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const mode = button.getAttribute('data-mode');
            if (editor && mode) {
                editor.setMode(mode);
                updateActiveModeButton(mode);
            }
        });
    });
}

/**
 * Update active state of mode buttons
 * @param {string} activeMode - The currently active mode
 */
function updateActiveModeButton(activeMode) {
    document.querySelectorAll('.editor-mode-btn').forEach(button => {
        const buttonMode = button.getAttribute('data-mode');
        button.classList.toggle('active', buttonMode === activeMode);
    });
}

/**
 * Add keyboard shortcuts to the editor
 */
function addKeyboardShortcuts() {
    document.addEventListener('keydown', function(event) {
        // Only if the editor is visible
        if (!editor || !document.getElementById('jsonModal').classList.contains('show')) {
            return;
        }

        // Ctrl+S to save changes
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            saveJsonChanges();
        }

        // Shortcut for switching modes
        if (event.ctrlKey && event.shiftKey) {
            if (event.key === 't') { // Tree mode
                event.preventDefault();
                editor.setMode('tree');
            } else if (event.key === 'c') { // Code mode
                event.preventDefault();
                editor.setMode('code');
            } else if (event.key === 'f') { // Form mode
                event.preventDefault();
                editor.setMode('form');
            }
        }
    });
}

/**
 * Add custom styles to the editor
 */
function addEditorStyles() {
    if (document.getElementById('json-editor-styles')) return;

    const style = document.createElement('style');
    style.id = 'json-editor-styles';
    style.textContent = `
    .jsoneditor {
      border: 1px solid #ddd !important;
      border-radius: 3px !important;
    }
    .jsoneditor-menu {
      background-color: #f8f9fa !important;
      border-bottom: 1px solid #ddd !important;
    }
    .editor-mode-btn.active {
      background-color: #0d6efd !important;
      color: white !important;
    }
    .jsoneditor-text {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
    }
    .editor-shortcuts {
      position: absolute;
      bottom: 5px;
      right: 10px;
      font-size: 11px;
      color: #777;
      pointer-events: none;
    }
  `;

    document.head.appendChild(style);
}

/**
 * Open the JSON Editor with current data
 */
function openJsonEditor() {
    try {
        if (!bootstrap) {
            console.error("Bootstrap not available");
            return;
        }

        const jsonModal = new bootstrap.Modal(document.getElementById("jsonModal"));
        jsonModal.show();

    } catch (error) {
        console.error("Error opening JSON editor:", error);
        if (typeof window.showAlert === 'function') {
            window.showAlert(`Error opening editor: ${error.message}`, "error");
        }
    }
}

/**
 * Close the editor without saving changes
 */
function closeEditor() {
    try {
        const jsonModalInstance = bootstrap.Modal.getInstance(document.getElementById("jsonModal"));
        if (jsonModalInstance) {
            jsonModalInstance.hide();
        }
    } catch (error) {
        console.error("Error closing editor:", error);
    }
}

/**
 * Save changes from the editor
 */
function saveJsonChanges() {
    if (!editor) {
        console.warn("Editor not initialized");
        return;
    }

    try {
        // Get edited data
        const editedData = editor.get();

        // Basic validation
        if (!editedData || ((!editedData.nodes || !editedData.edges) && !editedData.elements)) {
            throw new Error("Invalid graph structure. Must have nodes and edges.");
        }

        // Save to STATE and update graph
        loadGraphDataFromServer(editedData);

        // Close modal
        const jsonModalInstance = bootstrap.Modal.getInstance(document.getElementById("jsonModal"));
        if (jsonModalInstance) {
            jsonModalInstance.hide();
        }

        // Show confirmation
        if (typeof window.showAlert === 'function') {
            window.showAlert("Graph updated successfully", "success", 3000);
        }

    } catch (error) {
        console.error("Error saving JSON changes:", error);
        if (typeof window.showAlert === 'function') {
            window.showAlert(`Error saving changes: ${error.message}`, "error", 5000);
        }
    }
}

// Initialize editor when document is ready
document.addEventListener("DOMContentLoaded", initializeJsonEditor);

// Expose editor for debugging
window.JSONEditor = {
    getEditor: () => editor,
    getOptions: () => editorOptions,
    setMode: (mode) => editor ? .setMode(mode),
    getMode: () => currentEditorMode
};

// Export the initialization function
export default {
    initializeJsonEditor,
    openJsonEditor,
    saveJsonChanges
};
