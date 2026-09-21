import React, { useEffect, useRef } from 'react';

interface AdBannerProps {
  slot: 'home' | 'paper-top' | 'paper-bottom' | 'course' | 'download';
  enabled?: boolean;
  adCode?: string;
  target?: 'all' | 'mobile' | 'desktop';
  className?: string;
}

/**
 * Validates if the ad code contains genuine advertisement content
 * and strictly filters out demo/placeholder text or empty wrappers.
 */
function isValidAd(code?: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const trimmed = code.trim();
  if (!trimmed) return false;

  // Disallow any placeholder or demo text
  const lower = trimmed.toLowerCase();
  const bannedPhrases = [
    'institutional sponsor',
    'responsive educational sponsor banner',
    'educational sponsor',
    'sample responsive homepage ad',
    'official institutional sponsor banner',
    'course explorer ad unit',
    'download page sponsor unit',
    'sample advertisement',
    'placeholder advertisement',
    'automatically fitted to screen',
    'automatically fitted for screen',
  ];

  for (const phrase of bannedPhrases) {
    if (lower.includes(phrase)) {
      return false;
    }
  }

  // Check if it's just an empty container or comment
  const strippedText = trimmed.replace(/<[^>]*>/g, '').trim();
  const hasScriptOrMedia = /<(script|iframe|ins|img|svg|a|picture|video|embed|object)/i.test(trimmed);

  // If there are no media/embed/script tags and no text content, treat as empty
  if (!hasScriptOrMedia && strippedText.length === 0) {
    return false;
  }

  return true;
}

export const AdBanner: React.FC<AdBannerProps> = ({
  slot,
  enabled = true,
  adCode,
  target = 'all',
  className = '',
}) => {
  const adContainerRef = useRef<HTMLDivElement>(null);

  // If ads are disabled or no valid ad content is configured, hide completely (no empty box, no container)
  if (enabled === false || !isValidAd(adCode)) {
    return null;
  }

  // Dynamically execute any embedded scripts (such as Google AdSense or external ad networks)
  useEffect(() => {
    if (!adContainerRef.current) return;

    // Execute script tags if present in adCode
    const scripts = adContainerRef.current.querySelectorAll('script');
    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    // Safely initialize adsbygoogle if an AdSense <ins> tag is present
    try {
      const insElements = adContainerRef.current.querySelectorAll('ins.adsbygoogle');
      if (insElements.length > 0) {
        // @ts-expect-error - window.adsbygoogle may be declared on window by external script
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch {
      // Ignore push errors for already initialized ads
    }
  }, [adCode]);

  // Responsive device visibility classes
  const targetClass =
    target === 'mobile'
      ? 'block md:hidden'
      : target === 'desktop'
      ? 'hidden md:block'
      : 'block';

  return (
    <aside
      id={`ad-container-${slot}`}
      aria-label="Sponsored"
      className={`w-full my-4 clear-both ${targetClass} ${className}`}
    >
      <div
        ref={adContainerRef}
        className="w-full flex items-center justify-center overflow-hidden max-w-full"
        dangerouslySetInnerHTML={{ __html: adCode! }}
      />
    </aside>
  );
};

