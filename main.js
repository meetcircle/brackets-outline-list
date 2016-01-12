define(function (require, exports, module) {
    "use strict";

    var CommandManager = brackets.getModule("command/CommandManager");
    var Commands       = brackets.getModule("command/Commands");
    var Menus           = brackets.getModule("command/Menus");
    var DocumentManager = brackets.getModule("document/DocumentManager");
    var ProjectManager = brackets.getModule("project/ProjectManager");
    var EditorManager   = brackets.getModule("editor/EditorManager");
    var Resizer         = brackets.getModule("utils/Resizer");
    var AppInit         = brackets.getModule("utils/AppInit");
    var ExtensionUtils  = brackets.getModule("utils/ExtensionUtils");
    var _               = brackets.getModule("thirdparty/lodash");

    var Strings         = require("strings");
    var prefs           = require("src/Preferences");
    var ListTemplate    = require("text!templates/outline.html");

    ExtensionUtils.loadStyleSheet(module, "styles/styles.css");

    var prefix = "hirse.outline";

    var languages = {
        JavaScript:             require("src/languages/JavaScript"),
        CoffeeScript:           require("src/languages/CoffeeScript"),
        CSS:                    require("src/languages/CSS"),
        SCSS:                   require("src/languages/CSS"),
        LESS:                   require("src/languages/CSS"),
        Stylus:                 require("src/languages/Stylus"),
        PHP:                    require("src/languages/PHP"),
        Python:                 require("src/languages/Python"),
        Markdown:               require("src/languages/Markdown"),
        "Markdown (GitHub)":    require("src/languages/Markdown"),
        XML:                    require("src/languages/XML"),
        HTML:                   require("src/languages/XML"),
        SVG:                    require("src/languages/XML"),
        Jade:                   require("src/languages/Jade")
    };
    
    var fileHistory = [];

    function getOutline() {
        var $outline = Mustache.render(ListTemplate, {
            Strings: Strings
        });
        $outline = $($outline);

        $outline.on("click", "#outline-close", toggleEnabled);
        $outline.on("click", "#outline-move", function () {
            hideOutline(function () {
                prefs.togglePref("sidebar");
                updateOutline();
            });
        });
        return $outline;
    }

    function goToLine(event) {
        var currentEditor = EditorManager.getActiveEditor();
        currentEditor.setCursorPos(event.data.line, event.data.ch, true);
        currentEditor.focus();
    }

    function loadFile(event) {

        var file = event.data.file;

        if (file) {

            file = file.trim();
            var absFile = '';

            if (file.indexOf("/") == -1) {

                var baseDir = ProjectManager.getProjectRoot();

                file = "node_modules/" + file + "/";
                absFile = baseDir.fullPath + file;

                CommandManager.execute(Commands.FILE_OPEN_FOLDER, absFile);


            } else {

                var doc = DocumentManager.getCurrentDocument();

                if (doc) {

                    var f = doc.file;

                    absFile = f._parentPath + file;

                    if (absFile.indexOf(".js") == -1) absFile += ".js";
                    
                    fileHistory.push(f.fullPath);

                    CommandManager.execute(Commands.CMD_ADD_TO_WORKINGSET_AND_OPEN, {fullPath: absFile, paneId: "first-pane"});

                }
            }

        }
    }
    
    function historyBack() {
        
        if (fileHistory.length) {
            
            var fullPath = fileHistory.pop();
            CommandManager.execute(Commands.CMD_ADD_TO_WORKINGSET_AND_OPEN, {fullPath: fullPath, paneId: "first-pane"});
            
        }
        
    }

    function updateOutline() {
        var doc = DocumentManager.getCurrentDocument();
        if (!doc) {
            hideOutline();
            return;
        }

        var lang = languages[doc.getLanguage().getName()];
        if (!lang) {
            hideOutline();
            return;
        }

        showOutline();
        
        var $entry;
        
        if (fileHistory.length) {
            $entry = $(document.createElement("li"));
            $entry.addClass("outline-history");
            $entry.html('&laquo; back');
            $entry.click({}, historyBack);
            $("#outline-list ul").append($entry);
        }
        
        var list = lang.getOutlineList(doc.getText(), prefs.get("args"), prefs.get("unnamed"));
        
        if (prefs.get("sort") && lang.compare) {
            list.sort(lang.compare);
        }

        list.forEach(function (entry) {
            $entry = $(document.createElement("li"));
            $entry.addClass("outline-entry");
            $entry.addClass(entry.classes);
            $entry.append(entry.$html);

            if (entry.classes.indexOf('outline-entry-js-import') != -1) {
                $entry.click({
                    file: entry.args.split("(").join("").split(")").join("")
                }, loadFile);
            } else {
                $entry.click({
                    line: entry.line,
                    ch: entry.ch
                }, goToLine);
            }

            $("#outline-list ul").append($entry);
        });
    }

    function onResize() {
        var toolbarPx = $("#main-toolbar:visible").width() || 0;
        $(".content").css("right", ($("#outline").width() || 0) + toolbarPx + "px");
    }

    function showOutline() {
        if ($("#outline").length) {
            $("#outline-list ul").empty();
            return;
        }

        var $outline = getOutline();
        if (prefs.get("sidebar")) {
            $("#sidebar").append($outline);
            $("#outline").addClass("outline-sidebar");
            Resizer.makeResizable($outline, "vert", "top", 75);
        } else {
            var toolbarPx = $("#main-toolbar:visible").width() || 0;
            $(".main-view").append($outline);
            $("#outline").css("right", toolbarPx + "px");
            $("#outline").addClass("outline-main quiet-scrollbars");
            Resizer.makeResizable($outline, "horz", "left", 150);
            $outline.on("panelResizeUpdate", onResize);
            onResize();
        }
        Menus.ContextMenu.assignContextMenuToSelector("#outline-settings", settingsMenu);
    }

    function hideOutline(onHideCompleted) {
        if (prefs.get("sidebar")) {
            $("#outline").slideUp(function () {
                $(this).remove();
                onResize();
                if (onHideCompleted) {
                    onHideCompleted();
                }
            });
        } else {
            $("#outline").remove();
            onResize();
            if (onHideCompleted) {
                onHideCompleted();
            }
        }
    }

    function enableOutline() {
        $("#outline-toolbar-icon").addClass("enabled");
        EditorManager.on("activeEditorChange", updateOutline);
        DocumentManager.on("documentSaved", updateOutline);
        updateOutline();
    }

    function disableOutline() {
        hideOutline();
        $("#outline-toolbar-icon").removeClass("enabled");
        EditorManager.off("activeEditorChange", updateOutline);
        DocumentManager.off("documentSaved", updateOutline);
    }

    function toggleEnabled() {
        if (prefs.togglePref("enabled")) {
            enableOutline();
        } else {
            disableOutline();
        }
    }


    /* Create Settings Context Menu */
    var settingsMenu = Menus.registerContextMenu("hirse-outline-context-menu");
    _.each(prefs.getSettings(), function (status, key) {
        var commandName = prefix + "." + key;
        var commandString = Strings["COMMAND_" + key.toUpperCase()];
        var command = CommandManager.register(commandString, commandName, function () {
            var checked = prefs.togglePref(commandName.split(".")[2]);
            command.setChecked(checked);
            updateOutline();
        });
        command.setChecked(status);
        settingsMenu.addMenuItem(command);
    });

    /* Create Toolbar Icon */
    $(document.createElement("a"))
        .attr("id", "outline-toolbar-icon")
        .attr("href", "#")
        .attr("title", Strings.TOOLBAR_ICON_TOOLTIP)
        .on("click", toggleEnabled)
        .appendTo($("#main-toolbar .buttons"));

    AppInit.appReady(onResize);
    if (prefs.get("enabled")) {
        enableOutline();
    }
});
