// mimetypeimages.js - This file is part of the ViCoWa editor
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

define([
		"vicowafilesystemaccess" 
	   ], function(ViCowaFileSystemAccess)
{
	"use strict";

	var ImagePaths = null,
    fileSystemAccess = "",
    imageExtension = "svg",
    imagePath = "images/";
    
    function RetrieveImageFileInformation(p_Callback)
    {
        if (!ImagePaths)
        {
			ViCowaFileSystemAccess.browse(imagePath, function(files)
			{
				ImagePaths = {};
				files.forEach(function(p_File)
				{
					if (!p_File.isError && !p_File.isFolder)
					{
						var Ext = "",
						mimetype = "";
						
						var Matches = p_File.name.match(/^(.*)\.(.*)$/);
						if (Matches && Matches.length > 2)
						{
							Ext = Matches[2];
							MimeType = Matches[1];
							
							ImagePaths[MimeType.toLowerCase()] = {};
							ImagePaths[MimeType.toLowerCase()][Ext.toLowerCase()] = p_File.name;
						}
					}
				});
				if (p_Callback)
				{
					p_Callback();
				}
			});
        }
        else
        {
            if (p_Callback)
            {
                p_Callback();
            }
        }
    }
    
    return {
        getImagePaths : function(p_Callback)
        {
            RetrieveImageFileInformation(function()
            {
                p_Callback(ImagePaths);
            });
        },
        getMimeTypeImagePath : function(p_MimeType, p_Callback)
        {
            RetrieveImageFileInformation(function()
            {
                var Result = imagePath + "unknown.svg";
    
                try
                {
                    var PathInfo = ImagePaths[p_MimeType.toLowerCase()];
            
                    if (PathInfo)
                    {
                        if (PathInfo[imageExtension])
                        {
                            Result = imagePath + PathInfo[imageExtension];
                        }
                        else
                        {
                            Result = imagePath + PathInfo["svg"];
                        }
                    }
                }
                catch(a)
                {
                    console.log(a);
                }
                
                if (p_Callback)
                {
                    p_Callback(Result);
                }
            });
        },
        setImageExtenion : function(p_Imageextension){ ImageExtension = p_Imageextension; },
        setImagesPath : function(p_ImagesPath){ imagePath = p_ImagesPath; ImagePaths = null; },
        setFileSystemAccess : function(p_FileSystemAccess){ fileSystemAccess = p_FileSystemAccess; ImagePaths = null; }
    };
});