# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-04-08

### 🚀 Features

- Add initial project changelog and configuration files
- Add svgo dependency
- Add functions to rank nodes by property, degree, and centrality in graph.js
- Add clear highlights button functionality and enhance graph styles
- Enhance tooltip functionality with improved styling and content display
- Update walks panel with enhanced search functionality and loading placeholder
- Add gene annotation functionality and enhance graph data structure
- Implement global alert utility and update script loading order
- Integrate Bootstrap for improved styling and enhance gene file upload functionality
- Refactor gene annotation modal functionality and improve file upload handling
- Enhance footer layout and styling with Bootstrap for improved user experience
- Remove duplicated DOMContentLoaded event listener and streamline gene data loading process
- Add support for raw text file transformation and update gene data loading mechanism
- Remove duplicated DOMContentLoaded event listener and clean up gene data parsing logic
- Enhance gene annotation data structure and improve node rendering logic
- Expose STATE object to the global window for accessibility in graph layout changes
- Enhance JSON editor with new styling, mode selection, and keyboard shortcuts
- Add Aurora IDs file upload functionality and enhance walk filtering
- Add window.showAlert function to alertUtils

### 🐛 Bug Fixes

- Improve highlightNode function to handle existing highlights and node not found errors

### 💼 Other

- Update actions/cache version to v4

### 🚜 Refactor

- Update toggleLabels function to use getLabelsVisible and setLabelsVisible
- Update walk sorting logic in displayWalks function
- Update highlight functionality and improve graph styling
- Sort overlapping genes by overlap percentage
- Update label data attributes to use 'id' instead of 'name' and 'weight'

### 🎨 Styling

- Improve code formatting in app.html
- Update button classes and add data attribute and onclick handler
- Clean up comments and formatting in graph.js

### ⚙️ Miscellaneous Tasks

- Update pre-commit hooks and button tooltip status

## [1.0.0] - 2025-01-14

### 🚀 Features

- Add toggleView function and maximize graph feature
- *(graph)* Add functionality to capture graph as image
- Add modal for pasting JSON data
- Add tooltip functionality for graph elements
- *(view)* Add toggleView function for maximizing graph view
- Add pr agent workflow and ignore files
- Use cy json format
- Add edge weight filtering to graph visualization
- *(app)* Add cytoscape-klay and cytoscape-tidytree libraries
- Add cytoscape-euler dependency
- Add event listener for DOMContentLoaded
- Add toggle labels and capture graph functionality
- *(graph)* Add function to load graph data from server
- Add tutorial_of_aurora.pdf document
- Add function to display and search graph walks

### 🐛 Bug Fixes

- *(app.html)* Update button classes and add reset button
- Fix typo in data-bs-target attribute
- Fix minimum edge weight filter condition
- Fix broken link in index.html
- Fix broken link in index.html
- Fix broken link in index.html
- *(graph)* Fix max path length comparison in dfs function
- *(graphSetup)* Fix parameter typo in dfs function call
- *(graph)* Fix dfs function call
- Update minPathLength and maxPathLength values

### 💼 Other

- Update GitHub Pages deployment action version
- Add CNAME file
- Normlize the width of edge

### 🚜 Refactor

- Simplify code and improve readability
- *(graph)* Remove duplicate setupClickEvent function
- Reset previous clicked element style when tapping on a new element
- *(graph)* Remove unnecessary code and reorganize functions
- Remove unused code and files
- Remove unnecessary code in toggleView()
- Remove unnecessary code for destroying Split.js instances
- Improve code readability by extracting code into a separate function
- Remove unnecessary code and improve graph visualization
- Remove unnecessary code and add TODO comment
- Update package.json and remove unused import
- *(graph)* Remove unnecessary code
- Remove duplicate event listener and move it to the correct location
- *(graph)* Refactor sourceNodes and sinkNodes assignment
- Improve click event handling and information display
- *(graph)* Update layout selection in updateGraph function

### 📚 Documentation

- Update README.md with project information
- Update README.md
- Update document link in README.md

### 🎨 Styling

- Initialize walks as a constant variable
- Remove unnecessary script tags and update info container
- Add highlighted style for nodes and edges
- Add hover effect to walks and tooltip to walkDiv
- Increase height of cy and walks to 700px
- Improve layout and split containers
- Remove unnecessary code and formatting
- Improve styling of index.html file
- Add styles.css file and update index.html
- Remove unnecessary comments and whitespace
- Update base href
- Fix base href casing
- Add tooltip styles and functionality
- Remove commented out code
- Fix base href capitalization
- Remove unnecessary comment and update layout option names
- Fix container height and border radius
- Improve layout and sizing of elements
- Reduce h3 padding and font size, add margin-bottom to h3
- Remove unnecessary comments and whitespace
- Change node and edge colors
- Fix formatting and add newline at end of file
- Update CSS formatting and indentation
- Change nodeColor and hightColor in graph.js
- Decrease edge width from 5 to 4
- Fix base href
- Remove commented out base href
- Remove unnecessary console.log statement
- Reduce width of input fields in app.html
- Change highlighted class to walkcolor class
- Remove unnecessary code and comments
- Remove unnecessary dependencies and update styles.scss
- "refactor": Remove unused styles and classes in graph.js and graphSetup.js files
- *(graph.js)* Comment out resetPreviousElementStyle calls
- Remove unnecessary blank lines and comments
- Change layoutSelect.value assignment to direct getElementById value assignment
- Remove commented out code and simplify layout selection
- Remove unnecessary newline at end of file
- Update variable assignment in graph.js
- Update comments for case-sensitive search

### ⚙️ Miscellaneous Tasks

- Update graph.js to graphp.js
- Add write permissions for contents
- Update dependencies and UI elements
- Update deploy.yml to include additional files
- Fix typo in NLGraph Visualization
- Add dist folder to .gitignore and update main in package.json
- Update package.json and file paths
- Update test script in package.json
- Remove CNAME file creation and update GH Pages deployment
- Update deployment configuration and package.json
- Update build script for public URL
- Remove unnecessary type attribute in script tag
- Optimize graph update
- Update image source in index.html

<!-- generated by git-cliff -->
