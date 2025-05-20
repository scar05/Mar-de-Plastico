paleta = {
    base: "#465778",
    pais_seleccionado: "#ef8762",
    gris_no_importante: "#E6E6E6"
}

function chart () {
  const width = 975;
  const height = 610;

  const zoom = d3.zoom()
      .scaleExtent([1, 8])
      .on("zoom", zoomed);

  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
       .attr("width", width)
      .attr("height", height)
      .attr("style", "max-width: 100%; height: auto;")
      .on("click", reset);

  const path = d3.geoPath();

  const g = svg.append("g");

  const states = g.append("g")
      .attr("fill", "#444")
      .attr("cursor", "pointer")
    .selectAll("path")
    .data(topojson.feature(us, us.objects.states).features)
    .join("path")
      .on("click", clicked)
      .attr("d", path);
  
  states.append("title")
      .text(d => d.properties.name);

  g.append("path")
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-linejoin", "round")
      .attr("d", path(topojson.mesh(us, us.objects.states, (a, b) => a !== b)));

  svg.call(zoom);

  function reset() {
    states.transition().style("fill", null);
    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity,
      d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
    );
  }

  function clicked(event, d) {
    const [[x0, y0], [x1, y1]] = path.bounds(d);
    event.stopPropagation();
    states.transition().style("fill", null);
    d3.select(this).transition().style("fill", "red");
    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
        .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
      d3.pointer(event, svg.node())
    );
  }

  function zoomed(event) {
    const {transform} = event;
    g.attr("transform", transform);
    g.attr("stroke-width", 1 / transform.k);
  }

  return svg.node();
}

document.addEventListener('DOMContentLoaded', async () => {
    const yearSlider = document.getElementById('year-slider');
    const yearDisplay = document.getElementById('year-display');

    // Update the year display when the slider value changes
    yearSlider.addEventListener('input', (event) => {
        yearDisplay.textContent = event.target.value;
    });

    // Load the CSV mapping file
    let countryMap = {};
    try {
        countryMap = await fetch('Resources/map/mapping.csv')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(csvText => {
                const rows = csvText.split('\n').slice(1); // Skip the header row
                return rows.reduce((map, row) => {
                    const [id, name] = row.split(',');
                    map[id.trim().replace(/^"|"$/g, '')] = name.trim().replace(/^"|"$/g, '');
                    return map;
                }, {});
            });
    } catch (error) {
        console.error('Failed to load the mapping file:', error);
    }

    // Select all countries as a D3 selection
    const countries = d3.selectAll('.country');

    countries.each(function () {
        //const randomOpacity = Math.random() * (1 - 0.4) + 0.4; // Generate a random value between 0.6 and 1
        //d3.select(this).style("opacity", randomOpacity);
    });

    // Select the SVG and set up zoom behavior
    const svg = d3.select(".map-svg");

    // Set up zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([1, 8]) // Set zoom scale limits
        .on("zoom", (event) => {
            svg.attr("transform", event.transform); // Apply zoom transform
        });

    // Disable scroll zoom behavior
    svg.call(zoom).on("wheel.zoom", null).on("dblclick.zoom", null);

    // Function to zoom to a specific country
    function zoomToCountry(countryId) {
        const country = d3.select(`#${countryId}`);
        if (!country.empty()) {
            const bbox = country.node().getBBox();
            const padding = 10; // Add some padding around the country
            const x = bbox.x - padding;
            const y = bbox.y - padding;
            const width = bbox.width + padding * 2;
            const height = bbox.height + padding * 2;

            // Adjust the x-coordinate to position the country on the left side
            const viewBoxX = x - (width * 0.75); // Shift the country to the left
            const viewBoxY = y;

            svg.transition()
                .duration(750)
                .attr("viewBox", `${viewBoxX} ${viewBoxY} ${width} ${height}`);
        }
    }

    // Add click event to each country
    countries.on("click", function () {
        const countryGroup = d3.select(this); // Select the clicked <g> or <path>
        const countryId = countryGroup.attr("id");
        const countryName = countryMap[countryId];

        // Remove the 'selected' class from all countries
        countries.classed("selected", false);

        // Add the 'selected' class to the clicked country
        countryGroup.classed("selected", true);

        // Handle <g> and <path> objects
        if (countryGroup.node().tagName === "g") {
            // If it's a <g>, set the color for all child <path> elements
            countryGroup.selectAll("path").style("fill", paleta.pais_seleccionado);
        } else if (countryGroup.node().tagName === "path") {
            // If it's a <path>, set the color directly
            countryGroup.style("fill", paleta.pais_seleccionado);
        }

        // Set all other countries to paleta.gris_no_importante
        countries.filter(function () {
            return !d3.select(this).classed("selected");
        }).each(function () {
            const otherCountry = d3.select(this);
            if (otherCountry.node().tagName === "g") {
                // If it's a <g>, set the color for all child <path> elements
                otherCountry.selectAll("path").style("fill", paleta.gris_no_importante);
            } else if (otherCountry.node().tagName === "path") {
                // If it's a <path>, set the color directly
                otherCountry.style("fill", paleta.gris_no_importante);
            }
        });

        // Remove hover effect by disabling pointer events for all countries
        //countries.style("pointer-events", "none");
        //countryGroup.style("pointer-events", "auto"); // Keep pointer events for the selected country

        if (countryName) {
            console.log(`Country ID: ${countryId}, Country Name: ${countryName}`);
        } else {
            console.log(`Country ID: ${countryId}, Country Name: Not Found`);
        }

        zoomToCountry(countryId);
    });

    // Add double-click event to reset zoom
    svg.on("dblclick", function () {
        // Reset all countries to the base color by removing the 'selected' class
        countries.classed("selected", false);

        // Reset the color of all countries to paleta.base
        countries.each(function () {
            const country = d3.select(this);
            if (country.node().tagName === "g") {
                // If it's a <g>, reset the color for all child <path> elements
                country.selectAll("path").style("fill", paleta.base);
            } else if (country.node().tagName === "path") {
                // If it's a <path>, reset the color directly
                country.style("fill", paleta.base);
            }
        });

        // Re-enable hover effect by restoring pointer events
        countries.style("pointer-events", "auto");

        // Reset the zoom to the original viewBox
        svg.transition()
            .duration(750)
            .attr("viewBox", "0 235 900 470");
    });
});