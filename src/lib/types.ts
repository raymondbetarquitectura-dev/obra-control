export type Rol = 'admin' | 'residente' | 'compradora' | 'bodega'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  creado_en: string
}

export interface Requisicion {
  id: number
  material: string
  cantidad: number
  unidad: string
  ubicacion: string
  descripcion: string
  prioridad: 'normal' | 'urgente'
  status: 'pendiente' | 'comprada' | 'recibida' | 'entregada' | 'verificada'
  solicitado_por: string
  solicitado_en: string
  comprado_por?: string
  comprado_en?: string
  proveedor?: string
  costo?: number
  recibido_por?: string
  recibido_en?: string
  cantidad_recibida?: number
  notas_recepcion?: string
  foto_recepcion?: string
  entregado_a?: string
  cantidad_entregada?: number
  entregado_en?: string
  foto_entrega?: string
  verificado_por?: string
  verificado_en?: string
  resultado_verificacion?: 'ok' | 'parcial' | 'problema'
  comentarios_verificacion?: string
  foto_verificacion?: string
  foto_factura?: string
  usuario_id: string
}
