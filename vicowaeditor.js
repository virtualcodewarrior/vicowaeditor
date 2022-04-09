// vicowaeditor.js - This file is part of the ViCoWa editor
// @author ViCoWa
// @version 0.0.4
// @copyright Copyright (C) 2011-2014 ViCoWa
// @url www.vicowa.com
// @license The MIT License - http://www.opensource.org/licenses/mit-license.php
// -----------------------------------------------------------------------
// Copyright (c) 2011-2014 ViCoWa : www.vicowa.com
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy 
// of this software and associated documentation files (the "Software"), to deal 
// in the Software without restriction, including without limitation the rights to 
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of 
// the Software, and to permit persons to whom the Software is furnished to do 
// so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all 
// copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES 
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, 
// WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR 
// OTHER DEALINGS IN THE SOFTWARE. 
// -----------------------------------------------------------------------

/*jslint es5: true, regexp: true, devel: true, browser: true, evil: true, plusplus: true*/
/*global $,ace,require,ViCoWaEditorMessages, amplify, unescape, ViCowaEditorBasePath, embedded_svg_edit, noty*/

define([
    "jquery", 
    "vicowalogin", 
    "mimetypeimages", 
    "vicowafilesystemaccess", 
	"dialogs/fileopendialog.js",
    "jquery.noty", 
    "jquery.vicowa.errorhandling",
    "jquery.ui", 
    "jquery.spin",
	"jquery.vicowa.addcss",
    ], function($, ViCoWaLogin, MimeTypeImageRetriever, ViCowaFileSystemAccess, FileOpenDialog)
{
	function MakeHash(p_String) 
	{
		var hash = 0, 
		Index, 
		chr;
		if (p_String.length !== 0) 
		{
			for (Index = 0; Index < p_String.length; Index++) 
			{
				chr   = p_String.charCodeAt(Index);
				hash  = ((hash << 5) - hash) + chr;
				hash |= 0; // Convert to 32bit integer
			}
		}
		return hash;
	}

	"use strict";

	$.addCSS("vicowaeditor.css");

    // create a modal progress dialog for vicowa editor load, note that the styles are hardcoded since the stylesheets will not have been loaded yet
    var $ModalOverlay = $("<div/>").css({ "z-index" : "1000", position: "fixed", width: "100%", height: "100%", "left": "0", "top": "0", "background": "#eee url(images/ui-bg_diagonals-thick_90_eeeeee_40x40.png) 50% 50% repeat", opacity: ".8" }).appendTo($("body")),
    $LoadProgress = $("<div/>").css({ "z-index" : "1001", position: "absolute", width: "20em", height: "10em", left: "50%", top: "50%", margin: "-5em 0 0 -10em", padding: "1em", "border-radius" : "1em", "background-color" : "white", border: "1px solid black", "box-shadow": "2px 2px 4px Gray"  }).appendTo($("body")),
    $TextContainer = $("<div/>").text("Initializing ViCoWa editor").css({"font-weight": "bold", "text-align" : "center", width: "100%"}).appendTo($LoadProgress),
    $ProgressText = $("<span/>").appendTo($("<div/>").appendTo($LoadProgress)),
    $SpinContainer = $("<div/>").css({ position: "absolute", left: "1em", right: "1em", bottom: "1em", height: "4em"}).appendTo($LoadProgress).spin(),
	m_EditorFactories = [];

	// attach the error handler
    $.error = $.ViCoWaErrorHandler.showError;
    $.ViCoWaErrorHandler.setDebug(true);
    $.ViCoWaErrorHandler.setHandler(function(p_ErrorMessage, p_ErrorObject)
    {
        noty({ text: "ViCoWaEditor: " + p_ErrorMessage, type: 'error' });
    });
    
	// load the settings from file
	$.getJSON("settings.json").always(function(p_Data, p_TextStatus)
	{
		if (p_TextStatus !== "success")
		{
			p_Data = { settings: {} };
		}
		Initialize($.extend(
		{
			filesystemaccess: "/filesystemaccess",
			authentication: ""
		}, p_Data.settings));
	});

	// initialize the editor
	// @param p_Settings : Settings used to initialize the editor
	function Initialize(p_Settings)
	{
		// create a filter to be used on disabled buttons
		var Style = $("<style/>").html('.disabled, .disabled .button-icon{ filter:url("#grayscale"); }').appendTo("body");
		$('<svg xmlns="http://www.w3.org/2000/svg" height="0">\n\
		<defs>\n\
		<filter id="grayscale">\n\
		<feColorMatrix type="matrix" values="0.3333 0.3333 0.3333 0 0\n\
							0.3333 0.3333 0.3333 0 0\n\
							0.3333 0.3333 0.3333 0 0\n\
							0      0      0      0.5 0"/>\n\
		</filter></defs></svg>').appendTo("body");
		
		ViCoWaLogin.setServerPath(p_Settings.authentication);
		ViCowaFileSystemAccess.setServerPath(p_Settings.filesystemaccess);
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
			var EEditorTypes, 
			m_Editors = [], 
			m_AvailableDocs, 
			m_EditTargetLocation,
			m_MainArticleName, 
			$m_TargetIFrame, 
			$m_TabList,
			$m_SaveButton, 
			$m_SaveAllButton, 
			$m_SavedNotifyTooltip, 
			$m_TabBar, 
			$m_InplaceEditor,
			$m_InplaceTargetSection, 
			$m_InplaceEditorSection,
			$m_OpenButton, 
			updateSizes, 
			m_EditToken, 
			m_Events, 
			Index, 
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
			if (p_TargetPage === "undefined")
			{
				p_TargetPage = null;
			}
			if (p_TargetPage)
			{
				var SourceURL = $.url(p_TargetPage);
				var DeparamObject = $.deparam($.param.fragment(p_TargetPage));
				if (DeparamObject.url)
				{
					var Port = (SourceURL.attr("port") == "80" || !SourceURL.attr("port")) ? "" : (":" + SourceURL.attr("port"));
					p_TargetPage = SourceURL.attr("protocol") + "://" + SourceURL.attr("host") + Port + DeparamObject.url;
				}
			}

			m_EditTargetLocation = p_TargetPage;

			// types of files we support
			EEditorTypes = Object.freeze(
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
			});
		
			// helper object to keep track of the document types available for editing
			function CAvailableDocList()
			{
				var m_Scripts = [], 
				m_Styles = [], 
				m_Texts = [],
				m_HTMLs = [], 
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
					// for now everything else will be treated the same as plain text
					if (!Matches)
					{
						DocInfo.type = EEditorTypes.ET_PLAINTEXT.id;
						DocInfo.extension = "txt";
						addToArray(m_Texts, DocInfo);                
					}
				};
		
				this.getDocCount = function(){ return m_Texts.length + m_HTMLs.length + m_XMLs.length + m_Styles.length + m_JSONs.length + m_Scripts.length + m_PHPs.length; }; ///< get the number of documents
		
				/// get the document at the given index
				/// @param p_Index : The index from where we want to get the document
				/// @return the document at the given index or null when the index is out of bounds
				this.getDocAtIndex = function(p_Index)
				{
					var Result = null;
					// make sure the index is in range
					if (p_Index >= 0 && p_Index < this.getDocCount())
					{
						if (p_Index < m_Texts.length)
						{
							Result = m_Texts[p_Index];
						}
						else if (p_Index < m_Texts.length + m_HTMLs.length)
						{
							Result = m_HTMLs[p_Index - m_Texts.length];
						}
						else if (p_Index < m_Texts.length + m_HTMLs.length + m_XMLs.length)
						{
							Result = m_XMLs[p_Index - m_Texts.length - m_HTMLs.length];
						}
						else if (p_Index < m_Texts.length + m_HTMLs.length + m_XMLs.length + m_Styles.length)
						{
							Result = m_Styles[p_Index - m_Texts.length - m_HTMLs.length - m_XMLs.length];
						}
						else if (p_Index < m_Texts.length + m_HTMLs.length + m_XMLs.length + m_Styles.length + m_JSONs.length)
						{
							Result = m_JSONs[p_Index - m_Texts.length - m_HTMLs.length - m_XMLs.length - m_Styles.length];
						}
						else if (p_Index < m_Texts.length + m_HTMLs.length + m_XMLs.length + m_Styles.length + m_JSONs.length + m_Scripts.length)
						{
							Result = m_Scripts[p_Index - m_Texts.length - m_HTMLs.length - m_XMLs.length - m_Styles.length - m_JSONs.length];
						}
						else
						{
							Result = m_Scripts[p_Index - m_Texts.length - m_HTMLs.length - m_XMLs.length - m_Styles.length - m_JSONs.length - m_Scripts.length];
						}
					}
					return Result;
				};
				this.getTextCount = function(){ return m_Texts.length; }; ///< @return the number of text documents
				this.getTextAtIndex = function(p_Index){ return (p_Index >= 0 && p_Index < m_Texts.length) ? m_Texts[p_Index] : null; }; ///< @return the text document at the given index or null when the index is out of bounds
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
		
			m_Editors = []; // array of editors that are currently active
			m_EditorsToUpdate = []; // editors to be updated, this is sorted so the first item is the main text (if available and the next ones are text editors and then the rest)
			m_MainArticleName = p_TargetPage; // the main article is initialized with the target page
			m_EditToken = 0;    
			m_Events = {};              // will hold the events      
			m_PreviewDocument = null;   // this is our preview document within the  iframe     
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
		
			/// Executes the given event, this will call all registered event listeners for the given event
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
		
			/// Retrieve the content of an article in raw format
			/// @p_TargetPage : The page for which we want to load the content
			/// @p_Callback : The callback function that will be called when the content has been retrieved
			function getRawArticle(p_TargetPage, p_Callback)
			{
				ViCoWaLogin.ensureLoggedIn(function()
				{
					// this function simply retrieves the article
					ViCowaFileSystemAccess.load(p_TargetPage, function(p_Data)
					{
						if (p_AutoEncrypt)
						{
							p_AutoEncrypt.doDecrypt(p_Data, { bUseTimeout: false }, function(p_Data)
							{
								p_Callback({ content : p_Data });
							});
						}
						else
						{
							p_Callback({ content : p_Data });
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
				$m_TabList.children().each(function()
				{
					var $Tab = $(this);
					if (m_Editors.length > 0 && $Tab[0].m_Editor === m_Editors[0])
					{
						$Tab[0].m_Active = true;
						$Tab.toggleClass("active", true);
						$Tab[0].$m_TabContent.toggleClass("visible", true);
						$Tab[0].m_Editor.update();
					}
					else
					{
						$Tab[0].m_Active = false;
						$Tab.toggleClass("active", false);
						$Tab[0].$m_TabContent.toggleClass("visible", false);
					}
				});
				
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
				$m_SaveButton.toggleClass("disabled", m_Editors.length <= 0);
				$m_SaveAllButton.toggleClass("disabled", m_Editors.length <= 0);
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
					if (p_Page === m_MainArticleName)
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
			
			/// Close the given tab, this will first test if the content for the editor for the given tab 
			/// has not been modified and will ask the user to save if it is at which time he can save or not save or cancel the close
			/// @param p_Tab : The tab that we are trying to close
            function closeTab($p_Tab)
			{
				var Dialog;
				// check if the editor is modified
				if ($p_Tab[0].m_Editor && typeof $p_Tab[0].m_Editor.isModified !== "undefined" && $p_Tab[0].m_Editor.isModified())
				{
					// popup dialog here. The article ... has been modified, do you want to save it. Yes | No | Cancel
					Dialog = $("<div title='Unsaved changes detected'>" + $.i18n._("The article %1$s has been modified, do you want to save it?", [$p_Tab[0].m_Editor.getArticleName()]) + " </div>");
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
									$p_Tab[0].m_Editor.save(function(p_Success)
									{
										// only close the tab if the save was successfull
										if (p_Success)
										{
											$p_Tab[0].m_Editor.destroy();
											$p_Tab[0].$m_TabContent.remove();
											$p_Tab.remove();
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
									$p_Tab[0].m_Editor.destroy();
									$p_Tab[0].$m_TabContent.remove();
									$p_Tab.remove();
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
					$p_Tab[0].m_Editor.destroy();
					$p_Tab[0].$m_TabContent.remove();
					$p_Tab.remove();
				}
				
				$(window).trigger("resize");
			}
		
			/// create a new editor tab
			/// @param p_TabName : The name to show on the tab
			/// @param p_TabTitle : tooltip shown when hovering the tab, most common use is to show the full article path
			/// @param p_IconRetriever : a function to retrieve the icon
			function createTab(p_TabName, p_TabTitle, p_Template, p_IconRetriever, p_Callback)
			{
				$m_TabList.load("/htmltemplates/tab.html .tab", function()
				{
					var Now = new Date();
					var TabID = Now.getTime() + MakeHash(p_TabName);
					
					// tabs are created as list items
					var $Tab = $(this).find(".tab").attr("title", p_TabTitle).addClass("id", TabID).on("click", function()
					{
						// when the tab is clicked it should activate itself
						setActiveEditor($Tab.m_Editor);
					}), 
					$TabIcon = $(this).find(".tab-icon"),
					$TabText = $(this).find(".tabtext").html(p_TabName), 
					$TabContent, 
					$TabButtonBar, 
					$EditorContainer, 
					// the tab close button is owned by the tab
					$CloseBtn = $(this).find("tab-close").attr("title", $.i18n._("Close")).on("click", function()
					{
						// when the close button is clicked, the tab close function is called (which will check if the content has been modified before closing it)
						closeTab($Tab);
					});
					
					p_IconRetriever(p_TabTitle, function(p_Path)
					{
						if ($Tab[0].m_Editor && $Tab[0].m_Editor.m_TabinnerHTMLBackup !== null)
						{
							$Tab[0].m_Editor.m_TabinnerHTMLBackup = "url('" + p_Path  + "')";    
						}
						else
						{
							$TabIcon.css("background-image", "url('" + p_Path  + "')");
						}
					});
					
					$m_TabBar.find(".editorspace").load(p_Template, function()
					{
						// the tab content will be separate from the tab itself
						$TabContent = $(".tab-content").addClass("id", TabID);
						// a div to contain editor specific command buttons
						$TabButtonBar = $(".tab-specific-button-bar");
						// the DIV that will be used for the editor is owned by the tab content
						$EditorContainer = $(".editor-tab-content");
						
						$Tab[0].$m_TabContent = $TabContent;
						// tab starts of inactive
						$Tab[0].m_Active = false;
						
						$(window).trigger("resize");
				
						// return the tab so we can attach the editor object
						p_Callback({ $Tab: $Tab, content: $TabContent, editor_container: $EditorContainer, tab_button_bar: $TabButtonBar, $tabicon: $TabIcon, id: TabID });
					});
				});
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
					m_EditorFactories.every(function(p_Element)
					{
						return !p_Element.startEditFile(p_Path, { createTab: createTab }, function(p_Editor)
						{
							// set the editor active
							setActiveEditor(p_Editor);
						});
					});
				}
				else
				{
					// set the editor active
					setActiveEditor(MatchingEditor);
				}
			}
			
			/// Show the open dialog so you can select the editors to create
			function openEditors()
			{
				var Dialog, List, Option, DocIndex, StyleIndex, ScriptIndex, HTMLIndex, m_FocusIndex = -1,
				TextIndex, EditBtn, TableDiv, Table, TBody, DocListRow, DocListCell, DocListIconSpan, DocListNameSpan;
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
					case EEditorTypes.ET_CSS.id:        IconName = "css"; break;
					case EEditorTypes.ET_JS.id:         IconName = "js"; break;
					case EEditorTypes.ET_HTML.id:       IconName = "html"; break;
					case EEditorTypes.ET_XML.id:        IconName = "xml"; break;
					case EEditorTypes.ET_PLAINTEXT.id:  IconName = "txt"; break;
					case EEditorTypes.ET_JSON.id:       IconName = "json"; break;
					default:                            IconName = ""; break;
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
				require(["vicowagit"], function(ViCoWaGit)
				{
					ViCoWaGit.startDialog(ViCowaEditorBasePath);
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
					if (m_EditTargetLocation)
					{
						document.location = m_EditTargetLocation;
					}
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
			$m_InplaceEditor = $(".vicowa-editor");
			// target section items
			$m_InplaceTargetSection = $(".target-section");
			// target iframe
			$m_TargetIFrame = $(".target-iframe");
			// editor section items
			$m_InplaceEditorSection = $(".editor-section");
			// Gripper used for resizing
			$(".gripper").draggable(
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
			// common controls
			// tab bar
			$m_TabBar = $(".tabbar");
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
			
			var $ScrollLeft = $(".scroll-left");
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

			var $TabScrollContainer = $(".scrollcontainer"),
			$ScrollRight = $(".scroll-right");
			$m_TabList = $(".tab-list");
			
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
		
			$(".open-button").on("click", function()
			{
				FileOpenDialog.create({}, function(p_Result)
				{
					if (p_Result.status === "ok" && p_Result.selected && p_Result.selected.length)
					{
						p_Result.selected.forEach(function(p_Element)
						{
							openEditorTab(getFullPath(p_Element.path), getValueTypeByExtension(p_Element.path));
						});
					}
				});
			});

			// save button
			$m_SaveButton = $("save-button").click(function()
			{
				if (!$(this).hasClass("disabled"))
				{
					saveEditorContent();
				}
			});
			// save all button
			$m_SaveAllButton = $("saveall-button").click(function()
			{
				if (!$(this).hasClass("disabled"))
				{
					saveAllContent();
				}
			});
			// version control button
			$(".versioncontrol-button").click(startViCoWaGit);
			
			// close editor button
			$(".close-button").click(function()
			{
				closeViCoWaEditor(0);
			});
		
			$m_SavedNotifyTooltip = $(".saved-notify-popup");
		
			$ProgressText.text("Loading: Preview content ...");
			if (m_EditTargetLocation)
			{
				$m_TargetIFrame.attr("src", m_EditTargetLocation);
			}
		
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
					$.ViCoWaErrorHandler.showError("Preview document has no #content");
				}
				if (m_MainArticleName)
				{
					m_AvailableDocs.addDocLink(m_MainArticleName.replace(/index\//i, "").replace(/raw\//i, ""));
				}
		
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
					if (m_MainArticleName && m_Editors[Index].getArticleName() == m_MainArticleName.replace(/raw\//i, ""))
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
		
			if (m_MainArticleName)
			{
				// retrieve the raw content of the given document
				getRawArticle(m_MainArticleName, function(p_Data)
				{
					m_PageContent = p_Data.content;
				});
			}
			else
			{
				$SpinContainer.spin(false);
				$LoadProgress.remove();
				$ModalOverlay.remove();
			}
		
			$(window).on("resize", updateSizes);
		
			// prevent scroll bars for the special page
			$("html").css("overflow", "hidden");
			
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
					"jquery.i18n", 
					"purl", 
					"jquery.ba-bbq",
					"amplify",
					], function(p_Ace)
			{
				$ProgressText.text("Loading: Helper objects...");

				$.addCSS("third_party/jquery-ui/1.10.4/themes/cupertino/jquery-ui.css");
				
				require(
				[
					"i18n/en_EN", 
					"aes/autoencrypt", 
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
							"ace/mode/plain_text",
							"ace/ext/language_tools"
						], function()
					{
						var EditorFactoryPath = "/editors/";
						$ProgressText.text("Loading: Editor factories ...");

						// get all the editors
						$.getJSON(EditorFactoryPath + "editors.json", function(p_Data)
						{
							var Required = [];
							p_Data.editors.forEach(function(p_Element)
							{
								Required.push(EditorFactoryPath + p_Element);
							});

							require(Required, function()
							{
								var Index = 0;
								for (Index = 0; Index < arguments.length; Index++)
								{
									m_EditorFactories.push(arguments[Index]);
								}
								
								$ProgressText.text("Creating: ViCoWaEditor instance ...");
								
								ViCoWaLogin.ensureLoggedIn(function()
								{
									window.ViCoWaEditor = new CViCoWaEditor(null, autoEncrypt, p_Ace);
								});
							});
						});
					});
				});
			});
		})();
	}
});

