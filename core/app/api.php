<?php

/**
 * Controller that connects the front-end to the back-end
 */

require_once 'autoload.php';
require_once 'Cosmo.class.php';
$Cosmo = new Cosmo($pdo, $prefix, $salt);

$method = $_SERVER['REQUEST_METHOD']; # GET, POST, PUT, or DELETE
$uri = substr($_SERVER['REQUEST_URI'], 5); # remove '/api/' and prefix - (strlen($prefix) +)
$uri = explode('?', $uri); // Separate GET parameters
$segments = explode('/', $uri[0]);
$header = 200;


/*
// Check permissions for autorized requests
if($_SERVER['HTTP_USERNAME'] && $_SERVER['HTTP_TOKEN'])
    $validPermissions = $Cosmo->permissionsVerify($_SERVER['HTTP_USERNAME'], $_SERVER['HTTP_TOKEN'], $method, $segments[0]);
*/

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
        // Anyone can read content
        $validPermissions = TRUE;
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

// if($validPermissions) todo: set permissions
//{

    switch($segments[0])
    {
        ##################################################
        #                   Blocks                       #
        ##################################################

        case 'blocks':

            switch($method)
            {
                case 'GET':
                    if($segments[2] === 'requirements')
                        $response = $Cosmo->blockRequirementsRead($segments[1]);
                    else if($segments[1])
                        $response['html'] = $Cosmo->blockFetch($segments[1]);
                    else if($_GET['type'] || $_GET['type'])
                        $response = $Cosmo->blockFetchAll($_GET['type'], $_GET['url']);
                    else
                        $response = $Cosmo->blockRead();
                    break;

                case 'POST':
                    if($segments[2])
                        $response = $Cosmo->blockRequirementsCreate ($segments[1], $_POST['type'], $_POST['requirement']);
                    else
                        $response = $Cosmo->blockCreate($_POST['name']);
                    break;

                case 'PUT':
                    if($segments[3])
                        $response = $Cosmo->blockRequirementsUpdate($segments[3], $_PUT['blockID'], $_PUT['type'], $_PUT['requirement']);
                    else if($segments[1])
                        $response = $Cosmo->blockUpdate($_PUT['name'], $_PUT['block'], $_PUT['priority'], $_PUT['area'], $segments[1]);
                    else
                        $response = error(405);
                    break;

                case 'DELETE':
                    if($segments[2] === 'requirements')
                        $response = $Cosmo->blockRequirementsDelete ($segments[1]);
                    else if($segments[1])
                        $response = $Cosmo->blockDelete($segments[1]);
                    else
                        $response = error(405);
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
                    if($segments[2] === 'revisions' && $segments[3])
                        $response = $Cosmo->revisionsReadRecord($segments[3]);
                    else if($segments[2] === 'revisions')
                        $response = $Cosmo->revisionsRead($segments[1]);
                    else if($segments[2] === 'tags')
                        $response = $Cosmo->contentTagsRead($segments[1]);
                    else
                        $response = $Cosmo->contentRead($_GET['url'], $Cosmo->isUserAdmin($_SERVER['HTTP_USERNAME'], $_SERVER['HTTP_TOKEN']));
                    break;
                
                case 'POST':
                    if($segments[2] === 'revisions' && $segments[4] === 'extras')
                        $response = $Cosmo->revisionsExtrasCreate($segments[3], $segments[1], $_POST['name'], $_POST['extra']);
                    if($segments[2] === 'revisions')
                        $response['id'] = $Cosmo->revisionsCreate($segments[1], $_POST['title'], $_POST['description'], $_POST['header'], $_POST['subheader'], $_POST['body'], $_POST['url'], $_POST['type'], $_POST['published'], $_POST['published_date'], $_POST['author']);
                    else if($segments[2] === 'extras')
                        $response = $Cosmo->conentExtrasCreate($segments[1], $_POST['name'], $_POST['extra']);
                    else if($segments[2] === 'tags')
                        $response = $Cosmo->contentTagsCreate($segments[1], $_POST['tag']);
                    else
                        $response['id'] = $Cosmo->contentCreate($_POST['title'], $_POST['description'], $_POST['header'], $_POST['subheader'], $_POST['body'], $_POST['url'], $_POST['author'], $_POST['type'], $_POST['published'], $_POST['published_date']);
                    break;
                
                case 'PUT':
                    if($segments[1])
                        $response = $Cosmo->contentUpdate($segments[1], $_PUT['title'], $_PUT['description'], $_PUT['header'], $_PUT['subheader'], $_PUT['body'], $_PUT['url'], $_PUT['author'], $_PUT['type'], $_PUT['published'], $_PUT['published_date']);
                    break;
                
                case 'DELETE':
                    if($segments[2] === 'revisions' && $segments[3])
                        $response = $Cosmo->revisionsDelete($segments[3]);
                    else if($segments[2] === 'revisions')
                        $response = $Cosmo->revisionsDeleteAll($segments[1]);
                    else if($segments[2] === 'extras')
                        $response = $Cosmo->contentExtrasDelete($segments[1]);
                    else if($segments[2] === 'tags')
                        $response = $Cosmo->contentTagsDelete($segments[1]);
                    else
                        $response = $Cosmo->contentDelete($segments[1]);
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
                    $Cosmo->email($_POST['to'], $_POST['subject'], $_POST['message']);
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
                    if($segments[1] === 'tag')
                        $response = $Cosmo->fileTagsRead(null, $segments[2]);
                    else if($segments[1])
                        $response = $Cosmo->fileReadRecord($segments[1]);
                    else if($_GET['url'])
                        $response = $Cosmo->fileReadRecord(null, $_GET['url']);
                    else
                        $response = $Cosmo->fileRead();
                    break;
                    
                case 'POST':
                    if($segments[2] === 'tag') // Insert a new tag
                        $response = $Cosmo->fileTagsCreate($segments[1], urldecode($segments[3]));
                    else
                        $response = $Cosmo->fileCreate($_POST['file']);
                    break;

                case 'PUT':
                    if($segments[2] === 'tag')
                        $response = $Cosmo->fileTagsUpdate(urldecode($segments[3]), $_PUT['newTag']);
                    else
                        $response = $Cosmo->fileUpdate($segments[1], $_PUT['responsive']);
                    break;
                    
                case 'DELETE':
                    if($segments[1] === 'tag') // Delete all tags
                        $response = $Cosmo->fileTagsDelete($segments[2]);
                    else if($segments[2] === 'tag') // Delete all tags for a file
                        $response = $Cosmo->fileTagsDelete($segments[1]);
                    else
                        $response = $Cosmo->fileDelete($segments[1]);
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
                    $response = $Cosmo->menuRead();
                    break;

                case 'POST':
                    $response = $Cosmo->menuCreate($_POST['name']);
                    break;

                case 'PUT':
                    $response = $Cosmo->menuUpdate($segments[1], $_PUT['name'], $_PUT['menu'], $_PUT['area']);
                    break;

                case 'DELETE':
                    if($segments[1])
                        $response = $Cosmo->menuDelete($segments[1]);
                    else
                        $response = error(405);
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
                    $response = $Cosmo->modulesCreate($_POST['module']);
                    break;

                case 'PUT':
                    $response = $Cosmo->modulesUpdate($segments[1], $_PUT['status']);
                    break;

                case 'DELETE':
                    $response = $Cosmo->modulesDelete($segments[1]);
                    break;
            }
            break;
        
        ##################################################
        #                    Roles                       #
        ##################################################

        case 'roles':

            switch($method)
            {
                case 'GET':
                    if($segments[2])
                        $response = $Cosmo->permissionsRead($segments[1]);
                    else
                        $response = $Cosmo->roleRead();
                    break;

                case 'POST':
                    if($segments[2])
                        $response = $Cosmo->permissionsCreate($segments[1], $_POST['resource'], $_POST['permission']);
                    else
                        $response['id'] = $Cosmo->roleCreate($_POST['name']);
                    break;

                case 'PUT':
                    if($segments[3])
                        $response = $Cosmo->permissionsUpdate($segments[3], $segments[1], $_PUT['resource'], $_PUT['permission']);
                    else if($segments[1])
                        $response = $Cosmo->roleUpdate($segments[1], $_PUT['name']);    
                    else
                        $response = error(405);
                    break;

                case 'DELETE':
                    if($segments[3])
                        $response = 'error'; // todo: delete specific permission
                    if($segments[2])
                        $response = $Cosmo->permissionsDelete($segments[1]);
                    else if($segments[1])
                        $response = $Cosmo->roleDelete($segments[1]);
                    else
                        $response = error(405);
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
                    $response = $Cosmo->settingsUpdate($_PUT['siteName'], $_PUT['slogan'], $_PUT['logo'], $_PUT['email'], $_PUT['maintenanceURL'], $_PUT['maintenanceMode']);
                    break;
                
                default:
                    break;
            }
            break;

        ##################################################
        #                 Sitemaps                       #
        ##################################################

        case 'sitemaps':
            switch($method)
            {
                case 'GET':

                    break;

                case 'POST':
                    $response = $Cosmo->sitemapCreate('/sitemap.xml');
                    break;

                case 'PUT':
                    $response = $Cosmo->sitemapAddURL('/sitemap.xml', $_PUT['url'], $_PUT['lastmod'], $_PUT['changefreq'], $_PUT['priority']);
                    break;

                case 'DELETE':

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
                    if($segments[1])
                        $response = $Cosmo->themesActive($segments[1]);
                    else
                        $response = $Cosmo->themesRead();
                    break;
                    
                case 'POST':
                    
                    break;
                    
                case 'PUT':
                    if($_PUT['theme'])
                        $response = $Cosmo->themesUpdate($_PUT['theme']);
                    else
                        $response = error(405);
                    break;
                    
                case 'DELETE':
                    $response = $Cosmo->sitemapRemoveURL('/sitemap.xml', $_DELETE['url']);
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
                    if($_GET['username'] && $_GET['password']) // Login
                        $response = $Cosmo->userLogin($_GET['username'], $_GET['password']);
                    else if($segments[2]) // Get user's roles
                        $response = $Cosmo->usersRoleRead($segments[1]);
                    else if($_GET['keyword']) // Get list of users starting with a keyword
                        $response = $Cosmo->usersRead($_GET['keyword']);
                    else // Get a list of all users
                        $response = $Cosmo->usersRead();
                    break;
                    
                case 'POST':
                    if($segments[2])
                        $response = $Cosmo->usersRoleCreate($segments[1], $segments[3]);
                    else {
                        $response = $Cosmo->userCreate($_POST['username'], $_POST['email'], $_POST['password']);
                        if(!$response)
                            $header = 400;
                    }
                    break;
                    
                case 'PUT':
                    if($_PUT['token']){ // Update your password
                        if($Cosmo->passwordResetVerify($segments[1], $_PUT['token']))
                            $response = $Cosmo->userUpdate($segments[1], NULL, NULL, $_PUT['password']);
                        else
                            $response = FALSE;
                    } else if($segments[1]) // Edit username, email, or password
                        $response = $Cosmo->userUpdate($segments[1], $_PUT['username'], $_PUT['email'], $_PUT['password']);
                    else if($_PUT['username']) // Reset password
                        $response['token'] = $Cosmo->passwordReset($_PUT['username']);
                    break;
                    
                case 'DELETE':
                    if($segments[2])
                        $response = $Cosmo->usersRoleDelete($segments[1]);
                    else
                        $response = $Cosmo->userDelete($segments[1]);
                    break;
            }

            break;

        default:
            break;
    }
//}

if(is_string($response))
    $response = array('data'=>$response);

if(!$response)
    $header = 404;

// Set Headers
header("Content-Type: application/json", true);
header('Cache-Control: no-cache, no-store, must-revalidate'); // HTTP 1.1.
header('Pragma: no-cache'); // HTTP 1.0.
header('Expires: 0'); // Proxies.
header("Status: $header");
http_response_code($header);

echo json_encode($response);

?>