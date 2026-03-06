import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { ApiProvider } from './contexts/ApiContext'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ApiProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ApiProvider>
    </BrowserRouter>
  </StrictMode>,
)
