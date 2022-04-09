(function(p_Factory)
{
	if (typeof define === 'function' && define.amd)
	{
		define(["jquery", 
			    "editor", 
				"utility",
			    "mimetypeimages", 
   			], p_Factory);
	}
	else
	{
		window.vicowaeditor.js = p_Factory(jQuery, 
											window.vicowaeditor.editor, 
											window.vicowaeditor.utility, 
											window.mimetypeimages);
	}
}(function($, p_Editor, Utility, MimeTypeImages)
{
	"use strict";
	
	function IsCompatibleFile(p_FileName){ return ["js"].indexOf(Utility.getExtension(p_FileName)) != -1; }

	/// save the javascript if modified and reload it in the preview document
	function reattachJavascript(p_Editor, p_ID)
	{
		// function that will do the reloading, should be called after the save operation completes if a save is required
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

	/// attach a javascript document to an ACE editor instance
	function attachJavascript(p_Editor, p_ID)
	{
		var SaveAndReloadBtn, 
		EvalBtn, 
		EvalSelectionBtn, 
		ViCoWaResetInsertBtn, 
		RedoJavascriptBtn, 
		IDClass = "." + p_ID;

		// create a button used to save and reload the javascript. When the button is clicked, the reset event will be called
		// after which we will ty to save the editor content and then reload the javascript file by removing and
		// then re-adding the link to the javascript in the preview document
		// The advantage of this function compared to the redo javascript is that errors in the consoe will have proper line numbers for
		// any possible errors in the script. It is adviced to implement a listener for both the reset and load event
		// where the load event listener handler would have a "debugger;" statement as its first line. This will
		// make sure that your browser's javascript debugger has the proper file active for debugging
		SaveAndReloadBtn = $(IDClass + " .savereload").attr("title", $.i18n._("Save the current file and reload the javascript")).click(function()
		{
			//when the button is clicked we will save the javascript and then reload it
			reattachJavascript(p_Editor);
		});

		// create the redo javascript button, this will call the reset event followed by eval on the editor content 
		// followed by the load event. This is similar to the save and reload, without doing the save.
		// The advantage of this command is that it is fast since it doesn't save your code first, the disadvantage is 
		// that errors in your javascript will not have give a proper line number in the console. 
		// Adding the reset and load event listeners is adviced where it is recommended to have
		// a "debugger;" statement within the load event handler so the proper instance of javascript objects
		// is shown in your browsers debugger
		RedoJavascriptBtn = $(IDClass + ".reload").attr("title", $.i18n._("Reload the javascript into the page")).click(function()
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
		});

		// create the Eval button. clicking this button will call eval with the content of the editor
		// only call this if your script didn't create any data objects
		EvalBtn = $(IDClass + ".eval").attr("title", $.i18n._("Run eval on the content of the editor")).click(function()
		{
			$m_TargetIFrame[0].contentWindow.eval(m_CodeEditor.getSession().getValue());
		});

		// create the eval selection button
		// Call this to call eval on the selected content of your editor, useful when you want to add new code
		// without reloading your javascript our version of edit and continue
		EvalSelectionBtn = $(IDClass + ".evalselection").addClass("disabled").attr("title", $.i18n._("Run eval on the selection")).click(function()
		{
			$m_TargetIFrame[0].contentWindow.eval(p_Editor.getSession().doc.getTextRange(p_Editor.getSelectionRange()));
		});

		// Insert a ViCoWaResetJavascript and a ViCoWaDoLoadJavascript at the cursor
		// a fast way to add the reset and load event listners to your code
		ViCoWaResetInsertBtn = $(IDClass + ".insertloadreset").attr("title", $.i18n._("Insert a reset and load events at the cursor")).click(function()
		{
			p_Editor.insertIntoEditor("if(parent && parent.ViCoWaEditor)\n{\n    parent.ViCoWaEditor.addEventListener('reset', '" + p_TargetPath + "', function()\n    {\n        // insert your reset code here...\n        return true;\n    });\n\n    parent.ViCoWaEditor.addEventListener('load', '" + p_TargetPath + "', function()\n    {\n        debugger;\n        // insert your load code here...\n        return true;\n    });\n}\n");
		});

		// add an event handler to be called when the selection in the editor changes
		p_Editor.eventSelectionChange(function(p_Selection)
		{
			if (p_Selection !== null && p_Selection !== "")
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

//		m_TargetContentContainer = [];
	}

	return {
		editor: null,
		editorid: "",
		onDocumentLoaded: function(){ reattachJavascript(This.editor, This.editorid);	},
		getDescription: function getDescription(p_FileName){ return (IsCompatibleFile(p_FileName)) ? "JavaScript (JS) file" : null; },
		getIcon: function getIcon(p_FileName, p_Callback)
		{
			var Compatible = IsCompatibleFile(p_FileName);
			if (Compatible)
			{
				MimeTypeImages.getMimeTypeImagePath("js", p_Callback);
			}
			return (Compatible) ? true : false;
		},
		extractCompatibleTypes: function($p_Document)
		{
			var Paths = [];
			$p_Document.find("script[src]").each(function()
			{
				Paths.push({ path: $(this).attr("src"), type: "js" });
			});
		},
		startEditFile: function startEditFile(p_FileName, p_TabFactory, p_CallBack)
		{
			var Result = IsCompatibleFile(p_FileName);
			if (Result)
			{
				var This = this;
				p_TabFactory.createTab(/[^\/:]+$/.exec(p_FileName)[0], p_FileName, "/editors/javascript.html .editor", This.getIcon, function(p_TabInfo)
				{
					p_TabInfo.$Tab.toggleClass("active", true);
					p_TabInfo.$Tab[0].$m_TabContent.toggleClass("visible", true);
					
					This.editor = p_Editor.createEditor(p_FileName, p_TabInfo, new (require("ace/mode/" + "javascript").Mode)(), this);
					This.editorid = p_TabInfo.id;
					attachJavascript(This.editor, This.editorid);
					p_CallBack(This.editor);
				});
			}
			return Result;
		},
	};
}));