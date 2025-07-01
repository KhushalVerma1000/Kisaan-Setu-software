// utils/caseConversion.ts

/**
 * Converts a snake_case string to camelCase
 * @param str - The snake_case string to convert
 * @returns The camelCase string
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Converts a camelCase string to snake_case
 * @param str - The camelCase string to convert
 * @returns The snake_case string
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Recursively converts all keys in an object from snake_case to camelCase
 * @param obj - The object to convert
 * @returns A new object with camelCase keys
 */
export function convertKeysToCamel<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToCamel(item)) as T;
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj as T;
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    return obj as T;
  }

  // Handle regular objects
  const converted: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    converted[camelKey] = convertKeysToCamel(value);
  }

  return converted as T;
}

/**
 * Recursively converts all keys in an object from camelCase to snake_case
 * @param obj - The object to convert
 * @returns A new object with snake_case keys
 */
export function convertKeysToSnake<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysToSnake(item)) as T;
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj as T;
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    return obj as T;
  }

  // Handle regular objects
  const converted: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    converted[snakeKey] = convertKeysToSnake(value);
  }

  return converted as T;
}

/**
 * Type-safe wrapper for API responses
 * Converts snake_case keys to camelCase with proper TypeScript typing
 */
export function convertApiResponse<T>(data: any): T {
  return convertKeysToCamel<T>(data);
}

/**
 * Type-safe wrapper for API requests
 * Converts camelCase keys to snake_case for sending to backend
 */
export function convertApiRequest<T>(data: any): T {
  return convertKeysToSnake<T>(data);
}

// Advanced: Handle specific field mappings if needed
interface FieldMapping {
  [key: string]: string;
}

/**
 * Converts object keys using a custom mapping
 * Useful for specific field name transformations
 */
export function convertKeysWithMapping<T = any>(
  obj: any, 
  mapping: FieldMapping
): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertKeysWithMapping(item, mapping)) as T;
  }

  if (typeof obj !== 'object' || obj instanceof Date) {
    return obj as T;
  }

  const converted: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = mapping[key] || snakeToCamel(key);
    converted[newKey] = convertKeysWithMapping(value, mapping);
  }

  return converted as T;
}

// Helper function to create a fetch wrapper that automatically converts cases
export async function fetchWithCaseConversion<T>(
  url: string, 
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    body: options?.body ? JSON.stringify(convertKeysToSnake(JSON.parse(options.body as string))) : options?.body,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return convertKeysToCamel<T>(data);
}

// Usage examples and test cases
export const testCaseConversion = () => {
  // Test data with snake_case
  const snakeCaseData = {
    user_id: 1,
    first_name: "John",
    last_name: "Doe",
    email_address: "john@example.com",
    user_profile: {
      profile_image_url: "https://example.com/image.jpg",
      date_of_birth: "1990-01-01",
      social_media_links: [
        { platform_name: "twitter", profile_url: "https://twitter.com/john" },
        { platform_name: "linkedin", profile_url: "https://linkedin.com/in/john" }
      ]
    },
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-12-01T00:00:00Z"
  };

  console.log("Original snake_case:", snakeCaseData);
  
  const camelCaseData = convertKeysToCamel(snakeCaseData);
  console.log("Converted to camelCase:", camelCaseData);
  
  const backToSnake = convertKeysToSnake(camelCaseData);
  console.log("Back to snake_case:", backToSnake);
};