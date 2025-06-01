// Reference: https://observablehq.com/@d3/us-state-choropleth/2



function preprocessNumColonies() {
    // Returns the average number of colonies per state as a dictionary
    return d3.csv("data/save_the_bees.csv").then((data) => {
        let numColoniesCount = {};

        data.forEach((entry) => {
            const state = entry["state"];
            const colonies = +entry["num_colonies"];

            if (!numColoniesCount[state]) {
                numColoniesCount[state] = {
                    totalColonies: 0,
                    count: 0,
                };
            }

            numColoniesCount[state].totalColonies += colonies;
            numColoniesCount[state].count += 1;
        });

        let averageColonies = {};
        Object.keys(numColoniesCount).forEach((state) => {
            averageColonies[state] =
                numColoniesCount[state].totalColonies /
                numColoniesCount[state].count;
        });

        return averageColonies;
    });
}

function generateBubbleMap(numColonies) {
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
            .domain([3616, 2917015]) // Min and max values of num colonies
            .range([10, 35]); // Min and max bubble sizes

        // Tooltip
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
                        ).toLocaleString()} colonies`
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
                    generateHeatMap(heatmapData);
                });
                selected_state = d.properties.name;
            });

        // Draw state boundaries
        svg.append("path")
            .datum(
                topojson.mesh(us, us.objects.states, (a, b) => {
                    return a !== b;
                })
            )
            .attr("fill", "none")
            .attr("stroke-linejoin", "round")
            .attr("d", path);
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
                    generateHeatMap(heatmapData);
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
                        value: 0,
                        actualValue: 0,
                    });
                }
            });
        });
        if (!column.includes("percent")) {
            heatmapData = heatmapData.map((d) => ({
                x: d.x,
                y: d.y,
                value: (d.value / maxValue) * 100,
                actualValue: d.actualValue,
            }));
        }
        return {
            xVars: xVars,
            yVars: yVars,
            correlationData: heatmapData,
        };
    });
}

function generateHeatMap(heatmapData) {
    d3.select("#heat-map-viz").select("svg").remove();

    // Set the dimensions and margins of the graph
    const margin = { top: 70, right: 30, bottom: 100, left: 100 };
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

    // Add Y axis
    svg.append("g").call(d3.axisLeft(y));

    const colorScale = d3
        .scaleLinear()
        .domain([0, 100])
        .range(["#ffffff", "#1a9850"]);

    // Add the heatmap cells
    svg.selectAll()
        .data(heatmapData.correlationData, (d) => `${d.x}:${d.y}`)
        .enter()
        .append("rect")
        .attr("x", (d) => x(d.x))
        .attr("y", (d) => y(d.y))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", (d) => colorScale(d.value))
        .style("stroke", "#ddd")
        .style("stroke-width", "0.5px")
        .on("mouseover", function (event, d) {
            tooltip.style("opacity", 1);
        })
        .on("mousemove", function (event, d) {
            tooltip
                .html(
                    `
                Actual Value: ${d.actualValue}<br>
                Heat Value: ${d.value.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                })}%
              `
                )
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 30 + "px");
        })
        .on("mouseleave", function (event, d) {
            tooltip.transition().duration(200).style("opacity", 0);
        });

    // Define tooltip
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
        .style("position", "absolute");

    // Legend dimensions
    // const legendWidth = 120;
    // const legendHeight = 10;
    // const legendMargin = { top: 0, right: 30, bottom: 30, left: 30 };

    // Create a legend
    // const legendSvg = d3
    //     .select("#heat_map")
    //     .append("svg")
    //     .attr(
    //         "width",
    //         legendWidth + legendMargin.left + legendMargin.right
    //     )
    //     .attr(
    //         "height",
    //         legendHeight + legendMargin.top + legendMargin.bottom
    //     )
    //     .append("g")
    //     .attr(
    //         "transform",
    //         `translate(${legendMargin.left},${legendMargin.top})`
    //     );

    // // Create legend scale
    // const legendScale = d3
    //     .scaleLinear()
    //     .domain([-0.25, 0.25])
    //     .range([0, legendWidth]);

    // // Create legend axis with ticks
    // const legendAxis = d3
    //     .axisBottom(legendScale)
    //     .ticks(5)
    //     .tickFormat(d3.format(".1f"));

    // // Add legend axis
    // legendSvg
    //     .append("g")
    //     .attr("class", "legend-axis")
    //     .attr("transform", `translate(0,${legendHeight})`)
    //     .call(legendAxis);

    // // Add gradient colors
    // const defs = legendSvg.append("defs");
    // const gradient = defs
    //     .append("linearGradient")
    //     .attr("id", "legend-gradient")
    //     .attr("x1", "0%")
    //     .attr("y1", "0%")
    //     .attr("x2", "100%")
    //     .attr("y2", "0%");

    // // Add red
    // gradient
    //     .append("stop")
    //     .attr("offset", "0%")
    //     .attr("stop-color", "#d73027");

    // // Add white
    // gradient
    //     .append("stop")
    //     .attr("offset", "50%")
    //     .attr("stop-color", "#ffffff");

    // // Add green
    // gradient
    //     .append("stop")
    //     .attr("offset", "100%")
    //     .attr("stop-color", "#1a9850");

    // // Append legend to svg (with gradient)
    // legendSvg
    //     .append("rect")
    //     .attr("width", legendWidth)
    //     .attr("height", legendHeight)
    //     .style("fill", "url(#legend-gradient)");

    // // Add annotations for legend
    // d3.select("#heat-map-viz")
    //     .append("svg")
    //     .attr("width", legendWidth)
    //     .attr(
    //         "height",
    //         legendHeight + legendMargin.top + legendMargin.bottom
    //     )
    //     .append("text")
    //     .attr("x", legendMargin.left - 30)
    //     .attr("y", legendMargin.top + 15)
    //     .attr("font-family", "sans-serif")
    //     .attr("font-size", "12px")
    //     .text("Correlation (Pearson)");
}

// global variables
let selected_column = "num_colonies";
let selected_column_name = "Number of Colonies";
let selected_state = "California"; // TODO: change to default to entire US

function main() {
    // Initialize bubble map
    preprocessNumColonies().then((numColonies) => {
        generateBubbleMap(numColonies);
    });

    // Initialize heat map
    preprocessHeatMap(selected_state, selected_column).then(
        (heatmapData) => {
            generateHeatMap(heatmapData);
        }
    );

    // Listen to dropdown changes
    document
        .getElementById("myDropdown")
        .addEventListener("change", function () {
            selected_column = this.value;
            preprocessHeatMap(selected_state, selected_column).then(
                (heatmapData) => {
                    generateHeatMap(heatmapData);
                }
            );
        });
}

main();