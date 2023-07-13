#import <CoreImage/CIFilter.h>
#import <CoreImage/CIVector.h>

#import "ProgressIndicatorView.h"

@implementation ProgressIndicatorView

- (instancetype)initWithFrame:(CGRect)frame
{
  if ((self = [super initWithFrame:frame])) {
    self.style = NSProgressIndicatorStyleBar;
    self.displayedWhenStopped = YES;
    [self setMinValue:0.0];
    [self setMaxValue:100.0];
  }
  return self;
}

- (void)startAnimating
{
  [self setWantsLayer:YES];
  [super startAnimation:self];
}

- (void)stopAnimating
{
  [super stopAnimation:self];
}

- (void)setActivityIndicatorViewStyle:(UIActivityIndicatorViewStyle)activityIndicatorViewStyle
{
  _activityIndicatorViewStyle = activityIndicatorViewStyle;

  switch (activityIndicatorViewStyle) {
    case UIActivityIndicatorViewStyleWhiteLarge:
      self.controlSize = NSControlSizeRegular;
      break;
    case UIActivityIndicatorViewStyleWhite:
      self.controlSize = NSControlSizeSmall;
      break;
    default:
      break;
  }
}

- (void)setColor:(RCTUIColor*)color
{
  if (_color != color) {
    _color = color;
    [self setNeedsDisplay:YES];
  }
}

- (void)updateLayer
{
  [super updateLayer];
  if (_color != nil) {
    CGFloat r, g, b, a;
    [[_color colorUsingColorSpace:[NSColorSpace genericRGBColorSpace]] getRed:&r green:&g blue:&b alpha:&a];

    CIFilter *colorPoly = [CIFilter filterWithName:@"CIColorPolynomial"];
    [colorPoly setDefaults];

    CIVector *redVector = [CIVector vectorWithX:r Y:0 Z:0 W:0];
    CIVector *greenVector = [CIVector vectorWithX:g Y:0 Z:0 W:0];
    CIVector *blueVector = [CIVector vectorWithX:b Y:0 Z:0 W:0];
    [colorPoly setValue:redVector forKey:@"inputRedCoefficients"];
    [colorPoly setValue:greenVector forKey:@"inputGreenCoefficients"];
    [colorPoly setValue:blueVector forKey:@"inputBlueCoefficients"];

    [[self layer] setFilters:@[colorPoly]];
  } else {
    [[self layer] setFilters:nil];
  }
}

- (void)setProgress:(double)progress
{
  if(self.indeterminate){
    [super setIndeterminate:NO];
  }

  [self setDoubleValue:progress];
  [self setNeedsDisplay:YES];
}

- (void)setIndeterminate:(BOOL)indeterminate
{
  [super setIndeterminate:indeterminate];
  if(indeterminate){
    [self startAnimating];
  }else{
    [self stopAnimating];
  }

}

@end
