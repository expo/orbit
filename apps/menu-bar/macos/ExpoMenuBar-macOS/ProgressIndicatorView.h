#import <React/RCTUIKit.h>

@interface ProgressIndicatorView : UIActivityIndicatorView

@property(nonatomic, assign) UIActivityIndicatorViewStyle activityIndicatorViewStyle;
@property(nullable, readwrite, nonatomic, strong) RCTUIColor *color;
- (void)startAnimating;
- (void)stopAnimating;

@end
