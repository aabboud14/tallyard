// Landing card copy: one line per role on what that role does here (brief/09-V1-PRODUCT.md section 3.6).
// Rails and homes come from the world in nav.ts, never from a table here.
import type { Role } from '../domain/access'

export const ROLE_COPY: Record<Role, string> = {
  surveyor: 'Captures materials, condition, recoverability and expected availability, per client and building.',
  seller: 'Decides what to recover, sets visibility and availability, shares privately with selected projects and approves offers.',
  architect: 'Browses reclaimed materials, saves them to project wish lists, checks timing, exports spec sheets and geometry.',
  client: "Approves or declines the architect's wish list, then runs the reuse plan, deals and delivery.",
  consultant: 'Reads the wish list for its carbon and runs the compliance and waste outputs.',
  operator: 'Reads the revenue ledger and the business model comparison.',
}
