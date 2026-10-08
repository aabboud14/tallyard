// /app/home: each workspace has its own home. The role's page loads on first visit.
import { lazy, Suspense, type ComponentType } from 'react'
import type { PlatformRole } from '../../store/types'
import { useSession } from '../../store'
import { pickComponent, type PageModule } from '../../app/pages'
import { Page } from '../../app/Page'
import { Skeleton } from '../../ui'

function home(load: () => Promise<PageModule>, name: string) {
  return lazy(async () => ({ default: pickComponent(await load(), name) }))
}

const HOMES: Record<PlatformRole, ComponentType> = {
  architect: home(() => import('./ArchitectHome'), 'ArchitectHome'),
  client: home(() => import('./ClientHome'), 'ClientHome'),
  owner: home(() => import('./OwnerHome'), 'OwnerHome'),
  surveyor: home(() => import('./SurveyorHome'), 'SurveyorHome'),
  consultant: home(() => import('./ConsultantHome'), 'ConsultantHome'),
}

function HomeSkeleton() {
  return (
    <Page>
      <Skeleton shape="text" className="h-7 w-64" />
      <Skeleton shape="text" className="mt-3 w-40" />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="mt-8 h-64 rounded-lg" />
    </Page>
  )
}

export function Home() {
  const { role } = useSession()
  if (!role) return null
  const Role = HOMES[role]
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Role />
    </Suspense>
  )
}
