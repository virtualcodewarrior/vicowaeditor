(function(p_Factory)
{
	if (typeof define === 'function' && define.amd)
	{
		define(["jquery"], p_Factory);
	}
	else
	{
		window.vicowaeditor.utility = p_Factory(jQuery);
	}
}(function($)
{
	"use strict";

	return {
		getExtension: function getExtension(p_FileName)
		{
			var Parts = p_FileName.split('.');
			return (Parts.length > 1) ? Parts.pop() : "";
		}
	}
}));
