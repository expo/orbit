import XCTest

/// Cross-platform E2E tests for the macOS native build.
///
/// These tests use the same accessibility identifiers (testID) as the Electron
/// WebdriverIO tests in `electron/test/specs/test.e2e.ts`, ensuring both
/// platforms are tested against the same UI contract.
///
/// React Native's `testID` prop maps to `accessibilityIdentifier` on macOS,
/// which XCUITest can query via `element.matching(identifier:)`.
final class ExpoMenuBarUITests: XCTestCase {
  var app: XCUIApplication!

  override func setUpWithError() throws {
    continueAfterFailure = false
    app = XCUIApplication()
    app.launch()
  }

  override func tearDownWithError() throws {
    app.terminate()
  }

  // MARK: - Onboarding

  func testOnboardingWindowShowsOnFirstLaunch() throws {
    let onboardingWindow = app.windows.matching(identifier: "onboarding-window").firstMatch
    XCTAssertTrue(onboardingWindow.waitForExistence(timeout: 10),
                  "Onboarding window should appear on first launch")

    let getStartedButton = onboardingWindow.buttons.matching(identifier: "get-started-button").firstMatch
    XCTAssertTrue(getStartedButton.exists, "Get Started button should be visible")
  }

  func testGetStartedClosesOnboarding() throws {
    let onboardingWindow = app.windows.matching(identifier: "onboarding-window").firstMatch
    guard onboardingWindow.waitForExistence(timeout: 10) else {
      XCTFail("Onboarding window did not appear")
      return
    }

    let getStartedButton = onboardingWindow.buttons.matching(identifier: "get-started-button").firstMatch
    getStartedButton.tap()

    // After tapping, onboarding should close
    XCTAssertTrue(onboardingWindow.waitForNonExistence(timeout: 5),
                  "Onboarding window should close after tapping Get Started")
  }

  // MARK: - Popover

  func testPopoverShowsCoreContent() throws {
    // Dismiss onboarding first if present
    dismissOnboardingIfPresent()

    let popoverCore = app.otherElements.matching(identifier: "popover-core").firstMatch
    XCTAssertTrue(popoverCore.waitForExistence(timeout: 10),
                  "Popover core content should be visible")
  }

  func testPopoverShowsBuildsSection() throws {
    dismissOnboardingIfPresent()

    let buildsSection = app.otherElements.matching(identifier: "builds-section").firstMatch
    XCTAssertTrue(buildsSection.waitForExistence(timeout: 10),
                  "Builds section should be visible")
  }

  func testPopoverShowsFooter() throws {
    dismissOnboardingIfPresent()

    let footer = app.otherElements.matching(identifier: "popover-footer").firstMatch
    XCTAssertTrue(footer.waitForExistence(timeout: 10),
                  "Popover footer should be visible")

    let settingsButton = app.otherElements.matching(identifier: "settings-button").firstMatch
    XCTAssertTrue(settingsButton.exists, "Settings button should be in the footer")

    let quitButton = app.otherElements.matching(identifier: "quit-button").firstMatch
    XCTAssertTrue(quitButton.exists, "Quit button should be in the footer")
  }

  // MARK: - Helpers

  private func dismissOnboardingIfPresent() {
    let onboardingWindow = app.windows.matching(identifier: "onboarding-window").firstMatch
    if onboardingWindow.waitForExistence(timeout: 3) {
      let getStartedButton = onboardingWindow.buttons.matching(identifier: "get-started-button").firstMatch
      if getStartedButton.exists {
        getStartedButton.tap()
        _ = onboardingWindow.waitForNonExistence(timeout: 5)
      }
    }
  }
}

private extension XCUIElement {
  func waitForNonExistence(timeout: TimeInterval) -> Bool {
    let predicate = NSPredicate(format: "exists == false")
    let expectation = XCTNSPredicateExpectation(predicate: predicate, object: self)
    let result = XCTWaiter().wait(for: [expectation], timeout: timeout)
    return result == .completed
  }
}
