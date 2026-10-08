// Calm pages for a route the person may not open, or one that does not exist, inside the app shell. Neither
// says anything about the record behind the address.
import { Link } from 'react-router'
import { Compass, House, LockKeyhole } from 'lucide-react'
import { Button, EmptyState } from '../ui'
import { Page } from './Page'

export function NoAccess() {
  return (
    <Page width="narrow" testId="no-access">
      <EmptyState
        variant="page"
        icon={LockKeyhole}
        title="You do not have access to this"
        text="This page belongs to another workspace or organisation. If you expected to see it, ask the person who sent you the link to add you."
        action={
          <Button asChild variant="primary" icon={House}>
            <Link to="/app/home">Go to home</Link>
          </Button>
        }
      />
    </Page>
  )
}

export function AppNotFound() {
  return (
    <Page width="narrow" testId="app-not-found">
      <EmptyState
        variant="page"
        icon={Compass}
        title="Page not found"
        text="The page you were looking for does not exist or has moved. Use search or the sidebar to find it."
        action={
          <Button asChild variant="primary" icon={House}>
            <Link to="/app/home">Go to home</Link>
          </Button>
        }
      />
    </Page>
  )
}
