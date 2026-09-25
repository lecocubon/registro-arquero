import { useEffect, useState } from 'react';
import { nombreMusculo, type EjercicioCatalogo } from '../data/biblioteca';
import { db } from '../db/db';
import { useArquero } from '../estado/arquero';

/** Cuadro de la biblioteca: la posicion final es otro archivo, con sufijo. */
type Cuadro = 'inicio' | 'fin';

interface Props {
  ejercicio: EjercicioCatalogo | undefined;
  tamano: 'mini' | 'grande';
  cuadro?: Cuadro;
  /** Se llama si la foto de la biblioteca no carga. */
  onFallo?: () => void;
}

/** Foto propia si existe; si no, la de la biblioteca; si no, un marcador con el musculo. */
export function ImagenEjercicio({ ejercicio, tamano, cuadro = 'inicio', onFallo }: Props) {
  const { conFoto } = useArquero();
  const [urlPropia, setUrlPropia] = useState<string | null>(null);
  const [falloFabrica, setFalloFabrica] = useState(false);
  // La foto propia reemplaza la posicion inicial; para la final no hay.
  const tieneFoto = ejercicio ? conFoto.has(ejercicio.id) && cuadro === 'inicio' : false;

  useEffect(() => {
    if (!ejercicio || !tieneFoto) {
      setUrlPropia(null);
      return;
    }
    let url: string | null = null;
    let vigente = true;
    void db.fotos.get(ejercicio.id).then((f) => {
      if (!vigente || !f) return;
      url = URL.createObjectURL(f.imagen);
      setUrlPropia(url);
    });
    return () => {
      vigente = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [ejercicio, tieneFoto]);

  const archivo = ejercicio?.dibujo
    ? `${ejercicio.id}.svg`
    : `${ejercicio?.id}${cuadro === 'fin' ? '-fin' : ''}.webp`;
  const hayImagen = Boolean(ejercicio && (ejercicio.dibujo || ejercicio.fuenteImagen));
  const fabrica = hayImagen && !falloFabrica ? `${import.meta.env.BASE_URL}ejercicios/${archivo}` : null;
  const src = urlPropia ?? fabrica;
  const clase =
    tamano === 'mini'
      ? 'size-12 shrink-0 rounded-lg'
      : 'aspect-[3/2] w-full max-w-full rounded-xl';

  if (!src) {
    return (
      <div
        aria-hidden="true"
        className={`${clase} flex items-center justify-center bg-surface2 text-center font-display font-bold text-ink3 uppercase ${
          tamano === 'mini' ? 'text-[10px] leading-tight' : 'text-[18px] tracking-[0.1em]'
        }`}
      >
        {ejercicio ? nombreMusculo(ejercicio.musculo).slice(0, tamano === 'mini' ? 5 : 20) : '—'}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => {
        setFalloFabrica(true);
        onFallo?.();
      }}
      className={`${clase} bg-white ${ejercicio?.dibujo ? 'object-contain' : 'object-cover'}`}
    />
  );
}

const PIE = 'mt-1 text-center text-[10.5px] tracking-[0.08em] text-ink3 uppercase';

/**
 * Las dos posiciones del movimiento, inicio y final. Con una sola foto (propia
 * o ejercicio sin posicion final en la base) se muestra solo una, grande.
 */
export function FotosEjercicio({ ejercicio }: { ejercicio: EjercicioCatalogo | undefined }) {
  const { conFoto } = useArquero();
  const [sinFinal, setSinFinal] = useState(false);
  const propia = ejercicio ? conFoto.has(ejercicio.id) : false;

  // Un dibujo ya muestra el movimiento completo: no hay posicion final aparte.
  if (propia || sinFinal || ejercicio?.dibujo || !ejercicio?.fuenteImagen) {
    return <ImagenEjercicio ejercicio={ejercicio} tamano="grande" />;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <ImagenEjercicio ejercicio={ejercicio} tamano="grande" />
        <p className={PIE}>Inicio</p>
      </div>
      <div>
        <ImagenEjercicio ejercicio={ejercicio} tamano="grande" cuadro="fin" onFallo={() => setSinFinal(true)} />
        <p className={PIE}>Final</p>
      </div>
    </div>
  );
}
