'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Requisicion, Usuario } from '@/lib/types'
import toast from 'react-hot-toast'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: '#f59e0b' },
  comprada: { label: 'Comprada', color: '#3b82f6' },
  recibida: { label: 'En Bodega', color: '#10b981' },
  entregada: { label: 'Entregada', color: '#8b5cf6' },
  verificada: { label: 'Verificada', color: '#22c55e' },
}

export default function Requisiciones({ usuario }: { usuario: Usuario }) {
  const [reqs, setReqs] = useState<Requisicion[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState<Requisicion | null>(null)
  const [showBought, setShowBought] = useState(false)

  // Form state
  const [form, setForm] = useState({ material: '', cantidad: '', unidad: 'piezas', ubicacion: '', descripcion: '', prioridad: 'normal' })
  const [boughtForm, setBoughtForm] = useState({ proveedor: '', costo: '', foto_factura: '' })
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    const { data } = await supabase.from('requisiciones').select('*').order('creado_en', { ascending: false })
    setReqs(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? reqs : reqs.filter(r => r.status === filter)

  const stats = {
    pendiente: reqs.filter(r => r.status === 'pendiente').length,
    comprada: reqs.filter(r => r.status === 'comprada').length,
    recibida: reqs.filter(r => r.status === 'recibida').length,
    verificada: reqs.filter(r => r.status === 'verificada').length,
  }

  async function submitNew() {
    if (!form.material || !form.cantidad || !form.ubicacion) { toast.error('Completa los campos obligatorios'); return }
    setSubmitting(true)
    const { error } = await supabase.from('requisiciones').insert({
      material: form.material,
      cantidad: parseInt(form.cantidad),
      unidad: form.unidad,
      ubicacion: form.ubicacion,
      descripcion: form.descripcion,
      prioridad: form.prioridad,
      solicitado_por: usuario.nombre,
      usuario_id: usuario.id,
      status: 'pendiente',
    })
    if (error) { toast.error('Error al guardar'); } 
    else { toast.success('Requisición enviada'); setShowNew(false); setForm({ material: '', cantidad: '', unidad: 'piezas', ubicacion: '', descripcion: '', prioridad: 'normal' }); load() }
    setSubmitting(false)
  }

  async function registerBought() {
    if (!selected) return
    setSubmitting(true)
    const { error } = await supabase.from('requisiciones').update({
      status: 'comprada',
      comprado_por: usuario.nombre,
      comprado_en: new Date().toISOString().slice(0,10),
      proveedor: boughtForm.proveedor,
      costo: parseFloat(boughtForm.costo) || 0,
    }).eq('id', selected.id)
    if (error) toast.error('Error')
    else { toast.success('Compra registrada'); setShowBought(false); setSelected(null); load() }
    setSubmitting(false)
  }

  if (loading) return <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>Cargando...</div>

  return (
    <div>
      {/* Stats */}
      <div style={s.statsRow}>
        {[
          { key: 'pendiente', label: 'Pendientes', color: '#f59e0b' },
          { key: 'comprada', label: 'Compradas', color: '#3b82f6' },
          { key: 'recibida', label: 'En Bodega', color: '#10b981' },
          { key: 'verificada', label: 'Verificadas', color: '#22c55e' },
        ].map(st => (
          <div key={st.key} style={s.statCard}>
            <div style={{ ...s.statNum, color: st.color }}>{stats[st.key as keyof typeof stats]}</div>
            <div style={s.statLabel}>{st.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={s.tabs}>
        {['all','pendiente','comprada','recibida','entregada','verificada'].map(f => (
          <button key={f} style={{ ...s.tab, ...(filter === f ? s.tabActive : {}) }} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Todas' : STATUS_LABELS[f]?.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={s.empty}>📋 No hay requisiciones en esta categoría</div>
      ) : filtered.map(r => (
        <div key={r.id} style={s.item} onClick={() => setSelected(r)}>
          <div style={s.itemTop}>
            <div>
              <div style={s.itemTitle}>{r.material} — {r.cantidad} {r.unidad}</div>
              <div style={s.itemMeta}>📍 {r.ubicacion}</div>
              <div style={s.itemMeta}>👤 {r.solicitado_por} · {r.solicitado_en}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ ...s.badge, color: STATUS_LABELS[r.status]?.color, borderColor: STATUS_LABELS[r.status]?.color + '44' }}>
                {STATUS_LABELS[r.status]?.label}
              </span>
              {r.prioridad === 'urgente' && <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: 4 }}>🔴 Urgente</div>}
            </div>
          </div>
        </div>
      ))}

      {/* New button */}
      {(usuario.rol === 'residente' || usuario.rol === 'admin') && (
        <button style={s.btnPrimary} onClick={() => setShowNew(true)}>+ Nueva Requisición</button>
      )}

      {/* Modal: Nueva Requisición */}
      {showNew && (
        <div style={s.overlay} onClick={() => setShowNew(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>📋 Nueva Requisición <button style={s.closeBtn} onClick={() => setShowNew(false)}>✕</button></div>
            <label style={s.label}>Material *</label>
            <input style={s.input} value={form.material} onChange={e => setForm({...form, material: e.target.value})} placeholder="Ej: Tubo de silicón" />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Cantidad *</label>
                <input style={s.input} type="number" value={form.cantidad} onChange={e => setForm({...form, cantidad: e.target.value})} placeholder="5" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Unidad</label>
                <input style={s.input} value={form.unidad} onChange={e => setForm({...form, unidad: e.target.value})} placeholder="piezas" />
              </div>
            </div>
            <label style={s.label}>Lugar / Departamento *</label>
            <input style={s.input} value={form.ubicacion} onChange={e => setForm({...form, ubicacion: e.target.value})} placeholder="Ej: Depto 3 - Baño" />
            <label style={s.label}>Descripción del trabajo</label>
            <textarea style={{...s.input, minHeight: 70, resize: 'vertical'}} value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} placeholder="Ej: Sellar junta de tina" />
            <label style={s.label}>Prioridad</label>
            <select style={s.input} value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})}>
              <option value="normal">Normal</option>
              <option value="urgente">🔴 Urgente</option>
            </select>
            <button style={s.btnPrimary} onClick={submitNew} disabled={submitting}>{submitting ? 'Enviando...' : 'Enviar Requisición'}</button>
          </div>
        </div>
      )}

      {/* Modal: Detalle */}
      {selected && !showBought && (
        <div style={s.overlay} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>{selected.material} <button style={s.closeBtn} onClick={() => setSelected(null)}>✕</button></div>
            <span style={{ ...s.badge, color: STATUS_LABELS[selected.status]?.color, borderColor: STATUS_LABELS[selected.status]?.color + '44', marginBottom: 16, display: 'inline-block' }}>
              {STATUS_LABELS[selected.status]?.label}
            </span>
            {[
              ['Material', `${selected.material}`],
              ['Cantidad', `${selected.cantidad} ${selected.unidad}`],
              ['Lugar', selected.ubicacion],
              ['Trabajo', selected.descripcion],
              ['Solicitó', `${selected.solicitado_por} · ${selected.solicitado_en}`],
              selected.comprado_por ? ['Compró', `${selected.comprado_por} · ${selected.comprado_en}`] : null,
              selected.proveedor ? ['Proveedor', selected.proveedor] : null,
              selected.costo ? ['Costo', `$${selected.costo?.toLocaleString()}`] : null,
              selected.recibido_por ? ['Recibió (bodega)', `${selected.recibido_por} · ${selected.recibido_en}`] : null,
              selected.cantidad_recibida ? ['Cantidad recibida', `${selected.cantidad_recibida} ${selected.unidad}`] : null,
              selected.entregado_a ? ['Entregado a', selected.entregado_a] : null,
              selected.cantidad_entregada ? ['Cantidad entregada', `${selected.cantidad_entregada} ${selected.unidad}`] : null,
              selected.verificado_por ? ['Verificó', `${selected.verificado_por} · ${selected.verificado_en}`] : null,
              selected.resultado_verificacion ? ['Resultado', selected.resultado_verificacion === 'ok' ? '✅ Correcto' : selected.resultado_verificacion === 'parcial' ? '⚠️ Parcial' : '❌ Problema'] : null,
            ].filter(Boolean).map(([k,v]) => (
              <div key={k as string} style={s.detailRow}>
                <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{k}</span>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', textAlign: 'right', maxWidth: '60%' }}>{v}</span>
              </div>
            ))}

            {/* Fotos */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {selected.foto_recepcion && <img src={selected.foto_recepcion} alt="Recepción" style={s.thumb} />}
              {selected.foto_entrega && <img src={selected.foto_entrega} alt="Entrega" style={s.thumb} />}
              {selected.foto_verificacion && <img src={selected.foto_verificacion} alt="Verificación" style={s.thumb} />}
            </div>

            {/* Actions by role */}
            {usuario.rol === 'compradora' && selected.status === 'pendiente' && (
              <button style={{...s.btnPrimary, marginTop: 16}} onClick={() => setShowBought(true)}>🛒 Registrar Compra</button>
            )}
            {usuario.rol === 'admin' && selected.status === 'pendiente' && (
              <button style={{...s.btnPrimary, marginTop: 16}} onClick={() => setShowBought(true)}>🛒 Registrar Compra</button>
            )}
          </div>
        </div>
      )}

      {/* Modal: Registrar Compra */}
      {showBought && selected && (
        <div style={s.overlay} onClick={() => setShowBought(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>🛒 Registrar Compra <button style={s.closeBtn} onClick={() => setShowBought(false)}>✕</button></div>
            <div style={{ marginBottom: 14, fontSize: '0.88rem', color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>{selected.material}</strong> — {selected.cantidad} {selected.unidad}<br />{selected.ubicacion}
            </div>
            <label style={s.label}>Proveedor</label>
            <input style={s.input} value={boughtForm.proveedor} onChange={e => setBoughtForm({...boughtForm, proveedor: e.target.value})} placeholder="Nombre del proveedor" />
            <label style={s.label}>Costo total ($)</label>
            <input style={s.input} type="number" value={boughtForm.costo} onChange={e => setBoughtForm({...boughtForm, costo: e.target.value})} placeholder="0.00" />
            <button style={s.btnPrimary} onClick={registerBought} disabled={submitting}>{submitting ? 'Guardando...' : '✓ Registrar Compra'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 16 },
  statCard: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, textAlign: 'center' },
  statNum: { fontWeight: 800, fontSize: '1.6rem' },
  statLabel: { fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 },
  tabs: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  tab: { padding: '6px 12px', borderRadius: 20, border: '1px solid var(--border)', background: 'none', color: 'var(--muted)', fontSize: '0.78rem', cursor: 'pointer' },
  tabActive: { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#0f1117' },
  item: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 8, cursor: 'pointer' },
  itemTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemTitle: { fontWeight: 600, fontSize: '0.92rem' },
  itemMeta: { fontSize: '0.78rem', color: 'var(--muted)', marginTop: 3 },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, border: '1px solid' },
  empty: { textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: '0.85rem' },
  btnPrimary: { display: 'block', width: '100%', background: 'var(--accent)', color: '#0f1117', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', marginTop: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 22, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' },
  modalTitle: { fontWeight: 800, fontSize: '1rem', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.1rem' },
  label: { display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 5 },
  input: { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', marginBottom: 12 },
  detailRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)22' },
  thumb: { width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' },
}
