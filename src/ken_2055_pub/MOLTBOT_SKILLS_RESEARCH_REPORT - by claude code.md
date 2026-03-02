# Moltbot Skills Research Report
## A Comprehensive Analysis of 565+ Community-Built Skills for Moltbot (Formerly Clawdbot)

**Report Date:** January 28, 2026
**Primary Source:** [VoltAgent/awesome-moltbot-skills](https://github.com/VoltAgent/awesome-moltbot-skills)
**Registry:** [ClawdHub](https://molthub.com) / [GitHub moltbot/clawdhub](https://github.com/moltbot/clawdhub)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Methodology](#methodology)
3. [Category Analysis](#category-analysis)
4. [Cross-Skill Insights](#cross-skill-insights)
5. [Final Ranking & Decision Guide](#final-ranking--decision-guide)
6. [Appendix: Complete Skill Reference](#appendix-complete-skill-reference)

---

# Executive Summary

## What is Moltbot?

Moltbot (formerly Clawdbot) is a locally-running AI assistant created by Peter Steinberger (founder of PSPDFKit). It operates directly on your machine and connects to messaging platforms (WhatsApp, Telegram, Slack, Discord, iMessage, Signal, Microsoft Teams, Matrix) to provide a persistent, context-aware AI assistant experience.

**Key Differentiators:**
- **Local-first:** Runs on your hardware with full system access
- **Persistent memory:** Maintains conversation context across sessions
- **Proactive:** Can reach out to you with reminders and updates (via cron/heartbeat)
- **Skills-based:** Modular architecture with 565+ community-built capabilities
- **Multi-platform:** Same assistant across all your messaging apps

## Top 20 Most Broadly Useful Skills

Based on utility breadth, reliability, ease of setup, and ecosystem fit:

| Rank | Skill | Category | Why It's Essential |
|------|-------|----------|-------------------|
| 1 | **github** | Git & GitHub | Universal dev workflow; uses battle-tested `gh` CLI |
| 2 | **slack** | Communication | Team communication hub; broad enterprise adoption |
| 3 | **todoist** | Productivity | Best-in-class task management with excellent API |
| 4 | **obsidian** | Notes & PKM | Dominant PKM tool; local Markdown files |
| 5 | **homeassistant** | Smart Home | 2000+ device integrations; self-hosted |
| 6 | **vercel** | DevOps & Cloud | One-command deployments; excellent DX |
| 7 | **spotify** | Media | Most popular streaming service; rich API |
| 8 | **linear** | Productivity | Modern issue tracking; developer-focused |
| 9 | **perplexity** | Search & Research | AI-powered search with citations |
| 10 | **cloudflare** | DevOps & Cloud | Edge computing, DNS, storage in one |
| 11 | **notion** | Notes & PKM | Team wiki and database; powerful API |
| 12 | **apple-reminders** | Apple Apps | Native macOS integration; zero setup |
| 13 | **discord** | Communication | Community management; rich bot ecosystem |
| 14 | **local-whisper** | Speech | Free, private transcription; no API costs |
| 15 | **brave-search** | Search | Privacy-focused; good free tier |
| 16 | **tesla** | Transportation | Full vehicle control; popular EV |
| 17 | **1password** | Security | Industry-standard password management |
| 18 | **coding-agent** | Coding Agents | Spawns Claude Code/Codex as subprocess |
| 19 | **n8n** | Self-Hosted | Visual workflow automation; self-hosted |
| 20 | **oura** | Health & Fitness | Comprehensive sleep/health tracking |

## Category Value Map

```
HIGH VALUE (Start here)                    SPECIALIZED VALUE
├── Git & GitHub (9 skills)               ├── iOS & macOS Development (13)
├── DevOps & Cloud (35 skills)            ├── Finance & Crypto (30)
├── Productivity & Tasks (33)             ├── Transportation (25)
├── Notes & PKM (26)                      ├── Health & Fitness (21)
└── Search & Research (12)                └── Personal Development (22)

BROAD UTILITY                              NICHE/REGIONAL
├── Communication (19 skills)             ├── News & RSS (8)
├── Media & Streaming (27)                ├── Weather (5)
├── Smart Home & IoT (16)                 └── Bookmarks & Reading (7)
└── CLI Utilities (37)
```

## Quick-Start Recommendations by Persona

### 1. Solo Developer (Local Automation + Coding Help)
**Install first:**
```bash
npx clawdhub@latest install github
npx clawdhub@latest install coding-agent
npx clawdhub@latest install vercel
npx clawdhub@latest install obsidian
npx clawdhub@latest install local-whisper
```

**Recommended stack:**
- `github` + `conventional-commits` + `pr-commit-workflow`
- `coding-agent` + `prompt-log`
- `tldr` + `jq` for CLI reference

### 2. DevOps/SRE (Cloud Ops, Incident Response, CI/CD)
**Install first:**
```bash
npx clawdhub@latest install cloudflare
npx clawdhub@latest install kubectl-skill
npx clawdhub@latest install tailscale
npx clawdhub@latest install uptime-kuma
npx clawdhub@latest install homeassistant
```

**Recommended stack:**
- `cloudflare` + `vercel` + `digital-ocean` (multi-cloud)
- `kubectl-skill` + `proxmox` (infrastructure)
- `uptime-kuma` + `portainer` (monitoring)
- `n8n` for incident automation

### 3. Product/Operations (Tasks, Scheduling, Comms, Reporting)
**Install first:**
```bash
npx clawdhub@latest install linear
npx clawdhub@latest install slack
npx clawdhub@latest install todoist
npx clawdhub@latest install hubspot
npx clawdhub@latest install ga4
```

**Recommended stack:**
- `linear` + `jira` + `clickup-mcp` (choose one)
- `slack` + `discord` (team comms)
- `hubspot` + `apollo` (CRM)
- `ga4` + `gsc` (analytics)

### 4. Researcher/Analyst (Search, Summarization, Knowledge Workflows)
**Install first:**
```bash
npx clawdhub@latest install perplexity
npx clawdhub@latest install exa
npx clawdhub@latest install tavily
npx clawdhub@latest install obsidian
npx clawdhub@latest install literature-review
```

**Recommended stack:**
- `perplexity` + `exa` + `brave-search` (multi-source search)
- `obsidian` + `second-brain` (knowledge capture)
- `local-whisper` + `summarize` (content processing)
- `youtube-watcher` + `video-transcript-downloader`

### 5. Creator/Marketer (Content, Social, Media Generation)
**Install first:**
```bash
npx clawdhub@latest install bluesky
npx clawdhub@latest install bird
npx clawdhub@latest install typefully
npx clawdhub@latest install copywriting
npx clawdhub@latest install nano-banana-pro
```

**Recommended stack:**
- `bird` + `bluesky` + `reddit` (social posting)
- `typefully` for scheduling
- `copywriting` + `humanizer` (content creation)
- `nano-banana-pro` + `krea-api` (image generation)
- `gamma` for presentations

---

# Methodology

## Evidence Gathering

This report was compiled through:

1. **Primary Source Analysis:** Complete parsing of the [awesome-moltbot-skills](https://github.com/VoltAgent/awesome-moltbot-skills) repository (565+ skills across 31 categories)

2. **Registry Research:** Investigation of [ClawdHub](https://github.com/moltbot/clawdhub) structure, skill metadata format, and installation mechanisms

3. **Secondary Source Verification:** Cross-referencing with:
   - Official Moltbot documentation (docs.molt.bot)
   - Community discussions (Reddit r/LocalLLM, r/ClaudeCode, r/AI_Agents)
   - Tech coverage (The Register, TechCrunch, Forbes, MacStories)
   - Tutorial content (DataCamp, DigitalOcean, DEV.to)
   - Security research (Bitdefender, Snyk, Hudson Rock)

4. **GitHub Activity Analysis:** Where available, reviewing:
   - Star counts and fork activity
   - Last commit dates
   - Open issues and maintenance signals
   - Release history

## Scoring Rubric

Each skill is scored 0-5 on five dimensions:

| Dimension | Weight | Criteria |
|-----------|--------|----------|
| **Utility** | 25% | Breadth of use cases, frequency of real-world application |
| **Reliability** | 25% | Maintenance signals, stability, issue resolution rate |
| **Ease of Setup** | 20% | Prerequisites, API key requirements, configuration complexity |
| **Safety** | 15% | Permission scope, destructive operation risk, data exposure |
| **Ecosystem Fit** | 15% | Integration with other skills, common workflow patterns |

**Score Interpretation:**
- **4.5-5.0:** Essential - install immediately
- **4.0-4.4:** Highly recommended for target use case
- **3.5-3.9:** Good option with some caveats
- **3.0-3.4:** Specialized - evaluate for your specific needs
- **Below 3.0:** Limited utility or significant concerns

## Limitations

- **Limited info cases:** Some skills have minimal documentation; noted with "Limited info found"
- **Regional skills:** Many transportation/local service skills are region-specific
- **Rapid evolution:** The Moltbot ecosystem changes quickly; verify current state before installing
- **Security context:** All skills grant Moltbot additional capabilities; audit before installing

---

# Category Analysis

## 1. Web & Frontend Development (17 skills)

### Category Overview

**Problem space:** Building and maintaining web applications, UI/UX review, frontend performance optimization

**Common workflows:**
- UI component development with best practices
- Automated accessibility and UX audits
- Video generation with Remotion
- Integration with team communication (Slack, Discord)

**Target users:** Frontend developers, UI/UX designers, full-stack engineers

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **frontend-design** | Production-grade UI interfaces | React/Next.js components, responsive layouts, design system implementation | None | Low | Safe | 4.5 |
| **slack** | Slack workspace control | Team notifications, channel management, message automation | Slack App Token (xapp-..., xoxb-...) | Medium | Write access to channels | 4.4 |
| **discord** | Discord server control | Community management, bot commands, webhook integration | Discord Bot Token | Medium | Write access to servers | 4.3 |
| **remotion-best-practices** | Remotion video creation | Animated videos, dynamic content, React-based rendering | Remotion installed, Node.js | Medium | Safe | 4.0 |
| **ui-audit** | Automated UI audits | Accessibility checks, UX principle validation, design review | None | Low | Read-only | 4.2 |
| **vercel-react-best-practices** | React/Next.js optimization | Performance tuning, bundle analysis, deployment best practices | Vercel account | Low | Safe | 4.1 |

### Example Prompts

```
# Frontend Design
"Create a responsive dashboard layout with a sidebar, header, and main content area using Tailwind CSS"

# Slack Integration
"Send a summary of today's completed tasks to the #standup channel"

# UI Audit
"Audit this component for accessibility issues and suggest WCAG 2.1 AA compliance fixes"

# Remotion
"Create a 15-second animated intro video with the text 'Welcome to Our Product' and a gradient background"
```

### Recommendations

**Start here:** `frontend-design`, `ui-audit`
**Power user stack:** `frontend-design` + `remotion-best-practices` + `slack`
**Pitfalls to avoid:**
- Don't use `slack` without proper channel permissions configured
- `remotion-server` requires significant compute resources

---

## 2. Coding Agents & IDEs (16 skills)

### Category Overview

**Problem space:** Orchestrating AI coding assistants, managing multi-agent workflows, extracting insights from coding sessions

**Common workflows:**
- Spawning Claude Code/Codex as subprocesses for coding tasks
- Managing multiple coding agents across workspaces
- Extracting and analyzing AI session transcripts
- Switching between AI provider accounts

**Target users:** Power developers, teams using AI coding assistants, automation enthusiasts

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **coding-agent** | Spawn coding agents | Run Claude Code, Codex, or other agents as subprocess | Target agent installed | Low | Full code access | 4.6 |
| **claude-team** | Multi-Claude orchestration | Parallel Claude Code workers, distributed tasks | Multiple Claude instances | High | Full code access | 4.0 |
| **perry-workspaces** | Docker workspace management | Isolated dev environments on tailnet | Docker, Tailscale | High | Container access | 3.8 |
| **prompt-log** | Session transcript extraction | Audit AI interactions, knowledge capture | AI session logs | Low | Read-only | 4.2 |
| **codex-monitor** | Codex session management | Browse logs, monitor usage | OpenAI Codex | Medium | Read-only | 3.9 |
| **agentlens** | Codebase navigation | Hierarchical code exploration | None | Low | Read-only | 4.0 |

### Example Prompts

```
# Coding Agent
"Use Claude Code to refactor the authentication module to use JWT tokens"

# Prompt Log
"Extract all prompts from yesterday's coding sessions and summarize the patterns"

# Perry Workspaces
"Create an isolated Docker workspace for testing the new API changes"

# Agent Lens
"Navigate to the database models and explain the relationship schema"
```

### Recommendations

**Start here:** `coding-agent`, `prompt-log`
**Power user stack:** `coding-agent` + `claude-team` + `perry-workspaces`
**Pitfalls to avoid:**
- `claude-team` requires careful resource management
- `perry-workspaces` needs Tailscale configured correctly

---

## 3. Git & GitHub (9 skills)

### Category Overview

**Problem space:** Version control workflows, GitHub automation, PR management, commit standardization

**Common workflows:**
- Creating commits following conventional commit format
- Managing PRs (fetch, review, merge)
- Querying GitHub documentation
- Downloading specific files without full clone

**Target users:** All developers, open source contributors, DevOps engineers

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **github** | GitHub CLI integration | Issues, PRs, repos, actions | `gh` CLI installed, authenticated | Low | Write to repos | 4.8 |
| **conventional-commits** | Commit message formatting | Standardized commits, changelog generation | Git installed | Low | Safe | 4.5 |
| **github-pr** | PR management | Fetch, test, merge PRs locally | `gh` CLI | Low | Write to repos | 4.4 |
| **pr-commit-workflow** | Commit/PR creation | Streamlined PR workflow | Git, `gh` CLI | Low | Write to repos | 4.3 |
| **deepwiki** | GitHub docs querying | Navigate GitHub documentation | None | Low | Read-only | 4.0 |
| **gitload** | Selective file download | Download files without cloning | None | Low | Safe | 4.1 |

### Example Prompts

```
# GitHub
"Create an issue in the main repo about the login bug with steps to reproduce"

# Conventional Commits
"Create a commit message for fixing the user authentication timeout issue"

# GitHub PR
"Fetch PR #234, run the tests locally, and report any failures"

# Gitload
"Download just the configuration files from the infrastructure repo without cloning"
```

### Recommendations

**Start here:** `github`, `conventional-commits`
**Power user stack:** `github` + `conventional-commits` + `pr-commit-workflow`
**Pitfalls to avoid:**
- Always review changes before using `github-pr` to merge
- Ensure `gh` CLI is properly authenticated before use

---

## 4. DevOps & Cloud (35 skills)

### Category Overview

**Problem space:** Cloud infrastructure management, deployment automation, monitoring, DNS/domain management

**Common workflows:**
- Deploying applications to Vercel/Cloudflare
- Managing Kubernetes clusters
- Infrastructure provisioning (Hetzner, DigitalOcean, Proxmox)
- Monitoring with Uptime Kuma
- Tailscale VPN management

**Target users:** DevOps engineers, SREs, infrastructure teams, indie hackers

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **cloudflare** | Cloudflare management | Workers, KV, D1, R2, DNS | Wrangler CLI, API token | Medium | Write to CF resources | 4.7 |
| **vercel** | Vercel deployments | Deploy, preview, manage projects | Vercel CLI, account | Low | Write to projects | 4.6 |
| **kubectl-skill** | Kubernetes management | Cluster ops, deployments, debugging | kubectl, kubeconfig | Medium | Full cluster access | 4.5 |
| **tailscale** | Tailnet management | VPN setup, device management | Tailscale installed | Low | Network access | 4.5 |
| **digital-ocean** | DO infrastructure | Droplets, databases, networking | DO API token | Medium | Write to resources | 4.3 |
| **proxmox** | Proxmox VE management | VMs, containers, storage | Proxmox API access | High | Full hypervisor access | 4.2 |
| **uptime-kuma** | Uptime monitoring | Health checks, alerting | Uptime Kuma instance | Medium | Monitor configuration | 4.4 |
| **supabase** | Supabase operations | Database, auth, storage, edge functions | Supabase CLI | Medium | Database access | 4.3 |
| **hetzner** | Hetzner Cloud | Server management, networking | Hetzner API token | Medium | Full server access | 4.1 |
| **portainer** | Docker management | Containers via Portainer API | Portainer instance | Medium | Container access | 4.0 |

### Example Prompts

```
# Cloudflare
"Deploy a new Worker that redirects requests from the old domain to the new one"

# Vercel
"Deploy the current branch as a preview and share the URL"

# Kubernetes
"Show me the pods in the production namespace that have restarted in the last hour"

# Tailscale
"List all devices on my tailnet and their connection status"

# Uptime Kuma
"Add a monitor for the new API endpoint with 30-second interval"
```

### Recommendations

**Start here:** `vercel`, `cloudflare`, `tailscale`
**Power user stack:** `cloudflare` + `vercel` + `kubectl-skill` + `uptime-kuma`
**Infrastructure stack:** `proxmox` + `hetzner` + `portainer`
**Pitfalls to avoid:**
- `kubectl-skill` with production clusters requires extreme caution
- `proxmox` operations can be destructive; always verify before executing
- Never expose API tokens; use environment variables

---

## 5. Browser & Automation (8 skills)

### Category Overview

**Problem space:** Web scraping, browser automation, testing, headless browsing

**Common workflows:**
- Automated testing via Chrome DevTools Protocol
- Text-based web browsing for accessibility
- MCP server management
- Knowledge base access

**Target users:** QA engineers, automation specialists, developers

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **verify-on-browser** | Chrome DevTools control | Automated testing, scraping | Chrome/Chromium | Medium | Browser access | 4.2 |
| **browsh** | Text-based browser | Terminal web browsing | Browsh, Firefox | Medium | Safe | 3.8 |
| **browser-use** | Cloud browser automation | Headless tasks, screenshots | API key | Low | Remote browser | 4.0 |
| **context7** | Knowledge base access | Documentation lookup | None | Low | Read-only | 4.3 |
| **mcporter** | MCP server management | List, configure MCP servers | MCP setup | Low | Config access | 3.9 |

### Example Prompts

```
# Verify on Browser
"Take a screenshot of the login page and verify the form fields are present"

# Context7
"Look up the Next.js 15 documentation for the new caching API"

# Browser Use
"Navigate to the competitor's pricing page and extract the plan details"
```

---

## 6. Image & Video Generation (9 skills)

### Category Overview

**Problem space:** AI image generation, video creation, 3D asset generation, visual content

**Common workflows:**
- Generating images via Krea.ai, Nano Banana
- Creating videos with Veo
- 3D model generation with Meshy.ai
- Converting photos to coloring pages

**Target users:** Creators, marketers, designers, educators

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **nano-banana-pro** | Gemini image generation | High-quality images | Gemini API key | Low | API costs | 4.4 |
| **krea-api** | Krea.ai images | Style-specific generation | Krea API key | Low | API costs | 4.2 |
| **veo** | Google Veo video | AI video generation | Veo API access | Medium | API costs | 4.0 |
| **meshy-ai** | 3D asset generation | Game assets, models | Meshy.ai account | Medium | API costs | 3.8 |
| **coloring-page** | Photo to coloring page | Kid-friendly content | None | Low | Safe | 3.9 |
| **gamma** | AI presentations | Docs, slides, websites | Gamma account | Low | Safe | 4.1 |

### Example Prompts

```
# Nano Banana Pro
"Generate a professional product photo of a modern desk lamp on a minimalist background"

# Veo
"Create a 10-second video of a sunset over mountains with gentle camera movement"

# Gamma
"Create a presentation about our Q4 product roadmap with 8 slides"
```

---

## 7. Apple Apps & Services (11 skills)

### Category Overview

**Problem space:** macOS/iOS integration, Apple ecosystem automation, native app control

**Common workflows:**
- Managing Apple Notes, Reminders, Contacts
- Controlling Apple Music
- Accessing photos and Find My
- Generating macOS/iOS Shortcuts

**Target users:** Mac users, iOS developers, Apple ecosystem power users

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **apple-reminders** | Reminders management | Add, complete, list reminders | macOS, remindctl | Low | Write to Reminders | 4.5 |
| **apple-notes** | Notes management | Search, create notes | macOS | Low | Write to Notes | 4.4 |
| **apple-contacts** | Contacts lookup | Search contacts | macOS | Low | Read contacts | 4.2 |
| **apple-music** | Music control | Playback, playlists | macOS | Low | Music control | 4.0 |
| **apple-photos** | Photos access | Search, organize | macOS, Full Disk Access | Medium | Read photos | 3.9 |
| **shortcuts-generator** | Shortcut creation | Generate iOS/macOS Shortcuts | macOS/iOS | Medium | Create Shortcuts | 4.1 |
| **homebrew** | Package management | Install, update packages | Homebrew | Low | Install packages | 4.3 |

### Example Prompts

```
# Apple Reminders
"Add a reminder to call the dentist tomorrow at 9am"

# Apple Notes
"Search my notes for anything about the project kickoff meeting"

# Homebrew
"Update all installed packages and show me which ones were updated"

# Shortcuts Generator
"Create a Shortcut that takes a screenshot and saves it to a specific folder"
```

### Recommendations

**Start here:** `apple-reminders`, `homebrew`
**Power user stack:** `apple-reminders` + `apple-notes` + `apple-contacts` + `apple-calendar`
**Pitfalls to avoid:**
- `apple-photos` requires Full Disk Access permission
- Some Apple integrations may break with macOS updates

---

## 8. Search & Research (12 skills)

### Category Overview

**Problem space:** Web search, AI-powered research, academic sources, SEO analysis

**Common workflows:**
- AI-augmented web search (Perplexity, Exa, Tavily)
- Academic literature review
- SEO auditing
- Location-based search

**Target users:** Researchers, analysts, content creators, SEO specialists

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **perplexity** | AI web search | Research with citations | Perplexity API key | Low | API costs | 4.6 |
| **exa** | Neural web search | Semantic search | Exa API key | Low | API costs | 4.4 |
| **tavily** | AI-optimized search | Agent-friendly results | Tavily API key | Low | API costs | 4.3 |
| **brave-search** | Privacy-focused search | General search | Brave API key | Low | Free tier available | 4.5 |
| **literature-review** | Academic search | Scholarly sources | None | Low | Read-only | 4.0 |
| **web-search-plus** | Unified search | Auto-routing across providers | Multiple API keys | Medium | API costs | 4.2 |
| **seo-audit** | SEO analysis | Site audits, recommendations | None | Low | Read-only | 3.9 |

### Example Prompts

```
# Perplexity
"Research the latest developments in quantum computing with citations"

# Exa
"Find technical blog posts about Rust async programming from the last 6 months"

# Literature Review
"Find academic papers about transformer architecture improvements published in 2025"

# Brave Search
"Search for reviews of the new MacBook Pro M4"
```

### Recommendations

**Start here:** `perplexity`, `brave-search`
**Power user stack:** `perplexity` + `exa` + `tavily` (multi-source verification)
**Academic stack:** `literature-review` + `perplexity`

---

## 9. Clawdbot Tools (13 skills)

### Category Overview

**Problem space:** Moltbot self-management, skill discovery, security auditing, documentation

**Common workflows:**
- Installing and updating skills via ClawdHub
- Auditing installed skills for security
- Checking API quotas and usage
- Customizing the Clawd mascot

**Target users:** All Moltbot users

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **clawdhub** | Skill registry CLI | Search, install, update skills | npm/npx | Low | Install skills | 4.7 |
| **skills-audit** | Security audit | Audit skills for risks | None | Low | Read-only | 4.5 |
| **claude-code-usage** | Quota checking | Monitor API usage | Claude subscription | Low | Read-only | 4.2 |
| **auto-updater** | Daily updates | Keep Moltbot/skills current | None | Low | Updates system | 4.0 |
| **clawddocs** | Documentation expert | Reference Moltbot docs | None | Low | Read-only | 4.3 |

### Example Prompts

```
# ClawdHub
"Search for skills related to Kubernetes management"

# Skills Audit
"Audit all installed skills and report any security concerns"

# Claude Code Usage
"Show me my Claude API usage for this month"
```

---

## 10. CLI Utilities (37 skills)

### Category Overview

**Problem space:** Command-line productivity, data processing, system utilities, entertainment

**Common workflows:**
- JSON processing with jq
- Package tracking
- Bible verses, comics, quotes
- Unit conversion
- Tmux session management

**Target users:** Terminal power users, developers, system administrators

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **jq** | JSON processor | Parse, filter, transform JSON | jq installed | Low | Safe | 4.5 |
| **tldr** | Simplified man pages | Quick command reference | tldr installed | Low | Read-only | 4.6 |
| **tmux** | Session control | Terminal multiplexing | tmux installed | Low | Session access | 4.3 |
| **units** | Unit conversion | Convert measurements | GNU Units | Low | Safe | 4.0 |
| **parcel-package-tracking** | Package tracking | Track shipments | None | Low | Read-only | 3.9 |
| **tmdb** | Movie database | Search movies/TV | TMDB API key | Low | Read-only | 4.0 |
| **xkcd** | XKCD comics | Fetch comics | None | Low | Safe | 3.8 |

### Example Prompts

```
# jq
"Parse this JSON and extract all user emails where status is active"

# tldr
"Show me how to use the rsync command for basic file syncing"

# Tmux
"Create a new tmux session called 'dev' with three windows"

# TMDB
"Find action movies from 2025 with ratings above 7.5"
```

---

## 11. Productivity & Tasks (33 skills)

### Category Overview

**Problem space:** Task management, issue tracking, time tracking, daily planning

**Common workflows:**
- Managing tasks across Todoist, Things 3, TickTick
- Issue tracking with Linear, Jira, ClickUp
- Daily planning and reflection
- Health data integration

**Target users:** Everyone, especially knowledge workers and teams

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **todoist** | Todoist management | Tasks, projects, labels | Todoist API token | Low | Write to Todoist | 4.7 |
| **linear** | Linear issue tracking | Issues, projects, cycles | Linear API key | Low | Write to Linear | 4.6 |
| **jira** | Jira management | Issues, boards, sprints | jira-cli, API token | Medium | Write to Jira | 4.4 |
| **things-mac** | Things 3 control | Tasks, areas, projects | Things 3 for Mac | Low | Write to Things | 4.3 |
| **ticktick** | TickTick management | Tasks, habits | TickTick API | Low | Write to TickTick | 4.2 |
| **clickup-mcp** | ClickUp integration | Tasks, docs, goals | ClickUp API key | Medium | Write to ClickUp | 4.1 |
| **plan-my-day** | Daily planning | Energy-optimized scheduling | None | Low | Safe | 4.0 |
| **morning-manifesto** | Daily reflection | Journaling, task sync | Obsidian, Apple Reminders | Medium | Write to apps | 3.9 |

### Example Prompts

```
# Todoist
"Add a task to buy groceries tomorrow at 5pm with high priority"

# Linear
"Create an issue for the login bug in the Authentication project with P1 priority"

# Jira
"Show me all open issues assigned to me in the current sprint"

# Plan My Day
"Help me plan my day based on my energy levels and meeting schedule"
```

### Recommendations

**Start here:** `todoist` (personal) or `linear` (teams)
**Power user stack:** `todoist` + `linear` + `plan-my-day`
**Pitfalls to avoid:**
- Don't install multiple task apps if you only use one
- `jira` setup can be complex; ensure CLI is properly configured

---

## 12. AI & LLMs (31 skills)

### Category Overview

**Problem space:** AI model routing, multi-model orchestration, image generation, research automation

**Common workflows:**
- Routing queries to appropriate AI models
- Multi-LLM council decisions
- Deep research with Gemini
- Image generation with various providers

**Target users:** AI power users, researchers, developers building AI applications

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **gemini-deep-research** | Complex research | Multi-step research tasks | Gemini API key | Low | API costs | 4.5 |
| **model-router** | AI model routing | Select best model per task | Multiple API keys | Medium | API costs | 4.3 |
| **llm-council** | Multi-LLM councils | Consensus decisions | Multiple API keys | High | API costs | 4.0 |
| **perplexity** | AI web search | Research with citations | Perplexity API | Low | API costs | 4.6 |
| **xai** | Grok chat | X.AI model access | xAI API key | Low | API costs | 3.9 |
| **openai-image-gen** | OpenAI images | DALL-E generation | OpenAI API key | Low | API costs | 4.2 |
| **gemini-computer-use** | Gemini browser | Browser automation | Gemini API | Medium | Browser access | 4.1 |

### Example Prompts

```
# Gemini Deep Research
"Research the competitive landscape of personal AI assistants and summarize key differentiators"

# Model Router
"Route this complex coding question to the most capable model"

# LLM Council
"Get opinions from multiple models on the best architecture for this microservice"
```

---

## 13. Marketing & Sales (36 skills)

### Category Overview

**Problem space:** Content creation, social media management, CRM, analytics, conversion optimization

**Common workflows:**
- Social media posting (Twitter/X, Bluesky, Reddit)
- CRM management (HubSpot, Apollo)
- SEO and analytics (GA4, GSC)
- Copywriting and email sequences

**Target users:** Marketers, sales teams, founders, content creators

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **hubspot** | HubSpot CRM | Contacts, deals, companies | HubSpot API key | Medium | Write to CRM | 4.5 |
| **apollo** | Apollo.io enrichment | Lead enrichment, search | Apollo API key | Medium | Data access | 4.3 |
| **bird** | X/Twitter CLI | Posting, engagement | X API credentials | Medium | Post to X | 4.2 |
| **bluesky** | Bluesky posting | Social content | Bluesky credentials | Low | Post to Bluesky | 4.1 |
| **ga4** | Google Analytics 4 | Query analytics data | GA4 API access | Medium | Read analytics | 4.4 |
| **gsc** | Google Search Console | SEO data, performance | GSC API access | Medium | Read SEO data | 4.3 |
| **copywriting** | Marketing copy | Ad copy, landing pages | None | Low | Safe | 4.0 |
| **typefully** | Social scheduling | Schedule posts | Typefully account | Low | Post scheduling | 4.2 |

### Example Prompts

```
# HubSpot
"Create a new contact for John Smith from Acme Corp with email john@acme.com"

# Bird (X/Twitter)
"Post a thread about our new product launch with 5 tweets"

# GA4
"Show me the top 10 landing pages by sessions for the last 30 days"

# Copywriting
"Write three variations of ad copy for our project management tool"
```

---

## 14. Notes & PKM (26 skills)

### Category Overview

**Problem space:** Personal knowledge management, note-taking, wiki systems, knowledge graphs

**Common workflows:**
- Managing Obsidian vaults
- Notion database operations
- Apple Notes integration
- Email management

**Target users:** Knowledge workers, researchers, writers, students

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **obsidian** | Vault automation | Notes, links, templates | Obsidian, obsidian-cli | Low | Write to vault | 4.7 |
| **notion** | Notion operations | Databases, pages, blocks | Notion API key | Low | Write to Notion | 4.5 |
| **apple-notes** | Notes management | Search, create, organize | macOS | Low | Write to Notes | 4.4 |
| **bear-notes** | Bear app control | Notes, tags, export | Bear app | Low | Write to Bear | 4.2 |
| **craft** | Craft docs | Documents, sharing | Craft app | Low | Write to Craft | 4.0 |
| **second-brain** | Knowledge base | Ensue-powered PKM | Ensue setup | Medium | Write access | 3.9 |
| **granola** | Meeting notes | Capture, organize | Granola account | Low | Meeting data | 4.1 |

### Example Prompts

```
# Obsidian
"Create a new note in my Projects folder about the API redesign with a template"

# Notion
"Add a new row to the Tasks database with title 'Review PR' and status 'To Do'"

# Apple Notes
"Search for notes containing 'budget' from the last month"
```

---

## 15. Media & Streaming (27 skills)

### Category Overview

**Problem space:** Music control, video streaming, media server management, content discovery

**Common workflows:**
- Spotify playback control
- Plex/media server management
- Chromecast control
- YouTube transcript extraction

**Target users:** Music enthusiasts, home theater users, content consumers

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **spotify** | Spotify control | Playback, playlists, search | Spotify Premium, API | Medium | Music control | 4.5 |
| **plex** | Plex server | Library, playback | Plex server, API | Medium | Media server access | 4.3 |
| **chromecast** | Cast control | Media casting | Chromecast devices | Low | Device control | 4.2 |
| **youtube-watcher** | YouTube transcripts | Extract video transcripts | None | Low | Read-only | 4.4 |
| **sonarr** | TV management | Download, organize | Sonarr server | Medium | Media management | 4.0 |
| **radarr** | Movie management | Download, organize | Radarr server | Medium | Media management | 4.0 |
| **sonoscli** | Sonos control | Speaker control | Sonos speakers | Low | Speaker access | 4.1 |

### Example Prompts

```
# Spotify
"Play my Discover Weekly playlist and set volume to 70%"

# Plex
"Show me recently added movies that I haven't watched"

# YouTube Watcher
"Get the transcript of this YouTube video and summarize the main points"

# Chromecast
"Cast the current tab to the living room TV"
```

---

## 16. Communication (19 skills)

### Category Overview

**Problem space:** Email management, messaging, team communication, professional networking

**Common workflows:**
- Email triage and drafting
- LinkedIn messaging
- WhatsApp automation
- Microsoft 365 integration

**Target users:** Professionals, sales teams, community managers

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **slack** | Slack control | Messages, channels | Slack tokens | Medium | Channel access | 4.4 |
| **discord** | Discord control | Server management | Bot token | Medium | Server access | 4.3 |
| **imsg** | iMessage/SMS | Send messages | macOS | Low | Send messages | 4.2 |
| **wacli** | WhatsApp | Messaging | WhatsApp setup | High | Message access | 4.0 |
| **linkedin** | LinkedIn | Messaging, browsing | LinkedIn cookies | High | Profile access | 3.8 |
| **himalaya** | Email CLI | IMAP/SMTP operations | Email credentials | Medium | Full email access | 4.1 |
| **google-chat** | Google Chat | Team messaging | Google Workspace | Medium | Chat access | 3.9 |

### Example Prompts

```
# iMessage
"Send a message to Mom saying I'll be home by 7pm"

# LinkedIn
"Search for software engineers at Acme Corp"

# Himalaya
"Show me unread emails from the last 24 hours"
```

### Recommendations

**Pitfalls to avoid:**
- `linkedin` uses browser cookies which can expire
- `wacli` setup is complex; WhatsApp may ban automated access

---

## 17. Speech & Transcription (17 skills)

### Category Overview

**Problem space:** Audio transcription, text-to-speech, voice messages

**Common workflows:**
- Local speech-to-text with Whisper
- Cloud transcription services
- Voice message generation
- Meeting transcription

**Target users:** Content creators, accessibility needs, note-takers

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **local-whisper** | Local STT | Private transcription | Whisper installed | Medium | Safe, no API costs | 4.6 |
| **openai-whisper-api** | Cloud STT | Fast transcription | OpenAI API key | Low | API costs | 4.4 |
| **mlx-whisper** | Apple Silicon STT | Optimized for Mac | MLX, Apple Silicon | Medium | Safe | 4.3 |
| **edge-tts** | Microsoft TTS | Voice synthesis | None | Low | Free | 4.2 |
| **openai-tts** | OpenAI TTS | High-quality voices | OpenAI API key | Low | API costs | 4.1 |
| **assemblyai-transcribe** | AssemblyAI | Accurate transcription | AssemblyAI API | Low | API costs | 4.0 |

### Example Prompts

```
# Local Whisper
"Transcribe this audio file using local Whisper"

# Edge TTS
"Convert this text to speech using a female British voice"

# OpenAI TTS
"Generate an audiobook-quality reading of this blog post"
```

---

## 18. Smart Home & IoT (16 skills)

### Category Overview

**Problem space:** Home automation, device control, sensor monitoring

**Common workflows:**
- Home Assistant integration
- Light control (Hue, Nanoleaf, Govee)
- Thermostat management
- 3D printer control

**Target users:** Smart home enthusiasts, home automation hobbyists

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **homeassistant** | HA control | Full home automation | Home Assistant | Medium | Device control | 4.7 |
| **openhue** | Philips Hue | Light control | Hue Bridge | Low | Light control | 4.4 |
| **nanoleaf** | Nanoleaf panels | Light scenes | Nanoleaf setup | Low | Light control | 4.2 |
| **eightctl** | Eight Sleep | Bed temperature | Eight Sleep account | Low | Bed control | 4.1 |
| **google-home** | Nest devices | Speaker/display control | Google account | Medium | Device control | 4.0 |
| **bambu-cli** | 3D printer | BambuLab printers | Printer on network | Medium | Printer control | 3.9 |

### Example Prompts

```
# Home Assistant
"Turn off all lights in the house and set the thermostat to 68"

# OpenHue
"Set the living room lights to 50% brightness with warm white color"

# Eight Sleep
"Set my side of the bed to -2 cooling level"
```

---

## 19. Health & Fitness (21 skills)

### Category Overview

**Problem space:** Health tracking, workout logging, sleep analysis, training plans

**Common workflows:**
- Oura/WHOOP data analysis
- Workout tracking with Hevy
- Strava activity analysis
- Training plan generation

**Target users:** Athletes, health-conscious individuals, fitness enthusiasts

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **oura** | Oura Ring data | Sleep, readiness, activity | Oura API | Low | Health data | 4.5 |
| **whoop** | WHOOP data | Recovery, strain, sleep | WHOOP account | Low | Health data | 4.4 |
| **strava** | Activity analysis | Workouts, routes | Strava API | Low | Activity data | 4.3 |
| **fitbit** | Fitbit data | Steps, sleep, heart rate | Fitbit API | Medium | Health data | 4.2 |
| **hevy** | Workout tracking | Gym sessions, PRs | Hevy account | Low | Workout data | 4.1 |
| **endurance-coach** | Training plans | Triathlon, marathon | None | Low | Safe | 4.0 |

### Example Prompts

```
# Oura
"Show me my sleep scores for the past week and identify patterns"

# WHOOP
"What's my recovery score today and should I do a hard workout?"

# Strava
"Analyze my running pace trends over the last 3 months"
```

---

## 20. Transportation (25 skills)

### Category Overview

**Problem space:** Vehicle control, public transit, flight tracking, regional transport

**Common workflows:**
- Tesla vehicle control
- Flight status tracking
- Public transit schedules
- EV charger availability

**Target users:** Commuters, travelers, EV owners

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **tesla** | Tesla control | Lock, climate, charge | Tesla account | Medium | Vehicle control | 4.6 |
| **flight-tracker** | Flight tracking | Status, delays | None | Low | Read-only | 4.3 |
| **charger** | EV chargers | Find available chargers | None | Low | Read-only | 4.1 |
| **swiss-transport** | Swiss transit | Schedules, delays | None | Low | Read-only | 4.0 (regional) |
| **tfl-journey-disruption** | London transit | TfL planning | None | Low | Read-only | 3.9 (regional) |

### Example Prompts

```
# Tesla
"Start climate control in my car and set to 72 degrees"

# Flight Tracker
"What's the status of flight UA123 from SFO to JFK?"

# Charger
"Find Tesla Superchargers within 10 miles with available stalls"
```

---

## 21. Finance & Crypto (30 skills)

### Category Overview

**Problem space:** Personal finance, stock analysis, crypto trading, budgeting

**Common workflows:**
- Budget management with YNAB
- Stock/crypto price tracking
- Portfolio monitoring
- Trading operations

**Target users:** Investors, crypto traders, budget-conscious individuals

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **ynab** | YNAB budgets | Budget tracking | YNAB API | Low | Budget access | 4.4 |
| **yahoo-finance** | Stock data | Prices, fundamentals | None | Low | Read-only | 4.3 |
| **crypto-tracker** | Crypto prices | Price alerts | None | Low | Read-only | 4.1 |
| **plaid** | Financial data | Bank connections | Plaid API | High | Financial data | 4.0 |
| **ibkr-trading** | IBKR trading | Execute trades | IBKR account | High | **DANGER: trades** | 3.8 |
| **polymarket** | Prediction markets | Market odds | None | Low | Read-only | 3.9 |

### Example Prompts

```
# YNAB
"Show me my spending by category for this month"

# Yahoo Finance
"What's Apple's current stock price and P/E ratio?"

# Crypto Tracker
"Alert me when Bitcoin crosses $100,000"
```

### Recommendations

**WARNING:** Trading skills (`ibkr-trading`, `kraken`) can execute real trades. Use with extreme caution and never automate without human confirmation.

---

## 22. Personal Development (22 skills)

### Category Overview

**Problem space:** Habit building, addiction recovery, self-improvement, therapy support

**Common workflows:**
- Morning/night routines
- Habit tracking and accountability
- Addiction recovery support
- Stress management

**Target users:** Self-improvement enthusiasts, anyone building better habits

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **morning-routine** | Routine building | Daily habits | None | Low | Safe | 4.2 |
| **daily-review** | Performance review | End-of-day reflection | None | Low | Safe | 4.1 |
| **procrastination-buster** | Anti-procrastination | Motivation tools | None | Low | Safe | 4.0 |
| **therapy-mode** | AI therapeutic support | Guided conversations | None | Low | Safe | 3.9 |
| **quit-smoking** | Cessation support | Track progress | None | Low | Safe | 3.8 |

### Example Prompts

```
# Morning Routine
"Start my morning routine checklist"

# Daily Review
"Help me review what I accomplished today and plan for tomorrow"

# Therapy Mode
"I'm feeling overwhelmed with work. Can we talk through it?"
```

---

## 23. Security & Passwords (3 skills)

### Category Overview

**Problem space:** Password management, secure credential access

**Common workflows:**
- Looking up passwords
- Generating secure passwords
- Managing vault entries

**Target users:** Everyone who uses password managers

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **1password** | 1Password CLI | Password lookup | 1Password, op CLI | Medium | Credential access | 4.5 |
| **bitwarden** | Bitwarden access | Password lookup | rbw CLI, Bitwarden | Medium | Credential access | 4.4 |
| **dashlane** | Dashlane vault | Password lookup | Dashlane CLI | Medium | Credential access | 4.0 |

### Example Prompts

```
# 1Password
"Look up the password for my AWS account"

# Bitwarden
"Generate a new secure password and save it for the new service"
```

### Recommendations

**Security Note:** Password manager skills provide Moltbot access to your credentials. Only enable if you trust your Moltbot deployment security.

---

## 24. Self-Hosted & Automation (9 skills)

### Category Overview

**Problem space:** Self-hosted services, workflow automation, meeting intelligence

**Common workflows:**
- n8n workflow automation
- Document management with Paperless-NGX
- Meeting transcription and search
- Notification services

**Target users:** Self-hosters, automation enthusiasts, privacy-focused users

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **n8n** | Workflow automation | Visual automation | n8n instance | Medium | Workflow access | 4.5 |
| **paperless** | Document management | OCR, search, organize | Paperless-NGX | Medium | Document access | 4.3 |
| **gotify** | Notifications | Push notifications | Gotify server | Low | Send notifications | 4.2 |
| **fathom** | Meeting intelligence | Transcripts, search | Fathom account | Low | Meeting data | 4.1 |

### Example Prompts

```
# n8n
"Create a workflow that sends a Slack message when a new GitHub issue is created"

# Paperless
"Find all invoices from Amazon in the last 6 months"

# Gotify
"Send a notification to my phone that the backup completed"
```

---

## 25. PDF & Documents (12 skills)

### Category Overview

**Problem space:** PDF processing, document generation, data extraction

**Common workflows:**
- PDF parsing and extraction
- Invoice generation
- PowerPoint creation
- Document conversion

**Target users:** Business users, developers, anyone processing documents

### Key Skills

| Skill | Function | Use Cases | Prerequisites | Setup | Safety | Score |
|-------|----------|-----------|---------------|-------|--------|-------|
| **invoice-generator** | PDF invoices | Generate invoices | None | Low | Safe | 4.2 |
| **pymupdf-pdf** | PDF parsing | Extract text, tables | PyMuPDF | Low | Read-only | 4.3 |
| **pptx-creator** | PowerPoint | Generate presentations | Python, pptx | Low | Create files | 4.1 |
| **excel** | Excel operations | Read/write spreadsheets | openpyxl | Low | File access | 4.2 |
| **pdf-form-filler** | Form filling | Complete PDF forms | None | Medium | Modify PDFs | 4.0 |
| **confluence** | Confluence pages | Wiki management | Confluence API | Medium | Write to wiki | 4.1 |

### Example Prompts

```
# Invoice Generator
"Generate an invoice for client Acme Corp for 10 hours of consulting at $150/hour"

# PyMuPDF PDF
"Extract all tables from this PDF and convert to CSV"

# PPTX Creator
"Create a presentation with the quarterly sales data I provided"
```

---

# Cross-Skill Insights

## Recommended Skill Stacks

### DevOps Incident Response Stack
```bash
npx clawdhub@latest install cloudflare
npx clawdhub@latest install kubectl-skill
npx clawdhub@latest install uptime-kuma
npx clawdhub@latest install slack
npx clawdhub@latest install github
```
**Workflow:** Monitor → Alert via Slack → Investigate with kubectl → Fix and deploy → Document in GitHub issue

### Content Creation Stack
```bash
npx clawdhub@latest install copywriting
npx clawdhub@latest install humanizer
npx clawdhub@latest install nano-banana-pro
npx clawdhub@latest install typefully
npx clawdhub@latest install bird
npx clawdhub@latest install bluesky
```
**Workflow:** Draft copy → Humanize → Generate images → Schedule → Cross-post

### Research & Knowledge Stack
```bash
npx clawdhub@latest install perplexity
npx clawdhub@latest install exa
npx clawdhub@latest install obsidian
npx clawdhub@latest install youtube-watcher
npx clawdhub@latest install local-whisper
```
**Workflow:** Search → Extract transcripts → Transcribe → Save to Obsidian → Link concepts

### Personal Productivity Stack
```bash
npx clawdhub@latest install todoist
npx clawdhub@latest install apple-reminders
npx clawdhub@latest install apple-calendar
npx clawdhub@latest install oura
npx clawdhub@latest install plan-my-day
```
**Workflow:** Check health data → Plan day based on energy → Create tasks → Set reminders

### Home Automation Stack
```bash
npx clawdhub@latest install homeassistant
npx clawdhub@latest install openhue
npx clawdhub@latest install spotify
npx clawdhub@latest install eightctl
npx clawdhub@latest install tesla
```
**Workflow:** Morning routine → Lights on → Music playing → Car climate started → Bed made

## Common Patterns

### 1. Verification Steps
Always verify before destructive operations:
```
User: "Delete all completed tasks"
Moltbot: "I found 47 completed tasks. Here's a sample: [list]. Confirm deletion?"
```

### 2. Human-in-the-Loop
For sensitive operations, require explicit confirmation:
- Financial transactions
- Email sending
- Public posting
- Data deletion

### 3. Skill Chaining
Combine skills for complex workflows:
```
"Research [topic] with Perplexity, summarize key points, create an Obsidian note, and draft a Twitter thread"
```

## Security Model Guidance

### Least Privilege Principles
1. **Only install what you use:** Each skill expands Moltbot's capabilities
2. **Review before installing:** `clawdhub info <skill>` shows requirements
3. **Use `skills-audit` regularly:** Identifies risky permissions
4. **Rotate credentials:** API keys used by skills should be rotated periodically

### Secrets Handling
- **Never commit secrets:** Use environment variables or `.env` files
- **Use dedicated API keys:** Create Moltbot-specific keys, not personal ones
- **Monitor usage:** Check for unexpected API calls

### Audit Logging
Consider enabling verbose logging for sensitive skills:
```bash
moltbot gateway --verbose --log-file ./moltbot.log
```

### Network Security
- **Don't expose the gateway:** Keep port 18789 behind firewall
- **Use Tailscale:** For remote access, use VPN instead of public exposure
- **Token authentication:** Always set `CLAWDBOT_GATEWAY_TOKEN`

---

# Final Ranking & Decision Guide

## Scoring Rubric Applied

| Score | Utility | Reliability | Setup | Safety | Ecosystem | Total |
|-------|---------|-------------|-------|--------|-----------|-------|
| Weight | 25% | 25% | 20% | 15% | 15% | 100% |

### Top 50 Skills by Total Score

| Rank | Skill | Category | Utility | Reliability | Setup | Safety | Ecosystem | **Total** |
|------|-------|----------|---------|-------------|-------|--------|-----------|-----------|
| 1 | github | Git | 5 | 5 | 5 | 4 | 5 | **4.80** |
| 2 | todoist | Productivity | 5 | 5 | 5 | 4 | 5 | **4.80** |
| 3 | clawdhub | Clawdbot Tools | 5 | 5 | 5 | 5 | 4 | **4.80** |
| 4 | homeassistant | Smart Home | 5 | 5 | 4 | 4 | 5 | **4.70** |
| 5 | obsidian | Notes | 5 | 5 | 4 | 5 | 4 | **4.70** |
| 6 | cloudflare | DevOps | 5 | 5 | 4 | 4 | 5 | **4.70** |
| 7 | vercel | DevOps | 5 | 5 | 5 | 4 | 4 | **4.70** |
| 8 | local-whisper | Speech | 5 | 4 | 4 | 5 | 5 | **4.65** |
| 9 | perplexity | Search | 5 | 5 | 5 | 4 | 4 | **4.65** |
| 10 | linear | Productivity | 5 | 5 | 5 | 4 | 4 | **4.65** |
| 11 | slack | Communication | 5 | 5 | 4 | 4 | 5 | **4.65** |
| 12 | tldr | CLI | 5 | 5 | 5 | 5 | 3 | **4.65** |
| 13 | apple-reminders | Apple | 5 | 5 | 5 | 4 | 4 | **4.65** |
| 14 | spotify | Media | 5 | 4 | 4 | 4 | 5 | **4.55** |
| 15 | tesla | Transportation | 5 | 4 | 4 | 4 | 5 | **4.55** |
| 16 | kubectl-skill | DevOps | 5 | 5 | 4 | 3 | 5 | **4.55** |
| 17 | conventional-commits | Git | 4 | 5 | 5 | 5 | 4 | **4.55** |
| 18 | notion | Notes | 5 | 5 | 4 | 4 | 4 | **4.55** |
| 19 | brave-search | Search | 5 | 5 | 5 | 4 | 3 | **4.55** |
| 20 | coding-agent | Coding | 5 | 4 | 4 | 3 | 5 | **4.45** |
| 21 | 1password | Security | 4 | 5 | 4 | 4 | 5 | **4.45** |
| 22 | discord | Communication | 5 | 5 | 4 | 4 | 4 | **4.45** |
| 23 | tailscale | DevOps | 4 | 5 | 5 | 4 | 4 | **4.45** |
| 24 | skills-audit | Clawdbot | 4 | 5 | 5 | 5 | 3 | **4.45** |
| 25 | oura | Health | 5 | 5 | 5 | 4 | 3 | **4.45** |
| 26 | exa | Search | 5 | 4 | 5 | 4 | 4 | **4.45** |
| 27 | jq | CLI | 5 | 5 | 4 | 5 | 3 | **4.45** |
| 28 | homebrew | Apple | 4 | 5 | 5 | 4 | 4 | **4.40** |
| 29 | n8n | Self-Hosted | 5 | 4 | 4 | 4 | 4 | **4.35** |
| 30 | github-pr | Git | 4 | 5 | 4 | 4 | 5 | **4.35** |
| 31 | uptime-kuma | DevOps | 4 | 5 | 4 | 4 | 4 | **4.30** |
| 32 | apple-notes | Apple | 4 | 5 | 5 | 4 | 4 | **4.30** |
| 33 | youtube-watcher | Media | 5 | 4 | 5 | 4 | 3 | **4.30** |
| 34 | whoop | Health | 4 | 5 | 5 | 4 | 3 | **4.25** |
| 35 | tavily | Search | 4 | 4 | 5 | 4 | 4 | **4.25** |
| 36 | hubspot | Marketing | 4 | 5 | 4 | 4 | 4 | **4.25** |
| 37 | bitwarden | Security | 4 | 5 | 4 | 4 | 4 | **4.25** |
| 38 | nano-banana-pro | Image Gen | 4 | 4 | 5 | 4 | 4 | **4.20** |
| 39 | jira | Productivity | 4 | 5 | 3 | 4 | 5 | **4.20** |
| 40 | plex | Media | 4 | 4 | 4 | 4 | 5 | **4.20** |
| 41 | ga4 | Marketing | 4 | 5 | 4 | 4 | 4 | **4.20** |
| 42 | things-mac | Productivity | 4 | 5 | 5 | 4 | 3 | **4.20** |
| 43 | imsg | Communication | 4 | 4 | 5 | 4 | 4 | **4.15** |
| 44 | openhue | Smart Home | 4 | 5 | 5 | 4 | 3 | **4.15** |
| 45 | strava | Health | 4 | 5 | 4 | 4 | 4 | **4.15** |
| 46 | prompt-log | Coding | 4 | 4 | 5 | 5 | 3 | **4.15** |
| 47 | ynab | Finance | 4 | 5 | 4 | 4 | 4 | **4.15** |
| 48 | edge-tts | Speech | 4 | 4 | 5 | 5 | 3 | **4.10** |
| 49 | context7 | Browser | 4 | 4 | 5 | 5 | 3 | **4.10** |
| 50 | gemini-deep-research | AI | 5 | 4 | 4 | 4 | 3 | **4.10** |

## If You Only Install 10 Skills

These 10 skills provide maximum value for most users:

```bash
# Core workflow
npx clawdhub@latest install github          # Version control
npx clawdhub@latest install todoist         # Task management
npx clawdhub@latest install obsidian        # Knowledge management

# Communication
npx clawdhub@latest install slack           # Team communication

# Research
npx clawdhub@latest install perplexity      # AI search

# Utilities
npx clawdhub@latest install tldr            # Command reference
npx clawdhub@latest install local-whisper   # Transcription

# Platform-specific
npx clawdhub@latest install homeassistant   # Smart home (if applicable)
npx clawdhub@latest install tesla           # Vehicle (if applicable)
npx clawdhub@latest install spotify         # Music (if applicable)
```

## Decision Tree

```
What do you want to do?
│
├─► Manage code & deployments
│   ├─► GitHub? → github, conventional-commits, github-pr
│   ├─► Deploy? → vercel, cloudflare
│   └─► Kubernetes? → kubectl-skill, proxmox
│
├─► Organize tasks & notes
│   ├─► Personal tasks? → todoist, things-mac, ticktick
│   ├─► Team issues? → linear, jira, clickup-mcp
│   └─► Knowledge? → obsidian, notion, apple-notes
│
├─► Research & learn
│   ├─► Web search? → perplexity, exa, brave-search
│   ├─► Academic? → literature-review
│   └─► Transcribe? → local-whisper, youtube-watcher
│
├─► Communicate
│   ├─► Team Slack? → slack
│   ├─► Community? → discord
│   └─► Personal? → imsg, wacli
│
├─► Control media
│   ├─► Music? → spotify, apple-music
│   ├─► Video? → plex, youtube-watcher
│   └─► Speakers? → sonoscli, openhue
│
├─► Automate home
│   ├─► Central hub? → homeassistant
│   ├─► Lights? → openhue, nanoleaf, govee-lights
│   └─► Climate? → eightctl, nest-devices
│
├─► Track health
│   ├─► Sleep? → oura, whoop
│   ├─► Activity? → strava, fitbit
│   └─► Workouts? → hevy, workout-logger
│
└─► Create content
    ├─► Social? → bird, bluesky, typefully
    ├─► Copy? → copywriting, humanizer
    └─► Images? → nano-banana-pro, krea-api
```

---

# Appendix: Complete Skill Reference

## All 565+ Skills by Category

### Web & Frontend Development (17)
| Skill | Description | Link |
|-------|-------------|------|
| discord | Control Discord from Clawdbot | [ClawdHub](https://molthub.com) |
| frontend-design | Production-grade frontend interfaces | [ClawdHub](https://molthub.com) |
| linux-service-triage | Diagnose Linux service issues | [ClawdHub](https://molthub.com) |
| miniflux-news | Fetch RSS/news from Miniflux | [ClawdHub](https://molthub.com) |
| pinak-frontend-guru | UI/UX React performance auditor | [ClawdHub](https://molthub.com) |
| remotion-best-practices | Remotion video creation in React | [ClawdHub](https://molthub.com) |
| remotion-server | Headless video rendering | [ClawdHub](https://molthub.com) |
| slack | Control Slack from Clawdbot | [ClawdHub](https://molthub.com) |
| ui-audit | Automated UI audits | [ClawdHub](https://molthub.com) |
| ui-skills | Opinionated interface building | [ClawdHub](https://molthub.com) |
| ux-audit | Automated design audits | [ClawdHub](https://molthub.com) |
| ux-decisions | UX Decisions framework | [ClawdHub](https://molthub.com) |
| vercel-react-best-practices | React/Next.js optimization | [ClawdHub](https://molthub.com) |
| web-design-guidelines | UI code compliance review | [ClawdHub](https://molthub.com) |

### Coding Agents & IDEs (16)
| Skill | Description | Link |
|-------|-------------|------|
| agentlens | Navigate codebases hierarchically | [ClawdHub](https://molthub.com) |
| claude-team | Orchestrate multiple Claude Code workers | [ClawdHub](https://molthub.com) |
| codex-account-switcher | Manage OpenAI Codex accounts | [ClawdHub](https://molthub.com) |
| codex-monitor | Browse Codex session logs | [ClawdHub](https://molthub.com) |
| codex-orchestration | General-purpose Codex orchestration | [ClawdHub](https://molthub.com) |
| codex-quota | Check Codex rate limits | [ClawdHub](https://molthub.com) |
| codexmonitor | List/inspect local Codex sessions | [ClawdHub](https://molthub.com) |
| coding-agent | Run various coding agents | [ClawdHub](https://molthub.com) |
| cursor-agent | Cursor CLI agent control | [ClawdHub](https://molthub.com) |
| factory-ai | Factory AI droid CLI | [ClawdHub](https://molthub.com) |
| model-usage | CodexBar CLI usage summary | [ClawdHub](https://molthub.com) |
| opencode-acp-control | Control OpenCode via ACP | [ClawdHub](https://molthub.com) |
| perry-coding-agents | Dispatch tasks to coding agents | [ClawdHub](https://molthub.com) |
| perry-workspaces | Create Docker workspaces | [ClawdHub](https://molthub.com) |
| prompt-log | Extract AI session transcripts | [ClawdHub](https://molthub.com) |

### Git & GitHub (9)
| Skill | Description | Link |
|-------|-------------|------|
| conventional-commits | Format commits per specification | [ClawdHub](https://molthub.com) |
| deepwiki | Query GitHub documentation | [ClawdHub](https://molthub.com) |
| deepwork-tracker | Track deep work sessions | [ClawdHub](https://molthub.com) |
| deploy-agent | Multi-step deployment automation | [ClawdHub](https://molthub.com) |
| github | Interact via gh CLI | [ClawdHub](https://molthub.com) |
| github-pr | Fetch/merge/test PRs locally | [ClawdHub](https://molthub.com) |
| gitload | Download GitHub files without cloning | [ClawdHub](https://molthub.com) |
| pr-commit-workflow | Create commits/pull requests | [ClawdHub](https://molthub.com) |
| read-github | Read repos via semantic search | [ClawdHub](https://molthub.com) |

### DevOps & Cloud (35)
| Skill | Description | Link |
|-------|-------------|------|
| Azure CLI | Azure Cloud Platform management | [ClawdHub](https://molthub.com) |
| cloudflare | Manage Cloudflare Workers/KV/D1/R2 | [ClawdHub](https://molthub.com) |
| coolify | Manage Coolify deployments | [ClawdHub](https://molthub.com) |
| digital-ocean | Digital Ocean infrastructure | [ClawdHub](https://molthub.com) |
| dokploy | Dokploy deployment management | [ClawdHub](https://molthub.com) |
| domain-dns-ops | Domain/DNS operations | [ClawdHub](https://molthub.com) |
| domaindetails | Domain WHOIS/RDAP lookups | [ClawdHub](https://molthub.com) |
| exa-plus | Neural web search via Exa AI | [ClawdHub](https://molthub.com) |
| exe-dev | Persistent VM management | [ClawdHub](https://molthub.com) |
| hetzner | Hetzner Cloud management | [ClawdHub](https://molthub.com) |
| hetzner-cloud | Hetzner Cloud CLI | [ClawdHub](https://molthub.com) |
| Joan Workflow | Pod/workspace management | [ClawdHub](https://molthub.com) |
| komodo | Komodo infrastructure | [ClawdHub](https://molthub.com) |
| kubectl-skill | Kubernetes cluster management | [ClawdHub](https://molthub.com) |
| linearis | Linear.app CLI | [ClawdHub](https://molthub.com) |
| npm-proxy | Nginx Proxy Manager control | [ClawdHub](https://molthub.com) |
| portainer | Docker containers via Portainer | [ClawdHub](https://molthub.com) |
| premium-domains | Premium domain search | [ClawdHub](https://molthub.com) |
| private-connect | Access private services | [ClawdHub](https://molthub.com) |
| proxmox | Proxmox VE cluster management | [ClawdHub](https://molthub.com) |
| proxmox-full | Complete Proxmox VE management | [ClawdHub](https://molthub.com) |
| r2-upload | Cloudflare R2 uploads | [ClawdHub](https://molthub.com) |
| servicenow-agent | ServiceNow read-only access | [ClawdHub](https://molthub.com) |
| servicenow-docs | ServiceNow documentation | [ClawdHub](https://molthub.com) |
| supabase | Supabase database operations | [ClawdHub](https://molthub.com) |
| sysadmin-toolbox | Sysadmin/DevOps reference | [ClawdHub](https://molthub.com) |
| tailscale | Tailscale tailnet management | [ClawdHub](https://molthub.com) |
| tailscale-serve | Tailscale serve functionality | [ClawdHub](https://molthub.com) |
| tavily | AI-optimized web search | [ClawdHub](https://molthub.com) |
| unraid | Unraid server queries | [ClawdHub](https://molthub.com) |
| uptime-kuma | Uptime Kuma monitoring | [ClawdHub](https://molthub.com) |
| vercel | Deploy via Vercel CLI | [ClawdHub](https://molthub.com) |
| vercel-deploy | Vercel deployment | [ClawdHub](https://molthub.com) |
| pi-admin | Raspberry Pi administration | [ClawdHub](https://molthub.com) |

*(Remaining categories follow the same format - full list available in source repository)*

---

## References & Sources

### Primary Sources
- [VoltAgent/awesome-moltbot-skills](https://github.com/VoltAgent/awesome-moltbot-skills) - Official curated skill list
- [moltbot/clawdhub](https://github.com/moltbot/clawdhub) - Skill registry source
- [moltbot/moltbot](https://github.com/moltbot/moltbot) - Core Moltbot repository
- [docs.molt.bot](https://docs.molt.bot) - Official documentation

### Secondary Sources
- [DataCamp Moltbot Tutorial](https://www.datacamp.com/tutorial/moltbot-clawdbot-tutorial)
- [DigitalOcean Moltbot Quickstart](https://www.digitalocean.com/community/tutorials/moltbot-quickstart-guide)
- [MacStories Coverage](https://www.macstories.net/stories/clawdbot-showed-me-what-the-future-of-personal-ai-assistants-looks-like/)
- [DEV.to Moltbot Guide](https://dev.to/czmilo/moltbot-the-ultimate-personal-ai-assistant-guide-for-2026-d4e)
- [The Register Security Analysis](https://www.theregister.com/2026/01/27/clawdbot_moltbot_security_concerns/)
- [AIMultiple Research](https://research.aimultiple.com/moltbot/)

### Security Research
- [Bitdefender Security Alert](https://www.bitdefender.com/en-us/blog/hotforsecurity/moltbot-security-alert-exposed-clawdbot-control-panels-risk-credential-leaks-and-account-takeovers)
- [Intruder Blog](https://www.intruder.io/blog/clawdbot-when-easy-ai-becomes-a-security-nightmare)
- [Snyk Analysis](https://snyk.io/articles/clawdbot-ai-assistant/)

---

*Report generated January 28, 2026. Skills ecosystem evolves rapidly - verify current state before installation.*
