import './marketing.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`buildops-marketing ${inter.variable}`}>
      {children}
    </div>
  )
}
