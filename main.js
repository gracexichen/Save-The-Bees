// Reference: https://observablehq.com/@d3/us-state-choropleth/2
function generateBubbleMap() {
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
            .attr("d", path)
            .on("click", function (event, d) {
                // Display state name
                alert(d.properties.name); // Or use a tooltip instead of alert
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
    generateBubbleMap();
}

main();