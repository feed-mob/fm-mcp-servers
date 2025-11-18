#!/usr/bin/env node

import { FastMCP } from "fastmcp";
import { Schema, z } from "zod";

const server = new FastMCP({
  name: "google-drive-files",
  version: "0.0.1"
});

const FEMINI_API_URL = process.env.FEMINI_API_URL;
const FEMINI_API_TOKEN = process.env.FEMINI_API_TOKEN;

server.addTool({
  name: "query_google_drive_files",
  description: "根据用户的问题从 Femini 系统中的 Google Drive 文件中查询相关信息，对查询出的数据进行分析和筛选，最后给出答案。",
  parameters: z.object({
    query: z.string().describe("用户的完整问题"),
    start_date: z.string().optional().describe("Start date (YYYY-MM-DD format), defaults to 30 days ago"),
    end_date: z.string().optional().describe("End date (YYYY-MM-DD format), defaults to yesterday")
  }),
  execute: async (args, { log }) => {
    try {
      const queryParams = new URLSearchParams();
      
      queryParams.append('query', args.query);
      if (args.start_date) queryParams.append('date_gteq', args.start_date);
      if (args.end_date) queryParams.append('date_lteq', args.end_date);

      // Construct full API URL
      const apiUrl = `${FEMINI_API_URL}/api/unstable/mcp/google_drive_files?${queryParams.toString()}`;
      
      log.info("Sending API request", { url: apiUrl });

      // Send HTTP request
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': "Bearer " + FEMINI_API_TOKEN
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      let prompt = `你是一个数据分析助手，你的任务是根据用户的问题从提供的 Google Drive 文件数据中查询、分析和提取相关信息。

## 数据结构说明
你将收到一个 JSON 数组，其中包含多个文件对象。每个文件对象包含以下关键字段：
- id: 文件的唯一标识符
- file_name: 文件名称
- file_url: 文件的 Google Drive 访问链接
- file_extension: 文件类型（xlsx、pdf、md、txt 等）
- mime_type: MIME 类型
- ai_summary: AI 生成的文件内容摘要（可能为 null）
- created_at: 文件创建时间
- modified_at: 文件最后修改时间
- owner_email: 文件所有者邮箱

## 你的任务流程

### 第一步：理解用户查询
1. 仔细阅读用户的问题，识别关键信息需求
2. 确定需要查找的数据类型（销售数据、活动数据、员工数据等）
3. 识别需要应用的过滤条件（日期范围、特定人员、特定客户等）

### 第二步：数据搜索与匹配
1. 根据文件名称、ai_summary 内容和文件类型搜索相关文件
2. 优先查看 ai_summary 字段中的数据摘要来快速定位相关信息
3. 对于包含表格数据的文件（xlsx、csv），查看摘要中的数据内容
4. 匹配多个相关文件以获得完整的答案

### 第三步：数据分析与提取
1. 从 ai_summary 中提取相关的数据点
2. 进行必要的数据计算（求和、平均、比较等）
3. 按照用户的具体要求进行数据筛选和排序
4. 识别数据之间的关联关系

### 第四步：构建答案
1. 清晰地陈述你的发现
2. 提供具体的数据和数字作为支持
3. 对每个相关的文件，包含以下信息：
   - 文件名称
   - 文件 URL（file_url）
   - 为什么这个文件与查询相关（简要说明）
   - 从该文件中提取的具体数据或信息

## 输出格式要求

请按照以下格式组织你的答案：

### 查询结果

**问题理解：** [简要说明你理解的用户问题]

**分析过程：** [说明你如何从数据中找到答案]

**主要发现：**
[具体的数据和分析结果]

**相关文件：**
1. **文件名称**
   - URL: [file_url]
   - 相关性: [说明为什么这个文件相关]
   - 关键数据: [从该文件提取的相关数据]

2. **文件名称**
   - URL: [file_url]
   - 相关性: [说明为什么这个文件相关]
   - 关键数据: [从该文件提取的相关数据]

[继续列出所有相关文件]

## 重要提示

1. **准确性优先**：如果数据不清楚或不完整，请明确说明
2. **完整性**：确保回答用户问题的所有部分
3. **可追溯性**：始终提供文件 URL 和数据来源
4. **数据验证**：如果发现多个文件中的数据不一致，请指出并解释
5. **上下文理解**：理解 FeedMob 的业务背景（营销、销售、活动管理等）
6. **日期处理**：注意文件的修改日期和创建日期，优先使用最新的数据

## 可用的 Google Drive 文件数据

以下是系统中当前可用的 Google Drive 文件列表：

${JSON.stringify(data, null, 2)}

现在，请根据用户的查询问题，从提供的 Google Drive 文件数据中找到答案。`

      return {
        content: [
          {
            type: "text",
            text: prompt,
          },
        ],
      };
    } catch (error: unknown) {
      throw new Error(`Failed to query: ${(error as Error).message}`);
    }
  },
});

server.start({
  transportType: "stdio"
});
