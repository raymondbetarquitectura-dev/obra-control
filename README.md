# ⚒ OBRA CONTROL — Guía de Instalación 

## ¿Qué es esto?
Sistema web para controlar compras, inventario y bodega en obra.
Funciona desde cualquier celular o computadora.

---

## PASO 1 — Supabase (Base de datos)

1. Ve a **supabase.com** → Inicia sesión con Google
2. Clic en **"New Project"**
   - Nombre: `obra-control`
   - Contraseña: (guárdala bien)
   - Región: US East
3. Espera ~2 minutos a que cargue
4. Ve a **Settings → API**
   - Copia **"Project URL"** → la vas a necesitar
   - Copia **"anon public"** key → la vas a necesitar
5. Ve a **SQL Editor** (menú izquierdo)
6. Pega TODO el contenido del archivo `supabase-schema.sql`
7. Clic en **"Run"** (botón verde)

---

## PASO 2 — Vercel (Donde vive la app)

1. Ve a **vercel.com** → Inicia sesión con GitHub
   (Si no tienes GitHub, créalo en github.com — es gratis)
2. En Vercel: **"Add New Project"** → **"Import Git Repository"**
3. Sube este proyecto a GitHub primero:
   - Ve a github.com → **"New repository"** → nombre: `obra-control`
   - Sube los archivos arrastrándolos

---

## PASO 3 — Variables de entorno

En Vercel, antes de hacer Deploy:
- Clic en **"Environment Variables"**
- Agrega estas dos:

```
NEXT_PUBLIC_SUPABASE_URL = (tu Project URL de Supabase)
NEXT_PUBLIC_SUPABASE_ANON_KEY = (tu anon key de Supabase)
```

---

## PASO 4 — Deploy

1. Clic en **"Deploy"**
2. Espera ~3 minutos
3. Vercel te da un link tipo: `obra-control.vercel.app`
4. ¡Listo! Ese es tu sistema

---

## PASO 5 — Crear tu primer usuario (Admin)

1. En Supabase → **Authentication → Users**
2. Clic en **"Invite user"**
3. Pon tu email
4. Entra al link que te llega al correo
5. Crea tu contraseña
6. En Supabase → **Table Editor → usuarios**
7. Agrega una fila:
   - `id`: (copia el ID del usuario que creaste)
   - `nombre`: Luis (o tu nombre)
   - `email`: tu email
   - `rol`: admin
   - `activo`: true

¡Ya puedes entrar! Desde el panel de Admin crea a los demás usuarios.

---

## Usuarios y roles

| Rol | Acceso |
|-----|--------|
| admin | Todo: usuarios, reportes, todas las pantallas |
| residente | Crear requisiciones, verificar trabajos |
| compradora | Ver requisiciones, registrar compras |
| bodega | Recibir material, entregar a trabajadores |

---

## Soporte
Este sistema fue creado con Claude (Anthropic).
Para cambios o mejoras, comparte el chat con tu desarrollador.
