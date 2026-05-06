'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import Requisiciones from '@/components/Requisiciones'
import Bodega from '@/components/Bodega'
import Verificacion from '@/components/Verificacion'
import Reportes from '@/components/Reportes'
import Usuarios from '@/components/Usuarios'

type Tab = 'requisiciones' | 'bodega' | 'verificacion' | 'reportes' | 'usuarios'

export default function Dashboard() {
  const { usuario, loading } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('requisiciones')

  useEffect(() => {
    if (!loading && !usuario) router.push('/')
  }, [usuario, loading, router])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading || !usuario) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted)' }}>
      Cargando...
    </div>
  )

  const tabs = [
    { id: 'requisiciones', label: '📋 Requisiciones' },
    ...(usuario.rol === 'bodega' || usuario.rol === 'admin' ? [{ id: 'bodega', label: '📦 Bodega' }] : []),
    ...(usuario.rol === 'residente' || usuario.rol === 'admin' ? [{ id: 'verificacion', label: '✅ Verificar' }] : []),
    ...(usuario.rol === 'admin' ? [
      { id: 'reportes', label: '📊 Reportes' },
      { id: 'usuarios', label: '👥 Usuarios' },
    ] : []),
  ] as { id: Tab; label: string }[]

  return (
    <div>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerInner} className="container">
          <div style={s.logo}>⚒ OBRA</div>
          <div style={s.userArea}>
            <span style={s.userName}>{usuario.nombre}</span>
            <span style={s.rolBadge}>{usuario.rol}</span>
            <button style={s.logoutBtn} onClick={logout}>Salir</button>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav style={s.nav}>
        <div style={s.navInner} className="container">
          {tabs.map(t => (
            <button
              key={t.id}
              style={{ ...s.navBtn, ...(tab === t.id ? s.navBtnActive : {}) }}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main style={s.main} className="container">
        {tab === 'requisiciones' && <Requisiciones usuario={usuario} />}
        {tab === 'bodega' && <Bodega usuario={usuario} />}
        {tab === 'verificacion' && <Verificacion usuario={usuario} />}
        {tab === 'reportes' && <Reportes />}
        {tab === 'usuarios' && <Usuarios />}
      </main>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  header: { background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 },
  headerInner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58 },
  logo: { fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent)' },
  userArea: { display: 'flex', alignItems: 'center', gap: 8 },
  userName: { fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600 },
  rolBadge: { fontSize: '0.7rem', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '3px 8px', color: 'var(--muted)' },
  logoutBtn: { fontSize: '0.78rem', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', color: 'var(--muted)', cursor: 'pointer' },
  nav: { background: 'var(--surface)', borderBottom: '1px solid var(--border)', overflowX: 'auto' },
  navInner: { display: 'flex', gap: 2, padding: '0 16px' },
  navBtn: { padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, color: 'var(--muted)', whiteSpace: 'nowrap', borderBottom: '2px solid transparent' },
  navBtnActive: { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },
  main: { padding: '20px 16px 80px' },
}
