"""Descarga las fotos de free-exercise-db (dominio publico) para la biblioteca.

Uso: python scripts/imagenes.py
Lee src/data/biblioteca.json y escribe en public/ejercicios dos fotos por
ejercicio: <id>.webp (posicion inicial) y <id>-fin.webp (posicion final).
"""
import io
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises"
ANCHO = 360
CALIDAD = 58
# Numero de foto en la base -> sufijo del archivo.
CUADROS = {0: "", 1: "-fin"}


def bajar(fuente: str, cuadro: int, salida: Path) -> bool:
    """Descarga y comprime una foto. False si esa foto no existe en la base."""
    try:
        with urllib.request.urlopen(f"{BASE}/{fuente}/{cuadro}.jpg", timeout=30) as r:
            img = Image.open(io.BytesIO(r.read())).convert("RGB")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return False
        raise
    alto = round(img.height * ANCHO / img.width)
    img.resize((ANCHO, alto), Image.LANCZOS).save(salida, "WEBP", quality=CALIDAD, method=6)
    return True


def main() -> int:
    biblioteca = json.loads((RAIZ / "src/data/biblioteca.json").read_text(encoding="utf-8"))
    destino = RAIZ / "public/ejercicios"
    destino.mkdir(parents=True, exist_ok=True)
    total = 0
    for ejercicio in biblioteca:
        fuente = ejercicio.get("fuenteImagen")
        if not fuente:
            continue
        for cuadro, sufijo in CUADROS.items():
            salida = destino / f"{ejercicio['id']}{sufijo}.webp"
            if not salida.exists() and not bajar(fuente, cuadro, salida):
                print(f"{ejercicio['id']}{sufijo}: la base no tiene la foto {cuadro}")
                continue
            total += salida.stat().st_size
    print(f"Total: {total / 1024 / 1024:.2f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
