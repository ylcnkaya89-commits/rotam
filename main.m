#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

@interface AppDelegate : NSObject <NSApplicationDelegate, NSWindowDelegate, WKUIDelegate, WKNavigationDelegate>
@property (strong, nonatomic) NSWindow *window;
@property (strong, nonatomic) WKWebView *webView;
@property (strong, nonatomic) NSTask *serverTask;
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

    // Sunucuyu başlat (server.py)
    [self startPythonServer];

    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    [config.preferences setValue:@YES forKey:@"developerExtrasEnabled"];

    self.webView = [[WKWebView alloc] initWithFrame:[[self.window contentView] bounds] configuration:config];
    [self.webView setAutoresizingMask:(NSViewWidthSizable | NSViewHeightSizable)];
    [self.webView setValue:@NO forKey:@"drawsBackground"];
    
    // Delegate atamaları (Geolocation ve sayfa yükleme için)
    self.webView.UIDelegate = self;
    self.webView.navigationDelegate = self;

    [[self.window contentView] addSubview:self.webView];

    // Sunucunun ayağa kalkması için kısa bir süre bekleyip localhost'u yükle
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1.0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        NSURL *url = [NSURL URLWithString:@"http://127.0.0.1:8999"];
        [self.webView loadRequest:[NSURLRequest requestWithURL:url]];
    });

    [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];
}

- (void)startPythonServer {
    NSString *bundlePath = [[NSBundle mainBundle] resourcePath];
    NSString *serverPath = [bundlePath stringByAppendingPathComponent:@"server.py"];
    if (![[NSFileManager defaultManager] fileExistsAtPath:serverPath]) {
        serverPath = [[[NSFileManager defaultManager] currentDirectoryPath] stringByAppendingPathComponent:@"server.py"];
    }

    self.serverTask = [[NSTask alloc] init];
    [self.serverTask setLaunchPath:@"/usr/bin/env"];
    NSDictionary *env = [NSDictionary dictionaryWithObjectsAndKeys:@"1", @"ROTAM_NO_BROWSER", nil];
    [self.serverTask setEnvironment:env];
    [self.serverTask setArguments:@[@"python3", serverPath]];
    [self.serverTask launch];
}

// Geolocation izni için WKUIDelegate metodu
#if defined(__MAC_12_0) && __MAC_OS_X_VERSION_MAX_ALLOWED >= __MAC_12_0
- (void)webView:(WKWebView *)webView requestDeviceOrientationAndMotionPermissionForOrigin:(WKSecurityOrigin *)origin initiatedByFrame:(WKFrameInfo *)frame decisionHandler:(void (^)(WKPermissionDecision decision))decisionHandler {
    decisionHandler(WKPermissionDecisionGrant);
}
#endif

// Eski veya genel permission istekleri için (Eğer WKWebView destekliyorsa)
// Gerçekte MacOS üzerinde WKWebView konum izinlerini otomatik MacOS istemcisi üzerinden sorar.
// Eğer yükleme hatası olursa sayfayı tekrar yükle
- (void)webView:(WKWebView *)webView didFailProvisionalNavigation:(WKNavigation *)navigation withError:(NSError *)error {
    NSLog(@"Yükleme hatası: %@. 1 saniye sonra tekrar deneniyor...", error.localizedDescription);
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1.0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        NSURL *url = [NSURL URLWithString:@"http://127.0.0.1:8999"];
        [self.webView loadRequest:[NSURLRequest requestWithURL:url]];
    });
}

- (void)applicationWillTerminate:(NSNotification *)aNotification {
    if (self.serverTask && [self.serverTask isRunning]) {
        [self.serverTask terminate];
    }
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
        [app run];
    }
    return 0;
}
