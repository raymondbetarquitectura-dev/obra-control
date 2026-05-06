'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Requisicion, Usuario } from '@/lib/types'
import toast from 'react-hot-toast'

export default function Bodega({ usuario }: { usuario: Usuario }) {
  const [reqs, setReqs] = useState<Requisicion[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Requisicion | null>(null)
  const [modal, setModal] = useState<'receive' | 'deliver' | null>(null)

  const [receiveForm, setReceiveForm] = useState({ cantidad_recibida: '', notas: '' })
  const [deliverForm, setDeliverForm] = useState({ entregado_a: '', cantidad_entregada: '' })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const { data } = await supabase.from('requisiciones').select('*').order('creado_en', { ascending: false })
    setReqs(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function uploadPhoto(path: string): Promise<string | null> {
    if (!photoFile) return null
    const { error } = await supabase.storage.from('evidencias').upload(path, photoFile, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('evidencias').getPublicUrl(path)
    return data.publicUrl
  }

  async function confirmReceive() {
    if (!selected) return
    if (!receiveForm.cantidad_recibida) { toast.error('Ingresa la cantidad recibida'); return }
    setSubmitting(true)
    const photoUrl = await uploadPhoto(`recepcion/${selected.id}-${Date.now()}`)
    const { error } = await supabase.from('requisiciones').update({
      status: 'recibida',
      recibido_por: usuario.nombre,
      recibido_en: new Date().toISOString().slice(0,10),
      cantidad_recibida: parseInt(receiveForm.cantidad_recibida),
      notas_recepcion: receiveForm.notas,
      foto_recepcion: photoUrl,
    }).eq('id', selected.id)
    if (error) toast.error('Error al guardar')
    else { toast.success('Recepción confirmada ✓'); closeModal(); load() }
    setSubmitting(false)
  }

  async function confirmDeliver() {
    if (!selected) return
    if (!deliverForm.entregado_a || !deliverForm.cantidad_entregada) { toast.error('Completa los campos'); return }
    setSubmitting(true)
    const photoUrl = await uploadPhoto(`entrega/${selected.id}-${Date.now()}`)
    const { error } = await supabase.from('requisiciones').update({
      status: 'entregada',
      entregado_a: deliverForm.entregado_a,
      cantidad_entregada: parseInt(deliverForm.cantidad_entregada),
      entregado_en: new Date().toISOString().slice(0,10),
      foto_entrega: photoUrl,
    }).eq('id', selected.id)
    if (error) toast.error('Error al guardar')
    else { toast.success('Entrega registrada ✓'); closeModal(); load() }
    setSubmitting(false)
  }

  function closeModal() {
    setModal(null); setSelected(null)
    setPhotoFile(null); setPhotoPreview(null)
    setReceiveForm({ cantidad_recibida: '', notas: '' })
    setDeliverForm({ entregado_a: '', cantidad_entregada: '' })
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setPhotoFile(f)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  const pendingReceive = reqs.filter(r => r.status === 'comprada')
  const pendingDeliver = reqs.filter(r => r.status === 'recibida')
  const inventory = reqs.filter(r => ['recibida','entregada','verificada'].includes(r.status))

  if (loading) return <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>Cargando...</div>

  return (
    <div>
      {/* Por recibir */}
      <div style={s.card}>
        <div style={s.cardTitle}>🔔 Por Recibir ({pendingReceive.length})</div>
        {pendingReceive.length === 0
          ? <div style={s.empty}>✅ Sin pendientes de recibir</div>
          : pendingReceive.map(r => (
            <div key={r.id} style={s.item}>
              <div style={s.itemTop}>
                <div>
                  <div style={s.itemTitle}>{r.material} — {r.cantidad} {r.unidad}</div>
                  <div style={s.itemMeta}>📍 {r.ubicacion} · Pedido por {r.solicitado_por}</div>
                  {r.proveedor && <div style={s.itemMeta}>🏪 {r.proveedor}</div>}
                </div>
                <span style={{ ...s.badge, color: '#3b82f6', borderColor: '#3b82f644' }}>En camino</span>
              </div>
              <button style={s.btnGreen} onClick={() => { setSelected(r); setReceiveForm({ cantidad_recibida: String(r.cantidad), notas: '' }); setModal('receive') }}>
                📦 Confirmar Recepción
              </button>
            </div>
          ))
        }
      </div>

      {/* Entregar */}
      <div style={s.card}>
        <div style={s.cardTitle}>📤 Entregar a Trabajador ({pendingDeliver.length})</div>
        {pendingDeliver.length === 0
          ? <div style={s.empty}>📭 Sin material listo para entregar</div>
          : pendingDeliver.map(r => (
            <div key={r.id} style={s.item}>
              <div style={s.itemTop}>
                <div>
                  <div style={s.itemTitle}>{r.material}</div>
                  <div style={s.itemMeta}>En bodega: {r.cantidad_recibida} {r.unidad} · Para: {r.ubicacion}</div>
                </div>
                <span style={{ ...s.badge, color: '#10b981', borderColor: '#10b98144' }}>En Bodega</span>
              </div>
              <button style={s.btnBlue} onClick={() => { setSelected(r); setDeliverForm({ entregado_a: '', cantidad_entregada: String(r.cantidad_recibida || '') }); setModal('deliver') }}>
                📤 Registrar Entrega
              </button>
            </div>
          ))
        }
      </div>

      {/* Inventario */}
      <div style={s.card}>
        <div style={s.cardTitle}>📦 Historial de Bodega</div>
        {inventory.length === 0
          ? <div style={s.empty}>Vacío</div>
          : <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead><tr>
                <th style={s.th}>Material</th>
                <th style={s.th}>Recibido</th>
                <th style={s.th}>Entregado a</th>
                <th style={s.th}>Estado</th>
              </tr></thead>
              <tbody>
                {inventory.map(r => (
                  <tr key={r.id}>
                    <td style={s.td}><strong>{r.material}</strong><br /><span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{r.ubicacion}</span></td>
                    <td style={s.td}>{r.cantidad_recibida} {r.unidad}</td>
                    <td style={s.td}>{r.entregado_a || '—'}</td>
                    <td style={s.td}>
                      <span style={{ fontSize: '0.75rem', color: r.status === 'verificada' ? '#22c55e' : r.status === 'entregada' ? '#8b5cf6' : '#10b981' }}>
                        {r.status === 'verificada' ? '✅ Verificada' : r.status === 'entregada' ? '🟣 Entregada' : '🟢 En Bodega'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>

      {/* Modal Recibir */}
      {modal === 'receive' && selected && (
        <div style={s.overlay} onClick={closeModal}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>📦 Confirmar Recepción <button style={s.closeBtn} onClick={closeModal}>✕</button></div>
            <div style={s.infoBox}><strong>{selected.material}</strong> — se pidieron {selected.cantidad} {selected.unidad}<br /><span style={{ color: 'var(--muted)' }}>Para: {selected.ubicacion}</span></div>
            <label style={s.label}>Cantidad recibida *</label>
            <input style={s.input} type="number" value={receiveForm.cantidad_recibida} onChange={e => setReceiveForm({...receiveForm, cantidad_recibida: e.target.value})} />
            <label style={s.label}>Observaciones</label>
            <input style={s.input} value={receiveForm.notas} onChange={e => setReceiveForm({...receiveForm, notas: e.target.value})} placeholder="Ej: Todo llegó en buen estado" />
            <div style={s.photoUpload} onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
              {photoPreview ? <img src={photoPreview} style={s.photoPreview} alt="preview" /> : <><div style={{ fontSize: '2rem' }}>📷</div><div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Toma foto de lo que llegó</div></>}
            </div>
            <button style={s.btnGreen} onClick={confirmReceive} disabled={submitting}>{submitting ? 'Guardando...' : '✓ Confirmar Recepción'}</button>
          </div>
        </div>
      )}

      {/* Modal Entregar */}
      {modal === 'deliver' && selected && (
        <div style={s.overlay} onClick={closeModal}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>📤 Entregar a Trabajador <button style={s.closeBtn} onClick={closeModal}>✕</button></div>
            <div style={s.infoBox}><strong>{selected.material}</strong> — disponible: {selected.cantidad_recibida} {selected.unidad}<br /><span style={{ color: 'var(--muted)' }}>Para: {selected.ubicacion}</span></div>
            <label style={s.label}>Nombre del trabajador *</label>
            <input style={s.input} value={deliverForm.entregado_a} onChange={e => setDeliverForm({...deliverForm, entregado_a: e.target.value})} placeholder="Nombre del trabajador" />
            <label style={s.label}>Cantidad a entregar *</label>
            <input style={s.input} type="number" value={deliverForm.cantidad_entregada} onChange={e => setDeliverForm({...deliverForm, cantidad_entregada: e.target.value})} />
            <div style={s.photoUpload} onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
              {photoPreview ? <img src={photoPreview} style={s.photoPreview} alt="preview" /> : <><div style={{ fontSize: '2rem' }}>📷</div><div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Foto de entrega al trabajador</div></>}
            </div>
            <button style={s.btnBlue} onClick={confirmDeliver} disabled={submitting}>{submitting ? 'Guardando...' : '✓ Confirmar Entrega'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18, marginBottom: 12 },
  cardTitle: { fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
  item: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 8 },
  itemTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  itemTitle: { fontWeight: 600, fontSize: '0.92rem' },
  itemMeta: { fontSize: '0.78rem', color: 'var(--muted)', marginTop: 3 },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, border: '1px solid' },
  empty: { textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: '0.85rem' },
  btnGreen: { display: 'block', width: '100%', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 10, padding: 11, fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' },
  btnBlue: { display: 'block', width: '100%', background: 'var(--accent2)', color: '#fff', border: 'none', borderRadius: 10, padding: 11, fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' },
  th: { textAlign: 'left', padding: '8px 10px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' },
  td: { padding: '10px 10px', borderBottom: '1px solid #2e335222', verticalAlign: 'top' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 22, width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto' },
  modalTitle: { fontWeight: 800, fontSize: '1rem', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.1rem' },
  label: { display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 5 },
  input: { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', marginBottom: 12 },
  infoBox: { marginBottom: 14, fontSize: '0.88rem', color: 'var(--muted)', background: 'var(--surface2)', padding: '10px 14px', borderRadius: 8 },
  photoUpload: { border: '2px dashed var(--border)', borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer', marginBottom: 12 },
  photoPreview: { width: '100%', borderRadius: 8, maxHeight: 180, objectFit: 'cover' },
}
