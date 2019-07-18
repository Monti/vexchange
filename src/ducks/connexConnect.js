import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { BigNumber as BN } from 'bignumber.js';
import { hexToNumberString, hexToBytes, isAddress } from 'web3-utils';
import _ from 'lodash';
import initialState from './initialState';
import ERC20_ABI from "../abi/erc20";
import ERC20_WITH_BYTES_ABI from "../abi/erc20_symbol_bytes32";
import { isEmpty } from 'lodash';

import {
  INITIALIZE,
  UPDATE_ACCOUNT,
  WATCH_ETH_BALANCE,
  WATCH_TOKEN_BALANCE,
  UPDATE_ETH_BALANCE,
  UPDATE_TOKEN_BALANCE,
  WATCH_APPROVALS,
  UPDATE_APPROVALS,
  ADD_CONTRACT,
  UPDATE_NETWORK_ID,
  ADD_PENDING_TX,
  REMOVE_PENDING_TX,
  ADD_CONFIRMED_TX,
  UPDATE_WALLET,
  UPDATE_WALLETS,
} from './creators';

import connex from './connex';

// selectors
export const selectors = () => (dispatch, getState) => {
  const state = getState().connexConnect;

  const getTokenBalance = (tokenAddress, address) => {
    const tokenBalances = state.balances[tokenAddress] || {};
    const balance = tokenBalances[address];
    if (!balance) {
      dispatch(watchBalance({ balanceOf: address, tokenAddress }));
      return Balance(0);
    }
    return balance;
  };

  const getBalance = (address, tokenAddress) => {
    if (process.env.NODE_ENV !== 'production' && !tokenAddress) {
      console.warn('No token address found - return VET balance');
    }

    if (!tokenAddress || tokenAddress === 'VET') {
      const balance = state.balances.vechain[address];
      if (!balance) {
        dispatch(watchBalance({ balanceOf: address }));
        return Balance(0, 'VET');
      }
      return balance;
    } else if (tokenAddress) {
      return getTokenBalance(tokenAddress, address);
    }

    return Balance(NaN);
  };

  const getApprovals = (tokenAddress, tokenOwner, spender) => {
    const token = state.approvals[tokenAddress] || {};
    const owner = token[tokenOwner] || {};

    if (!owner[spender]) {
      dispatch(watchApprovals({ tokenAddress, tokenOwner, spender }));
      return Balance(0);
    }

    return owner[spender];
  };

  return {
    getBalance,
    getTokenBalance,
    getApprovals,
  };
};


const Balance = (value, label = '', decimals = 0) => ({
  value: BN(value),
  label: label.toUpperCase(),
  decimals: +decimals,
});

export const initialize = () => async (dispatch, getState) => {
  return connex(dispatch, getState);
};

export const watchBalance = ({ balanceOf, tokenAddress }) => (dispatch, getState) => {
  if (!balanceOf) {
    return;
  }

  const { connexConnect } = getState();
  const { watched } = connexConnect;

  if (!tokenAddress) {
    if (watched.balances.vechain.includes(balanceOf)) {
      return;
    }
    dispatch({
      type: WATCH_ETH_BALANCE,
      payload: balanceOf,
    });
    setTimeout(() => dispatch(sync()), 0);
  } else if (tokenAddress) {
    if (watched.balances[tokenAddress] && watched.balances[tokenAddress].includes(balanceOf)) {
      return;
    }
    dispatch({
      type: WATCH_TOKEN_BALANCE,
      payload: {
        tokenAddress,
        balanceOf,
      },
    });
    setTimeout(() => dispatch(sync()), 0);
  }
};

export const watchApprovals = ({ tokenAddress, tokenOwner, spender }) => (dispatch, getState) => {
  const { connexConnect: { watched } } = getState();
  const token = watched.approvals[tokenAddress] || {};
  const owner = token[tokenOwner] || [];
  if (owner.includes(spender)) {
    return;
  }
  return dispatch({
    type: WATCH_APPROVALS,
    payload: {
     tokenAddress,
      tokenOwner,
      spender,
    },
  });
};

export const addPendingTx = txId => ({
  type: ADD_PENDING_TX,
  payload: txId,
});

export const updateWallet = wallet => async (dispatch) => {
  dispatch({ type: UPDATE_WALLET, payload: wallet });
  dispatch({ type: UPDATE_ACCOUNT, payload: wallet.address });
  dispatch(watchBalance({ balanceOf: wallet.address }));
};

export const updateApprovals = ({ tokenAddress, tokenOwner, spender, balance }) => ({
  type: UPDATE_APPROVALS,
  payload: {
    tokenAddress,
    tokenOwner,
    spender,
    balance,
  },
});

export const sync = () => async (dispatch, getState) => {
  const { getBalance, getApprovals } = dispatch(selectors());
  const connex = await dispatch(initialize());

  const {
    watched,
    contracts,
    networkId,
    transactions: { pending },
  } = getState().connexConnect;

  if (!networkId) {
    const block = await connex.thor.block(0).get();
    const networkId = hexToBytes(block.id).pop();

    dispatch({
      type: UPDATE_NETWORK_ID,
      payload: networkId,
    });
  }

  // Sync VeChain Balances
  watched.balances.vechain.forEach(async address => {
    const acc = connex.thor.account(address);
    const info = await acc.get().then(info => info);
    const balance = hexToNumberString(info.balance);

    const { value } = getBalance(address);

    if (value.isEqualTo(BN(balance))) {
      return;
    }

    dispatch({
      type: UPDATE_ETH_BALANCE,
      payload: {
        balance: Balance(balance, 'VET', 18),
        balanceOf: address,
      },
    })
  });

  // Sync Token Balances
  Object.keys(watched.balances)
    .forEach(async tokenAddress => {

      if (tokenAddress === 'vechain') {
        return;
      }

      if (!isAddress(tokenAddress)) {
        return;
      }

      const contract = contracts[tokenAddress] || await connex.thor.account(tokenAddress).getCode();

      if (!contracts[tokenAddress]) {
        dispatch({
          type: ADD_CONTRACT,
          payload: {
            address: tokenAddress,
            contract: contract,
          },
        });
      }

      const watchlist = watched.balances[tokenAddress] || [];
      watchlist.forEach(async address => {
        const tokenBalance = getBalance(address, tokenAddress);
        let symbol = tokenBalance.symbol;

        const balanceOfABI = _.find(ERC20_ABI, { name: 'balanceOf' });
        const balance = await connex.thor.account(tokenAddress).method(balanceOfABI).call(address);

        const decimalsABI = _.find(ERC20_ABI, { name: 'decimals' });
        const decimals = tokenBalance.decimals || await connex.thor.account(tokenAddress).method(decimalsABI).call();

        const symbolABI = _.find(ERC20_ABI, { name: 'symbol' });
        const bytes32SymbolABI = _.find(ERC20_WITH_BYTES_ABI, { name: 'symbol' });

        try {
          symbol = symbol || await connex.thor.account(tokenAddress).method(symbolABI).call();
        } catch (e) {
          try {
            symbol = symbol || await connex.thor.account(tokenAddress).method(bytes32SymbolABI).call();
          } catch (err) {
            console.log(err)
          }
        }

        if (tokenBalance.value.isEqualTo(BN(balance)) && tokenBalance.label && tokenBalance.decimals) {
          return;
        }

        Promise.all([balance, symbol, decimals]).then(data => {
          if (data[0].decoded && data[1].decoded && data[2].decoded) {
            dispatch({
              type: UPDATE_TOKEN_BALANCE,
              payload: {
                tokenAddress,
                balanceOf: address,
                balance: Balance(
                  data[0].decoded['0'],
                  data[1].decoded['0'],
                  data[2].decoded['0'] 
                ),
              },
            });
          }
        })
      });
    });

  // Update Approvals
  Object.entries(watched.approvals)
    .forEach(([tokenAddress, token]) => {
      Object.entries(token)
        .forEach(([ tokenOwnerAddress, tokenOwner ]) => {
          tokenOwner.forEach(async spenderAddress => {
            const approvalBalance = getApprovals(tokenAddress, tokenOwnerAddress, spenderAddress);
            let symbol = approvalBalance.label;

            const balanceABI = _.find(ERC20_ABI, { name: 'allowance' });
            const balance = await connex.thor.account(tokenAddress).method(balanceABI).call(tokenOwnerAddress, spenderAddress)

            const decimalsABI = _.find(ERC20_ABI, { name: 'decimals' });
            const decimals = approvalBalance.decimals ||
              await connex.thor.account(tokenAddress).method(decimalsABI).call();

            const symbolABI = _.find(ERC20_ABI, { name: 'symbol' });
            const bytes32SymbolABI = _.find(ERC20_WITH_BYTES_ABI, { name: 'symbol' });

            try {
              symbol = symbol || await window.connex.thor.account(tokenAddress).method(symbolABI).call();
            } catch (e) {
              try {
                symbol = symbol || 
                  hexToNumberString(await window.connex.thor.account(tokenAddress).method(bytes32SymbolABI).call());
                console.log(symbol);
              } catch (err) {
                console.log(err)
              }
            }

            if (approvalBalance.label && approvalBalance.value.isEqualTo(BN(balance))) {
              return;
            }

            Promise.all([balance, symbol, decimals]).then(data => {
              if (data[0].decoded && data[1].decoded && data[2].decoded) {
                dispatch(updateApprovals({
                  tokenAddress,
                  tokenOwner: tokenOwnerAddress,
                  spender: spenderAddress,
                  balance: Balance(
                    data[0].decoded['0'],
                    data[1].decoded['0'],
                    data[2].decoded['0']
                  ),
                }));
              }
            });
          });
        });
    });

  pending.forEach(async txId => {
    try {
      const data = await connex.thor.transaction(txId).get() || {};

      // If data is an empty obj, then it's still pending.
      if (!('status' in data)) {
        return;
      }

      dispatch({
        type: REMOVE_PENDING_TX,
        payload: txId,
      });

      if (data.status) {
        dispatch({
          type: ADD_CONFIRMED_TX,
          payload: txId,
        });
      } else {
        // TODO: dispatch ADD_REJECTED_TX
      }
    } catch (err) {
      dispatch({
        type: REMOVE_PENDING_TX,
        payload: txId,
      });
      // TODO: dispatch ADD_REJECTED_TX
    }

  });
};

export default function connexConnectReducer(state = initialState, { type, payload }) {
  switch (type) {
    case INITIALIZE:
      return {
        ...state,
        connex: payload,
        initialized: true,
      };
    case UPDATE_ACCOUNT:
      return {
        ...state,
        account: payload,
      };
    case WATCH_ETH_BALANCE:
      return {
        ...state,
        watched: {
          ...state.watched,
          balances: {
            ...state.watched.balances,
            vechain: [ ...state.watched.balances.vechain, payload ],
          },
        },
      };
    case WATCH_TOKEN_BALANCE:
      const { watched } = state;
      const { balances } = watched;
      const watchlist = balances[payload.tokenAddress] || [];

      return {
        ...state,
        watched: {
          ...watched,
          balances: {
            ...balances,
            [payload.tokenAddress]: [ ...watchlist, payload.balanceOf ],
          },
        },
      };
    case UPDATE_ETH_BALANCE:
      return {
        ...state,
        balances: {
          ...state.balances,
          vechain: {
            ...state.balances.vechain,
            [payload.balanceOf]: payload.balance,
          },
        },
      };
    case UPDATE_TOKEN_BALANCE:
      const tokenBalances = state.balances[payload.tokenAddress] || {};
      return {
        ...state,
        balances: {
          ...state.balances,
          [payload.tokenAddress]: {
            ...tokenBalances,
            [payload.balanceOf]: payload.balance,
          },
        },
      };
    case ADD_CONTRACT:
      return {
        ...state,
        contracts: {
          ...state.contracts,
          [payload.address]: payload.contract,
        },
      };
    case WATCH_APPROVALS:
      const token = state.watched.approvals[payload.tokenAddress] || {};
      const tokenOwner = token[payload.tokenOwner] || [];

      return {
        ...state,
        watched: {
          ...state.watched,
          approvals: {
            ...state.watched.approvals,
            [payload.tokenAddress]: {
              ...token,
              [payload.tokenOwner]: [ ...tokenOwner, payload.spender ],
            },
          },
        },
      };
    case UPDATE_APPROVALS:
      const erc20 = state.approvals[payload.tokenAddress] || {};
      const erc20Owner = erc20[payload.tokenOwner] || {};

      return {
        ...state,
        approvals: {
          ...state.approvals,
          [payload.tokenAddress]: {
            ...erc20,
            [payload.tokenOwner]: {
              ...erc20Owner,
              [payload.spender]: payload.balance,
            },
          },
        },
      };
    case UPDATE_NETWORK_ID:
      return { ...state, networkId: payload };
    case ADD_PENDING_TX:
      return {
        ...state,
        transactions: {
          ...state.transactions,
          pending: [ ...state.transactions.pending, payload ],
        },
      };
    case REMOVE_PENDING_TX:
      return {
        ...state,
        transactions: {
          ...state.transactions,
          pending: state.transactions.pending.filter(id => id !== payload),
        },
      };
    case ADD_CONFIRMED_TX:
      if (state.transactions.confirmed.includes(payload)) {
        return state;
      }

      return {
        ...state,
        transactions: {
          ...state.transactions,
          confirmed: [ ...state.transactions.confirmed, payload ],
        },
      };
    default:
      return state;
  }
}

// Connect Component
export class _connexConnect extends Component {
  static propTypes = {
    initialize: PropTypes.func.isRequired,
  };

  static defaultProps = {
    initialize() {}
  };

  render() {
    return <noscript />;
  }
}

export const ConnexConnect = connect(
  ({ connexConnect }) => ({
    connex: connexConnect.connex,
  }),
  dispatch => ({
    initialize: () => dispatch(initialize()),
  }),
)(_connexConnect);
