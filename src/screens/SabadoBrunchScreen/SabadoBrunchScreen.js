import React, {useState} from 'react';
import {
  TouchableOpacity,
  Text,
  SafeAreaView,
  Image,
  View,
  Alert,
} from 'react-native';
import Footer from '../Footer/Footer';
import styles from './styles';
import {FlatList} from 'react-native-gesture-handler';

const dates = [
  {id: '0', day: 'Sábado', date: '3', month: 'Mayo', time: '10:00 AM'},
  {id: '1', day: 'Sábado', date: '10', month: 'Mayo', time: '10:00 AM'},
  {id: '2', day: 'Sábado', date: '17', month: 'Mayo', time: '10:00 AM'},
];

const SabadoBrunchScreen = ({navigation}) => {
  const [selected, setSelected] = useState([]);
  const toggleSelect = id => {
    if (selected.includes(id)) {
      setSelected(prev => prev.filter(item => item !== id));
      console.log(selected);
    } else {
      setSelected(prev => [...prev, id]);
      console.log(selected);
    }
  };
  const renderCard = ({item}) => {
    const isSelected = selected.includes(item.id);
    console.log(isSelected);
    return (
      <TouchableOpacity
        style={isSelected ? styles.cardSelected : styles.card}
        onPress={() => toggleSelect(item.id)}>
        <View>
          <Text
            style={
              isSelected ? styles.cardDateTextSelected : styles.cardDateText
            }>
            {item.day}, {item.date} de {item.month}
          </Text>
          <Text
            style={
              isSelected ? styles.cardTimeTextSelected : styles.cardTimeText
            }>
            {item.time}
          </Text>
        </View>
        <View>
          <Text
            style={isSelected ? styles.cardCheckSelected : styles.cardCheck}>
            ✔
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Image
        style={styles.image}
        source={{
          uri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQu9qCfc1Pnm160N63VBO0fHlPFJXI1vTKPA_IzqhcBmQ&s&ec=72940544',
        }}
      />

      <View style={styles.containerCurve}>
        <View style={styles.curved}>
          <Text style={styles.titleText}>Tu próxima cita te espera</Text>
          <Text style={styles.subtitleText}>
            Elige tu proximo Sábado de brunch
          </Text>
          <View style={styles.cardsContainer}>
            <FlatList
              scrollEnabled={false}
              data={dates}
              keyExtractor={item => item.id}
              renderItem={renderCard}
            />
          </View>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={() =>
              Alert.alert(
                'Confirmar Reserva',
                `Quieres reservar para ${selected.length == 1 ? 'el dia' : 'los dias'} \n\n ${
                  selected.length == 1
                    ? [
                        dates[selected].day +
                          ' ' +
                          dates[selected].date +
                          ' de ' +
                          dates[selected].month,
                      ]
                    : selected
                        .sort((a, b) => a - b)
                        .map(i => [
                          dates[i].day +
                            ' ' +
                            dates[i].date +
                            ' de ' +
                            dates[i].month,
                        ])
                        .join('\n\n')
                } 
               `,
                [
                  {
                    text: 'Cancel',
                    onPress: () => console.log('Cancel Pressed'),
                    style: 'cancel',
                  },
                  {text: 'OK', onPress: () => console.log('OK Pressed')},
                ],
              )
            }>
            <Text style={styles.confirmButtonText}>Reservar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Footer navigation={navigation} />
    </SafeAreaView>
  );
};

export default SabadoBrunchScreen;
