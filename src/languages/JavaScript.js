define(function (require, exports, module) {
    "use strict";

    var unnamedPlaceholder = "function";

    function _getVisibilityClass(name, isGenerator, isPrivate) {
        var visClass = "";
        if (isGenerator) {
            visClass = " outline-entry-generator";
        }

        if (name === unnamedPlaceholder) {
            visClass += " outline-entry-unnamed";
        } else {
            visClass += " outline-entry-" + (name[0] === "_" || isPrivate ? "private" : "public");
        }
        return visClass;
    }

    function _createListEntry(name, isGenerator, args, line, ch, depth, isPrivate) {

        depth = depth || 0;

        var prefix = '';
        for (var i = 2; i < depth; i++) {
            prefix += '&nbsp; &nbsp; ';
        }

        var displayName = name;

        if (displayName.indexOf('class ') != -1) {
            displayName = "<strong>" + displayName.split('class ')[1].split(' extends')[0] + "</strong>";
            prefix = prefix;
            isGenerator = true;
        } else if (depth <= 2 && name.indexOf('export ') == -1) {
            isPrivate = true;
        }

        displayName = prefix + displayName;

        var $elements = [];
        var $name = $(document.createElement("span"));
        $name.addClass("outline-entry-name");
        $name.html(displayName);
        $elements.push($name);
        var $arguments = $(document.createElement("span"));
        $arguments.addClass("outline-entry-arg");
        $arguments.text(args);
        $elements.push($arguments);

        return {
            name: displayName,
            line: line,
            ch: ch,
            classes: "outline-entry-js outline-entry-icon" + _getVisibilityClass(name, isGenerator, isPrivate),
            $html: $elements
        };
    }

    function _surroundArgs(args) {
        if (args[0] !== "(") {
            args = "(" + args + ")";
        }
        return args;
    }

    function getElements (text) {

        text = text.replace(/</g,"&lt;").replace(/>/g,"&gt;");

        var lines = text.split("\n");
        var i;

        for (i = 0; i < lines.length; i++) {
            var line = lines[i].replace(/{/g,"<block linenum=\"" + i + "\" linelen=\"" + lines[i].length + "\">")
            lines[i] = line.trim();
        }

        i = lines.length;

        while (i--) {
            lines[i] = lines[i].split("//")[0];
        }

        text = lines.join("\n");

        text = text.replace(/}/g,"</block>");
        text = text.replace(/\(/g,"<scope>").replace(/\)/g,"</scope>");
        text = text.replace(/\/\*/g,"<commentblock>").replace(/\/\*/g,"</commentblock>");
        text = text.replace(/;/g,"<br />");
        text = text.replace(/\t/g, "");


        var div = document.createElement('div');
        div.innerHTML = "<block>" + text + "</block>";

        return div;

    }

    function getNamedBlocks (elem, results) {

        if (!elem || ! elem.childNodes) {
            return null;
        }

        var blocks = elem.childNodes;

        for (var block in blocks) {

            var child = blocks[block];

            if (child.nodeName == "BLOCK") {

                var sib = child.previousSibling;
                var foundScope = false;

                while (sib) {

                    if (sib.nodeType == 3 && sib.nodeValue.indexOf("class ") != -1) {
                        foundScope = true;
                    } else if (sib.nodeName == "SCOPE") {
                        foundScope = true;
                        sib = sib.previousSibling;
                        continue;
                    }

                    if (foundScope && sib.nodeType == 3 && sib.nodeValue.trim()) {

                        var args = [];
                        if (sib.nextSibling && sib.nextSibling.nodeName == "SCOPE") {
                            if (sib.nextSibling.firstChild) {
                                args = " (" + sib.nextSibling.firstChild.nodeValue + ")";
                            } else {
                                args = " ()";
                            }
                        }

                        var name = sib.nodeValue.trim();

                        if (name && name != "if" && name != "for" && name != "else" && name != "else if" && name != "switch" && name != "while") {
                            var lineNum = child.attributes ? parseInt(child.getAttribute("linenum")) : 0;
                            var lineLen = child.attributes ? parseInt(child.getAttribute("linelen")) : 0;
                            var depth = 0;
                            var p = child.parentNode;
                            while (p) {
                                depth++;
                                p = p.parentNode;
                            }

                            results.push(_createListEntry(name, false, args, lineNum, lineLen, depth));
                            break;
                        }
                    }

                    if (sib.nodeName == "BR" || sib.nodeName == "BLOCK") {
                        break;
                    }

                    sib = sib.previousSibling;

                }

                getNamedBlocks(child, results);

            }

        }

    }

    function getImports (text) {

        var results = [];

        var lines = text.split("\n");

        for (var i = 0; i < lines.length; i++) {

            var line = lines[i].trim();

            if (line.indexOf("import ") === 0) {

                var name = line.split("import")[1].split(" from")[0].trim();
                var file = " (" + line.split("'").join(" ").split("from ")[1].trim() + ")";
                file = file.replace(";","");

                results.push(_createListEntry(name, false, file, i, lines[i].length, 0, true));

            }

        }

        return results;

    }

    function getOutlineList (text, showArguments, showUnnamed) {

        var results = getImports(text);

        var elements = getElements(text);

        getNamedBlocks(elements, results);

        return results;

    }

    function compare(a, b) {
        if (b.name === unnamedPlaceholder) {
            return -1;
        }
        if (a.name === unnamedPlaceholder) {
            return 1;
        }
        if (a.name > b.name) {
            return 1;
        }
        if (a.name < b.name) {
            return -1;
        }
        return 0;
    }

    module.exports = {
        getOutlineList: getOutlineList,
        compare: compare
    };
});
