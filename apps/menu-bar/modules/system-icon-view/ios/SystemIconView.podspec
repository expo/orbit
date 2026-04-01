Pod::Spec.new do |s|
  s.name           = 'SystemIconView'
  s.version        = '1.0.0'
  s.summary        = 'SF Symbols icon view for macOS'
  s.description    = 'Native view for rendering SF Symbols icons'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platform       = :osx, '11.0'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
