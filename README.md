# click-to-ad

Turn a product URL into a draft short-form ad workflow.

This project analyzes a product page, extracts product info and images, lets you choose a video style, previews the generated prompt, and then sends the job to a video generation API.

## What It Does

- Paste a product URL and extract title, description, logo, and images
- Use Kimi to generate a shorter product name and brand color palette
- Let the user review and adjust the product kit before generation
- Build a final ad prompt from reusable style templates
- Preview the prompt and selected reference image before spending API credits
- Generate a video through APIYI
- Fall back to a mock video flow when `APIYI_API_KEY` is not configured

## Workflow

1. Analyze a product URL
2. Confirm or edit the product kit
3. Choose an ad style
4. Preview the final prompt
5. Submit the generation task
6. Poll task status and show the result

## Stack

- React + Vite frontend
- Express backend
- Drizzle ORM + PostgreSQL
- Multer for image upload
- Sharp for image processing
- Kimi API for product metadata extraction
- APIYI video API for video generation

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create your local env file

```bash
cp .env.example .env
```

Then fill in your own values in `.env`.

### 3. Required environment variables

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: server port, for example `3000`
- `KIMI_API_KEY`: used for short product name and brand color extraction
- `APIYI_API_KEY`: used for video generation

Example:

```env
DATABASE_URL=postgresql://localhost:5432/click_to_ad
PORT=3000
KIMI_API_KEY=your_kimi_api_key
APIYI_API_KEY=your_apiyi_api_key
```

### 4. Run the app

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Scripts

- `npm run dev`: start the local dev server
- `npm run build`: build the production bundle
- `npm run start`: run the production build
- `npm run check`: run TypeScript checks
- `npm run db:push`: push the schema with Drizzle

## Running Without Full API Access

You can still explore most of the flow without a video API key.

- If `APIYI_API_KEY` is missing, the app uses a mock video result
- If `KIMI_API_KEY` is missing, the app falls back to local title cleanup and default brand colors

That makes it possible to try the UX before wiring up paid APIs.

## Notes

- This repo does not include any private API keys
- Do not commit your `.env`
- Uploaded local images are stored under `uploads/` in local development
- The video generation quality and cost depend on the external provider you configure

## Repository Scope

This is the public shareable version of the project. Internal notes, private deployment settings, and private API credentials are intentionally excluded.
