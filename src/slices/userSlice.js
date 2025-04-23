import {createSlice} from '@reduxjs/toolkit';

export const userSlice = createSlice({
  name: 'user',
  initialState: {
    id: null,
    name: null,
    email: null,
    birthDate: null,
    phone: null,
  },
  reducers: {
    setId: (state, action) => {
      console.log('Ejecutando setId con:', action.payload);
      state.id = action.payload;
    },
    setName: (state, action) => {
      console.log('Ejecutando setName con:', action.payload);
      state.name = action.payload;
    },
    setEmail: (state, action) => {
      console.log('Ejecutando setEmail con:', action.payload);
      state.email = action.payload;
    },
    setBirthDate: (state, action) => {
      console.log('Ejecutando setBirthDate con:', action.payload);
      state.birthDate = action.payload;
    },
    setPhone: (state, action) => {
      console.log('Ejecutando setPhone con:', action.payload);
      state.phone = action.payload;
    },
  },
});

export const {setId, setName, setEmail, setBirthDate, setPhone} =
  userSlice.actions;
export default userSlice.reducer;
