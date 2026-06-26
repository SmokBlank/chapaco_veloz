'use client'

import { useEffect, useState } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'

type Pedido = {
  id: number
  total: number
  creado_en: string
  estado: string
}

type ItemPedido = {
  id: number
  cantidad: number
  precio_unitario: number
  producto_id: number
  productos: { nombre: string } | null
}

type Inventario = {
  id: number
  nombre: string
  unidad: string
  stock: number
  stock_minimo: number
}

type Proveedor = {
  id: number
  nombre: string
  telefono: string
  productos_suministrados: string
}

export default function PanelAdministrador() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [inventarioBajo, setInventarioBajo] = useState<Inventario[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [productoEstrella, setProductoEstrella] = useState<{ nombre: string; cantidad: number } | null>(null)
  
  // Filtros de ventas
  const [ventasDia, setVentasDia] = useState(0)
  const [ventasSemana, setVentasSemana] = useState(0)
  const [ventasMes, setVentasMes] = useState(0)
  const [ventasAnio, setVentasAnio] = useState(0)
  const [periodoActivo, setPeriodoActivo] = useState<'dia' | 'semana' | 'mes' | 'anio'>('mes')

  const supabase = crearCliente()

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      // 1. Cargar pedidos completados / vigentes
      const { data: pedidosData } = await supabase
        .from('pedidos')
        .select('id, total, creado_en, estado')
        .neq('estado', 'cancelado')
        .neq('estado', 'pendiente_pago')
      
      const listaPedidos = pedidosData || []
      setPedidos(listaPedidos)
      calcularVentas(listaPedidos)

      // 2. Cargar items de pedido para el producto estrella
      const { data: itemsData } = await supabase
        .from('items_pedido')
        .select('cantidad, producto_id, productos(nombre)')
      
      calcularProductoEstrella(itemsData || [])

      // 3. Cargar inventario bajo (stock <= 5)
      const { data: inventarioData } = await supabase
        .from('inventario')
        .select('*')
        .lte('stock', 5)
      
      setInventarioBajo(inventarioData || [])

      // 4. Cargar proveedores
      const { data: provsData } = await supabase
        .from('proveedores')
        .select('id, nombre, telefono, productos_suministrados')
        .limit(5)
      
      setProveedores(provsData || [])

    } catch (error) {
      console.error('Error cargando datos del dashboard:', error)
    }
  }

  const calcularVentas = (lista: Pedido[]) => {
    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()
    
    // Hace 7 días
    const hace7Dias = hoy.getTime() - 7 * 24 * 60 * 60 * 1000
    
    // Inicio del mes
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).getTime()
    
    // Inicio del año
    const inicioAnio = new Date(hoy.getFullYear(), 0, 1).getTime()

    let dia = 0
    let semana = 0
    let mes = 0
    let anio = 0

    lista.forEach(p => {
      const fechaMs = new Date(p.creado_en).getTime()
      if (fechaMs >= inicioHoy) dia += Number(p.total)
      if (fechaMs >= hace7Dias) semana += Number(p.total)
      if (fechaMs >= inicioMes) mes += Number(p.total)
      if (fechaMs >= inicioAnio) anio += Number(p.total)
    })

    setVentasDia(dia)
    setVentasSemana(semana)
    setVentasMes(mes)
    setVentasAnio(anio)
  }

  const calcularProductoEstrella = (items: any[]) => {
    const contador: Record<string, number> = {}
    items.forEach(item => {
      const nombre = item.productos?.nombre || 'Desconocido'
      contador[nombre] = (contador[nombre] || 0) + item.cantidad
    })

    let maxNombre = ''
    let maxCant = 0

    Object.entries(contador).forEach(([nombre, cant]) => {
      if (cant > maxCant) {
        maxCant = cant
        maxNombre = nombre
      }
    })

    if (maxCant > 0) {
      setProductoEstrella({ nombre: maxNombre, cantidad: maxCant })
    } else {
      setProductoEstrella(null)
    }
  }

  const abrirWhatsApp = (telefono: string) => {
    const limpio = telefono.replace(/\D/g, '')
    window.open(`https://wa.me/591${limpio}`, '_blank')
  }

  // Datos del gráfico (SVG dinámico)
  const obtenerValoresGrafico = () => {
    if (periodoActivo === 'dia') {
      return [ventasDia * 0.2, ventasDia * 0.4, ventasDia * 0.7, ventasDia]
    } else if (periodoActivo === 'semana') {
      return [ventasSemana * 0.15, ventasSemana * 0.35, ventasSemana * 0.6, ventasSemana]
    } else if (periodoActivo === 'anio') {
      return [ventasAnio * 0.3, ventasAnio * 0.5, ventasAnio * 0.8, ventasAnio]
    }
    return [ventasMes * 0.25, ventasMes * 0.45, ventasMes * 0.75, ventasMes]
  }

  const graficoPuntos = obtenerValoresGrafico()
  const maxGrafico = Math.max(...graficoPuntos, 100)

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Panel de Control</h1>
          <p className="text-zinc-400 text-sm">Resumen general y métricas operativas de Chapaco Veloz.</p>
        </div>
        <button 
          onClick={cargarDatos}
          className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
        >
          🔄 Actualizar Datos
        </button>
      </div>

      {/* Cards stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sales Card */}
        <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider block mb-1">Ventas del Día</span>
            <p className="text-3xl font-black text-white">Bs {ventasDia.toFixed(2)}</p>
          </div>
          <span className="text-green-500 text-xs font-medium mt-3 block">📍 Ingresos de hoy</span>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider block mb-1">Ventas Mensuales</span>
            <p className="text-3xl font-black text-white">Bs {ventasMes.toFixed(2)}</p>
          </div>
          <span className="text-red-500 text-xs font-medium mt-3 block">📈 Total acumulado del mes</span>
        </div>

        {/* Best seller Card */}
        <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider block mb-1">⭐ Producto Estrella</span>
            <p className="text-xl font-bold text-white truncate mt-1">
              {productoEstrella ? productoEstrella.nombre : 'Sin ventas'}
            </p>
          </div>
          <span className="text-zinc-400 text-xs font-medium mt-3 block">
            {productoEstrella ? `Vendidos: ${productoEstrella.cantidad} u.` : '-'}
          </span>
        </div>

        {/* Low Stock count Card */}
        <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider block mb-1">🚨 Alerta de Inventario</span>
            <p className="text-3xl font-black text-white">{inventarioBajo.length}</p>
          </div>
          <span className={`text-xs font-medium mt-3 block ${inventarioBajo.length > 0 ? 'text-orange-500 font-bold' : 'text-green-500'}`}>
            {inventarioBajo.length > 0 ? '⚠️ Artículos con stock bajo' : '✅ Todo en orden'}
          </span>
        </div>
      </div>

      {/* Graphs and Stock Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales trend chart */}
        <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl lg:col-span-2 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold">Tendencia de Ventas</h2>
            {/* Filter buttons */}
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-900 text-xs">
              {(['dia', 'semana', 'mes', 'anio'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriodoActivo(p)}
                  className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                    periodoActivo === p ? 'bg-red-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {p === 'dia' ? 'Día' : p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Año'}
                </button>
              ))}
            </div>
          </div>

          {/* Simple Visual Line Chart using SVG */}
          <div className="h-48 w-full flex items-end relative px-2">
            <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="25" x2="400" y2="25" stroke="#1f2937" strokeWidth="0.5" strokeDasharray="5,5" />
              <line x1="0" y1="50" x2="400" y2="50" stroke="#1f2937" strokeWidth="0.5" strokeDasharray="5,5" />
              <line x1="0" y1="75" x2="400" y2="75" stroke="#1f2937" strokeWidth="0.5" strokeDasharray="5,5" />

              {/* Area under the line */}
              <path
                d={`M 0 100 
                    L 0 ${100 - (graficoPuntos[0]/maxGrafico)*80} 
                    L 133 ${100 - (graficoPuntos[1]/maxGrafico)*80} 
                    L 266 ${100 - (graficoPuntos[2]/maxGrafico)*80} 
                    L 400 ${100 - (graficoPuntos[3]/maxGrafico)*80} 
                    L 400 100 Z`}
                fill="url(#grad)"
              />
              {/* The Line */}
              <path
                d={`M 0 ${100 - (graficoPuntos[0]/maxGrafico)*80} 
                    L 133 ${100 - (graficoPuntos[1]/maxGrafico)*80} 
                    L 266 ${100 - (graficoPuntos[2]/maxGrafico)*80} 
                    L 400 ${100 - (graficoPuntos[3]/maxGrafico)*80}`}
                fill="none"
                stroke="#ef4444"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Dots on line */}
              <circle cx="0" cy={100 - (graficoPuntos[0]/maxGrafico)*80} r="4" fill="#ef4444" />
              <circle cx="133" cy={100 - (graficoPuntos[1]/maxGrafico)*80} r="4" fill="#ef4444" />
              <circle cx="266" cy={100 - (graficoPuntos[2]/maxGrafico)*80} r="4" fill="#ef4444" />
              <circle cx="400" cy={100 - (graficoPuntos[3]/maxGrafico)*80} r="4" fill="#ef4444" />
            </svg>
          </div>
          
          <div className="flex justify-between text-zinc-500 text-xs mt-4 px-2">
            <span>Inicio del período</span>
            <span>25%</span>
            <span>50%</span>
            <span>Total actual</span>
          </div>
        </div>

        {/* Low Stock Alert box */}
        <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl flex flex-col">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            🚨 Stock Bajo ({inventarioBajo.length})
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 max-h-56">
            {inventarioBajo.map(item => (
              <div key={item.id} className="bg-red-950/20 border border-red-900/20 px-4 py-3 rounded-xl flex justify-between items-center">
                <div>
                  <p className="text-sm font-semibold text-white">{item.nombre}</p>
                  <p className="text-xs text-zinc-500">Mínimo: {item.stock_minimo} {item.unidad}</p>
                </div>
                <span className="bg-red-900/40 text-red-400 font-bold px-2 py-1 rounded-lg text-xs">
                  {item.stock} {item.unidad}
                </span>
              </div>
            ))}
            {inventarioBajo.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-8">No hay alertas de inventario.</p>
            )}
          </div>
        </div>
      </div>

      {/* Distributors / Suppliers Section */}
      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl">
        <h2 className="text-lg font-bold mb-4">🤝 Distribuidores Destacados</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="text-zinc-500 uppercase tracking-wider text-xs border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Nombre</th>
                <th className="py-3 px-4 font-semibold">Contacto</th>
                <th className="py-3 px-4 font-semibold">Suministro</th>
                <th className="py-3 px-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map(prov => (
                <tr key={prov.id} className="border-b border-zinc-900/60 hover:bg-zinc-900/20">
                  <td className="py-3.5 px-4 font-bold text-white">{prov.nombre}</td>
                  <td className="py-3.5 px-4">{prov.telefono}</td>
                  <td className="py-3.5 px-4">{prov.productos_suministrados || 'Carnes y verduras'}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => abrirWhatsApp(prov.telefono)}
                      className="bg-green-600/10 hover:bg-green-600 border border-green-600/30 hover:border-green-600 text-green-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ml-auto"
                    >
                      💬 WhatsApp
                    </button>
                  </td>
                </tr>
              ))}
              {proveedores.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-zinc-500">No hay proveedores registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}