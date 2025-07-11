import { z } from "zod";
import { githubRequest, buildUrl } from "../common/utils.js";
import { subDays, format } from 'date-fns';

export const FeedmobSearchOptions =  z.object({
  scheam: z.string().describe("get from system resources issues/search_schema"),
  start_date: z.string().default(format(subDays(new Date(), 6), 'yyyy-MM-dd')).describe("The creation start date of the issue"),
  end_date: z.string().default(format(new Date(), 'yyyy-MM-dd')).describe("The creation end date of the issue"),
  status: z.string().optional().describe("The status of the issue, e.g., 'open', 'closed'"),
  repo: z.string().optional().describe("The repository name, e.g., 'feedmob', 'tracking_admin', If the user does not specify otherwise, this parameter can be omitted and all repos will be searched by default."),
  users: z.array(z.string()).optional().optional(),
  team: z.string().optional().describe("The team name, e.g., 'Star', 'Mighty'"),
});

export const GetIssueSchema = z.object({
  comment_count: z.string().default('all').describe("获取所有的 comment, 或者指定数量的 comment, 默认从最新提交的的开始获取。"),
  repo_issues: z.array(z.object({
    repo: z.string(),
    issue_number: z.number()
  }))
});

export const IssueCommentSchema = z.object({
  owner: z.string(),
  repo: z.string().describe("The repository name, e.g., 'feedmob', 'tracking_admin'"),
  issue_number: z.number(),
  body: z.string(),
});

export const CreateIssueOptionsSchema = z.object({
  title: z.string(),
  body: z.string().optional(),
  assignees: z.array(z.string()).optional(),
  milestone: z.number().optional(),
  labels: z.array(z.string()).optional(),
});

export const CreateIssueSchema = z.object({
  owner: z.string().optional(),
  repo: z.string().describe("The repository name, e.g., 'feedmob', 'tracking_admin'"),
  ...CreateIssueOptionsSchema.shape,
});

export const ListIssuesOptionsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  direction: z.enum(["asc", "desc"]).optional(),
  labels: z.array(z.string()).optional(),
  page: z.number().optional(),
  per_page: z.number().optional(),
  since: z.string().optional(),
  sort: z.enum(["created", "updated", "comments"]).optional(),
  state: z.enum(["open", "closed", "all"]).optional(),
});

export const UpdateIssueOptionsSchema = z.object({
  owner: z.string(),
  repo: z.string().describe("The repository name, e.g., 'feedmob', 'tracking_admin'"),
  issue_number: z.number(),
  title: z.string().optional(),
  body: z.string().optional(),
  assignees: z.array(z.string()).optional(),
  milestone: z.number().optional(),
  labels: z.array(z.string()).optional(),
  state: z.enum(["open", "closed"]).optional(),
});

export async function getIssue(owner: string, repo: string, issue_number: number) {
  return githubRequest(`https://api.github.com/repos/${owner}/${repo}/issues/${issue_number}`);
}

export async function addIssueComment(
  owner: string,
  repo: string,
  issue_number: number,
  body: string
) {
  return githubRequest(`https://api.github.com/repos/${owner}/${repo}/issues/${issue_number}/comments`, {
    method: "POST",
    body: { body },
  });
}

export async function createIssue(
  owner: string,
  repo: string,
  options: z.infer<typeof CreateIssueOptionsSchema>
) {
  return githubRequest(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      method: "POST",
      body: options,
    }
  );
}

export async function listIssues(
  owner: string,
  repo: string,
  options: Omit<z.infer<typeof ListIssuesOptionsSchema>, "owner" | "repo">
) {
  const urlParams: Record<string, string | undefined> = {
    direction: options.direction,
    labels: options.labels?.join(","),
    page: options.page?.toString(),
    per_page: options.per_page?.toString(),
    since: options.since,
    sort: options.sort,
    state: options.state
  };

  return githubRequest(
    buildUrl(`https://api.github.com/repos/${owner}/${repo}/issues`, urlParams)
  );
}

export async function updateIssue(
  owner: string,
  repo: string,
  issue_number: number,
  options: Omit<z.infer<typeof UpdateIssueOptionsSchema>, "owner" | "repo" | "issue_number">
) {
  return githubRequest(
    `https://api.github.com/repos/${owner}/${repo}/issues/${issue_number}`,
    {
      method: "PATCH",
      body: options,
    }
  );
}
