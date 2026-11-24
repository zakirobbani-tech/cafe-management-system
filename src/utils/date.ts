const OFFSET = 8 * 3600e3; // Asia/Makassar (WITA, UTC+8, tanpa DST)
export const dayKey = (iso: string | Date) => new Date(new Date(iso).getTime() + OFFSET).toISOString().slice(0, 10);
export const startOfDay = (daysAgo = 0) => {
  const d = dayKey(new Date(Date.now() - daysAgo * 864e5));
  return new Date(`${d}T00:00:00+08:00`).toISOString();
};
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Makassar', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
