import userReducer from '../slices/userSlice';

import {combineReducers} from 'redux';

const rootReducer = combineReducers({
  user: userReducer,
});

export default rootReducer;
