let editor; // Global variable to store the editor instance

const exampleJson = {
	nodes: [
		{ data: { id: "S1", name: "S1" } },
		{ data: { id: "S2", name: "S2" } },
		{ data: { id: "A", name: "A" } },
		{ data: { id: "B", name: "B" } },
		{ data: { id: "C", name: "C" } },
		{ data: { id: "D", name: "D" } },
		{ data: { id: "E", name: "E" } },
	],
	edges: [
		{
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

document
	.getElementById("jsonModal")
	.addEventListener("shown.bs.modal", function () {
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

document
	.getElementById("openJsonEditor")
	.addEventListener("click", function () {
		const jsonModal = new bootstrap.Modal(document.getElementById("jsonModal"));
		jsonModal.show();
	});

document.getElementById("closeEditor").addEventListener("click", function () {
	// You can add any cleanup or reset actions here, if needed.
	// For now, just close the modal.
	const jsonModal = new bootstrap.Modal(document.getElementById("jsonModal"));
	jsonModal.hide();
});

document
	.getElementById("saveEditedJson")
	.addEventListener("click", function () {
		// Here, you can get the edited JSON data from the JSONEditor and save or process it.
		try {
			const editedData = editor.get();
			loadGraphDataFromServer(editedData);

			// Close the modal
			const jsonModalInstance = bootstrap.Modal.getInstance(
				document.getElementById("jsonModal"),
			);
			jsonModalInstance.hide();
		} catch (error) {
			console.error("Error parsing edited JSON:", error);
		}
	});
