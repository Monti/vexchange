import React from 'react'
import styled from 'styled-components'
import { Send } from 'react-feather'

import { ButtonSecondary } from '../Button'
import { useDarkModeManager } from '../../state/user/hooks'

const FooterFrame = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  ${({ theme }) => theme.mediaWidth.upToExtraSmall`
    display: none;
  `};
`

export default function Footer() {
  const [isDark] = useDarkModeManager();

  return (
    <FooterFrame>
      <form action="https://t.me/vexchange" target="_blank">
        <ButtonSecondary isDark={isDark} p="8px 12px">
          <Send size={16} style={{ marginRight: '8px' }} /> Feedback
        </ButtonSecondary>
      </form>
    </FooterFrame>
  )
}
