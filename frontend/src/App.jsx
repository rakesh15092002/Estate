import React from 'react'
import { BrowserRouter, Routes, Route, Outlet, NavLink, Link } from 'react-router-dom'
import Home from './pages/Home'
import MapSimulator from './components/MapSimulator'

function AppLayout() {
  return (
    <div className="grain flex h-[100dvh] min-h-0 flex-col bg-[#0A0E1A]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.12),transparent_70%)]" />
        <div className="absolute -right-60 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.06),transparent_70%)]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(201,168,76,0.06),transparent_70%)]" />
        <svg className="absolute inset-0 h-full w-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <defs>
            <pattern id="es-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#C9A84C" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#es-grid)" />
        </svg>
      </div>

      <header className="relative z-20 shrink-0 border-b border-[rgba(201,168,76,0.12)] bg-[rgba(10,14,26,0.88)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-[#F0EDE6] transition-opacity hover:opacity-90"
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#0A0E1A]"
              style={{ background: 'linear-gradient(135deg, #C9A84C, #8A6E2F)', boxShadow: '0 0 16px rgba(201,168,76,0.28)' }}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            </span>
            <span className="font-serif text-lg tracking-tight sm:text-xl" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Estate<span className="text-[#C9A84C]">Scout</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 font-medium transition-colors ${
                  isActive ? 'bg-[rgba(201,168,76,0.12)] text-[#C9A84C]' : 'text-[#9AA0B0] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F0EDE6]'
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/map-simulator"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 font-medium transition-colors ${
                  isActive ? 'bg-[rgba(201,168,76,0.12)] text-[#C9A84C]' : 'text-[#9AA0B0] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F0EDE6]'
                }`
              }
            >
              Map simulator
            </NavLink>
          </nav>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/map-simulator" element={<MapSimulator standalone />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
