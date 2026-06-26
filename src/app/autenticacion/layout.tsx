import { ThemeToggle } from '@/components/ThemeToggle'

export default function LayoutAutenticacion({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-zinc-950 text-gray-900 dark:text-gray-100 flex justify-center transition-colors relative">
      
      {/* Botón de cambio de tema en la esquina superior izquierda (para no tapar la imagen) */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur p-1 rounded-full shadow-sm border border-gray-200 dark:border-zinc-800">
        <ThemeToggle />
      </div>

      <div className="max-w-screen-xl m-0 sm:m-10 bg-white dark:bg-zinc-900 shadow sm:rounded-2xl flex justify-center flex-1 overflow-hidden transition-colors border border-gray-200 dark:border-zinc-800">
        
        {/* Formulario (Izquierda) */}
        <div className="lg:w-1/2 xl:w-5/12 p-6 sm:p-12 flex flex-col">
          <div className="flex justify-center">
            {/* Logo de la Empresa */}
            <img 
              src="/logo.png"
              className="w-32 mx-auto" 
              alt="Logo Empresa" 
            />
          </div>
          
          <div className="mt-8 flex flex-col items-center flex-1">
            <div className="w-full flex-1">
              {children}
            </div>
          </div>
        </div>

        {/* Imagen Ilustrativa (Derecha) */}
        <div className="flex-1 bg-red-50 dark:bg-red-950/20 hidden lg:flex border-l border-gray-100 dark:border-zinc-800 transition-colors relative">
          {/* Mostramos login_imagen.jpg o login_imagen.png si el usuario la sube, sino el fondo SVG */}
          <div
            className="w-full bg-cover bg-center bg-no-repeat absolute inset-0 z-10"
            style={{ backgroundImage: "url('/login_imagen.png')" }}
          />
          <div
            className="w-full bg-contain bg-center bg-no-repeat opacity-90 absolute inset-0 z-0"
            style={{ backgroundImage: "url('https://storage.googleapis.com/devitary-image-host.appspot.com/15848031292911696601-undraw_designer_life_w96d.svg')" }}
          />
        </div>

      </div>
    </div>
  )
}