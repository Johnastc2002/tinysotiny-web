'use client';

import { useEffect } from 'react';

export default function NativeCursorHider() {
  useEffect(() => {
    // Always inject the style, but wrap it in a media query to target devices with fine pointers (mouse)
    // This avoids hiding the "cursor" on touch devices where it doesn't exist, 
    // but ensures it's hidden on laptops/desktops even if they have touch capabilities.
    
    const addCursorStyle = () => {
      const id = 'native-cursor-hider-style';
      if (!document.getElementById(id)) {
        const style = document.createElement('style');
        style.id = id;
        style.innerHTML = `
          @media (pointer: fine) {
            *, *::before, *::after {
              cursor: none !important;
            }
            /* Restore cursor for text inputs so user can see where they are typing */
            input, textarea, [contenteditable="true"] {
              cursor: text !important;
            }
          }
        `;
        document.head.appendChild(style);
      }
    };

    const removeCursorStyle = () => {
      const id = 'native-cursor-hider-style';
      const style = document.getElementById(id);
      if (style) style.remove();
    };

    addCursorStyle();

    return () => {
      removeCursorStyle();
    };
  }, []);

  return null;
}
