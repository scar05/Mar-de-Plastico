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
            const map = {};
            rows.forEach(row => {
                const [id, name] = row.split(',');
                map[id.trim().replace(/^"|"$/g, '')] = name.trim().replace(/^"|"$/g, ''); // Remove quotes
            });
            return map;
        });

    const countries = document.querySelectorAll('.country');
    countries.forEach(country => {
        country.addEventListener('click', (event) => {
            const countryId = event.target.id || event.currentTarget.id;
            const countryName = countryMap[countryId];
            if (countryName) {
                console.log(`Country ID: ${countryId}, Country Name: ${countryName}`);
                alert(`Se mostrarán datos de ${countryName}`);
            } else {
                console.log(`Country ID: ${countryId}, Country Name: Not Found`);
            }
        });
    });
});

