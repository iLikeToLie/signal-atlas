import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import atlasUrl from './data/atlas.json?url';
import priAtlasUrl from './data/pri-atlas.json?url';
import type { AtlasData } from './types.ts';
import './styles.css';

const root = createRoot(document.getElementById('root')!);
Promise.all([atlasUrl, priAtlasUrl].map(url => fetch(url).then(response => {
  if (!response.ok) throw new Error('The catalogue could not be loaded.');
  return response.json() as Promise<AtlasData>;
}))).then(([atlas, priAtlas]) => root.render(<StrictMode><App frequencyAtlas={atlas} priAtlas={priAtlas} /></StrictMode>))
  .catch(() => root.render(<div className="notice" role="alert">The atlas could not load. Check your connection and reload.<button onClick={() => location.reload()}>Reload</button></div>));
