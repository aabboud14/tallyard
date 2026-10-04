import { useNavigate } from 'react-router'
import { useStore } from '../../store/store'
import { Button } from '../ui'

export function ResetButton() {
  const reset = useStore((s) => s.reset)
  const navigate = useNavigate()
  return (
    <Button
      variant="quiet"
      className="text-sm"
      data-testid="reset-demo"
      onClick={async () => {
        await reset()
        navigate('/')
      }}
    >
      Reset demo data
    </Button>
  )
}
