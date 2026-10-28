<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1IrPe5RoP4-YmBxX8W9zfwtes_TLYuiRx

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. To enable the contact form, set `EMAIL_USER=analyzer-ai@outlook.com` and `EMAIL_PASSWORD` to an Outlook app password in `.env.local` and in the Netlify environment variables.
4. Run the app:
   `npm run dev`
