#!/usr/bin/env bash
# Generate versions.html in the CURRENT directory (the site tree root).
# Lists the stable root, /latest/, and every frozen /X.Y.Z/ directory present.
# Used by both deploy workflows and by local bootstrap; keep it dependency-free.
set -euo pipefail

stable="$(cat STABLE_VERSION 2>/dev/null || echo 'unknown')"

{
  cat <<HTML
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sulk Web versions</title>
<style>
  body { background:#0d0d0d; color:#c3c3c3; font-family:sans-serif; max-width:640px; margin:48px auto; padding:0 16px; }
  h1 { color:#e8c840; letter-spacing:6px; }
  a { color:#7ec8ff; text-decoration:none; }
  a:hover { text-decoration:underline; }
  li { margin:10px 0; }
  .note { color:#8a8a8a; font-size:14px; }
</style>
</head>
<body>
<h1>SULK WEB</h1>
<p>Every deployed version of the game. Frozen versions never change; play any of them.</p>
<ul>
<li><a href="./">Stable ($stable)</a> <span class="note">the last released version</span></li>
<li><a href="latest/">latest</a> <span class="note">head of main; may be broken</span></li>
HTML
  for d in $(ls -d [0-9]*.[0-9]*.[0-9]* 2>/dev/null | sort -rV); do
    echo "<li><a href=\"$d/\">v$d</a> <span class=\"note\">frozen release</span></li>"
  done
  cat <<'HTML'
</ul>
<p class="note"><a href="manual.html">Field manual</a> &middot; <a href="https://github.com/harryf/sulkweb">Source on GitHub</a></p>
</body>
</html>
HTML
} > versions.html
echo "versions.html written (stable=$stable)"
