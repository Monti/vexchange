import React, { Component } from 'react';
import MediaQuery from "react-responsive";

import Header from '../../components/Header';
import AddLiquidity from './AddLiquidity';
import CreateExchange from './CreateExchange';
import RemoveLiquidity from './RemoveLiquidity';
import { Switch, Route } from 'react-router-dom';
import "./pool.scss";

class Pool extends Component {
  render() {
    return (
      <div className="pool">
        <MediaQuery query="(max-width: 768px)">
          <Header />
        </MediaQuery>
        <Switch>
          <Route exact path="/add-liquidity" component={AddLiquidity} />
          <Route exact path="/remove-liquidity" component={RemoveLiquidity} />
          <Route exact path="/create-exchange/:tokenAddress?" component={CreateExchange} />
        </Switch>
      </div>
    );
  }
}

export default Pool;
