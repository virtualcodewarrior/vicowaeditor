(function(factory)
{
    if (typeof define === 'function' && define.amd)
    {
        define(['jquery', 'mimetypeimages/mimetypeimages', 'jquery.jstree'], factory);
    }
    else 
    {
        factory(jQuery, null);
    }
}(function($, MimeTypeImageRetriever)
{
    $.fn.servertree = function(Options, p_EventHandlers) 
    {
        var This = this;
        MimeTypeImageRetriever.getImagePaths(function(p_ImagePaths)
        {
            var Types = 
            {
                "default" : { icon: { image : "images/mime-type-icons/unknown.svg", size : { x: 16,y: 16 } } },
                "root" : { icon: { image : "images/mime-type-icons/root.svg" }, size : { x: 16,y: 16 }  },
                "shared" : { icon: { image : "images/mime-type-icons/shared.svg" }, size : { x: 16,y: 16 }  },
                "userdata" : { icon: { image : "images/mime-type-icons/userdata.svg" }, size : { x: 16,y: 16 }  },
                "folder" : { icon: { image : "images/mime-type-icons/folder.svg" }, size : { x: 16,y: 16 }  }
            };
    
            $.each(p_ImagePaths, function(p_Mimetype, p_Element)
            {
                Types[p_Mimetype] = 
                {
                    icon : { image : "mimetypeimages/images/" + p_Element.svg, size : { x: 16,y: 16 }  }
                };
            });

            p_EventHandlers = $.extend(true, 
            {
            }, p_EventHandlers);
            Options = $.extend(true, 
            { 
                plugins: [ 
                    "themes", 
                    "json_data", 
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
                        url : "/raw/shared/core/library/jquery/plugins/jquery.jstree/themes/default/style.css"
                    },
                },
                types :
                {
                    types : Types,
                    type_attr : "mimetype"
                },
                json_data : 
                {
                    ajax :          
                    {
                        url : "/filesystemaccess",
                        progressive_render : true,
                        data : function(p_NodeInfo)
                        {
                            return {
                                path : (p_NodeInfo.data) ? p_NodeInfo.data("path") : 0,
                                format : "json",
                                action: "browse"
                            };
                        },
                        success : function(p_Result)
                        {
                            var ResultObject = null;
                            if (!p_Result.length || !p_Result[0].isError)
                            {
                                ResultObject = [];
                                $.each(p_Result, function(p_Index, p_Element)
                                {
                                    var LastIndex = p_Element.path.lastIndexOf(".");
                                    var Ext = (LastIndex !== -1) ? p_Element.path.substr(LastIndex + 1).toLowerCase() : null;
                                    
                                    var PathItem = 
                                    {
                                        data : p_Index, 
                                        metadata : { path : p_Element.path, gitpath : p_Element.gitpath },
                                        folder : p_Element.isFolder,
                                        attr : { mimetype : ((Ext) ? Ext : ((p_Element.isFolder) ? "folder" : "unknown")) }
                                    };
                                    
                                    if (p_Element.isFolder)
                                    {
                                        PathItem.state = "closed";
                                    }
                                    
                                    ResultObject.push(PathItem);
                                });
                            }
                            return ResultObject;
                        }
                    },
                    data : [
                        {
                            data : "DomainRoot",
                            metadata : { path : "/" },
                            state: "closed",
                            folder : true,
                            root: true,
                            attr: { mimetype: "root" }
                        },
                        {
                            data : "Shared",
                            metadata : { path : "/shared/" },
                            state: "closed",
                            folder : true,
                            root: true,
                            attr : { mimetype: "shared" }
                        },
                        {
                            data : "User Data",
                            metadata : { path : "/userdata/" },
                            state: "closed",
                            folder : true,
                            root: true,
                            attr : { mimetype: "userdata" }
                        }
                    ]    
                }
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
                    p_EventHandlers.onselect(p_Data.rslt.obj, p_Data.rslt.obj.data());
                });
            }
        });
        return this;
    };
}));
