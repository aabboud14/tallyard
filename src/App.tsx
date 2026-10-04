import { createHashRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { SpikeHome, SpikeSecond } from './spike/Spike'

const router = createHashRouter([
  { path: '/', element: <SpikeHome /> },
  { path: '/second', element: <SpikeSecond /> },
])

export function App() {
  return <RouterProvider router={router} />
}
