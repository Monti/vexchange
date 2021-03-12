import React, { useCallback } from 'react'
import styled, { css } from 'styled-components'
import { darken } from 'polished'
import { useTranslation } from 'react-i18next'
import { withRouter, NavLink, Link as HistoryLink, RouteComponentProps } from 'react-router-dom'

import { useDarkModeManager } from '../../state/user/hooks'
import { CursorPointer } from '../../theme'
import { ArrowLeft } from 'react-feather'
import { RowBetween } from '../Row'
import QuestionHelper from '../Question'

import { useBodyKeyDown } from '../../hooks'

const tabOrder = [
  {
    path: '/swap',
    textKey: 'swap',
    regex: /\/swap/
  },
  {
    path: '/send',
    textKey: 'send',
    regex: /\/send/
  },
  {
    path: '/pool',
    textKey: 'pool',
    regex: /\/pool/
  }
]

const Tabs = styled.div<{ isDark?: boolean }>`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  border-radius: 26px 26px 0 0;

  ${({ isDark }) =>
    isDark
      ? css`
          background-image: linear-gradient(270deg, rgba(255, 255, 255, 0.13) 0%, rgba(255, 255, 255, 0.03) 96%);
        `
      : css`
          background-color: #e8eaee;
        `}
`

const activeClassName = 'ACTIVE'

const StyledNavLink = styled(({ ...props }) => <NavLink {...props} />).attrs({
  activeClassName
})<{ isdark?: boolean }>`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  justify-content: center;
  height: 3rem;
  flex: 1 0 auto;
  outline: none;
  cursor: pointer;
  text-decoration: none;
  color: ${({ theme }) => theme.text3};
  font-size: 20px;
  box-sizing: border-box;
  padding: 1rem;

  &.${activeClassName} {
    box-sizing: border-box;
    font-weight: 500;
    color: ${({ theme }) => theme.text1};

    &:first-of-type {
      border-radius: 26px 0 0 0;
    }

    &:last-of-type {
      border-radius: 0 26px 0 0;
    }

    ${props =>
      props.isdark
        ? css`
            background-image: linear-gradient(270deg, rgba(255, 255, 255, 0.13) 0%, rgba(255, 255, 255, 0.03) 96%);
          `
        : css`
            background-color: #ffffff;
          `}
  }

  :hover,
  :focus {
    color: ${({ theme }) => darken(0.1, theme.text1)};
  }
`

const ActiveText = styled.div`
  font-weight: 500;
  font-size: 20px;
`

const ArrowLink = styled(ArrowLeft)`
  color: ${({ theme }) => theme.text1};
`

function NavigationTabs({ location: { pathname }, history }: RouteComponentProps<{}>) {
  const { t } = useTranslation()
  const [isDark] = useDarkModeManager()

  const navigate = useCallback(
    direction => {
      const tabIndex = tabOrder.findIndex(({ regex }) => pathname.match(regex))
      history.push(tabOrder[(tabIndex + tabOrder.length + direction) % tabOrder.length].path)
    },
    [pathname, history]
  )
  const navigateRight = useCallback(() => {
    navigate(1)
  }, [navigate])
  const navigateLeft = useCallback(() => {
    navigate(-1)
  }, [navigate])

  useBodyKeyDown('ArrowRight', navigateRight)
  useBodyKeyDown('ArrowLeft', navigateLeft)

  const adding = pathname.match('/add')
  const removing = pathname.match('/remove')
  const finding = pathname.match('/find')
  const creating = pathname.match('/create')

  return (
    <>
      {adding || removing ? (
        <Tabs isDark={isDark}>
          <RowBetween style={{ padding: '1rem' }}>
            <CursorPointer onClick={() => history.push('/pool')}>
              <ArrowLink />
            </CursorPointer>
            <ActiveText>{adding ? 'Add' : 'Remove'} Liquidity</ActiveText>
            <QuestionHelper
              text={
                adding
                  ? 'When you add liquidity, you are given pool tokens that represent your position in this pool. These tokens automatically earn fees proportional to your pool share and can be redeemed at any time.'
                  : 'Your liquidity is represented by a pool token (ERC20). Removing will convert your position back into tokens at the current rate and proportional to the amount of each token in the pool. Any fees you accrued are included in the token amounts you receive.'
              }
            />
          </RowBetween>
        </Tabs>
      ) : finding ? (
        <Tabs isDark={isDark}>
          <RowBetween style={{ padding: '1rem' }}>
            <HistoryLink to="/pool">
              <ArrowLink />
            </HistoryLink>
            <ActiveText>Import Pool</ActiveText>
            <QuestionHelper text={"Use this tool to find pairs that don't automatically appear in the interface."} />
          </RowBetween>
        </Tabs>
      ) : creating ? (
        <Tabs isDark={isDark}>
          <RowBetween style={{ padding: '1rem' }}>
            <HistoryLink to="/pool">
              <ArrowLink />
            </HistoryLink>
            <ActiveText>Create Pool</ActiveText>
            <QuestionHelper text={'Use this interface to create a new pool.'} />
          </RowBetween>
        </Tabs>
      ) : (
        <Tabs isDark={isDark}>
          {tabOrder.map(({ path, textKey, regex }) => (
            <StyledNavLink
              isdark={isDark ? 1 : 0}
              id={`${textKey}-nav-link`}
              key={path}
              to={path}
              isActive={(_, { pathname }) => !!pathname.match(regex)}
            >
              {t(textKey)}
            </StyledNavLink>
          ))}
        </Tabs>
      )}
    </>
  )
}

export default withRouter(NavigationTabs)
