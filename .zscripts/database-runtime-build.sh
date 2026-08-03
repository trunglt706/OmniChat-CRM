#!/bin/bash

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/z/my-project}"
BUILD_DIR="${BUILD_DIR:?BUILD_DIR is required}"

# Read database provider from .env
source "$PROJECT_DIR/.env" 2>/dev/null || true
DB_PROVIDER="${DATABASE_PROVIDER:-sqlite}"

case "$DB_PROVIDER" in
  sqlite)
    SOURCE_DB_DIR="$PROJECT_DIR/db"
    SOURCE_DB_PATH="$SOURCE_DB_DIR/custom.db"
    TARGET_DB_DIR="$BUILD_DIR/db"
    TARGET_DB_PATH="$TARGET_DB_DIR/custom.db"

    mkdir -p "$TARGET_DB_DIR"

    if [ -f "$SOURCE_DB_PATH" ]; then
        echo "🗄️  Copying SQLite database to build output..."
        cp -a "$SOURCE_DB_DIR/." "$TARGET_DB_DIR/"
    else
        echo "ℹ️  No preview database found, will initialize empty database"
    fi

    echo "🗄️  Syncing database schema to build output..."
    (
        cd "$PROJECT_DIR"
        DATABASE_URL="file:$TARGET_DB_PATH" bun run db:push
    )

    if [ ! -f "$TARGET_DB_PATH" ]; then
        echo "❌ Database init succeeded but $TARGET_DB_PATH not found"
        exit 1
    fi

    echo "✅ SQLite database ready"
    ls -lah "$TARGET_DB_DIR"
    ;;

  mysql)
    echo "🗄️  MySQL mode — skip file copy (connecting at runtime via DATABASE_URL)"
    echo "✅ MySQL configured (ensure DATABASE_URL in production .env)"
    ;;

  *)
    echo "❌ Unknown DATABASE_PROVIDER: $DB_PROVIDER (expected: sqlite or mysql)"
    exit 1
    ;;
esac
