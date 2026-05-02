import {StyleSheet} from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
    paddingHorizontal: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  greeting: {
    fontSize: 14,
    color: '#666',
  },

  welcome: {
    fontSize: 22,
    fontWeight: '700',
  },

  emptyText: {
    textAlign: 'center',
    marginTop: 80,
    fontSize: 16,
    color: '#777',
  },

  card: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  date: {
    fontSize: 12,
    color: '#777',
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  dinner: {
    backgroundColor: '#DFF3E3',
  },

  event: {
    backgroundColor: '#E7E9FF',
  },

  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },

  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  primaryButton: {
    backgroundColor: '#111',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },

  primaryText: {
    color: 'white',
    fontWeight: '600',
  },
});
