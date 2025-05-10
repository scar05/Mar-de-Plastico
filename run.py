def add_country_class_to_svg(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as file:
        svg_content = file.read()

    # Split the content into lines for processing
    lines = svg_content.splitlines()
    updated_lines = []

    for line in lines:
        # Check if the line contains a <path> or <g> tag with an id attribute
        if ('<path' in line or '<g' in line) and 'id="' in line:
            # Check if the line already has a class attribute
            if 'class="' in line:
                # Add "country" to the existing class attribute
                line = line.replace('class="', 'class="country ')
            else:
                # Add a new class="country" attribute
                line = line.replace('id="', 'class="country" id="')
        updated_lines.append(line)

    # Join the updated lines back into a single string
    updated_svg_content = '\n'.join(updated_lines)

    # Write the updated content to the output file
    with open(output_file, 'w', encoding='utf-8') as file:
        file.write(updated_svg_content)

# Input and output file paths
input_svg = r'c:\Users\cirqu\OneDrive - Universidad Católica de Chile\Docs\2025-1\Pensamiento Visual\Web\Mar de Plástico\Visualizacion.html'
output_svg = r'c:\Users\cirqu\OneDrive - Universidad Católica de Chile\Docs\2025-1\Pensamiento Visual\Web\Mar de Plástico\Visualizacion_updated.html'

# Run the function
add_country_class_to_svg(input_svg, output_svg)