// /app/home: each workspace has its own home. The role's page loads on first visit.
import { lazy, Suspense, type ComponentType } from 'react'
import type { PlatformRole } from '../../store/types'
import { useSession } from '../../store'
import { pickComponent, type PageModule } from '../../app/pages'
import { Page } from '../../app/Page'
import { MetricGrid, Skeleton } from '../../ui'
import { UpgradeNotice } from './UpgradeNotice'

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

/** Four metric tiles and three card blocks, the shape every dashboard opens with. */
export function HomeSkeleton() {
  return (
    <Page testId="home-skeleton">
      <Skeleton shape="text" className="h-7 w-64" />
      <Skeleton shape="text" className="mt-3 w-40" />
      <MetricGrid className="mt-6">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </MetricGrid>
      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className={i === 0 ? 'h-[260px] rounded-lg' : 'h-[260px] rounded-lg max-md:hidden'} />
        ))}
      </div>
    </Page>
  )
}

export function Home() {
  const { role } = useSession()
  if (!role) return null
  const Role = HOMES[role]
  return (
    <>
      <UpgradeNotice />
      <Suspense fallback={<HomeSkeleton />}>
        <Role />
      </Suspense>
    </>
  )
}
