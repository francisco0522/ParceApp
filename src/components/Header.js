/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import {Text, View, StyleSheet, Image} from 'react-native';

export default function Header(props) {
  return (
    <View style={styles.container}>
      <View style={{paddingLeft: 10}}>
        <Image style={styles.logo} source={require('../../assets/back.png')} />
      </View>
      <Text style={styles.text}>{props.title}</Text>
      <Text></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    width: '100%',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    height: 100,
  },
  text: {fontSize: 26, fontWeight: '700', color: '#8E8453'},
  logo: {
    width: 30,
    height: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 1,
    shadowRadius: 1.41,
    elevation: 2,
  },
});
