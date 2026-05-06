import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Obra Control',
  description: 'Sistema de control de compras, inventario y bodega',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1a1d27',
              color: '#f1f5f9',
              border: '1px solid #2e3352',
              borderRadius: '10px',
            },
          }}
        />
      </body>
    </html>
  )
}
