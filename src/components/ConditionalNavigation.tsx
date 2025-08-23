'use client'

import { usePathname } from 'next/navigation'
import BackendNavigation from './BackendNavigation'

const ConditionalNavigation = () => {
  const pathname = usePathname()
  
  // Hide navigation on post edit pages
  const isPostEditPage = pathname?.includes('/posts/') && pathname?.includes('/edit')
  
  if (isPostEditPage) {
    return null
  }
  
  return <BackendNavigation />
}

export default ConditionalNavigation
