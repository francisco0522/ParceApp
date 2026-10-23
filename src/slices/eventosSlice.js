import {createSlice} from '@reduxjs/toolkit';

const eventosSlice = createSlice({
  name: 'eventos',
  initialState: {
    list: [],
    loading: false,
    error: null,
    lastFetch: null,
  },
  reducers: {
    loading(state) {
      state.loading = true;
      state.error = null;
    },
    setEventos(state, action) {
      state.list = action.payload;
      state.loading = false;
      state.lastFetch = Date.now();
    },
    error(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    clearEventos(state) {
      state.list = [];
      state.lastFetch = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const {loading, setEventos, error, clearEventos} = eventosSlice.actions;

export default eventosSlice.reducer;
