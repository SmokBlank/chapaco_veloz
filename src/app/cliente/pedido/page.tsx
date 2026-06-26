'use client'

import { useEffect, useState } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'
import Link from 'next/link'

type Pedido = {
  id: number
  estado: string
  total: number
  creado_en: string
}

export default function MisPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const supabase = crearCliente()

  useEffect(() => {
    const cargar = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('pedidos')
        .select('id, estado, total, creado_en')
        .eq('cliente_id', session.user.id)
        .order('creado_en', { ascending: false })
      setPedidos(data || [])
    }
    cargar()
  }, [])

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Mis Pedidos</h1>
      {pedidos.length === 0 ? (
        <p className="text-gray-500">Aún no tienes pedidos.</p>
      ) : (
        <div className="space-y-3">
          {pedidos.map(p => (
            <Link key={p.id} href={`/cliente/pedido/${p.id}`} className="block bg-white p-4 rounded shadow hover:shadow-md">
              <div className="flex justify-between">
                <span>Pedido #{p.id}</span>
                <span className="text-sm text-gray-500">{new Date(p.creado_en).toLocaleString()}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="font-semibold">Bs {p.total}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  p.estado === 'entregado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>{p.estado}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}