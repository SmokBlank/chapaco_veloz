import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const { email, nombre } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Falta el correo electrónico' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USUARIO,
        pass: process.env.EMAIL_PASSWORD,
      },
    })

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-w-md: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #dc2626; margin: 0; font-size: 28px; font-weight: 800;">CHAPACO VELOZ</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <h2 style="color: #1f2937; margin-top: 0;">¡Hola${nombre ? ` ${nombre}` : ''}! 👋</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
            Bienvenido/a a la familia de <strong>Chapaco Veloz</strong>. Estamos muy emocionados de tenerte aquí.
          </p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
            A partir de ahora, podrás disfrutar de la comida más rápida y deliciosa de Cochabamba, directo a tu puerta y con un servicio increíble.
          </p>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.5;">
            ¿Tienes hambre? Revisa nuestro menú y descubre todos los platillos que tenemos preparados especialmente para ti.
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace('.supabase.co', '') /* placeholder for app url */ : 'http://localhost:3000'}/cliente/menu" 
               style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Ver el Menú
            </a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Chapaco Veloz. Todos los derechos reservados.</p>
        </div>
      </div>
    `

    await transporter.sendMail({
      from: '"Chapaco Veloz" <' + process.env.EMAIL_USUARIO + '>',
      to: email,
      subject: '¡Bienvenido a Chapaco Veloz! 🍔',
      html: htmlContent,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error enviando correo de bienvenida:', error)
    return NextResponse.json({ error: 'Error al enviar el correo' }, { status: 500 })
  }
}
