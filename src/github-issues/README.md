# FeedMob GitHub Issues MCP Server

A GitHub Issues MCP server customized for the FeedMob team

## Tools

### `search_issues`
- Search GitHub Issues through FeedMob API
- Input parameters:
  - `scheam` (string, required): Get from system resource `issues/search_schema`
  - `start_date` (string): Issue creation start date, defaults to 6 days ago
  - `end_date` (string): Issue creation end date, defaults to today
  - `status` (optional string): Issue status, e.g., 'open', 'closed'
  - `repo` (optional string)
  - `users` (optional string[]): List of users
  - `team` (optional string): Team name, e.g., 'Star', 'Mighty'
- Returns: Search results

### `create_issue`
- Create a new Issue in a GitHub repository
- Input parameters:
  - `owner` (optional string): Repository owner, can use environment variable default
  - `repo` (string, required): Repository name
  - `title` (string, required): Issue title
  - `body` (optional string): Issue description
  - `assignees` (optional string[]): Usernames to assign to
  - `labels` (optional string[]): Labels to add
  - `milestone` (optional number): Milestone number
- Returns: Created Issue details

### `update_issue`
- Update an existing Issue
- Input parameters:
  - `owner` (string, required): Repository owner
  - `repo` (string, required): Repository name
  - `issue_number` (number, required): Issue number to update
  - `title` (optional string): New title
  - `body` (optional string): New description
  - `state` (optional string): New state ('open' or 'closed')
  - `labels` (optional string[]): New labels
  - `assignees` (optional string[]): New assignees
  - `milestone` (optional number): New milestone number
- Returns: Updated Issue details

### `get_issue`
- Get details of a specific Issue in a repository
- Input parameters:
  - `owner` (string, required): Repository owner
  - `repo` (string, required):
  - `issue_number` (number, required): Issue number to retrieve
- Returns: GitHub Issue object and details

### `add_issue_comment`
- Add a comment to an existing Issue
- Input parameters:
  - `owner` (string, required): Repository owner
  - `repo` (string, required):
  - `issue_number` (number, required): Issue number
  - `body` (string, required): Comment content
- Returns: Created comment details

## Resources

### `issues/search_schema`
- Provides schema definition for Issues search

### Local Development
For local development, you can run the server using the following commands:

```bash
# Install dependencies
npm install

# Build project
npm run build

# Run server
npx tsx src/github-issues/index.ts
```

## License

This MCP server is licensed under the MIT License. This means you can freely use, modify, and distribute this software, but must comply with the terms and conditions of the MIT License. For more details, please refer to the LICENSE file in the project repository.
