Pod::Spec.new do |s|
  s.name = 'SimulatorCamera'
  s.version = '1.0.0'
  s.summary = 'Streams a Mac camera into iOS Simulator apps'
  s.description = 'Orbit host and LLDB integration for the Simulator Camera feature.'
  s.author = 'Expo'
  s.homepage = 'https://github.com/expo/orbit'
  s.platform = :osx, '14.0'
  s.source = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'CoreMedia', 'CoreVideo'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
