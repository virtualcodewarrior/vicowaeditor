(function(p_Factory)
{
    if (typeof define === 'function' && define.amd)
    {
        define([
				'jquery', 
				'mimetypeimages', 
			    'vicowafilesystemaccess',
				'jquery.jstree',
			   ], p_Factory);
    }
    else 
    {
        p_Factory(jQuery, window.mimetypeimages, window.vicowafilesystemaccess);
    }
}(function($, MimeTypeImageRetriever, p_FileSystemAccess)
{
    $.fn.servertree = function(Options, p_EventHandlers) 
    {
        var This = this;
        MimeTypeImageRetriever.getImagePaths(function(p_ImagePaths)
        {
            var Types = 
            {
                "default" : { icon: pathmapping.getPath("mimetypeimages") + "images/unknown.svg" },
                "root" : { icon: "root" },
                "folder" : { icon: "folder" }
            };
    
            $.each(p_ImagePaths, function(p_Mimetype, p_Element)
            {
                Types[p_Mimetype] = 
                {
                    icon : pathmapping.getPath("mimetypeimages") + "images/" + p_Element.svg
                };
            });

            p_EventHandlers = $.extend(true, 
            {
            }, p_EventHandlers);
            Options = $.extend(true, 
            { 
                plugins: [ 
                    "themes", 
//                    "json_data", 
                    "ui", 
                    "cookies", 
                    "sort", 
                    "types", 
                ],
                core : 
                {
                    animation: 300,
                    themes :
                    {
                        theme: "default",
                        url : pathmapping.getPath("jquery.jstree") + "dist/themes/default/style.css"
                    },
					data: function(p_NodeInfo, p_DoneCallback)
					{
						if (!p_NodeInfo.data || !p_NodeInfo.data.path)
						{
							p_DoneCallback(
							[
								{
									text : "DomainRoot",
									data : { path : "/" },
									state: "closed",
									folder : true,
									root: true,
									children: true,
									type: "root"
								},
							]);
						}
						else
						{
							p_FileSystemAccess.browse((p_NodeInfo.data && p_NodeInfo.data.path) ? p_NodeInfo.data.path : 0, function(p_Data)
							{
								var ResultObject = [];

								if (p_Data)
								{
									$.each(p_Data, function(p_Index, p_Element)
									{
										var LastIndex = p_Element.path.lastIndexOf("."),
										Ext = (LastIndex !== -1) ? p_Element.path.substr(LastIndex + 1).toLowerCase() : null,
										PathItem = 
										{
											text : p_Index, 
											data : { path : p_Element.path, gitpath : p_Element.gitpath },
											folder : p_Element.isFolder,
											children: p_Element.isFolder,
											type : ((Ext) ? Ext : ((p_Element.isFolder) ? "folder" : "unknown"))
										};
										
										if (p_Element.isFolder)
										{
											PathItem.state = "closed";
										}
										
										ResultObject.push(PathItem);
									});
								}
								else
								{
									ResultObject.push(
									{
										text: "an error occured while retrieving the data"
									});
								}
								p_DoneCallback(ResultObject)
							});
						}
					}
                },
                types : Types,
            }, 
            Options);
            
            if (Options.plugins.themeroller)
            {
                delete Options.plugins.themes;
                delete Options.core.themes;
            }
    
            var serverTree = This.jstree(Options);
            if (p_EventHandlers.onselect)
            {
                serverTree.bind("select_node.jstree", function(p_Event, p_Data)
                {
                    p_EventHandlers.onselect($(p_Event.target).jstree(true), p_Event, p_Data.node, p_Data.node.data);
                });
            }
            if (p_EventHandlers.ondeselect)
            {
                serverTree.bind("deselect_node.jstree", function(p_Event, p_Data)
                {
                    p_EventHandlers.ondeselect($(p_Event.target).jstree(true), p_Event, p_Data.node, p_Data.node.data);
                });
			}
        });
        return this;
    };
}));
