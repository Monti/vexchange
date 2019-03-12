import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import {BigNumber as BN} from "bignumber.js";
import { withNamespaces } from 'react-i18next';
import { isAddress } from 'web3-utils';
import _ from 'lodash';
import { selectors, addPendingTx } from '../../ducks/connexConnect';
import Header from '../../components/Header';
import NavigationTabs from '../../components/NavigationTabs';
import AddressInputPanel from '../../components/AddressInputPanel';
import CurrencyInputPanel from '../../components/CurrencyInputPanel';
import ContextualInfo from '../../components/ContextualInfo';
import OversizedPanel from '../../components/OversizedPanel';
import ArrowDownBlue from '../../assets/images/arrow-down-blue.svg';
import ArrowDownGrey from '../../assets/images/arrow-down-grey.svg';
import { getBlockDeadline } from '../../helpers/web3-utils';
import { retry } from '../../helpers/promise-utils';
import EXCHANGE_ABI from '../../abi/exchange';
import { Alert } from 'antd';

import "./send.scss";
import MediaQuery from "react-responsive";

const INPUT = 0;
const OUTPUT = 1;

class Send extends Component {
  static propTypes = {
    account: PropTypes.string,
    isConnected: PropTypes.bool.isRequired,
    selectors: PropTypes.func.isRequired,
    connex: PropTypes.object,
  };

  state = {
    inputValue: '',
    outputValue: '',
    inputCurrency: 'VET',
    outputCurrency: '',
    inputAmountB: '',
    lastEditedField: '',
    recipient: '',
    exchangeFee: 0,
  };

  shouldComponentUpdate(nextProps, nextState) {
    return true;
  }

  reset() {
    this.setState({
      inputValue: '',
      outputValue: '',
      inputAmountB: '',
      lastEditedField: '',
      recipient: '',
    });
  }

  componentWillReceiveProps() {
    this.recalcForm();
  }

  validate() {
    const { selectors, account, connex } = this.props;
    const {
      inputValue, outputValue,
      inputCurrency, outputCurrency,
      recipient,
    } = this.state;

    let inputError = '';
    let outputError = '';
    let isValid = true;
    let extraFee = false;
    const validRecipientAddress = isAddress(recipient);
    const inputIsZero = BN(inputValue).isZero();
    const outputIsZero = BN(outputValue).isZero();

    if ((inputCurrency && inputCurrency !== 'VET') && (outputCurrency && outputCurrency !== 'VET')) {
      extraFee = true;
    }

    if (!inputValue || inputIsZero || !outputValue || outputIsZero || !inputCurrency || !outputCurrency || !recipient || this.isUnapproved() || !validRecipientAddress) {
      isValid = false;
    }

    const { value: inputBalance, decimals: inputDecimals } = selectors().getBalance(account, inputCurrency);

    if (inputBalance.isLessThan(BN(inputValue * 10 ** inputDecimals))) {
      inputError = this.props.t("insufficientBalance");
    }

    if (inputValue === 'N/A') {
      inputError = this.props.t("inputNotValid");
    }

    return {
      extraFee,
      inputError,
      outputError,
      isValid: isValid && !inputError && !outputError,
    };
  }

  flipInputOutput = () => {
    const { state } = this;
    this.setState({
      inputValue: state.outputValue,
      outputValue: state.inputValue,
      inputCurrency: state.outputCurrency,
      outputCurrency: state.inputCurrency,
      lastEditedField: state.lastEditedField === INPUT ? OUTPUT : INPUT
    }, () => this.recalcForm());
  }

  isUnapproved() {
    const { account, exchangeAddresses, selectors } = this.props;
    const { inputCurrency, inputValue } = this.state;

    if (!inputCurrency || inputCurrency === 'VET') {
      return false;
    }

    const { value: allowance, label, decimals } = selectors().getApprovals(
      inputCurrency,
      account,
      exchangeAddresses.fromToken[inputCurrency]
    );

    if (label && allowance.isLessThan(BN(inputValue * 10 ** decimals || 0))) {
      return true;
    }

    return false;
  }

  recalcForm = () => {
    const { inputCurrency, outputCurrency, lastEditedField } = this.state;

    if (!inputCurrency || !outputCurrency) {
      return;
    }

    const editedValue = lastEditedField === INPUT ? this.state.inputValue : this.state.outputValue;

    if (BN(editedValue).isZero()) {
      return;
    }

    if (inputCurrency === outputCurrency) {
      this.setState({
        inputValue: '',
        outputValue: '',
      });
      return;
    }

    if (inputCurrency !== 'VET' && outputCurrency !== 'VET') {
      this.recalcTokenTokenForm();
      return;
    }

    this.recalcEthTokenForm();
  }

  recalcTokenTokenForm = async () => {
    const {
      exchangeAddresses: { fromToken },
      selectors,
      web3,
    } = this.props;

    const {
      inputValue: oldInputValue,
      outputValue: oldOutputValue,
      inputCurrency,
      outputCurrency,
      lastEditedField,
      exchangeRate: oldExchangeRate,
      inputAmountB: oldInputAmountB,
    } = this.state;

    const exchangeAddressA = fromToken[inputCurrency];
    const exchangeAddressB = fromToken[outputCurrency];

    const exchangeA = new web3.eth.Contract(EXCHANGE_ABI, exchangeAddressA);
    const exchangeB = new web3.eth.Contract(EXCHANGE_ABI, exchangeAddressB);
    const exchangeFeeA = await exchangeA.methods.swap_fee().call();
    const exchangeFeeB = await exchangeB.methods.swap_fee().call();

    const exchangeFee = (Number(exchangeFeeA) + Number(exchangeFeeB)) / 2; // Average fee between both markets

    const { value: inputReserveA, decimals: inputDecimalsA } = selectors().getBalance(exchangeAddressA, inputCurrency);
    const { value: outputReserveA }= selectors().getBalance(exchangeAddressA, 'VET');
    const { value: inputReserveB } = selectors().getBalance(exchangeAddressB, 'VET');
    const { value: outputReserveB, decimals: outputDecimalsB }= selectors().getBalance(exchangeAddressB, outputCurrency);

    if (lastEditedField === INPUT) {
      if (!oldInputValue) {
        return this.setState({
          outputValue: '',
          exchangeRate: BN(0),
        });
      }

      const inputAmountA = BN(oldInputValue).multipliedBy(10 ** inputDecimalsA);
      const outputAmountA = calculateEtherTokenOutput({
        inputAmount: inputAmountA,
        inputReserve: inputReserveA,
        outputReserve: outputReserveA,
        exchangeFee,
      });
      // Redundant Variable for readability of the formala
      // OutputAmount from the first send becomes InputAmount of the second send
      const inputAmountB = outputAmountA;
      const outputAmountB = calculateEtherTokenOutput({
        inputAmount: inputAmountB,
        inputReserve: inputReserveB,
        outputReserve: outputReserveB,
        exchangeFee,
      });

      const outputValue = outputAmountB.dividedBy(BN(10 ** outputDecimalsB)).toFixed(7);
      const exchangeRate = BN(outputValue).dividedBy(BN(oldInputValue));

      const appendState = {};

      if (!exchangeRate.isEqualTo(BN(oldExchangeRate))) {
        appendState.exchangeRate = exchangeRate;
      }

      if (outputValue !== oldOutputValue) {
        appendState.outputValue = outputValue;
      }

      this.setState(appendState);
    }

    if (lastEditedField === OUTPUT) {
      if (!oldOutputValue) {
        return this.setState({
          inputValue: '',
          exchangeRate: BN(0),
        });
      }

      const outputAmountB = BN(oldOutputValue).multipliedBy(10 ** outputDecimalsB);
      const inputAmountB = calculateEtherTokenInput({
        outputAmount: outputAmountB,
        inputReserve: inputReserveB,
        outputReserve: outputReserveB,
      });

      // Redundant Variable for readability of the formala
      // InputAmount from the first send becomes OutputAmount of the second send
      const outputAmountA = inputAmountB;
      const inputAmountA = calculateEtherTokenInput({
        outputAmount: outputAmountA,
        inputReserve: inputReserveA,
        outputReserve: outputReserveA,
      });

      const inputValue = inputAmountA.isNegative()
        ? 'N/A'
        : inputAmountA.dividedBy(BN(10 ** inputDecimalsA)).toFixed(7);
      const exchangeRate = BN(oldOutputValue).dividedBy(BN(inputValue));

      const appendState = {};

      if (!exchangeRate.isEqualTo(BN(oldExchangeRate))) {
        appendState.exchangeRate = exchangeRate;
      }

      if (inputValue !== oldInputValue) {
        appendState.inputValue = inputValue;
      }

      if (!inputAmountB.isEqualTo(BN(oldInputAmountB))) {
        appendState.inputAmountB = inputAmountB;
      }

      this.setState(appendState);
    }

  };

  recalcEthTokenForm = async () => {
    const {
      exchangeAddresses: { fromToken },
      selectors,
      web3,
    } = this.props;

    const {
      inputValue: oldInputValue,
      outputValue: oldOutputValue,
      inputCurrency,
      outputCurrency,
      lastEditedField,
      exchangeRate: oldExchangeRate,
    } = this.state;

    const tokenAddress = [inputCurrency, outputCurrency].filter(currency => currency !== 'VET')[0];
    const exchangeAddress = fromToken[tokenAddress];
    if (!exchangeAddress) {
      return;
    }
    const { value: inputReserve, decimals: inputDecimals } = selectors().getBalance(exchangeAddress, inputCurrency);
    const { value: outputReserve, decimals: outputDecimals }= selectors().getBalance(exchangeAddress, outputCurrency);

    const exchange = new web3.eth.Contract(EXCHANGE_ABI, exchangeAddress);
    let exchangeFee = await exchange.methods.swap_fee().call();
    exchangeFee = Number(exchangeFee);

    if (lastEditedField === INPUT) {
      if (!oldInputValue) {
        return this.setState({
          outputValue: '',
          exchangeRate: BN(0),
        });
      }

      const inputAmount = BN(oldInputValue).multipliedBy(10 ** inputDecimals);
      const outputAmount = calculateEtherTokenOutput({ inputAmount, inputReserve, outputReserve });
      const outputValue = outputAmount.dividedBy(BN(10 ** outputDecimals)).toFixed(7);
      const exchangeRate = BN(outputValue).dividedBy(BN(oldInputValue));

      const appendState = {};

      if (!exchangeRate.isEqualTo(BN(oldExchangeRate))) {
        appendState.exchangeRate = exchangeRate;
      }

      if (outputValue !== oldOutputValue) {
        appendState.outputValue = outputValue;
      }

      this.setState(appendState);
    } else if (lastEditedField === OUTPUT) {
      if (!oldOutputValue) {
        return this.setState({
          inputValue: '',
          exchangeRate: BN(0),
        });
      }

      const outputAmount = BN(oldOutputValue).multipliedBy(10 ** outputDecimals);
      const inputAmount = calculateEtherTokenInput({ outputAmount, inputReserve, outputReserve, exchangeFee });
      const inputValue = inputAmount.isNegative()
        ? 'N/A'
        : inputAmount.dividedBy(BN(10 ** inputDecimals)).toFixed(7);
      const exchangeRate = BN(oldOutputValue).dividedBy(BN(inputValue));

      const appendState = {};

      if (!exchangeRate.isEqualTo(BN(oldExchangeRate))) {
        appendState.exchangeRate = exchangeRate;
      }

      if (inputValue !== oldInputValue) {
        appendState.inputValue = inputValue;
      }

      this.setState(appendState);
    }
  };

  updateInput = amount => {
    this.setState({
      inputValue: amount,
      lastEditedField: INPUT,
    }, this.recalcForm);
  };

  updateOutput = amount => {
    this.setState({
      outputValue: amount,
      lastEditedField: OUTPUT,
    }, this.recalcForm);
  };

  onSend = async () => {
    const {
      exchangeAddresses: { fromToken },
      account,
      connex,
      selectors,
      addPendingTx,
    } = this.props;
    const {
      inputValue,
      outputValue,
      inputCurrency,
      outputCurrency,
      inputAmountB,
      lastEditedField,
      recipient,
    } = this.state;
    const ALLOWED_SLIPPAGE = 0.025;
    const TOKEN_ALLOWED_SLIPPAGE = 0.04;
    const signingService = connex.vendor.sign('tx')

    const type = getSendType(inputCurrency, outputCurrency);
    const { decimals: inputDecimals } = selectors().getBalance(account, inputCurrency);
    const { decimals: outputDecimals } = selectors().getBalance(account, outputCurrency);
    let deadline;

    try {
      deadline = await retry(() => getBlockDeadline(connex, 300));
    } catch(e) {
      return;
    }

    if (lastEditedField === INPUT) {
      // send input
      switch(type) {
        case 'ETH_TO_TOKEN':
          const ethToTokenTransferInputABI = _.find(EXCHANGE_ABI, { name: 'ethToTokenTransferInput' });
          const ethToTokenTransferInput = connex.thor.account(fromToken[outputCurrency]).method(ethToTokenTransferInputABI);

          ethToTokenTransferInput.value(BN(inputValue).multipliedBy(10 ** 18).toFixed(0));

          signingService.request([
            ethToTokenTransferInput.asClause(
              BN(outputValue).multipliedBy(10 ** outputDecimals).multipliedBy(1 - ALLOWED_SLIPPAGE).toFixed(0),
              deadline,
              recipient,
            )
          ]).then(data => {
            addPendingTx(data.txid);
            this.reset();
          }).catch(error => {
            console.log(error);
          });
        break;
        case 'TOKEN_TO_ETH':
          const tokenToEthTransferInputABI = _.find(EXCHANGE_ABI, { name: 'tokenToEthTransferInput' });
          const tokenToEthTransferInput = connex.thor.account(fromToken[inputCurrency]).method(tokenToEthTransferInputABI);

          signingService.request([
            tokenToEthTransferInput.asClause(
              BN(inputValue).multipliedBy(10 ** inputDecimals).toFixed(0),
              BN(outputValue).multipliedBy(10 ** outputDecimals).multipliedBy(1 - ALLOWED_SLIPPAGE).toFixed(0),
              deadline,
              recipient,
            )
          ]).then(data => {
            console.log(data)
            addPendingTx(data);
            this.reset();
          }).catch(error => {
            console.log(error);
          });

        break;
        case 'TOKEN_TO_TOKEN':
          const tokenToTokenTransferInputABI = _.find(EXCHANGE_ABI, { name: 'tokenToTokenTransferInput' });
          const tokenToTokenTransferInput = connex.thor.account(fromToken[inputCurrency]).method(tokenToTokenTransferInputABI);

          signingService.request([
            tokenToTokenTransferInput.asClause(
              BN(inputValue).multipliedBy(10 ** inputDecimals).toFixed(0),
              BN(outputValue).multipliedBy(10 ** outputDecimals).multipliedBy(1 - TOKEN_ALLOWED_SLIPPAGE).toFixed(0),
              '1',
              deadline,
              recipient,
              outputCurrency,
            )
          ]).then(data => {
            addPendingTx(data);
            this.reset();
          }).catch(error => {
            console.log(error);
          });
        break;
        default:
          break;
      }
    }

    if (lastEditedField === OUTPUT) {
      // send output
      switch (type) {
        case 'ETH_TO_TOKEN':
          const ethToTokenTransferOutputABI = _.find(EXCHANGE_ABI, { name: 'ethToTokenTransferOutput' });
          const ethToTokenTransferOutput = connex.thor.account(fromToken[outputCurrency]).method(ethToTokenTransferOutputABI);

          ethToTokenTransferOutput.value(BN(inputValue).multipliedBy(10 ** inputDecimals).multipliedBy(1 + ALLOWED_SLIPPAGE).toFixed(0));

          signingService.request([
            ethToTokenTransferOutput.asClause(
              BN(outputValue).multipliedBy(10 ** outputDecimals).toFixed(0),
              deadline,
              recipient,
            )
          ]).then(data => {
            addPendingTx(data);
            this.reset();
          }).catch(error => {
            console.log(error);
          });
        break;
        case 'TOKEN_TO_ETH':
          const tokenToEthTransferOutputABI = _.find(EXCHANGE_ABI, { name: 'tokenToEthTransferOutput' });
          const tokenToEthTransferOutput = connex.thor.account(fromToken[inputCurrency]).method(tokenToEthTransferOutputABI);

          signingService.request([
            tokenToEthTransferOutput(
              BN(outputValue).multipliedBy(10 ** outputDecimals).toFixed(0),
              BN(inputValue).multipliedBy(10 ** inputDecimals).multipliedBy(1 + ALLOWED_SLIPPAGE).toFixed(0),
              deadline,
              recipient,
            )
          ]).then(data => {
            console.log(data)
            addPendingTx(data);
            this.reset();
          }).catch(error => {
            console.log(error);
          });
        break;
        case 'TOKEN_TO_TOKEN':
          if (!inputAmountB) {
            return;
          }
          const tokenToTokenTransferOutputABI = _.find(EXCHANGE_ABI, { name: 'tokenToTokenTransferOutput' });
          const tokenToTokenTransferOutput = connex.thor.account(fromToken[inputCurrency]).method(tokenToTokenTransferOutputABI);

          signingService.request([
            tokenToTokenTransferOutput.asClause(
              BN(outputValue).multipliedBy(10 ** outputDecimals).toFixed(0),
              BN(inputValue).multipliedBy(10 ** inputDecimals).multipliedBy(1 + TOKEN_ALLOWED_SLIPPAGE).toFixed(0),
              inputAmountB.multipliedBy(1.2).toFixed(0),
              deadline,
              recipient,
              outputCurrency,
            )
          ]).then(data => {
            addPendingTx(data);
            this.reset();
          }).catch(error => {
            console.log(error);
          });

          break;
        default:
          break;
      }
    }
  };

  renderSummary(inputError, outputError) {
    const {
      inputValue,
      inputCurrency,
      outputValue,
      outputCurrency,
      recipient,
    } = this.state;
    const { t } = this.props;

    const { selectors, account } = this.props;
    const { label: inputLabel } = selectors().getBalance(account, inputCurrency);
    const { label: outputLabel } = selectors().getBalance(account, outputCurrency);
    const validRecipientAddress = isAddress(recipient);
    const inputIsZero = BN(inputValue).isZero();
    const outputIsZero = BN(outputValue).isZero();

    let contextualInfo = '';
    let isError = false;

    if (inputError || outputError) {
      contextualInfo = inputError || outputError;
      isError = true;
    } else if (!inputCurrency || !outputCurrency) {
      contextualInfo = t("selectTokenCont");
    } else if (inputCurrency === outputCurrency) {
      contextualInfo = t("differentToken");
    } else if (!inputValue || !outputValue) {
      const missingCurrencyValue = !inputValue ? inputLabel : outputLabel;
      contextualInfo = t("enterValueCont", {missingCurrencyValue});
    } else if (inputIsZero || outputIsZero) {
      contextualInfo = t("noLiquidity");
    } else if (this.isUnapproved()) {
      contextualInfo = t("unlockTokenCont");
    } else if (!recipient) {
      contextualInfo = t("noRecipient");
    } else if (!validRecipientAddress) {
      contextualInfo = t("invalidRecipient");
    }

    return (
      <ContextualInfo
        openDetailsText={t("transactionDetails")}
        closeDetailsText={t("hideDetails")}
        contextualInfo={contextualInfo}
        isError={isError}
        renderTransactionDetails={this.renderTransactionDetails}
      />
    );
  }

  renderTransactionDetails = () => {
    const {
      inputValue,
      inputCurrency,
      outputValue,
      outputCurrency,
      recipient,
      inputAmountB,
      lastEditedField,
    } = this.state;
    const { t, selectors, account } = this.props;

    const ALLOWED_SLIPPAGE = 0.025;
    const TOKEN_ALLOWED_SLIPPAGE = 0.04;

    const type = getSendType(inputCurrency, outputCurrency);
    const { label: inputLabel, decimals: inputDecimals } = selectors().getBalance(account, inputCurrency);
    const { label: outputLabel, decimals: outputDecimals } = selectors().getBalance(account, outputCurrency);

    const label = lastEditedField === INPUT ? outputLabel : inputLabel;
    let minOutput;
    let maxInput;

    if (lastEditedField === INPUT) {
      switch(type) {
        case 'ETH_TO_TOKEN':
          minOutput = BN(outputValue).multipliedBy(1 - ALLOWED_SLIPPAGE).toFixed(7);
          break;
        case 'TOKEN_TO_ETH':
          minOutput = BN(outputValue).multipliedBy(1 - ALLOWED_SLIPPAGE).toFixed(7);
          break;
        case 'TOKEN_TO_TOKEN':
          minOutput = BN(outputValue).multipliedBy(1 - TOKEN_ALLOWED_SLIPPAGE).toFixed(7);
          break;
        default:
          break;
      }
    }

    if (lastEditedField === OUTPUT) {
      switch (type) {
        case 'ETH_TO_TOKEN':
          maxInput = BN(inputValue).multipliedBy(1 + ALLOWED_SLIPPAGE).toFixed(7);
          break;
        case 'TOKEN_TO_ETH':
          maxInput = BN(inputValue).multipliedBy(1 + ALLOWED_SLIPPAGE).toFixed(7);
          break;
        case 'TOKEN_TO_TOKEN':
          maxInput = BN(inputValue).multipliedBy(1 + TOKEN_ALLOWED_SLIPPAGE).toFixed(7);
          break;
        default:
          break;
      }
    }

    const recipientText = b(`${recipient.slice(0, 6)}...${recipient.slice(-4)}`);
    if (lastEditedField === INPUT) {
      return (
        <div>
          <div>
            {t("youAreSending")} {b(`${+inputValue} ${inputLabel}`)}.
          </div>
          <div className="send__last-summary-text">
            {recipientText} {t("willReceive")} {b(`${+minOutput} ${outputLabel}`)} {t("orTransFail")}
          </div>
        </div>
      );
    } else {
      return (
        <div>
          <div>
            {t("youAreSending")} {b(`${+outputValue} ${outputLabel}`)} {t("to")} {recipientText}.
            {/*You are selling between {b(`${+inputValue} ${inputLabel}`)} to {b(`${+maxInput} ${inputLabel}`)}.*/}
          </div>
          <div className="send__last-summary-text">
            {/*{b(`${recipient.slice(0, 6)}...${recipient.slice(-4)}`)} will receive {b(`${+outputValue} ${outputLabel}`)}.*/}
            {t("itWillCost")} {b(`${+maxInput} ${inputLabel}`)} {t("orTransFail")}
          </div>
        </div>
      );
    }
  }

  renderExchangeRate() {
    const { t, account, selectors } = this.props;
    const { exchangeRate, inputCurrency, outputCurrency } = this.state;
    const { label: inputLabel } = selectors().getBalance(account, inputCurrency);
    const { label: outputLabel } = selectors().getBalance(account, outputCurrency);

    if (!exchangeRate || exchangeRate.isNaN() || !inputCurrency || !outputCurrency) {
      return (
        <OversizedPanel hideBottom>
          <div className="swap__exchange-rate-wrapper">
            <span className="swap__exchange-rate">{t("exchangeRate")}</span>
            <span> - </span>
          </div>
        </OversizedPanel>
      );
    }

    return (
      <OversizedPanel hideBottom>
        <div className="swap__exchange-rate-wrapper">
          <span className="swap__exchange-rate">{t("exchangeRate")}</span>
          <span>
            {`1 ${inputLabel} = ${exchangeRate.toFixed(7)} ${outputLabel}`}
          </span>
        </div>
      </OversizedPanel>
    );
  }

  renderBalance(currency, balance, decimals) {
    if (!currency || decimals === 0) {
      return '';
    }
    const balanceInput = balance.dividedBy(BN(10 ** decimals)).toFixed(4)
    return this.props.t("balance", { balanceInput })
  }

  render() {
    const { t, selectors, account } = this.props;
    const {
      lastEditedField,
      inputCurrency,
      outputCurrency,
      inputValue,
      outputValue,
      recipient,
    } = this.state;
    const estimatedText = `(${t("estimated")})`;

    const { value: inputBalance, decimals: inputDecimals } = selectors().getBalance(account, inputCurrency);
    const { value: outputBalance, decimals: outputDecimals } = selectors().getBalance(account, outputCurrency);
    const { inputError, outputError, isValid, extraFee } = this.validate();

    let fee = '1%';

    if (extraFee) {
      fee = '2%';
    }

    return (
      <div className="send">
        <MediaQuery query="(max-width: 767px)">
          <Header />
        </MediaQuery>
        <div
          className={classnames('swap__content', {
            'swap--inactive': !this.props.isConnected,
          })}
        >
          <NavigationTabs
            className={classnames('header__navigation', {
              'header--inactive': !this.props.isConnected,
            })}
          />

          <Alert
            message="Do not send your coins from Vexchange directly to an exchange. Some exchanges do not support receiving coins from a smart contract."
            type="warning"
            closable
          />

          <CurrencyInputPanel
            title={t("input")}
            description={lastEditedField === OUTPUT ? estimatedText : ''}
            extraText={this.renderBalance(inputCurrency, inputBalance, inputDecimals)}
            onCurrencySelected={inputCurrency => this.setState({ inputCurrency }, this.recalcForm)}
            onValueChange={this.updateInput}
            selectedTokens={[inputCurrency, outputCurrency]}
            selectedTokenAddress={inputCurrency}
            value={inputValue}
            errorMessage={inputError}
          />
          <OversizedPanel>
            <div className="swap__down-arrow-background">
              <img onClick={this.flipInputOutput} className="swap__down-arrow swap__down-arrow--clickable" src={isValid ? ArrowDownBlue : ArrowDownGrey} />
            </div>
          </OversizedPanel>
          <CurrencyInputPanel
            title={t("output")}
            description={lastEditedField === INPUT ? estimatedText : ''}
            extraText={this.renderBalance(outputCurrency, outputBalance, outputDecimals)}
            onCurrencySelected={outputCurrency => this.setState({ outputCurrency }, this.recalcForm)}
            onValueChange={this.updateOutput}
            selectedTokens={[inputCurrency, outputCurrency]}
            value={outputValue}
            selectedTokenAddress={outputCurrency}
            errorMessage={outputError}
            disableUnlock
          />
          <OversizedPanel>
            <div className="swap__down-arrow-background">
              <img className="swap__down-arrow" src={isValid ? ArrowDownBlue : ArrowDownGrey} />
            </div>
          </OversizedPanel>
          <AddressInputPanel
            t={this.props.t}
            value={recipient}
            onChange={address => this.setState({recipient: address})}
          />
          { this.renderExchangeRate() }
          { this.renderSummary(inputError, outputError) }
          <div className="swap__cta-container">
            <button
              className={classnames('swap__cta-btn', {
                'swap--inactive': !this.props.isConnected,
              })}
              disabled={!isValid}
              onClick={this.onSend}
            >
              {t("send")}
            </button>
          </div>
          <div className="contextual-info__summary-wrapper">
            Exchange rate includes a {fee} swap fee
          </div>
        </div>
      </div>
    );
  }
}

export default connect(
  state => ({
    balances: state.connexConnect.balances,
    isConnected: !!state.connexConnect.account,
    account: state.connexConnect.account,
    connex: state.connexConnect.connex,
    exchangeAddresses: state.addresses.exchangeAddresses,
  }),
  dispatch => ({
    selectors: () => dispatch(selectors()),
    addPendingTx: id => dispatch(addPendingTx(id)),
  }),
)(withNamespaces()(Send));

const b = text => <span className="swap__highlight-text">{text}</span>;

function calculateEtherTokenOutput({ inputAmount: rawInput, inputReserve: rawReserveIn, outputReserve: rawReserveOut, exchangeFee }) {
  const inputAmount = BN(rawInput);
  const inputReserve = BN(rawReserveIn);
  const outputReserve = BN(rawReserveOut);

  if (inputAmount.isLessThan(BN(10 ** 9))) {
    console.warn(`inputAmount is only ${inputAmount.toFixed(0)}. Did you forget to multiply by 10 ** decimals?`);
  }

  const numerator = inputAmount.multipliedBy(outputReserve).multipliedBy(10000 - exchangeFee);
  const denominator = inputReserve.multipliedBy(10000).plus(inputAmount.multipliedBy(10000 - exchangeFee));

  return numerator.dividedBy(denominator);
}

function calculateEtherTokenInput({ outputAmount: rawOutput, inputReserve: rawReserveIn, outputReserve: rawReserveOut, exchangeFee }) {
  const outputAmount = BN(rawOutput);
  const inputReserve = BN(rawReserveIn);
  const outputReserve = BN(rawReserveOut);

  if (outputAmount.isLessThan(BN(10 ** 9))) {
    console.warn(`inputAmount is only ${outputAmount.toFixed(0)}. Did you forget to multiply by 10 ** decimals?`);
  }

  const numerator = outputAmount.multipliedBy(inputReserve).multipliedBy(10000);
  const denominator = outputReserve.minus(outputAmount).multipliedBy(10000 - exchangeFee);
  return (numerator.dividedBy(denominator)).plus(1);
}

function getSendType(inputCurrency, outputCurrency) {
  if (!inputCurrency || !outputCurrency) {
    return;
  }

  if (inputCurrency === outputCurrency) {
    return;
  }

  if (inputCurrency !== 'VET' && outputCurrency !== 'VET') {
    return 'TOKEN_TO_TOKEN'
  }

  if (inputCurrency === 'VET') {
    return 'ETH_TO_TOKEN';
  }

  if (outputCurrency === 'VET') {
    return 'TOKEN_TO_ETH';
  }

  return;
}
