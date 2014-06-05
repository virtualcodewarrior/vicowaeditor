/* ViCoWaEditor.js - This file is part of the ViCoWa editor
 * @author Rodney Draaisma
 * @version 0.0.4
 * @copyright Copyright (C) 2011-2013 Rodney Draaisma
 * @url www.vicowa.com
 * @license The MIT License - http://www.opensource.org/licenses/mit-license.php
 * -----------------------------------------------------------------------
 * Copyright (c) 2011-2013 Rodney Draaisma : www.vicowa.com
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy 
 * of this software and associated documentation files (the "Software"), to deal 
 * in the Software without restriction, including without limitation the rights to 
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of 
 * the Software, and to permit persons to whom the Software is furnished to do 
 * so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all 
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR 
 * OTHER DEALINGS IN THE SOFTWARE. 
 * -----------------------------------------------------------------------
 * This code makes use of the ACE javascript editor
 * please look into the ACE folder for copyright and license details on ACE 
*/
/*jslint es5: true, regexp: true, devel: true, browser: true, evil: true, plusplus: true*/
/*global $,ace,require,ViCoWaEditorMessages, amplify, unescape, ViCowaEditorBaseDomain, embedded_svg_edit*/
// the variable that will an instance of the editor object

define([
    "core/userhandling/script/login", 
    "library/mimetypeimages/mimetypeimages", 
    "core/contenthandling/vicowafilesystemaccess", 
    "jquery", 
    "library/jquery/jquery.migrate", 
    'jqueryplugin/jquery.noty/layouts/top', 
    'jqueryplugin/jquery.noty/themes/default',
    'jqueryplugin/jquery.vicowa/jquery.vicowa.errorhandling/jquery.vicowa.errorhandling',
    "jqueryplugin/jquery.ui/js/jquery.ui", 
    "jqueryplugin/jquery.spin/jquery.spin"
    ], function(ViCoWaLogin, MimeTypeImageRetriever, ViCowaFileSystemAccess, JQueryDummy, JQueryUIDummy, SpinDummy)
{
    $("<link/>", { type: "text/css", rel: "stylesheet", href: ViCowaEditorBaseDomain + "/raw/shared/apps/ViCoWaEditor/ViCoWaEditor.css" }).appendTo("head");

    $.error = $.ViCoWaErrorHandler.showError;
    $.ViCoWaErrorHandler.setDebug(true);
    $.ViCoWaErrorHandler.setHandler(function(p_ErrorMessage, p_ErrorObject)
    {
        if ($.ViCoWaErrorHandler.isDebug())
        {
            noty({ text: "ViCoWaEditor: " + p_ErrorMessage, type: 'error' });
        }
    });
    
    // create a filter to be used on disabled buttons
    var Style = document.createElement("style");
    Style.innerHTML = '.disabled, .disabled .button-icon{ filter:url("#grayscale"); }';
    document.body.innerHTML += '<svg xmlns="http://www.w3.org/2000/svg" height="0">\n\
    <defs>\n\
    <filter id="grayscale">\n\
    <feColorMatrix type="matrix" values="0.3333 0.3333 0.3333 0 0\n\
                           0.3333 0.3333 0.3333 0 0\n\
                           0.3333 0.3333 0.3333 0 0\n\
                           0      0      0      0.5 0"/>\n\
    </filter></defs></svg>';
    document.body.appendChild(Style);
    
    // create a modal progress dialog for vicowa editor load
    var $ModalOverlay = $("<div/>").css({ "z-index" : "1000", position: "fixed", width: "100%", height: "100%", "left": "0", "top": "0", "background": "#eee url(images/ui-bg_diagonals-thick_90_eeeeee_40x40.png) 50% 50% repeat", opacity: ".8" }).appendTo($("body")),
    $LoadProgress = $("<div/>").css({ "z-index" : "1001", position: "absolute", width: "20em", height: "10em", left: "50%", top: "50%", margin: "-5em 0 0 -10em", padding: "1em", "border-radius" : "1em", "background-color" : "white", border: "1px solid black", "box-shadow": "2px 2px 4px Gray"  }).appendTo($("body"));
    $("<div/>").text("Initializing ViCoWa editor").css({"font-weight": "bold", "text-align" : "center", width: "100%"}).appendTo($LoadProgress);
    var $ProgressText = $("<span/>").appendTo($("<div/>").appendTo($LoadProgress)),
    $SpinContainer = $("<div/>").css({ position: "absolute", left: "1em", right: "1em", bottom: "1em", height: "4em"}).appendTo($LoadProgress).spin();

    MimeTypeImageRetriever.setScriptDomain(ViCowaEditorBaseDomain);
    ViCowaFileSystemAccess.setScriptDomain(ViCowaEditorBaseDomain);
    ViCowaFileSystemAccess.setRememberMeDataRetriever(ViCoWaLogin.getRememberMeData);
    window.ViCoWaEditor = null;
    
    Array.prototype.remove = function()
    {
        var what, 
        a = arguments,
        L = a.length, 
        ax;
        
        while (L && this.length) 
        {
            what = a[--L];
            while ((ax = this.indexOf(what)) !== -1) 
            {
                this.splice(ax, 1);
            }
        }
        return this;
    };    
    // the main namespace that will handle all editing
    function CViCoWaEditor(p_TargetPage, p_AutoEncrypt, ace)
    {
        "use strict";
    
        var EEditorTypes, 
        m_Editors, 
        m_AvailableDocs, 
        m_EditTargetLocation,
        m_MainArticleName, 
        $m_TargetIFrame, 
        $m_TabList,
        $m_ButtonBar,
        $m_SaveButton, 
        $m_SaveAllButton, 
        $m_SavedNotifyTooltip, 
        $m_TabBar, 
        $m_InplaceEditor,
        $m_InplaceTargetSection, 
        $m_InplaceEditorSection,
        $m_Gripper, 
        $m_EditorContainer, 
        $m_OpenButton, 
        $m_DirectorBrowseButton,
        $m_VersionControlButton,
        $m_CloseButton, 
        updateSizes, 
        m_EditToken, 
        m_Events, 
        Index, 
        m_Icons, 
        m_PreviewDocument, 
        m_MainArticleTemplates,
        m_PageContent, 
        m_$ArticleContentPlaceHolder, 
        m_EditorsToUpdate,
        ViCoWaWorker = null,
        m_ManualEncryptPasswords = {},
        m_Autosave = 1,
        HashHandler = require("ace/keyboard/hash_handler").HashHandler,
        config = require("ace/config");

        // auto save interval timer
        setInterval(function()
        {
            // check if there are editors and if any of them are modified
            for (var Index = 0; Index < m_Editors.length; Index++)
            {
                if (m_Autosave == 1 && typeof m_Editors[Index].isModified !== "undefined" && m_Editors[Index].isModified())
                {
                    m_Editors[Index].save(null, false);
                }
            }
        },1000);

        // remove any #url= items from the url, not needed for editor and doesn't work properly for ajax call with cache disabled
        var SourceURL = $.url(p_TargetPage);
        var Object = $.deparam($.param.fragment(p_TargetPage));
        if (Object.url)
        {
            var Port = (SourceURL.attr("port") == "80" || !SourceURL.attr("port")) ? "" : (":" + SourceURL.attr("port"));
            p_TargetPage = SourceURL.attr("protocol") + "://" + SourceURL.attr("host") + Port + Object.url;
        }

        m_EditTargetLocation = p_TargetPage;
        var Url = $.url(m_EditTargetLocation);

        // types of files we support
        EEditorTypes= 
        {
            ET_UNKNOWN :
            {
                id: 0,
                extensions: [] 
            },
            ET_CSS      :
            {
                id: 1,
                extensions: ["css"] 
            },
            ET_JS       :
            {
                id: 2,
                extensions: ["js"] 
            },
            ET_HTML     :
            {
                id: 3,
                extensions: ["html", "htm"] 
            },
            ET_PLAINTEXT:
            {
                id: 4,
                extensions: ["txt", "log"] 
            },
            ET_WIKI     :
            {
                id: 5,
                extensions: ["wiki"] 
            },
            ET_JSON     :
            {
                id: 6,
                    extensions: ["json"] 
    
            },
            ET_XML      :
            {
                id: 7,
                extensions: ["xml"] 
            },
            ET_PHP      :
            {
                id: 8,
                extensions: ["php"] 
            },
            ET_SVG      :
            {
                id: 9,
                extensions: ["svg"] 
            },
        };
     
        // helper object to keep track of the document types available for editing
        function CAvailableDocList()
        {
            var m_Scripts = [], 
            m_Styles = [], 
            m_HTMLs = [], 
            m_Wikis = [], 
            m_JSONs = [], 
            m_XMLs = [],
            m_PHPs = [];

            /// Add the given document info to the given array, but first test if it is not already in there
            /// @param p_Array : the array that will receive the given docuent type
            /// @param p_DocInfo : the document info we are adding to the array
            function addToArray(p_Array, p_DocInfo)
            {
                // try to find the given document in the given array
                for (var Index = 0; Index < p_Array.length; Index++)
                {
                    if (p_Array[Index].name == p_DocInfo.name)
                    {
                        break;
                    }
                }
     
                // if the document was not found, add it here
                if (Index == p_Array.length)
                {
                    p_Array.push(p_DocInfo);
                }
            }
     
            /// Add the given document
            this.addDocLink = function(p_DocLink)
            {
                //
                var DocInfo = { fullurl: p_DocLink, name: unescape(/[^=\/]+$/.exec(p_DocLink)[0]), type: EEditorTypes.ET_UNKNOWN.id, extension: "" },
                Matches = /.*\.(css|json|js|html|xml|php)$/i.exec(DocInfo.name);
     
                // determine the type            
                if (Matches && Matches[1])
                {
                    // test the file extension and assign the proper type 
                    if (/css/i.test(Matches[1]))
                    {
                        DocInfo.type = EEditorTypes.ET_CSS.id;
                        DocInfo.extension = "css";
                        addToArray(m_Styles, DocInfo);
                    }
                    else if (/json/i.test(Matches[1]))
                    {
                        DocInfo.type = EEditorTypes.ET_JSON.id;
                        DocInfo.extension = "json";
                        addToArray(m_JSONs, DocInfo);
                    }
                    else if (/js/i.test(Matches[1]))
                    {
                        DocInfo.type = EEditorTypes.ET_JS.id;
                        DocInfo.extension = "js";
                        addToArray(m_Scripts, DocInfo);
                    }
                    else if (/html/i.test(Matches[1]))
                    {
                        DocInfo.type = EEditorTypes.ET_HTML.id;
                        DocInfo.extension = "html";
                        addToArray(m_HTMLs, DocInfo);
                    }
                    else if (/xml/i.test(Matches[1]))
                    {
                        DocInfo.type = EEditorTypes.ET_XML.id;
                        DocInfo.extension = "xml";
                        addToArray(m_XMLs, DocInfo);
                    }
                    else if (/php/i.test(Matches[1]))
                    {
                        DocInfo.type = EEditorTypes.ET_PHP.id;
                        DocInfo.extension = "php";
                        addToArray(m_PHPs, DocInfo);
                    }
                    else
                    {
                        // if it is not one of the specific types, set matches to null and let it be handled in the next check
                        Matches = null;
                    }
                }
                // for now everything else will be treated the same as wiki text
                if (!Matches)
                {
                    DocInfo.type = EEditorTypes.ET_WIKI.id;
                    DocInfo.extension = "wiki";
                    addToArray(m_Wikis, DocInfo);                
                }
            };
     
            this.getDocCount = function(){ return m_Wikis.length + m_HTMLs.length + m_XMLs.length + m_Styles.length + m_JSONs.length + m_Scripts.length + m_PHPs.length; }; ///< get the number of documents
    
            /// get the document at the given index
            /// @param p_Index : The index from where we want to get the document
            /// @return the document at the given index or null when the index is out of bounds
            this.getDocAtIndex = function(p_Index)
            {
                var Result = null;
                // make sure the index is in range
                if (p_Index >= 0 && p_Index < this.getDocCount())
                {
                    if (p_Index < m_Wikis.length)
                    {
                        Result = m_Wikis[p_Index];
                    }
                    else if (p_Index < m_Wikis.length + m_HTMLs.length)
                    {
                        Result = m_HTMLs[p_Index - m_Wikis.length];
                    }
                    else if (p_Index < m_Wikis.length + m_HTMLs.length + m_XMLs.length)
                    {
                        Result = m_XMLs[p_Index - m_Wikis.length - m_HTMLs.length];
                    }
                    else if (p_Index < m_Wikis.length + m_HTMLs.length + m_XMLs.length + m_Styles.length)
                    {
                        Result = m_Styles[p_Index - m_Wikis.length - m_HTMLs.length - m_XMLs.length];
                    }
                    else if (p_Index < m_Wikis.length + m_HTMLs.length + m_XMLs.length + m_Styles.length + m_JSONs.length)
                    {
                        Result = m_JSONs[p_Index - m_Wikis.length - m_HTMLs.length - m_XMLs.length - m_Styles.length];
                    }
                    else if (p_Index < m_Wikis.length + m_HTMLs.length + m_XMLs.length + m_Styles.length + m_JSONs.length + m_Scripts.length)
                    {
                        Result = m_Scripts[p_Index - m_Wikis.length - m_HTMLs.length - m_XMLs.length - m_Styles.length - m_JSONs.length];
                    }
                    else
                    {
                        Result = m_Scripts[p_Index - m_Wikis.length - m_HTMLs.length - m_XMLs.length - m_Styles.length - m_JSONs.length - m_Scripts.length];
                    }
                }
                return Result;
            };
            this.getWikiCount = function(){ return m_Wikis.length; }; ///< @return the number of wiki documents
            this.getWikiAtIndex = function(p_Index){ return (p_Index >= 0 && p_Index < m_Wikis.length) ? m_Wikis[p_Index] : null; }; ///< @return the wiki document at the given index or null when the index is out of bounds
            this.getHTMLCount = function(){ return m_HTMLs.length; }; ///< @return the number of html documents
            this.getHTMLAtIndex = function(p_Index){ return (p_Index >= 0 && p_Index < m_HTMLs.length) ? m_HTMLs[p_Index] : null; }; ///< @return the html document at the given index or null when the index is out of bounds
            this.getXMLCount = function(){ return m_XMLs.length; }; ///< @return the number of xml documents
            this.getXMLAtIndex = function(p_Index){ return (p_Index >= 0 && p_Index < m_XMLs.length) ? m_XMLs[p_Index] : null; }; ///< @return the xml document at the given index or null when the index is out of bounds
            this.getStyleCount = function(){ return m_Styles.length; }; ///< @return the number of style sheet documents
            this.getStyleAtIndex = function(p_Index){ return (p_Index >= 0 && p_Index < m_Styles.length) ? m_Styles[p_Index] : null; }; ///< @return the css document at the given index or null when the index is out of bounds
            this.getScriptCount = function(){ return m_Scripts.length; }; ///< @return the number of java script documents
            this.getScriptAtIndex = function(p_Index){ return (p_Index >= 0 && p_Index < m_Scripts.length) ? m_Scripts[p_Index] : null; }; ///< @return the javascript document at the given index or null when the index is out of bounds
            this.getJSONCount = function(){ return m_JSONs.length; }; ///< @return the number of json documents
            this.getJSONAtIndex = function(p_Index){ return (p_Index >= 0 && p_Index < m_JSONs.length) ? m_JSONs[p_Index] : null; }; ///< @return the json document at the given index or null when the index is out of bounds
            this.getPHPCount = function(){ return m_PHPs.length; }; ///< @return the number of PHP documents
            this.getPHPAtIndex = function(p_Index){ return (p_Index >= 0 && p_Index < m_PHPs.length) ? m_PHPs[p_Index] : null; }; ///< @return the php document at the given index or null when the index is out of bounds
        }
        // create the object used to keep track of available documents
        m_AvailableDocs = new CAvailableDocList();
     
        /// Hex encode the given sring
        /// @param p_Input : The string that will be encoded
        /// @return The hex encoded string
        function hexEncodeString(p_Input) 
        {
            var Index, HexTable, Result;
            HexTable = "0123456789ABCDEF";
            Result ='';
     
            /// go through the characters and return an HEX code consisting of two hexadecimal characters for each character
            /// not very spae efficient but very siimple code
            for (Index = 0; Index < p_Input.length; Index++) 
            {
                Result += HexTable.charAt(p_Input.charCodeAt(Index) >> 4) + HexTable.charAt(p_Input.charCodeAt(Index) & 0xf);
            }
            return Result;
        }
     
        /// Decode an hex encoded string
        /// @param p_Input : The hex encoded string we want to decode
        /// @return The decoded string
        function hexDecodeString(p_Input) 
        {
            var Result, Index;
            Result = '';
            //go through the charaters with two charcters at a time and convert them to characters
            for (Index = 0; Index < p_Input.length; Index += 2) 
            {
                Result += String.fromCharCode(parseInt(p_Input.substr(Index, 2), 16));
            }
            return Result;
        }
     
        // object containing our icons as svg sections
        m_Icons = 
        {
            'reload_frame' : 
    '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" style="width: 20px; height: 16px;" viewBox="0 0 20 16">\n\
        <g class="button-icon">\n\
            <path d="M 14,9 A 5,5 0 1 1 12,3" style="fill:none;stroke:#00007f;stroke-width:2;" />\n\
            <path d="M 14,7 L 10,5.5 L 13,2.5 L 14,7 z" style="fill:#00007f;stroke:#00007f;stroke-width:1.1;" />\n\
            <rect width="18" height="14.5" x="0.5" y="0.5" style="fill:none;stroke:#000000;stroke-width:1;stroke-linejoin:round;stroke-miterlimit:4;" />\n\
        </g>\n\
    </svg>',
            'redo_javascript' : 
    '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" style="width: 20px; height: 16px;" viewBox="0 0 20 16">\n\
        <g class="button-icon">\n\
            <g id="RefreshArrow">\n\
                <path d="M 16,8 A 7,6.5 0 1 1 14,3" style="fill:none;stroke:#00007f;stroke-width:2;" />\n\
                <path d="M 15,6 L 11,4.5 L 14,1.5 L 15,6 z" style="fill:#00007f;stroke:#00007f;stroke-width:1.1;" />\n\
            </g>\n\
            <text style="font-size:8px;font-family:Bitstream Vera Sans"><tspan x="4.5" y="11">JS</tspan></text>\n\
        </g>\n\
    </svg>',
            'eval' :
    '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" style="width: 20px; height: 16px;" viewBox="0 0 20 16">\n\
        <g class="button-icon">\n\
            <text style="font-size:10px;font-family:Arial;"><tspan x="0" y="8">(\'x;\')</tspan></text>\n\
        </g>\n\
    </svg>',            
            'eval_selection' : 
    '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" style="width: 20px; height: 16px;" viewBox="0 0 20 16">\n\
        <g class="button-icon">\n\
            <rect width="8" height="10" x="5" y="1" style="fill:#0000ff;stroke:none;" />\n\
            <text style="font-size:10px;font-family:Arial;"><tspan x="0" y="8">(\'<tspan style="fill:#ffffff;">x;</tspan>\')</tspan></text>\n\
        </g>\n\
    </svg>',
            'insert_resetload': 
    '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" style="width: 20px; height: 16px;" viewBox="0 0 20 16">\n\
    <g class="button-icon">\n\
            <text style="font-size:9px;font-family:Arial;"><tspan x="0" y="6">reset</tspan></text>\n\
            <text style="font-size:9px;font-family:Arial;"><tspan x="0" y="16">load</tspan></text>\n\
    </g></svg>',
            'save_reload' :
    '<svg class="svg-container" xmlns="http://www.w3.org/2000/svg" version="1.1" style="width: 20px; height: 16px;" viewBox="0 0 20 16">\n\
        <g><use transform="matrix(0.8,0,0,0.8,1,1)" xlink:href="#svg-floppy"></g>\n\
        <g><use transform="matrix(1,0,0,1.0,0,0)" xlink:href="#RefreshArrow"></g>\n\
    </svg>',
            'versioncontrol' : 
    '<svg class="svg-container" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 20 16">\n\
        <g>\n\
            <path class="vcs-circle" d="M 3,8 A7,7 0 1 1 17,8 7,7 0 1 1 3,8 z"/>\n\
        </g>\n\
    </svg>',
            'close' : 
    '<svg class="svg-container" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 20 16">\n\
        <g>\n\
            <path class="close-circle" d="M 3,8 A7,7 0 1 1 17,8 7,7 0 1 1 3,8 z"/>\n\
            <path class="close-x-line" d="M 6,12 14,4" />\n\
            <path class="close-x-line" d="m 6,4 8,8" />\n\
        </g>\n\
    </svg>',
            'open' : 
    '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" style="width: 20px; height: 16px;" viewBox="0 0 20 16">\n\
        <defs>\n\
            <linearGradient id="linearGradient3175">\n\
                <stop style="stop-color:#ffc000;stop-opacity:1" offset="0" />\n\
                <stop style="stop-color:#000000;stop-opacity:1" offset="1" />\n\
            </linearGradient>\n\
            <linearGradient x1="10.669642" y1="7.2276778" x2="10.669642" y2="14.482142" id="linearGradient3181" xlink:href="#linearGradient3175" gradientUnits="userSpaceOnUse" />\n\
        </defs>\n\
        <g class="button-icon">\n\
            <path d="M 3.0803572,14.482142 L 3.0803572,1.4910705 L 8.2589286,1.4910705 L 8.2589286,3.0089285 L 17.857143,3.0089285 L 17.857143,14.482142 L 3.0803572,14.482142 z" style="fill:url(#linearGradient3181);fill-opacity:1;fill-rule:evenodd;stroke:#000000;stroke-width:1px;stroke-linecap:butt;stroke-linejoin:round;stroke-opacity:1" />\n\
            <path d="M 3.0803572,14.482142 L 5.0892858,10.017857 L 19.866072,10.017857 L 17.857143,14.482142" style="fill:#ffc000;fill-opacity:1;fill-rule:evenodd;stroke:#000000;stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;stroke-opacity:1" />\n\
        </g>\n\
    </svg>',   
            'save' : 
    '<svg class="svg-container" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 20 16">\n\
        <defs>\n\
            <linearGradient id="linearGradient3617">\n\
                <stop style="stop-color:#7d7f7f;stop-opacity:1" offset="0" />\n\
                <stop style="stop-color:#ffffff;stop-opacity:1" offset="0.5" />\n\
                <stop style="stop-color:#7d7f80;stop-opacity:1" offset="1" />\n\
            </linearGradient>\n\
            <linearGradient x1="10" y1="11" x2="13" y2="15" id="linearGradient3627" xlink:href="#linearGradient3617" gradientUnits="userSpaceOnUse" />\n\
        </defs>\n\
        <g class="button-icon">\n\
            <g id="svg-floppy">\n\
                <path d="M 3,1 17,1 17,15 5,15 3,13 3,1 z" style="fill:#0000b4;fill-opacity:1;fill-rule:evenodd;stroke:#7f7f7f;stroke-width:0.5;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-opacity:1" />\n\
                <rect width="8" height="4" x="6" y="11" style="fill:url(#linearGradient3627);fill-opacity:1;fill-rule:evenodd;stroke:#7f7f7f;stroke-width:0.5;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none" />\n\
                <rect width="2" height="2.9999826" x="7" y="11" style="fill:#0000b4;fill-opacity:1;fill-rule:evenodd;stroke:#7f7f7f;stroke-width:0.61237067;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none" />\n\
                <rect width="10" height="6" x="5" y="3" style="fill:#ffffff;fill-opacity:1;fill-rule:evenodd;stroke:none" />\n\
                <rect width="10" height="2" x="5" y="1" style="fill:#c80000;fill-opacity:1;fill-rule:evenodd;stroke:none" />\n\
                <path d="M 6,4 14,4" style="fill:none;stroke:#7f7f7f;stroke-width:0.5;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none" />\n\
                <path d="M 6,5 14,5" style="fill:none;stroke:#7f7f7f;stroke-width:0.5;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none" />\n\
                <path d="M 6,6 14,6" style="fill:none;stroke:#7f7f7f;stroke-width:0.5;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none" />\n\
                <path d="M 6,7 14,7" style="fill:none;stroke:#7f7f7f;stroke-width:0.5;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none" />\n\
                <path d="M 6,8 14,8" style="fill:none;stroke:#7f7f7f;stroke-width:0.5;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none" />\n\
            </g>\n\
        </g>\n\
    </svg>',
            'saveall' :
    '<svg class="svg-container" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 20 16">\n\
        <g class="button-icon">\n\
        <g transform="matrix(0.72727273,0,0,0.72727273,4.6665058,5)" id="small-floppy" class="button-icon">\n\
            <use xlink:href="#svg-floppy">\n\
        </g>\n\
            <use transform="translate(-2,-2)" xlink:href="#small-floppy" />\n\
            <use transform="translate(-4,-4)" xlink:href="#small-floppy" />\n\
        </g>\n\
    </svg>',
            'spincircle' :
    '<svg class="svg-container spin-circle-svg" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g>\n\
        <path class="spin-circle" d="M 15,8 A 7,7 0 0 1 1,8" />\n\
    </g></svg>'
    };
     
        m_Editors = []; // array of editors that are currently active
        m_EditorsToUpdate = []; // editors to be updated, this is sorted so the first item is the main wiki (if available and the next ones are wiki editors and then the rest)
        m_MainArticleName = p_TargetPage; // the main article is initialized with the target page, this should never have /index/ preceding it
        m_EditToken = 0;    // this edit token will be requested from the MediaWiki
        m_Events = {};      // will hold the events      
        m_PreviewDocument = null;  // this is our preview document within the  iframe     
        m_MainArticleTemplates = null;
        m_PageContent = null;
        m_$ArticleContentPlaceHolder = null;
     
        /// add an event listener
        /// @param p_EventName : The name of the event we are listening for
        /// @param p_Source : The source document for the event
        /// @param p_Function : The event callack function
        this.addEventListener = function(p_EventName, p_Source, p_Function)
        {
            var Source = {};
            Source[p_Source] = p_Function;
            m_Events[p_EventName] = Source;
        };
     
        /// remove an event listener
        /// @param p_EventName : The name of the event we are listening for
        /// @param p_Source : The source document for the event
        /// @param p_Function : The event callack function
        this.removeEventListener = function(p_EventName, p_Source, p_Function)
        {
            if (m_Events[p_EventName] && m_Events[p_EventName][p_Source])
            {
                m_Events[p_EventName][p_Source] = null;
            }
        };
     
        /// Executes the given event, this will call all regestired event listeners for the given event
        /// @param p_EventName : The name of the event we are executing
        function executeEvent(p_EventName)
        {
            var TempEvent, Index;
     
            // get the events registered for thegiven event name
            TempEvent = m_Events[p_EventName];
            if (TempEvent)
            {
                // go through all registered listeners and execute the callback function
                for (Index in TempEvent)
                {
                    // stop event handling if we are passed the end of the list of events or when the current listener returns false
                    if (TempEvent.hasOwnProperty(Index) && !TempEvent[Index]())
                    {
                        break;
                    }
                }
            }
        }
     
        /// Retrieve the content of a wiki article in raw format
        /// @p_TargetPage : The page for which we want to load the content
        /// @p_Callback : The callback function that will be called when the content has been retrieved
        function getRawArticle(p_TargetPage, p_Callback)
        {
            ViCoWaLogin.ensureLoggedIn(function()
            {
                // this function simply retrieves the article
                $.ajax({
                    url: p_TargetPage,
                    dataType: "json",
                    data: $.extend({}, { type: "application/json", content: "raw" }, ViCoWaLogin.getRememberMeData()), 
                    success: function(p_Data)
                    {
                        if (p_AutoEncrypt)
                        {
                            p_AutoEncrypt.doDecrypt(p_Data.content, { bUseTimeout: false }, function(p_Data)
                            {
                                p_Callback({ content : p_Data});
                            });
                        }
                    },
                    cache: false,
                    error: function ()
                    {
                        alert("error");    
                    }
                });
            }, null, null, null, -1);
        }
     
        /// save the content for all editors
        function saveAllContent()
        {
            var Index;
            // call the save function on all open editors
            for (Index = 0; Index < m_Editors.length; Index++)
            {
                m_Editors[Index].save(null, true);
            }
        }
     
        /// Save the content for the active tab
        function saveEditorContent()
        {
            // we should have at least 1 editor
            if (m_Editors.length > 0)
            {
                // the active tab is always at position 0
                m_Editors[0].save(null, true);
            }
        }
     
        /// Update the user interface to reflect the active tab
        function updateActiveTab()
        {
            var Index, Tab;
     
            // go through the tabs and mark the one visible for the active tab
            // also mark the appropriate content visible
            for (Index = 0; Index < $m_TabList[0].childNodes.length; Index++)
            {
                Tab = $m_TabList[0].childNodes[Index];
                if (m_Editors.length > 0 && Tab.m_Editor === m_Editors[0])
                {
                    Tab.className += " active";
                    Tab.m_TabContent.className += " visible";
                    Tab.m_Active = true;
                    Tab.m_Editor.update();
                }
                else
                {
                    Tab.m_Active = false;
                    Tab.className = Tab.className.replace(/\s+active\b/gi, "");
                    Tab.m_TabContent.className = Tab.m_TabContent.className.replace(/\s+visible\b/gi, "");
                }
            }
     
            updateSizes();
    
            // if we have an active editor, enable the save buttons
            $m_SaveButton.toggleClass("disabled", !m_Editors.length);
            $m_SaveAllButton.toggleClass("disabled", !m_Editors.length);
        }
     
        /// remove the given editor from the editors array
        /// @param p_Editor : The editor that must be removed
        function removeEditorFromArray(p_Editor)
        {
            var Index;
            // go through the array and remove any reference to the given editor, should normally only be 1
            for (Index = m_Editors.length - 1; Index >= 0; Index--)
            {
                // if the editor matches, remove it
                if (m_Editors[Index] === p_Editor)
                {
                    m_Editors.splice(Index, 1);
                }
            }
            // if no editors are left, disable the save buttons
            $m_SaveButton.toggleClass("disabled", !(m_Editors.length > 0));
            $m_SaveAllButton.toggleClass("disabled", !(m_Editors.length > 0));
        }
     
        /// set the active editor
        /// @p_Editor : The editor to make active
        function setActiveEditor(p_Editor)
        {
            // only do this if the passed in editor is not null
            if (p_Editor !== null)
            {
                removeEditorFromArray(p_Editor);
                // the editor at position 0 is the active one, so insert the editor at position 0
                m_Editors.splice(0, 0, p_Editor);
            }
            // update the active tab
            updateActiveTab();
        }
     
        /// Save the given article
        /// @param p_TargetPage : The target page for the save operation
        /// @param p_Content : The data that must be saved
        /// @param p_Callback : A callback function that should be called after the save is completed successfully
        function saveArticle(p_TargetPage, p_Content, p_Callback) 
        {
            // we will require auto encrypt from now on to be a valid object
            ViCoWaLogin.ensureLoggedIn(function()
            {
                if (p_AutoEncrypt)
                {
                    p_AutoEncrypt.doEncrypt(p_Content, { manualencryptpasswords: m_ManualEncryptPasswords, bUseTimeout: false }, function(p_EncryptedContent, p_Result, p_Passwords)
                    {
                        if (p_Result && !p_AutoEncrypt.hasEncryptTargets(p_EncryptedContent))
                        {
                            m_ManualEncryptPasswords = p_Passwords.manualencryptpasswords;
                            
                            ViCowaFileSystemAccess.save(p_TargetPage, p_EncryptedContent, function(p_bResult, p_Data)
                            {
                                if (p_bResult)
                                {
                                    p_Callback(p_Data); 
                                }
                                else
                                {
                                    p_Callback({ error: "Request failed." }); 
                                }
                            });
                        }
                        else
                        {
                            p_Callback({ canceled: true });
                            // canceled encryption
                        }
                    });
                }
            }, null, null, null, -1);
        }
    
        /// update the content of the article after an edit has been made
        function updateContent(p_Page, p_ContentData)
        {
            var Index;
            // make sure we have a place holder as the target for our parsed data and that the preview document is valid
            if (m_$ArticleContentPlaceHolder && m_PreviewDocument)
            {
                // special case when the page that is being updated is our main target page
                if (p_Page == m_MainArticleName)
                {
                    // go through the page data and make sure our links are up-to-date
                    for (Index = 0; Index < m_Editors.length; Index++)
                    {
                        p_ContentData = m_Editors[Index].updateLinks(p_ContentData);
                    }
     
                    // put the content in the place holder
                    if (m_$ArticleContentPlaceHolder)
                    {
                        $.ViCoWaErrorHandler.tryCatchCall(function()
                        {
                            // filter scripts when updating the inner html for the main article, because scripts might mess up editing when inline scripts are executed
                            var $Dom = $(p_ContentData).not("script");
                            if ($Dom)
                            {
                                $Dom.find("script").remove();
                                // save the scroll position of the preview window
                                var ScrollPosX = $("body", m_PreviewDocument).scrollLeft();
                                var ScrollPosY = $("body", m_PreviewDocument).scrollTop();
                                m_$ArticleContentPlaceHolder.empty();
                                $Dom.appendTo(m_$ArticleContentPlaceHolder);
                                // restore the scroll position of the preview window this might not work properly if images finish loading later
                                $("body", m_PreviewDocument).scrollLeft(ScrollPosX);
                                $("body", m_PreviewDocument).scrollTop(ScrollPosY);
                            }
                            else
                            {
                                m_$ArticleContentPlaceHolder.html(p_ContentData);
                            }
                        });
                    }
    
                    // re-attach the other editors to their target containers
                    for (Index = 0; Index < m_Editors.length; Index++)
                    {
                        m_Editors[Index].attachTargetContainers(m_PreviewDocument);
                    }
                }
            }
        }
        
        /// Construct an SVG editor object
        /// @param p_TargetPath : The name of the SVG file we are editing
        /// @param p_Tab : The tab associated with the editor, passed in here so it can receive an editor reference
        function CSVGEditor(p_TargetPath, p_Tab)
        {
            var m_Modified = null,                              ///< Keeps track if the editor has modified the file
            m_bSaving = false,                                  ///< Indicates if a save operation is in progress
            m_bLoading = false,                                 ///< Indicates if a load operation is in progress
            m_PageName = /[^=]+$/.exec(p_TargetPath)[0],        ///< The target path to the page stripped from excess data
            m_Editor = null,
            This = this,                                        ///< copy the this pointer in this local object for use in locally scoped functions
            $ReloadIFrameBtn = null;                            ///< the button for reloading the preview frame 
            this.m_TabinnerHTMLBackup = null;                   ///< backs up the inner html of the tab when using the load or save spinner
            
            /// Set the modified date/time for the active editor
            /// @param p_Modified : The new modified time, a time for modified null for NOT modified
            function setModified(p_Modified)
            {
                m_Modified = p_Modified;
                if (m_Modified !== null)
                {
                    if (!/\s+modified\b/gi.test(p_Tab.tab.className))
                    {
                        p_Tab.tab.className += " modified";
                    }
                }
                else
                {
                    p_Tab.tab.className = p_Tab.tab.className.replace(/\s+modified\b/gi, "");
                }
            }
     
            /// Start the spinning circle animation in the editor tab to indicate save or load on an editor
            function startSpinner()
            {
                // check if one is already running
                if (!This.m_TabinnerHTMLBackup)
                {
                    This.m_TabinnerHTMLBackup = p_Tab.$tabicon.css("background-image");
                    p_Tab.$tabicon.css("background-image", "url('" + ViCowaEditorBaseDomain + "/raw/shared/apps/ViCoWaEditor/images/spincircle.svg')");             
                    p_Tab.$tabicon.toggleClass("spin", 1);
                }
            }
     
            /// Stop the spinning circle animation in the editor tab
            function stopSpinner()
            {
                // check if one is running
                if (This.m_TabinnerHTMLBackup)
                {
                    p_Tab.$tabicon.css("background-image", This.m_TabinnerHTMLBackup);
                    This.m_TabinnerHTMLBackup = null;
                    p_Tab.$tabicon.toggleClass("spin", 0);
                }
            }
     
            this.update = function(){ return true; };
     
            /// Attach target containers for the given document
            /// @param p_Document : The document for which we have to attach the target containers
            this.attachTargetContainers = function(p_Document){}; // do nothing here for SVG
     
            /// handle a resize action
            this.doResize = function(){};
     
            /// destroy the editor
            this.destroy = function()
            {
                removeEditorFromArray(this);
                p_Tab.tab.m_Editor = null;
            };
     
            this.getArticleName = function(){ return p_TargetPath; };   ///< @return The name of the article that is being edited
            this.isModified = function(){ return m_Modified !== null; };         ///< @return true when the content has been modified or false otherwise
            this.getModifiedTime = function(){ return m_Modified; };        ///< @return the modified time and date
            /// save the content of the current editor
            /// @param p_Callback : Callback function that will be called when the save function returns 
            this.save = function(p_Callback, p_Force)
            { 
                function doSave()
                {
                    m_bSaving = true;
                    var LastModified = ((m_Modified !== null) ? new Date(m_Modified.getTime()) : new Date());
                    // start a spinner and then start the save operation
                    startSpinner();
                    
                    var HandleResult = function(p_Data)
                    {
                        // stop the spinner when the save function returns
                        stopSpinner();
                        m_bSaving = false;
    
                        if (p_Data && p_Data.save && p_Data.save.result === 'Success') 
                        {
                            // autosave was temporarly disabled so reanble here again
                            if (m_Autosave == -1)
                            {
                                m_Autosave = 1;
                            }
                            // update last saved text if edit was successful 
                            $m_SavedNotifyTooltip.html($.i18n._("%1$s was successfully saved", [p_TargetPage]));
                            $m_SavedNotifyTooltip.toggleClass("show", true);
                            setTimeout(function()
                            {
                                $m_SavedNotifyTooltip.toggleClass("show", false);
                            }, 500);
        
                            // on a  successfull save we will reset the modified flag
                            // but only if no further modifications have been made in the mean time
                            if (m_Modified && LastModified.getTime() == m_Modified.getTime())
                            {
                                setModified(null); 
                            }
                            if (p_Callback)
                            {
                                // if a callback function was specified, call it here
                                p_Callback(true);
                            }
                        } 
                        else if (p_Data && p_Data.canceled)
                        {
                            // the action was canceled, keep the data modified but disable autosave temporarly 
                            m_Autosave = -1;
                        }
                        else if (p_Data && p_Data.error) 
                        {
                            alert($.i18n._("Error: API returned error: %1$s", [p_Data.error]));
                            // we had an error, call the callback with false
                            if (p_Callback)
                            {
                                p_Callback(false);        
                            }
                        } 
                        else 
                        {
                            alert($.i18n._("Error: Unknown result from API."));
                            // we had an error, call the callback with false
                            if (p_Callback)
                            {
                                p_Callback(false);        
                            }
                        }
                    };
                    
                    var HandleError = function()
                    {
                        alert($.i18n._("Error: Request failed."));
                        // we had an error, call the callback with false
                        if (p_Callback)
                        {
                            p_Callback(false);        
                        }
                    };
                    
                    m_Editor.getSvgString()(function(p_Data, p_Error)
                    {
                        saveArticle(unescape(m_PageName), p_Data, HandleResult); 
                    });
                }

                var now = new Date();
                var MustSave = !m_bSaving && m_Modified !== null && (now.getTime() -  m_Modified.getTime()) > 2000;
                
                if (p_Force)
                {
                    if (m_bSaving)
                    {
                        // popup message box saying that we are already saving to make sure this is what we want
                        $("<div/>").html("<p>The file: <strong>" + unescape(m_PageName).substring(unescape(m_PageName).lastIndexOf("/") + 1) + "</strong> is in the process of being saved to the server, if you think this save operation is not going to finish you can click the <strong>Save now</strong> button to force a new save operation.</p><p>You can click <strong>cancel</strong> to continue to wait for the current save operation to be finished.</p>").appendTo($("body")).dialog(
                        {
                            title: "Save now",
                            resizable: false,
                            height:240,
                            modal: true,
                            buttons: 
                            {
                                "Save now": function() 
                                {
                                    $(this).dialog("close");
                                    $(this).remove();
                                    doSave();
                                },
                                Cancel: function() 
                                {
                                    $(this).dialog("close");
                                    $(this).remove();
                                }
                            }
                        });
                    }
                    else
                    {
                        doSave();
                    }
                }
                else if (MustSave)
                {
                    doSave();
                }
            };
            
            /// Update the content of the preview document
            /// @param p_Content : The modified data
            this.updateMainContent = function(p_Content)
            {
/*                // go through all editors and update their links 
                for (Index = 0; Index < m_Editors.length; Index++)
                {
                    if (m_Editors[Index] != This)
                    {
                        p_Content = m_Editors[Index].updateLinks(p_Content);
                    }
                }
     
                /// parse the data that was passed in
                if (m_$ArticleContentPlaceHolder)
                {
                   m_$ArticleContentPlaceHolder.html(p_Content);
                }
    
                for (Index = 0; Index < m_Editors.length; Index++)
                {
                    if (m_Editors[Index] != This)
                    {
                        m_Editors[Index].attachTargetContainers(m_PreviewDocument);
                    }
                }*/
            };
     
            function nextDoc()
            {
                
            }
            
            function prevDoc()
            {
                
            }
     
            /// event handler for when the data in the editor has changed
            /// @param p_ChangeModified : true if the change should update the modified state, false otherwise
            function onEditorChange(p_ChangeModified)
            {
                var Content, Index;
                // only update the modified state when this flag is true
                if (p_ChangeModified && !m_bLoading)
                {
                    setModified(new Date());
                }
            }
     
            // add a reference to this editor to the tab
            p_Tab.tab.m_Editor = this;                      
            // insert the editor as the first editor (and thus the active one)
            m_Editors.splice(0, 0, this);
            
            $(p_Tab.editor_container).spin();

            $("<iframe/>").attr("src", "/raw/shared/apps/svg-edit/svg-editor.html").on("load", function()
            {
                m_Editor = new embedded_svg_edit(this);    
                
                // Hide main button, as we will be controlling new/load/save etc from the host document
                var doc = this.contentDocument || this.contentWindow.document;
                var svgEditWindow = this.contentWindow;
                var mainButton = doc.getElementById('main_button');
                mainButton.style.display = 'none';            
                m_Editor.clear();

                // start the spinner and then start loading the document content
                startSpinner();
         
                $.ViCoWaErrorHandler.tryCatchCall(function()
                {
                    getRawArticle(unescape(m_PageName), function(p_Data)
                    {
                        // the following try catch block is here to make sure the spinner gets stopped even if a problem occurs within the following code
                        $.ViCoWaErrorHandler.tryCatchCall(function()
                        {
                            // when the data has been retrieved, fill tthe editor content and make sure the editor
                            // fits within its container
                            m_bLoading = true;
                            $.ViCoWaErrorHandler.tryCatchCall(function()
                            {
                                m_Editor.setSvgString(p_Data.content);
                            });
                            m_bLoading = false;
                            setModified(null);
                            This.doResize();
                        });
         
                        // stop the spinner
                        stopSpinner();
                        $(p_Tab.editor_container).spin(false);

                        // the first change is from the load so skip that one
                        var bFirst = true;
                        svgEditWindow.svgEditor.addExtension("realtimesavehandler", function() 
                        {
                            return {
                                elementChanged: function()
                                {
                                    if (!bFirst)
                                    {
                                        onEditorChange(true);
                                    }
                                    bFirst = false;
                                }
                            };
                        });
                    });
                }, 
                {
                    catcher: function()
                    {
                        // stop the spinner
                        stopSpinner();
                        $(p_Tab.editor_container).spin(false);
                    }
                });
            }).appendTo($("<div/>").addClass("iframe-container").appendTo($(p_Tab.editor_container)));
        }
     
        /// Construct an editor object
        /// @param p_TargetPath : The name of the article we are editing
        /// @param p_Tab : The tab associated with the editor, passed in here so it can receive an editor reference
        /// @param p_Type : The type of the file we will be editing
        function CEditor(p_TargetPath, p_Tab, p_Type)
        {
            var m_Modified = null,                              ///< Keeps track if the editor has modified the file
            m_bSaving = false,                                  ///< Indicates if a save operation is in progress
            m_bLoading = false,                                 ///< Indicates if a load operation is in progress
            m_CodeEditor = ace.edit(p_Tab.editor_container),    ///< The actual editor object 
            m_TargetContentContainer = [],                      ///< optional container for the data we are editing 
            m_PageName = /[^=]+$/.exec(p_TargetPath)[0],        ///< The target path to the page stripped from excess data
            This = this,                                        ///< copy the this pointer in this local object for use in locally scoped functions
            $ReloadIFrameBtn = null;                            ///< the button for reloading the preview frame 
            this.m_TabinnerHTMLBackup = null;                   ///< backs up the inner html of the tab when using the load or save spinner

            m_CodeEditor.setBehavioursEnabled(true);        // enable matching of brackets
            m_CodeEditor.setHighlightActiveLine(true);      // highlight the active line
            m_CodeEditor.setHighlightSelectedWord(true);    // Highlight the selected word
            m_CodeEditor.setReadOnly(false);                // set read write
            m_CodeEditor.setSelectionStyle("line");         // Set selection style to line
            m_CodeEditor.getSession().setFoldStyle("markbeginend"); // set folding markers to show on end and start
            m_CodeEditor.setShowFoldWidgets(true);          // set showing of folding widgets
            m_CodeEditor.setShowInvisibles(true);           // enable showing of space and tab and newline indicator characters
            m_CodeEditor.getSession().setUseSoftTabs(true); // use soft tabs
            m_CodeEditor.setOptions({ enableBasicAutocompletion: true });
            
            delete m_CodeEditor.commands.commandKeyBinding[1].l;
            
            m_CodeEditor.setKeyboardHandler(new HashHandler(
            {
                "gotoline" : "ctrl-g",
                "findnext" : "ctrl-f3|f3",
                "findprevious" : "ctrl-shift-f3|shift-f3"
            }));

            // add a reference to this editor to the tab
            p_Tab.tab.m_Editor = this;                      
     
            // create the reload button, which will be a html SPAN object
            $ReloadIFrameBtn = $("<span></span>").addClass("edit-button").html(m_Icons.reload_frame).attr("title", $.i18n._("Reload the content of the editor preview")).click(function()
            {
                $m_TargetIFrame[0].contentDocument.location.reload(true);
            }).appendTo(p_Tab.tab_button_bar);
     
            /// @return the content of the editor, this is the text that is being edited
            this.getEditorContent = function()
            {
                return m_CodeEditor.getSession().getValue();
            };
            
            this.update = function()
            {
                return m_CodeEditor.renderer.updateText();
            };

            /// Attach to or create a style section within the preview document, so we can give realtime feedback
            /// on the modifications being made in the editor when editing style sheets. This function should only be called when
            /// we are editing a style sheet
            function attachStyle()
            {
                var Match, Styles, StyleIndex, Style;
     
                // set the mode for ACE to css
                m_CodeEditor.getSession().setMode(new (require("ace/mode/" + "css").Mode)()); 
                // initialize the target container with an empty array
                m_TargetContentContainer = [];
     
                // we will remove links to the document that is being edited, since an inline style will be taking its place
                // we don't want the styles in the original version to mix with the ones being changed
                Match = new RegExp(m_PageName, "i");
    
                $("link", $m_TargetIFrame[0].contentDocument).each(function()
                {
                    if (Match.test(this.href))
                    {
                        $(this).remove();
                    }
                });
                $("script", $m_TargetIFrame[0].contentDocument).each(function()
                {
                    if (Match.test(this.src))
                    {
                        $(this).remove();
                    }
                });
     
                // try to attach to a possible earlier created style element for the page we are editing
                $("style", $m_TargetIFrame[0].contentDocument).each(function()
                {
                    if (this.m_OriginalStyleSheet && this.m_OriginalStyleSheet === m_PageName)
                    {
                        m_TargetContentContainer.push(this);
                    }
                });
     
                // if we didn't attach, we create a new style element for realtime feedback
                if (!m_TargetContentContainer.length)
                {
                    // create a style element in the document so we can give realtime feedback
                    Style = $m_TargetIFrame[0].contentDocument.createElement("style");
                    Style.m_OriginalStyleSheet = m_PageName;
                    $m_TargetIFrame[0].contentDocument.body.appendChild(Style);
                    m_TargetContentContainer.push(Style);
                }
     
                // call this to do fill the style section with a copy of the current editor data
                onEditorChange(false);
            }
     
            /// save the javascript if modified and reload it in the preview document
            function reattachJavascript()
            {
                // function thta will do the reloading, should be called after the save operation completes if a save is required
                function afterSave()
                {
                    var Match, Scripts, ScriptNode, ScriptsToAdd, DocumentHead, Now;
                    // execute the following events : first calls the reset event. A listener should be added to your code
                    // and should cleanup everything to bring it back into a state as if the javascript has never run before
                    // the page name is passed in so you can execute it for the javascript of the specific page
                    executeEvent("reset", p_TargetPath);
                    // this will unload and then reload the javascript file
                    Match = new RegExp(m_PageName, "i");
                    ScriptsToAdd = [];
                    ScriptNode = null;
                    Now = new Date();
    
                    // go through all linked scripts in the document
                    $("script", $m_TargetIFrame[0].contentDocument).each(function()
                    {
                        // if we match the script currently being edited
                        if (this.src && Match.test(this.src))
                        {
                            // we only create the new script element if it doesn't exist yet
                            if (!ScriptNode)
                            {
                                // create a new script node
                                ScriptNode = $m_TargetIFrame[0].contentDocument.createElement('script');
                                ScriptNode.setAttribute('type', 'text/javascript');
                                ScriptNode.src = this.src;
                                // replace or append a time stamp to prevent caching
                                if (/time=/.test(ScriptNode.src))
                                {
                                    ScriptNode.src = ScriptNode.src.replace(/(time=)\d+/, "$1" + Now.getTime().toString());
                                }
                                else
                                {
                                    ScriptNode.src += "&time=" + Now.getTime().toString();
                                }
                                // attach an onload event handler to the script node that will call the load
                                // event handler you can add to your script
                                ScriptNode.onload = function()
                                {
                                    // This code should do the same as your onload function normally does if you use an onload handler
                                    // again the page name is passed in so you know which on load to use
                                    executeEvent("load", p_TargetPath);
                                };
                            }
                            // remove all references of the script from the preview document
                            $(this).remove();
                        }
                    });
     
                    if (ScriptNode)
                    {
                         // append the script element to the head element of the preview document
                        DocumentHead = $m_TargetIFrame[0].contentDocument.getElementsByTagName('head')[0];
                        DocumentHead.appendChild(ScriptNode);   
                    }
                }
                // check if we need to save anything
                if (This.isModified())
                {            
                    // save the doument and call the function
                    This.save(afterSave, true);
                }
                else
                {
                    // call the function directly
                    afterSave();
                }
            }
     
            /// Attach a json document to an ACE editor instance
            function attachJSON()
            {
                m_CodeEditor.getSession().setMode(new (require("ace/mode/" + "json").Mode)()); 
                m_TargetContentContainer = [];
            }
     
            /// Attach a PHP document to an ACE editor instance
            function attachPHP()
            {
                m_CodeEditor.getSession().setMode(new (require("ace/mode/" + "php").Mode)()); 
                m_TargetContentContainer = [];
            }
    
            /// attach a javascript document to an ACE editor instance
            function attachJavascript()
            {
                var SaveAndReloadBtn, EvalBtn, EvalSelectionBtn, ViCoWaResetInsertBtn, RedoJavascriptBtn;
     
                // set the ACE editor to javascript edit mode
                m_CodeEditor.getSession().setMode(new (require("ace/mode/" + "javascript").Mode)()); 
     
                // create a button used to save and reload the javascript. When the button is clicked, the reset event will be called
                // after which we will ty to save the editor content and then reload the javascript file by removing and
                // then re-adding the link to the javascript in the preview document
                // The advanttage of this function compared to the redo javascript is that errors in the consoe will have proper line numbers for
                // any possible errors in the script. It is adviced to implement a listener for both the reset and load event
                // where the load event listener handler would have a "debugger;" statement as its first line. This will
                // mke sure that your browser's javascript debugger has the proper file active for debugging
                SaveAndReloadBtn = $("<span></span>").addClass("edit-button").html(m_Icons.save_reload).attr("title", $.i18n._("Save the current file and reload the javascript")).click(function()
                {
                    //when the button is clicked we will save the javascript and then reload it
                    reattachJavascript();
                }).appendTo(p_Tab.tab_button_bar);
     
                // create the redo javascript button, this will call the reset event followed by eval on the editor content 
                // followed by the load event. This is similar to the save and reload, without doing the save.
                // The advantage of this command is that it is fast since it doesn't save your code first, the disadvantage is 
                // that errors in your javascript will not have give a proper line number in the console. 
                // Adding the reset and load evet listeners is adviced where it is recommended to have
                // a "debugger;" statement within the load event handler so the proper instance of javascript objects
                // is shown in your browsers debugger
                RedoJavascriptBtn = $("<span></span>").addClass("edit-button").html(m_Icons.redo_javascript).attr("title", $.i18n._("Reload the javascript into the page")).click(function()
                {
                    // execute the following ViCoWaResetJavascript functions on the iframe. 
                    // first try to call ViCoWaResetJavascript. This function should be added to your code
                    // and should cleanup everything to bring it back into a state as if the javascript has never run before
                    // the page name is passed in so you can execute it for the javascript of the specific page
                    executeEvent("reset", p_TargetPath);
                    // this will reinitialize the code with the current code in the editor
                    $m_TargetIFrame[0].contentWindow.eval(m_CodeEditor.getSession().getValue());
                    // This code should do the same as your onload function normally does if you use an onload handler
                    // again the page name is passed in so you know which pages on load to use
                    executeEvent("load", p_TargetPath);
                }).appendTo(p_Tab.tab_button_bar);
     
                // create the Eval button. clicking this button will call eval with the content of the editor
                // only call this if your script didn't create any data objects
                EvalBtn = $("<span/>").addClass("edit-button").html(m_Icons.eval).attr("title", $.i18n._("Run eval on the content of the editor")).click(function()
                {
                    $m_TargetIFrame[0].contentWindow.eval(m_CodeEditor.getSession().getValue());
                }).appendTo(p_Tab.tab_button_bar);
     
                // create the eval selection button
                // Call this to call eval on the selected content of your editor, useful when you want to add new code
                // without reloading your javascript our version of edit and continue
                EvalSelectionBtn = $("<span/>").addClass("edit-button").addClass("disabled").html(m_Icons.eval_selection).attr("title", $.i18n._("Run eval on the selection")).click(function()
                {
                    $m_TargetIFrame[0].contentWindow.eval(m_CodeEditor.getSession().doc.getTextRange(m_CodeEditor.getSelectionRange()));
                }).appendTo(p_Tab.tab_button_bar);
     
                // Insert a ViCoWaResetJavascript and a ViCoWaDoLoadJavascript at the cursor
                // a fast way to add the reset and load event listners to your code
                ViCoWaResetInsertBtn = $("<span/>").addClass("edit-button").html(m_Icons.insert_resetload).attr("title", $.i18n._("Insert a reset and load events at the cursor")).click(function()
                {
                    m_CodeEditor.insert("if(parent && parent.ViCoWaEditor)\n{\n    parent.ViCoWaEditor.addEventListener('reset', '" + p_TargetPath + "', function()\n    {\n        // insert your reset code here...\n        return true;\n    });\n\n    parent.ViCoWaEditor.addEventListener('load', '" + p_TargetPath + "', function()\n    {\n        debugger;\n        // insert your load code here...\n        return true;\n    });\n}\n");
                }).appendTo(p_Tab.tab_button_bar);
     
                // add an event handler to be called when the selection in the editor changes
                m_CodeEditor.getSession().selection.on('changeSelection', function()
                {
                    var SelectionRange, Selection;
                    // set the eval selection button state depending on if we have a selection or not
                    SelectionRange = m_CodeEditor.getSelectionRange();
                    Selection = m_CodeEditor.getSession().doc.getTextRange(SelectionRange);
     
                    if (Selection !== null && Selection !== "")
                    {
                        EvalSelectionBtn.className = EvalSelectionBtn.className.replace(/\s+disabled\b/gi, "");
                    }
                    else
                    {
                        if (!/\s+disabled\b/gi.test(EvalSelectionBtn.className))
                        {
                            EvalSelectionBtn.className += " disabled";
                        }
                    }
                });
     
                m_TargetContentContainer = [];
            }
     
            /// replace links to external articles with a div section containing the hexencoded location
            /// of the original target document
            /// @param p_WikiData : The content of the article we are doing this replace for
            function replaceTemplateLinksWithDiv(p_WikiData)
            {
                var MatchTargetTemplate = new RegExp("\\{\\{[^\}]*" + p_TargetPath + "[^\{\/]*\\}\\}", "i"), 
                MatchTargetTemplateNoSpace = new RegExp("\\{\\{[^\}]*" + p_TargetPath.replace(/\s/g, "_") + "[^\{\/]*\\}\\}", "i"), 
                MatchTransclude = new RegExp("transclude=[\"\']" + p_TargetPath + "[\"\']", "i"), 
                MatchTranscludeNoSpace = new RegExp("transclude=[\"\']" + p_TargetPath.replace(/\s/g, "_") + "[\"\']", "i"), 
                Index = 1;
     
                // replace any reference to the target document with a div
                while(MatchTargetTemplate.test(p_WikiData))
                {
                    p_WikiData = p_WikiData.replace(MatchTargetTemplate, "<div id='" + hexEncodeString(p_TargetPath + Index.toString()) + "'></div>");
                    Index++;
                }
                while(MatchTargetTemplateNoSpace.test(p_WikiData))
                {
                    p_WikiData = p_WikiData.replace(MatchTargetTemplateNoSpace, "<div id='" + hexEncodeString(p_TargetPath + Index.toString()) + "'></div>");
                    Index++;
                }
                while(MatchTransclude.test(p_WikiData))
                {
                    p_WikiData = p_WikiData.replace(MatchTransclude, "<div id='" + hexEncodeString(p_TargetPath + Index.toString()) + "'></div>");
                    Index++;
                }
                while(MatchTranscludeNoSpace.test(p_WikiData))
                {
                    p_WikiData = p_WikiData.replace(MatchTranscludeNoSpace, "<div id='" + hexEncodeString(p_TargetPath + Index.toString()) + "'></div>");
                    Index++;
                }
     
                return p_WikiData;
            }
     
            /// match editors up with the div section that were created for the document being edited by that specific editor
            /// @param p_Document : The preview document
            function attachLinkDivs(p_Document)
            {
                var Element, Index, EncodedString;
                Index = 1;
                // get the first reference element
                Element = p_Document.getElementById(hexEncodeString(p_TargetPath + Index.toString()));
     
                // while reference elements exists, add them to the target containers
                while (Element)
                {
                    m_TargetContentContainer.push(Element);
                    Index++;
                    Element = p_Document.getElementById(hexEncodeString(p_TargetPath + Index.toString()));
                }
     
                // if we have any target containers, simulate a document change to update them
                if (m_TargetContentContainer.length > 0)
                {
                    onEditorChange(false);
                }
            }
     
            /// Update the links to wiki editors or html editors in the given wiki data
            /// @param p_WikiData : The wiki data in which the links need to be updated
            this.updateLinks = function(p_WikiData)
            {
                var Result = p_WikiData;
                switch (p_Type)
                {
                case EEditorTypes.ET_CSS.id:           // fall trough intentionally
                case EEditorTypes.ET_JSON.id:           // fall trough intentionally
                case EEditorTypes.ET_JS.id:     break; // do nothing for javascript, JSON and stylesheets
                case EEditorTypes.ET_HTML.id:          // fall trough intentionally
                case EEditorTypes.ET_XML.id:           // fall trough intentionally
                case EEditorTypes.ET_PLAINTEXT.id:     // fall trough intentionally
                case EEditorTypes.ET_WIKI.id:          
                    Result = replaceTemplateLinksWithDiv(p_WikiData);
                    break;
                }
     
                return Result;
            };
     
            /// Attach target containers for the given document
            /// @param p_Document : The document for which we have to attach the target containers
            this.attachTargetContainers = function(p_Document)
            {
                switch (p_Type)
                {
                case EEditorTypes.ET_CSS.id:
                    attachStyle();
                    break;
                case EEditorTypes.ET_JSON.id:          // fall through intentionally
                case EEditorTypes.ET_JS.id:            // the JSON and javascript are not attached to a container
                    break;
                case EEditorTypes.ET_HTML.id:          // fall through intentionally
                case EEditorTypes.ET_XML.id:           // fall through intentionally
                case EEditorTypes.ET_PLAINTEXT.id:     // fall through intentionally
                case EEditorTypes.ET_WIKI.id:       
                    attachLinkDivs(p_Document);
                    break;
                }
            };
     
            /// update the preview document's wiki data for the current editor 
            function updateContentForNewEditor()
            {
                var ContentData;
     
                // find the correct editor and get its content
                for (Index = 0; Index < m_Editors.length; Index++)
                {
                    if (m_Editors[Index].getArticleName() == m_MainArticleName)
                    {
                        ContentData = m_Editors[Index].getEditorContent();
                        break;
                    }
                }
                // if we didn't find an editor, use the page's content
                if (Index == m_Editors.length)
                {
                    ContentData = m_PageContent;
                }
     
                // replace links to embedded documents with the proper div sections
                ContentData = This.updateLinks(ContentData);
     
                // parse the wiki data and connect to the proper target containers
                if (m_$ArticleContentPlaceHolder)
                {
                    // make sure invalid html; doesn't mess up our editor
                    $.ViCoWaErrorHandler.tryCatchCall(function()
                    {
                        // filter scripts when updating the inner html for the main article, because scripts might mess up editing when inline scripts are executed
                        var $Dom = $(ContentData).not("script");
                        if ($Dom)
                        {
                            $Dom.find("script").remove();
                            // save the scroll position of the preview window
                            var ScrollPosX = $("body", m_PreviewDocument).scrollLeft();
                            var ScrollPosY = $("body", m_PreviewDocument).scrollTop();
                            m_$ArticleContentPlaceHolder.empty();
                            $Dom.appendTo(m_$ArticleContentPlaceHolder);
                            // restore the scroll position of the preview window this might not work properly if images finish loading later
                            $("body", m_PreviewDocument).scrollLeft(ScrollPosX);
                            $("body", m_PreviewDocument).scrollTop(ScrollPosY);
                        }
                        else
                        {
                            m_$ArticleContentPlaceHolder.html(ContentData);
                        }
                    });
                }
    
                for (Index = 0; Index < m_Editors.length; Index++)
                {
                    if (m_Editors[Index] != This)
                    {
                        m_Editors[Index].attachTargetContainers(m_PreviewDocument);
                    }
                }
                This.attachTargetContainers(m_PreviewDocument);
            }
     
            /// Set the modified date/time for the active editor
            /// @param p_Modified : The new modified time, a time for modified null for NOT modified
            function setModified(p_Modified)
            {
                m_Modified = p_Modified;
                if (m_Modified !== null)
                {
                    if (!/\s+modified\b/gi.test(p_Tab.tab.className))
                    {
                        p_Tab.tab.className += " modified";
                    }
                }
                else
                {
                    p_Tab.tab.className = p_Tab.tab.className.replace(/\s+modified\b/gi, "");
                }
            }
     
            /// Start the spinning circle animation in the editor tab to indicate save or load on an editor
            function startSpinner()
            {
                // check if one is already running
                if (!This.m_TabinnerHTMLBackup)
                {
                    This.m_TabinnerHTMLBackup = p_Tab.$tabicon.css("background-image");
                    p_Tab.$tabicon.css("background-image", "url('" + ViCowaEditorBaseDomain + "/raw/shared/apps/ViCoWaEditor/images/spincircle.svg')");             
                    p_Tab.$tabicon.toggleClass("spin", 1);
                }
            }
     
            /// Stop the spinning circle animation in the editor tab
            function stopSpinner()
            {
                // check if one is running
                if (This.m_TabinnerHTMLBackup)
                {
                    p_Tab.$tabicon.css("background-image", This.m_TabinnerHTMLBackup);
                    This.m_TabinnerHTMLBackup = null;
                    p_Tab.$tabicon.toggleClass("spin", 0);
                }
            }
     
            /// handle a resize action
            this.doResize = function()
            {
                m_CodeEditor.resize();
            };
     
            /// destroy the editor
            this.destroy = function()
            {
                removeEditorFromArray(this);
                m_CodeEditor.destroy();
                p_Tab.tab.m_Editor = null;
            };
     
            this.getArticleName = function(){ return p_TargetPath; };   ///< @return The name of the article that is being edited
            this.isModified = function(){ return m_Modified !== null; };         ///< @return true when the content has been modified or false otherwise
            this.getModifiedTime = function(){ return m_Modified; };        ///< @return the modified time and date
            /// save the content of the current editor
            /// @param p_Callback : Callback function that will be called when the save function returns 
            this.save = function(p_Callback, p_Force)
            { 
                function doSave()
                {
                    m_bSaving = true;
                    var LastModified = ((m_Modified !== null) ? new Date(m_Modified.getTime()) : new Date());
                    // start a spinner and then start the save operation
                    startSpinner();
                    
                    var HandleResult = function(p_Data)
                    {
                        // stop the spinner when the save function returns
                        stopSpinner();
                        m_bSaving = false;
    
                        if (p_Data && p_Data.save && p_Data.save.result === 'Success') 
                        {
                            // autosave was temporarly disabled so reanble here again
                            if (m_Autosave == -1)
                            {
                                m_Autosave = 1;
                            }
                            // update last saved text if edit was successful 
                            $m_SavedNotifyTooltip.html($.i18n._("%1$s was successfully saved", [p_TargetPage]));
                            $m_SavedNotifyTooltip.toggleClass("show", true);
                            setTimeout(function()
                            {
                                $m_SavedNotifyTooltip.toggleClass("show", false);
                            }, 500);
        
                            // on a  successfull save we will reset the modified flag
                            // but only if no further modifications have been made in the mean time
                            if (m_Modified && LastModified.getTime() == m_Modified.getTime())
                            {
                                setModified(null); 
                            }
                            if (p_Callback)
                            {
                                // if a callback function was specified, call it here
                                p_Callback(true);
                            }
                        } 
                        else if (p_Data && p_Data.canceled)
                        {
                            // the action was canceled, keep the data modified but disable autosave temporarly 
                            m_Autosave = -1;
                        }
                        else if (p_Data && p_Data.error) 
                        {
                            alert($.i18n._("Error: API returned error: %1$s", [p_Data.error]));
                            // we had an error, call the callback with false
                            if (p_Callback)
                            {
                                p_Callback(false);        
                            }
                        } 
                        else 
                        {
                            alert($.i18n._("Error: Unknown result from API."));
                            // we had an error, call the callback with false
                            if (p_Callback)
                            {
                                p_Callback(false);        
                            }
                        }
                    };
                    
                    var HandleError = function()
                    {
                        alert($.i18n._("Error: Request failed."));
                        // we had an error, call the callback with false
                        if (p_Callback)
                        {
                            p_Callback(false);        
                        }
                    };
                    
                    saveArticle(unescape(m_PageName), m_CodeEditor.getSession().getValue(), HandleResult); 
                }

                var now = new Date();
                var MustSave = !m_bSaving && m_Modified !== null && (now.getTime() -  m_Modified.getTime()) > 2000;
                
                if (p_Force)
                {
                    if (m_bSaving)
                    {
                        // popup message box saying that we are already saving to make sure this is what we want
                        $("<div/>").html("<p>The file: <strong>" + unescape(m_PageName).substring(unescape(m_PageName).lastIndexOf("/") + 1) + "</strong> is in the process of being saved to the server, if you think this save operation is not going to finish you can click the <strong>Save now</strong> button to force a new save operation.</p><p>You can click <strong>cancel</strong> to continue to wait for the current save operation to be finished.</p>").appendTo($("body")).dialog(
                        {
                            title: "Save now",
                            resizable: false,
                            height:240,
                            modal: true,
                            buttons: 
                            {
                                "Save now": function() 
                                {
                                    $(this).dialog("close");
                                    $(this).remove();
                                    doSave();
                                },
                                Cancel: function() 
                                {
                                    $(this).dialog("close");
                                    $(this).remove();
                                }
                            }
                        });
                    }
                    else
                    {
                        doSave();
                    }
                }
                else if (MustSave)
                {
                    doSave();
                }
            };
            
            /// Update the content of the preview document
            /// @param p_Content : The modified data
            this.updateMainContent = function(p_Content)
            {
                // go through all editors and update their links 
                for (Index = 0; Index < m_Editors.length; Index++)
                {
                    if (m_Editors[Index] != This)
                    {
                        p_Content = m_Editors[Index].updateLinks(p_Content);
                    }
                }
     
                /// parse the data that was passed in
                if (m_$ArticleContentPlaceHolder)
                {
                    // make sure invalid html; doesn't mess up our editor
                    $.ViCoWaErrorHandler.tryCatchCall(function()
                    {
                        // filter scripts when updating the inner html for the main article, because scripts might mess up editing when inline scripts are executed
                        var $Dom = $(p_Content).not("script");
                        if ($Dom)
                        {
                            $Dom.find("script").remove();
                            // save the scroll position of the preview window
                            var ScrollPosX = $("body", m_PreviewDocument).scrollLeft();
                            var ScrollPosY = $("body", m_PreviewDocument).scrollTop();
                            m_$ArticleContentPlaceHolder.empty();
                            $Dom.appendTo(m_$ArticleContentPlaceHolder);
                            // restore the scroll position of the preview window this might not work properly if images finish loading later
                            $("body", m_PreviewDocument).scrollLeft(ScrollPosX);
                            $("body", m_PreviewDocument).scrollTop(ScrollPosY);
                        }
                        else
                        {
                            m_$ArticleContentPlaceHolder.html(p_Content);
                        }
                    });
                }
    
                for (Index = 0; Index < m_Editors.length; Index++)
                {
                    if (m_Editors[Index] != This)
                    {
                        m_Editors[Index].attachTargetContainers(m_PreviewDocument);
                    }
                }
            };
     
            function nextDoc()
            {
                
            }
            
            function prevDoc()
            {
                
            }
     
            /// event handler for when the data in the editor has changed
            /// @param p_ChangeModified : true if the change should update the modified state, false otherwise
            function onEditorChange(p_ChangeModified)
            {
                var Content, Index;
                // only update the modified state when this flag is true
                if (p_ChangeModified && !m_bLoading)
                {
                    setModified(new Date());
                }
     
                // this code is only executed for visual document type editors
                if (p_Type !== EEditorTypes.ET_JS.id && p_Type !== EEditorTypes.ET_JSON.id)
                {
                    Content = m_CodeEditor.getSession().getValue();
                    // if target containers are set, fill their content with the content of the editor
                    if (m_TargetContentContainer.length !== 0)
                    {
                        for (Index = 0; Index < m_TargetContentContainer.length; Index++)
                        {
                            m_TargetContentContainer[Index].innerHTML = Content;
                        }
                    }
                    else if (p_TargetPath === m_MainArticleName)
                    {
                        This.updateMainContent(Content);
                    }
                }
            }

            // start code execution here
            /// Connect the change event handler to the editor
            m_CodeEditor.getSession().on('change', function()
            {
                onEditorChange(true);
            });
     
            /// Set our own key shortcuts
            m_CodeEditor.commands.addCommands(
            [
                {
                    name: 'Save',
                    bindKey:
                    {
                        win: 'Ctrl-s',
                        mac: 'Command-s',
                        sender: 'editor'
                    },
                    exec: function(/*env, args, request*/)
                    {
                        saveEditorContent();   
                    }
                },
                {
                    name: "showKeyboardShortcuts",
                    bindKey: 
                    { 
                        win: "Ctrl-Alt-h", 
                        mac: "Command-Alt-h"
                    },
                    exec: function(editor) 
                    {
                        config.loadModule("ace/ext/keybinding_menu", function(module) 
                        {
                            module.init(editor);
                            editor.showKeyboardShortcuts();
                        });
                    }
                },
                {
                    name: "nextFile",
                    bindKey: "Ctrl-tab",
                    exec: function(editor) { nextDoc(); },
                    readOnly: true
                }, 
                {
                    name: "previousFile",
                    bindKey: "Ctrl-shift-tab",
                    exec: function(editor) { prevDoc(); },
                    readOnly: true
                },
            ]);
     
            // insert the editor as the first editor (and thus the active one)
            m_Editors.splice(0, 0, this);
            
            
            // set up the editor for the proper document type
            switch (p_Type)
            {
                case EEditorTypes.ET_CSS.id:   
                    attachStyle();
                break;
                case EEditorTypes.ET_JSON.id:
                    attachJSON();
                break;
                case EEditorTypes.ET_JS.id:    
                    attachJavascript();
                break;
                case EEditorTypes.ET_PHP.id:
                    attachPHP();
                break;
                case EEditorTypes.ET_XML.id:
                    m_CodeEditor.getSession().setMode(new (require("ace/mode/" + "xml").Mode)()); 
                    m_TargetContentContainer = [];
                break;
                case EEditorTypes.ET_HTML.id:  
                    m_CodeEditor.getSession().setMode(new (require("ace/mode/" + "html").Mode)()); 
                    m_TargetContentContainer = [];
                    updateContentForNewEditor();
                    break;
                case EEditorTypes.ET_PLAINTEXT.id: // for now wiki is the same as plaintext
                case EEditorTypes.ET_WIKI.id:  
                    m_TargetContentContainer = [];
                    updateContentForNewEditor();
                break;
            }

            // start the spinner and then start loading the document content
            startSpinner();
     
            $.ViCoWaErrorHandler.tryCatchCall(function()
            {
                getRawArticle(unescape(m_PageName), function(p_Data)
                {
                    // the following try catch block is here to make sure the spinner gets stopped even if a problem occurs within the following code
                    $.ViCoWaErrorHandler.tryCatchCall(function()
                    {
                        // when the data has been retrieved, fill tthe editor content and make sure the editor
                        // fits within its container
                        m_bLoading = true;
                        $.ViCoWaErrorHandler.tryCatchCall(function()
                        {
                            m_CodeEditor.getSession().setValue(p_Data.content);
                        });
                        m_bLoading = false;
                        setModified(null);
                        This.doResize();
     
                        switch (p_Type)
                        {
                            case EEditorTypes.ET_CSS.id:    //  fall through intentionally
                            case EEditorTypes.ET_JSON.id:
                            break;
                            case EEditorTypes.ET_JS.id:    
                                reattachJavascript();
                            break;
                            case EEditorTypes.ET_HTML.id:  //  fall through intentionally
                            case EEditorTypes.ET_XML.id:
                                break;
                            case EEditorTypes.ET_PLAINTEXT.id: // for now wiki is the same as plaintext
                            case EEditorTypes.ET_WIKI.id:  
                            break;
                        }
                    });
     
                    // stop the spinner
                    stopSpinner();
                });
            },
            {
                catcher: function()
                {
                    // stop the spinner
                    stopSpinner();
                }
            });
        }
     
        /// Close the given tab, this will first test if the content for the editor for the given tab 
        /// has not been modified and will ask the user to save if it is at which time he can save or not save or cancel the close
        /// @param p_Tab : The tab that we are trying to close
        function closeTab(p_Tab)
        {
            var Dialog;
            // check if the editor is modified
            if (p_Tab.m_Editor && typeof p_Tab.m_Editor.isModified !== "undefined" && p_Tab.m_Editor.isModified())
            {
                // popup dialog here. The article ... has been modified, do you want to save it. Yes | No | Cancel
                Dialog = $("<div title='Unsaved changes detected'>" + $.i18n._("The article %1$s has been modified, do you want to save it?", [p_Tab.m_Editor.getArticleName()]) + " </div>");
                $(Dialog).dialog(
                {
                    modal: true,
                    buttons: 
                    [
                        {
                            text: $.i18n._("Yes"),
                            click: function()
                            {
                                $(Dialog).remove();
                                p_Tab.m_Editor.save(function(p_Success)
                                {
                                    // only close the tab if the save was successfull
                                    if (p_Success)
                                    {
                                        p_Tab.m_Editor.destroy();
                                        p_Tab.m_TabContent.parentNode.removeChild(p_Tab.m_TabContent);
                                        p_Tab.parentNode.removeChild(p_Tab);
                                    }
                                });
                            }
                        },
                        {
                            text: $.i18n._("No"),
                            click: function()
                            {
                                // create the No button, when clicked will just destroy the editor and cose the tab without saving
                                $(Dialog).remove();
                                p_Tab.m_Editor.destroy();
                                p_Tab.m_TabContent.parentNode.removeChild(p_Tab.m_TabContent);
                                p_Tab.parentNode.removeChild(p_Tab);
                            }
                        },
                        {
                            text: $.i18n._("Cancel"),
                            click: function()
                            {
                                // create the cancel button, if clicked will just close the dialog and do nothing else
                                $(Dialog).remove();
                            }
                        }
                    ],
                    minWidth: 300,
                    minHeight: 300,
                    dialogClass: "unsaveddata"
                });
            }
            else // if the article was not modified will just destroy the editor and close the tab without asking questions
            {
                p_Tab.m_Editor.destroy();
                p_Tab.m_TabContent.parentNode.removeChild(p_Tab.m_TabContent);
                p_Tab.parentNode.removeChild(p_Tab);
            }
            
            $(window).trigger("resize");
        }
     
        /// create a new editor tab
        /// @param p_TabName : The name to show on the tab
        /// @param p_TabTitle : tooltip shown when hovering the tab, most common use is to show the full article path
        /// @param p_Type : The document type for the new editor
        function createTab(p_TabName, p_TabTitle, p_Type)
        {
            var Tab, TabText, TabContent, TabButtonBar, EditorContainer, CloseBtn, $TabIcon;
            // tabs are created as list items
            Tab = document.createElement("li");
            Tab.className = "tab";
            Tab.title = p_TabTitle;
            $m_TabList[0].appendChild(Tab);
            $TabIcon = $("<span/>").addClass("tab-icon").appendTo(Tab);
            MimeTypeImageRetriever.getMimeTypeImagePath(p_Type.extension, function(p_Path)
            {
                if (Tab.m_Editor && Tab.m_Editor.m_TabinnerHTMLBackup !== null)
                {
                    Tab.m_Editor.m_TabinnerHTMLBackup = "url('" + p_Path  + "')";    
                }
                else
                {
                    $TabIcon.css("background-image", "url('" + p_Path  + "')");
                }
            });
            TabText = document.createElement("span");
            TabText.innerHTML = p_TabName;
            TabText.className = "tabtext";
            Tab.appendChild(TabText);
            // the tab content will be separate from the tab itself
            TabContent = document.createElement("div");
            TabContent.className = "noselect tab-content";
            // a div to contain editor specific command buttons
            TabButtonBar = document.createElement("div");
            TabButtonBar.className = "tab-specific-button-bar";
            TabContent.appendChild(TabButtonBar);
            // the DIV that will be used for the editor is owned by the tab content
            EditorContainer = document.createElement("div");
            EditorContainer.className = "editor-tab-content";
            TabContent.appendChild(EditorContainer);
            Tab.m_TabContent = TabContent;
            // tab starts of inactive
            Tab.m_Active = false;
            // when the tab is clicked it should activate itself
            $(Tab).on("click", function()
            {
                setActiveEditor(Tab.m_Editor);
            });
            // the tab close button is owned by the tab
            CloseBtn = document.createElement("span");
            CloseBtn.className = "tab-close";
            CloseBtn.innerHTML = m_Icons.close;
            CloseBtn.title = $.i18n._("Close");
            // when the lose button is clicked, the tab close function is called (which will check if the content has been modified before closing it)
            $(CloseBtn).on("click", function()
            {
                closeTab(Tab);
            });
            Tab.appendChild(CloseBtn);
            $m_TabBar[0].appendChild(TabContent);
            
            $(window).trigger("resize");
     
            // return the tab so we can attach the editor object
            return { tab: Tab, content: TabContent, editor_container: EditorContainer, tab_button_bar: TabButtonBar, $tabicon: $TabIcon  };
        }
     
        /// open the editor for the given article and type, create one if no editor exists yet for this article
        /// @param p_Path : The path to the article
        /// @param p_Type : The type of the document
        function openEditorTab(p_Path, p_Type)
        {
            var MatchingEditor, Index, Editor, TabInfo;
            MatchingEditor = null;
     
            // check if an editor for this object already exists
            for (Index = 0; Index < m_Editors.length; Index++)
            {
                Editor = m_Editors[Index];
     
                if (Editor.getArticleName() === p_Path)
                {
                    MatchingEditor = Editor;
                    break;
                }
            }
            // if not, create a new editor tab here
            if (MatchingEditor === null)
            {
                TabInfo = createTab(/[^\/:]+$/.exec(p_Path)[0], p_Path, p_Type);
                TabInfo.tab.className += " active";
                TabInfo.tab.m_TabContent.className += " visible";
                MatchingEditor = editorFactory(p_Path, TabInfo, p_Type.type);
                // set the editor active
                setActiveEditor(MatchingEditor);
            }
            else
            {
                // set the editor active
                setActiveEditor(MatchingEditor);
            }
        }
        
        function editorFactory(p_Path, TabInfo, p_Type)
        {
            var Editor = null;
            if (p_Type === EEditorTypes.ET_SVG.id)
            {
                Editor = new CSVGEditor(p_Path, TabInfo);
            }
            else
            {
                Editor = new CEditor(p_Path, TabInfo, p_Type);
            }
            
            return Editor;
        }
     
        /// Show the open dialog so you can select the editors to create
        function openEditors()
        {
            var Dialog, List, Option, DocIndex, StyleIndex, ScriptIndex, HTMLIndex, m_FocusIndex = -1,
            WikiIndex, EditBtn, TableDiv, Table, TBody, DocListRow, DocListCell, DocListIconSpan, DocListNameSpan;
            // popup a dialog with a list control to select the files to edit
            
            buildDocList();
            
            EditBtn = 
            {
                text: $.i18n._("Edit"),
                click: function()
                {
                    var Index, SelOption;
                    $(document).off("keydown", keyNavigationHandler);
                    $(Dialog).remove();
                
                    for (Index = 0; Index < TBody[0].childNodes.length; Index++)
                    {
                        SelOption = TBody[0].childNodes[Index];
                        if (SelOption.selected)
                        {
                            DocListCell = TBody[0].childNodes[Index].childNodes[0];
                            openEditorTab(DocListCell.value.fullurl, DocListCell.value);
                        }
                    }
                },
                disabled: true
            };
            
            Dialog = $('<div title="Linked files" class="linked-file-browser"></div>');
            $(Dialog).dialog(
            {
                modal: true,
                buttons: 
                [
                    EditBtn,
                    {
                        text: $.i18n._("Cancel"),
                        click: function()
                        {
                            $(document).off("keydown", keyNavigationHandler);
                            $(Dialog).remove();
                        }
                    }
                ],
                minWidth: 300,
                minHeight: 300,
                resize: function(event, ui) 
                {
                    updateSize();
                },
                dialogClass: "linkedfilesdialog"
            });
    
            function updateSize()
            {
                TableDiv.css({'height' : Dialog.height(), 'width' : Dialog.width() });
            }
            
            TableDiv = $('<div></div>').addClass("doclist-container").appendTo(Dialog);
            Table = $('<table></table>').addClass("doc-list").appendTo(TableDiv);
            TBody = $('<tbody></tbody>').appendTo(Table);
     
            /// Handler used to enable navigation in the list by using the keyboard 
            function keyNavigationHandler(p_Event)
            {
                var StartFocusIndex = m_FocusIndex, PageSize = 8, Index, ClientRect;
                p_Event = (p_Event) ? p_Event : window.event;
     
                ClientRect = { left:TableDiv[0].offsetLeft, top:TableDiv[0].offsetTop, right:(TableDiv[0].offsetLeft + TableDiv[0].offsetWidth), bottom: (TableDiv[0].offsetTop + TableDiv[0].offsetHeight) };
     
                var KeyCodes = 
                {
                    KC_UP: 38,
                    KC_DOWN: 40,
                    KC_PAGEUP: 33,
                    KC_PAGEDOWN: 34
                };
     
                switch (p_Event.keyCode)
                {
                case KeyCodes.KC_UP:			m_FocusIndex--;	break;
                case KeyCodes.KC_DOWN:			m_FocusIndex++;	break;
                case KeyCodes.KC_PAGEUP:		m_FocusIndex -= PageSize;	break;
                case KeyCodes.KC_PAGEDOWN:		m_FocusIndex += PageSize;	break;
                }
     
                if (m_FocusIndex < 0)
                {
                    m_FocusIndex = 0;
                }
                if (m_FocusIndex >= m_AvailableDocs.getDocCount())
                {
                    m_FocusIndex = m_AvailableDocs.getDocCount() - 1;
                }
     
                // if the shift key is pressed, selection will add to the current selection
                if (p_Event.shiftKey)
                {
                    if (StartFocusIndex < 0)
                    {
                        StartFocusIndex = 0;
                    }
     
                    if (StartFocusIndex < m_FocusIndex)
                    {
                        for (Index = StartFocusIndex; Index <= m_FocusIndex; Index++)
                        {
                            ChildRow = TBody[0].childNodes[Index];
                            ChildRow.selected = true;
                            ChildRow.className = "selected";
                        }
                    }
                    else
                    {
                        for (Index = m_FocusIndex; Index <= StartFocusIndex; Index++)
                        {
                            ChildRow = TBody[0].childNodes[Index];
                            ChildRow.selected = true;
                            ChildRow.className = "selected";
                        }
                    }
                }
                else // else we will reset all selected items and select the current focus item
                {
                    // unselect all and select m_FocusIndex
                    for (Index = 0; Index < TBody[0].childNodes.length; Index++)
                    {
                        var ChildRow = TBody[0].childNodes[Index];
     
                        if (Index == m_FocusIndex)
                        {
                            ChildRow.selected = true;
                            ChildRow.className = "selected";
                        }
                        else
                        {
                            ChildRow.selected = false;
                            ChildRow.className = "";
                        }
                    }
                }
     
                var FocusChild = TBody[0].childNodes[m_FocusIndex];
     
                if (FocusChild.offsetTop - TableDiv[0].scrollTop < 0)
                {
                    TableDiv[0].scrollTop += FocusChild.offsetTop - TableDiv[0].scrollTop;                
                }
                else if (FocusChild.offsetTop + FocusChild.offsetHeight > ClientRect.bottom - ClientRect.top + TableDiv[0].scrollTop)
                {
                    TableDiv[0].scrollTop += FocusChild.offsetTop + FocusChild.offsetHeight - (ClientRect.bottom - ClientRect.top + TableDiv[0].scrollTop);
                }
     
                p_Event.preventDefault();
                p_Event.cancelBubble = true;
     
                return false;
            }
            // add the keyboard handler
            $(document).on("keydown", keyNavigationHandler);
     
            function applyIcon($p_DocListIconSpan, p_IconName)
            {
                MimeTypeImageRetriever.getMimeTypeImagePath(p_IconName, function(p_Path)
                {
                    $p_DocListIconSpan.css("background-image", "url('" + p_Path + "')");
                });
            }
     
            // fill the list with available document types
            for (DocIndex = 0; DocIndex < m_AvailableDocs.getDocCount(); DocIndex++)
            {
                DocListRow = $('<tr/>').appendTo(TBody);
                DocListCell = $('<td/>').appendTo(DocListRow);
                DocListIconSpan = $('<span/>').addClass("icon").appendTo(DocListCell);
                DocListNameSpan = $('<span/>').addClass("name").appendTo(DocListCell);
                var DocInfo = m_AvailableDocs.getDocAtIndex(DocIndex);
                DocListCell[0].value = DocInfo;
                var IconName = "";
                switch(DocInfo.type)
                {
                case EEditorTypes.ET_CSS.id:       IconName = "css"; break;
                case EEditorTypes.ET_JS.id:        IconName = "js"; break;
                case EEditorTypes.ET_HTML.id:      IconName = "html"; break;
                case EEditorTypes.ET_XML.id:       IconName = "xml"; break;
                case EEditorTypes.ET_PLAINTEXT.id: IconName = "txt"; break;
                case EEditorTypes.ET_WIKI.id:      IconName = "wiki"; break;
                case EEditorTypes.ET_JSON.id:      IconName = "json"; break;
                default:                        IconName = ""; break;
                }
                
                applyIcon(DocListIconSpan, IconName);
                DocListNameSpan.text(DocInfo.name);
                DocListCell.attr("title", DocInfo.fullurl);
            }
            // add a handler for clicking in the list
            $(Table[0]).on("click", function(p_Event)
            {
                var HasSelected, Index;
                p_Event = (p_Event) ? p_Event : window.event;
     
                var Row = p_Event.target;
                while (Row && Row.nodeName != "TR")
                {
                    Row = Row.parentNode;
                }
     
                if (p_Event.ctrlKey)
                {
                    Row.selected = !Row.selected;
                    Row.className = (Row.selected) ? "selected" : "";
                }
                else
                {
                    if (!Row.selected)
                    {
                        HasSelected = false;
                        var SelectStart = -1;
                        var SelectEnd = -1;
                        for (Index = 0; Index < TBody[0].childNodes.length; Index++)
                        {
                            if (TBody[0].childNodes[Index] === Row)
                            {
                                SelectEnd = Index;
                                break;
                            }
                        }
                        for (Index = 0; Index < TBody[0].childNodes.length; Index++)
                        {
                            if (TBody[0].childNodes[Index].selected)
                            {
                                if (SelectStart < 0 || Math.abs(SelectStart - SelectEnd) < Math.abs(Index - SelectEnd))
                                {
                                    SelectStart = Index;
                                }
                            }
                        }
     
                        if (SelectStart > SelectEnd)
                        {
                            var Temp = SelectStart;
                            SelectStart = SelectEnd;
                            SelectEnd = Temp;
                        }
     
                        if (SelectStart < 0)
                        {
                            SelectStart = SelectEnd;
                        }
     
                        Row.selected = true;
                        Row.className = "selected";
     
                        for (Index = 0; Index < TBody[0].childNodes.length; Index++)
                        {
                            var ChildRow = TBody[0].childNodes[Index];
     
                            if (Row === ChildRow || p_Event.shiftKey && Index >= SelectStart && Index <= SelectEnd)
                            {
                                ChildRow.selected = true;
                                ChildRow.className = "selected";
                            }
                            else
                            {
                                ChildRow.selected = false;
                                ChildRow.className = "";
                            }
                        }
                    }
                }
     
                HasSelected = false;
                for (Index = 0; Index < TBody[0].childNodes.length; Index++)
                {
                    if (TBody[0].childNodes[Index].selected)
                    {
                        HasSelected = true;
                    }
                    if (TBody[0].childNodes[Index] === Row)
                    {
                        m_FocusIndex = Index;
                    }
                }
     
                $(".linkedfilesdialog .ui-dialog-buttonpane button:contains('" + EditBtn.text + "')").button(HasSelected ? "enable" : "disable");
     
                p_Event.preventDefault();
                p_Event.cancelBubble = true;
     
                return false;
            });
            // add a handler for double clicking in the list (this will select annd then open the item being double clicked)
            $(Table[0]).on("dblclick", function(p_Event)
            {
                p_Event = (p_Event) ? p_Event : window.event;
                var Index;
                for (Index = 0; Index < TBody[0].childNodes.length; Index++)
                {
                    if (TBody[0].childNodes[Index].selected)
                    {
                        DocListCell = TBody[0].childNodes[Index].childNodes[0];
                        $(document).off("keydown", keyNavigationHandler);
                        $(Dialog).remove(); 
                        openEditorTab(DocListCell.value.fullurl, DocListCell.value);
                        break;
                    }
                }
     
                p_Event.preventDefault();
                p_Event.cancelBubble = true;
     
                return false;
            });
        }
    
        /// Start ViCoWaGit to handle version control
        function startViCoWaGit()
        {
            require(["apps/ViCoWaEditor/ViCoWaGit"], function(ViCoWaGit)
            {
                ViCoWaGit.startDialog(ViCowaEditorBaseDomain);
            });
        }
     
        /// Close the whole editor. This function will check if any of the editors have been modified and ask if the content should be saved if they 
        /// are modified. This function will be called recursivly until no questions remain
        /// @param p_Index : The index of the current editor we are testing for being modified normally you want to pass in 0 here. Recursive calls 
        /// will use other indeces
        function closeViCoWaEditor(p_Index)
        {
            var Index, ModifiedEditor, ModalDialog, DialogBackDrop, Dialog, Text, ButtonBox, YesBTN, NoBTN, YesAllBTN, NoAllBTN, CancelBTN;
            // the index defaults to 0 if not specified
            ModifiedEditor = null;
     
            // check if we have an editor that is modified
            for (Index = (p_Index !== undefined && p_Index !== null) ? p_Index : 0; Index < m_Editors.length; Index++)
            {
                if (m_Editors[Index].isModified())
                {
                    // we found a modified one so we can stop looking
                    ModifiedEditor = m_Editors[Index];
                    break;
                }
            }
            // if we have a modified editor we will ask if the content should be saved
            if (ModifiedEditor !== null)
            {
                // popup dialog here. The article ... has been modified, do you want to save it. Yes | No | Yes to all | No to All | Cancel
                Dialog = $("<div title='Unsaved changes detected'>" + $.i18n._("The article %1$s has been modified, do you want to save it?", [m_Editors[Index].getArticleName()]) + " </div>");
                $(Dialog).dialog(
                {
                    modal: true,
                    buttons: 
                    [
                        {
                            text: $.i18n._("Yes"),
                            click: function()
                            {
                                // create a yes button, clicking this will try to save the editor that is modified
                                
                                $(Dialog).remove();
                                // if the save is done, recursivly call this function to check for any further modified editors
                                m_Editors[Index].save(function(/*p_Success*/)
                                {
                                    // we start at the current editor, if the save was successful it should now not be modified anymore
                                    closeViCoWaEditor(Index);
                                });
                            }
                        },
                        {
                            text: $.i18n._("No"),
                            click: function()
                            {
                                // create a no button, clicking this will skip the current modified editor and search for the next one
                                $(Dialog).remove();
                                // call this function again but start at a 1 higher index
                                closeViCoWaEditor(Index + 1);
                            }
                        },
                        {
                            text: $.i18n._("Yes to all"),
                            click: function()
                            {
                                // create a Yes to all button, clicking this will save all modified articles and then close the editor
                                $(Dialog).remove();
                                var saver = function(p_SaveIndex)
                                {
                                    if (p_SaveIndex < m_Editors.length)
                                    {
                                        if (m_Editors[p_SaveIndex].isModified())
                                        {
                                            m_Editors[p_SaveIndex].save(function(p_Success)
                                            {
                                               if (p_Success) 
                                               {
                                                   // if the save succeeds, go to the next modified editor
                                                   saver(p_SaveIndex + 1);
                                               }
                                               else
                                               {
                                                    // else we call this function again with the current index
                                                    // the save function should have popped up a box already notifying the user of a failed save
                                                   closeViCoWaEditor(p_SaveIndex);
                                               }
                                            });
                                        }
                                        else
                                        {
                                           saver(p_SaveIndex + 1);
                                        }
                                    }
                                    else            
                                    {
                                        // if we are at the end we can call the close again
                                        closeViCoWaEditor(p_SaveIndex);
                                    }
                                };
                    
                                saver(Index);
                            }
                        },
                        {
                            text: $.i18n._("No to all"),
                            click: function()
                            {
                                // create the no to all button, if clicked will just close the editor and don't save anything
                                $(Dialog).remove();
                                closeViCoWaEditor(m_Editors.length);
                            }
                        },
                        {
                            text: $.i18n._("Cancel"),
                            click: function()
                            {
                                // create the cancel button, if clicked will just close the dialog and do nothing else
                                $(Dialog).remove();
                            }
                        }
                    ],
                    minWidth: 300,
                    minHeight: 300,
                    dialogClass: "unsaveddata"
                });
            }
            else // if no modified editors remain, we will close the editor by removing it from the document
            {
                $m_InplaceEditor.remove();
                $m_InplaceEditor = null;
                document.getElementsByTagName("html")[0].style.overflow = "auto";
                // the last step set the current document location back to the page that initiated the edit
                document.location = m_EditTargetLocation;
            }
        }
     
        /// call resize on all currently open editors
        function resizeCodeEditors()
        {
            var Index, Editor;
            for (Index = 0; Index < m_Editors.length; Index++)
            {
                Editor = m_Editors[Index];
                if (typeof Editor.doResize !== "undefined")
                {
                    Editor.doResize();
                }
            }
        }
     
        /// Update the size of all currently open editors
        updateSizes = function()
        {
            $m_InplaceEditorSection.css("top", $m_InplaceEditorSection.offset().top + "px");
            $m_InplaceTargetSection.css("bottom", $m_InplaceEditor.height() - $m_InplaceEditorSection.offset().top + "px");
            resizeCodeEditors();
        };
     
        // the main dom element for the inplace editor
        $m_InplaceEditor = $("<div/>").addClass("vicowa-editor");
        // target section items
        $m_InplaceTargetSection = $("<div/>").addClass("target-section").appendTo($m_InplaceEditor);
        // target iframe
        $m_TargetIFrame = $("<iframe/>").addClass("target-iframe").appendTo($m_InplaceTargetSection);
        // editor section items
        $m_InplaceEditorSection = $("<div/>").addClass("noselect").addClass("editor-section").appendTo($m_InplaceEditor);
        // Gripper used for resizing
        $m_Gripper = $("<div/>").addClass("gripper").appendTo($m_InplaceEditorSection);
        $m_Gripper.draggable(
        {
            iframeFix: true,
            axis: "y",
            helper: function(){ return $("<div/>").addClass("gripper").appendTo("body"); },
            opacity: 1,//0.01,
            cursorAt: { top: 3},
            drag: function(p_Event, p_UI)
            {
                $m_InplaceEditorSection.css("top", p_UI.offset.top + "px");
                $m_InplaceTargetSection.css("bottom", $m_InplaceEditor.height() - p_UI.offset.top + "px");
                resizeCodeEditors();
            }
        });
        // editor container
        $m_EditorContainer = $("<div/>").addClass("container").appendTo($m_InplaceEditorSection);
        // common controls
        // tab bar
        $m_TabBar = $("<div/>").addClass("tabbar").appendTo($m_EditorContainer);
        var $Sizingcontainer = $("<div/>").addClass("tabbarsizing").appendTo($m_TabBar);
        var scrollleftTimeout = 0;
        var scrollleftInterval = 0;
        var scrollrightTimeout = 0;
        var scrollrightInterval = 0;
        
        var scrollLeft = function()
        {
            var Offset = $m_TabList.offset();
            if ($m_TabList.position().left < 0)
            {
                Offset.left += 10;
                $m_TabList.offset(Offset);
                checkScroller();
            }
        };
        
        var scrollRight = function()
        {
            var Offset = $m_TabList.offset();
            if ($m_TabList.position().left > ($TabScrollContainer.width() - $m_TabList.width()))
            {
                Offset.left -= 10;
                $m_TabList.offset(Offset);
                checkScroller();
            }
        };
        
        var $ScrollLeft = $("<input type='button' class='scroll-left' value='&lt;'/>").appendTo($Sizingcontainer);
        $ScrollLeft.mousedown(function()
        {
            scrollLeft();
            scrollleftTimeout = setTimeout(function()
            {
                scrollLeft();
                scrollleftInterval = setInterval(function()
                {
                    scrollLeft();
                    if ($ScrollLeft.prop("disabled"))
                    {
                        clearInterval(scrollleftInterval);
                    }
                }, 50);
            }, 1000);
        }).bind('mouseup mouseleave', function()
        {
            clearTimeout(scrollleftTimeout);
            clearInterval(scrollleftInterval);
        });

        var $TabScrollContainer = $("<div/>").addClass("scrollcontainer").appendTo($Sizingcontainer);
        $m_TabList = $("<ul/>").addClass("tab-list").appendTo($TabScrollContainer);
        var $ScrollRight = $("<input type='button' class='scroll-right' value='&gt;'/>").appendTo($Sizingcontainer);
        $ScrollRight.mousedown(function()
        {
            scrollRight();
            scrollrightTimeout = setTimeout(function()
            {
                scrollRight();
                scrollrightInterval = setInterval(function()
                {
                    scrollRight();
                    if ($ScrollRight.prop("disabled"))
                    {
                        clearInterval(scrollrightInterval);
                    }
                }, 50);
            }, 1000);
        }).bind('mouseup mouseleave', function()
        {
            clearTimeout(scrollrightTimeout);
            clearInterval(scrollrightInterval);
        });
        
        var checkScroller = function()
        {
            var Scrollable = $m_TabList.width() > $TabScrollContainer.width();
            $ScrollLeft.toggleClass("visible", Scrollable);
            $ScrollRight.toggleClass("visible", Scrollable);
            $TabScrollContainer.toggleClass("scrollable", Scrollable);
            $ScrollLeft.prop('disabled', $m_TabList.position().left === 0);
            $ScrollRight.prop('disabled', $m_TabList.position().left <= ($TabScrollContainer.width() - $m_TabList.width()));
            
            while ($m_TabList.position().left < ($TabScrollContainer.width() - $m_TabList.width() - 10) && $m_TabList.position().left < 0)
            {
                scrollLeft();
            }
        };
        
        $(window).on("resize", function()
        {
            checkScroller();
        });
        
        $m_ButtonBar = $("<div/>").addClass("button-bar").appendTo($m_EditorContainer);
        // select files to edit button
        $m_OpenButton = $("<span/>").addClass("edit-button").addClass("disabled").attr("title", $.i18n._("Open articles for editing")).html(m_Icons.open).appendTo($m_EditorContainer);
     
        // directory browse button
        $m_DirectorBrowseButton = $("<span/>").addClass("edit-button").attr("title", $.i18n._("Open articles for editing")).html(m_Icons.open).appendTo($m_EditorContainer);
        
        function getValueTypeByExtension(p_Path)
        {
            var LastIndex = p_Path.lastIndexOf(".");
            var Ext = "";
            if (LastIndex != -1)
            {
                Ext = p_Path.substr(LastIndex + 1).toLowerCase();
            }
            
            var Result = EEditorTypes.ET_PLAINTEXT.id;
            
            switch (Ext)
            {
                case "css":     Result = { type: EEditorTypes.ET_CSS.id, extension: Ext}; break;
                case "js":      Result = { type: EEditorTypes.ET_JS.id, extension: Ext};  break;
                case "htm":     // fall through on purpose
                case "html":    Result = { type: EEditorTypes.ET_HTML.id, extension: Ext}; break;
                case "xml":     Result = { type: EEditorTypes.ET_XML.id, extension: Ext}; break;
                case "txt":     Result = { type: EEditorTypes.ET_PLAINTEXT.id, extension: Ext}; break;
                case "wiki":    Result = { type: EEditorTypes.ET_WIKI.id, extension: Ext}; break;
                case "json":    Result = { type: EEditorTypes.ET_JSON.id, extension: Ext}; break;
                case "php":     Result = { type: EEditorTypes.ET_PHP.id, extension: Ext}; break;
                case "svg":     Result = { type: EEditorTypes.ET_SVG.id, extension: Ext}; break;
            }
            
            return Result;
        }

        function getFullPath(p_Path)
        {
            return location.protocol + "//" + location.host + p_Path;
        }
    
        $m_DirectorBrowseButton.serverBrowser(
        {
            onSelect: function(path) 
            {
                var DirOnly = (path.length) ? path[0].match(/.*\//) : null;
                if (DirOnly)
                {
                    amplify.store("lastbrowsepath", DirOnly[0]);
                }
                for (var Index = 0; Index < path.length; Index++)
                {
                    openEditorTab(getFullPath(path[Index]), getValueTypeByExtension(path[Index]));
                }
            },
            onLoad: function() 
            {
                var LastBroswePath = amplify.store("lastbrowsepath");
                // return the path to load on start
                return LastBroswePath || "";
            },
            imageUrl: ViCowaEditorBaseDomain + '/raw/shared/core/images/mime-type-icons/',
            systemImageUrl: ViCowaEditorBaseDomain + '/raw/shared/core/images/mime-type-icons/',
            handlerUrl: ViCowaEditorBaseDomain + '/filesystemaccess',
            title: 'Browse',
            basePath: "/",
            showUpInList: true,
            multiselect: true,
            knownPaths: 
            [
                {
                    text: 'DomainRoot',
                    image: 'root.svg',
                    path:'/'
                },
                {
                    text: 'Shared', 
                    image:'shared.svg', 
                    path:'/shared/'
                },
                {
                    text: 'User data', 
                    image:'userdata.svg', 
                    path:'/userdata/'
                }
            ],
            width: 400,
            height: 400,
            knownExt: [ "bmp", "css", "gif", "html", "jpg", "js", "json", "php", "png", "svg", "txt", "xml" ],
            imageExt: "svg"
        });
    
        // save button
        $m_SaveButton = $("<span></span>").addClass("edit-button").addClass("disabled").html(m_Icons.save).attr("title", $.i18n._("Save")).click(function()
        {
            if (!$(this).hasClass("disabled"))
            {
                saveEditorContent();
            }
        }).appendTo($m_EditorContainer);
        // save all button
        $m_SaveAllButton = $("<span></span>").addClass("edit-button").addClass("disabled").html(m_Icons.saveall).attr("title", $.i18n._("Save all")).click(function()
        {
            if (!$(this).hasClass("disabled"))
            {
                saveAllContent();
            }
        }).appendTo($m_EditorContainer);
        // version control button
        $m_VersionControlButton = $("<span></span>").addClass("versioncontrol-button").html(m_Icons.versioncontrol).attr("title", $.i18n._("Version control")).click(startViCoWaGit).appendTo($m_EditorContainer);
        
        // close editor button
        $m_CloseButton = $("<span></span>").addClass("close-button").attr("title", $.i18n._("Close the editor")).html(m_Icons.close).click(function()
        {
            closeViCoWaEditor(0);
        }).appendTo($m_EditorContainer);
    
        $m_SavedNotifyTooltip = $("<div></div>").addClass("saved-notify-popup").appendTo($m_InplaceEditor);
     
        $ProgressText.text("Loading: Preview content ...");
        $m_TargetIFrame.attr("src", m_EditTargetLocation);
     
        function addToArray(p_Array, p_ItemToAdd)
        {
            var Index;
            for (Index = 0; Index < p_Array.length; Index++)
            {
                if (p_Array[Index] == p_ItemToAdd)
                {
                    break;
                }
            }
     
            if (Index == p_Array.length)
            {
                p_Array.push(p_ItemToAdd);
            }
        }
    
        m_MainArticleTemplates = [];
    
        /// build a list of editable documents
        function buildDocList()
        {
            var EditableLinkMatch = new RegExp("^(?:)?.*?\\.(css|json|js)");
    
            // get all the links and scripts from this design
            // add the main document
            m_$ArticleContentPlaceHolder = $("#content", m_PreviewDocument);
            if (!m_$ArticleContentPlaceHolder)
            {
                alert ("Preview document has no #content");
            }
            m_AvailableDocs.addDocLink(m_MainArticleName.replace(/index\//i, "").replace(/raw\//i, ""));
     
            // add style sheets
            $("link", m_PreviewDocument).each(function()
            {
                if (EditableLinkMatch.test(this.href))
                {
                    m_AvailableDocs.addDocLink(this.href.replace(/raw\//i, ""));
                }
            });
            
            // add javascript files
            $("script", m_PreviewDocument).each(function()
            {
                if (EditableLinkMatch.test(this.src))
                {
                    m_AvailableDocs.addDocLink(this.src.replace(/raw\//i, ""));
                }
            });     
            
            // add transcluded documents
            $("[transclude]", m_PreviewDocument).each(function()
            {
                if ($(this).attr("transclude"))
                {
                    m_AvailableDocs.addDocLink($(this).attr("transclude").replace(/raw\//i, ""));
                }
            });
    
            // go through the editor and check if any of them is the main article
            for (Index = 0; Index < m_Editors.length; Index++)
            {
                if (m_Editors[Index].getArticleName() == m_MainArticleName.replace(/raw\//i, ""))
                {
                    // update the content of the main article
                    m_Editors[Index].updateMainContent();
                    break;
                }
            }
        }
    
        // define handling for when the iframe is loaded
        $m_TargetIFrame.load(function()
        {
            // try to disable all caching
            m_PreviewDocument = $m_TargetIFrame[0].contentDocument;
            var DocumentHead = m_PreviewDocument.getElementsByTagName('head')[0];
            var Meta = m_PreviewDocument.createElement('meta');
            Meta.setAttribute("HTTP-EQUIV", "CACHE-CONTROL");
            Meta.setAttribute("CONTENT", "NO-CACHE");
            DocumentHead.appendChild(Meta);
            Meta = m_PreviewDocument.createElement('meta');
            Meta.setAttribute("HTTP-EQUIV", "PRAGMA");
            Meta.setAttribute("CONTENT", "NO-CACHE");
            DocumentHead.appendChild(Meta);
            Meta = m_PreviewDocument.createElement('meta');
            Meta.setAttribute("HTTP-EQUIV", "Expires");
            Meta.setAttribute("CONTENT", "0");
            DocumentHead.appendChild(Meta);
            // enable the open button
            $m_OpenButton.toggleClass("disabled", false);
            $m_OpenButton.off("click");
            $m_OpenButton.click(openEditors);
            
            for (Index = 0; Index < m_Editors.length; Index++)
            {
                m_Editors[Index].attachTargetContainers(m_PreviewDocument);
            }

            $SpinContainer.spin(false);
            $LoadProgress.remove();
            $ModalOverlay.remove();
        });
     
        // retrieve the raw content of the given document
        getRawArticle(m_MainArticleName, function(p_Data)
        {
            m_PageContent = p_Data.content;
        });
     
        $(window).on("resize", updateSizes);
     
        // prevent scroll bars for the special page
        $("html").css("overflow", "hidden");
        // create the area for the editor
        $m_InplaceEditor.appendTo(document.body);
        
        updateSizes();
     
        // add an unload handler so we can warn the user that modified editors exist when he tries to navigate away from the page and to prevent accidental refresh button presses
        $(window).on("beforeunload", function(p_Event)
        {
            var Index, ReturnString;
            ReturnString = null;
            p_Event = p_Event || window.event;
     
            if ($m_InplaceEditor)
            {
                // check if any modified editors exist
                for (Index = 0; Index < m_Editors.length; Index++)
                {
                    if (m_Editors[Index].isModified())
                    {
                        ReturnString = $.i18n._("This page contains articles that have been modified. If you navigate away from this page the changes will be lost.");                
                    }
                }
                
                if (!ReturnString)
                {
                    ReturnString = $.i18n._("ViCoWa editor is running on this page. If you navigate away all documents will be closed.");
                }
            }
     
            if (p_Event && ReturnString)
            {
                p_Event.returnValue = ReturnString;
            }
     
            if (ReturnString)
            {
                return ReturnString;
            }
        });
    }
     
    /// Start the editor, retrieve the target page from the url (where it is encoded)
    (function()
    {
        "use strict";
    
        $ProgressText.text("Loading: Ace editor...");
        require(
            [
                "ace/ace",
                "jqueryplugin/jquery.i18n/jquery.i18n", 
                "jqueryplugin/jquery.url/jquery.url", 
                "jqueryplugin/jquery.ba-bbq/jquery.ba-bbq",
                "library/amplify/amplify.min",
                "apps/svg-edit/embedapi"
                ], function(p_Ace)
        {
            $ProgressText.text("Loading: Helper objects...");
            $("<link/>", { type: "text/css", rel: "stylesheet", href: ViCowaEditorBaseDomain + "/raw/shared/core/library/jquery/plugins/jquery.ui/css/vicowa/jquery-ui.css" }).appendTo("head");
            
            require(
            [
                "i18n/en_EN", 
                "library/aes/autoencrypt", 
                "jqueryplugin/jquery.ui.touch-punch/jquery.ui.touch-punch.min",
                "jqueryplugin/jquery.serverBrowser/jquery.serverBrowser"
            ], function(dummy, autoEncrypt)
            {
                $ProgressText.text("Loading: Editor modes...");
                require(
                    [    
                        "ace/mode/c_cpp",
                        "ace/mode/clojure",
                        "ace/mode/coffee",
                        "ace/mode/csharp",
                        "ace/mode/css",
                        "ace/mode/groovy",
                        "ace/mode/html",
                        "ace/mode/java",
                        "ace/mode/javascript",
                        "ace/mode/json",
                        "ace/mode/ocaml",
                        "ace/mode/perl",
                        "ace/mode/php",
                        "ace/mode/python",
                        "ace/mode/ruby",
                        "ace/mode/svg",
                        "ace/mode/textile",
                        "ace/mode/xml",
                        "ace/ext/language_tools"
                    ], function()
                {
                    $ProgressText.text("Creating: ViCoWaEditor instance ...");
                    $("<link/>", { type: "text/css", rel: "stylesheet", href: ViCowaEditorBaseDomain + "/raw/shared/core/library/jquery/plugins/jquery.serverBrowser/jquery.serverBrowser.css" }).appendTo("head");
                    
                    ViCoWaLogin.ensureLoggedIn(function()
                    {
                        window.ViCoWaEditor = new CViCoWaEditor(decodeURIComponent($.url(document.location).param('url')), autoEncrypt, p_Ace);
                    });
                });
            });
        });
    })();

    return ViCoWaEditor;
});

