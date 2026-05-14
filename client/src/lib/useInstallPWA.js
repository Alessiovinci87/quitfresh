import { useEffect, useRef, useState } from 'react';

function detectPlatform() {
  if (typeof window === 'undefined') return 'unknown';
  const ua = window.navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function detectInstalled() {
  if (typeof window === 'undefined') return false;
  // Standard: matchMedia per display-mode standalone.
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // iOS Safari espone navigator.standalone quando l'app è stata aggiunta a Home.
  if (window.navigator.standalone === true) return true;
  return false;
}

export function useInstallPWA() {
  const [platform] = useState(detectPlatform);
  const [isInstalled, setIsInstalled] = useState(detectInstalled);
  const [hasNativePrompt, setHasNativePrompt] = useState(false);
  const deferredPrompt = useRef(null);

  useEffect(() => {
    function onBeforeInstall(e) {
      e.preventDefault();
      deferredPrompt.current = e;
      setHasNativePrompt(true);
    }
    function onInstalled() {
      setIsInstalled(true);
      setHasNativePrompt(false);
      deferredPrompt.current = null;
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function promptInstall() {
    const evt = deferredPrompt.current;
    if (!evt) return null;
    evt.prompt();
    const choice = await evt.userChoice;
    deferredPrompt.current = null;
    setHasNativePrompt(false);
    return choice.outcome; // 'accepted' | 'dismissed'
  }

  return { platform, isInstalled, hasNativePrompt, promptInstall };
}
