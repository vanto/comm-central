/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Test Pilot.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Jono X <jono@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/* Choose correct overlay to apply based on user's update channel setting;
 * do any other tweaking to UI needed to work correctly with user's version.
 * 1. Fx 3.*, default update channel -> TP icon menu in status bar
 * 2. beta update channel -> Feedback button in toolbar, customizable
 * 3. Fx 4.*, default update channel -> TP icon in toolbar, doorhanger notifications
 */

// A lot of the stuff that's currently in browser.js can get moved here.

EXPORTED_SYMBOLS = ["TestPilotUIBuilder"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const UPDATE_CHANNEL_PREF = "app.update.channel";
const POPUP_SHOW_ON_NEW = "extensions.testpilot.popup.showOnNewStudy";
const POPUP_CHECK_INTERVAL = "extensions.testpilot.popup.delayAfterStartup";
const FENNEC_APP_ID = "{a23983c0-fd0e-11dc-95ff-0800200c9a66}";
const THUNDERBIRD_APP_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";

var TestPilotUIBuilder = {
  get _prefs() {
    delete this._prefs;
    return this._prefs = Cc["@mozilla.org/preferences-service;1"]
      .getService(Ci.nsIPrefBranch);
  },

  get _prefDefaultBranch() {
    delete this._prefDefaultBranch;
    return this._prefDefaultBranch = Cc["@mozilla.org/preferences-service;1"]
      .getService(Ci.nsIPrefService).getDefaultBranch("");
  },

  get _comparator() {
    delete this._comparator;
    return this._comparator = Cc["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Ci.nsIVersionComparator);
  },

  get _appVersion() {
    delete this._appVersion;
    return this._appVersion = Cc["@mozilla.org/xre/app-info;1"]
      .getService(Ci.nsIXULAppInfo).version;
  },

  buildTestPilotInterface: function(window) {
    // Don't need Feedback button: remove it
    let feedbackButton = window.document.getElementById("feedback-menu-button");
    if (!feedbackButton) {
      let toolbox = window.document.getElementById("mail-toolbox");
      let palette = toolbox.palette;
      feedbackButton = palette.getElementsByAttribute("id", "feedback-menu-button").item(0);
    }
    feedbackButton.parentNode.removeChild(feedbackButton);

    /* Default prefs for test pilot version - default to NOT notifying user about new
     * studies starting. Note we're setting default values, not current values -- we
     * want these to be overridden by any user set values!!*/
    this._prefDefaultBranch.setBoolPref(POPUP_SHOW_ON_NEW, false);
    this._prefDefaultBranch.setIntPref(POPUP_CHECK_INTERVAL, 180000);
  },

  buildFeedbackInterface: function(window) {
    // Until input.mozilla.org works for Thunderbird, just bail out.
    return;

    /* If this is first run, and it's ffx4 beta version, and the feedback
     * button is not in the expected place, put it there!
     * (copied from MozReporterButtons extension) */

    /* Check if we've already done this customization -- if not, don't do it
     * again  (don't want to put it back in after user explicitly takes it out-
     * bug 577243 )*/

    Cu.import("resource://testpilot/modules/setup.js");

    let mainToolbar;
    if (TestPilotSetup._appID == THUNDERBIRD_APP_ID)
      mainToolbar = window.document.getElementById("mail-bar3");
    else
      mainToolbar = window.document.getElementById("nav-bar");
    let pref = "extensions.testpilot.alreadyCustomizedToolbar";
    let alreadyCustomized = this._prefs.getBoolPref(pref);
    let curSet = mainToolbar.currentSet;

    if (!alreadyCustomized && (-1 == curSet.indexOf("feedback-menu-button"))) {
      // place the buttons after the search box.
      let newSet = curSet + ",feedback-menu-button";
      mainToolbar.setAttribute("currentset", newSet);
      mainToolbar.currentSet = newSet;
      window.document.persist(mainToolbar.id, "currentset");
      this._prefs.setBoolPref(pref, true);
      // if you don't do the following call, funny things happen.
      try {
        window.BrowserToolboxCustomizeDone(true);
      } catch (e) {
      }
    }

    /* Pref defaults for Feedback version: default to notifying user about new
     * studies starting. Note we're setting default values, not current values -- we
     * want these to be overridden by any user set values!!*/
    this._prefDefaultBranch.setBoolPref(POPUP_SHOW_ON_NEW, true);
    this._prefDefaultBranch.setIntPref(POPUP_CHECK_INTERVAL, 600000);

    // Change the happy/sad labels if necessary
    if (TestPilotSetup._appID == THUNDERBIRD_APP_ID) {
      let happy = window.document.getElementById("feedback-menu-happy-button");
      let sad = window.document.getElementById("feedback-menu-sad-button");
      happy.setAttribute("label", happy.getAttribute("thunderbirdLabel"));
      sad.setAttribute("label", sad.getAttribute("thunderbirdLabel"));
    }
  },

  channelUsesFeedback: function() {
    // Thunderbird ships on all channels, so just return false.
    return false;
    
    // Beta and aurora channels use feedback interface; nightly and release channels don't.
//    let channel = this._prefDefaultBranch.getCharPref(UPDATE_CHANNEL_PREF);
//    return (channel == "beta") || (channel == "betatest") || (channel == "aurora");
  },

  hasDoorhangerNotifications: function() {
    // Thunderbird doesn't use the add-on bar (it uses the plain old status
    // bar), and so the doorhanger UI doesn't quite work.
    Cu.import("resource://testpilot/modules/setup.js");

    if (TestPilotSetup._appID == THUNDERBIRD_APP_ID)
      return false;

    try {
      let popupModule = {};
      Components.utils.import("resource://gre/modules/PopupNotifications.jsm", popupModule);
      return true;
    } catch (e) {
      return false;
    }
  },

  buildCorrectInterface: function(window) {
    /* Apply no overlay to Fennec: */
    Cu.import("resource://testpilot/modules/setup.js");

    if (TestPilotSetup._appID == FENNEC_APP_ID) {
      return;
    }
    else if (TestPilotSetup._appID == THUNDERBIRD_APP_ID) {
      // TODO: do something special here, probably
    }
    else {
      let firefoxnav = window.document.getElementById("nav-bar");
      /* This is sometimes called for windows that don't have a navbar - in
       * that case, do nothing. TODO maybe this should be in onWindowLoad?*/
      if (!firefoxnav) {
        return;
      }
    }

    /* Overlay Feedback XUL if we're in the beta update channel, Test Pilot XUL otherwise.
     * Once the overlay is complete, call buildFeedbackInterface() or buildTestPilotInterface(). */
    let self = this;
    if (this.channelUsesFeedback()) {
      window.document.loadOverlay("chrome://testpilot/content/feedback-browser.xul",
                                  {observe: function(subject, topic, data) {
                                     if (topic == "xul-overlay-merged") {
                                       self.buildFeedbackInterface(window);
                                     }
                                   }});
    } else {
      let testPilotOverlay = (this.hasDoorhangerNotifications() ?
                              "chrome://testpilot/content/tp-browser-popupNotifications.xul" :
                              "chrome://testpilot/content/tp-browser-customNotifications.xul");
      window.document.loadOverlay(testPilotOverlay,
                                  {observe: function(subject, topic, data) {
                                     if (topic == "xul-overlay-merged") {
                                       self.buildTestPilotInterface(window);
                                     }
                                  }});
    }
  },

  getNotificationManager: function() {
    // If we're on Android, use the Android notification manager!
    let ntfnModule = {};
    Cu.import("resource://testpilot/modules/notifications.js", ntfnModule);
    Components.utils.import("resource://gre/modules/Services.jsm");
    Cu.import("resource://testpilot/modules/setup.js");

    Services.console.logStringMessage("appID is " + TestPilotSetup._appID);
    if (TestPilotSetup._appID == FENNEC_APP_ID) {
      Services.console.logStringMessage("making Android Notfn Manager..");
      return new ntfnModule.AndroidNotificationManager();
    }

    // Use custom notifications anchored to the Feedback button, if there is a Feedback button
    if (this.channelUsesFeedback()) {
      Services.console.logStringMessage("making Custom Notfn Manager..");
      return new ntfnModule.CustomNotificationManager(true);
    }
    // If no feedback button, and popup notifications available, use those
    if (this.hasDoorhangerNotifications()) {
      Services.console.logStringMessage("making Popup Notfn Manager..");
      return new ntfnModule.PopupNotificationManager();
    }
    // If neither one is available, use custom notifications anchored to Test Pilot status icon
    Services.console.logStringMessage("making Custom Notfn Manager..");
    return new ntfnModule.CustomNotificationManager(false);
  }
};
