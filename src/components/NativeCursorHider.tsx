'use client';

import { useEffect } from 'react';

const STYLE_ID = 'native-cursor-hider-style';
const HIDDEN = 'none';

export default function NativeCursorHider() {
  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `html,body,*,*::before,*::after{cursor:${HIDDEN}!important}`;
      document.head.appendChild(style);
    }

    const forceHide = (el: HTMLElement) => {
      if (el.style.cursor && el.style.cursor !== HIDDEN) {
        el.style.setProperty('cursor', HIDDEN, 'important');
      }
    };

    forceHide(document.documentElement);
    forceHide(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (
          m.type === 'attributes' &&
          m.attributeName === 'style' &&
          m.target instanceof HTMLElement
        ) {
          const cur = m.target.style.cursor;
          if (cur && cur !== HIDDEN) {
            m.target.style.setProperty('cursor', HIDDEN, 'important');
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style'],
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
