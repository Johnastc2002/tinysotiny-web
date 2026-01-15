'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type CursorType = 'default' | 'label' | 'hidden';

interface CursorState {
  type: CursorType;
  text: string | null;
}

interface CursorContextType {
  cursorState: CursorState;
  setCursor: (type: CursorType, text?: string | null) => void;
  resetCursor: () => void;
}

const CursorContext = createContext<CursorContextType | undefined>(undefined);

export function CursorProvider({ children }: { children: React.ReactNode }) {
  const [cursorState, setCursorState] = useState<CursorState>({
    type: 'default',
    text: null,
  });

  const setCursor = useCallback((type: CursorType, text: string | null = null) => {
    setCursorState({ type, text });
  }, []);

  const resetCursor = useCallback(() => {
    setCursorState({ type: 'default', text: null });
  }, []);

  return (
    <CursorContext.Provider value={{ cursorState, setCursor, resetCursor }}>
      {children}
    </CursorContext.Provider>
  );
}

export function useCursor() {
  const context = useContext(CursorContext);
  if (context === undefined) {
    throw new Error('useCursor must be used within a CursorProvider');
  }
  return context;
}

