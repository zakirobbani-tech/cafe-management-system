import Nav from '@/components/Nav';
import { getProfile } from '@/lib/auth';
import { signOut } from '../actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const p = await getProfile();
  if (!p || !p.active) return (
    <div className="login"><div className="card">
      <h2>{p ? 'Akun tidak aktif' : 'Profil tidak ditemukan'}</h2>
      <p className="k">Hubungi owner PLACE #1.</p>
      <form action={signOut}><button className="btn">Keluar</button></form>
    </div></div>
  );
  const logo = <div className="lgbox"><img src="/logo-place.jpg" alt="PLACE #1" /></div>;
  return (
    <div className="shell">
      <aside className="side"><div className="brand">{logo}</div><Nav /></aside>
      <main>
        <div className="mtop">{logo}</div>
        <div className="topbar"><span className="k">{p.full_name || p.email} · {p.role}</span><form action={signOut}><button className="btn sec sm">Keluar</button></form></div>
        {children}
      </main>
      <nav className="bn"><Nav /></nav>
    </div>
  );
}
