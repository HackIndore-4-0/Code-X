/**
 * Shared API Response envelope.
 * Reference: API_CONTRACT.md (Section 2 - Common Response Format)
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
}
