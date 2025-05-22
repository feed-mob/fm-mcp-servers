# GitHub Issues Schema

本文档描述了GitHub Issues数据的结构，用于AI模型理解和处理相关数据。

## 数据结构

| 字段名 | 类型 | 必填 | 描述 | 示例值 | 约束条件 |
|-------|------|-----|------|-------|---------|
| issue_id | 整数 | 是 | GitHub Issue的唯一标识符 | 17089 | 正整数 |
| repo | 字符串 | 是 | 仓库名称 | tracking_admin | 已知值: tracking_admin, feedmob |
| title | 字符串 | 是 | Issue标题 | Scopely Client Facing Doc UPDATE | 可能包含任务描述、分配信息等 |
| issue_created_at | 日期时间 | 是 | Issue创建时间 | 2024-05-10 03:19:57 | ISO格式日期时间 |
| closed_at | 日期时间 | 否 | Issue关闭时间 | 2025-04-15 11:22:45 | 可为空，ISO格式日期时间 |
| hubspot_ticket_link | URL | 否 | 关联的HubSpot票据链接 | https://app.hubspot.com/contacts/2992171/record/0-5/17196440761 | 可为空，有效URL |
| create_user | 字符串 | 是 | 创建Issue的用户名 | olive | 系统中存在的用户名 |
| assign_users | 字符串数组 | 是 | 被分配处理Issue的用户列表 | {olive,esther} | 数组格式，可包含多个用户名 |
| status | 字符串 | 是 | Issue当前状态 | closed | 已知值: open, closed |
| current_labels | 字符串数组 | 是 | Issue当前标签列表 | {"client report"} | 数组格式，可包含多个标签 |
| process_time_seconds | 整数 | 是 | Issue处理时间（秒） | 29404968 | 非负整数 |
| developers | 字符串数组 | 是 | 参与开发的开发者列表 | {roofeel} | 数组格式，可为空数组 {} |
| code_reviewers | 字符串数组 | 是 | 代码审核者列表 | {mandy} | 数组格式，可为空数组 {} |
| publishers | 字符串数组 | 是 | 发布者列表 | {mandy} | 数组格式，可为空数组 {} |
| qa_members | 字符串数组 | 是 | QA测试成员列表 | {summer} | 数组格式，可为空数组 {} |
| pm_qa_user | 字符串 | 否 | 项目管理或QA负责人 | nancy | 可为空 |
| team | 字符串 | 否 | 团队名称 | Star | 可为空 |

## 字段详细说明

### issue_id
- **描述**: GitHub Issue的唯一标识符
- **类型**: 整数
- **示例**: 17089, 17295, 17324
- **约束**: 必须是正整数

### repo
- **描述**: 仓库名称，表示Issue所属的代码仓库
- **类型**: 字符串
- **示例**: "tracking_admin", "feedmob"
- **约束**: 目前数据中只有这两个值

### title
- **描述**: Issue的标题，通常包含任务描述
- **类型**: 字符串
- **格式特点**: 
  - 可能包含任务优先级标记，如"(1.0)", "(1.3)", "(1.7)"等
  - 可能包含任务分配信息，如"[D:KaiJi]"表示开发者是KaiJi
  - 可能包含代码审核者"[C:Steven]"，发布者"[P:Steven]"，QA"[Q:Esther]"等角色标记
  - 可能包含"[QUESTION]"标记表示这是一个问题而非任务
- **示例**: "(1.3)请确认 click url 上 state 的作用， 并进行移除[D:KaiJi]"

### issue_created_at
- **描述**: Issue创建的日期和时间
- **类型**: 日期时间字符串
- **格式**: YYYY-MM-DD HH:MM:SS
- **示例**: "2024-05-10 03:19:57"

### closed_at
- **描述**: Issue关闭的日期和时间，如果Issue尚未关闭则为空
- **类型**: 日期时间字符串或空
- **格式**: YYYY-MM-DD HH:MM:SS
- **示例**: "2025-04-15 11:22:45"

### hubspot_ticket_link
- **描述**: 关联的HubSpot票据链接，用于客户支持跟踪
- **类型**: URL字符串或空
- **示例**: "https://app.hubspot.com/contacts/2992171/record/0-5/17196440761"

### create_user
- **描述**: 创建Issue的用户名
- **类型**: 字符串
- **示例**: "olive", "nancy", "ian"

### assign_users
- **描述**: 被分配处理Issue的用户列表
- **类型**: 字符串数组
- **格式**: {user1,user2,...}
- **示例**: "{olive,esther}", "{roofeel}", "{kaiji}"

### status
- **描述**: Issue当前状态
- **类型**: 字符串
- **已知值**: "open", "closed"
- **示例**: "closed"

### current_labels
- **描述**: Issue当前标签列表，用于分类和筛选
- **类型**: 字符串数组
- **格式**: {"label1","label2",...}
- **示例**: 
  - {"client report"}
  - {QA,Mighty}
  - {"master Ticket",STAR}
  - {"priority 3","Inquiry & Discussion",STAR}

### process_time_seconds
- **描述**: Issue处理时间，以秒为单位
- **类型**: 整数
- **示例**: 29404968, 18069067
- **约束**: 非负整数

### developers
- **描述**: 参与开发的开发者列表
- **类型**: 字符串数组
- **格式**: {dev1,dev2,...} 或空数组 {}
- **示例**: "{roofeel}", "{kaiji}", "{}"

### code_reviewers
- **描述**: 代码审核者列表
- **类型**: 字符串数组
- **格式**: {reviewer1,reviewer2,...} 或空数组 {}
- **示例**: "{mandy}", "{jason}", "{}"

### publishers
- **描述**: 负责发布代码的人员列表
- **类型**: 字符串数组
- **格式**: {publisher1,publisher2,...} 或空数组 {}
- **示例**: "{mandy}", "{steven}", "{}"

### qa_members
- **描述**: 负责质量保证测试的人员列表
- **类型**: 字符串数组
- **格式**: {qa1,qa2,...} 或空数组 {}
- **示例**: "{summer}", "{nancy}", "{}"

### pm_qa_user
- **描述**: 项目管理或QA负责人
- **类型**: 字符串或空
- **示例**: "nancy", ""

### team
- **描述**: 团队名称
- **类型**: 字符串或空
- **示例**: "Star", "Mighty"

## 标签分类

从数据中观察到的常见标签类型：

1. **任务类型标签**:
   - "client report" - 客户报告相关任务
   - "master Ticket" - 主要票据
   - "Inquiry & Discussion" - 询问和讨论
   - "priority 3" - 优先级3
   - "QA" - 质量保证相关
   - "Dev verify" - 需要开发验证
   - "Stage Verified" - 已在测试环境验证
   - "Test Added" - 已添加测试
   - "PA Production Verify" - 需要在生产环境验证

2. **团队标签**:
   - "Star" - STAR团队
   - "Mighty" - Mighty团队

3. **通信类型标签**:
   - "Email" - 邮件相关
   - "playbook" - 操作手册相关

4. **其他标签**:
   - "out_score" - 超出评分
   - "research" - 研究性质
   - "backlog" - 待办事项
   - "Sentry" - Sentry错误监控相关
   - "pa_crawler_testing" - PA爬虫测试
   - "TestNotNeeded" - 不需要测试
   - "Watch" - 需要关注
   - "decision_logs" - 决策日志

## 标题格式模式

从数据中观察到的标题格式模式：

1. **优先级标记**:
   - "(0.8)" - 低优先级
   - "(1.0)" - 标准优先级
   - "(1.3)" - 中等优先级
   - "(1.7)" - 较高优先级
   - "(2.3)" - 高优先级
   - "(2.7)" - 最高优先级

2. **角色分配标记**:
   - "[D:username]" - 开发者(Developer)
   - "[C:username]" - 代码审核者(Code Reviewer)
   - "[P:username]" - 发布者(Publisher)
   - "[Q:username]" - QA测试者
   - "[V:username]" - 验证者(Verifier)

3. **问题类型标记**:
   - "[QUESTION]" - 问题而非任务
   - "[Draft]" - 草稿
   - "[master]" - 主要任务

## 数据关系

1. **用户角色关系**:
   - create_user: 创建Issue的用户
   - assign_users: 被分配处理Issue的用户
   - developers: 实际参与开发的用户
   - code_reviewers: 负责代码审核的用户
   - publishers: 负责发布的用户
   - qa_members: 负责QA测试的用户
   - pm_qa_user: 项目管理或QA负责人

2. **时间关系**:
   - issue_created_at: Issue创建时间
   - closed_at: Issue关闭时间
   - process_time_seconds: 处理总时间（秒）

3. **标签与状态关系**:
   - current_labels: 当前标签列表，反映Issue的类型、优先级、处理阶段等
   - status: Issue当前状态（open/closed）

## 数据使用建议

1. **任务分析**:
   - 通过title中的优先级标记和角色分配标记分析任务的重要性和资源分配
   - 通过current_labels分析任务类型和处理阶段

2. **团队协作分析**:
   - 通过developers, code_reviewers, publishers, qa_members分析团队协作模式
   - 通过process_time_seconds分析任务处理效率

3. **项目管理**:
   - 通过issue_created_at和closed_at分析项目进度
   - 通过current_labels中的优先级标签分析资源分配

4. **问题分类**:
   - 通过title中的[QUESTION]标记识别问题型任务
   - 通过current_labels中的"Inquiry & Discussion"标签识别讨论型任务
