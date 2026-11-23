const assertInt = (n) => { if (!Number.isSafeInteger(n)) throw new TypeError('Uang harus integer Rupiah'); return n; };
export const rupiah = assertInt;
export const bpOf = (amount, bp) => Math.round((assertInt(amount) * assertInt(bp)) / 10000);
export function formatIDR(n) {
  assertInt(n);
  return (n < 0 ? '-Rp' : 'Rp') + Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
