// Discover's state lives in the address bar, so Back, reload and shared links restore it. The project the cards
// are checked against is remembered per person and can be set from a link (?project=).
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { useApp, useView } from '../../store'
import { useSessionId } from '../../store/sessionId'
import { checkingProjectFor, discoverParamsFor, discoverQueryFromParams, DISCOVER_PARAM } from '../../store/selectors/arch-discover'
import type { DiscoverQuery } from '../../store/selectors/discover'

/** The project being checked against, and a setter that remembers the choice. */
export function useCheckingProject(): [string | null, (projectId: string | null) => void] {
  const [params, setParams] = useSearchParams()
  const fromAddress = params.get(DISCOVER_PARAM.projectId)
  const projectId = useView(checkingProjectFor, fromAddress) ?? null
  const userId = useSessionId((s) => s.userId)
  const stored = useApp((s) => (userId ? s.ui.checkingProjectId[userId] : undefined))
  const setChecking = useApp((s) => s.setCheckingProject)

  // A link that names a project makes it the person's choice from then on. This syncs once per address, so a
  // change or clear made here is not undone in the moment before the address catches up.
  const synced = useRef<string | null>(null)
  useEffect(() => {
    if (!fromAddress) {
      synced.current = null
      return
    }
    if (projectId !== fromAddress || synced.current === fromAddress) return
    synced.current = fromAddress
    if (stored !== fromAddress) setChecking(fromAddress)
  }, [fromAddress, projectId, stored, setChecking])

  const set = useCallback(
    (id: string | null) => {
      setChecking(id)
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (id && next.has(DISCOVER_PARAM.projectId)) next.set(DISCOVER_PARAM.projectId, id)
          else next.delete(DISCOVER_PARAM.projectId)
          return next
        },
        { replace: true },
      )
    },
    [setChecking, setParams],
  )
  return [projectId, set]
}

/** `push` adds a history entry (opening a category folder), so Back returns to where the person was. */
export type QueryWrite = { push?: boolean }

export function useDiscoverQuery(): { query: DiscoverQuery; update: (patch: Partial<DiscoverQuery>, opts?: QueryWrite) => void; replace: (q: DiscoverQuery, opts?: QueryWrite) => void; setProject: (id: string | null) => void } {
  const [params, setParams] = useSearchParams()
  const [projectId, setProject] = useCheckingProject()
  const query = useMemo(() => discoverQueryFromParams(params, projectId), [params, projectId])
  const keepProject = params.has(DISCOVER_PARAM.projectId)
  const replace = useCallback(
    (q: DiscoverQuery, opts: QueryWrite = {}) => {
      const next = discoverParamsFor(q)
      if (!keepProject) delete next[DISCOVER_PARAM.projectId]
      setParams(next, { replace: !opts.push })
    },
    [keepProject, setParams],
  )
  const update = useCallback((patch: Partial<DiscoverQuery>, opts?: QueryWrite) => replace({ ...query, ...patch }, opts), [query, replace])
  return { query, update, replace, setProject }
}
