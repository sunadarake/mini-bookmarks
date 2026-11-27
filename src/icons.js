// Lucide (https://lucide.dev) のアイコン。外部読み込みは CSP で制限されるためインラインで持つ
function lucide(size, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

export const ICON_EXTERNAL_LINK = lucide(
  16,
  '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
);

export const ICON_MENU = lucide(
  18,
  '<line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>',
);

export const ICON_CHECK = lucide(
  14,
  '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
);

export const ICON_X = lucide(16, '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>');

export const ICON_CHEVRON_DOWN = lucide(16, '<path d="m6 9 6 6 6-6"/>');
