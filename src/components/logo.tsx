import type { SVGProps } from 'react'

/**
 * The PlanPilot mark, reduced to what survives at small sizes: the six
 * segments, the needle and the hub. The tick ring and graduations that the
 * full mark carries turn to mud below about 64px.
 *
 * Generated from brand/planpilot-icon.svg by brand/generate.mjs — edit the
 * geometry there, not here, or the favicon and the rail will drift apart.
 *
 * The six segments subtend the default budget allocation and the needle sits
 * at the readiness of the reference scenario. See brand/README.md.
 */
export function LogoMark({ title, ...props }: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="62 148 388 222"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d="M 94 342 A 162 162 0 0 1 418 342" stroke="#EAE3D8" stroke-width="52" fill="none" stroke-linecap="butt"/>
      <path d="M 94.008 340.374 A 162 162 0 0 1 140.305 228.604" stroke="#141C2E" stroke-width="52" fill="none" stroke-linecap="butt"/>
      <path d="M 142.604 226.305 A 162 162 0 0 1 304.512 187.434" stroke="#141C2E" stroke-width="52" fill="none" stroke-linecap="butt"/>
      <path d="M 307.604 188.439 A 162 162 0 0 1 369.396 226.305" stroke="#141C2E" stroke-width="52" fill="none" stroke-linecap="butt"/>
      <path d="M 371.695 228.604 A 162 162 0 0 1 394.606 258.14" stroke="#141C2E" stroke-width="52" fill="none" stroke-linecap="butt"/>
      <path d="M 396.261 260.939 A 162 162 0 0 1 409.561 290.396" stroke="#141C2E" stroke-width="52" fill="none" stroke-linecap="butt"/>
      <path d="M 410.566 293.488 A 162 162 0 0 1 417.992 340.374" stroke="#141C2E" stroke-width="52" fill="none" stroke-linecap="butt"/>
      <path d="M 144.96 342 A 111.04 111.04 0 0 1 367.04 342" stroke="#D9D0C2" stroke-width="1.008" fill="none"/>
      <path d="M 274.071 320.156 L 322.802 261.25" stroke="#B8372B" stroke-width="2.415"/>
      <circle cx="256" cy="342" r="6.3" fill="#B8372B"/>
      <circle cx="256" cy="342" r="19.32" fill="none" stroke="#B8372B" stroke-width="1.113"/>
    </svg>
  )
}
