import { PROGRAMA, type Ejercicio, type Programa } from '../data/programa';

export interface EstadoDescanso {
  /** Epoch ms en que termina. */
  fin: number;
  /** Duracion total en ms, para la barra de progreso. */
  total: number;
  ejercicioId: string;
}

export function descansoDe(ejercicio: Ejercicio, programa: Programa = PROGRAMA): number {
  if (ejercicio.descanso !== undefined) return ejercicio.descanso;
  if (ejercicio.principal) return programa.descansos.principal;
  return programa.descansos[ejercicio.tipo];
}

export function nuevoDescanso(segundos: number, ejercicioId: string, ahora: number): EstadoDescanso {
  const total = Math.max(0, segundos) * 1000;
  return { fin: ahora + total, total, ejercicioId };
}

/** Suma o resta segundos. Devuelve null si el descanso queda terminado. */
export function ajustarDescanso(
  estado: EstadoDescanso,
  deltaSegundos: number,
  ahora: number,
): EstadoDescanso | null {
  const fin = estado.fin + deltaSegundos * 1000;
  if (fin <= ahora) return null;
  return { ...estado, fin, total: Math.max(estado.total, fin - ahora) };
}

export function restanteMs(estado: EstadoDescanso, ahora: number): number {
  return Math.max(0, estado.fin - ahora);
}

/** 95000 -> "1:35". Redondea hacia arriba para no mostrar 0:00 antes de tiempo. */
export function formatoReloj(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** 3725000 -> "1:02:05"; 125000 -> "2:05". */
export function formatoDuracion(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
