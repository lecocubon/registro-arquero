"""Descarga las fotos de free-exercise-db (dominio publico) para la biblioteca.

Uso: python scripts/imagenes.py
Lee src/data/biblioteca.json y escribe public/ejercicios/<id>.webp.
"""
import io
import json
import sys
import urllib.request
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises"
ANCHO = 360
CALIDAD = 58


def main() -> int:
    biblioteca = json.loads((RAIZ / "src/data/biblioteca.json").read_text(encoding="utf-8"))
    destino = RAIZ / "public/ejercicios"
    destino.mkdir(parents=True, exist_ok=True)
    total = 0
    for ejercicio in biblioteca:
        fuente = ejercicio.get("fuenteImagen")
        if not fuente:
            continue
        salida = destino / f"{ejercicio['id']}.webp"
        if salida.exists():
            total += salida.stat().st_size
            continue
        with urllib.request.urlopen(f"{BASE}/{fuente}/0.jpg", timeout=30) as r:
            img = Image.open(io.BytesIO(r.read())).convert("RGB")
        alto = round(img.height * ANCHO / img.width)
        img.resize((ANCHO, alto), Image.LANCZOS).save(salida, "WEBP", quality=CALIDAD, method=6)
        total += salida.stat().st_size
        print(f"{ejercicio['id']}: {salida.stat().st_size // 1024} KB")
    print(f"Total: {total / 1024 / 1024:.2f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
