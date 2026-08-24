#import <AVFoundation/AVFoundation.h>
#import <CoreImage/CoreImage.h>
#import <CoreMedia/CoreMedia.h>
#import <CoreVideo/CoreVideo.h>
#import <Foundation/Foundation.h>
#import <QuartzCore/QuartzCore.h>
#import <UIKit/UIKit.h>
#import <dlfcn.h>
#import <fcntl.h>
#import <objc/runtime.h>
#import <sys/file.h>
#import <sys/mman.h>
#import <sys/stat.h>
#import <unistd.h>

#import "OrbitSimulatorCameraProtocol.h"

static const void *OrbitFakeSessionKey = &OrbitFakeSessionKey;
static const void *OrbitSessionOutputsKey = &OrbitSessionOutputsKey;
static const void *OrbitSessionRunningKey = &OrbitSessionRunningKey;
static const void *OrbitPreviewSessionKey = &OrbitPreviewSessionKey;
static dispatch_source_t OrbitFrameTimer;

@interface OrbitCameraFormat : NSObject
@property(nonatomic, readonly) CMFormatDescriptionRef formatDescription;
@property(nonatomic, readonly) NSArray<AVFrameRateRange *> *videoSupportedFrameRateRanges;
@end

@implementation OrbitCameraFormat {
  CMFormatDescriptionRef _formatDescription;
}

- (instancetype)init {
  if ((self = [super init])) {
    CMVideoFormatDescriptionCreate(kCFAllocatorDefault, kCVPixelFormatType_32BGRA,
                                   1280, 720, NULL, &_formatDescription);
  }
  return self;
}

- (void)dealloc {
  if (_formatDescription) {
    CFRelease(_formatDescription);
  }
}

- (CMFormatDescriptionRef)formatDescription {
  return _formatDescription;
}

- (NSArray<AVFrameRateRange *> *)videoSupportedFrameRateRanges {
  return @[];
}
@end

@interface OrbitCameraDevice : NSObject
@property(nonatomic, readonly) NSString *uniqueID;
@property(nonatomic, readonly) NSString *localizedName;
@property(nonatomic, readonly) AVCaptureDevicePosition position;
@property(nonatomic, readonly) AVCaptureDeviceType deviceType;
@property(nonatomic, readonly) NSArray *formats;
@property(nonatomic, strong) id activeFormat;
@property(nonatomic) CMTime activeVideoMinFrameDuration;
@property(nonatomic) CMTime activeVideoMaxFrameDuration;
@property(nonatomic, readonly, getter=isConnected) BOOL connected;
@property(nonatomic, readonly, getter=isSuspended) BOOL suspended;
@end

static OrbitCameraDevice *OrbitCameraDeviceInstance(void);
static NSHashTable<AVCaptureSession *> *OrbitCaptureSessions(void);

@implementation OrbitCameraDevice

- (instancetype)init {
  if ((self = [super init])) {
    _activeFormat = [[OrbitCameraFormat alloc] init];
    _activeVideoMinFrameDuration = CMTimeMake(1, 30);
    _activeVideoMaxFrameDuration = CMTimeMake(1, 30);
  }
  return self;
}

- (NSString *)uniqueID { return @"dev.expo.orbit.simulator-camera"; }
- (NSString *)localizedName { return @"Expo Orbit Camera"; }
- (AVCaptureDevicePosition)position { return AVCaptureDevicePositionBack; }
- (AVCaptureDeviceType)deviceType { return AVCaptureDeviceTypeBuiltInWideAngleCamera; }
- (NSArray *)formats { return @[ self.activeFormat ]; }
- (BOOL)isConnected { return YES; }
- (BOOL)isSuspended { return NO; }
- (BOOL)hasMediaType:(AVMediaType)mediaType { return [mediaType isEqualToString:AVMediaTypeVideo]; }
- (BOOL)supportsAVCaptureSessionPreset:(AVCaptureSessionPreset)preset { return YES; }
- (BOOL)lockForConfiguration:(NSError **)error { return YES; }
- (void)unlockForConfiguration {}
- (BOOL)isFocusModeSupported:(AVCaptureFocusMode)mode { return NO; }
- (BOOL)isExposureModeSupported:(AVCaptureExposureMode)mode { return NO; }
- (BOOL)isTorchModeSupported:(AVCaptureTorchMode)mode { return NO; }
- (BOOL)hasTorch { return NO; }
- (BOOL)hasFlash { return NO; }
@end

@interface OrbitCameraDiscoverySession : NSObject
@property(nonatomic, readonly) NSArray *devices;
@end
@implementation OrbitCameraDiscoverySession
- (NSArray *)devices { return @[ OrbitCameraDeviceInstance() ]; }
@end

@interface OrbitCameraInput : NSObject
@property(nonatomic, readonly) id device;
@property(nonatomic, readonly) NSArray *ports;
@end
@implementation OrbitCameraInput
- (id)device { return OrbitCameraDeviceInstance(); }
- (NSArray *)ports { return @[]; }
@end

@interface OrbitCameraConnection : NSObject
@property(nonatomic, getter=isEnabled) BOOL enabled;
@property(nonatomic, readonly, getter=isActive) BOOL active;
@end
@implementation OrbitCameraConnection
- (instancetype)init { if ((self = [super init])) _enabled = YES; return self; }
- (BOOL)isActive { return YES; }
@end

static OrbitCameraDevice *OrbitCameraDeviceInstance(void) {
  static OrbitCameraDevice *device;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{ device = [[OrbitCameraDevice alloc] init]; });
  return device;
}

static BOOL OrbitIsFakeDevice(id device) {
  return [device isKindOfClass:[OrbitCameraDevice class]];
}

static void OrbitSwizzleClassMethod(Class cls, SEL original, SEL replacement) {
  Method first = class_getClassMethod(cls, original);
  Method second = class_getClassMethod(cls, replacement);
  if (first && second) method_exchangeImplementations(first, second);
}

static void OrbitSwizzleInstanceMethod(Class cls, SEL original, SEL replacement) {
  Method first = class_getInstanceMethod(cls, original);
  Method second = class_getInstanceMethod(cls, replacement);
  if (first && second) method_exchangeImplementations(first, second);
}

@interface AVCaptureDevice (OrbitSimulatorCamera)
@end
@implementation AVCaptureDevice (OrbitSimulatorCamera)
+ (AVCaptureDevice *)orbit_defaultDeviceWithMediaType:(AVMediaType)mediaType {
  if ([mediaType isEqualToString:AVMediaTypeVideo]) return (id)OrbitCameraDeviceInstance();
  return [self orbit_defaultDeviceWithMediaType:mediaType];
}
+ (AVCaptureDevice *)orbit_defaultDeviceWithDeviceType:(AVCaptureDeviceType)deviceType
                                             mediaType:(AVMediaType)mediaType
                                              position:(AVCaptureDevicePosition)position {
  if ([mediaType isEqualToString:AVMediaTypeVideo]) return (id)OrbitCameraDeviceInstance();
  return [self orbit_defaultDeviceWithDeviceType:deviceType mediaType:mediaType position:position];
}
+ (NSArray<AVCaptureDevice *> *)orbit_devicesWithMediaType:(AVMediaType)mediaType {
  if ([mediaType isEqualToString:AVMediaTypeVideo]) return @[ (id)OrbitCameraDeviceInstance() ];
  return [self orbit_devicesWithMediaType:mediaType];
}
+ (AVAuthorizationStatus)orbit_authorizationStatusForMediaType:(AVMediaType)mediaType {
  if ([mediaType isEqualToString:AVMediaTypeVideo]) return AVAuthorizationStatusAuthorized;
  return [self orbit_authorizationStatusForMediaType:mediaType];
}
+ (void)orbit_requestAccessForMediaType:(AVMediaType)mediaType
                      completionHandler:(void (^)(BOOL granted))handler {
  if ([mediaType isEqualToString:AVMediaTypeVideo]) {
    dispatch_async(dispatch_get_main_queue(), ^{ handler(YES); });
    return;
  }
  [self orbit_requestAccessForMediaType:mediaType completionHandler:handler];
}
@end

@interface AVCaptureDeviceDiscoverySession (OrbitSimulatorCamera)
@end
@implementation AVCaptureDeviceDiscoverySession (OrbitSimulatorCamera)
+ (AVCaptureDeviceDiscoverySession *)orbit_discoverySessionWithDeviceTypes:(NSArray *)deviceTypes
                                                                 mediaType:(AVMediaType)mediaType
                                                                  position:(AVCaptureDevicePosition)position {
  if ([mediaType isEqualToString:AVMediaTypeVideo]) {
    return (id)[[OrbitCameraDiscoverySession alloc] init];
  }
  return [self orbit_discoverySessionWithDeviceTypes:deviceTypes
                                           mediaType:mediaType
                                            position:position];
}
@end

@interface AVCaptureDeviceInput (OrbitSimulatorCamera)
@end
@implementation AVCaptureDeviceInput (OrbitSimulatorCamera)
+ (instancetype)orbit_deviceInputWithDevice:(AVCaptureDevice *)device error:(NSError **)error {
  if (OrbitIsFakeDevice(device)) return (id)[[OrbitCameraInput alloc] init];
  return [self orbit_deviceInputWithDevice:device error:error];
}
- (instancetype)orbit_initWithDevice:(AVCaptureDevice *)device error:(NSError **)error {
  if (OrbitIsFakeDevice(device)) return (id)[[OrbitCameraInput alloc] init];
  return [self orbit_initWithDevice:device error:error];
}
@end

@interface AVCaptureSession (OrbitSimulatorCamera)
@end
@implementation AVCaptureSession (OrbitSimulatorCamera)
- (BOOL)orbit_canAddInput:(AVCaptureInput *)input {
  return [input isKindOfClass:[OrbitCameraInput class]] || [self orbit_canAddInput:input];
}
- (void)orbit_addInput:(AVCaptureInput *)input {
  if ([input isKindOfClass:[OrbitCameraInput class]]) {
    objc_setAssociatedObject(self, OrbitFakeSessionKey, @YES, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    return;
  }
  [self orbit_addInput:input];
}
- (BOOL)orbit_canAddOutput:(AVCaptureOutput *)output {
  if ([objc_getAssociatedObject(self, OrbitFakeSessionKey) boolValue]) return YES;
  return [self orbit_canAddOutput:output];
}
- (void)orbit_addOutput:(AVCaptureOutput *)output {
  if ([objc_getAssociatedObject(self, OrbitFakeSessionKey) boolValue]) {
    NSMutableArray *outputs = objc_getAssociatedObject(self, OrbitSessionOutputsKey);
    if (!outputs) {
      outputs = [NSMutableArray array];
      objc_setAssociatedObject(self, OrbitSessionOutputsKey, outputs, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    }
    [outputs addObject:output];
    return;
  }
  [self orbit_addOutput:output];
}
- (void)orbit_startRunning {
  if ([objc_getAssociatedObject(self, OrbitFakeSessionKey) boolValue]) {
    objc_setAssociatedObject(self, OrbitSessionRunningKey, @YES, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    @synchronized(OrbitCaptureSessions()) { [OrbitCaptureSessions() addObject:self]; }
    return;
  }
  [self orbit_startRunning];
}
- (void)orbit_stopRunning {
  if ([objc_getAssociatedObject(self, OrbitFakeSessionKey) boolValue]) {
    objc_setAssociatedObject(self, OrbitSessionRunningKey, @NO, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
    return;
  }
  [self orbit_stopRunning];
}
- (BOOL)orbit_isRunning {
  if ([objc_getAssociatedObject(self, OrbitFakeSessionKey) boolValue]) {
    return [objc_getAssociatedObject(self, OrbitSessionRunningKey) boolValue];
  }
  return [self orbit_isRunning];
}
@end

static NSHashTable<AVCaptureSession *> *OrbitCaptureSessions(void) {
  static NSHashTable *sessions;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{ sessions = [NSHashTable weakObjectsHashTable]; });
  return sessions;
}

static NSHashTable<AVCaptureVideoPreviewLayer *> *OrbitPreviewLayers(void) {
  static NSHashTable *layers;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{ layers = [NSHashTable weakObjectsHashTable]; });
  return layers;
}

@interface AVCaptureVideoPreviewLayer (OrbitSimulatorCamera)
@end
@implementation AVCaptureVideoPreviewLayer (OrbitSimulatorCamera)
- (void)orbit_setSession:(AVCaptureSession *)session {
  if ([objc_getAssociatedObject(session, OrbitFakeSessionKey) boolValue]) {
    objc_setAssociatedObject(self, OrbitPreviewSessionKey, session, OBJC_ASSOCIATION_ASSIGN);
    @synchronized(OrbitPreviewLayers()) { [OrbitPreviewLayers() addObject:self]; }
    self.contentsGravity = kCAGravityResizeAspectFill;
    return;
  }
  [self orbit_setSession:session];
}
@end

static CMSampleBufferRef OrbitCopyLatestSampleBuffer(void) {
  static uint64_t lastSequence = 0;
  int descriptor = open(ORBIT_SIMULATOR_CAMERA_PATH, O_RDONLY);
  if (descriptor < 0) return NULL;
  void *memory = mmap(NULL, ORBIT_SIMULATOR_CAMERA_FILE_SIZE, PROT_READ, MAP_SHARED,
                      descriptor, 0);
  if (memory == MAP_FAILED) { close(descriptor); return NULL; }

  flock(descriptor, LOCK_SH);
  OrbitSimulatorCameraFrameHeader header = *(OrbitSimulatorCameraFrameHeader *)memory;
  if (header.magic != ORBIT_SIMULATOR_CAMERA_MAGIC ||
      header.version != ORBIT_SIMULATOR_CAMERA_VERSION ||
      header.sequence == lastSequence || header.width == 0 || header.height == 0 ||
      header.width > ORBIT_SIMULATOR_CAMERA_MAX_WIDTH ||
      header.height > ORBIT_SIMULATOR_CAMERA_MAX_HEIGHT || header.activeSlot > 1) {
    flock(descriptor, LOCK_UN);
    munmap(memory, ORBIT_SIMULATOR_CAMERA_FILE_SIZE);
    close(descriptor);
    return NULL;
  }

  CVPixelBufferRef pixelBuffer = NULL;
  NSDictionary *attributes = @{ (id)kCVPixelBufferIOSurfacePropertiesKey : @{} };
  CVReturn result = CVPixelBufferCreate(kCFAllocatorDefault, header.width, header.height,
                                        kCVPixelFormatType_32BGRA,
                                        (__bridge CFDictionaryRef)attributes, &pixelBuffer);
  if (result == kCVReturnSuccess && pixelBuffer) {
    CVPixelBufferLockBaseAddress(pixelBuffer, 0);
    uint8_t *destination = CVPixelBufferGetBaseAddress(pixelBuffer);
    size_t destinationBytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer);
    uint8_t *source = (uint8_t *)memory + ORBIT_SIMULATOR_CAMERA_HEADER_SIZE +
                      (header.activeSlot * ORBIT_SIMULATOR_CAMERA_SLOT_SIZE);
    size_t copyBytes = MIN(destinationBytesPerRow, header.bytesPerRow);
    for (uint32_t row = 0; row < header.height; row++) {
      memcpy(destination + row * destinationBytesPerRow,
             source + row * header.bytesPerRow, copyBytes);
    }
    CVPixelBufferUnlockBaseAddress(pixelBuffer, 0);
    lastSequence = header.sequence;
  }
  flock(descriptor, LOCK_UN);
  munmap(memory, ORBIT_SIMULATOR_CAMERA_FILE_SIZE);
  close(descriptor);
  if (!pixelBuffer) return NULL;

  CMVideoFormatDescriptionRef format = NULL;
  CMSampleBufferRef sample = NULL;
  CMVideoFormatDescriptionCreateForImageBuffer(kCFAllocatorDefault, pixelBuffer, &format);
  CMSampleTimingInfo timing = {
    .duration = CMTimeMake(1, 30),
    .presentationTimeStamp = CMClockGetTime(CMClockGetHostTimeClock()),
    .decodeTimeStamp = kCMTimeInvalid,
  };
  CMSampleBufferCreateReadyWithImageBuffer(kCFAllocatorDefault, pixelBuffer, format,
                                           &timing, &sample);
  if (format) CFRelease(format);
  CFRelease(pixelBuffer);
  return sample;
}

static void OrbitDeliverFrame(CMSampleBufferRef sample) {
  CVPixelBufferRef imageBuffer = CMSampleBufferGetImageBuffer(sample);
  CIImage *image = [CIImage imageWithCVPixelBuffer:imageBuffer];
  static CIContext *context;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{ context = [CIContext contextWithOptions:nil]; });
  CGImageRef cgImage = [context createCGImage:image fromRect:image.extent];

  NSArray *sessions;
  @synchronized(OrbitCaptureSessions()) { sessions = OrbitCaptureSessions().allObjects; }
  for (AVCaptureSession *session in sessions) {
    if (![objc_getAssociatedObject(session, OrbitSessionRunningKey) boolValue]) continue;
    NSArray *outputs = [objc_getAssociatedObject(session, OrbitSessionOutputsKey) copy];
    for (AVCaptureOutput *output in outputs) {
      if (![output isKindOfClass:[AVCaptureVideoDataOutput class]]) continue;
      AVCaptureVideoDataOutput *videoOutput = (AVCaptureVideoDataOutput *)output;
      id<AVCaptureVideoDataOutputSampleBufferDelegate> delegate = videoOutput.sampleBufferDelegate;
      dispatch_queue_t callbackQueue = videoOutput.sampleBufferCallbackQueue;
      if (!delegate || !callbackQueue ||
          ![delegate respondsToSelector:@selector(captureOutput:didOutputSampleBuffer:fromConnection:)]) {
        continue;
      }
      CFRetain(sample);
      dispatch_async(callbackQueue, ^{
        [delegate captureOutput:videoOutput
          didOutputSampleBuffer:sample
               fromConnection:(id)[[OrbitCameraConnection alloc] init]];
        CFRelease(sample);
      });
    }
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    NSArray *layers;
    @synchronized(OrbitPreviewLayers()) { layers = OrbitPreviewLayers().allObjects; }
    for (AVCaptureVideoPreviewLayer *layer in layers) {
      AVCaptureSession *session = objc_getAssociatedObject(layer, OrbitPreviewSessionKey);
      if ([objc_getAssociatedObject(session, OrbitSessionRunningKey) boolValue]) {
        layer.contents = (__bridge id)cgImage;
      }
    }
    CGImageRelease(cgImage);
  });
}

static void OrbitStartFramePump(void) {
  dispatch_queue_t queue = dispatch_queue_create("dev.expo.orbit.simulator-camera.frames", 0);
  OrbitFrameTimer = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, 0, queue);
  dispatch_source_set_timer(OrbitFrameTimer, DISPATCH_TIME_NOW, NSEC_PER_SEC / 30,
                            NSEC_PER_MSEC * 4);
  dispatch_source_set_event_handler(OrbitFrameTimer, ^{
    CMSampleBufferRef sample = OrbitCopyLatestSampleBuffer();
    if (!sample) return;
    OrbitDeliverFrame(sample);
    CFRelease(sample);
  });
  dispatch_resume(OrbitFrameTimer);
}

__attribute__((constructor)) static void OrbitSimulatorCameraBootstrap(void) {
  @autoreleasepool {
    OrbitSwizzleClassMethod([AVCaptureDevice class], @selector(defaultDeviceWithMediaType:),
                            @selector(orbit_defaultDeviceWithMediaType:));
    OrbitSwizzleClassMethod([AVCaptureDevice class],
                            @selector(defaultDeviceWithDeviceType:mediaType:position:),
                            @selector(orbit_defaultDeviceWithDeviceType:mediaType:position:));
    OrbitSwizzleClassMethod([AVCaptureDevice class], @selector(devicesWithMediaType:),
                            @selector(orbit_devicesWithMediaType:));
    OrbitSwizzleClassMethod([AVCaptureDevice class],
                            @selector(authorizationStatusForMediaType:),
                            @selector(orbit_authorizationStatusForMediaType:));
    OrbitSwizzleClassMethod([AVCaptureDevice class],
                            @selector(requestAccessForMediaType:completionHandler:),
                            @selector(orbit_requestAccessForMediaType:completionHandler:));
    OrbitSwizzleClassMethod([AVCaptureDeviceDiscoverySession class],
                            @selector(discoverySessionWithDeviceTypes:mediaType:position:),
                            @selector(orbit_discoverySessionWithDeviceTypes:mediaType:position:));
    OrbitSwizzleClassMethod([AVCaptureDeviceInput class],
                            @selector(deviceInputWithDevice:error:),
                            @selector(orbit_deviceInputWithDevice:error:));
    OrbitSwizzleInstanceMethod([AVCaptureDeviceInput class], @selector(initWithDevice:error:),
                               @selector(orbit_initWithDevice:error:));
    OrbitSwizzleInstanceMethod([AVCaptureSession class], @selector(canAddInput:),
                               @selector(orbit_canAddInput:));
    OrbitSwizzleInstanceMethod([AVCaptureSession class], @selector(addInput:),
                               @selector(orbit_addInput:));
    OrbitSwizzleInstanceMethod([AVCaptureSession class], @selector(canAddOutput:),
                               @selector(orbit_canAddOutput:));
    OrbitSwizzleInstanceMethod([AVCaptureSession class], @selector(addOutput:),
                               @selector(orbit_addOutput:));
    OrbitSwizzleInstanceMethod([AVCaptureSession class], @selector(startRunning),
                               @selector(orbit_startRunning));
    OrbitSwizzleInstanceMethod([AVCaptureSession class], @selector(stopRunning),
                               @selector(orbit_stopRunning));
    OrbitSwizzleInstanceMethod([AVCaptureSession class], @selector(isRunning),
                               @selector(orbit_isRunning));
    OrbitSwizzleInstanceMethod([AVCaptureVideoPreviewLayer class], @selector(setSession:),
                               @selector(orbit_setSession:));
    OrbitStartFramePump();
  }
}
