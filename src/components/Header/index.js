import React, { Component } from 'react';
import MediaQuery from 'react-responsive';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classnames from 'classnames';
import { Button } from 'antd';
import CometLogo from '../../assets/images/comet.png';
import AkraneLogo from '../../assets/images/arkane.svg';
import Web3Status from '../Web3Status';

import "./header.scss";

const links = {
  comet: {
    chrome: 'https://www.cometpowered.com/',
  },
  arkane: {
    chrome: 'https://www.arkane.network',
  },
};

function getArkaneLinks() {
  return links.arkane.chrome;
}

class BlockingWarning extends Component {
  constructor() {
    super();

    this.connectArkane = this.connectArkane.bind(this);
  }

  connectArkane() {
    window.arkaneConnect.authenticate();
  }

  render () {
    const {
      isConnected,
      initialized,
      networkId,
      wallets = [],
    } = this.props;

    let content = [];

    const correctNetworkId = process.env.REACT_APP_NETWORK_ID || 74;
    const correctNetwork = process.env.REACT_APP_NETWORK || 'Main VeChain Network';

    const wrongNetwork = +networkId !== +correctNetworkId;

    if (wrongNetwork && initialized) {
      content = [
        <div key="warning-title">You are on the wrong network</div>,
        <div key="warning-desc" className="header__dialog__description">
          {`Please switch to ${correctNetwork}`}
        </div>,
      ];
    }

    if (!isConnected && initialized) {
      content = [
        <div key="warning-title">No Vechain wallet found</div>,
        <div key="warning-desc" className="header__dialog__description">
          <MediaQuery query="(min-width: 768px)">
            {(matches) => {
              if (matches) {
                return 'Please visit us after installing Arkane Network.';
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
                  <img src={AkraneLogo} key="arkane" onClick={() => window.open(getArkaneLinks(), '_blank')} />
                ]
              } else {
                return <img src={AkraneLogo} onClick={() => window.open(getArkaneLinks(), '_blank')} />
              }
            }}
          </MediaQuery>
        </div>,
      ];
    }

    return (
      <div
        className={classnames('header__dialog', {
          'header__dialog--disconnected': (!isConnected || wrongNetwork) && initialized,
        })}
      >
        {content}

        { window.arkaneConnect &&
          <div className="header__footer">
            <div className="header__dialog__description">
              You have no linked Arkane wallet
            </div>
            { (wallets.length === 0) &&
              <div className="header__authenticate-buttons">
                <Button size="small" onClick={this.connectArkane}>Connect Arkane Account</Button>
              </div>
            }
          </div>
        }
      </div>
    );
  }
}

class Header extends Component {
  constructor(props) {
    super(props);

    this.state = {
      wallets: [],
      arkaneConnect: {},
    };
  }

  render() {
    const { wallets } = this.props;

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
          <Web3Status isConnected />
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
    currentAddress: state.web3connect.account,
    initialized: state.web3connect.initialized,
    isConnected: !!state.web3connect.account,
    web3: state.web3connect.web3,
    provider: state.web3connect.provider,
    networkId: state.web3connect.networkId,
    wallets: state.web3connect.wallets,
  }),
)(Header);
