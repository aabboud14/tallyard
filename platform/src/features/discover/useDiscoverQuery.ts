// Discover's state lives in the address bar, so Back, reload and shared links restore it. The project the cards
// are checked against is the one a link names (?project=), for that visit only, else the one the person chose in
// the checking strip, else none. Following a link never changes what the Marketplace opens on next time.
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useApp, useView } from '../../store'
import { checkingProjectFor, discoverParamsFor, discoverQueryFromParams, DISCOVER_PARAM } from '../../store/selectors/arch-discover'
import type { DiscoverQuery } from '../../store/selectors/discover'

/**
 * The project being checked against, and a setter for an explicit choice (Choose a project, Change project, Stop
 * checking), which is remembered. A project in the address applies to this visit only and is never stored, so the
 * Marketplace opened from the sidebar stays on No project until the person chooses one.
 */
export function useCheckingProject(): [string | null, (projectId: string | null) => void] {
  const [params, setParams] = useSearchParams()
  const fromAddress = params.get(DISCOVER_PARAM.projectId)
  const projectId = useView(checkingProjectFor, fromAddress) ?? null
  const setChecking = useApp((s) => s.setCheckingProject)

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
