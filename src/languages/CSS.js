define(function (require, exports, module) {
    "use strict";

    var Editor = brackets.getModule("editor/Editor").Editor;

    function _getTypeClass(name) {
        var classes = {
            "#": "id",
            ".": "class",
            "@": "at-rules",
            "[": "attribute"
        };
        return " outline-entry-css-" + (classes[name[0]] || "tag");
    }

    function _createListEntry(name, indent, line, ch) {
        var $elements = [];
        if (indent) {
            var $indentation = $(document.createElement("span"));
            $indentation.addClass("outline-entry-indent");
            var interpunct = "";
            for (var i = 0; i < indent; i++) {
                interpunct += "·";
            }
            $indentation.text(interpunct);
            $elements.push($indentation);
        }
        var $name = $(document.createElement("span"));
        var typeClass = _getTypeClass(name);
        $name.addClass("outline-entry-name");
        $name.text(name);
        $elements.push($name);
        return {
            name: name,
            line: line,
            ch: ch,
            classes: "outline-entry-css outline-entry-icon" + typeClass,
            $html: $elements
        };
    }

    function _getIndentationLevel(whitespace) {
        if (!whitespace) {
            return 0;
        }
        var indentSize = Editor.getUseTabChar() ? Editor.getTabSize() : Editor.getSpaceUnits();
        var tmpSpaces = "";
        for (var i = 0; i < indentSize; i++) {
            tmpSpaces += " ";
        }
        whitespace = whitespace.replace(/\t/g, tmpSpaces);
        return (whitespace.length / indentSize) || 0;
    }

    /**
     * Create the entry list of functions language dependent.
     * @param   {Array} text Documents text with normalized line endings.
     * @returns {Array} List of outline entries.
     */
    function getOutlineList(text) {
        var lines = text.replace(/(\n*)\{/g, "{$1").split("\n");
        var regex = /^([ \t]*)([^\d{][^{]+){$/g;
        var result = [];
        lines.forEach(function (line, index) {
            if (line.length > 1000) {
                return;
            }
            var match = regex.exec(line);
            while (match !== null) {
                var whitespace = match[1];
                var name = match[2].trim();
                result.push(_createListEntry(name, _getIndentationLevel(whitespace), index, line.length));
                match = regex.exec(line);
            }
        });
        return result;
    }

    function compare(a, b) {
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
