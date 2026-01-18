import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { ClerkProvider } from '@clerk/clerk-react'

const PUBLISHABLE_KEY = import.meta.env.VITE_PUBLIC_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  // بدلاً من إيقاف التطبيق، سنظهر رسالة خطأ واضحة على الشاشة
  console.error("Missing Publishable Key");
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; color: white; text-align: center; flex-direction: column;">
        <h1>Configuration Error</h1>
        <p>Missing VITE_PUBLIC_CLERK_PUBLISHABLE_KEY in environment variables.</p>
        <p>Please add it in your Netlify Site Settings.</p>
      </div>
    `;
  }
} else {
  console.log('Mounting React App...');

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
          <App />
        </ClerkProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  )
}
