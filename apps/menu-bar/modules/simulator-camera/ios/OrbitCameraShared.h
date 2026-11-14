// Shared-memory frame transport between Orbit (the writer, on macOS) and the
// camera shim that Orbit injects into iOS Simulator apps (the reader).
//
// One file per camera position lives in the frames directory, `front.shm` and
// `back.shm`. The file starts with this header and is followed by
// `slotCount` slots of `slotSize` bytes, each holding one BGRA frame.
//
// The writer fills the slot after the one it wrote last, then publishes it by
// setting `frameSlot` and incrementing `sequence`. The reader copies the slot
// named by `frameSlot` when `sequence` changed since its last copy, and keeps
// delivering the last frame it copied at its own cadence otherwise. Three
// slots keep the writer from overwriting the slot the reader is copying.
//
// Both sides are compiled from this header, so the layout is defined once.

#ifndef OrbitCameraShared_h
#define OrbitCameraShared_h

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define ORBIT_CAMERA_SHM_MAGIC 0x4F524243u /* 'ORBC' */
#define ORBIT_CAMERA_SHM_VERSION 1u
#define ORBIT_CAMERA_SHM_HEADER_SIZE 256u
#define ORBIT_CAMERA_SHM_SLOT_COUNT 3u
#define ORBIT_CAMERA_MAX_WIDTH 1920u
#define ORBIT_CAMERA_MAX_HEIGHT 1080u
#define ORBIT_CAMERA_BYTES_PER_PIXEL 4u
#define ORBIT_CAMERA_SHM_SLOT_SIZE \
  (ORBIT_CAMERA_MAX_WIDTH * ORBIT_CAMERA_MAX_HEIGHT * ORBIT_CAMERA_BYTES_PER_PIXEL)
#define ORBIT_CAMERA_SHM_FILE_SIZE \
  (ORBIT_CAMERA_SHM_HEADER_SIZE + ORBIT_CAMERA_SHM_SLOT_COUNT * ORBIT_CAMERA_SHM_SLOT_SIZE)

// The same sizes as constants, for Swift, which does not import computed macros.
static const uint64_t OrbitCameraShmSlotSize = ORBIT_CAMERA_SHM_SLOT_SIZE;
static const uint64_t OrbitCameraShmFileSize = ORBIT_CAMERA_SHM_FILE_SIZE;

// Fallback directory when ORBIT_SIMULATOR_CAMERA_DIR is not set in the simulator's launchd
// environment. The UID keeps the files of different macOS users apart.
#define ORBIT_CAMERA_DEFAULT_DIR_FORMAT "/tmp/dev.expo.orbit.simulator-camera-%u"

// The writer bumps `heartbeatNanos` about once a second while it runs. A reader treats a
// frame as stale, and shows its placeholder, when the heartbeat is older than this.
#define ORBIT_CAMERA_HEARTBEAT_TIMEOUT_NANOS (3ull * 1000000000ull)

// Set in `flags` by the writer: the source is a front-facing camera that already shows a
// mirror image (for example the Mac's camera), so a mirrored preview must not mirror again.
#define ORBIT_CAMERA_FLAG_SOURCE_MIRRORED 1u

typedef struct {
  uint32_t magic;
  uint32_t version;
  uint32_t headerSize;
  uint32_t slotCount;
  uint64_t slotSize;
  // Geometry of the frames in the slots. Changes between frames when the source changes.
  uint32_t width;
  uint32_t height;
  uint32_t bytesPerRow;
  uint32_t pixelFormat;  // kCVPixelFormatType_32BGRA
  uint32_t flags;
  uint32_t frameSlot;    // The slot of the newest frame.
  uint64_t sequence;     // Increments after each frame; 0 means no frame yet.
  uint64_t timestampNanos;  // Host time (mach_absolute_time in ns) of the newest frame.
  uint64_t heartbeatNanos;  // Host time of the writer's last sign of life.
  uint32_t writerPid;
  uint8_t reserved[ORBIT_CAMERA_SHM_HEADER_SIZE - 76];
} OrbitCameraShmHeader;

_Static_assert(sizeof(OrbitCameraShmHeader) == ORBIT_CAMERA_SHM_HEADER_SIZE,
               "OrbitCameraShmHeader must be ORBIT_CAMERA_SHM_HEADER_SIZE bytes");

#ifdef __cplusplus
}
#endif

#endif /* OrbitCameraShared_h */
