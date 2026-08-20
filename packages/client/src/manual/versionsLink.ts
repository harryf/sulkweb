/**
 * Relative href from the manual page to the site-root versions.html.
 *
 * The deployed site serves the same build at three depths: the root (stable),
 * /latest/, and frozen /X.Y.Z/ directories. versions.html lives only at the
 * site root, so a manual served from a version subdirectory links one level up.
 * In local vite dev/preview the target does not exist (the page is generated
 * at deploy time by scripts/genVersionsPage.sh), so the link 404s locally.
 */
export function versionsHref(pathname: string): string {
  const dir = pathname.slice(0, pathname.lastIndexOf('/') + 1);
  const lastSegment = dir.replace(/\/$/, '').split('/').pop() ?? '';
  const inVersionDir = lastSegment === 'latest' || /^\d+\.\d+\.\d+$/.test(lastSegment);
  return inVersionDir ? '../versions.html' : 'versions.html';
}
