import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import {
  BULKSKART_LOGO_DARK,
  BULKSKART_LOGO_HEIGHT,
  BULKSKART_LOGO_LIGHT,
  BULKSKART_LOGO_URL,
  BULKSKART_LOGO_WIDTH,
} from '@/constants/branding';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'responsive';
  variant?: 'auto' | 'dark' | 'light' | 'original';
  className?: string;
  linkTo?: string | null;
  priority?: boolean;
}

export default function BrandLogo({
  size = 'responsive',
  variant = 'auto',
  className = '',
  linkTo = '/',
}: BrandLogoProps) {
  const { theme } = useTheme();
  const [imgError, setImgError] = useState(false);

  // Determine active logo source based on current theme and requested variant
  const logoSrc = (() => {
    if (variant === 'original') return BULKSKART_LOGO_URL;
    if (variant === 'dark') return BULKSKART_LOGO_DARK;
    if (variant === 'light') return BULKSKART_LOGO_LIGHT;
    // 'auto' - adapts to dark or light theme seamlessly
    return theme === 'light' ? BULKSKART_LOGO_LIGHT : BULKSKART_LOGO_DARK;
  })();

  const sizeClasses = {
    sm: 'h-6 sm:h-7 max-w-[125px] sm:max-w-[145px]',
    md: 'h-7 sm:h-8 max-w-[140px] sm:max-w-[170px]',
    lg: 'h-8 sm:h-10 max-w-[165px] sm:max-w-[210px]',
    responsive: 'h-7 sm:h-8 w-auto max-w-[115px] min-[360px]:max-w-[130px] sm:max-w-[165px]',
  }[size];

  const content = imgError ? (
    <div className={`flex items-center gap-1.5 shrink-0 ${className}`}>
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#FF5A00] flex items-center justify-center text-white font-black text-sm sm:text-base shadow-sm">
        B
      </div>
      <div className="flex flex-col leading-none">
        <div className="text-[15px] sm:text-[17px] font-black tracking-tight leading-none">
          <span className="text-foreground">Bulks</span>
          <span className="text-[#FF5A00]">kart</span>
        </div>
        <span className="text-[8px] sm:text-[9px] font-semibold text-muted-foreground tracking-widest uppercase">
          B2B Marketplace
        </span>
      </div>
    </div>
  ) : (
    <img
      src={logoSrc}
      alt="BulkSkart - Global B2B Marketplace"
      width={BULKSKART_LOGO_WIDTH}
      height={BULKSKART_LOGO_HEIGHT}
      onError={() => setImgError(true)}
      className={`w-auto object-contain shrink-0 transition-opacity duration-150 ${sizeClasses} ${className}`}
      loading="eager"
      decoding="async"
    />
  );

  if (linkTo) {
    return (
      <Link
        to={linkTo}
        className="inline-flex items-center shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded py-0.5"
        aria-label="BulkSkart Homepage"
      >
        {content}
      </Link>
    );
  }

  return <span className="inline-flex items-center shrink-0">{content}</span>;
}
