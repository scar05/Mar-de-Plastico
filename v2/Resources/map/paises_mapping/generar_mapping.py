#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
generar_mapping.py  —  versión con diagnóstico de columnas
"""

import os, sys
import pandas as pd
from unidecode import unidecode
import pycountry

# 1. Verificar existencia de archivos
REQ = ["mapping.csv", "world-data-2023.csv", "country-capital-lat-long-population.csv"]
faltan = [f for f in REQ if not os.path.isfile(f)]
if faltan:
    print("ERROR: faltan estos archivos en la carpeta actual:")
    for f in faltan: print("  -", f)
    sys.exit(1)

# 2. Cargar fuentes
base     = pd.read_csv("mapping.csv")
world    = pd.read_csv("world-data-2023.csv")
capitals = pd.read_csv("country-capital-lat-long-population.csv")

# 3. Mostrar nombres detectados para debug
print("\n>> world-data-2023.csv columnas originales:\n", world.columns.tolist())
print(">> country-capital-*.csv columnas originales:\n", capitals.columns.tolist())

# 4. Normalizar 'world' detectando la columna de capital
# ----------------------------------------------------------------
# Detectar la cabecera que contenga 'Capital'
cap_world_cols = [c for c in world.columns if "Capital" in c]
if not cap_world_cols:
    print("ERROR: no hallé ninguna columna con 'Capital' en world-data-2023.csv")
    print("Columnas disponibles:", world.columns.tolist())
    sys.exit(1)

cap_col = cap_world_cols[0]
print(f">> Usando columna de 'Capital' en world-data: '{cap_col}'")

# Renombrar antes de filtrar
world = world.rename(columns={
    "Abbreviation"       : "iso2",
    cap_col               : "Capital",
    "Land Area(Km2)"     : "Area"
})

# Asegurarnos de que las columnas clave existan
req_world = ["iso2", "Country", "Capital", "Population", "Area"]
faltan = [c for c in req_world if c not in world.columns]
if faltan:
    print("ERROR: faltan estas columnas en world tras rename:", faltan)
    sys.exit(1)

world = world[req_world]

# 5. Normalizar 'capitals' detectando su columna de capital
# ----------------------------------------------------------------
cap_alt_cols = [c for c in capitals.columns if "Capital" in c]
if not cap_alt_cols:
    print("ERROR: no hallé ninguna columna con 'Capital' en country-capital-*.csv")
    print("Columnas disponibles:", capitals.columns.tolist())
    sys.exit(1)

cap_alt = cap_alt_cols[0]
print(f">> Usando columna de 'Capital_alt' en capitals: '{cap_alt}'")

capitals = capitals.rename(columns={ cap_alt: "Capital_alt" })[["Country", "Capital_alt"]]

# 6. Merge de las tres tablas
# ----------------------------------------------------------------
full = ( base
       .merge(world,   left_on="Country Code", right_on="iso2", how="left")
       .merge(capitals, on="Country", how="left") )

print("\n>> Columnas tras merge (antes de fillna):\n", full.columns.tolist())

# 7. Rellenar capital faltante
full["Capital"] = full["Capital"].fillna(full["Capital_alt"])
full.drop(columns=["iso2","Capital_alt"], inplace=True)

# 8. Traducir país al español (sin tildes)
# ----------------------------------------------------------------
def to_spanish(en):
    try:
        p = pycountry.countries.lookup(en)
        txt = p.name
        # Mapeos de excepciones:
        esp = {
            "Cote d'Ivoire": "Costa de Marfil",
            "Cape Verde"   : "Cabo Verde",
            "United States": "Estados Unidos",
        }
        return esp.get(txt, unidecode(txt))
    except:
        return unidecode(en)

full["País"] = full["Country"].apply(to_spanish)

# 9. Convertir números
# ----------------------------------------------------------------
full["Población"]  = ( full["Population"]
                       .replace({",":""}, regex=True)
                       .astype(float, errors="ignore")
                       .astype("Int64", errors="ignore") )
full["Área (km²)"] = ( full["Area"]
                       .replace({",":""}, regex=True)
                       .astype(float, errors="ignore")
                       .astype("Int64", errors="ignore") )

# 10. Seleccionar columnas finales
final = full[["Country Code","País","Capital","Población","Área (km²)"]]

# 11. Guardar resultado
out = "mapping_completo.csv"
final.to_csv(out, index=False)
print(f"\n✅ Guardado: {out}")

# 12. Mostrar vista previa (1 de cada 5)
print("\n--- Vista previa cada 5 países (35 filas) ---")
print(final.iloc[::5].reset_index(drop=True).to_string(index=False))
