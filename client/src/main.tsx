import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// Assurez-vous que ce fichier sera créé par le script de régénération
import './tailwind-output.css'
import 'leaflet/dist/leaflet.css'

// Script d'initialisation du thème pour éviter le flash de contenu
const scriptElement = document.createElement('script');
scriptElement.innerHTML = `
  try {
    const darkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (localStorage.theme === 'dark' || (!localStorage.theme && darkMode)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (_) {}
`;
document.head.appendChild(scriptElement);

// Mount React App
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)