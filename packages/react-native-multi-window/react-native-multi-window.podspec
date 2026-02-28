require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'react-native-multi-window'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platform       = :osx, '11.0'
  s.source         = { git: 'https://github.com/expo/orbit.git' }
  s.static_framework = true

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }

  s.dependency 'React-RCTAppDelegate'
  s.dependency 'ReactAppDependencyProvider'

  install_modules_dependencies(s)

  s.source_files = "macos/**/*.{h,m}"
end
