paleta = {
    base: "#465778",
    pais_seleccionado: "#ef8762"
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
    const countryMap = await fetch('Resources/map/mapping.csv')
        .then(response => response.text())
        .then(csvText => {
            const rows = csvText.split('\n').slice(1); // Skip the header row
            return rows.reduce((map, row) => {
                const [id, name] = row.split(',');
                map[id.trim().replace(/^"|"$/g, '')] = name.trim().replace(/^"|"$/g, '');
                return map;
            }, {});
        });

    // Select all countries as a D3 selection
    const countries = d3.selectAll('.country');

    // Set a random opacity for each country
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
            const padding = 20;
            const x = bbox.x - padding;
            const y = bbox.y - padding;
            const width = bbox.width + padding * 2;
            const height = bbox.height + padding * 2;

            svg.transition()
                .duration(750)
                .attr("viewBox", `${x} ${y} ${width} ${height}`);
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

        // Reset the zoom to the original viewBox
        svg.transition()
            .duration(750)
            .attr("viewBox", "0 235 900 470");
    });
});