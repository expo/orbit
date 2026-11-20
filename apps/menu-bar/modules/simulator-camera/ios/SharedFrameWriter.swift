import CoreVideo
import Foundation

/// Writes BGRA frames into the shared-memory file that the simulator camera shim reads.
/// See OrbitCameraShared.h for the layout and the publishing protocol.
final class SharedFrameWriter {
  let url: URL

  private var fd: Int32 = -1
  private var map: UnsafeMutableRawPointer?
  private var nextSlot: UInt32 = 0
  private let lock = NSLock()

  private var header: UnsafeMutablePointer<OrbitCameraShmHeader>? {
    map?.assumingMemoryBound(to: OrbitCameraShmHeader.self)
  }

  init(url: URL) throws {
    self.url = url
    try FileManager.default.createDirectory(
      at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    let fileSize = Int(OrbitCameraShmFileSize)
    // Readers only map the file; the writer owns it.
    fd = open(url.path, O_RDWR | O_CREAT, 0o644)
    guard fd >= 0 else { throw SharedFrameWriterError.cannotOpen(url, errno) }
    guard ftruncate(fd, off_t(fileSize)) == 0 else {
      close(fd)
      throw SharedFrameWriterError.cannotResize(url, errno)
    }
    guard let map = mmap(nil, fileSize, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0),
      map != MAP_FAILED
    else {
      close(fd)
      throw SharedFrameWriterError.cannotMap(url, errno)
    }
    self.map = map
    memset(map, 0, Int(ORBIT_CAMERA_SHM_HEADER_SIZE))
    let header = map.assumingMemoryBound(to: OrbitCameraShmHeader.self)
    header.pointee.magic = ORBIT_CAMERA_SHM_MAGIC
    header.pointee.version = ORBIT_CAMERA_SHM_VERSION
    header.pointee.headerSize = ORBIT_CAMERA_SHM_HEADER_SIZE
    header.pointee.slotCount = ORBIT_CAMERA_SHM_SLOT_COUNT
    header.pointee.slotSize = OrbitCameraShmSlotSize
    header.pointee.pixelFormat = kCVPixelFormatType_32BGRA
    header.pointee.writerPid = UInt32(getpid())
    header.pointee.sequence = 0
    heartbeat()
  }

  deinit {
    closeFile()
  }

  /// Tells readers the writer is alive. Call about once a second.
  func heartbeat() {
    lock.lock()
    defer { lock.unlock() }
    header?.pointee.heartbeatNanos = SharedFrameWriter.hostNanos()
  }

  /// Publishes a frame. `fill` draws the frame into the slot memory, which is
  /// `ORBIT_CAMERA_SHM_SLOT_SIZE` bytes, with `width` × `height` pixels and `bytesPerRow`.
  func publish(
    width: Int, height: Int, bytesPerRow: Int, flags: UInt32 = 0,
    fill: (UnsafeMutableRawPointer) -> Void
  ) {
    guard width > 0, height > 0, width <= Int(ORBIT_CAMERA_MAX_WIDTH),
      height <= Int(ORBIT_CAMERA_MAX_HEIGHT), bytesPerRow >= width * 4,
      bytesPerRow * height <= Int(OrbitCameraShmSlotSize)
    else { return }
    lock.lock()
    defer { lock.unlock() }
    guard let map, let header else { return }
    let slot = nextSlot
    let slotBase = map + Int(ORBIT_CAMERA_SHM_HEADER_SIZE) + Int(slot) * Int(OrbitCameraShmSlotSize)
    fill(slotBase)
    header.pointee.width = UInt32(width)
    header.pointee.height = UInt32(height)
    header.pointee.bytesPerRow = UInt32(bytesPerRow)
    header.pointee.flags = flags
    header.pointee.frameSlot = slot
    header.pointee.timestampNanos = SharedFrameWriter.hostNanos()
    header.pointee.heartbeatNanos = header.pointee.timestampNanos
    // Readers check `sequence` last; the barrier keeps the slot and geometry ahead of it.
    OSMemoryBarrier()
    header.pointee.sequence += 1
    nextSlot = (slot + 1) % ORBIT_CAMERA_SHM_SLOT_COUNT
  }

  /// Stops publishing: readers see a dead heartbeat and fall back to their placeholder.
  func closeFile() {
    lock.lock()
    defer { lock.unlock() }
    if let header {
      header.pointee.heartbeatNanos = 0
      header.pointee.sequence = 0
    }
    if let map {
      munmap(map, Int(OrbitCameraShmFileSize))
      self.map = nil
    }
    if fd >= 0 {
      close(fd)
      fd = -1
    }
    try? FileManager.default.removeItem(at: url)
  }

  static func hostNanos() -> UInt64 {
    var timebase = mach_timebase_info_data_t()
    mach_timebase_info(&timebase)
    return mach_absolute_time() * UInt64(timebase.numer) / UInt64(timebase.denom)
  }
}

enum SharedFrameWriterError: LocalizedError {
  case cannotOpen(URL, Int32)
  case cannotResize(URL, Int32)
  case cannotMap(URL, Int32)

  var errorDescription: String? {
    switch self {
    case .cannotOpen(let url, let code):
      return "Cannot open \(url.path): \(String(cString: strerror(code)))"
    case .cannotResize(let url, let code):
      return "Cannot size \(url.path): \(String(cString: strerror(code)))"
    case .cannotMap(let url, let code):
      return "Cannot map \(url.path): \(String(cString: strerror(code)))"
    }
  }
}
