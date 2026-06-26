'use client'

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Solución para los íconos de Leaflet en Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})
import { useState, useEffect } from 'react'

export type Ubicacion = {
  lat: number
  lng: number
}

// Centro de Cochabamba, Bolivia
const defaultCenter = { lat: -17.3935, lng: -66.1570 }

function MapEvents({ setUbicacion }: { setUbicacion: (u: Ubicacion) => void }) {
  useMapEvents({
    click(e) {
      setUbicacion({ lat: e.latlng.lat, lng: e.latlng.lng })
    }
  })
  return null
}

export default function MapSelector({ onChange }: { onChange: (u: Ubicacion) => void }) {
  const [ubicacion, setUbicacion] = useState<Ubicacion>(defaultCenter)

  // Emitimos el valor por defecto apenas monta
  useEffect(() => {
    onChange(defaultCenter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSetUbicacion = (u: Ubicacion) => {
    setUbicacion(u)
    onChange(u)
  }

  return (
    <div className="h-64 w-full rounded-xl overflow-hidden border border-zinc-300 relative z-0 mt-3">
      <MapContainer 
        center={[defaultCenter.lat, defaultCenter.lng]} 
        zoom={14} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[ubicacion.lat, ubicacion.lng]} />
        <MapEvents setUbicacion={handleSetUbicacion} />
      </MapContainer>
      <div className="absolute top-2 right-2 bg-white/90 px-3 py-1.5 text-xs font-bold rounded-lg shadow-md z-[1000] text-black border border-zinc-200">
        👆 Toca en el mapa para tu ubicación
      </div>
    </div>
  )
}
