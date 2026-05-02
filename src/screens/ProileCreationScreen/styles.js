import {StyleSheet} from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2b2b2bff',
  },
  containerTitle: {marginTop: 30, alignItems: 'center'},
  title: {color: 'white', fontSize: 30, fontWeight: 'bold'},
  subtitle: {color: 'white', fontSize: 15, fontWeight: 'bold'},
  question: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 30,
    textAlign: 'center',
  },

  containerPregunta: {
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 200,
    backgroundColor: '#fff',
    marginLeft: 30,
    marginRight: 30,
    marginTop: 20,
    height: 48,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonSelected: {
    width: 200,
    backgroundColor: '#67aaa9ff',
    marginLeft: 30,
    marginRight: 30,
    marginTop: 20,
    height: 48,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonTitle: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },

  back: {
    width: 200,
    borderWidth: 1,
    borderColor: '#fff',
    marginLeft: 30,
    marginRight: 30,
    marginTop: 20,
    height: 48,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
