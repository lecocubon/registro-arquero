import { useCallback, useEffect, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { MuestraSalud } from './saludDatos';

/**
 * Puente con Health Connect. Solo funciona dentro de la app Android; en la
 * version web todo responde "no disponible" sin cargar el plugin.
 */

export type PermisoSalud = 'peso' | 'grasa' | 'pulso' | 'pulsoReposo' | 'sueno' | 'guardarEntrenamiento';

export const NOMBRE_PERMISO: Record<PermisoSalud, string> = {
  peso: 'Peso',
  grasa: '% de grasa',
  pulso: 'Pulso',
  pulsoReposo: 'Pulso en reposo',
  sueno: 'Sueño',
  guardarEntrenamiento: 'Guardar entrenamientos',
};

interface EstadoNativo {
  disponible: boolean;
  /** 'sin-instalar' | 'actualizar' | 'no-soportado' cuando no esta disponible. */
  motivo?: string;
  concedidos: PermisoSalud[];
}

interface ArqueroSaludNativo {
  estado(): Promise<EstadoNativo>;
  pedirPermisos(): Promise<EstadoNativo>;
  abrirAjustes(): Promise<void>;
  guardarEntrenamiento(opciones: {
    idCliente: string;
    version: number;
    inicio: string;
    fin: string;
    titulo: string;
    notas?: string;
  }): Promise<{ id: string }>;
}

const ArqueroSalud = registerPlugin<ArqueroSaludNativo>('ArqueroSalud');

export function esAppAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export const SIN_APP: EstadoNativo = { disponible: false, motivo: 'web', concedidos: [] };

export async function estadoSalud(): Promise<EstadoNativo> {
  if (!esAppAndroid()) return SIN_APP;
  try {
    return await ArqueroSalud.estado();
  } catch {
    return { disponible: false, motivo: 'error', concedidos: [] };
  }
}

export async function pedirPermisosSalud(): Promise<EstadoNativo> {
  if (!esAppAndroid()) return SIN_APP;
  return ArqueroSalud.pedirPermisos();
}

export async function abrirAjustesSalud(): Promise<void> {
  if (esAppAndroid()) await ArqueroSalud.abrirAjustes();
}

type TipoLectura = 'weight' | 'bodyFat' | 'heartRate' | 'restingHeartRate' | 'sleep';

async function leer(dataType: TipoLectura, desde: Date, hasta: Date, limite = 500): Promise<MuestraSalud[]> {
  if (!esAppAndroid()) return [];
  const { Health } = await import('@capgo/capacitor-health');
  const { samples } = await Health.readSamples({
    dataType,
    startDate: desde.toISOString(),
    endDate: hasta.toISOString(),
    limit: limite,
    ascending: true,
  });
  return samples;
}

const DIA_MS = 86_400_000;

export const leerPesos = (dias = 30) => leer('weight', new Date(Date.now() - dias * DIA_MS), new Date());
export const leerGrasas = (dias = 30) => leer('bodyFat', new Date(Date.now() - dias * DIA_MS), new Date());
export const leerSueno = () => leer('sleep', new Date(Date.now() - 1.5 * DIA_MS), new Date());
export const leerPulsoReposo = () => leer('restingHeartRate', new Date(Date.now() - 3 * DIA_MS), new Date());
export const leerPulso = (desde: Date, hasta: Date) => leer('heartRate', desde, hasta, 5000);

export async function guardarEntrenamientoSalud(opciones: Parameters<ArqueroSaludNativo['guardarEntrenamiento']>[0]) {
  if (!esAppAndroid()) throw new Error('Solo disponible en la app Android.');
  return ArqueroSalud.guardarEntrenamiento(opciones);
}

/** Estado de Health Connect; se vuelve a consultar al volver a la app (el usuario pudo cambiar permisos). */
export function useSalud() {
  const [estado, setEstado] = useState<EstadoNativo | null>(esAppAndroid() ? null : SIN_APP);

  const refrescar = useCallback(async () => setEstado(await estadoSalud()), []);

  useEffect(() => {
    if (!esAppAndroid()) return;
    void refrescar();
    const alVolver = () => {
      if (document.visibilityState === 'visible') void refrescar();
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [refrescar]);

  const conectar = useCallback(async () => setEstado(await pedirPermisosSalud()), []);
  const tiene = useCallback((p: PermisoSalud) => Boolean(estado?.concedidos.includes(p)), [estado]);

  return { estado, esApp: esAppAndroid(), refrescar, conectar, tiene };
}
