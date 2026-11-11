#!/bin/sh
set -eu
DB_PATH="${DB_PATH:-./data/yunxu.sqlite}"
export DB_PATH
if [ "$DB_PATH" != ":memory:" ]; then mkdir -p "$(dirname "$DB_PATH")"; fi
if [ ! -f "$DB_PATH" ] || ! node --input-type=module -e "import { DatabaseSync } from 'node:sqlite'; const db=new DatabaseSync(process.env.DB_PATH); const row=db.prepare('SELECT COUNT(*) AS count FROM saves').get(); process.exit(Number(row.count)>0?0:1)"; then
  if [ -f dist/server/migrate.js ]; then
    node dist/server/migrate.js spec/save-export.json "$DB_PATH"
  else
    npx tsx src/server/migrate.ts spec/save-export.json "$DB_PATH"
  fi
fi
