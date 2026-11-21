import { GitHubError } from '../api/errors.js';

/**
 * @typedef {object} SectionState
 * @property {'pending' | 'error' | 'success'} status
 * @property {any} data
 * @property {Error | null} error
 * @property {Error | null} failureReason  Latest failure while automatic retries are still running.
 * @property {boolean} isFetching
 * @property {number} failureCount  Failed attempts so far, including automatic retries.
 * @property {(() => void) | null} retry
 */

/**
 * Reduce a TanStack Query result to the fields the panels render, so live
 * queries and the local sample data share one rendering path.
 * @returns {SectionState}
 */
export function fromQuery(query) {
  return {
    status: query.status,
    data: query.data,
    error: query.error ?? null,
    failureReason: query.failureReason ?? null,
    isFetching: query.fetchStatus === 'fetching',
    failureCount: query.failureCount ?? 0,
    retry: () => query.refetch(),
  };
}

/** @returns {SectionState} */
export function fromData(data) {
  return {
    status: 'success',
    data,
    error: null,
    failureReason: null,
    isFetching: false,
    failureCount: 0,
    retry: null,
  };
}

/**
 * Convert a stored snapshot section into a section state. Sections GitHub
 * could not provide at capture time keep their original error, with no retry.
 * @param {{ data?: any, error?: { kind: string, status: number | null, message: string } }} record
 * @returns {SectionState}
 */
export function fromSnapshot(record) {
  if (record && 'data' in record) return fromData(record.data);
  const error = new GitHubError(record?.error?.kind ?? 'unknown', record?.error?.message ?? '', {
    status: record?.error?.status ?? undefined,
  });
  return {
    status: 'error',
    data: undefined,
    error,
    failureReason: null,
    isFetching: false,
    failureCount: 0,
    retry: null,
  };
}
