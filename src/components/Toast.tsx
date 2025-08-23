'use client'

import { useState, useEffect } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type: ToastType
  onClose: () => void
}

const toastStyles = {
  success: {
    bg: 'bg-green-500',
    icon: '✅',
  },
  error: {
    bg: 'bg-red-500',
    icon: '❌',
  },
  info: {
    bg: 'bg-blue-500',
    icon: 'ℹ️',
  },
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 5000) // Auto-dismiss after 5 seconds

    return () => {
      clearTimeout(timer)
    }
  }, [onClose])

  const styles = toastStyles[type]

  return (
    <div
      className={`fixed top-5 right-5 z-50 flex items-center p-4 rounded-lg shadow-lg text-white ${styles.bg} animate-fade-in-down`}
    >
      <div className="text-xl mr-3">{styles.icon}</div>
      <div className="text-sm font-medium">{message}</div>
      <button onClick={onClose} className="ml-4 text-xl font-semibold leading-none hover:opacity-75">
        &times;
      </button>
    </div>
  )
}

export default Toast
