# FeedMob MCP Installer

统一安装入口已经改成按 `serverKey` 选择目标 server，而不是为单个包写死一套脚本。

## Usage

### macOS / Linux shell

```bash
bash scripts/install.sh --list
bash scripts/install.sh sensor-tower-reporting
```

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install.ps1 --list
powershell -ExecutionPolicy Bypass -File scripts\install.ps1 sensor-tower-reporting
```

## Current Metadata Set

当前已接入 24 个 MCP CLI server 的安装元数据，覆盖仓库里所有带 `bin` 的 MCP server 包：

- `applovin-reporting`
- `appsamurai-reporting`
- `civitai-records`
- `feedmob-reporting`
- `femini-reporting`
- `github-issues`
- `imagekit`
- `impact-radius-reporting`
- `inmobi-reporting`
- `iplocate`
- `ironsource-aura-reporting`
- `ironsource-reporting`
- `jampp-reporting`
- `kayzen-reporting`
- `liftoff-reporting`
- `mintegral-reporting`
- `rtb-house-reporting`
- `samsung-reporting`
- `sensor-tower-reporting`
- `singular-reporting`
- `smadex-reporting`
- `tapjoy-reporting`
- `user-activity-reporting`
- `work-journals`

元数据文件位于 `scripts/servers/*.json`。

## Design

脚本结构：

- `install.sh` / `install.ps1`
  - 统一安装入口
  - 校验本机环境
  - 读取 `scripts/servers/<server>.json`
  - 交互采集环境变量
  - 备份并写入 Claude Desktop `mcpServers`
- `servers/*.json`
  - 定义 server 名称、npm 包名、命令参数、环境变量采集规则

## Notes

- macOS 安装器会显式注入 `PATH`，因为 Claude Desktop 通常不会继承 shell 的完整 PATH。
- Windows 安装器默认不注入 `PATH`。
- 第一版暂不支持 `--all`、版本 pin、远程拉取 metadata、`multiline` 交互输入。
