import { Prisma } from "@prisma/client";

/**
 * Handle Prisma database errors and convert them to LLM-friendly messages.
 * This is a centralized error handler for all database operations.
 * 
 * The messages are designed to be:
 * - Clear and actionable
 * - Explain WHY the error occurred
 * - Suggest HOW to fix it
 * - Provide context about what went wrong
 * 
 * @param error - The error thrown by Prisma
 * @param context - Additional context to include in error messages (e.g., URL, ID)
 * @throws Always throws an error with an LLM-friendly message
 */
export function handleDatabaseError(error: unknown, context?: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const target = error.meta?.target as string[] | undefined;
    const contextInfo = context ? `\n\n${context}` : '';
    
    // P2002: Unique constraint violation
    if (error.code === 'P2002') {
      // Specific handling for sha256sum (duplicate content)
      if (target?.includes('sha256sum')) {
        throw new Error(
          `❌ DUPLICATE CONTENT DETECTED\n\n` +
          `This asset already exists in the database with the same content (same sha256sum hash).\n\n` +
          `What this means:\n` +
          `- You're trying to save content that has already been saved before\n` +
          `- The file content is identical to an existing asset\n\n` +
          `What to do:\n` +
          `1. Use the find_asset tool to search for existing assets with this URL or content\n` +
          `2. If you need to update the existing asset, use update_asset instead of create_asset\n` +
          `3. If you want to create a new record anyway, make sure the content is actually different${contextInfo}`
        );
      }
      
      // Specific handling for civitai_id
      if (target?.includes('civitai_id')) {
        throw new Error(
          `❌ DUPLICATE CIVITAI ID\n\n` +
          `A record with this Civitai ID already exists in the database.\n\n` +
          `What this means:\n` +
          `- You're trying to create a new record with a civitai_id that's already in use\n` +
          `- This could be an asset or post that was already saved\n\n` +
          `What to do:\n` +
          `1. Use find_asset or list_civitai_posts to check if this record already exists\n` +
          `2. If it exists and needs updates, use update_asset or update the post instead\n` +
          `3. Verify that the civitai_id is correct - maybe you copied it from the wrong URL${contextInfo}`
        );
      }
      
      // Generic unique constraint violation
      const fields = target?.join(', ') || 'unknown field(s)';
      throw new Error(
        `❌ DUPLICATE DATA DETECTED\n\n` +
        `A record with the same ${fields} already exists in the database.\n\n` +
        `What this means:\n` +
        `- You're trying to create a record with data that must be unique\n` +
        `- Another record already uses this value\n\n` +
        `What to do:\n` +
        `1. Check if a similar record already exists using the appropriate search tool\n` +
        `2. If you want to modify an existing record, use an update tool instead\n` +
        `3. If you need a new record, make sure all unique fields have different values${contextInfo}`
      );
    }
    
    // P2003: Foreign key constraint violation
    if (error.code === 'P2003') {
      const field = error.meta?.field_name as string | undefined;
      throw new Error(
        `❌ INVALID REFERENCE ID\n\n` +
        `The ${field || 'referenced'} ID you provided doesn't exist in the database.\n\n` +
        `What this means:\n` +
        `- You're trying to link to a record that doesn't exist\n` +
        `- The ID might be wrong, or the referenced record was never created\n\n` +
        `What to do:\n` +
        `1. If referencing a prompt: Create the prompt first using create_prompt, then use its returned ID\n` +
        `2. If referencing a post: Create the post first using create_civitai_post, then use its returned ID\n` +
        `3. Double-check that you're using the correct ID from a previous operation\n` +
        `4. Make sure you didn't skip a step in your workflow${contextInfo}`
      );
    }
    
    // P2025: Record not found
    if (error.code === 'P2025') {
      throw new Error(
        `❌ RECORD NOT FOUND\n\n` +
        `The record you're trying to access doesn't exist in the database.\n\n` +
        `What this means:\n` +
        `- The ID you provided is incorrect or the record was deleted\n\n` +
        `What to do:\n` +
        `1. Verify the ID is correct\n` +
        `2. Use the appropriate find or list tool to search for the record\n` +
        `3. If you need to create it, use a create tool instead of update${contextInfo}`
      );
    }
    
    // P2014: Required relation violation
    if (error.code === 'P2014') {
      throw new Error(
        `❌ REQUIRED RELATIONSHIP VIOLATION\n\n` +
        `This operation would break a required relationship in the database.\n\n` +
        `What this means:\n` +
        `- You're trying to remove or change something that other records depend on\n\n` +
        `What to do:\n` +
        `1. Check what other records are linked to this one\n` +
        `2. Update or delete dependent records first\n` +
        `3. Consider if this operation is really necessary${contextInfo}`
      );
    }
    
    // Generic Prisma error
    throw new Error(
      `❌ DATABASE ERROR\n\n` +
      `Error Code: ${error.code}\n` +
      `Message: ${error.message}\n\n` +
      `What to do:\n` +
      `1. Review the error message for clues\n` +
      `2. Check that all required fields are provided\n` +
      `3. Verify that data types are correct${contextInfo}`
    );
  }
  
  // Re-throw unknown errors with better formatting if possible
  if (error instanceof Error) {
    throw new Error(
      `❌ UNEXPECTED ERROR\n\n` +
      `${error.message}\n\n` +
      `This is an unexpected error. Please review the operation and try again.${context ? `\n\n${context}` : ''}`
    );
  }
  
  throw error;
}

/**
 * Wrap a database operation with error handling.
 * Provides a clean way to handle errors without try-catch in every function.
 * 
 * @param operation - The async database operation to execute
 * @param context - Additional context for error messages
 * @returns The result of the operation
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleDatabaseError(error, context);
  }
}
