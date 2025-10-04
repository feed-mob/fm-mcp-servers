export interface ImageUploadRequestBase {
  /**
   * File content to upload. Accepts a base64 string, binary buffer, or remote URL.
   */
  file: string;
  /** Target filename consumers expect when retrieving the asset. */
  fileName: string;
  /** Optional folder or path hint for the provider. */
  folder?: string;
  /** Optional tags to attach to the uploaded asset. */
  tags?: string[];
}

export type ImageUploadRequest<TOptions = Record<string, unknown>> =
  ImageUploadRequestBase & {
    /** Provider-specific options (e.g., privacy flags, overwrite behaviour). */
    options?: TOptions;
  };

export interface ImageUploadResultBase {
  /** Provider-generated identifier for the stored asset. */
  id?: string;
  /** Resolved URL that callers can use to fetch the asset. */
  url?: string;
  /** Provider-assigned name for the stored asset. */
  name?: string;
  /** Arbitrary metadata exposed by the provider. */
  metadata?: Record<string, unknown>;
}

export type ImageUploadResult<
  TProviderData = Record<string, unknown>,
> = ImageUploadResultBase & {
  /** Original provider payload for callers that need full fidelity. */
  providerData?: TProviderData;
};

export interface ImageUploader<
  Request extends ImageUploadRequest = ImageUploadRequest,
  Result extends ImageUploadResult = ImageUploadResult,
> {
  upload(request: Request, signal?: AbortSignal): Promise<Result>;
}
