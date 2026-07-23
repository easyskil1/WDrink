'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV } from '@/lib/nav'
import type { Role } from '@/lib/auth'

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function MobileNav({ role }: { role: Role | null }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Navigáció után zárjuk a drawer-t.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Nyitott drawer alatt ne görögjön a háttér.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Menü"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-700"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* Háttér */}
          <button
            type="button"
            aria-label="Bezárás"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div className="relative flex h-full w-72 max-w-[80vw] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Drink World Győr
                </p>
                <p className="text-xs text-slate-400">Logisztikai admin</p>
              </div>
              <button
                type="button"
                aria-label="Bezárás"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
              {NAV.map((section) => {
                const items = section.items.filter(
                  (item) => !item.adminOnly || role === 'admin'
                )
                if (items.length === 0) return null
                return (
                  <div key={section.title}>
                    <h3 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {section.title}
                    </h3>
                    <ul className="flex flex-col gap-0.5">
                      {items.map((item) => {
                        const active = isActive(pathname, item.href)
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={`block rounded-md px-3 py-3 text-sm font-medium transition ${
                                active
                                  ? 'bg-slate-900 text-white'
                                  : 'text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {item.label}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}
