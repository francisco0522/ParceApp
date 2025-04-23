import {StyleSheet} from 'react-native';

export default StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    justifyContent: 'space-between',
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#b39c8b',
  },
  footerText: {
    color: '#ffffff',
  },

  button: {
    paddingTop: 10,

    justifyContent: 'center',
    width: '20%',
    height: 50,
  },

  buttonText: {
    textAlign: 'center',
    fontSize: 30,
    color: 'white',
  },
});
