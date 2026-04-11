#!/usr/bin/env ruby
# Adds the ExpoMenuBarUITests target to the Xcode project.
#
# Usage:
#   gem install xcodeproj  (if not already installed)
#   ruby macos/scripts/add_ui_test_target.rb
#
# This only needs to be run once. After running, the UI test target will
# appear in Xcode and can be run with:
#   xcodebuild test -project macos/ExpoMenuBar.xcodeproj \
#     -scheme ExpoMenuBar-macOS \
#     -destination 'platform=macOS'

require 'xcodeproj'

project_path = File.expand_path('../../ExpoMenuBar.xcodeproj', __dir__)
project = Xcodeproj::Project.open(project_path)

target_name = 'ExpoMenuBarUITests'

# Check if target already exists
if project.targets.any? { |t| t.name == target_name }
  puts "Target '#{target_name}' already exists, skipping."
  exit 0
end

# Find the main app target
app_target = project.targets.find { |t| t.name == 'ExpoMenuBar-macOS' }
unless app_target
  puts "Error: Could not find 'ExpoMenuBar-macOS' target"
  exit 1
end

# Create UI test target
ui_test_target = project.new_target(
  :ui_test_bundle,
  target_name,
  :macos,
  nil, # deployment target inherited from project
  project.products_group,
  :swift
)

ui_test_target.add_dependency(app_target)

# Add source files
group = project.main_group.new_group(target_name, 'ExpoMenuBarUITests')
test_file = group.new_reference('ExpoMenuBarUITests.swift')
info_plist = group.new_reference('Info.plist')

ui_test_target.source_build_phase.add_file_reference(test_file)

# Configure build settings
ui_test_target.build_configurations.each do |config|
  config.build_settings['INFOPLIST_FILE'] = 'ExpoMenuBarUITests/Info.plist'
  config.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'dev.expo.orbit.uitests'
  config.build_settings['TEST_TARGET_NAME'] = 'ExpoMenuBar-macOS'
  config.build_settings['SWIFT_VERSION'] = '5.0'
  config.build_settings['CODE_SIGN_STYLE'] = 'Automatic'
  config.build_settings['MACOSX_DEPLOYMENT_TARGET'] = '13.0'
end

# Add UI test target to the scheme's test action
scheme_path = File.join(project_path, 'xcshareddata', 'xcschemes', 'ExpoMenuBar-macOS.xcscheme')
scheme = Xcodeproj::XCScheme.new(scheme_path)

testable = Xcodeproj::XCScheme::TestAction::TestableReference.new(ui_test_target)
testable.skipped = false
scheme.test_action.add_testable(testable)

scheme.save!
project.save

puts "Successfully added '#{target_name}' target to the project."
puts "You can now run UI tests with:"
puts "  xcodebuild test -project macos/ExpoMenuBar.xcodeproj -scheme ExpoMenuBar-macOS -destination 'platform=macOS'"
