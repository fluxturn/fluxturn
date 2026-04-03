import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Sparkles } from 'lucide-react'

export const PreviewBadge: React.FC = () => {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="relative inline-flex items-center"
    >
      {/* Pulsing glow effect */}
      <motion.div
        className="absolute inset-0 bg-blue-500 rounded-full blur-sm"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Badge container */}
      <div className="relative flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-blue-500/80 to-cyan-500/80 rounded-full backdrop-blur-sm border border-blue-400/40">
        {/* Icon */}
        <motion.div
          animate={{
            rotate: [0, -10, 10, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: "easeInOut"
          }}
        >
          <Sparkles className="w-2.5 h-2.5 text-white" />
        </motion.div>

        {/* Text */}
        <span className="text-[9px] font-bold text-white uppercase tracking-wider pr-0.5">
          Beta
        </span>

        {/* Sparkle effect */}
        <motion.div
          className="absolute -top-0.5 -right-0.5"
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            repeatDelay: 1,
            ease: "easeInOut"
          }}
        >
          <Sparkles className="w-2.5 h-2.5 text-yellow-300" />
        </motion.div>
      </div>
    </motion.div>
  )
}

export default PreviewBadge