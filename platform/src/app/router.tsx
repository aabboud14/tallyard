// Every route in the product (BRIEF section 3). Public pages and the shell load with the app; each workspace page
// loads on first visit. IDs in addresses, never names.
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { Landing } from '../features/public/Landing'
import { NotFound } from '../features/public/NotFound'
import { SignInPage } from '../features/auth/SignInPage'
import { SignUpPage } from '../features/auth/SignUpPage'
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage'
import { InvitePage } from '../features/auth/InvitePage'
import { PublicLayout, type RouteHandle } from './PublicLayout'
import { AppShell } from './AppShell'
import { GuestOnly, RequireAuth } from './guards'
import { RouteError } from './RouteError'
import { AppNotFound } from './NoAccess'
import { lazyPage } from './pages'
import { EngagementIndex } from './redirects'

const handle = (title: string): RouteHandle => ({ title })

export const routes: RouteObject[] = [
  {
    errorElement: <RouteError />,
    hydrateFallbackElement: <div className="min-h-dvh bg-page" />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { index: true, element: <Landing /> },
          { path: 'signin', handle: handle('Sign in'), element: <GuestOnly><SignInPage /></GuestOnly> },
          { path: 'signup', handle: handle('Create your account'), element: <GuestOnly><SignUpPage /></GuestOnly> },
          { path: 'forgot-password', handle: handle('Reset your password'), element: <GuestOnly><ForgotPasswordPage /></GuestOnly> },
          { path: 'invite/:token', handle: handle('Join your team'), element: <InvitePage /> },
        ],
      },
      {
        path: 'app',
        element: (
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        ),
        children: [
          {
            // A page that throws shows its message inside the shell, so the sidebar and the way home stay.
            errorElement: <RouteError inShell />,
            children: [
              { index: true, element: <Navigate to="/app/home" replace /> },
              { path: 'home', lazy: lazyPage(() => import('../features/home/Home'), 'Home') },
              { path: 'discover', lazy: lazyPage(() => import('../features/discover/Discover'), 'Discover') },
              { path: 'discover/:publicId', lazy: lazyPage(() => import('../features/material/MaterialPage'), 'MaterialPage') },
              { path: 'saved', lazy: lazyPage(() => import('../features/saved/Saved'), 'Saved') },
              { path: 'projects', lazy: lazyPage(() => import('../features/projects/ProjectsList'), 'ProjectsList') },
              { path: 'projects/new', lazy: lazyPage(() => import('../features/projects/NewProject'), 'NewProject') },
              {
                path: 'projects/:projectId',
                lazy: lazyPage(() => import('../features/projects/ProjectLayout'), 'ProjectLayout'),
                children: [
                  { index: true, lazy: lazyPage(() => import('../features/projects/Overview'), 'Overview') },
                  { path: 'shortlist', lazy: lazyPage(() => import('../features/projects/Shortlist'), 'Shortlist') },
                  { path: 'specification', lazy: lazyPage(() => import('../features/projects/Specification'), 'Specification') },
                  { path: 'team', lazy: lazyPage(() => import('../features/projects/Team'), 'Team') },
                  { path: 'activity', lazy: lazyPage(() => import('../features/projects/Activity'), 'Activity') },
                  { path: 'matching', lazy: lazyPage(() => import('../features/projects/Matching'), 'Matching') },
                  { path: 'carbon', lazy: lazyPage(() => import('../features/carbon/ProjectCarbon'), 'ProjectCarbon') },
                  { path: 'approvals', lazy: lazyPage(() => import('../features/approvals/Approvals'), 'Approvals') },
                  { path: 'reservations', lazy: lazyPage(() => import('../features/reservations/Reservations'), 'Reservations') },
                  { path: 'compliance', lazy: lazyPage(() => import('../features/compliance/Compliance'), 'Compliance') },
                  { path: '*', element: <AppNotFound /> },
                ],
              },
              { path: 'buildings', lazy: lazyPage(() => import('../features/buildings/BuildingsList'), 'BuildingsList') },
              {
                path: 'buildings/:buildingId',
                lazy: lazyPage(() => import('../features/buildings/BuildingLayout'), 'BuildingLayout'),
                children: [
                  { index: true, lazy: lazyPage(() => import('../features/buildings/Overview'), 'Overview') },
                  { path: 'inventory', lazy: lazyPage(() => import('../features/buildings/Inventory'), 'Inventory') },
                  { path: 'inventory/:itemId', lazy: lazyPage(() => import('../features/buildings/ItemDetail'), 'ItemDetail') },
                  { path: 'capture', lazy: lazyPage(() => import('../features/buildings/Capture'), 'Capture') },
                  { path: 'priorities', lazy: lazyPage(() => import('../features/buildings/Priorities'), 'Priorities') },
                  { path: 'listings', lazy: lazyPage(() => import('../features/buildings/Listings'), 'Listings') },
                  { path: 'sharing', lazy: lazyPage(() => import('../features/buildings/Sharing'), 'Sharing') },
                  { path: '*', element: <AppNotFound /> },
                ],
              },
              { path: 'requests', lazy: lazyPage(() => import('../features/requests/Requests'), 'Requests') },
              { path: 'engagements', element: <Navigate to="/app/home" replace /> },
              { path: 'engagements/:engagementId', element: <EngagementIndex /> },
              { path: 'engagements/:engagementId/waste', lazy: lazyPage(() => import('../features/waste/Waste'), 'Waste') },
              { path: 'notifications', lazy: lazyPage(() => import('../features/notifications/Notifications'), 'Notifications') },
              { path: 'settings', element: <Navigate to="/app/settings/profile" replace /> },
              { path: 'settings/:section', lazy: lazyPage(() => import('../features/settings/Settings'), 'Settings') },
              { path: 'help', lazy: lazyPage(() => import('../features/help/Help'), 'Help') },
              { path: 'help/:topic', lazy: lazyPage(() => import('../features/help/Help'), 'Help') },
              { path: '*', element: <AppNotFound /> },
            ],
          },
        ],
      },
      // The design system on one page, in development only.
      ...(import.meta.env.DEV ? [{ path: '__ui', lazy: lazyPage(() => import('../ui/Gallery'), 'Gallery') }] : []),
      { path: '*', element: <NotFound /> },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
