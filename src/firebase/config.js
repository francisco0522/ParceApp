import {initializeApp} from 'firebase/app';

const firebaseConfig = {
  apiKey: 'AIzaSyC6iapajYv2uO0NQoRvXakVASn72jY5c7A',
  authDomain: 'parceapp-6c0c2.firebaseapp.com',
  projectId: 'parceapp-6c0c2',
  storageBucket: 'parceapp-6c0c2.firebasestorage.app',
  messagingSenderId: '219752391547',
  appId: '1:219752391547:web:16e6533565ec8c22d813de',
  measurementId: 'G-837XNPDD09',
};

const firebaseApp = initializeApp(firebaseConfig);

export {firebaseApp};
