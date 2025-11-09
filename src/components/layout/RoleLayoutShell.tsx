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
    <div className="min-h-[calc(100vh-160px)] bg-slate-50 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 lg:flex-row">
        <aside className="w-full lg:w-64 space-y-6">
          <div className="rounded-2xl border border-primary/20 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-top-2">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary/70">Zona Azul</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">{title}</h1>
            <p className="mt-3 text-sm text-gray-600">{subtitle}</p>
          </div>
          <nav className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
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
                      className={`block rounded-xl px-4 py-3 transition-all duration-150 ease-out transform ${
                        isActive
                          ? 'bg-primary text-white shadow-md scale-[1.02]'
                          : 'text-gray-600 hover:bg-primary/5 hover:text-primary hover:scale-[1.01] active:scale-[0.98]'
                      }`}
                      style={{ willChange: 'transform' }}
                    >
                      <span className="block text-sm font-semibold transition-all duration-150">{link.label}</span>
                      {link.description && (
                        <span
                          className={`mt-1 block text-xs font-medium transition-all duration-150 ${
                            isActive ? 'text-primary/20' : 'text-gray-400'
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
        <section className="flex-1 space-y-6 lg:min-h-[640px]">
          <PageTransition>{children}</PageTransition>
        </section>
      </div>
    </div>
  )
}

