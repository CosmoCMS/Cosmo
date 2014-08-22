<?php

require_once 'autoload.php';
require_once 'Cosmo.class.php';
$Cosmo = new Cosmo($pdo, $prefix, $salt);

session_start();

$angularModules = '';
$minifyScripts = $prefix . 'min/?f=';
$minifyCSS = $prefix . 'min/?f=';
$scripts = '';
$CSS = '';
$developerMode = FALSE;

// Log user in if they have a cookie
if($_COOKIE['username'] && $_COOKIE['token'])
{
    // Validate token
    if($Cosmo->tokenValidate($_COOKIE['username'], $_COOKIE['token']))
    {
        $usersID = $_COOKIE['usersID'];
        $username = $_COOKIE['username'];
        $role = $Cosmo->usersRead(null, $username);
        
        // Delete one-use token, issue a new one
        // todo: fix this so it doesn't break every refresh
        //$Cosmo->tokenDelete($username, $_COOKIE['token']);
        //$token = $Cosmo->tokenSave($username);
        $token = $_COOKIE['token'];
        //setcookie('token', $token, time()+60*60*24*90); // Set cookie to expire in 90 days
        $isUserAdmin = $Cosmo->isUserAdmin($username, $token);
        
        $minifyScripts .= $prefix."core/js/3rd-party/angular-file-upload-shim.min.js,"; // Breaks IE9, so only load it for admins
    }
}

// Load official Angular files
$minifyScripts .= $prefix."core/js/angular/angular.min.js,";
$minifyScripts .= $prefix."core/js/angular/angular-animate.min.js,";
$minifyScripts .= $prefix."core/js/angular/angular-touch.min.js,";
$minifyScripts .= $prefix."core/js/angular/angular-route.min.js,";
$minifyScripts .= $prefix."core/js/angular/angular-resource.min.js,";

// Load the Cosmo file
$minifyScripts .= $prefix."core/js/cosmo.js,";

// 3rd party scripts
$minifyScripts .= $prefix."core/js/3rd-party/angular-file-upload.min.js,";
$minifyScripts .= $prefix."core/js/3rd-party/angular-growl.min.js,";
$minifyScripts .= $prefix."core/js/3rd-party/diff_match_patch.js,";
$minifyScripts .= $prefix."core/js/3rd-party/ngDialog.min.js,";
$minifyScripts .= $prefix."core/js/3rd-party/ng-quick-date.min.js,";
$minifyScripts .= $prefix."core/js/3rd-party/angular-ui-tree.min.js";


$minifyCSS .= $prefix.'core/css/cosmo-default-style.minify.css';


// Load theme files
$settings = $Cosmo->settingsRead();
$theme = $settings['theme'];

if(file_exists("themes/$theme/cosmo.json"))
{
    $themeJSON = json_decode(file_get_contents("themes/$theme/cosmo.json"));
    
    if($themeJSON->module)
        $angularModules .= ",\n\t\t'". $themeJSON->module ."'";
    
    // Check if there is are Javascript files for this theme
    if($themeJSON->scripts){
        foreach($themeJSON->scripts as $script){
            if(strpos($script, '//') !== FALSE)
                $scripts .= "<script src='". $script ."'></script>\n\t"; // External js files    
            else if(!$developerMode && (strpos($script, '.min.') !== FALSE || strpos($script, '.minify.') !== FALSE)) // Minify and combine script
                $minifyScripts .= ",".$prefix."themes/$theme/". $script;
            else
                $scripts .= "<script src='".$prefix."themes/$theme/". $script ."'></script>\n\t"; // File shouldn't be minified
        }
    }
    
    // Check if there is are CSS files for this theme
    if($themeJSON->css){
        foreach($themeJSON->css as $css){
            if(strpos($css, '//') !== FALSE)
                $CSS .= "<link href='". $css ."' rel='stylesheet' type='text/css'>\n\t"; // External style sheets
            else if(!$developerMode && (strpos($css, '.min.') !== FALSE || strpos($css, '.minify.') !== FALSE)) // Minify and combine script
                $minifyCSS .= ",".$prefix."themes/$theme/". $css;
            else
                $CSS .= "<link href='".$prefix."themes/$theme/". $css ."' rel='stylesheet' type='text/css'>\n\t"; // File can't be minified
        }
    }
}

// Load all modules and their JS/CSS files
$stmt = $pdo->prepare('SELECT * FROM modules WHERE status=?');
$data = array('active');
$stmt->execute($data);
$stmt->setFetchMode(PDO::FETCH_ASSOC);
while($row = $stmt->fetch())
{
    $folder = $row['module'];
    
    if(file_exists("modules/$folder/cosmo.json"))
    {
        $moduleJSON = json_decode(file_get_contents("modules/$folder/cosmo.json"));
        
        if($moduleJSON->module)
            $angularModules .= ",\n\t\t'". $moduleJSON->module ."'";
        
        // Check if there is are Javascript files for this script
        if($moduleJSON->scripts){
            foreach($moduleJSON->scripts as $script){
                if(strpos($script, '//') !== FALSE)
                    $scripts .= "<script src='". $script ."'></script>\n\t"; // External file
                else if(!$developerMode && (strpos($script, '.min.') !== FALSE || strpos($script, '.minify.')) !== FALSE)
                    $minifyScripts .= ",".$prefix."modules/$folder/". $script; // Minify and combine script
                else
                    $scripts .= "<script src='".$prefix."modules/$folder/". $script ."'></script>\n\t"; // File can't be minified
            }
        }
        
        // Check if there are CSS files for this module
        if($moduleJSON->css){
            foreach($moduleJSON->css as $css){
                if(strpos($css, '//') !== FALSE)
                    $CSS .= "<link href='". $css ."' rel='stylesheet'>\n\t"; // External stylesheet
                else if(!$developerMode && (strpos($css, '.min.') !== FALSE || strpos($css, '.minify.') !== FALSE))
                    $minifyCSS .= ",".$prefix."modules/$folder/". $css; // Minify and combine
                else
                    $CSS .= "<link href='".$prefix."modules/$folder/". $css ."' rel='stylesheet'>\n\t"; // File can't be minified
            }
        }
    }
}

// Get initial content for social
$content = $Cosmo->contentRead($_SERVER['REQUEST_URI']);

?>