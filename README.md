# MeetMind — AI Meeting Intelligence

MeetMind is an AI-powered meeting intelligence app that turns conversations into
actionable knowledge. Capture meetings through **live recording** (microphone or
online-meeting/tab audio), **file uploads** (audio/video), or **pasted transcripts**,
then let the AI **transcribe** the audio, generate structured **summaries**
(executive summary, key discussion points, decisions, open questions and follow-ups),
and extract **action items** with assignees, due dates and priorities. A built-in
**Smart Note Composer** (rich-text editor with an *Ask AI* panel) lets you blend your
own writing with AI-generated content drawn from your meetings and your personal
**Document Library** of research papers and reference PDFs — so every note is grounded
in the full context of what was discussed and uploaded.

## Features

- 🎙️ **Multi-modal capture** — live mic recording, online-meeting/tab audio capture, file uploads, or pasted transcripts
- 📝 **AI transcription** with speaker labels
- 🧠 **Structured summarisation** — executive summary, key points, decisions, open questions, follow-ups
- ✅ **Action item extraction** — assignees, due dates and priorities, exportable to Markdown/PDF
- ✍️ **Smart Note Composer** — rich-text editor with inline AI insertion and an *Ask AI* assistant
- 📚 **Document Library** — upload and manage research papers, agendas and reference material
- 🔐 **User accounts** — personal, authenticated workspaces that persist meetings, notes and documents
- 📱 **Mobile-ready API** — a shared backend prepared to serve a companion mobile app

## Tech stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router, Turbopack) + React + TypeScript
- **Styling:** Tailwind CSS
- **ORM / Database:** [Prisma](https://www.prisma.io/) with **PostgreSQL**
- **Auth:** NextAuth / Auth.js
- **AI / LLM:** Abacus.AI LLM APIs (transcription, summarisation, Ask AI, HTML→PDF, FFmpeg audio extraction)
- **Cloud storage:** S3-compatible object storage (presigned uploads)
- **Editor:** Tiptap rich-text editor

## Getting started

### Prerequisites

- Node.js 18+ and a package manager (npm / yarn / pnpm)
- A PostgreSQL database
- Credentials for the Abacus.AI LLM API and an S3-compatible bucket

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/abyanuddin/AI-Note-.git
cd AI-Note-

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# then edit .env and fill in your own values

# 4. Apply the database schema
npx prisma migrate dev

# 5. Start the development server
npm run dev
```

The app will be available at [(https://synthr.abacusai.app/)].

## Environment variables

Copy `.env.example` to `.env` and provide values for the following keys
(never commit real secrets — the examples below use placeholders):

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |
| `NEXTAUTH_SECRET` | Secret used by NextAuth to encrypt sessions |
| `AUTH_SECRET` | Auth.js session/encryption secret |
| `ABACUSAI_API_KEY` | Abacus.AI LLM API key (transcription, summarisation, Ask AI, PDF, FFmpeg) |
| `AWS_PROFILE` | Cloud storage profile name |
| `AWS_REGION` | Region of the S3-compatible bucket |
| `AWS_BUCKET_NAME` | Bucket name for uploaded files |
| `AWS_FOLDER_PREFIX` | Key prefix/folder for stored objects |

Example:

```env
DATABASE_URL=<YOUR_VALUE>
NEXTAUTH_SECRET=<YOUR_VALUE>
AUTH_SECRET=<YOUR_VALUE>
ABACUSAI_API_KEY=<YOUR_VALUE>
AWS_PROFILE=<YOUR_VALUE>
AWS_REGION=<YOUR_VALUE>
AWS_BUCKET_NAME=<YOUR_VALUE>
AWS_FOLDER_PREFIX=<YOUR_VALUE>
```

## Mobile API

MeetMind is prepared to serve a **companion mobile app** from the same backend.
The mobile-facing API uses bearer-token authentication (`/api/mobile-auth/*`) and
exposes the core meetings, documents, notes, upload and AI/processing endpoints.

- **`openapi.json`** — the formal OpenAPI (Swagger) specification and single source
  of truth for request/response shapes.
- **`API_REFERENCE.md`** — a human-readable index of the mobile API endpoints,
  methods, authentication and usage notes.

## License

Released under the [MIT License](LICENSE).
