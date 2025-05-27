// Reference: https://observablehq.com/@d3/us-state-choropleth/2
function preprocessNumColonies() {
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
            .data(states.features)
            .join("path")
            .attr("fill", "#ccc")
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .attr("d", path);

        // Create a scale for bubble size
        const bubbleRadiusScale = d3
            .scaleLog()
            .base(10) // Could use another scale function
            .domain([3616, 2917015]) // Min and max values of num colonies
            .range([5, 30]); // Min and max bubble sizes

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

        // Add bubbles with corrected event handlers
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
                tooltip
                    .transition()
                    .duration(200)
                    .style("opacity", 0);
                d3.select(this).attr("fill", "#9DA0FF");
            })
            .on("click", function (event, d) {
                alert(
                    d.properties.name +
                        " has an average of " +
                        numColonies[d.properties.name] +
                        " colonies"
                );
            });

        // Draw state boundaries
        svg.append("path")
            .datum(
                topojson.mesh(
                    us,
                    us.objects.states,
                    (a, b) => a !== b
                )
            )
            .attr("fill", "none")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1)
            .attr("stroke-linejoin", "round")
            .attr("d", path);
    });
}

function main() {
    preprocessNumColonies().then((numColonies) => {
        generateBubbleMap(numColonies);
    });
}

main();