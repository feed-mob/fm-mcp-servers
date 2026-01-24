# PubMatic AgenticOS: Research Memo

## Executive Summary (10 Bullets)

1. **AgenticOS** is PubMatic's operating system for autonomous, agent-to-agent advertising execution, launched January 5, 2026 at CES.

2. **Core capability**: Advertisers define objectives/guardrails in their preferred LLM (e.g., Claude); AI agents then autonomously plan, execute, and optimize campaigns within those constraints.

3. **Three-layer architecture**: Infrastructure (NVIDIA-accelerated compute), Application (agentic capabilities via AdCP/MCP protocols), Transaction (connects to PubMatic Activate buying platform).

4. **Performance claims**: 5× faster decisioning, ~1ms latency (down from 5-10ms), 85% fewer auction timeouts, 87% reduction in campaign setup time, 70% faster issue resolution.

5. **Key protocols**: Ad Context Protocol (AdCP) — an open standard PubMatic co-founded with Yahoo, Scope3, and others (Oct 2025); Model Context Protocol (MCP) for agent interoperability.

6. **Launch partners**: WPP Media, Butler/Till, MiQ, Brkthru, Foxtel Media, Olyzon, Wpromote — all running or testing live campaigns.

7. **First live campaign**: Butler/Till + Clubtails (Geloso Beverage Group) CTV campaign in December 2025 using Anthropic's Claude.

8. **Go-to-market**: Agentic AI Acceleration Program launching Q1 2026 to onboard advertisers, agencies, publishers from testing to live workflows.

9. **Competitive context**: Part of industry-wide agentic wave including Yahoo DSP, Magnite, The Trade Desk (Koa), and IAB Tech Lab's ARTF framework — though major walled gardens (Google, Amazon, Meta) have not joined open protocols.

10. **No public AgenticOS code**: PubMatic's GitHub has MCP server specs and OpenWrap SDK, but no AgenticOS repo. "AgenticOS" name collides with unrelated open-source projects (ChainGPT, OpenAgentsInc).

---

## Timeline Table

| Date | Event | Source |
|------|-------|--------|
| **2006** | PubMatic founded by Rajeev Goel, Mukul Kumar, Amar Goel | [PubMatic Investor Relations](https://investors.pubmatic.com/management) |
| **May 7, 2025** | PubMatic launches AI-powered media buying platform with Gen AI monitoring agent | [PubMatic Investor Relations](https://investors.pubmatic.com/news-releases/news-release-details/pubmatic-unveils-ai-powered-media-buying-platform) |
| **Sep 23, 2025** | PubMatic publishes first open spec for agent-to-agent communication (deal management) | [PubMatic Blog](https://pubmatic.com/blog/defining-the-future-of-programmatic-collaboration-charting-the-course-for-agent-to-agent-communication/) |
| **Oct 8, 2025** | PubMatic announces NVIDIA integration results: 5× faster AI processing, 1ms latency | [PubMatic Press Release](https://pubmatic.com/news/pubmatic-delivers-5x-faster-smarter-advertising-decisions-with-nvidia/) |
| **Oct 15, 2025** | AdCP (Ad Context Protocol) launched by consortium including PubMatic, Yahoo, Scope3 | [AdWeek](https://www.adweek.com/media/adcp-ad-context-protocol-agentic-advertising-standard/) |
| **Nov 13, 2025** | IAB Tech Lab releases ARTF v1.0 (Agentic RTB Framework) for public comment | [IAB Tech Lab](https://iabtechlab.com/press-releases/iab-tech-lab-announces-agentic-rtb-framework-artf-v1-0-for-public-comment/) |
| **Dec 15, 2025** | First AdCP-enabled agentic campaign: Butler/Till + Clubtails on CTV | [PubMatic Press Release](https://pubmatic.com/news/pubmatic-and-butler-till-launch-adcp-enabled-agentic-ai-campaign-across-ctv/) |
| **Jan 5, 2026** | AgenticOS officially launched at CES 2026 | [PubMatic Press Release](https://pubmatic.com/news/pubmatic-launches-agenticos-the-operating-system-for-agent-to-agent-advertising/) |
| **Q1 2026** | Agentic AI Acceleration Program deployment phase | [PubMatic Press Release](https://pubmatic.com/news/pubmatic-launches-agenticos-the-operating-system-for-agent-to-agent-advertising/) |

---

## Architecture Description: "Architecture of Advertising Intelligence"

PubMatic's AgenticOS operates on a **three-layer framework**:

### Layer 1: Infrastructure Layer
- **Purpose**: High-performance compute foundation
- **Technology**: NVIDIA L40S GPUs, Triton Inference Servers, RAPIDS Accelerator for Apache Spark
- **Capabilities**:
  - Microsecond-level inference across tens of millions of auctions/second
  - Sub-millisecond response times (~1ms vs. industry 5-10ms)
  - Real-time, privacy-safe data integration
  - 30% energy reduction vs. traditional systems
- **Claim**: "Up to 5× faster decisioning and significantly fewer auction timeouts"

### Layer 2: Application Layer
- **Purpose**: Interpret advertiser intent and coordinate autonomous workflows
- **Protocols**:
  - **AdCP (Ad Context Protocol)**: Open standard for advertising automation over MCP/A2A transport
  - **MCP (Model Context Protocol)**: Anthropic's standard for AI agent interoperability
- **Automated functions**: Planning, forecasting, pacing, yield management, troubleshooting, measurement
- **LLM integration**: Works with Claude (Anthropic), ChatGPT (OpenAI), and proprietary systems

### Layer 3: Transaction Layer
- **Purpose**: Real-world execution of agent decisions
- **Connection**: Links to PubMatic Activate buying platform
- **Transaction types**: Programmatic Guaranteed (PG), Private Marketplace (PMP)
- **Features**: Premium supply access, in-flight campaign signals, direct bidding infrastructure
- **Compatibility**: Maintains interoperability with existing buying models

### Visual Representation (Textual)

```
┌─────────────────────────────────────────────────────────────┐
│                    ADVERTISER / AGENCY                       │
│         (Define objectives, guardrails, brand safety)        │
│                    via LLM Interface (Claude, etc.)          │
└─────────────────────────────┬───────────────────────────────┘
                              │ Natural Language Intent
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               APPLICATION LAYER (Agentic)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Planning   │  │ Forecasting │  │  Pacing     │          │
│  │   Agent     │  │   Agent     │  │   Agent     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Yield     │  │Troubleshoot │  │ Measurement │          │
│  │   Agent     │  │   Agent     │  │   Agent     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│          Protocols: AdCP + MCP for interoperability          │
└─────────────────────────────┬───────────────────────────────┘
                              │ Agent Decisions
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               TRANSACTION LAYER (Execution)                  │
│    PubMatic Activate Platform │ PG/PMP Transactions          │
│    Premium Supply │ Direct Bidding │ Campaign Signals        │
└─────────────────────────────┬───────────────────────────────┘
                              │ Real-time Bids
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               INFRASTRUCTURE LAYER (Compute)                 │
│   NVIDIA L40S GPUs │ Triton Servers │ RAPIDS Accelerator    │
│   ~1ms latency │ Millions of auctions/sec │ 85% fewer timeouts│
└─────────────────────────────────────────────────────────────┘
```

---

## Protocol Details

### Ad Context Protocol (AdCP)

| Attribute | Detail |
|-----------|--------|
| **Website** | [adcontextprotocol.org](https://adcontextprotocol.org) |
| **GitHub** | [github.com/adcontextprotocol/adcp](https://github.com/adcontextprotocol/adcp) |
| **Version** | v2.5.1 (December 2025) |
| **License** | Apache 2.0 |
| **Governance** | Stewarded by Agentic Advertising Organization (AAO) |
| **Founding members** | Yahoo, PubMatic, Scope3, Optable, Swivel, Triton Digital |

**Modules**:
- **Media Buy Protocol**: Campaign lifecycle management
- **Creative Protocol**: AI-powered creative generation
- **Signals Protocol**: First-party data integration
- **Curation Protocol**: Coming Q2 2025 (per original roadmap)

**Transport**: Operates over MCP and A2A (Agent-to-Agent) protocols

### Model Context Protocol (MCP)

| Attribute | Detail |
|-----------|--------|
| **Origin** | Anthropic's open standard for AI assistant interoperability |
| **Purpose** | Enables structured, machine-readable information exchange between AI agents |
| **PubMatic implementation** | pubmatic-mcp-server repo on GitHub |

### IAB Tech Lab ARTF (Agentic RTB Framework)

| Attribute | Detail |
|-----------|--------|
| **Released** | November 13, 2025 for public comment |
| **Approach** | Containerization for co-located agents (reduces ~600-800ms RTT by up to 80%) |
| **Relationship to AdCP** | Complementary; ARTF focuses on RTB auction efficiency, AdCP on workflow orchestration |
| **Public comment deadline** | January 15, 2026 |

---

## Partner Map

| Partner | Type | Integration | Evidence |
|---------|------|-------------|----------|
| **WPP Media** | Agency holding company | Using AgenticOS to strengthen WPP Open and Open Intelligence platforms | Amanda Grant (EVP, Global Head of Data & Tech Partnerships) quoted in [press release](https://pubmatic.com/news/pubmatic-launches-agenticos-the-operating-system-for-agent-to-agent-advertising/) |
| **Butler/Till** | Independent agency | Ran first AdCP-enabled campaign for Clubtails via Claude | Scott Ensign (Chief Strategy Officer) quoted; [Business Wire Dec 15, 2025](https://www.businesswire.com/news/home/20251215976339/en/PubMatic-and-ButlerTill-Launch-AdCP-Enabled-Agentic-AI-Campaign-Across-CTV) |
| **MiQ** | Programmatic partner | Integrating MiQ Sigma trading agent with AgenticOS | John Goulding (Global Chief Strategy Officer) quoted in [press release](https://pubmatic.com/news/pubmatic-launches-agenticos-the-operating-system-for-agent-to-agent-advertising/) |
| **Wpromote** | Independent agency | Testing agentic media buying | Skyler McGill (Head of Video & Programmatic) quoted in [press release](https://pubmatic.com/news/pubmatic-launches-agenticos-the-operating-system-for-agent-to-agent-advertising/) |
| **Brkthru** | Digital media buying company | Early participant in agent-led planning/activation | Tom Leone (VP Media Services) quoted in [press release](https://pubmatic.com/news/pubmatic-launches-agenticos-the-operating-system-for-agent-to-agent-advertising/) |
| **Foxtel Media** | Australian broadcaster (DAZN) | Exploring live content/sports applications | Quoted in [press release](https://pubmatic.com/news/pubmatic-launches-agenticos-the-operating-system-for-agent-to-agent-advertising/) |
| **Olyzon** | Agentic CTV platform | Launch partner for CTV applications | Jules Minvielle (CEO) quoted in [press release](https://pubmatic.com/news/pubmatic-launches-agenticos-the-operating-system-for-agent-to-agent-advertising/) |
| **NVIDIA** | Technology partner | L40S GPUs, Triton Servers, RAPIDS powering infrastructure | Mukul Kumar (President of Engineering) quoted; [Oct 8, 2025 press release](https://pubmatic.com/news/pubmatic-delivers-5x-faster-smarter-advertising-decisions-with-nvidia/) |
| **Anthropic** | AI model provider | Claude LLM used in Butler/Till campaign | [Dec 15, 2025 press release](https://pubmatic.com/news/pubmatic-and-butler-till-launch-adcp-enabled-agentic-ai-campaign-across-ctv/) |
| **Geloso Beverage Group** | Advertiser (Clubtails brand) | First live agentic campaign | [Dec 15, 2025 press release](https://pubmatic.com/news/pubmatic-and-butler-till-launch-adcp-enabled-agentic-ai-campaign-across-ctv/) |

---

## Team & Organizational Ownership

### Key Executives Quoted/Credited

| Name | Title | Role/Context |
|------|-------|--------------|
| **Rajeev Goel** | Co-Founder & CEO | Overall company leadership; announced AgenticOS |
| **Mukul Kumar** | Co-Founder & President of Engineering | Technical leadership; NVIDIA partnership; oversees 300+ engineers |
| **Kyle Dozeman** | Chief Revenue Officer, Americas | Commercial leadership; AdCP advocacy; public spokesperson on agentic initiatives |
| **Amar Goel** | Founder, Chairman & Chief Innovation Officer | Strategic/innovation oversight |
| **John Sabella** | CTO | Technical architecture (joined 2019) |
| **Chandni Patel** | Senior Director of Product Management | Published agent-to-agent specification blog post |

### Organizational Notes

- Management team has ~10.2 years average tenure
- Engineering team: 300+ employees across engineering, data/analytics, data center operations
- PubMatic leaders sit on boards of IAB, IAB Tech Lab, and Prebid.org
- Co-founding member of AdCP consortium

---

## GitHub / Public Code Check

### Official PubMatic Repositories

**Organization**: [github.com/PubMatic](https://github.com/PubMatic) (14 repositories)

| Repository | Description | Relevance |
|------------|-------------|-----------|
| **pubmatic-mcp-server** | MCP server specs for agent-to-agent communication | **Directly relevant** — contains Deal Management and Inventory Discovery specs |
| OpenWrap | Prebid wrapper (50 stars) | Ad delivery, not agentic |
| OpenWrap SDK variants | iOS, Android, Flutter, Unity samples | Mobile ad integration |
| PubMatic-SKAdNetwork-App | Apple SKAdNetwork samples | Attribution |

**Key finding**: **No "AgenticOS" repository exists**. The closest official code surface is `pubmatic-mcp-server`, which contains specifications (not executable code) for agent-to-agent communication protocols.

### Name Collision: "AgenticOS" on GitHub

| Project | Owner | What it is | URL |
|---------|-------|------------|-----|
| AgenticOS | ChainGPT-org | Twitter/X AI agent for Web3 (TypeScript/Bun) | [github.com/ChainGPT-org/AgenticOS](https://github.com/ChainGPT-org/AgenticOS) |
| openagents | OpenAgentsInc | "The agentic OS" — general-purpose agent framework | [github.com/OpenAgentsInc/openagents](https://github.com/OpenAgentsInc/openagents) |
| agent-os | buildermethods | Spec-driven development system | [github.com/buildermethods/agent-os](https://github.com/buildermethods/agent-os) |
| agenticos (org) | Agentic OS | AI ideas/implementations org (agenticos.com) | [github.com/agenticos](https://github.com/agenticos) |

**Conclusion**: PubMatic's AgenticOS is a **proprietary platform** without open-source code release. The GitHub name collisions are unrelated projects.

### Related Open-Source: AdCP

| Repository | Description |
|------------|-------------|
| adcontextprotocol/adcp | Docs and reference implementation (Apache 2.0) |
| adcontextprotocol/adcp-client | TypeScript client library |
| adcontextprotocol/salesagent | Reference media sales agent |
| adcontextprotocol/signals-agent | Reference signals agent |

---

## Competitive / Ecosystem Context

### Comparable Agentic Initiatives

| Company | Product | Status | Key Differentiator |
|---------|---------|--------|-------------------|
| **PubMatic** | AgenticOS | Live campaigns (Jan 2026) | SSP-centric; AdCP co-founder; NVIDIA acceleration |
| **Yahoo** | Yahoo DSP Agentic AI | Live (Jan 2026) | DSP-centric; "Yours, Mine, Ours" model flexibility |
| **The Trade Desk** | Koa Adaptive Trading Modes | Late 2025/early 2026 | Performance vs. Control modes; Audience Unlimited |
| **Magnite** | SpringServe Seller Agent | Testing (Dec 2025) | SSP seller agent; AdCP compliant |
| **IAB Tech Lab** | ARTF v1.0 | Public comment (Nov 2025) | Containerization for RTB efficiency; industry standard |

### What Major Platforms Are NOT Doing

Per [ExchangeWire](https://www.exchangewire.com/blog/2025/12/09/ai-and-programmatic-the-agentic-age/) and [PPC Land](https://ppc.land/why-advertising-experts-say-new-ai-protocol-wont-fix-programmatics-biggest-problem/):

- **Google, Amazon DSP, Meta** have not joined AdCP or similar open protocols
- Creates risk of "new walled gardens" vs. interoperability promise
- Industry analysts predict 40%+ of agentic AI projects may be canceled by end of 2026

### What "Agent-to-Agent Advertising" Practically Changes

1. **Workflow**: Natural language briefs → autonomous execution (vs. manual UI/dashboard work)
2. **Governance**: Human-defined guardrails upfront; agents operate within constraints
3. **Supply path**: Direct agent-to-agent communication reduces intermediary friction
4. **Fees**: Potential for reduced operational costs (87% faster setup claimed)
5. **Transparency**: AdCP aims for standardized, auditable agent communication

---

## Risks & Open Questions

### Brand Safety / Guardrails Governance

- **Model**: Advertisers define objectives, brand-safety requirements, and guardrails in LLM interface before autonomous execution
- **Concern**: How are guardrails enforced at auction speed? What happens when agents encounter edge cases?
- **Unknown**: Specific technical mechanisms for guardrail enforcement not publicly documented

### Privacy / Regulatory Considerations

- **Claim**: "Privacy-safe data integration" in infrastructure layer
- **Concerns**:
  - EU AI Act transparency obligations effective August 2, 2026
  - State-level privacy enforcement intensifying (CPPA's $1.35M penalty in 2025)
  - Agentic AI auditing challenges: decision-making often lacks traceability
- **Unknown**: How AgenticOS handles consent management, data minimization, or cross-border transfers

### Failure Modes

| Risk | Description | Evidence |
|------|-------------|----------|
| **Latency** | If agents can't decide within auction windows, opportunities lost | NVIDIA partnership addresses; 1ms target |
| **Over-automation** | Agents make suboptimal decisions without human oversight | Guardrails model; but edge cases unclear |
| **Measurement drift** | Agents optimize for metrics that diverge from business outcomes | No public documentation on measurement validation |
| **Transparency** | Agentic decision-making may not be human-readable for audit | [ISACA](https://www.isaca.org/resources/news-and-trends/industry-news/2025/the-growing-challenge-of-auditing-agentic-ai) notes this as industry-wide challenge |
| **Protocol fragmentation** | AdCP vs. ARTF vs. proprietary systems create interoperability gaps | Major platforms (Google, Amazon) not participating |
| **Vendor lock-in** | Despite "open" claims, deep integration may create switching costs | AdCP is Apache 2.0 licensed but adoption unclear |

---

## What We Still Don't Know

| Question | How to Verify |
|----------|---------------|
| Detailed guardrail enforcement mechanisms | Request technical documentation from PubMatic or examine MCP server specs in detail |
| Full results from Clubtails campaign | PubMatic stated "full results will be released in Q1 2026" |
| Pricing model for AgenticOS | Contact PubMatic sales or monitor investor materials |
| Specific AI models used internally (beyond Claude integration) | Technical deep-dive or engineering blog posts |
| How AgenticOS handles regulatory compliance (GDPR, CCPA, AI Act) | Compliance documentation or regulatory filings |
| Integration depth with WPP Open and MiQ Sigma | Partner case studies or joint technical documentation |
| Performance at scale beyond pilot campaigns | Monitor Q1 2026 announcements and earnings calls |
| Whether Google/Amazon/Meta will adopt AdCP or create competing standards | Industry news monitoring |
| How measurement validation prevents optimization gaming | Request methodology documentation |
| Long-term sustainability claims verification | Third-party energy audits |

---

## Bibliography

### Primary Sources (PubMatic Official)

1. PubMatic Press Release: AgenticOS Launch (Jan 5, 2026) — https://pubmatic.com/news/pubmatic-launches-agenticos-the-operating-system-for-agent-to-agent-advertising/
2. PubMatic Press Release: Butler/Till AdCP Campaign (Dec 15, 2025) — https://pubmatic.com/news/pubmatic-and-butler-till-launch-adcp-enabled-agentic-ai-campaign-across-ctv/
3. PubMatic Press Release: NVIDIA Partnership (Oct 8, 2025) — https://pubmatic.com/news/pubmatic-delivers-5x-faster-smarter-advertising-decisions-with-nvidia/
4. PubMatic Blog: Agent-to-Agent Specification (Sep 23, 2025) — https://pubmatic.com/blog/defining-the-future-of-programmatic-collaboration-charting-the-course-for-agent-to-agent-communication/
5. PubMatic Investor Relations: Management Team — https://investors.pubmatic.com/management
6. PubMatic GitHub: MCP Server — https://github.com/PubMatic/pubmatic-mcp-server
7. PubMatic Early Access Page — https://go.pubmatic.com/agenticOS

### Protocol & Standards Sources

8. Ad Context Protocol Website — https://adcontextprotocol.org
9. AdCP GitHub Repository — https://github.com/adcontextprotocol/adcp
10. IAB Tech Lab: ARTF v1.0 Announcement — https://iabtechlab.com/press-releases/iab-tech-lab-announces-agentic-rtb-framework-artf-v1-0-for-public-comment/

### Trade Press

11. Marketing Dive: PubMatic AgenticOS (Jan 5, 2026) — https://www.marketingdive.com/news/pubmatic-debuts-agentic-platform-to-solve-programmatics-ai-headaches/808709/
12. AdWeek: AdCP Launch (Oct 2025) — https://www.adweek.com/media/adcp-ad-context-protocol-agentic-advertising-standard/
13. ExchangeWire: Agentic Age (Dec 2025) — https://www.exchangewire.com/blog/2025/12/09/ai-and-programmatic-the-agentic-age/
14. MediaPost: Yahoo DSP Agentic AI (Jan 2026) — https://www.mediapost.com/publications/article/411804/yahoo-dsp-advances-agentic-media-buying-models.html
15. Magnite Blog: Seller Agent (Jan 2026) — https://www.magnite.com/blog/why-magnite-built-a-seller-agent-and-what-it-signals-for-adcp/

### Wire Services

16. Business Wire: AgenticOS Launch — https://www.businesswire.com/news/home/20260105060287/en/PubMatic-Launches-AgenticOS-the-Operating-System-for-Agent-to-Agent-Advertising
17. Business Wire: Butler/Till Campaign — https://www.businesswire.com/news/home/20251215976339/en/PubMatic-and-ButlerTill-Launch-AdCP-Enabled-Agentic-AI-Campaign-Across-CTV

---

## Evidence Snippets Appendix

| # | Claim | Quote (≤25 words) | Source |
|---|-------|-------------------|--------|
| 1 | AgenticOS definition | "an operating system designed to orchestrate autonomous, agent-to-agent advertising execution across premium digital environments" | [PubMatic Press Release](https://pubmatic.com/news/pubmatic-launches-agenticos-the-operating-system-for-agent-to-agent-advertising/) |
| 2 | Performance claim | "delivering up to 5× faster decisioning, sub-millisecond response times, and significantly fewer auction timeouts" | [PubMatic Press Release](https://pubmatic.com/news/pubmatic-launches-agenticos-the-operating-system-for-agent-to-agent-advertising/) |
| 3 | Setup time reduction | "early tests showed an 87% reduction in setup time and 70% faster issue resolution" | [PubMatic Press Release](https://pubmatic.com/news/pubmatic-launches-agenticos-the-operating-system-for-agent-to-agent-advertising/) |
| 4 | NVIDIA latency | "reduces inference latency from the industry standard of 5-10 milliseconds to approximately 1 millisecond" | [PubMatic NVIDIA Release](https://pubmatic.com/news/pubmatic-delivers-5x-faster-smarter-advertising-decisions-with-nvidia/) |
| 5 | First spec claim | "publishing the industry's first specification for agent-to-agent communication in programmatic" | [Kyle Dozeman quote, Business Wire](https://www.businesswire.com/news/home/20251215976339/en/PubMatic-and-ButlerTill-Launch-AdCP-Enabled-Agentic-AI-Campaign-Across-CTV) |
| 6 | Human control model | "advertisers define objectives, guardrails, brand-safety requirements, and creative parameters in their preferred LLM interface" | [PubMatic Press Release](https://pubmatic.com/news/pubmatic-launches-agenticos-the-operating-system-for-agent-to-agent-advertising/) |
| 7 | Clubtails campaign | "Butler/Till submitted a natural language brief through Claude, Anthropic's Gen AI platform" | [PubMatic AdCP Campaign Release](https://pubmatic.com/news/pubmatic-and-butler-till-launch-adcp-enabled-agentic-ai-campaign-across-ctv/) |
| 8 | WPP integration | "WPP and Choreograph are using agentic AI to strengthen WPP Open and Open Intelligence" | [Amanda Grant quote, Marketing Dive](https://www.marketingdive.com/news/pubmatic-debuts-agentic-platform-to-solve-programmatics-ai-headaches/808709/) |
| 9 | MiQ Sigma | "MiQ Sigma's trading agent will connect to more inventory and audience packages" | [John Goulding quote, PubMatic PR](https://pubmatic.com/news/pubmatic-launches-agenticos-the-operating-system-for-agent-to-agent-advertising/) |
| 10 | NVIDIA infrastructure | "NVIDIA L40S GPUs power real-time ad decisioning and streaming media across CTV" | [PubMatic NVIDIA Release](https://pubmatic.com/news/pubmatic-delivers-5x-faster-smarter-advertising-decisions-with-nvidia/) |

---

*Research compiled January 23, 2026. All claims should be verified against primary sources as the agentic advertising landscape is evolving rapidly.*
