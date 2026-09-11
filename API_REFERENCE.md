# MeetMind — Mobile API Reference

This app is prepared to serve a companion mobile app. The mobile client shares this
app's backend, accounts, and database. All endpoints below are described formally in
`openapi.json` (at the project root), which is the source of truth for request/response
shapes. This file is a human-readable index.

## Authentication (mobile)

The mobile client authenticates through the dedicated mobile-auth bridge, which issues a
bearer token. Send that token as `Authorization: Bearer <token>` on every guarded request.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/mobile-auth/signup` | none | Create an account, returns a bearer token. |
| POST | `/api/mobile-auth/login` | none | Exchange email + password for a bearer token. |
| GET | `/api/mobile-auth/me` | bearer | Return the current signed-in user. |

> The web app continues to use its own session-cookie auth (`/api/auth/*`, `/api/signup`)
> unchanged. The mobile-auth bridge is additive and does not alter web behaviour.

## Meetings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/meetings` | bearer | List the current user's meetings. |
| POST | `/api/meetings` | bearer | Create a meeting. |
| GET | `/api/meetings/{id}` | bearer | Get one meeting (with action items). |
| PATCH | `/api/meetings/{id}` | bearer | Update a meeting. |
| DELETE | `/api/meetings/{id}` | bearer | Delete a meeting. |
| GET | `/api/meetings/stats` | bearer | Dashboard stats for the current user. |

## Documents (library)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/documents` | bearer | List the current user's documents. |
| POST | `/api/documents` | bearer | Create a document record. |
| DELETE | `/api/documents/{id}` | bearer | Delete a document. |

## Notes (composer)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notes` | bearer | List the current user's composer notes. |
| POST | `/api/notes` | bearer | Create a composer note. |
| PATCH | `/api/notes/{id}` | bearer | Update a composer note. |
| DELETE | `/api/notes/{id}` | bearer | Delete a composer note. |

## Uploads

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/upload/presigned` | bearer | Get a presigned upload URL and the resulting `cloud_storage_path`. |

## AI & processing

| Method | Path | Auth | Response | Description |
|--------|------|------|----------|-------------|
| POST | `/api/transcribe` | bearer | `text/plain` stream | Stream a transcript from uploaded audio. |
| POST | `/api/summarize` | bearer | `text/event-stream` (SSE) | Stream a meeting summary; persists to the meeting. |
| POST | `/api/ai-ask` | bearer | `text/plain` stream | Stream an AI answer for the smart composer. |
| POST | `/api/ffmpeg-process` | bearer | JSON | Server-side audio extraction from a media file. |
| POST | `/api/generate-pdf` | bearer | JSON | Start a PDF export job. |
| GET | `/api/generate-pdf/status` | bearer | JSON | Poll a PDF export job's status. |

## Notes for mobile integration

- Every guarded route returns `401` when the bearer token is missing, invalid, or tampered.
- `DateTime` fields are serialized as ISO-8601 strings.
- `cloud_storage_path` (snake_case) is the stored object key; never store local paths.
- Streaming endpoints must be consumed as streams, not awaited as a single JSON body.
