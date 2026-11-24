'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
const ITEMS = [['/', '🏠', 'Dashboard'], ['/kasir', '🧾', 'Kasir'], ['/transaksi', '📋', 'Transaksi'], ['/stok', '📦', 'Stok']] as const;
export default function Nav() {
  const path = usePathname();
  return (<>{ITEMS.map(([href, icon, label]) => (
    <Link key={href} href={href} className={'nb' + ((href === '/' ? path === '/' : path.startsWith(href)) ? ' on' : '')}><span>{icon}</span>{label}</Link>
  ))}</>);
}
