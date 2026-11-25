import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import App from './App';
import {store} from './store';
import './styles.css';
import './light.css';
import './palette.css';

createRoot(document.getElementById('root')!).render(<Provider store={store}><App/></Provider>);
