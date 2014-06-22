<?php

	# Protect against web entry
	if (!defined('VICOWA')) 
	{
		exit;
	}
	
	/// Get a file from the site, the given path is assumed to be relative to the site root path in the branch (e.g develop/sites/sitename/)
	function getFile($p_FilePath, $p_RequestedPath, $p_MimeType, $p_Content)
	{
		// prepend the correct path here
		$RealPath = getDomainPath($p_FilePath);
		$RealRequestedPath = ($p_RequestedPath != null) ? getDomainPath($p_RequestedPath) : null;
		
		getFileDirect($RealPath, $RealRequestedPath, $p_MimeType, $p_Content);
	};

	/// Retrieve the extension from the given path
	/// @param $p_FilePath : The path from which we are retrieving the extension
	/// @return the extension for the given path
	function GetExtension($p_FilePath)
	{
		$Items = explode('.', $p_FilePath);
		$ext = array_pop($Items);
		return strtolower($ext);
	}
	
	/// Get the proper mime type using the extension of the file referenced by the given path
	/// @param $p_FilePath : The path from which we are using the extension to retrieve the mime type
	/// @return the mime type for the given path or text/plain if we don't have a match
	function GetMimeTypeFromExtension($p_FilePath)
	{
		$MimeType = null;
		
		$mime_types = array(
			'txt' => 'text/plain',
            'htm' => 'text/html',
            'html' => 'text/html',
            'php' => 'text/html',
            'css' => 'text/css',
            'js' => 'application/javascript',
            'json' => 'application/json',
            'xml' => 'application/xml',
            'swf' => 'application/x-shockwave-flash',
            'flv' => 'video/x-flv',

            // images
            'png' => 'image/png',
            'jpe' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'jpg' => 'image/jpeg',
            'gif' => 'image/gif',
            'bmp' => 'image/bmp',
            'ico' => 'image/vnd.microsoft.icon',
            'tiff' => 'image/tiff',
            'tif' => 'image/tiff',
            'svg' => 'image/svg+xml',
            'svgz' => 'image/svg+xml',

            // archives
            'zip' => 'application/zip',
            'gz' => 'application/x-gzip',
            'bz2' => 'application/x-bzip2',
            'rar' => 'application/x-rar-compressed',
            'exe' => 'application/x-msdownload',
            'msi' => 'application/x-msdownload',
            'cab' => 'application/vnd.ms-cab-compressed',
            'rpm' => 'application/x-rpm',

            // audio/video
            'mp3' => 'audio/mpeg',
            'qt' => 'video/quicktime',
            'mov' => 'video/quicktime',

            // adobe
            'pdf' => 'application/pdf',
        );		
		
		$ext = GetExtension($p_FilePath);
        if (array_key_exists($ext, $mime_types)) 
		{
            $MimeType = $mime_types[$ext];
        }		
		return $MimeType;
	}
	
    function filterContent($Content, $p_Content)
    {
    	global $UserInfo;

        $IsAdmin = IsGroup("admin");

    	// have to filter all text except when restricted markers exist or when requested for edit from
		// vicowa editor
		if ($Content != null && ($p_Content == null || strcasecmp($p_Content, "raw") != 0 || !$IsAdmin))
		{
			$PreContent = $Content;
			if (isset($UserInfo["groups"]) && isset($UserInfo["name"])) 
			{
				if (!$IsAdmin)
				{
					$ActiveGroups = $UserInfo["groups"];
					
					while (preg_match('/<vicowa_restricted([^>]*)>(?:(?:(?!<vicowa_restricted)[^\0])*?)<\/vicowa_restricted>/i', $Content, $Matches))
					{
						$ContentAllowed = false;
						// we found the current user name, so we can remove the restriction markers
						if (preg_match('/users=(?:"|"[^"]*,)' . $UserInfo["name"] . '(?:"|,[^"]*")/i', $Matches[1]))
						{
							$ContentAllowed = true;
						}
						else // we didn't find the user, test for the group
						{
							foreach($ActiveGroups as $ActiveGroup)
							{
								if (preg_match('/groups=(?:"|"[^"]*,)' . $ActiveGroup . '(?:"|,[^"]*")/i', $Matches[1]))
								{
									$ContentAllowed = true;
									break;
								}
							}
						}
						
						if ($ContentAllowed)
						{
							// remove the restriction markers by replacing the restricted area with the content only
							$Content = preg_replace('/<vicowa_restricted[^>]*>((?:(?!<vicowa_restricted)[^\0])*?)<\/vicowa_restricted>/i', "$1", $Content, 1);
						}
						else
						{
							// remove the restricted area by replacing it with nothing
							$Content = preg_replace('/<vicowa_restricted[^>]*>(?:(?:(?!<vicowa_restricted)[^\0])*?)<\/vicowa_restricted>/i', "", $Content, 1);
						}
					}
				}
				else
				{
					// admin has all rights so just remove restricted markers
					$Content = preg_replace('/<\/?vicowa_restricted[^>]*>/i', "", $Content);
				}
			}
			else
			{
				// remove any restricted content if no user is logged in
				while (preg_match('/<vicowa_restricted[^>]*>(?:(?:(?!<vicowa_restricted)[^\0])*?)<\/vicowa_restricted>/i', $Content))
				{
					$Content = preg_replace('/<vicowa_restricted[^>]*>(?:(?:(?!<vicowa_restricted)[^\0])*?)<\/vicowa_restricted>/i', "", $Content);
				}
			}

			// test if the whole page is restricted and if so return a page not found error
			if (strlen(trim($Content)) == 0 && strlen(trim($PreContent)) != 0)
			{
				header('HTTP/1.0 404 Not Found');
				$Content = null;
			}
		}
        
        return $Content;
    }
    
	/// The function that actually retrieves the file data
	function getFileDirect($p_FilePath, $p_RequestedPath, $p_MimeType, $p_Content)
	{
		global $UserInfo;
		global $vgTemplatePath;
		global $IsDevelop;
        global $IsBot;
        $NotFound = false;
        
        $MimeType = null;

		// do file exist here
		if (!file_exists($p_FilePath) || ($p_RequestedPath != null && !file_exists($p_RequestedPath)))
		{
            if (!$IsBot)
            {
    			if (!file_exists($p_FilePath))
	    		{
                    $NotFound = true;
			    	if (preg_match("/application\/json/i", $p_MimeType))
				    {
    					$p_FilePath = getDomainPath("404.html");
	    			}
		    		else
			    	{
				    	$p_FilePath = getDomainPath($vgTemplatePath);
    				}
	    		}
		
		    	if (!file_exists($p_FilePath))
			    {
				    // retrieve 404 file instead
    				$Content = "404: The file you requested could not be found";
	    			$p_FilePath = null;
		    	}
            }
            else
            {
                header('HTTP/1.0 404 Not Found');
            }
		}
		if ($p_FilePath && file_exists($p_FilePath))
		{
			$MimeType = GetMimeTypeFromExtension($p_FilePath);
			$RequestedMimeType = ($p_RequestedPath != null) ? GetMimeTypeFromExtension($p_RequestedPath) : null;
			$ext = GetExtension($p_FilePath);
			$RequestedExt = ($p_RequestedPath != null) ? GetExtension($p_RequestedPath) : null;

			if ($ext == "php" && $p_RequestedPath == null && ($p_MimeType == null || !preg_match("/application\/json/i", $p_MimeType)))
			{
				ob_start();
				$ch = curl_init();

				curl_setopt($ch, CURLOPT_URL, $_SERVER["HTTP_HOST"] . "/index.php?phpexecute=" . $p_FilePath);
				curl_setopt($ch, CURLOPT_HEADER, 0);
				curl_setopt($ch, CURLOPT_POST, 1);
                curl_setopt($ch, CURLOPT_POSTFIELDS, array('json'=> json_encode(array('POST' => $_POST, 'GET' => $_GET, 'COOKIE' => $_COOKIE, 'SERVER' => $_SERVER))));
				curl_exec($ch);
				curl_close($ch);
				$Content = ob_get_contents();
				ob_end_clean();
			}
			else if ($ext == "js" && !$IsDevelop && !preg_match("/application\/json/i", $p_MimeType))
			{
				// try to get minified version first
				$JsMinPath = substr($p_FilePath, 0, -2) . "min.js";
				if ($JsMinPath && file_exists($JsMinPath))
				{
					$Content = file_get_contents($JsMinPath);
				}
				else
				{
					// Read the file
					$Content = file_get_contents($p_FilePath);
				}
			}
			else
			{
				// Read the file
				$Content = file_get_contents($p_FilePath);
			}
		}	

        $PreviousContent = $Content;
        $Content = filterContent($Content, $p_Content);
        $ContentChanged = strcmp($PreviousContent, $Content) !== 0;

        $UseMimeType = ($MimeType == null) ? $p_MimeType : $MimeType;

        // if the mime type matches the requested mime type or when no mime type is given, return the value 
		// as raw format
		if (($MimeType == null && $UseMimeType != null || !$p_MimeType) && !preg_match("/application\/json/i", $p_MimeType))
		{
            // for images we will be doing cache handling
            if (!$IsDevelop && preg_match("/image\//i", $UseMimeType))
            {
				header("Cache-Control: public, max-age=10800, pre-check=10800, must-revalidate");
				header("Pragma: public");
				header("Expires: " . date(DATE_RFC822,strtotime("+2 day")));			

                // Checking if the client is validating his cache and if it is current.
                if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) && (strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']) == filemtime($p_FilePath))) 
                {
                    // Client's cache IS current, so we just respond '304 Not Modified'.
                    header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($p_FilePath)).' GMT', true, 304);
                } 
                else
                {
                    // Image not cached or cache outdated, we respond '200 OK' and output the image.
                    header('Last-Modified: '.gmdate('D, d M Y H:i:s', filemtime($p_FilePath)).' GMT', true, 200);
                    header('Content-Length: '.filesize($p_FilePath));
                	header('Content-type: ' . $UseMimeType . '; charset=utf-8');
            		echo $Content;
                }                
            }
            else if (!$ContentChanged)
            {
    			header("Cache-Control: public, max-age=600, pre-check=600, must-revalidate");
				header("Pragma: public");
				header("Expires: " . date(DATE_RFC822,strtotime("+10 minutes")));			

                // Checking if the client is validating his cache and if it is current.
                if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) && (strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']) == filemtime($p_FilePath))) 
                {
                    // Client's cache IS current, so we just respond '304 Not Modified'.
                    header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($p_FilePath)).' GMT', true, 304);
                } 
                else
                {
                    // file not cached or cache outdated, we respond '200 OK' and output the file.
                    header('Last-Modified: '.gmdate('D, d M Y H:i:s', filemtime($p_FilePath)).' GMT', true, 200);
                    header('Content-Length: '.filesize($p_FilePath));
            		header('Content-type: ' . $UseMimeType . '; charset=utf-8');
            		echo $Content;
                }                
            }
            else
            {
                header('Content-Length: '.filesize($p_FilePath));
            	header('Content-type: ' . $UseMimeType . '; charset=utf-8');
        		echo $Content;
            }
		}
		else // every other case will return as json
		{
            
            $MustSendContent = false;
            if (!$ContentChanged)
            {
            	header("Cache-Control: public, max-age=600, pre-check=600, must-revalidate");
				header("Pragma: public");
				header("Expires: " . date(DATE_RFC822,strtotime("+10 minutes")));			

                // Checking if the client is validating his cache and if it is current.
                if (isset($_SERVER['HTTP_IF_MODIFIED_SINCE']) && (strtotime($_SERVER['HTTP_IF_MODIFIED_SINCE']) == filemtime($p_FilePath))) 
                {
                    // Client's cache IS current, so we just respond '304 Not Modified'.
                    header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($p_FilePath)).' GMT', true, 304);
                } 
                else
                {
                    // file not cached or cache outdated, we respond '200 OK' and output the file.
                    header('Last-Modified: '.gmdate('D, d M Y H:i:s', filemtime($p_FilePath)).' GMT', true, 200);
                    header('Content-Length: '.filesize($p_FilePath));
            		header('Content-type: application/json; charset=utf-8');
            		$MustSendContent = true;
                }                
            }
            else
            {
                
        		header('Content-type: application/json; charset=utf-8');
            	$MustSendContent = true;
            }            

            if ($MustSendContent)
            {
    			$Data = array('content' => $Content, 'type' => $MimeType);
    			$Result = json_encode($Data);
    			$Error = json_last_error();
    			if ($Error !== JSON_ERROR_NONE)
    			{
    				switch ($Error) 
    				{
    					case JSON_ERROR_DEPTH:			$Error = ' - Maximum stack depth exceeded';		break;
    					case JSON_ERROR_STATE_MISMATCH:	$Error = ' - Underflow or the modes mismatch';	break;
    					case JSON_ERROR_CTRL_CHAR:		$Error = ' - Unexpected control character found';	break;
    					case JSON_ERROR_SYNTAX:			$Error = ' - Syntax error, malformed JSON';		break;
    					case JSON_ERROR_UTF8:			$Error = ' - Malformed UTF-8 characters, possibly incorrectly encoded';	break;
    					default:						$Error = ' - Unknown error';	break;
    				}			
    				$Data = array('content' => null, 'type' => $MimeType, 'error' => $Error);
    				
    				$Result = json_encode($Data);
    			}
    			
                header('Content-Length: '.strlen($Result));
        		header('Content-type: application/json; charset=utf-8');
    			echo $Result;
            }
		}
	};
