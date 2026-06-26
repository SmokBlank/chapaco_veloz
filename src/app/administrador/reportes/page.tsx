'use client'

import { useState } from 'react'
import { crearCliente } from '@/lib/supabase/cliente'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type ReporteDatos = {
  ventasTotales: number
  cantidadPedidos: number
  cajaSaldo: number
  nominaTotal: number
  pedidos: any[]
  inventario: any[]
  movimientosCaja: any[]
  empleados: any[]
}

export default function ReportesAdmin() {
  const [periodo, setPeriodo] = useState<'dia' | 'semana' | 'mes' | 'anio'>('mes')
  const [cargando, setCargando] = useState(false)
  const [datos, setDatos] = useState<ReporteDatos | null>(null)
  const supabase = crearCliente()

  const generarReporte = async () => {
    setCargando(true)
    try {
      const hoy = new Date()
      let fechaInicio = new Date()

      if (periodo === 'dia') {
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
      } else if (periodo === 'semana') {
        fechaInicio.setTime(hoy.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else if (periodo === 'anio') {
        fechaInicio = new Date(hoy.getFullYear(), 0, 1)
      } else { // mes
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
      }

      const isoFechaInicio = fechaInicio.toISOString()

      // 1. Obtener pedidos
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('id, total, creado_en, estado, perfiles!cliente_id(nombre_completo)')
        .gte('creado_en', isoFechaInicio)
        .neq('estado', 'cancelado')

      const listPedidos = pedidos || []
      const ventasTotales = listPedidos.reduce((sum, p) => sum + Number(p.total), 0)

      // 2. Obtener inventario actual
      const { data: inventario } = await supabase
        .from('inventario')
        .select('nombre, unidad, stock, stock_minimo')
        .order('nombre')

      // 3. Obtener movimientos de caja chica del periodo
      const { data: movimientosCaja } = await supabase
        .from('movimientos_caja')
        .select('id, tipo, monto, concepto, creado_en')
        .gte('creado_en', isoFechaInicio)
      
      const listMovs = movimientosCaja || []
      const ingresosCaja = listMovs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto), 0)
      const egresosCaja = listMovs.filter(m => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto), 0)
      const cajaSaldo = ingresosCaja - egresosCaja

      // 4. Obtener empleados para calcular nómina
      const { data: empleados } = await supabase
        .from('empleados')
        .select('nombre_completo, cargo, salario_diario, activo')
        .eq('activo', true)

      const listEmpleados = empleados || []
      let diasMultiplicador = 1
      if (periodo === 'semana') diasMultiplicador = 7
      else if (periodo === 'mes') diasMultiplicador = 30
      else if (periodo === 'anio') diasMultiplicador = 365

      const nominaTotal = listEmpleados.reduce((sum, e) => sum + (Number(e.salario_diario) * diasMultiplicador), 0)

      setDatos({
        ventasTotales,
        cantidadPedidos: listPedidos.length,
        cajaSaldo,
        nominaTotal,
        pedidos: listPedidos,
        inventario: inventario || [],
        movimientosCaja: listMovs,
        empleados: listEmpleados
      })

    } catch (err: any) {
      alert('Error al generar reporte: ' + err.message)
    } finally {
      setCargando(false)
    }
  }

  const descargarPDF = () => {
    if (!datos) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Encabezado principal del PDF
    doc.setFillColor(153, 27, 27) // Rojo burdeos
    doc.rect(0, 0, pageWidth, 40, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('CHAPACO VELOZ RESTAURANTE', 15, 18)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Reporte de Gestión - Período: ${periodo.toUpperCase()}`, 15, 26)
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 15, 32)

    // Resumen Ejecutivo
    doc.setTextColor(23, 23, 23)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Resumen Financiero', 15, 52)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Total Ventas: Bs ${datos.ventasTotales.toFixed(2)}`, 15, 60)
    doc.text(`Número de Pedidos: ${datos.cantidadPedidos}`, 15, 66)
    doc.text(`Saldo Neto Caja Chica (Movs. Periodo): Bs ${datos.cajaSaldo.toFixed(2)}`, 15, 72)
    doc.text(`Nómina Estimada de Personal: Bs ${datos.nominaTotal.toFixed(2)}`, 15, 78)

    // Tabla de Pedidos / Ventas del periodo
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Ventas Registradas', 15, 90)

    const tableVentas = datos.pedidos.map(p => [
      `#${p.id}`,
      p.perfiles?.nombre_completo || 'Cliente General',
      new Date(p.creado_en).toLocaleDateString(),
      p.estado,
      `Bs ${Number(p.total).toFixed(2)}`
    ])

    autoTable(doc, {
      startY: 94,
      head: [['Cod Pedido', 'Cliente', 'Fecha', 'Estado', 'Monto']],
      body: tableVentas,
      theme: 'grid',
      headStyles: { fillColor: [153, 27, 27] },
      styles: { fontSize: 8 }
    })

    // Inventario actual
    doc.addPage()
    doc.setFillColor(153, 27, 27)
    doc.rect(0, 0, pageWidth, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.text('Inventario de Ingredientes y Productos', 15, 13)

    const tableInventario = datos.inventario.map(i => [
      i.nombre,
      i.stock,
      i.unidad,
      i.stock_minimo,
      i.stock <= i.stock_minimo ? 'Bajo' : 'Suficiente'
    ])

    autoTable(doc, {
      startY: 28,
      head: [['Ingrediente / Producto', 'Existencia', 'Unidad', 'Stock Mínimo', 'Estado']],
      body: tableInventario,
      theme: 'grid',
      headStyles: { fillColor: [153, 27, 27] },
      styles: { fontSize: 8 }
    })

    // Liquidación al personal
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(23, 23, 23)
    // Calcular dinámicamente el startY para la siguiente tabla
    const finalY = (doc as any).lastAutoTable.finalY || 35
    doc.text('Liquidación y Nómina Estimada de Personal', 15, finalY + 15)

    let dias = 1
    if (periodo === 'semana') dias = 7
    else if (periodo === 'mes') dias = 30
    else if (periodo === 'anio') dias = 365

    const tableNominas = datos.empleados.map(e => [
      e.nombre_completo,
      e.cargo,
      `Bs ${Number(e.salario_diario).toFixed(2)}`,
      `${dias} días`,
      `Bs ${(Number(e.salario_diario) * dias).toFixed(2)}`
    ])

    autoTable(doc, {
      startY: finalY + 19,
      head: [['Trabajador', 'Cargo', 'Salario Diario', 'Período', 'Total a Pagar']],
      body: tableNominas,
      theme: 'grid',
      headStyles: { fillColor: [153, 27, 27] },
      styles: { fontSize: 8 }
    })

    // Guardar archivo PDF
    doc.save(`reporte-chapaco-veloz-${periodo}-${Date.now()}.pdf`)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Reportes de Gestión</h1>
        <p className="text-zinc-400 text-sm">Consulta y exporta informes consolidados de ventas, inventario y nómina.</p>
      </div>

      {/* Control panel to generate report */}
      <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl flex flex-col sm:flex-row items-end gap-4">
        <div className="flex-1 w-full">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Selecciona Período</label>
          <select
            value={periodo}
            onChange={e => setPeriodo(e.target.value as any)}
            className="w-full bg-zinc-950 border border-zinc-900 rounded-xl p-3 text-sm text-zinc-200 focus:outline-none focus:border-red-600"
          >
            <option value="dia">Hoy (Diario)</option>
            <option value="semana">Últimos 7 Días (Semanal)</option>
            <option value="mes">Este Mes (Mensual)</option>
            <option value="anio">Este Año (Anual)</option>
          </select>
        </div>

        <button
          onClick={generarReporte}
          disabled={cargando}
          className="w-full sm:w-auto bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl text-sm transition-colors cursor-pointer"
        >
          {cargando ? 'Generando...' : '📊 Consultar Datos'}
        </button>
      </div>

      {/* Report results display */}
      {datos && (
        <div className="space-y-6">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-zinc-900/20 border border-zinc-900 p-5 rounded-xl">
              <span className="text-zinc-500 text-xs font-semibold block mb-1">Ventas Consolidadas</span>
              <p className="text-2xl font-black text-white">Bs {datos.ventasTotales.toFixed(2)}</p>
            </div>
            <div className="bg-zinc-900/20 border border-zinc-900 p-5 rounded-xl">
              <span className="text-zinc-500 text-xs font-semibold block mb-1">Pedidos Atendidos</span>
              <p className="text-2xl font-black text-white">{datos.cantidadPedidos}</p>
            </div>
            <div className="bg-zinc-900/20 border border-zinc-900 p-5 rounded-xl">
              <span className="text-zinc-500 text-xs font-semibold block mb-1">Caja Chica (Saldo Neto)</span>
              <p className="text-2xl font-black text-white">Bs {datos.cajaSaldo.toFixed(2)}</p>
            </div>
            <div className="bg-zinc-900/20 border border-zinc-900 p-5 rounded-xl">
              <span className="text-zinc-500 text-xs font-semibold block mb-1">Costo Estimado Personal</span>
              <p className="text-2xl font-black text-white">Bs {datos.nominaTotal.toFixed(2)}</p>
            </div>
          </div>

          {/* Download button */}
          <div className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-2xl flex justify-between items-center">
            <div>
              <h3 className="font-bold text-white">Reporte PDF Listo</h3>
              <p className="text-xs text-zinc-500">Se han consolidado todos los registros financieros y operacionales del período.</p>
            </div>
            <button
              onClick={descargarPDF}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl text-sm transition-all shadow-lg shadow-green-600/10 cursor-pointer"
            >
              📥 Descargar Reporte en PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
