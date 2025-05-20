paleta = {
  base: "#465778",
  pais_seleccionado: "#ef8762",
};

function chart() {
  const width = 975;
  const height = 610;

  const zoom = d3.zoom().scaleExtent([1, 8]).on("zoom", zoomed);

  const svg = d3
    .create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .attr("style", "max-width: 100%; height: auto;")
    .on("click", reset);

  const path = d3.geoPath();

  const g = svg.append("g");

  const states = g
    .append("g")
    .attr("fill", "#444")
    .attr("cursor", "pointer")
    .selectAll("path")
    .data(topojson.feature(us, us.objects.states).features)
    .join("path")
    .on("click", clicked)
    .attr("d", path);

  states.append("title").text((d) => d.properties.name);

  g.append("path")
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr("stroke-linejoin", "round")
    .attr("d", path(topojson.mesh(us, us.objects.states, (a, b) => a !== b)));

  svg.call(zoom);

  function reset() {
    states.transition().style("fill", null);
    svg
      .transition()
      .duration(750)
      .call(
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
    svg
      .transition()
      .duration(750)
      .call(
        zoom.transform,
        d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(
            Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height))
          )
          .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
        d3.pointer(event, svg.node())
      );
  }

  function zoomed(event) {
    const { transform } = event;
    g.attr("transform", transform);
    g.attr("stroke-width", 1 / transform.k);
  }

  return svg.node();
}

document.addEventListener("DOMContentLoaded", async () => {
  let selectedCountryId = null; // ← VARIABLE GLOBAL DENTRO DE ESTE BLOQUE
  const yearSlider = document.getElementById("year-slider");
  const yearDisplay = document.getElementById("year-display");
  const leftPanel = document.querySelector('.basura-container');
  const rightPanel = document.querySelector('.panel');

  // Update the year display when the slider value changes
  yearSlider.addEventListener("input", (event) => {
    yearDisplay.textContent = event.target.value;
    renderizarBasura(selectedCountryId, event.target.value);
  });

  // Cambiar número al mover el slider
  yearSlider.addEventListener("input", (event) => {
    yearDisplay.value = event.target.value;
    renderizarBasura(selectedCountryId, event.target.value);
  });

  // Cambiar slider al escribir un número
  yearDisplay.addEventListener("input", () => {
    let val = parseInt(yearDisplay.value);
    if (!isNaN(val)) {
      val = Math.max(
        parseInt(yearSlider.min),
        Math.min(parseInt(yearSlider.max), val)
      );
      yearSlider.value = val;
      yearDisplay.value = val;
      renderizarBasura(selectedCountryId, val);
    }
  });

  // Load the CSV mapping file
  const countryMap = await fetch("Resources/map/mapping.csv")
    .then((response) => response.text())
    .then((csvText) => {
      const parsed = d3.csvParse(csvText);
      return parsed.reduce((map, row) => {
        const id = row["Country Code"].trim();
        map[id] = {
          name: row["Country Name"].trim(),
          capital: row["Capital"].trim(),
          poblacion: +row["Poblacion"],
          area: +row["Area"],
        };
        return map;
      }, {});
    });

  const basuraData = await fetch("Resources/map/dataset-voluntariados-id.csv")
    .then((res) => res.text())
    .then((d) => d3.csvParse(d));

  const basuraCatalogo = await fetch("Resources/map/basura_catalogo.csv")
    .then((res) => res.text())
    .then((csvText) => {
      const parsed = d3.csvParse(csvText);
      return parsed.reduce((map, d) => {
        map[d.basura_id] = {
          nombre: d.nombre,
          imagen: d.imagen,
        };
        return map;
      }, {});
    });

  function calcularTamaño(proporcion) {
    if (proporcion >= 0.7) return 220; // muy grande
    if (proporcion >= 0.4) return 150; // grande
    if (proporcion >= 0.2) return 100; // medio
    return 40; // pequeño
  }

  function renderizarBasura(paisId, año) {
    año = String(año);

    const encabezado = d3.select("#basura-encabezado");

    if (paisId && countryMap[paisId]) {
      encabezado.text(
        `Basura presente en ${countryMap[paisId].name} en ${año}`
      );
    } else {
      encabezado.text(`Basura presente en ${año}`);
    }

    const datosFiltrados = basuraData.filter(
      (d) => String(d.año) === año && (paisId === null || d.pais_id === paisId)
    );

    // Agrupar por basura_id y sumar cantidades
    const resumen = d3.rollup(
      datosFiltrados,
      (v) => d3.sum(v, (d) => +d.cantidad), // Convertir cantidad a número
      (d) => d.basura_id
    );

    // Convertir Map a array para usar d3.max
    const resumenArray = Array.from(resumen.entries());

    // 1. Calcular total global de basura
    const totalBasura = d3.sum(resumenArray, ([_, cantidad]) => +cantidad);

    // 2. Escala basada en proporción del total pero con escala no lineal
    const escalaTamaño = d3.scaleSqrt().domain([0,1]).range([40, 220]); // 40px para lo mínimo, 100px para lo máximo

    // Limpiar contenedor
    const contenedor = d3.select("#basura-list");
    contenedor.selectAll("*").remove();

    resumenArray.forEach(([basura_id, cantidad]) => {
      const catalogo = basuraCatalogo[basura_id];
      if (!catalogo) return;

      const cantidadNum = +cantidad;
      const proporcion = cantidadNum / totalBasura;
      const tamaño = escalaTamaño(proporcion);

      console.log(`${catalogo.nombre}-> cantidad: ${cantidad}, tamaño: ${tamaño}px`);

      const item = contenedor.append("div")
        .attr("class", "basura-item")
        .attr("title", `${catalogo.nombre}`);

      const imageWrapper = item
        .append("div")
        .attr("class", "basura-imagen-wrapper")
        .style("width", `${tamaño}px`)
        .style("height", `${tamaño}px`);

      imageWrapper
        .append("img")
        .attr("src", `Resources/images/basura/${catalogo.imagen}`)
        .attr("alt", catalogo.nombre)
        .attr("class", "basura-svg")
      ;

      imageWrapper
        .append("div")
        .attr("class", "cantidad-superpuesta")
        .text(cantidad);
    });
  }

  // Select all countries as a D3 selection
  const countries = d3.selectAll(".country");

  const tooltip = d3.select("#tooltip");

  // Select the SVG and set up zoom behavior
  const svg = d3.select(".map-svg");

  // Set up zoom behavior
  const zoom = d3
    .zoom()
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

      svg
        .transition()
        .duration(750)
        .attr("viewBox", `${x} ${y} ${width} ${height}`);
    }
  }

  // Add click event to each country
  countries.on("click", function () {
    const countryGroup = d3.select(this);
    const countryId = countryGroup.attr("id");
    const info = countryMap[countryId];
    rightPanel.classList.add('visible');
    leftPanel.classList.add('visible');

    countries.classed("selected", false);
    countryGroup.classed("selected", true);

    if (info) {
      console.log(`Country ID: ${countryId}, Country Name: ${info.name}`);

      document.getElementById("nombre-pais").textContent = info.name;
      document.getElementById("capital").textContent = info.capital;
      document.getElementById("poblacion").textContent =
        info.poblacion.toLocaleString() + " hab";
      document.getElementById("area").textContent =
        info.area.toLocaleString() + " km²";
    } else {
      console.log(`Country ID: ${countryId}, Country Name: Not Found`);

      document.getElementById("nombre-pais").textContent = "---";
      document.getElementById("capital").textContent = "---";
      document.getElementById("poblacion").textContent = "---";
      document.getElementById("area").textContent = "---";
    }

    selectedCountryId = countryId;
    zoomToCountry(countryId); // ← ✅ Aquí activas el zoom
    renderizarBasura(countryId, yearSlider.value);
  });

  // Mostrar tooltip con el nombre del país
  countries
    .on("mouseover", function (event) {
      const countryId = d3.select(this).attr("id");
      const data = countryMap[countryId];

      const texto = data ? `${data.name}` : "Nombre no disponible";

      tooltip.style("display", "block").text(texto);
    })
    .on("mousemove", function (event) {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", function () {
      tooltip.style("display", "none");
    });

  // Add double-click event to reset zoom
  svg.on("dblclick", function () {
    countries.classed("selected", false);

    svg.transition().duration(750).attr("viewBox", "0 235 900 470");

    selectedCountryId = null;

    // Limpiar panel derecho
    rightPanel.classList.remove('visible');
    //leftPanel.classList.remove('visible');
    for (const id of ["nombre-pais", "capital", "poblacion", "area"]) {
      document.getElementById(id).textContent = "---";
    }

    renderizarBasura(null, yearSlider.value);
  });

  // ← Al final del bloque
  const añoInicial = yearSlider.value;
  yearDisplay.textContent = añoInicial;
  renderizarBasura(null, añoInicial); // ← llama a la función con país null
});
