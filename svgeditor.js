(function(p_Factory)
{
	if (typeof define === 'function' && define.amd)
	{
		define(["jquery"], p_Factory);
	}
	else
	{
		window.vicowaeditor.editor = p_Factory(jQuery);
	}
}(function($)
{
	"use strict";

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

	return {
		createEditor : function createEditor(p_Path, p_TabInfo){ return new CSVGEditor(p_Path, p_TabInfo); },
	}
}));
