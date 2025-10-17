# Civitai Content Recording Workflow

You are helping track Civitai content. Follow this workflow to properly record items:

## Workflow Overview

The typical workflow for tracking Civitai content follows this order:
1. Create prompt (if applicable)
2. Create asset (linking to prompt if it was used to generate)
3. Create Civitai post (linking to asset if applicable)
4. Create additional associations (if needed)

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
**Optional**: `input_prompt_id` (from step 1), `output_prompt_id`, `metadata`
**Output**: Returns `asset_id` - save this for the next step

**Important**:
- `input_prompt_id`: The prompt that GENERATED this asset (link the prompt_id from step 1)
- `output_prompt_id`: A prompt derived FROM this asset (e.g., a caption you created)
- `asset_source`: Use "generated" for AI-generated, "upload" for user uploads

**Example**:
```json
{
  "asset_url": "s3://my-bucket/images/sunset-mountain-12345.jpg",
  "asset_type": "image",
  "asset_source": "generated",
  "input_prompt_id": "123"
}
```

### 3. Recording a Civitai Post
**When**: After publishing content to Civitai
**Tool**: `create_civitai_post`
**Required**: `civitai_id`, `civitai_url`
**Optional**: `status`, `asset_id` (from step 2), `asset_type`, `title`, `description`, `metadata`
**Output**: Returns `post_id`

**Important**:
- `civitai_id`: Extract from URL like https://civitai.com/posts/23602354 → use "23602354"
- `status`: "published" (default), "pending", or "failed"
- `asset_id`: Link to the asset you created in step 2
- `metadata`: Store additional information such as Civitai API response, engagement metrics, tags, or custom tracking data

**Example**:
```json
{
  "civitai_id": "23602354",
  "civitai_url": "https://civitai.com/posts/23602354",
  "status": "published",
  "asset_id": "456",
  "asset_type": "image",
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

### 4. Creating Additional Associations (Optional)
**When**: If you need to link multiple assets or prompts to one post
**Tool**: `create_post_association`
**Required**: `post_id`, `association_id`, `association_type`

**Use cases**:
- A post with multiple images (link each asset_id)
- A post with multiple prompts used (link each prompt_id)

**Example**:
```json
{
  "post_id": "789",
  "association_id": "999",
  "association_type": "asset"
}
```

## Common Workflows

### Full Workflow (Prompt → Asset → Post)
1. `create_prompt` → get `prompt_id`
2. `create_asset` with `input_prompt_id` → get `asset_id`
3. `create_civitai_post` with `asset_id` → get `post_id`

### Asset + Post (No Prompt)
1. `create_asset` (leave `input_prompt_id` null) → get `asset_id`
2. `create_civitai_post` with `asset_id` → get `post_id`

### Post Only (No Asset)
1. `create_civitai_post` (leave `asset_id` null) → get `post_id`

## Updating Records

### Update Asset's Prompt Links
**Tool**: `update_asset_prompt`
**Required**: `asset_id`
**Optional**: `input_prompt_id`, `output_prompt_id`
**Use**: Change which prompts are linked to an asset

**Example**:
```json
{
  "asset_id": "456",
  "input_prompt_id": "789",
  "output_prompt_id": null
}
```

### Update Post's Asset
**Tool**: `update_civitai_post_asset`
**Required**: `post_id`
**Optional**: `asset_id`, `asset_type`
**Use**: Change which asset is linked to a post

**Example**:
```json
{
  "post_id": "123",
  "asset_id": "999",
  "asset_type": "image"
}
```

## Querying Records

### List Posts
**Tool**: `list_civitai_posts`
**Filters**: `civitai_id`, `asset_id`, `asset_type`, `status`, `created_by`, `start_time`, `end_time`
**Pagination**: `limit`, `offset`
**Details**: Set `include_details: true` to get full asset and prompt information

## Best Practices

1. **Always save IDs**: Each tool returns an ID - save it for linking in subsequent steps
2. **Follow the order**: Prompt → Asset → Post (create dependencies first)
3. **Use metadata wisely**: Store relevant information in the `metadata` field including:
   - API responses from Civitai or other platforms
   - Engagement metrics (views, likes, comments, shares)
   - Tags, categories, and classifications
   - Workflow or generation details
   - Custom tracking fields for your use case
4. **Link properly**: 
   - `input_prompt_id`: What prompt CREATED this asset
   - `output_prompt_id`: What prompt was DERIVED FROM this asset
5. **Extract civitai_id correctly**: From https://civitai.com/posts/23602354, the ID is "23602354"
6. **Filter by creator**: Use `created_by` in `list_civitai_posts` to see posts from specific users

## Error Prevention

- IDs must be strings containing valid integers
- `asset_type` must be "image" or "video"
- `asset_source` must be "generated" or "upload"
- `status` must be "pending", "published", or "failed"
- `association_type` must be "asset" or "prompt"
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
- Create the primary asset during post creation
- Use `create_post_association` to link additional assets afterward
