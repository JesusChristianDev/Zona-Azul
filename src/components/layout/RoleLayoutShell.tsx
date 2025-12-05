"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import PageTransition from '../ui/PageTransition'

interface RoleLink {
  href: string
  label: string
  description?: string
}

interface RoleLayoutShellProps {
  title: string
  subtitle: string
  links: RoleLink[]
  children: ReactNode
}

export default function RoleLayoutShell({ title, subtitle, links, children }: RoleLayoutShellProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-[calc(100vh-160px)] bg-slate-50 dark:bg-slate-900 py-4 sm:py-6 lg:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:gap-6 lg:gap-8 px-4 sm:px-6 lg:flex-row">
        <aside className="w-full lg:w-64 space-y-4 sm:space-y-6 flex-shrink-0">
          <div className="rounded-xl sm:rounded-2xl border border-primary/20 dark:border-primary/30 bg-white dark:bg-slate-800 p-4 sm:p-6 shadow-sm animate-in fade-in slide-in-from-top-2">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary/70 dark:text-primary/80">Zona Azul</p>
            <h1 className="mt-2 text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
          </div>
          <nav className="rounded-xl sm:rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-sm">
            <ul className="space-y-1">
              {links.map((link, index) => {
                const isActive = pathname === link.href
                return (
                  <li 
                    key={link.href}
                    className="animate-in fade-in slide-in-from-left-2"
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                  >
                    <Link
                      href={link.href}
                      className={`block rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 transition-all duration-150 ease-out transform ${
                        isActive
                          ? 'bg-primary text-white shadow-md scale-[1.02]'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-primary hover:scale-[1.01] active:scale-[0.98]'
                      }`}
                      style={{ willChange: 'transform' }}
                    >
                      <span className="block text-xs sm:text-sm font-semibold transition-all duration-150">{link.label}</span>
                      {link.description && (
                        <span
                          className={`mt-0.5 sm:mt-1 block text-[10px] sm:text-xs font-medium transition-all duration-150 ${
                            isActive ? 'text-primary/20' : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {link.description}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>
        <section className="flex-1 space-y-4 sm:space-y-6 lg:min-h-[640px] min-w-0">
          <PageTransition>{children}</PageTransition>
        </section>
      </div>
    </div>
  )
}

