import '@/styles/globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { brand, BRAND_NAME } from '@/lib/brand'
import { AppClientOverlays } from '@/components/AppClientOverlays'
export const metadata = {
  title: `${BRAND_NAME} — ${brand.tagline}`,
  description: brand.description,
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
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
