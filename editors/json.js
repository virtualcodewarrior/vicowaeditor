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
		window.vicowaeditor.json = p_Factory(jQuery, 
											window.vicowaeditor.editor, 
											window.vicowaeditor.utility, 
											window.mimetypeimages);
	}
}(function($, p_Editor, Utility, MimeTypeImages)
{
	"use strict";
	
	function IsCompatibleFile(p_FileName){ return ["json"].indexOf(Utility.getExtension(p_FileName)) != -1; }

	/// Attach a json document to an ACE editor instance
	function attachJSON()
	{
		m_TargetContentContainer = [];
	}

	return {
		editor: null,
 		getDescription: function getDescription(p_FileName){ return (IsCompatibleFile(p_FileName)) ? "JavaScript Object Notation (JSON) file" : null; },
		getIcon: function getIcon(p_FileName)
		{
			var Compatible = IsCompatibleFile(p_FileName, p_Callback);
			if (Compatible)
			{
				MimeTypeImages.getMimeTypeImagePath("json", p_Callback);
			}
			return (Compatible) ? true : false;
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
					
					This.editor = p_Editor.createEditor(p_FileName, p_TabInfo, new (require("ace/mode/" + "json").Mode)(), this);
					attachJSON();
					p_CallBack(This.editor);
				});
			}
			return Result;
		},
	};
}));