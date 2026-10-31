import React from 'react';
import { TransferType } from '../types';
import { Plane, Train, Bell } from 'lucide-react';

interface Props {
  transfers?: TransferType[];
  isRequestStop?: boolean;
  size?: 'sm' | 'md' | 'lg';
  darkMode?: boolean;
}

/**
 * Prague Metro downward arrow entrance pictogram (as seen on the LCD screen)
 */
export const MetroArrowIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-label="Přestup na metro"
  >
    {/* Metro entrance symbol: stylized down arrow inside box/frame */}
    <rect x="2" y="2" width="20" height="20" rx="3" fill="#1e2225" />
    <path
      d="M12 5v11M12 16l-4-4M12 16l4-4"
      stroke="#ffffff"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 19h10"
      stroke="#ffffff"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
  </svg>
);

export const TramIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="5" y="4" width="14" height="13" rx="2" fill="currentColor" fillOpacity="0.2" />
    <line x1="8" y1="17" x2="8" y2="20" />
    <line x1="16" y1="17" x2="16" y2="20" />
    <line x1="5" y1="9" x2="19" y2="9" />
    <circle cx="8.5" cy="13.5" r="1.5" fill="currentColor" />
    <circle cx="15.5" cy="13.5" r="1.5" fill="currentColor" />
    <line x1="12" y1="4" x2="12" y2="1.5" />
    <line x1="9" y1="1.5" x2="15" y2="1.5" />
  </svg>
);

export const TransferBadges: React.FC<Props> = ({
  transfers = [],
  isRequestStop = false,
  size = 'md',
  darkMode = true,
}) => {
  if (!transfers.length && !isRequestStop) return null;

  const heightClass = size === 'lg' ? 'h-7 text-base' : size === 'sm' ? 'h-5 text-xs' : 'h-6 text-sm';
  const iconSize = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  // Group metro lines if any
  const metroLines = transfers.filter(t => t.startsWith('metro-'));
  const otherTransfers = transfers.filter(t => !t.startsWith('metro-'));

  return (
    <div className="inline-flex items-center gap-1.5 align-middle select-none ml-2">
      {/* Metro entrance icon if any metro transfer is present */}
      {metroLines.length > 0 && (
        <div className="flex items-center gap-1">
          <MetroArrowIcon className={iconSize} />
          {metroLines.map((metro) => {
            if (metro === 'metro-a') {
              return (
                <span
                  key={metro}
                  className={`${heightClass} px-2 font-black rounded flex items-center justify-center bg-[#00a651] text-white shadow-sm leading-none`}
                  title="Linka metra A"
                >
                  A
                </span>
              );
            }
            if (metro === 'metro-b') {
              return (
                <span
                  key={metro}
                  className={`${heightClass} px-2 font-black rounded flex items-center justify-center bg-[#fdb913] text-black shadow-sm leading-none`}
                  title="Linka metra B"
                >
                  B
                </span>
              );
            }
            if (metro === 'metro-c') {
              return (
                <span
                  key={metro}
                  className={`${heightClass} px-2 font-black rounded flex items-center justify-center bg-[#e30613] text-white shadow-sm leading-none`}
                  title="Linka metra C"
                >
                  C
                </span>
              );
            }
            if (metro === 'metro-d') {
              return (
                <span
                  key={metro}
                  className={`${heightClass} px-2 font-black rounded flex items-center justify-center bg-[#0078bf] text-white shadow-sm leading-none`}
                  title="Linka metra D"
                >
                  D
                </span>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Train transfer: Esko S */}
      {otherTransfers.includes('train') && (
        <span
          className={`${heightClass} px-2 font-bold rounded flex items-center justify-center bg-[#003882] text-white gap-1 shadow-sm leading-none`}
          title="Přestup na vlak (linky S)"
        >
          <Train className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
          <span className="font-black">S</span>
        </span>
      )}

      {/* Tram transfer */}
      {otherTransfers.includes('tram') && (
        <span
          className={`${heightClass} px-1.5 rounded flex items-center justify-center ${
            darkMode ? 'bg-zinc-800 text-zinc-100 border border-zinc-600' : 'bg-zinc-200 text-zinc-800'
          }`}
          title="Přestup na tramvaj"
        >
          <TramIcon className={iconSize} />
        </span>
      )}

      {/* Airport transfer */}
      {otherTransfers.includes('airport') && (
        <span
          className={`${heightClass} px-1.5 rounded flex items-center justify-center bg-sky-600 text-white`}
          title="Letiště / Přestup na leteckou dopravu"
        >
          <Plane className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
        </span>
      )}

      {/* Request stop icon "Na znamení" */}
      {isRequestStop && (
        <span
          className={`${heightClass} px-1.5 rounded flex items-center justify-center font-bold ${
            darkMode ? 'text-amber-400 bg-amber-950/60 border border-amber-500/40' : 'text-amber-700 bg-amber-100'
          }`}
          title="Zastávka na znamení"
        >
          <Bell className={`${size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} mr-1`} />
          <span className="text-xs font-semibold">x</span>
        </span>
      )}
    </div>
  );
};
