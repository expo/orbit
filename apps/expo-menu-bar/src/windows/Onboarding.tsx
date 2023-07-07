import {Text, View, TouchableOpacity, Image} from 'react-native';
import ExpoIcon from '../assets/icon.png';

const Onboarding = () => {
  return (
    <View style={{flex: 1, padding: 10, alignItems: 'center'}}>
      <Image source={ExpoIcon} style={{tintColor: 'white'}} />
      <Text style={{textAlign: 'center', fontSize: 30, marginVertical: 20}}>
        Welcome to Quick Launcher
      </Text>
      <View style={{width: '100%'}}>
        <View>
          <Text>Android Studio</Text>
          <Text>❌</Text>
        </View>
        <View>
          <Text>Xcode</Text>
          <Text>✅</Text>
        </View>
      </View>
      <TouchableOpacity
        style={{
          marginTop: 'auto',
          paddingHorizontal: 15,
          paddingVertical: 8,
          backgroundColor: 'blue',
          borderRadius: 10,
        }}>
        <Text>Start using it</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Onboarding;
