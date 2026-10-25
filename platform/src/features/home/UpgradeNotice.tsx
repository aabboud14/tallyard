// The one-time notice on every home for a visitor whose browser held a sandbox from before the 16 October update:
// replaced by the sample data here, or carried over from the round 2 build deployed before. Help lists what
// changed. Closing it is remembered in this browser. A person whose account was made after the update is not shown
// it: nothing of theirs was replaced.
import { useState } from 'react'
import { Link } from 'react-router'
import { History, X } from 'lucide-react'
import { IconButton } from '../../ui'
import { useSession } from '../../store'
import { currentUpgradeNotice, dismissUpgradeNotice, UPGRADE_HELP_PATH, UPGRADE_TITLE, upgradeNoticeText } from '../../store/upgrade'

export function UpgradeNotice() {
  const { user } = useSession()
  const [closed, setClosed] = useState(false)
  const kind = closed ? null : currentUpgradeNotice(user)
  if (!kind) return null
  const close = () => {
    dismissUpgradeNotice()
    setClosed(true)
  }
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <section aria-label="Sandbox updated" className="relative flex items-start gap-3 rounded-lg border border-info-line bg-info-soft py-3 pl-3.5 pr-12 text-base max-sm:pr-14" data-testid="upgrade-notice" data-kind={kind}>
        <History aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
        <div className="min-w-0 flex-1">
          <p className="m-0 font-medium text-ink">{UPGRADE_TITLE}</p>
          <p className="m-0 mt-0.5 text-ink-soft">{upgradeNoticeText(kind)}</p>
          <Link to={UPGRADE_HELP_PATH} className="mt-1.5 inline-flex rounded-sm text-sm font-medium text-brand-700 underline-offset-4 hover:underline max-sm:-mx-2 max-sm:min-h-11 max-sm:items-center max-sm:px-2" data-testid="upgrade-notice-link">
            See what changed
          </Link>
        </div>
        {/* Placed by a wrapper: the button's own classes make it relative, which would override absolute. */}
        <div className="absolute right-1.5 top-1.5">
          <IconButton icon={X} label="Close this notice" size="sm" tooltip={false} onClick={close} data-testid="upgrade-notice-close" />
        </div>
      </section>
    </div>
  )
}
