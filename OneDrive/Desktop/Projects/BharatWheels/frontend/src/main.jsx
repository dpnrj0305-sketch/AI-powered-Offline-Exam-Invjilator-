import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import Login from './Login'
import App from './App'

function Root() {
  const [user, setUser] = useState(null)

  if (!user) return <Login onLogin={setUser} />
  return <App user={user} onLogout={() => setUser(null)} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
)