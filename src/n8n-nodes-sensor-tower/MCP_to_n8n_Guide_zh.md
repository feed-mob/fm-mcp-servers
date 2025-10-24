# MCP 转成 n8n 节点：一步一步超清晰教程（初中版）

这份指南教你把“会提供接口的 MCP 服务器”，变成“n8n 里能用的节点”。你会学到：怎么搭文件、怎么把 MCP 的工具搬进节点、怎么本地测试、怎么发 npm。

---

## 这两样东西是什么？

- MCP：有一堆“工具”（像“查应用信息”“查下载量”），对外提供接口。
- n8n：可视化自动化工具。你把“节点”拖进画布，连起来就能跑流程。

我们的目标：把 MCP 的每一个“工具”，变成 n8n 节点里的一个“操作（Operation）”。

---

## 1) 目录长什么样（照着建就行）

以本仓库的 Sensor Tower 为例（你也可以换成自己的）：

```
src/n8n-nodes-sensor-tower/
  package.json
  tsconfig.json
  index.ts
  types.d.ts
  README.md
  credentials/
    SensorTowerApi.credentials.ts
  nodes/
    SensorTower/
      SensorTower.node.ts
      logo.svg
```

- package.json：告诉 n8n 去哪里找节点/凭据；配置 build。
- tsconfig.json：TypeScript 编译设置，输出到 dist/。
- index.ts：把“节点类”和“凭据类”导出来。
- types.d.ts：n8n 的简化类型声明，方便写 TS。
- credentials/...：n8n 里“凭据”的字段，比如 API Token。
- nodes/...：节点本体（你的操作都写这里），以及节点图标。

---

## 2) 写“凭据”（n8n 里填账号信息）

目标：让节点可以拿到 MCP 所需的鉴权信息（比如 `AUTH_TOKEN`）。

文件：`credentials/SensorTowerApi.credentials.ts`

字段示例：
- Base URL（默认 `https://api.sensortower.com`）
- Auth Token（也就是 MCP 用的 `AUTH_TOKEN`）

节点执行时，我们把 `auth_token` 自动带到每个请求的查询参数里。

---

## 3) 把 MCP 工具变成 n8n 的“操作”

思路很简单：
- MCP 里有一条工具，比如 `get_app_metadata`
- 在节点里，做一个 Operation 叫 `get_app_metadata`
- 给它需要的输入框（比如 OS、App IDs、Country）
- 点“执行”时，用这些参数去请求 MCP 同名接口，拿结果返回

常见映射（以 Sensor Tower 为例）：
- get_app_metadata → `/v1/{os}/apps`
- get_top_in_app_purchases → `/v1/ios/apps/top_in_app_purchases`（固定 iOS）
- get_compact_sales_report_estimates → `/v1/{os}/compact_sales_report_estimates`
- get_active_users → `/v1/{os}/usage/active_users`
- get_category_history → `/v1/{os}/category/category_history`
- get_category_ranking_summary → `/v1/{os}/category/category_ranking_summary`
- get_network_analysis → `/v1/{os}/ad_intel/network_analysis`
- get_network_analysis_rank → `/v1/{os}/ad_intel/network_analysis/rank`
- get_retention → `/v1/{os}/usage/retention`
- get_downloads_by_sources → `/v1/{os}/downloads_by_sources`

关键点：
- 参数名字尽量跟 MCP 一致（用户更容易懂）
- 多个值支持“逗号分隔”（`a,b,c`）
- 像 `publisher_ids[]` 这种“重复参数”，用循环 append 到 URL（本节点已处理）

---

## 4) 节点怎么写（核心套路）

在 `nodes/SensorTower/SensorTower.node.ts` 里，你需要三部分：

1) “节点说明”：名字、图标、需要的凭据
2) “properties”：用户能看到的“操作（Operation）”和“输入框”
3) “execute()”：根据选择的 Operation，拼 URL，发请求，把响应当作 JSON 返回

伪代码（易懂版）：

```ts
读取凭据 baseUrl、authToken
读取用户选的 operation

如果是 get_app_metadata：
  读 os、appIds、country
  访问 `${baseUrl}/v1/${os}/apps?app_ids=...&country=...&auth_token=...`
  返回 JSON

如果是 get_active_users：
  读 os、appIds、timePeriod、startDate、endDate、countries
  访问 `${baseUrl}/v1/${os}/usage/active_users?...&auth_token=...`
  返回 JSON

...其他操作同理
```

---

## 5) 本地测试（两步就能跑）

```bash
cd src/n8n-nodes-sensor-tower
npm install
npm run build
```

- 打开 n8n，把这个包作为社区节点加载（或发 npm 后用包名安装）
- 新建一个“Sensor Tower”节点 → 选择凭据 → 选一个 Operation → 填参数 → 执行

参数示例（查元数据）：
- OS：iOS 或 Android
- App IDs：
  - iOS 用 App Store 的数字 ID（例如 Uber：`368677368`）
  - Android 用包名（例如 Uber：`com.ubercab`）
- Country：`US`（常用）

---

## 6) 常见问题（一分钟排错）

- 403 或认证失败：检查凭据里的 `Auth Token` 是否正确/是否过期
- 返回空数组：
  - App ID/包名写对了吗？
  - Country 用 `US` 再试
- iOS 内购榜固定 iOS：不用填 OS
- `publisher_ids[]`：
  - 输入框里用逗号：`111,222,333`
  - 节点里会自动展开为多个 `publisher_ids[]`
- 看不到图标：确认 `logo.svg` 被复制到 `dist/nodes/SensorTower/logo.svg`
- n8n 不识别节点：`package.json` 的 `n8n.nodes`/`n8n.credentials` 是否指向 `dist/*.js`

---

## 7) 发布到 npm（可选）

```bash
cd src/n8n-nodes-sensor-tower
npm login
npm install
npm run build
npm publish --dry-run    # 预览将要发布的文件
npm publish --access public
```

如果公司有 scope（比如 `@your-org/n8n-nodes-sensor-tower`）：
- 改 `package.json.name`
- 还是用 `npm publish --access public`

---

## 8) 复用这套模板做别的 MCP

- 拷贝 `src/n8n-nodes-sensor-tower`，改成你的名字
- 改 `credentials` 里的凭据字段（比如换别的 token）
- 在 `SensorTower.node.ts` 里改 Operation 列表和 URL 路径
- 保持“一个 MCP 工具 = 一个 n8n 操作”的一一对应
- 构建、测试、（可选）发布 npm

---

### 小结（记住这句）

把 MCP 的“工具”照抄成 n8n 的“操作”，参数照抄成输入框，执行时把参数拼到 URL 里去请求，返回 JSON 给下游节点。就这么简单。你已经会了。
