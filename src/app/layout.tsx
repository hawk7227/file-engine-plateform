import '@/styles/globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { brand, BRAND_NAME } from '@/lib/brand'

export const metadata = {
  title: `${BRAND_NAME} — ${brand.tagline}`,
  description: brand.description,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
