export const CATEGORY_LABELS: Record<string, string> = {
  docker: 'Docker',
  dotnet: '.NET',
  angular: 'Angular',
  'vps-hosting': 'VPS & Hosting',
  comparativas: 'Comparativas'
};

/** Un color distinto por categoría para que las tarjetas se escaneen de un vistazo. */
export const CATEGORY_STYLES: Record<string, string> = {
  docker: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/30',
  dotnet: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/30',
  angular: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/30',
  'vps-hosting': 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30',
  comparativas: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/30'
};

export function categoryLabel(categoria: string): string {
  return CATEGORY_LABELS[categoria] ?? categoria;
}

export function categoryStyles(categoria: string): string {
  return CATEGORY_STYLES[categoria] ?? 'bg-gray-100 text-gray-700 ring-gray-600/20 dark:bg-gray-400/10 dark:text-gray-300 dark:ring-gray-400/30';
}

/** Estimación a ~200 palabras/minuto sobre el markdown crudo del artículo. */
export function readingTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}
