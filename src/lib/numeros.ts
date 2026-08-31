/** Acepta coma o punto decimal. Devuelve null si no hay numero. */
export function aNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '') return null;
  const n = Number.parseFloat(limpio);
  return Number.isFinite(n) ? n : null;
}

export function textoDe(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '' : String(valor);
}

export function fechaCorta(iso: string): string {
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso;
}
