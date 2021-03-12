import React, { useRef, useEffect } from 'react'
import styled from 'styled-components'

import { ReactComponent as MenuIcon } from '../../assets/images/menu.svg'

import { Link } from '../../theme'
import { useToggle } from '../../hooks'
import { useDarkModeManager } from '../../state/user/hooks'

const StyledMenuIcon = styled(MenuIcon)`
  path {
    stroke: ${({ theme }) => theme.text1};
  }
`

const StyledMenuButton = styled.button<{ isDark?: boolean }>`
  width: 100%;
  height: 100%;
  border: none;
  margin: 0;
  padding: 0;
  height: 38px;
  width: 38px;
  position: relative;
  z-index: 0;

  background-color: ${({ isDark }) => (isDark ? 'rgba(99, 113, 142, 0.14)' : 'rgba(255, 255, 255, 0.14)')};
  color: ${({ theme }) => theme.primaryText1};
  font-size: 16px;
  border-radius: 0.5rem;

  &:before {
    content: '';
    position: absolute;
    z-index: -1;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 1px;
    border-radius: 0.5rem;
    background: transparent;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: destination-out;
    mask-composite: exclude;
  }

  :hover,
  :focus {
    &:before {
      background: linear-gradient(to right, #e79631, #d92921);
    }

    cursor: pointer;
    outline: none;
  }

  svg {
    margin-top: 2px;
  }
`

const StyledMenu = styled.div`
  margin-left: 0.5rem;
  display: flex;
  box-sizing: border-box;
  justify-content: center;
  align-items: center;
  position: relative;
  border: none;
  text-align: left;
`

const MenuFlyout = styled.span<{ isDark?: boolean }>`
  min-width: 8.125rem;
  background-color: ${({ isDark }) => (isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(99, 113, 142, 0.14)')};
  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);
  border-radius: 0.5rem;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  font-size: 1rem;
  position: absolute;
  top: 3rem;
  right: 0rem;
  z-index: 100;
`

const MenuItem = styled(Link)`
  flex: 1;
  padding: 0.5rem 0.5rem;
  color: ${({ theme }) => theme.text2};
  :hover {
    color: ${({ theme }) => theme.text1};
    cursor: pointer;
  }
`

const CODE_LINK = !!process.env.REACT_APP_GIT_COMMIT_HASH
  ? `https://github.com/Uniswap/uniswap-frontend/tree/${process.env.REACT_APP_GIT_COMMIT_HASH}`
  : 'https://github.com/Uniswap/uniswap-frontend'

export default function Menu() {
  const node = useRef<HTMLDivElement>()
  const [open, toggle] = useToggle(false)
  const [isDark] = useDarkModeManager();

  useEffect(() => {
    const handleClickOutside = e => {
      if (node.current?.contains(e.target) ?? false) {
        return
      }
      toggle()
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, toggle])

  return (
    <StyledMenu ref={node}>
      <StyledMenuButton onClick={() => toggle()}>
        <StyledMenuIcon />
      </StyledMenuButton>
      {open ? (
        <MenuFlyout isDark={isDark}>
          <MenuItem id="link" href="https://uniswap.org/">
            About
          </MenuItem>
          <MenuItem id="link" href="https://uniswap.org/docs/v2">
            Docs
          </MenuItem>
          <MenuItem id="link" href={CODE_LINK}>
            Code
          </MenuItem>
          <MenuItem id="link" href="https://uniswap.info/">
            Analytics
          </MenuItem>
        </MenuFlyout>
      ) : (
        ''
      )}
    </StyledMenu>
  )
}
