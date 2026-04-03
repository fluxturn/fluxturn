import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  gradient?: boolean
  onClick?: (e: React.MouseEvent) => void
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hover = true,
  glow = false,
  gradient = false,
  onClick
}) => {
  return (
    <motion.div
      className={cn(
        "glass rounded-xl p-6 transition-all duration-300",
        hover && "glass-hover cursor-pointer",
        glow && "glow-hover",
        gradient && "bg-gradient-to-br from-white/10 to-white/5",
        className
      )}
      onClick={onClick}
      whileHover={hover ? { scale: 1.02, y: -5 } : {}}
      whileTap={hover ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  color?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  color = "from-blue-500 to-cyan-500"
}) => {
  const isPositive = change && change > 0

  return (
    <GlassCard hover={false} className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {change !== undefined && (
            <div className="flex items-center space-x-1">
              <span className={cn(
                "text-sm font-medium",
                isPositive ? "text-green-400" : "text-red-400"
              )}>
                {isPositive ? "+" : ""}{change}%
              </span>
              <span className="text-xs text-muted-foreground">from last month</span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl bg-gradient-to-r",
          color
        )}>
          <span className="text-white">{icon}</span>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className={cn(
        "absolute -right-10 -bottom-10 w-32 h-32 rounded-full opacity-10 bg-gradient-to-r",
        color
      )} />
    </GlassCard>
  )
}

interface ChartCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  actions?: React.ReactNode
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  actions
}) => {
  return (
    <GlassCard hover={false} className="h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
      <div className="relative">
        {children}
      </div>
    </GlassCard>
  )
}