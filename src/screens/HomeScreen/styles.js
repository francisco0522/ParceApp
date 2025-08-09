import {StyleSheet} from 'react-native';
import {Button} from 'react-native-paper';

export default StyleSheet.create({
  container: {
    height: '100%',
    alignItems: 'center',
  },

  title: {
    backgroundColor: '#fff',
    width: '100%',
    opacity: 0.4,
  },

  titleText: {
    fontSize: 30,
    margin: 30,
    fontWeight: 800,
  },
  gridOptions: {
    width: '90%',
    flexDirection: 'column',
    height: '70%',
    justifyContent: 'center',
  },
  rowGrid: {
    width: '100%',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  button: {
    marginBottom: 40,
    width: '40%',
    height: 200,
    justifyContent: 'center',
  },

  textButton: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 800,
  },

  iconButton: {
    textAlign: 'center',
    fontSize: 80,
  },
});
