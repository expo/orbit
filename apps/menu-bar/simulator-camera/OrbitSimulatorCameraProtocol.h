#ifndef OrbitSimulatorCameraProtocol_h
#define OrbitSimulatorCameraProtocol_h

#include <stdint.h>

#define ORBIT_SIMULATOR_CAMERA_MAGIC 0x4F524243u
#define ORBIT_SIMULATOR_CAMERA_VERSION 1u
#define ORBIT_SIMULATOR_CAMERA_HEADER_SIZE 4096u
#define ORBIT_SIMULATOR_CAMERA_MAX_WIDTH 1920u
#define ORBIT_SIMULATOR_CAMERA_MAX_HEIGHT 1080u
#define ORBIT_SIMULATOR_CAMERA_BYTES_PER_PIXEL 4u
#define ORBIT_SIMULATOR_CAMERA_SLOT_SIZE \
  (ORBIT_SIMULATOR_CAMERA_MAX_WIDTH * ORBIT_SIMULATOR_CAMERA_MAX_HEIGHT * \
   ORBIT_SIMULATOR_CAMERA_BYTES_PER_PIXEL)
#define ORBIT_SIMULATOR_CAMERA_SLOT_COUNT 2u
#define ORBIT_SIMULATOR_CAMERA_FILE_SIZE \
  (ORBIT_SIMULATOR_CAMERA_HEADER_SIZE + \
   ORBIT_SIMULATOR_CAMERA_SLOT_SIZE * ORBIT_SIMULATOR_CAMERA_SLOT_COUNT)
#define ORBIT_SIMULATOR_CAMERA_PATH \
  "/private/tmp/dev.expo.orbit.simulator-camera.frames"

typedef struct {
  uint32_t magic;
  uint32_t version;
  uint64_t sequence;
  uint32_t width;
  uint32_t height;
  uint32_t bytesPerRow;
  uint32_t pixelFormat;
  uint32_t slotSize;
  uint32_t activeSlot;
  uint64_t timestampNanoseconds;
  uint8_t reserved[ORBIT_SIMULATOR_CAMERA_HEADER_SIZE - 48];
} OrbitSimulatorCameraFrameHeader;

_Static_assert(sizeof(OrbitSimulatorCameraFrameHeader) ==
                   ORBIT_SIMULATOR_CAMERA_HEADER_SIZE,
               "The frame header must occupy exactly one page");

#endif
