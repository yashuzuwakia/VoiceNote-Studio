import { useEffect, useState } from 'react';

type Appearance = 'dark' | 'light';
const appearanceKey = 'voicenote-studio-appearance';

function readAppearance(): Appearance {
  try {
    return localStorage.getItem(appearanceKey) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function useAppearance() {
  const [appearance, setAppearance] = useState(readAppearance);
  useEffect(() => {
    document.documentElement.dataset.appearance = appearance;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', appearance === 'light' ? '#f5f3f9' : '#111115');
    try {
      localStorage.setItem(appearanceKey, appearance);
    } catch {
      /* Keep the in-memory preference. */
    }
  }, [appearance]);

  return {
    appearance,
    toggleAppearance: () =>
      setAppearance((current) => (current === 'light' ? 'dark' : 'light')),
  };
}
