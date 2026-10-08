// The avatar menu: who is signed in, Profile, Settings, the sandbox account switcher and Sign out.
import { useNavigate } from 'react-router'
import { Check, LogOut, Settings, User, Users } from 'lucide-react'
import { switchAccount, useView } from '../store'
import { useSignOut } from './useSignOut'
import { sandboxView } from '../store/selectors/settings'
import type { NavModel } from '../store/selectors/nav'
import {
  Avatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  toast,
  type AvatarColourName,
} from '../ui'

export function AccountMenu({ nav }: { nav: NavModel }) {
  const navigate = useNavigate()
  const signOutNow = useSignOut()
  const sandbox = useView(sandboxView)
  const accounts = sandbox?.accounts.filter((a) => a.exists) ?? []
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="account-menu"
        aria-label={`Account menu, signed in as ${nav.user.name}`}
        className="inline-flex size-9 items-center justify-center rounded-full outline-none transition-shadow hover:shadow-[0_0_0_3px_var(--color-line-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 data-[state=open]:shadow-[0_0_0_3px_var(--color-line)] max-sm:size-11"
      >
        <Avatar name={nav.user.name} colour={nav.user.colour as AvatarColourName} size="md" decorative />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="flex items-center gap-3 px-2 pb-2.5 pt-2">
          <Avatar name={nav.user.name} colour={nav.user.colour as AvatarColourName} size="lg" decorative />
          <div className="min-w-0">
            <div className="truncate font-medium text-ink">{nav.user.name}</div>
            <div className="truncate text-sm text-muted">{nav.user.email}</div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem icon={User} onSelect={() => navigate('/app/settings/profile')}>
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem icon={Settings} onSelect={() => navigate('/app/settings/organisation')}>
          Settings
        </DropdownMenuItem>
        {accounts.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger icon={Users} data-testid="switch-account">
                Switch account
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-72">
                <DropdownMenuLabel>Sample accounts in this sandbox</DropdownMenuLabel>
                {accounts.map((a) => (
                  <DropdownMenuItem
                    key={a.userId}
                    data-testid={`switch-${a.email}`}
                    disabled={a.current}
                    onSelect={() => {
                      const r = switchAccount(a.userId)
                      if (r.error) {
                        toast.error(r.error)
                        return
                      }
                      navigate('/app/home')
                      toast.success(`Signed in as ${a.name}`, { description: `${a.roleLabel}, ${a.orgName}` })
                    }}
                    className="py-2"
                  >
                    <span className="flex w-full min-w-0 items-center gap-2.5">
                      <Avatar name={a.name} colour={a.colour as AvatarColourName} size="sm" decorative />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-ink">{a.name}</span>
                        <span className="truncate text-xs text-muted">
                          {a.roleLabel}, {a.orgName}
                        </span>
                      </span>
                      {a.current ? <Check aria-label="Current account" className="size-4 shrink-0 text-brand-600!" /> : null}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          icon={LogOut}
          data-testid="sign-out"
          onSelect={signOutNow}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
