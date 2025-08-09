import {StyleSheet} from 'react-native';

export default StyleSheet.create({
  container: {
    height: '100%',
  },
  containerCurve: {
    alignItems: 'center',
    backgroundColor: '#b39c8b',
  },
  title: {
    backgroundColor: '#fff',
    width: '100%',
    opacity: 0.4,
  },

  curved: {
    alignItems: 'center',
    marginTop: -50,
    width: '100%',
    height: '90%',
    backgroundColor: 'white',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
  titleText: {
    fontSize: 30,
    margin: 30,
    color: '#fc036f',
    fontWeight: 800,
  },
  subtitleText: {
    fontSize: 20,
    marginBottom: 20,
    marginTop: 20,
    fontWeight: 300,
  },
  image: {
    width: '100%',
    height: 200,
  },
  cardsContainer: {
    width: '90%',
  },
  card: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    padding: 20,
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: '#fc036f',
  },
  cardSelected: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    padding: 20,
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fc036f',
    backgroundColor: 'white',
  },
  cardDateTextSelected: {
    fontSize: 18,
    fontWeight: 800,
    color: '#fc036f',
  },
  cardTimeTextSelected: {
    color: '#fc036f',
  },
  cardDateText: {
    fontSize: 18,
    fontWeight: 800,
    color: 'white',
  },
  cardTimeText: {
    color: 'white',
  },
  cardCheckSelected: {opacity: 1},
  cardCheck: {opacity: 0},
  confirmButton: {
    marginTop: 50,
    width: '60%',
    height: 50,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: '#3293a8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {color: 'white', fontSize: 18, fontWeight: 800},
});
