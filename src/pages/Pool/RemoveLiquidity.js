import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from "classnames";
import { connect } from 'react-redux';
import _ from 'lodash';
import { BigNumber as BN } from 'bignumber.js';
import { withNamespaces } from 'react-i18next';
import NavigationTabs from "../../components/NavigationTabs";
import ModeSelector from "./ModeSelector";
import CurrencyInputPanel from "../../components/CurrencyInputPanel";
import { selectors, addPendingTx } from '../../ducks/connexConnect';
import ContextualInfo from "../../components/ContextualInfo";
import OversizedPanel from "../../components/OversizedPanel";
import ArrowDownBlue from "../../assets/images/arrow-down-blue.svg";
import ArrowDownGrey from "../../assets/images/arrow-down-grey.svg";
import { getBlockDeadline } from '../../helpers/web3-utils';
import { retry } from '../../helpers/promise-utils';
import EXCHANGE_ABI from "../../abi/exchange";

class RemoveLiquidity extends Component {
  static propTypes = {
    account: PropTypes.string,
    balances: PropTypes.object,
    connex: PropTypes.object,
    exchangeAddresses: PropTypes.shape({
      fromToken: PropTypes.object.isRequired,
    }).isRequired,
  };

  state = {
    tokenAddress: '',
    value: '',
    totalSupply: BN(0),
  };

  reset() {
    this.setState({
      value: '',
    });
  }

  validate() {
    const { tokenAddress, value } = this.state;
    const { t, account, selectors, exchangeAddresses: { fromToken } } = this.props;
    const exchangeAddress = fromToken[tokenAddress];

    if (!exchangeAddress || !account || !value) {
      return {
        isValid: false,
      };
    }

    const { getBalance } = selectors();

    const { value: liquidityBalance, decimals: liquidityDecimals } = getBalance(account, exchangeAddress);

    if (liquidityBalance.isLessThan(BN(value).multipliedBy(10 ** liquidityDecimals))) {
      return { isValid: false, errorMessage: t("insufficientBalance") };
    }

    return {
      isValid: true,
    };
  }

  onTokenSelect = async tokenAddress => {
    const { exchangeAddresses: { fromToken }, connex } = this.props;
    const exchangeAddress = fromToken[tokenAddress];
    this.setState({ tokenAddress });

    if (!exchangeAddress) {
      return;
    }

    const totalSupplyABI = _.find(EXCHANGE_ABI, { name: 'totalSupplyABI' });
    const totalSupply = connex.thor.account(exchangeAddress).method(totalSupplyABI);
    const getTotalSupply = await totalSupply.call();

    this.setState({
      totalSupply: BN(getTotalSupply),
    });
  };

  onInputChange = value => {
    this.setState({ value });
  };

  onRemoveLiquidity = async () => {
    const { tokenAddress, value: input, totalSupply } = this.state;
    const {
      exchangeAddresses: { fromToken },
      connex,
      selectors,
      account,
    } = this.props;
    const exchangeAddress = fromToken[tokenAddress];
    const { getBalance } = selectors();
    if (!exchangeAddress) {
      return;
    }
    const signingService = connex.vendor.sign('tx')

    const SLIPPAGE = .25;
    const { decimals } = getBalance(account, exchangeAddress);
    const { value: ethReserve } = getBalance(exchangeAddress);
    const { value: tokenReserve } = getBalance(exchangeAddress, tokenAddress);
    const amount = BN(input).multipliedBy(10 ** decimals);

    const ownership = amount.dividedBy(totalSupply);
    const ethWithdrawn = ethReserve.multipliedBy(ownership);
    const tokenWithdrawn = tokenReserve.multipliedBy(ownership);
    let deadline;
    try {
      deadline = await retry(() => getBlockDeadline(connex, 300));
    } catch(e) {
      // TODO: Handle error.
      return;
    }

    const removeLiquidityABI = _.find(EXCHANGE_ABI, { name: 'removeLiquidityABI' });
    const removeLiquidity = connex.thor.account(exchangeAddress).method(removeLiquidityABI);

    signingService.request([
      removeLiquidity.asClause(
        amount.toFixed(0),
        ethWithdrawn.multipliedBy(1 - SLIPPAGE).toFixed(0),
        tokenWithdrawn.multipliedBy(1 - SLIPPAGE).toFixed(0),
        deadline,
      )
    ]).then(({ txid }) => {
      addPendingTx(txid);
      this.reset();
    }).catch(error => {
      console.log(error);
    });
  };

  getBalance = () => {
    const {
      exchangeAddresses: { fromToken },
      account,
      connex,
      selectors,
    } = this.props;

    const { tokenAddress } = this.state;

    if (!connex) {
      return '';
    }

    const exchangeAddress = fromToken[tokenAddress];
    if (!exchangeAddress) {
      return '';
    }
    const { value, decimals } = selectors().getBalance(account, exchangeAddress);
    if (!decimals) {
      return '';
    }

    return `Balance: ${value.dividedBy(10 ** decimals).toFixed(7)}`;
  };

  renderSummary(errorMessage) {
    const { t, selectors, exchangeAddresses: { fromToken } } = this.props;
    const {
      value: input,
      tokenAddress,
    } = this.state;
    const inputIsZero = BN(input).isZero();
    let contextualInfo = '';
    let isError = false;

    if (errorMessage) {
      contextualInfo = errorMessage;
      isError = true;
    } else if (!tokenAddress) {
      contextualInfo = t("selectTokenCont");
    } else if (inputIsZero) {
      contextualInfo = t("noZero");
    } else if (!input) {
      const { label } = selectors().getTokenBalance(tokenAddress, fromToken[tokenAddress]);
      contextualInfo = t("enterLabelCont", { label });
    }

    return (
      <ContextualInfo
        key="context-info"
        openDetailsText={t("transactionDetails")}
        closeDetailsText={t("hideDetails")}
        contextualInfo={contextualInfo}
        isError={isError}
        renderTransactionDetails={this.renderTransactionDetails}
      />
    );
  }

  renderTransactionDetails = () => {
    const { tokenAddress, value: input, totalSupply } = this.state;
    const {
      t,
      exchangeAddresses: { fromToken },
      connex,
      selectors,
      account,
    } = this.props;
    const exchangeAddress = fromToken[tokenAddress];
    const { getBalance } = selectors();

    if (!exchangeAddress) {
      return null;
    }

    const SLIPPAGE = 0.025;
    const { value: liquidityBalance, decimals } = getBalance(account, exchangeAddress);
    const { value: ethReserve } = getBalance(exchangeAddress);
    const { value: tokenReserve, label, decimals: reserveDecimals } = getBalance(exchangeAddress, tokenAddress);

    const ethPer = ethReserve.dividedBy(totalSupply);
    const tokenPer = tokenReserve.dividedBy(totalSupply);

    const ethWithdrawn = ethPer.multipliedBy(input);

    const tokenWithdrawn = tokenPer.multipliedBy(input);
    const minTokenWithdrawn = tokenWithdrawn.multipliedBy(1 - SLIPPAGE).toFixed(7);
    const maxTokenWithdrawn = tokenWithdrawn.multipliedBy(1 + SLIPPAGE).toFixed(7);

    const adjTotalSupply = totalSupply.dividedBy(10 ** decimals).minus(input);

    return (
      <div>
        <div className="pool__summary-modal__item">{t("youAreRemoving")} {b(`${+BN(ethWithdrawn).toFixed(7)} VET`)} {t("and")} {b(`${+minTokenWithdrawn} - ${+maxTokenWithdrawn} ${label}`)} {t("outPool")}</div>
        <div className="pool__summary-modal__item">{t("youWillRemove")} {b(+input)} {t("liquidityTokens")}</div>
        <div className="pool__summary-modal__item">{t("totalSupplyIs")} {b(+adjTotalSupply.toFixed(7))}</div>
        <div className="pool__summary-modal__item">{t("tokenWorth")} {b(+ethReserve.dividedBy(totalSupply).toFixed(7))} VET {t("and")} {b(+tokenReserve.dividedBy(totalSupply).toFixed(7))} {label}</div>
      </div>
    );
  }

  renderOutput() {
    const {
      t,
      exchangeAddresses: { fromToken },
      account,
      connex,
      selectors,
    } = this.props;
    const { getBalance } = selectors();

    const { tokenAddress, totalSupply, value: input } = this.state;

    const blank = [
      <CurrencyInputPanel
        key="remove-liquidity-input"
        title={t("output")}
        description={`(${t("estimated")})`}
        renderInput={() => (
          <div className="remove-liquidity__output"></div>
        )}
        disableTokenSelect
        disableUnlock
      />,
      <OversizedPanel key="remove-liquidity-input-under" hideBottom>
        <div className="pool__summary-panel">
          <div className="pool__exchange-rate-wrapper">
            <span className="pool__exchange-rate">{t("exchangeRate")}</span>
            <span> - </span>
          </div>
          <div className="pool__exchange-rate-wrapper">
            <span className="swap__exchange-rate">{t("currentPoolSize")}</span>
            <span> - </span>
          </div>
          <div className="pool__exchange-rate-wrapper">
            <span className="swap__exchange-rate">{t("yourPoolShare")}</span>
            <span> - </span>
          </div>
        </div>
      </OversizedPanel>
    ];

    const exchangeAddress = fromToken[tokenAddress];
    if (!exchangeAddress || !connex) {
      return blank;
    }

    const { value: liquidityBalance } = getBalance(account, exchangeAddress);
    const { value: ethReserve } = getBalance(exchangeAddress);
    const { value: tokenReserve, decimals: tokenDecimals, label } = getBalance(exchangeAddress, tokenAddress);

    if (!tokenDecimals) {
      return blank;
    }

    const ownership = liquidityBalance.dividedBy(totalSupply);
    const ethPer = ethReserve.dividedBy(totalSupply);
    const tokenPer = tokenReserve.multipliedBy(10 ** (18 - tokenDecimals)).dividedBy(totalSupply);
    const exchangeRate = tokenReserve.multipliedBy(10 ** (18 - tokenDecimals)).div(ethReserve);

    const ownedEth = ethPer.multipliedBy(liquidityBalance).dividedBy(10 ** 18);
    const ownedToken = tokenPer.multipliedBy(liquidityBalance).dividedBy(10 ** tokenDecimals);

    return [
      <CurrencyInputPanel
        title={t("output")}
        description={`(${t("estimated")})`}
        key="remove-liquidity-input"
        renderInput={() => input
          ? (
            <div className="remove-liquidity__output">
              <div className="remove-liquidity__output-text">
                {`${ethPer.multipliedBy(input).toFixed(3)} VET`}
              </div>
              <div className="remove-liquidity__output-plus"> + </div>
              <div className="remove-liquidity__output-text">
                {`${tokenPer.multipliedBy(input).toFixed(3)} ${label}`}
              </div>
            </div>
          )
          : <div className="remove-liquidity__output" />
        }
        disableTokenSelect
        disableUnlock
      />,
      <OversizedPanel key="remove-liquidity-input-under" hideBottom>
        <div className="pool__summary-panel">
          <div className="pool__exchange-rate-wrapper">
            <span className="pool__exchange-rate">{t("exchangeRate")}</span>
            <span>
              {`1 VET = ${exchangeRate.toFixed(4)} ${label}`}
            </span>
          </div>
          <div className="pool__exchange-rate-wrapper">
            <span className="swap__exchange-rate">{t("currentPoolSize")}</span>
            <span>{`${ethReserve.dividedBy(10 ** 18).toFixed(2)} VET + ${tokenReserve.dividedBy(10 ** tokenDecimals).toFixed(2)} ${label}`}</span>
          </div>
          <div className="pool__exchange-rate-wrapper">
            <span className="swap__exchange-rate">
              {t("yourPoolShare")} ({ownership.multipliedBy(100).toFixed(2)}%)
            </span>
            <span>{`${ownedEth.toFixed(2)} VET + ${ownedToken.toFixed(2)} ${label}`}</span>
          </div>
        </div>
      </OversizedPanel>
    ];
  }

  render() {
    const { t, isConnected } = this.props;
    const { tokenAddress, value } = this.state;
    const { isValid, errorMessage } = this.validate();

    return [
      <div
        key="content"
        className={classnames('swap__content', {
          'swap--inactive': !isConnected,
        })}
      >
        <NavigationTabs
          className={classnames('header__navigation', {
            'header--inactive': !isConnected,
          })}
        />
        <ModeSelector title={t("removeLiquidity")} />
        <CurrencyInputPanel
          title={t("poolTokens")}
          extraText={this.getBalance(tokenAddress)}
          onValueChange={this.onInputChange}
          value={value}
          errorMessage={errorMessage}
          selectedTokenAddress={tokenAddress}
          onCurrencySelected={this.onTokenSelect}
          filteredTokens={['VET']}
        />
        <OversizedPanel>
          <div className="swap__down-arrow-background">
            <img className="swap__down-arrow" src={isValid ? ArrowDownBlue : ArrowDownGrey} />
          </div>
        </OversizedPanel>
        { this.renderOutput() }
        { this.renderSummary(errorMessage) }
        <div className="pool__cta-container">
          <button
            className={classnames('pool__cta-btn', {
              'swap--inactive': !isConnected,
              'pool__cta-btn--inactive': !isValid,
            })}
            disabled={!isValid}
            onClick={this.onRemoveLiquidity}
          >
            {t("removeLiquidity")}
          </button>
        </div>
      </div>
    ];
  }
}

export default connect(
  state => ({
    isConnected: !!state.connexConnect.account,
    connex: state.connexConnect.connex,
    balances: state.connexConnect.balances,
    account: state.connexConnect.account,
    exchangeAddresses: state.addresses.exchangeAddresses,
  }),
  dispatch => ({
    selectors: () => dispatch(selectors()),
    addPendingTx: id => dispatch(addPendingTx(id)),
  })
)(withNamespaces()(RemoveLiquidity));

function b(text) {
  return <span className="swap__highlight-text">{text}</span>
}
