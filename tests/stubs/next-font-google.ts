// Stand-in for next/font/google so modules that load a font at module scope
// (e.g. src/constants/constant.ts, src/app/layout.tsx) can be imported by the
// vitest test runner — the real package only works through Next.js's own
// compiler transform, which isn't present outside a Next.js build.
// See vitest.config.ts resolve.alias.
const stubFont = () => ({ className: "", variable: "", style: {} });

export const Geist = stubFont;
export const Geist_Mono = stubFont;
export const Montserrat = stubFont;
export const Playpen_Sans = stubFont;
