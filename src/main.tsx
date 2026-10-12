import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import AgilityApp from './AgilityApp.tsx';
import './styles.css';
createRoot(document.getElementById('root')!).render(<StrictMode><AgilityApp sandbox={new URLSearchParams(location.search).get('sandbox')==='pilot'}/></StrictMode>);
