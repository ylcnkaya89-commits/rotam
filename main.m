#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

@interface AppDelegate : NSObject <NSApplicationDelegate, NSWindowDelegate>
@property (strong, nonatomic) NSWindow *window;
@property (strong, nonatomic) WKWebView *webView;
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
    NSRect screenRect = [[NSScreen mainScreen] visibleFrame];
    CGFloat width = MIN(1360, screenRect.size.width * 0.92);
    CGFloat height = MIN(900, screenRect.size.height * 0.92);
    NSRect windowRect = NSMakeRect(
        (screenRect.size.width - width) / 2 + screenRect.origin.x,
        (screenRect.size.height - height) / 2 + screenRect.origin.y,
        width,
        height
    );

    self.window = [[NSWindow alloc] initWithContentRect:windowRect
                                              styleMask:(NSWindowStyleMaskTitled |
                                                         NSWindowStyleMaskClosable |
                                                         NSWindowStyleMaskMiniaturizable |
                                                         NSWindowStyleMaskResizable)
                                                backing:NSBackingStoreBuffered
                                                  defer:NO];

    [self.window setTitle:@"Rotam - Motosiklet & Araç Gezi Planlayıcı"];
    [self.window setBackgroundColor:[NSColor colorWithCalibratedRed:0.04 green:0.06 blue:0.1 alpha:1.0]];
    [self.window setMinSize:NSMakeSize(960, 640)];
    [self.window setDelegate:self];

    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    // Allow local file read, remote tile loading, and modern dev tools
    [config.preferences setValue:@YES forKey:@"developerExtrasEnabled"];
    [[config preferences] setValue:@YES forKey:@"allowFileAccessFromFileURLs"];
    [config setValue:@YES forKey:@"allowUniversalAccessFromFileURLs"];

    WKWebpagePreferences *webpagePreferences = [[WKWebpagePreferences alloc] init];
    webpagePreferences.allowsContentJavaScript = YES;
    config.defaultWebpagePreferences = webpagePreferences;

    self.webView = [[WKWebView alloc] initWithFrame:[[self.window contentView] bounds] configuration:config];
    [self.webView setAutoresizingMask:(NSViewWidthSizable | NSViewHeightSizable)];
    [self.webView setValue:@NO forKey:@"drawsBackground"];

    [[self.window contentView] addSubview:self.webView];

    // Path to index.html
    NSString *bundlePath = [[NSBundle mainBundle] resourcePath];
    NSString *indexPath = [bundlePath stringByAppendingPathComponent:@"index.html"];

    if (![[NSFileManager defaultManager] fileExistsAtPath:indexPath]) {
        NSString *currentDir = [[NSFileManager defaultManager] currentDirectoryPath];
        indexPath = [currentDir stringByAppendingPathComponent:@"index.html"];
        bundlePath = currentDir;
    }

    NSURL *fileURL = [NSURL fileURLWithPath:indexPath];
    NSURL *readAccessURL = [NSURL fileURLWithPath:bundlePath];

    [self.webView loadFileURL:fileURL allowingReadAccessToURL:readAccessURL];

    [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
    return YES;
}

@end

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSApplication *app = [NSApplication sharedApplication];
        AppDelegate *delegate = [[AppDelegate alloc] init];
        [app setDelegate:delegate];
        [app setActivationPolicy:NSApplicationActivationPolicyRegular];
        [app run];
    }
    return 0;
}
