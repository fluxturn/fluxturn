interface AuthLayoutProps {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50/30 flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center">
        {children}
      </main>
    </div>
  )
}
