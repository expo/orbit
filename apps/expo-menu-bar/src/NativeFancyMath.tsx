import React, {Component} from 'react';
import {AppRegistry, Alert, Text, View, Button} from 'react-native';

import {NativeModules, NativeEventEmitter} from 'react-native';

const Module = false ? NativeModules.FancyMath : NativeModules.MenuBarModule;

const FancyMathEventEmitter = new NativeEventEmitter(Module);

export class NativeModuleSample extends Component {
  componentDidMount() {
    // Subscribing to MenuBarModule.AddEvent
    FancyMathEventEmitter.addListener('AddEvent', this.eventHandler, this);
  }

  componentWillUnmount() {
    // Unsubscribing from MenuBarModule.AddEvent
    FancyMathEventEmitter.removeAllListeners('AddEvent');
  }

  eventHandler(result) {
    console.log('Event was fired with: ' + result);
  }

  async _onPressHandler() {
    const abc = await Module.runCommand('ls -a');
    console.log('abc', abc);
    // Calling MenuBarModule.add method
    // Module.add(
    //   /* arg a */ Module.Pi,
    //   /* arg b */ Module.E,
    //   /* callback */ function (result) {
    //     Alert.alert(
    //       'MenuBarModule',
    //       `MenuBarModule says ${Module.Pi} + ${Module.E} = ${result}`,
    //       [{text: 'OK'}],
    //       {cancelable: false},
    //     );
    //   },
    // );
  }

  render() {
    return (
      <View>
        <Text>MenuBarModule says PI = {Module.Pi}</Text>
        <Text>MenuBarModule says E = {Module.E}</Text>
        <Button onPress={this._onPressHandler} title="Click me!" />
      </View>
    );
  }
}
