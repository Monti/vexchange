import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import classnames from 'classnames';
import Web3 from 'web3';
import { Menu, Dropdown, Icon, Button } from 'antd';
import { updateWallet, startWatching, initialize } from '../../ducks/web3connect';
import { CSSTransitionGroup } from "react-transition-group";
import { withNamespaces } from 'react-i18next';
import { isEqual } from 'lodash';
import { picasso } from '@vechain/picasso'
import './web3-status.scss';

import Modal from '../Modal';

function getVeforgeLink(tx) {
  return `https://explore.veforge.com/transactions/${tx}`;
}

class Web3Status extends Component {
  constructor(props) {
    super(props);

    this.state = {
      wallets: props.wallets,
      isShowingModal: false,
    };

    this.switchToArkane = this.switchToArkane.bind(this);
    this.switchToComet = this.switchToComet.bind(this);
    this.renderMenu = this.renderMenu.bind(this);
    this.setCurrentProvider = this.setCurrentProvider.bind(this);
  }

  componentDidMount() {
    this.setCurrentProvider();
  }

  componentWillReceiveProps({ wallets, ...rest }) {
    if (!isEqual(this.props.wallets, wallets)) {
      this.setState({ wallets });
    }
  }

  setCurrentProvider() {
    this.setState({ currentProvider: 'arkane' });
  }

  handleClick = () => {
    if (this.props.pending.length && !this.state.isShowingModal) {
      this.setState({isShowingModal: true});
    }
  };

  handleMenuItemClick = wallet => {
    const { updateWallet } = this.props;
    updateWallet(wallet);
  }

  manageWallets = () => {
    window.arkaneConnect.manageWallets('VECHAIN');
  }

  switchToComet() {
    window.location.href('https://vexchange.io');
  }

  switchToArkane() {
    window.arkaneConnect.authenticate();
  }

  logout = () => {
    window.arkaneConnect.logout();
  }

  renderPendingTransactions() {
    return this.props.pending.map((transaction) => {
      return (
        <>
          <div
            key={transaction}
            className={classnames('pending-modal__transaction-row')}
            onClick={() => window.open(getVeforgeLink(transaction), '_blank')}
          >
            <div className="pending-modal__transaction-label">
              {transaction}
            </div>
            <div className="pending-modal__pending-indicator">
              <div className="loader" /> {this.props.t("pending")}
            </div>
          </div>
        </>
      );
    });
  }

  renderMenu() {
    const { wallets = [] } = this.props;
    return (
      <Menu>
        { wallets.map(wallet => (
          <Menu.Item key={wallet.id} onClick={() => this.handleMenuItemClick(wallet)}>
            { wallet.description }
          </Menu.Item>
        ))}
        <Menu.Divider />
        <Menu.Item key="manage" onClick={this.manageWallets}>
          Manage Wallets
        </Menu.Item>
        <Menu.Item key="logout" onClick={this.logout}>
          Log out of Arkane
        </Menu.Item>
      </Menu>
    );
  }

  renderModal() {
    if (!this.state.isShowingModal) {
      return null;
    }

    return (
      <Modal onClose={() => this.setState({ isShowingModal: false })}>
        <CSSTransitionGroup
          transitionName="token-modal"
          transitionAppear={true}
          transitionLeave={true}
          transitionAppearTimeout={200}
          transitionLeaveTimeout={200}
          transitionEnterTimeout={200}
        >
          <div className="pending-modal">
            <div className="pending-modal__transaction-list">
              <div className="pending-modal__header">Transactions</div>
              {this.renderPendingTransactions()}
            </div>
          </div>
        </CSSTransitionGroup>
      </Modal>
    );
  }

  render() {
    const { t, address, pending, confirmed, wallets = [], wallet } = this.props;
    const { currentProvider } = this.state;
    const hasPendingTransactions = !!pending.length;
    const hasConfirmedTransactions = !!confirmed.length;

    const svg = picasso(address);

    return (
      <Dropdown
        placement="bottomLeft"
        trigger={['click']}
        overlay={ this.renderMenu }>

        <Button type={ hasPendingTransactions ? 'primary' : ''}>
          <div className={classnames("web3-status", {
            'web3-status__connected': this.props.isConnected,
            'web3-status--confirmed': hasConfirmedTransactions,
          })}
          onClick={this.handleClick}
          >
            <div className="web3-status__text">
              { hasPendingTransactions ?
                  getPendingText(pending, t("pending")) : 
                  (wallet || {}).description ||
                  getText(address, t("disconnected")) 
              }
            </div>
            <div
              className="web3-status__identicon"
              style={{ background: `no-repeat url('data:image/svg+xml;utf8,${svg}')` }}
            />
            {this.renderModal()}
          </div>

        </Button>
        
      </Dropdown>
    );
  }
}

function getPendingText(pendingTransactions, pendingLabel) {
  return (
    <div className="web3-status__pending-container">
      <div className="loader" />
      <span key="text">{pendingTransactions.length} {pendingLabel}</span>
    </div>
  );
}

function getText(text, disconnectedText) {
  if (!text || text.length < 42 || !Web3.utils.isHexStrict(text)) {
    return disconnectedText;
  }

  const address = Web3.utils.toChecksumAddress(text);
  return `${address.substring(0, 6)}...${address.substring(38)}`;
}

Web3Status.propTypes = {
  isConnected: PropTypes.bool,
  wallets: PropTypes.array,
  address: PropTypes.string,
};

Web3Status.defaultProps = {
  isConnected: false,
  address: 'Disconnected',
};

export default connect(
  state => ({
    wallet: state.web3connect.wallet,
    wallets: state.web3connect.wallets,
    address: state.web3connect.account,
    isConnected: !!(state.web3connect.web3 && state.web3connect.account),
    pending: state.web3connect.transactions.pending,
    confirmed: state.web3connect.transactions.confirmed,
    provider: state.web3connect.provider
  }),
  dispatch => ({
    updateWallet: wallet => dispatch(updateWallet(wallet)),
    initialize: (initializeArkane) => dispatch(initialize(initializeArkane)),
    startWatching: () => dispatch(startWatching()),
  }),
)(withNamespaces()(Web3Status));
