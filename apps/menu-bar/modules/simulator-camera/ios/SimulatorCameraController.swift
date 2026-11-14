import Foundation

/// Runs the virtual camera: keeps the shim built and injected into booted simulators, and
/// writes the frames of the chosen sources into shared memory for the front and back camera.
final class SimulatorCameraController {
  enum Position: String, CaseIterable {
    case front, back
  }

  struct Status {
    var enabled: Bool
    var helperPath: String?
    var error: String?
    var framesDirectory: String
    var simulators: [(udid: String, name: String, injected: Bool)]
    var sources: [Position: SimulatorCameraSource]
    var sourceErrors: [Position: String]

    var dictionary: [String: Any] {
      [
        "enabled": enabled,
        "helperPath": helperPath as Any,
        "error": error as Any,
        "framesDirectory": framesDirectory,
        "simulators": simulators.map { ["udid": $0.udid, "name": $0.name, "injected": $0.injected] },
        "sources": Dictionary(uniqueKeysWithValues: sources.map { ($0.key.rawValue, $0.value.dictionary) }),
        "sourceErrors": Dictionary(uniqueKeysWithValues: sourceErrors.map { ($0.key.rawValue, $0.value) }),
      ]
    }
  }

  static let shared = SimulatorCameraController()

  /// Called after the status changed, on the controller's queue.
  var onStatusChange: ((Status) -> Void)?

  private let queue = DispatchQueue(label: "dev.expo.orbit.simulator-camera.controller")
  private var enabled = false
  private var helperPath: String?
  private var lastError: String?
  private var sources: [Position: SimulatorCameraSource] = [
    .front: SimulatorCameraSource(kind: .none), .back: SimulatorCameraSource(kind: .none),
  ]
  private var sourceErrors: [Position: String] = [:]
  private var writers: [Position: SharedFrameWriter] = [:]
  // One running source per distinct configuration, feeding every position that uses it.
  private var runningSources: [SimulatorCameraSource: (source: FrameSource, positions: Set<Position>)] = [:]
  // The writers each running source feeds. Sources call back from their own threads, and
  // still sources call back from inside `start()` on the controller's queue, so this is
  // guarded by a lock rather than the queue.
  private var targets: [SimulatorCameraSource: [SharedFrameWriter]] = [:]
  private let targetsLock = NSLock()
  private var simulators: [(udid: String, name: String, injected: Bool)] = []
  private var pollTimer: DispatchSourceTimer?
  private var heartbeatTimer: DispatchSourceTimer?

  let framesDirectory: String = {
    String(format: ORBIT_CAMERA_DEFAULT_DIR_FORMAT, getuid())
  }()

  private init() {}

  // MARK: - API

  func status() -> Status {
    queue.sync { currentStatus() }
  }

  func setEnabled(_ enabled: Bool) throws -> Status {
    try queue.sync {
      if enabled {
        try enable()
      } else {
        disable()
      }
      return currentStatus()
    }
  }

  func setSource(_ source: SimulatorCameraSource, for position: Position) -> Status {
    queue.sync {
      sources[position] = source
      sourceErrors[position] = nil
      if enabled { applySources() }
      return currentStatus()
    }
  }

  /// Re-checks the booted simulators and injects into new ones. Called on a timer while
  /// enabled, and on demand when the device list changes.
  func refreshSimulators() -> Status {
    queue.sync {
      if enabled { injectIntoBootedSimulators() }
      return currentStatus()
    }
  }

  // MARK: - Enable / disable

  private func enable() throws {
    lastError = nil
    let helper: String
    do {
      helper = try DylibBuilder.ensureBuilt()
    } catch {
      lastError = error.localizedDescription
      throw error
    }
    helperPath = helper
    enabled = true
    try? FileManager.default.createDirectory(atPath: framesDirectory, withIntermediateDirectories: true)
    applySources()
    injectIntoBootedSimulators()
    startTimers()
  }

  private func disable() {
    enabled = false
    stopTimers()
    for (_, running) in runningSources { running.source.stop() }
    runningSources = [:]
    targetsLock.lock()
    targets = [:]
    targetsLock.unlock()
    for (_, writer) in writers { writer.closeFile() }
    writers = [:]
    for simulator in simulators where simulator.injected {
      try? SimulatorInjector.remove(udid: simulator.udid)
    }
    simulators = simulators.map { ($0.udid, $0.name, false) }
  }

  // MARK: - Sources

  private func applySources() {
    // Stop sources no position uses anymore, and writers of positions without a source.
    let wanted = Set(sources.values.filter { $0.kind != .none })
    for (config, running) in runningSources where !wanted.contains(config) {
      running.source.stop()
      runningSources[config] = nil
    }
    for position in Position.allCases {
      let config = sources[position] ?? SimulatorCameraSource(kind: .none)
      if config.kind == .none {
        writers[position]?.closeFile()
        writers[position] = nil
      } else if writers[position] == nil {
        let url = URL(fileURLWithPath: framesDirectory).appendingPathComponent("\(position.rawValue).shm")
        do {
          writers[position] = try SharedFrameWriter(url: url)
        } catch {
          sourceErrors[position] = error.localizedDescription
        }
      }
    }
    // Point every running source at the writers of its positions, then start the new ones.
    var nextTargets: [SimulatorCameraSource: [SharedFrameWriter]] = [:]
    var toStart: [(SimulatorCameraSource, FrameSource, Set<Position>)] = []
    for config in wanted {
      let positions = Set(Position.allCases.filter { sources[$0] == config })
      nextTargets[config] = positions.compactMap { writers[$0] }
      if var running = runningSources[config] {
        running.positions = positions
        runningSources[config] = running
        continue
      }
      do {
        guard let source = try FrameSources.make(config) else { continue }
        source.onFrame = { [weak self] frame in self?.publish(frame, for: config) }
        runningSources[config] = (source, positions)
        toStart.append((config, source, positions))
      } catch {
        for position in positions { sourceErrors[position] = error.localizedDescription }
      }
    }
    targetsLock.lock()
    targets = nextTargets
    targetsLock.unlock()
    for (config, source, positions) in toStart {
      do {
        try source.start()
      } catch {
        for position in positions { sourceErrors[position] = error.localizedDescription }
        runningSources[config] = nil
      }
    }
    notify()
  }

  private func publish(_ frame: SourceFrame, for config: SimulatorCameraSource) {
    targetsLock.lock()
    let targets = self.targets[config] ?? []
    targetsLock.unlock()
    for writer in targets {
      writer.publish(width: FrameCanvas.width, height: FrameCanvas.height, bytesPerRow: FrameCanvas.bytesPerRow) { slot in
        FrameCanvas.render(frame, contentMode: config.contentMode, into: slot)
      }
    }
  }

  // MARK: - Simulators

  private func injectIntoBootedSimulators() {
    guard enabled, let helperPath else { return }
    do {
      let booted = try SimulatorInjector.bootedSimulators()
      var result: [(udid: String, name: String, injected: Bool)] = []
      for simulator in booted {
        var injected = SimulatorInjector.isInjected(udid: simulator.udid, dylibPath: helperPath)
        if !injected {
          do {
            try SimulatorInjector.inject(udid: simulator.udid, dylibPath: helperPath, framesDirectory: framesDirectory)
            injected = true
          } catch {
            lastError = error.localizedDescription
          }
        }
        result.append((simulator.udid, simulator.name, injected))
      }
      let changed = result.map { "\($0.udid):\($0.injected)" } != simulators.map { "\($0.udid):\($0.injected)" }
      simulators = result
      if changed { notify() }
    } catch {
      lastError = error.localizedDescription
      notify()
    }
  }

  private func startTimers() {
    let poll = DispatchSource.makeTimerSource(queue: queue)
    poll.schedule(deadline: .now() + 4, repeating: 4)
    poll.setEventHandler { [weak self] in self?.injectIntoBootedSimulators() }
    poll.resume()
    pollTimer = poll

    let heartbeat = DispatchSource.makeTimerSource(queue: queue)
    heartbeat.schedule(deadline: .now() + 1, repeating: 1)
    heartbeat.setEventHandler { [weak self] in
      self?.writers.values.forEach { $0.heartbeat() }
    }
    heartbeat.resume()
    heartbeatTimer = heartbeat
  }

  private func stopTimers() {
    pollTimer?.cancel()
    pollTimer = nil
    heartbeatTimer?.cancel()
    heartbeatTimer = nil
  }

  // MARK: - Status

  private func currentStatus() -> Status {
    Status(
      enabled: enabled, helperPath: helperPath, error: lastError, framesDirectory: framesDirectory,
      simulators: simulators, sources: sources, sourceErrors: sourceErrors)
  }

  private func notify() {
    onStatusChange?(currentStatus())
  }
}
