import { BigNumber as BN } from 'bignumber.js';
import { hexToNumberString } from 'web3-utils';
import { watchBalance } from './connexConnect';

import {
  INITIALIZE,
  UPDATE_WALLET,
  UPDATE_ACCOUNT,
  UPDATE_ETH_BALANCE,
 } from './creators'

const Balance = (value, label = '', decimals = 0) => ({
  value: BN(value),
  label: label.toUpperCase(),
  decimals: +decimals,
});

const thor = (dispatch, getState) => {
  const { connexConnect } = getState();
  const signingService = window.connex.vendor.sign('cert');

  return new Promise(async (resolve, reject) => {
    if (connexConnect.connex) {
      resolve(connexConnect.connex);
      return;
    }

    if (typeof window.connex !== 'undefined') {
      signingService.request({
        purpose: 'identification',
        payload: {
          type: 'text',
          content: 'random generated string'
        }
      }).then(({ annex }) => {
        const acc = window.connex.thor.account(annex.signer);

        acc.get().then(info => {
          const balance = hexToNumberString(info.balance);

          dispatch({
            type: INITIALIZE,
            payload: window.connex,
          });
          dispatch({ type: UPDATE_WALLET, payload: annex.signer });
          dispatch({ type: UPDATE_ACCOUNT, payload: annex.signer });
          dispatch(watchBalance({ balanceOf: annex.signer }));

          dispatch({
            type: UPDATE_ETH_BALANCE,
            payload: {
              balance: Balance(balance, 'VET', 18),
              balanceOf: annex.signer,
            },
          });
        });

        resolve(window.connex);

      }).catch(error => {
        console.error('User denied access.');
        dispatch({ type: INITIALIZE });
        reject();
        return;
      });
    }
  })
};

export default thor;
