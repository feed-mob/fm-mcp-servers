# GitHub MCP Server

MCP Server for the GitHub API, enabling issue operations and search functionality.

## Features

The GitHub MCP Server provides the following capabilities:
- Create and manage GitHub issues
- Search for issues across repositories
- List and filter repository issues
- Update existing issues
- Get details of specific issues

## Tools

### `create_issue`
- Create a new issue in a GitHub repository
- Inputs:
  - `owner` (string): Repository owner
  - `repo` (string): Repository name
  - `title` (string): Issue title
  - `body` (optional string): Issue description
  - `assignees` (optional string[]): Usernames to assign
  - `labels` (optional string[]): Labels to add
  - `milestone` (optional number): Milestone number
- Returns: Created issue details

### `list_issues`
- List and filter repository issues
- Inputs:
  - `owner` (string): Repository owner
  - `repo` (string): Repository name
  - `state` (optional string): Filter by state ('open', 'closed', 'all')
  - `labels` (optional string[]): Filter by labels
  - `sort` (optional string): Sort by ('created', 'updated', 'comments')
  - `direction` (optional string): Sort direction ('asc', 'desc')
  - `since` (optional string): Filter by date (ISO 8601 timestamp)
  - `page` (optional number): Page number
  - `per_page` (optional number): Results per page
- Returns: Array of issue details

### `update_issue`
- Update an existing issue
- Inputs:
  - `owner` (string): Repository owner
  - `repo` (string): Repository name
  - `issue_number` (number): Issue number to update
  - `title` (optional string): New title
  - `body` (optional string): New description
  - `state` (optional string): New state ('open' or 'closed')
  - `labels` (optional string[]): New labels
  - `assignees` (optional string[]): New assignees
  - `milestone` (optional number): New milestone number
- Returns: Updated issue details

### `search_issues`
- Search for issues and pull requests across GitHub repositories
- Inputs:
  - `q` (string): Search query using GitHub issues search syntax
  - `sort` (optional string): Sort field (comments, reactions, created, etc.)
  - `order` (optional string): Sort order ('asc' or 'desc')
  - `per_page` (optional number): Results per page (max 100)
  - `page` (optional number): Page number
- Returns: Issue and pull request search results

### `get_issue`
- Gets the contents of an issue within a repository
- Inputs:
  - `owner` (string): Repository owner
  - `repo` (string): Repository name
  - `issue_number` (number): Issue number to retrieve
- Returns: GitHub Issue object & details

## Search Query Syntax

### Issues Search
- `is:issue` or `is:pr`: Filter by type
- `is:open` or `is:closed`: Filter by state
- `label:bug`: Search by label
- `author:username`: Search by author
- Example: `q: "memory leak" is:issue is:open label:bug`

For detailed search syntax, see [GitHub's searching documentation](https://docs.github.com/en/search-github/searching-on-github).

## Setup

### Environment Variables
This server supports the following environment variables:
- `GITHUB_PERSONAL_ACCESS_TOKEN`: Your GitHub Personal Access Token (required)
- `GITHUB_DEFAULT_OWNER`: Default repository owner (optional)
- `GITHUB_DEFAULT_REPO`: Default repository name (optional)

### Personal Access Token
[Create a GitHub Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) with appropriate permissions:
   - Go to [Personal access tokens](https://github.com/settings/tokens) (in GitHub Settings > Developer settings)
   - Select which repositories you'd like this token to have access to (Public, All, or Select)
   - Create a token with the `repo` scope ("Full control of private repositories")
     - Alternatively, if working only with public repositories, select only the `public_repo` scope
   - Copy the generated token

### Usage with Claude Desktop
To use this with Claude Desktop, add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": [
        "-y",
        "@feedmob/github-issues"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "<YOUR_TOKEN>",
        "GITHUB_DEFAULT_OWNER": "optional-default-owner",
        "GITHUB_DEFAULT_REPO": "optional-default-repo"
      }
    }
  }
}
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
