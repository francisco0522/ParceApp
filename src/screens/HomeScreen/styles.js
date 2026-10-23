import {StyleSheet} from 'react-native';

export default StyleSheet.create({
  scrollContent: {paddingBottom: 120},
  plansSection: {padding: 30},
  plansTitle: {
    fontSize: 25,
    fontWeight: '700',
    color: '#222',
    marginBottom: 10,
  },
  plansText: {color: '#333', fontSize: 16, marginBottom: 16},
  plansButton: {
    backgroundColor: '#80743b',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  plansButtonText: {color: '#fff', fontSize: 16},
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
    marginTop: 24,
    fontSize: 30,
    paddingHorizontal: 30,
    fontWeight: '600',
  },

  subtitleText: {
    fontSize: 24,
    paddingHorizontal: 30,
    fontWeight: '600',
    paddingBottom: 20,
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
