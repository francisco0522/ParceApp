import {StyleSheet} from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2b2b2bff',
    paddingHorizontal: 24,
    paddingHorizontal: 30,
  },
  logo: {
    width: 150,
    height: 80,
    alignSelf: 'center',
    marginVertical: 10,
    resizeMode: 'contain',
  },
  label: {
    fontSize: 15,
    color: '#ffffffff',
    marginBottom: 5,
  },
  input: {
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  button: {
    height: 48,
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    color: '#ffffffff',
    fontSize: 14,
  },
  footerLink: {
    color: '#9999fdff',
    fontWeight: '600',
  },
});
