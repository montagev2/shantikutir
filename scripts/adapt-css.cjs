const fs = require('fs');
const path = require('path');

const tfgCssPath = 'C:\\Users\\Debajoyti\\Documents\\the-food-garden\\src\\index.css';
const skCssPath = 'C:\\Users\\Debajoyti\\Documents\\shanti-kutir\\src\\index.css';

let css = fs.readFileSync(tfgCssPath, 'utf8');

const skTokens = `:root {
  /* ── Backgrounds ─────────────────────────────────── */
  --bg-main:        #0c0b0a;
  --bg-subtle:      #141210;
  --surface:        #181614;
  --surface-2:      #221f1c;
  --surface-hover:  #2c2824;
  --surface-glass:  rgba(20, 18, 16, 0.74);

  /* ── Clean Luxury Glassmorphism Tokens ────────────── */
  --glass-bg:              rgba(20, 18, 16, 0.70);
  --glass-bg-elevated:     rgba(28, 25, 22, 0.84);
  --glass-bg-subtle:       rgba(255, 255, 255, 0.035);
  --glass-border:          rgba(255, 255, 255, 0.09);
  --glass-border-specular: rgba(255, 255, 255, 0.16);
  --glass-border-active:   rgba(245, 158, 11, 0.50);
  --glass-blur:            blur(24px) saturate(190%);
  --glass-blur-heavy:      blur(32px) saturate(200%);
  --glass-specular-glow:   inset 0 1px 1px 0 rgba(255, 255, 255, 0.14);
  --glass-shadow:          0 12px 36px 0 rgba(0, 0, 0, 0.55);
  --glass-shadow-elevated: 0 20px 50px 0 rgba(0, 0, 0, 0.75);

  /* ── Brand: Sandalwood Gold & Terracotta ──────────── */
  --primary:            #f59e0b;
  --primary-dark:       #d97706;
  --primary-hover:      #fbbf24;
  --primary-glow:       rgba(245, 158, 11, 0.22);
  --primary-glow-strong:rgba(245, 158, 11, 0.38);
  --terracotta:         #c2410c;
  --terracotta-light:   #ea580c;
  --garden-green:       #16a34a;
  --garden-green-light: #22c55e;

  /* ── Semantic ────────────────────────────────────── */
  --veg-color:     #22c55e;
  --non-veg-color: #ef4444;

  /* ── Text ────────────────────────────────────────── */
  --text-primary:   #fbfaf7;
  --text-secondary: #e7e5e4;
  --text-muted:     #a8a29e;
  --text-faint:     #78716c;

  /* ── Type Scale (Semantic) ────────────────────────── */
  --text-xs:   0.75rem;
  --text-sm:   0.875rem;
  --text-base: 1rem;
  --text-lg:   1.25rem;
  --text-xl:   1.5rem;
  --text-2xl:  2.25rem;

  /* ── Borders ─────────────────────────────────────── */
  --border:        rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.14);
  --border-active: rgba(245, 158, 11, 0.45);

  /* ── Shadows ─────────────────────────────────────── */
  --shadow-sm:        0 2px 8px  rgba(0, 0, 0, 0.35);
  --shadow-md:        0 8px 24px rgba(0, 0, 0, 0.45);
  --shadow-lg:        0 16px 40px rgba(0, 0, 0, 0.60);
  --shadow-primary:   0 4px 16px rgba(245, 158, 11, 0.30);
  --shadow-primary-lg:0 8px 28px rgba(245, 158, 11, 0.42);

  /* ── Border Radius ───────────────────────────────── */
  --radius-xs:   6px;
  --radius-sm:   8px;
  --radius-md:   12px;
  --radius-lg:   18px;
  --radius-xl:   24px;
  --radius-full: 9999px;

  /* ── Typography ──────────────────────────────────── */
  --font-family: 'Outfit', 'Hind Siliguri', system-ui, -apple-system, sans-serif;
  --font-display: 'Cinzel', Georgia, serif;

  /* ── Easing Curves ───────────────────────────────── */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out:    cubic-bezier(0.16, 1,    0.3,  1);

  /* ── Aliases ─────────────────────────────────────── */
  --bg-body:       var(--bg-main);
  --text-light:    var(--text-primary);
  --border-line:   var(--border);
  --garden-accent: #c2410c;
}`;

const rootStart = css.indexOf(':root {');
const rootEnd = css.indexOf('}', rootStart) + 1;
let adaptedCss = css.slice(0, rootStart) + skTokens + css.slice(rootEnd);

// Ensure Google font imports Cinzel & Hind Siliguri & Outfit
const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Hind+Siliguri:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:ital,opsz,wght@0,14..32,400..900;1,14..32,400..900&display=swap');\n`;

// Replace the first @import or add it
if (adaptedCss.startsWith('@import')) {
  const firstSemi = adaptedCss.indexOf(';\n') + 2;
  adaptedCss = fontImport + adaptedCss.slice(firstSemi);
} else {
  adaptedCss = fontImport + adaptedCss;
}

fs.writeFileSync(skCssPath, adaptedCss, 'utf8');
console.log('Successfully wrote updated index.css to shanti-kutir with ' + adaptedCss.split('\n').length + ' lines!');
