import { useNavigate } from 'react-router'
import { useStore } from '../../store/store'
import { useBrowseUi } from '../../store/browseUi'
import { topControl } from './styles'

export function ResetButton() {
  const reset = useStore((s) => s.reset)
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className={topControl}
      data-testid="reset-demo"
      onClick={async () => {
        await reset()
        useBrowseUi.getState().reset()
        navigate('/')
      }}
    >
      Reset demo data
    </button>
  )
}
