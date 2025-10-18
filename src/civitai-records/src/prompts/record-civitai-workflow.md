# Civitai Content Recording Workflow

You are helping track Civitai content. Follow this workflow to properly record items:

## Workflow Overview

The typical workflow for tracking Civitai content follows this order:
1. Create prompt (if applicable)
2. Create asset (linking to prompt if it was used to generate)
3. Create Civitai post
4. Link assets to posts (if needed)

## Step-by-Step Instructions

### 1. Recording a Prompt
**When**: Before generating content, or when you have a text prompt to save
**Tool**: `create_prompt`
**Required**: `prompt_text`
**Optional**: `llm_model_provider`, `llm_model`, `purpose`, `metadata`
**Output**: Returns `prompt_id` - save this for the next step

**Example**:
```json
{
  "prompt_text": "A serene mountain landscape at sunset with vibrant orange and purple skies",
  "llm_model_provider": "openai",
  "llm_model": "dall-e-3",
  "purpose": "image_generation"
}
```

### 2. Recording an Asset
**When**: After generating or uploading media (image/video)
**Tool**: `create_asset`
**Required**: `asset_url`, `asset_type`, `asset_source`
**Optional**: `input_prompt_id` (from step 1), `output_prompt_id`, `post_id`, `civitai_id`, `civitai_url`, `sha256sum`, `metadata`
**Output**: Returns `asset_id`

**Important**:
- `input_prompt_id`: The prompt that GENERATED this asset (link the prompt_id from step 1)
- `output_prompt_id`: A prompt derived FROM this asset (e.g., a caption you created)
- `post_id`: Link to the Civitai post this asset belongs to
- `civitai_id`/`civitai_url`: Direct Civitai metadata for the asset
- `asset_source`: Use "generated" for AI-generated, "upload" for user uploads

**Example**:
```json
{
  "asset_url": "s3://my-bucket/images/sunset-mountain-12345.jpg",
  "asset_type": "image",
  "asset_source": "generated",
  "input_prompt_id": "123",
  "sha256sum": "abc123..."
}
```

### 3. Recording a Civitai Post
**When**: After publishing content to Civitai
**Tool**: `create_civitai_post`
**Required**: `civitai_id`, `civitai_url`
**Optional**: `status`, `title`, `description`, `metadata`
**Output**: Returns `post_id` - save this for linking assets

**Important**:
- `civitai_id`: Extract from URL like https://civitai.com/posts/23602354 → use "23602354"
- `status`: "published" (default), "pending", or "failed"
- Assets link TO posts (not the other way around) - use `update_asset` to set `post_id`
- `metadata`: Store additional information such as Civitai API response, engagement metrics, tags, or custom tracking data

**Example**:
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

### 4. Linking Assets to Posts (Optional)
**When**: If you need to associate an asset with a post
**Tool**: `update_asset`
**Required**: `asset_id`
**Optional**: `post_id`, `civitai_id`, `civitai_url`, `input_prompt_id`, `output_prompt_id`

**Use cases**:
- Link an existing asset to a post you just created
- Update asset metadata with Civitai information
- Change prompt associations

**Example**:
```json
{
  "asset_id": "456",
  "post_id": "789"
}
```

## Common Workflows

### Full Workflow (Prompt → Asset → Post → Link)
1. `create_prompt` → get `prompt_id`
2. `create_asset` with `input_prompt_id` → get `asset_id`
3. `create_civitai_post` → get `post_id`
4. `update_asset` with `asset_id` and `post_id` to link them

### Asset + Post (No Prompt)
1. `create_asset` → get `asset_id`
2. `create_civitai_post` → get `post_id`
3. `update_asset` with `asset_id` and `post_id` to link them

### Asset with Post ID at Creation
1. `create_civitai_post` → get `post_id`
2. `create_asset` with `post_id` → links automatically

### Post Only (No Asset)
1. `create_civitai_post` → get `post_id`

## Updating Records

### Update Asset
**Tool**: `update_asset`
**Required**: `asset_id`
**Optional**: `input_prompt_id`, `output_prompt_id`, `post_id`, `civitai_id`, `civitai_url`
**Use**: Update any asset metadata or associations

**Important**:
- Pass `undefined` to keep current value
- Pass `null` to remove/clear a value
- Pass a new value to update

**Example - Link to post**:
```json
{
  "asset_id": "456",
  "post_id": "789"
}
```

**Example - Clear post link**:
```json
{
  "asset_id": "456",
  "post_id": null
}
```

**Example - Update prompts and Civitai metadata**:
```json
{
  "asset_id": "456",
  "input_prompt_id": "123",
  "civitai_id": "23602354",
  "civitai_url": "https://civitai.com/images/23602354"
}
```

## Querying Records

### List Posts
**Tool**: `list_civitai_posts`
**Filters**: `civitai_id`, `status`, `created_by`, `start_time`, `end_time`
**Pagination**: `limit`, `offset`
**Details**: Set `include_details: true` to get full asset and prompt information (posts now include arrays of associated assets)

## Best Practices

1. **Always save IDs**: Each tool returns an ID - save it for linking in subsequent steps
2. **Follow the order**: Prompt → Asset → Post → Link (create dependencies first)
3. **Use metadata wisely**: Store relevant information in the `metadata` field including:
   - API responses from Civitai or other platforms
   - Engagement metrics (views, likes, comments, shares)
   - Tags, categories, and classifications
   - Workflow or generation details
   - Custom tracking fields for your use case
4. **Link properly**: 
   - `input_prompt_id`: What prompt CREATED this asset
   - `output_prompt_id`: What prompt was DERIVED FROM this asset
   - `post_id` in assets: What post this asset belongs to
5. **Extract civitai_id correctly**: From https://civitai.com/posts/23602354, the ID is "23602354"
6. **Filter by creator**: Use `created_by` in `list_civitai_posts` to see posts from specific users
7. **Understand the relationship**: Assets point to posts (one-to-many: one post can have many assets)

## Error Prevention

- IDs must be strings containing valid integers
- `asset_type` must be "image" or "video"
- `asset_source` must be "generated" or "upload"
- `status` must be "pending", "published", or "failed"
- Timestamps should be ISO 8601 format (e.g., '2025-01-15T10:00:00Z')

## Troubleshooting

**"asset_id must be a valid integer ID"**
- Ensure you're passing the ID as a string containing only digits
- Don't include quotes or special characters in the ID value

**"Record not found"**
- Verify the ID exists by using `list_civitai_posts` to check
- Make sure you're using the correct ID from the previous step's response

**Can't link prompt to asset**
- Create the prompt first using `create_prompt`, then use the returned `prompt_id`
- Don't try to link IDs that don't exist yet - follow the workflow order

**Multiple assets per post**
- A post can have many assets
- Each asset can only belong to one post (or none)
- Use `update_asset` to set the `post_id` for each asset
