# Save The Bees Visualization
## Description
The "Save The Bees" visualization is a dashboard that aims to highlight the seasonal trends of bee colonies across the United States across many quarters and years. There is
two panels of the dashboard display. On the left, there is a U.S. map that contains all of the states except Alaska and a small U.S. map, each with a bubble of varying size
that represents the data value of the selected column of interest. The user can click on any bubble to visualize the details for that state in a heatmap on the right panel 
display. The right panel contains the heatmap, a dropdown to change the column of interest, and explanation of possible trends in the data.

The repository contains an ***index.html*** file that details the HTML structure of the visualization, a ***main.js*** file that preprocesses data and generates the graphs for the visualization,
a ***style.css*** file that styles the HTML elements to enhance the visualization of the dashboard. It also contains a data folder that includes the data file 
***counties-albers-10m.json*** to generate state outlines, ***background-honey.jpg*** which is loaded as the dashboard background, and our dataset ***save_the_bees.csv***.
## Installation
The steps to installing and running the repo:
1. Clone the directory from GitHub.
2. Open the HTML file in the preferred browser either directly through files or with Go Live in VSCode.
## Execution
Change the type of data displayed by clicking on the dropdown to select another column of data. To change the state, click on one of the bubbles on the U.S. bubble map to select it.
The U.S. map is zoomable by scrolling or pinch-to-zoom on a mousepad to click so it is easier to click on states.
