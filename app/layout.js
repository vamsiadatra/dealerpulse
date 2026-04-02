import './globals.css'

export const metadata = {
  title: 'DealerPulse Dashboard',
  description: 'Real-time dealership performance tracking.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}