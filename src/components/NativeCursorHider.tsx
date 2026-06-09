'use client';

import { useEffect } from 'react';

export default function NativeCursorHider() {
  useEffect(() => {
    const id = 'native-cursor-hider-style';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = 'html,body,*,*::before,*::after{cursor:none!important}';
      document.head.appendChild(style);
    }
    document.documentElement.style.setProperty('cursor', 'none', 'important');
    document.body.style.setProperty('cursor', 'none', 'important');
  }, []);

  return null;
}
