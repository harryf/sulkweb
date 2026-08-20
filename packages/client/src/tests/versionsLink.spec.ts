import { describe, expect, it } from 'vitest';
import { versionsHref } from '../manual/versionsLink.js';

describe('versionsHref', () => {
  it('links sideways from the stable root manual', () => {
    expect(versionsHref('/sulkweb/manual.html')).toBe('versions.html');
  });

  it('links sideways from a local dev manual at the domain root', () => {
    expect(versionsHref('/manual.html')).toBe('versions.html');
  });

  it('links up from the latest manual', () => {
    expect(versionsHref('/sulkweb/latest/manual.html')).toBe('../versions.html');
  });

  it('links up from a frozen version manual', () => {
    expect(versionsHref('/sulkweb/0.5.0/manual.html')).toBe('../versions.html');
    expect(versionsHref('/sulkweb/12.34.56/manual.html')).toBe('../versions.html');
  });

  it('does not mistake ordinary directories for version dirs', () => {
    expect(versionsHref('/sulkweb/docs/manual.html')).toBe('versions.html');
  });
});
