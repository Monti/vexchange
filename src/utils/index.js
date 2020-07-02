import React from 'react'
import { Text } from 'rebass'
import { ethers } from 'ethers'
import axios from 'axios'

import FACTORY_ABI from '../constants/abis/factory'
import EXCHANGE_ABI from '../constants/abis/exchange'
import ERC20_ABI from '../constants/abis/erc20'
import ERC20_BYTES32_ABI from '../constants/abis/erc20_bytes32'
import { FACTORY_ADDRESSES, SUPPORTED_THEMES } from '../constants'
import { formatFixed } from '@uniswap/sdk'

import UncheckedJsonRpcSigner from './signer'
//
// using a currency library here in case we want to add more in future
let priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2
})

export function formattedPercent(percent) {
  if (!percent || percent === 0) {
    return (
      <Text fontWeight={500} fontSize={'1rem'}>
        0%
      </Text>
    )
  }

  if (percent < 0.0001 && percent > 0) {
    return (
      <Text fontWeight={500} fontSize={'1rem'} color="green">
        {'< 0.0001%'}
      </Text>
    )
  }

  if (percent < 0 && percent > -0.0001) {
    return (
      <Text fontWeight={500} fontSize={'1rem'} color="red">
        {'< 0.0001%'}
      </Text>
    )
  }

  let fixedPercent = percent.toFixed(2)
  if (fixedPercent === '0.00') {
    return '0%'
  }
  if (fixedPercent > 0) {
    if (fixedPercent > 100) {
      return <Text fontWeight={500} color="green">{`+${percent?.toFixed(0).toLocaleString()}%`}</Text>
    } else {
      return <Text fontWeight={500} color="green">{`+${fixedPercent}%`}</Text>
    }
  } else {
    return <Text fontWeight={500} color="red">{`${fixedPercent}%`}</Text>
  }
}

export const toK = (num, fixed, cutoff = false) => {
  const formatter = divideBy =>
    fixed === true
      ? cutoff
        ? Number(num / divideBy).toFixed(0)
        : Number(num / divideBy).toFixed(2)
      : Number(num / divideBy)
  if (num > 999999999 || num < -9999999) {
    return `${formatter(1000000000)}M`
  } else if (num > 999999 || num < -999999) {
    return `${formatter(1000000)}M`
  } else if (num > 999 || num < -999) {
    return `${formatter(1000)}K`
  } else {
    return formatter(1)
  }
}

export const ERROR_CODES = ['TOKEN_NAME', 'TOKEN_SYMBOL', 'TOKEN_DECIMALS'].reduce(
  (accumulator, currentValue, currentIndex) => {
    accumulator[currentValue] = currentIndex
    return accumulator
  },
  {}
)

export function safeAccess(object, path) {
  return object
    ? path.reduce(
        (accumulator, currentValue) => (accumulator && accumulator[currentValue] ? accumulator[currentValue] : null),
        object
      )
    : null
}

const VEFORGE_PREFIXES = {
  74: 'explore.',
  39: 'explore-testnet.'
}

export function getEtherscanLink(networkId, data, type) {
  const prefix = `https://${VEFORGE_PREFIXES[networkId] || VEFORGE_PREFIXES[1]}.vechain.org`

  switch (type) {
    case 'transaction': {
      return `${prefix}/transactions/${data}`
    }
    case 'address':
    default: {
      return `${prefix}/accounts/${data}`
    }
  }
}

export const formattedNum = (number, usd = false) => {
  if (isNaN(number) || number === '' || number === undefined) {
    return usd ? '$0' : 0
  }
  let num = parseFloat(number)

  if (num > 500000000) {
    return (usd ? '$' : '') + toK(num.toFixed(0), true)
  }

  if (num === 0) {
    if (usd) {
      return '$0'
    }
    return 0
  }
  if (num < 0.0001) {
    return usd ? '< $0.0001' : '< 0.0001'
  }

  if (num > 1000) {
    return usd
      ? '$' + Number(parseFloat(num).toFixed(0)).toLocaleString()
      : '' + Number(parseFloat(num).toFixed(0)).toLocaleString()
  }

  if (usd) {
    if (num < 0.1) {
      return '$' + Number(parseFloat(num).toFixed(4))
    } else {
      let usdString = priceFormatter.format(num)
      return '$' + usdString.slice(1, usdString.length)
    }
  }

  return Number(parseFloat(num).toFixed(4))
}

export const request = axios.create({
  baseURL: 'http://66.42.84.6:3000/api'
})

export function getQueryParam(windowLocation, name) {
  var q = windowLocation.search.match(new RegExp('[?&]' + name + '=([^&#?]*)'))
  return q && q[1]
}

export function getAllQueryParams() {
  let params = {}
  params.theme = checkSupportedTheme(getQueryParam(window.location, 'theme'))

  params.inputCurrency = isAddress(getQueryParam(window.location, 'inputCurrency'))
    ? getQueryParam(window.location, 'inputCurrency')
    : ''
  params.outputCurrency = isAddress(getQueryParam(window.location, 'outputCurrency'))
    ? getQueryParam(window.location, 'outputCurrency')
    : ''
  params.slippage = !isNaN(getQueryParam(window.location, 'slippage')) ? getQueryParam(window.location, 'slippage') : ''
  params.exactField = getQueryParam(window.location, 'exactField')
  params.exactAmount = !isNaN(getQueryParam(window.location, 'exactAmount'))
    ? getQueryParam(window.location, 'exactAmount')
    : ''
  params.theme = checkSupportedTheme(getQueryParam(window.location, 'theme'))
  params.recipient = isAddress(getQueryParam(window.location, 'recipient'))
    ? getQueryParam(window.location, 'recipient')
    : ''

  // Add Liquidity params
  params.ethAmount = !isNaN(getQueryParam(window.location, 'ethAmount'))
    ? getQueryParam(window.location, 'ethAmount')
    : ''
  params.tokenAmount = !isNaN(getQueryParam(window.location, 'tokenAmount'))
    ? getQueryParam(window.location, 'tokenAmount')
    : ''
  params.token = isAddress(getQueryParam(window.location, 'token')) ? getQueryParam(window.location, 'token') : ''

  // Remove liquidity params
  params.poolTokenAmount = !isNaN(getQueryParam(window.location, 'poolTokenAmount'))
    ? getQueryParam(window.location, 'poolTokenAmount')
    : ''
  params.poolTokenAddress = isAddress(getQueryParam(window.location, 'poolTokenAddress'))
    ? getQueryParam(window.location, 'poolTokenAddress')
    : ''

  // Create Exchange params
  params.tokenAddress = isAddress(getQueryParam(window.location, 'tokenAddress'))
    ? getQueryParam(window.location, 'tokenAddress')
    : ''

  return params
}

export function checkSupportedTheme(themeName) {
  if (themeName && themeName.toUpperCase() in SUPPORTED_THEMES) {
    return themeName.toUpperCase()
  }
  return null
}

export function getNetworkName(networkId) {
  switch (networkId) {
    case 74: {
      return 'the Main VeChain Network'
    }
    case 39: {
      return 'the Ropsten Test Network'
    }
    default: {
      return 'the correct network'
    }
  }
}

export function shortenAddress(address, digits = 4) {
  if (!isAddress(address)) {
    throw Error(`Invalid 'address' parameter '${address}'.`)
  }
  return `${address.substring(0, digits + 2)}...${address.substring(42 - digits)}`
}

export function shortenTransactionHash(hash, digits = 4) {
  return `${hash.substring(0, digits + 2)}...${hash.substring(66 - digits)}`
}

export function isAddress(value) {
  try {
    return ethers.utils.getAddress(value.toLowerCase())
  } catch {
    return false
  }
}

export function calculateGasMargin(value, margin) {
  const offset = value.mul(margin).div(ethers.utils.bigNumberify(10000))
  return value.add(offset)
}

// account is optional
export function getProviderOrSigner(library, account) {
  return account ? new UncheckedJsonRpcSigner(library.getSigner(account)) : library
}

// account is optional
export function getContract(address, ABI, library, account) {
  if (!isAddress(address) || address === ethers.constants.AddressZero) {
    throw Error(`Invalid 'address' parameter '${address}'.`)
  }

  return new library.eth.Contract(ABI, address)
}

// account is optional
export function getFactoryContract(networkId, library, account) {
  return getContract(FACTORY_ADDRESSES[networkId], FACTORY_ABI, library, account)
}

// account is optional
export function getExchangeContract(exchangeAddress, library, account) {
  return getContract(exchangeAddress, EXCHANGE_ABI, library, account)
}

// get token name
export async function getTokenName(tokenAddress, library) {
  if (!isAddress(tokenAddress)) {
    throw Error(`Invalid 'tokenAddress' parameter '${tokenAddress}'.`)
  }

  return getContract(tokenAddress, ERC20_ABI, library)
    .methods.name()
    .call()
    .catch(() =>
      getContract(tokenAddress, ERC20_BYTES32_ABI, library)
        .methods.name()
        .call()
        .then(bytes32 => ethers.utils.parseBytes32String(bytes32))
    )
    .catch(error => {
      error.code = ERROR_CODES.TOKEN_SYMBOL
      throw error
    })
}

// get token symbol
export async function getTokenSymbol(tokenAddress, library) {
  if (!isAddress(tokenAddress)) {
    throw Error(`Invalid 'tokenAddress' parameter '${tokenAddress}'.`)
  }

  return getContract(tokenAddress, ERC20_ABI, library)
    .methods.symbol()
    .call()
    .catch(() => {
      const contractBytes32 = getContract(tokenAddress, ERC20_BYTES32_ABI, library)
      return contractBytes32.methods
        .symbol()
        .call()
        .then(bytes32 => ethers.utils.parseBytes32String(bytes32))
    })
    .catch(error => {
      error.code = ERROR_CODES.TOKEN_SYMBOL
      throw error
    })
}

// get token decimals
export async function getTokenDecimals(tokenAddress, library) {
  if (!isAddress(tokenAddress)) {
    throw Error(`Invalid 'tokenAddress' parameter '${tokenAddress}'.`)
  }

  return getContract(tokenAddress, ERC20_ABI, library)
    .methods.decimals()
    .call()
    .catch(error => {
      error.code = ERROR_CODES.TOKEN_DECIMALS
      throw error
    })
}

// get the exchange address for a token from the factory
export async function getTokenExchangeAddressFromFactory(tokenAddress, networkId, library) {
  return getFactoryContract(networkId, library)
    .methods.getExchange(tokenAddress)
    .call()
}

// get the ether balance of an address
export async function getEtherBalance(address, library) {
  if (!isAddress(address)) {
    throw Error(`Invalid 'address' parameter '${address}'`)
  }

  let balance = await library.eth.getBalance(address)
  balance = ethers.utils.bigNumberify(balance)

  return balance
}

export function formatEthBalance(balance) {
  return amountFormatter(balance, 18, 6)
}

export function formatTokenBalance(balance, decimal) {
  return !!(balance && Number.isInteger(decimal)) ? amountFormatter(balance, decimal, Math.min(4, decimal)) : 0
}

export function formatToUsd(price) {
  const format = { decimalSeparator: '.', groupSeparator: ',', groupSize: 3 }
  const usdPrice = formatFixed(price, {
    decimalPlaces: 2,
    dropTrailingZeros: false,
    format
  })
  return usdPrice
}

// get the token balance of an address
export async function getTokenBalance(tokenAddress, address, library) {
  if (!isAddress(tokenAddress) || !isAddress(address)) {
    throw Error(`Invalid 'tokenAddress' or 'address' parameter '${tokenAddress}' or '${address}'.`)
  }

  const contract = getContract(tokenAddress, ERC20_ABI, library)
  let balance = await contract.methods.balanceOf(address).call()
  balance = ethers.utils.bigNumberify(balance)
  return balance
}

// get the token allowance
export async function getTokenAllowance(address, tokenAddress, spenderAddress, library) {
  if (!isAddress(address) || !isAddress(tokenAddress) || !isAddress(spenderAddress)) {
    throw Error(
      "Invalid 'address' or 'tokenAddress' or 'spenderAddress' parameter" +
        `'${address}' or '${tokenAddress}' or '${spenderAddress}'.`
    )
  }

  const contract = getContract(tokenAddress, ERC20_ABI, library)
  let allowance = await contract.methods.allowance(address, spenderAddress).call()

  return allowance
}

// amount must be a BigNumber, {base,display}Decimals must be Numbers
export function amountFormatter(amount, baseDecimals = 18, displayDecimals = 3, useLessThan = true) {
  if (baseDecimals > 18 || displayDecimals > 18 || displayDecimals > baseDecimals) {
    throw Error(`Invalid combination of baseDecimals '${baseDecimals}' and displayDecimals '${displayDecimals}.`)
  }

  // if balance is falsy, return undefined
  if (!amount) {
    return undefined
  }
  // if amount is 0, return
  else if (amount.isZero()) {
    return '0'
  }
  // amount > 0
  else {
    // amount of 'wei' in 1 'ether'
    const baseAmount = ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(baseDecimals))

    const minimumDisplayAmount = baseAmount.div(
      ethers.utils.bigNumberify(10).pow(ethers.utils.bigNumberify(displayDecimals))
    )

    // if balance is less than the minimum display amount
    if (amount.lt(minimumDisplayAmount)) {
      return useLessThan
        ? `<${ethers.utils.formatUnits(minimumDisplayAmount, baseDecimals)}`
        : `${ethers.utils.formatUnits(amount, baseDecimals)}`
    }
    // if the balance is greater than the minimum display amount
    else {
      const stringAmount = ethers.utils.formatUnits(amount, baseDecimals)

      // if there isn't a decimal portion
      if (!stringAmount.match(/\./)) {
        return stringAmount
      }
      // if there is a decimal portion
      else {
        const [wholeComponent, decimalComponent] = stringAmount.split('.')
        const roundedDecimalComponent = ethers.utils
          .bigNumberify(decimalComponent.padEnd(baseDecimals, '0'))
          .toString()
          .padStart(baseDecimals, '0')
          .substring(0, displayDecimals)

        // decimals are too small to show
        if (roundedDecimalComponent === '0'.repeat(displayDecimals)) {
          return wholeComponent
        }
        // decimals are not too small to show
        else {
          return `${wholeComponent}.${roundedDecimalComponent.toString().replace(/0*$/, '')}`
        }
      }
    }
  }
}
