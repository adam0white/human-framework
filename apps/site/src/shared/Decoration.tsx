/** Host decoration uses paths so text stays in its declared prose family. */
export function Decoration({ kind }: { kind: 'menu' | 'chevron' | 'diamond' }) {
  const path = {
    menu: 'M3 5h18M3 12h18M3 19h18',
    chevron: 'm9 5 7 7-7 7',
    diamond: 'm12 2 10 10-10 10L2 12Z',
  }[kind];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ display: 'inline-block', verticalAlign: '-0.125em' }}
    >
      <path d={path} />
    </svg>
  );
}
