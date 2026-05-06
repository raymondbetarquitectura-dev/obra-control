-- ============================================
-- SCHEMA OBRA CONTROL
-- Ejecuta esto en Supabase > SQL Editor
-- ============================================

-- Tabla de perfiles de usuario (extiende auth.users)
CREATE TABLE public.usuarios (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  rol TEXT NOT NULL CHECK (rol IN ('admin','residente','compradora','bodega')),
  activo BOOLEAN DEFAULT true,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de requisiciones
CREATE TABLE public.requisiciones (
  id BIGSERIAL PRIMARY KEY,
  material TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  unidad TEXT NOT NULL DEFAULT 'piezas',
  ubicacion TEXT NOT NULL,
  descripcion TEXT,
  prioridad TEXT NOT NULL DEFAULT 'normal' CHECK (prioridad IN ('normal','urgente')),
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','comprada','recibida','entregada','verificada')),

  -- Requisición
  solicitado_por TEXT NOT NULL,
  usuario_id UUID REFERENCES public.usuarios(id),
  solicitado_en DATE DEFAULT CURRENT_DATE,

  -- Compra
  comprado_por TEXT,
  comprado_en DATE,
  proveedor TEXT,
  costo DECIMAL(10,2),
  foto_factura TEXT,

  -- Recepción bodega
  recibido_por TEXT,
  recibido_en DATE,
  cantidad_recibida INTEGER,
  notas_recepcion TEXT,
  foto_recepcion TEXT,

  -- Entrega a trabajador
  entregado_a TEXT,
  cantidad_entregada INTEGER,
  entregado_en DATE,
  foto_entrega TEXT,

  -- Verificación
  verificado_por TEXT,
  verificado_en DATE,
  resultado_verificacion TEXT CHECK (resultado_verificacion IN ('ok','parcial','problema')),
  comentarios_verificacion TEXT,
  foto_verificacion TEXT,

  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Storage bucket para fotos
INSERT INTO storage.buckets (id, name, public) VALUES ('evidencias', 'evidencias', true);

-- Políticas de seguridad (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisiciones ENABLE ROW LEVEL SECURITY;

-- Usuarios: solo admins pueden ver todos, cada quien se ve a sí mismo
CREATE POLICY "usuarios_select" ON public.usuarios
  FOR SELECT USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin'
  ));

CREATE POLICY "usuarios_insert" ON public.usuarios
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin'
  ));

CREATE POLICY "usuarios_update" ON public.usuarios
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'admin'
  ));

-- Requisiciones: todos los usuarios activos pueden ver
CREATE POLICY "requisiciones_select" ON public.requisiciones
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND activo = true
  ));

CREATE POLICY "requisiciones_insert" ON public.requisiciones
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND activo = true
  ));

CREATE POLICY "requisiciones_update" ON public.requisiciones
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND activo = true
  ));

-- Storage: usuarios autenticados pueden subir fotos
CREATE POLICY "evidencias_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'evidencias' AND auth.role() = 'authenticated');

CREATE POLICY "evidencias_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'evidencias');

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.actualizado_en = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.requisiciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
