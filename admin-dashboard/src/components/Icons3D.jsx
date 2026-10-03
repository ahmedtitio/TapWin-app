// Real 3D-style SVG icons: glossy gradient faces, extruded depth layer and
// specular highlights. Pure vector art — no emoji anywhere.

const shapeDefs = (uid, c1, c2) => (
  <defs>
    <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stopColor={c1} />
      <stop offset="100%" stopColor={c2} />
    </linearGradient>
    <linearGradient id={`s-${uid}`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
      <stop offset="45%" stopColor="#ffffff" stopOpacity="0.1" />
      <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
    </linearGradient>
  </defs>
);

let counter = 0;

export function Icon3D({ size = 26, c1 = '#a78bfa', c2 = '#6d5dfc', children, style }) {
  const uid = `i${++counter}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style} aria-hidden="true">
      {shapeDefs(uid, c1, c2)}
      {/* extruded shadow layer for depth */}
      <g transform="translate(1, 1.7)" opacity="0.4" stroke="#050816" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {children}
      </g>
      {/* main gradient body */}
      <g stroke={`url(#g-${uid})`} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {children}
      </g>
      {/* top specular sheen */}
      <g stroke={`url(#s-${uid})`} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9" transform="translate(-0.4, -0.5)">
        {children}
      </g>
    </svg>
  );
}

const P = {
  dashboard: <><rect x="3" y="3" width="7.5" height="7.5" rx="2.2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2.2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2.2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.2" /></>,
  users: <><circle cx="9" cy="8" r="3.4" /><path d="M2.8 20c.7-3.4 3.3-5.2 6.2-5.2s5.5 1.8 6.2 5.2" /><circle cx="17.2" cy="9" r="2.4" /><path d="M16 14.9c2.6.2 4.4 1.9 5 4.6" /></>,
  activity: <><path d="M3 12h4l2.5-6 4 12L16 12h5" /></>,
  shield: <><path d="M12 3l7 2.8v5.4c0 4.4-3 7.6-7 9.3-4-1.7-7-4.9-7-9.3V5.8L12 3z" /><path d="M9 12l2 2 4-4.5" /></>,
  key: <><circle cx="8" cy="14" r="4.2" /><path d="M11.2 11L20 3M16.5 6.5l2.5 2.5M14 9l2 2" /></>,
  mail: <><rect x="2.5" y="5" width="19" height="14" rx="3" /><path d="M4 7.5l8 6 8-6" /></>,
  phone: <><path d="M6.5 3.5c.8 0 1.4.5 1.6 1.3l.8 3c.2.7 0 1.4-.6 1.9l-1.3 1.1a12.5 12.5 0 0 0 5.2 5.2l1.1-1.3c.5-.6 1.2-.8 1.9-.6l3 .8c.8.2 1.3.8 1.3 1.6v2.3c0 1.1-.9 2-2 2C10.7 21.5 2.5 13.3 2.5 5.5c0-1.1.9-2 2-2h2z" /></>,
  device: <><rect x="7" y="2.5" width="10" height="19" rx="2.6" /><path d="M10.5 18.5h3" /></>,
  logout: <><path d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15" /><path d="M10 8l-4 4 4 4" /><path d="M6 12h9" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  edit: <><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" /><path d="M14.5 6.5l3 3" /></>,
  trash: <><path d="M4 7h16" /><path d="M9 7V4.8c0-.5.4-.8.8-.8h4.4c.4 0 .8.3.8.8V7" /><path d="M6.5 7l.9 12.2c.05.5.45.8.9.8h7.4c.45 0 .85-.3.9-.8L17.5 7" /><path d="M10 11v5M14 11v5" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></>,
  power: <><path d="M12 3v8" /><path d="M6.6 6.6a8 8 0 1 0 10.8 0" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  user: <><circle cx="12" cy="8" r="3.8" /><path d="M4.8 20c1-3.6 3.9-5.5 7.2-5.5s6.2 1.9 7.2 5.5" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="2.4" /><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" /><path d="M12 14.5v2.2" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3.2" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 6c.5-.2 1-.3 1.4-.4 6 0 9.5 6.4 9.5 6.4a17.6 17.6 0 0 1-3.3 4.1M6.2 8.1A16.9 16.9 0 0 0 2.5 12S6 18.4 12 18.4c1.4 0 2.7-.3 3.8-.9" /><path d="M9.8 10.3a3.2 3.2 0 0 0 4.4 4.4" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 3.5V8h-4.5" /></>,
  check: <><path d="M4.5 12.5l5 5 10-11" /></>,
  x: <><path d="M6 6l12 12M18 6L6 18" /></>,
  bolt: <><path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12L13 2z" /></>,
  globe: <><circle cx="12" cy="12" r="8.6" /><path d="M3.6 12h16.8M12 3.4c2.4 2.3 3.6 5.1 3.6 8.6s-1.2 6.3-3.6 8.6c-2.4-2.3-3.6-5.1-3.6-8.6S9.6 5.7 12 3.4z" /></>,
  google: <><path d="M21.6 12.2c0-.7-.06-1.35-.18-2H12v3.8h5.4a4.62 4.62 0 0 1-2.02 3.03v2.52h3.27c1.9-1.75 3-4.34 3-7.35z" /><path d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.6-4.12H3.02v2.6A10 10 0 0 0 12 22z" /><path d="M6.4 13.9a6 6 0 0 1 0-3.82V7.48H3.02a10 10 0 0 0 0 9.02L6.4 13.9z" /><path d="M12 6.18c1.47 0 2.79.5 3.83 1.5l2.85-2.85A9.96 9.96 0 0 0 12 2 10 10 0 0 0 3.02 7.48l3.38 2.6c.8-2.36 3-3.9 5.6-3.9z" /></>,
};

/**
 * Usage: <Icon name="users" size={24} c1="#818cf8" c2="#6d5dfc" />
 */
export default function Icon({ name, ...rest }) {
  return <Icon3D {...rest}>{P[name]}</Icon3D>;
}
