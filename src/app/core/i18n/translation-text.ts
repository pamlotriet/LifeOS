/** Pure calculations accept this callback so presentation can supply ngx-translate. */
export type TranslateText = (key: string, params?: Record<string, unknown>) => string;

/** English fallback for callers that use calculations without an Angular injector. */
export const englishText: TranslateText = (key, params) =>
  key.replace(/{{\s*(\w+)\s*}}/g, (_, name: string) => String(params?.[name] ?? ''));
