# Media Converter — Project Handover

**Snapshot date:** 2026-10-15  
**Repository:** `muhammad-zubair-maqbool/ahmad-mern`  
**Branch observed:** `Admin-role`  
**Latest commit observed:** `f500da3` — `resolving eror`  
**Deployment status:** Unknown. No deployment was verified while preparing this document.

This document describes the source tree and conversation history available at the
snapshot date. Treat it as a working handover, not as a guarantee that the
current uncommitted tree has been deployed or that every external service works.

## 1. Project overview

Media Converter is a Next.js web application for retrieving media information,
downloading YouTube videos as MP4 or audio as MP3, and downloading supported
non-YouTube media as MP4. The homepage also includes YouTube transcripts and
optional AI translation/summaries. Accounts and an admin workspace are present,
with download records and visitor counts stored in MongoDB.

### Stack verified in the repository

- Next.js `16.3.5` App Router, React `19.2.8`, and TypeScript.
- Tailwind CSS 4, with project styles in `app/globals.css`.
- MongoDB accessed through Mongoose.
- `youtube-dl-exec` / yt-dlp for YouTube download jobs and media metadata;
  `ffmpeg-static` is configured for YouTube format merging and MP3 extraction.
- `@vreden/youtube_scraper` is used as an additional YouTube metadata source.
- `@raihan07/vidly` is used for non-YouTube media information/download attempts.
- `youtube-caption-extractor` retrieves YouTube captions.
- `@google/genai` is used by the summary endpoint.
- `bcryptjs` and `jsonwebtoken` support password hashing and signed sessions.
- `lucide-react` supplies icons; `react-toastify` supplies toast notifications;
  `recharts` supplies admin analytics charts.
- No test script is declared in `package.json`; available scripts are `dev`,
  `build`, `start`, and `lint`.

### Important source map

- `app/page.tsx`, `app/layout.tsx`, `app/globals.css`: homepage composition,
  root layout, Geist font, global design tokens, and responsive/global styles.
- `components/HomePage/`: homepage sections, navigation/account UI, auth modal,
  video preview entry point, and review modal.
- `components/video-preview/`: video card, media info, download controls and
  progress, transcript panel, shared media types, and presentation utilities.
- `hooks/useMediaMetadata.ts`, `hooks/useMediaDownload.ts`,
  `hooks/useTranscript.ts`: frontend metadata, download, and transcript flows.
- `app/api/media/info/route.ts`, `app/api/media/download/route.ts`: media
  metadata and download endpoints.
- `lib/downloads/`: metadata providers, yt-dlp job execution, process-local job
  storage, file streaming/cleanup, progress types/constants, and Mongo download
  record persistence.
- `models/info.ts`, `models/user.ts`, `models/visitors.ts`, `models/review.ts`:
  Mongoose models for download records, users, visitors, and reviews.
- `app/api/user/login/route.ts`, `lib/middleware/`: user session and admin
  authorization operations.
- `app/admin/page.tsx`, `components/admin/`, `hooks/admin/`, `lib/admin/`,
  `types/admin/`: admin UI, data loading, and dashboard queries/helpers.
- `app/api/visitors/route.ts`: visitor counting endpoint.
- `app/api/admin/dashboard/route.ts`, `app/api/media/filter/route.ts`: protected
  admin dashboard and download-filter endpoints.
- `app/api/getcaption/route.ts`, `app/api/getsummary/route.ts`: transcript and
  AI translation/summary endpoints.
- `next.config.ts`: Node/server dependency tracing and server package settings.

## 2. Features and functionality

### Media formats, metadata, and platform behavior

- The frontend offers YouTube MP4 video and MP3 audio downloads.
- The API rejects MP3 for non-YouTube platforms; non-YouTube media is MP4 only.
  The non-YouTube downloader calls Vidly and returns an MP4 stream.
- YouTube MP4 uses yt-dlp format selection preferring AVC1 video in MP4 with
  M4A audio, then MP4 fallbacks. YouTube MP3 uses yt-dlp audio extraction with
  MP3 output; ffmpeg is included when available.
- The media platform helper recognizes YouTube, Instagram, TikTok, Facebook,
  X/Twitter, and Pinterest hostnames. Non-YouTube downloads are delegated to
  Vidly. Recognition of a hostname does **not** prove that Vidly can download
  every URL, region, post type, or protected media from that platform. Real
  provider/platform coverage requires verification.
- The platform helper returns other valid hostnames as a platform value too;
  that fallback likewise does not promise successful provider support.
- YouTube metadata combines `@vreden/youtube_scraper` and yt-dlp results for
  title, description, uploader/channel, thumbnail, and duration. YouTube file
  size is not available at metadata-load time.
- Non-YouTube metadata uses Vidly for title and yt-dlp metadata for duration and
  thumbnail where available. Its description/uploader are empty and size is
  returned as unknown (`null`).
- `highQuality`/`lowQuality` values are read from Vidly info but are not exposed
  as selectable UI options in the current metadata response. The UI uses
  “Best available” for video quality and “Audio” for MP3; there is no verified
  user-selectable resolution/quality menu.

### Download progress, completion, and records

- The client calls `POST /api/media/download?url=...&type=...`.
- Non-YouTube responses are streamed directly. The browser reads response
  chunks, shows transfer progress, creates a Blob, and triggers a file save.
  Empty files and non-OK responses are treated as failures.
- For YouTube, POST starts a job and returns a `jobId`. The client polls
  `GET /api/media/download?jobId=...` approximately every 250 ms.
- A YouTube job progresses through stages such as `downloading`, `merging`,
  `ready`, `transferring`, `complete`, and `error`. Once `ready`, the client
  initiates the file transfer through a hidden iframe with
  `GET /api/media/download?jobId=...&download=1`; polling continues until the
  transfer reaches `complete`.
- YouTube progress is parsed from yt-dlp output. The download library also has
  a non-YouTube job branch, but the current route handles non-YouTube downloads
  through the direct streaming path.
- The frontend displays success toasts on successful transfer and error
  messages/toasts on caught failures. It clears the progress display a few
  seconds after successful completion.
- Download records in `models/info.ts` capture optional `userId`, title,
  MP3/MP4 format, platform, quality label, file size, success/failure status,
  date, and duration. They are used by admin download views and analytics.
- Downloads are allowed without a signed-in user in the current
  `getOptionalUserId` flow; a valid session is attached to a record when
  available. Therefore records can be guest/anonymous.
- No user-facing personal download-history page was identified. Download
  history is visible in the admin workspace.

### Authentication and administration

- The user model contains name, unique email, password hash, and `isAdmin`
  boolean. Registration hashes passwords with bcrypt; passwords are not stored
  as plaintext by the registration flow.
- `/api/user/login` is the auth endpoint despite its path name: GET checks the
  current session, POST handles registration/login/admin password change, and
  DELETE clears the session cookie.
- Sessions use an HTTP-only, strict-same-site cookie and a JWT with a seven-day
  expiration. Cookie `secure` is enabled in production.
- Admin access is based on the authenticated user’s database `isAdmin` flag.
  Admin middleware protects the dashboard and admin download filters.
- The admin UI has Dashboard, Analytics, Users, and Downloads sections, plus
  admin settings/password change and logout. Dashboard analytics include
  successful/failed/download totals, MP3/MP4 usage, recent downloads, user
  counts/activity, and visitor count.
- `/api/visitors` tracks the first forwarded/request IP it can read and
  increments the visitor counter only when that IP is new to the stored record.
  It keeps IP addresses in the visitor document; deployment proxy headers and
  the privacy implications should be verified for the production environment.

### Other implemented functionality

- YouTube transcripts are requested from `/api/getcaption`; timestamps and
  subtitle text can be viewed and downloaded as plain text or timestamped text.
- `/api/getsummary` uses Gemini to translate the transcript into English and
  generate an overview, key points, conclusion, and important terms; the client
  can download the result as a text file.
- The homepage includes the hero/converter, how-it-works, features,
  testimonials, about, and footer sections.

### Visual design

- The app uses Geist Sans, Tailwind utility classes, a pale blue/gray page
  background, dark navy text, and blue accents. Main values include brand
  `#3B6BFF`, darker blue `#2C4DE2`, text `#20253D`, muted text `#737991`, and
  background `#F7F9FC`.
- Auth and review modals use a centered white card, soft shadow, rounded
  corners, a dimmed/blurred backdrop, compact spacing, and responsive padding.
- The homepage and admin sections use responsive Tailwind layouts and
  mobile-aware navigation. Preserve these conventions rather than redesigning
  the site for a scoped feature.

## 3. Previous requirements and decisions

The following requirements came from the project owner in this conversation:

- Preserve existing UI design and behavior when adding features; reuse existing
  components and styling patterns, keep changes minimal and scoped, and do not
  modify unrelated functionality.
- The review modal must open only after a successful download, not on a failure
  or during a download. It should visually match the existing Login/Sign Up
  modal.
- The review modal must have 1–5 star rating, a comment textarea, validation
  for both, duplicate-submit protection, Submit, Cancel, and a top-right X.
- The review form is frontend-only for now: do not send or persist a review
  until backend integration is deliberately implemented.
- The modal must remain visible until the user closes it with X, Cancel, or by
  clicking outside it. The temporary download progress indicator clearing
  must not close it.
- Review likes were intentionally excluded. Do not add likes unless explicitly
  requested.
- No library rejection or planned library replacement was stated in the
  available conversation. The libraries listed above are observed in the
  current code; do not assume the owner formally selected each one or intends
  to replace any of them.

Treat auth, download behavior, database records, and the existing visual design
as protected behavior. Ask before major architectural changes or any change that
alters these user-facing flows.

## 4. Review system

### Current schema

`models/review.ts` defines a Mongoose `Review` model with:

- `user`: required `ObjectId` reference to `User`.
- `rating`: required number, minimum 1 and maximum 5.
- `comment`: required trimmed string, maximum length 1,000.
- Mongoose timestamps (`createdAt` and `updatedAt`).
- No `likes` field or like-related behavior.

### Current frontend modal

`components/HomePage/ReviewModal.tsx` renders the review form with stars,
comment input, validation messages, a pending state, and frontend-only success
feedback. It does not make a network request or save a review.

`components/HomePage/VideoPreview.tsx` owns the modal visibility state.
`hooks/useMediaDownload.ts` calls an `onComplete` callback in both successful
download branches; that callback opens the modal. This decouples modal
visibility from progress state, which is cleared after a few seconds.

X and Cancel close the modal; clicking the backdrop also closes it, while a
click inside the dialog is stopped from bubbling. Submit requires a rating and
a non-blank comment and prevents repeat submissions while its short simulated
processing state is active. The confirmation explicitly says reviews are not
sent anywhere yet.

### Backend status and integration constraints

- `app/api/review/route.ts` exists in the snapshot but is **empty (0 bytes)**.
  Treat a working review API as not implemented.
- The schema is not evidence that reviews are currently created, queried,
  moderated, or shown to users.
- The Review schema requires a `user`, but the download flow permits guests.
  Decide deliberately whether to require login for reviews, support anonymous
  reviews, or associate a guest review through another approach before wiring
  persistence. Do not silently weaken the schema or add a backend request to
  the frontend-only modal.
- No review display, admin moderation, deletion, or likes feature was found.

## 5. Download implementation details and limitations

- `app/api/media/download/route.ts` supports both GET and POST. POST is used by
  the current client. GET can also start a direct download when given a URL and
  type; when given a job ID it either reports progress or streams the prepared
  file.
- The YouTube job registry in `lib/downloads/job-store.ts` is a JavaScript
  `Map` in the server process. Job metadata and temporary files are not shared
  across processes/instances. On a multi-instance/serverless deployment, POST,
  subsequent progress polls, and iframe download requests could reach different
  instances and fail to find the same job. Verify deployment behavior and
  consider durable/shared job storage only with owner approval.
- Download files are written to operating-system temporary directories and
  cleaned up on timers or after streaming. Serverless ephemeral storage and
  maximum execution duration can constrain large/slow downloads.
- The YouTube poll loop has no explicit client cancellation or retry/backoff.
  Network interruptions, instance changes, and provider errors need runtime
  verification.
- yt-dlp may fail when YouTube requires sign-in/anti-bot checks from the server
  network; the downloader returns an explanatory error for a detected case.
- MP4 quality is best available under the selected yt-dlp format expression;
  users cannot pick a quality. Non-YouTube downloads are MP4 only and depend on
  Vidly support for the particular URL.
- Metadata size is not reliably known before downloading. Some non-YouTube
  duration/thumbnail values may be unavailable.
- Successful and failed database record writes are attempted, but a record
  persistence error is logged and does not necessarily change the already
  delivered download outcome.

## 6. Deployment and Git

- `README.md` contains the standard Next.js starter instructions and generic
  Vercel deployment link. No project-specific Vercel configuration or
  successful production deployment was verified. `next.config.ts` includes
  runtime tracing for yt-dlp, ffmpeg, scraper dependencies, and related server
  packages.
- The download route declares Node.js runtime and `maxDuration = 300`. Confirm
  whether the chosen Vercel plan/runtime supports the required duration,
  native/system binaries, temporary storage, and streaming behavior.
- Environment variable **names only** observed in source:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `GEMINI_API_KEY`
  - `NODE_ENV` is also read for production cookie behavior.
- `.env` is present locally and is ignored by `.gitignore`. Its contents were
  not read and must never be copied into this document, Git, chat, or logs.
  Configure secrets independently in local development and deployment settings.
- Git remote observed: `origin` points to
  `https://github.com/muhammad-zubair-maqbool/ahmad-mern.git`. Current branch at
  inspection was `Admin-role`; commit `f500da3` was the latest observed commit.
- The worktree was already dirty when this document was prepared. It included
  modifications to media routes, Navbar, VideoPreview, admin downloads, admin
  dashboard hook, download helpers, `next.config.ts`, and package manifests,
  plus untracked review/modal, download UI/hooks, summary, and Gemini files.
  These changes were not all made as part of this documentation task. Inspect
  `git status` and review diffs before editing, staging, or cleaning anything.

## 7. Known issues and previous fixes

### Confirmed in source/history

- **Review modal disappearing too soon:** An earlier implementation rendered
  the modal directly from `downloadProgress.stage === "complete"`. Since
  progress clears after about four seconds, the modal would disappear. Fixed
  by opening it through `onComplete` and keeping its visibility in
  `VideoPreview` state until an explicit close action.
- **Successful-download UI integration:** Both the streamed non-YouTube path
  and the YouTube job completion path call the same frontend completion
  callback. Errors are caught by the download hook and do not call it.
- **React lint issue during initial implementation:** A state update inside an
  effect triggered the `react-hooks/set-state-in-effect` lint rule. The code
  was changed to use a completion callback instead; targeted ESLint then
  passed.
- **Windows npm invocation:** PowerShell blocked `npm.ps1` under execution
  policy. `npm.cmd` worked and targeted lint completed successfully.

### Incomplete or requiring verification

- The review route is empty, so backend review submission is incomplete.
- Anonymous downloads conflict with the current required review `user` field
  unless the eventual submission flow requires authentication or the schema/
  product requirements are deliberately changed.
- External platform success coverage, YouTube anti-bot behavior, and large-file
  download reliability require real deployment testing.
- The process-local job map and temporary files may not work across separate
  Vercel function instances. This is a code-derived deployment risk, not a
  confirmed production incident.
- A complete baseline build and end-to-end test run was not recorded here.
  `package.json` has no test script.
- No Vercel deployment status, configured project settings, environment
  variable values, active production branch mapping, or platform provider
  contract was verifiable.

## 8. Current project status

### Implemented in the inspected source

- Homepage and responsive media converter UI.
- YouTube MP4/MP3 and non-YouTube MP4 download paths, with progress/error
  handling and download-record tracking.
- Metadata display, thumbnails when supplied, duration when available, and
  best-available quality behavior.
- User registration/login/logout and admin-role checks.
- Admin dashboard, analytics, user/download sections, and visitor counts.
- YouTube transcript viewing/download and Gemini-backed translation/summary
  path (requires configured Gemini credentials and external service access).
- Frontend review modal and successful-download trigger, including persistence
  until X, Cancel, or outside click.
- Review Mongoose schema, but not a working API/persistence UI.

### Not implemented or incomplete

- Review form API integration, storage/submission UX, review display, and
  moderation.
- Review likes (intentionally excluded).
- Selectable media quality/resolution.
- Guaranteed success support for every URL on the named social platforms.
- Durable/cross-instance download job tracking suitable for serverless scale.
- User-facing download history page.
- Project-specific deployment confirmation and an automated test suite.

### Validation and handoff expectations

- Available package scripts: `npm run dev`, `npm run build`, `npm run start`,
  and `npm run lint`. On Windows PowerShell, `npm.cmd` avoids the script
  execution-policy issue observed above.
- No test script is present in the package manifest. Add tests only if requested
  or when a change warrants them, following existing project conventions.
- For download changes, exercise successful YouTube MP4, YouTube MP3,
  non-YouTube MP4, failures, and progress completion. For the modal, verify it
  does not open during/failure, remains open after progress clears, validates
  both required fields, blocks duplicate submit, and closes through all three
  supported close gestures.
- Before changes, inspect current `git status`, relevant source, and the
  applicable Next.js documentation under
  `node_modules/next/dist/docs/` as required by the repository agent guidance.

## 9. Instructions for the next Copilot account

1. Read `PROJECT_CONTEXT.md` first.
2. Inspect current source files and `git status` before assuming this snapshot is
   still accurate; distinguish existing user changes from your own.
3. Preserve existing functionality and visual design. Prefer small, scoped
   changes and reuse existing components, types, hooks, and styling patterns.
4. Do not modify unrelated features, APIs, authentication, or download behavior
   as a side effect. Ask the owner before major architectural changes.
5. Do not expose `.env` contents, tokens, passwords, cookies, API keys, or other
   credentials in code, logs, commits, or documentation.
6. Keep the review form frontend-only unless the owner explicitly requests
   backend integration. If that request comes, resolve the guest-vs-required
   review-user decision first; do not implement likes unless requested.
7. Run the narrowest relevant lint/build/test validation, report what was and
   was not verified, and do not claim deployment success without checking it.

## NEXT STEPS

1. Verify current worktree diffs and run a project build before deployment.
2. Test each download path and the review modal end-to-end, including the
   close-after-progress-timeout behavior.
3. Decide whether reviews require login or may be anonymous; then implement
   review API persistence and appropriate feedback only with owner approval.
4. Validate download job behavior, temp-file cleanup, and runtime limits on the
   actual deployment platform; address multi-instance job storage if needed.
5. Confirm Vercel project settings and configure required environment variable
   names securely without committing values.
