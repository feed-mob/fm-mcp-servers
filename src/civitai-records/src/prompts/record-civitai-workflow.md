# Civitai Content Recording Workflow

You are helping track Civitai content. Follow this workflow to properly record items:

## Workflow Overview

The typical workflow for tracking Civitai content follows this order:
1. (Optional) Calculate SHA256 hash for asset files/URLs to prevent duplicates
2. Create prompt (if applicable)
3. Create asset (linking to prompt if it was used to generate)
4. Create Civitai post
5. Link assets to posts (if needed)

## Step-by-Step Instructions

### 0. Calculate SHA256 Hash (Optional - Duplicate Prevention)
**When**: Before creating an asset, to check for duplicates
**Tool**: `calculate_sha256`
**Required**: `path` (file path or URL)
**Output**: Returns `sha256sum` - use with `find_asset` to check if asset exists

**Example**:
```json
{
  "path": "/local/path/to/image.jpg"
}
```

**Example - URL**:
```json
{
  "path": "https://example.com/image.jpg"
}
```

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
- `sha256sum`: Use to prevent duplicates - check with `find_asset` before creating

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
- `civitai_account`: Automatically set from `CIVITAI_ACCOUNT` environment variable (default: "c29")
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

### Full Workflow (SHA256 → Prompt → Asset → Post → Link)
1. `calculate_sha256` with file/URL → get `sha256sum`
2. `find_asset` with `sha256sum` to check if exists
3. `create_prompt` → get `prompt_id`
4. `create_asset` with `input_prompt_id` and `sha256sum` → get `asset_id`
5. `create_civitai_post` → get `post_id`
6. `update_asset` with `asset_id` and `post_id` to link them

### Asset + Post (No Prompt)
1. `create_asset` → get `asset_id`
2. `create_civitai_post` → get `post_id`
3. `update_asset` with `asset_id` and `post_id` to link them

### Asset with Post ID at Creation
1. `create_civitai_post` → get `post_id`
2. `create_asset` with `post_id` → links automatically

### Recording Civitai Post with Its Assets
**Note**: Most Civitai posts contain assets. See "How to Extract Asset URLs from Civitai Posts" section below for detailed instructions on extracting image/video URLs from the post page and recording them properly.

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

### Find Asset (Duplicate Detection)
**Tool**: `find_asset`
**Required**: At least one of `asset_id` OR `sha256sum`
**Optional**: Both parameters can be provided
**Output**: `{found: true, asset: {...}}` or `{found: false}`

**Use cases**:
- Check if an asset with a specific SHA256 hash already exists before creating
- Retrieve full asset details by ID
- Prevent duplicate uploads

**Example - Find by hash**:
```json
{
  "sha256sum": "abc123def456..."
}
```

**Example - Find by ID**:
```json
{
  "asset_id": "456"
}
```

### List Posts
**Tool**: `list_civitai_posts`
**Filters**: `civitai_id`, `status`, `created_by`, `start_time`, `end_time`
**Pagination**: `limit`, `offset`
**Details**: Set `include_details: true` to get full asset information with their associated input and output prompts (posts include arrays of assets with nested prompt data)

**Example - Get posts with full details**:
```json
{
  "include_details": true,
  "limit": 10
}
```

### Calculate SHA256
**Tool**: `calculate_sha256`
**Required**: `path` (file path or URL)
**Use**: Generate SHA256 hash for files or URLs before creating assets
**Output**: Returns `sha256sum` that can be used with `find_asset` and `create_asset`

**Example**:
```json
{
  "path": "https://civitai.com/images/12345.jpg"
}
```

## Best Practices

1. **Always save IDs**: Each tool returns an ID - save it for linking in subsequent steps
2. **Follow the order**: SHA256 → Prompt → Asset → Post → Link (create dependencies first)
3. **Prevent duplicates**: 
   - Use `calculate_sha256` to hash files/URLs
   - Use `find_asset` with `sha256sum` before creating new assets
   - If asset exists, reuse its `asset_id` instead of creating a duplicate
4. **Use metadata wisely**: Store relevant information in the `metadata` field including:
   - API responses from Civitai or other platforms
   - Engagement metrics (views, likes, comments, shares)
   - Tags, categories, and classifications
   - Workflow or generation details
   - Custom tracking fields for your use case
5. **Link properly**: 
   - `input_prompt_id`: What prompt CREATED this asset
   - `output_prompt_id`: What prompt was DERIVED FROM this asset
   - `post_id` in assets: What post this asset belongs to
6. **Extract civitai_id correctly**: From https://civitai.com/posts/23602354, the ID is "23602354"
7. **Civitai account tracking**: Posts are automatically tagged with the `CIVITAI_ACCOUNT` environment variable (default: "c29")
8. **Filter by creator**: Use `created_by` in `list_civitai_posts` to see posts from specific users
9. **Understand the relationship**: Assets point to posts (one-to-many: one post can have many assets)
10. **Get full details**: Use `include_details: true` in `list_civitai_posts` to retrieve complete asset and prompt information

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

## How to Extract Asset URLs from Civitai Posts

When recording a Civitai post that contains multiple images or videos, you need to extract the individual asset URLs from the post page.

### Civitai URL Structure
- **Post URL**: `https://civitai.com/posts/23604281`
- **Image URL**: `https://civitai.com/images/106433016`
- **Post ID**: Extract from post URL (e.g., `23604281`)
- **Image ID**: Extract from image URL (e.g., `106433016`)

### Steps to Extract Asset URLs

1. **Visit the Civitai post page**: Navigate to the post URL (e.g., `https://civitai.com/posts/23604281`)

2. **Identify all images/videos**: Look at each media item in the post

3. **Extract asset URLs**: 
   - Right-click each image and inspect or view the image source
   - Look for URLs in the format `https://civitai.com/images/{IMAGE_ID}`
   - Each image/video has a unique image ID
   - **For videos**: If the user only provides the Civitai image page URL (e.g., `https://civitai.com/images/106432973`), you can fetch the actual download URL by visiting that page and extracting the video download link

4. **Get download URLs for videos**:
   - If user provides: `https://civitai.com/images/106432973`
   - Visit that URL to find the actual video download link
   - Use the download URL as `asset_url` when creating the asset
   - Keep the Civitai image URL in `civitai_url` field

5. **Record the workflow**:
   ```
   For post: https://civitai.com/posts/23604281
   
   a. Create the Civitai post record:
      - civitai_id: "23604281"
      - civitai_url: "https://civitai.com/posts/23604281"
   
   b. For each image in the post (e.g., https://civitai.com/images/106433016):
      - Calculate SHA256: calculate_sha256({path: "https://civitai.com/images/106433016"})
      - Create asset: create_asset({
          asset_url: "https://civitai.com/images/106433016",
          asset_type: "image",
          asset_source: "upload",
          sha256sum: "<hash from step above>",
          civitai_id: "106433016",
          civitai_url: "https://civitai.com/images/106433016",
          post_id: "<post_id from step a>"
        })
   
   b-alt. For videos (e.g., https://civitai.com/images/106432973):
      - Visit the Civitai image page to get the actual video download URL
      - Calculate SHA256: calculate_sha256({path: "<actual_video_download_url>"})
      - Create asset: create_asset({
          asset_url: "<actual_video_download_url>",
          asset_type: "video",
          asset_source: "upload",
          sha256sum: "<hash from step above>",
          civitai_id: "106432973",
          civitai_url: "https://civitai.com/images/106432973",
          post_id: "<post_id from step a>"
        })
   
   c. Repeat step b for each asset in the post
   ```

5. **Alternative workflow** (create assets first, then link):
   ```
   a. Create each asset without post_id
   b. Create the Civitai post → get post_id
   c. Update each asset with: update_asset({asset_id: "...", post_id: "..."})
   ```

### Example: Multi-Asset Post

**Scenario**: Post at `https://civitai.com/posts/23604281` contains 3 images:
- `https://civitai.com/images/106433016`
- `https://civitai.com/images/106433017`
- `https://civitai.com/images/106433018`

**Recording workflow**:
1. `create_civitai_post({civitai_id: "23604281", civitai_url: "https://civitai.com/posts/23604281"})` → returns `post_id: "1"`
2. `create_asset({asset_url: "https://civitai.com/images/106433016", asset_type: "image", asset_source: "upload", civitai_id: "106433016", post_id: "1"})`
3. `create_asset({asset_url: "https://civitai.com/images/106433017", asset_type: "image", asset_source: "upload", civitai_id: "106433017", post_id: "1"})`
4. `create_asset({asset_url: "https://civitai.com/images/106433018", asset_type: "image", asset_source: "upload", civitai_id: "106433018", post_id: "1"})`

### Important Notes for Video Assets

**When user provides a Civitai image page URL for a video** (e.g., `https://civitai.com/images/106432973`):
1. Visit that page to extract the actual video download URL
2. Use the **download URL** as `asset_url` (this is the actual video file location)
3. Use the **Civitai image page URL** as `civitai_url` (this is the public-facing page)
4. Set `asset_type: "video"`

**Example**:
```json
{
  "asset_url": "https://image.civitai.com/video/xyz123.mp4",
  "asset_type": "video",
  "asset_source": "upload",
  "civitai_id": "106432973",
  "civitai_url": "https://civitai.com/images/106432973",
  "post_id": "1"
}
```

### Mapping Assets to Civitai URLs Using SHA256

**Problem**: You have an asset with a local/storage URL and need to find which Civitai image page it belongs to.

**Solution**: Compare SHA256 hashes to verify they're the same file.

**Workflow**:
1. Calculate SHA256 of your local asset:
   ```json
   calculate_sha256({path: "/local/path/video.mp4"})
   ```
   Returns: `sha256sum: "abc123..."`

2. Visit the Civitai image page (e.g., `https://civitai.com/images/106432973`) and extract the video download URL

3. Calculate SHA256 of the Civitai video:
   ```json
   calculate_sha256({path: "https://image.civitai.com/video/xyz123.mp4"})
   ```
   Returns: `sha256sum: "abc123..."`

4. Compare the two SHA256 hashes:
   - If they **match**: The asset corresponds to that Civitai URL
   - If they **don't match**: Try the next Civitai image URL

5. Once matched, update your asset with the Civitai metadata:
   ```json
   update_asset({
     asset_id: "456",
     civitai_id: "106432973",
     civitai_url: "https://civitai.com/images/106432973"
   })
   ```

**Example Scenario**:
- You have 3 local videos: `video1.mp4`, `video2.mp4`, `video3.mp4`
- Civitai post has 3 videos: `images/106432973`, `images/106432974`, `images/106432975`
- Use SHA256 comparison to match each local video to its Civitai URL:
  1. Hash `video1.mp4` → compare with all 3 Civitai videos → finds match with `106432974`
  2. Hash `video2.mp4` → compare with remaining → finds match with `106432973`
  3. Hash `video3.mp4` → compare with remaining → finds match with `106432975`

