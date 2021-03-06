import React, { useState, useEffect } from 'react'
import { useWeb3Context, Connectors } from 'web3-react-thor'
import styled from 'styled-components'
import { extend } from 'thorify/dist/extend'
import { useTranslation } from 'react-i18next'
import { isMobile } from 'react-device-detect'
import Web3 from 'web3'

import { Spinner } from '../../theme'
import Circle from '../../assets/images/circle.svg'

const { Connector } = Connectors

const MessageWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 20rem;
`

const Message = styled.h2`
  color: ${({ theme }) => theme.vexchangeGreen};
`

const SpinnerWrapper = styled(Spinner)`
  font-size: 4rem;

  svg {
    path {
      color: ${({ theme }) => theme.vexchangeGreen};
    }
  }
`

function tryToSetConnector(setConnector, setError) {
  setConnector('Injected', { suppressAndThrowErrors: true }).catch(() => {
    setConnector('Network', { suppressAndThrowErrors: true }).catch(error => {
      setError(error)
    })
  })
}

export default function Web3ReactManager({ children }) {
  const { t } = useTranslation()
  const { active, error, setConnector, setError } = useWeb3Context()
  // control whether or not we render the error, after parsing
  const blockRender = error && error.code && error.code === Connector.errorCodes.UNSUPPORTED_NETWORK

  useEffect(() => {
    if (!active && !error) {
      if (window.thor || window.web3) {
        if (isMobile) {
          tryToSetConnector(setConnector, setError)
        } else {
          const web3 = new Web3(window.thor)
          extend(web3)

          web3.eth.getAccounts().then(accounts => {
            if (accounts.length >= 1) {
              tryToSetConnector(setConnector, setError)
            } else {
              setConnector('Injected', { suppressAndThrowErrors: true }).catch(error => {
                setError(error)
              })
            }
          })
        }
      } else {
        setConnector('Injected', { suppressAndThrowErrors: true }).catch(error => {
          setError(error)
        })
      }
    }
  })

  // parse the error
  useEffect(() => {
    if (error) {
      // if the user changes to the wrong network, unset the connector
      if (error.code === Connector.errorCodes.UNSUPPORTED_NETWORK) {
        setConnector('Network', { suppressAndThrowErrors: true }).catch(error => {
          setError(error)
        })
      }
    }
  })

  const [showLoader, setShowLoader] = useState(false)
  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowLoader(true)
    }, 600)
    return () => {
      clearTimeout(timeout)
    }
  }, [])

  if (blockRender) {
    return null
  } else if (error) {
    return (
      <MessageWrapper>
        <Message>{t('unknownError')}</Message>
      </MessageWrapper>
    )
  } else if (!active) {
    return showLoader ? (
      <MessageWrapper>
        <SpinnerWrapper src={Circle} />
      </MessageWrapper>
    ) : null
  } else {
    return children
  }
}
