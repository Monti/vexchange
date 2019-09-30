import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import ReactGA from 'react-ga';
import ProviderModal from './components/ProviderModal';
import WebFont from 'webfontloader';
import './i18n';
import App from './pages/App';
import store from './store';

import 'antd/dist/antd.css';
import './index.scss';

if (process.env.NODE_ENV === 'development') {
  // ReactGA.initialize('UA-128182339-02');
} else {
  ReactGA.initialize('UA-135474754-1');
}

ReactGA.pageview(window.location.pathname + window.location.search);

WebFont.load({
  google: {
    families: [
      'Rubik:900',
      'Karla'
    ]
  }
});

window.addEventListener('load', function () {
  ReactDOM.render(
    <Provider store={store}>
      <App provider='arkane' />
    </Provider>,
    document.getElementById('root')
  );
});
