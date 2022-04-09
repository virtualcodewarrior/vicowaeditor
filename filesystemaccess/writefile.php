<?php
	# Protect against web entry
	if (!defined('VICOWA')) 
	{
		exit;
	}

	/// Retrieve the extension from the given path
	/// @param $p_FilePath : The path from which we are retrieving the extension
	/// @return the extension for the given path
	function GetExtension($p_FilePath)
	{
		$Items = explode('.', $p_FilePath);
		$ext = array_pop($Items);
		return strtolower($ext);
	}
	
	// write the given file to disk
	// @param $p_FilePath : Path to where the file should be written
	// @param $p_Data : Data to be written into the file
	// @param $p_bCreate : boolean to indicate if we are creating a new file
	// @param $p_bAppend : Boolen to indicate if we are appending to an existing file or are overwriting the file
	function writeFile($p_FilePath, $p_Data, $p_bCreate, $p_bAppend, $p_AllowMinify)
	{
		$result = array();

		// if the file does not yet exists we should have had the create flag set to true
		if (!file_exists($p_FilePath) && !$p_bCreate)
		{
			$result = array("error" => "File does not exist: " . $p_FilePath);
		}
		else
		{
			// find the last slash so we can get the file name	
            $Pos = strrpos($p_FilePath, "/");
            $Folder = null;

			// if we found a slah we can determin the path
            if ($Pos !== false)
            {
                $Folder = substr($p_FilePath, 0, $Pos);
            }

			// if the folder doesn't exist yet we can create one here
            if ($Folder && !is_dir($Folder))
            {
                mkdir($Folder, 0777, true);
            }

			// lock for exlusive write
			$Flags = LOCK_EX;
			// if we are appending add the append flag
			if ($p_bAppend)
			{
				$Flags |= FILE_APPEND;
			}
			// write the actual content
			$BytesWritten = file_put_contents($p_FilePath, $p_Data, $Flags);
			// if this is FALSE then the write failed
			if ($BytesWritten === FALSE)
			{
				$result = array("error" => "Write failed");
			}
			else
			{
				$Res = null;
			
				// create the return values for successfull writes
				if ($p_bCreate)
				{
					$Res = array("result" => "Success", "path" => $p_FilePath);
				}
				else
				{
					$Res = array("result" => "Success", "byteswritten" => $BytesWritten);
				}
				
				// if the file being written is a javascript file and is not in itself a minified file,
				// also save a minified version
				if (GetExtension($p_FilePath) == "js" && !preg_match('/\.min\.js$/i', $p_FilePath) && $p_AllowMinify)
				{
                    $BytesWritten = 0;
					require_once('jsminplus.php');
				
					// create the name for the minified version
					$JsMinPath = substr($p_FilePath, 0, -2) . "min.js";
					
					// read the currently stored data from disk (this is because the data passed in for save might be only partial 
					// for instance when doing an append)
					$Content = file_get_contents($p_FilePath);

					// prevent any output from the minifier
					ob_start();

					$Content = JSMinPlus::minify($Content);
					
					$MinifyResults = ob_get_contents();
					ob_end_clean();
					
					if ($Content)
					{
						$BytesWritten = file_put_contents($JsMinPath, $Content);
					}
					else if (file_exists($JsMinPath))
					{
						unlink($JsMinPath);
					}
					$Res["minifier"] = array("byteswritten" => $BytesWritten, "result" => $MinifyResults, "Path" => $JsMinPath);
				}

				if ($p_bCreate)
				{
					$result = array("create" => $Res);
				}
				else
				{
					$result = array("save" => $Res);
				}
			}
		}
		
		return $result;
	}
