import React from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

const Options = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <p>Options Content</p>
    </div>
  )
}

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <Options />
    </React.StrictMode>
  )
}
