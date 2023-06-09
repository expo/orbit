#include "pch.h"
#include "ReactPackageProvider.h"
#include "NativeModules.h"
#include "MenuBarModule.h"

using namespace winrt::Microsoft::ReactNative;

namespace winrt::ExpoMenuBar::implementation
{

    void ReactPackageProvider::CreatePackage(IReactPackageBuilder const &packageBuilder) noexcept
    {
        AddAttributedModules(packageBuilder, true);
    }

} // namespace winrt::ExpoMenuBar::implementation
