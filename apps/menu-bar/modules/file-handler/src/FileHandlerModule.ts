import { NativeModule, requireNativeModule } from 'expo';

import { FileHandlerModuleEvents } from './FileHandler.types';

declare class FileHandlerModule extends NativeModule<FileHandlerModuleEvents> {}

// This call loads the native module object from the JSI.
export default requireNativeModule<FileHandlerModule>('FileHandler');
