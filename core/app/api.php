<?php

/**
 * Controller that connects the front-end to the back-end
 */

require_once 'autoload.php';
require_once 'Cosmo.class.php';
$Cosmo = new Cosmo($pdo, $prefix, $salt);

$method = $_SERVER['REQUEST_METHOD']; # GET, POST, PUT, or DELETE
$uri = substr($_SERVER['REQUEST_URI'], 5 + strlen(FOLDER)); # remove '/api/' and prefix - (strlen($prefix) +)
$uri = explode('?', $uri); // Separate GET parameters
$segments = explode('/', $uri[0]);
$header = 200;
$role = '';

// Check permissions for autorized requests
if(isset($_SERVER['HTTP_USERSID']) && $_SERVER['HTTP_USERSID']
    && isset($_SERVER['HTTP_TOKEN']) && $_SERVER['HTTP_TOKEN'])
{
    if($Cosmo->tokensRead($_SERVER['HTTP_USERSID'], $_SERVER['HTTP_TOKEN'])){
        $usersID = $_SERVER['HTTP_USERSID'];
        $username = $_SERVER['HTTP_USERNAME'];
        $roleRecord = $Cosmo->usersRead($usersID);
        $role = $roleRecord['role'];
    }
}

function checkPermissions($action, $publishedStatus=null, $url=null)
{
    global $Cosmo;
    global $username;
    global $role;
    
    // Admins can do anything. Skip permission checking
    if($role === 'admin')
        return true;
    
    switch($action)
    {
        case 'createPage':
            switch($role)
            {
                case 'editor':
                    $return = true;
                    break;
                case 'author':
                    $return = true;
                    break;
                case 'contributor': // Contributor's can't publish their own work. Must be set to draft mode
                    if($publishedStatus === 'draft')
                        $return = true;
                    else
                        $return = false;
                    break;
                default:
                    $return = false;
                    break;
            }
            break;
        
        case 'editPage':
            switch($role)
            {
                case 'editor':
                    $return = true;
                    break;
                case 'author':
                    $authorRecord = $Cosmo->contentRead($url);
                    $author = $authorRecord['author'];
                    if($author === $username)
                        $return = true;
                    else
                        $return = false;
                    break;
                case 'contributor':
                    $content = $Cosmo->contentRead($url);
                    if($content['author'] === $username && $publishedStatus === 'draft')
                        $return = true;
                    else
                        $return = false;
                    break;
                default:
                    $return = false;
                    break;
            }
            break;
        
        case 'deletePage':
            switch($role)
            {
                case 'editor':
                    $return = true;
                    break;
                case 'author':
                    $authorRecord = $Cosmo->contentRead($url);
                    $author = $authorRecord['author'];
                    if($author === $username)
                        $return = true;
                    else
                        $return = false;
                    break;
                case 'contributor':
                    $return = false;
                    break;
                default:
                    $return = false;
                    break;
            }
            break;
            
        default:
            break;
    }
    return $return;
};

// Angular sends Data as JSON. jQuery and others don't. Accept both formats
switch($method)
{
    case 'POST':
        if(!$_POST)
            $_POST = json_decode(file_get_contents("php://input"), TRUE);
        break;
        
    case 'PUT':
        $_PUT = json_decode(file_get_contents("php://input"), TRUE);
        break;
    
    case 'DELETE':
        break;
    
    case 'GET':
        break;
    
    default:
        break;
}

// Set HTTP error codes and return an error message
function error($code)
{
    switch($code)
    {
        case 405:
            header('HTTP/1.1 405 Method Not Allowed');
            $message = array('error' => "This method is not allowed. You probably used the wrong verb (GET, POST, PUT, or DELETE) or you included/omitted an id parameter.");
            break;
    }
    
    return $message;
}

switch($segments[0])
{
    ##################################################
    #                   Blocks                       #
    ##################################################
    
    case 'blocks':
        
        switch($method)
        {
            case 'GET':
                if(isset($_GET['url']) ? $url = $_GET['url'] : $url = '');
                if(isset($_GET['type']) ? $type = $_GET['type'] : $type = '');
                
                if(isset($segments[2]) && $segments[2] === 'requirements')
                    $response = $Cosmo->blocksRequirementsRead($segments[1]);
                else if(isset($segments[1]))
                    $response['html'] = $Cosmo->blocksRead($segments[1]);
                else if($type || $url)
                    $response = $Cosmo->blocksRead(NULL, $type, $url);
                else
                    $response = $Cosmo->blocksRead();
                break;
                
            case 'POST':
                if($role === 'admin')
                {
                    if(isset($_POST['type']) ? $type = $_POST['type'] : $type = '');
                    if(isset($_POST['requirement']) ? $requirement = $_POST['requirement'] : $requirement = '');
                    if(isset($_POST['name']) ? $name = $_POST['name'] : $name = '');
                    
                    if(isset($segments[2]))
                        $response = $Cosmo->blocksRequirementsCreate($segments[1], $type, $requirement);
                    else
                        $response = $Cosmo->blocksCreate($name);
                }
                break;
                
            case 'PUT':
                if($role === 'admin')
                {
                    if(isset($_PUT['blockID']) ? $blockID = $_PUT['blockID'] : $blockID = '');
                    if(isset($_PUT['type']) ? $type = $_PUT['type'] : $type = '');
                    if(isset($_PUT['requirement']) ? $requirement = $_PUT['requirement'] : $requirement = '');
                    if(isset($_PUT['name']) ? $name = $_PUT['name'] : $name = '');
                    if(isset($_PUT['block']) ? $block = $_PUT['block'] : $block = '');
                    if(isset($_PUT['priority']) ? $priority = $_PUT['priority'] : $priority = '');
                    if(isset($_PUT['area']) ? $area = $_PUT['area'] : $area = '');
                    
                    if(isset($segments[3]))
                        $response = $Cosmo->blocksRequirementsUpdate($segments[3], $blockID, $type, $requirement);
                    else if(isset($segments[1]))
                        $response = $Cosmo->blocksUpdate($name, $block, $priority, $area, $segments[1]);
                    else
                        $response = error(405);
                }
                break;
                
            case 'DELETE':
                if($role === 'admin')
                {
                    if(isset($segments[2]) && $segments[2] === 'requirements')
                        $response = $Cosmo->blocksRequirementsDelete ($segments[1]);
                    else if(isset($segments[1]))
                        $response = $Cosmo->blocksDelete($segments[1]);
                    else
                        $response = error(405);
                }
                break;
        }
        break;
    
    ##################################################
    #                 Comments                       #
    ##################################################

    case 'comments':
        switch($method)
        {
            case 'GET':
                if(isset($_GET['id']) ? $id = $_GET['id'] : $id = '');
                
                $response = $Cosmo->commentsRead($id);
                break;
                
            case 'POST':
                if(isset($_POST['content_id']) ? $content_id = $_POST['content_id'] : $content_id = '');
                if(isset($_POST['path']) ? $path = $_POST['path'] : $path = '');
                if(isset($_POST['name']) ? $name = $_POST['name'] : $name = '');
                if(isset($_POST['email']) ? $email = $_POST['email'] : $email = '');
                if(isset($_POST['comment']) ? $comment = $_POST['comment'] : $comment = '');
                
                $response = $Cosmo->commentsCreate($content_id, $path, $name, $email, $comment);
                break;

            case 'PUT':
                if(isset($_PUT['id']) ? $id = $_PUT['id'] : $id = '');
                if(isset($_PUT['comment']) ? $comment = $_PUT['comment'] : $comment = '');
                
                $response = $Cosmo->commentsUpdate($id, $comment);
                break;

            case 'DELETE':
                $response = $Cosmo->commentsDelete($segments[1]);
                break;
        }
        break;
        
    ##################################################
    #                  Content                       #
    ##################################################

    case 'content':
        switch($method)
        {
            case 'GET':
                if(count($segments) > 3 && $segments[2] === 'revisions')
                    $response = $Cosmo->revisionsRead($segments[3]);
                else if(count($segments) > 2 && $segments[2] === 'revisions')
                    $response = $Cosmo->revisionsRead(NULL, $segments[1]);
                else if(count($segments) > 2 && $segments[2] === 'tags')
                    $response = $Cosmo->contentTagsRead($segments[1]);
                else
                    $response = $Cosmo->contentRead((isset($_GET['url']) ? $_GET['url'] : ''), $role==='admin');
                break;
                
            case 'POST':
                if(isset($_POST['published']) ? $published = $_POST['published'] : $published = '');
                if(isset($_POST['name']) ? $name = $_POST['name'] : $name = '');
                if(isset($_POST['extra']) ? $extra = $_POST['extra'] : $extra = '');
                if(isset($_POST['title']) ? $title = $_POST['title'] : $title = '');
                if(isset($_POST['description']) ? $description = $_POST['description'] : $description = '');
                if(isset($_POST['header']) ? $header = $_POST['header'] : $header = '');
                if(isset($_POST['subheader']) ? $subheader = $_POST['subheader'] : $subheader = '');
                if(isset($_POST['featured']) ? $featured = $_POST['featured'] : $featured = '');
                if(isset($_POST['body']) ? $body = $_POST['body'] : $body = '');
                if(isset($_POST['url']) ? $url = $_POST['url'] : $url = '');
                if(isset($_POST['type']) ? $type = $_POST['type'] : $type = '');
                if(isset($_POST['published_date']) ? $published_date = $_POST['published_date'] : $published_date = '');
                if(isset($_POST['author']) ? $author = $_POST['author'] : $author = '');
                if(isset($_POST['tag']) ? $tag = $_POST['tag'] : $tag = '');
                if(isset($_POST['type']) ? $type = $_POST['type'] : $type = '');
                
                if(checkPermissions('createPage', $published))
                {
                    if(count($segments) > 4 && $segments[2] === 'revisions' && $segments[4] === 'extras')
                        $response = $Cosmo->revisionsExtrasCreate($segments[3], $segments[1], $name, $extra);
                    if(count($segments) > 2 && $segments[2] === 'revisions')
                        $response['id'] = $Cosmo->revisionsCreate($segments[1], $title, $description, $header, $subheader, $featured, $body, $url, $type, $published, $published_date, $author);
                    else if(count($segments) > 2 && $segments[2] === 'extras')
                        $response = $Cosmo->contentExtrasCreate($segments[1], $name, $extra);
                    else if(count($segments) > 2 && $segments[2] === 'tags')
                        $response = $Cosmo->contentTagsCreate($segments[1], $tag);
                    else // Create a new page
                        $response['id'] = $Cosmo->contentCreate($title, $description, $header, $subheader, $featured, $body, $url, $author, $type, $published, $published_date);
                }
                break;

            case 'PUT':
                if(isset($_PUT['published']) ? $published = $_PUT['published'] : $published = '');
                if(isset($_PUT['name']) ? $name = $_PUT['name'] : $name = '');
                if(isset($_PUT['extra']) ? $extra = $_PUT['extra'] : $extra = '');
                if(isset($_PUT['title']) ? $title = $_PUT['title'] : $title = '');
                if(isset($_PUT['description']) ? $description = $_PUT['description'] : $description = '');
                if(isset($_PUT['header']) ? $header = $_PUT['header'] : $header = '');
                if(isset($_PUT['subheader']) ? $subheader = $_PUT['subheader'] : $subheader = '');
                if(isset($_PUT['featured']) ? $featured = $_PUT['featured'] : $featured = '');
                if(isset($_PUT['body']) ? $body = $_PUT['body'] : $body = '');
                if(isset($_PUT['url']) ? $url = $_PUT['url'] : $url = '');
                if(isset($_PUT['type']) ? $type = $_PUT['type'] : $type = '');
                if(isset($_PUT['published_date']) ? $published_date = $_PUT['published_date'] : $published_date = '');
                if(isset($_PUT['author']) ? $author = $_PUT['author'] : $author = '');
                if(isset($_PUT['tag']) ? $tag = $_PUT['tag'] : $tag = '');
                if(isset($_PUT['type']) ? $type = $_PUT['type'] : $type = '');
                
                if(isset($segments[1])){
                    if(checkPermissions('editPage', $_PUT['published'], $_PUT['url']))
                        $response = $Cosmo->contentUpdate($segments[1], $_PUT['title'], $_PUT['description'], $_PUT['header'], $_PUT['subheader'], $_PUT['featured'], $_PUT['body'], $_PUT['url'], $_PUT['author'], $_PUT['type'], $_PUT['published'], $_PUT['published_date']);
                }
                break;
                
            case 'DELETE':
                if(checkPermissions('deletePage')){
                    if(isset($segments[2]) && $segments[2] === 'revisions' && $segments[3])
                        $response = $Cosmo->revisionsDelete($segments[3]);
                    else if(isset($segments[2]) && $segments[2] === 'revisions')
                        $response = $Cosmo->revisionsDelete(NULL, $segments[1]);
                    else if(isset($segments[2]) && $segments[2] === 'extras')
                        $response = $Cosmo->contentExtrasDelete($segments[1]);
                    else if(isset($segments[2]) && $segments[2] === 'tags')
                        $response = $Cosmo->contentTagsDelete($segments[1]);
                    else
                        $response = $Cosmo->contentDelete($segments[1]);
                }
                break;
        }
        break;

    ##################################################
    #                    Email                       #
    ##################################################

    case 'email':
        switch($method)
        {
            case 'POST':
                if(isset($_POST['to']) ? $to = $_POST['to'] : $to = '');
                if(isset($_POST['subject']) ? $subject = $_POST['subject'] : $subject = '');
                if(isset($_POST['message']) ? $message = $_POST['message'] : $message = '');
                
                $Cosmo->email($to, $subject, $message);
                break;
        }
        break;
    ##################################################
    #                    Files                       #
    ##################################################
    
    case 'files':
        switch($method)
        {
            case 'GET':
                if(isset($_GET['url']) ? $url = $_GET['url'] : $url = '');
                
                if(isset($segments[1]))
                    $response = $Cosmo->filesRead($segments[1]);
                else if($url)
                    $response = $Cosmo->filesRead(null, $url);
                else
                    $response = $Cosmo->filesRead();
                break;
                
            case 'POST':
                if(isset($_POST['published']) ? $published = $_POST['published'] : $published = '');
                if(isset($_POST['file']) ? $file = $_POST['file'] : $file = '');
                
                if(checkPermissions('createPage', $published))
                {
                    $response = $Cosmo->filesCreate($file);
                }
                break;

            case 'PUT':
                break;

            case 'DELETE':
                if(checkPermissions('deletePage'))
                {
                    $response = $Cosmo->filesDelete($segments[1]);
                }
                break;
        }
        break;

    ##################################################
    #                    Menus                       #
    ##################################################

    case 'menus':

        switch($method)
        {
            case 'GET':
                $response = $Cosmo->menusRead();
                break;

            case 'POST':
                if(isset($_POST['name']) ? $name = $_POST['name'] : $name = '');
                
                if($role === 'admin')
                    $response = $Cosmo->menusCreate($name);
                break;

            case 'PUT':
                if(isset($_PUT['name']) ? $name = $_PUT['name'] : $name = '');
                if(isset($_PUT['menu']) ? $menu = $_PUT['menu'] : $menu = '');
                if(isset($_PUT['area']) ? $area = $_PUT['area'] : $area = '');

                if($role === 'admin')
                    $response = $Cosmo->menusUpdate($segments[1], $name, $menu, $area);
                break;

            case 'DELETE':
                if(isset($segments[1])){
                    if($role === 'admin')
                        $response = $Cosmo->menusDelete($segments[1]);
                }
                break;
        }
        break;

    ##################################################
    #                  Modules                       #
    ##################################################

    case 'modules':
        switch($method)
        {
            case 'GET':
                $response = $Cosmo->modulesRead();
                break;

            case 'POST':
                if(isset($_POST['module']) ? $module = $_POST['module'] : $module = '');
                
                if($role === 'admin')
                    $response = $Cosmo->modulesCreate($module);
                break;

            case 'PUT':
                if(isset($_PUT['status']) ? $status = $_PUT['status'] : $status = '');
                
                if($role === 'admin')
                    $response = $Cosmo->modulesUpdate($segments[1], $status);
                break;

            case 'DELETE':
                if($role === 'admin')
                    $response = $Cosmo->modulesDelete($segments[1]);
                break;
        }
        break;

    ##################################################
    #                  Settings                      #
    ##################################################

    case 'settings':
        switch($method)
        {
            case 'GET':
                $response = $Cosmo->settingsRead();
                break;

            case 'PUT':
                if(isset($_PUT['siteName']) ? $siteName = $_PUT['siteName'] : $siteName = '');
                if(isset($_PUT['slogan']) ? $slogan = $_PUT['slogan'] : $slogan = '');
                if(isset($_PUT['logo']) ? $logo = $_PUT['logo'] : $logo = '');
                if(isset($_PUT['favicon']) ? $favicon = $_PUT['favicon'] : $favicon = '');
                if(isset($_PUT['email']) ? $email = $_PUT['email'] : $email = '');
                if(isset($_PUT['maintenanceURL']) ? $maintenanceURL = $_PUT['maintenanceURL'] : $maintenanceURL = '');
                if(isset($_PUT['maintenanceMode']) ? $maintenanceMode = $_PUT['maintenanceMode'] : $maintenanceMode = '');
                
                if($role === 'admin')
                    $response = $Cosmo->settingsUpdate($siteName, $slogan, $logo, $favicon, $email, $maintenanceURL, $maintenanceMode);
                break;

            default:
                break;
        }
        break;
        
    ##################################################
    #                   Themes                       #
    ##################################################

    case 'themes':

        switch($method)
        {
            case 'GET':
                if(isset($segments[1]))
                    $response = $Cosmo->themesRead($segments[1]);
                else
                    $response = $Cosmo->themesRead();
                break;

            case 'POST':

                break;

            case 'PUT':
                if(isset($_PUT['theme']) ? $theme = $_PUT['theme'] : $theme = '');
                
                if($role === 'admin')
                    $response = $Cosmo->themesUpdate($theme);
                break;

            case 'DELETE':
                break;
        }
        break;

    ##################################################
    #                    Users                       #
    ##################################################

    case 'users':
        
        switch($method)
        {
            case 'GET':
                if(count($segments) > 1 && $segments[1])
                    $response = $Cosmo->usersRead($segments[1]);
                else if($_GET['username'] && $_GET['password']) // Login
                    $response = $Cosmo->userLogin($_GET['username'], $_GET['password']);
                else if($_GET['keyword']) // Get list of users starting with a keyword
                    $response = $Cosmo->usersRead(NULL, $_GET['keyword']);
                else // Get a list of all users
                    $response = $Cosmo->usersRead();
                break;
                
            case 'POST':
                $response = $Cosmo->usersCreate($_POST['username'], $_POST['email'], $_POST['password']);
                if(!$response)
                    $header = 400;
                break;
                
            case 'PUT':
                if(isset($_PUT['username']) ? $username = $_PUT['username'] : $username = '');
                if(isset($_PUT['name']) ? $name = $_PUT['name'] : $name = '');
                if(isset($_PUT['photo']) ? $photo = $_PUT['photo'] : $photo = '');
                if(isset($_PUT['bio']) ? $bio = $_PUT['bio'] : $bio = '');
                if(isset($_PUT['$facebook']) ? $facebook = $_PUT['facebook'] : $facebook = '');
                if(isset($_PUT['twitter']) ? $twitter = $_PUT['twitter'] : $twitter = '');
                if(isset($_PUT['role']) ? $role = $_PUT['role'] : $role = '');
                if(isset($_PUT['email']) ? $email = $_PUT['email'] : $email = '');
                if(isset($_PUT['reset']) ? $reset = $_PUT['reset'] : $reset = '');
                if(isset($_PUT['token']) ? $token = $_PUT['token'] : $token = '');
                if(isset($_PUT['password']) ? $password = $_PUT['password'] : $password = '');
                
                if(count($segments) > 1 && $segments[1]) // Edit username, email, role, or password
                {
                    // Make sure the user is editing their own info, or the user is an administrator
                    if($role === 'admin') // Allow the editing of the role too
                        $response = $Cosmo->usersUpdate($segments[1], $username, $name, $photo, $bio, $facebook, $twitter, $role, $email);
                    else if($username === $_PUT['username'])
                        $response = $Cosmo->usersUpdate($segments[1], $username, $name, $photo, $bio, $facebook, $twitter, NULL, $email);
                } else if($reset) // Reset password
                    $response['token'] = $Cosmo->passwordReset($segments[1]);
                else if($token) // Update your password
                {
                    if($Cosmo->passwordResetVerify($segments[1], $token))
                        $response = $Cosmo->usersUpdate($segments[1], NULL, NULL, NULL, NULL, NULL, NULL, NULL, $password);
                    else
                        $response = FALSE;
                }
                break;
                
            case 'DELETE':
                if($role === 'admin')
                {
                    if(isset($segments[2]))
                        $response = $Cosmo->usersRoleDelete($segments[1]);
                    else
                        $response = $Cosmo->usersDelete($segments[1]);
                }
                break;
        }

        break;

    default:
        break;
}

if(is_string($response))
    $response = array('data'=>$response);

if($response === false)
    $header = 500;

// Set Headers
header("Content-Type: application/json", true);
header('Cache-Control: no-cache, no-store, must-revalidate'); // HTTP 1.1.
header('Pragma: no-cache'); // HTTP 1.0.
header('Expires: 0'); // Proxies.
header("Status: $header");
// http_response_code($header); // todo: Breaks older versions of PHP. Find workaround

echo json_encode($response);

?>