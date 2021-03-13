import { parseUnits } from '@ethersproject/units'
import { JSBI, Percent, Route, Token, TokenAmount, VVET } from 'vexchange-sdk'
import React, { useCallback, useContext, useEffect, useReducer, useState } from 'react'
import { ArrowDown, Plus } from 'react-feather'
import ReactGA from 'react-ga'
import { Text } from 'rebass'
import { find } from 'lodash'
import { ThemeContext } from 'styled-components'
import { ButtonConfirmed, ButtonPrimary } from '../../components/Button'
import { LightCard } from '../../components/Card'
import { AutoColumn, ColumnCenter } from '../../components/Column'
import ConfirmationModal from '../../components/ConfirmationModal'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import DoubleLogo from '../../components/DoubleLogo'
import PositionCard from '../../components/PositionCard'
import Row, { RowBetween, RowFixed } from '../../components/Row'

import Slider from '../../components/Slider'
import TokenLogo from '../../components/TokenLogo'
import { ROUTER_ADDRESS } from '../../constants'
import { usePair } from '../../data/Reserves'
import { useTotalSupply } from '../../data/TotalSupply'
import { useWeb3React } from '../../hooks'
// import { abi as IUniswapV2PairABI } from '../../constants/abis/IUniswapV2Pair.json'
import { abi as IUniswapV2Router02ABI } from '../../constants/abis/IUniswapV2Router02.json'

import { useToken } from '../../hooks/Tokens'
import { useTransactionAdder } from '../../state/transactions/hooks'
import { useTokenBalance } from '../../state/wallet/hooks'
import { TYPE } from '../../theme'
import { calculateSlippageAmount } from '../../utils'
import { ClickableText, FixedBottom, MaxButton, Wrapper } from './styleds'
import { useApproveCallback, Approval } from '../../hooks/useApproveCallback'
import { Dots } from '../../components/swap/styleds'

// denominated in bips
const ALLOWED_SLIPPAGE = 50

// denominated in seconds
const DEADLINE_FROM_NOW = 60 * 20

enum Field {
  LIQUIDITY = 'LIQUIDITY',
  TOKEN0 = 'TOKEN0',
  TOKEN1 = 'TOKEN1'
}

interface RemoveState {
  independentField: Field
  typedValue: string
  [Field.LIQUIDITY]: {
    address: string | undefined
  }
  [Field.TOKEN0]: {
    address: string | undefined
  }
  [Field.TOKEN1]: {
    address: string | undefined
  }
}

function initializeRemoveState(liquidity, inputAddress?: string, outputAddress?: string): RemoveState {
  return {
    independentField: Field.LIQUIDITY,
    typedValue: liquidity || '',
    [Field.LIQUIDITY]: {
      address: ''
    },
    [Field.TOKEN0]: {
      address: inputAddress
    },
    [Field.TOKEN1]: {
      address: outputAddress
    }
  }
}

enum RemoveAction {
  TYPE
}

interface Payload {
  [RemoveAction.TYPE]: {
    field: Field
    typedValue: string
  }
}

function reducer(
  state: RemoveState,
  action: {
    type: RemoveAction
    payload: Payload[RemoveAction]
  }
): RemoveState {
  switch (action.type) {
    case RemoveAction.TYPE: {
      const { field, typedValue } = action.payload as Payload[RemoveAction.TYPE]
      return {
        ...state,
        independentField: field,
        typedValue
      }
    }
    default: {
      throw Error
    }
  }
}

export default function RemoveLiquidity({ token0, token1 }: { token0: string; token1: string }) {
  const { account, chainId, library } = useWeb3React()
  const theme = useContext(ThemeContext)

  const [showConfirm, setShowConfirm] = useState<boolean>(false)
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)

  const inputToken: Token = useToken(token0)
  const outputToken: Token = useToken(token1)

  // get basic SDK entities
  const tokens: { [field in Field]?: Token } = {
    [Field.TOKEN0]: inputToken,
    [Field.TOKEN1]: outputToken
  }

  const pair = usePair(inputToken, outputToken)

  // pool token data
  const userLiquidity = useTokenBalance(account, pair?.liquidityToken)
  const totalPoolTokens = useTotalSupply(pair?.liquidityToken)

  // input state
  const [state, dispatch] = useReducer(reducer, initializeRemoveState(userLiquidity?.toExact(), token0, token1))
  const { independentField, typedValue } = state

  const tokensDeposited: { [field in Field]?: TokenAmount } = {
    [Field.TOKEN0]:
      pair &&
      totalPoolTokens &&
      userLiquidity &&
      // this condition is a short-circuit in the case where useTokenBalance updates sooner than useTotalSupply
      JSBI.greaterThanOrEqual(totalPoolTokens.raw, userLiquidity.raw)
        ? pair.getLiquidityValue(tokens[Field.TOKEN0], totalPoolTokens, userLiquidity, false)
        : undefined,
    [Field.TOKEN1]:
      pair &&
      totalPoolTokens &&
      userLiquidity &&
      // this condition is a short-circuit in the case where useTokenBalance updates sooner than useTotalSupply
      JSBI.greaterThanOrEqual(totalPoolTokens.raw, userLiquidity.raw)
        ? pair.getLiquidityValue(tokens[Field.TOKEN1], totalPoolTokens, userLiquidity, false)
        : undefined
  }

  const route: Route = pair
    ? new Route([pair], independentField !== Field.LIQUIDITY ? tokens[independentField] : tokens[Field.TOKEN1])
    : undefined

  // update input value when user types
  const onUserInput = useCallback((field: Field, typedValue: string) => {
    dispatch({ type: RemoveAction.TYPE, payload: { field, typedValue } })
  }, [])

  const parsedAmounts: { [field in Field]?: TokenAmount } = {}
  let poolTokenAmount
  try {
    if (typedValue !== '' && typedValue !== '.' && tokens[Field.TOKEN0] && tokens[Field.TOKEN1] && userLiquidity) {
      if (independentField === Field.TOKEN0) {
        const typedValueParsed = parseUnits(typedValue, tokens[Field.TOKEN0].decimals).toString()
        if (typedValueParsed !== '0') {
          const tokenAmount = new TokenAmount(tokens[Field.TOKEN0], typedValueParsed)
          if (
            tokensDeposited[Field.TOKEN0] &&
            JSBI.lessThanOrEqual(tokenAmount.raw, tokensDeposited[Field.TOKEN0].raw)
          ) {
            poolTokenAmount = JSBI.divide(
              JSBI.multiply(tokenAmount.raw, userLiquidity.raw),
              tokensDeposited[Field.TOKEN0].raw
            )
          }
        }
      }
      if (independentField === Field.TOKEN1) {
        const typedValueParsed = parseUnits(typedValue, tokens[Field.TOKEN1].decimals).toString()
        if (typedValueParsed !== '0') {
          const tokenAmount = new TokenAmount(tokens[Field.TOKEN1], typedValueParsed)
          if (
            tokensDeposited[Field.TOKEN1] &&
            JSBI.lessThanOrEqual(tokenAmount.raw, tokensDeposited[Field.TOKEN1].raw)
          ) {
            poolTokenAmount = JSBI.divide(
              JSBI.multiply(tokenAmount.raw, userLiquidity.raw),
              tokensDeposited[Field.TOKEN1].raw
            )
          }
        }
      }
      if (independentField === Field.LIQUIDITY) {
        const typedValueParsed = parseUnits(typedValue, pair?.liquidityToken.decimals).toString()
        const formattedAmount = new TokenAmount(pair?.liquidityToken, typedValueParsed)
        if (typedValueParsed !== '0') {
          if (JSBI.lessThanOrEqual(formattedAmount.raw, userLiquidity?.raw)) {
            poolTokenAmount = typedValueParsed
          }
        }
      }
    }
  } catch (error) {
    // should only fail if the user specifies too many decimal places of precision (or maybe exceed max uint?)
    console.error(error)
  }

  // set parsed amounts based on live amount of liquidity
  parsedAmounts[Field.LIQUIDITY] =
    !!pair && !!poolTokenAmount ? new TokenAmount(pair.liquidityToken, poolTokenAmount) : undefined

  parsedAmounts[Field.TOKEN0] =
    !!pair &&
    !!totalPoolTokens &&
    !!parsedAmounts[Field.LIQUIDITY] &&
    // this condition is a short-circuit in the case where useTokenBalance updates sooner than useTotalSupply
    JSBI.greaterThanOrEqual(totalPoolTokens.raw, userLiquidity.raw)
      ? pair.getLiquidityValue(tokens[Field.TOKEN0], totalPoolTokens, parsedAmounts[Field.LIQUIDITY], false)
      : undefined

  parsedAmounts[Field.TOKEN1] =
    !!pair &&
    !!totalPoolTokens &&
    !!parsedAmounts[Field.LIQUIDITY] &&
    // this condition is a short-circuit in the case where useTokenBalance updates sooner than useTotalSupply
    JSBI.greaterThanOrEqual(totalPoolTokens.raw, userLiquidity.raw)
      ? pair.getLiquidityValue(tokens[Field.TOKEN1], totalPoolTokens, parsedAmounts[Field.LIQUIDITY], false)
      : undefined

  // derived percent for advanced mode
  const derivedPercent =
    !!parsedAmounts[Field.LIQUIDITY] && !!userLiquidity
      ? new Percent(parsedAmounts[Field.LIQUIDITY].raw, userLiquidity.raw)
      : undefined

  const [override, setSliderOverride] = useState(false) // override slider internal value
  const handlePresetPercentage = newPercent => {
    setSliderOverride(true)
    onUserInput(
      Field.LIQUIDITY,
      new TokenAmount(
        pair?.liquidityToken,
        JSBI.divide(JSBI.multiply(userLiquidity.raw, JSBI.BigInt(newPercent)), JSBI.BigInt(100))
      ).toExact()
    )
  }

  const handleSliderChange = newPercent => {
    onUserInput(
      Field.LIQUIDITY,
      new TokenAmount(
        pair?.liquidityToken,
        JSBI.divide(JSBI.multiply(userLiquidity.raw, JSBI.BigInt(newPercent)), JSBI.BigInt(100))
      ).toExact()
    )
  }

  const [approval, approveCallback] = useApproveCallback(parsedAmounts[Field.LIQUIDITY], ROUTER_ADDRESS)

  // adjust amounts for slippage
  const slippageAdjustedAmounts = {
    [Field.TOKEN0]:
      tokens[Field.TOKEN0] && parsedAmounts[Field.TOKEN0]
        ? new TokenAmount(
            tokens[Field.TOKEN0],
            calculateSlippageAmount(parsedAmounts[Field.TOKEN0], ALLOWED_SLIPPAGE)[0]
          )
        : undefined,
    [Field.TOKEN1]:
      tokens[Field.TOKEN1] && parsedAmounts[Field.TOKEN1]
        ? new TokenAmount(
            tokens[Field.TOKEN1],
            calculateSlippageAmount(parsedAmounts[Field.TOKEN1], ALLOWED_SLIPPAGE)[0]
          )
        : undefined
  }

  // get formatted amounts
  const formattedAmounts = {
    [Field.LIQUIDITY]:
      independentField === Field.LIQUIDITY
        ? typedValue
        : parsedAmounts[Field.LIQUIDITY]
        ? parsedAmounts[Field.LIQUIDITY].toSignificant(6)
        : '',
    [Field.TOKEN0]:
      independentField === Field.TOKEN0
        ? typedValue
        : parsedAmounts[Field.TOKEN0]
        ? parsedAmounts[Field.TOKEN0].toSignificant(6)
        : '',
    [Field.TOKEN1]:
      independentField === Field.TOKEN1
        ? typedValue
        : parsedAmounts[Field.TOKEN1]
        ? parsedAmounts[Field.TOKEN1].toSignificant(6)
        : ''
  }

  const onMax = () => {
    onUserInput(Field.LIQUIDITY, userLiquidity.toExact())
  }

  const atMaxAmount =
    !!userLiquidity && !!parsedAmounts[Field.LIQUIDITY]
      ? JSBI.equal(userLiquidity.raw, parsedAmounts[Field.LIQUIDITY].raw)
      : false

  // errors
  const [generalError, setGeneralError] = useState<string>('')
  const [inputError, setInputError] = useState<string>('')
  const [outputError, setOutputError] = useState<string>('')
  const [poolTokenError, setPoolTokenError] = useState<string>('')
  const [isValid, setIsValid] = useState<boolean>(false)

  // update errors live
  useEffect(() => {
    // reset errors
    setGeneralError('')
    setInputError('')
    setOutputError('')
    setPoolTokenError('')
    setIsValid(true)

    if (formattedAmounts[Field.TOKEN0] === '') {
      setGeneralError('Enter an amount')
      setIsValid(false)
    } else if (!parsedAmounts[Field.TOKEN0]) {
      setInputError('Invalid amount')
      setIsValid(false)
    }

    if (formattedAmounts[Field.TOKEN1] === '') {
      setGeneralError('Enter an amount')
      setIsValid(false)
    } else if (!parsedAmounts[Field.TOKEN1]) {
      setOutputError('Invalid amount')
      setIsValid(false)
    }

    if (formattedAmounts[Field.LIQUIDITY] === '') {
      setGeneralError('Enter an amount')
      setIsValid(false)
    } else if (!parsedAmounts[Field.LIQUIDITY]) {
      setPoolTokenError('Invalid Amount')
      setIsValid(false)
    }
  }, [formattedAmounts, parsedAmounts, totalPoolTokens, userLiquidity])

  // state for txn
  const addTransaction = useTransactionAdder()
  const [txHash, setTxHash] = useState()
  const [attemptedRemoval, setAttemptedRemoval] = useState(false) // clicke confirm
  const [pendingConfirmation, setPendingConfirmation] = useState(true) // waiting for

  function resetModalState() {
    setAttemptedRemoval(false)
    setPendingConfirmation(true)
  }

  async function approveAmount() {
    approveCallback()
  }

  async function onRemove() {
    setAttemptedRemoval(true)

    const token0IsETH = tokens[Field.TOKEN0].equals(VVET[chainId])
    const oneTokenIsETH = token0IsETH || tokens[Field.TOKEN1].equals(VVET[chainId])

    let args, abi
    if (approval === Approval.APPROVED) {
      if (oneTokenIsETH) {
        abi = find(IUniswapV2Router02ABI, { name: 'removeLiquidityETH' })

        args = [
          tokens[token0IsETH ? Field.TOKEN1 : Field.TOKEN0].address,
          parsedAmounts[Field.LIQUIDITY].raw.toString(),
          slippageAdjustedAmounts[token0IsETH ? Field.TOKEN1 : Field.TOKEN0].raw.toString(),
          slippageAdjustedAmounts[token0IsETH ? Field.TOKEN0 : Field.TOKEN1].raw.toString(),
          account,
          Math.ceil(Date.now() / 1000) + DEADLINE_FROM_NOW
        ]
      }
      //removal without ETH
      else {
        abi = find(IUniswapV2Router02ABI, { name: 'removeLiquidity' })

        args = [
          tokens[Field.TOKEN0].address,
          tokens[Field.TOKEN1].address,
          parsedAmounts[Field.LIQUIDITY].raw.toString(),
          slippageAdjustedAmounts[Field.TOKEN0].raw.toString(),
          slippageAdjustedAmounts[Field.TOKEN1].raw.toString(),
          account,
          Math.ceil(Date.now() / 1000) + DEADLINE_FROM_NOW
        ]
      }
    }

    // removal with ETH
    const method = library.thor.account(ROUTER_ADDRESS).method(abi)
    const clause = method.asClause(...args)

    library.vendor
      .sign('tx', [{ ...clause }])
      .comment('work')
      .request()
      .then(response => {
        ReactGA.event({
          category: 'Liquidity',
          action: 'Remove',
          label: [tokens[Field.TOKEN0]?.symbol, tokens[Field.TOKEN1]?.symbol].join('/')
        })
        setPendingConfirmation(false)
        setTxHash(response.hash)
        addTransaction(response, {
          summary:
            'Remove ' +
            parsedAmounts[Field.TOKEN0]?.toSignificant(3) +
            ' ' +
            tokens[Field.TOKEN0]?.symbol +
            ' and ' +
            parsedAmounts[Field.TOKEN1]?.toSignificant(3) +
            ' ' +
            tokens[Field.TOKEN1]?.symbol
        })
      })
      .catch(e => {
        console.error(e)
        resetModalState()
        setShowConfirm(false)
      })
  }

  function modalHeader() {
    return (
      <AutoColumn gap={'md'} style={{ marginTop: '20px' }}>
        <RowBetween align="flex-end">
          <Text fontSize={24} fontWeight={500}>
            {!!parsedAmounts[Field.TOKEN0] && parsedAmounts[Field.TOKEN0].toSignificant(6)}
          </Text>
          <RowFixed gap="4px">
            <TokenLogo address={tokens[Field.TOKEN0]?.address} size={'24px'} />
            <Text fontSize={24} fontWeight={500} style={{ marginLeft: '10px' }}>
              {tokens[Field.TOKEN0]?.symbol || ''}
            </Text>
          </RowFixed>
        </RowBetween>
        <RowFixed>
          <Plus size="16" color={theme.text2} />
        </RowFixed>
        <RowBetween align="flex-end">
          <Text fontSize={24} fontWeight={600}>
            {!!parsedAmounts[Field.TOKEN1] && parsedAmounts[Field.TOKEN1].toSignificant(6)}
          </Text>
          <RowFixed gap="4px">
            <TokenLogo address={tokens[Field.TOKEN1]?.address} size={'24px'} />
            <Text fontSize={24} fontWeight={500} style={{ marginLeft: '10px' }}>
              {tokens[Field.TOKEN1]?.symbol || ''}
            </Text>
          </RowFixed>
        </RowBetween>

        <TYPE.italic fontSize={12} color={theme.text2} textAlign="left" padding={'12px 0 0 0'}>
          {`Output is estimated. You will receive at least ${parsedAmounts[Field.TOKEN0]?.toSignificant(6)} ${
            tokens[Field.TOKEN0]?.symbol
          } and at least ${parsedAmounts[Field.TOKEN1]?.toSignificant(6)} ${
            tokens[Field.TOKEN1]?.symbol
          } or the transaction will revert.`}
        </TYPE.italic>
      </AutoColumn>
    )
  }

  function modalBottom() {
    return (
      <>
        <RowBetween>
          <Text color={theme.text2} fontWeight={500} fontSize={16}>
            {'VEX ' + tokens[Field.TOKEN0]?.symbol + ':' + tokens[Field.TOKEN1]?.symbol} Burned
          </Text>
          <RowFixed>
            <DoubleLogo
              a0={tokens[Field.TOKEN0]?.address || ''}
              a1={tokens[Field.TOKEN1]?.address || ''}
              margin={true}
            />
            <Text fontWeight={500} fontSize={16}>
              {parsedAmounts[Field.LIQUIDITY]?.toSignificant(6)}
            </Text>
          </RowFixed>
        </RowBetween>
        <RowBetween>
          <Text color={theme.text2} fontWeight={500} fontSize={16}>
            Price
          </Text>
          <Text fontWeight={500} fontSize={16} color={theme.text1}>
            {`1 ${tokens[Field.TOKEN0]?.symbol} = ${route?.midPrice && route.midPrice.adjusted.toSignificant(6)} ${
              tokens[Field.TOKEN1]?.symbol
            }`}
          </Text>
        </RowBetween>
        <RowBetween mt="1rem">
          <ButtonConfirmed
            onClick={approveAmount}
            confirmed={approval === Approval.APPROVED}
            disabled={approval !== Approval.NOT_APPROVED}
            mr="0.5rem"
            fontWeight={500}
            fontSize={20}
          >
            {approval === Approval.PENDING ? (
              <Dots>Approving</Dots>
            ) : approval === Approval.APPROVED ? (
              'Approved'
            ) : (
              'Approve'
            )}
          </ButtonConfirmed>

          <ButtonPrimary disabled={!(approval === Approval.APPROVED)} onClick={onRemove} ml="0.5rem">
            <Text fontWeight={500} fontSize={20}>
              Confirm
            </Text>
          </ButtonPrimary>
        </RowBetween>
      </>
    )
  }

  const pendingText = `Removing ${parsedAmounts[Field.TOKEN0]?.toSignificant(6)} ${
    tokens[Field.TOKEN0]?.symbol
  } and ${parsedAmounts[Field.TOKEN1]?.toSignificant(6)} ${tokens[Field.TOKEN1]?.symbol}`

  return (
    <Wrapper>
      <ConfirmationModal
        isOpen={showConfirm}
        onDismiss={() => {
          resetModalState()
          setShowConfirm(false)
        }}
        attemptingTxn={attemptedRemoval}
        pendingConfirmation={pendingConfirmation}
        hash={txHash ? txHash : ''}
        topContent={modalHeader}
        bottomContent={modalBottom}
        pendingText={pendingText}
        title="You will recieve"
      />
      <AutoColumn gap="md">
        <LightCard>
          <AutoColumn gap="20px">
            <RowBetween>
              <Text fontWeight={500}>Amount</Text>
              <ClickableText
                fontWeight={500}
                onClick={() => {
                  setShowAdvanced(!showAdvanced)
                }}
              >
                {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
              </ClickableText>
            </RowBetween>
            <Row style={{ alignItems: 'flex-end' }}>
              <Text fontSize={72} fontWeight={500}>
                {derivedPercent?.toFixed(0) === '0' ? '<1' : derivedPercent?.toFixed(0) ?? '0'}%
              </Text>
            </Row>
            {!showAdvanced && (
              <Slider
                value={parseInt(derivedPercent?.toFixed(0) ?? '0')}
                onChange={handleSliderChange}
                override={override}
              />
            )}
            {!showAdvanced && (
              <RowBetween>
                <MaxButton onClick={() => handlePresetPercentage(25)} width="20%">
                  25%
                </MaxButton>
                <MaxButton onClick={() => handlePresetPercentage(50)} width="20%">
                  50%
                </MaxButton>
                <MaxButton onClick={() => handlePresetPercentage(75)} width="20%">
                  75%
                </MaxButton>
                <MaxButton onClick={() => handlePresetPercentage(100)} width="20%">
                  Max
                </MaxButton>
              </RowBetween>
            )}
          </AutoColumn>
        </LightCard>
        {!showAdvanced && (
          <>
            <ColumnCenter>
              <ArrowDown size="16" color={theme.text2} />
            </ColumnCenter>{' '}
            <LightCard>
              <AutoColumn gap="10px">
                <RowBetween>
                  <Text fontSize={24} fontWeight={500}>
                    {formattedAmounts[Field.TOKEN0] ? formattedAmounts[Field.TOKEN0] : '-'}
                  </Text>
                  <RowFixed>
                    <TokenLogo address={tokens[Field.TOKEN0]?.address} style={{ marginRight: '12px' }} />
                    <Text fontSize={24} fontWeight={500}>
                      {tokens[Field.TOKEN0]?.symbol}
                    </Text>
                  </RowFixed>
                </RowBetween>
                <RowBetween>
                  <Text fontSize={24} fontWeight={500}>
                    {formattedAmounts[Field.TOKEN1] ? formattedAmounts[Field.TOKEN1] : '-'}
                  </Text>
                  <RowFixed>
                    <TokenLogo address={tokens[Field.TOKEN1]?.address} style={{ marginRight: '12px' }} />
                    <Text fontSize={24} fontWeight={500}>
                      {tokens[Field.TOKEN1]?.symbol}
                    </Text>
                  </RowFixed>
                </RowBetween>
              </AutoColumn>
            </LightCard>
          </>
        )}

        {showAdvanced && (
          <>
            <CurrencyInputPanel
              field={Field.LIQUIDITY}
              value={formattedAmounts[Field.LIQUIDITY]}
              onUserInput={onUserInput}
              onMax={onMax}
              showMaxButton={!atMaxAmount}
              disableTokenSelect
              token={pair?.liquidityToken}
              isExchange={true}
              pair={pair}
              id="liquidity-amount"
            />
            <ColumnCenter>
              <ArrowDown size="16" color={theme.text2} />
            </ColumnCenter>
            <CurrencyInputPanel
              field={Field.TOKEN0}
              value={formattedAmounts[Field.TOKEN0]}
              onUserInput={onUserInput}
              onMax={onMax}
              showMaxButton={!atMaxAmount}
              token={tokens[Field.TOKEN0]}
              label={'Output'}
              disableTokenSelect
              id="remove-liquidity-token0"
            />
            <ColumnCenter>
              <Plus size="16" color={theme.text2} />
            </ColumnCenter>
            <CurrencyInputPanel
              field={Field.TOKEN1}
              value={formattedAmounts[Field.TOKEN1]}
              onUserInput={onUserInput}
              onMax={onMax}
              showMaxButton={!atMaxAmount}
              token={tokens[Field.TOKEN1]}
              label={'Output'}
              disableTokenSelect
              id="remove-liquidity-token1"
            />
          </>
        )}
        <div style={{ padding: '10px 20px' }}>
          <RowBetween>
            Price:
            <div>
              1 {pair?.token0.symbol} ={' '}
              {independentField === Field.TOKEN0 || independentField === Field.LIQUIDITY
                ? route?.midPrice.toSignificant(6)
                : route?.midPrice.invert().toSignificant(6)}{' '}
              {pair?.token1.symbol}
            </div>
          </RowBetween>
        </div>
        <div style={{ position: 'relative' }}>
          <ButtonPrimary
            onClick={() => {
              setShowConfirm(true)
            }}
            disabled={!isValid}
          >
            <Text fontSize={20} fontWeight={500}>
              {inputError || outputError || poolTokenError || generalError || 'Remove'}
            </Text>
          </ButtonPrimary>
          <FixedBottom>
            <PositionCard pair={pair} minimal={true} />
          </FixedBottom>
        </div>
      </AutoColumn>
    </Wrapper>
  )
}
