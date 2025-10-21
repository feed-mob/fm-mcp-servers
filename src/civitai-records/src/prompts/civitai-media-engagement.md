# Civitai Media Engagement Guide

This guide helps you find and analyze engagement metrics for Civitai media, especially videos, using the available tools.

## Overview

Civitai posts contain media assets (images and videos) with engagement metrics including:
- **Reactions**: likes, hearts, laughs, cries, dislikes
- **Comments**: comment count

## Tools for Finding Media Engagement

### 1. `fetch_civitai_post_assets`
**Primary tool for getting live engagement data directly from Civitai.**

**Purpose**: Fetches real-time media assets and their engagement stats for a specific post without querying the local database.

**When to use**:
- You have a Civitai post URL and want to see current engagement
- You need up-to-date performance metrics
- You want to inspect video URLs and metadata

**Input**:
```json
{
  "post_id": "23602354",
  "limit": 50,
  "page": 1
}
```

**Output includes**:
- `civitai_image_id`: Unique identifier for each media asset
- `asset_url`: Direct download URL for the video/image
- `type`: Media type (e.g., "video", "image")
- `engagement_stats`:
  - `like`: Number of likes
  - `heart`: Number of hearts
  - `laugh`: Number of laughs
  - `cry`: Number of cries
  - `dislike`: Number of dislikes
  - `comment`: Number of comments
- `dimensions`: Width and height (when available)
- `created_at`: When the asset was uploaded
- `username`: Creator username
- `nsfw`: NSFW flag and level

**Example workflow**:
```json
{
  "post_id": "23602354"
}
```
Response shows all videos in the post with their current engagement metrics.

### 2. `list_civitai_posts`
**Secondary tool for browsing recorded posts and their stored asset data.**

**Purpose**: Query the local database for posts you've previously recorded.

**When to use**:
- You want to see what posts are already in your database
- You need to filter by status, creator, or time range
- You want to get stored asset information (use `include_details: true`)

**Input**:
```json
{
  "civitai_id": "23602354",
  "include_details": true
}
```

**Note**: This returns stored data from your database, not live Civitai data. For current engagement metrics, use `fetch_civitai_post_assets`.

### 3. `find_asset`
**Tertiary tool for looking up specific assets in your database.**

**Purpose**: Find a single asset by ID, SHA256 hash, Civitai ID, or post ID.

**When to use**:
- You have an asset's Civitai image ID and want to check if it's recorded locally
- You need full details about a specific asset including linked prompts and posts

**Input**:
```json
{
  "civitai_id": "106432973"
}
```

**Note**: This queries your local database. Engagement metrics are only available if you stored them in the `metadata` field when creating/updating the asset.

## Step-by-Step: Finding Media Engagement

### Scenario 1: You have a Civitai post URL
**Goal**: Get engagement metrics for all videos in the post.

1. **Extract the post ID** from the URL:
   - URL: `https://civitai.com/posts/23602354`
   - Post ID: `23602354`

2. **Fetch live engagement data**:
   ```json
   {
     "post_id": "23602354",
     "limit": 100
   }
   ```
   Use `fetch_civitai_post_assets` to get all media assets.

3. **Analyze the data**:
   - Total engagement = sum of all reaction types
   - Most popular videos = highest like or heart counts
   - Controversial content = high dislike or mix of reactions

### Scenario 2: You have a Civitai video/image URL
**Goal**: Get engagement for a specific video or image.

1. **Extract the media ID** from the URL:
   - URL: `https://civitai.com/images/106432973`
   - Media ID: `106432973`

2. **Check if it's in your database**:
   ```json
   {
     "civitai_id": "106432973"
   }
   ```
   Use `find_asset` to see if you've recorded it.

3. **Get the post ID** from the result (if found):
   - Look for `post.civitai_id` in the response

4. **Fetch live engagement**:
   ```json
   {
     "post_id": "<post_civitai_id>"
   }
   ```
   Use `fetch_civitai_post_assets` and find the matching `civitai_image_id`.

## Engagement Metrics Explained

### Reaction Types
- **Like** 👍: Standard positive reaction
- **Heart** ❤️: Strong positive reaction, often indicates favorite content
- **Laugh** 😂: Humorous or entertaining content
- **Cry** 😢: Emotional or touching content
- **Dislike** 👎: Negative reaction
- **Comment** 💬: Discussion and engagement depth

### Interpreting Engagement
- **High engagement**: Large total reaction count relative to views
- **Positive ratio**: (likes + hearts + laughs) / (total reactions)
- **Controversy score**: dislikes / total reactions
- **Discussion depth**: comments / total reactions

## Best Practices

1. **Always use `fetch_civitai_post_assets` for current data**
   - Don't rely on stored database values for live engagement
   - The database stores historical snapshots, not real-time data

2. **Extract post IDs from URLs correctly**
   - Post URL: `https://civitai.com/posts/XXXXXX` → `XXXXXX`
   - Image URL: `https://civitai.com/images/YYYYYY` → need to find parent post

3. **Handle pagination for large posts**
   - Default limit is 50, maximum is 100
   - Use `page` parameter to fetch additional assets
   - Check `asset_count` to know if there are more pages

## Common Workflows

### Find Top-Performing Media
1. Fetch all assets from multiple posts
2. Filter by type if desired (e.g., `type === "video"` or `type === "image"`)
3. Sort by engagement metrics (e.g., likes + hearts)
4. Identify patterns in high-performing content

### Compare Video vs Image Engagement
1. Fetch assets from posts with mixed media
2. Separate by type
3. Calculate average engagement per type
4. Analyze which format performs better for your content

### Audit Your Content Library
1. Use `list_civitai_posts` with `include_details: true`
2. Get stored post_ids from your database
3. Fetch current engagement for each using `fetch_civitai_post_assets`

### Analyze Engagement by Creator
**Goal**: Get total engagement metrics across all posts from a specific creator.

1. **List all posts by creator**:
   ```json
   {
     "created_by": "username",
     "limit": 100
   }
   ```
   Use `list_civitai_posts` to get all posts from the creator.

2. **Extract post IDs**:
   - From the response, collect all `civitai_id` values
   - These are the post IDs you'll need for fetching engagement

3. **Fetch engagement for each post**:
   - For each `civitai_id` from step 2, call `fetch_civitai_post_assets`:
   ```json
   {
     "post_id": "<civitai_id>"
   }
   ```

4. **Aggregate the metrics**:
   - Sum all engagement stats (likes, hearts, comments, etc.) across all posts
   - Calculate average engagement per post
   - Identify the creator's top-performing content
   - Analyze engagement trends over time (use `created_at` field)

**Example analysis**:
- Total reactions across all creator's posts
- Average likes per video/image
- Most engaged post by this creator
- Engagement distribution by content type (video vs image)

## Troubleshooting

**"Failed to fetch assets from Civitai"**
- Verify the post ID is correct (numeric only)
- Check if the post is public and accessible
- Ensure you have internet connectivity

**"No assets found"**
- The post might have been deleted or made private
- Try accessing the post URL in a browser to verify
- Check if pagination is needed (increase `page` parameter)

**"Asset not in database"**
- Use `fetch_civitai_post_assets` to get data directly from Civitai
- The asset might not be recorded locally yet
- Use the returned data to create a new asset record

## Summary

To find Civitai media (video/image) engagement:
1. **Have a post URL?** → Extract ID → `fetch_civitai_post_assets`
2. **Have a video/image URL?** → Extract ID → `find_asset` → get post ID → `fetch_civitai_post_assets`
3. **Want stored data?** → `list_civitai_posts` with `include_details: true`
4. **Need real-time metrics?** → Always use `fetch_civitai_post_assets`
