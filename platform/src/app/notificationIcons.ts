// An icon for each kind of notification, shared by the bell and the inbox.
import type { LucideIcon } from 'lucide-react'
import { CalendarPlus, Camera, ClipboardCheck, Handshake, Inbox, PackagePlus, Send, Share2, SquareCheckBig, Users } from 'lucide-react'
import type { NotificationKind } from '../store/types'

export const NOTIFICATION_ICONS: Record<NotificationKind, LucideIcon> = {
  lots_shared: Share2,
  sent_to_client: Send,
  client_decision: SquareCheckBig,
  reservation_requested: Inbox,
  reservation_decided: Handshake,
  survey_submitted: ClipboardCheck,
  item_captured: Camera,
  new_fit: PackagePlus,
  appointed: CalendarPlus,
  team: Users,
}
