import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BrowseModelsScreen from './screens/BrowseModelsScreen';
import ModelDetailsScreen from './screens/ModelDetailsScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import TrainNewModelScreen from './screens/TrainNewModelScreen';
import ClassifyImageScreen from './screens/ClassifyImageScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Browse Models" component={BrowseModelsScreen} />
        <Stack.Screen name="ModelDetails" component={ModelDetailsScreen} options={{ title: 'Model Details' }} />
        <Stack.Screen name="Train New Model" component={TrainNewModelScreen} />
        <Stack.Screen name="Classify Image" component={ClassifyImageScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
