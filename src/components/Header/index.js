import React, { Component } from 'react';
import MediaQuery from 'react-responsive';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classnames from 'classnames';
import { Button } from 'antd';
import CometLogo from '../../assets/images/comet.png';
import AkraneLogo from '../../assets/images/arkane.svg';
import Status from '../Status';

import "./header.scss";

const links = {
  comet: {
    chrome: 'https://www.cometpowered.com/',
  },
  sync: {
    chrome: 'https://github.com/vechain/thor-sync.electron/releases',
  },
};

function getSyncLinks() {
  return links.sync.chrome;
}

function getCometLinks() {
  return links.comet.chrome;
}

class BlockingWarning extends Component {
  constructor() {
    super();
  }

  render () {
    const {
      connex,
      isConnected,
      initialized,
    } = this.props;

    let content = [];

    if (!connex && initialized) {
      content = [
        <div key="warning-title">No Vechain wallet found</div>,
        <div key="warning-desc" className="header__dialog__description">
          <MediaQuery query="(min-width: 768px)">
            {(matches) => {
              if (matches) {
                return 'Please visit us after installing Comet or Arkane Network.';
              } else {
                return 'Unfortunately Comet does not work on mobile. If you would like to use Vexchange on mobile please use Arkane or visit Vexchange on a desktop computer.';
              }
            }}
          </MediaQuery>
        </div>,
        <div key="warning-logos" className="header__download">
          <MediaQuery query="(min-width: 768px)">
            {(matches) => {
              if (matches) {
                return [
                  <img src={CometLogo} key="comet" onClick={() => window.open(getCometLinks(), '_blank')} />,
                  <img src={AkraneLogo} key="arkane" onClick={() => window.open(getSyncLinks(), '_blank')} />
                ]
              } else {
                return <img src={AkraneLogo} onClick={() => window.open(getSyncLinks(), '_blank')} />
              }
            }}
          </MediaQuery>
        </div>,
      ];
    }

    return (
      <div
        className={classnames('header__dialog', {
          'header__dialog--disconnected': !isConnected && initialized,
        })}
      >
        {content}

      </div>
    );
  }
}

class Header extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="header">
        <BlockingWarning {...this.props} />
        <div
          className={classnames('header__top', {
            'header--inactive': !this.props.isConnected,
          })}
        >
          <div className="header__center-group">
            <span className="header__title">VEXCHANGE</span>
          </div>
          <Status isConnected />
        </div>
      </div>
    );
  }
}

Header.propTypes = {
  provider: PropTypes.string,
  currentAddress: PropTypes.string,
  isConnected: PropTypes.bool.isRequired,
};

export default connect(
  state => ({
    currentAddress: state.connexConnect.account,
    initialized: state.connexConnect.initialized,
    isConnected: !!state.connexConnect.account,
    connex: state.connexConnect.connex,
    networkId: state.connexConnect.networkId,
  }),
)(Header);
