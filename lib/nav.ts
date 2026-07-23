export type NavItem = {
  href: string
  label: string
  /** Csak admin role látja. */
  adminOnly?: boolean
}

export type NavSection = {
  title: string
  items: NavItem[]
}

/** Az admin oldalsáv menüszerkezete (a FELADATLISTA moduljai szerint). */
export const NAV: NavSection[] = [
  {
    title: 'Áttekintés',
    items: [{ href: '/', label: 'Dashboard' }],
  },
  {
    title: 'Törzsadatok',
    items: [
      { href: '/helyek', label: 'Raktári helyek' },
      { href: '/termekek', label: 'Termékek' },
      { href: '/beszallitok', label: 'Beszállítók' },
    ],
  },
  {
    title: 'Készletmozgás',
    items: [
      { href: '/bevetelezes', label: 'Bevételezés' },
      { href: '/betarolas', label: 'Betárolás' },
      { href: '/kigyujtes', label: 'Kigyűjtés' },
      { href: '/kiadas', label: 'Kiadás' },
      { href: '/atrarolas', label: 'Átrárolás' },
      { href: '/selejtezes', label: 'Selejtezés' },
    ],
  },
  {
    title: 'Adminisztráció',
    items: [{ href: '/felhasznalok', label: 'Felhasználók', adminOnly: true }],
  },
]
