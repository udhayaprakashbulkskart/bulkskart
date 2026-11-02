import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'dark' }) }));

import BrandLogo from '@/components/common/BrandLogo';

const root = path.resolve(__dirname, '../..');
const KB = 1024;

describe('brand logo', () => {
  it('is the small fingerprinted file and reserves its space before it loads', () => {
    const { container } = render(
      <MemoryRouter>
        <BrandLogo />
      </MemoryRouter>,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toMatch(/bulkskart-logo-dark.*\.webp$/);
    expect(img?.getAttribute('width')).toBe('544');
    expect(img?.getAttribute('height')).toBe('132');
  });

  it('ships right-sized files: far below the 337 KB originals', () => {
    for (const theme of ['dark', 'light']) {
      const file = path.join(root, 'src/assets/brand', `bulkskart-logo-${theme}.webp`);
      expect(fs.statSync(file).size).toBeLessThan(80 * KB);
    }
  });
});

describe('browser tab icons', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const iconLinks = [...html.matchAll(/<link[^>]*rel="(?:shortcut )?icon"[^>]*>/g)].map((m) => m[0]);

  it('lists icon links', () => {
    expect(iconLinks.length).toBeGreaterThan(3);
  });

  it('points every icon at a small file (the 1254px, 776 KB artwork must not be a favicon)', () => {
    for (const link of iconLinks) {
      const href = link.match(/href="([^"]+)"/)?.[1] ?? '';
      expect(href).not.toBe('');
      const size = fs.statSync(path.join(root, 'public', href.replace(/^\//, ''))).size;
      expect(size, `${href} is ${Math.round(size / KB)} KB`).toBeLessThan(250 * KB);
    }
  });

  it('keeps the payment window logo small', () => {
    const branding = fs.readFileSync(path.join(root, 'src/constants/branding.ts'), 'utf8');
    const icon = branding.match(/BULKSKART_ICON_URL = '([^']+)'/)?.[1] ?? '';
    expect(fs.statSync(path.join(root, 'public', icon.replace(/^\//, ''))).size).toBeLessThan(60 * KB);
  });
});
