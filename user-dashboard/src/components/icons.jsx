import React from 'react';

/**
 * Real 3D-style SVG icons (gradient + inner highlight + drop shadow) — no emoji.
 */
const Svg = ({ children, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {children}
  </svg>
);

export const IconLock = ({ size }) => (
  <Svg size={size}>
    <defs>
      <linearGradient id="l1" x1="4" y1="3" x2="20" y2="21"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#6d28d9"/></linearGradient>
    </defs>
    <rect x="4.5" y="10" width="15" height="11" rx="3.2" fill="url(#l1)" stroke="#ddd6fe" strokeWidth="1"/>
    <path d="M8 10V7.5a4 4 0 1 1 8 0V10" stroke="#c4b5fd" strokeWidth="2.2" strokeLinecap="round"/>
    <circle cx="12" cy="15" r="1.8" fill="#fff" opacity=".92"/>
    <rect x="11.2" y="15.6" width="1.6" height="3" rx=".8" fill="#fff" opacity=".92"/>
    <rect x="6" y="11.4" width="12" height="2.4" rx="1.2" fill="#fff" opacity=".18"/>
  </Svg>
);

export const IconUser = ({ size }) => (
  <Svg size={size}>
    <defs>
      <linearGradient id="u1" x1="4" y1="3" x2="20" y2="21"><stop stopColor="#67e8f9"/><stop offset="1" stopColor="#0891b2"/></linearGradient>
    </defs>
    <circle cx="12" cy="8" r="4.2" fill="url(#u1)" stroke="#cffafe" strokeWidth="1"/>
    <path d="M4.5 20c1-4 4-6 7.5-6s6.5 2 7.5 6" fill="url(#u1)" stroke="#cffafe" strokeWidth="1"/>
    <circle cx="10.6" cy="6.6" r="1.4" fill="#fff" opacity=".35"/>
  </Svg>
);

export const IconMail = ({ size }) => (
  <Svg size={size}>
    <defs>
      <linearGradient id="m1" x1="3" y1="5" x2="21" y2="19"><stop stopColor="#fca5a5"/><stop offset="1" stopColor="#dc2626"/></linearGradient>
    </defs>
    <rect x="3" y="5" width="18" height="14" rx="3" fill="url(#m1)" stroke="#fecaca" strokeWidth="1"/>
    <path d="M4.5 7.5 12 13l7.5-5.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity=".9"/>
    <rect x="4.5" y="6.2" width="15" height="2" rx="1" fill="#fff" opacity=".18"/>
  </Svg>
);

export const IconShield = ({ size }) => (
  <Svg size={size}>
    <defs>
      <linearGradient id="s1" x1="4" y1="2" x2="20" y2="21"><stop stopColor="#86efac"/><stop offset="1" stopColor="#16a34a"/></linearGradient>
    </defs>
    <path d="M12 2.5 20 6v6c0 4.6-3.4 8-8 9.5C7.4 20 4 16.6 4 12V6l8-3.5Z" fill="url(#s1)" stroke="#dcfce7" strokeWidth="1"/>
    <path d="m8.6 12 2.3 2.4 4.5-4.8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 7.2 12 4.6v14.9c-3.4-1.6-6-4.4-6-8.2V7.2Z" fill="#fff" opacity=".14"/>
  </Svg>
);

export const IconHome = ({ size }) => (
  <Svg size={size}>
    <defs>
      <linearGradient id="h1" x1="3" y1="4" x2="21" y2="20"><stop stopColor="#fcd34d"/><stop offset="1" stopColor="#ea580c"/></linearGradient>
    </defs>
    <path d="M12 3.2 21 11h-2.6v8.4H5.6V11H3l9-7.8Z" fill="url(#h1)" stroke="#fef3c7" strokeWidth="1" strokeLinejoin="round"/>
    <rect x="9.6" y="13.4" width="4.8" height="6" rx="1.4" fill="#7c2d12" opacity=".85"/>
    <path d="M12 3.2 21 11h-2.6v8.4" stroke="#fff" strokeWidth="1" opacity=".2"/>
  </Svg>
);

export const IconDevices = ({ size }) => (
  <Svg size={size}>
    <defs>
      <linearGradient id="d1" x1="3" y1="4" x2="21" y2="20"><stop stopColor="#93c5fd"/><stop offset="1" stopColor="#2563eb"/></linearGradient>
    </defs>
    <rect x="2.6" y="5" width="13" height="9.4" rx="2" fill="url(#d1)" stroke="#dbeafe" strokeWidth="1"/>
    <rect x="4" y="6.4" width="10.2" height="6" rx="1" fill="#0f1e46" opacity=".65"/>
    <rect x="15.4" y="10" width="6" height="9.4" rx="2" fill="url(#d1)" stroke="#dbeafe" strokeWidth="1"/>
    <rect x="16.6" y="11.4" width="3.6" height="6" rx="1" fill="#0f1e46" opacity=".65"/>
  </Svg>
);

export const IconKey = ({ size }) => (
  <Svg size={size}>
    <defs>
      <linearGradient id="k1" x1="3" y1="6" x2="20" y2="18"><stop stopColor="#fde68a"/><stop offset="1" stopColor="#d97706"/></linearGradient>
    </defs>
    <circle cx="8" cy="8.5" r="4.6" fill="url(#k1)" stroke="#fef9c3" strokeWidth="1"/>
    <circle cx="8" cy="8.5" r="1.7" fill="#78350f" opacity=".8"/>
    <path d="m11.6 12 7.8 7.8M16.4 15.2l-1.8 1.8M18.6 17.4l-1.8 1.8" stroke="url(#k1)" strokeWidth="2.4" strokeLinecap="round"/>
  </Svg>
);

export const IconLogout = ({ size }) => (
  <Svg size={size}>
    <defs>
      <linearGradient id="o1" x1="4" y1="4" x2="20" y2="20"><stop stopColor="#fda4af"/><stop offset="1" stopColor="#e11d48"/></linearGradient>
    </defs>
    <path d="M13 4.5H6.5A2.5 2.5 0 0 0 4 7v10a2.5 2.5 0 0 0 2.5 2.5H13" stroke="url(#o1)" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
    <path d="M15.5 8.5 19 12l-3.5 3.5M19 12H9.5" stroke="url(#o1)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </Svg>
);

export const IconBolt = ({ size }) => (
  <Svg size={size}>
    <defs>
      <linearGradient id="b1" x1="7" y1="2" x2="17" y2="22"><stop stopColor="#a5b4fc"/><stop offset="1" stopColor="#4f46e5"/></linearGradient>
    </defs>
    <path d="M13.2 2 4.8 13h5L9.4 22l9-11.6h-5.4L13.2 2Z" fill="url(#b1)" stroke="#e0e7ff" strokeWidth="1" strokeLinejoin="round"/>
    <path d="M13.2 2 4.8 13h5" fill="#fff" opacity=".18"/>
  </Svg>
);

export const IconActivity = ({ size }) => (
  <Svg size={size}>
    <defs>
      <linearGradient id="a1" x1="2" y1="12" x2="22" y2="12"><stop stopColor="#5eead4"/><stop offset="1" stopColor="#0d9488"/></linearGradient>
    </defs>
    <path d="M2.5 12h4l2.5-6 4 12 2.5-6h6" stroke="url(#a1)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </Svg>
);

export const IconEye = ({ size }) => (
  <Svg size={size}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.4"/>
    <circle cx="12" cy="12" r="3.2" fill="#6d5dfc" stroke="#c4b5fd" strokeWidth="1"/>
    <circle cx="11" cy="11" r="1" fill="#fff" opacity=".8"/>
  </Svg>
);

export const IconEyeOff = ({ size }) => (
  <Svg size={size}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.4"/>
    <circle cx="12" cy="12" r="3.2" fill="#6d5dfc" stroke="#c4b5fd" strokeWidth="1"/>
    <path d="M4 20 20 4" stroke="#f87171" strokeWidth="2.4" strokeLinecap="round"/>
  </Svg>
);

export const IconGoogle = ({ size = 20 }) => (
  <Svg size={size}>
    <path fill="#4285F4" d="M23 12.2c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6Z"/>
    <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.4 1.1-3.9 1.1-3 0-5.6-2-6.5-4.7H1.7v3A12 12 0 0 0 12 24Z"/>
    <path fill="#FBBC05" d="M5.5 14.7a7.2 7.2 0 0 1 0-4.6v-3H1.7a12 12 0 0 0 0 10.7l3.8-3Z"/>
    <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.7l3.4-3.4A12 12 0 0 0 1.7 7.1l3.8 3C6.4 7.3 9 4.8 12 4.8Z"/>
  </Svg>
);
