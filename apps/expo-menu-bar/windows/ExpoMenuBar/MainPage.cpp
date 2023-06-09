#include "pch.h"
#include "MainPage.h"
#if __has_include("MainPage.g.cpp")
#include "MainPage.g.cpp"
#endif

#include <winrt/Windows.UI.ViewManagement.h>

#include "App.h"

using namespace winrt;
using namespace xaml;

namespace winrt::ExpoMenuBar::implementation
{
    MainPage::MainPage()
    {
        InitializeComponent();
        auto app = Application::Current().as<App>();
        ReactRootView().ReactNativeHost(app->Host());

        auto currentView = winrt::Windows::UI::ViewManagement::ApplicationView::GetForCurrentView();
        auto titleBar = currentView.TitleBar(); 
        titleBar.BackgroundColor(Windows::UI::Colors::Transparent()); 
    }
     
}
