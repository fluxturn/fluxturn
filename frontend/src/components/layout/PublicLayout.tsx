import React from 'react'
import { Link, useNavigate, Outlet } from 'react-router-dom'
import { Footer } from './Footer'
import { Header } from './Header'
import { motion } from 'framer-motion'
import { BackgroundEffects } from '../ui/BackgroundEffects'

export const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-cyan-900/50 to-teal-900 relative overflow-hidden">
      {/* Animated Background Effects */}
      <BackgroundEffects />
      
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute inset-0 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-400/30 to-transparent rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-teal-400/30 to-transparent rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/20 via-teal-500/20 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>
      
      {/* Navigation Header */}
      <Header />
      
      {/* Main Content with spacing for fixed header and animations */}
      <motion.main 
        className="relative z-10 flex-1 pt-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Outlet />
      </motion.main>
      
      {/* Footer */}
      <Footer />
    </div>
  )
}

export default PublicLayout