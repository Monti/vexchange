import { combineReducers } from 'redux';
import addresses from './addresses';
import app from './app';
import pending from './pending';
import connexConnect from './connexConnect';

export default combineReducers({
  app,
  addresses,
  pending,
  connexConnect,
});
