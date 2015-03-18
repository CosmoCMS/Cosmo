<?php

require_once 'autoload.php';
require_once 'Cosmo.class.php';
$Cosmo = new Cosmo($pdo, $prefix, $salt);

session_start();

// Initialize variables
$angularModules = '';
$directives = array();
$classes = '';
$minifyScripts = 'min/?f=';
$minifyCSS = 'min/?f=';
$scripts = '';
$CSS = '';
$developerMode = FALSE;

// Log user in if they have a cookie
if(isset($_COOKIE['usersID']) && $_COOKIE['usersID'] && $_COOKIE['token'])
{
    // Validate token
    if($Cosmo->tokensRead($_COOKIE['usersID'], $_COOKIE['token']))
    {
        $usersID = $_COOKIE['usersID'];
        $username = $_COOKIE['username'];
        $roleRecord = $Cosmo->usersRead($usersID);
        $role = $roleRecord['role'];
        
        // Delete one-use token, issue a new one
        // todo: fix this so it doesn't break every refresh
        //$Cosmo->tokensDelete($username, $_COOKIE['token']);
        //$token = $Cosmo->tokensCreate($username);
        $token = $_COOKIE['token'];
        //setcookie('token', $token, time()+60*60*24*90); // Set cookie to expire in 90 days
        
        $minifyScripts .= FOLDER."core/js/3rd-party/angular-file-upload-shim.min.js,"; // Breaks IE9, so only load it for admins
    }
}

// Load official Angular files
$minifyScripts .= FOLDER."core/js/angular/angular.min.js,";
$minifyScripts .= FOLDER."core/js/angular/angular-animate.min.js,";
$minifyScripts .= FOLDER."core/js/angular/angular-touch.min.js,";
$minifyScripts .= FOLDER."core/js/angular/angular-route.min.js,";
$minifyScripts .= FOLDER."core/js/angular/angular-resource.min.js,";

// Load the Cosmo core files
$minifyScripts .= FOLDER."core/js/cosmo.js,";
$minifyScripts .= FOLDER."core/js/admin-panel.js,";

// 3rd party scripts
$minifyScripts .= FOLDER."core/js/3rd-party/angular-file-upload.min.js,";
$minifyScripts .= FOLDER."core/js/3rd-party/angular-translate.min.js,";
$minifyScripts .= FOLDER."core/js/3rd-party/angular-translate-loader-static-files.min.js,";
$minifyScripts .= FOLDER."core/js/3rd-party/angular-translate-storage-cookie.min.js,";
$minifyScripts .= FOLDER."core/js/3rd-party/diff_match_patch.js,";
$minifyScripts .= FOLDER."core/js/3rd-party/ngDialog.min.js,";
$minifyScripts .= FOLDER."core/js/3rd-party/angular-ui-tree.min.js";


$minifyCSS .= FOLDER."core/css/cosmo-default-style.minify.css";


// Load menus
$menus = $Cosmo->menusRead();

// Load theme files
$settings = $Cosmo->settingsRead();
$theme = $settings['theme'];

if(file_exists("themes/$theme/cosmo.json"))
{
    $themeJSON = json_decode(file_get_contents("themes/$theme/cosmo.json"));
    
    // Add to module list
    if(!empty($themeJSON->module))
        $angularModules .= ",\n\t\t'". $themeJSON->module ."'";
    
    // Get all Directives
    if(!empty($themeJSON->directives)){
        foreach($themeJSON->directives as $directive)
            $directives[] = $directive;
    }
    
    // Get all classes
    if(!empty($themeJSON->classes)){
        $classes .= $themeJSON->name . ":;";
        foreach($themeJSON->classes as $class)
            $classes .= $class . ";";
    }
    
    // Check if there is are Javascript files for this theme
    if(!empty($themeJSON->scripts)){
        foreach($themeJSON->scripts as $script){
            if(strpos($script, '//') !== FALSE)
                $scripts .= "<script src='". $script ."'></script>\n\t"; // External js files    
            else if(!$developerMode && (strpos($script, '.min.') !== FALSE || strpos($script, '.minify.') !== FALSE)) // Minify and combine script
                $minifyScripts .= ",".FOLDER."themes/$theme/". $script;
            else
                $scripts .= "<script src='"."themes/$theme/". $script ."'></script>\n\t"; // File shouldn't be minified
        }
    }
    
    // Check if there is are CSS files for this theme
    if(!empty($themeJSON->css)){
        foreach($themeJSON->css as $css){
            if(strpos($css, '//') !== FALSE)
                $CSS .= "<link href='". $css ."' rel='stylesheet' type='text/css'>\n\t"; // External style sheets
            else if(!$developerMode && (strpos($css, '.min.') !== FALSE || strpos($css, '.minify.') !== FALSE)) // Minify and combine script
                $minifyCSS .= ",".FOLDER."themes/$theme/". $css;
            else
                $CSS .= "<link href='"."themes/$theme/". $css ."' rel='stylesheet' type='text/css'>\n\t"; // File can't be minified
        }
    }
}

// Load all modules and their JS/CSS files
$stmt = $pdo->prepare('SELECT * FROM '.$prefix.'modules WHERE status=?');
$data = array('active');
$stmt->execute($data);
$stmt->setFetchMode(PDO::FETCH_ASSOC);
while($row = $stmt->fetch())
{
    $folder = $row['module'];
    
    if(file_exists("modules/$folder/cosmo.json"))
    {
        $moduleJSON = json_decode(file_get_contents("modules/$folder/cosmo.json"));
        
        // Add to module list
        if(!empty($moduleJSON->module))
            $angularModules .= ",\n\t\t'". $moduleJSON->module ."'";
        
        // Get all directives
        if(!empty($moduleJSON->directives)){
            foreach($moduleJSON->directives as $directive)
                $directives[] = $directive;
        }

        // Get all classes
        if(!empty($moduleJSON->classes)){
            $classes .= $moduleJSON->name . ":;";
            foreach($moduleJSON->classes as $class)
                $classes .= $class . ";";
        }

        // Check if there is are Javascript files for this script
        if(!empty($moduleJSON->scripts)){
            foreach($moduleJSON->scripts as $script){
                if(strpos($script, '//') !== FALSE)
                    $scripts .= "<script src='". $script ."'></script>\n\t"; // External file
                else if(!$developerMode && (strpos($script, '.min.') !== FALSE || strpos($script, '.minify.')) !== FALSE)
                    $minifyScripts .= ",".FOLDER."modules/$folder/". $script; // Minify and combine script
                else
                    $scripts .= "<script src='"."modules/$folder/". $script ."'></script>\n\t"; // File can't be minified
            }
        }
        
        // Check if there are CSS files for this module
        if(!empty($moduleJSON->css)){
            foreach($moduleJSON->css as $css){
                if(strpos($css, '//') !== FALSE)
                    $CSS .= "<link href='". $css ."' rel='stylesheet'>\n\t"; // External stylesheet
                else if(!$developerMode && (strpos($css, '.min.') !== FALSE || strpos($css, '.minify.') !== FALSE))
                    $minifyCSS .= ",".FOLDER."modules/$folder/". $css; // Minify and combine
                else
                    $CSS .= "<link href='"."modules/$folder/". $css ."' rel='stylesheet'>\n\t"; // File can't be minified
            }
        }
    }
}

// Get initial content for social
$content = $Cosmo->contentRead($_SERVER['REQUEST_URI']);

?>