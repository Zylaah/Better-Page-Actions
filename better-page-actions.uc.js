// ==UserScript==
// @name           URLBarModifier
// @ignorecache
// ==/UserScript==

// Debug mode preference - set to true to enable console logging
const DEBUG_MODE = false;

// Debug logging function
function debugLog(...args) {
  if (DEBUG_MODE) {
    debugLog(...args);
  }
}

debugLog("URLBarModifier: Initializing...");

// Panel Manager Class - Simplified for Native Panel Only
class PanelManager {
  constructor() {
    this.unifiedPanelModified = false;
    this.extrasMenuListenersSetup = false;
  }

  getPanelBackgroundColor() {
    try {
      const panelEl = document.getElementById('unified-extensions-panel') || document.documentElement;
      const cs = getComputedStyle(panelEl);
      const bg = cs && (cs.getPropertyValue('background-color') || cs.backgroundColor);
      if (bg && bg.trim()) return bg.trim();
    } catch {}
    return 'Canvas';
  }


  customizeToolbar(event) {
    try {
      debugLog("URLBarModifier: Opening toolbar customization");
      
      // Close the panel first
      const unifiedPanel = document.querySelector("#unified-extensions-view");
      this.closePanelImmediately(unifiedPanel);
      
      // Open customization immediately
      const commandEl = document.getElementById('cmd_CustomizeToolbars');
      if (commandEl && typeof commandEl.doCommand === "function") {
        commandEl.doCommand();
      } else {
        console.warn("URLBarModifier: Customize toolbars command not found");
      }
    } catch (err) {
      console.error("Error opening toolbar customization:", err);
    }
  }

  modifyUnifiedExtensionsPanel() {
    try {
      if (this.unifiedPanelModified) {
        debugLog("Unified extensions panel already modified");
        return;
      }

      const unifiedPanel = document.querySelector("#unified-extensions-view");
      if (!unifiedPanel) {
        debugLog("Unified extensions panel not found, will retry later");
        return;
      }

      // Load external CSS file
      try {
        const existing = document.getElementById("uev-mod-rules");
        if (existing) existing.remove();
        
        const link = document.createElementNS("http://www.w3.org/1999/xhtml", "link");
        link.id = "uev-mod-rules";
        link.rel = "stylesheet";
        link.type = "text/css";
        // Get the script's directory path
        const scriptPath = Components.stack.filename;
        const scriptDir = scriptPath.substring(0, scriptPath.lastIndexOf('/'));
        link.href = scriptDir + "/urlbarmodifier.css";
        document.documentElement.appendChild(link);
      } catch (e) {
        console.warn("Failed to inject mod.viewgrid rules", e);
      }

      debugLog("Modifying unified extensions panel");

      // Helper to build section labels
      const makeSectionLabel = (id, text) => {
        try {
          const label = document.createElement("div");
          label.id = id;
          label.className = "unified-section-label";
          label.setAttribute("cui-areatype", "panel");
          label.setAttribute("skipintoolbarset", "true");
          label.textContent = text;
          label.style.cssText = `
            padding: 0 9px 0 9px;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            font-size: 1em;
            font-weight: 600;
            opacity: 0.85;
          `;
          return label;
        } catch (e) {
          console.warn("Failed to create section label", id, e);
          return null;
        }
      };

      // Remove all existing separators in the view; we'll re-add only the one before security
      try {
        const existingSeps = unifiedPanel.querySelectorAll('toolbarseparator');
        existingSeps.forEach(sep => sep.remove());
      } catch (e) {
        console.debug('Could not remove existing separators', e);
      }

      // Insert an "Extensions" label where the first native separator used to be (before the body)
      try {
        const bodyContainer = unifiedPanel.querySelector('.panel-subview-body');
        if (bodyContainer && !unifiedPanel.querySelector('#ue-section-label-extensions')) {
          const extensionsLabel = makeSectionLabel('ue-section-label-extensions', 'Extensions');
          if (extensionsLabel) unifiedPanel.insertBefore(extensionsLabel, bodyContainer);
        }
      } catch (e) {
        console.debug('Failed to insert Extensions label', e);
      }

      // Create Action Buttons section using DOM methods
      const actionSection = document.createElement("div");
      actionSection.id = "urlbar-modifier-actions";
      actionSection.className = "urlbar-modifier-section";
      actionSection.setAttribute("cui-areatype", "panel");
      actionSection.setAttribute("skipintoolbarset", "true");
      actionSection.style.cssText = `
        padding: 7px 8px 5px 9px;
        display: flex;
        gap: 8px;
        justify-content: center;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
      `;
      
      // Create Share URL button
      const shareButton = document.createElement("div");
      shareButton.id = "unified-share-url-button";
      shareButton.className = "unified-extension-item";
      shareButton.setAttribute("cui-areatype", "panel");
      shareButton.setAttribute("skipintoolbarset", "true");
      shareButton.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
        border-radius: 5px;
        cursor: pointer;
        background-color: color-mix(in srgb, currentColor 6%, transparent);
        width: 40px;
        height: 20px;
      `;
      shareButton.setAttribute("title", "Share URL");
      
      // Create share icon using createXULElement
      const shareIcon = document.createXULElement("image");
      shareIcon.id = "unified-share-icon";
      shareIcon.className = "unified-extension-icon";
      shareIcon.setAttribute("cui-areatype", "panel");
      shareIcon.setAttribute("skipintoolbarset", "true");
      shareIcon.style.cssText = "width: 18px; height: 18px; -moz-context-properties: fill; fill: currentColor;";
      try {
        // Inline SVG using provided paths with context-fill
        const shareSvg = `data:image/svg+xml;utf8,`
          + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
               <path fill="context-fill" d="M19 22H5c-1.654 0-3-1.346-3-3V8h2v11c0 .552.449 1 1 1h14c.552 0 1-.448 1-1v-2h2v2C22 20.654 20.654 22 19 22zM16.707 11.707L15.293 10.293 18.586 7 15.293 3.707 16.707 2.293 21.414 7z"/>
               <path fill="context-fill" d="M8,18H6v-1c0-6.065,4.935-11,11-11h3v2h-3c-4.963,0-9,4.037-9,9V18z"/>
             </svg>`
          );
        shareIcon.setAttribute('src', shareSvg);
      } catch (e) {
        // Fallback to a known icon
        shareIcon.setAttribute('src', 'chrome://global/skin/icons/plus.svg');
      }
      
      shareButton.appendChild(shareIcon);
      
      // Create Screenshot button
      const screenshotButton = document.createElement("div");
      screenshotButton.id = "unified-screenshot-button";
      screenshotButton.className = "unified-extension-item";
      screenshotButton.setAttribute("cui-areatype", "panel");
      screenshotButton.setAttribute("skipintoolbarset", "true");
      screenshotButton.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
        border-radius: 5px;
        cursor: pointer;
        background-color: color-mix(in srgb, currentColor 6%, transparent);
        width: 40px;
        height: 20px;
      `;
      screenshotButton.setAttribute("title", "Take a screenshot");
      
      const screenshotIcon = document.createXULElement("image");
      screenshotIcon.id = "unified-screenshot-icon";
      screenshotIcon.className = "unified-extension-icon";
      screenshotIcon.setAttribute("cui-areatype", "panel");
      screenshotIcon.setAttribute("skipintoolbarset", "true");
      screenshotIcon.style.cssText = "width: 18px; height: 18px; -moz-context-properties: fill; fill: currentColor;";
      try {
        const cameraSvg = `data:image/svg+xml;utf8,`
          + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
               <path fill="context-fill" d="M20 5h-3.2l-1.2-2H8.4L7.2 5H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-8 13a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm0-2.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/>
             </svg>`
          );
        screenshotIcon.setAttribute('src', cameraSvg);
      } catch (e) {
        screenshotIcon.setAttribute('src', 'chrome://global/skin/icons/plus.svg');
      }
      
      screenshotButton.appendChild(screenshotIcon);
      
      // Create Copy URL button
      const copyUrlButton = document.createElement("div");
      copyUrlButton.id = "unified-copy-url-button";
      copyUrlButton.className = "unified-extension-item";
      copyUrlButton.setAttribute("cui-areatype", "panel");
      copyUrlButton.setAttribute("skipintoolbarset", "true");
      copyUrlButton.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
        border-radius: 5px;
        cursor: pointer;
        background-color: color-mix(in srgb, currentColor 6%, transparent);
        width: 40px;
        height: 20px;
      `;
      copyUrlButton.setAttribute("title", "Copy URL to clipboard");
      
      const copyUrlIcon = document.createXULElement("image");
      copyUrlIcon.id = "unified-copy-icon";
      copyUrlIcon.className = "unified-extension-icon";
      copyUrlIcon.setAttribute("cui-areatype", "panel");
      copyUrlIcon.setAttribute("skipintoolbarset", "true");
      copyUrlIcon.style.cssText = "width: 18px; height: 18px; -moz-context-properties: fill; fill: currentColor; transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;";
      try {
        const linkSvg = `data:image/svg+xml;utf8,`
          + encodeURIComponent(
            `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <g id="SVGRepo_iconCarrier">
                 <path d="M14.1625 18.4876L13.4417 19.2084C11.053 21.5971 7.18019 21.5971 4.79151 19.2084C2.40283 16.8198 2.40283 12.9469 4.79151 10.5583L5.51236 9.8374" stroke="context-fill" stroke-width="2" stroke-linecap="round"></path>
                 <path d="M9.8374 14.1625L14.1625 9.8374" stroke="context-fill" stroke-width="2" stroke-linecap="round"></path>
                 <path d="M9.8374 5.51236L10.5583 4.79151C12.9469 2.40283 16.8198 2.40283 19.2084 4.79151C21.5971 7.18019 21.5971 11.053 19.2084 13.4417L18.4876 14.1625" stroke="context-fill" stroke-width="2" stroke-linecap="round"></path>
               </g>
             </svg>`
          );
        copyUrlIcon.setAttribute('src', linkSvg);
      } catch (e) {
        // Use Firefox's built-in copy icon
        copyUrlIcon.setAttribute('src', 'chrome://global/skin/icons/edit-copy.svg');
      }
      
      copyUrlButton.appendChild(copyUrlIcon);
      
      // Create Customize Toolbar button
      const customizeButton = document.createElement("div");
      customizeButton.id = "unified-customize-button";
      customizeButton.className = "unified-extension-item";
      customizeButton.setAttribute("cui-areatype", "panel");
      customizeButton.setAttribute("skipintoolbarset", "true");
      customizeButton.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
        border-radius: 5px;
        cursor: pointer;
        background-color: color-mix(in srgb, currentColor 6%, transparent);
        width: 40px;
        height: 20px;
      `;
      customizeButton.setAttribute("title", "Customize Toolbar");
      
      const customizeIcon = document.createXULElement("image");
      customizeIcon.id = "unified-customize-icon";
      customizeIcon.className = "unified-extension-icon";
      customizeIcon.setAttribute("cui-areatype", "panel");
      customizeIcon.setAttribute("skipintoolbarset", "true");
      customizeIcon.style.cssText = "width: 18px; height: 18px; -moz-context-properties: fill; fill: currentColor;";
      try {
        const customizeSvg = `data:image/svg+xml;utf8,`
          + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
               <path fill="context-fill" d="M3.845 3.845a2.883 2.883 0 0 0 0 4.077L5.432 9.51l.038-.04l4-4l.04-.038l-1.588-1.587a2.883 2.883 0 0 0-4.077 0m6.723 2.645l-.038.04l-4 4l-.04.038l9.588 9.588a2.884 2.884 0 0 0 4.078-4.078zM16.1 2.307a.483.483 0 0 1 .9 0l.43 1.095a.48.48 0 0 0 .272.274l1.091.432a.486.486 0 0 1 0 .903l-1.09.432a.5.5 0 0 0-.273.273L17 6.81a.483.483 0 0 1-.9 0l-.43-1.095a.5.5 0 0 0-.273-.273l-1.09-.432a.486.486 0 0 1 0-.903l1.09-.432a.5.5 0 0 0 .273-.274zm3.867 6.823a.483.483 0 0 1 .9 0l.156.399c.05.125.148.224.273.273l.398.158a.486.486 0 0 1 0 .902l-.398.158a.5.5 0 0 0-.273.273l-.156.4a.483.483 0 0 1-.9 0l-.157-.4a.5.5 0 0 0-.272-.273l-.398-.158a.486.486 0 0 1 0-.902l.398-.158a.5.5 0 0 0 .272-.273zM5.133 15.307a.483.483 0 0 1 .9 0l.157.4a.48.48 0 0 0 .272.273l.398.157a.486.486 0 0 1 0 .903l-.398.158a.48.48 0 0 0-.272.273l-.157.4a.483.483 0 0 1-.9 0l-.157-.4a.48.48 0 0 0-.272-.273l-.398-.158a.486.486 0 0 1 0-.903l.398-.157a.48.48 0 0 0 .272-.274z"/>
             </svg>`
          );
        customizeIcon.setAttribute('src', customizeSvg);
      } catch (e) {
        // Fallback to a known icon
        customizeIcon.setAttribute('src', 'chrome://global/skin/icons/plus.svg');
      }
      
      customizeButton.appendChild(customizeIcon);
      
      // Add all buttons to the action section
      actionSection.appendChild(shareButton);
      actionSection.appendChild(screenshotButton);
      actionSection.appendChild(copyUrlButton);
      actionSection.appendChild(customizeButton);

      // Create Picture-in-Picture Toggle section using DOM methods
      const pipSection = document.createElement("div");
      pipSection.id = "urlbar-modifier-pip";
      pipSection.className = "urlbar-modifier-section";
      pipSection.setAttribute("cui-areatype", "panel");
      pipSection.setAttribute("skipintoolbarset", "true");
      pipSection.style.cssText = `
        padding: 8px 8px;
      `;
      
      const pipToggle = document.createElement("div");
      pipToggle.id = "unified-pip-toggle";
      pipToggle.className = "unified-extension-item";
      pipToggle.setAttribute("cui-areatype", "panel");
      pipToggle.setAttribute("skipintoolbarset", "true");
      pipToggle.style.cssText = `
        display: block;
        cursor: pointer;
        background-color: transparent !important;
        width: 190px;
      `;
      
      const pipLabelContainer = document.createElement("div");
      pipLabelContainer.id = "unified-pip-container";
      pipLabelContainer.setAttribute("cui-areatype", "panel");
      pipLabelContainer.setAttribute("skipintoolbarset", "true");
      pipLabelContainer.style.cssText = "display: grid; grid-template-columns: 35px 1fr; grid-auto-rows: min-content; column-gap: 8px; row-gap: 2px; align-items: center; flex: 1; min-width: 0;";
      
      const pipLabel = document.createElement("span");
      pipLabel.className = "unified-extension-label";
      pipLabel.id = "unified-pip-label";
      pipLabel.setAttribute("cui-areatype", "panel");
      pipLabel.setAttribute("skipintoolbarset", "true");
      pipLabel.textContent = "Picture-in-Picture";
      pipLabel.style.cssText = "font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 1em; display: block; font-weight: 600;";

      // Small status text under the main label
      const pipSubLabel = document.createElement("span");
      pipSubLabel.id = "unified-pip-sublabel";
      pipSubLabel.setAttribute("cui-areatype", "panel");
      pipSubLabel.setAttribute("skipintoolbarset", "true");
      pipSubLabel.textContent = "Off";
      pipSubLabel.style.cssText = `
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 0.75em;
        opacity: 0.75;
        margin-top: 2px;
      `;

      // Vertical stack for labels
      const pipTextColumn = document.createElement("div");
      pipTextColumn.id = "unified-pip-text-column";
      pipTextColumn.setAttribute("cui-areatype", "panel");
      pipTextColumn.setAttribute("skipintoolbarset", "true");
      pipTextColumn.style.cssText = "display: flex; flex-direction: column; line-height: 1.1; grid-column: 2; grid-row: 1 / span 2; min-width: 0;";
      pipTextColumn.appendChild(pipLabel);
      pipTextColumn.appendChild(pipSubLabel);
      
      // Create toggle button (round) with masked PiP icon
      const pipButton = document.createElement("button");
      pipButton.id = "pip-button";
      pipButton.setAttribute("type", "button");
      pipButton.setAttribute("cui-areatype", "panel");
      pipButton.setAttribute("skipintoolbarset", "true");
      // Intentionally avoid unified-extension(s)-item classes to prevent native overrides
      pipButton.style.cssText = `
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 35px !important;
        height: 35px !important;
        min-width: 35px !important;
        min-height: 35px !important;
        border-radius: 50% !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        cursor: pointer !important;
        box-sizing: border-box !important;
        appearance: none !important;
        -moz-appearance: none !important;
        outline: none !important;
        background-clip: padding-box !important;
        background-color: color-mix(in srgb, currentColor 20%, transparent) !important;
        transition: background-color 0.2s ease, transform 0.08s ease !important;
      `;

      // Use XUL image with context-fill so glyph takes panel background color
      const pipButtonIcon = document.createXULElement('image');
      pipButtonIcon.id = 'unified-pip-icon';
      pipButtonIcon.className = 'pip-button-glyph';
      pipButtonIcon.setAttribute('cui-areatype', 'panel');
      pipButtonIcon.setAttribute('skipintoolbarset', 'true');
      pipButtonIcon.setAttribute('src', 'chrome://global/skin/media/picture-in-picture-open.svg');
      pipButtonIcon.style.cssText = `
        width: 16px !important;
        height: 16px !important;
        -moz-context-properties: fill !important;
        fill: var(--arrowpanel-background, var(--panel-background, Canvas)) !important;
      `;
      pipButton.appendChild(pipButtonIcon);
      try {
        pipButton.style.setProperty('grid-row', '1 / span 2', 'important');
        pipButton.style.setProperty('grid-column', '1', 'important');
      } catch {}
      // Place the round button to the left and the two-line text column to the right
      pipLabelContainer.appendChild(pipButton);
      pipLabelContainer.appendChild(pipTextColumn);
      pipToggle.appendChild(pipLabelContainer);
      pipSection.appendChild(pipToggle);

      // Press feedback for the round button
      try {
        pipButton.addEventListener('mousedown', () => {
          pipButton.style.transform = 'scale(0.96)';
        });
        const resetPress = () => { pipButton.style.transform = 'scale(1)'; };
        pipButton.addEventListener('mouseup', resetPress);
        pipButton.addEventListener('mouseleave', resetPress);
        pipButton.addEventListener('blur', resetPress);
      } catch {}

      // Create separator between PiP and Security sections
      const pipSeparator = document.createXULElement("toolbarseparator");
      pipSeparator.id = "urlbar-modifier-separator";
      pipSeparator.setAttribute("cui-areatype", "panel");
      pipSeparator.setAttribute("skipintoolbarset", "true");
      pipSeparator.style.cssText = "margin-top: 0px !important;";

      // Create Security section using DOM methods
      const securitySection = document.createElement("div");
      securitySection.id = "urlbar-modifier-security";
      securitySection.className = "urlbar-modifier-section";
      securitySection.setAttribute("cui-areatype", "panel");
      securitySection.setAttribute("skipintoolbarset", "true");
      securitySection.style.cssText = `
        padding: 8px 8px;
      `;
      
      const securityStatus = document.createElement("div");
      securityStatus.id = "unified-security-status";
      securityStatus.className = "unified-security-pill";
      securityStatus.setAttribute("cui-areatype", "panel");
      securityStatus.setAttribute("skipintoolbarset", "true");
      securityStatus.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 4px 8px;
        border-radius: 5px;
        background-color: color-mix(in srgb, currentColor 8%, transparent);
      `;
      
      const securityIcon = document.createXULElement("image");
      securityIcon.id = "unified-security-icon";
      securityIcon.className = "unified-extension-icon";
      securityIcon.setAttribute("cui-areatype", "panel");
      securityIcon.setAttribute("skipintoolbarset", "true");
      securityIcon.setAttribute("src", "chrome://global/skin/icons/security.svg");
      // Theme-aware via context fill
      securityIcon.style.cssText = "width: 10px; height: 10px; -moz-context-properties: fill; fill: currentColor;";
      
      const securityText = document.createElement("span");
      securityText.id = "unified-security-text";
      securityText.setAttribute("cui-areatype", "panel");
      securityText.setAttribute("skipintoolbarset", "true");
      securityText.textContent = "Secure";
      securityText.style.cssText = "font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 0.85em; font-weight: 500;";
      
      securityStatus.appendChild(securityIcon);
      securityStatus.appendChild(securityText);
      
      // Create extras button
      const extrasButton = document.createElement("div");
      extrasButton.id = "unified-extras-button";
      extrasButton.className = "unified-extension-item";
      extrasButton.setAttribute("cui-areatype", "panel");
      extrasButton.setAttribute("skipintoolbarset", "true");
      extrasButton.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
        border-radius: 5px;
        cursor: pointer;
        background-color: color-mix(in srgb, currentColor 6%, transparent);
        width: 8px;
        height: 6px;
      `;
      extrasButton.setAttribute("title", "Extras Menu");
      
      // Create extras icon
      const extrasIcon = document.createElement("img");
      extrasIcon.id = "unified-extras-icon";
      extrasIcon.className = "unified-extension-icon";
      extrasIcon.setAttribute("cui-areatype", "panel");
      extrasIcon.setAttribute("skipintoolbarset", "true");
      extrasIcon.src = "chrome://browser/skin/zen-icons/menu.svg";
      extrasIcon.style.cssText = "width: 14px; height: 14px; -moz-context-properties: fill; fill: currentColor;";
      
      extrasButton.appendChild(extrasIcon);
      
      // Create container for security status and extras button
      const securityContainer = document.createElement("div");
      securityContainer.id = "unified-security-container";
      securityContainer.setAttribute("cui-areatype", "panel");
      securityContainer.setAttribute("skipintoolbarset", "true");
      securityContainer.style.cssText = "display: flex; align-items: center; justify-content: space-between; width: 100%;";
      securityContainer.appendChild(securityStatus);
      securityContainer.appendChild(extrasButton);
      
      securitySection.appendChild(securityContainer);

      // Hide extension names and menu buttons to clean up the UI
      const extensionNames = unifiedPanel.querySelectorAll('.unified-extensions-item-name');
      extensionNames.forEach(name => {
        name.style.display = 'none';
      });
      
      const extensionMenuButtons = unifiedPanel.querySelectorAll('.unified-extensions-item-menu-button.subviewbutton.subviewbutton-iconic');
      extensionMenuButtons.forEach(button => {
        button.style.display = 'none';
      });

      // Attempt to enable native grid view via preference if available
      try {
        Services.prefs.setBoolPref('mod.extension.viewgrid', true);
      } catch (e) {
        console.debug('Could not set mod.extension.viewgrid pref, proceeding without it');
      }

      // Use native layout; do not force grid styles. Optionally hide labels/menus after panel renders
      const extensionsArea = unifiedPanel.querySelector('#unified-extensions-area');
      if (extensionsArea) {
        
        setTimeout(() => {
          // Only hide text labels and menu buttons - don't modify the extension items themselves
          const extensionNames = extensionsArea.querySelectorAll('.unified-extensions-item-name');
          extensionNames.forEach(name => {
            name.style.display = 'none';
          });
          
          const extensionMenuButtons = extensionsArea.querySelectorAll('.unified-extensions-item-menu-button');
          extensionMenuButtons.forEach(button => {
            button.style.display = 'none';
          });
          
          const contentsBoxes = extensionsArea.querySelectorAll('.unified-extensions-item-contents');
          contentsBoxes.forEach(box => {
            box.style.display = 'none';
          });
          
          // Append trailing "+" tile to browse add-ons (ensure only once)
          if (!extensionsArea.querySelector('#ue-add-extension-button')) {
            try {
              const gridContainer = extensionsArea;

              const item = document.createXULElement('toolbaritem');
              item.id = 'ue-add-extension-item';
              item.className = 'toolbaritem-combined-buttons unified-extensions-item chromeclass-toolbar-additional';
              item.setAttribute('cui-areatype', 'panel');
              item.setAttribute('skipintoolbarset', 'true');
              item.setAttribute('widget-type', 'custom');
              item.setAttribute('removable', 'false');
              item.setAttribute('overflows', 'true');

              const row = document.createXULElement('box');
              row.id = 'ue-add-extension-row';
              row.className = 'unified-extensions-item-row-wrapper';
              row.setAttribute('cui-areatype', 'panel');
              row.setAttribute('skipintoolbarset', 'true');

              const plusBtn = document.createXULElement('toolbarbutton');
              plusBtn.id = 'ue-add-extension-button';
              plusBtn.className = 'unified-extensions-item-action-button panel-no-padding subviewbutton subviewbutton-iconic';
              plusBtn.setAttribute('cui-areatype', 'panel');
              plusBtn.setAttribute('skipintoolbarset', 'true');
              plusBtn.setAttribute('tooltiptext', 'Browse add-ons');
              plusBtn.setAttribute('image', 'chrome://global/skin/icons/plus.svg');
              plusBtn.setAttribute('tabindex', '0');
              plusBtn.setAttribute('role', 'button');

              const activate = (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const url = 'https://addons.mozilla.org/en-US/firefox/extensions/';
                try {
                  if (typeof UC_API !== 'undefined' && UC_API?.Utils?.loadURI) {
                    UC_API.Utils.loadURI(window, { url, where: 'tab' });
                  } else if (typeof gBrowser !== 'undefined') {
                    gBrowser.loadOneTab(url, { inBackground: false });
                  } else {
                    window.open(url, '_blank', 'noopener');
                  }
                } catch (e) {
                  try { window.open(url, '_blank', 'noopener'); } catch {}
                }
              };

              plusBtn.addEventListener('click', activate);
              plusBtn.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') activate(ev);
              });

              row.appendChild(plusBtn);
              item.appendChild(row);
              gridContainer.appendChild(item);
            } catch (e) {
              console.warn('Failed to append add-extension plus button', e);
            }
          }

          // Ensure the plus tile stays at the end of the grid when items change
          try {
            const ensurePlusAtEnd = () => {
              if (extensionsArea.__uePlusBusy) return;
              extensionsArea.__uePlusBusy = true;
              // Defer to avoid running during DOM removal
              setTimeout(() => {
                try {
                  if (!extensionsArea || !extensionsArea.isConnected) return;
                  const btn = extensionsArea.querySelector('#ue-add-extension-button');
                  if (!btn) return;
                  // Find the container tile for the button
                  let tile = btn.closest && btn.closest('toolbaritem');
                  if (!tile || tile.nodeType !== Node.ELEMENT_NODE) tile = btn;
                  if (!tile || !tile.parentNode) return;
                  // Append to end only if not already last or wrong parent
                  if (tile.parentNode !== extensionsArea || tile !== extensionsArea.lastElementChild) {
                    extensionsArea.appendChild(tile);
                  }
                } catch (e) {
                  console.warn('ensurePlusAtEnd failed', e);
                } finally {
                  extensionsArea.__uePlusBusy = false;
                }
              }, 0);
            };

            ensurePlusAtEnd();

            if (!extensionsArea.__uePlusObserver) {
              const plusObserver = new MutationObserver((mutations) => {
                for (const m of mutations) {
                  if (m.type === 'childList' && (m.addedNodes && m.addedNodes.length || m.removedNodes && m.removedNodes.length)) {
                    ensurePlusAtEnd();
                    break;
                  }
                }
              });
              plusObserver.observe(extensionsArea, { childList: true });
              extensionsArea.__uePlusObserver = plusObserver;

              // Clean up observer when the panel hides/closes
              const cleanup = () => {
                try {
                  if (extensionsArea.__uePlusObserver) {
                    extensionsArea.__uePlusObserver.disconnect();
                    extensionsArea.__uePlusObserver = null;
                  }
                } catch {}
              };
              unifiedPanel.addEventListener('popuphidden', cleanup, { once: true });
            }
          } catch (e) {
            console.warn('Failed to enforce plus tile ordering', e);
          }

          debugLog("Applied minimal cleanup (names/menus hidden) and appended plus tile");
        }, 150);
      }

      // Insert action buttons at the top, PiP toggle and security at the bottom
      unifiedPanel.insertBefore(actionSection, unifiedPanel.firstChild);
      
      // Find the "Manage extensions" button and replace it with our sections
      const manageButton = unifiedPanel.querySelector("#unified-extensions-manage-extensions");
      if (manageButton) {
        // Hide the manage button
        manageButton.style.display = "none";
        
        // Insert a "Settings" label and PiP/Security stack before the manage button
        const settingsLabel = makeSectionLabel('ue-section-label-settings', 'Settings');
        if (settingsLabel && !unifiedPanel.querySelector('#ue-section-label-settings')) {
          unifiedPanel.insertBefore(settingsLabel, manageButton);
        }
        // Insert PiP section before the manage button
        unifiedPanel.insertBefore(pipSection, manageButton);
        // Insert separator after PiP section
        unifiedPanel.insertBefore(pipSeparator, manageButton);
        // Insert security section after separator
        unifiedPanel.insertBefore(securitySection, manageButton);
      } else {
        // Fallback: append to the end
        const settingsLabel = makeSectionLabel('ue-section-label-settings', 'Settings');
        if (settingsLabel && !unifiedPanel.querySelector('#ue-section-label-settings')) {
          unifiedPanel.appendChild(settingsLabel);
        }
        unifiedPanel.appendChild(pipSection);
        unifiedPanel.appendChild(pipSeparator);
        unifiedPanel.appendChild(securitySection);
      }

      // Add event listeners to action buttons
      shareButton.addEventListener("click", (event) => {
        event.stopPropagation();
        this.shareCurrentUrl(event);
      });
      shareButton.addEventListener("mouseenter", () => {
        shareButton.style.backgroundColor = "color-mix(in srgb, currentColor 10%, transparent)";
      });
      shareButton.addEventListener("mouseleave", () => {
        shareButton.style.backgroundColor = "color-mix(in srgb, currentColor 6%, transparent)";
      });

      screenshotButton.addEventListener("click", (event) => {
        event.stopPropagation();
        this.takeScreenshot(event);
      });
      screenshotButton.addEventListener("mouseenter", () => {
        screenshotButton.style.backgroundColor = "color-mix(in srgb, currentColor 10%, transparent)";
      });
      screenshotButton.addEventListener("mouseleave", () => {
        screenshotButton.style.backgroundColor = "color-mix(in srgb, currentColor 6%, transparent)";
      });

      copyUrlButton.addEventListener("click", (event) => {
        event.stopPropagation();
        this.copyCurrentUrl(event);
      });
      copyUrlButton.addEventListener("mouseenter", () => {
        copyUrlButton.style.backgroundColor = "color-mix(in srgb, currentColor 10%, transparent)";
      });
      copyUrlButton.addEventListener("mouseleave", () => {
        copyUrlButton.style.backgroundColor = "color-mix(in srgb, currentColor 6%, transparent)";
      });

      customizeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        this.customizeToolbar(event);
      });
      customizeButton.addEventListener("mouseenter", () => {
        customizeButton.style.backgroundColor = "color-mix(in srgb, currentColor 10%, transparent)";
      });
      customizeButton.addEventListener("mouseleave", () => {
        customizeButton.style.backgroundColor = "color-mix(in srgb, currentColor 6%, transparent)";
      });

      // Add event listener for extras button
      extrasButton.addEventListener("click", (event) => {
        event.stopPropagation();
        this.showExtrasContextMenu(event);
      });
      extrasButton.addEventListener("mouseenter", () => {
        extrasButton.style.backgroundColor = "color-mix(in srgb, currentColor 10%, transparent)";
      });
      extrasButton.addEventListener("mouseleave", () => {
        extrasButton.style.backgroundColor = "color-mix(in srgb, currentColor 6%, transparent)";
      });

      // Add event listeners to PiP toggle
      pipToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        // When clicking anywhere in the row, treat as a toggle
        this.toggleAutoPiP(event);
      });
      pipButton.addEventListener("click", (event) => {
        // Ensure button also toggles without relying on parent
        event.stopPropagation();
        this.toggleAutoPiP(event);
      });

      // Initialize PiP toggle state
      this.updatePiPToggleState();

      // Update security info
      this.updateUnifiedSecurityInfo();

      this.unifiedPanelModified = true;
      debugLog("Unified extensions panel successfully modified");

    } catch (err) {
      console.error("Error modifying unified extensions panel:", err);
    }
  }

  createExtrasContextMenu() {
    // Remove existing context menu if it exists
    const existingMenu = document.querySelector("#extras-context-menu");
    if (existingMenu) {
      existingMenu.remove();
    }

    const contextMenuXUL = `
      <menupopup id="extras-context-menu">
        <menuitem id="clear-cache-button" label="Clear Cache"/>
        <menuitem id="clear-cookies-button" label="Clear Cookies"/>
        <menuseparator/>
        <menuitem id="manage-extensions-button" label="Manage Extensions"/>
        <menuseparator/>
        <menuitem id="page-permissions-button" label="All Page Permissions"/>
      </menupopup>
    `;

    const mainPopupSet = document.querySelector("#mainPopupSet");
    if (mainPopupSet) {
      appendXUL(mainPopupSet, contextMenuXUL, null, true);
      debugLog("Extras context menu created and added to mainPopupSet");
    }
  }

  showExtrasContextMenu(event) {
    try {
      // Create the context menu if it doesn't exist
      if (!document.getElementById("extras-context-menu")) {
        this.createExtrasContextMenu();
      }

      // Set up event listeners if not already done
      if (!this.extrasMenuListenersSetup) {
        this.setupExtrasMenuListeners();
        this.extrasMenuListenersSetup = true;
      }

      const contextMenu = document.getElementById("extras-context-menu");
      if (contextMenu) {
        // Anchor the popup to the button for better UX
        const anchor = event.currentTarget || event.target;
        contextMenu.openPopup(anchor, "after_end", 0, 0, true, false, event);
      }
    } catch (error) {
      console.error("Error showing extras context menu:", error);
    }
  }

  setupExtrasMenuListeners() {
    if (this.extrasMenuListenersSetup) return;

    const clearCacheButton = document.getElementById("clear-cache-button");
    const clearCookiesButton = document.getElementById("clear-cookies-button");
    const manageExtensionsButton = document.getElementById("manage-extensions-button");
    const pagePermissionsButton = document.getElementById("page-permissions-button");

    if (clearCacheButton) {
      clearCacheButton.addEventListener("command", (e) => {
        e.stopPropagation();
        this.clearCache();
        const extrasMenu = document.getElementById("extras-context-menu");
        extrasMenu?.hidePopup();
      });
    }

    if (clearCookiesButton) {
      clearCookiesButton.addEventListener("command", (e) => {
        e.stopPropagation();
        this.clearCookies();
        const extrasMenu = document.getElementById("extras-context-menu");
        extrasMenu?.hidePopup();
      });
    }

    if (manageExtensionsButton) {
      manageExtensionsButton.addEventListener("command", (e) => {
        e.stopPropagation();
        try {
          const principal = Services.scriptSecurityManager.getSystemPrincipal();
          const tab = gBrowser.addTab("about:addons", { triggeringPrincipal: principal });
          gBrowser.selectedTab = tab;
        } catch (err) {
          console.error("URLBarModifier: Failed to open about:addons", err);
          // Fallback
          try { window.openTrustedLinkIn("about:addons", "tab"); } catch (_) {}
        } finally {
          const extrasMenu = document.getElementById("extras-context-menu");
          extrasMenu?.hidePopup();
          // Also hide the unified extensions panel
          const unifiedPanel = document.getElementById("unified-extensions-panel");
          if (unifiedPanel && unifiedPanel.hidePopup) {
            unifiedPanel.hidePopup();
          }
        }
      });
    }

    if (pagePermissionsButton) {
      pagePermissionsButton.addEventListener("command", (e) => {
        e.stopPropagation();
        // Store panel reference before any operations
        const unifiedPanel = document.querySelector("#unified-extensions-view");
        try {
          // Try to open the permissions panel directly using Firefox's internal API
            if (window.gPermissionPanel && window.gPermissionPanel.openPopup) {
              debugLog("URLBarModifier: Opening permissions panel via gPermissionPanel");
              // Set the anchor to the unified extensions button instead of the hidden native permission button
              const unifiedExtensionsButton = document.getElementById("unified-extensions-button");
              if (unifiedExtensionsButton && window.gPermissionPanel.setAnchor) {
                window.gPermissionPanel.setAnchor(unifiedExtensionsButton, "bottomleft topleft");
              }
              window.gPermissionPanel.openPopup(e);
            } else if (typeof BrowserPageInfo === 'function') {
              debugLog("URLBarModifier: Opening page info dialog");
              BrowserPageInfo(gBrowser.selectedBrowser.currentURI.spec, null, null, gBrowser.selectedBrowser);
            } else if (window.gIdentityHandler && window.gIdentityHandler.handleMoreInfoClick) {
              debugLog("URLBarModifier: Using gIdentityHandler.handleMoreInfoClick");
              window.gIdentityHandler.handleMoreInfoClick(e);
            } else if (typeof openPageInfo === 'function') {
              debugLog("URLBarModifier: Using openPageInfo function");
              openPageInfo(gBrowser.selectedBrowser.currentURI.spec, null, null, gBrowser.selectedBrowser);
            } else {
            // Try to trigger the page info command
            const controller = top.document.commandDispatcher.getControllerForCommand("View:PageInfo");
            if (controller && controller.isCommandEnabled("View:PageInfo")) {
              debugLog("URLBarModifier: Using View:PageInfo command");
              controller.doCommand("View:PageInfo");
            } else {
              // Final fallback: open about:permissions
              debugLog("URLBarModifier: Using fallback about:permissions");
              const principal = Services.scriptSecurityManager.getSystemPrincipal();
              const tab = gBrowser.addTab("about:permissions", { triggeringPrincipal: principal });
              gBrowser.selectedTab = tab;
            }
          }
        } catch (err) {
          console.error("URLBarModifier: Failed to open page permissions", err);
          // Final fallback
          try {
            const principal = Services.scriptSecurityManager.getSystemPrincipal();
            const tab = gBrowser.addTab("about:permissions", { triggeringPrincipal: principal });
            gBrowser.selectedTab = tab;
          } catch (fallbackErr) {
            console.error("URLBarModifier: Fallback also failed", fallbackErr);
          }
        } finally {
          // Close the unified extensions panel using the same method as other buttons
          this.closePanelImmediately(unifiedPanel);
        }
      });
    }

    this.extrasMenuListenersSetup = true;
  }

  clearCache() {
    try {
      debugLog("Clearing cache...");
      
      // Clear disk cache
      Services.cache2.clear();
      
      // Clear memory cache
      const memoryService = Cc["@mozilla.org/memory-reporter-manager;1"]
        .getService(Ci.nsIMemoryReporterManager);
      memoryService.minimizeMemoryUsage(() => {
        debugLog("Memory cache cleared");
      });
      
      // Clear image cache
      const imgCache = Cc["@mozilla.org/image/cache;1"]
        .getService(Ci.imgICache);
      imgCache.clearCache(false); // false = don't clear chrome cache
      
      // Refresh current tab
      if (gBrowser && gBrowser.selectedBrowser) {
        gBrowser.selectedBrowser.reload();
      }
      
      debugLog("Cache cleared successfully");
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }

  clearCookies() {
    try {
      debugLog("Clearing cookies for current site...");
      
      const currentURI = gBrowser.currentURI;
      if (!currentURI) {
        console.warn("No current URI found");
        return;
      }
      
      const host = currentURI.host;
      if (!host) {
        console.warn("No host found in current URI");
        return;
      }
      
      // Clear cookies for the current domain
      const cookieManager = Cc["@mozilla.org/cookiemanager;1"]
        .getService(Ci.nsICookieManager);
      
      // Get all cookies and remove those matching the current host
      const cookies = cookieManager.cookies;
      for (const cookie of cookies) {
        if (cookie.host === host || cookie.host === `.${host}`) {
          cookieManager.remove(cookie.host, cookie.name, cookie.path, {});
        }
      }
      
      // Clear site data (localStorage, sessionStorage, indexedDB, etc.)
      const principal = Services.scriptSecurityManager.createContentPrincipal(
        currentURI, {}
      );
      
      Services.clearData.deleteDataFromPrincipal(
        principal,
        true, // user request
        Ci.nsIClearDataService.CLEAR_ALL,
        () => {
          debugLog("Site data cleared successfully");
          // Refresh current tab
          if (gBrowser && gBrowser.selectedBrowser) {
            gBrowser.selectedBrowser.reload();
          }
        }
      );
      
      debugLog(`Cookies and site data cleared for: ${host}`);
    } catch (error) {
      console.error("Error clearing cookies:", error);
    }
  }

  updateUnifiedSecurityInfo() {
    try {
      // Force get fresh URI reference - don't rely on cached gBrowser.currentURI
      const currentBrowser = gBrowser.selectedBrowser;
      if (!currentBrowser) {
        debugLog("No selected browser found for security update");
        return;
      }
      
      const currentURI = currentBrowser.currentURI;
      const securityStatus = document.getElementById("unified-security-status");
      const securityIcon = document.getElementById("unified-security-icon");
      const securityText = document.getElementById("unified-security-text");
      
      if (!currentURI || !securityStatus || !securityIcon || !securityText) {
        debugLog("Unified security elements not found or no current URI");
        return;
      }

      // Force clear any cached security state
      securityStatus.removeAttribute('data-cached-state');
      securityText.removeAttribute('data-cached-text');

      const scheme = currentURI.scheme;
      const spec = currentURI.spec;
      
      // Get the browser's security UI for more accurate info
      let securityUI = null;
      let securityState = null;
      
      try {
        if (currentBrowser && currentBrowser.securityUI) {
          securityUI = currentBrowser.securityUI;
          securityState = securityUI.state;
          debugLog(`Security UI state: ${securityState}`);
      } else {
          debugLog("No security UI available for current browser");
        }
      } catch (e) {
        debugLog("Could not get security UI state:", e.message);
      }

      // Check Firefox's identity handler for more accurate security info
      let identityMode = null;
      try {
        if (window.gIdentityHandler && window.gIdentityHandler._mode) {
          identityMode = window.gIdentityHandler._mode;
          debugLog(`Identity handler mode: ${identityMode}`);
        } else {
          debugLog("No identity handler mode available");
        }
      } catch (e) {
        debugLog("Could not get identity handler mode:", e.message);
      }

      // Determine security status with multiple checks
      let isSecure = false;
      let isInsecure = false;
      let isLocal = false;
      let securityLabel = "Unknown";
      let tooltipText = "Security status unknown";
      let textColor = "currentColor";
      let iconFilter = "";

      // Check for special/local pages first
      if (spec.startsWith('about:') || 
          spec.startsWith('chrome:') || 
          spec.startsWith('moz-extension:') ||
          spec.startsWith('resource:') ||
          spec.startsWith('file:') ||
          spec === 'about:blank') {
        isLocal = true;
        securityLabel = "Local";
        tooltipText = "Local or Special Page";
      }
      // Check for secure HTTPS
      else if (scheme === "https") {
        // Use security UI state if available for more accuracy
        if (securityState !== null) {
          const Ci = Components.interfaces;
          if (securityState & Ci.nsIWebProgressListener.STATE_IS_SECURE) {
            isSecure = true;
            securityLabel = "Secure";
            tooltipText = "Secure HTTPS Connection";
          } else if (securityState & Ci.nsIWebProgressListener.STATE_IS_INSECURE) {
            isInsecure = true;
            securityLabel = "Mixed Content";
            tooltipText = "HTTPS with Mixed Content";
      } else {
            isSecure = true; // Default to secure for HTTPS
            securityLabel = "Secure";
            tooltipText = "Secure HTTPS Connection";
          }
        } else {
          // Fallback for HTTPS without security UI
          isSecure = true;
          securityLabel = "Secure";
          tooltipText = "Secure HTTPS Connection";
        }
      }
      // Check for insecure HTTP
      else if (scheme === "http") {
        isInsecure = true;
        securityLabel = "Insecure";
        tooltipText = "Insecure HTTP Connection";
        textColor = "#ef4444"; // Red for insecure
        iconFilter = "hue-rotate(0deg) saturate(2) brightness(0.8) sepia(1) hue-rotate(-50deg)";
      }
      // Handle other schemes
      else {
        isLocal = true;
        securityLabel = "Local";
        tooltipText = `${scheme.toUpperCase()} Connection`;
      }

      // Cross-check with identity handler mode if available
      if (identityMode) {
        switch (identityMode) {
          case "verifiedDomain":
          case "verifiedIdentity":
            if (scheme === "https") {
              isSecure = true;
              isInsecure = false;
              securityLabel = "Secure";
              tooltipText = "Secure HTTPS Connection";
              textColor = "currentColor";
              iconFilter = "";
            }
            break;
          case "mixedActiveContent":
          case "mixedPassiveContent":
            securityLabel = "Mixed Content";
            tooltipText = "HTTPS with Mixed Content";
            textColor = "#f59e0b";
            iconFilter = "hue-rotate(30deg) saturate(1.5)";
            break;
          case "notSecure":
            if (scheme === "http") {
              isInsecure = true;
              securityLabel = "Insecure";
              tooltipText = "Insecure HTTP Connection";
              textColor = "#ef4444";
              iconFilter = "hue-rotate(0deg) saturate(2) brightness(0.8) sepia(1) hue-rotate(-50deg)";
            }
            break;
        }
      }

      // Apply the determined security state
      securityText.textContent = securityLabel;
      securityStatus.setAttribute("title", tooltipText);
      securityStatus.style.color = textColor;
      securityIcon.style.filter = iconFilter;
      
      // Cache the current state to detect changes
      securityStatus.setAttribute('data-cached-state', securityLabel);
      securityText.setAttribute('data-cached-text', securityLabel);

      debugLog(`Unified security info updated for: ${spec} - Status: ${securityLabel}`);
    } catch (err) {
      console.error("Error updating unified security info:", err);
    }
  }


  shareCurrentUrl(event) {
    const currentUrl = gBrowser.currentURI.spec;
    if (
      currentUrl &&
      (currentUrl.startsWith("http://") || currentUrl.startsWith("https://"))
    ) {
      const buttonRect = event.target.getBoundingClientRect();
      Services.zen.share(
        Services.io.newURI(currentUrl),
        "",
        "",
        buttonRect.left,
        window.innerHeight - buttonRect.bottom,
        buttonRect.width,
        buttonRect.height
      );
      // Close the unified extensions panel after sharing
      const unifiedPanel = document.querySelector("#unified-extensions-view");
      if (unifiedPanel && unifiedPanel.hidePopup) {
        unifiedPanel.hidePopup();
      }
    }
  }

  takeScreenshot(event) {
    try {
      debugLog("URLBarModifier: takeScreenshot invoked");
      // Store panel reference before any async operations
      const unifiedPanel = document.querySelector("#unified-extensions-view");

      // Debug: Check what screenshot commands are available
      debugLog("URLBarModifier: Checking available screenshot commands...");
      debugLog("- BrowserCommands.screenshot:", !!window.BrowserCommands?.screenshot);
      debugLog("- ScreenshotUI.openSelectedBrowser:", !!window.ScreenshotUI?.openSelectedBrowser);
      debugLog("- Services.zen.screenshot:", !!Services?.zen?.screenshot);
      debugLog("- goDoCommand function:", typeof goDoCommand);
      debugLog("- gBrowser available:", typeof gBrowser !== 'undefined');
      debugLog("- window.gBrowser available:", typeof window.gBrowser !== 'undefined');

      // Get the correct browser reference
      const browser = gBrowser?.selectedBrowser || 
                     window.gBrowser?.selectedBrowser || 
                     document.getElementById('content')?.selectedBrowser ||
                     window.content;

      // Try Firefox Screenshots API directly
      try {
        if (typeof Screenshots !== 'undefined' && Screenshots.showPanel && browser) {
          debugLog("URLBarModifier: Using Screenshots.showPanel");
          Screenshots.showPanel(window, browser);
          return;
        }
      } catch (e) {
        debugLog("URLBarModifier: Screenshots.showPanel failed:", e.message);
      }

      // Try the newer Screenshots.jsm API with ChromeUtils.importESModule
      try {
        const { Screenshots } = ChromeUtils.importESModule("resource:///modules/Screenshots.sys.mjs");
        if (Screenshots && Screenshots.showPanel && browser) {
          debugLog("URLBarModifier: Using Screenshots.sys.mjs showPanel");
          Screenshots.showPanel(window, browser);
          return;
        }
      } catch (e) {
        debugLog("URLBarModifier: Screenshots.sys.mjs failed:", e.message);
      }

      // Try the older Screenshots.jsm API
      try {
        const { Screenshots } = ChromeUtils.import("resource:///modules/Screenshots.jsm");
        if (Screenshots && Screenshots.showPanel && browser) {
          debugLog("URLBarModifier: Using Screenshots.jsm showPanel");
          Screenshots.showPanel(window, browser);
          return;
        }
      } catch (e) {
        debugLog("URLBarModifier: Screenshots.jsm failed:", e.message);
      }

      // Try using Services.obs to notify screenshot service with different topics and data
      const screenshotTopics = [
        { topic: "menuitem-screenshot", data: null },
        { topic: "screenshots-take-screenshot", data: browser?.outerWindowID || null }, 
        { topic: "screenshot-ui-show", data: JSON.stringify({windowId: window.windowUtils?.outerWindowID}) },
        { topic: "Screenshots:ShowPanel", data: browser?.outerWindowID || null }
      ];
      
      for (const {topic, data} of screenshotTopics) {
        try {
          debugLog(`URLBarModifier: Using Services.obs with topic: ${topic}, data: ${data}`);
          Services.obs.notifyObservers(window, topic, data);
          // Close panel after successful screenshot
          this.closePanelImmediately(unifiedPanel);
          return;
        } catch (e) {
          debugLog(`URLBarModifier: Services.obs ${topic} failed:`, e.message);
        }
      }

      // Try Firefox's internal screenshot command controller with context
      try {
        // Set up the context that Firefox screenshot expects
        if (typeof gBrowser !== 'undefined' && gBrowser.selectedBrowser) {
          window._tempScreenshotBrowser = gBrowser.selectedBrowser;
        }
        
        const controller = top.document.commandDispatcher.getControllerForCommand("cmd_screenshot");
        if (controller && controller.isCommandEnabled("cmd_screenshot")) {
          debugLog("URLBarModifier: Using command controller for cmd_screenshot");
          controller.doCommand("cmd_screenshot");
          return;
        }
      } catch (e) {
        debugLog("URLBarModifier: Command controller failed:", e.message);
      } finally {
        // Clean up temp reference
        if (window._tempScreenshotBrowser) {
          delete window._tempScreenshotBrowser;
        }
      }

      // Try alternative screenshot command IDs
      const screenshotCommands = ["cmd_screenshot", "Browser:Screenshot", "Tools:Screenshot"];
      for (const cmdId of screenshotCommands) {
        try {
          const controller = top.document.commandDispatcher.getControllerForCommand(cmdId);
          if (controller && controller.isCommandEnabled(cmdId)) {
            debugLog(`URLBarModifier: Using command controller for ${cmdId}`);
            controller.doCommand(cmdId);
            return;
          }
        } catch (e) {
          debugLog(`URLBarModifier: Command controller ${cmdId} failed:`, e.message);
        }
      }

      // Prefer native BrowserCommands if available
      if (window.BrowserCommands?.screenshot && browser) {
        debugLog("URLBarModifier: Using BrowserCommands.screenshot");
        window.BrowserCommands.screenshot(browser);
        return;
      }

      // Try gBrowser ownerDocument commands (cmd_screenshot)
      try {
        if (typeof goDoCommand === 'function') {
          debugLog("URLBarModifier: Using goDoCommand('cmd_screenshot')");
          goDoCommand('cmd_screenshot');
          return;
        }
      } catch {}

      // Try alternative Browser command id
      try {
        if (typeof goDoCommand === 'function') {
          debugLog("URLBarModifier: Using goDoCommand('Browser:Screenshot')");
          goDoCommand('Browser:Screenshot');
          return;
        }
      } catch {}

      // Try invoking command elements directly if present
      try {
        const cmdEl = document.getElementById('cmd_screenshot') || document.getElementById('Browser:Screenshot');
        if (cmdEl && typeof cmdEl.doCommand === 'function') {
          debugLog("URLBarModifier: Using command element doCommand for screenshot");
          cmdEl.doCommand();
          return;
        }
      } catch {}

      // Try the ScreenshotUI API used internally in some builds
      try {
        if (window.ScreenshotUI?.openSelectedBrowser && browser) {
          debugLog("URLBarModifier: Using ScreenshotUI.openSelectedBrowser");
          window.ScreenshotUI.openSelectedBrowser(browser);
          return;
        }
      } catch {}

      // Zen specific: Services.zen.screenshot if provided
      try {
        if (Services?.zen?.screenshot && browser) {
          debugLog("URLBarModifier: Using Services.zen.screenshot");
          Services.zen.screenshot(browser);
          return;
        }
      } catch {}

      // Try direct access to Firefox screenshot functionality via window object
      try {
        debugLog("URLBarModifier: Trying window.screenshot API");
        if (typeof window.screenshot === 'function') {
          window.screenshot();
          return;
        }
      } catch (e) {
        debugLog("URLBarModifier: window.screenshot failed:", e.message);
      }

      // Try accessing screenshot through the content window
      try {
        debugLog("URLBarModifier: Trying content window screenshot");
        const contentWin = browser?.contentWindow || window.content;
        if (contentWin && typeof contentWin.screenshot === 'function') {
          contentWin.screenshot();
          return;
        }
      } catch (e) {
        debugLog("URLBarModifier: Content window screenshot failed:", e.message);
      }

      // Try keyboard shortcut simulation for screenshot (more comprehensive)
      try {
        debugLog("URLBarModifier: Trying keyboard shortcut simulation");
        // Try multiple key event targets
        const targets = [document, window, browser?.contentDocument, browser?.contentWindow];
        
        for (const target of targets) {
          if (!target) continue;
          try {
            const keyEvent = new KeyboardEvent('keydown', {
              key: 'S',
              code: 'KeyS',
              ctrlKey: true,
              shiftKey: true,
              bubbles: true,
              cancelable: true
            });
            target.dispatchEvent(keyEvent);
            
            // Also try keyup
            const keyUpEvent = new KeyboardEvent('keyup', {
              key: 'S',
              code: 'KeyS',
              ctrlKey: true,
              shiftKey: true,
              bubbles: true,
              cancelable: true
            });
            target.dispatchEvent(keyUpEvent);
          } catch (e) {
            debugLog(`URLBarModifier: Keyboard shortcut on ${target.constructor.name} failed:`, e.message);
          }
        }
        return;
      } catch (e) {
        debugLog("URLBarModifier: Keyboard shortcut failed:", e.message);
      }

      // As a very last resort try clicking a toolbar screenshot button if present
      const screenshotCommand = document.getElementById('screenshot-button') ||
                               document.getElementById('screenshot') ||
                               document.querySelector('[command="screenshot"]');
      if (screenshotCommand) {
        debugLog("URLBarModifier: Clicking existing screenshot button");
        screenshotCommand.click();
        return;
      }

      console.warn('URLBarModifier: No screenshot command available');
      
      // Close panel after screenshot attempts
      this.closePanelImmediately(unifiedPanel);
    } catch (err) {
      console.error("Error taking screenshot:", err);
    }
  }

  copyCurrentUrl(event) {
    try {
      debugLog("URLBarModifier: copyCurrentUrl invoked");
      // Store panel reference before any async operations
      const unifiedPanel = document.querySelector("#unified-extensions-view");
      debugLog("URLBarModifier: Panel found:", !!unifiedPanel, "hidePopup available:", !!unifiedPanel?.hidePopup);
      
      // Use Zen browser native system
      try {
        if (window.ZenCommandPalette && typeof window.ZenCommandPalette.executeCommandByKey === "function") {
          debugLog("URLBarModifier: Using ZenCommandPalette.executeCommandByKey");
          window.ZenCommandPalette.executeCommandByKey("cmd_zenCopyCurrentURL");
          // Show feedback animation and close panel after delay
          this.showCopyFeedback();
          this.closePanelAfterDelay(unifiedPanel);
        } else {
          const cmd = document.getElementById("cmd_zenCopyCurrentURL");
          if (cmd && typeof cmd.doCommand === "function") {
            debugLog("URLBarModifier: Using cmd.doCommand");
            cmd.doCommand();
            // Show feedback animation and close panel after delay
            this.showCopyFeedback();
            this.closePanelAfterDelay(unifiedPanel);
          } else {
            console.warn("URLBarModifier: Zen copy command not found, falling back to standard methods");
            this.fallbackCopyMethods(unifiedPanel);
          }
        }
      } catch (e) {
        debugLog("URLBarModifier: Zen copy command failed:", e.message);
        this.fallbackCopyMethods(unifiedPanel);
      }

    } catch (err) {
      console.error("Error copying URL:", err);
    }
  }

  fallbackCopyMethods(unifiedPanel) {
    try {
      // Get the current URL
      const currentUrl = gBrowser?.currentURI?.spec || 
                        window.gBrowser?.currentURI?.spec ||
                        window.location.href;
      
      if (!currentUrl) {
        console.warn("URLBarModifier: No URL found to copy");
        return;
      }

      debugLog("URLBarModifier: Copying URL:", currentUrl);

      // Method 1: Try modern Clipboard API
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          debugLog("URLBarModifier: Using navigator.clipboard.writeText");
          navigator.clipboard.writeText(currentUrl).then(() => {
            debugLog("URLBarModifier: URL copied successfully via Clipboard API");
            this.showCopyFeedback();
            this.closePanelAfterDelay(unifiedPanel);
          }).catch(e => {
            debugLog("URLBarModifier: Clipboard API failed:", e.message);
            this.fallbackCopy(currentUrl, unifiedPanel);
          });
          return;
        }
      } catch (e) {
        debugLog("URLBarModifier: Clipboard API not available:", e.message);
      }

      // Method 2: Try Firefox's clipboard service
      try {
        debugLog("URLBarModifier: Using Firefox clipboard service");
        const clipboardHelper = Cc["@mozilla.org/widget/clipboardhelper;1"]
                               .getService(Ci.nsIClipboardHelper);
        clipboardHelper.copyString(currentUrl);
        debugLog("URLBarModifier: URL copied successfully via Firefox clipboard service");
        this.showCopyFeedback();
        this.closePanelAfterDelay(unifiedPanel);
        return;
      } catch (e) {
        debugLog("URLBarModifier: Firefox clipboard service failed:", e.message);
      }

      // Method 3: Try execCommand as fallback
      this.fallbackCopy(currentUrl, unifiedPanel);

    } catch (err) {
      console.error("Error in fallback copy methods:", err);
    }
  }

  fallbackCopy(text, unifiedPanel) {
    try {
      debugLog("URLBarModifier: Using execCommand fallback");
      // Create a temporary textarea
      const textarea = document.createElement("textarea");
      textarea.id = "urlbar-modifier-clipboard";
      textarea.setAttribute("cui-areatype", "panel");
      textarea.setAttribute("skipintoolbarset", "true");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (success) {
        debugLog("URLBarModifier: URL copied successfully via execCommand");
        this.showCopyFeedback();
        this.closePanelAfterDelay(unifiedPanel);
      } else {
        console.warn("URLBarModifier: execCommand copy failed");
      }
    } catch (e) {
      console.error("URLBarModifier: Fallback copy failed:", e.message);
    }
  }

  showCopyFeedback() {
    try {
      // Show a subtle, modern visual feedback by smoothly morphing the icon
      const button = document.getElementById("unified-copy-url-button");
      const icon = button?.querySelector(".unified-extension-icon");
      
      if (button && icon) {
        const originalTitle = button.getAttribute("title");
        const originalSrc = icon.getAttribute("src");
        
        // Create checkmark SVG with context-fill
        const checkmarkSvg = `data:image/svg+xml;utf8,`
          + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="context-fill" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
               <polyline points="8 17 14 23 24 9"/>
             </svg>`
          );
        
        // Step 1: Fade out with subtle scale down
        icon.style.opacity = "0";
        icon.style.transform = "scale(0.8)";
        
        setTimeout(() => {
          // Step 2: Change to checkmark and update title
          button.setAttribute("title", "URL copied!");
          icon.setAttribute("src", checkmarkSvg);
          
          // Step 3: Fade in with subtle scale up
          icon.style.opacity = "1";
          icon.style.transform = "scale(1.1)";
          
          // Step 4: Settle to normal scale
          setTimeout(() => {
            icon.style.transform = "scale(1)";
          }, 100);
          
        }, 200); // Wait for fade out to complete
        
        // Step 5: Fade back to original after 1.2 seconds
        setTimeout(() => {
          icon.style.opacity = "0";
          icon.style.transform = "scale(0.8)";
          
          setTimeout(() => {
            button.setAttribute("title", originalTitle);
            icon.setAttribute("src", originalSrc);
            icon.style.opacity = "1";
            icon.style.transform = "scale(1)";
          }, 200);
          
        }, 1200);
      }
    } catch (e) {
      debugLog("URLBarModifier: Feedback display failed:", e.message);
    }
  }

  closePanelImmediately(unifiedPanel) {
    try {
      debugLog("URLBarModifier: closePanelImmediately called with panel:", !!unifiedPanel);
      if (unifiedPanel) {
        // Use Escape key simulation (most reliable method)
        try {
          debugLog("URLBarModifier: Simulating Escape key press");
          const escapeEvent = new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            bubbles: true,
            cancelable: true
          });
          document.dispatchEvent(escapeEvent);
          debugLog("URLBarModifier: Panel closed successfully with Escape key");
        } catch (e) {
          debugLog("URLBarModifier: Escape key simulation failed:", e.message);
        }
      } else {
        debugLog("URLBarModifier: Panel not found");
      }
    } catch (e) {
      debugLog("URLBarModifier: Panel closing failed:", e.message);
    }
  }

  closePanelAfterDelay(unifiedPanel) {
    try {
      debugLog("URLBarModifier: closePanelAfterDelay called with panel:", !!unifiedPanel);
      // Close panel with a delay to allow feedback animation to complete
      setTimeout(() => {
        this.closePanelImmediately(unifiedPanel);
      }, 700); // Delay to allow animation to complete before panel closes
    } catch (e) {
      debugLog("URLBarModifier: Panel closing failed:", e.message);
    }
  }

  hidePanel() {
    try {
      debugLog("URLBarModifier: hidePanel called");
      const unifiedPanel = document.querySelector("#unified-extensions-view");
      if (unifiedPanel && unifiedPanel.hidePopup) {
        unifiedPanel.hidePopup();
        debugLog("URLBarModifier: Panel hidden successfully");
      } else {
        debugLog("URLBarModifier: Panel not found or hidePopup not available");
      }
    } catch (e) {
      debugLog("URLBarModifier: Panel hiding failed:", e.message);
    }
  }

  toggleAutoPiP(event) {
    try {
      // Get current global preference value
      const currentValue = Services.prefs.getBoolPref("media.videocontrols.picture-in-picture.enable-when-switching-tabs.enabled", false);
      const newValue = !currentValue;
      
      // Set the new global preference value
      Services.prefs.setBoolPref("media.videocontrols.picture-in-picture.enable-when-switching-tabs.enabled", newValue);
      
      // Update the toggle state visually
      this.updatePiPToggleState();
      
      debugLog(`Auto PiP toggled globally: ${newValue ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error("Error toggling Auto PiP:", err);
    }
  }

  updatePiPToggleState() {
    try {
      const pipButton = document.getElementById("pip-button");
      const pipLabel = document.getElementById('unified-pip-label');

      // Check if element exists, if not, the panel might not be open
      if (!pipButton) {
        debugLog("PiP button not found, panel might not be open");
        return;
      }
      
      // Get current global preference value
      const isEnabled = Services.prefs.getBoolPref("media.videocontrols.picture-in-picture.enable-when-switching-tabs.enabled", false);

      // Slightly darker primary in light mode; keep primary in dark
      // Resolve primary color once; fallback to Firefox blue if missing
      let primary = '';
      try {
        primary = getComputedStyle(document.documentElement)
          .getPropertyValue('--zen-primary-color')
          .trim();
      } catch {}
      if (!primary) primary = '#0a84ff';
      // Use CSS light-dark() over a computed primary color string
      const onColor = `light-dark(color-mix(in srgb, ${primary} 75%, gray), white)`;
      
      if (isEnabled) {
        pipButton.style.setProperty('background-color', onColor, 'important');
        pipButton.style.opacity = '1';
        pipButton.setAttribute('aria-pressed', 'true');
        pipButton.setAttribute('title', 'Auto PiP enabled globally');
        if (pipLabel) pipLabel.style.opacity = '1';
        try {
          const sub = document.getElementById('unified-pip-sublabel');
          if (sub) sub.textContent = 'Automatic';
        } catch {}
        // Ensure cut-out effect stays panel-colored
        try {
          const icon = pipButton.querySelector('.pip-button-glyph');
          if (icon) icon.style.setProperty('fill', 'var(--arrowpanel-background, var(--panel-background, Canvas))', 'important');
        } catch {}
      } else {
        pipButton.style.setProperty('background-color', 'color-mix(in srgb, currentColor 20%, transparent)', 'important');
        pipButton.style.opacity = '0.9';
        pipButton.setAttribute('aria-pressed', 'false');
        pipButton.setAttribute('title', 'Auto PiP disabled globally');
        if (pipLabel) pipLabel.style.opacity = '0.85';
        try {
          const sub = document.getElementById('unified-pip-sublabel');
          if (sub) sub.textContent = 'Off';
        } catch {}
        // Ensure cut-out effect stays panel-colored
        try {
          const icon = pipButton.querySelector('.pip-button-glyph');
          if (icon) icon.style.setProperty('fill', 'var(--arrowpanel-background, var(--panel-background, Canvas))', 'important');
        } catch {}
      }
      
      debugLog(`Auto PiP state updated globally: ${isEnabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      console.error("Error updating PiP toggle state:", err);
    }
  }

  modifyPanelPosition() {
    try {
      // Panel positioning is now handled by external CSS file
      // Just modify the panel attributes
      const panel = document.getElementById('unified-extensions-panel');
      if (panel) {
        panel.setAttribute('position', 'bottomcenter topcenter');
        debugLog('Panel position attribute modified (CSS loaded from external file)');
      }
    } catch (err) {
      console.error('Error modifying panel position:', err);
    }
  }
}

// Helper function to append XUL elements
const appendXUL = (
  parentElement,
  xulString,
  insertBefore = null,
  XUL = false
) => {
  let element;
  if (XUL) {
    element = window.MozXULElement.parseXULToFragment(xulString);
  } else {
    element = new DOMParser().parseFromString(xulString, "text/html");
    if (element.body.children.length) {
      element = element.body.firstChild;
    } else {
      element = element.head.firstChild;
    }
  }

  element = parentElement.ownerDocument.importNode(element, true);

  if (insertBefore) {
    parentElement.insertBefore(element, insertBefore);
  } else {
    parentElement.appendChild(element);
  }

  return element;
};

// Prevent duplicate execution
if (!window.urlBarModifierInitialized) {
  window.urlBarModifierInitialized = true;

  // Initialize panel manager
  const panelManager = new PanelManager();

  // Make panelManager globally accessible for other scripts
  window.panelManager = panelManager;

  // Extension Button Management (merged from extension-button.uc.js)
  let extensionButtonAttempts = 0;
  const MAX_EXTENSION_BUTTON_ATTEMPTS = 20; // Try for about 10 seconds (20 * 500ms)

  function updateExtensionButtonVisibilityAndPosition() {
    let unifiedExtensionsButton = document.getElementById('unified-extensions-button');
    let pageActionButtons = document.getElementById('page-action-buttons');
    let urlbar = document.getElementById('urlbar');

    if (!unifiedExtensionsButton) {
      // If button doesn't exist yet, try to run moveExtensionButton again if attempts remain.
      if (extensionButtonAttempts < MAX_EXTENSION_BUTTON_ATTEMPTS) {
        setTimeout(moveExtensionButton, 100); // Try to make sure it's there
      }
      return;
    }

    let isFloating = false;
    if (urlbar) {
      isFloating = urlbar.getAttribute('breakout-extend') === 'true' ||
                     urlbar.getAttribute('zen-floating-urlbar') === 'true';
    }

    let isBlankPage = false;
    let identityBox = document.getElementById('identity-box');
    if (identityBox) {
      isBlankPage = identityBox.getAttribute('pageproxystate') === 'invalid';
    } else if (typeof gBrowser !== 'undefined' && gBrowser.selectedBrowser) {
      const currentSpec = gBrowser.selectedBrowser.currentURI.spec;
      isBlankPage = ['about:blank', 'about:newtab', 'about:home'].includes(currentSpec);
    } else {
      // Default to considering it a blank page if identityBox and gBrowser are unavailable for checks.
      isBlankPage = true;
    }

    if (isFloating || isBlankPage) {
      unifiedExtensionsButton.style.display = 'none';
    } else {
      unifiedExtensionsButton.style.display = ''; // Revert to default display (e.g., flex, inline-flex)
      
      // Use CSS order to ensure the button appears at the extreme right
      unifiedExtensionsButton.style.order = '9999'; // High order value to ensure it's last
      unifiedExtensionsButton.style.marginLeft = '-10px';
      unifiedExtensionsButton.style.marginRight = '-4px';
      
      // Add right padding to identity-box for better spacing
      if (identityBox) {
        identityBox.style.paddingRight = '0px';
      }
      
      if (pageActionButtons) {
        // Ensure page-action-buttons uses flexbox layout for order to work
        pageActionButtons.style.display = 'flex';
        pageActionButtons.style.alignItems = 'center';
        
        if (unifiedExtensionsButton.parentElement !== pageActionButtons) {
          pageActionButtons.appendChild(unifiedExtensionsButton);
        }
      } else {
        // If pageActionButtons is missing when we need to show the button, trigger moveExtensionButton's retry.
        if (extensionButtonAttempts < MAX_EXTENSION_BUTTON_ATTEMPTS) {
          setTimeout(moveExtensionButton, 100);
        }
      }
    }
  }

  function moveExtensionButton() {
    try {
      let unifiedExtensionsButton = document.getElementById('unified-extensions-button');
      let pageActionButtons = document.getElementById('page-action-buttons');

      if (unifiedExtensionsButton && pageActionButtons) {
        if (unifiedExtensionsButton.parentElement !== pageActionButtons) {
          pageActionButtons.appendChild(unifiedExtensionsButton);
          debugLog('Unified Extensions Button moved to page-action-buttons.');
        }
        
        // Apply order styling immediately
        unifiedExtensionsButton.style.order = '9999';
        unifiedExtensionsButton.style.marginLeft = 'auto';
        unifiedExtensionsButton.style.marginRight = '-4px';
        
        // Add right padding to identity-box for better spacing
        let identityBox = document.getElementById('identity-box');
        if (identityBox) {
          identityBox.style.paddingRight = '0px';
        }
        
        // Ensure page-action-buttons uses flexbox layout for order to work
        pageActionButtons.style.display = 'flex';
        pageActionButtons.style.alignItems = 'center';
        
        extensionButtonAttempts = MAX_EXTENSION_BUTTON_ATTEMPTS; // Stop timed retries for finding these specific elements
        updateExtensionButtonVisibilityAndPosition(); // Initial visibility update
      } else {
        if (extensionButtonAttempts < MAX_EXTENSION_BUTTON_ATTEMPTS) {
          extensionButtonAttempts++;
          setTimeout(moveExtensionButton, 500);
        } else {
          console.error('Max attempts reached by timer. Could not find unifiedExtensionsButton and/or pageActionButtons for initial move.');
        }
      }
    } catch (e) {
      console.error('Error in moveExtensionButton:', e);
    }
  }

  // Listen for tab changes and location changes to update security info in unified panel
  if (typeof gBrowser !== "undefined") {
    gBrowser.tabContainer.addEventListener("TabSelect", () => {
      // Small delay to ensure the new tab's URI is loaded
      setTimeout(() => {
        panelManager.updateUnifiedSecurityInfo();
      }, 100);
    });
    
    // Also listen for tab close to update security info
    gBrowser.tabContainer.addEventListener("TabClose", () => {
      setTimeout(() => {
        panelManager.updateUnifiedSecurityInfo();
      }, 50);
    });

    // Listen for location changes within the same tab
    gBrowser.addTabsProgressListener({
      onLocationChange: function(browser, webProgress, request, location, flags) {
        if (browser === gBrowser.selectedBrowser) {
          debugLog("Location change detected, updating security info");
          setTimeout(() => {
            panelManager.updateUnifiedSecurityInfo();
          }, 100);
        }
      },
      onSecurityChange: function(browser, webProgress, request, state) {
        if (browser === gBrowser.selectedBrowser) {
          debugLog("Security change detected, updating security info");
          setTimeout(() => {
            panelManager.updateUnifiedSecurityInfo();
          }, 50);
        }
      },
      onStateChange: function(browser, webProgress, request, stateFlags, status) {
        if (browser === gBrowser.selectedBrowser) {
          // Only update on document load completion
          const Ci = Components.interfaces;
          if (stateFlags & Ci.nsIWebProgressListener.STATE_STOP && 
              stateFlags & Ci.nsIWebProgressListener.STATE_IS_DOCUMENT) {
            debugLog("Document load completed, updating security info");
            setTimeout(() => {
              panelManager.updateUnifiedSecurityInfo();
            }, 200);
          }
        }
      }
    });

    // Also listen for identity handler updates
    try {
      if (window.gIdentityHandler) {
        const originalRefresh = window.gIdentityHandler.refreshIdentityPopup;
        if (originalRefresh) {
          window.gIdentityHandler.refreshIdentityPopup = function(...args) {
            const result = originalRefresh.apply(this, args);
            setTimeout(() => {
              panelManager.updateUnifiedSecurityInfo();
            }, 50);
            return result;
          };
        }
      }
    } catch (e) {
      console.debug("Could not hook identity handler refresh:", e.message);
    }
  }

  // Create copy URL toolbar button to the left of unified extensions button
  const createCopyUrlToolbarButton = () => {
    try {
      // Check if button already exists
      if (document.getElementById("unified-copy-url-toolbar-button")) {
        debugLog("Copy URL toolbar button already exists");
        return;
      }

      // Find the page-action-buttons container (where extension-button.uc.js moves the unified extensions button)
      const pageActionButtons = document.getElementById("page-action-buttons");
      const unifiedExtensionsButton = document.getElementById("unified-extensions-button");
      
      if (!pageActionButtons) {
        debugLog("Page action buttons container not found, will retry later");
        return;
      }

      // Create the copy URL button
      const copyUrlButton = document.createXULElement("toolbarbutton");
      copyUrlButton.id = "unified-copy-url-toolbar-button";
      copyUrlButton.className = "toolbarbutton-1 chromeclass-toolbar-additional";
      copyUrlButton.setAttribute("tooltiptext", "Copy URL to clipboard");
      copyUrlButton.setAttribute("cui-areatype", "toolbar");
      copyUrlButton.setAttribute("removable", "true");
      
      // Style to work with the page-action-buttons layout
      copyUrlButton.style.order = '9998'; // One less than unified extensions button (9999)
      copyUrlButton.style.marginLeft = '0px';
      copyUrlButton.style.marginRight = '0px';
      
      // Add click event listener using the existing copyCurrentUrl function
      copyUrlButton.addEventListener("click", (event) => {
        event.stopPropagation();
        panelManager.copyCurrentUrl(event);
      });

      // Insert the button into page-action-buttons
      if (unifiedExtensionsButton && unifiedExtensionsButton.parentNode === pageActionButtons) {
        // Insert before the unified extensions button if it's already moved there
        pageActionButtons.insertBefore(copyUrlButton, unifiedExtensionsButton);
      } else {
        // Just append to page-action-buttons if unified extensions button isn't there yet
        pageActionButtons.appendChild(copyUrlButton);
      }
      
      // Apply same visibility logic as extension-button.uc.js
      updateCopyUrlButtonVisibility();
      
      debugLog("Copy URL toolbar button created successfully in page-action-buttons");
    } catch (err) {
      console.error("Error creating copy URL toolbar button:", err);
    }
  };

  // Update copy URL button visibility using the same logic as extension-button.uc.js
  const updateCopyUrlButtonVisibility = () => {
    try {
      const copyUrlButton = document.getElementById("unified-copy-url-toolbar-button");
      if (!copyUrlButton) return;

      const urlbar = document.getElementById('urlbar');
      
      // Check if URL bar is floating (same as extension-button.uc.js)
      let isFloating = false;
      if (urlbar) {
        isFloating = urlbar.getAttribute('breakout-extend') === 'true' ||
                     urlbar.getAttribute('zen-floating-urlbar') === 'true';
      }

      // Check if it's a blank page (same logic as extension-button.uc.js)
      let isBlankPage = false;
      let identityBox = document.getElementById('identity-box');
      if (identityBox) {
        isBlankPage = identityBox.getAttribute('pageproxystate') === 'invalid';
      } else if (typeof gBrowser !== 'undefined' && gBrowser.selectedBrowser) {
        const currentSpec = gBrowser.selectedBrowser.currentURI.spec;
        isBlankPage = ['about:blank', 'about:newtab', 'about:home'].includes(currentSpec);
      } else {
        // Default to considering it a blank page if identityBox and gBrowser are unavailable
        isBlankPage = true;
      }

      // Hide/show button based on same conditions as unified extensions button
      if (isFloating || isBlankPage) {
        copyUrlButton.style.display = 'none';
      } else {
        copyUrlButton.style.display = '';
      }
      
      // Also update extension button visibility
      updateExtensionButtonVisibilityAndPosition();
    } catch (err) {
      console.error("Error updating copy URL button visibility:", err);
    }
  };

  // CSS Custom Property Change Detection for --zen-primary-color
  const setupCSSPropertyObserver = () => {
    debugLog("URLBarModifier: Setting up CSS property change detection for --zen-primary-color");
    
    // Method 1: MutationObserver on document.documentElement for attribute changes
    const documentObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
          checkColorChange();
        }
      }
    });
    
    documentObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
    
    // Method 2: Listen for zen-workspace-switched event (from tab_sort.uc.js pattern)
    window.addEventListener('zen-workspace-switched', () => {
      debugLog("URLBarModifier: zen-workspace-switched event detected");
      setTimeout(checkColorChange, 100);
    });
    
    // Method 2.5: Hook into ZenWorkspaces if available (similar to tab_sort.uc.js)
    const setupZenWorkspaceHooks = () => {
      if (typeof window.gZenWorkspaces !== 'undefined' && window.gZenWorkspaces.changeWorkspace) {
        const originalChangeWorkspace = window.gZenWorkspaces.changeWorkspace;
        window.gZenWorkspaces.changeWorkspace = function(...args) {
          const result = originalChangeWorkspace.apply(this, args);
          debugLog("URLBarModifier: ZenWorkspaces.changeWorkspace called");
          setTimeout(checkColorChange, 150);
          return result;
        };
        debugLog("URLBarModifier: Hooked into gZenWorkspaces.changeWorkspace");
      } else if (typeof ZenWorkspaces !== 'undefined' && ZenWorkspaces.changeWorkspace) {
        const originalChangeWorkspace = ZenWorkspaces.changeWorkspace;
        ZenWorkspaces.changeWorkspace = function(...args) {
          const result = originalChangeWorkspace.apply(this, args);
          debugLog("URLBarModifier: ZenWorkspaces.changeWorkspace called");
          setTimeout(checkColorChange, 150);
          return result;
        };
        debugLog("URLBarModifier: Hooked into ZenWorkspaces.changeWorkspace");
      } else {
        debugLog("URLBarModifier: ZenWorkspaces not found, will retry later");
        setTimeout(setupZenWorkspaceHooks, 1000);
      }
    };
    
    // Try to setup workspace hooks
    setupZenWorkspaceHooks();
    
    // Method 3: Periodic check as fallback
    let lastKnownColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--zen-primary-color').trim();
    
    const periodicCheck = setInterval(() => {
      checkColorChange();
    }, 500); // Check every 500ms
    
    // Method 4: ResizeObserver as additional trigger
    const resizeObserver = new ResizeObserver(() => {
      checkColorChange();
    });
    resizeObserver.observe(document.documentElement);
    
    function checkColorChange() {
      const currentColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--zen-primary-color').trim();
      
      debugLog(`URLBarModifier: Checking color - Current: "${currentColor}", Last: "${lastKnownColor}"`);
      
      if (currentColor !== lastKnownColor && currentColor) {
        debugLog(`URLBarModifier: --zen-primary-color changed from "${lastKnownColor}" to "${currentColor}"`);
        lastKnownColor = currentColor;
        
        // Trigger workspace color change handler with delay
        setTimeout(() => {
          onWorkspaceColorChange(currentColor);
        }, 50);
      }
    }
    
    // Store observers for cleanup
    window.urlBarModifierCSSObserver = {
      documentObserver,
      resizeObserver,
      periodicCheck,
      disconnect: () => {
        documentObserver.disconnect();
        resizeObserver.disconnect();
        clearInterval(periodicCheck);
      }
    };
    
    debugLog("URLBarModifier: CSS property observer setup complete with multiple detection methods");
  };
  
  // Handle workspace color changes
  const onWorkspaceColorChange = (newColor) => {
    debugLog(`URLBarModifier: Workspace color changed to: ${newColor}`);
    
    // Update PiP toggle state when color changes (it uses --zen-primary-color)
    if (panelManager && typeof panelManager.updatePiPToggleState === 'function') {
      // Force a re-evaluation by temporarily modifying and restoring the PiP button
      const pipButton = document.getElementById("pip-button");
      if (pipButton) {
        // Force a style recalculation
        pipButton.style.display = 'none';
        void pipButton.offsetHeight; // Force reflow
        pipButton.style.display = '';
      }
      panelManager.updatePiPToggleState();
    }
    
    // Update security info when color changes
    if (panelManager && typeof panelManager.updateUnifiedSecurityInfo === 'function') {
      panelManager.updateUnifiedSecurityInfo();
    }
    
    // Update copy URL button visibility when color changes
    updateCopyUrlButtonVisibility();
    
    // Dispatch a custom event for other scripts to listen to
    window.dispatchEvent(new CustomEvent('zen-workspace-color-changed', {
      detail: { color: newColor }
    }));
  };

  // Create the button immediately
  createCopyUrlToolbarButton();

  // Move extension button immediately
  setTimeout(moveExtensionButton, 1500);

  // Setup CSS property observer for workspace color changes
  setupCSSPropertyObserver();

  // Monitor the same changes as extension-button.uc.js to keep buttons in sync
  const copyUrlButtonObserver = new MutationObserver(function(mutationsList) {
    let needsUpdate = false;
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList') {
        for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
          if (node.nodeType === Node.ELEMENT_NODE && (node.id === 'unified-extensions-button' || node.id === 'page-action-buttons' || node.id === 'urlbar')) {
            needsUpdate = true;
            break;
          }
        }
        // Check if copy URL button needs to be recreated or moved
        const copyBtn = document.getElementById('unified-copy-url-toolbar-button');
        const pageActionBtns = document.getElementById('page-action-buttons');
        if (!copyBtn && pageActionBtns) {
          // Button missing but container exists, recreate it
          setTimeout(createCopyUrlToolbarButton, 100);
        } else if (copyBtn && pageActionBtns && copyBtn.parentElement !== pageActionBtns) {
          // Button exists but not in the right place, move it
          needsUpdate = true;
        }
      } else if (mutation.type === 'attributes') {
        const target = mutation.target;
        if (target.nodeType === Node.ELEMENT_NODE) {
          if ((target.id === 'urlbar' && (mutation.attributeName === 'breakout-extend' || mutation.attributeName === 'zen-floating-urlbar')) ||
              (target.id === 'identity-box' && mutation.attributeName === 'pageproxystate')) {
            needsUpdate = true;
          }
        }
      }
      if (needsUpdate) break;
    }

    if (needsUpdate) {
      updateCopyUrlButtonVisibility();
      // Also update extension button visibility and position
      updateExtensionButtonVisibilityAndPosition();
    }
  });

  // Observe the same scope as extension-button.uc.js
  copyUrlButtonObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true
  });

  // Also create it when DOM is ready if it wasn't created initially
  setTimeout(() => {
    createCopyUrlToolbarButton();
  }, 1000);

  // Check if panel needs modification when it's shown
  const checkPanelModification = () => {
    const unifiedPanel = document.querySelector("#unified-extensions-view");
    if (unifiedPanel && !panelManager.unifiedPanelModified) {
      debugLog("URLBarModifier: Panel needs re-modification, applying changes...");
      setTimeout(() => {
        panelManager.modifyUnifiedExtensionsPanel();
        panelManager.modifyPanelPosition();
        panelManager.updateUnifiedSecurityInfo();
        panelManager.updatePiPToggleState();
      }, 50);
    }
  };

  // Automatically modify the unified extensions panel when it opens
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && node.id === 'unified-extensions-view') {
            // Panel was opened, modify it
            debugLog("URLBarModifier: Panel reopened, re-modifying...");
            setTimeout(() => {
              panelManager.modifyUnifiedExtensionsPanel();
              panelManager.modifyPanelPosition();
              // Force security info update with multiple attempts
              debugLog("URLBarModifier: Forcing security info update on panel open");
              panelManager.updateUnifiedSecurityInfo();
              // Try again after a longer delay to ensure all security systems are ready
              setTimeout(() => {
                debugLog("URLBarModifier: Second security info update attempt");
                panelManager.updateUnifiedSecurityInfo();
              }, 300);
              // Always update PiP state when panel opens - with longer delay to ensure CSS is applied
              setTimeout(() => {
                debugLog("URLBarModifier: Updating PiP toggle state after panel open");
                panelManager.updatePiPToggleState();
              }, 200);
            }, 50);
          }
          // Check if unified extensions button was added/recreated
          if (node.nodeType === Node.ELEMENT_NODE && node.id === 'unified-extensions-button') {
            debugLog("URLBarModifier: Unified extensions button detected, creating copy URL button...");
            setTimeout(() => {
              createCopyUrlToolbarButton();
              // Also move the extension button
              moveExtensionButton();
            }, 100);
          }
          // Check if page-action-buttons was added/recreated
          if (node.nodeType === Node.ELEMENT_NODE && node.id === 'page-action-buttons') {
            debugLog("URLBarModifier: Page action buttons detected, creating copy URL button...");
            setTimeout(() => {
              createCopyUrlToolbarButton();
              // Also move the extension button
              moveExtensionButton();
            }, 200);
          }
        });
      }
      // Also check for attribute changes that might indicate panel visibility
      if (mutation.type === 'attributes') {
        const target = mutation.target;
        if (target.id === 'unified-extensions-panel' || target.id === 'unified-extensions-view') {
          checkPanelModification();
          
          // If panel is being shown (not hidden), force PiP state update
          if (target.id === 'unified-extensions-panel' && 
              (mutation.attributeName === 'hidden' || mutation.attributeName === 'style')) {
            const isHidden = target.hasAttribute('hidden') || 
                            target.style.display === 'none' || 
                            target.style.visibility === 'hidden';
            if (!isHidden) {
              debugLog("URLBarModifier: Panel shown, forcing PiP state update");
              setTimeout(() => {
                if (panelManager && typeof panelManager.updatePiPToggleState === 'function') {
                  panelManager.updatePiPToggleState();
                }
              }, 100);
            }
          }
        }
      }
    });
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'hidden', 'class']
  });

  // Also add a periodic check as a fallback
  setInterval(() => {
    checkPanelModification();
  }, 1000);
  
  // Listen for window focus to update security info (in case user switched tabs in another window)
  window.addEventListener('focus', () => {
    debugLog("Window focused, updating security info");
    setTimeout(() => {
      panelManager.updateUnifiedSecurityInfo();
    }, 100);
  });
  
  // Listen for visibility changes to update security info
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      debugLog("Document became visible, updating security info");
      setTimeout(() => {
        panelManager.updateUnifiedSecurityInfo();
      }, 100);
    }
  });

  // Cleanup function for CSS property observer
  const cleanup = () => {
    if (window.urlBarModifierCSSObserver) {
      if (typeof window.urlBarModifierCSSObserver.disconnect === 'function') {
        window.urlBarModifierCSSObserver.disconnect();
} else {
        // Fallback for old observer structure
        window.urlBarModifierCSSObserver.disconnect?.();
      }
      window.urlBarModifierCSSObserver = null;
      debugLog("URLBarModifier: CSS property observer disconnected");
    }
  };

  // Add cleanup listeners
  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('unload', cleanup);
} else {
  debugLog("URLBarModifier: Already initialized, skipping");
}