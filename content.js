// Content script for YouTube Brainrot Split Screen Extension

class YouTubeBrainrotSplitter {
  constructor() {
    this.isActive = false;
    this.brainrotContainer = null;
    this.brainrotVideo = null;
    this.originalVideoContainer = null;
  this.leftClone = null;
  this.movedViaStream = false;
  this.movedOriginalVideoElement = null;
  this.movedOriginalVideoWasMuted = null;
    // Use local video file path
    this.brainrotUrls = [
      'brainrot-video.mp4' // Local video file in extension folder
    ];
    
    this.init();
  }

  init() {
    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
    document.addEventListener('msfullscreenchange', () => this.handleFullscreenChange());

    // Listen for messages from background script
    try {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'checkFullscreen') {
          this.handleFullscreenChange();
        }
      });
    } catch (error) {
      // Extension context may be invalidated, continue without background communication
      console.log('Background script communication unavailable');
    }

    // Initial check
    setTimeout(() => this.handleFullscreenChange(), 1000);

  // Handle Escape key to always restore layout when active (capture phase)
    this.escapeHandler = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (this.isActive) {
          // Try to exit any browser fullscreen as well
          try { document.exitFullscreen(); } catch (err) {}
          this.deactivateSplitScreen();
        }
      }
    };
    // Use capture to catch key even if YouTube intercepts it
    document.addEventListener('keydown', this.escapeHandler, true);
    window.addEventListener('keydown', this.escapeHandler, true);
  }

  handleFullscreenChange() {
    const isFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

    // Also check if YouTube player is in theater mode or fullscreen
    const playerContainer = document.querySelector('#movie_player');
    const isYouTubeFullscreen = playerContainer && (
      playerContainer.classList.contains('ytp-fullscreen') ||
      document.querySelector('.ytp-fullscreen')
    );

  // Activate when browser or YouTube tries to go fullscreen, but we'll override it
  const shouldActivate = isFullscreen || isYouTubeFullscreen;

    if (shouldActivate && !this.isActive) {
      this.activateSplitScreen();
    } else if (!shouldActivate && this.isActive) {
      this.deactivateSplitScreen();
    }

    // Notify background script (optional, may fail if context invalidated)
    try {
      chrome.runtime.sendMessage({
        action: 'fullscreenChanged',
        isFullscreen: shouldActivate
      });
    } catch (error) {
      // Ignore errors - extension works without background communication
    }
  }

  activateSplitScreen() {
    if (this.isActive) return;

    console.log('Activating split screen mode');
    this.isActive = true;

    // Exit fullscreen first, then manually resize
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    // Wait a bit for fullscreen to exit, then apply our custom layout
    setTimeout(() => {
      this.applyCustomLayout();
    }, 100);
  }

  applyCustomLayout() {
    // Find YouTube player container
    const playerContainer = document.querySelector('#movie_player') || 
                           document.querySelector('.html5-video-player');
    
    if (!playerContainer) {
      console.log('No player container found');
      return;
    }

    console.log('Found player container:', playerContainer);
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
      // Try to clone the playing video using captureStream() so we avoid moving
      // the native element and potential YouTube CSS overlay issues.
      let usedStreamClone = false;
      try {
        if (typeof nativeVideo.captureStream === 'function') {
          const stream = nativeVideo.captureStream();
          if (stream) {
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

            // Create new video element fed from the captureStream
            this.leftClone = document.createElement('video');
            this.leftClone.autoplay = true;
            this.leftClone.muted = false; // allow audio from left clone (original will be paused)
            this.leftClone.playsInline = true;
            try { this.leftClone.srcObject = stream; } catch (e) { /* some browsers require attachMediaStream */ }
            this.leftClone.style.cssText = `
              width: 100% !important;
              height: 100% !important;
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              position: relative !important;
              z-index: 2147483647 !important;
            `;

            this.youtubeMovedContainer.appendChild(this.leftClone);
            document.body.appendChild(this.youtubeMovedContainer);

            // Keep original audio (do not mute original) and hide visually via opacity
            try {
              this.movedOriginalVideoElement = nativeVideo;
              this.movedOriginalVideoWasMuted = !!nativeVideo.muted;
              // Save original inline style for restore
              try { nativeVideo.__origStyle = nativeVideo.getAttribute('style') || ''; } catch (e) {}
              try { nativeVideo.style.cssText += 'opacity: 0 !important; pointer-events: none !important;'; } catch (e) {}
            } catch (e) {}

            // Mute clone so audio continues from the original video (avoids double audio)
            try { this.leftClone.muted = true; } catch (e) {}
            try { this.leftClone.play().catch(()=>{}); } catch (e) {}

            this.movedViaStream = true;
            usedStreamClone = true;

            // Quick check: if clone doesn't advance frames, fallback to moving native video
            try {
              const initial = this.leftClone.currentTime || 0;
              this._leftCloneCheckTimer = setTimeout(() => {
                try {
                  const now = this.leftClone && this.leftClone.currentTime ? this.leftClone.currentTime : 0;
                  if (Math.abs(now - initial) < 0.05) {
                    // clone didn't progress -> fallback
                    this._fallbackMoveNativeVideo(nativeVideo);
                  }
                } catch (e) {}
              }, 500);
            } catch (e) {}
          }
        }
      } catch (err) {
        usedStreamClone = false;
      }

  // Fallback: move the native video element into a fixed container
  if (!usedStreamClone) {
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

          // Hide original container to prevent duplicates
          try { playerContainer.style.visibility = 'hidden'; } catch (err) {}
        } catch (err) {
          // Fallback: just style the native video
          nativeVideo.style.cssText += `\n            width: 100% !important;\n            height: 100% !important;\n            display: block !important;\n            visibility: visible !important;\n            opacity: 1 !important;\n          `;
        }
      }
    }

    // Hide other page elements
    this.hidePageElements();

    // Create brainrot container
    this.createBrainrotContainer();

    // Add a small restore button so user can exit split mode manually
    try {
      this.restoreBtn = document.createElement('button');
      this.restoreBtn.textContent = 'Exit split';
      this.restoreBtn.style.cssText = `
        position: fixed;
        top: 8px;
        right: 8px;
        z-index: 2147483675;
        padding: 6px 10px;
        background: rgba(0,0,0,0.6);
        color: white;
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 4px;
        cursor: pointer;
        pointer-events: auto;
      `;
      console.log('brainrot: restoreBtn created');
      this.restoreBtn.addEventListener('click', () => {
        console.log('brainrot: restoreBtn clicked');
        this.deactivateSplitScreen();
      });
      document.body.appendChild(this.restoreBtn);
    } catch (err) {
      // ignore
    }

  // Attach hover handlers to show native controls on the left video
  try { this.attachHoverControls(); } catch (e) {}
  // Also set up a global mouse watcher as a fallback so hover works even if element listeners fail
  try { this._setupGlobalHoverWatcher(); } catch (e) {}

    console.log('Custom layout applied');
  }

  deactivateSplitScreen() {
    if (!this.isActive) return;

    console.log('Deactivating split screen mode');
    this.isActive = false;

    // Remove split screen class from body
    document.body.classList.remove('brainrot-split-active');

    // Remove brainrot container
    if (this.brainrotContainer) {
      this.brainrotContainer.remove();
      this.brainrotContainer = null;
      this.brainrotVideo = null;
    }

    // Restore original YouTube player styles
    if (this.originalVideoContainer) {
      try {
        const orig = this.originalVideoContainer.__origStyle || '';
        if (orig) {
          this.originalVideoContainer.setAttribute('style', orig);
        } else {
          this.originalVideoContainer.removeAttribute('style');
        }
        delete this.originalVideoContainer.__origStyle;
      } catch (err) {
        this.originalVideoContainer.style.cssText = '';
      }
    }

    // If we used captureStream clone, stop tracks, remove clone and resume original
    if (this.movedViaStream) {
      try {
  // Clear left clone check timer
  try { if (this._leftCloneCheckTimer) { clearTimeout(this._leftCloneCheckTimer); this._leftCloneCheckTimer = null; } } catch (e) {}
        if (this.leftClone && this.leftClone.srcObject) {
          const tracks = (this.leftClone.srcObject.getTracks && this.leftClone.srcObject.getTracks()) || [];
          tracks.forEach(t => { try { t.stop(); } catch (e) {} });
        }

        if (this.leftClone) {
          try { this.leftClone.remove(); } catch (e) {}
          this.leftClone = null;
        }

  // Force remove any moved container immediately
  try { if (this.youtubeMovedContainer) { this.youtubeMovedContainer.remove(); this.youtubeMovedContainer = null; } } catch (e) {}

        // Restore original video's visibility and mute state
        if (this.movedOriginalVideoElement) {
          try {
            // restore inline style
            const orig = this.movedOriginalVideoElement.__origStyle || '';
            if (orig) this.movedOriginalVideoElement.setAttribute('style', orig);
            else this.movedOriginalVideoElement.removeAttribute('style');
          } catch (e) {}
          try { this.movedOriginalVideoElement.muted = !!this.movedOriginalVideoWasMuted; } catch (e) {}
          try { this.movedOriginalVideoElement.play().catch(()=>{}); } catch (e) {}
          this.movedOriginalVideoElement = null;
          this.movedOriginalVideoWasMuted = null;
        }

  // handled above
      } catch (err) {}

      this.movedViaStream = false;
    } else {
      // If we moved the native video element, move it back to its original parent
      if (this.youtubeMovedContainer) {
        try {
          const movedVideo = this.youtubeMovedContainer.querySelector('video');
          if (movedVideo && this.movedVideoOriginalParent) {
            if (this.movedVideoNextSibling) {
              this.movedVideoOriginalParent.insertBefore(movedVideo, this.movedVideoNextSibling);
            } else {
              this.movedVideoOriginalParent.appendChild(movedVideo);
            }
          }
          this.youtubeMovedContainer.remove();
        } catch (err) {}
        this.youtubeMovedContainer = null;
        this.movedVideoOriginalParent = null;
        this.movedVideoNextSibling = null;
      }
    }

    // Restore hidden elements
    this.restorePageElements();

  // Try to force YouTube player to exit its internal fullscreen state so we don't auto-reactivate
    try {
      const fsBtn = document.querySelector('#movie_player .ytp-fullscreen-button');
      if (fsBtn && fsBtn.getAttribute) {
        const ariaPressed = fsBtn.getAttribute('aria-pressed');
        if (ariaPressed === 'true') {
          try { fsBtn.click(); } catch (e) {}
        }
      }
      // Fallback: simulate 'f' key to toggle fullscreen off
      const evt = new KeyboardEvent('keydown', { key: 'f', code: 'KeyF', keyCode: 70, which: 70, bubbles: true, cancelable: true });
      document.dispatchEvent(evt);
    } catch (e) {}

  // Keep escape key handler for the lifetime of the content script so it works on re-activate

  // Remove global hover watcher if present
  try { this._removeGlobalHoverWatcher(); } catch (e) {}

    // Remove restore button if present
    if (this.restoreBtn) {
      try { this.restoreBtn.remove(); } catch (err) {}
      this.restoreBtn = null;
    }

  // Detach hover handlers
  try { this.detachHoverControls(); } catch (e) {}

    console.log('Split screen deactivated');
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
      console.log('Autoplay failed, will try after user interaction:', error);
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
        console.log('brainrot: hoverEnter triggered, movedViaStream=', this.movedViaStream);
        // If we used stream clone, reveal and raise the entire player container so its overlays get input
        if (this.movedViaStream) {
          // Hide the clone visual to avoid double view
          try { if (this.leftClone) this.leftClone.style.visibility = 'hidden'; } catch (e) {}

          // Raise the original YouTube player container above the clone and allow pointer events
          try {
            if (this.originalVideoContainer) {
              const origStyle = this.originalVideoContainer.getAttribute('style') || '';
              // keep a temp copy to revert hover-only changes
              this._origContainerHoverStyle = origStyle;
              this.originalVideoContainer.style.cssText = `${origStyle}; z-index: 2147483680 !important; pointer-events: auto !important;`;
            }
          } catch (e) {}

          // Let YouTube UI be visible while hovering
          try { this._toggleYTControls(true); } catch (e) {}

          // Allow clicks to reach the underlying YouTube player by disabling pointer events on the clone container
          try {
            if (this.youtubeMovedContainer) {
              // lower clone z-index to be under the original player
              this._origCloneZ = this.youtubeMovedContainer.style.zIndex || '';
              this.youtubeMovedContainer.style.setProperty('z-index', '2147483640', 'important');
              this.youtubeMovedContainer.style.pointerEvents = 'none';
              console.log('brainrot: youtubeMovedContainer pointer-events none, z-index lowered');
            }
          } catch (e) {}
          // Also ensure the native video element itself accepts pointer events
          try { if (this.movedOriginalVideoElement) { this.movedOriginalVideoElement.style.setProperty('pointer-events', 'auto', 'important'); console.log('brainrot: native video pointer-events auto'); } } catch (e) {}
          // Start tracking mouse to restore when leaving the left area
          try { this._startLeftHoverTracking(); } catch (e) {}
        }

        // If we moved native video, enable controls on it
        if (!this.movedViaStream && this.youtubeMovedContainer) {
          const mv = this.youtubeMovedContainer.querySelector('video');
          try { if (mv) mv.controls = true; } catch (e) {}
        }
      } catch (err) {}
  };

  this._hoverLeave = () => {
      try {
        console.log('brainrot: hoverLeave triggered');
        if (this.movedViaStream) {
          // Lower the player container back and disable its pointer events
          try {
            if (this.originalVideoContainer) {
              const base = this._origContainerHoverStyle || this.originalVideoContainer.getAttribute('style') || '';
              this.originalVideoContainer.setAttribute('style', base);
            }
          } catch (e) {}
          this._origContainerHoverStyle = null;
          // Show back the clone
          try { if (this.leftClone) this.leftClone.style.visibility = 'visible'; } catch (e) {}
          // Hide YouTube UI again to keep the layout clean
          try { this._toggleYTControls(false); } catch (e) {}
          // Re-enable pointer events on the clone container and restore z-index
          try {
            if (this.youtubeMovedContainer) {
              try { this.youtubeMovedContainer.style.setProperty('z-index', this._origCloneZ || '2147483646', 'important'); } catch (e) { this.youtubeMovedContainer.style.zIndex = this._origCloneZ || '2147483646'; }
              this.youtubeMovedContainer.style.pointerEvents = 'auto';
            }
          } catch (e) {}
          // Re-hide native video and disable pointer events on it so it doesn't intercept when not hovering
          try { if (this.movedOriginalVideoElement) { this.movedOriginalVideoElement.style.setProperty('pointer-events', 'none', 'important'); this.movedOriginalVideoElement.style.setProperty('opacity', '0', 'important'); console.log('brainrot: native video pointer-events none, opacity 0'); } } catch (e) {}
          // Stop tracking
          try { this._stopLeftHoverTracking(); } catch (e) {}
        }

        if (!this.movedViaStream && this.youtubeMovedContainer) {
          const mv = this.youtubeMovedContainer.querySelector('video');
          try { if (mv) mv.controls = false; } catch (e) {}
        }
      } catch (err) {}
  };

  // We rely on the global mouse watcher to detect entering/leaving the left split area.
  // This avoids duplicate enter/leave events from element listeners and unstable toggling.
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
        // If cursor is within left split area, trigger hoverEnter; otherwise trigger hoverLeave
        if (e.clientX <= leftWidth) {
          if (!this._globalInsideLeft) {
            this._globalInsideLeft = true;
            console.log('brainrot: globalWatcher enter left');
            this._hoverEnter && this._hoverEnter();
          }
        } else {
          if (this._globalInsideLeft) {
            this._globalInsideLeft = false;
            console.log('brainrot: globalWatcher leave left');
            this._hoverLeave && this._hoverLeave();
          }
        }
      } catch (err) {}
    };
    try { document.addEventListener('mousemove', this._globalWatcher, true); } catch (e) {}
  }

  _removeGlobalHoverWatcher() {
    try { if (this._globalWatcher) document.removeEventListener('mousemove', this._globalWatcher, true); } catch (e) {}
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
      const selectors = ['.ytp-chrome-top', '.ytp-chrome-bottom', '.ytp-gradient-top', '.ytp-gradient-bottom'];
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          // Use !important to override stylesheet rules that hide these bars
          const value = show ? 'block' : 'none';
          try { el.style.setProperty('display', value, 'important'); } catch (_) { el.style.display = value; }
        });
      });
    } catch (e) {}
  }

  // Fallback helper: stop clone (if any) and move native video into the left container
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

  destroy() {
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
