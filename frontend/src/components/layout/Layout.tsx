import React from 'react'
import { SimpleMegaMenu } from './SimpleMegaMenu'
import { Toaster } from 'sonner'
import { BackgroundEffects } from '../ui/BackgroundEffects'

interface LayoutProps {
  children: React.ReactNode
  noPadding?: boolean
}

export const Layout: React.FC<LayoutProps> = ({ children, noPadding = false }) => {
  return (
    <div className="h-screen flex flex-col relative">
      {/* Background Effects */}
      <BackgroundEffects />

      {/* SimpleMegaMenu Navigation */}
      <div className="relative z-40">
        <SimpleMegaMenu />
      </div>

      {/* Main Content Area - Full Width */}
      <main className={`flex-1 overflow-y-auto relative ${noPadding ? '' : 'p-6'}`}>
        {children}
      </main>

      {/* Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'glass',
          style: {
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      />
    </div>
  )
}