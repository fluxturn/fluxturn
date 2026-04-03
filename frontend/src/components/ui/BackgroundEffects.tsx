import React from 'react'
import { motion } from 'framer-motion'

export const BackgroundEffects: React.FC = () => {
  return (
    <>
      {/* Animated light beams */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          className="absolute -top-40 -left-40 w-80 h-80 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0, 212, 255, 0.4) 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0, 255, 204, 0.4) 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div
          className="absolute -bottom-40 left-1/2 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0, 153, 204, 0.3) 0%, transparent 70%)',
            filter: 'blur(120px)',
          }}
          animate={{
            x: [-100, 100, -100],
            scale: [1, 1.4, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Side light beams */}
        <motion.div
          className="absolute top-0 left-0 w-1 h-full"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(0, 212, 255, 0.5), transparent)',
            filter: 'blur(20px)',
          }}
          animate={{
            opacity: [0.3, 0.8, 0.3],
            scaleX: [1, 20, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div
          className="absolute top-0 right-0 w-1 h-full"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(0, 255, 204, 0.5), transparent)',
            filter: 'blur(20px)',
          }}
          animate={{
            opacity: [0.3, 0.8, 0.3],
            scaleX: [1, 20, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
        
        {/* Floating particles */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-cyan-400"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + i * 10}%`,
              filter: 'blur(1px)',
              boxShadow: '0 0 10px rgba(0, 212, 255, 0.8)',
            }}
            animate={{
              y: [-20, -100, -20],
              x: [0, 50, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 1.5,
            }}
          />
        ))}
      </div>
    </>
  )
}