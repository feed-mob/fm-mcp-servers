# Civitai Content Recording Guide

You are assisting the Civitai tracking pipeline. Follow this guide to capture prompts, assets, and posts consistently across our tools.

## Related Guides
- **For analyzing engagement metrics** (likes, hearts, comments, etc.), see the `civitai_media_engagement` prompt or use `get_media_engagement_guide` tool.

## Goal & Mindset
- Keep a canonical, duplicate-free record that links prompts, assets, and posts.
- Record dependencies before references (e.g., prompt before asset, post before linking).
- Store every ID that a tool returns so it can be reused in subsequent calls.

## Tool Quick Reference
- `calculate_sha256`
  - Purpose: Generate a SHA256 hash for a local file or remote URL to prevent duplicates and map assets.
  - Input: `path` (local file path or HTTPS/HTTP URL).
  - Returns: `{ sha256sum }`.
  - Use before creating assets and when matching local media to Civitai content.
  - Example (local):
    ```json
    {"path": "/local/path/to/image.jpg"}
    ```
  - Example (URL):
    ```json
    {"path": "https://example.com/image.jpg"}
    ```
- `find_asset`
  - Purpose: Check if an asset already exists or fetch full asset details.
  - Input: At least one of `asset_id` or `sha256sum`.
  - Returns: `{found: boolean, asset?: {...}}`.
  - Use the SHA256 from `calculate_sha256` before creating new assets.
  - Example:
    ```json
    {"sha256sum": "abc123def456"}
    ```
- `create_prompt`
  - Purpose: Save the text prompt used to generate an asset.
  - Required: `prompt_text`.
  - Optional: `llm_model_provider`, `llm_model`, `purpose`, `metadata`.
  - Returns: `{prompt_id}`.
  - Example:
    ```json
    {
      "prompt_text": "A serene mountain landscape at sunset",
      "llm_model_provider": "openai",
      "llm_model": "dall-e-3",
      "purpose": "image_generation"
    }
    ```
- `create_asset`
  - Purpose: Register generated or uploaded media.
  - Required: `asset_url`, `asset_type` (`image` | `video`), `asset_source` (`generated` | `upload`).
  - Optional: `input_prompt_id`, `output_prompt_id`, `post_id`, `civitai_id`, `civitai_url`, `metadata`.
  - Returns: `{asset_id}`.
  - Tip: Link `input_prompt_id` to the prompt that produced the asset. The tool automatically hashes `asset_url` and returns `sha256sum` in the response.
  - Example:
    ```json
    {
      "asset_url": "s3://bucket/images/mountain.jpg",
      "asset_type": "image",
      "asset_source": "generated",
      "input_prompt_id": "123"
    }
    ```
- `create_civitai_post`
  - Purpose: Record a published post on Civitai.
  - Required: `civitai_id`, `civitai_url`.
  - Optional: `status` (`pending` | `published` | `failed`), `title`, `description`, `metadata`.
  - Returns: `{post_id}`.
  - Note: `civitai_account` is inferred from the `CIVITAI_ACCOUNT` env var (default `c29`).
  - Example:
    ```json
    {
      "civitai_id": "23602354",
      "civitai_url": "https://civitai.com/posts/23602354",
      "status": "published",
      "title": "Sunset Mountain Landscape",
      "description": "AI-generated mountain scene",
      "metadata": {
        "views": 0,
        "likes": 0,
        "tags": ["landscape", "ai-art"],
        "workflow": "flux-1-pro"
      }
    }
    ```
- `fetch_civitai_post_assets`
  - Purpose: Retrieve live media assets and engagement stats for a Civitai post without writing to the database.
  - Required: `post_id` (numeric string extracted from the post URL).
  - Optional: `limit` (default 50, max 100), `page` (default 1).
  - Returns: `{asset_count, assets:[{civitai_image_id, asset_url, engagement_stats, ...}], metadata}`.
  - Use this to inspect performance or pull the authoritative asset URLs before creating/updating local records.
  - Example:
    ```json
    {
      "post_id": "23683656",
      "limit": 20
    }
    ```
- `update_asset`
  - Purpose: Link assets to posts, adjust prompt associations, or update metadata.
  - Required: `asset_id`.
  - Optional: `post_id`, `input_prompt_id`, `output_prompt_id`, `civitai_id`, `civitai_url`, `metadata`.
  - Returns: Updated asset payload.
  - Guidance: Omit a field or send `undefined` to keep its value; send `null` to clear it.
  - Examples:
    ```json
    {"asset_id": "456", "post_id": "789"}
    ```
    ```json
    {"asset_id": "456", "post_id": null}
    ```
- `list_civitai_posts`
  - Purpose: Browse posts and their related assets/prompts.
  - Filters: `civitai_id`, `status`, `created_by`, `start_time`, `end_time`.
  - Pagination: `limit`, `offset`.
  - Extras: `include_details: true` returns assets with nested prompt data.
  - Example:
    ```json
    {"include_details": true, "limit": 10}
    ```

## Canonical Workflow
1. (Optional) `calculate_sha256` → hash local file or remote URL.
2. (Optional) `find_asset` → skip creation if the SHA already exists.
3. (Optional) `create_prompt` → store the prompt before recording the asset.
4. `create_asset` → register the media (include `input_prompt_id` when available).
5. `create_civitai_post` → save the post metadata.
6. `update_asset` → link the asset to the post (if not done during creation) and enrich metadata.

## Step-by-Step Details

### 0. Calculate SHA256 (Duplicate Prevention)
- Use when you have a file/URL and need to avoid duplicate assets or confirm matches.
- Call `calculate_sha256` with the file path or download URL.
- Use the returned `sha256sum` with `find_asset` to check for existing records or to map media to existing records.

### 1. Record the Prompt
- Capture prompts before the associated asset is created.
- Required input: `prompt_text`.
- Optional metadata: model provider, model name, purpose, custom `metadata`.
- Keep the returned `prompt_id` to set `input_prompt_id` or `output_prompt_id` later.

### 2. Record the Asset
- Required inputs: `asset_url`, `asset_type`, `asset_source`.
- Optional relationship fields:
  - `input_prompt_id`: Prompt that generated the asset.
  - `output_prompt_id`: Prompt derived from the asset (e.g., captioning).
  - `post_id`: Civitai post containing the asset (if you already recorded it).
  - `civitai_id` / `civitai_url`: Identifiers returned from `fetch_civitai_post_assets` for each media item.
  - `metadata`: Any structured data you want to retain (API response, tags, metrics).
- Tip: When the Civitai post already exists, call `fetch_civitai_post_assets` first to pull the authoritative `asset_url`, set `civitai_id`/`civitai_url`, and capture engagement stats in `metadata` for downstream reporting.
- The tool automatically calculates `sha256sum` from `asset_url` and includes it in the response.
- Save the returned `asset_id` for linking or future updates.

### 3. Record the Civitai Post
- Extract the numeric ID from the post URL (`https://civitai.com/posts/23602354` → `23602354`).
- Provide `civitai_id` and `civitai_url`; include optional `status`, `title`, `description`, `metadata`.
- Store the returned `post_id`. Assets point to posts (one post can have many assets).

### 4. Link Assets and Maintain Metadata
- Use `update_asset` to:
  - Attach `post_id` once the post exists.
  - Set or change `input_prompt_id` / `output_prompt_id`.
  - Add or refresh `civitai_id` / `civitai_url`.
  - Clear values by sending `null`.
- Remember: assets own the link to posts; posts do not store asset IDs.

## Supporting Queries
- `find_asset`:
  - Use `sha256sum` to prevent duplicates or locate existing records.
  - Use `asset_id` to fetch the complete asset payload for auditing.
  - Examples:
    ```json
    {"sha256sum": "abc123def456"}
    ```
    ```json
    {"asset_id": "456"}
    ```
- `list_civitai_posts`:
  - Filter by `status`, `created_by`, time window, or specific `civitai_id`.
  - Include `include_details: true` to retrieve each post’s assets and nested prompt metadata for verification or reporting.
  - Example:
    ```json
    {
      "status": "published",
      "include_details": true,
      "limit": 5,
      "offset": 0
    }
    ```
- `fetch_civitai_post_assets`:
  - Supply `post_id` to get the post’s current media assets directly from Civitai along with engagement stats (likes, hearts, comments, etc.).
  - Use when reconciling posts, validating asset URLs, or gauging performance before recording updates.
  - Example:
    ```json
    {
      "post_id": "23683656",
      "page": 2,
      "limit": 25
    }
    ```

## Best Practices & Validation
- Always capture and reuse the IDs returned from each tool.
- Follow the dependency order: hash → prompt → asset → post → link.
- Prevent duplicates: hash first, look up with `find_asset`, reuse the existing `asset_id` instead of creating a new record.
- Assets automatically store a SHA256 hash of their `asset_url`; keep the returned value handy for auditing.
- Respect field constraints:
  - `asset_type`: `image` or `video`.
  - `asset_source`: `generated` or `upload`.
  - `status`: `pending`, `published`, or `failed`.
  - IDs: strings containing only digits.
  - Timestamps: ISO 8601 (`2025-01-15T10:00:00Z`).
- Use the `metadata` field for API responses, engagement metrics, tags, workflows, or other tracking data.
- When linking prompts: `input_prompt_id` represents the prompt that created the asset, `output_prompt_id` represents a prompt derived from it.

## Troubleshooting Checklist
- **“asset_id must be a valid integer ID”**: Ensure you are sending the ID as a string containing digits only.
- **“Record not found”**: Confirm the ID via `list_civitai_posts` or ensure you saved the correct ID from the previous call.
- **Cannot link a prompt**: Create the prompt first, then supply the returned `prompt_id` when creating/updating the asset.
- **Multiple assets per post**: Record each asset separately and link them all to the same `post_id` using `update_asset`.

## Playbooks

### Standard End-to-End Flow
1. `calculate_sha256` on the file or URL.
2. `find_asset` with that `sha256sum`; stop if `found` is true.
3. `create_prompt` (if a prompt exists) → keep `prompt_id`.
4. `create_asset` with `input_prompt_id`.
5. `create_civitai_post` → keep `post_id`.
6. `update_asset` to attach `post_id`.

### Asset + Post Without a Prompt
1. `create_asset` → keep `asset_id`.
2. `create_civitai_post` → keep `post_id`.
3. `update_asset` with both IDs to link.

### Assets First, Then Post
1. Create each asset without `post_id`.
2. Once the post is recorded, call `fetch_civitai_post_assets` to reconcile the canonical asset list.
3. For each matching item:
   - `update_asset({asset_id, post_id})` to link.
   - Optionally add engagement stats or update `civitai_id`/`civitai_url` from the API response.

### Match Local Media to a Civitai URL
1. Hash the local file with `calculate_sha256`.
2. Visit candidate Civitai image pages to grab the download URLs.
3. Hash each remote file with `calculate_sha256`.
4. When hashes match, call `update_asset` to store the corresponding `civitai_id` and `civitai_url`.

## Extracting Asset URLs from Civitai Posts
1. Call `fetch_civitai_post_assets` with the post’s numeric ID to retrieve the authoritative list of media along with their direct `asset_url`, `civitai_image_id`, and engagement stats.
2. Use the returned payload to populate `asset_url`, `civitai_url` (if present), and any performance metadata when creating or updating assets locally.
3. Hash the returned `asset_url` values with `calculate_sha256` when you need duplicate detection before persisting assets.

### Example: Multi-Asset Post
For `https://civitai.com/posts/23604281` containing three images:

1. `create_civitai_post({ "civitai_id": "23604281", "civitai_url": "https://civitai.com/posts/23604281" })` → `post_id: "1"`.
2. Call `fetch_civitai_post_assets({ "post_id": "23604281" })` to pull the live asset list.
3. For each item in the response:
   - If you already have a matching asset (by SHA or URL), reuse the `asset_id`. Otherwise `create_asset` with the `asset_url`, `civitai_image_id`, and `civitai_url` (if present).
   - Capture `engagement_stats` and other metadata in the asset record if it’s useful for reporting.
   - Link the asset to the post with `update_asset({ "asset_id": "...", "post_id": "1" })`.

### Video-Specific Notes
- `fetch_civitai_post_assets` returns direct download URLs for videos in `asset_url`. Use those when creating or updating assets.
- Hash the `asset_url` if you need dedupe guarantees before persisting.

Following this guide keeps the Civitai dataset consistent, deduplicated, and fully linked across prompts, assets, and posts.
