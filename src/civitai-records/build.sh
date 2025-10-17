#!/bin/bash

# Exit on error
set -e

echo "🔨 Building civitai-records..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
prisma generate

# Compile TypeScript
echo "🔧 Compiling TypeScript..."
tsc

# Copy generated Prisma files
echo "📋 Copying Prisma generated files..."
cp -r src/generated dist/

# Copy markdown documentation
echo "📄 Copying markdown documentation..."
mkdir -p dist/prompts
cp src/prompts/*.md dist/prompts/

echo "✅ Build complete!"
