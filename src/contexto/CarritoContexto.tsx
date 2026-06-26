'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type ItemCarrito = {
  id: number
  nombre: string
  precio: number
  cantidad: number
}

type CarritoContextoType = {
  items: ItemCarrito[]
  agregar: (producto: { id: number; nombre: string; precio: number }) => void
  quitar: (id: number) => void
  vaciar: () => void
  total: number
  cantidadTotal: number
}

const CarritoContexto = createContext<CarritoContextoType | undefined>(undefined)

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([])

  // Cargar carrito desde localStorage al montar
  useEffect(() => {
    const guardado = localStorage.getItem('carrito_chapaco')
    if (guardado) setItems(JSON.parse(guardado))
  }, [])

  // Guardar cambios en localStorage
  useEffect(() => {
    localStorage.setItem('carrito_chapaco', JSON.stringify(items))
  }, [items])

  const agregar = (producto: { id: number; nombre: string; precio: number }) => {
    setItems(prev => {
      const existe = prev.find(item => item.id === producto.id)
      if (existe) {
        return prev.map(item =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      }
      return [...prev, { ...producto, cantidad: 1 }]
    })
  }

  const quitar = (id: number) => {
    setItems(prev => {
      const existe = prev.find(item => item.id === id)
      if (existe && existe.cantidad > 1) {
        return prev.map(item =>
          item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item
        )
      }
      return prev.filter(item => item.id !== id)
    })
  }

  const vaciar = () => setItems([])

  const total = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0)
  const cantidadTotal = items.reduce((sum, item) => sum + item.cantidad, 0)

  return (
    <CarritoContexto.Provider value={{ items, agregar, quitar, vaciar, total, cantidadTotal }}>
      {children}
    </CarritoContexto.Provider>
  )
}

export function useCarrito() {
  const context = useContext(CarritoContexto)
  if (!context) throw new Error('useCarrito debe usarse dentro de CarritoProvider')
  return context
}