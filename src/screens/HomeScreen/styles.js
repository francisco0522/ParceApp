import {StyleSheet} from 'react-native';
import {Button} from 'react-native-paper';

export default StyleSheet.create({
  container: {
    height: '100%',
    backgroundColor: '#fff',
  },

  title: {
    backgroundColor: '#fff',
    width: '100%',
    opacity: 0.4,
  },

  titleText: {
    marginTop: 100,
    fontSize: 50,
    paddingHorizontal: 30,
    fontWeight: 600,
  },

  subtitleText: {
    fontSize: 40,
    paddingHorizontal: 30,
    fontWeight: 600,
    paddingBottom: 50,
  },
  gridOptions: {
    width: '100%',
    flexDirection: 'column',
    paddingHorizontal: 30,
  },
  rowGrid: {
    marginBottom: 5,
    width: '100%',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  button1: {
    width: '49%',
    height: 120,
    justifyContent: 'center',
    backgroundColor: '#d0e7f3ff',
    borderRadius: 20,
    alignItems: 'center',
  },
  button2: {
    width: '49%',
    height: 120,
    justifyContent: 'center',
    backgroundColor: '#d7d7d7ff',
    borderRadius: 20,
    alignItems: 'center',
  },
  button3: {
    width: '49%',
    height: 120,
    justifyContent: 'center',
    backgroundColor: '#c5ffcdff',
    borderRadius: 20,
    alignItems: 'center',
  },
  button4: {
    width: '49%',
    height: 120,
    justifyContent: 'center',
    backgroundColor: '#fcffc9ff',
    borderRadius: 20,
    alignItems: 'center',
  },

  textButton: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 400,
    paddingTop: 15,
  },

  iconButton2: {
    textAlign: 'center',
    height: 30,
    width: 30,
    padding: 5,
  },
  headerButton: {
    width: 50,
    borderColor: '#d8d8d8ff',
    borderWidth: 3,
    height: 50,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtons: {
    paddingHorizontal: 30,
    justifyContent: 'space-between',
    flexDirection: 'row',
    width: '100%',
  },
});
