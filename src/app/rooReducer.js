import userReducer from '../slices/userSlice';
import eventosReducer from '../slices/eventosSlice';

import {combineReducers} from 'redux';

const rootReducer = combineReducers({
  user: userReducer,
  eventos: eventosReducer,
});

export default rootReducer;
