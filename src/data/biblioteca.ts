import datos from './biblioteca.json';

export type TipoEjercicio = 'carga' | 'tiempo' | 'salto' | 'movilidad';

export type Musculo =
  | 'pecho'
  | 'dorsales'
  | 'espalda-media'
  | 'lumbares'
  | 'trapecio'
  | 'hombros'
  | 'biceps'
  | 'triceps'
  | 'antebrazos'
  | 'abdominales'
  | 'gluteos'
  | 'cuadriceps'
  | 'isquiotibiales'
  | 'aductores'
  | 'abductores'
  | 'pantorrillas'
  | 'cuerpo-entero';

export type Equipo =
  | 'barra'
  | 'mancuernas'
  | 'kettlebell'
  | 'maquina'
  | 'polea'
  | 'peso-corporal'
  | 'bandas'
  | 'barra-z'
  | 'trap-bar'
  | 'barra-dominadas'
  | 'paralelas'
  | 'banco'
  | 'rack'
  | 'cajon'
  | 'balon-medicinal'
  | 'otro';

export interface EjercicioCatalogo {
  id: string;
  nombre: string;
  tipo: TipoEjercicio;
  musculo: Musculo;
  secundarios: Musculo[];
  equipo: Equipo[];
  /** Claves cortas del ejercicio: lo que hay que cuidar. */
  indicaciones: string[];
  /** Como se hace, paso a paso. Los ejercicios propios no lo traen. */
  pasos?: string[];
  /** Id en free-exercise-db (dominio publico). Solo lo usa scripts/imagenes.py. */
  fuenteImagen?: string;
  /** Creado por el usuario en la app. */
  propio?: boolean;
}

export const MUSCULOS: { id: Musculo; nombre: string }[] = [
  { id: 'pecho', nombre: 'Pecho' },
  { id: 'dorsales', nombre: 'Dorsales' },
  { id: 'espalda-media', nombre: 'Espalda media' },
  { id: 'lumbares', nombre: 'Lumbares' },
  { id: 'trapecio', nombre: 'Trapecio' },
  { id: 'hombros', nombre: 'Hombros' },
  { id: 'biceps', nombre: 'Bíceps' },
  { id: 'triceps', nombre: 'Tríceps' },
  { id: 'antebrazos', nombre: 'Antebrazos' },
  { id: 'abdominales', nombre: 'Abdominales' },
  { id: 'gluteos', nombre: 'Glúteos' },
  { id: 'cuadriceps', nombre: 'Cuádriceps' },
  { id: 'isquiotibiales', nombre: 'Isquiotibiales' },
  { id: 'aductores', nombre: 'Aductores' },
  { id: 'abductores', nombre: 'Abductores' },
  { id: 'pantorrillas', nombre: 'Pantorrillas' },
  { id: 'cuerpo-entero', nombre: 'Cuerpo entero' },
];

export const EQUIPOS: { id: Equipo; nombre: string }[] = [
  { id: 'barra', nombre: 'Barra' },
  { id: 'mancuernas', nombre: 'Mancuernas' },
  { id: 'kettlebell', nombre: 'Kettlebell' },
  { id: 'maquina', nombre: 'Máquina' },
  { id: 'polea', nombre: 'Polea' },
  { id: 'peso-corporal', nombre: 'Peso corporal' },
  { id: 'bandas', nombre: 'Bandas' },
  { id: 'barra-z', nombre: 'Barra Z' },
  { id: 'trap-bar', nombre: 'Trap bar' },
  { id: 'barra-dominadas', nombre: 'Barra de dominadas' },
  { id: 'paralelas', nombre: 'Paralelas' },
  { id: 'banco', nombre: 'Banco' },
  { id: 'rack', nombre: 'Rack' },
  { id: 'cajon', nombre: 'Cajón' },
  { id: 'balon-medicinal', nombre: 'Balón medicinal' },
  { id: 'otro', nombre: 'Otro' },
];

export const TIPOS: { id: TipoEjercicio; nombre: string; detalle: string }[] = [
  { id: 'carga', nombre: 'Carga', detalle: 'kg, reps y RIR' },
  { id: 'tiempo', nombre: 'Tiempo', detalle: 'segundos' },
  { id: 'salto', nombre: 'Salto', detalle: 'solo marcar hecho' },
  { id: 'movilidad', nombre: 'Movilidad', detalle: 'solo marcar hecho' },
];

/** Tipos sin numeros que anotar: la serie solo se marca. */
export function soloSeMarca(tipo: TipoEjercicio): boolean {
  return tipo === 'salto' || tipo === 'movilidad';
}

export const BIBLIOTECA = datos as EjercicioCatalogo[];

export function nombreMusculo(m: Musculo): string {
  return MUSCULOS.find((x) => x.id === m)?.nombre ?? m;
}

export function nombreEquipo(e: Equipo): string {
  return EQUIPOS.find((x) => x.id === e)?.nombre ?? e;
}

export function catalogoPorId(id: string, catalogo: EjercicioCatalogo[] = BIBLIOTECA): EjercicioCatalogo | undefined {
  return catalogo.find((e) => e.id === id);
}

/** Minusculas sin tildes, para buscar "biceps" y encontrar "Bíceps". */
export function normalizarTexto(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export interface FiltroBiblioteca {
  texto?: string;
  musculo?: Musculo | '';
  equipo?: Equipo | '';
  tipo?: TipoEjercicio | '';
}

export function filtrarBiblioteca(catalogo: EjercicioCatalogo[], f: FiltroBiblioteca): EjercicioCatalogo[] {
  const palabras = normalizarTexto(f.texto ?? '')
    .split(/\s+/)
    .filter(Boolean);
  return catalogo
    .filter((e) => {
      if (f.musculo && e.musculo !== f.musculo && !e.secundarios.includes(f.musculo)) return false;
      if (f.equipo && !e.equipo.includes(f.equipo)) return false;
      if (f.tipo && e.tipo !== f.tipo) return false;
      if (!palabras.length) return true;
      const heno = normalizarTexto(`${e.nombre} ${nombreMusculo(e.musculo)} ${e.equipo.map(nombreEquipo).join(' ')}`);
      return palabras.every((p) => heno.includes(p));
    })
    .sort((a, b) => {
      // Con filtro de musculo, primero los que lo trabajan como principal.
      if (f.musculo) {
        const pa = a.musculo === f.musculo ? 0 : 1;
        const pb = b.musculo === f.musculo ? 0 : 1;
        if (pa !== pb) return pa - pb;
      }
      return a.nombre.localeCompare(b.nombre, 'es');
    });
}
