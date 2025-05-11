import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Web Worker Data Processor App',
  description: 'A web app that processes data using web workers',
  generator: 'Web Worker Data Processor App',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
