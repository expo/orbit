Pod::Spec.new do |s|
  s.name           = 'SimulatorCamera'
  s.version        = '1.0.0'
  s.summary        = 'A virtual camera for iOS simulators'
  s.description    = 'Injects a camera shim into iOS Simulator apps and feeds it frames from a Mac camera, an image, a video or a QR code.'
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

  s.source_files = "*.{h,swift}"
  # The shim is compiled on the user's machine against the iOS Simulator SDK (see
  # DylibBuilder.swift); its source ships as a resource of the app. The `.objc` extension
  # keeps it out of every source-file glob, so nothing compiles it as part of Orbit.
  s.resources = ['simulator/OrbitSimulatorCamera.objc', 'OrbitCameraShared.h']
end
