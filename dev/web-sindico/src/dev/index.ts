function isEnabled(value: unknown) {
  return typeof value === 'string' && value.trim().toLowerCase() === 'true';
}

export const isLocalDev = import.meta.env.DEV === true;

// Global full mock mode for local development. Disable it by changing the flags or removing src/dev.
export const isFullMockMode =
  isLocalDev
  && (
    (import.meta.env.VITE_APP_MODE as string | undefined)?.trim().toLowerCase() === 'mock'
    || isEnabled(import.meta.env.VITE_ENABLE_FULL_MOCK)
  );

// Legacy toggles kept for simple rollback. Full mock mode enables both automatically.
export const isDevMockApiEnabled =
  isFullMockMode || (isLocalDev && isEnabled(import.meta.env.VITE_ENABLE_DEV_MOCKS));

export const isDevAuthBypassEnabled =
  isFullMockMode || (isLocalDev && isEnabled(import.meta.env.VITE_ENABLE_DEV_AUTH_BYPASS));

export function initializeDevMode() {
  if (!isLocalDev) {
    return;
  }

  if (!isDevMockApiEnabled && !isDevAuthBypassEnabled) {
    return;
  }

  const enabledFeatures = isFullMockMode
    ? ['full-mock']
    : [
        isDevMockApiEnabled ? 'mock-api' : null,
        isDevAuthBypassEnabled ? 'auth-bypass' : null,
      ].filter(Boolean);

  console.info(
    `[web-sindico] local dev mode enabled: ${enabledFeatures.join(', ')}`,
  );
}
