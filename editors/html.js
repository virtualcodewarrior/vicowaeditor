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
		window.vicowaeditor.html = p_Factory(jQuery, 
											window.vicowaeditor.editor, 
											window.vicowaeditor.utility, 
											window.mimetypeimages);
	}
}(function($, p_Editor, Utility, MimeTypeImages)
{
	"use strict";
	
	function IsCompatibleFile(p_FileName){ return ["html", "htm"].indexOf(Utility.getExtension(p_FileName)) != -1; }
		
	function attachHTML()
	{
		m_TargetContentContainer = [];
		updateContentForNewEditor();
	}

	return {
		editor: null,
		attachTargetContainers: function attachTargetContainers(p_Document){ this.editor.attachLinkDivs(p_Document); }, 
		onEditorChange: function onEditorChange(){ this.editor.updateContent(); },
		updateLinks: function updateLinks(p_Data){ return this.editor.replaceTemplateLinksWithDiv(p_Data); },
		getDescription: function getDescription(p_FileName){ return (IsCompatibleFile(p_FileName)) ? "Hypertext Markup Language (HTML) file" : null; },
		getIcon: function getIcon(p_FileName, p_Callback)
		{
			var Compatible = IsCompatibleFile(p_FileName);
			if (Compatible)
			{
				MimeTypeImages.getMimeTypeImagePath("html", p_Callback);
			}
			return (Compatible) ? true : false;
		},
		startEditFile: function startEditFile(p_FileName, p_TabFactory, p_CallBack)
		{
			var Result = IsCompatibleFile(p_FileName);
			if (Result)
			{
				var This = this;
				p_TabFactory.createTab(/[^\/:]+$/.exec(p_FileName)[0], p_FileName, "/editors/html.html .editor", This.getIcon, function(p_TabInfo)
				{
					p_TabInfo.$Tab.toggleClass("active", true);
					p_TabInfo.$Tab[0].$m_TabContent.toggleClass("visible", true);
					
					This.editor = p_Editor.createEditor(p_FileName, p_TabInfo, new (require("ace/mode/" + "html").Mode)(), this);
					p_CallBack(This.editor);
				});
			}
			return Result;
		},
	};
}));