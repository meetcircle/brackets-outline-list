define(function (require, exports, module) {
    "use strict";
    
    var unnamedPlaceholder = "function";

    function _getVisibilityClass (name, isGenerator, isPrivate, isImport, args) {
        var visClass = "";
        if (isGenerator) {
            visClass = " outline-entry-generator";
        }

        if (name === unnamedPlaceholder) {
            visClass += " outline-entry-unnamed";
        } else {
            visClass += " outline-entry-" + (isPrivate ? "private" : "public");
        }

        if (isImport) {
            if (args && args.indexOf("/") == -1) {
                visClass = " outline-entry-js-module";
            } else {
                visClass = " outline-entry-js-import";
            }
        }

        return visClass;
    }

    function _createListEntry (name, isGenerator, args, line, ch, depth, isPrivate, isImport) {

        name = name || '';
        depth = depth || 0;

        var prefix = "";
        for (var i = 2; i < depth; i++) {
            prefix += "&nbsp; &nbsp; ";
        }

        var displayName = name;

        if (displayName.indexOf("class ") != -1) {
            displayName = "<strong>" + displayName.split("class ")[1].split(" extends")[0] + "</strong>";
            isGenerator = true;
        } else if (depth <= 2 && name.indexOf("export ") == -1) {
            isPrivate = true;
        }
        
        if (displayName.indexOf("var ") === 0 || displayName.indexOf("let ") === 0) {
            displayName = displayName.slice(4);
        }
        
        if (displayName.indexOf("=function") != -1) {
            displayName = displayName.split("=function").join("");
        }
        
        if (displayName.indexOf("= function") != -1) {
            displayName = displayName.split("= function").join("");
        }
        
        if (displayName.indexOf("function") != -1) {
            displayName = displayName.split("function").join("");
        } 

        displayName = prefix + displayName.trim();

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
            classes: "outline-entry-js outline-entry-icon" + _getVisibilityClass(name, isGenerator, isPrivate, isImport, args),
            $html: $elements,
            args: args,
            depth: depth
        };
    }

    function getElements (text) {

        text = text.replace(/</g,"&lt").replace(/>/g,"&gt");
        text = text.replace(/;/g,"<br />");
        text = text.replace(/&lt/g,"&lt;").replace(/&gt/g,"&gt;");

        var lines = text.split("\n");
        var i, j, qscope;

        for (i = 0; i < lines.length; i++) {
            
            var line = lines[i];
            
            line = line.replace("\\\"", "&quot;");
            line = line.replace("\\'", "&quot;");
            
            if (line.indexOf("\"") != -1 || line.indexOf("'") != -1) {
                
                qscope = 0;
                
                j = line.length;
                
                while (j--) {
                    var c = line.charAt(j);
                    if (c == "'") {
                        if (qscope === 0) {
                            qscope = 1;
                            line = line.slice(0, j) + "</quote>" + line.slice(j + 1);
                        } else if (qscope === 1) {
                            qscope = 0;
                            line = line.slice(0, j) + "<quote>" + line.slice(j + 1);
                        }
                    } else if (c == "\"") {
                        if (qscope === 0) {
                            qscope = 2;
                            line = line.slice(0, j) + "</quote>" + line.slice(j + 1);
                        } else if (qscope === 2) {
                            qscope = 0;
                            line = line.slice(0, j) + "<quote>" + line.slice(j + 1);
                        }
                    }
                }
                
                line = line.replace(/<quote>(.*?)<\/quote>/g, "<quote></quote>");
                line = line.replace(/\(\/(.*?)\//g, "(<regex></regex>");
                
                lines[i] = line;
                
            }
            
            line = line.replace(/{/g,"<block linenum=\"" + i + "\" linelen=\"" + lines[i].length + "\">");
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
        
        text = text.replace(/\t/g, "");
        text = text.replace(/,/g,"<br />");
    
        //console.log(text);
        
        var div = document.createElement("div");
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
                        
                    } else if (sib.nodeType == 3 && sib.nodeValue.trim() == "=>") {
                        
                        break;
                        
                    } else if (sib.nodeName == "SCOPE") {
                        
                        foundScope = true;
                        sib = sib.previousSibling;
                        
                        continue;
                        
                    }
                    
                    if (foundScope && sib.nodeType == 3 && sib.nodeValue.trim()) {

                        var args = [];
                        if (sib.nextSibling && sib.nextSibling.nodeName == "SCOPE") {
                            if (sib.nextSibling.firstChild && sib.nextSibling.firstChild.nodeType === 3) {
                                args = " (" + sib.nextSibling.firstChild.nodeValue.trim() + ")";
                            } else {
                                args = " ()";
                            }
                        }

                        var name = sib.nodeValue.trim();

                        if (name && name != "if" && name != "for" && name != "else" && name != "else if" && 
                            name != "switch" && name != "while" && name != "catch" && name.indexOf("case ") !== 0 &&
                            name.indexOf(",") == -1 && name.trim() !== "function") {
                            
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

            } else if (child.nodeName == "SCOPE") {
                
                getNamedBlocks(child, results);
                
            }

        }

    }

    function getImports (text) {

        var results = [];

        var lines = text.split("\n");

        for (var i = 0; i < lines.length; i++) {

            var line = lines[i].trim();
            line = line.replace(/\"require\(/g, "");
            var name, file;

            if (line.indexOf("import ") === 0) {

                name = line.split("import")[1].split(" from")[0].trim();
                file = " (" + line.split("'").join(" ").split("from ")[1].trim() + ")";
                file = file.replace(";","");

                results.push(_createListEntry(name, false, file, i, lines[i].length, 0, false, true));

            } else if (line.split(" ").join("").indexOf("require(") != -1) {
                
                try {
                    if (line.indexOf('var ') != -1) name = line.split('=')[0].split('var ')[1].trim();
                    else if (line.indexOf('let ') != -1) name = line.split('=')[0].split('let ')[1].trim();
                } catch (err) {
                    console.log("Name parse error", err);
                    name = '';
                }
                file = " (" + line.split("'").join('"').split(" ").join("").split("require(\"")[1].split("\")")[0] + ")";
                
                results.push(_createListEntry(name, false, file, i, lines[i].length, 0, false, true));
                
            }

        }

        return results;

    }

    function getOutlineList (text) {

        var results = getImports(text);

        var elements = getElements(text);
        
        getNamedBlocks(elements, results);
        
        var modules = [];
        var i = results.length;
        
        while (i--) {
         
            if (results[i] && results[i].classes && results[i].classes.indexOf('module') != -1) {
                modules.push(results.splice(i, 1)[0]);
            }
            
        }
        
        if (modules.length) {
            results = modules.concat(results);
            console.log(results);
        }

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
