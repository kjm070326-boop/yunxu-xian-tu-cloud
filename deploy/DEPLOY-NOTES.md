# 云墟仙途 Render 部署说明

## 构建与启动

Docker 构建依次执行 `npm ci`、`npm run build:client` 和 `npx tsc`，并安装固定版本的 Litestream。容器入口是 `./deploy/start.sh`：有 B2 凭证时先恢复远端 SQLite，再幂等导入种子存档，后台复制 WAL，最后启动服务；没有 B2 凭证时只启动本地 SQLite 服务。

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `PORT` | Render 自动注入，默认端口为三千 |
| `DB_PATH` | SQLite 文件路径，Render 配置为 `/data/yunxu.sqlite` |
| `B2_BUCKET` | B2 bucket 名称 |
| `B2_KEY_ID` | B2 Application Key 的 keyID |
| `B2_APPLICATION_KEY` | B2 Application Key 的 applicationKey |
| `B2_ENDPOINT` | B2 S3 endpoint；可省略，默认 `https://s3.us-west-004.backblazeb2.com` |
| `DEEPSEEK_API_KEY` | DeepSeek API key；设置后启用 DeepSeek 叙事，失败自动回退本地叙事 |
| `DEEPSEEK_MODEL` | 可选模型名，默认 `deepseek-chat` |

## Backblaze B2 配置

1. 在 Backblaze 控制台的 **Buckets** 中新建私有 bucket，记下名称。
2. 在 **Application Keys** 中创建只允许访问该 bucket 的 key，记下一次性显示的 `keyID` 和 `applicationKey`；只把它们放进 Render 环境变量。
3. endpoint 取决于 bucket 所在区域，可在 bucket 详情或 B2 的 S3 兼容 API 页面查看，例如 `https://s3.us-west-004.backblazeb2.com`。省略 `B2_ENDPOINT` 时使用这个默认值，跨区域 bucket 请改成自己的 endpoint。

首次启动时，无远端备份会继续执行 `seed.sh` 导入杨柳青存档，然后后台复制 WAL。重启或重新部署时，本地数据库不存在就先恢复最近备份再执行幂等 seed；鉴权、网络或远端数据错误会直接退出，避免空库覆盖远端。启动脚本会清除 `AWS_CA_BUNDLE` 再调 Litestream（该变量会让 Litestream 0.5.x 的 S3 客户端直接报错；B2 用公开证书，走系统证书池即可）。

## 手动种子导入

```sh
npx tsx src/server/migrate.ts spec/save-export.json "$DB_PATH"
```

重复执行安全：已存在相同来源存档时会跳过导入。

## 本地验证

```sh
DB_PATH=./data/yunxu.sqlite PORT=3000 ./deploy/start.sh
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/state
curl -X POST http://localhost:3000/api/v1/actions \
  -H 'content-type: application/json' -H 'idempotency-key: local-meditation' \
  -H 'if-match: 1' -d '{"action":"meditate"}'
```

最后一个请求执行一回合打坐；返回体中的 `data` 会包含更新后的状态和故事。

本地没有 B2 凭证时，启动脚本会提示跳过恢复与复制，仍可验证 seed、状态和打坐流程。DeepSeek 可暂时不设置；若设置假的 `DEEPSEEK_API_KEY`，请求失败或 30 秒超时会自动回退本地叙事，不会抛错或打印 key。
