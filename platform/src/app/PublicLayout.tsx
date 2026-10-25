// The frame for public pages (landing, sign in, sign up, password reset, invites): sets the tab title from the
// route and starts each page at the top.
import { useEffect } from 'react'
import { Outlet, useLocation, useMatches } from 'react-router'
import { PRODUCT_NAME } from '../domain/constants'

export type RouteHandle = { title?: string }

export function PublicLayout() {
  const matches = useMatches()
  const { pathname } = useLocation()
  const title = [...matches].reverse().map((m) => (m.handle as RouteHandle | undefined)?.title).find(Boolean)
  useEffect(() => {
    document.title = title ? `${title} · ${PRODUCT_NAME}` : `${PRODUCT_NAME}, the workspace for reclaimed materials`
  }, [title])
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return <Outlet />
}
