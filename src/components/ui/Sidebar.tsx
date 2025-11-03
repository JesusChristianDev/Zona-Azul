"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../../hooks/useAuth'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

interface SidebarProps {
  items: NavItem[]
}

export default function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname()
  const { role } = useAuth()

  return (
    <aside className="hidden lg:block w-64 bg-white border-r shadow-sm h-[calc(100vh-64px)] sticky top-16 overflow-y-auto">
      <nav className="p-4 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-primary'
              }`}
            >
              <span className="w-5 h-5">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

