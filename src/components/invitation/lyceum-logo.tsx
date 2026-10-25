/**
 * Lyceum Campus logo — official mark (lyceumcampus.lk).
 *
 * - `tone="auto"` (default): full-colour logo on light surfaces, all-white
 *   logo on dark surfaces (follows the theme via the `dark:` variant).
 * - `tone="white"`: always the all-white logo, for fixed navy surfaces.
 */
export function LyceumLogo({
  className = 'h-9 w-auto',
  tone = 'auto',
}: {
  className?: string;
  tone?: 'auto' | 'white';
}) {
  if (tone === 'white') {
    return (
      <img
        src="/lyceum-logo-dark.svg"
        alt="Lyceum Campus"
        className={className}
        draggable={false}
      />
    );
  }
  return (
    <>
      <img
        src="/lyceum-logo.svg"
        alt="Lyceum Campus"
        className={`${className} dark:hidden`}
        draggable={false}
      />
      <img
        src="/lyceum-logo-dark.svg"
        alt="Lyceum Campus"
        className={`${className} hidden dark:block`}
        draggable={false}
      />
    </>
  );
}
