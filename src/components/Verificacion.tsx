'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Requisicion, Usuario } from '@/lib/types'
import toast from 'react-hot-toast'

export default function Verificacion({ usuario }: { usuario: Usuario }) {
  const [reqs, setReqs] = useState<Requisicion[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Requisicion | null>(null)
  const [form, setForm] = useState({ resultado: 'ok', comentarios: '' })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const { data } = await supabase.from('requisiciones').select('*')
      .eq('status', 'entregada').order('creado_en', { ascending: false })
    setReqs(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setPhotoFile(f)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  async function confirmVerify() {
    if (!selected) return
    if (!photoFile) { toast.error('Sube una foto de evidencia'); return }
    setSubmitting(true)
    const path = `verificacion/${selected.id}-${Date.now()}`
    const { error: uploadError } = await supabase.storage.from('evidencias').upload(path, photoFile, { upsert: true })
    let photoUrl: string | null = null
    if (!uploadError) {
      const { data } = supabase.storage.from('evidencias').getPublicUrl(path)
      photoUrl = data.publicUrl
    }
    const { error } = await supabase.from('requisiciones').update({
      status: 'verificada',
      verificado_por: usuario.nombre,
      verificado_en: new Date().toISOString().slice(0,10),
      resultado_verificacion: form.resultado,
      comentarios_verificacion: form.comentarios,
      foto_verificacion: photoUrl,
    }).eq('id', selected.id)
    if (error) toast.error('Error al guardar')
    else { toast.success('Verificación enviada ✓'); setSelected(null); setPhotoFile(null); setPhotoPreview(null); load() }
    setSubmitting(false)
  }

  if (loading) return <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>Cargando...</div>

  return (
    <div>
      <div style={s.card}>
        <div style={s.cardTitle}>📷 Pendientes de Verificar ({reqs.length})</div>
        {reqs.length === 0
          ? <div style={s.empty}><div style={{ fontSize: '2.5rem' }}>✅</div><div>No hay trabajos pendientes de verificar</div></div>
          : reqs.map(r => (
            <div key={r.id} style={s.item}>
              <div style={s.itemTop}>
                <div>
                  <div style={s.itemTitle}>{r.material} — {r.cantidad_entregada} {r.unidad}</div>
                  <div style={s.itemMeta}>📍 {r.ubicacion}</div>
                  <div style={s.itemMeta}>👷 Trabajador: {r.entregado_a} · Solicitó: {r.solicitado_por}</div>
                </div>
                <span style={{ ...s.badge, color: '#8b5cf6', borderColor: '#8b5cf644' }}>Entregado</span>
              </div>
              <button style={s.btnGreen} onClick={() => setSelected(r)}>📷 Verificar y subir evidencia</button>
            </div>
          ))
        }
      </div>

      {selected && (
        <div style={s.overlay} onClick={() => setSelected(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalTitle}>✅ Verificar Trabajo <button style={s.closeBtn} onClick={() => setSelected(null)}>✕</button></div>
            <div style={s.infoBox}>
              <strong>{selected.material}</strong> — {selected.cantidad_entregada} {selected.unidad}<br />
              <span style={{ color: 'var(--muted)' }}>📍 {selected.ubicacion}</span><br />
              <span style={{ color: 'var(--muted)' }}>👷 {selected.entregado_a}</span>
            </div>
            <label style={s.label}>¿El trabajo se realizó correctamente?</label>
            <select style={s.input} value={form.resultado} onChange={e => setForm({...form, resultado: e.target.value})}>
              <option value="ok">✅ Sí, trabajo completado correctamente</option>
              <option value="parcial">⚠️ Parcialmente completado</option>
              <option value="problema">❌ No se realizó / hay problemas</option>
            </select>
            <label style={s.label}>Comentarios</label>
            <textarea style={{...s.input, minHeight: 70, resize: 'vertical'}} value={form.comentarios} onChange={e => setForm({...form, comentarios: e.target.value})} placeholder="Describe lo que observaste..." />
            <label style={s.label}>Foto de evidencia *</label>
            <div style={s.photoUpload} onClick={() => fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
              {photoPreview
                ? <img src={photoPreview} style={s.photoPreview} alt="preview" />
                : <><div style={{ fontSize: '2rem' }}>📷</div><div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Toma una foto del trabajo realizado</div></>
              }
            </div>
            <button style={s.btnGreen} onClick={confirmVerify} disabled={submitting}>{submitting ? 'Enviando...' : '✓ Enviar Verificación'}</button>
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
  empty: { textAlign: 'center', padding: 30, color: 'var(--muted)', fontSize: '0.85rem' },
  btnGreen: { display: 'block', width: '100%', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 10, padding: 11, fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' },
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
