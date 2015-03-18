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
                $url = isset($_GET['url']) ? $_GET['url'] : '';
                $type = isset($_GET['type']) ? $_GET['type'] : '';
                
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
                    $type = isset($_POST['type']) ? $_POST['type'] : '';
                    $requirement = isset($_GET['requirement']) ? $_POST['requirement'] : '';
                    $name = isset($_POST['name']) ? $_POST['name'] : '';
                    
                    if(isset($segments[2]))
                        $response = $Cosmo->blocksRequirementsCreate($segments[1], $type, $requirement);
                    else
                        $response = $Cosmo->blocksCreate($name);
                }
                break;
                
            case 'PUT':
                if($role === 'admin')
                {
                    $blockID = isset($_PUT['blockID']) ? $_PUT['blockID'] : '';
                    $type = isset($_PUT['type']) ? $_PUT['type'] : '';
                    $requirement = isset($_PUT['requirement']) ? $_PUT['requirement'] : '';
                    $name = isset($_PUT['name']) ? $_PUT['name'] : '';
                    $block = isset($_PUT['block']) ? $_PUT['block'] : '';
                    $priority = isset($_PUT['priority']) ? $_PUT['priority'] : '';
                    $area = isset($_PUT['area']) ? $_PUT['area'] : '';
                    
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
                $id = isset($_GET['id']) ? $_GET['id'] : '';
                
                $response = $Cosmo->commentsRead($id);
                break;
                
            case 'POST':
                $content_id = isset($_POST['content_id']) ? $_POST['content_id'] : '';
                $path = isset($_POST['path']) ? $_POST['path'] : '';
                $name = isset($_POST['name']) ? $_POST['name'] : '';
                $email = isset($_POST['email']) ? $_POST['email'] : '';
                $comment = isset($_POST['comment']) ? $_POST['comment'] : '';
                
                $response = $Cosmo->commentsCreate($content_id, $path, $name, $email, $comment);
                break;

            case 'PUT':
                $id = isset($_PUT['id']) ? $_PUT['id'] : '';
                $comment = isset($_PUT['comment']) ? $_PUT['comment'] : '';
                
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
                    $response = $Cosmo->contentRead(isset($_GET['url']) ? $_GET['url'] : '', $role==='admin');
                break;

            case 'POST':
                $published = isset($_POST['published']) ? $_POST['published'] : '';
                $name = isset($_POST['name']) ? $_POST['name'] : '';
                $extra = isset($_POST['extra']) ? $_POST['extra'] : '';
                $title = isset($_POST['title']) ? $_POST['title'] : '';
                $description = isset($_POST['description']) ? $_POST['description'] : '';
                $header = isset($_POST['header']) ? $_POST['header'] : '';
                $subheader = isset($_POST['subheader']) ? $_POST['subheader'] : '';
                $featured = isset($_POST['featured']) ? $_POST['featured'] : '';
                $body = isset($_POST['body']) ? $_POST['body'] : '';
                $url = isset($_POST['url']) ? $_POST['url'] : '';
                $type = isset($_POST['type']) ? $_POST['type'] : '';
                $published_date = isset($_POST['published_date']) ? $_POST['published_date'] : '';
                $author = isset($_POST['author']) ? $_POST['author'] : '';
                $tag = isset($_POST['tag']) ? $_POST['tag'] : '';
                
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
                $published = isset($_PUT['published']) ? $_PUT['published'] : '';
                $name = isset($_PUT['name']) ? $_PUT['name'] : '';
                $extra = isset($_PUT['extra']) ? $_PUT['extra'] : '';
                $title = isset($_PUT['title']) ? $_PUT['title'] : '';
                $description = isset($_PUT['description']) ? $_PUT['description'] : '';
                $header = isset($_PUT['header']) ? $_PUT['header'] : '';
                $subheader = isset($_PUT['subheader']) ? $_PUT['subheader'] : '';
                $featured = isset($_PUT['featured']) ? $_PUT['featured'] : '';
                $body = isset($_PUT['body']) ? $_PUT['body'] : '';
                $url = isset($_PUT['url']) ? $_PUT['url'] : '';
                $type = isset($_PUT['type']) ? $_PUT['type'] : '';
                $published_date = isset($_PUT['published_date']) ? $_PUT['published_date'] : '';
                $author = isset($_PUT['author']) ? $_PUT['author'] : '';
                $tag = isset($_PUT['tag']) ? $_PUT['tag'] : '';
                
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
                $to = isset($_POST['to']) ? $_POST['to'] : '';
                $subject = isset($_POST['subject']) ? $_POST['subject'] : '';
                $message = isset($_POST['message']) ? $_POST['message'] : '';
                
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
                $url = isset($_GET['url']) ? $_GET['url'] : '';
                
                if(isset($segments[1]))
                    $response = $Cosmo->filesRead($segments[1]);
                else if($url)
                    $response = $Cosmo->filesRead(null, $url);
                else
                    $response = $Cosmo->filesRead();
                break;
                
            case 'POST':
                $published = isset($_POST['published']) ? $_POST['published'] : '';
                $file = isset($_POST['file']) ? $_POST['file'] : '';
                
                if(checkPermissions('createPage', $published))
                    $response = $Cosmo->filesCreate($file);
                break;

            case 'PUT':
                break;

            case 'DELETE':
                if(checkPermissions('deletePage'))
                    $response = $Cosmo->filesDelete($segments[1]);
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
                $name = isset($_POST['name']) ? $_POST['name'] : '';
                
                if($role === 'admin')
                    $response = $Cosmo->menusCreate($name);
                break;

            case 'PUT':
                $name = isset($_PUT['name']) ? $_PUT['name'] : '';
                $menu = isset($_PUT['menu']) ? $_PUT['menu'] : '';
                $area = isset($_PUT['area']) ? $_PUT['area'] : '';

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
                $module = isset($_POST['module']) ? $_POST['module'] : '';
                
                if($role === 'admin')
                    $response = $Cosmo->modulesCreate($module);
                break;

            case 'PUT':
                $status = isset($_PUT['status']) ? $_PUT['status'] : '';
                
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
                $siteName = isset($_PUT['siteName']) ? $_PUT['siteName'] : '';
                $slogan = isset($_PUT['slogan']) ? $_PUT['slogan'] : '';
                $logo = isset($_PUT['logo']) ? $_PUT['logo'] : '';
                $favicon = isset($_PUT['favicon']) ? $_PUT['favicon'] : '';
                $email = isset($_PUT['email']) ? $_PUT['email'] : '';
                $language = isset($_PUT['language']) ? $_PUT['language'] : '';
                $maintenanceURL = isset($_PUT['maintenanceURL']) ? $_PUT['maintenanceURL'] : '';
                $maintenanceMode = isset($_PUT['maintenanceMode']) ? $_PUT['maintenanceMode'] : '';
                
                if($role === 'admin')
                    $response = $Cosmo->settingsUpdate($siteName, $slogan, $logo, $favicon, $email, $language, $maintenanceURL, $maintenanceMode);
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
                $theme = isset($_PUT['theme']) ? $_PUT['theme'] : '';
                
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
                $username = isset($_POST['username']) ? $_POST['username'] : '';
                $email = isset($_POST['email']) ? $_POST['email'] : '';
                $password = isset($_POST['password']) ? $_POST['password'] : '';
                
                $response = $Cosmo->usersCreate($username, $email, $password);
                break;
                
            case 'PUT':
                $username = isset($_POST['username']) ? $_POST['username'] : '';
                $password = isset($_POST['password']) ? $_POST['password'] : '';
                $name = isset($_POST['name']) ? $_POST['name'] : '';
                $photo = isset($_POST['photo']) ? $_POST['photo'] : '';
                $bio = isset($_POST['bio']) ? $_POST['bio'] : '';
                $facebook = isset($_POST['facebook']) ? $_POST['facebook'] : '';
                $twitter = isset($_POST['twitter']) ? $_POST['twitter'] : '';
                $role = isset($_POST['role']) ? $_POST['role'] : '';
                $email = isset($_POST['email']) ? $_POST['email'] : '';
                $reset = isset($_POST['reset']) ? $_POST['reset'] : '';
                $token = isset($_POST['token']) ? $_POST['token'] : '';
                
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