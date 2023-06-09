#include "MenuBarModule.h"
#include <iostream>
#include <cstdlib>

using namespace winrt::Windows::Foundation;
using namespace winrt::Windows::System;

namespace winrt::MyCustomModule::implementation
{
  void MyCustomModule::RunCommand(React::ReactPromise<React::JSValueObject> promise)
  {
    std::string command = "ls -a";
    int result = std::system(command.c_str());

    if (result == 0)
    {
      promise.Resolve(React::JSValueObject());
    }
    else
    {
      promise.Reject("COMMAND_FAILED", "Failed to run the custom command");
    }
  }
}
