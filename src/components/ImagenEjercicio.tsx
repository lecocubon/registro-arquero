import { useEffect, useState } from 'react';
import { nombreMusculo, type EjercicioCatalogo } from '../data/biblioteca';
import { db } from '../db/db';
import { useArquero } from '../estado/arquero';

interface Props {
  ejercicio: EjercicioCatalogo | undefined;
  tamano: 'mini' | 'grande';
}

/** Foto propia si existe; si no, la de la biblioteca; si no, un marcador con el musculo. */
export function ImagenEjercicio({ ejercicio, tamano }: Props) {
  const { conFoto } = useArquero();
  const [urlPropia, setUrlPropia] = useState<string | null>(null);
  const [falloFabrica, setFalloFabrica] = useState(false);
  const tieneFoto = ejercicio ? conFoto.has(ejercicio.id) : false;

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

  const fabrica =
    ejercicio?.fuenteImagen && !falloFabrica ? `${import.meta.env.BASE_URL}ejercicios/${ejercicio.id}.webp` : null;
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
      onError={() => setFalloFabrica(true)}
      className={`${clase} bg-white object-cover`}
    />
  );
}
