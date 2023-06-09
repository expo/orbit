#pragma once

#include "pch.h"

#include <functional>
#define _USE_MATH_DEFINES
#include <math.h>
#include <iostream>
#include <string>
#include <stdio.h>

#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.ApplicationModel.h>
#include <winrt/Windows.Storage.h>
#include <winrt/Windows.Storage.Streams.h>
#include <winrt/Windows.System.h>

#include <Windows.h>
#include <string>

#include "NativeModules.h"

namespace NativeModuleSample
{
  REACT_MODULE(MenuBarModule);
  struct MenuBarModule
  {
    REACT_CONSTANT(E);
    const double E = M_E;

    REACT_CONSTANT(PI, L"Pi");
    const double PI = M_PI;

    REACT_METHOD(Add, L"add");
    double Add(double a, double b) noexcept
    {
      double result = a + b;
      AddEvent(result);
      return result;
    }

    REACT_EVENT(AddEvent);
    std::function<void(double)> AddEvent;

    REACT_METHOD(RunCommand, L"runCommand");
    void RunCommand(std::string command, React::ReactPromise<std::string> &&promise) noexcept
    {
      try
      {
        std::wstring assetsPath = winrt::Windows::ApplicationModel::Package::Current().InstalledLocation().Path().c_str();
        std::wstring executablePath = assetsPath + L"\\expo-menu-cli.exe";

        SECURITY_ATTRIBUTES sa{};
        HANDLE hOutputRead, hOutputWrite;

        sa.nLength = sizeof(SECURITY_ATTRIBUTES);
        sa.bInheritHandle = TRUE;
        sa.lpSecurityDescriptor = nullptr;

        if (!CreatePipe(&hOutputRead, &hOutputWrite, &sa, 0))
        {
          promise.Resolve("Failed to create pipe for capturing output");
          return;
        }

        HANDLE hOutputWriteDup;
        if (!DuplicateHandle(GetCurrentProcess(), hOutputWrite, GetCurrentProcess(), &hOutputWriteDup, 0, FALSE, DUPLICATE_SAME_ACCESS))
        {
          CloseHandle(hOutputRead);
          CloseHandle(hOutputWrite);
          promise.Resolve("Failed to duplicate output handle");
          return;
        }

        // Redirect the output handle of the current process to the write end of the pipe
        SetStdHandle(STD_OUTPUT_HANDLE, hOutputWriteDup);
        SetStdHandle(STD_ERROR_HANDLE, hOutputWriteDup);

        STARTUPINFOW startupInfo{};
        PROCESS_INFORMATION processInfo{};

        startupInfo.cb = sizeof(STARTUPINFOW);
      //  startupInfo.dwFlags |= STARTF_USESHOWWINDOW;
        startupInfo.wShowWindow = SW_HIDE;

        BOOL result = CreateProcessW(
            nullptr,                                    // Application name (use nullptr to use executablePath as the application name)
            const_cast<LPWSTR>(executablePath.c_str()), // Command line (use executablePath as the command line)
            nullptr,                                    // Process handle not inheritable
            nullptr,                                    // Thread handle not inheritable
            FALSE,                                      // Set handle inheritance to FALSE
            0,                                          // No creation flags
            nullptr,                                    // Use parent's environment block
            nullptr,                                    // Use parent's starting directory
            &startupInfo,                               // Pointer to STARTUPINFO structure
            &processInfo                                // Pointer to PROCESS_INFORMATION structure
        );

        CloseHandle(hOutputWriteDup);

        if (result)
        {
          // Successfully launched the process
          // Do any additional handling here if needed

          // Close the write end of the output pipe, as we only need the read end
          CloseHandle(hOutputWrite);

          // Read the output of the process
          std::string output;
          const int bufferSize = 4096;
          char buffer[bufferSize];
          DWORD bytesRead;
          while (ReadFile(hOutputRead, buffer, bufferSize - 1, &bytesRead, nullptr))
          {
            if (bytesRead == 0)
              break;
            buffer[bytesRead] = '\0';
            output += buffer;
          }

          // Close the read end of the output pipe
          CloseHandle(hOutputRead);

          // Resolve the promise with the captured output
          promise.Resolve(output);

          // Close process and thread handles to avoid leaks
          CloseHandle(processInfo.hProcess);
          CloseHandle(processInfo.hThread);
        }
        else
        {
          // Failed to launch the process
          // Handle the error here
          CloseHandle(hOutputRead);
          CloseHandle(hOutputWrite);
          promise.Resolve("Failed to launch the process");
        }
      }
      catch (const std::exception &ex)
      {
        // Handle exceptions here
        promise.Resolve("Exception occurred: " + std::string(ex.what()));
      }
    }

    /* REACT_METHOD(RunCommand, L"runCommand");
     void RunCommand(std::string command, React::ReactPromise<std::string> &&promise) noexcept
     {
       try
       {
         std::wstring assetsPath = winrt::Windows::ApplicationModel::Package::Current().InstalledLocation().Path().c_str();
         std::wstring executablePath = assetsPath + L"\\expo-menu-cli.exe";

         int requiredSize = WideCharToMultiByte(CP_UTF8, 0, assetsPath.c_str(), -1, nullptr, 0, nullptr, nullptr);
         std::string str(requiredSize, '\0');
         WideCharToMultiByte(CP_UTF8, 0, assetsPath.c_str(), -1, &str[0], requiredSize, nullptr, nullptr);

         STARTUPINFOW startupInfo{};
         PROCESS_INFORMATION processInfo{};

         BOOL result = CreateProcessW(
             nullptr,                                    // Application name (use nullptr to use executablePath as the application name)
             const_cast<LPWSTR>(executablePath.c_str()), // Command line (use executablePath as the command line)
             nullptr,                                    // Process handle not inheritable
             nullptr,                                    // Thread handle not inheritable
             FALSE,                                      // Set handle inheritance to FALSE
             0,                                          // No creation flags
             nullptr,                                    // Use parent's environment block
             nullptr,                                    // Use parent's starting directory
             &startupInfo,                               // Pointer to STARTUPINFO structure
             &processInfo                                // Pointer to PROCESS_INFORMATION structure
         );

         if (result)
         {
           // Successfully launched the process
           // Do any additional handling here if needed

           promise.Resolve("Deu boa porra");

           // Close process and thread handles to avoid leaks
           CloseHandle(processInfo.hProcess);
           CloseHandle(processInfo.hThread);
         }
         else
         {
           promise.Resolve("nao Deu boa porra");
           // Failed to launch the process
           // Handle the error here
         }

         return;
       }
       catch (const std::exception &ex)
       {
       }
     }*/

    std::wstring GetProcessOutput(const std::wstring &executablePath)
    {
      STARTUPINFOW startupInfo{};
      PROCESS_INFORMATION processInfo{};
      SECURITY_ATTRIBUTES securityAttributes{};
      HANDLE hStdOutputRead = nullptr;
      HANDLE hStdOutputWrite = nullptr;

      // Create pipe for stdout redirection
      securityAttributes.nLength = sizeof(SECURITY_ATTRIBUTES);
      securityAttributes.bInheritHandle = TRUE;
      securityAttributes.lpSecurityDescriptor = nullptr;
      if (!CreatePipe(&hStdOutputRead, &hStdOutputWrite, &securityAttributes, 0))
      {
        std::cerr << "Failed to create pipe for stdout redirection." << std::endl;
        return L"";
      }

      // Set up startup info to redirect stdout to the pipe
      startupInfo.cb = sizeof(STARTUPINFOW);
      startupInfo.hStdOutput = hStdOutputWrite;
      startupInfo.hStdError = hStdOutputWrite;

      // Launch the process with stdout redirection
      BOOL result = CreateProcessW(
          nullptr,                                    // Application name (use nullptr to use executablePath as the application name)
          const_cast<LPWSTR>(executablePath.c_str()), // Command line (use executablePath as the command line)
          nullptr,                                    // Process handle not inheritable
          nullptr,                                    // Thread handle not inheritable
          TRUE,                                       // Set handle inheritance to TRUE
          0,                                          // No creation flags
          nullptr,                                    // Use parent's environment block
          nullptr,                                    // Use parent's starting directory
          &startupInfo,                               // Pointer to STARTUPINFO structure
          &processInfo                                // Pointer to PROCESS_INFORMATION structure
      );

      if (result)
      {
        // Successfully launched the process with stdout redirection
        // Close the write end of the pipe as we only need the read end
        CloseHandle(hStdOutputWrite);
        hStdOutputWrite = nullptr;

        const int bufferSize = 4096;
        wchar_t buffer[bufferSize];
        std::wstring processOutput;

        // Read from the pipe and append to processOutput until there is no more data
        DWORD bytesRead = 0;
        while (ReadFile(hStdOutputRead, buffer, bufferSize * sizeof(wchar_t), &bytesRead, nullptr))
        {
          if (bytesRead == 0)
            break;

          processOutput.append(buffer, bytesRead / sizeof(wchar_t));
        }

        // Close the read end of the pipe
        CloseHandle(hStdOutputRead);
        hStdOutputRead = nullptr;

        // Wait for the process to exit and get its exit code
        WaitForSingleObject(processInfo.hProcess, INFINITE);
        DWORD exitCode;
        GetExitCodeProcess(processInfo.hProcess, &exitCode);

        // Close process and thread handles to avoid leaks
        CloseHandle(processInfo.hProcess);
        CloseHandle(processInfo.hThread);

        // Output the process exit code
        std::cout << "Process exited with code: " << exitCode << std::endl;

        return processOutput;
      }
      else
      {
        // Failed to launch the process
        // Handle the error here
        std::cerr << "Failed to launch the process." << std::endl;

        // Close handles to avoid leaks
        if (hStdOutputRead != nullptr)
          CloseHandle(hStdOutputRead);

        if (hStdOutputWrite != nullptr)
          CloseHandle(hStdOutputWrite);

        return L"";
      }
    }

    void RunCommand1(std::string command, React::ReactPromise<std::string> &&promise) noexcept
    {
      // int result = system(command.c_str());
      if (true)
      {

        // Resolve the promise with the command output
        promise.Resolve("Puta merda!");
      }
      else
      {
        // Reject the promise if the command execution failed
        promise.Reject("Failed to execute command");
      }
    }
  };
}
