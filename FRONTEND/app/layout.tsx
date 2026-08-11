import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { CoordinateProvider } from '@/lib/coordinate-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'Float Chat',
  description: 'AI-powered ARGO Float data exploration and visualization',
  generator: 'Float Chat',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <CoordinateProvider>
          {children}
        </CoordinateProvider>
        <Analytics />
      </body>
    </html>
  )
}
