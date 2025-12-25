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
    backgroundColor: '#000000ff',
    borderTopWidth: 1,
    borderTopColor: '#ffffffff',
  },

  button: {
    marginTop: 5,
    alignItems: 'center',
    paddingTop: 10,
    justifyContent: 'center',
    width: '20%',
    height: 50,
  },

  textButton: {
    color: '#fff',
    marginTop: 5,
    fontSize: 13,
  },
});
