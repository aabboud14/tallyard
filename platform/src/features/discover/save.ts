// Saving a material to a project or to Saved, with a toast that can undo it.
import { act } from '../../store'
import type { SaveTarget } from '../../store/selectors/discover'
import { toast } from '../../ui'

/** Saves to the target, or removes from it when it is there already. */
export function toggleSave(publicId: string, title: string, t: SaveTarget): void {
  if (!t.canToggle) {
    if (t.reason) toast.error(t.reason)
    return
  }
  if (t.saved && t.itemId) {
    const r = act.removeFromList(t.itemId)
    if (!r.ok) toast.error(r.error ?? 'That could not be removed.')
    else toast({ title: `Removed from ${t.label}`, description: title, action: { label: 'Undo', onClick: r.undo } })
    return
  }
  const r = act.saveToProject(publicId, t.projectId)
  if (!r.ok) toast.error(r.error ?? 'That could not be saved.')
  else toast.success(`Saved to ${t.label}`, { description: title, action: { label: 'Undo', onClick: r.undo } })
}
