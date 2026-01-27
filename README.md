# Model Context Protocol (MCP) Servers

This repository contains a collection of [MCP](https://modelcontextprotocol.io) servers developed and maintained by the FeedMob Development Team.

## 📚 Overview

MCP (Model Context Protocol) servers provide structured data and context to AI models, enabling them to better understand and interact with specific domains and data sources.

## 🚀 Available Servers (27)

### 📊 Advertising Platform Reporting

- **[Applovin Reporting](src/applovin-reporting)** - AppLovin Reporting API integration
  - Retrieves spend data for active advertiser ad sets
  - Date range filtering support

- **[AppSamurai Reporting](src/appsamurai-reporting)** - AppSamurai Campaign Spend API integration
  - Campaign spend data retrieval
  - Active advertiser tracking

- **[FeedMob Reporting](src/feedmob-reporting)** - FeedMob direct spend management and campaign tracking
  - Central hub for direct spend operations
  - JWT token authentication support
  - Multiple vendor API integrations

- **[Femini Reporting](src/femini-reporting)** - Flexible campaign data querying with rich metrics
  - Customized FeedMob ad spend analysis
  - Rich performance metrics

- **[Impact Radius Reporting](src/impact-radius-reporting)** - Impact Radius affiliate marketing reporting
  - Campaign mapping support
  - Affiliate performance tracking

- **[Inmobi Reporting](src/inmobi-reporting)** - Inmobi API integration
  - Spend data for active advertiser ad sets
  - Date range filtering

- **[IronSource Reporting](src/ironsource-reporting)** - IronSource Reporting API integration
  - Advertising campaign data retrieval
  - Active ad set tracking

- **[IronSource Aura Reporting](src/ironsource-aura-reporting)** - IronSource Aura platform advertiser reporting
  - Detailed performance metrics
  - Aura-specific campaign data

- **[Jampp Reporting](src/jampp-reporting)** - Jampp API integration
  - Campaign spend tracking
  - Performance metrics
  - Daily statistics

- **[Kayzen Reporting](src/kayzen-reporting)** - Kayzen API integration
  - List all reports
  - Retrieve report data

- **[Liftoff Reporting](src/liftoff-reporting)** - Liftoff Reporting API integration
  - Create, check status, and download reports
  - Campaign name enrichment
  - CSV and JSON format support

- **[Mintegral Reporting](src/mintegral-reporting)** - Mintegral Reporting API integration
  - Spend data for active advertiser ad sets
  - Date range filtering

- **[RTB House Reporting](src/rtb-house-reporting)** - RTB House API integration
  - Fetch reporting data
  - Advertiser filtering support

- **[Samsung Reporting](src/samsung-reporting)** - Samsung API integration
  - Content metrics tracking
  - Installs, revenue, and ratings data

- **[Sensor Tower Reporting](src/sensor-tower-reporting)** - Sensor Tower mobile app intelligence and market data
  - 10 comprehensive tools for app analytics
  - App metadata, sales estimates, active users, retention data
  - Category rankings and advertising intelligence

- **[Singular Reporting](src/singular-reporting)** - Singular Reporting API integration
  - Campaign reporting data
  - Async report generation

- **[Smadex Reporting](src/smadex-reporting)** - Smadex API integration
  - Report creation and status checking
  - Data download support

- **[TapJoy Reporting](src/tapjoy-reporting)** - TapJoy API integration
  - Spend data for active advertiser ad sets
  - Date range filtering

### 🛠️ Internal Operations & Team Tools

- **[GitHub Issues](src/github-issues)** - Search, create, and update GitHub issues with FeedMob team customization
  - FeedMob API integration for issue search
  - Team-based filtering (Star, Mighty teams)
  - Issue creation, updates, and comments

- **[Google Drive Files](src/google-drive-files)** - AI-powered file querying and content analysis
  - File search and content extraction
  - Femini system integration

- **[User Activity Reporting](src/user-activity-reporting)** - Client contacts, Slack messages, and HubSpot tickets
  - Client team member management (AA, AM, AE, PM, PA, AO roles)
  - Slack message history search
  - HubSpot ticket querying and details

- **[Work Journals](src/work-journals)** - Query, create, and update work journals
  - Team member filtering
  - Date-based journal management

### 🔒 Security & Infrastructure

- **[IPLocate](src/iplocate)** - IP geolocation and fraud detection API integration
  - Single and batch IP geolocation lookup (up to 100 IPs)
  - Single and batch fraud/reputation checks (up to 50 IPs)
  - Fraud score (0-100) with risk assessment
  - Proxy/VPN/Tor detection
  - API quota monitoring and management

### 🎨 Content & Media Management

- **[Civitai Records](src/civitai-records)** - Manage content workflows including prompts, assets, and publication records
  - Full content lifecycle from generation to publication
  - Many-to-many associations between posts, assets, and prompts
  - PostgreSQL database integration via Prisma
  - Civitai Images API integration for engagement stats

- **[ImageKit](src/imagekit)** - Image cropping, watermarking, and upload automation
  - Crop images to supported aspect ratios
  - Watermark application
  - Upload files to ImageKit from base64, filesystem, or remote URLs
  - Comet Images API integration for image generation

### 🔄 Workflow Automation

- **[n8n Direct Spend Visualizer](src/n8n-nodes-feedmob-direct-spend-visualizer)** - FeedMob direct spend insights via Claude Agent SDK
  - Wraps FeedMob Claude Agent plugin for n8n workflows
  - AWS Bedrock integration for Claude models
  - ASCII chart visualization of spend data
  - Requires FeedMob MCP credentials and AWS Bedrock access

- **[n8n Sensor Tower](src/n8n-nodes-sensor-tower)** - Mobile app intelligence workflows for n8n
  - n8n wrapper for Sensor Tower MCP server
  - Mobile app analytics in workflow automation context

## 📖 Documentation
Each server implementation includes its own detailed documentation in its respective directory.


## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Developed and maintained with ❤️ by FeedMob Development Team
