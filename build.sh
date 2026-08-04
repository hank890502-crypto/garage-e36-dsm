#!/bin/bash
set -e
cd "$(dirname "$0")"
OUT="index.html"
cat src/01-head.html src/02-body.html > "$OUT"
for f in src/0[5-9]*.js src/1*.js src/2*.js src/3*.js src/9*.js; do
  echo "/* ===== $(basename $f) ===== */" >> "$OUT"
  cat "$f" >> "$OUT"
  echo "" >> "$OUT"
done
echo "</script></body></html>" >> "$OUT"
echo "built: $OUT  $(wc -c < "$OUT") bytes  $(wc -l < "$OUT") lines"
