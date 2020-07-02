import React, { useReducer, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'
import { useWeb3Context, Connectors } from 'web3-react-thor'
import { darken, transparentize } from 'polished'
import { picasso } from '@vechain/picasso'
import { Activity } from 'react-feather'
import { extend } from 'thorify/dist/extend'
import { useRouteMatch } from 'react-router-dom'
import Web3 from 'web3'

import { shortenAddress } from '../../utils'
import { useENSName } from '../../hooks'
import WalletModal from '../WalletModal'
import { useAllTransactions } from '../../contexts/Transactions'
import { Spinner } from '../../theme'
import { StyledNavLink } from '../NavigationTabs'
import Circle from '../../assets/images/circle.svg'

const { Connector } = Connectors

const Web3StatusGeneric = styled.button`
  ${({ theme }) => theme.flexRowNoWrap}
  width: 100%;
  font-size: 0.9rem;
  align-items: center;
  padding: 0.5rem;
  border-radius: 3px;
  box-sizing: border-box;
  cursor: pointer;
  user-select: none;
  :focus {
    outline: none;
  }
`
const Web3StatusError = styled(Web3StatusGeneric)`
  background-color: ${({ theme }) => theme.salmonRed};
  border: 1px solid ${({ theme }) => theme.salmonRed};
  color: ${({ theme }) => theme.white};
  font-weight: 500;
  :hover,
  :focus {
    background-color: ${({ theme }) => darken(0.1, theme.salmonRed)};
  }
`

const Web3StatusConnect = styled(Web3StatusGeneric)`
  background-color: ${({ theme }) => theme.royalBlue};
  border: 1px solid ${({ theme }) => theme.royalBlue};
  color: ${({ theme }) => theme.white};
  font-weight: 500;

  :hover,
  :focus {
    background-color: ${({ theme }) => darken(0.1, theme.royalBlue)};
  }
`

const Web3StatusConnected = styled(Web3StatusGeneric)`
  background-color: ${({ pending, theme }) => (pending ? theme.zumthorBlue : theme.inputBackground)};
  border: 1px solid ${({ pending, theme }) => (pending ? theme.royalBlue : theme.mercuryGray)};
  color: ${({ pending, theme }) => (pending ? theme.royalBlue : theme.doveGray)};
  font-weight: 400;
  :hover {

    background-color: ${({ pending, theme }) =>
      pending ? transparentize(0.9, theme.royalBlue) : darken(0.05, theme.inputBackground)};
    
  :focus {
    border: 1px solid
      ${({ pending, theme }) => (pending ? darken(0.1, theme.royalBlue) : darken(0.1, theme.mercuryGray))};
  }
`

const Text = styled.p`
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0 0.5rem 0 0.25rem;
  font-size: 0.83rem;
`

const Identicon = styled.div`
  height: 1rem;
  width: 1rem;
  border-radius: 3px;
  background-color: ${({ theme }) => theme.silverGray};
`

const NetworkIcon = styled(Activity)`
  margin-left: 0.25rem;
  margin-right: 0.5rem;
  width: 16px;
  height: 16px;
`

const SpinnerWrapper = styled(Spinner)`
  margin: 0 0.25rem 0 0.25rem;
`

const walletModalInitialState = {
  open: false,
  error: undefined
}

const WALLET_MODAL_ERROR = 'WALLET_MODAL_ERROR'
const WALLET_MODAL_OPEN = 'WALLET_MODAL_OPEN'
const WALLET_MODAL_OPEN_ERROR = 'WALLET_MODAL_OPEN_ERROR'
const WALLET_MODAL_CLOSE = 'WALLET_MODAL_CLOSE'

function walletModalReducer(state, { type, payload }) {
  switch (type) {
    case WALLET_MODAL_ERROR: {
      const { error } = payload
      return { ...state, error }
    }
    case WALLET_MODAL_OPEN: {
      return { ...state, open: true }
    }
    case WALLET_MODAL_OPEN_ERROR: {
      const { error } = payload || {}
      return { open: true, error }
    }
    case WALLET_MODAL_CLOSE: {
      return { ...state, open: false }
    }
    default: {
      throw Error(`Unexpected action type in walletModalReducer reducer: '${type}'.`)
    }
  }
}

export default function Web3Status() {
  const { isExact } = useRouteMatch('/')
  const { t } = useTranslation()
  const { active, account, connectorName, setConnector } = useWeb3Context()

  const ENSName = useENSName(account)

  const allTransactions = useAllTransactions()
  const pending = Object.keys(allTransactions).filter(hash => !allTransactions[hash].receipt)
  const confirmed = Object.keys(allTransactions).filter(hash => allTransactions[hash].receipt)

  const hasPendingTransactions = !!pending.length

  const [{ open: walletModalIsOpen, error: walletModalError }, dispatch] = useReducer(
    walletModalReducer,
    walletModalInitialState
  )
  function setError(error) {
    dispatch({ type: WALLET_MODAL_ERROR, payload: { error } })
  }
  function openWalletModal(error) {
    dispatch({ type: WALLET_MODAL_OPEN, ...(error ? { payload: { error } } : {}) })
  }
  function closeWalletModal() {
    dispatch({ type: WALLET_MODAL_CLOSE })
  }

  // janky logic to detect log{ins,outs}...
  useEffect(() => {
    // if the injected connector is not active...
    const { thor } = window
    const web3 = new Web3(thor)
    extend(web3)

    if (connectorName !== 'Injected') {
      if (connectorName === 'Network' && thor && thor.on && thor.removeListener) {
        function tryToActivateInjected() {
          // if calling enable won't pop an approve modal, then try to activate injected...
          web3.eth.getAccounts().then(accounts => {
            if (accounts.length >= 1) {
              setConnector('Injected', { suppressAndThrowErrors: true })
                .then(() => {
                  setError()
                })
                .catch(error => {
                  // ...and if the error is that they're on the wrong network, display it, otherwise eat it
                  if (error.code === Connector.errorCodes.UNSUPPORTED_NETWORK) {
                    setError(error)
                  }
                })
            }
          })
        }

        thor.on('networkChanged', tryToActivateInjected)
        thor.on('accountsChanged', tryToActivateInjected)

        return () => {
          if (thor.removeListener) {
            thor.removeListener('networkChanged', tryToActivateInjected)
            thor.removeListener('accountsChanged', tryToActivateInjected)
          }
        }
      }
    } else {
      // ...poll to check the accounts array, and if it's ever 0 i.e. the user logged out, update the connector
      if (thor) {
        const accountPoll = setInterval(() => {
          web3.eth.getAccounts().then(accounts => {
            if (accounts.length === 0) {
              setConnector('Injected')
            }
          })
        }, 750)

        return () => {
          clearInterval(accountPoll)
        }
      }
    }
  }, [connectorName, setConnector])

  function onClick() {
    if (walletModalError) {
      openWalletModal()
    } else if (connectorName === 'Network' && (window.thor || window.web3)) {
      setConnector('Injected', { suppressAndThrowErrors: true }).catch(error => {
        if (error.code === Connector.errorCodes.UNSUPPORTED_NETWORK) {
          setError(error)
        }
      })
    } else {
      openWalletModal()
    }
  }

  const ref = useRef()
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = ''
      if (account) {
        const div = document.createElement('div')
        const svg = picasso(account)
        div.style.background = `no-repeat url('data:image/svg+xml;utf8,${svg}')`
        div.style.height = '16px'
        div.style.width = '16px'

        ref.current.appendChild(div)
      }
    }
  }, [account, walletModalError])

  function getWeb3Status() {
    if (walletModalError) {
      // this is ok because we're guaranteed that the error is a wrong network error
      return (
        <Web3StatusError onClick={onClick}>
          <NetworkIcon />
          <Text>Wrong Network</Text>
        </Web3StatusError>
      )
    } else if (!account) {
      return (
        <Web3StatusConnect onClick={onClick}>
          <Text>{t('Connect')}</Text>
        </Web3StatusConnect>
      )
    } else {
      return (
        <Web3StatusConnected onClick={onClick} pending={hasPendingTransactions}>
          {hasPendingTransactions && <SpinnerWrapper src={Circle} alt="loader" />}
          <Text>{ENSName || shortenAddress(account)}</Text>
          <Identicon ref={ref} />
        </Web3StatusConnected>
      )
    }
  }

  if (isExact) {
    return <StyledNavLink to="/swap">View Exchange</StyledNavLink>
  }

  return (
    active && (
      <>
        {getWeb3Status()}
        <WalletModal
          isOpen={walletModalIsOpen}
          error={walletModalError}
          onDismiss={closeWalletModal}
          ENSName={ENSName}
          pendingTransactions={pending}
          confirmedTransactions={confirmed}
        />
      </>
    )
  )
}
