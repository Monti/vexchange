import * as Arkane from '@arkane-network/arkane-connect';
import { thorify } from 'thorify'
import { extend } from 'thorify/dist/extend';

import { INITIALIZE } from './creators'

const Web3 = require("web3");

if (process.env.REACT_APP_NETWORK === 'testnet') {
  window.arkaneConnect = new Arkane.ArkaneConnect('Arketype', { environment: 'staging' });
} else {
  window.arkaneConnect = new Arkane.ArkaneConnect('Vexchange');
}

const thor = (dispatch, getState) => {
  const { web3connect } = getState();
  let web3;

  return new Promise(async (resolve, reject) => {
    if (web3connect.web3) {
      resolve(web3connect.web3);
      return;
    }

    if (typeof window.thor !== 'undefined') {
      try {
        const web3 = new Web3(window.thor);
        await window.thor.enable();

        dispatch({
          type: INITIALIZE,
          payload: web3,
          meta: {
            provider: 'thor',
          }
        });

        extend(web3);
        resolve(web3);
        return;
      } catch (error) {
        console.error('User denied access.');
        dispatch({ type: INITIALIZE });
        reject();
        return;
      }
    } else {

      if (process.env.REACT_APP_NETWORK === 'testnet') {
        web3 = thorify(new Web3(), "http://127.0.0.1:8669/");
      } else {
        web3 = thorify(new Web3(), "https://vechain-api.monti.finance");
      }

      dispatch({
        type: INITIALIZE,
        payload: web3,
        meta: {
          provider: 'thor'
        }
      });
      resolve(web3);
      return;
    }
  })
};

export default thor;
