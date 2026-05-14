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

  if (isInstalled) return null;
  if (mode === 'card' && dismissed) return null;

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
    <div>
      <p className="text-xs text-gray-500 mb-3">
        Aggiungi QuitFresh alla home del telefono per aprirla con un tocco,
        come una vera app. Niente da scaricare dallo store.
      </p>

      {hasNativePrompt && (
        <button
          onClick={handleInstall}
          disabled={installing}
          className="w-full mb-4 py-2.5 bg-sage-500 text-white rounded-xl text-sm font-semibold hover:bg-sage-600 disabled:opacity-60"
        >
          {installing ? 'Apertura…' : 'Installa ora'}
        </button>
      )}

      <div className="space-y-4">
        <Platform
          name="iPhone · Safari"
          steps={[
            'Apri QuitFresh con Safari (non Chrome).',
            'Tocca il pulsante Condividi in basso (⬆️).',
            'Scorri e tocca “Aggiungi alla schermata Home”.',
            'Conferma con “Aggiungi”.',
          ]}
        />
        <Platform
          name="Android · Chrome"
          steps={[
            'Apri QuitFresh con Chrome.',
            'Tocca il menu ⋮ in alto a destra.',
            'Tocca “Installa app” (o “Aggiungi a schermata Home”).',
            'Conferma.',
          ]}
        />
      </div>
    </div>
  );
}

function Platform({ name, steps }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs font-semibold text-gray-700 mb-2">{name}</p>
      <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  );
}
