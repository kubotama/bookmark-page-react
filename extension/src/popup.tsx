import React from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

const Popup = () => {
  return (
    <div className="p-4 w-64">
      <h1 className="text-lg font-bold">Bookmark Page</h1>
      <p>Popup Content</p>
    </div>
  )
}

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  )
}
