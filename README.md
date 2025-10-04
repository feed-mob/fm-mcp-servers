# Model Context Protocol (MCP) Servers

This repository contains a collection of [MCP](https://modelcontextprotocol.io) servers developed and maintained by the FeedMob Development Team.

## 📚 Overview

MCP (Model Context Protocol) servers provide structured data and context to AI models, enabling them to better understand and interact with specific domains and data sources.

## 🚀 Available Servers

### Advertising & Marketing

- **[Jampp Reporting](src/jampp-reporting)** - Integration with Jampp's reporting API for advertising campaign data
  - Campaign spend tracking
  - Performance metrics
  - Daily statistics

- **[Kayzen Reporting](src/kayzen-reporting)** - Integration with Kayzen's reporting API for advertising campaign data
  - List all reports
  - Get report's data

- **[Singular Reporting](src/singular-reporting)** - Integration with Singular's reporting API for advertising campaign data
  - Getting reporting data from Singular API

- **[Appsamurai Reporting](src/appsamurai-reporting)** - Integration with AppSamurai Campaign Spend API for advertising campaign data
  - Getting reporting data AppSamurai Campaign Spend API

- **[TapJoy Reporting](src/tapjoy-reporting/)** -  Integration with TapJoy's reporting API for advertising campaign data
  - Retrieves spend data for active advertiser ad sets within a specified date range

- **[Applovin Reporting](src/applovin-reporting/)** -  Integration with Applovin's reporting API for advertising campaign data
  - Retrieves spend data for active advertiser ad sets within a specified date range

- **[IronSource Reporting](src/ironsource-reporting/)** -  Integration with IronSource's reporting API for advertising campaign data
  - Retrieves spend data for active advertiser ad sets within a specified date range

- **[Mintegral Reporting](src/mintegral-reporting/)** -  Integration with Mintegral's reporting API for advertising campaign data
  - Retrieves spend data for active advertiser ad sets within a specified date range

- **[Inmobi Reporting](src/inmobi-reporting/)** -  Integration with Inmobi's reporting API for advertising campaign data
  - Retrieves spend data for active advertiser ad sets within a specified date range

- **[Liftoff Reporting](src/liftoff-reporting)** - Integration with Liftoff's reporting API for advertising campaign data
  - Create reports
  - Check report status
  - Download report data (CSV or JSON)
  - List apps
  - List campaigns
  - Download report data enriched with campaign names

## 📖 Documentation
Each server implementation includes its own detailed documentation in its respective directory.

### ImageKit Server Quickstart

- Package location: `src/imagekit`
- Scripts: `npm run dev`, `npm run inspect`, `npm run build`
- Environment:
  - `IMAGE_TOOL_API_KEY` — required; API token for the configured provider.
  - `IMAGE_TOOL_BASE_URL` — optional; defaults to `https://api.cometapi.com/v1`.
  - `IMAGE_TOOL_MODEL_ID` — optional; defaults to `bytedance-seedream-4-0-250828`.
- Setup: copy `src/imagekit/env.sample` to `src/imagekit/.env` and fill in local secrets.
- `.env` is loaded automatically via `dotenv` when running package scripts.
- Provider example (Volcengine Ark / 火山方舟):
  ```
  IMAGE_TOOL_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
  IMAGE_TOOL_API_KEY=your-ark-api-key
  IMAGE_TOOL_MODEL_ID=doubao-seedream-4-0-250828
  ```
- Notable tools:
  - `crop_and_watermark_image` — crops an input image to a supported aspect ratio and optionally adds watermark text using the configured image-generation provider.

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Developed and maintained with ❤️ by FeedMob Development Team
