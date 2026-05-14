import { useState } from 'react';
import { useInstallPWA } from '../lib/useInstallPWA';

const DISMISS_KEY = 'qf_install_dismissed';

// Mode "card": versione compatta dismissibile per Home.
// Mode "section": versione estesa permanente per Profile.
export default function InstallApp({ mode = 'section' }) {
  const { platform, isInstalled, hasNativePrompt, promptInstall } = useInstallPWA();
  const [dismissed, setDismissed] = useState(
    () => mode === 'card' && localStorage.getItem(DISMISS_KEY) === '1'
  );
  const [installing, setInstalling] = useState(false);

  if (mode === 'card' && (isInstalled || dismissed)) return null;

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  async function handleInstall() {
    setInstalling(true);
    try {
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  }

  const isIos = platform === 'ios';
  const isAndroid = platform === 'android';

  if (mode === 'card') {
    return (
      <div className="mb-4 bg-sage-50 border border-sage-200 rounded-xl px-3 py-3">
        <div className="flex items-start gap-2">
          <span className="text-sage-500 text-base mt-0.5">📱</span>
          <div className="flex-1 text-xs">
            <p className="font-semibold text-sage-800">
              Installa QuitFresh sul telefono
            </p>
            <p className="mt-0.5 text-sage-700">
              {isIos
                ? 'Tocca Condividi e poi “Aggiungi a Home”.'
                : isAndroid
                  ? 'Menu Chrome → “Installa app”. Sarà accessibile come una vera app.'
                  : 'Apri il sito sul telefono per installarlo come app.'}
            </p>
            <div className="mt-2 flex items-center gap-3">
              {hasNativePrompt && (
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="px-3 py-1 bg-sage-500 text-white rounded-md text-xs font-medium hover:bg-sage-600 disabled:opacity-50"
                >
                  {installing ? '…' : 'Installa ora'}
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="text-xs text-sage-600 hover:text-sage-800 underline"
              >
                Non mostrare più
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // mode === 'section' (Profile)
  return (
    <div className="space-y-4">
      {isInstalled ? (
        <div className="bg-sage-50 border border-sage-200 rounded-xl-soft p-4 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-sage-500 to-sage-700 flex items-center justify-center text-white shadow-sage shrink-0">✓</span>
          <div className="min-w-0">
            <p className="font-display text-base font-semibold text-sage-900 leading-tight">App già installata</p>
            <p className="text-[11px] text-sage-700/80 mt-0.5">QuitFresh è sulla home del tuo telefono.</p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-sage-700/80 leading-relaxed">
            Aggiungi QuitFresh alla home del telefono per aprirla con un tocco, come una vera app. Niente da scaricare dallo store.
          </p>

          {hasNativePrompt && (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="w-full py-3 bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-xl-soft text-sm font-semibold shadow-sage active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {installing ? 'Apertura…' : 'Installa ora'}
            </button>
          )}
        </>
      )}

      <Platform
        name="iPhone · Safari"
        steps={[
          'Apri QuitFresh con Safari (non Chrome).',
          'Tocca il pulsante Condividi in basso.',
          'Scorri e tocca "Aggiungi alla schermata Home".',
          'Conferma con "Aggiungi".',
        ]}
      />
      <Platform
        name="Android · Chrome"
        steps={[
          'Apri QuitFresh con Chrome.',
          'Tocca il menu ⋮ in alto a destra.',
          'Tocca "Installa app" (o "Aggiungi a schermata Home").',
          'Conferma.',
        ]}
      />
    </div>
  );
}

function Platform({ name, steps }) {
  return (
    <div className="bg-white border border-sage-100/60 rounded-xl-soft shadow-soft p-4">
      <p className="text-[11px] uppercase tracking-wider text-sage-600/70 font-semibold mb-2">{name}</p>
      <ol className="text-sm text-sage-800 space-y-1.5 list-decimal list-inside leading-relaxed">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  );
}
