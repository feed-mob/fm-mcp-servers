# FeedMob MCP Installer

The installer now uses a unified entry point that selects the target server by `serverKey`, instead of maintaining a separate hard-coded script for a single package.

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

The installer metadata currently covers all 24 MCP CLI packages in this repository that expose a `bin` entry:

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

Metadata files live under `scripts/servers/*.json`.

## Design

Structure:

- `install.sh` / `install.ps1`
  - Unified installer entry points
  - Validate the local environment
  - Read `scripts/servers/<server>.json`
  - Collect environment variables interactively
  - Back up and update Claude Desktop `mcpServers`
- `servers/*.json`
  - Define server names, npm package names, command args, and environment variable prompts

## Notes

- The macOS installer explicitly injects `PATH` because Claude Desktop usually does not inherit the full shell `PATH`.
- The Windows installer does not inject `PATH` by default.
- The first version does not yet support `--all`, version pinning, remote metadata fetching, or `multiline` interactive input.
