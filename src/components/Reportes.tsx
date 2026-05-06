'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Requisicion } from '@/lib/types'

export default function Reportes() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 30*86400000).toISOString().slice(0,10))
  const [to, setTo] = useState(() => new Date().toISOString().slice(0,10))
  const [data, setData] = useState<Requisicion[]>([])
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)

  async function generate() {
    setLoading(true)
    const { data: rows } = await supabase.from('requisiciones').select('*')
      .gte('solicitado_en', from).lte('solicitado_en', to).order('solicitado_en', { ascending: false })
    setData(rows || [])
    setGenerated(true)
    setLoading(false)
  }

  const totalCost = data.reduce((sum, r) => sum + (r.costo || 0), 0)
  const byResident = data.reduce((acc: Record<string, { count: number; cost: number }>, r) => {
    if (!acc[r.solicitado_por]) acc[r.solicitado_por] = { count: 0, cost: 0 }
    acc[r.solicitado_por].count++
    acc[r.solicitado_por].cost += r.costo || 0
    return acc
  }, {})

  const statusLabel: Record<string, string> = {
    pendiente: 'Pendiente', comprada: 'Comprada', recibida: 'En Bodega',
    entregada: 'Entregada', verificada: 'Verificada'
  }
  const statusColor: Record<string, string> = {
    pendiente: '#f59e0b', comprada: '#3b82f6', recibida: '#10b981',
    entregada: '#8b5cf6', verificada: '#22c55e'
  }

  return (
    <div>
      <div style={s.card}>
        <div style={s.cardTitle}>📊 Generar Reporte</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Desde</label>
            <input style={s.input} type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Hasta</label>
            <input style={s.input} type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </div>
        <button style={s.btnBlue} onClick={generate} disabled={loading}>{loading ? 'Generando...' : 'Generar Reporte'}</button>
      </div>

      {generated && (
        <>
          {/* Summary */}
          <div style={s.statsRow}>
            {[
              { val: data.length, label: 'Requisiciones', color: '#f59e0b' },
              { val: `$${totalCost.toLocaleString()}`, label: 'Gasto Total', color: '#10b981' },
              { val: data.filter(r => r.status === 'verificada').length, label: 'Verificadas', color: '#22c55e' },
              { val: data.filter(r => r.status !== 'verificada').length, label: 'En Proceso', color: '#3b82f6' },
            ].map(st => (
              <div key={st.label} style={s.statCard}>
                <div style={{ fontWeight: 800, fontSize: '1.4rem', color: st.color }}>{st.val}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>{st.label}</div>
              </div>
            ))}
          </div>

          {/* By resident */}
          <div style={s.card}>
            <div style={s.cardTitle}>Por Residente</div>
            {Object.entries(byResident).map(([name, d]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600 }}>👤 {name}</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                  {d.count} req · <span style={{ color: 'var(--green)' }}>${d.cost.toLocaleString()}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Detail table */}
          <div style={{ ...s.card, overflowX: 'auto' }}>
            <div style={s.cardTitle}>Detalle Completo</div>
            {data.length === 0
              ? <div style={s.empty}>Sin datos en este período</div>
              : <table style={s.table}>
                  <thead><tr>
                    <th style={s.th}>Material</th>
                    <th style={s.th}>Cant.</th>
                    <th style={s.th}>Lugar</th>
                    <th style={s.th}>Solicitó</th>
                    <th style={s.th}>Costo</th>
                    <th style={s.th}>Estado</th>
                    <th style={s.th}>Verificó</th>
                  </tr></thead>
                  <tbody>
                    {data.map(r => (
                      <tr key={r.id}>
                        <td style={s.td}><strong>{r.material}</strong>{r.descripcion && <><br /><span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{r.descripcion}</span></>}</td>
                        <td style={s.td}>{r.cantidad} {r.unidad}</td>
                        <td style={{ ...s.td, fontSize: '0.78rem' }}>{r.ubicacion}</td>
                        <td style={{ ...s.td, fontSize: '0.78rem' }}>{r.solicitado_por}<br /><span style={{ color: 'var(--muted)' }}>{r.solicitado_en}</span></td>
                        <td style={{ ...s.td, color: 'var(--green)' }}>{r.costo ? `$${r.costo.toLocaleString()}` : '—'}</td>
                        <td style={s.td}><span style={{ fontSize: '0.75rem', color: statusColor[r.status] }}>{statusLabel[r.status]}</span></td>
                        <td style={{ ...s.td, fontSize: '0.78rem' }}>
                          {r.verificado_por
                            ? <>{r.verificado_por}<br />{r.resultado_verificacion === 'ok' ? '✅' : r.resultado_verificacion === 'parcial' ? '⚠️' : '❌'}</>
                            : '—'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>

          {/* Photos */}
          {data.some(r => r.foto_verificacion || r.foto_recepcion || r.foto_entrega) && (
            <div style={s.card}>
              <div style={s.cardTitle}>📷 Evidencias Fotográficas</div>
              {data.filter(r => r.foto_verificacion || r.foto_recepcion || r.foto_entrega).map(r => (
                <div key={r.id} style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8 }}>{r.material} — {r.ubicacion}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {r.foto_recepcion && <div style={s.photoWrap}><img src={r.foto_recepcion} style={s.photo} alt="Recepción" /><div style={s.photoLabel}>Recepción</div></div>}
                    {r.foto_entrega && <div style={s.photoWrap}><img src={r.foto_entrega} style={s.photo} alt="Entrega" /><div style={s.photoLabel}>Entrega</div></div>}
                    {r.foto_verificacion && <div style={s.photoWrap}><img src={r.foto_verificacion} style={s.photo} alt="Verificación" /><div style={s.photoLabel}>Verificación</div></div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18, marginBottom: 12 },
  cardTitle: { fontSize: '0.85rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 12 },
  statCard: { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, textAlign: 'center' },
  label: { display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 5 },
  input: { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', marginBottom: 12 },
  btnBlue: { display: 'block', width: '100%', background: 'var(--accent2)', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' },
  empty: { textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: '0.85rem' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' },
  th: { textAlign: 'left', padding: '8px 10px', color: 'var(--muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' },
  td: { padding: '10px 10px', borderBottom: '1px solid #2e335222', verticalAlign: 'top' },
  photoWrap: { textAlign: 'center' },
  photo: { width: 90, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', display: 'block' },
  photoLabel: { fontSize: '0.7rem', color: 'var(--muted)', marginTop: 4 },
}
