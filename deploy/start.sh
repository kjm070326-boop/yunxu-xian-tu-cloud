#!/bin/sh
set -eu

DB_PATH="${DB_PATH:-./data/yunxu.sqlite}"
export DB_PATH
LITESTREAM_BIN="${LITESTREAM_BIN:-litestream}"
CONFIG_PATH="${LITESTREAM_CONFIG_PATH:-/tmp/litestream.yml}"
B2_ENDPOINT="${B2_ENDPOINT:-https://s3.us-west-004.backblazeb2.com}"
export B2_ENDPOINT

litestream_enabled=false
if [ -n "${B2_BUCKET:-}" ] || [ -n "${B2_KEY_ID:-}" ] || [ -n "${B2_APPLICATION_KEY:-}" ]; then
  if [ -z "${B2_BUCKET:-}" ] || [ -z "${B2_KEY_ID:-}" ] || [ -z "${B2_APPLICATION_KEY:-}" ]; then
    echo "B2 配置不完整：B2_BUCKET、B2_KEY_ID、B2_APPLICATION_KEY 必须同时设置" >&2
    exit 1
  fi
  litestream_enabled=true
  # 清除 AWS_CA_BUNDLE：Litestream 0.5.x 的 S3 客户端遇到该变量会直接报错、
  # 连不上 B2；B2 用的是公开证书，走系统证书池即可，Render 上也没有这个变量。
  unset AWS_CA_BUNDLE
  if ! command -v "$LITESTREAM_BIN" >/dev/null 2>&1; then
    echo "找不到 litestream 可执行文件：$LITESTREAM_BIN（容器镜像里应由 Dockerfile 安装）" >&2
    exit 1
  fi
  mkdir -p "$(dirname "$DB_PATH")"
  cat > "$CONFIG_PATH" <<'EOF'
dbs:
  - path: ${DB_PATH}
    replica:
      type: s3
      bucket: ${B2_BUCKET}
      path: yunxu.sqlite
      endpoint: ${B2_ENDPOINT}
      access-key-id: ${B2_KEY_ID}
      secret-access-key: ${B2_APPLICATION_KEY}
EOF
  echo "正在从 B2 恢复 SQLite 存档"
  if ! "$LITESTREAM_BIN" restore -config "$CONFIG_PATH" -if-db-not-exists -if-replica-exists "$DB_PATH"; then
    echo "Litestream 恢复失败，可能是鉴权、网络或远端数据错误；为避免空库覆盖远端，停止启动" >&2
    exit 1
  fi
else
  echo "未设置 B2 凭证，跳过 Litestream 恢复与复制"
fi

./deploy/seed.sh

litestream_pid=""
node_pid=""
stop_litestream() {
  if [ -n "$litestream_pid" ] && kill -0 "$litestream_pid" 2>/dev/null; then
    kill "$litestream_pid" 2>/dev/null || true
    wait "$litestream_pid" 2>/dev/null || true
  fi
}
stop_node() {
  if [ -n "$node_pid" ] && kill -0 "$node_pid" 2>/dev/null; then
    kill "$node_pid" 2>/dev/null || true
    wait "$node_pid" 2>/dev/null || true
  fi
}
trap 'stop_litestream; stop_node; exit 0' INT TERM

if [ "$litestream_enabled" = true ]; then
  "$LITESTREAM_BIN" replicate -config "$CONFIG_PATH" &
  litestream_pid=$!
fi

node dist/server/entry.js &
node_pid=$!
if wait "$node_pid"; then
  status=0
else
  status=$?
fi
stop_litestream
exit "$status"
