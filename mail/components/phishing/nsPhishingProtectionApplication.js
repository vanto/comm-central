const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

// This is copied from toolkit/components/content/js/lang.js.
// It seems cleaner to copy this rather than #include from so far away.
Function.prototype.inherits = function(parentCtor) {
  var tempCtor = function(){};
  tempCtor.prototype = parentCtor.prototype;
  this.superClass_ = parentCtor.prototype;
  this.prototype = new tempCtor();
}

#include application.js
#include globalstore.js
#include list-warden.js
#include phishing-warden.js

var modScope = this;
function Init() {
  var jslib = Cc["@mozilla.org/url-classifier/jslib;1"]
              .getService().wrappedJSObject;
  modScope.G_Debug = jslib.G_Debug;
  modScope.G_Assert = jslib.G_Assert;
  modScope.G_Alarm = jslib.G_Alarm;
  modScope.G_ConditionalAlarm = jslib.G_ConditionalAlarm;
  modScope.G_ObserverWrapper = jslib.G_ObserverWrapper;
  modScope.G_Preferences = jslib.G_Preferences;
  modScope.PROT_XMLFetcher = jslib.PROT_XMLFetcher;
  modScope.BindToObject = jslib.BindToObject;
  modScope.G_Protocol4Parser = jslib.G_Protocol4Parser;
  modScope.PROT_UrlCrypto = jslib.PROT_UrlCrypto;
  modScope.RequestBackoff = jslib.RequestBackoff;

  // We only need to call Init once
  modScope.Init = function() {};
}

function PhishingProtectionApplicationMod() {
}

PhishingProtectionApplicationMod.prototype =
{
  classID: Components.ID("{C46D1931-4B6A-4e52-99B0-7877F70634DE}"),
  _xpcom_factory: {
    createInstance: function (aOuter, aIID) {
      if (aOuter != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;

      Init();
      return new PROT_Application();
    }
  }
};

const NSGetFactory = XPCOMUtils.generateNSGetFactory([PhishingProtectionApplicationMod]);
