export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[ResQIntel PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[ResQIntel PWA] Service Worker registration failed:', err);
        });
    });
  }
}
