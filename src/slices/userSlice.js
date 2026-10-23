import {createSlice} from '@reduxjs/toolkit';

export const userSlice = createSlice({
  name: 'user',
  initialState: {
    id: null,
    name: null,
    email: null,
    birthDate: null,
    phone: null,
    profileCompleted: false,
  },
  reducers: {
    setUser: (state, action) => ({...state, ...action.payload}),
    clearUser: () => ({
      id: null,
      name: null,
      email: null,
      birthDate: null,
      phone: null,
      profileCompleted: false,
    }),
    setId: (state, action) => {
      state.id = action.payload;
    },
    setName: (state, action) => {
      state.name = action.payload;
    },
    setEmail: (state, action) => {
      state.email = action.payload;
    },
    setBirthDate: (state, action) => {
      state.birthDate = action.payload;
    },
    setPhone: (state, action) => {
      state.phone = action.payload;
    },
  },
});

export const {
  setId,
  setName,
  setEmail,
  setBirthDate,
  setPhone,
  setUser,
  clearUser,
} = userSlice.actions;
export default userSlice.reducer;
