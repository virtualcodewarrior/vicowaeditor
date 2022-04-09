(function(p_Factory)
{
	if (typeof define === 'function' && define.amd)
	{
		define([
			"jquery", 
			"ace/ace",
		    "vicowalogin",
			"vicowafilesystemaccess", 
			"aes/autoencrypt"
		], p_Factory);
	}
	else
	{
		window.vicowaeditor.editor = p_Factory(jQuery, ace, window.vicowalogin, window.vicowafilesystemaccess, window.autoencrypt);
	}
}(function($, ace, ViCoWaLogin, ViCowaFileSystemAccess, p_AutoEncrypt)
{
	"use strict";

	var m_PreviewDocumentInfo = null;
	
	/// Construct an editor object
	/// @param p_TargetPath : The name of the article we are editing
	/// @param p_Tab : The tab associated with the editor, passed in here so it can receive an editor reference
	/// @param p_Mode : The editor mode for ACE
	/// @param p_TypeInterface : Document type specific interface
	function CEditor(p_TargetPath, p_Tab, p_Mode, p_TypeInterface)
	{
		var m_Modified = null,                              ///< Keeps track if the editor has modified the file
		m_bSaving = false,                                  ///< Indicates if a save operation is in progress
		m_bLoading = false,                                 ///< Indicates if a load operation is in progress
		m_CodeEditor = ace.edit(p_Tab.editor_container[0]), ///< The actual editor object 
		m_TargetContentContainer = [],                      ///< optional container for the data we are editing 
		m_PageName = /[^=]+$/.exec(p_TargetPath)[0],        ///< The target path to the page stripped from excess data
		This = this,                                        ///< copy the this pointer in this local object for use in locally scoped functions
		$ReloadIFrameBtn = null,                            ///< the button for reloading the preview frame 
		HashHandler = require("ace/keyboard/hash_handler").HashHandler;
		this.m_TabinnerHTMLBackup = null;                   ///< backs up the inner html of the tab when using the load or save spinner

		p_TypeInterface = $.extend({
			updateLinks: function updateLinks(p_Data){ return p_Data; },
			attachTargetContainers: function attachTargetContainers(p_Document){},
			onDocumentLoaded: function onDocumentLoaded(){},
			onEditorChange: function onEditorChange(){},
		}, p_TypeInterface);
		
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
		p_Tab.$Tab[0].m_Editor = this;                      

/*		// create the reload button, which will be a html SPAN object
		$ReloadIFrameBtn = $("<span></span>").addClass("edit-button").html(m_Icons.reload_frame).attr("title", $.i18n._("Reload the content of the editor preview")).click(function()
		{
			$m_TargetIFrame[0].contentDocument.location.reload(true);
		}).appendTo(p_Tab.tab_button_bar);*/

		/// @return the content of the editor, this is the text that is being edited
		this.getEditorContent = function(){ return m_CodeEditor.getSession().getValue(); };
		
		this.update = function(){ return m_CodeEditor.renderer.updateText(); };

		/// replace links to external articles with a div section containing the hexencoded location
		/// of the original target document
		/// @param p_Data : The content of the article we are doing this replace for
		function replaceTemplateLinksWithDiv(p_Data)
		{
			var MatchTargetTemplate = new RegExp("\\{\\{[^\}]*" + p_TargetPath + "[^\{\/]*\\}\\}", "i"), 
			MatchTargetTemplateNoSpace = new RegExp("\\{\\{[^\}]*" + p_TargetPath.replace(/\s/g, "_") + "[^\{\/]*\\}\\}", "i"), 
			MatchTransclude = new RegExp("transclude=[\"\']" + p_TargetPath + "[\"\']", "i"), 
			MatchTranscludeNoSpace = new RegExp("transclude=[\"\']" + p_TargetPath.replace(/\s/g, "_") + "[\"\']", "i"), 
			Index = 1;

			// replace any reference to the target document with a div
			while(MatchTargetTemplate.test(p_Data))
			{
				p_Data = p_Data.replace(MatchTargetTemplate, "<div id='" + hexEncodeString(p_TargetPath + Index.toString()) + "'></div>");
				Index++;
			}
			while(MatchTargetTemplateNoSpace.test(p_Data))
			{
				p_Data = p_Data.replace(MatchTargetTemplateNoSpace, "<div id='" + hexEncodeString(p_TargetPath + Index.toString()) + "'></div>");
				Index++;
			}
			while(MatchTransclude.test(p_Data))
			{
				p_Data = p_Data.replace(MatchTransclude, "<div id='" + hexEncodeString(p_TargetPath + Index.toString()) + "'></div>");
				Index++;
			}
			while(MatchTranscludeNoSpace.test(p_Data))
			{
				p_Data = p_Data.replace(MatchTranscludeNoSpace, "<div id='" + hexEncodeString(p_TargetPath + Index.toString()) + "'></div>");
				Index++;
			}

			return p_Data;
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

		this.eventSelectionChange = function(p_Callback)
		{
			// add an event handler to be called when the selection in the editor changes
			m_CodeEditor.getSession().selection.on('changeSelection', function()
			{
				var SelectionRange, Selection;
				// set the eval selection button state depending on if we have a selection or not
				SelectionRange = m_CodeEditor.getSelectionRange();
				Selection = m_CodeEditor.getSession().doc.getTextRange(SelectionRange);

				p_Callback(Selection);
			});
		};
		
		this.insertIntoEditor = function(p_Text)
		{
			m_CodeEditor.insert(p_Text);
		};
		
		/// Update the links to the editors or html editors in the given data
		/// @param p_Data : The data in which the links need to be updated
		this.updateLinks = function(p_Data){ return p_TypeInterface.updateLinks(p_Data); };

		/// Attach target containers for the given document
		/// @param p_Document : The document for which we have to attach the target containers
		this.attachTargetContainers = function(p_Document){ p_TypeInterface.attachTargetContainers(p_Document); };

		/// update the preview document's data for the current editor 
		function updateContentForNewEditor()
		{
			var ContentData;

			// find the correct editor and get its content
			for (Index = 0; Index < m_Editors.length; Index++)
			{
				if (m_Editors[Index].getArticleName() === m_PreviewDocumentInfo.m_MainArticleName)
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

			// parse the data and connect to the proper target containers
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
						var ScrollPosX = $("body", m_PreviewDocumentInfo.m_Document).scrollLeft();
						var ScrollPosY = $("body", m_PreviewDocumentInfo.m_Document).scrollTop();
						m_$ArticleContentPlaceHolder.empty();
						$Dom.appendTo(m_$ArticleContentPlaceHolder);
						// restore the scroll position of the preview window this might not work properly if images finish loading later
						$("body", m_PreviewDocumentInfo.m_Document).scrollLeft(ScrollPosX);
						$("body", m_PreviewDocumentInfo.m_Document).scrollTop(ScrollPosY);
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
					m_Editors[Index].attachTargetContainers(m_PreviewDocumentInfo.m_Document);
				}
			}
			This.attachTargetContainers(m_PreviewDocumentInfo.m_Document);
		}

		/// Set the modified date/time for the active editor
		/// @param p_Modified : The new modified time, a time for modified null for NOT modified
		function setModified(p_Modified)
		{
			m_Modified = p_Modified;
			p_Tab.$Tab.toggleClass("modified", m_Modified !== null);
		}

		/// Start the spinning circle animation in the editor tab to indicate save or load on an editor
		function startSpinner()
		{
			// check if one is already running
			if (!This.m_TabinnerHTMLBackup)
			{
				This.m_TabinnerHTMLBackup = p_Tab.$tabicon.css("background-image");
				p_Tab.$tabicon.css("background-image", "url('" + ViCowaEditorBasePath + "/images/spincircle.svg')");             
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
		this.doResize = function(){ m_CodeEditor.resize(); };

		/// destroy the editor
		this.destroy = function()
		{
			removeEditorFromArray(this);
			m_CodeEditor.destroy();
			p_Tab.$Tab[0].m_Editor = null;
		};

		this.getArticleName = function(){ return p_TargetPath; };   	///< @return The name of the article that is being edited
		this.isModified = function(){ return m_Modified !== null; };    ///< @return true when the content has been modified or false otherwise
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
						$.ViCoWaErrorHandler.showError($.i18n._("Error: API returned error: %1$s", [p_Data.error]));
						// we had an error, call the callback with false
						if (p_Callback)
						{
							p_Callback(false);        
						}
					} 
					else 
					{
						$.ViCoWaErrorHandler.showError($.i18n._("Error: Unknown result from API."));
						// we had an error, call the callback with false
						if (p_Callback)
						{
							p_Callback(false);        
						}
					}
				};
				
				var HandleError = function()
				{
					$.ViCoWaErrorHandler.showError($.i18n._("Error: Request failed."));
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
						var ScrollPosX = $("body", m_PreviewDocumentInfo.m_Document).scrollLeft();
						var ScrollPosY = $("body", m_PreviewDocumentInfo.m_Document).scrollTop();
						m_$ArticleContentPlaceHolder.empty();
						$Dom.appendTo(m_$ArticleContentPlaceHolder);
						// restore the scroll position of the preview window this might not work properly if images finish loading later
						$("body", m_PreviewDocumentInfo.m_Document).scrollLeft(ScrollPosX);
						$("body", m_PreviewDocumentInfo.m_Document).scrollTop(ScrollPosY);
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
					m_Editors[Index].attachTargetContainers(m_PreviewDocumentInfo.m_Document);
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
			// only update the modified state when this flag is true
			if (p_ChangeModified && !m_bLoading)
			{
				setModified(new Date());
			}

			p_TypeInterface.onEditorChange();
		}
		
		function updateContent()
		{
			var Content = m_CodeEditor.getSession().getValue(),
			Index;
			// if target containers are set, fill their content with the content of the editor
			if (m_TargetContentContainer.length !== 0)
			{
				for (Index = 0; Index < m_TargetContentContainer.length; Index++)
				{
					m_TargetContentContainer[Index].innerHTML = Content;
				}
			}
			else if (p_TargetPath === m_PreviewDocumentInfo.m_MainArticleName)
			{
				This.updateMainContent(Content);
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

		/// Retrieve the content of a file
		/// @p_Path : The path to the file on the server
		/// @p_Callback : The callback function that will be called when the content has been retrieved
		function loadFileData(p_Path, p_Callback)
		{
			ViCoWaLogin.ensureLoggedIn(function()
			{
				// this function simply retrieves the article
				ViCowaFileSystemAccess.load(p_Path, function(p_Data)
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
	
		
		// insert the editor as the first editor (and thus the active one)
//		m_Editors.splice(0, 0, this);
		// set the mode for ACE
		m_CodeEditor.getSession().setMode(p_Mode);
		
		// start the spinner and then start loading the document content
		startSpinner();

		$.ViCoWaErrorHandler.tryCatchCall(function()
		{
			loadFileData(unescape(m_PageName), function(p_Data)
			{
				// the following try catch block is here to make sure the spinner gets stopped even if a problem occurs within the following code
				$.ViCoWaErrorHandler.tryCatchCall(function()
				{
					// when the data has been retrieved, fill the editor content and make sure the editor
					// fits within its container
					m_bLoading = true;
					$.ViCoWaErrorHandler.tryCatchCall(function()
					{
						m_CodeEditor.getSession().setValue(p_Data.content);
					});
					m_bLoading = false;
					setModified(null);
					This.doResize();

					p_TypeInterface.onDocumentLoaded();
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

	return {
		createEditor : function createEditor(p_TargetPath, p_Tab, p_Mode, p_TypeInterface){ return new CEditor(p_TargetPath, p_Tab, p_Mode, p_TypeInterface); },
//		attachLinkDivs : attachLinkDivs,
//		replaceTemplateLinksWithDiv : replaceTemplateLinksWithDiv,
//		updateContent: updateContent,
		setPreviewDocumentInfo: function setPreviewDocumentInfo(p_Info){ m_PreviewDocumentInfo = p_Info; }
	}
}));
