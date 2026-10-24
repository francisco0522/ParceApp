#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(PassportTextRecognition, NSObject)
RCT_EXTERN_METHOD(recognize:(NSString *)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(deleteTemporaryFile:(NSString *)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
@end
