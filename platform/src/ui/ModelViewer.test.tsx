// @vitest-environment jsdom
// The 3D viewer's drag: a drag turns the model, and a gesture the browser takes over (a vertical swipe that scrolls
// the page on a phone, which ends in pointercancel) puts the model back where it was.
import { act } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { byTestId, cleanup, installDomShims, render } from './testing'
import { ModelViewer } from './ModelViewer'
import { SAMPLE_MATERIALS, sampleModel } from './samples'

beforeAll(() => installDomShims())
afterEach(() => cleanup())

function pointer(type: string, el: Element, x: number, y: number) {
  act(() => {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }))
  })
}

async function nextFrame() {
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(() => r(null)))
  })
}

describe('ModelViewer drag', () => {
  const mesh = sampleModel(SAMPLE_MATERIALS[0].spec)!

  it('turns with a drag and keeps the turn when the pointer is released', async () => {
    render(<ModelViewer mesh={mesh} family="steel_section" title="A" />)
    const v = byTestId('model-viewer')
    pointer('pointerdown', v, 100, 100)
    pointer('pointermove', v, 200, 100)
    pointer('pointerup', v, 200, 100)
    expect(byTestId('model-viewer').getAttribute('data-yaw')).toBe('5')
  })

  it('goes back to where it was when the browser cancels the gesture to scroll', async () => {
    render(<ModelViewer mesh={mesh} family="steel_section" title="A" />)
    const v = byTestId('model-viewer')
    pointer('pointerdown', v, 100, 100)
    pointer('pointermove', v, 104, 120)
    await nextFrame()
    expect(byTestId('model-viewer').getAttribute('data-pitch')).not.toBe('20')
    pointer('pointercancel', v, 104, 140)
    expect(byTestId('model-viewer').getAttribute('data-yaw')).toBe('-35')
    expect(byTestId('model-viewer').getAttribute('data-pitch')).toBe('20')
    // A later move without a press changes nothing.
    pointer('pointermove', v, 300, 300)
    await nextFrame()
    expect(byTestId('model-viewer').getAttribute('data-yaw')).toBe('-35')
  })
})
