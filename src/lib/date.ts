/**
 * Fuso horário padrão da plataforma Democracias: America/Fortaleza (UTC-3)
 */
export const APP_TIMEZONE = 'America/Fortaleza';

export function formatHora(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      timeZone: APP_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function formatData(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      timeZone: APP_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function formatDataCompleta(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      timeZone: APP_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatDataHora(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const dataStr = d.toLocaleDateString('pt-BR', {
      timeZone: APP_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const horaStr = d.toLocaleTimeString('pt-BR', {
      timeZone: APP_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dataStr} às ${horaStr}`;
  } catch {
    return '—';
  }
}

export function isHoje(iso?: string | null): boolean {
  if (!iso) return false;
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: APP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    const formatter = new Intl.DateTimeFormat('pt-BR', options);
    const dataIso = formatter.format(new Date(iso));
    const dataHoje = formatter.format(new Date());
    return dataIso === dataHoje;
  } catch {
    return false;
  }
}
