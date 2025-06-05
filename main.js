// Reference: https://observablehq.com/@d3/us-state-choropleth/2

// <----------------------------------------------- GLOBAL VARIABLES ----------------------------------------------->
let selected_column = "select_metrics";
let selected_column_name = "select_metrics";
let selected_state = "";

// Column names for metrics out of 100 percent
const percent_columns = [
    "percent_lost",
    "percent_renovated",
    "varroa_mites",
    "other_pests_and_parasites",
    "diseases",
    "pesticides",
];

// Description for each metric
let descriptions = {
    select_metrics: "Select a metric to view on the map.",
    num_colonies: "The number of colonies per quarter.",
    max_colonies: "The maximum number of colonies per quarter.",
    lost_colonies: "The number of lost colonies per quarter.",
    percent_lost: "The percentage of lost colonies per quarter.",
    added_colonies: "The number of new colonies that were added.",
    renovated_colonies:
        "The number of colonies renovated. Which means that the queen of the hive was replaced with a new queen, or new bees were added to the colony.",
    percent_renovated:
        "The percentage of colonies renovated. Which means that the queen of the hive was replaced with a new queen, or new bees were added to the colony.",
    varroa_mites:
        "The percentage of colonies affected by Varroa mites. Which is a type of pest reponsible of many honey bee deaths today.",
    other_pests_and_parasites:
        "The percentage of colonies affected by other pests and parasites that are not Varroa mites.",
    diseases: "The percentage of colonies affected by diseases.",
    pesticides: "The percentage of colonies affected by pesticides.",
};

// <----------------------------------------------- HELPER FUNCTIONS ----------------------------------------------->

/**
 * Gets the container size for the specified container
 * @param {string} container_id - The id of the container
 * @returns {[number, number]} - The width and height of the container
 */
function getContainerSize(container_id) {
    const container = document.getElementById(container_id);
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    console.log("width", width, "height", height);
    return [width, height];
}

/**
 * Resizes the visualization (heat map only as bubble map resizes itself)
 */
function resizeVisualization() {
    // Initialize heat map
    preprocessHeatMap(selected_state, selected_column).then(
        (heatmapData) => {
            generateHeatMap(heatmapData, selected_column);
        }
    );
}

/**
 * Debounces a function (prevents it from being called too often)
 * Only runs the function after a certain amount of time
 * @param {function} func - The function to call
 * @param {*} wait - Minimum time between calls
 * @returns {function} - New debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Initializes the visualization (heat map and bubble map)
 */
function initializeVisualization() {
    // Initialize bubble map
    preprocessBubbleData(selected_column).then((aggregated_data) => {
        generateBubbleMap(aggregated_data);
    });

    // Initialize heat map
    preprocessHeatMap(selected_state, selected_column).then(
        (heatmapData) => {
            generateHeatMap(heatmapData, selected_column);
        }
    );
}

// <----------------------------------------------- BUBBLE MAP FUNCTIONS ----------------------------------------------->


/**
 * Preprocesses data for the bubble map
 * Given the selected column, returns the average number of the selected column per state across all years and quarters
 * @param {string} selected_column - The selected column as string
 * @returns {object} - The average number of the selected column per state
 */
function preprocessBubbleData(selected_column) {
    // Returns the average number of colonies per state as a dictionary
    return d3.csv("data/save_the_bees.csv").then((data) => {
        let countPerState = {};

        data.forEach((entry) => {
            const state = entry["state"];
            const count = +entry[selected_column];

            if (!countPerState[state]) {
                countPerState[state] = {
                    total: 0,
                    count: 0,
                };
            }

            countPerState[state].total += count;
            countPerState[state].count += 1;
        });

        let averagePerState = {};
        Object.keys(countPerState).forEach((state) => {
            averagePerState[state] =
                countPerState[state].total /
                countPerState[state].count;
        });

        return averagePerState;
    });
}

/**
 * Generates the bubble map
 * Adds a US state map with bubbles representing the average of the selected column
 * Allows zooming and panning
 * @param {object} numColonies - The average number of colonies per state
 */
function generateBubbleMap(numColonies) {
    // On reload, remove old visualizations
    d3.select("#bubble-map-viz").selectAll("*").remove();
    d3.select("#us-map").selectAll("*").remove();

    // Load US map given topojson
    d3.json("/data/counties-albers-10m.json").then((us) => {
        // Create a path generator
        const path = d3.geoPath();

        // Get the state features
        const states = topojson.feature(us, us.objects.states);

        // Create the base SVG
        const svg = d3
            .select("#bubble-map-viz")
            .append("svg")
            .attr("width", 975)
            .attr("height", 610)
            .attr("viewBox", [0, 0, 975, 610])
            .attr("style", "max-width: 100%; height: auto;");

        // Draws the states (except Alaska)
        const g = svg
            .append("g")
            .selectAll("path")
            .data(
                states.features.filter(
                    (d) => d.properties.name !== "Alaska"
                )
            )
            .join("path")
            .attr("fill", "#fff")
            .attr("stroke", "#000")
            .attr("stroke-width", 2)
            .attr("d", path);

        // Check if the selected column is a percent column
        const isPercentColumn =
            percent_columns.includes(selected_column);

        // Create a scale for bubble size
        const bubbleRadiusScale = d3
            .scaleLog()
            .base(10)
            .domain([
                // Min and max values of selected column
                Math.max(
                    Math.min(...Object.values(numColonies)),
                    1e-6
                ),
                Math.max(...Object.values(numColonies)),
            ])
            .range(
                // Smaller range for percentage columns
                isPercentColumn ? [5, 25] : [10, 35]
            );

        // Retrieve the units of the bubble values, used for tooltip
        const units = [
            "num_colonies",
            "max_colonies",
            "lost_colonies",
            "added_colonies",
            "renovated_colonies",
        ].includes(selected_column)
            ? " colonies"
            : "%";

        // Initialize tooltip
        d3.select("#bubble-map-viz .tooltip").remove();
        const tooltip = d3
            .select("#bubble-map-viz")
            .append("div")
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "1px")
            .style("border-radius", "5px")
            .style("padding", "10px")
            .style("pointer-events", "none")
            .style("position", "absolute");

        // Add bubbles with event listeners
        const bubbles = svg
            .append("g")
            .selectAll("circle")
            .data(states.features)
            .join("circle")
            .attr("cx", (d) => path.centroid(d)[0])
            .attr("cy", (d) => path.centroid(d)[1])
            .attr("r", (d) =>
                bubbleRadiusScale(numColonies[d.properties.name])
            )
            .attr("fill", (d) =>
                // Highlight selected state
                selected_state === d.properties.name
                    ? "#ffe0ad"
                    : "#9DA0FF"
            )
            .attr("border", "none")
            .on("mouseover", function (event, d) {
                // Highlight hovered state
                d3.select(this).attr("fill", "#ffe0ad");

                // Show tooltip
                tooltip.style("opacity", 1);
            })
            .on("mousemove", function (event, d) {
                // Update tooltip text and position
                tooltip
                    .html(
                        `${d.properties.name}: ${Math.round(
                            numColonies[d.properties.name]
                        ).toLocaleString()}${units}`
                    )
                    .style("left", event.pageX + 10 + "px")
                    .style("top", event.pageY - 30 + "px");
            })
            .on("mouseleave", function (event, d) {
                // Unhighlight hovered state
                if (selected_state === d.properties.name) {
                    d3.selectAll("circle").attr("fill", "#9DA0FF");
                    d3.select(this).attr("fill", "#ffe0ad");
                    return;
                }
                d3.select(this).attr("fill", "#9DA0FF");

                // Hide tooltip
                tooltip.transition().style("opacity", 0);
            })
            .on("click", function (event, d) {
                // Update heat map with selected state data
                preprocessHeatMap(
                    d.properties.name,
                    selected_column
                ).then((heatmapData) => {
                    updateHeatmap(heatmapData, selected_column);
                });

                // Update selected state variables and names
                selected_state = d.properties.name;
                const state = document.getElementById("state");
                state.textContent = "in " + d.properties.name;
            });

        // Compute total colonies
        const totalColonies = Object.values(numColonies).reduce(
            (a, b) => a + b,
            0
        );

        // Create SVG for "United States" bubble
        const usSvg = d3
            .select("#us-map")
            .append("svg")
            .attr("width", 200)
            .attr("height", 150)
            .attr("viewBox", [0, 0, 200, 150])
            .attr(
                "style",
                "max-width: 100%; height: auto; display: block; margin: auto;"
            );

        // Create group for "United States" bubble
        const usBubbleGroup = usSvg.append("g");

        // Add "United States" bubble
        usBubbleGroup
            .append("circle")
            .attr("cx", 100)
            .attr("cy", 75)
            .attr("r", bubbleRadiusScale(totalColonies))
            .attr("fill", "#9DA0FF")
            .on("mouseover", function () {
                d3.select(this).attr("fill", "#ffe0ad");
                tooltip.style("opacity", 1);
            })
            .on("mousemove", function (event) {
                tooltip
                    .html(
                        `United States: ${Math.round(
                            totalColonies
                        ).toLocaleString()} colonies`
                    )
                    .style("left", event.pageX + 10 + "px")
                    .style("top", event.pageY - 30 + "px");
            })
            .on("mouseleave", function () {
                d3.select(this).attr("fill", "#9DA0FF");
                tooltip.style("opacity", 0);
            })
            .on("click", function () {
                preprocessHeatMap(
                    "United States",
                    selected_column
                ).then((heatmapData) => {
                    updateHeatmap(heatmapData, selected_column);
                });
                selected_state = "United States";
            });

        // Add label below the bubble
        usBubbleGroup
            .append("text")
            .attr("x", 100)
            .attr("y", 135)
            .attr("text-anchor", "middle")
            .attr("font-family", "Arial, sans-serif")
            .attr("font-size", "14px")
            .text("United States");

        // Add zoom behavior
        const zoom = d3
            .zoom()
            .scaleExtent([1, 8]) // min and max zoom
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
                bubbles.attr("transform", event.transform);
            });

        // Apply zoom behavior on svg
        svg.call(zoom);

        // Add icons for zoom and drag
        const icons = svg
            .append("g")
            .attr("class", "icon-group")
            .attr("transform", "translate(750, 10)");

        // Add background rectangle for icons
        icons
            .append("rect")
            .attr("x", -10)
            .attr("y", -5)
            .attr("width", 150)
            .attr("height", 40)
            .attr("rx", 6)
            .attr("fill", "white")
            .attr("fill-opacity", 0.8);

        // Add all icons to rectangle
        icons
            .append("image")
            .attr("xlink:href", "./data/dragIcon.svg")
            .attr("width", 30)
            .attr("height", 30);
        icons
            .append("image")
            .attr("xlink:href", "./data/pinchIcon.svg")
            .attr("x", 48)
            .attr("width", 30)
            .attr("height", 28);
        icons
            .append("image")
            .attr("xlink:href", "./data/resetIcon.svg")
            .attr("x", 100)
            .attr("y", 2)
            .attr("width", 25)
            .attr("height", 25)
            .on("click", function (event, d) {
                generateBubbleMap(numColonies);
            });
    });
}

// <----------------------------------------------- HEAT MAP FUNCTIONS ----------------------------------------------->

/**
 * Preprocess the data for heatmap given a selected state and column for quarter and year data
 * @param {string} state - The selected state
 * @param {string} column - The selected column
 * @returns {object} - The preprocessed data containing the years, quarters, heatmap data, and max value
 */
function preprocessHeatMap(state, column) {
    // Load bee colonies data
    return d3.csv("data/save_the_bees.csv").then((data) => {
        // Define x variables (year)
        const xVars = [
            2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022,
        ];

        // Define y variables (quarter)
        const yVars = [1, 2, 3, 4];

        // Initialize heatmap data and max value
        let heatmapData = [];

        // Track max value
        let maxValue = 0;

        // Filter data for the entries about the selected state
        const stateData = data.filter((d) => d.state === state);

        // Loop through each year and quarter to extract heatmap data
        xVars.forEach((year) => {
            yVars.forEach((quarter) => {

                // Find the entries with given current x (year) and y (quarter)
                const entry = stateData.find(
                    (d) => +d.year === year && +d.quarter === quarter
                );

                if (entry) {
                    // If entry exists, add it to heatmap data
                    heatmapData.push({
                        x: year,
                        y: quarter,
                        value: +entry[column] || 0,
                        actualValue: +entry[column] || 0,
                    });

                    // Update max value if entry value is greater than current max
                    if (+entry[column] > maxValue) {
                        maxValue = +entry[column];
                    }
                }else {
                    // If entry does not exist for that year and quarter, add null
                    heatmapData.push({
                        x: year,
                        y: quarter,
                        value: null,
                        actualValue: null,
                    });
                }
            });
        });

        // Return preprocessed data and extra metadata
        return {
            xVars: xVars,
            yVars: yVars,
            correlationData: heatmapData,
            maxValue: maxValue,
        };
    });
}

/**
 * Draw the heatmap
 * @param {object} heatmapData - The preprocessed heatmap data
 * @param {string} selected_column - The selected column
 */
function generateHeatMap(heatmapData, selected_column) {
    // Remove existing heatmap
    d3.select("#heat-map-viz").select("svg").remove();

    // Get container dimensions
    const [containerWidth, containerHeight] =
        getContainerSize("right-container");

    // Set the dimensions and margins of the graph
    const margin = { top: 70, right: 140, bottom: 100, left: 100 };
    const width = containerWidth - margin.left - margin.right;
    const height =
        containerHeight * (3 / 5) - margin.top - margin.bottom;

    // Append the svg object
    const svg = d3
        .select("#heat-map-viz")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("style", "max-width: 100%; height: auto;")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Get variable names for x axis groups
    const myGroups = heatmapData.xVars;
    const myVars = heatmapData.yVars;

    // Define color scale with green (low) -> yellow (middle) -> orange (high)
    const colorScale = d3
        .scaleLinear()
        .domain([
            0,
            heatmapData.maxValue * 0.4,
            heatmapData.maxValue * 0.6,
            heatmapData.maxValue,
        ])
        .range(["#00cc00", "#bbfc23", "#fcf223", "#fc5223"]);

    // Create x axis
    const x = d3
        .scaleBand()
        .range([0, width])
        .domain(myGroups)
        .padding(0.01);

    // Create y axis
    const y = d3
        .scaleBand()
        .range([0, height])
        .domain(myVars)
        .padding(0.01);

    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,10) rotate(-40)")
        .style("text-anchor", "end");

    // Add X axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + 60) // position below x-axis ticks
        .attr("font-family", "sans-serif")
        .attr("font-size", "14px")
        .text("Year");

    // Add Y axis
    svg.append("g").call(d3.axisLeft(y));

    // Add Y axis label
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr(
            "transform",
            `translate(${-60},${height / 2}) rotate(-90)`
        ) // rotate text vertically on left
        .attr("font-family", "sans-serif")
        .attr("font-size", "14px")
        .text("Quarter");

    // Define tooltip before appending cells
    d3.select("#heat-map-viz .tooltip").remove();
    const tooltip = d3
        .select("#heat-map-viz")
        .append("div")
        .style("opacity", 0)
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "1px")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("pointer-events", "none")
        .style("position", "absolute");

    // First create a group for all heatmap cells
    const heatmapCells = svg.append("g").attr("id", "heatmap-cells");

    // Then append all rectangles to this group
    heatmapCells
        .selectAll()
        .data(heatmapData.correlationData, (d) => `${d.x}:${d.y}`)
        .enter()
        .append("rect")
        .attr("x", (d) => x(d.x))
        .attr("y", (d) => y(d.y))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", (d) =>
            d.value === null ? "grey" : colorScale(d.value)
        )
        .style("stroke", "#ddd")
        .style("stroke-width", "0.5px")
        .on("mouseover", function (event, d) {
            tooltip.style("opacity", 1);
        })
        .on("mousemove", function (event, d) {
            tooltip
                .html(`Actual Value: ${d.actualValue}`)
                .style("left", event.pageX + 2 + "px")
                .style("top", event.pageY - 3 + "px");
        });

    // Add mouseleave to the SVG
    d3.select("#heatmap-cells").on("mouseleave", function () {
        tooltip.transition().duration(0).style("opacity", 0);
    });

    // Add heatmap legend
    addHeatmapLegend(
        heatmapData,
        selected_column,
        containerWidth,
        containerHeight
    );
}

/**
 * Adds the legend to the heatmap
 * @param {object} heatmapData - The heatmap data for selected column and state
 * @param {*} selected_column - selected column
 * @param {*} containerWidth - right container width
 * @param {*} containerHeight - right container height
 */
function addHeatmapLegend(
    heatmapData,
    selected_column,
    containerWidth,
    containerHeight
) {
    // Remove previous legend
    const svg = d3.select("#heat-map-viz").select("svg").select("g");
    d3.select("#heatmap-legend").remove();

    // Dimensions of heatmap svg
    const margin = { top: 70, right: 140, bottom: 100, left: 100 }; // increased right margin for vertical legend
    const width = containerWidth - margin.left - margin.right;
    const height =
        containerHeight * (3 / 5) - margin.top - margin.bottom;

    // Legend dimensions
    const legendWidth = height / 10;
    const legendHeight = height - 40;
    const legendMargin = { top: 0, right: 0, bottom: 0, left: 10 };

    // Append a group for legend at the right side of heatmap (translated by width + margin.left + some spacing)
    const legendSvg = svg
        .append("g")
        .attr("id", "heatmap-legend")
        .attr(
            "transform",
            `translate(${width + legendMargin.left + 30}, 0)`
        );

    // Create legend scale (same domain as colorScale) and set tick values
    let legendScale;
    let tickVals;

    // Set tick values based on selected column
    if (!percent_columns.includes(selected_column)) {
        // Set tick values for non-percent columns
        legendScale = d3
            .scaleLinear()
            .domain([0, heatmapData.maxValue])
            .range([legendHeight, 0]); // vertical scale, invert to match heatmap orientation
        tickVals = [
            0,
            heatmapData.maxValue * 0.4,
            heatmapData.maxValue * 0.6,
            heatmapData.maxValue,
        ];
    } else {
        // Set tick values for percent columns
        legendScale = d3
            .scaleLinear()
            .domain([0, 5, 10, 20, 70])
            .range([
                legendHeight,
                legendHeight * 0.8,
                legendHeight * 0.6,
                legendHeight * 0.3,
                0,
            ]); // vertical scale, invert to match heatmap orientation
        tickVals = [0, 5, 10, 20, 70];
    }

    // Create legend axis with ticks (vertical axis)
    const legendAxis = d3
        .axisRight(legendScale)
        .tickValues(tickVals)
        .tickFormat(d3.format(".0f"));

    // Add gradient defs
    const defs = svg.append("defs");
    const gradient = defs
        .append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

    // Define gradient stops
    gradientData = [
        { offset: "0%", color: "#00cc00" },
        { offset: "40%", color: "#bbfc23" },
        { offset: "60%", color: "#fcf223" },
        { offset: "100%", color: "#fc5223" },
    ];

    // Append gradient stops
    gradient
        .selectAll("stop")
        .data(gradientData)
        .enter()
        .append("stop")
        .attr("offset", (d) => d.offset)
        .attr("stop-color", (d) => d.color);

    // Append rectangle with gradient fill for legend
    legendSvg
        .append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

    // Append axis to legend group
    legendSvg
        .append("g")
        .attr("transform", `translate(${legendWidth},0)`)
        .call(legendAxis);

    // Define legend labels
    let labels = {
        num_colonies: "# of colonies",
        max_colonies: "# of colonies",
        lost_colonies: "# of colonies",
        percent_lost: "Percentage (%)",
        added_colonies: "# of colonies",
        renovated_colonies: "# of colonies",
        percent_renovated: "Percentage (%)",
        varroa_mites: "Percentage (%)",
        other_pests_and_parasites: "Percentage (%)",
        diseases: "Percentage(%)",
        pesticides: "Percentage (%)",
    };

    // Add legend label
    legendSvg
        .append("text")
        .attr("x", legendWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("font-family", "sans-serif")
        .attr("font-size", "12px")
        .text(labels[selected_column]);

    // Add Null color swatch
    legendSvg
        .append("rect")
        .attr("x", legendWidth - 35)
        .attr("y", legendHeight + 10)
        .attr("width", legendWidth)
        .attr("height", 20)
        .style("fill", "grey");

    // Add Null color swatch label
    legendSvg
        .append("text")
        .attr("x", legendWidth + 15)
        .attr("y", legendHeight + 25)
        .style("fill", "black")
        .text("N/A")
        .attr("text-anchor", "left")
        .attr("text-anchor", "middle")
        .attr("font-family", "sans-serif")
        .attr("font-size", "12px");
}

/**
 * Update the heatmap when switching states (not when changing columns)
 * @param {object} heatmapData - The heatmap data of selected state and column
 * @param {string} selected_column - The selected column
 */
function updateHeatmap(heatmapData, selected_column) {
    // Set color scale
    let colorScale = d3
        .scaleLinear()
        .domain([
            0,
            heatmapData.maxValue * 0.4,
            heatmapData.maxValue * 0.6,
            heatmapData.maxValue,
        ])
        .range(["#00cc00", "#bbfc23", "#fcf223", "#fc5223"]);

    // Select heatmap cells
    const heatmapCells = d3.select("#heatmap-cells");

    // Get current heatmap cells
    const rects = heatmapCells
        .selectAll("rect")
        .data(heatmapData.correlationData, (d) => `${d.x}:${d.y}`);

    // (1) Fade out prior heatmap cells, (2) then transition to new heatmap by quarter and value, (3) fade new heatmap cells in
    rects
        .transition()
        .duration(0)
        .style("opacity", 0.2)
        .transition()
        .delay((d, i) => i * 70)
        .duration(700)
        .style("fill", (d) =>
            d.value === null ? "grey" : colorScale(d.value)
        )
        .style("opacity", 1);

    // Get current container dimensions for legend update
    const [containerWidth, containerHeight] =
        getContainerSize("right-container");

    // Update heatmap legend
    addHeatmapLegend(
        heatmapData,
        selected_column,
        containerWidth,
        containerHeight
    );
}



// <----------------------------------------------- MAIN FUNCTIONS ----------------------------------------------->
function main() {
    // Initialize visualizations (heatmap and bubble map)
    initializeVisualization();

    // Listen to dropdown changes
    document
        .getElementById("myDropdown")
        .addEventListener("change", function () {
            selected_column = this.value;
            if (selected_column == "select_metrics") {
                selected_column_name = "select_metrics";
                selected_state = "";
                const state = document.getElementById("state");
                state.textContent = "in {select state}";

                d3.select("#bubble-map-viz").selectAll("*").remove();
                d3.select("#us-map").selectAll("*").remove();
                d3.select("#heat-map-viz").selectAll("*").remove();

                document.getElementById("description").textContent =
                    descriptions[selected_column];
                return;
            }

            document.getElementById("description").textContent =
                descriptions[selected_column];
            preprocessHeatMap(selected_state, selected_column).then(
                (heatmapData) => {
                    generateHeatMap(heatmapData, selected_column);
                }
            );
            preprocessBubbleData(selected_column).then(
                (aggregated_data) => {
                    generateBubbleMap(aggregated_data);
                }
            );
        });
}

// Listen to window resize
window.addEventListener("resize", debounce(resizeVisualization, 250));

// Call main function
main();