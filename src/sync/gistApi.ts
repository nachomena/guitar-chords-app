// Minimal GitHub Gist REST client for library sync. Authenticated with a
// fine-grained personal access token that only has the "Gists: read and write"
// account permission.
const GITHUB_API_BASE_URL = 'https://api.github.com';

export const SYNC_GIST_FILE_NAME = 'chord-app-library.json';
const SYNC_GIST_DESCRIPTION = 'Chord App song library (synced by the app — do not rename the file)';

export class GistApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
  }
}

type GistFile = { content?: string; truncated?: boolean; raw_url?: string };
type Gist = { id: string; files: Record<string, GistFile | null> };

async function requestGitHubApi<TResponse>(
  gitHubToken: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<TResponse> {
  const response = await fetch(`${GITHUB_API_BASE_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${gitHubToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!response.ok) {
    throw new GistApiError(describeFailedResponse(response.status), response.status);
  }
  return (await response.json()) as TResponse;
}

function describeFailedResponse(httpStatus: number): string {
  if (httpStatus === 401)
    return 'GitHub rejected the token. It may be mistyped, expired or revoked.';
  if (httpStatus === 403)
    return 'The token can’t access gists. Give it the “Gists: read and write” permission.';
  if (httpStatus === 404) return 'The sync gist wasn’t found.';
  return `GitHub returned an error (HTTP ${httpStatus}). Try again later.`;
}

/** Finds the gist holding the synced library among the token owner's gists. */
export async function findSyncGistId(gitHubToken: string): Promise<string | null> {
  for (let pageNumber = 1; pageNumber <= 10; pageNumber++) {
    const gists = await requestGitHubApi<Gist[]>(
      gitHubToken,
      `/gists?per_page=100&page=${pageNumber}`,
    );
    const syncGist = gists.find((gist) => SYNC_GIST_FILE_NAME in gist.files);
    if (syncGist) return syncGist.id;
    if (gists.length < 100) return null;
  }
  return null;
}

/** Creates the secret gist that holds the synced library. Returns its id. */
export async function createSyncGist(gitHubToken: string, fileContent: string): Promise<string> {
  const createdGist = await requestGitHubApi<Gist>(gitHubToken, '/gists', {
    method: 'POST',
    body: {
      description: SYNC_GIST_DESCRIPTION,
      public: false,
      files: { [SYNC_GIST_FILE_NAME]: { content: fileContent } },
    },
  });
  return createdGist.id;
}

export async function readSyncGistFile(gitHubToken: string, gistId: string): Promise<string> {
  const gist = await requestGitHubApi<Gist>(gitHubToken, `/gists/${gistId}`);
  const libraryFile = gist.files[SYNC_GIST_FILE_NAME];
  if (!libraryFile) {
    throw new GistApiError('The sync gist wasn’t found.', 404);
  }
  // The API inlines at most ~1 MB of a file's content; past that it must be fetched
  // from raw_url.
  if (libraryFile.truncated && libraryFile.raw_url) {
    const rawResponse = await fetch(libraryFile.raw_url);
    if (!rawResponse.ok) {
      throw new GistApiError(describeFailedResponse(rawResponse.status), rawResponse.status);
    }
    return rawResponse.text();
  }
  return libraryFile.content ?? '';
}

export async function writeSyncGistFile(
  gitHubToken: string,
  gistId: string,
  fileContent: string,
): Promise<void> {
  await requestGitHubApi<Gist>(gitHubToken, `/gists/${gistId}`, {
    method: 'PATCH',
    body: { files: { [SYNC_GIST_FILE_NAME]: { content: fileContent } } },
  });
}
