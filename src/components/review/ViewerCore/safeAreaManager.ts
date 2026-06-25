type SafeAreaInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

function parseEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const num = parseInt(value.replace('px', ''), 10);
  return Number.isFinite(num) ? num : fallback;
}

export function getSafeAreaInsets(): SafeAreaInsets {
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseEnv(style.getPropertyValue('--sat'), 0),
    bottom: parseEnv(style.getPropertyValue('--sab'), 0),
    left: parseEnv(style.getPropertyValue('--sal'), 0),
    right: parseEnv(style.getPropertyValue('--sar'), 0),
  };
}

export function getCssSafeAreaInsets(): SafeAreaInsets {
  if (typeof document === 'undefined') return { top: 0, bottom: 0, left: 0, right: 0 };
  const dummy = document.createElement('div');
  dummy.style.cssText = 'position:fixed;top:env(safe-area-inset-top,0px);bottom:env(safe-area-inset-bottom,0px);left:env(safe-area-inset-left,0px);right:env(safe-area-inset-right,0px);visibility:hidden;pointer-events:none';
  document.body.appendChild(dummy);
  const top = parseEnv(dummy.style.top, 0);
  const bottom = parseEnv(dummy.style.bottom, 0);
  const left = parseEnv(dummy.style.left, 0);
  const right = parseEnv(dummy.style.right, 0);
  document.body.removeChild(dummy);
  return { top, bottom, left, right };
}
