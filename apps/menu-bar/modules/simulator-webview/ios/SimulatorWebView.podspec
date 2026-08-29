Pod::Spec.new do |s|
  s.name           = 'SimulatorWebView'
  s.version        = '1.0.0'
  s.summary        = 'WKWebView host for the EAS Simulator preview'
  s.description    = 'Embeds the serve-sim preview page used by EAS Simulator sessions.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platform       = :osx, '11.0'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
