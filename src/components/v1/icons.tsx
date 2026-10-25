// Interface icons as inline SVG, drawn on a 20 unit grid in the current text colour. No text glyphs.
import type { ReactNode, SVGProps } from 'react'

export { Lock } from '../ui'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number }

function Svg({ size = 20, className, ...rest }: IconProps & { children: ReactNode }) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className} {...rest} />
}

export function Bookmark({ filled = false, ...rest }: IconProps & { filled?: boolean }) {
  return (
    <Svg data-filled={filled ? 'true' : 'false'} {...rest}>
      <path d="M5.5 3h9a.5.5 0 0 1 .5.5V17l-5-3.4L5 17V3.5a.5.5 0 0 1 .5-.5Z" fill={filled ? 'currentColor' : 'none'} />
    </Svg>
  )
}

export function Download(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 3v9.5" />
      <path d="M6 9l4 4 4-4" />
      <path d="M4 16.5h12" />
    </Svg>
  )
}

export function Folder(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.75 5.5a1 1 0 0 1 1-1h3.6l1.7 1.75h7.2a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3.75a1 1 0 0 1-1-1Z" />
    </Svg>
  )
}

export function FolderOpen(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2.75 14.5V5.5a1 1 0 0 1 1-1h3.6l1.7 1.75h6.2a1 1 0 0 1 1 1V8.5" />
      <path d="M2.75 15.25 5 9.25a1 1 0 0 1 .94-.65h11.3a.6.6 0 0 1 .56.8l-2.1 5.4a1 1 0 0 1-.93.65H3.4a.6.6 0 0 1-.65-.2Z" />
    </Svg>
  )
}

export function Plus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 4v12M4 10h12" />
    </Svg>
  )
}

export function Filter(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 5.5h14M5.5 10h9M8 14.5h4" />
    </Svg>
  )
}

export function Close(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 5l10 10M15 5 5 15" />
    </Svg>
  )
}

export function Menu(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 5.5h14M3 10h14M3 14.5h14" />
    </Svg>
  )
}
