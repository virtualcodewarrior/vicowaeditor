<?php
    # Protect against web entry
    if (!defined('VICOWA')) 
    {
        exit;
    }
    
	require_once('writefile.php');
	
	unset($DP);
	
	// set the edit root, you cannot access files below this location
	function setDomainPath($p_Origin)
	{
		global $DP;
		$DP = $p_Origin; 
	}
	
	function getDomainPath($File)
	{
		global $DP;
		return str_replace("//", "/", "$DP/$File");
	}
	
	setDomainPath("/home/rodney/Development/vicowaeditortestroot/");

    $IsPostAction = false;
    $IsActionProcessed = false;
    $passedPaths = array();

    if (isset($_POST['action']))
    {
        // post actions can be used also to change things
        $action = trim(strtolower($_POST['action']));
        $data = isset($_POST['text']) ? $_POST['text'] : null;
        $RealPassedPath = isset($_POST['path']) ? $_POST['path'] : null; 
        if (isset($_POST['paths']))
        {
            $temppaths = $_POST['paths'];
            foreach($temppaths as $original)
            {
                $passedPaths[$original] = $original;
            }
        }
        else
        {
            $passedPaths[$RealPassedPath] = $RealPassedPath;
        }
        $IsPostAction = true;
    }
    else if (isset($_GET['action']))
    {
		// get actions can only be used for actions that don't change anything
        $action = trim(strtolower($_GET['action']));
        $data = (isset($_GET['text'])) ? $_GET['text'] : null;
        $RealPassedPath = (isset($_GET['path'])) ? $_GET['path'] : null; 
        $passedPaths[$RealPassedPath] = $RealPassedPath;
    }
    
    $result = array();
    
    function processPassedPath($passedpath, $action)
    {
        global $UserInfo;
        global $DP;
        
        if ($passedpath !== null)
        {
            // strip the protocol and server name from the path
            if (preg_match("/http:\/\//", $passedpath))
            {
                $passedpath = substr($passedpath, strlen("http://"));
            }
            if (preg_match("/^" . $_SERVER["HTTP_HOST"] . "/", $passedpath))
            {
                $passedpath = substr($passedpath, strlen($_SERVER["HTTP_HOST"]));
            }
            if (substr($passedpath, 0, 1) == "/")
            {
                $passedpath = substr($passedpath, 1);
            }
            
            // remove any relative paths using .., this to prevent going below the root
            while (preg_match('/\w+\/\.\.\//', $passedpath))
            {
                $passedpath = preg_replace('/\w+\/\.\.\//', '', $passedpath);
            }

            $passedpath = getDomainPath($passedpath);

            if ($action != "create" && $action != "mkdir" && $action != "upload")
            {
                $passedpath = realpath($passedpath);
            }
        }
    
        return $passedpath;
    }

    function processPassedPaths($passedPaths, $action)
    {
        if ($passedPaths !== null)
        {
            foreach($passedPaths as $original=>$passedpath)
            {
                $passedPaths[$original] = processPassedPath($passedpath, $action);
            }
        }

        return $passedPaths;
    }

    $passedPaths = processPassedPaths($passedPaths, $action);

    if ($IsPostAction)
    {
        $IsActionProcessed = true;
        switch ($action)
        {
            case "save": // save the file
            {
                $TestResults = array();
                $Result = "Success";
                $Append = (isset($_POST['append']) && $_POST['append'] == 'true') ? true : false;
                $FileWriteID = (isset($_POST['writeid'])) ? $_POST['writeid'] : "";

                // create a hash for the file path
                $iptocheck= $_SERVER['REMOTE_ADDR'];
                $UserAgent = $_SERVER["HTTP_USER_AGENT"];
                $TestID = hash("sha512", $iptocheck . $UserAgent . $passedpath);

                foreach ($passedPaths as $original=>$passedpath)
                {
                    $Format = (isset($_POST['format'])) ? trim(strtolower($_POST['format'])) : 'text';
                    
                    switch ($Format)
                    {
                        case "json":
                        {
                            if (isset($_POST['data']))
                            {
                                $DataObject = json_decode($_POST['data']);
                                
                                if (isset($DataObject->type) && isset($DataObject->data))
                                {
                                    switch ($DataObject->type)
                                    {
                                        case "bytearray":
                                        {
                                            $BinaryData = "";
                                            foreach($DataObject->data as $Byte)
                                            {
                                                $BinaryData = $BinaryData.pack("C", $Byte);
                                            }
                                        
                                            $result = writeFile(realpath($passedpath), $BinaryData, false, $Append, false);
                                        }
                                        break;
                                        default:
                                        {
                                            $result = writeFile(realpath($passedpath), $data, false, $Append, true);
                                        }
                                        break;
                                    }
                                }
                                else
                                {
                                    $result = writeFile(realpath($passedpath), $data, false, $Append, true);
                                }
                            }
                            else
                            {
                                $result = writeFile(realpath($passedpath), $data, false, $Append, true);
                            }
                        }
                        break;
                        default:
                        {
                            $result = writeFile(realpath($passedpath), $data, false, $Append, true);
                        }
                        break;
                    }
                    
                    if (!isset($result["save"]))
                    {
                        $Result = "error";
                        $TestResults[$original] = $result;
                    }
                    else
                    {
                        $TestResults[$original] = $result["save"];
                    }
                }
                
                $result = array("save" => array("result" => $Result, "paths" => $TestResults, "writeid" => $TestID));
            }
            break;
            case "upload":
            {
                $TestResults = array();
                $Result = "Success";

                $passedpath = reset($passedPaths);
                $Item = each($passedPaths);
                $original = $Item['key'];
                
                $Format = (isset($_POST['format'])) ? trim(strtolower($_POST['format'])) : 'text';
                $Append = (isset($_POST['append']) && $_POST['append'] == 'true') ? true : false;
                $FileWriteID = (isset($_POST['writeid'])) ? $_POST['writeid'] : "";

                // create a hash for the file path
                $iptocheck= $_SERVER['REMOTE_ADDR'];
                $UserAgent = $_SERVER["HTTP_USER_AGENT"];
                $TestID = hash("sha512", $iptocheck . $UserAgent . $passedpath);

                if (!$Append || $FileWriteID != $TestID)
                {
                    $temppassedpath = $passedpath;
                    $temporiginal = $original;
                    $Index = 1;
                    while (realpath($temppassedpath) && file_exists(realpath($temppassedpath)))
                    {
                        $DotPos = strrpos($original, ".");
                        $SlashPos = strrpos($original, "/");

                        if ($DotPos > $SlashPos)
                        {
                            // we will not allow overwriting existing files so we test here if the target file exists
                            $temporiginal = substr($original, 0, $DotPos) . $Index . substr($original, $DotPos);
                        }
                        else
                        {
                            // we will not allow overwriting existing files so we test here if the target file exists
                            $temporiginal = $original . $Index;
                        }
                        $temppassedpath = processPassedPath($temporiginal, $action);
                        $Index++;
                    }
                    
                    $original = $temporiginal;
                    $passedpath = $temppassedpath;
                    $TestID = hash("sha512", $iptocheck . $UserAgent . $passedpath);
                    $Append = false;
                }

                switch ($Format)
                {
                    case "json":
                    {
                        if (isset($_POST['data']))
                        {
                            $DataObject = json_decode($_POST['data']);
                            
                            if (isset($DataObject->type) && isset($DataObject->data))
                            {
                                switch ($DataObject->type)
                                {
                                    case "bytearray":
                                    {
                                        $BinaryData = "";
                                        foreach($DataObject->data as $Byte)
                                        {
                                            $BinaryData = $BinaryData.pack("C", $Byte);
                                        }
                                    
                                        $result = writeFile($passedpath, $BinaryData, !$Append, $Append, false);
                                    }
                                    break;
                                    case "base64":
                                    {
                                        $BinaryData = base64_decode($DataObject->data);
                                        $result = writeFile($passedpath, $BinaryData, !$Append, $Append, false);
                                    }
                                    break;
                                    default:
                                    {
                                        $result = writeFile($passedpath, $data, !$Append, $Append, false);
                                    }
                                    break;
                                }
                            }
                            else
                            {
                                $result = writeFile($passedpath, $data, !$Append, $Append, false);
                            }
                        }
                        else
                        {
                            $result = writeFile($passedpath, $data, !$Append, $Append, false);
                        }
                    }
                    break;
                    default:
                    {
                        $result = writeFile($passedpath, $data, false, false, false);
                    }
                    break;
                }
                
                if (!isset($result["save"]) && !isset($result["create"]))
                {
                    $Result = "error";
                    $TestResults[$original] = $result;
                }
                else
                {
                    $TestResults[$original] = $result["save"];
                }
                
                $result = array("upload" => array("result" => $Result, "paths" => $TestResults), "realpath" => $original, "writeid" => $TestID);
            }
            break;
            case "fileexists": // test if the given file exists
            {
                $TestResults = array();
                foreach($passedPaths as $original=>$passedpath)
                {
                    if ($passedpath && realpath($passedpath) && file_exists(realpath($passedpath)))
                    {
                        $TestResults[$original] = true;
                    }
                    else
                    {
                        $TestResults[$original] = false;
                    }
                }
                
                $result = array("fileexists" => array("paths" => $TestResults));
            }
            break;
            case "create": // create a new file
            {
                $TestResults = array();
                $Result = "Success";
            
                foreach($passedPaths as $original=>$passedpath)
                {
                    $result = writeFile($passedpath, $data, true, false, false);
                    if (!isset($result["create"]))
                    {
                        $Result = "error";
                        $TestResults[$original] = $result;
                    }
                    else
                    {
                        $TestResults[$original] = $result["create"];
                    }
                }

                $result = array("create" => array("result" => $Result, "paths" => $TestResults));
            }
            break;
            case "mkdir":
            {
                $TestResults = array();
                $Result = "Success";
                foreach($passedPaths as $original=>$passedpath)
                {
                    if (is_dir($passedpath) || mkdir($passedpath))
                    {
                        $TestResults[$original] = "Success";
                    }
                    else
                    {
                        $Result = "error";
                        if (realpath($passedpath) && file_exists($passedpath))
                        {
                            $TestResults[$original] = array("error" => "a file with the specified name already exists", "path" => realpath($passedpath));
                        }
                        else
                        {
                            $TestResults[$original] = array("error" => "mkdir failed");
                        }
                    }
                }

                $result = array("mkdir" => array("result" => $Result, "paths" => $TestResults));
            }
            break;
            case "delete": // delete a file
            {
                $TestResults = array();
                $Result = "Success";

                foreach($passedPaths as $original=>$passedpath)
                {
                    if (is_dir(realpath($passedpath)))
                    {
                        if (!rrmdir(realpath($passedpath)))
                        {
                            $Result = "error";
                        
                            $TestResults[$original] = array("error" => "directory delete failed, make sure that the directory is empty");
                        }
                        else
                        {
                            $TestResults[$original] = "Success";
                        }
                    }
                    else if (!realpath($passedpath) || unlink($passedpath) === FALSE)
                    {
                        $Result = "error";
                        
                        $TestResults[$original] = array("error" => "delete failed");
                    }
                    else
                    {
                        $TestResults[$original] = "Success";
                    }
                }

                $result = array("delete" => array("result" => $Result, "paths" => $TestResults));
            }
            break;
            case "rename":
            {
                $TestResults = array();
                $Result = "error";
                if (isset($_POST['newname']))
                {
                    $NewName = $_POST['newname'];
                    if ($NewName != "")
                    {
                        foreach($passedPaths as $original=>$passedpath)
                        {
                            if (realpath($passedpath) && file_exists(realpath($passedpath)))
                            {
                                $Pos = strrpos($passedpath, '/');
                                $Path = substr($passedpath, 0, $Pos + 1);
                                $Pos = strrpos($NewName, '/');
                                if ($Pos)
                                {
                                   $NewName = substr($NewName, $Pos + 1); 
                                }
                                
                                if (rename($passedpath, $Path . $NewName) && !file_exists(realpath($passedpath)) && file_exists(realpath($Path . $NewName)))
                                {
                                    $Pos = strrpos($original, '/');
                                    $Path = substr($original, 0, $Pos + 1);
                                    $TestResults[$original] = $Path . $NewName;
                                    $Result = "Success";
                                }
                                else
                                {
                                    $TestResults[$original] = null;
                                }
                            }
                            else
                            {
                                $TestResults[$original] = null;
                            }
                        }
                    }
                }
                $result = array("rename" => array("result" => $Result, "paths" => $TestResults));
            }
            break;
            default:
            {
                $IsActionProcessed = false;
            }
            break;
        }
    }
    if (!$IsActionProcessed)
    {
        switch ($action)
        {
            case "load":
            {
                $TestResults = array();
                $Result = "Success";

                foreach ($passedPaths as $original=>$passedpath)
                {
                    $Format = (isset($_REQUEST['format'])) ? trim(strtolower($_REQUEST['format'])) : 'text';
                    $readResult = file_get_contents(realpath($passedpath));
                    
                    switch ($Format)
                    {
                        case "json":
                        {
                            $readResult = json_decode($readResult);
                        }
                        break;
                        default: 
                        {
                            $readResult = $readResult;
                        }
                        break;
                    }
                
                    $TestResults[$original] = $readResult;
                }
                
                $result = array("load" => array("result" => $Result, "paths" => $TestResults));
            }
            break;
            case "browse": // list the content of this folder
            {
                $Result = null;

                // strip any possible file name from the end of the folder
                if ($passedPaths[$RealPassedPath])
                {
                    if (is_dir($passedPaths[$RealPassedPath]))
                    {
                        $Folder = $passedPaths[$RealPassedPath];
                    }
                    else
                    {
                        $PathParts = pathinfo($passedPaths[$RealPassedPath]);
                        $Folder = $PathParts['dirname'];
                    }

                    $Result = scandir($Folder);
                }

                if ($Result)
                {
                    foreach ($Result as $Item)
                    {
                        if ($Item != '.' && $Item != '..')
                        {
                            $element = array();
                            $element["name"] = $Item;
                            $element["isFolder"] = is_dir($Folder . '/' . $Item);
                            $element["path"] = $RealPassedPath . $Item; 
                            if ($element["isFolder"] && substr($element["isFolder"], -1) != '/')
                            {
                                $element["path"] .= '/';
                            }
                            
                            $GitPath = $passedPaths[$RealPassedPath];
                            if (substr($GitPath, -1) != '/')
                            {
                                $GitPath .= '/';
                            }
                            $GitPath .= $Item;
                            if (strrpos($passedPaths[$RealPassedPath], getDomainPath("")) === 0)
                            {
                                $GitPath = substr($GitPath, strlen(getDomainPath("")));
                            }
                            
                            $element["gitpath"] = $GitPath; 
                            $element["isError"] = false;
                            $result[$Item] = $element;
                        }
                    }
                }
                else
                {
                    $element = array();
                    $element["name"] = "Path not found: " . $RealPassedPath;
                    $element["isFolder"] = false;
                    $element["isError"] = true;
                    $result[$passedPaths[$RealPassedPath]] = $element;
                }
            }
            break;
            case "modifytime": // get the time of the last modification of the file
            {
                $TestResults = array();
                $Result = "Success";

                foreach ($passedPaths as $original=>$passedpath)
                {
                    $Result = filemtime(realpath($passedpath));
                    
                    if ($Result)
                    {
                        $TestResults[$original] = date("d-m-Y H:i:s", $Result);
                    }
                    else
                    {
                        $TestResults[$original] = 0;
                    }
                }
                
                $result = array("modifytime" => array("paths" => $TestResults));
            }
            break;
            default:
            {
                // unknown command
                $result = array("error" => ("Unknown action: " . $action));
            }
            break;
        }
    }

    function rrmdir($dir) 
    {
        $Result = true;
        if (is_dir($dir)) 
        {
            $objects = scandir($dir);
            foreach ($objects as $object) 
            {
                if ($object != "." && $object != "..") 
                {
                    if (filetype($dir . "/" . $object) == "dir") 
                    {
                        if (!rrmdir($dir . "/" . $object))
                        {
                            $Result = false;
                        }
                    }   
                    else
                    {   
                        if (!unlink($dir . "/" . $object))
                        {
                            $Result = false;
                        }
                    }    
                }
            }
            reset($objects);
            if (!rmdir($dir))
            {
                $Result = false;
            }
        }
        
        return $Result;
    }

    echo json_encode($result);
                