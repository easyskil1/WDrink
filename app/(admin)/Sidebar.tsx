'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV } from '@/lib/nav'
import type { Role } from '@/lib/auth'

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function Sidebar({ role }: { role: Role | null }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-6 p-4">
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
                      className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
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
  )
}
