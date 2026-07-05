import localFont from 'next/font/local';

// Heading face — condensed, used bold via the base-layer h1–h6 rule in globals.css.
export const Khand = localFont({
  src: '../public/fonts/Khand-Variable.woff2',
  variable: '--font-khand',
  weight: '300 700',
  display: 'swap',
});

// Body face — regular weight. Also backs the `font-mono` utility (tabular-nums where
// alignment matters) since the site no longer ships a monospace face.
export const Hind = localFont({
  src: '../public/fonts/Hind-Variable.woff2',
  variable: '--font-hind',
  weight: '300 700',
  display: 'swap',
});
