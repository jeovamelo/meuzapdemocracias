export const APP_TIMEZONE = 'America/Fortaleza';

export function getHoraAtual(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getDataHoraFormatada(): string {
  const d = new Date();
  const data = d.toLocaleDateString('pt-BR', {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const hora = d.toLocaleTimeString('pt-BR', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${data} às ${hora}`;
}
