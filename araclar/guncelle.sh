#!/bin/bash
# guncelle.sh: motorun sahibi için. Motordaki değişikliği GitHub'a ve bu makinede kurulu sitelere taşır.
# (Motoru yalnızca kullananlar güncelleme için README'deki "Güncellemeleri almak" adımlarını izler.)
#   1) çalışma ağacı temiz mi bakar (değişiklikler önce commit edilmeli)
#   2) .claude-plugin/plugin.json sürümünün son hanesini artırır, commit eder, GitHub'a push eder
#      (sürüm artmazsa kurulu kopyalar yenilenmez)
#   3) "motor" pazarını GitHub'dan tazeler
#   4) siteler.txt'deki her site klasöründe eklentiyi günceller (siteler.txt bu makineye özel, git'te değil)
# Değişiklik, bundan sonra açılan oturumlarda geçerli olur.
set -euo pipefail

MOTOR="$(cd "$(dirname "$0")/.." && pwd)"
CLAUDE_BIN="${CLAUDE_BIN:-$(command -v claude || echo "$HOME/.local/bin/claude")}"
PJ="$MOTOR/.claude-plugin/plugin.json"
cd "$MOTOR"

if [ -n "$(git status --porcelain)" ]; then
  echo "Commit edilmemiş değişiklik var; önce commit et:"
  git status --short
  exit 1
fi

# Sürümü node ile artır: macOS'ta da Linux'ta da aynı çalışır.
surumler=$(node -e '
const fs = require("fs");
const f = process.argv[1];
const j = JSON.parse(fs.readFileSync(f, "utf8"));
const eski = j.version;
const p = eski.split(".").map(Number);
p[2] += 1;
j.version = p.join(".");
fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n");
console.log(eski + " " + j.version);' "$PJ")
eski=${surumler% *}
yeni=${surumler#* }
git add "$PJ"
git commit -q -m "Release $yeni"
git push -q origin HEAD
echo "sürüm: $eski → $yeni (GitHub'a gönderildi)"

"$CLAUDE_BIN" plugin marketplace update motor

if [ -f "$MOTOR/siteler.txt" ]; then
  while IFS= read -r site || [ -n "$site" ]; do
    case "$site" in '' | \#*) continue ;; esac
    if [ ! -d "$site" ]; then
      echo "atlandı (klasör yok): $site"
      continue
    fi
    (cd "$site" && "$CLAUDE_BIN" plugin update blog-motoru@motor --scope project)
  done < "$MOTOR/siteler.txt"
else
  echo "siteler.txt yok. Her site klasöründe: claude plugin update blog-motoru@motor --scope project"
fi

echo "Tamam. Değişiklikler yeni açılan oturumlarda geçerli."
