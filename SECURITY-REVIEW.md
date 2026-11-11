# 云墟仙途重建 · 安全评审 (SECURITY-REVIEW.md)

评审对象：`~/workspace/yunxu-rebuild/`（Node 24 + TypeScript + Fastify + SQLite + React 19）
评审方式：Trail of Bits 技能（`~/.codex/skills/`）指导下的 Codex 评审 + 人工对抗探针实测。
评审时间：2026-11-12。注意：评审 agent 在写出正式报告前被中断（机器重启风险下的长会话），本文件由人工根据落盘的加固代码与实测探针结果整理；加固本身已全部落地并通过测试。

## 已落地并实测的加固

| # | 问题 | 严重度 | 加固位置 | 实测结果 |
|---|------|--------|----------|----------|
| S1 | 请求体无大小限制（资源耗尽） | High | `src/server/app.ts`：`Fastify({ bodyLimit: 512 * 1024 })` | 600 KB 请求体 → HTTP 400 |
| S2 | 嵌套过深 / 超大数组可致解析与递归爆栈 | Medium | `src/server/app.ts` `validateBody`：深度 ≤ 12、数组 ≤ 1000 项、单字段字符串 ≤ 20,000 字符 | 20 层嵌套 → 400；25,000 字符字段 → 400 |
| S3 | 原型污染（`__proto__` / `prototype` / `constructor` 键） | High | 三层防御：① Fastify 默认 JSON 解析器（secure-json-parse）直接拒绝含 `__proto__` 的请求体；② `validateBody` 递归拒绝危险键；③ `migrateSave` 导入前递归拒绝危险键 | 含 `__proto__` 的导入 → 400（解析层拒绝） |
| S4 | 导入存档无大小限制 | Medium | `src/server/migrate.ts`：`JSON.stringify(input).length > 512 * 1024` 拒绝 | 与 S1 同源，导入端另有独立检查 |
| S5 | 错误码映射不当：非法 JSON / 危险导入返回 500（信息泄露与客户端误判） | Low | `src/server/migrate.ts`：危险导入与超大导入抛带 `code: 'VALIDATION_ERROR'` 的错误；`src/server/app.ts` 错误处理器把 `FST_ERR_CTP_INVALID_JSON_BODY` 映射为 400 | 非法 JSON → 400；`__proto__` 导入 → 400；合法导入仍 200 |
| S6 | 幂等键复用不同请求体可重复生效 | Medium | `src/server/app.ts`：幂等键按 `route:saveId:key` 存储请求体指纹，同一键不同请求体 → `VALIDATION_ERROR`；进行中的相同请求去重（in-flight map） | 契约测试覆盖（见下） |
| S7 | 乐观并发可被绕过 | Medium | 所有写操作要求 `If-Match` 版本头；版本不符 → 409 `VERSION_CONFLICT`（带 `.code`）；读操作不要求版本 | 实测：过期 If-Match → 409 |
| S8 | 导入可静默丢数据 / 重复导入可覆盖 | Medium | `migrateSave`：Zod 严格校验导出结构 + SHA-256 源哈希 +（哈希，源存档 id）幂等：重复导入返回已有存档 `imported: false`，不重复写 | 实测：重复导入不复制故事；5 段故事正文逐字节一致 |

## 评审覆盖的其它面（未发现高危问题）

- **状态授权**：单存档应用，无多用户；每次写操作都通过 `getState()` 取当前存档并做版本校验，无跨存档访问路径（没有按 id 取他人存档的端点）。
- **SQL 注入**：全部写操作走参数化语句（node:sqlite + Drizzle）；无字符串拼接 SQL。
- **提示词注入**：叙事适配器（`src/server/narration/adapter.ts`）把玩家/NPC 文本作为结构化输入字段传入，`QUALITY_PROMPT` 为固定系统提示词模板，不拼接玩家文本进指令；`LocalNarrator` 为确定性模板实现，不调用外部模型、无密钥。部署方注入的真实模型需沿用同一边界（见 REBUILD-REPORT.md）。
- **密钥**：全仓 grep `apiKey|api_key|API_KEY|secret|password|token`（排除 idempotency/requestId）无命中；无任何凭证写入文件。

## 已知残留（非高危，部署时注意）

- **无速率限制**：单人游戏空间，请求体/深度/数组/字符串上限已做，但没有按客户端的速率限制。部署到多人托管环境时建议在平台层加限流。
- **幂等键存储在内存 Map**：服务重启后丢失；重启后同一键可再次执行一次。单机单存档场景可接受；多实例部署需改用持久化存储。
- **审计日志**：迁移与关键写操作写 `audit_events` 表，但无集中日志导出；部署后如需审计请直接读 SQLite。

## 验证

- `npm test`：57/57 通过（7 个测试文件）；`npx tsc --noEmit` 干净。
- 对抗探针（实测，见上表）：深嵌套 400、超大字段 400、超大请求体 400、非法 JSON 400、`__proto__` 导入 400、合法导入 200。
