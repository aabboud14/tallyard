// The building's Capture tab: the shared capture form for this building, with no picker.
import { useParams } from 'react-router'
import { CaptureWorkspace } from '../capture/CaptureWorkspace'

export function Capture() {
  const { buildingId = '' } = useParams()
  return <CaptureWorkspace key={buildingId} buildingId={buildingId} />
}

export default Capture
