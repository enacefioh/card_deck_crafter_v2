let gaMeasurementId: string | null = null;
let isInitialized = false;

/**
 * Resetea el estado interno para entornos de pruebas unitarias.
 */
export function resetAnalyticsStateForTesting(): void {
  gaMeasurementId = null;
  isInitialized = false;
}

/**
 * Inicializa Google Analytics 4 consultando /api/config en el servidor (SRS-060).
 * Si el servidor responde con un googleAnalyticsId válido (ej. "G-XXXXXXXXXX"),
 * inyecta dinámicamente el script gtag.js en el <head> del DOM.
 */
export async function initAnalytics(): Promise<void> {
  resetAnalyticsStateForTesting();
  try {
    const res = await fetch("/api/config");
    if (!res.ok) return;
    const config = await res.json();
    const gaId = config.googleAnalyticsId?.trim();

    if (gaId && /^G-[A-Z0-9]+$/i.test(gaId)) {
      gaMeasurementId = gaId;
      injectGtagScript(gaId);
      isInitialized = true;
      console.log(`[cdc2] Google Analytics 4 activo (${gaId})`);
    }
  } catch (err) {
    console.warn("[cdc2] Analytics no disponible o sin conexión:", err);
  }
}

/**
 * Inyecta el script oficial gtag.js en el DOM.
 */
function injectGtagScript(gaId: string): void {
  if (document.getElementById("ga-gtag-script")) return;

  const script = document.createElement("script");
  script.id = "ga-gtag-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script);

  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  (window as any).gtag = gtag;

  gtag("js", new Date());
  gtag("config", gaId, { send_page_view: true });
}

/**
 * Envía un evento personalizado a GA4 si la analítica está activa.
 * Si está deshabilitada, actúa como un no-op silencioso.
 */
export function trackEvent(eventName: string, params?: Record<string, any>): void {
  if (!isInitialized || !(window as any).gtag || !gaMeasurementId) return;
  try {
    (window as any).gtag("event", eventName, params || {});
  } catch (err) {
    console.warn("[cdc2] Error al registrar evento de analítica:", err);
  }
}

/**
 * Retorna si la analítica está activa actualmente.
 */
export function isAnalyticsActive(): boolean {
  return isInitialized;
}
