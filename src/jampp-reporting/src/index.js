"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
var zod_1 = require("zod");
var node_fetch_1 = require("node-fetch");
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
var server = new mcp_js_1.McpServer({
    name: "Jampp MCP Server",
    version: "0.0.1"
});
var AUTH_URL = "https://auth.jampp.com/v1/oauth/token";
var API_URL = "https://reporting-api.jampp.com/v1/graphql";
var CLIENT_ID = process.env.JAMPP_CLIENT_ID || '';
var CLIENT_SECRET = process.env.JAMPP_CLIENT_SECRET || '';
if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("Missing Jampp API credentials. Please set JAMPP_CLIENT_ID and JAMPP_CLIENT_SECRET environment variables.");
    process.exit(1);
}
// Token cache
var accessToken = null;
var tokenExpiry = 0;
/**
 * Get valid Jampp API access token
 */
function getAccessToken() {
    return __awaiter(this, void 0, void 0, function () {
        var params, response, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Check if we have a valid token
                    if (accessToken && Date.now() < tokenExpiry) {
                        return [2 /*return*/, accessToken];
                    }
                    params = new URLSearchParams();
                    params.append('grant_type', 'client_credentials');
                    params.append('client_id', CLIENT_ID);
                    params.append('client_secret', CLIENT_SECRET);
                    return [4 /*yield*/, (0, node_fetch_1.default)(AUTH_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: params,
                        })];
                case 1:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("Authentication failed: ".concat(response.statusText));
                    }
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _a.sent();
                    accessToken = data.access_token;
                    // Set expiry time with 5 minutes buffer
                    tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
                    if (!accessToken) {
                        throw new Error('Failed to get access token: Token is empty');
                    }
                    return [2 /*return*/, accessToken];
            }
        });
    });
}
/**
 * Execute GraphQL query
 */
function executeQuery(query_1) {
    return __awaiter(this, arguments, void 0, function (query, variables) {
        var token, response;
        if (variables === void 0) { variables = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getAccessToken()];
                case 1:
                    token = _a.sent();
                    return [4 /*yield*/, (0, node_fetch_1.default)(API_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': "Bearer ".concat(token),
                            },
                            body: JSON.stringify({
                                query: query,
                                variables: variables,
                            }),
                        })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("API request failed: ".concat(response.statusText));
                    }
                    return [2 /*return*/, response.json()];
            }
        });
    });
}
// Tool: Get campaign spend
server.tool("get_campaign_spend", "Get the spend per campaign for a particular time range from Jampp Reporting API", {
    from_date: zod_1.z.string().describe("Start date in YYYY-MM-DD format"),
    to_date: zod_1.z.string().describe("End date in YYYY-MM-DD format")
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var endOfDay, query, variables, data, error_1;
    var from_date = _b.from_date, to_date = _b.to_date;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                endOfDay = to_date + "T23:59:59";
                query = "\n      query spendPerCampaign($from: DateTime!, $to: DateTime!) {\n        spendPerCampaign: pivot(\n          from: $from,\n          to: $to\n        ) {\n          results {\n            campaignId\n            campaign\n            impressions\n            clicks\n            installs\n            spend\n          }\n        }\n      }\n    ";
                variables = {
                    from: from_date,
                    to: endOfDay // Use the modified end date
                };
                return [4 /*yield*/, executeQuery(query, variables)];
            case 1:
                data = _c.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(data.data.spendPerCampaign.results, null, 2)
                            }
                        ]
                    }];
            case 2:
                error_1 = _c.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Error getting campaign spend: ".concat(error_1.message)
                            }
                        ],
                        isError: true
                    }];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Tool: Get campaign daily spend
server.tool("get_campaign_daily_spend", "Get the daily spend per campaign for a particular time range from Jampp Reporting API", {
    from_date: zod_1.z.string().describe("Start date in YYYY-MM-DD format"),
    to_date: zod_1.z.string().describe("End date in YYYY-MM-DD format"),
    campaign_id: zod_1.z.number().describe("Campaign ID to filter by")
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var endOfDay, query, variables, data, error_2;
    var from_date = _b.from_date, to_date = _b.to_date, campaign_id = _b.campaign_id;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                endOfDay = to_date + "T23:59:59";
                query = "\n      query dailySpend($from: DateTime!, $to: DateTime!, $campaignId: Int!) {\n        dailySpend: pivot(\n          from: $from,\n          to: $to,\n          filter: {\n            campaignId: {\n              equals: $campaignId\n            }\n          }\n        ) {\n          results {\n            date(granularity: DAILY)\n            campaignId\n            campaign\n            impressions\n            clicks\n            installs\n            spend\n          }\n        }\n      }\n    ";
                variables = {
                    from: from_date,
                    to: endOfDay,
                    campaignId: campaign_id
                };
                return [4 /*yield*/, executeQuery(query, variables)];
            case 1:
                data = _c.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(data.data.dailySpend.results, null, 2)
                            }
                        ]
                    }];
            case 2:
                error_2 = _c.sent();
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Error getting campaign daily spend: ".concat(error_2.message)
                            }
                        ],
                        isError: true
                    }];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Start the server
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var transport, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    transport = new stdio_js_1.StdioServerTransport();
                    return [4 /*yield*/, server.connect(transport)];
                case 1:
                    _a.sent();
                    console.error("Jampp MCP Server started successfully");
                    return [3 /*break*/, 3];
                case 2:
                    error_3 = _a.sent();
                    console.error("Failed to start server:", error_3);
                    process.exit(1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
main();
