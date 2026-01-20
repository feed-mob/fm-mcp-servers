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
  name: "create_or_update_google_drive_files",
  description: "Create or update Google Drive files in the Femini system. By providing a list of Google Drive file IDs, the system will fetch their metadata and store them in the database.",
  parameters: z.object({
    google_file_ids: z.array(z.string()).describe("Array of Google Drive file IDs, e.g., ['1abc123', '2def456']")
  }),
  execute: async (args, { log }) => {
    try {
      const apiUrl = `${FEMINI_API_URL}/api/unstable/mcp/google_drive_files`;
      
      log.info("Sending create/update request", { 
        url: apiUrl,
        fileCount: args.google_file_ids.length 
      });

      // Send HTTP POST request
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': "Bearer " + FEMINI_API_TOKEN,
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Dest': 'empty'
        },
        body: JSON.stringify({
          google_file_ids: args.google_file_ids
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText}\nResponse: ${errorText}`);
      }

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 500)}`);
      }

      return {
        content: [
          {
            type: "text",
            text: `Successfully processed ${args.google_file_ids.length} Google Drive file(s).\n\nFile ID list:\n${args.google_file_ids.map((id, index) => `${index + 1}. ${id}`).join('\n')}\n\nThese files have been created or updated in the Femini system.`,
          },
        ],
      };
    } catch (error: unknown) {
      throw new Error(`Failed to create/update files: ${(error as Error).message}`);
    }
  },
});

server.addTool({
  name: "query_google_drive_files",
  description: "Query relevant information from Google Drive files in the Femini system based on user questions, analyze and filter the queried data, and provide answers.",
  parameters: z.object({
    query: z.string().describe("The complete user question"),
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

      let prompt = `You are a data analysis assistant. Your task is to query, analyze, and extract relevant information from the provided Google Drive file data based on user questions.

## Data Structure Description
You will receive a JSON array containing multiple file objects. Each file object includes the following key fields:
- id: Unique identifier of the file
- file_name: File name
- file_url: Google Drive access link for the file
- file_extension: File type (xlsx, pdf, md, txt, etc.)
- mime_type: MIME type
- ai_summary: AI-generated content summary of the file (may be null)
- created_at: File creation time
- modified_at: File last modification time
- owner_email: File owner's email

## Your Task Workflow

### Step 1: Understand User Query
1. Carefully read the user's question and identify key information needs
2. Determine the type of data to search for (sales data, activity data, employee data, etc.)
3. Identify filtering conditions to apply (date range, specific personnel, specific clients, etc.)

### Step 2: Data Search and Matching
1. Search for relevant files based on file name, ai_summary content, and file type
2. Prioritize checking the ai_summary field for data summaries to quickly locate relevant information
3. For files containing tabular data (xlsx, csv), review the data content in the summary
4. Match multiple relevant files to obtain complete answers

### Step 3: Data Analysis and Extraction
1. Extract relevant data points from ai_summary
2. Perform necessary data calculations (sum, average, comparison, etc.)
3. Filter and sort data according to user's specific requirements
4. Identify relationships between data

### Step 4: Construct Answer
1. Clearly state your findings
2. Provide specific data and numbers as support
3. For each relevant file, include the following information:
   - File name
   - File URL (file_url)
   - Why this file is relevant (brief explanation)
   - Specific data or information extracted from the file

## Output Format Requirements

Please organize your answer in the following format:

### Query Results

**Question Understanding:** [Brief explanation of your understanding of the user's question]

**Analysis Process:** [Explain how you found the answer from the data]

**Main Findings:**
[Specific data and analysis results]

**Relevant Files:**
1. **File Name**
   - URL: [file_url]
   - Relevance: [Explain why this file is relevant]
   - Key Data: [Relevant data extracted from this file]

2. **File Name**
   - URL: [file_url]
   - Relevance: [Explain why this file is relevant]
   - Key Data: [Relevant data extracted from this file]

[Continue listing all relevant files]

## Important Notes

1. **Accuracy First**: If data is unclear or incomplete, clearly state this
2. **Completeness**: Ensure all parts of the user's question are answered
3. **Traceability**: Always provide file URLs and data sources
4. **Data Validation**: If inconsistencies are found in data from multiple files, point them out and explain
5. **Context Understanding**: Understand FeedMob's business context (marketing, sales, activity management, etc.)
6. **Date Handling**: Pay attention to file modification and creation dates, prioritize using the latest data

## Available Google Drive File Data

The following is a list of currently available Google Drive files in the system:

${JSON.stringify(data, null, 2)}

Now, please find the answer from the provided Google Drive file data based on the user's query question.`

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
