import {StyleSheet} from 'react-native';

export default StyleSheet.create({
  container: {
    backgroundColor: '#2b2b2bff',
    marginHorizontal: 20,
  },

  header: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 80,
  },

  titleText: {
    fontSize: 30,
    marginVertical: 30,
    color: '#fff',
    fontWeight: 800,
  },

  headerButtons: {
    justifyContent: 'space-between',
    flexDirection: 'row',
  },

  headerButton: {
    width: 40,
    backgroundColor: '#fff',
    height: 40,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
  },

  subtitleText: {
    color: '#fff',
    fontSize: 20,
    marginBottom: 20,
    marginTop: 20,
    fontWeight: '300',
  },

  cardsContainer: {
    width: '100%',
  },
  card: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  cardSelected: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: '#d0e7f3ff',
  },
  cardDateTextSelected: {
    fontSize: 18,
    fontWeight: 600,
    color: '#000',
  },
  cardTimeTextSelected: {
    fontSize: 14,

    color: '#000000ff',
  },
  cardDateText: {
    fontSize: 18,
    fontWeight: 600,
    color: '#000',
  },
  cardTimeText: {
    fontSize: 14,
    color: '#000',
  },
  cardCheckSelected: {opacity: 1},
  cardCheck: {opacity: 0},
  confirmButton: {
    marginTop: 90,
    width: '100%',
    height: 50,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {color: 'white', fontSize: 18, fontWeight: 800},
});
