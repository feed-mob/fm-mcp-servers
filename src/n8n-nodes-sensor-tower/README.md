# n8n 节点：Sensor Tower Reporting

将 Sensor Tower Reporting MCP 工具封装为 n8n 社区节点，便于在工作流中直接拉取应用情报与市场数据。

## 安装（本地开发）

```bash
cd src/n8n-nodes-sensor-tower
npm install
npm run build
```

在你的 n8n 实例中，以“社区节点”的方式加载该文件夹（或发布到 npm 后按包名安装）。

## 凭据（Credentials）
- Base URL：可选，默认 `https://api.sensortower.com`
- Auth Token：必填，你的 Sensor Tower API `AUTH_TOKEN`

在 n8n 中创建类型为 “Sensor Tower API” 的凭据，并填入上述字段。

## 支持的操作（Operations）
- Get App Metadata：获取应用元数据（名称、开发者、分类、描述、截图、评分等）
- Get Top In-App Purchases（iOS）：获取 iOS 应用的内购热度榜
- Get Compact Sales Report Estimates：获取紧凑格式的下载与收入预估（单位为分）
- Get Active Users：获取按国家维度的活跃用户（DAU/WAU/MAU）
- Get Category History：获取应用在分类榜单的历史排名（支持小时级别，仅 iOS）
- Get Category Ranking Summary：获取当天的分类榜单概览
- Get Network Analysis：广告情报的曝光份额（SOV）时序
- Get Network Analysis Rank：广告情报的排名数据
- Get Retention：按 D1~D90 的留存数据（含基线）
- Get Downloads By Sources：按来源（自然、付费、浏览器）拆分下载量

上述操作与 MCP 工具保持一致，仅对 n8n 的交互做了少量字段/校验优化。

## 参数要点
- 日期格式统一为 `YYYY-MM-DD`
- 多个 ID 支持用英文逗号分隔，例如 `123,456,789`
- `publisher_ids` 为“可重复的查询参数”，节点内部已按 `publisher_ids[]` 方式正确编码
- iOS/Android 需通过 `OS` 选项明确选择

## 典型用法
1. 在工作流中拖入 “Sensor Tower” 节点
2. 选择所需 Operation，并填写参数
3. 选择已创建的 “Sensor Tower API” 凭据
4. 运行节点，结果将以 JSON 形式输出到后续节点

## 构建脚本
- `npm run build`：TypeScript 编译并拷贝图标到 `dist`
- `npm run dev`：监听编译（可按需添加）

## 备注
- 节点仅负责拼装并转发请求到 Sensor Tower API，HTTP 错误将以 JSON 形式透出，便于在工作流中处理
- 如需新增 API 映射，可在 `nodes/SensorTower/SensorTower.node.ts` 中扩展 Operation 与参数
