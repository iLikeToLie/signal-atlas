import { StrictMode, Suspense, lazy, useState } from 'react';
import { createRoot } from 'react-dom/client';
import AgilityApp from './AgilityApp.tsx';
import './styles.css';

const root = createRoot(document.getElementById('root')!);
const Legacy = lazy(() => import('./App.tsx'));
function Workspace() {
  const [legacy, setLegacy] = useState(false);
  return legacy ? <><button className="return-directory" onClick={() => setLegacy(false)}>← Emitter agility directory</button><Suspense fallback={<p>Loading cycle explorer…</p>}><Legacy /></Suspense></> : <AgilityApp sandbox={new URLSearchParams(location.search).get('sandbox') === 'pilot'} onLegacy={() => setLegacy(true)} />;
}
root.render(<StrictMode><Workspace /></StrictMode>);
