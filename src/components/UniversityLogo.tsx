import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';

interface UniversityLogoProps {
  logoUrl?: string;
  name: string;
  code?: string;
  className?: string;
  containerClassName?: string;
  iconClassName?: string;
  alt?: string;
}

const KNOWN_LOGOS: Record<string, string> = {
  mpublp: '/assets/logos/mpublp.jpg',
  mpu: '/assets/logos/mpublp.jpg',
  rmlau: '/assets/logos/rmlau.png',
  lu: '/assets/logos/lu.jpg',
  au: '/assets/logos/au.jpg',
};

function getKnownLogo(code?: string, name?: string): string | null {
  const cleanCode = (code || '').trim().toLowerCase();
  const cleanName = (name || '').trim().toLowerCase();

  if (cleanCode && KNOWN_LOGOS[cleanCode]) return KNOWN_LOGOS[cleanCode];
  if (cleanName.includes('pateshwari')) return '/assets/logos/mpublp.jpg';
  if (cleanName.includes('lohia') || cleanName.includes('rmlau')) return '/assets/logos/rmlau.png';
  if (cleanName.includes('lucknow')) return '/assets/logos/lu.jpg';
  if (cleanName.includes('allahabad')) return '/assets/logos/au.jpg';

  return null;
}

export const UniversityLogo: React.FC<UniversityLogoProps> = ({
  logoUrl,
  name,
  code,
  className = 'w-full h-full object-contain',
  containerClassName = 'w-full h-full flex items-center justify-center',
  iconClassName = 'w-7 h-7 text-blue-600',
  alt,
}) => {
  const [retryStage, setRetryStage] = useState<number>(0);
  const displayName = code || name || 'UNIV';
  const monogram = (code || name || 'U').trim().slice(0, 4).toUpperCase();
  const knownBackup = getKnownLogo(code, name);

  // Reset error stage if logoUrl changes
  useEffect(() => {
    setRetryStage(0);
  }, [logoUrl]);

  // Determine current URL attempt
  let currentSrc = (logoUrl || '').trim();

  if (retryStage === 1 && knownBackup && currentSrc !== knownBackup) {
    currentSrc = knownBackup;
  } else if (retryStage >= 2 || !currentSrc) {
    // Both failed or no URL -> Render clean monogram badge
    return (
      <div className={`${containerClassName} bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800 rounded-full select-none p-1 flex flex-col items-center justify-center border border-slate-200/80`}>
        <Building2 className={`${iconClassName} shrink-0 mb-0.5 opacity-90`} />
        <span className="text-[10px] font-black tracking-wider leading-none text-slate-700 uppercase">
          {monogram}
        </span>
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <img
        src={currentSrc}
        alt={alt || displayName}
        className={`${className} rounded-full select-none transition-transform duration-300`}
        style={{ filter: 'none' }}
        loading="eager"
        onError={() => {
          setRetryStage((prev) => prev + 1);
        }}
      />
    </div>
  );
};

