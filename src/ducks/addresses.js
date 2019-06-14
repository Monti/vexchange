const TESTNET = {
  factoryAddress: '0xE35fC605796e9bA6Fa0dD880D0552b15e096149c',
  exchangeAddresses: {
    addresses: [
      ['VTHO','0x57BBD33078f562143e592353594738D3f9d22603'],
      ['SHA','0xA02C827058203A5278c8FeF60703eE152A7F2C72'],
      //['MKR','0x93bB63aFe1E0180d0eF100D774B473034fd60C36'],
      //['OMG','0x26C226EBb6104676E593F8A070aD6f25cDa60F8D'],
      // ['ZRX','0xaBD44a1D1b9Fb0F39fE1D1ee6b1e2a14916D067D'],
    ],
    fromToken: {
      '0x0000000000000000000000000000456e65726779': '0x57BBD33078f562143e592353594738D3f9d22603',
      '0x9c6e62B3334294D70c8e410941f52D482557955B': '0xA02C827058203A5278c8FeF60703eE152A7F2C72',
      //'0xF9bA5210F91D0474bd1e1DcDAeC4C58E359AaD85': '0x93bB63aFe1E0180d0eF100D774B473034fd60C36',
      //'0x879884c3C46A24f56089f3bBbe4d5e38dB5788C0': '0x26C226EBb6104676E593F8A070aD6f25cDa60F8D',
      // '0xF22e3F33768354c9805d046af3C0926f27741B43': '0xaBD44a1D1b9Fb0F39fE1D1ee6b1e2a14916D067D',
    },
  },
  tokenAddresses: {
    addresses: [
      ['VTHO','0x0000000000000000000000000000456e65726779'],
      ['SHA','0x9c6e62B3334294D70c8e410941f52D482557955B'],
      //['MKR','0xF9bA5210F91D0474bd1e1DcDAeC4C58E359AaD85'],
      //['OMG','0x879884c3C46A24f56089f3bBbe4d5e38dB5788C0'],
      // ['ZRX','0xF22e3F33768354c9805d046af3C0926f27741B43'],
    ],
  },
};

const MAIN = {
  factoryAddress: '0x6A662F91E14312a11a2E35b359427AEf798fD928',
  exchangeAddresses: {
    addresses: [
      ['VTHO', '0xf9F99f982f3Ea9020f0A0afd4D4679dFEe1B63cf'],
      ['PLA', '0xD293f479254D5F6494c66A4982C7cA514A53D7C4'],
      ['DBET', '0x18C2385481cDf28779aC271272398dD61cc8CF3E'],
      ['SHA', '0xC19cf5Dfb71374b920F786078D37b5225CFcF30E'],
      ['TIC', '0x992cd19c2F33d5F5569F17fF047063B3b0ff1adA'],
      ['OCE', '0xDC391a5dbB89a3F768c41Cfa0e85dcaAF3A91f91'],
    ],
    fromToken: {
      '0x0000000000000000000000000000456e65726779': '0xf9F99f982f3Ea9020f0A0afd4D4679dFEe1B63cf',
      '0x89827F7bB951Fd8A56f8eF13C5bFEE38522F2E1F': '0xD293f479254D5F6494c66A4982C7cA514A53D7C4',
      '0x1b8EC6C2A45ccA481Da6F243Df0d7A5744aFc1f8': '0x18C2385481cDf28779aC271272398dD61cc8CF3E',
      '0x5db3C8A942333f6468176a870dB36eEf120a34DC': '0xC19cf5Dfb71374b920F786078D37b5225CFcF30E',
      '0xa94A33f776073423E163088a5078feac31373990': '0x992cd19c2F33d5F5569F17fF047063B3b0ff1adA',
      '0x0CE6661b4ba86a0EA7cA2Bd86a0De87b0B860F14': '0xDC391a5dbB89a3F768c41Cfa0e85dcaAF3A91f91',
    },
  },
  tokenAddresses: {
    addresses: [
      ['VTHO', '0x0000000000000000000000000000456e65726779'],
      ['OCE', '0x0CE6661b4ba86a0EA7cA2Bd86a0De87b0B860F14'],
      ['PLA', '0x89827F7bB951Fd8A56f8eF13C5bFEE38522F2E1F'],
      ['DBET', '0x1b8EC6C2A45ccA481Da6F243Df0d7A5744aFc1f8'],
      ['SHA', '0x5db3C8A942333f6468176a870dB36eEf120a34DC'],
      ['TIC', '0xa94A33f776073423E163088a5078feac31373990']
    ],
  },
};

const SET_ADDRESSES = 'app/addresses/setAddresses';
const ADD_EXCHANGE = 'app/addresses/addExchange';

const initialState = TESTNET;

export const addExchange = ({label, exchangeAddress, tokenAddress}) => (dispatch, getState) => {
  const { addresses: { tokenAddresses, exchangeAddresses } } = getState();

  if (tokenAddresses.addresses.filter(([ symbol ]) => symbol === label).length) {
    return;
  }

  if (exchangeAddresses.fromToken[tokenAddresses]) {
    return;
  }

  dispatch({
    type: ADD_EXCHANGE,
      payload: {
      label,
        exchangeAddress,
        tokenAddress,
    },
  });
};

export const setAddresses = networkId => {
  switch(networkId) {
    // Main Net
    case 74:
    case '74':
      return {
        type: SET_ADDRESSES,
        payload: MAIN,
      };
    // Testnet
    case 39:
    case '39':
    default:
      return {
        type: SET_ADDRESSES,
        payload: TESTNET,
      };
  }
};

export default (state = initialState, { type, payload }) => {
  switch (type) {
    case SET_ADDRESSES:
      return payload;
    case ADD_EXCHANGE:
      return handleAddExchange(state, { payload });
    default:
      return state;
  }
}

function handleAddExchange(state, { payload }) {
  const { label, tokenAddress, exchangeAddress } = payload;

  if (!label || !tokenAddress || !exchangeAddress) {
    return state;
  }

  return {
    ...state,
    exchangeAddresses: {
      ...state.exchangeAddresses,
      addresses: [
        ...state.exchangeAddresses.addresses,
        [label, exchangeAddress]
      ],
      fromToken: {
        ...state.exchangeAddresses.fromToken,
        [tokenAddress]: exchangeAddress,
      },
    },
    tokenAddresses: {
      ...state.tokenAddresses,
      addresses: [
        ...state.tokenAddresses.addresses,
        [label, tokenAddress]
      ],
    },
  };
}
