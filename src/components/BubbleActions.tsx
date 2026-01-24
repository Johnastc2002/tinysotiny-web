import React from 'react';

interface InteractionCursorProps {
  text?: string | null;
  className?: string;
}

export const InteractionCursor = ({
  text,
  className = '',
}: InteractionCursorProps) => {
  return (
    <div className={`flex items-center gap-2 pointer-events-none ${className}`}>
      {/* Arrow Button */}
      <div className="flex items-center justify-center w-[28px] h-[28px] rounded-full bg-[#3B3B3B]/80 backdrop-blur-sm border border-white/20 text-white">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="translate-x-[0px] translate-y-[0px]"
        >
          <path d="M5 12h14" />
          <path d="M12 5l7 7" />
        </svg>
      </div>

      {/* Text Pill - Only render if text exists */}
      {text && (
        <div
          className="flex items-center justify-center h-[28px] px-4 rounded-full bg-[#3B3B3B]/80 backdrop-blur-sm border border-white/20 text-white whitespace-nowrap"
          style={{
            fontFamily: 'Value Sans',
            fontWeight: 500,
            fontSize: '11px',
          }}
        >
          <span className="pt-[1px]">{text}</span>
        </div>
      )}
    </div>
  );
};
