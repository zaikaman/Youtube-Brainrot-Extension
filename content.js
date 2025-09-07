// Content script for YouTube Brainrot Split Screen Extension

class YouTubeBrainrotSplitter {
  constructor() {
    this.isActive = false;
    this.allowAutoDeactivate = false; // Disable all auto-deactivation
    this.brainrotContainer = null;
    this.brainrotVideo = null;
    this.originalVideoContainer = null;
  this.leftClone = null;
  this.movedViaStream = false;
  this.movedOriginalVideoElement = null;
  this.movedOriginalVideoWasMuted = null;
  this.userManuallypausedVideo = false; // Track if user manually paused video
  this.exitCount = 0; // Track number of exits for DevTools trigger
    // Use local video file path
    this.brainrotUrls = [
      'brainrot-video.mp4' // Local video file in extension folder
    ];
    
    // Detect current domain
    this.currentDomain = window.location.hostname;
    this.isYouTube = this.currentDomain.includes('youtube.com');
    this.isFullstack = this.currentDomain.includes('fullstack.edu.vn');
    
    
    this.init();
  }

  init() {
    if (this.isYouTube) {
      this.initYouTube();
    } else if (this.isFullstack) {
      this.initFullstack();
    }
  }

  initYouTube() {
    // YouTube specific initialization - theater mode based
    // Listen for theater mode changes instead of fullscreen changes
    document.addEventListener('fullscreenchange', () => this.handleTheaterModeChange());
    document.addEventListener('webkitfullscreenchange', () => this.handleTheaterModeChange());
    document.addEventListener('mozfullscreenchange', () => this.handleTheaterModeChange());
    document.addEventListener('msfullscreenchange', () => this.handleTheaterModeChange());
    
    // Also listen for DOM changes that might indicate theater mode
    const theaterObserver = new MutationObserver(() => {
      this.handleTheaterModeChange();
    });
    
    // Observe changes to the ytd-watch-flexy element (main watch page element)
    const watchFlexy = document.querySelector('ytd-watch-flexy');
    const ytdApp = document.querySelector('ytd-app');
    const pageElement = document.querySelector('#page');
    const moviePlayer = document.querySelector('#movie_player');
    
    if (watchFlexy) {
      theaterObserver.observe(watchFlexy, {
        attributes: true,
        attributeFilter: ['theater', 'class']
      });
    }
    
    if (ytdApp) {
      theaterObserver.observe(ytdApp, {
        attributes: true,
        attributeFilter: ['theater', 'class']
      });
    }
    
    if (pageElement) {
      theaterObserver.observe(pageElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
    
    if (moviePlayer) {
      theaterObserver.observe(moviePlayer, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    // Listen for messages from background script
    try {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'checkFullscreen') {
          this.handleTheaterModeChange();
        }
      });
    } catch (error) {
      // Extension context may be invalidated, continue without background communication
      // Extension context may be invalidated, continue without background communication
    }

    // Create custom Split Mode button
    this.createSplitModeButton();

    // Setup escape handlers for YouTube
    this.setupEscapeHandlers();
  }

  initFullstack() {
    // Fullstack.edu.vn specific initialization - play video based
    
    // Setup escape handlers for Fullstack
    this.setupEscapeHandlers();
    
    // Setup video play detection
    this.setupFullstackVideoListener();
    
    // Initial check for existing videos
    setTimeout(() => {
      if (!this.userManuallyExited) {
        this.checkForFullstackVideos();
      }
    }, 1000);
  }

  setupEscapeHandlers() {
    // Handle Escape key to always restore layout when active (capture phase)
    this.escapeHandler = (e) => {
      if ((e.key === 'Escape' || e.key === 'Esc' || e.key === 'f' || e.key === 'F')) {
        // Check if we have split screen elements present instead of just isActive flag
        const hasSplitElements = document.querySelector('.brainrot-container') || 
                                 document.querySelector('.youtube-moved-container') ||
                                 document.body.classList.contains('brainrot-split-active');
        
        if (this.isActive || hasSplitElements) {
          e.preventDefault();
          e.stopPropagation();
          // Force deactivation and mark as manually exited
          this.isActive = true; // Ensure isActive is true so deactivate will run
          this.preventAutoDeactivate = false;
          this.userManuallyExited = true; // Prevent re-activation
          // Don't exit fullscreen here as it will trigger re-activation
          this.deactivateSplitScreen();
          return false;
        }
      }
    };
    // Use capture to catch key even if YouTube intercepts it
    document.addEventListener('keydown', this.escapeHandler, true);
    window.addEventListener('keydown', this.escapeHandler, true);
    
    // Also add keyup listener as backup
    this.escapeHandlerKeyup = (e) => {
      if ((e.key === 'Escape' || e.key === 'Esc' || e.key === 'f' || e.key === 'F')) {
        const hasSplitElements = document.querySelector('.brainrot-container') || 
                                 document.querySelector('.youtube-moved-container') ||
                                 document.body.classList.contains('brainrot-split-active');
        
        if (this.isActive || hasSplitElements) {
          e.preventDefault();
          e.stopPropagation();
          // Force deactivation and mark as manually exited
          this.isActive = true;
          this.preventAutoDeactivate = false;
          this.userManuallyExited = true; // Prevent re-activation
          this.deactivateSplitScreen();
          return false;
        }
      }
    };
    document.addEventListener('keyup', this.escapeHandlerKeyup, true);
  }

  setupFullstackVideoListener() {
    // Listen for video play events on Fullstack.edu.vn
    const handleVideoPlay = (e) => {
      if (e.target.tagName === 'VIDEO' && !this.isActive) {
        this.activateSplitScreen();
      } else {
      }
    };

    
    // Add event listener for video play
    document.addEventListener('play', handleVideoPlay, true);
    
    // Also listen for click events on video elements and YouTube iframes
    document.addEventListener('click', (e) => {
      
      // Check if clicked on YouTube iframe or its container
      const youtubeIframe = e.target.closest('iframe[src*="youtube.com"], iframe[src*="youtu.be"]') ||
                           document.querySelector('iframe[src*="youtube.com"], iframe[src*="youtu.be"]');
      
      if (youtubeIframe && !this.isActive) {
        setTimeout(() => this.activateSplitScreen(), 500);
        return;
      }
      
      // Original video logic
      if (e.target.tagName === 'VIDEO' || e.target.closest('video')) {
        setTimeout(() => {
          const video = e.target.tagName === 'VIDEO' ? e.target : e.target.closest('video');
          if (video && !video.paused && !this.isActive) {
            this.activateSplitScreen();
          }
        }, 100);
      }
    }, true);
    
    // Also use MutationObserver to catch dynamically added videos and iframes
    const videoObserver = new MutationObserver(() => {
      // Don't check if user manually exited
      if (!this.userManuallyExited) {
        this.checkForFullstackVideos();
      }
    });
    
    videoObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  checkForFullstackVideos() {
    // Check for existing playing videos
    const videos = document.querySelectorAll('video');
    
    // Also check for YouTube iframes (common on Fullstack.edu.vn)
    const youtubeIframes = document.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="youtu.be"]');
    
    // Don't auto-activate if user manually exited
    if (this.userManuallyExited) {
      return;
    }
    
    if (youtubeIframes.length > 0 && !this.isActive) {
      this.activateSplitScreen();
      return;
    }
    
    videos.forEach((video, index) => {
      
      if (!video.paused && !video.hasAttribute('data-brainrot-listener')) {
        video.setAttribute('data-brainrot-listener', 'true');
        if (!this.isActive) {
          this.activateSplitScreen();
        }
      }
    });
  }

  createSplitModeButton() {
    // Wait for YouTube player to load
    const checkForPlayer = () => {
      const rightControls = document.querySelector('.ytp-right-controls');
      if (rightControls && !document.querySelector('#brainrot-split-btn')) {
        // Create split mode button
        const splitBtn = document.createElement('button');
        splitBtn.id = 'brainrot-split-btn';
        splitBtn.className = 'ytp-button';
        splitBtn.setAttribute('title', 'Toggle Split Mode');
        splitBtn.setAttribute('aria-label', 'Toggle Split Mode');
        
        // Create button icon (split screen icon)
        splitBtn.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 4v16H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h4zm2 0h4v16h-4V4zm6 0h4c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2h-4V4z" opacity="0.9"/>
          </svg>
        `;
        
        splitBtn.style.cssText = `
          width: 48px !important;
          height: 48px !important;
          padding: 12px !important;
          margin: 0 !important;
          border: none !important;
          background: transparent !important;
          cursor: pointer !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.15s ease !important;
          opacity: 0.9 !important;
          color: white !important;
          border-radius: 0 !important;
          vertical-align: top !important;
          position: relative !important;
          transform: translateY(-1px) !important;
        `;
        
        // Add hover effect
        splitBtn.addEventListener('mouseenter', () => {
          splitBtn.style.backgroundColor = 'rgba(255,255,255,0.1)';
          splitBtn.style.opacity = '1';
        });
        
        splitBtn.addEventListener('mouseleave', () => {
          if (!this.isActive) {
            splitBtn.style.backgroundColor = 'transparent';
            splitBtn.style.opacity = '0.9';
          }
        });
        
        // Add click handler
        splitBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          
          if (!this.isActive) {
            this.userManuallyExited = false;
            this.activateSplitScreen();
            // Update button appearance
            splitBtn.style.backgroundColor = 'rgba(255,0,0,0.2)';
            splitBtn.style.opacity = '1';
            splitBtn.innerHTML = `
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 4v16H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h4zm2 0h4v16h-4V4zm6 0h4c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2h-4V4z" opacity="1"/>
                <circle cx="12" cy="12" r="2" fill="white"/>
              </svg>
            `;
          } else {
            this.userManuallyExited = true;
            this.deactivateSplitScreen();
            // Reset button appearance
            splitBtn.style.backgroundColor = 'transparent';
            splitBtn.style.opacity = '0.9';
            splitBtn.innerHTML = `
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 4v16H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h4zm2 0h4v16h-4V4zm6 0h4c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2h-4V4z" opacity="0.9"/>
              </svg>
            `;
          }
        });
        
        // Insert button into YouTube controls (before fullscreen button)
        const fullscreenBtn = rightControls.querySelector('.ytp-fullscreen-button');
        const settingsBtn = rightControls.querySelector('.ytp-settings-button');
        
        // Try to insert before fullscreen button, fallback to before settings, then append
        if (fullscreenBtn) {
          rightControls.insertBefore(splitBtn, fullscreenBtn);
        } else if (settingsBtn) {
          rightControls.insertBefore(splitBtn, settingsBtn);
        } else {
          rightControls.appendChild(splitBtn);
        }
        
        this.splitModeBtn = splitBtn;
      }
    };

    // Check immediately and set up observer for dynamic content
    checkForPlayer();
    
    // Use MutationObserver to catch when YouTube player loads
    const observer = new MutationObserver(() => {
      checkForPlayer();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also check periodically as backup
    this.playerCheckInterval = setInterval(checkForPlayer, 2000);
  }

  handleTheaterModeChange() {
    // This function is now mainly for cleanup when YouTube changes state
    // We don't auto-activate split mode anymore, only manual activation via button
    
    // Check if YouTube player is in theater mode (not fullscreen)
    const playerContainer = document.querySelector('#movie_player');
    const pageContainer = document.querySelector('#page') || document.querySelector('ytd-watch-flexy');
    const ytdApp = document.querySelector('ytd-app');
    
    // Theater mode is indicated by watch-wide class or theater attribute
    const isTheaterMode = (
      (pageContainer && pageContainer.classList.contains('watch-wide')) ||
      (pageContainer && pageContainer.hasAttribute('theater')) ||
      (ytdApp && ytdApp.hasAttribute('theater')) ||
      (document.querySelector('ytd-watch-flexy[theater]')) ||
      (document.querySelector('[theater]'))
    );


    // DISABLED: Only manual deactivation via Split Mode button allowed
    // Don't auto-deactivate split mode based on theater mode changes
    // Auto-deactivation is completely disabled via allowAutoDeactivate flag
    // if (!isTheaterMode && this.isActive && !this.preventAutoDeactivate && this.allowAutoDeactivate) {
    //   Deactivating split mode because left theater mode
    //   this.deactivateSplitScreen();
    // }

    // Notify background script (optional, may fail if context invalidated)
    try {
      chrome.runtime.sendMessage({
        action: 'fullscreenChanged',
        isFullscreen: isTheaterMode
      });
    } catch (error) {
      // Ignore errors - extension works without background communication
    }
  }

  activateSplitScreen() {
    if (this.isActive) return;

    
    // Clean up any leftover state from previous activation
    this.cleanupState();
    
    this.isActive = true;
    this.preventAutoDeactivate = true; // Prevent auto-deactivation during setup
    this.userManuallyExited = false; // Reset manual exit flag

    // Start monitoring for overlay creation
    // Disable overlay monitoring - it may be causing issues
    // this.startOverlayMonitoring();

    // No need to exit fullscreen since we're working with theater mode
    // Apply our custom layout directly
    this.applyCustomLayout();
    // Allow auto-deactivation after layout is applied
    setTimeout(() => {
      this.preventAutoDeactivate = false;
      
      // Ensure video is playing if it was playing before
      try {
        const video = this.movedOriginalVideoElement || document.querySelector('#movie_player video');
        if (video && video.readyState >= 2) { // HAVE_CURRENT_DATA
          // Try to resume playback if it was interrupted
          if (video.paused && video.currentTime > 0) {
            video.play().catch(() => {});
          }
        }
      } catch (e) {
      }
    }, 1000); // Increased delay to ensure everything is settled
  }

  cleanupState() {
    
    // Force cleanup any existing overlay elements that might be stuck
    const existingOverlays = document.querySelectorAll('.ytp-pause-overlay, .ytp-spinner, .ytp-gradient-bottom, .ytp-gradient-top, .brainrot-overlay');
    existingOverlays.forEach(overlay => {
      try {
        overlay.style.display = 'none !important';
        overlay.style.visibility = 'hidden !important';
        overlay.style.pointerEvents = 'none !important';
        overlay.remove();
      } catch (e) {}
    });
    
    // Clean up any stuck video placeholders
    const existingPlaceholders = document.querySelectorAll('.brainrot-video-placeholder, [data-brainrot-placeholder]');
    existingPlaceholders.forEach(placeholder => {
      try {
        placeholder.remove();
      } catch (e) {}
    });
    
    // Reset all container references
    this.originalVideoContainer = null;
    this.brainrotContainer = null;
    this.brainrotVideo = null;
    this.controlsOverlay = null;
    this.youtubeMovedContainer = null;
    this.movedVideoOriginalParent = null;
    this.movedVideoNextSibling = null;
    this.movedOriginalVideoElement = null;
    this.videoPlaceholder = null;
    
    // Clear any leftover intervals
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
      this.progressUpdateInterval = null;
    }
    
    if (this.videoStateMonitor) {
      clearInterval(this.videoStateMonitor);
      this.videoStateMonitor = null;
    }
    
    // CSS handles overlays now, no state to clear
    
    // Remove any leftover classes from body
    document.body.classList.remove('brainrot-split-active');
    
    // Clean up any leftover DOM elements
    const existingContainer = document.querySelector('.brainrot-container');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    const existingMoved = document.querySelector('.youtube-moved-container');
    if (existingMoved) {
      existingMoved.remove();
    }
    
    // Force restore original player container visibility
    const playerContainer = document.querySelector('#movie_player');
    if (playerContainer) {
      try {
        playerContainer.style.visibility = 'visible';
        playerContainer.style.pointerEvents = 'auto';
        playerContainer.style.removeProperty('visibility');
        playerContainer.style.removeProperty('pointer-events');
      } catch (e) {}
    }
    
  }

  preventYouTubeInterference(videoElement) {
    // Prevent YouTube from pausing or manipulating our moved video
    if (!videoElement) return;
    
    // Override pause/play methods to respect user actions
    const originalPause = videoElement.pause;
    const originalPlay = videoElement.play;
    
    videoElement.pause = function() {
      return originalPause.call(this);
    };
    
    videoElement.play = function() {
      return originalPlay.call(this);
    };
    
    // Monitor pause events but don't interfere with user actions
    videoElement.addEventListener('pause', (e) => {
      // Don't auto-resume if user manually paused
      if (this.userManuallypausedVideo) {
        // User manually paused - not interfering
      }
    }, true);
    
    videoElement.addEventListener('play', (e) => {
      // Reset manual pause flag when video starts playing
      if (this.userManuallypausedVideo) {
        this.userManuallypausedVideo = false;
      }
    }, true);
    
    // Monitor for YouTube trying to move the video back
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && this.isActive) {
          // Check if our video was removed from our container
          if (mutation.removedNodes) {
            for (let node of mutation.removedNodes) {
              if (node === videoElement) {
                // Re-append to our container
                setTimeout(() => {
                  if (this.youtubeMovedContainer && this.isActive) {
                    this.youtubeMovedContainer.appendChild(videoElement);
                  }
                }, 100);
              }
            }
          }
        }
      });
    });
    
    if (this.youtubeMovedContainer) {
      observer.observe(this.youtubeMovedContainer, { childList: true });
      observer.observe(document.body, { childList: true, subtree: true });
      
      // Store observer for cleanup
      this.mutationObserver = observer;
    }
  }

  applyCustomLayout() {
    // Handle different domains
    if (this.isFullstack) {
      this.applyFullstackLayout();
      return;
    }
    
    // Default YouTube layout
    // Find YouTube player container
    const playerContainer = document.querySelector('#movie_player') || 
                           document.querySelector('.html5-video-player');
    
    if (!playerContainer) {
      return;
    }

    this.originalVideoContainer = playerContainer;

    // Add split screen class to body
    document.body.classList.add('brainrot-split-active');

    // Save original inline style so we can restore it later
    try {
      playerContainer.__origStyle = playerContainer.getAttribute('style') || '';
    } catch (err) {
      playerContainer.__origStyle = '';
    }

    // Force the player to left 2/3 with inline styles
    playerContainer.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 66.6667vw !important;
      height: 100vh !important;
      z-index: 2147483646 !important;
      background: black !important;
    `;

    // Also directly style the native video element inside player to ensure visibility
    const nativeVideo = playerContainer.querySelector('video');
    if (nativeVideo) {
      // Instead of using captureStream (which has issues with pause/play),
      // we'll move the actual video element and create a placeholder
      try {
        // Save original parent for restore
        this.movedVideoOriginalParent = nativeVideo.parentElement;
        this.movedVideoNextSibling = nativeVideo.nextSibling;

        // Create moved container
        this.youtubeMovedContainer = document.createElement('div');
        this.youtubeMovedContainer.className = 'youtube-moved-container';
        this.youtubeMovedContainer.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 66.6667vw !important;
          height: 100vh !important;
          z-index: 2147483646 !important;
          background: black !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
        `;

        // Style video and append to moved container
        this.movedOriginalVideoElement = nativeVideo;
        
        // Save original video state before moving
        const wasPlaying = !nativeVideo.paused;
        const currentTime = nativeVideo.currentTime;
        const wasMuted = nativeVideo.muted;
        
        nativeVideo.style.cssText += `
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: relative !important;
          z-index: 2147483647 !important;
          pointer-events: auto !important;
        `;

        this.youtubeMovedContainer.appendChild(nativeVideo);
        document.body.appendChild(this.youtubeMovedContainer);

        // Restore video state after moving
        if (wasPlaying) {
          // Small delay to ensure video is ready
          setTimeout(() => {
            try {
              nativeVideo.currentTime = currentTime;
              nativeVideo.muted = wasMuted;
              nativeVideo.play().catch(() => {});
            } catch (e) {
            }
          }, 100);
        }

        // Add monitoring to ensure video element stays in our container
        // but don't auto-resume paused videos (respect user pause actions)
        this.videoStateMonitor = setInterval(() => {
          if (this.isActive && nativeVideo) {
            // Only ensure video element stays in our container
            // Don't auto-resume paused videos - let user control play/pause
            if (nativeVideo.parentElement !== this.youtubeMovedContainer) {
              this.youtubeMovedContainer.appendChild(nativeVideo);
              nativeVideo.currentTime = currentTime;
              // Don't auto-play when re-moving, respect current pause state
            }
          }
        }, 1000); // Check every second

        // Create a placeholder in the original position to maintain YouTube's structure
        this.videoPlaceholder = document.createElement('div');
        this.videoPlaceholder.className = 'brainrot-video-placeholder';
        this.videoPlaceholder.setAttribute('data-brainrot-placeholder', 'true');
        this.videoPlaceholder.style.cssText = `
          width: 100% !important;
          height: 100% !important;
          background: transparent !important;
          display: block !important;
          pointer-events: none !important;
          position: relative !important;
          z-index: 1 !important;
        `;
        
        if (this.movedVideoNextSibling) {
          this.movedVideoOriginalParent.insertBefore(this.videoPlaceholder, this.movedVideoNextSibling);
        } else {
          this.movedVideoOriginalParent.appendChild(this.videoPlaceholder);
        }

        // Hide original container to prevent conflicts but keep it functional
        try { 
          playerContainer.style.visibility = 'hidden';
          playerContainer.style.pointerEvents = 'none';
          
          // CSS handles overlay hiding, no need for JS manipulation
        } catch (err) {}

        // Prevent YouTube from interfering with our moved video
        this.preventYouTubeInterference(nativeVideo);

        this.movedViaStream = false; // We're moving the actual video, not using stream
        
      } catch (err) {
        console.error('Error moving native video:', err);
        // Fallback: just style the native video in place
        nativeVideo.style.cssText += `
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        `;
      }
    }

    // Hide other page elements
    this.hidePageElements();

    // Create brainrot container
    this.createBrainrotContainer();

    // Add a small restore button so user can exit split mode manually
    try {
      // Remove any existing restore button first
      if (this.restoreBtn) {
        try {
          this.restoreBtn.remove();
        } catch (e) {}
        this.restoreBtn = null;
      }

      this.restoreBtn = document.createElement('button');
      if (!this.restoreBtn) {
        console.error('brainrot: Failed to create button element');
        return;
      }

      this.restoreBtn.textContent = '✕ Exit Split';
      this.restoreBtn.setAttribute('type', 'button');
      this.restoreBtn.style.cssText = `
        position: fixed !important;
        top: 10px !important;
        right: 10px !important;
        z-index: 2147483677 !important;
        padding: 8px 12px !important;
        background: rgba(0,0,0,0.8) !important;
        color: white !important;
        border: 1px solid rgba(255,255,255,0.3) !important;
        border-radius: 6px !important;
        cursor: pointer !important;
        pointer-events: auto !important;
        font-size: 14px !important;
        font-family: Arial, sans-serif !important;
        font-weight: bold !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
        transition: all 0.2s ease !important;
      `;
      
      // Add hover effects
      this.restoreBtn.addEventListener('mouseenter', () => {
        if (this.restoreBtn) {
          this.restoreBtn.style.background = 'rgba(255,0,0,0.8)';
          this.restoreBtn.style.transform = 'scale(1.05)';
        }
      });
      
      this.restoreBtn.addEventListener('mouseleave', () => {
        if (this.restoreBtn) {
          this.restoreBtn.style.background = 'rgba(0,0,0,0.8)';
          this.restoreBtn.style.transform = 'scale(1)';
        }
      });
      
      this.restoreBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Force deactivation regardless of isActive state
        const hasSplitElements = document.querySelector('.brainrot-container') || 
                                 document.querySelector('.youtube-moved-container') ||
                                 document.body.classList.contains('brainrot-split-active');
        
        if (this.isActive || hasSplitElements) {
          this.isActive = true; // Ensure isActive is true so deactivate will run
          this.preventAutoDeactivate = false;
          this.userManuallyExited = true; // Prevent re-activation
          this.deactivateSplitScreen();
        } else {
        }
      });
      
      // Make sure the button is added after other elements
      setTimeout(() => {
        try {
          if (this.restoreBtn && document.body && this.restoreBtn instanceof Node) {
            document.body.appendChild(this.restoreBtn);
          } else {
            console.error('brainrot: Cannot add restoreBtn - validation failed', {
              hasButton: !!this.restoreBtn,
              hasBody: !!document.body,
              isNode: this.restoreBtn instanceof Node
            });
          }
        } catch (appendError) {
          console.error('brainrot: Error appending restoreBtn:', appendError);
        }
      }, 100);
    } catch (err) {
      console.error('Error creating restore button:', err);
    }

  // Attach hover handlers to show native controls on the left video
  try { this.attachHoverControls(); } catch (e) {}
  // Also set up a global mouse watcher as a fallback so hover works even if element listeners fail
  try { this._setupGlobalHoverWatcher(); } catch (e) {}

  }

  deactivateSplitScreen() {
    
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    this.preventAutoDeactivate = false; // Reset flag
    
    // Stop overlay monitoring
    this.stopOverlayMonitoring();
    
    // Do targeted cleanup for stuck overlays only, avoiding aggressive cleanup that causes black screen
    this.cleanupStuckOverlays();
    
    // Reset manual exit flag after some time to allow re-activation
    if (this.userManuallyExited) {
      setTimeout(() => {
        this.userManuallyExited = false;
      }, 3000); // 3 seconds
    }

    // Remove split screen class from body
    document.body.classList.remove('brainrot-split-active');

    // Clear video state monitor if exists
    if (this.videoStateMonitor) {
      clearInterval(this.videoStateMonitor);
      this.videoStateMonitor = null;
    }

    // Clear mutation observer if exists
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    // Clear overlay observer if exists
    if (this.overlayObserver) {
      this.overlayObserver.disconnect();
      this.overlayObserver = null;
    }
    
    // Clear overlay check interval if exists
    if (this.overlayCheckInterval) {
      clearInterval(this.overlayCheckInterval);
      this.overlayCheckInterval = null;
    }

    // Remove brainrot container
    if (this.brainrotContainer) {
      this.brainrotContainer.remove();
      this.brainrotContainer = null;
      this.brainrotVideo = null;
    }

    // Clean up controls overlay
    if (this.controlsOverlay) {
      try {
        if (this.progressUpdateInterval) {
          clearInterval(this.progressUpdateInterval);
          this.progressUpdateInterval = null;
        }
        this.controlsOverlay.remove();
        this.controlsOverlay = null;
      } catch (e) {}
    }

    // Restore original YouTube player styles
    if (this.originalVideoContainer) {
      try {
        // First restore visibility and pointer events
        this.originalVideoContainer.style.visibility = 'visible';
        this.originalVideoContainer.style.pointerEvents = 'auto';
        
        // CSS handles overlay visibility, no JS restore needed
        
        // Then restore original styles
        const orig = this.originalVideoContainer.__origStyle || '';
        if (orig) {
          this.originalVideoContainer.setAttribute('style', orig);
        } else {
          this.originalVideoContainer.removeAttribute('style');
        }
        delete this.originalVideoContainer.__origStyle;
      } catch (err) {
        console.error('Error restoring original container:', err);
        this.originalVideoContainer.style.cssText = '';
      }
    }

    // If we moved the native video element, move it back to its original parent
    if (this.youtubeMovedContainer) {
      try {
        const movedVideo = this.youtubeMovedContainer.querySelector('video');
        if (movedVideo && this.movedVideoOriginalParent) {
          // Save current state before moving back
          const wasPlaying = !movedVideo.paused;
          const currentTime = movedVideo.currentTime;
          const wasMuted = movedVideo.muted;
          
          // Restore original video styles
          try {
            const orig = movedVideo.__origStyle || '';
            if (orig) {
              movedVideo.setAttribute('style', orig);
            } else {
              movedVideo.removeAttribute('style');
            }
          } catch (e) {}
          
          // Move video back to original position
          if (this.movedVideoNextSibling) {
            this.movedVideoOriginalParent.insertBefore(movedVideo, this.movedVideoNextSibling);
          } else {
            this.movedVideoOriginalParent.appendChild(movedVideo);
          }
          
          // Restore video state after moving back
          setTimeout(() => {
            try {
              movedVideo.currentTime = currentTime;
              movedVideo.muted = wasMuted;
              if (wasPlaying) {
                movedVideo.play().catch(() => {});
              }
            } catch (e) {
            }
          }, 100);
          
          // Remove placeholder if it exists
          if (this.videoPlaceholder) {
            this.videoPlaceholder.remove();
            this.videoPlaceholder = null;
          }
        }
        
        this.youtubeMovedContainer.remove();
        this.youtubeMovedContainer = null;
        this.movedVideoOriginalParent = null;
        this.movedVideoNextSibling = null;
        this.movedOriginalVideoElement = null;
      } catch (err) {
        console.error('Error restoring video position:', err);
      }
    }

    // Restore hidden elements
    this.restorePageElements();

    // Domain-specific exit behavior
    if (this.isYouTube) {
      this.exitYouTubeMode();
    } else if (this.isFullstack) {
      this.exitFullstackMode();
    }

  // Keep escape key handler for the lifetime of the content script so it works on re-activate

  // Remove global hover watcher if present
  try { this._removeGlobalHoverWatcher(); } catch (e) {}

    // Remove restore button if present
    if (this.restoreBtn) {
      try { 
        if (this.restoreBtn.parentNode) {
          this.restoreBtn.parentNode.removeChild(this.restoreBtn);
        }
      } catch (err) {
        console.error('Error removing restore button:', err);
      }
      this.restoreBtn = null;
    }

    // Clean up escape handlers
    try {
      if (this.escapeHandler) {
        document.removeEventListener('keydown', this.escapeHandler, true);
        window.removeEventListener('keydown', this.escapeHandler, true);
      }
      if (this.escapeHandlerKeyup) {
        document.removeEventListener('keyup', this.escapeHandlerKeyup, true);
      }
    } catch (e) {}

  // Restore YouTube controls to original state
  try { this._restoreYTControls(); } catch (e) {}

  // Detach hover handlers
  try { this.detachHoverControls(); } catch (e) {}

    // Update split mode button appearance
    if (this.splitModeBtn) {
      this.splitModeBtn.style.backgroundColor = 'transparent';
      this.splitModeBtn.style.opacity = '0.9';
      this.splitModeBtn.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 4v16H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h4zm2 0h4v16h-4V4zm6 0h4c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2h-4V4z" opacity="0.9"/>
        </svg>
      `;
    }

    // Additional cleanup for any remaining stuck overlays
    setTimeout(() => {
      this.cleanupStuckOverlays();
    }, 100);

  }

  exitYouTubeMode() {
    // For YouTube - exit theater mode if currently in it
    try {
      const theaterBtn = document.querySelector('#movie_player .ytp-size-button');
      if (theaterBtn) {
        // Check if we're in theater mode and exit it
        const ytdApp = document.querySelector('ytd-app');
        const watchFlexy = document.querySelector('ytd-watch-flexy');
        const isCurrentlyTheater = (
          (ytdApp && ytdApp.hasAttribute('theater')) ||
          (watchFlexy && watchFlexy.hasAttribute('theater'))
        );
        if (isCurrentlyTheater) {
          // Set flag before clicking to prevent re-activation
          this.userManuallyExited = true;
          try { 
            theaterBtn.click(); 
          } catch (e) {}
        }
      }
    } catch (e) {
    }
  }

  exitFullstackMode() {
    // For Fullstack.edu.vn - restore iframe to original position
    try {
      
      // Find and restore YouTube iframe
      const youtubeIframe = document.querySelector('iframe[src*="youtube.com"], iframe[src*="youtu.be"]');
      if (youtubeIframe) {
        // Remove our custom styles to restore original iframe position
        youtubeIframe.removeAttribute('style');
      }
      
      // Don't need to do anything special for videos since they're in iframe
    } catch (e) {
    }
  }

  createBrainrotContainer() {
    // Remove existing container if any
    if (this.brainrotContainer) {
      this.brainrotContainer.remove();
    }

    // Create container
    this.brainrotContainer = document.createElement('div');
    this.brainrotContainer.className = 'brainrot-container';

    // Create a wrapper div for better control
    const videoWrapper = document.createElement('div');
    videoWrapper.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: black;
      position: relative;
      overflow: hidden;
    `;

    // Create HTML5 video element instead of iframe
    this.brainrotVideo = document.createElement('video');
    this.brainrotVideo.className = 'brainrot-video';
    
    // Use local video file
    this.brainrotVideo.src = chrome.runtime.getURL('brainrot-video.mp4');
    this.brainrotVideo.autoplay = true;
    this.brainrotVideo.muted = true;
    this.brainrotVideo.loop = true;
    this.brainrotVideo.controls = false;
    this.brainrotVideo.playsInline = true;
    
    this.brainrotVideo.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
      border: none;
    `;

    // Try to play immediately
    this.brainrotVideo.play().catch(error => {
    });

    // Create click overlay for fallback if autoplay fails
    const clickOverlay = document.createElement('div');
    clickOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10;
      color: white;
      font-size: 24px;
      font-family: Arial, sans-serif;
    `;
    clickOverlay.innerHTML = '▶ Click to play';

    // Show overlay if video fails to autoplay
    this.brainrotVideo.addEventListener('pause', () => {
      if (this.brainrotVideo && !this.brainrotVideo.ended) {
        clickOverlay.style.display = 'flex';
      }
    });

    this.brainrotVideo.addEventListener('play', () => {
      if (clickOverlay) {
        clickOverlay.style.display = 'none';
      }
    });

    // Handle click to start video
    clickOverlay.addEventListener('click', () => {
      this.brainrotVideo.play();
    });

    videoWrapper.appendChild(this.brainrotVideo);
    videoWrapper.appendChild(clickOverlay);
    this.brainrotContainer.appendChild(videoWrapper);

    // Add container to page
    document.body.appendChild(this.brainrotContainer);
  }

  hidePageElements() {
    // Hide YouTube UI elements that we don't need
    const elementsToHide = [
      '#masthead',
      '#secondary', 
      '#primary:not(#movie_player)',
      '.ytp-chrome-top',
      '.ytp-chrome-bottom'
    ];

    elementsToHide.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.display = 'none';
      });
    });
  }

  restorePageElements() {
    // Restore hidden elements
    const elementsToRestore = [
      '#masthead',
      '#secondary',
      '#primary',
      '.ytp-chrome-top',
      '.ytp-chrome-bottom'
    ];

    elementsToRestore.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.display = '';
      });
    });
  }

  attachHoverControls() {
    // Remove previous handlers if any
    this.detachHoverControls();

    this._hoverEnter = () => {
      try {
        
        // Create controls overlay if we have moved container
        if (this.youtubeMovedContainer && !this.controlsOverlay) {
          this.createControlsOverlay();
        }
        
        // Show controls overlay
        if (this.controlsOverlay) {
          this.controlsOverlay.style.display = 'flex';
        }

        // Show YouTube controls for moved video case
        this._toggleYTControls(true);
        
      } catch (err) {
        console.error('Error in hoverEnter:', err);
      }
    };

    this._hoverLeave = () => {
      try {
        
        // Hide controls overlay
        if (this.controlsOverlay) {
          this.controlsOverlay.style.display = 'none';
        }

        // Hide YouTube UI to keep the layout clean
        this._toggleYTControls(false);
        
      } catch (err) {
        console.error('Error in hoverLeave:', err);
      }
    };

    // We rely on the global mouse watcher to detect entering/leaving the left split area.
    this._hoverTarget = null;
  }

  detachHoverControls() {
    try {
      if (this._hoverTarget) {
        try { this._hoverTarget.removeEventListener('mouseenter', this._hoverEnter); } catch (e) {}
        try { this._hoverTarget.removeEventListener('mouseleave', this._hoverLeave); } catch (e) {}
      }
    } catch (e) {}
    this._hoverTarget = null;
    this._hoverEnter = null;
    this._hoverLeave = null;
  }

  _startLeftHoverTracking() {
    // Track mouse position; if leaves the left area, trigger hoverLeave restoration
    if (this._docMouseMove) return;
  this._docMouseMove = (e) => {
      try {
        const leftWidth = Math.round(window.innerWidth * 2 / 3);
        if (e.clientX > leftWidth || e.clientY < 0 || e.clientY > window.innerHeight) {
          // Simulate leave
      this._hoverLeave && this._hoverLeave();
        }
      } catch (err) {}
    };
    try { document.addEventListener('mousemove', this._docMouseMove, true); } catch (e) {}
  }

  _setupGlobalHoverWatcher() {
    // If already present, skip
    if (this._globalWatcher) return;
    
    this._globalWatcher = (e) => {
      try {
        const leftWidth = Math.round(window.innerWidth * 2 / 3);
        const isInLeftArea = e.clientX <= leftWidth && e.clientY >= 0 && e.clientY <= window.innerHeight;
        
        // If cursor is within left split area, trigger hoverEnter; otherwise trigger hoverLeave
        if (isInLeftArea) {
          if (!this._globalInsideLeft) {
            this._globalInsideLeft = true;
            this._hoverEnter && this._hoverEnter();
          }
        } else {
          if (this._globalInsideLeft) {
            this._globalInsideLeft = false;
            this._hoverLeave && this._hoverLeave();
          }
        }
      } catch (err) {
        console.error('Error in global hover watcher:', err);
      }
    };
    
    // Use both mousemove and mouseover for better detection
    try { 
      document.addEventListener('mousemove', this._globalWatcher, true); 
      document.addEventListener('mouseover', this._globalWatcher, true);
    } catch (e) {}
  }

  _removeGlobalHoverWatcher() {
    try { 
      if (this._globalWatcher) {
        document.removeEventListener('mousemove', this._globalWatcher, true);
        document.removeEventListener('mouseover', this._globalWatcher, true);
      }
    } catch (e) {}
    this._globalWatcher = null;
    this._globalInsideLeft = false;
  }

  _stopLeftHoverTracking() {
    try { if (this._docMouseMove) document.removeEventListener('mousemove', this._docMouseMove, true); } catch (e) {}
    this._docMouseMove = null;
  }

  // Show or hide YouTube's own controls while hovering the left video
  _toggleYTControls(show) {
    try {
      const selectors = [
        '.ytp-chrome-top', 
        '.ytp-chrome-bottom', 
        '.ytp-gradient-top', 
        '.ytp-gradient-bottom',
        '.ytp-progress-bar-container',
        '.ytp-chrome-controls'
      ];
      
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          // Use !important to override stylesheet rules that hide these bars
          const value = show ? 'block' : 'none';
          try { 
            el.style.setProperty('display', value, 'important'); 
            if (show) {
              el.style.setProperty('opacity', '1', 'important');
              el.style.setProperty('visibility', 'visible', 'important');
              el.style.setProperty('pointer-events', 'auto', 'important');
              el.style.setProperty('z-index', '2147483681', 'important');
            }
          } catch (_) { 
            el.style.display = value; 
          }
        });
      });

      // Also ensure the player itself can receive hover events
      const player = document.querySelector('#movie_player');
      if (player && show) {
        player.style.setProperty('pointer-events', 'auto', 'important');
        // Remove autohide class to force show controls
        player.classList.remove('ytp-autohide');
        // Force the player to show controls
        player.classList.add('ytp-chrome-controls-visible');
      } else if (player && !show) {
        player.classList.remove('ytp-chrome-controls-visible');
      }
    } catch (e) {
      console.error('Error toggling YT controls:', e);
    }
  }

  // Restore YouTube controls to their original state
  _restoreYTControls() {
    try {
      
      // Remove all our custom style overrides
      const selectors = [
        '.ytp-chrome-top', 
        '.ytp-chrome-bottom', 
        '.ytp-gradient-top', 
        '.ytp-gradient-bottom',
        '.ytp-progress-bar-container',
        '.ytp-chrome-controls'
      ];
      
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          try {
            // Remove all our custom style properties
            el.style.removeProperty('display');
            el.style.removeProperty('opacity');
            el.style.removeProperty('visibility');
            el.style.removeProperty('pointer-events');
            el.style.removeProperty('z-index');
          } catch (e) {}
        });
      });

      // Restore player original behavior
      const player = document.querySelector('#movie_player');
      if (player) {
        try {
          player.style.removeProperty('pointer-events');
          player.classList.remove('ytp-chrome-controls-visible');
          // Let YouTube handle autohide naturally
        } catch (e) {}
      }
      
    } catch (e) {
      console.error('Error restoring YT controls:', e);
    }
  }

  // Force YouTube controls to be visible
  _forceShowYTControls() {
    try {
      const player = document.querySelector('#movie_player');
      if (player) {
        // Simulate mouse movement over the player to trigger control visibility
        const mouseEvent = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: 100,
          clientY: 100
        });
        player.dispatchEvent(mouseEvent);
        
        // Also try triggering mouseenter on the player
        const enterEvent = new MouseEvent('mouseenter', {
          bubbles: true,
          cancelable: true
        });
        player.dispatchEvent(enterEvent);
        
        // Force remove autohide classes
        player.classList.remove('ytp-autohide');
        player.classList.add('ytp-user-active');
        
        // Force show all control elements
        const controlElements = player.querySelectorAll('.ytp-chrome-top, .ytp-chrome-bottom, .ytp-chrome-controls, .ytp-progress-bar-container');
        controlElements.forEach(el => {
          el.style.setProperty('display', 'block', 'important');
          el.style.setProperty('opacity', '1', 'important');
          el.style.setProperty('visibility', 'visible', 'important');
          el.style.setProperty('pointer-events', 'auto', 'important');
          el.style.setProperty('z-index', '2147483682', 'important');
        });
        
      }
    } catch (e) {
      console.error('Error force showing YT controls:', e);
    }
  }

  // Create custom controls overlay
  createControlsOverlay() {
    try {
      if (this.controlsOverlay) return;

      this.controlsOverlay = document.createElement('div');
      this.controlsOverlay.className = 'brainrot-controls-overlay';
      this.controlsOverlay.style.cssText = `
        position: absolute !important;
        bottom: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: auto !important;
        z-index: 2147483680 !important;
        display: none !important;
        flex-direction: column !important;
        justify-content: flex-end !important;
        pointer-events: none !important;
        background: linear-gradient(transparent, rgba(0,0,0,0.8)) !important;
        padding-top: 40px !important;
      `;

      // Create bottom controls bar
      const bottomControls = document.createElement('div');
      bottomControls.style.cssText = `
        display: flex !important;
        align-items: center !important;
        padding: 12px 15px !important;
        background: rgba(0,0,0,0.9) !important;
        pointer-events: auto !important;
        gap: 12px !important;
        border-top: 1px solid rgba(255,255,255,0.1) !important;
      `;

      // Play/Pause button
      const playBtn = document.createElement('button');
      playBtn.innerHTML = '▶️';
      playBtn.style.cssText = `
        background: transparent !important;
        border: none !important;
        color: white !important;
        font-size: 20px !important;
        cursor: pointer !important;
        padding: 8px !important;
        pointer-events: auto !important;
        border-radius: 4px !important;
        transition: background 0.2s !important;
      `;
      
      playBtn.addEventListener('mouseenter', () => {
        playBtn.style.background = 'rgba(255,255,255,0.1)';
      });
      
      playBtn.addEventListener('mouseleave', () => {
        playBtn.style.background = 'transparent';
      });
      
      playBtn.addEventListener('click', () => {
        try {
          const video = this.movedOriginalVideoElement || document.querySelector('#movie_player video');
          
          if (video) {
            if (video.paused) {
              video.play().then(() => {
              playBtn.innerHTML = '⏸️';
              }).catch(e => {
                console.error('Play failed:', e);
              });
            } else {
              video.pause();
              playBtn.innerHTML = '▶️';
              // Mark that user manually paused to prevent auto-resume
              this.userManuallypausedVideo = true;
              setTimeout(() => {
                this.userManuallypausedVideo = false;
              }, 5000); // Clear flag after 5 seconds
            }
          }
        } catch (e) {
          console.error('Error toggling play/pause:', e);
        }
      });

      // Volume control
      const volumeBtn = document.createElement('button');
      volumeBtn.innerHTML = '🔊';
      volumeBtn.style.cssText = `
        background: transparent !important;
        border: none !important;
        color: white !important;
        font-size: 18px !important;
        cursor: pointer !important;
        padding: 8px !important;
        pointer-events: auto !important;
        border-radius: 4px !important;
        transition: background 0.2s !important;
      `;
      
      volumeBtn.addEventListener('mouseenter', () => {
        volumeBtn.style.background = 'rgba(255,255,255,0.1)';
      });
      
      volumeBtn.addEventListener('mouseleave', () => {
        volumeBtn.style.background = 'transparent';
      });
      
      volumeBtn.addEventListener('click', () => {
        try {
          const video = this.movedOriginalVideoElement || document.querySelector('#movie_player video');
          if (video) {
            video.muted = !video.muted;
            volumeBtn.innerHTML = video.muted ? '🔇' : '🔊';
          }
        } catch (e) {}
      });

      // Progress bar
      const progressContainer = document.createElement('div');
      progressContainer.style.cssText = `
        flex: 1 !important;
        height: 6px !important;
        background: rgba(255,255,255,0.3) !important;
        cursor: pointer !important;
        margin: 0 15px !important;
        pointer-events: auto !important;
        position: relative !important;
        border-radius: 3px !important;
      `;

      const progressBar = document.createElement('div');
      progressBar.style.cssText = `
        height: 100% !important;
        background: #ff0000 !important;
        width: 0% !important;
        pointer-events: none !important;
        border-radius: 3px !important;
        transition: width 0.1s ease !important;
      `;

      progressContainer.appendChild(progressBar);

      progressContainer.addEventListener('click', (e) => {
        try {
          const video = this.movedOriginalVideoElement || document.querySelector('#movie_player video');
          
          if (video && video.duration) {
            const rect = progressContainer.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const newTime = percent * video.duration;
            video.currentTime = newTime;
          }
        } catch (e) {
          console.error('Error seeking video:', e);
        }
      });

      // Time display
      const timeDisplay = document.createElement('div');
      timeDisplay.style.cssText = `
        color: white !important;
        font-size: 14px !important;
        font-family: Arial, sans-serif !important;
        white-space: nowrap !important;
        pointer-events: none !important;
      `;
      timeDisplay.textContent = '0:00 / 0:00';

      // Update progress bar and time display
      this.progressUpdateInterval = setInterval(() => {
        try {
          const video = this.movedOriginalVideoElement || document.querySelector('#movie_player video');
          
          if (video && video.duration) {
            const percent = (video.currentTime / video.duration) * 100;
            progressBar.style.width = percent + '%';
            
            // Update time display
            const currentMin = Math.floor(video.currentTime / 60);
            const currentSec = Math.floor(video.currentTime % 60);
            const durationMin = Math.floor(video.duration / 60);
            const durationSec = Math.floor(video.duration % 60);
            timeDisplay.textContent = `${currentMin}:${currentSec.toString().padStart(2, '0')} / ${durationMin}:${durationSec.toString().padStart(2, '0')}`;
            
            // Update button states and detect user pause via YouTube controls
            if (video.paused && playBtn.innerHTML === '⏸️') {
              // Video was paused but our button still shows pause - user paused via YouTube controls
              this.userManuallypausedVideo = true;
              setTimeout(() => {
                this.userManuallypausedVideo = false;
              }, 5000); // Clear flag after 5 seconds
            }
            
            playBtn.innerHTML = video.paused ? '▶️' : '⏸️';
            volumeBtn.innerHTML = video.muted ? '🔇' : '🔊';
          }
        } catch (e) {}
      }, 200);

      // Fullscreen button
      const fullscreenBtn = document.createElement('button');
      fullscreenBtn.innerHTML = '⛶';
      fullscreenBtn.style.cssText = `
        background: transparent !important;
        border: none !important;
        color: white !important;
        font-size: 18px !important;
        cursor: pointer !important;
        padding: 8px !important;
        pointer-events: auto !important;
        border-radius: 4px !important;
        transition: background 0.2s !important;
      `;
      
      fullscreenBtn.addEventListener('mouseenter', () => {
        fullscreenBtn.style.background = 'rgba(255,255,255,0.1)';
      });
      
      fullscreenBtn.addEventListener('mouseleave', () => {
        fullscreenBtn.style.background = 'transparent';
      });
      
      fullscreenBtn.addEventListener('click', () => {
        try {
          this.deactivateSplitScreen();
        } catch (e) {}
      });

      bottomControls.appendChild(playBtn);
      bottomControls.appendChild(volumeBtn);
      bottomControls.appendChild(progressContainer);
      bottomControls.appendChild(timeDisplay);
      bottomControls.appendChild(fullscreenBtn);

      this.controlsOverlay.appendChild(bottomControls);
      this.youtubeMovedContainer.appendChild(this.controlsOverlay);

    } catch (e) {
      console.error('Error creating controls overlay:', e);
    }
  }

  // Set up synchronization between original video and clone
  _setupVideoSync() {
    try {
      if (!this.movedOriginalVideoElement || !this.leftClone) return;

      const originalVideo = this.movedOriginalVideoElement;
      const cloneVideo = this.leftClone;

      // Sync events from original to clone
      const syncEvents = ['play', 'pause', 'seeking', 'seeked', 'timeupdate'];
      
      syncEvents.forEach(event => {
        originalVideo.addEventListener(event, () => {
          try {
            if (event === 'play' && cloneVideo.paused) {
              cloneVideo.currentTime = originalVideo.currentTime;
              cloneVideo.play();
            } else if (event === 'pause' && !cloneVideo.paused) {
              cloneVideo.pause();
            } else if (event === 'seeking' || event === 'seeked') {
              cloneVideo.currentTime = originalVideo.currentTime;
            }
          } catch (e) {
          }
        });
      });

      // Regular sync check
      this._syncInterval = setInterval(() => {
        try {
          if (originalVideo && cloneVideo) {
            // Sync time if they're out of sync by more than 0.3 seconds
            if (Math.abs(cloneVideo.currentTime - originalVideo.currentTime) > 0.3) {
              cloneVideo.currentTime = originalVideo.currentTime;
            }
            
            // Sync play/pause state
            if (originalVideo.paused && !cloneVideo.paused) {
              cloneVideo.pause();
            } else if (!originalVideo.paused && cloneVideo.paused) {
              cloneVideo.currentTime = originalVideo.currentTime;
              cloneVideo.play();
            }
          }
        } catch (e) {}
      }, 500);

    } catch (e) {
      console.error('Error setting up video sync:', e);
    }
  }

  // Clean up video sync
  _cleanupVideoSync() {
    try {
      if (this._syncInterval) {
        clearInterval(this._syncInterval);
        this._syncInterval = null;
      }
    } catch (e) {}
  }
  _fallbackMoveNativeVideo(nativeVideo) {
    try {
      // clear any left clone check timer
      try { if (this._leftCloneCheckTimer) { clearTimeout(this._leftCloneCheckTimer); this._leftCloneCheckTimer = null; } } catch (e) {}

      // stop and remove clone if present
      try {
        if (this.leftClone && this.leftClone.srcObject) {
          const tracks = (this.leftClone.srcObject.getTracks && this.leftClone.srcObject.getTracks()) || [];
          tracks.forEach(t => { try { t.stop(); } catch (e) {} });
        }
      } catch (e) {}
      try { if (this.leftClone) { this.leftClone.remove(); } } catch (e) {}
      this.leftClone = null;

      // ensure any clone container is removed
      try { if (this.youtubeMovedContainer) { this.youtubeMovedContainer.remove(); this.youtubeMovedContainer = null; } } catch (e) {}

      // Prepare to move the native video element
      try {
        this.movedVideoOriginalParent = nativeVideo.parentElement;
        this.movedVideoNextSibling = nativeVideo.nextSibling;

        this.youtubeMovedContainer = document.createElement('div');
        this.youtubeMovedContainer.className = 'youtube-moved-container';
        this.youtubeMovedContainer.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 50vw !important;
          height: 100vh !important;
          z-index: 2147483646 !important;
          background: black !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          overflow: hidden !important;
        `;

        nativeVideo.style.cssText += `
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: relative !important;
          z-index: 2147483647 !important;
          pointer-events: auto !important;
        `;

        this.youtubeMovedContainer.appendChild(nativeVideo);
        document.body.appendChild(this.youtubeMovedContainer);

        // hide original player container to avoid duplicates
        try { if (this.originalVideoContainer) this.originalVideoContainer.style.visibility = 'hidden'; } catch (e) {}
      } catch (e) {
        // nothing else we can do
      }

      // flag as not using stream clone so deactivate uses move-native restore
      this.movedViaStream = false;
    } catch (err) {
      // swallow
    }
  }

  applyFullstackLayout() {
    
    // Find YouTube iframe
    const youtubeIframe = document.querySelector('iframe[src*="youtube.com"], iframe[src*="youtu.be"]');
    if (!youtubeIframe) {
      return;
    }

    
    // Add split screen class to body
    document.body.classList.add('brainrot-split-active');

    // Style the iframe to left 2/3
    youtubeIframe.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 66.6667vw !important;
      height: 100vh !important;
      z-index: 2147483646 !important;
      background: black !important;
    `;

    // Store reference for cleanup
    this.originalVideoContainer = youtubeIframe;

    // Hide other page elements
    this.hidePageElements();

    // Create brainrot container on the right
    this.createBrainrotContainer();

    // Ensure exit button is created for Fullstack
    this.createExitButton();

  }

  createExitButton() {
    
    // Remove existing button if any
    if (this.restoreBtn) {
      try {
        this.restoreBtn.remove();
      } catch (e) {}
      this.restoreBtn = null;
    }

    // Create exit button
    this.restoreBtn = document.createElement('button');
    this.restoreBtn.textContent = '✕ Exit Split';
    this.restoreBtn.setAttribute('type', 'button');
    this.restoreBtn.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      z-index: 2147483699 !important;
      padding: 12px 16px !important;
      background: rgba(0,0,0,0.9) !important;
      color: white !important;
      border: 2px solid rgba(255,255,255,0.5) !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      pointer-events: auto !important;
      font-size: 16px !important;
      font-family: Arial, sans-serif !important;
      font-weight: bold !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.7) !important;
      transition: all 0.2s ease !important;
    `;

    // Add hover effects
    this.restoreBtn.addEventListener('mouseenter', () => {
      if (this.restoreBtn) {
        this.restoreBtn.style.background = 'rgba(255,0,0,0.9)';
        this.restoreBtn.style.transform = 'scale(1.1)';
        this.restoreBtn.style.borderColor = 'white';
      }
    });

    this.restoreBtn.addEventListener('mouseleave', () => {
      if (this.restoreBtn) {
        this.restoreBtn.style.background = 'rgba(0,0,0,0.9)';
        this.restoreBtn.style.transform = 'scale(1)';
        this.restoreBtn.style.borderColor = 'rgba(255,255,255,0.5)';
      }
    });

    // Add click handler
    this.restoreBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Force deactivation even if isActive is false
      this.isActive = true;
      this.userManuallyExited = true;
      this.preventAutoDeactivate = false;
      
      this.deactivateSplitScreen();
    });

    // Add to body
    document.body.appendChild(this.restoreBtn);
  }

  startOverlayMonitoring() {
    console.log('🔍 Starting overlay monitoring...');
    
    // First, scan for ALL possible overlays to understand what's there
    const allPossibleOverlays = document.querySelectorAll('#movie_player [class*="overlay"], #movie_player [class*="spinner"], #movie_player [class*="pause"], #movie_player [class*="ytp"]');
    console.log('🔍 SCAN: Found', allPossibleOverlays.length, 'possible overlay elements in movie_player');
    
    // Log what we found for debugging
    allPossibleOverlays.forEach((el, i) => {
      if (i < 10) { // Only log first 10 to avoid spam
        console.log(`  ${i+1}. ${el.tagName}.${el.className || el.classList.toString()} - display:${getComputedStyle(el).display}, visibility:${getComputedStyle(el).visibility}`);
      }
    });
    
    // Now target specific known YouTube overlays + suspected overlay elements + potential black overlay
    const existingOverlays = document.querySelectorAll('.ytp-pause-overlay, .ytp-spinner, .ytp-cued-thumbnail-overlay-image, .ytp-endscreen-content, .ytp-videowall-still, .video-stream.html5-main-video, .ytp-cards-teaser-box, .branding-context-container-outer, .ytp-iv-video-content');
    console.log('📋 Found existing YouTube overlays:', existingOverlays.length);
    let hiddenCount = 0;
    existingOverlays.forEach(overlay => {
      // Special handling for video element - don't hide it, just fix positioning
      if (overlay.classList && overlay.classList.contains('html5-main-video')) {
        if (getComputedStyle(overlay).position === 'absolute') {
          console.log('🎥 Fixing video positioning:', overlay.className || overlay.classList.toString());
          overlay.style.position = 'static !important';
          overlay.style.pointerEvents = 'auto !important';
          hiddenCount++;
        }
      } else if (overlay.style.display !== 'none') {
        console.log('🚫 Hiding overlay:', overlay.className || overlay.classList.toString());
        overlay.style.display = 'none !important';
        overlay.style.visibility = 'hidden !important';
        overlay.style.pointerEvents = 'none !important';
        overlay.style.opacity = '0 !important';
        hiddenCount++;
      }
    });
    if (hiddenCount > 0) console.log('✅ Hidden', hiddenCount, 'existing overlays');
    
    // Monitor for both DOM changes AND attribute changes (style changes)
    this.overlayObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (this.isActive) {
          // Monitor new elements being added
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // Check if this is a critical YouTube overlay or video element
                if (node.classList && (
                  node.classList.contains('ytp-pause-overlay') ||
                  node.classList.contains('ytp-spinner') ||
                  node.classList.contains('ytp-cued-thumbnail-overlay-image') ||
                  node.classList.contains('ytp-endscreen-content') ||
                  node.classList.contains('ytp-videowall-still')
                )) {
                  console.log('🆕 NEW overlay element:', node.className || node.classList.toString());
                  // Immediately hide it
                  node.style.display = 'none !important';
                  node.style.visibility = 'hidden !important';
                  node.style.pointerEvents = 'none !important';
                  node.style.opacity = '0 !important';
                } else if (node.classList && node.classList.contains('html5-main-video')) {
                  console.log('🎥 NEW video element:', node.className || node.classList.toString());
                  // Fix positioning if needed
                  if (getComputedStyle(node).position === 'absolute') {
                    node.style.position = 'static !important';
                    node.style.pointerEvents = 'auto !important';
                  }
                }
                
                // Also check child elements for critical overlays only
                const overlayChildren = node.querySelectorAll && node.querySelectorAll('.ytp-pause-overlay, .ytp-spinner, .ytp-cued-thumbnail-overlay-image, .ytp-endscreen-content, .ytp-videowall-still');
                if (overlayChildren && overlayChildren.length > 0) {
                  overlayChildren.forEach(overlay => {
                    console.log('🆕 NEW child overlay:', overlay.className || overlay.classList.toString());
                    overlay.style.display = 'none !important';
                    overlay.style.visibility = 'hidden !important';
                    overlay.style.pointerEvents = 'none !important';
                    overlay.style.opacity = '0 !important';
                  });
                }
              }
            });
          }
          
          // Monitor attribute changes (like style changes that make overlays visible)
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const target = mutation.target;
            if (target.classList && (
              target.classList.contains('ytp-pause-overlay') ||
              target.classList.contains('ytp-spinner') ||
              target.classList.contains('ytp-cued-thumbnail-overlay-image') ||
              target.classList.contains('ytp-endscreen-content') ||
              target.classList.contains('ytp-videowall-still')
            )) {
              console.log('🔄 STYLE change on overlay:', target.className || target.classList.toString());
              // Force hide it again
              target.style.display = 'none !important';
              target.style.visibility = 'hidden !important';
              target.style.pointerEvents = 'none !important';
              target.style.opacity = '0 !important';
            } else if (target.classList && target.classList.contains('html5-main-video')) {
              console.log('🎥 STYLE change on video:', target.className || target.classList.toString());
              // Fix positioning if it gets changed to absolute
              if (getComputedStyle(target).position === 'absolute') {
                target.style.position = 'static !important';
                target.style.pointerEvents = 'auto !important';
              }
            }
          }
        }
      });
    });
    
    // Observe the entire movie player for overlay changes
    const moviePlayer = document.querySelector('#movie_player');
    if (moviePlayer) {
      this.overlayObserver.observe(moviePlayer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      console.log('Started observing movie player for overlay changes');
    }
    
    // Disable periodic overlay checking - may be causing issues
    // this.overlayCheckInterval = setInterval(() => {
    //   if (this.isActive) {
    //     // Target known overlays + the problematic transparent overlays
    //     const overlays = document.querySelectorAll('.ytp-pause-overlay, .ytp-spinner, .ytp-cued-thumbnail-overlay-image, .ytp-endscreen-content, .ytp-videowall-still, .video-stream.html5-main-video, .ytp-player-content.ytp-timely-actions-content, .ytp-caption-window-container, .ytp-player-content.ytp-iv-player-content, .ytp-iv-video-content');
    //     let foundVisible = 0;
    //     overlays.forEach(overlay => {
    //       // Special handling for video element
    //       if (overlay.classList && overlay.classList.contains('html5-main-video')) {
    //         if (getComputedStyle(overlay).position === 'absolute') {
    //           console.log('⏰ PERIODIC fixing video positioning:', overlay.className || overlay.classList.toString());
    //           overlay.style.position = 'static !important';
    //           overlay.style.pointerEvents = 'auto !important';
    //           foundVisible++;
    //         }
    //       } else if (overlay.style.display !== 'none' || overlay.style.visibility !== 'hidden') {
    //         console.log('⏰ PERIODIC found visible overlay:', overlay.className || overlay.classList.toString());
    //         overlay.style.display = 'none !important';
    //         overlay.style.visibility = 'hidden !important';
    //         overlay.style.pointerEvents = 'none !important';
    //         overlay.style.opacity = '0 !important';
    //         foundVisible++;
    //       }
    //     });
    //     if (foundVisible > 0) console.log('⚡ Fixed', foundVisible, 'visible overlays');
    //   }
    // }, 1000); // Check every 1 second (reduced frequency)
  }

  stopOverlayMonitoring() {
    console.log('🛑 Stopping overlay monitoring...');
    if (this.overlayObserver) {
      this.overlayObserver.disconnect();
      this.overlayObserver = null;
    }
    if (this.overlayCheckInterval) {
      clearInterval(this.overlayCheckInterval);
      this.overlayCheckInterval = null;
    }
  }

  debugScanAllOverlays() {
    console.log('🔍 DEBUG SCAN: Looking for ALL overlays in movie_player...');
    const moviePlayer = document.querySelector('#movie_player');
    if (moviePlayer) {
      const allElements = moviePlayer.querySelectorAll('*');
      console.log(`Total elements in movie_player: ${allElements.length}`);
      
      // Look for elements that might be overlays
      const possibleOverlays = [];
      allElements.forEach(el => {
        const style = getComputedStyle(el);
        const className = el.className || el.classList.toString();
        
        // Check if element might be an overlay (positioned absolute/fixed, high z-index, etc.)
        if ((style.position === 'absolute' || style.position === 'fixed') && 
            (parseInt(style.zIndex) > 100 || style.zIndex === 'auto') &&
            (style.display !== 'none' && style.visibility !== 'hidden')) {
          possibleOverlays.push({
            element: el,
            tag: el.tagName,
            className: className,
            position: style.position,
            zIndex: style.zIndex,
            display: style.display,
            visibility: style.visibility,
            pointerEvents: style.pointerEvents
          });
        }
      });
      
      console.log(`Found ${possibleOverlays.length} possible overlay elements:`);
      possibleOverlays.forEach((overlay, i) => {
        console.log(`  ${i+1}. ${overlay.tag}.${overlay.className} - pos:${overlay.position}, z:${overlay.zIndex}, display:${overlay.display}, pointerEvents:${overlay.pointerEvents}`);
      });
      
      return possibleOverlays;
    }
    return [];
  }

  cleanupStuckOverlays() {
    // Increment exit count
    this.exitCount++;
    console.log(`🔢 Exit count: ${this.exitCount}`);
    
    // Only trigger DevTools from 2nd exit onwards (when overlay appears)
    if (this.exitCount >= 2) {
      console.log('🛠️ Auto-triggering DevTools to fix overlay...');
      this.autoToggleDevTools();
    } else {
      console.log('🧹 First exit - no DevTools trigger needed');
    }
    
    // Debug scan
    this.debugScanAllOverlays();
  }

  autoToggleDevTools() {
    try {
      console.log('🔧 Auto-opening DevTools...');
      
      // Method 1: Dispatch F12 key event
      const f12Event = new KeyboardEvent('keydown', {
        key: 'F12',
        code: 'F12',
        keyCode: 123,
        which: 123,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(f12Event);
      
      // Method 2: Try Chrome DevTools API if available
      if (window.chrome && window.chrome.runtime) {
        try {
          // This might work in some contexts
          console.log('🔍 Trying Chrome DevTools API...');
        } catch (e) {
          console.log('Chrome API not available');
        }
      }
      
      // Method 3: Quick close after opening (simulate user behavior)
      setTimeout(() => {
        console.log('🔧 Auto-closing DevTools...');
        const f12CloseEvent = new KeyboardEvent('keydown', {
          key: 'F12',
          code: 'F12', 
          keyCode: 123,
          which: 123,
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(f12CloseEvent);
        
        console.log('✅ DevTools auto-toggle completed');
      }, 100); // Quick 100ms toggle
      
    } catch (error) {
      console.error('❌ Auto DevTools toggle failed:', error);
    }
  }

  simulateDevToolsToggle() {
    try {
      console.log('🛠️ Simulating dev tools toggle...');
      
      // Method 1: Dispatch F12 keydown event
      const f12Event = new KeyboardEvent('keydown', {
        key: 'F12',
        code: 'F12',
        keyCode: 123,
        which: 123,
        bubbles: true
      });
      document.dispatchEvent(f12Event);
      
      // Method 2: Try to trigger what dev tools opening does
      setTimeout(() => {
        // Force viewport meta refresh
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          const content = viewport.getAttribute('content');
          viewport.setAttribute('content', content + ', user-scalable=yes');
          setTimeout(() => {
            viewport.setAttribute('content', content);
          }, 10);
        }
        
        // Method 3: Trigger window focus/blur (like dev tools does)
        window.dispatchEvent(new Event('blur'));
        setTimeout(() => {
          window.dispatchEvent(new Event('focus'));
          console.log('✅ Dev tools simulation completed');
        }, 10);
      }, 10);
      
    } catch (error) {
      console.error('❌ Dev tools simulation failed:', error);
    }
  }

  forceStyleRefresh() {
    try {
      console.log('🎨 Force CSS refresh...');
      const player = document.querySelector('#movie_player');
      const video = document.querySelector('.video-stream.html5-main-video');
      
      if (player && video) {
        // Method 1: Toggle contain property (forces new stacking context)
        player.style.contain = 'layout style paint';
        setTimeout(() => {
          player.style.contain = '';
          
          // Method 2: Force video to recreate its rendering context  
          video.style.display = 'none';
          video.offsetHeight; // Force reflow
          video.style.display = 'block';
          
          console.log('✅ CSS refresh completed');
        }, 10);
      }
    } catch (error) {
      console.error('❌ CSS refresh failed:', error);
    }
  }

  toggleIsolation() {
    try {
      console.log('🔒 Toggling CSS isolation...');
      const player = document.querySelector('#movie_player');
      
      if (player) {
        // Force new stacking context
        player.style.isolation = 'isolate';
        player.style.willChange = 'transform';
        
        setTimeout(() => {
          player.style.isolation = '';
          player.style.willChange = '';
          console.log('✅ Isolation toggle completed');
        }, 50);
      }
    } catch (error) {
      console.error('❌ Isolation toggle failed:', error);
    }
  }

  forceVideoRestack() {
    try {
      console.log('📚 Force video restack...');
      const video = document.querySelector('.video-stream.html5-main-video');
      
      if (video) {
        // Force video to top of stack
        video.style.position = 'relative';
        video.style.zIndex = '999999';
        video.style.isolation = 'isolate';
        
        setTimeout(() => {
          video.style.position = '';
          video.style.zIndex = '';
          video.style.isolation = '';
          console.log('✅ Video restack completed');
        }, 100);
      }
    } catch (error) {
      console.error('❌ Video restack failed:', error);
    }
  }

  forceLayoutRecalculation() {
    try {
      console.log('💻 Mimicking F12/fullscreen layout recalc...');
      
      const player = document.querySelector('#movie_player');
      if (!player) return;
      
      // Method 1: Force reflow by reading layout properties
      console.log('📐 Triggering reflow...');
      const originalHeight = player.style.height;
      player.style.height = '99.9%';
      player.offsetHeight; // Force reflow
      player.style.height = '100%';
      player.offsetHeight; // Force another reflow
      player.style.height = originalHeight;
      
      // Method 2: Toggle hardware acceleration
      console.log('🎮 Toggling GPU layers...');
      player.style.transform = 'translateZ(0)';
      requestAnimationFrame(() => {
        player.style.transform = '';
        
        // Method 3: Force repaint with opacity trick
        console.log('🎨 Forcing repaint...');
        player.style.opacity = '0.999';
        requestAnimationFrame(() => {
          player.style.opacity = '';
          
          // Method 4: Trigger resize events (like F12 does)
          console.log('📺 Dispatching resize events...');
          window.dispatchEvent(new Event('resize'));
          document.dispatchEvent(new Event('fullscreenchange'));
          
          console.log('✅ Layout recalculation completed');
        });
      });
      
    } catch (error) {
      console.error('❌ Layout recalc failed:', error);
    }
  }

  forceRecreatePlayerContainer() {
    try {
      console.log('☢️ Force recreating player container...');
      const player = document.querySelector('#movie_player');
      if (!player) return;
      
      // Store current video time and state
      const video = player.querySelector('.video-stream.html5-main-video');
      let currentTime = 0;
      let isPaused = true;
      
      if (video) {
        currentTime = video.currentTime || 0;
        isPaused = video.paused;
      }
      
      // Clone the player element (this removes all event listeners and inline styles)
      const clonedPlayer = player.cloneNode(true);
      
      // Replace the original with the clone
      player.parentNode.replaceChild(clonedPlayer, player);
      
      // Restore video state after a brief delay
      setTimeout(() => {
        const newVideo = clonedPlayer.querySelector('.video-stream.html5-main-video');
        if (newVideo && currentTime > 0) {
          newVideo.currentTime = currentTime;
          if (!isPaused) {
            newVideo.play().catch(() => {}); // Ignore autoplay errors
          }
        }
        console.log('✅ Player container recreated');
      }, 100);
      
    } catch (error) {
      console.error('❌ Force recreate failed:', error);
    }
  }

  triggerVideoRefresh() {
    try {
      console.log('🔄 Triggering video refresh...');
      const video = document.querySelector('.video-stream.html5-main-video');
      const player = document.querySelector('#movie_player');
      
      if (video && player) {
        // Nuclear option: Force complete player reset
        console.log('💣 Applying nuclear reset...');
        
        // Remove ALL inline styles from player and children
        this.clearAllInlineStyles(player);
        
        // Force video to re-render by temporarily changing its style
        const originalTransform = video.style.transform;
        video.style.transform = 'translateZ(0)';
        
        // Trigger a reflow
        video.offsetHeight;
        
        // Reset
        setTimeout(() => {
          video.style.transform = originalTransform;
          video.style.position = 'static !important';
          video.style.pointerEvents = 'auto !important';
          
          // Clear inline styles again after reset
          this.clearAllInlineStyles(player);
          
          console.log('✅ Video refresh completed');
        }, 10);
        
        // Also try dispatching a resize event to trigger YouTube's layout recalc
        window.dispatchEvent(new Event('resize'));
      }
    } catch (error) {
      console.error('❌ Video refresh failed:', error);
    }
  }

  clearAllInlineStyles(container) {
    try {
      console.log('🧹 Clearing all inline styles...');
      let clearedCount = 0;
      
      // Clear styles from all elements in container
      const allElements = container.querySelectorAll('*');
      allElements.forEach(element => {
        if (element.style && element.style.length > 0) {
          // Don't clear video element styles (we need those)
          if (!element.classList.contains('html5-main-video') && 
              !element.classList.contains('video-stream')) {
            
            // Check if element has problematic styles
            const computedStyle = getComputedStyle(element);
            if (computedStyle.position === 'absolute' && 
                computedStyle.backgroundColor === 'rgba(0, 0, 0, 0)' &&
                element.getBoundingClientRect().width > 300) {
              
              console.log('🗑️ Clearing styles from:', element.tagName, element.className);
              element.removeAttribute('style');
              clearedCount++;
            }
          }
        }
      });
      
      console.log(`🧹 Cleared ${clearedCount} inline styles`);
    } catch (error) {
      console.error('❌ Clear styles failed:', error);
    }
  }

  triggerFullscreenClearTrick() {
    try {
      console.log('🔧 Attempting fullscreen clear trick...');
      const video = document.querySelector('.video-stream.html5-main-video');
      const player = document.querySelector('#movie_player');
      
      if (player && video) {
        // First, scan for black overlay elements
        this.findAndRemoveBlackOverlays();
        
        // Briefly trigger fullscreen and immediately exit to clear stuck overlays
        // This mimics what the user described as working
        const originalStyle = {
          position: video.style.position,
          pointerEvents: video.style.pointerEvents
        };
        
        // Force a quick fullscreen state change to trigger YouTube's cleanup
        player.classList.add('ytp-fullscreen');
        
        setTimeout(() => {
          player.classList.remove('ytp-fullscreen');
          
          // Ensure video positioning is correct after the trick
          video.style.position = 'static !important';
          video.style.pointerEvents = 'auto !important';
          
          // Double check for black overlays after fullscreen trick
          setTimeout(() => {
            this.findAndRemoveBlackOverlays();
          }, 100);
          
          console.log('✅ Fullscreen clear trick completed');
        }, 50); // Very brief fullscreen
        
      }
    } catch (error) {
      console.error('❌ Fullscreen clear trick failed:', error);
    }
  }

  findAndRemoveBlackOverlays() {
    try {
      console.log('🔍 Scanning for black overlays...');
      const player = document.querySelector('#movie_player');
      if (!player) return;
      
      // Look for elements that could be black overlays - be more aggressive
      const allElements = player.querySelectorAll('*');
      let removedCount = 0;
      let checkedCount = 0;
      
      allElements.forEach(element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        // Check if element is positioned absolute and potentially blocking
        if (style.position === 'absolute' && 
            style.display !== 'none' && 
            rect.width > 100 && 
            rect.height > 100) {
          
          checkedCount++;
          const bgColor = style.backgroundColor;
          const zIndex = parseInt(style.zIndex) || 0;
          const opacity = parseFloat(style.opacity) || 1;
          
          // More aggressive detection - any large absolute element that's not video
          const isVideoElement = element.classList.contains('video-stream') || 
                                element.classList.contains('html5-main-video') ||
                                element.tagName === 'VIDEO';
          
          // Log suspicious elements for debugging
          if (rect.width > 300 && rect.height > 300 && !isVideoElement) {
            console.log('🔍 Large absolute element:', 
              element.tagName, 
              element.className || 'none', 
              'bg:', bgColor, 
              'z:', zIndex, 
              'opacity:', opacity, 
              'size:', `${Math.round(rect.width)}x${Math.round(rect.height)}`
            );
            
            // Instead of removing, push overlays behind video
            const hasNoBackground = bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent';
            const hasBlackBackground = bgColor === 'rgb(0, 0, 0)' || bgColor === 'rgba(0, 0, 0, 1)';
            const isLargeAndSuspicious = rect.width > 500 && rect.height > 400;
            const hasHighZIndex = zIndex > 10;
            const isTransparent = opacity < 1;
            
            // Push behind video instead of removing completely
            if (hasNoBackground || hasBlackBackground || isLargeAndSuspicious || hasHighZIndex || isTransparent) {
              console.log('🔙 Pushing overlay behind video:', element.tagName, element.className || 'none', 
                'reason:', hasBlackBackground ? 'black' : hasNoBackground ? 'transparent' : 
                isLargeAndSuspicious ? 'large' : hasHighZIndex ? 'highZ' : 'lowOpacity');
              
              // Push behind video instead of hiding
              element.style.zIndex = '-1 !important';
              element.style.pointerEvents = 'none !important';
              removedCount++;
            }
          }
        }
      });
      
      console.log(`🔍 Checked ${checkedCount} absolute elements, removed ${removedCount} overlays`);
    } catch (error) {
      console.error('❌ Black overlay scan failed:', error);
    }
  }

  forceCleanupStuckElements() {
    try {
      // Remove any remaining brainrot elements
      const stuckElements = document.querySelectorAll('[class*="brainrot"], [data-brainrot-placeholder], .brainrot-video-placeholder');
      stuckElements.forEach(el => {
        try {
          if (el !== this.splitModeBtn) { // Don't remove the split mode button
            el.remove();
          }
        } catch (e) {}
      });
      
      // Force clean any YouTube overlays that might be stuck
      const stuckOverlays = document.querySelectorAll('.ytp-pause-overlay, .ytp-spinner, .brainrot-hidden-overlay');
      stuckOverlays.forEach(overlay => {
        try {
          overlay.style.removeProperty('display');
          overlay.style.removeProperty('visibility');
          overlay.style.removeProperty('pointer-events');
          overlay.classList.remove('brainrot-hidden-overlay');
        } catch (e) {}
      });
      
      // Ensure player container is fully visible and clickable
      const player = document.querySelector('#movie_player');
      if (player) {
        player.style.removeProperty('visibility');
        player.style.removeProperty('pointer-events');
        
        // Also restore any child elements that might be hidden
        const hiddenElements = player.querySelectorAll('.brainrot-hidden-overlay');
        hiddenElements.forEach(el => {
          try {
            el.style.removeProperty('display');
            el.style.removeProperty('visibility');
            el.style.removeProperty('pointer-events');
            el.classList.remove('brainrot-hidden-overlay');
          } catch (e) {}
        });
      }
      
      // Force remove body class
      document.body.classList.remove('brainrot-split-active');
      
    } catch (e) {
      console.error('Error in force cleanup:', e);
    }
  }

  destroy() {
    // Clean up intervals
    if (this.playerCheckInterval) {
      clearInterval(this.playerCheckInterval);
      this.playerCheckInterval = null;
    }
    
    this.deactivateSplitScreen();
  }
}

// Initialize the splitter when page loads
let brainrotSplitter = null;

function initializeSplitter() {
  if (!brainrotSplitter) {
    brainrotSplitter = new YouTubeBrainrotSplitter();
  }
}

// Wait for page to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSplitter);
} else {
  initializeSplitter();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (brainrotSplitter) {
    brainrotSplitter.destroy();
  }
});
