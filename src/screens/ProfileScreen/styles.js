import {StyleSheet} from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5F2',
    paddingHorizontal: 16,
  },

  header: {
    alignItems: 'center',
    marginVertical: 24,
  },

  name: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
    color: '#1F2937',
  },

  email: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
    color: '#1F2937',
  },

  card: {
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  rowIcon: {
    fontSize: 18,
    width: 30,
  },

  rowLabel: {
    fontSize: 12,
    color: '#6B7280',
  },

  rowValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },

  editButton: {
    marginTop: 30,
    marginBottom: 40,
    backgroundColor: '#3293A8',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },

  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
