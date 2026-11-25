import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import Workspace from './Workspace';
import { store } from '../features/projects/store';
import './styles/base.css';
import './styles/light.css';
import './styles/palette.css';

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <Workspace />
  </Provider>,
);
