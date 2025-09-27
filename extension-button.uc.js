// ==UserScript==
// @name         Move Unified Extension Button
// @version      1.0
// @description  Moves the unified extension button to identity-box and hides it on blank pages or when URL bar is floating.
// @author       bxthesda
// @match        chrome://browser/content/browser.xhtml
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let attempts = 0;
    const MAX_ATTEMPTS = 20; // Try for about 10 seconds (20 * 500ms)
    let scriptObserver = null;

    function updateButtonVisibilityAndPosition() {
        // console.log("Attempting to updateButtonVisibilityAndPosition");
        let unifiedExtensionsButton = document.getElementById('unified-extensions-button');
        let pageActionButtons = document.getElementById('page-action-buttons');
        let urlbar = document.getElementById('urlbar');

        if (!unifiedExtensionsButton) {
            // console.log('unifiedExtensionsButton not found in updateButtonVisibilityAndPosition.');
            // If button doesn't exist yet, try to run doTheMove again if attempts remain.
            if (attempts < MAX_ATTEMPTS) {
                setTimeout(doTheMove, 100); // Try to make sure it's there
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
            // console.log("Could not determine page state accurately, assuming blank page to hide button.");
        }

        if (isFloating || isBlankPage) {
            // console.log(`Hiding button. Floating: ${isFloating}, BlankPage: ${isBlankPage}`);
            unifiedExtensionsButton.style.display = 'none';
        } else {
            // console.log(`Showing button. Floating: ${isFloating}, BlankPage: ${isBlankPage}`);
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
                    // console.log('Button moved/ensured in page-action-buttons by update logic.');
                }
            } else {
                // console.error('page-action-buttons not found when trying to show/position button. Will be retried by doTheMove.');
                // If pageActionButtons is missing when we need to show the button, trigger doTheMove's retry.
                if (attempts < MAX_ATTEMPTS) {
                    setTimeout(doTheMove, 100);
                }
            }
        }
    }

    function doTheMove() {
        try {
            // console.log('Attempting to doTheMove...');
            let unifiedExtensionsButton = document.getElementById('unified-extensions-button');
            let pageActionButtons = document.getElementById('page-action-buttons');

            if (unifiedExtensionsButton && pageActionButtons) {
                if (unifiedExtensionsButton.parentElement !== pageActionButtons) {
                    pageActionButtons.appendChild(unifiedExtensionsButton);
                    console.log('Unified Extensions Button initially moved to page-action-buttons.');
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
                
                attempts = MAX_ATTEMPTS; // Stop timed retries for finding these specific elements
                updateButtonVisibilityAndPosition(); // Initial visibility update
            } else {
                if (attempts < MAX_ATTEMPTS) {
                    attempts++;
                    setTimeout(doTheMove, 500);
                } else {
                    console.error('Max attempts reached by timer. Could not find unifiedExtensionsButton and/or pageActionButtons for initial move.');
                }
            }
        } catch (e) {
            console.error('Error in doTheMove:', e);
        }
    }

    scriptObserver = new MutationObserver(function(mutationsList) {
        let needsUpdate = false;
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
                    if (node.nodeType === Node.ELEMENT_NODE && (node.id === 'unified-extensions-button' || node.id === 'page-action-buttons' || node.id === 'urlbar')) {
                        needsUpdate = true;
                        break;
                    }
                }
                const btn = document.getElementById('unified-extensions-button');
                const pageActionBtns = document.getElementById('page-action-buttons');
                if (btn && pageActionBtns && btn.parentElement !== pageActionBtns) {
                    needsUpdate = true; // Button exists but is not in page-action-buttons, re-evaluate
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
            // console.log("Observer triggered updateButtonVisibilityAndPosition");
            updateButtonVisibilityAndPosition();
        }
    });

    // Observe the documentElement for broader changes initially.
    // The observer callback will filter for relevant element/attribute changes.
    scriptObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true
    });

    // Initial attempt to move the button after a short delay.
    setTimeout(doTheMove, 1500);

})(); 