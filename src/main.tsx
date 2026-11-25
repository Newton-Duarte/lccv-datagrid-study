import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './globals.css'
import 'sbwb-ds-v2-aggrid/styles/theme.css'
import { App } from './app.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
