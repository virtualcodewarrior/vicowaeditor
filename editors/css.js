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
		window.vicowaeditor.css = p_Factory(jQuery, 
											window.vicowaeditor.editor, 
											window.vicowaeditor.utility, 
											window.mimetypeimages);
	}
}(function($, p_Editor, Utility, MimeTypeImages)
{
	"use strict";

	function IsCompatibleFile(p_FileName){ return ["css"].indexOf(Utility.getExtension(p_FileName)) != -1; }

	/// Attach to or create a style section within the preview document, so we can give realtime feedback
	/// on the modifications being made in the editor when editing style sheets. This function should only be called when
	/// we are editing a style sheet
	function attachStyle()
	{
		var Match, Styles, StyleIndex, Style;

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
	
	return {
		editor: null,
		onEditorChange: function onEditorChange(){ this.editor.updateContent(); },
		attachTargetContainers: function attachTargetContainers(p_Document){ attachStyle(); }, 
		getDescription: function getDescription(p_FileName){ return (IsCompatibleFile(p_FileName)) ? "Castcading Style Sheet (CSS) file" : null; },
		getIcon: function getIcon(p_FileName, p_Callback)
		{
			var Compatible = IsCompatibleFile(p_FileName);
			if (Compatible)
			{
				MimeTypeImages.getMimeTypeImagePath("css", p_Callback);
			}
			return (Compatible) ? true : false;
		},
		extractCompatibleTypes: function($p_Document)
		{
			var Paths = [];
			$p_Document.find("link").each(function()
			{
				Paths.push({ path: $(this).attr("href"), type: "css" });
			});
		},
		startEditFile: function startEditFile(p_FileName, p_TabFactory, p_CallBack)
		{
			var Result = IsCompatibleFile(p_FileName);
			if (Result)
			{
				var This = this;
				p_TabFactory.createTab(/[^\/:]+$/.exec(p_FileName)[0], p_FileName, "/editors/general.html .editor", This.getIcon, function(p_TabInfo)
				{
					p_TabInfo.$Tab.toggleClass("active", true);
					p_TabInfo.$Tab[0].$m_TabContent.toggleClass("visible", true);
					
					This.editor = p_Editor.createEditor(p_FileName, p_TabInfo, new (require("ace/mode/" + "css").Mode)(), this);
					attachStyle();
					p_CallBack(This.editor);
				});
			}
			return Result;
		},
	};
}));
