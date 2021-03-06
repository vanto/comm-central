/* -*- Mode: Java; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*-
 * ***** BEGIN LICENSE BLOCK *****
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
 * The Original Code is Mozilla Communicator client code, released
 * March 31, 1998.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2002
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Scott MacGregor <mscott@netscape.com>
 *   Seth Spitzer <sspitzer@netscape.com>
 *   Stefan Borggraefe <borggraefe@despammed.com>
 *   Gervase Markham <gerv@gerv.net>
 *   Karsten Düsterloh <mnyromyr@tprac.de>
 *   Jens Hatlak <jh@junetz.de>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either of the GNU General Public License Version 2 or later (the "GPL"),
 * or the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
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


var gMailListView;
var gListBox;
var gEditButton;
var gDeleteButton;
var gMailViewListController =
{
  supportsCommand: function(aCommand)
  {
    switch (aCommand)
    {
      case "cmd_new":
      case "cmd_edit":
      case "cmd_delete":
        return true;
    }
    return false;
  },

  isCommandEnabled: function(aCommand)
  {
    switch (aCommand)
    {
      case "cmd_new":
        return true;
      case "cmd_edit":
      case "cmd_delete":
        return gListBox.selectedIndex >= 0;
    }
    return false;
  },

  doCommand: function(aCommand)
  {
    switch (aCommand)
    {
      case "cmd_new":
        OnNewMailView();
        break;
      case "cmd_edit":
        OnEditMailView();
        break;
      case "cmd_delete":
        OnDeleteMailView();
        break;
    }
  },

  onEvent: function(aEvent) {},

  onCommandUpdate: function()
  {
    for each (let command in ["cmd_new", "cmd_edit", "cmd_delete"])
      goUpdateCommand(command);
  }
};

function MailViewListOnLoad()
{
  gMailListView = Components.classes["@mozilla.org/messenger/mailviewlist;1"]
                            .getService(Components.interfaces.nsIMsgMailViewList);
  gListBox = document.getElementById('mailViewList');

  window.controllers.insertControllerAt(0, gMailViewListController);

  // Construct list view based on current mail view list data
  RefreshListView(null);
  gEditButton = document.getElementById('editButton');
  gDeleteButton = document.getElementById('deleteButton');
}

function MailViewListOnUnload()
{
  window.controllers.removeController(gMailViewListController);
}

function RefreshListView(aSelectedMailView)
{
  // remove any existing items in the view...
  for (let index = gListBox.getRowCount(); index > 0; index--)
    gListBox.removeChild(gListBox.getItemAtIndex(index - 1));

  var numItems = gMailListView.mailViewCount;
  for (let index = 0; index < numItems; index++)
  {
    let mailView = gMailListView.getMailViewAt(index);
    gListBox.appendItem(mailView.prettyName, index);
    if (aSelectedMailView && (mailView.prettyName == aSelectedMailView.prettyName))
      gListBox.selectedIndex = index;
  }
}

function OnNewMailView()
{
  window.openDialog('chrome://messenger/content/mailViewSetup.xul',
                    '',
                    'centerscreen,resizable,modal,titlebar,chrome',
                    {onOkCallback: RefreshListView});
}

function OnDeleteMailView()
{
  var strBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"]
                                   .getService(Components.interfaces.nsIStringBundleService);
  var bundle = strBundleService.createBundle("chrome://messenger/locale/messenger.properties");

  var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                .getService(Components.interfaces.nsIPromptService);
  if (!promptService.confirm(window, bundle.GetStringFromName("confirmViewDeleteTitle"),
                             bundle.GetStringFromName("confirmViewDeleteMessage")))
    return;

  // get the selected index
  var selectedIndex = gListBox.selectedIndex;
  if (selectedIndex >= 0)
  {
    var mailView = gMailListView.getMailViewAt(selectedIndex);
    if (mailView)
    {
      gMailListView.removeMailView(mailView);
      // now remove it from the view...
      gListBox.removeChild(gListBox.selectedItem);

      // select the next item in the list..
      if (selectedIndex < gListBox.getRowCount())
        gListBox.selectedIndex = selectedIndex;
      else
        gListBox.selectedIndex = gListBox.getRowCount() - 1;

      gMailListView.save();
    }
  }
}

function OnEditMailView()
{
  // get the selected index
  var selectedIndex = gListBox.selectedIndex;
  if (selectedIndex >= 0)
  {
    let selMailView = gMailListView.getMailViewAt(selectedIndex);
    // open up the mail view setup dialog passing in the mail view as an argument
    let args = {mailView: selMailView, onOkCallback: RefreshListView};
    window.openDialog('chrome://messenger/content/mailViewSetup.xul',
                      '',
                      'centerscreen,modal,resizable,titlebar,chrome',
                      args);
  }
}

function OnMailViewSelect(aEvent)
{
  gMailViewListController.onCommandUpdate();
}

function OnMailViewDoubleClick(aEvent)
{
  if (aEvent.button == 0 && aEvent.target.selected)
    OnEditMailView();
}
