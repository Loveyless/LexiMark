import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '../../src/ui/styles.css'

const root = document.getElementById('app')!
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
