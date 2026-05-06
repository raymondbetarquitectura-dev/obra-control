'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Usuario, Rol } from '@/lib/types'
import toast from 'react-hot-toast'

const ROLES: { value: Rol; label: string }[] = [
  { value: 'residente', label: '👷 Residente' },
  { value: 'compradora', label: '🛒 Compradora' },
  { value: 'bodega', label: '📦 Bodega (Sam)' },
  { value: 'admin', label: '⚙️ Administrador' },
]

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'residente' as Rol })
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    const { data } = await supabase.from('usuarios').select('*').order('creado_en', { ascending: false })
    setUsuarios(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createUser() {
    if (!form.nombre || !form.email || !form.password) { toast.error('Completa todos los campos'); return }
    if (form.password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return }
    setSubmitting(true)

    // Create auth user via Supabase Admin (using service role would be needed in production)
    // For now we use signUp and then insert profile
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { nombre: form.nombre } }
    })

    if (authError) { toast.error(authError.message); setSubmitting(false); return }

    if (authData.user) {
      const { error: profileError } = await supabase.from('usuarios').insert({
        id: authData.user.id,
        nombre: form.nombre,
        email: form.email,
        rol: form.rol,
        activo: true,
      })
      if (profileError) toast.error('Error al crear perfil: ' + profileError.message)
      else {
        toast.success(`Usuario ${form.nombre} creado ✓`)
        setShowNew(false)
        setForm({ nombre: '', email: '', password: '', rol: 'residente' })
        load()
      }
    }
    setSubmitting(false)
  }

  async function toggleActive(u: Usuario) {
    const { error } = await supabase.from('usuarios').update({ activo: !u.activo }).eq('id', u.id)
    if (error) toast.error('Error')
    else { toast.success(u.activo ? `${u.nombre} desactivado` : `${u.nombre} activado`); load() }
  }

  async function changeRole(u: Usuario, rol: Rol) {
    const { error } = await supabase.from('usuarios').update({ rol }).eq('id', u.id)
    if (error) toast.error('Error')
    else { toast.success('Rol actualizado'); load() }
  }

  const rolLabel: Record<Rol, string> = {
    residente: '👷 Residente',
    compradora: '🛒 Compradora',
    bodega: '📦 Bodega',
    admin: '⚙️ Admin',
  }

  if (loading) return <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>Cargando...</div>

  return (
    <div>
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={s.cardTitle}>👥 Usuarios del Sistema</div>
          <button style={s.btnSmall} onClick={() => setShowNew(true)}>+ Nuevo Usuario</button>
        </div>

        {usuarios.map(u => (
          <div key={u.id} style={{ ...s.item, opacity: u.activo ? 1 : 0.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={s.itemTitle}>{u.nombre}</div>
                <div style={s.itemMeta}>{u.email}</div>
                <div style={{ marginTop: 8 }}>
                  <select
                    style={s.roleSelect}
                    value={u.rol}
                    onChange={e => changeRole(u, e.target.value as Rol)}
                  >
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ ...s.activeBadge, background: u.activo ? '#064e3b22' : '#7f1d1d22', color: u.activo ? 'var(--green)' : 'var(--red)', borderColor: u.activo ? '#10b98144' : '#ef444444' }}>
                  {u.activo ? '● Activo' : '○ Inactivo'}
                </div>
                <button
                  style={{ ...s.toggleBtn, color: u.activo ? 'var(--red)' : 'var(--green)' }}
                  onClick={() => toggleActive(u)}
                >
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showNew && (
        <div style={s.overlay} onClick={() => setShowNew(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>➕ Nuevo Usuario <button style={s.closeBtn} onClick={() => setShowNew(false)}>✕</button></div>
            <label style={s.label}>Nombre completo *</label>
            <input style={s.input} value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej: Isaac Ramírez" />
            <label style={s.label}>Correo electrónico *</label>
            <input style={s.input} type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="isaac@correo.com" />
            <label style={s.label}>Contraseña *</label>
            <input style={s.input} type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Mínimo 6 caracteres" />
            <label style={s.label}>Rol</label>
            <select style={s.input} value={form.rol} onChange={e => setForm({...form, rol: e.target.value as Rol})}>
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 12 }}>
              ⚠️ El usuario recibirá un correo de confirmación. Después de confirmar, ya puede entrar al sistema.
            </div>
            <button style={s.btnPrimary} onClick={createUser} disabled={submitting}>{submitting ? 'Creando...' : '✓ Crear Usuario'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18, marginBottom: 12 },
  cardTitle: { fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 },
  item: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 8 },
  itemTitle: { fontWeight: 600, fontSize: '0.92rem' },
  itemMeta: { fontSize: '0.78rem', color: 'var(--muted)', marginTop: 3 },
  activeBadge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, border: '1px solid', marginBottom: 6 },
  toggleBtn: { display: 'block', background: 'none', border: 'none', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 },
  roleSelect: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 8px', color: 'var(--text)', fontSize: '0.78rem', cursor: 'pointer', outline: 'none' },
  btnSmall: { background: 'var(--accent)', color: '#0f1117', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 22, width: '100%', maxWidth: 440, maxHeight: '85vh', overflowY: 'auto' },
  modalTitle: { fontWeight: 800, fontSize: '1rem', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.1rem' },
  label: { display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 5 },
  input: { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', marginBottom: 12 },
  btnPrimary: { display: 'block', width: '100%', background: 'var(--accent)', color: '#0f1117', border: 'none', borderRadius: 10, padding: 12, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' },
}
