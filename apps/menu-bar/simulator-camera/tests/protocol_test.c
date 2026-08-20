#include "../OrbitSimulatorCameraProtocol.h"

#include <assert.h>
#include <stdio.h>
#include <string.h>

int main(void) {
  assert(sizeof(OrbitSimulatorCameraFrameHeader) == 4096);
  assert(ORBIT_SIMULATOR_CAMERA_SLOT_SIZE == 1920 * 1080 * 4);
  assert(ORBIT_SIMULATOR_CAMERA_FILE_SIZE ==
         4096 + (2 * 1920 * 1080 * 4));

  unsigned char storage[ORBIT_SIMULATOR_CAMERA_HEADER_SIZE + 16] = {0};
  OrbitSimulatorCameraFrameHeader *header =
      (OrbitSimulatorCameraFrameHeader *)storage;
  header->magic = ORBIT_SIMULATOR_CAMERA_MAGIC;
  header->version = ORBIT_SIMULATOR_CAMERA_VERSION;
  header->activeSlot = 1;
  strcpy((char *)(storage + ORBIT_SIMULATOR_CAMERA_HEADER_SIZE), "frame");

  assert(header->magic == 0x4F524243u);
  assert(header->version == 1);
  assert(header->activeSlot == 1);
  assert(strcmp((char *)(header + 1), "frame") == 0);

  puts("Simulator camera frame protocol tests passed");
  return 0;
}
