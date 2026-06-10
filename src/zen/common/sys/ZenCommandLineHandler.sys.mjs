/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Command line handler for Zen specific flags. Registered under the
 * "command-line-handler" category as "m-zen", so it runs after the
 * browser content handler ("m-browser") and before the default URL
 * handler ("x-default").
 */
export class ZenCommandLineHandler {
  QueryInterface = ChromeUtils.generateQI(["nsICommandLineHandler"]);

  helpInfo =
    "  --zen-workspace <space> [<url>]  Open <url> in the workspace with the given name or UUID.\n";

  /**
   * Workspace requested with `--zen-workspace` at startup, before any
   * browser window exists. Consumed by gZenWorkspaces when the first
   * window restores its spaces.
   */
  static initialWorkspace = null;

  handle(cmdLine) {
    let workspace = null;
    try {
      workspace = cmdLine.handleFlagWithParam("zen-workspace", false);
    } catch (e) {
      // Flag was passed without a value.
      return;
    }
    if (workspace === null) {
      return;
    }

    let targetWin = Services.wm.getMostRecentWindow("navigator:browser");
    if (
      !targetWin?.gZenWorkspaces?.workspaceEnabled ||
      targetWin.gZenWorkspaces.isPrivateWindow
    ) {
      targetWin = null;
      for (const win of Services.wm.getEnumerator("navigator:browser")) {
        if (
          !win.closed &&
          win.gZenWorkspaces?.workspaceEnabled &&
          !win.gZenWorkspaces.isPrivateWindow
        ) {
          targetWin = win;
        }
      }
    }

    if (!targetWin) {
      // Startup: let the default handler open the URL normally, the
      // first window will restore directly into the requested workspace.
      ZenCommandLineHandler.initialWorkspace = workspace;
      return;
    }

    let url = null;
    try {
      url = cmdLine.handleFlagWithParam("url", false);
    } catch (e) {}
    if (url === null) {
      for (let i = cmdLine.length - 1; i >= 0; i--) {
        const arg = cmdLine.getArgument(i);
        if (arg && arg[0] != "-") {
          url = arg;
          cmdLine.removeArguments(i, i);
          break;
        }
      }
    }
    let uriSpec = null;
    if (url !== null) {
      try {
        uriSpec = cmdLine.resolveURI(url).spec;
      } catch (e) {}
    }

    targetWin.gZenWorkspaces.openLinkInWorkspaceFromCommandLine(
      workspace,
      uriSpec
    );
    targetWin.focus();
    cmdLine.preventDefault = true;
  }
}
