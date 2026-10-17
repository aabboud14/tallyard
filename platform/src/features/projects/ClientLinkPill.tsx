// The client's answer to a project link, one pill for every surface that shows it (the architect home cards, the
// projects list and the project header), so it reads the same everywhere: 'Client to accept' in the neutral tone with
// the invitation icon while the client has not answered, 'Client declined' in the warning tone after a decline.
import { MailQuestion, UserRoundX } from 'lucide-react'
import { Pill } from '../../ui'

export type ClientLinkPillStatus = 'pending' | 'declined' | 'accepted' | null | undefined

export const CLIENT_TO_ACCEPT_TITLE = 'The client organisation has not yet accepted the request to add them to this project'

export function ClientLinkPill({ status, testId, className }: { status: ClientLinkPillStatus; testId: string; className?: string }) {
  if (status === 'pending') {
    return (
      <Pill tone="neutral" size="sm" icon={MailQuestion} title={CLIENT_TO_ACCEPT_TITLE} className={className} data-testid={testId}>
        Client to accept
      </Pill>
    )
  }
  if (status === 'declined') {
    return (
      <Pill tone="warning" size="sm" icon={UserRoundX} className={className} data-testid={testId}>
        Client declined
      </Pill>
    )
  }
  return null
}
