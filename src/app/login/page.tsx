'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await createClient().auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (error) return setErr('Email atau password salah');
    router.replace('/'); router.refresh();
  }
  return (
    <div className="login">
      <form className="card" onSubmit={submit}>
        <div className="lgbox"><img src="/logo-place.jpg" alt="PLACE #1" style={{ maxHeight: 120 }} /></div>
        <h2>Masuk</h2>
        <input type="email" placeholder="Email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        {err && <div className="err">{err}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Memproses…' : 'Masuk'}</button>
        <div className="k">Lupa password? Hubungi owner PLACE #1.</div>
      </form>
    </div>
  );
}
