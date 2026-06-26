import type { Metadata } from 'next'
import './globals.css'
import { CarritoProvider } from '@/contexto/CarritoContexto'

export const metadata: Metadata = {
  title: 'Chapaco Veloz',
  description: 'Sistema de gestión y pedidos del restaurante Chapaco Veloz'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <CarritoProvider>{children}</CarritoProvider>
      </body>
    </html>
  )
}