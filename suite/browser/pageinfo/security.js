/* -*- Mode: Javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
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
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corp.
 * Portions created by the Initial Developer are Copyright (C) 2001-2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Terry Hayes <thayes@netscape.com>
 *   Florian QUEZE <f.qu@queze.net>
 *   Daniel Brooks <db48x@yahoo.com>
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

var security = {
  // Display the server certificate (static)
  viewCert : function () {
    var cert = security._cert;
    viewCertHelper(window, cert);
  },

  _getSecurityInfo : function() {
    const nsIX509Cert = Components.interfaces.nsIX509Cert;
    const nsIX509CertDB = Components.interfaces.nsIX509CertDB;
    const nsX509CertDB = "@mozilla.org/security/x509certdb;1";
    const nsISSLStatusProvider = Components.interfaces.nsISSLStatusProvider;
    const nsISSLStatus = Components.interfaces.nsISSLStatus;
    const nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;

    // We don't have separate info for a frame, return null until further notice
    // (see bug 138479)
    if (gWindow != gWindow.top)
      return null;

    var hName = null;
    try {
      hName = gWindow.location.host;
    }
    catch (exception) { }

    var ui = security._getSecurityUI();

    var isBroken = ui &&
      (ui.state & nsIWebProgressListener.STATE_IS_BROKEN);
    var isInsecure = ui &&
      (ui.state & nsIWebProgressListener.STATE_IS_INSECURE);
    var isEV = ui &&
      (ui.state & nsIWebProgressListener.STATE_IDENTITY_EV_TOPLEVEL);
    var status = ui ? ui.QueryInterface(nsISSLStatusProvider).SSLStatus : null;

    if (!isInsecure && status) {
      status.QueryInterface(nsISSLStatus);
      var cert = status.serverCert;
      var issuerName =
        this.mapIssuerOrganization(cert.issuerOrganization) || cert.issuerName;

      var retval = {
        hostName : hName,
        cAName : issuerName,
        encryptionAlgorithm : undefined,
        encryptionStrength : undefined,
        isBroken : isBroken,
        isEV : isEV,
        cert : cert,
        fullLocation : gWindow.location
      };

      try {
        retval.encryptionAlgorithm = status.cipherName;
        retval.encryptionStrength = status.secretKeyLength;
      }
      catch (e) {
      }

      return retval;
    } else {
      return {
        hostName : hName,
        cAName : "",
        encryptionAlgorithm : "",
        encryptionStrength : 0,
        isBroken : isBroken,
        isEV : isEV,
        cert : null,
        fullLocation : gWindow.location        
      };
    }
  },

  // Find the secureBrowserUI object (if present)
  _getSecurityUI : function() {
    if ("gBrowser" in window.opener)
      return window.opener.gBrowser.securityUI;
    return null;
  },

  // Interface for mapping a certificate issuer organization to
  // the value to be displayed.
  // Bug 82017 - this implementation should be moved to pipnss C++ code
  mapIssuerOrganization: function(name) {
    if (!name) return null;

    if (name == "RSA Data Security, Inc.") return "Verisign, Inc.";

    // No mapping required
    return name;
  },
  
  /**
   * Open the cookie manager window
   */
  viewCookies : function()
  {
    toDataManager(this._getSecurityInfo().hostName + '|cookies');
  },

  /**
   * Open the login manager window
   */
  viewPasswords : function()
  {
    toDataManager(this._getSecurityInfo().hostName + '|passwords');
  },

  _cert : null
};

function securityOnLoad() {
  var info = security._getSecurityInfo();
  if (!info)
    return;

  const pageInfoBundle = document.getElementById("pageinfobundle");

  /* Set Identity section text */
  setText("security-identity-domain-value", info.hostName);

  var owner, verifier, generalPageIdentityString, identityClass;
  if (info.cert && !info.isBroken) {
    // Try to pull out meaningful values.  Technically these fields are optional
    // so we'll employ fallbacks where appropriate.  The EV spec states that Org
    // fields must be specified for subject and issuer so that case is simpler.
    if (info.isEV) {
      owner = info.cert.organization;
      verifier = security.mapIssuerOrganization(info.cAName);
      generalPageIdentityString =
        pageInfoBundle.getFormattedString("generalSiteIdentity",
                                          [owner, verifier]);
      identityClass = "verifiedIdentity";
    }
    else {
      // Technically, a non-EV cert might specify an owner in the O field or not,
      // depending on the CA's issuing policies.  However we don't have any programmatic
      // way to tell those apart, and no policy way to establish which organization
      // vetting standards are good enough (that's what EV is for) so we default to
      // treating these certs as domain-validated only.
      owner = pageInfoBundle.getString("securityNoOwner");
      verifier = security.mapIssuerOrganization(info.cAName ||
                                                info.cert.issuerCommonName ||
                                                info.cert.issuerName);
      generalPageIdentityString = owner;
      identityClass = "verifiedDomain";
    }
  }
  else {
    // We don't have valid identity credentials.
    owner = pageInfoBundle.getString("securityNoOwner");
    verifier = pageInfoBundle.getString("notSet");
    generalPageIdentityString = owner;
    identityClass = "";
  }

  setText("security-identity-owner-value", owner);
  setText("security-identity-verifier-value", verifier);
  setText("general-security-identity", generalPageIdentityString);
  document.getElementById("identity-icon").className = identityClass;

  /* Manage the View Cert button*/
  if (info.cert)
    security._cert = info.cert;
  document.getElementById("security-view-cert").collapsed = !info.cert;

  /* Set Privacy & History section text */
  var yesStr = pageInfoBundle.getString("yes");
  var noStr = pageInfoBundle.getString("no");

  var hasCookies = hostHasCookies(info.hostName);
  setText("security-privacy-cookies-value", hasCookies ? yesStr : noStr);
  document.getElementById("security-view-cookies").disabled = !hasCookies;
  var hasPasswords = realmHasPasswords(info.fullLocation);
  setText("security-privacy-passwords-value", hasPasswords ? yesStr : noStr);
  document.getElementById("security-view-password").disabled = !hasPasswords;

  var visitCount = previousVisitCount(info.hostName);
  if(visitCount > 1) {
    setText("security-privacy-history-value",
            pageInfoBundle.getFormattedString("securityNVisits", [visitCount.toLocaleString()]));
  }
  else if (visitCount == 1) {
    setText("security-privacy-history-value",
            pageInfoBundle.getString("securityOneVisit"));
  }
  else {
    setText("security-privacy-history-value", noStr);
  }

  /* Set the Technical Detail section messages */
  const pkiBundle = document.getElementById("pkiBundle");
  var hdr;
  var msg1;
  var msg2;

  if (info.isBroken) {
    hdr = pkiBundle.getString("pageInfo_MixedContent");
    msg1 = pkiBundle.getString("pageInfo_Privacy_Mixed1");
    msg2 = pkiBundle.getString("pageInfo_Privacy_None2");
  }
  else if (info.encryptionStrength >= 90) {
    hdr = pkiBundle.getFormattedString("pageInfo_StrongEncryptionWithBits",
                                       [info.encryptionAlgorithm, info.encryptionStrength + ""]);
    msg1 = pkiBundle.getString("pageInfo_Privacy_Strong1");
    msg2 = pkiBundle.getString("pageInfo_Privacy_Strong2");
    security._cert = info.cert;
  }
  else if (info.encryptionStrength > 0) {
    hdr  = pkiBundle.getFormattedString("pageInfo_WeakEncryptionWithBits",
                                        [info.encryptionAlgorithm, info.encryptionStrength + ""]);
    msg1 = pkiBundle.getFormattedString("pageInfo_Privacy_Weak1", [info.hostName]);
    msg2 = pkiBundle.getString("pageInfo_Privacy_Weak2");
  }
  else {
    hdr = pkiBundle.getString("pageInfo_NoEncryption");
    if (info.hostName != null)
      msg1 = pkiBundle.getFormattedString("pageInfo_Privacy_None1", [info.hostName]);
    else
      msg1 = pkiBundle.getString("pageInfo_Privacy_None3");
    msg2 = pkiBundle.getString("pageInfo_Privacy_None2");
  }
  setText("security-technical-shortform", hdr);
  setText("security-technical-longform1", msg1);
  setText("security-technical-longform2", msg2); 
  setText("general-security-privacy", hdr);
}

function setText(id, value)
{
  var element = document.getElementById(id);
  if (!element)
    return;
  if (element.localName == "textbox" || element.localName == "label")
    element.value = value;
  else {
    if (element.hasChildNodes())
      element.removeChild(element.firstChild);
    var textNode = document.createTextNode(value);
    element.appendChild(textNode);
  }
}

function viewCertHelper(parent, cert)
{
  if (!cert)
    return;

  var cd = Components.classes[CERTIFICATEDIALOGS_CONTRACTID].getService(nsICertificateDialogs);
  cd.viewCert(parent, cert);
}

/**
 * Return true iff we have cookies for hostName
 */
function hostHasCookies(hostName) {
  if (!hostName)
    return false;

  return Services.cookies.countCookiesFromHost(hostName) > 0;
}

/**
 * Return true iff realm (proto://host:port) (extracted from location) has
 * saved passwords
 */
function realmHasPasswords(location) {
  if (!location) 
    return false;
  
  return Services.logins.countLogins(makeURI(location).prePath, "", "") > 0;
}

/**
 * Return the number of previous visits recorded for host before today.
 *
 * @param host - the domain name to look for in history
 */
function previousVisitCount(host, endTimeReference) {
  if (!host)
    return false;

  var historyService = Components.classes["@mozilla.org/browser/nav-history-service;1"]
                                 .getService(Components.interfaces.nsINavHistoryService);

  var options = historyService.getNewQueryOptions();
  options.resultType = options.RESULTS_AS_VISIT;

  // Search for visits to this host before today
  var query = historyService.getNewQuery();
  query.endTimeReference = query.TIME_RELATIVE_TODAY;
  query.endTime = 0;
  query.domain = host;

  var result = historyService.executeQuery(query, options);
  result.root.containerOpen = true;
  var cc = result.root.childCount;
  result.root.containerOpen = false;
  return cc;
}
