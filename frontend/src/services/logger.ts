interface ErrorLogPayload {
  message: string;
  stack?: string;
  componentStack?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  level?: 'INFO' | 'WARN' | 'ERROR';
}

export async function sendClientLog(payload: ErrorLogPayload): Promise<void> {
  try {
    const enrichedPayload = {
      ...payload,
      url: payload.url || window.location.href,
      userAgent: payload.userAgent || navigator.userAgent,
      timestamp: payload.timestamp || new Date().toISOString(),
    };

    console.error('[ClientLogger]', enrichedPayload.message, enrichedPayload);

    await fetch('/api/v1/logs/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrichedPayload),
    }).catch(() => {});
  } catch (e) {
    console.error('Error al enviar log al servidor:', e);
  }
}

export function initGlobalErrorListeners(): void {
  window.addEventListener('error', (event) => {
    sendClientLog({
      message: event.message || 'Unknown global JavaScript error',
      stack: event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`,
      level: 'ERROR',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    sendClientLog({
      message: `Unhandled Promise Rejection: ${event.reason?.message || event.reason || 'Unknown reason'}`,
      stack: event.reason?.stack,
      level: 'ERROR',
    });
  });
}
