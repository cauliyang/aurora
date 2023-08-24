import { command } from "yargs";
import { readFileSync, writeFileSync } from "fs";

const args = command("generate", "Generate an HTML visualization", {
	input: {
		description: "Path to the JSON data file",
		alias: "i",
		type: "string",
	},
	output: {
		description: "Path to save the generated HTML",
		alias: "o",
		type: "string",
	},
})
	.help()
	.alias("help", "h").argv;

if (args._.includes("generate")) {
	generateHTML(args.input, args.output);
}

function generateHTML(inputPath, outputPath) {
	const jsonData = readFileSync(inputPath, "utf-8");

	// Use your graph.html content here, but replace the graph data with `${jsonData}`
	const htmlContent = `
    <!DOCTYPE html>
    ... (rest of your HTML content) ...
    <script>
        const graphData = ${jsonData};
        ... (rest of your JavaScript content) ...
    </script>
    `;

	writeFileSync(outputPath, htmlContent, "utf-8");
	console.log(`Generated visualization at ${outputPath}`);
}
