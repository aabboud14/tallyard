import { NavLink, Outlet, useLocation } from 'react-router'
import { useStore } from '../../store/store'
import { PRODUCT_NAME, DEMO_TODAY } from '../../domain/constants'
import { LABELS } from '../../domain/reference/labels'
import { formatDate } from '../../domain/dates'
import { WORKSPACES } from '../../app/workspaces'
import { PersonaSwitcher } from './PersonaSwitcher'
import { DemoScriptPanel } from './DemoScriptPanel'
import { ResetButton } from './ResetButton'
import { ErrorBoundary } from '../ErrorBoundary'
import { cx } from '../ui'

export function Layout() {
  const personaId = useStore((s) => s.personaId)
  const location = useLocation()
  const ws = WORKSPACES[personaId]
  const isLanding = location.pathname === '/'
  const isCapture = location.pathname === '/supply/capture'
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-rule bg-panel print:hidden">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <NavLink to="/" className="font-display text-2xl leading-none text-ink no-underline">
            {PRODUCT_NAME}
          </NavLink>
          <PersonaSwitcher />
          <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Shared">
            <DemoScriptPanel />
            <TopLink to="/assumptions">Assumptions</TopLink>
            <TopLink to="/about">About</TopLink>
            <ResetButton />
          </nav>
          <span className="ml-auto rounded-sm border border-rule px-2 py-0.5 text-xs text-mill-text" data-testid="label-L1">
            {LABELS.L1}
          </span>
        </div>
      </header>
      <div className={cx('flex flex-1', isCapture && 'flex-col sm:flex-row')}>
        {!isLanding ? (
          <aside className={cx('w-full shrink-0 border-b border-rule bg-panel sm:w-48 sm:border-b-0 sm:border-r print:hidden', isCapture ? 'hidden sm:block' : '')} aria-label="Workspace">
            <div className="px-4 pb-1 pt-3 text-xs font-medium uppercase tracking-wide text-mill-text">{ws.title}</div>
            <div className="px-4 pb-2 text-sm font-semibold">{ws.subtitle}</div>
            <ul className="flex flex-row flex-wrap gap-1 px-2 pb-2 sm:flex-col sm:gap-0">
              {ws.tabs.map((t) => (
                <li key={t.to}>
                  <NavLink to={t.to} className={({ isActive }) => cx('block rounded-sm px-2 py-1.5 text-sm no-underline', isActive ? 'bg-steel-tint font-medium text-ink' : 'text-ink-soft hover:bg-rule-soft')}>
                    {t.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
        <main className="min-w-0 flex-1 px-4 py-4 sm:px-6" id="main">
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <footer className="border-t border-rule bg-panel px-4 py-2 text-xs text-mill-text print:hidden">Demo date: {formatDate(DEMO_TODAY)}</footer>
    </div>
  )
}

function TopLink({ to, children }: { to: string; children: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => cx('rounded-sm px-2 py-1 no-underline', isActive ? 'bg-steel-tint text-ink' : 'text-steel hover:bg-steel-tint')}>
      {children}
    </NavLink>
  )
}
