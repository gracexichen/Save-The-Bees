// Reference: https://observablehq.com/@d3/us-state-choropleth/2

const percent_columns = [
  "percent_lost",
  "percent_renovated",
  "varroa_mites",
  "other_pests_and_parasites",
  "diseases",
  "pesticides"
];

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

function generateBubbleMap(numColonies) {
    d3.select("#bubble-map-viz").select("svg").remove();

    d3.json("/data/counties-albers-10m.json").then((us) => {
        const path = d3.geoPath();

        const states = topojson.feature(us, us.objects.states);

        // Create the SVG
        const svg = d3
            .select("#bubble-map-viz")
            .append("svg")
            .attr("width", 975)
            .attr("height", 610)
            .attr("viewBox", [0, 0, 975, 610])
            .attr("style", "max-width: 100%; height: auto;");

        // Draw state interiors
        svg.append("g")
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

        // Create a scale for bubble size
        const bubbleRadiusScale = d3
            .scaleLog()
            .base(10) // Could use another scale function
            .domain([
                Math.max(
                    Math.min(...Object.values(numColonies)),
                    1e-6
                ),
                Math.max(...Object.values(numColonies)),
            ]) // Min and max values of num colonies
            .range([10, 35]); // Min and max bubble sizes

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

        // Tooltip
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
        svg.append("g")
            .selectAll("circle")
            .data(states.features)
            .join("circle")
            .attr("cx", (d) => path.centroid(d)[0])
            .attr("cy", (d) => path.centroid(d)[1])
            .attr("r", (d) =>
                bubbleRadiusScale(numColonies[d.properties.name])
            )
            .attr("fill", "#9DA0FF")
            .attr("border", "none")
            .on("mouseover", function (event, d) {
                d3.select(this).attr("fill", "#ffe0ad");
                tooltip.style("opacity", 1);
            })
            .on("mousemove", function (event, d) {
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
                if (selected_state === d.properties.name) {
                    d3.selectAll("circle").attr("fill", "#9DA0FF");
                    d3.select(this).attr("fill", "#ffe0ad");
                    return;
                }
                d3.select(this).attr("fill", "#9DA0FF");
                tooltip
                    .transition()
                    // .duration(100)
                    .style("opacity", 0);
            })
            .on("click", function (event, d) {
                // alert(
                //     d.properties.name +
                //         " has an average of " +
                //         numColonies[d.properties.name] +
                //         " colonies"
                // );
                preprocessHeatMap(
                    d.properties.name,
                    selected_column
                ).then((heatmapData) => {
                    updateHeatmap(heatmapData, selected_column);
                });
                selected_state = d.properties.name;
                const state = document.getElementById("state");
                state.textContent = "in " + d.properties.name;
            });
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

    const usBubbleGroup = usSvg.append("g");

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
            preprocessHeatMap("United States", selected_column).then(
                (heatmapData) => {
                    updateHeatmap(heatmapData, selected_column);
                }
            );
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
}

function preprocessHeatMap(state, column) {
    return d3.csv("data/save_the_bees.csv").then((data) => {
        const xVars = [
            2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022,
        ];
        const yVars = [1, 2, 3, 4];

        let heatmapData = [];
        let maxValue = 0;

        const stateData = data.filter((d) => d.state === state);

        xVars.forEach((year) => {
            yVars.forEach((quarter) => {
                const entry = stateData.find(
                    (d) => +d.year === year && +d.quarter === quarter
                );

                if (entry) {
                    heatmapData.push({
                        x: year,
                        y: quarter,
                        value: +entry[column] || 0,
                        actualValue: +entry[column] || 0,
                    });
                    if (+entry[column] > maxValue) {
                        maxValue = +entry[column];
                    }
                } else {
                    heatmapData.push({
                        x: year,
                        y: quarter,
                        value: null,
                        actualValue: null,
                    });
                }
            });
        });
        if (!column.includes("percent")) {
            heatmapData = heatmapData.map((d) => ({
                x: d.x,
                y: d.y,
                value: d.value,
                actualValue: d.actualValue,
            }));
        }

        return {
            xVars: xVars,
            yVars: yVars,
            correlationData: heatmapData,
            maxValue: maxValue,
        };
    });
}

function generateHeatMap(heatmapData, selected_column) {
    d3.select("#heat-map-viz").select("svg").remove();

    // Set the dimensions and margins of the graph
    const margin = { top: 70, right: 140, bottom: 100, left: 100 }; // increased right margin for vertical legend
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Append the svg object
    const svg = d3
        .select("#heat-map-viz")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Get variable names for x axis groups
    const myGroups = heatmapData.xVars;
    const myVars = heatmapData.yVars;

    let colorScale;
    //change color scale based on the category
    // Define color scale - now with green (low) -> orange (middle) -> red (high)
    colorScale = d3
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
        .range([height, 0])
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

    // Define tooltip BEFORE appending cells
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

    addHeatmapLegend(heatmapData, selected_column);
}

function addHeatmapLegend(heatmapData, selected_column) {
    const svg = d3.select("#heat-map-viz").select("svg").select("g");
    d3.select("#heatmap-legend").remove();
    // dimensions of heatmap svg
    const margin = { top: 70, right: 140, bottom: 100, left: 100 }; // increased right margin for vertical legend
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // === VERTICAL LEGEND ON THE RIGHT SIDE ===
    // Legend dimensions
    const legendWidth = 20;
    const legendHeight = height - 40;
    const legendMargin = { top: 0, right: 0, bottom: 0, left: 10 };

    // Append a group for legend at the right side of heatmap (translated by width + margin.left + some spacing)
    const legendSvg = svg
        .append("g").attr("id", "heatmap-legend")
        .attr(
            "transform",
            `translate(${width + legendMargin.left + 30}, 0)`
        );

    // Create legend scale (same domain as colorScale) and set tick values
    let legendScale;
    let tickVals;
    if (!percent_columns.includes(selected_column)) {
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

    gradientData = [
        { offset: "0%", color: "#00cc00" },
        { offset: "40%", color: "#bbfc23" },
        { offset: "60%", color: "#fcf223" },
        { offset: "100%", color: "#fc5223" },
    ];

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
        .attr("x", legendWidth - 20)
        .attr("y", legendHeight + 10)
        .attr("width", legendWidth)
        .attr("height", 20)
        .style("fill", "grey");
    // Add Null color swatch label
    legendSvg
        .append("text")
        .attr("x", legendWidth + 25)
        .attr("y", legendHeight + 25)
        .style("fill", "black")
        .text("No data")
        .attr("text-anchor", "left")
        .attr("text-anchor", "middle")
        .attr("font-family", "sans-serif")
        .attr("font-size", "12px");
}


function updateHeatmap(heatmapData, selected_column) {
    let colorScale = d3
        .scaleLinear()
        .domain([
            0,
            heatmapData.maxValue * 0.4,
            heatmapData.maxValue * 0.6,
            heatmapData.maxValue,
        ])
        .range(["#00cc00", "#bbfc23", "#fcf223", "#fc5223"]);

    const heatmapCells = d3.select("#heatmap-cells")

    const rects = heatmapCells.selectAll("rect")
        .data(heatmapData.correlationData, (d) => `${d.x}:${d.y}`)

    
    rects
        .transition()
        .duration(0)
        .style("opacity", 0.2) // Fade out prior heatmap cells before transitioning
        .transition()
        .delay((d, i) => i * 70)
        .duration(700)
        .style("fill", d => d.value === null ? "grey" : colorScale(d.value)) // Step 2: update color
        .style("opacity", 1); // Step 3: fade back in

    addHeatmapLegend(heatmapData, selected_column);
}



// global variables
let selected_column = "select_metrics";
let selected_column_name = "select_metrics";
let selected_state = "";

//Object of descritions
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

function main() {
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

main();