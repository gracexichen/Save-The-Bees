# Save The Bees Visualization

## Description

The "Save The Bees" visualization is an interactive dashboard designed to highlight seasonal trends and patterns of bee colony data across the United States from 2015 to 2022. This data visualization tool helps users explore critical metrics related to bee colony health, losses, and threats across different states and time periods.

The dashboard features a dual-panel layout that provides both macro and micro views of the data. The left panel displays a bubble map of the United States (excluding Alaska) where each state is represented by a bubble whose size corresponds to the average value of the selected metric. Additionally, a separate "United States" bubble shows national-level data. The right panel contains an interactive heatmap that displays quarterly data over multiple years for the selected state, along with a dropdown menu to switch between different bee colony metrics.

Users can explore various aspects of bee colony data including the number of colonies, colony losses, renovation rates, and threats such as Varroa mites, diseases, and pesticides. The visualization uses an intuitive color-coded heatmap with green representing lower values, transitioning through yellow to red for higher values, making it easy to identify trends and seasonal patterns.

The repository contains the complete web application with an **index.html** file defining the dashboard structure, a **main.js** file handling data preprocessing and D3.js visualizations, and a **styles.css** file providing the visual styling. The data directory includes the bee colony dataset (**save_the_bees.csv**), US state boundary data (**counties-albers-10m.json**), and a honey-themed background image that enhances the visual appeal.

## Installation

Setting up and running the Save The Bees visualization is straightforward:

1. **Clone the repository** from GitHub to your local machine:
 
2. **No additional dependencies** are required as the project uses CDN-hosted libraries (D3.js and TopoJSON).

3. **Open the visualization** using one of these methods:
   - **Direct file opening**: Navigate to the project folder and double-click **index.html** to open it in your default web browser
   - **VS Code Live Server**: If using Visual Studio Code, install the Live Server extension, right-click on **index.html**, and select "Open with Live Server"
   - **Local web server**: Use any local web server (Python's **http.server**, Node.js **http-server**, etc.) to serve the files

**Note**: Due to browser security restrictions with local file access, using a local web server or VS Code Live Server is recommended for optimal functionality.

## Execution

The Save The Bees visualization offers several interactive features:

### Basic Navigation
- **View the bubble map**: The left panel shows the US map with bubbles representing average colony data for each state
- **Explore state details**: Click on any state bubble to view detailed quarterly data in the heatmap on the right panel
- **National overview**: Click the "United States" bubble below the main map to view national-level trends

### Interactive Features
1. **Change data metrics**: Use the dropdown menu in the right panel to switch between different bee colony measurements:
   - Number of Colonies
   - Max Colonies
   - Lost Colonies
   - Percent Lost
   - Added Colonies
   - Renovated Colonies
   - Percent Renovated
   - Varroa Mites
   - Other Pests and Parasites
   - Diseases
   - Pesticides

2. **State selection**: Click on any bubble in the main map to:
   - Update the heatmap to show that state's data
   - Change the title to reflect the selected state
   - Highlight the selected bubble

3. **Explore temporal patterns**: The heatmap displays data across:
   - **Years**: 2015-2022 (x-axis)
   - **Quarters**: Q1-Q4 (y-axis)
   - **Color intensity**: Represents the relative value of the selected metric

### Understanding the Visualizations
- **Bubble sizes**: Larger bubbles indicate higher average values for the selected metric
- **Color coding in heatmap**: 
  - Green: Lower values
  - Yellow: Medium values  
  - Red: Higher values
- **Tooltips**: Hover over bubbles or heatmap cells to see exact values
- **Responsive design**: The dashboard adapts to different screen sizes

